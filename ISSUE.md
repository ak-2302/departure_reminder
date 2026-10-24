# 未解決事項

## Routes APIのAndroidアプリ制限キーがCapacitor WebViewから拒否される

- 確認日：2026-10-24
- 現象：`computeRoutes` にAndroidアプリ制限付きAPIキーを渡すと、`API_KEY_ANDROID_APP_BLOCKED`（`androidPackage: <empty>`）で403になる。
- 原因：現在の実装はCapacitor WebViewのJavaScriptからRoutes API RESTエンドポイントを直接呼び出しており、Google側でAndroidパッケージ情報を検証できない。
- 影響：キーのAndroidアプリ制限を維持したままでは、実機・エミュレーターから経路時間を取得できない。
- 方針候補：サーバー側プロキシでAPIキーを保護する、またはAndroidネイティブ通信経路で成立する構成を調査する。アプリ制限なしのキーへ変更する案は、キー露出と課金リスクが増えるため採用しない。
