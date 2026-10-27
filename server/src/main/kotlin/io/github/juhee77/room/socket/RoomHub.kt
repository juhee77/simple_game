package io.github.juhee77.room.socket

import io.github.juhee77.room.room.MemberJoined
import io.github.juhee77.room.room.MemberLeft
import io.github.juhee77.room.room.MemberResponse
import io.github.juhee77.room.room.RoomClosed
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.transaction.event.TransactionalEventListener
import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap

/**
 * 방마다 접속 중인 참가자 세션과 공유 상태를 메모리에 들고 있다.
 * 서버를 다시 띄우면 접속과 공유 상태는 사라지고, 클라이언트가 다시 붙으면서 복구한다.
 * (방·참가자 목록은 DB에 있으므로 남는다)
 */
@Component
class RoomHub(private val json: JsonMapper) {

    private val log = LoggerFactory.getLogger(javaClass)

    private class Channel {
        /** memberId → 세션. 한 참가자는 한 연결만 유지한다. */
        val sessions = ConcurrentHashMap<String, WebSocketSession>()

        /** 방장이 마지막으로 올린 공유 상태. 늦게 들어오거나 다시 붙은 참가자에게 그대로 준다. */
        @Volatile
        var state: JsonNode? = null
    }

    private val channels = ConcurrentHashMap<String, Channel>()

    fun onlineMemberIds(roomId: String): Set<String> = channels[roomId]?.sessions?.keys?.toSet().orEmpty()

    fun state(roomId: String): JsonNode? = channels[roomId]?.state

    fun setState(roomId: String, state: JsonNode) {
        channel(roomId).state = state
    }

    /** 같은 참가자의 예전 연결(다른 탭 등)이 있으면 끊고 새 연결로 바꾼다. */
    fun attach(roomId: String, memberId: String, session: WebSocketSession) {
        val previous = channel(roomId).sessions.put(memberId, session)
        if (previous != null && previous.id != session.id) {
            close(previous, CloseCodes.REPLACED)
        }
    }

    /** 이 세션이 아직 그 참가자의 현재 연결일 때만 떼어 내고, 오프라인이 됐다고 알린다. */
    fun detach(roomId: String, memberId: String, session: WebSocketSession) {
        val channel = channels[roomId] ?: return
        val current = channel.sessions[memberId] ?: return
        if (current.id == session.id && channel.sessions.remove(memberId, current)) {
            broadcast(roomId, PresenceMessage(memberId, online = false))
        }
    }

    fun broadcast(roomId: String, message: Any, except: String? = null) {
        val sessions = channels[roomId]?.sessions ?: return
        val text = TextMessage(json.writeValueAsString(message))
        sessions.forEach { (memberId, session) -> if (memberId != except) send(session, text) }
    }

    /** 상대가 접속해 있지 않으면 false */
    fun sendTo(roomId: String, memberId: String, message: Any): Boolean {
        val session = channels[roomId]?.sessions?.get(memberId) ?: return false
        send(session, TextMessage(json.writeValueAsString(message)))
        return true
    }

    @TransactionalEventListener
    fun on(event: MemberJoined) {
        broadcast(event.roomId, MemberJoinedMessage(MemberResponse.of(event.member, onlineMemberIds(event.roomId))))
    }

    @TransactionalEventListener
    fun on(event: MemberLeft) {
        val session = channels[event.roomId]?.sessions?.remove(event.memberId)
        session?.let { close(it, CloseCodes.LEFT) }
        broadcast(event.roomId, MemberLeftMessage(event.memberId))
    }

    @TransactionalEventListener
    fun on(event: RoomClosed) {
        val channel = channels.remove(event.roomId) ?: return
        val text = TextMessage(json.writeValueAsString(RoomClosedMessage(event.reason.name.lowercase())))
        channel.sessions.values.forEach {
            send(it, text)
            close(it, CloseCodes.ROOM_CLOSED)
        }
    }

    private fun channel(roomId: String): Channel = channels.computeIfAbsent(roomId) { Channel() }

    private fun send(session: WebSocketSession, message: TextMessage) {
        if (!session.isOpen) return
        try {
            session.sendMessage(message)
        } catch (e: IOException) {
            log.debug("메시지를 보내지 못했습니다: {}", e.message)
        } catch (e: IllegalStateException) {
            // 버퍼가 넘칠 만큼 느린 연결은 ConcurrentWebSocketSessionDecorator가 끊는다
            log.debug("느린 연결을 끊었습니다: {}", e.message)
        }
    }

    private fun close(session: WebSocketSession, status: CloseStatus) {
        try {
            session.close(status)
        } catch (e: IOException) {
            log.debug("연결을 닫지 못했습니다: {}", e.message)
        }
    }
}

/** 4000번대는 응용 프로그램용 종료 코드다. 클라이언트는 이 코드들로 닫히면 다시 붙지 않는다. */
object CloseCodes {
    val REPLACED = CloseStatus(4000, "replaced")
    val LEFT = CloseStatus(4001, "left")
    val UNAUTHORIZED = CloseStatus(4003, "unauthorized")
    val ROOM_CLOSED = CloseStatus(4004, "room_closed")
}
