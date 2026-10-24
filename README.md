# departure_reminder

Googleカレンダーの予定とGoogle Mapsの経路情報から、間に合う出発時刻を知らせるReact + Capacitorアプリです。

## 開発環境

- Node.js 20以上
- npm
- Android Studio（Android版をビルドする場合）
- Xcode（iOS版をビルドする場合）

Androidで通知を使う場合は、端末またはエミュレーターで通知権限を許可してください。通知は予定ごとの安定したIDで再設定時に置き換えます。

## セットアップ

```sh
npm install
```

Googleカレンダー連携を試す場合は、`.env.example`を`.env.local`へコピーし、Google Cloudで作成したOAuthクライアントIDを設定します。実際のキーはGitへコミットしないでください。

```sh
cp .env.example .env.local
```

## Web開発・ビルド

```sh
npm run dev
npm run build
npm run lint
npm test
```

## Capacitor

```sh
npm run cap:sync
npx cap add android
npx cap add ios
```

`android/`と`ios/`は`npx cap add`で生成されるため、通常はリポジトリへ追加して管理します。Google APIの認証情報やAPIキーは、ソースコードやGitへ保存しないでください。

## ドキュメント

- [仕様書](docs/仕様書.md)
- [作業計画書](docs/作業計画書.md)
