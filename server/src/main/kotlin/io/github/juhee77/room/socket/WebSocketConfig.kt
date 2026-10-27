package io.github.juhee77.room.socket

import io.github.juhee77.room.config.RoomProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.socket.config.annotation.EnableWebSocket
import org.springframework.web.socket.config.annotation.WebSocketConfigurer
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean

@Configuration
@EnableWebSocket
class WebSocketConfig(
    private val handler: RoomSocketHandler,
    private val props: RoomProperties,
) : WebSocketConfigurer {

    override fun registerWebSocketHandlers(registry: WebSocketHandlerRegistry) {
        registry.addHandler(handler, "/ws/rooms/*")
            .setAllowedOriginPatterns(*props.allowedOrigins.toTypedArray())
    }

    @Bean
    fun webSocketContainer() = ServletServerContainerFactoryBean().apply {
        setMaxTextMessageBufferSize(props.maxMessageBytes)
        // 클라이언트가 25초마다 ping을 보내므로, 1분 넘게 조용한 연결은 끊긴 것으로 본다
        setMaxSessionIdleTimeout(60_000L)
    }
}
