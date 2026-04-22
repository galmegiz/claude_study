package com.study.wowguild

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

class ArmoryScraper : CharacterSource {

    override val label: Source = Source.ARMORY

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    private val http = HttpClient(CIO) {
        install(HttpTimeout) {
            requestTimeoutMillis = 15_000
            connectTimeoutMillis = 5_000
        }
        expectSuccess = false
    }

    override suspend fun fetch(realm: String, name: String): SourceResult {
        val realmSlug = realm.trim().lowercase()
        val encodedName = URLEncoder.encode(name.trim(), StandardCharsets.UTF_8)
        val url = "${Config.ARMORY_BASE}/$realmSlug/$encodedName"

        val resp = http.get(url) {
            header(
                HttpHeaders.UserAgent,
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            )
            header(HttpHeaders.AcceptLanguage, "ko-KR,ko;q=0.9,en;q=0.8")
            accept(ContentType.Text.Html)
        }

        if (resp.status == HttpStatusCode.NotFound) {
            throw SourceException("NOT_FOUND", "armory 404: $realmSlug/$name")
        }
        if (!resp.status.isSuccess()) {
            throw SourceException("HTTP_${resp.status.value}", "armory error ${resp.status}")
        }

        val html = resp.bodyAsText()
        val doc = Jsoup.parse(html)

        val fromJson = parseNextData(doc)
        val fromDom = parseFromDom(doc, html)

        val level = fromJson?.level ?: fromDom.level
        val equipped = fromJson?.equipped ?: fromDom.equipped
        val average = fromJson?.average ?: fromDom.average

        if (level == null && equipped == null && average == null) {
            throw SourceException(
                "PARSE_FAILED",
                "armory: cannot extract level/ilvl from $realmSlug/$name",
            )
        }

        return SourceResult(
            level = level,
            equippedItemLevel = equipped,
            averageItemLevel = average,
            lastLoginEpochMs = null,
        )
    }

    private data class Parsed(val level: Int?, val equipped: Int?, val average: Int?)

    private fun parseNextData(doc: Document): Parsed? {
        val script = doc.selectFirst("script#__NEXT_DATA__")?.data() ?: return null
        val root = runCatching { json.parseToJsonElement(script) }.getOrNull() ?: return null

        var level: Int? = null
        var equipped: Int? = null
        var average: Int? = null

        walk(root) { key, value ->
            val prim = value as? kotlinx.serialization.json.JsonPrimitive ?: return@walk
            val asInt = prim.content.toIntOrNull() ?: return@walk
            when (key.lowercase()) {
                "level", "charlevel", "characterlevel" -> if (level == null && asInt in 1..200) level = asInt
                "itemlevelequipped", "equippeditemlevel", "ilvlequipped" ->
                    if (equipped == null && asInt in 1..2000) equipped = asInt
                "itemlevel", "averageitemlevel", "ilvl" ->
                    if (average == null && asInt in 1..2000) average = asInt
            }
        }

        if (level == null && equipped == null && average == null) return null
        return Parsed(level, equipped, average)
    }

    private fun walk(el: JsonElement, visit: (String, JsonElement) -> Unit) {
        when (el) {
            is JsonObject -> for ((k, v) in el) {
                visit(k, v)
                walk(v, visit)
            }
            is kotlinx.serialization.json.JsonArray -> for (v in el.jsonArray) walk(v, visit)
            else -> {}
        }
    }

    private fun parseFromDom(doc: Document, rawHtml: String): Parsed {
        val level = firstInt(
            doc.selectFirst(".CharacterHeader-level")?.text(),
            doc.selectFirst("[data-testid=character-level]")?.text(),
        )

        val equipped = firstInt(
            doc.selectFirst(".ItemLevel-value")?.text(),
            doc.selectFirst("[data-testid=equipped-item-level]")?.text(),
        )

        val average = firstInt(
            doc.selectFirst(".ItemLevel-average")?.text(),
            doc.selectFirst("[data-testid=average-item-level]")?.text(),
        )

        val fallbackLevel = level ?: regexInt(rawHtml, """"level"\s*:\s*(\d{1,3})""")
        val fallbackEquipped = equipped ?: regexInt(rawHtml, """"(?:itemLevelEquipped|equipped_item_level)"\s*:\s*(\d{1,4})""")
        val fallbackAverage = average ?: regexInt(rawHtml, """"(?:itemLevel|average_item_level)"\s*:\s*(\d{1,4})""")

        return Parsed(fallbackLevel, fallbackEquipped, fallbackAverage)
    }

    private fun firstInt(vararg candidates: String?): Int? {
        for (c in candidates) {
            val n = c?.let { Regex("""\d+""").find(it)?.value?.toIntOrNull() }
            if (n != null) return n
        }
        return null
    }

    private fun regexInt(haystack: String, pattern: String): Int? =
        Regex(pattern).find(haystack)?.groupValues?.getOrNull(1)?.toIntOrNull()

    override suspend fun close() {
        http.close()
    }
}
