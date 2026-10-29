package io.github.juhee77.room.socket

import io.github.juhee77.room.room.MemberResponse
import io.github.juhee77.room.room.RoomResponse
import tools.jackson.databind.JsonNode

/*
 * 서버 → 클라이언트 메시지. 모두 {"type": "...", ...} 모양의 JSON으로 나간다.
 * 클라이언트 → 서버 메시지는 RoomSocketHandler 주석 참고.
 */

data class WelcomeMessage(val room: RoomResponse, val you: MemberResponse, val state: JsonNode?) {
    val type = "welcome"
}

data class MemberJoinedMessage(val member: MemberResponse) {
    val type = "member_joined"
}

data class MemberLeftMessage(val memberId: String) {
    val type = "member_left"
}

data class PresenceMessage(val memberId: String, val online: Boolean) {
    val type = "presence"
}

/** 다른 참가자가 보낸 게임 메시지. to가 있으면 나에게만 온 귓속말이다. */
data class RelayMessage(val from: String, val to: String?, val data: JsonNode) {
    val type = "message"
}

data class StateMessage(val from: String, val state: JsonNode) {
    val type = "state"
}

data class RoomClosedMessage(val reason: String) {
    val type = "room_closed"
}

data class ErrorMessage(val message: String) {
    val type = "error"
}

object PongMessage {
    val type = "pong"
}
