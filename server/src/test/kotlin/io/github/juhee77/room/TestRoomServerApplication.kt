package io.github.juhee77.room

import org.springframework.boot.fromApplication
import org.springframework.boot.with


fun main(args: Array<String>) {
    fromApplication<RoomServerApplication>().with(TestcontainersConfiguration::class).run(*args)
}
