package io.github.juhee77.room

import io.github.juhee77.room.socket.CloseCodes
import org.junit.jupiter.api.Test
import java.util.concurrent.ExecutionException
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RoomSocketTest : RoomTestSupport() {

    @Test
    fun `인증하면 방 정보와 접속 상태를 받고 다른 사람에게 접속을 알린다`() {
        val host = createRoom()
        val roomId = host["room"]["id"].asString()
        val guest = joinRoom(roomId, "손님")

        val (hostSocket, hostWelcome) = connectAs(host)
        assertEquals(host["you"]["id"], hostWelcome["you"]["id"])
        assertTrue(hostWelcome["state"].isNull)

        val (guestSocket, guestWelcome) = connectAs(guest)
        assertEquals(listOf(true, true), guestWelcome["room"]["members"].values().map { it["online"].asBoolean() })

        val presence = hostSocket.expect("presence")
        assertEquals(guest["you"]["id"], presence["memberId"])
        assertTrue(presence["online"].asBoolean())

        guestSocket.close()
        val offline = hostSocket.expect("presence")
        assertFalse(offline["online"].asBoolean())
        hostSocket.close()
    }

    @Test
    fun `broadcast는 나를 뺀 모두에게, send는 한 사람에게만 간다`() {
        val host = createRoom()
        val roomId = host["room"]["id"].asString()
        val a = joinRoom(roomId, "가")
        val b = joinRoom(roomId, "나")
        val (hostSocket) = connectAs(host)
        val (aSocket) = connectAs(a)
        val (bSocket) = connectAs(b)

        hostSocket.send(mapOf("type" to "broadcast", "data" to mapOf("round" to 1)))
        assertEquals(1, aSocket.expect("message")["data"]["round"].asInt())
        assertEquals(1, bSocket.expect("message")["data"]["round"].asInt())
        hostSocket.expectNone("message")

        val aId = a["you"]["id"].asString()
        hostSocket.send(mapOf("type" to "send", "to" to aId, "data" to mapOf("role" to "늑대")))
        val secret = aSocket.expect("message")
        assertEquals("늑대", secret["data"]["role"].asString())
        assertEquals(aId, secret["to"].asString())
        assertEquals(host["you"]["id"], secret["from"])
        bSocket.expectNone("message")

        listOf(hostSocket, aSocket, bSocket).forEach { it.close() }
    }

    @Test
    fun `방장이 올린 공유 상태는 늦게 들어온 사람의 welcome에 담긴다`() {
        val host = createRoom()
        val roomId = host["room"]["id"].asString()
        val (hostSocket) = connectAs(host)
        hostSocket.send(mapOf("type" to "state", "state" to mapOf("phase" to "night")))

        val late = joinRoom(roomId, "지각생")
        val (lateSocket, welcome) = connectAs(late)
        assertEquals("night", welcome["state"]["phase"].asString())

        lateSocket.send(mapOf("type" to "state", "state" to mapOf("phase" to "day")))
        assertTrue(lateSocket.expect("error")["message"].asString().contains("방장만"))

        hostSocket.send(mapOf("type" to "state", "state" to mapOf("phase" to "day")))
        assertEquals("day", lateSocket.expect("state")["state"]["phase"].asString())

        hostSocket.close()
        lateSocket.close()
    }

    @Test
    fun `토큰이 틀리거나 인증 전에 다른 메시지를 보내면 끊는다`() {
        val roomId = createRoom()["room"]["id"].asString()

        val wrong = connect(roomId)
        wrong.send(mapOf("type" to "auth", "token" to "wrong"))
        assertEquals(CloseCodes.UNAUTHORIZED.code, wrong.closeStatus().code)

        val early = connect(roomId)
        early.send(mapOf("type" to "broadcast", "data" to mapOf("x" to 1)))
        assertEquals(CloseCodes.UNAUTHORIZED.code, early.closeStatus().code)
    }

    @Test
    fun `허용하지 않은 사이트에서는 연결할 수 없다`() {
        val roomId = createRoom()["room"]["id"].asString()
        assertFailsWith<ExecutionException> { connect(roomId, origin = "https://evil.example") }
    }

    @Test
    fun `같은 참가자가 다시 붙으면 예전 연결을 끊는다`() {
        val host = createRoom()
        val (first) = connectAs(host)
        val (second) = connectAs(host)

        assertEquals(CloseCodes.REPLACED.code, first.closeStatus().code)
        second.send(mapOf("type" to "ping"))
        second.expect("pong")
        second.close()
    }

    @Test
    fun `참가자가 나가거나 방이 닫히면 접속한 사람들에게 알린다`() {
        val host = createRoom()
        val roomId = host["room"]["id"].asString()
        val guest = joinRoom(roomId, "손님")
        val (hostSocket) = connectAs(host)
        val (guestSocket) = connectAs(guest)

        val newcomer = joinRoom(roomId, "새손님")
        assertEquals("새손님", hostSocket.expect("member_joined")["member"]["nickname"].asString())

        request("DELETE", "/api/rooms/$roomId/members/me", token = guest["token"].asString())
        assertEquals(CloseCodes.LEFT.code, guestSocket.closeStatus().code)
        assertEquals(guest["you"]["id"], hostSocket.expect("member_left")["memberId"])

        val (newcomerSocket) = connectAs(newcomer)
        request("DELETE", "/api/rooms/$roomId", token = host["token"].asString())
        assertEquals("closed", newcomerSocket.expect("room_closed")["reason"].asString())
        assertEquals(CloseCodes.ROOM_CLOSED.code, newcomerSocket.closeStatus().code)
        assertEquals(CloseCodes.ROOM_CLOSED.code, hostSocket.closeStatus().code)
    }
}
