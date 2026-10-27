package io.github.juhee77.room.room

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

/**
 * 방 ID와 참가자 토큰을 만든다.
 * 방 ID는 링크에 그대로 들어가므로 추측할 수 없도록 128비트 랜덤 값을 쓰고,
 * 토큰은 DB에 원문 대신 SHA-256 해시만 남긴다 (DB가 새어도 토큰을 재사용할 수 없게).
 */
object Tokens {
    private val random = SecureRandom()
    private val encoder = Base64.getUrlEncoder().withoutPadding()

    /** 128비트 → base64url 22자 */
    fun newId(): String = randomString(16)

    /** 256비트 → base64url 43자 */
    fun newSecret(): String = randomString(32)

    fun hash(token: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(token.toByteArray())
            .joinToString("") { "%02x".format(it) }

    fun isId(value: String): Boolean = ID_PATTERN.matches(value)

    private fun randomString(bytes: Int): String =
        encoder.encodeToString(ByteArray(bytes).also(random::nextBytes))

    private val ID_PATTERN = Regex("^[A-Za-z0-9_-]{22}$")
}
