package io.github.juhee77.room.room

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import java.time.Instant

interface RoomRepository : JpaRepository<Room, String> {

    // 동시에 여러 명이 들어와도 정원을 넘지 않도록 참여할 때는 방 행을 잠근다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Room r where r.id = :id")
    fun findForUpdate(id: String): Room?

    fun findAllByExpiresAtLessThanEqual(now: Instant): List<Room>
}

interface MemberRepository : JpaRepository<Member, String> {

    fun findAllByRoomIdOrderByJoinedAt(roomId: String): List<Member>

    fun countByRoomId(roomId: String): Long

    fun existsByRoomIdAndNickname(roomId: String, nickname: String): Boolean

    fun findByRoomIdAndTokenHash(roomId: String, tokenHash: String): Member?
}
