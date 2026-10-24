package jp.ak2302.departurereminder;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.annotation.NonNull;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureToken")
public class SecureTokenPlugin extends Plugin {
    private static final String KEY_ALIAS = "departure-reminder-refresh-token-key";
    private static final String PREFS = "departure-reminder-secure-tokens";
    private static final String REFRESH_TOKEN = "google-refresh-token";
    private static final String CLIENT_ID = "google-client-id";

    @PluginMethod
    public void saveRefreshToken(@NonNull PluginCall call) {
        String token = call.getString("token");
        String clientId = call.getString("clientId");
        if (token == null || token.isEmpty() || clientId == null || clientId.isEmpty()) {
            call.reject("更新トークンが空です");
            return;
        }
        try {
            byte[] iv = new byte[12];
            new java.security.SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, getSecretKey(), new GCMParameterSpec(128, iv));
            byte[] ciphertext = cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));
            String value = Base64.encodeToString(iv, Base64.NO_WRAP) + "." + Base64.encodeToString(ciphertext, Base64.NO_WRAP);
            preferences().edit().putString(REFRESH_TOKEN, value).putString(CLIENT_ID, clientId).apply();
            call.resolve(new JSObject());
        } catch (Exception error) {
            call.reject("更新トークンを安全に保存できませんでした", error);
        }
    }

    @PluginMethod
    public void getRefreshToken(@NonNull PluginCall call) {
        String value = preferences().getString(REFRESH_TOKEN, null);
        if (value == null) {
            call.resolve(new JSObject());
            return;
        }
        try {
            String[] parts = value.split("\\.", 2);
            if (parts.length != 2) throw new IllegalArgumentException("保存形式が不正です");
            byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
            byte[] ciphertext = Base64.decode(parts[1], Base64.NO_WRAP);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, getSecretKey(), new GCMParameterSpec(128, iv));
            String token = new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
            JSObject result = new JSObject();
            result.put("token", token);
            call.resolve(result);
        } catch (Exception error) {
            preferences().edit().remove(REFRESH_TOKEN).apply();
            call.reject("保存済みの更新トークンを読み込めませんでした", error);
        }
    }

    @PluginMethod
    public void clearRefreshToken(@NonNull PluginCall call) {
        preferences().edit().remove(REFRESH_TOKEN).remove(CLIENT_ID).apply();
        call.resolve(new JSObject());
    }

    public static String readRefreshToken(Context context) {
        String value = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(REFRESH_TOKEN, null);
        if (value == null) return null;
        try {
            String[] parts = value.split("\\.", 2);
            if (parts.length != 2) return null;
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, getSecretKeyStatic(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
            return new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
        } catch (Exception error) {
            return null;
        }
    }

    public static String readClientId(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(CLIENT_ID, null);
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private SecretKey getSecretKey() throws Exception {
        return getSecretKeyStatic();
    }

    private static SecretKey getSecretKeyStatic() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) {
            return ((KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null)).getSecretKey();
        }
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
        return generator.generateKey();
    }
}
