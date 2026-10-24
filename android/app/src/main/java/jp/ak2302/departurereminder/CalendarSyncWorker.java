package jp.ak2302.departurereminder;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

public class CalendarSyncWorker extends Worker {
    private static final String PREFS = "CapacitorStorage";
    private static final String EVENTS_KEY = "calendar-events";
    private static final String SETTINGS_KEY = "departure-settings";
    private static final String NOTIFIED_PREFS = "departure-reminder-background-notified";
    private static final String CHANNEL_ID = "departure-reminders";

    public CalendarSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        String refreshToken = SecureTokenPlugin.readRefreshToken(getApplicationContext());
        String clientId = SecureTokenPlugin.readClientId(getApplicationContext());
        if (refreshToken == null || clientId == null) return Result.success();
        try {
            String accessToken = refreshAccessToken(clientId, refreshToken);
            syncEvents(accessToken);
            return Result.success();
        } catch (Exception error) {
            return Result.retry();
        }
    }

    private String refreshAccessToken(String clientId, String refreshToken) throws Exception {
        String body = "client_id=" + encode(clientId) + "&refresh_token=" + encode(refreshToken) + "&grant_type=refresh_token";
        JSONObject json = new JSONObject(post("https://oauth2.googleapis.com/token", body));
        String accessToken = json.optString("access_token", "");
        if (accessToken.isEmpty()) throw new IllegalStateException("access token missing");
        return accessToken;
    }

    private void syncEvents(String accessToken) throws Exception {
        Instant now = Instant.now();
        String url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&showDeleted=false&timeMin=" + encode(now.toString()) + "&timeMax=" + encode(now.plus(Duration.ofDays(7)).toString()) + "&maxResults=50";
        JSONObject response = new JSONObject(get(url, accessToken));
        JSONArray items = response.optJSONArray("items");
        JSONArray previous = readArray(EVENTS_KEY);
        Map<String, JSONObject> previousById = new HashMap<>();
        for (int i = 0; i < previous.length(); i++) previousById.put(previous.getJSONObject(i).optString("id"), previous.getJSONObject(i));
        JSONArray next = new JSONArray();
        if (items != null) {
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);
                String id = item.optString("id");
                String startAt = item.optJSONObject("start") == null ? "" : item.optJSONObject("start").optString("dateTime", "");
                String location = item.optString("location", "");
                if (id.isEmpty() || startAt.isEmpty() || location.isEmpty() || "cancelled".equals(item.optString("status"))) continue;
                JSONObject old = previousById.get(id);
                JSONObject event = new JSONObject();
                event.put("id", id).put("title", item.optString("summary", "予定")).put("startAt", startAt).put("startsAt", localTime(startAt)).put("location", location);
                event.put("travelMinutes", old == null ? 0 : old.optInt("travelMinutes", 0));
                event.put("preparationMinutes", old == null ? 0 : old.optInt("preparationMinutes", 0));
                if (old != null && startAt.equals(old.optString("startAt"))) {
                    event.put("notificationEnabled", old.optBoolean("notificationEnabled", false));
                    if (old.has("travelUpdatedAt")) event.put("travelUpdatedAt", old.optString("travelUpdatedAt"));
                }
                next.put(event);
            }
        }
        writeArray(EVENTS_KEY, next);
        scheduleDueNotifications(next, readObject(SETTINGS_KEY));
    }

    private void scheduleDueNotifications(JSONArray events, JSONObject settings) {
        boolean vibration = settings.optBoolean("vibrationEnabled", true);
        int buffer = settings.optInt("bufferMinutes", 10);
        SharedPreferences notified = getApplicationContext().getSharedPreferences(NOTIFIED_PREFS, Context.MODE_PRIVATE);
        Set<String> already = notified.getStringSet("ids", new HashSet<>());
        Set<String> next = new HashSet<>(already);
        for (int i = 0; i < events.length(); i++) {
            try {
                JSONObject event = events.getJSONObject(i);
                if (!event.optBoolean("notificationEnabled", false) || !event.has("travelUpdatedAt")) continue;
                Instant start = Instant.parse(event.getString("startAt"));
                Instant departure = start.minus(Duration.ofMinutes(event.optInt("travelMinutes", 0) + event.optInt("preparationMinutes", 0) + buffer));
                long minutes = Duration.between(Instant.now(), departure).toMinutes();
                String id = event.getString("id") + "-" + start;
                if (minutes >= 0 && minutes <= 20 && !already.contains(id)) {
                    notifyDeparture(event.getString("id"), event.optString("location", "目的地"), vibration);
                    next.add(id);
                }
            } catch (Exception ignored) { }
        }
        notified.edit().putStringSet("ids", next).apply();
    }

    private void notifyDeparture(String eventId, String location, boolean vibration) {
        NotificationManager manager = (NotificationManager) getApplicationContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel(CHANNEL_ID, "出発リマインダー", NotificationManager.IMPORTANCE_DEFAULT));
        NotificationCompat.Builder builder = new NotificationCompat.Builder(getApplicationContext(), CHANNEL_ID)
                .setSmallIcon(jp.ak2302.departurereminder.R.mipmap.ic_launcher)
                .setContentTitle("出発時刻です")
                .setContentText(location + "へ向かうため、出発してください")
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        if (vibration) builder.setVibrate(new long[]{0, 250, 120, 250});
        manager.notify(notificationId(eventId), builder.build());
    }

    private int notificationId(String eventId) {
        long hash = 0;
        for (int i = 0; i < eventId.length(); i++) hash = (hash * 31 + eventId.charAt(i)) & 0xffffffffL;
        return (int) Math.max(1, hash % 2147483647L);
    }

    private JSONArray readArray(String key) {
        try { return new JSONArray(readPrefs().getString(key, "[]")); } catch (Exception error) { return new JSONArray(); }
    }

    private JSONObject readObject(String key) {
        try { return new JSONObject(readPrefs().getString(key, "{}")); } catch (Exception error) { return new JSONObject(); }
    }

    private void writeArray(String key, JSONArray value) { readPrefs().edit().putString(key, value.toString()).apply(); }
    private SharedPreferences readPrefs() { return getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    private String localTime(String value) { return OffsetDateTime.parse(value).format(DateTimeFormatter.ofPattern("HH:mm")); }
    private String encode(String value) throws Exception { return URLEncoder.encode(value, StandardCharsets.UTF_8.name()); }

    private String get(String urlValue, String accessToken) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlValue).openConnection();
        connection.setRequestProperty("Authorization", "Bearer " + accessToken);
        return read(connection);
    }

    private String post(String urlValue, String body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlValue).openConnection();
        connection.setRequestMethod("POST"); connection.setDoOutput(true); connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        try (OutputStream output = connection.getOutputStream()) { output.write(body.getBytes(StandardCharsets.UTF_8)); }
        return read(connection);
    }

    private String read(HttpURLConnection connection) throws Exception {
        int status = connection.getResponseCode();
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        if (stream == null || status >= 400) throw new IllegalStateException("HTTP " + status);
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            StringBuilder result = new StringBuilder(); String line;
            while ((line = reader.readLine()) != null) result.append(line);
            return result.toString();
        }
    }
}
