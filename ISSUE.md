# 未解決事項

## Routes APIのAndroidアプリ制限キーがCapacitor WebViewから拒否される

- 確認日：2026-10-24
- 現象：`computeRoutes` にAndroidアプリ制限付きAPIキーを渡すと、`API_KEY_ANDROID_APP_BLOCKED`（`androidPackage: <empty>`）で403になる。
- 原因：現在の実装はCapacitor WebViewのJavaScriptからRoutes API RESTエンドポイントを直接呼び出しており、Google側でAndroidパッケージ情報を検証できない。
- 対応：Androidアプリ識別ヘッダー（`X-Android-Package`、`X-Android-Cert`）をネイティブ実行時のRoutes APIリクエストへ追加した。ヘッダー付きの同一リクエストはHTTP 200と経路時間を確認済み。
- 残課題：Capacitor WebView上の実機リクエストでCORSを含めた通し確認が必要。アプリ制限なしのキーへ変更する案は、キー露出と課金リスクが増えるため採用しない。
