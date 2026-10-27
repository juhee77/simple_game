package io.github.juhee77.room.room

import java.time.Instant

data class CreateRoomRequest(val game: String, val name: String? = null, val nickname: String)

data class JoinRoomRequest(val nickname: String)

data class MemberResponse(val id: String, val nickname: String, val host: Boolean, val online: Boolean) {
    companion object {
        fun of(member: Member, online: Set<String>) =
            MemberResponse(member.id, member.nickname, member.host, member.id in online)
    }
}

data class RoomResponse(
    val id: String,
    val game: String,
    val name: String,
    val createdAt: Instant,
    val expiresAt: Instant,
    val members: List<MemberResponse>,
) {
    companion object {
        fun of(snapshot: RoomSnapshot, online: Set<String>) = with(snapshot.room) {
            RoomResponse(id, game, name, createdAt, expiresAt, snapshot.members.map { MemberResponse.of(it, online) })
        }
    }
}

/** token은 이 응답에서만 받을 수 있다. 클라이언트가 보관했다가 Authorization 헤더와 WebSocket 인증에 쓴다. */
data class JoinResponse(val room: RoomResponse, val you: MemberResponse, val token: String)
