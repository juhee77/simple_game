package io.github.juhee77.room.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import java.time.Clock

@Configuration
class WebConfig(private val props: RoomProperties) : WebMvcConfigurer {

    // 프론트는 GitHub Pages(다른 출처)에 있으므로 API는 CORS로 열어 준다
    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/api/**")
            .allowedOriginPatterns(*props.allowedOrigins.toTypedArray())
            .allowedMethods("GET", "POST", "DELETE")
            .allowedHeaders("Authorization", "Content-Type")
            .maxAge(3600)
    }

    @Bean
    fun clock(): Clock = Clock.systemUTC()
}
