package io.github.juhee77.room.room

import io.github.juhee77.room.socket.RoomHub
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.net.URI

@RestController
@RequestMapping("/api/rooms")
class RoomController(
    private val service: RoomService,
    private val hub: RoomHub,
) {

    @PostMapping
    fun create(@RequestBody request: CreateRoomRequest): ResponseEntity<JoinResponse> {
        val joined = service.create(request.game, request.name, request.nickname)
        return ResponseEntity.created(URI.create("/api/rooms/${joined.snapshot.room.id}")).body(joined.toResponse())
    }

    @GetMapping("/{roomId}")
    fun get(@PathVariable roomId: String): RoomResponse =
        RoomResponse.of(service.get(roomId), hub.onlineMemberIds(roomId))

    @PostMapping("/{roomId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    fun join(@PathVariable roomId: String, @RequestBody request: JoinRoomRequest): JoinResponse =
        service.join(roomId, request.nickname).toResponse()

    @DeleteMapping("/{roomId}/members/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun leave(@PathVariable roomId: String, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?) =
        service.leave(roomId, bearer(auth))

    @DeleteMapping("/{roomId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun close(@PathVariable roomId: String, @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) auth: String?) =
        service.close(roomId, bearer(auth))

    private fun Joined.toResponse(): JoinResponse {
        val online = hub.onlineMemberIds(snapshot.room.id)
        return JoinResponse(RoomResponse.of(snapshot, online), MemberResponse.of(member, online), token)
    }

    private fun bearer(header: String?): String =
        header?.removePrefix("Bearer ")?.trim()?.takeIf { it.isNotEmpty() && it != header }
            ?: throw RoomException.unauthorized()
}
