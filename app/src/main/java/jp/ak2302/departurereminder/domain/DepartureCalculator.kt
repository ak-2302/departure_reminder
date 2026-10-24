package jp.ak2302.departurereminder.domain

import java.time.Duration
import java.time.Instant

data class DepartureCalculation(
    val eventStart: Instant,
    val travelMinutes: Int,
    val preparationMinutes: Int,
    val bufferMinutes: Int,
) {
    val departureAt: Instant
        get() = eventStart.minus(
            Duration.ofMinutes(
                (travelMinutes + preparationMinutes + bufferMinutes).toLong(),
            ),
        )
}

class DepartureCalculator {
    fun calculate(
        eventStart: Instant,
        travelMinutes: Int,
        settings: DepartureSettings,
    ): DepartureCalculation {
        require(travelMinutes >= 0) { "移動時間は0分以上で指定してください" }
        require(settings.preparationMinutes >= 0) { "準備時間は0分以上で指定してください" }
        require(settings.bufferMinutes >= 0) { "余裕時間は0分以上で指定してください" }

        return DepartureCalculation(
            eventStart = eventStart,
            travelMinutes = travelMinutes,
            preparationMinutes = settings.preparationMinutes,
            bufferMinutes = settings.bufferMinutes,
        )
    }
}
