package io.github.juhee77.room

import org.junit.jupiter.api.BeforeEach
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.context.annotation.Import
import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketHttpHeaders
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.client.standard.StandardWebSocketClient
import org.springframework.web.socket.handler.TextWebSocketHandler
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.concurrent.CompletableFuture
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import kotlin.test.assertNotNull
import kotlin.test.fail

const val SITE_ORIGIN = "http://localhost:8000"

@Import(TestcontainersConfiguration::class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
abstract class RoomTestSupport {

    @LocalServerPort
    var port: Int = 0

    protected val json: JsonMapper = JsonMapper.builder().build()
    private val http = HttpClient.newHttpClient()
    private lateinit var base: String

    @BeforeEach
    fun setUpBase() {
        base = "http://localhost:$port"
    }

    data class Response(val status: Int, val body: JsonNode?, val headers: Map<String, List<String>>)

    protected fun request(
        method: String,
        path: String,
        body: Any? = null,
        token: String? = null,
        headers: Map<String, String> = emptyMap(),
    ): Response {
        val builder = HttpRequest.newBuilder(URI.create(base + path))
            .header("Content-Type", "application/json")
            .method(
                method,
                body?.let { HttpRequest.BodyPublishers.ofString(json.writeValueAsString(it)) }
                    ?: HttpRequest.BodyPublishers.noBody(),
            )
        token?.let { builder.header("Authorization", "Bearer $it") }
        headers.forEach { (k, v) -> builder.header(k, v) }
        val res = http.send(builder.build(), HttpResponse.BodyHandlers.ofString())
        // CORS 거절처럼 JSON이 아닌 본문은 버린다
        val isJson = res.headers().firstValue("content-type").orElse("").contains("json")
        val parsed = res.body().takeIf { isJson && it.isNotBlank() }?.let { json.readTree(it) }
        return Response(res.statusCode(), parsed, res.headers().map())
    }

    protected fun createRoom(nickname: String = "방장", game: String = "werewolf"): JsonNode {
        val res = request("POST", "/api/rooms", mapOf("game" to game, "name" to "테스트 방", "nickname" to nickname))
        check(res.status == 201) { "방 만들기 실패: ${res.status} ${res.body}" }
        return res.body!!
    }

    protected fun joinRoom(roomId: String, nickname: String): JsonNode {
        val res = request("POST", "/api/rooms/$roomId/members", mapOf("nickname" to nickname))
        check(res.status == 201) { "참여 실패: ${res.status} ${res.body}" }
        return res.body!!
    }

    protected fun connect(roomId: String, origin: String = SITE_ORIGIN): TestSocket {
        val socket = TestSocket(json)
        val headers = WebSocketHttpHeaders().apply { setOrigin(origin) }
        socket.session = StandardWebSocketClient()
            .execute(socket, headers, URI.create("ws://localhost:$port/ws/rooms/$roomId"))
            .get(5, TimeUnit.SECONDS)
        return socket
    }

    /** 연결 + 인증 + welcome 수신까지 */
    protected fun connectAs(joined: JsonNode): Pair<TestSocket, JsonNode> {
        val socket = connect(joined["room"]["id"].asString())
        socket.send(mapOf("type" to "auth", "token" to joined["token"].asString()))
        return socket to socket.expect("welcome")
    }
}

class TestSocket(private val json: JsonMapper) : TextWebSocketHandler() {

    lateinit var session: WebSocketSession
    private val messages = LinkedBlockingQueue<JsonNode>()
    val closed = CompletableFuture<CloseStatus>()

    override fun handleTextMessage(session: WebSocketSession, message: TextMessage) {
        messages.add(json.readTree(message.payload))
    }

    override fun afterConnectionClosed(session: WebSocketSession, status: CloseStatus) {
        closed.complete(status)
    }

    fun send(message: Any) = session.sendMessage(TextMessage(json.writeValueAsString(message)))

    /** 원하는 type의 메시지가 올 때까지 기다린다. 그 사이의 다른 메시지(presence 등)는 버린다. */
    fun expect(type: String, timeoutMs: Long = 3_000): JsonNode {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (true) {
            val left = deadline - System.currentTimeMillis()
            val next = messages.poll(left.coerceAtLeast(0), TimeUnit.MILLISECONDS)
                ?: fail("'$type' 메시지를 받지 못했어요")
            if (next["type"].asString() == type) return next
        }
    }

    /** 잠깐 기다려도 이 type의 메시지가 오지 않는지 확인한다 */
    fun expectNone(type: String, waitMs: Long = 300) {
        val deadline = System.currentTimeMillis() + waitMs
        while (true) {
            val left = deadline - System.currentTimeMillis()
            if (left <= 0) return
            val next = messages.poll(left, TimeUnit.MILLISECONDS) ?: return
            if (next["type"].asString() == type) fail("'$type' 메시지가 오면 안 돼요: $next")
        }
    }

    fun closeStatus(): CloseStatus = assertNotNull(closed.get(3, TimeUnit.SECONDS))

    fun close() {
        if (session.isOpen) session.close()
    }
}
