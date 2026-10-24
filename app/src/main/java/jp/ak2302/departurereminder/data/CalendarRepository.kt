package jp.ak2302.departurereminder.data

import jp.ak2302.departurereminder.domain.CalendarEvent
import kotlinx.coroutines.flow.Flow
import java.time.Instant

sealed interface CalendarSyncState {
    data object Idle : CalendarSyncState
    data object Loading : CalendarSyncState
    data class Success(val syncedAt: Instant) : CalendarSyncState
    data class Error(val message: String) : CalendarSyncState
}

interface CalendarRepository {
    val events: Flow<List<CalendarEvent>>
    val syncState: Flow<CalendarSyncState>

    suspend fun sync(from: Instant, until: Instant)
}
