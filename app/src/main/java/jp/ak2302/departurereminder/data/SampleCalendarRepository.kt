package jp.ak2302.departurereminder.data

import java.time.Instant
import jp.ak2302.departurereminder.domain.CalendarEvent
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

/** [AI] CalendarRepositoryの画面確認用実装。実API接続時に置き換える。 */
class SampleCalendarRepository : CalendarRepository {
    private val eventsState = MutableStateFlow(
        listOf(
            CalendarEvent(
                id = "sample-event",
                title = "サンプル予定",
                startAt = Instant.parse("2026-10-24T09:30:00Z"),
                endAt = Instant.parse("2026-10-24T10:30:00Z"),
                location = "東京都庁",
            ),
        ),
    )
    private val syncStateState = MutableStateFlow<CalendarSyncState>(CalendarSyncState.Idle)

    override val events: Flow<List<CalendarEvent>> = eventsState.asStateFlow()
    override val syncState: Flow<CalendarSyncState> = syncStateState.asStateFlow()

    override suspend fun sync(from: Instant, until: Instant) {
        syncStateState.value = CalendarSyncState.Success(Instant.now())
    }
}
