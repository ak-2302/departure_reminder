# departure_reminder

Googleカレンダーの予定とGoogle Mapsの経路情報から、間に合う出発時刻を知らせるAndroidアプリです。

## 開発環境

- Android StudioまたはGradle 8.11.1
- JDK 17
- Android SDK Platform 35
- Android SDK Build Tools 35.0.0以上

## ビルド

Android SDKの場所を環境変数で指定して、debug APKを作成します。

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
./gradlew assembleDebug
```

生成物は`app/build/outputs/apk/debug/app-debug.apk`です。

## テスト・Lint

```sh
./gradlew test lint
```

## ドキュメント

- [仕様書](docs/仕様書.md)
- [作業計画書](docs/作業計画書.md)

Google APIの認証情報やAPIキーは、ソースコードやGitへ保存しないでください。
