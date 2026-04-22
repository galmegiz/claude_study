package com.study.wowguild

import io.github.cdimascio.dotenv.dotenv

data class Config(
    val blizzardClientId: String?,
    val blizzardClientSecret: String?,
) {
    val hasBlizzardCredentials: Boolean
        get() = !blizzardClientId.isNullOrBlank() && !blizzardClientSecret.isNullOrBlank()

    companion object {
        const val REGION = "kr"
        const val LOCALE = "ko_KR"
        const val NAMESPACE_PROFILE = "profile-kr"
        const val NAMESPACE_STATIC = "static-kr"
        const val API_BASE = "https://kr.api.blizzard.com"
        const val OAUTH_TOKEN_URL = "https://oauth.battle.net/token"
        const val ARMORY_BASE = "https://worldofwarcraft.blizzard.com/ko-kr/character/kr"

        fun load(): Config {
            val env = runCatching {
                dotenv {
                    ignoreIfMissing = true
                    systemProperties = false
                }
            }.getOrNull()

            fun read(key: String): String? =
                env?.get(key)?.takeIf { it.isNotBlank() }
                    ?: System.getenv(key)?.takeIf { it.isNotBlank() }

            return Config(
                blizzardClientId = read("BLIZZARD_CLIENT_ID"),
                blizzardClientSecret = read("BLIZZARD_CLIENT_SECRET"),
            )
        }
    }
}
