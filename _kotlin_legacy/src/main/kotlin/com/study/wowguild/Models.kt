package com.study.wowguild

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

data class CharacterInput(
    val realm: String,
    val name: String,
)

enum class Source(val label: String) {
    API("api"),
    ARMORY("armory"),
    NONE("-"),
}

data class CharacterReport(
    val realm: String,
    val name: String,
    val level: Int?,
    val equippedItemLevel: Int?,
    val averageItemLevel: Int?,
    val lastLoginKst: String?,
    val source: Source,
    val status: String,
) {
    val ok: Boolean get() = status == STATUS_OK

    companion object {
        const val STATUS_OK = "OK"
    }
}

@Serializable
data class BlizzardTokenResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("token_type") val tokenType: String,
    @SerialName("expires_in") val expiresIn: Long,
)

@Serializable
data class BlizzardCharacterProfile(
    val level: Int? = null,
    @SerialName("equipped_item_level") val equippedItemLevel: Int? = null,
    @SerialName("average_item_level") val averageItemLevel: Int? = null,
    @SerialName("last_login_timestamp") val lastLoginTimestamp: Long? = null,
)

@Serializable
data class ReportFile(
    val generatedAt: String,
    val rows: List<ReportRow>,
)

@Serializable
data class ReportRow(
    val realm: String,
    val name: String,
    val level: Int?,
    val equippedItemLevel: Int?,
    val averageItemLevel: Int?,
    val lastLoginKst: String?,
    val source: String,
    val status: String,
)

fun CharacterReport.toRow(): ReportRow = ReportRow(
    realm = realm,
    name = name,
    level = level,
    equippedItemLevel = equippedItemLevel,
    averageItemLevel = averageItemLevel,
    lastLoginKst = lastLoginKst,
    source = source.label,
    status = status,
)
