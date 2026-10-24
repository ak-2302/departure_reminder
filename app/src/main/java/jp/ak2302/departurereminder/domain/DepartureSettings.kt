package jp.ak2302.departurereminder.domain

enum class TravelMode(val label: String) {
    TRANSIT("公共交通機関"),
    WALKING("徒歩"),
    BICYCLING("自転車"),
    DRIVING("自動車"),
}

data class DepartureSettings(
    val origin: String = "",
    val travelMode: TravelMode = TravelMode.TRANSIT,
    val preparationMinutes: Int = 15,
    val bufferMinutes: Int = 10,
)
