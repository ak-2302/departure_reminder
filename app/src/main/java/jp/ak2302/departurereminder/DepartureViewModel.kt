package jp.ak2302.departurereminder

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import jp.ak2302.departurereminder.data.SettingsRepository
import jp.ak2302.departurereminder.data.CalendarRepository
import jp.ak2302.departurereminder.data.CalendarSyncState
import jp.ak2302.departurereminder.data.SampleCalendarRepository
import jp.ak2302.departurereminder.domain.DepartureCalculator
import jp.ak2302.departurereminder.domain.DepartureSettings
import jp.ak2302.departurereminder.domain.TravelMode
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class DepartureViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = SettingsRepository(application)
    private val calendarRepository: CalendarRepository = SampleCalendarRepository()
    private val calculator = DepartureCalculator()

    val settings: StateFlow<DepartureSettings> = repository.settings.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = DepartureSettings(),
    )

    val calendarEvents = calendarRepository.events.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = emptyList(),
    )

    val calendarSyncState: StateFlow<CalendarSyncState> = calendarRepository.syncState.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = CalendarSyncState.Idle,
    )

    fun saveSettings(
        origin: String,
        travelMode: TravelMode,
        preparationMinutes: Int,
        bufferMinutes: Int,
    ) {
        val newSettings = DepartureSettings(
            origin = origin.trim(),
            travelMode = travelMode,
            preparationMinutes = preparationMinutes.coerceAtLeast(0),
            bufferMinutes = bufferMinutes.coerceAtLeast(0),
        )
        viewModelScope.launch { repository.save(newSettings) }
    }

    fun calculateDeparture(
        eventStart: java.time.Instant,
        travelMinutes: Int,
    ) = calculator.calculate(eventStart, travelMinutes, settings.value)
}
