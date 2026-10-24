package jp.ak2302.departurereminder.domain

import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class DepartureCalculatorTest {
    private val calculator = DepartureCalculator()
    private val eventStart = Instant.parse("2026-10-24T09:30:00Z")

    @Test
    fun calculatesDepartureAtFromAllDurations() {
        val result = calculator.calculate(
            eventStart = eventStart,
            travelMinutes = 45,
            settings = DepartureSettings(preparationMinutes = 15, bufferMinutes = 10),
        )

        assertEquals(Instant.parse("2026-10-24T08:20:00Z"), result.departureAt)
    }

    @Test
    fun acceptsZeroDurations() {
        val result = calculator.calculate(
            eventStart = eventStart,
            travelMinutes = 0,
            settings = DepartureSettings(preparationMinutes = 0, bufferMinutes = 0),
        )

        assertEquals(eventStart, result.departureAt)
    }

    @Test(expected = IllegalArgumentException::class)
    fun rejectsNegativeTravelTime() {
        calculator.calculate(eventStart, -1, DepartureSettings())
    }
}
