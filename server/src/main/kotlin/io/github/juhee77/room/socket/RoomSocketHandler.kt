package io.github.juhee77.room.socket

import io.github.juhee77.room.config.RoomProperties
import io.github.juhee77.room.room.Member
import io.github.juhee77.room.room.MemberResponse
import io.github.juhee77.room.room.RoomException
import io.github.juhee77.room.room.RoomResponse
import io.github.juhee77.room.room.RoomService
import org.springframework.stereotype.Component
import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator
import org.springframework.web.socket.handler.TextWebSocketHandler
import tools.jackson.core.JacksonException
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper

/**
 * `/ws/rooms/{roomId}` 연결을 처리한다.
 *
 * 클라이언트 → 서버 메시지
 * - `{"type":"auth","token":"..."}`  첫 메시지. 브라우저 WebSocket은 헤더를 못 붙이고,
 *   주소에 토큰을 넣으면 접속 기록에 남으므로 연결한 뒤 메시지로 인증한다.
 * - `{"type":"broadcast","data":{...}}`  나를 뺀 모두에게
 * - `{"type":"send","to":"memberId","data":{...}}`  한 사람에게만 (역할 나눠 주기 등)
 * - `{"type":"state","state":{...}}`  방장만. 공유 상태를 바꾸고 모두에게 알린다
 * - `{"type":"ping"}`  연결 유지용. `pong`으로 답한다
 */
@Component
class RoomSocketHandler(
    private val service: RoomService,
    private val hub: RoomHub,
    private val json: JsonMapper,
    private val props: RoomProperties,
) : TextWebSocketHandler() {

    override fun afterConnectionEstablished(session: WebSocketSession) {
        val roomId = session.uri?.path?.substringAfterLast('/').orEmpty()
        // 허브가 다른 스레드에서도 보내므로 세션을 스레드 안전한 데코레이터로 감싼다
        session.attributes[OUT] = ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, props.maxMessageBytes * 4)
        session.attributes[ROOM_ID] = roomId
    }

    override fun handleTextMessage(session: WebSocketSession, message: TextMessage) {
        val out = session.attributes[OUT] as WebSocketSession
        val roomId = session.attributes[ROOM_ID] as String
        val node = try {
            json.readTree(message.payload)
        } catch (e: JacksonException) {
            reply(out, ErrorMessage("JSON 형식이 아니에요."))
            return
        }
        val type = node.path("type").asString()
        val member = session.attributes[MEMBER] as Member?

        if (member == null) {
            if (type == "auth") authenticate(session, out, roomId, node.path("token").asString())
            else out.close(CloseCodes.UNAUTHORIZED)
            return
        }

        when (type) {
            "ping" -> reply(out, PongMessage)
            "broadcast" -> data(out, node, "data")?.let {
                hub.broadcast(roomId, RelayMessage(member.id, null, it), except = member.id)
            }
            "send" -> data(out, node, "data")?.let {
                val to = node.path("to").asString()
                if (!hub.sendTo(roomId, to, RelayMessage(member.id, to, it))) {
                    reply(out, ErrorMessage("상대가 접속해 있지 않아요."))
                }
            }
            "state" -> {
                if (!member.host) {
                    reply(out, ErrorMessage("방장만 공유 상태를 바꿀 수 있어요."))
                    return
                }
                data(out, node, "state")?.let {
                    hub.setState(roomId, it)
                    hub.broadcast(roomId, StateMessage(member.id, it), except = member.id)
                }
            }
            "auth" -> reply(out, ErrorMessage("이미 인증했어요."))
            else -> reply(out, ErrorMessage("알 수 없는 메시지예요: $type"))
        }
    }

    override fun afterConnectionClosed(session: WebSocketSession, status: CloseStatus) {
        val member = session.attributes[MEMBER] as Member? ?: return
        hub.detach(session.attributes[ROOM_ID] as String, member.id, session.attributes[OUT] as WebSocketSession)
    }

    private fun authenticate(session: WebSocketSession, out: WebSocketSession, roomId: String, token: String) {
        val member = service.authenticate(roomId, token)
        if (member == null) {
            out.close(CloseCodes.UNAUTHORIZED)
            return
        }
        val snapshot = try {
            service.get(roomId)
        } catch (e: RoomException) {
            out.close(CloseCodes.ROOM_CLOSED)
            return
        }
        session.attributes[MEMBER] = member
        hub.attach(roomId, member.id, out)

        val online = hub.onlineMemberIds(roomId)
        reply(out, WelcomeMessage(RoomResponse.of(snapshot, online), MemberResponse.of(member, online), hub.state(roomId)))
        hub.broadcast(roomId, PresenceMessage(member.id, online = true), except = member.id)
    }

    private fun data(out: WebSocketSession, node: JsonNode, field: String): JsonNode? {
        val value = node.get(field)
        if (value == null || value.isNull) {
            reply(out, ErrorMessage("'$field' 값이 필요해요."))
            return null
        }
        return value
    }

    private fun reply(out: WebSocketSession, message: Any) {
        if (out.isOpen) out.sendMessage(TextMessage(json.writeValueAsString(message)))
    }

    companion object {
        private const val OUT = "room.out"
        private const val ROOM_ID = "room.id"
        private const val MEMBER = "room.member"
        private const val SEND_TIME_LIMIT_MS = 5_000
    }
}
