package com.study.wowguild

class SourceException(val code: String, message: String, cause: Throwable? = null) :
    RuntimeException(message, cause)

data class SourceResult(
    val level: Int?,
    val equippedItemLevel: Int?,
    val averageItemLevel: Int?,
    val lastLoginEpochMs: Long?,
)

interface CharacterSource {
    val label: Source
    suspend fun fetch(realm: String, name: String): SourceResult
    suspend fun close()
}
