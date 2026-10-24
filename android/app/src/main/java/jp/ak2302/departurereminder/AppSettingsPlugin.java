package jp.ak2302.departurereminder;

import android.content.Intent;
import android.provider.Settings;
import androidx.annotation.NonNull;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppSettings")
public class AppSettingsPlugin extends Plugin {
    @PluginMethod
    public void openNotificationSettings(@NonNull PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        getContext().startActivity(intent);
        call.resolve(new JSObject());
    }
}
