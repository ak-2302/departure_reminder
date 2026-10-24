package jp.ak2302.departurereminder.domain

import java.time.Instant

data class CalendarEvent(
    val id: String,
    val title: String,
    val startAt: Instant,
    val endAt: Instant?,
    val location: String?,
    val isAllDay: Boolean = false,
    val isCancelled: Boolean = false,
)

fun CalendarEvent.isEligibleForDepartureReminder(now: Instant): Boolean =
    !isAllDay && !isCancelled && !location.isNullOrBlank() && startAt.isAfter(now)
