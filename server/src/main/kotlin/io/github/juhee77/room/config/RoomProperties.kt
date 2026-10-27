package io.github.juhee77.room.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

@ConfigurationProperties("room")
data class RoomProperties(
    /** 방 API와 WebSocket에 접속할 수 있는 사이트 출처. `http://localhost:[*]`처럼 포트 패턴을 쓸 수 있다. */
    val allowedOrigins: List<String> = listOf(
        "https://juhee77.github.io",
        "http://localhost:[*]",
        "http://127.0.0.1:[*]",
    ),
    /** 방을 만든 뒤 자동으로 지우기까지의 기간 */
    val ttl: Duration = Duration.ofDays(7),
    val maxMembers: Int = 12,
    /** WebSocket 메시지 한 건의 최대 크기. 넘으면 연결이 끊긴다. */
    val maxMessageBytes: Int = 16 * 1024,
)
