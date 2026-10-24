package jp.ak2302.departurereminder;

import com.getcapacitor.BridgeActivity;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(AppSettingsPlugin.class);
        registerPlugin(SecureTokenPlugin.class);
        super.onCreate(savedInstanceState);
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "departure-reminder-calendar-sync",
                androidx.work.ExistingPeriodicWorkPolicy.KEEP,
                new PeriodicWorkRequest.Builder(CalendarSyncWorker.class, 15, TimeUnit.MINUTES).build()
        );
    }
}
