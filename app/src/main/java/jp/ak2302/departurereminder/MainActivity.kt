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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

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
                        onOpenSettings = { screen = Screen.Settings },
                        onOpenDetail = { screen = Screen.Detail },
                    )

                    Screen.Detail -> DetailScreen(
                        paddingValues = paddingValues,
                        onBack = { screen = Screen.Home },
                    )

                    Screen.Settings -> SettingsScreen(
                        paddingValues = paddingValues,
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
        Text("次の出発", style = MaterialTheme.typography.labelLarge)
        Text("08:25", style = MaterialTheme.typography.displaySmall)
        Text("サンプル予定", style = MaterialTheme.typography.headlineSmall)
        Text("09:30開始 / 東京都庁")
        Text("移動 45分・準備 15分・余裕 10分")
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
    onBack: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(paddingValues)
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("出発地点：未設定")
        Text("移動手段：公共交通機関")
        Text("準備時間：15分")
        Text("余裕時間：10分")
        Button(onClick = onBack) { Text("戻る") }
    }
}
