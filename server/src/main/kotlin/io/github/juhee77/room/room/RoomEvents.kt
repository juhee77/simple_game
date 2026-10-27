package io.github.juhee77.room.room

// 트랜잭션이 커밋된 뒤 WebSocket으로 알리기 위한 이벤트 (RoomHub가 받는다)

data class MemberJoined(val roomId: String, val member: Member)

data class MemberLeft(val roomId: String, val memberId: String)

data class RoomClosed(val roomId: String, val reason: Reason) {
    enum class Reason { CLOSED, EXPIRED }
}
