package io.github.juhee77.room

import io.github.juhee77.room.room.Room
import io.github.juhee77.room.room.RoomRepository
import io.github.juhee77.room.room.RoomService
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import java.time.Duration
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class RoomApiTest : RoomTestSupport() {

    @Autowired
    lateinit var rooms: RoomRepository

    @Autowired
    lateinit var service: RoomService

    @Test
    fun `방을 만들면 추측할 수 없는 ID와 방장 토큰을 받는다`() {
        val created = createRoom()
        val roomId = created["room"]["id"].asString()

        assertTrue(Regex("^[A-Za-z0-9_-]{22}$").matches(roomId))
        assertEquals(43, created["token"].asString().length)
        assertTrue(created["you"]["host"].asBoolean())
        assertEquals(7, Duration.between(
            Instant.parse(created["room"]["createdAt"].asString()),
            Instant.parse(created["room"]["expiresAt"].asString()),
        ).toDays())

        val fetched = request("GET", "/api/rooms/$roomId")
        assertEquals(200, fetched.status)
        assertEquals("werewolf", fetched.body!!["game"].asString())
        assertEquals(listOf("방장"), fetched.body["members"].values().map { it["nickname"].asString() })
        // 토큰은 조회 응답에 절대 나오지 않는다
        assertFalse(fetched.body.toString().contains(created["token"].asString()))
    }

    @Test
    fun `링크로 참여하면 참가자 목록에 들어가고 각자 다른 토큰을 받는다`() {
        val host = createRoom()
        val roomId = host["room"]["id"].asString()
        val guest = joinRoom(roomId, "  손님  ")

        assertEquals("손님", guest["you"]["nickname"].asString())
        assertFalse(guest["you"]["host"].asBoolean())
        assertNotEquals(host["token"].asString(), guest["token"].asString())
        assertEquals(listOf("방장", "손님"), guest["room"]["members"].values().map { it["nickname"].asString() })
    }

    @Test
    fun `닉네임이 겹치거나 정원이 차면 409`() {
        val roomId = createRoom()["room"]["id"].asString()
        assertEquals(409, request("POST", "/api/rooms/$roomId/members", mapOf("nickname" to "방장")).status)

        (2..12).forEach { joinRoom(roomId, "참가자$it") }
        val full = request("POST", "/api/rooms/$roomId/members", mapOf("nickname" to "열세번째"))
        assertEquals(409, full.status)
        assertTrue(full.body!!["detail"].asString().contains("꽉 찼어요"))
    }

    @Test
    fun `닉네임과 게임 이름을 검사한다`() {
        assertEquals(400, request("POST", "/api/rooms", mapOf("game" to "werewolf", "nickname" to " ")).status)
        assertEquals(400, request("POST", "/api/rooms", mapOf("game" to "werewolf", "nickname" to "가".repeat(21))).status)
        assertEquals(400, request("POST", "/api/rooms", mapOf("game" to "../etc", "nickname" to "방장")).status)
    }

    @Test
    fun `방 ID를 모르면 아무것도 볼 수 없다`() {
        assertEquals(404, request("GET", "/api/rooms/abc").status)
        assertEquals(404, request("GET", "/api/rooms/${"A".repeat(22)}").status)
        assertEquals(404, request("POST", "/api/rooms/${"A".repeat(22)}/members", mapOf("nickname" to "누구")).status)
    }

    @Test
    fun `참가자는 나갈 수 있고 방장은 나갈 수 없다`() {
        val host = createRoom()
        val roomId = host["room"]["id"].asString()
        val guest = joinRoom(roomId, "손님")

        assertEquals(401, request("DELETE", "/api/rooms/$roomId/members/me").status)
        assertEquals(401, request("DELETE", "/api/rooms/$roomId/members/me", token = "wrong").status)
        assertEquals(409, request("DELETE", "/api/rooms/$roomId/members/me", token = host["token"].asString()).status)
        assertEquals(204, request("DELETE", "/api/rooms/$roomId/members/me", token = guest["token"].asString()).status)

        val members = request("GET", "/api/rooms/$roomId").body!!["members"]
        assertEquals(listOf("방장"), members.values().map { it["nickname"].asString() })
    }

    @Test
    fun `방장만 방을 닫을 수 있다`() {
        val host = createRoom()
        val roomId = host["room"]["id"].asString()
        val guest = joinRoom(roomId, "손님")

        assertEquals(403, request("DELETE", "/api/rooms/$roomId", token = guest["token"].asString()).status)
        assertEquals(204, request("DELETE", "/api/rooms/$roomId", token = host["token"].asString()).status)
        assertEquals(404, request("GET", "/api/rooms/$roomId").status)
    }

    @Test
    fun `기간이 지난 방은 보이지 않고 정리 작업이 지운다`() {
        val roomId = createRoom()["room"]["id"].asString()
        val room = rooms.findById(roomId).orElseThrow()
        rooms.save(Room(room.id, room.game, room.name, room.createdAt, Instant.now().minusSeconds(1)))

        assertEquals(404, request("GET", "/api/rooms/$roomId").status)
        assertTrue(service.deleteExpired() >= 1)
        assertFalse(rooms.existsById(roomId))
    }

    @Test
    fun `허용한 사이트에서만 CORS 요청을 받는다`() {
        val preflight = mapOf("Access-Control-Request-Method" to "POST", "Access-Control-Request-Headers" to "content-type")

        val allowed = request("OPTIONS", "/api/rooms", headers = preflight + ("Origin" to SITE_ORIGIN))
        assertEquals(200, allowed.status)
        assertEquals(listOf(SITE_ORIGIN), allowed.headers["access-control-allow-origin"])

        val denied = request("OPTIONS", "/api/rooms", headers = preflight + ("Origin" to "https://evil.example"))
        assertEquals(403, denied.status)
    }
}
