package com.study.wowguild

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.request.forms.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.Base64

class BlizzardClient(
    private val clientId: String,
    private val clientSecret: String,
) : CharacterSource {

    override val label: Source = Source.API

    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    private val http = HttpClient(CIO) {
        install(ContentNegotiation) { json(json) }
        expectSuccess = false
    }

    private val tokenMutex = Mutex()
    @Volatile private var cachedToken: String? = null
    @Volatile private var tokenExpiresAt: Long = 0

    private suspend fun token(): String {
        val now = System.currentTimeMillis()
        cachedToken?.let { if (now < tokenExpiresAt - 30_000) return it }
        return tokenMutex.withLock {
            val again = cachedToken
            if (again != null && now < tokenExpiresAt - 30_000) return@withLock again

            val basic = Base64.getEncoder()
                .encodeToString("$clientId:$clientSecret".toByteArray(StandardCharsets.UTF_8))

            val resp = http.submitForm(
                url = Config.OAUTH_TOKEN_URL,
                formParameters = Parameters.build { append("grant_type", "client_credentials") },
            ) {
                header(HttpHeaders.Authorization, "Basic $basic")
            }

            if (!resp.status.isSuccess()) {
                val body = runCatching { resp.bodyAsText() }.getOrDefault("")
                throw SourceException("AUTH_FAILED", "OAuth token failed: ${resp.status} $body")
            }

            val parsed: BlizzardTokenResponse = resp.body()
            cachedToken = parsed.accessToken
            tokenExpiresAt = System.currentTimeMillis() + parsed.expiresIn * 1000
            parsed.accessToken
        }
    }

    override suspend fun fetch(realm: String, name: String): SourceResult {
        val realmSlug = realm.trim().lowercase()
        val encodedName = URLEncoder.encode(name.trim().lowercase(), StandardCharsets.UTF_8)
        val url = "${Config.API_BASE}/profile/wow/character/$realmSlug/$encodedName" +
            "?namespace=${Config.NAMESPACE_PROFILE}&locale=${Config.LOCALE}"

        var attempt = 0
        while (true) {
            attempt++
            val token = token()
            val resp = http.get(url) {
                header(HttpHeaders.Authorization, "Bearer $token")
                accept(ContentType.Application.Json)
            }

            when {
                resp.status.isSuccess() -> {
                    val profile: BlizzardCharacterProfile = resp.body()
                    return SourceResult(
                        level = profile.level,
                        equippedItemLevel = profile.equippedItemLevel,
                        averageItemLevel = profile.averageItemLevel,
                        lastLoginEpochMs = profile.lastLoginTimestamp,
                    )
                }
                resp.status == HttpStatusCode.NotFound ->
                    throw SourceException("NOT_FOUND", "character not found: $realmSlug/$name")
                resp.status == HttpStatusCode.TooManyRequests && attempt < 2 -> {
                    val retrySec = resp.headers[HttpHeaders.RetryAfter]?.toLongOrNull() ?: 2
                    delay(retrySec * 1000)
                    continue
                }
                resp.status == HttpStatusCode.Unauthorized && attempt < 2 -> {
                    cachedToken = null
                    continue
                }
                else -> {
                    val body = runCatching { resp.bodyAsText() }.getOrDefault("")
                        .take(200)
                    throw SourceException(
                        "HTTP_${resp.status.value}",
                        "blizzard api error ${resp.status}: $body",
                    )
                }
            }
        }
    }

    override suspend fun close() {
        http.close()
    }
}
