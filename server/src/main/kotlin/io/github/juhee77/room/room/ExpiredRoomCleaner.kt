package io.github.juhee77.room.room

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class ExpiredRoomCleaner(private val service: RoomService) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelayString = "\${room.cleanup-interval:PT10M}")
    fun run() {
        val count = service.deleteExpired()
        if (count > 0) log.info("기간이 지난 방 {}개를 지웠습니다", count)
    }
}
