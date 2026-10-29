package io.github.juhee77.room

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
class RoomServerApplication

fun main(args: Array<String>) {
    runApplication<RoomServerApplication>(*args)
}
