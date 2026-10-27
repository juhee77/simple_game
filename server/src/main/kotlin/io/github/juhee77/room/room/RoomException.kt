package io.github.juhee77.room.room

import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.web.ErrorResponseException

/** 응답 본문은 ProblemDetail이고, detail은 화면에 그대로 띄울 수 있는 문장이다. */
class RoomException(status: HttpStatus, detail: String) :
    ErrorResponseException(status, ProblemDetail.forStatusAndDetail(status, detail), null) {

    companion object {
        fun notFound() = RoomException(HttpStatus.NOT_FOUND, "방이 없거나 기간이 지나 사라졌어요.")
        fun unauthorized() = RoomException(HttpStatus.UNAUTHORIZED, "이 방의 참가자 정보가 맞지 않아요. 다시 참여해 주세요.")
        fun badRequest(detail: String) = RoomException(HttpStatus.BAD_REQUEST, detail)
        fun conflict(detail: String) = RoomException(HttpStatus.CONFLICT, detail)
        fun forbidden(detail: String) = RoomException(HttpStatus.FORBIDDEN, detail)
    }
}
