package jp.ak2302.departurereminder.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import jp.ak2302.departurereminder.domain.DepartureSettings
import jp.ak2302.departurereminder.domain.TravelMode
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.settingsDataStore by preferencesDataStore(name = "departure_settings")

class SettingsRepository(private val context: Context) {
    private object Keys {
        val origin = stringPreferencesKey("origin")
        val travelMode = stringPreferencesKey("travel_mode")
        val preparationMinutes = intPreferencesKey("preparation_minutes")
        val bufferMinutes = intPreferencesKey("buffer_minutes")
    }

    val settings: Flow<DepartureSettings> = context.settingsDataStore.data.map { preferences ->
        DepartureSettings(
            origin = preferences[Keys.origin].orEmpty(),
            travelMode = preferences[Keys.travelMode]
                ?.let { value -> TravelMode.entries.firstOrNull { it.name == value } }
                ?: TravelMode.TRANSIT,
            preparationMinutes = preferences[Keys.preparationMinutes] ?: 15,
            bufferMinutes = preferences[Keys.bufferMinutes] ?: 10,
        )
    }

    suspend fun save(settings: DepartureSettings) {
        context.settingsDataStore.edit { preferences ->
            preferences[Keys.origin] = settings.origin
            preferences[Keys.travelMode] = settings.travelMode.name
            preferences[Keys.preparationMinutes] = settings.preparationMinutes
            preferences[Keys.bufferMinutes] = settings.bufferMinutes
        }
    }
}
