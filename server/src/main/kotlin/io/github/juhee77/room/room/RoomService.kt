package io.github.juhee77.room.room

import io.github.juhee77.room.config.RoomProperties
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

data class RoomSnapshot(val room: Room, val members: List<Member>)

/** 방에 들어온 결과. token은 이때 한 번만 원문으로 돌려준다. */
data class Joined(val snapshot: RoomSnapshot, val member: Member, val token: String)

@Service
@Transactional
class RoomService(
    private val rooms: RoomRepository,
    private val members: MemberRepository,
    private val props: RoomProperties,
    private val events: ApplicationEventPublisher,
    private val clock: Clock,
) {

    fun create(game: String, name: String?, nickname: String): Joined {
        val now = clock.instant()
        val room = rooms.save(
            Room(
                id = Tokens.newId(),
                game = validGame(game),
                name = validRoomName(name),
                createdAt = now,
                expiresAt = now.plus(props.ttl),
            )
        )
        return addMember(room, validNickname(nickname), host = true)
    }

    @Transactional(readOnly = true)
    fun get(roomId: String): RoomSnapshot {
        val room = findLive(roomId)
        return RoomSnapshot(room, members.findAllByRoomIdOrderByJoinedAt(room.id))
    }

    fun join(roomId: String, nickname: String): Joined {
        val name = validNickname(nickname)
        val room = findLive(roomId, forUpdate = true)
        if (members.countByRoomId(room.id) >= props.maxMembers) {
            throw RoomException.conflict("방이 꽉 찼어요. (최대 ${props.maxMembers}명)")
        }
        if (members.existsByRoomIdAndNickname(room.id, name)) {
            throw RoomException.conflict("이미 같은 닉네임이 있어요. 다른 이름으로 들어와 주세요.")
        }
        return addMember(room, name, host = false)
    }

    fun leave(roomId: String, token: String) {
        val member = requireMember(roomId, token)
        if (member.host) {
            throw RoomException.conflict("방장은 나갈 수 없어요. 방을 닫아 주세요.")
        }
        members.delete(member)
        events.publishEvent(MemberLeft(roomId, member.id))
    }

    fun close(roomId: String, token: String) {
        val member = requireMember(roomId, token)
        if (!member.host) {
            throw RoomException.forbidden("방장만 방을 닫을 수 있어요.")
        }
        rooms.deleteById(roomId)
        events.publishEvent(RoomClosed(roomId, RoomClosed.Reason.CLOSED))
    }

    /** WebSocket 인증용. 방이 없거나 만료됐거나 토큰이 틀리면 null. */
    @Transactional(readOnly = true)
    fun authenticate(roomId: String, token: String): Member? {
        if (!Tokens.isId(roomId)) return null
        val room = rooms.findById(roomId).orElse(null) ?: return null
        if (room.isExpired(clock.instant())) return null
        return members.findByRoomIdAndTokenHash(roomId, Tokens.hash(token))
    }

    /** 기간이 지난 방을 지운다. 참가자는 DB의 on delete cascade로 함께 지워진다. */
    fun deleteExpired(): Int {
        val expired = rooms.findAllByExpiresAtLessThanEqual(clock.instant())
        rooms.deleteAll(expired)
        expired.forEach { events.publishEvent(RoomClosed(it.id, RoomClosed.Reason.EXPIRED)) }
        return expired.size
    }

    private fun addMember(room: Room, nickname: String, host: Boolean): Joined {
        val token = Tokens.newSecret()
        val member = members.save(
            Member(
                id = Tokens.newId(),
                roomId = room.id,
                nickname = nickname,
                tokenHash = Tokens.hash(token),
                host = host,
                joinedAt = clock.instant(),
            )
        )
        events.publishEvent(MemberJoined(room.id, member))
        return Joined(RoomSnapshot(room, members.findAllByRoomIdOrderByJoinedAt(room.id)), member, token)
    }

    private fun findLive(roomId: String, forUpdate: Boolean = false): Room {
        if (!Tokens.isId(roomId)) throw RoomException.notFound()
        val room = if (forUpdate) rooms.findForUpdate(roomId) else rooms.findById(roomId).orElse(null)
        if (room == null || room.isExpired(clock.instant())) throw RoomException.notFound()
        return room
    }

    private fun requireMember(roomId: String, token: String): Member {
        findLive(roomId)
        return members.findByRoomIdAndTokenHash(roomId, Tokens.hash(token)) ?: throw RoomException.unauthorized()
    }

    private fun validGame(game: String): String {
        if (!GAME_PATTERN.matches(game)) throw RoomException.badRequest("게임 이름이 올바르지 않아요.")
        return game
    }

    private fun validRoomName(name: String?): String {
        val trimmed = name?.trim().orEmpty()
        if (trimmed.length > 40) throw RoomException.badRequest("방 이름은 40자까지 쓸 수 있어요.")
        return trimmed
    }

    private fun validNickname(nickname: String): String {
        val trimmed = nickname.trim()
        if (trimmed.isEmpty() || trimmed.length > 20) throw RoomException.badRequest("닉네임은 1~20자로 적어 주세요.")
        return trimmed
    }

    companion object {
        private val GAME_PATTERN = Regex("^[a-z0-9-]{1,40}$")
    }
}
