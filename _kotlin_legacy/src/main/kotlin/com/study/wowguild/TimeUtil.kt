package com.study.wowguild

import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

object TimeUtil {
    private val KST = TimeZone.of("Asia/Seoul")

    fun epochMsToKstString(epochMs: Long?): String? {
        if (epochMs == null || epochMs <= 0) return null
        val local = Instant.fromEpochMilliseconds(epochMs).toLocalDateTime(KST)
        val y = local.year.toString().padStart(4, '0')
        val mo = local.monthNumber.toString().padStart(2, '0')
        val d = local.dayOfMonth.toString().padStart(2, '0')
        val h = local.hour.toString().padStart(2, '0')
        val mi = local.minute.toString().padStart(2, '0')
        return "$y-$mo-$d $h:$mi KST"
    }

    fun nowKstString(): String = epochMsToKstString(System.currentTimeMillis()) ?: ""
}
