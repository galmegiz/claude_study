package com.study.wowguild

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.nio.file.Files
import java.nio.file.Path

object CharactersIO {

    private val jsonPretty = Json { prettyPrint = true; encodeDefaults = true }

    fun readCsv(path: Path): List<CharacterInput> {
        val lines = Files.readAllLines(path)
            .map { it.trim() }
            .filter { it.isNotEmpty() && !it.startsWith("#") }

        if (lines.isEmpty()) return emptyList()

        val header = lines.first().split(",").map { it.trim().lowercase() }
        val realmIdx = header.indexOf("realm")
        val nameIdx = header.indexOf("name")
        require(realmIdx >= 0 && nameIdx >= 0) {
            "CSV must have header columns 'realm,name' (got: ${header.joinToString()})"
        }

        return lines.drop(1).mapNotNull { line ->
            val cols = parseCsvRow(line)
            val realm = cols.getOrNull(realmIdx)?.trim()
            val name = cols.getOrNull(nameIdx)?.trim()
            if (realm.isNullOrEmpty() || name.isNullOrEmpty()) null
            else CharacterInput(realm, name)
        }
    }

    private fun parseCsvRow(line: String): List<String> {
        val out = mutableListOf<String>()
        val cur = StringBuilder()
        var inQuotes = false
        var i = 0
        while (i < line.length) {
            val c = line[i]
            when {
                c == '"' && inQuotes && i + 1 < line.length && line[i + 1] == '"' -> {
                    cur.append('"'); i++
                }
                c == '"' -> inQuotes = !inQuotes
                c == ',' && !inQuotes -> {
                    out.add(cur.toString()); cur.clear()
                }
                else -> cur.append(c)
            }
            i++
        }
        out.add(cur.toString())
        return out
    }

    fun writeCsv(path: Path, reports: List<CharacterReport>) {
        Files.createDirectories(path.parent)
        val sb = StringBuilder()
        sb.append("realm,name,level,equipped_item_level,average_item_level,last_login_kst,source,status\n")
        for (r in reports) {
            sb.append(csvCell(r.realm)).append(',')
            sb.append(csvCell(r.name)).append(',')
            sb.append(r.level?.toString().orEmpty()).append(',')
            sb.append(r.equippedItemLevel?.toString().orEmpty()).append(',')
            sb.append(r.averageItemLevel?.toString().orEmpty()).append(',')
            sb.append(csvCell(r.lastLoginKst.orEmpty())).append(',')
            sb.append(r.source.label).append(',')
            sb.append(csvCell(r.status)).append('\n')
        }
        Files.writeString(path, sb)
    }

    private fun csvCell(s: String): String =
        if (s.any { it == ',' || it == '"' || it == '\n' }) "\"${s.replace("\"", "\"\"")}\""
        else s

    fun writeJson(path: Path, reports: List<CharacterReport>) {
        Files.createDirectories(path.parent)
        val file = ReportFile(
            generatedAt = TimeUtil.nowKstString(),
            rows = reports.map { it.toRow() },
        )
        Files.writeString(path, jsonPretty.encodeToString(file))
    }

    fun printTable(reports: List<CharacterReport>) {
        if (reports.isEmpty()) {
            println("(빈 결과)"); return
        }
        val headers = listOf("Realm", "Name", "Lv", "iLvl(equip)", "iLvl(avg)", "Last Login", "Src", "Status")
        val rows = reports.map {
            listOf(
                it.realm,
                it.name,
                it.level?.toString() ?: "-",
                it.equippedItemLevel?.toString() ?: "-",
                it.averageItemLevel?.toString() ?: "-",
                it.lastLoginKst ?: "-",
                it.source.label,
                it.status,
            )
        }

        val widths = IntArray(headers.size) { col ->
            maxOf(
                displayWidth(headers[col]),
                rows.maxOf { displayWidth(it[col]) },
            )
        }

        fun pad(s: String, w: Int): String {
            val diff = w - displayWidth(s)
            return if (diff > 0) s + " ".repeat(diff) else s
        }

        fun renderRow(cells: List<String>) =
            cells.mapIndexed { i, c -> pad(c, widths[i]) }.joinToString("  ")

        println(renderRow(headers))
        println(widths.joinToString("  ") { "-".repeat(it) })
        for (row in rows) println(renderRow(row))
    }

    private fun displayWidth(s: String): Int {
        var w = 0
        for (ch in s) {
            val code = ch.code
            w += if (code in 0x1100..0x115F ||
                code in 0x2E80..0x303E ||
                code in 0x3041..0x33FF ||
                code in 0x3400..0x4DBF ||
                code in 0x4E00..0x9FFF ||
                code in 0xA000..0xA4CF ||
                code in 0xAC00..0xD7A3 ||
                code in 0xF900..0xFAFF ||
                code in 0xFE30..0xFE4F ||
                code in 0xFF00..0xFF60 ||
                code in 0xFFE0..0xFFE6
            ) 2 else 1
        }
        return w
    }
}
