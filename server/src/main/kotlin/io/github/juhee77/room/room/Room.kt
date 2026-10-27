package io.github.juhee77.room.room

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "rooms")
class Room(
    @Id
    val id: String,
    /** 방을 만든 게임의 파일 이름 (예: werewolf) */
    val game: String,
    val name: String,
    val createdAt: Instant,
    val expiresAt: Instant,
) {
    fun isExpired(now: Instant): Boolean = !expiresAt.isAfter(now)
}

@Entity
@Table(name = "members")
class Member(
    @Id
    val id: String,
    val roomId: String,
    val nickname: String,
    val tokenHash: String,
    /** 방장. 방장만 방을 닫고 공유 상태를 바꿀 수 있다. */
    val host: Boolean,
    val joinedAt: Instant,
)
