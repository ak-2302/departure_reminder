package jp.ak2302.departurereminder

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.TextButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import jp.ak2302.departurereminder.domain.DepartureSettings
import jp.ak2302.departurereminder.domain.TravelMode

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DepartureReminderApp()
        }
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
private fun DepartureReminderApp() {
    var screen by rememberSaveable { mutableStateOf(Screen.Home) }
    val departureViewModel: DepartureViewModel = viewModel()
    val settings by departureViewModel.settings.collectAsState()

    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            Scaffold(
                topBar = {
                    TopAppBar(title = { Text(screen.title) })
                },
            ) { paddingValues ->
                when (screen) {
                    Screen.Home -> HomeScreen(
                        paddingValues = paddingValues,
                        settings = settings,
                        onOpenSettings = { screen = Screen.Settings },
                        onOpenDetail = { screen = Screen.Detail },
                    )

                    Screen.Detail -> DetailScreen(
                        paddingValues = paddingValues,
                        onBack = { screen = Screen.Home },
                    )

                    Screen.Settings -> SettingsScreen(
                        paddingValues = paddingValues,
                        settings = settings,
                        onSave = departureViewModel::saveSettings,
                        onBack = { screen = Screen.Home },
                    )
                }
            }
        }
    }
}

private enum class Screen(val title: String) {
    Home("出発リマインダー"),
    Detail("予定の詳細"),
    Settings("設定"),
}

@Composable
private fun HomeScreen(
    paddingValues: PaddingValues,
    settings: DepartureSettings,
    onOpenSettings: () -> Unit,
    onOpenDetail: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(paddingValues)
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("次の出発（サンプル）", style = MaterialTheme.typography.labelLarge)
        Text("08:20", style = MaterialTheme.typography.displaySmall)
        Text("サンプル予定", style = MaterialTheme.typography.headlineSmall)
        Text("09:30開始 / 東京都庁")
        Text("移動 45分・準備 ${settings.preparationMinutes}分・余裕 ${settings.bufferMinutes}分")
        Text("出発地点：${settings.origin.ifBlank { "未設定" }}")
        Text("移動手段：${settings.travelMode.label}")
        Button(
            modifier = Modifier.fillMaxWidth(),
            onClick = onOpenDetail,
        ) {
            Text("予定の詳細を見る")
        }
        Button(
            modifier = Modifier.fillMaxWidth(),
            onClick = onOpenSettings,
        ) {
            Text("設定")
        }
    }
}

@Composable
private fun DetailScreen(
    paddingValues: PaddingValues,
    onBack: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(paddingValues)
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("サンプル予定", style = MaterialTheme.typography.headlineSmall)
        Text("開始：09:30")
        Text("目的地：東京都庁")
        Text("出発：08:25")
        Text("経路情報：サンプルデータ")
        Button(onClick = onBack) { Text("戻る") }
    }
}

@Composable
private fun SettingsScreen(
    paddingValues: PaddingValues,
    settings: DepartureSettings,
    onSave: (String, TravelMode, Int, Int) -> Unit,
    onBack: () -> Unit,
) {
    var origin by rememberSaveable(settings.origin) { mutableStateOf(settings.origin) }
    var preparationMinutes by rememberSaveable(settings.preparationMinutes) {
        mutableStateOf(settings.preparationMinutes.toString())
    }
    var bufferMinutes by rememberSaveable(settings.bufferMinutes) {
        mutableStateOf(settings.bufferMinutes.toString())
    }
    var travelMode by rememberSaveable(settings.travelMode) { mutableStateOf(settings.travelMode) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(paddingValues)
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = origin,
            onValueChange = { origin = it },
            label = { Text("出発地点") },
            singleLine = true,
        )
        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = preparationMinutes,
            onValueChange = { value -> preparationMinutes = value.filter(Char::isDigit) },
            label = { Text("準備時間（分）") },
            singleLine = true,
        )
        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = bufferMinutes,
            onValueChange = { value -> bufferMinutes = value.filter(Char::isDigit) },
            label = { Text("余裕時間（分）") },
            singleLine = true,
        )
        Text("移動手段：${travelMode.label}")
        TextButton(
            onClick = {
                val modes = TravelMode.entries
                travelMode = modes[(modes.indexOf(travelMode) + 1) % modes.size]
            },
        ) {
            Text("移動手段を変更")
        }
        Button(
            modifier = Modifier.fillMaxWidth(),
            onClick = {
                onSave(
                    origin,
                    travelMode,
                    preparationMinutes.toIntOrNull() ?: 15,
                    bufferMinutes.toIntOrNull() ?: 10,
                )
                onBack()
            },
        ) { Text("保存") }
        TextButton(onClick = onBack) { Text("戻る") }
    }
}
