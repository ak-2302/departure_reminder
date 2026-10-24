package jp.ak2302.departurereminder.domain

import java.time.Instant
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CalendarEventTest {
    private val now = Instant.parse("2026-10-24T08:00:00Z")

    @Test
    fun eventWithFutureStartAndLocationIsEligible() {
        val event = CalendarEvent(
            id = "1",
            title = "会議",
            startAt = Instant.parse("2026-10-24T09:00:00Z"),
            endAt = null,
            location = "東京駅",
        )

        assertTrue(event.isEligibleForDepartureReminder(now))
    }

    @Test
    fun allDayOrLocationlessEventIsNotEligible() {
        val allDay = CalendarEvent("1", "休日", now.plusSeconds(3600), null, "東京", isAllDay = true)
        val locationless = CalendarEvent("2", "会議", now.plusSeconds(3600), null, null)

        assertFalse(allDay.isEligibleForDepartureReminder(now))
        assertFalse(locationless.isEligibleForDepartureReminder(now))
    }
}
