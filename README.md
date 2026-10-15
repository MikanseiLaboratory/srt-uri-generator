# SRT URI Generator

**公開 URL / Live site:** <https://mikanseilaboratory.github.io/srt-uri-generator/>

OBS Studio / FFmpeg / srt-live-transmit / vMix 向けの `srt://` URI を、ツールごとの単位とエスケープ規則に合わせて生成するブラウザ完結型のツールです。GitHub Pages 上の静的ファイル (`public/`) のみで動作し、サーバー側の処理や外部への通信は一切ありません。

A browser-only tool that builds `srt://` URIs for OBS Studio, FFmpeg, srt-live-transmit and vMix, applying each tool's latency unit and escaping rules. It is plain static files served by GitHub Pages; nothing is sent anywhere.

## 機能 / Features

| 対象ツール | レイテンシ単位 | 備考 |
| --- | --- | --- |
| OBS Studio | マイクロ秒 (µs) | ms 入力を ×1000 して出力。パスフレーズ・Stream ID は `encodeURIComponent` でエスケープ |
| FFmpeg (libsrt) | マイクロ秒 (µs) | 同上 |
| srt-live-transmit | ミリ秒 (ms) | |
| vMix | ミリ秒 (ms) | |

- 入力: ホスト、ポート、モード (`caller` / `listener` / `rendezvous`)、レイテンシ (ms)、Stream ID、パスフレーズ、暗号鍵長 (`pbkeylen`)
- 入力値の簡易バリデーション (ポート範囲、パスフレーズ長 10〜79 文字 など)
- 各 URI のワンクリックコピー
- **パスフレーズを含むすべての入力はブラウザ内でのみ処理され、ネットワークには送信されません。**

## 開発 / Development

依存パッケージはありません。Node.js 20 以上が必要です。

```sh
# チェック (URI ビルダーの単体テスト + 静的アセットの検証)
node scripts/check.mjs      # または npm run check

# ローカルで配信して確認
python3 -m http.server 8080 --directory public   # または npm run serve
# -> http://localhost:8080/
```

### ディレクトリ構成

```
public/
  index.html   # 画面 (CSS 同梱)
  app.mjs      # フォームと表示の制御
  uri.mjs      # URI 生成の純粋関数 (ブラウザ / Node 共用)
scripts/
  check.mjs    # テスト・静的チェック
.github/workflows/
  pages.yml    # チェック + GitHub Pages デプロイ
```

`index.html` からのアセット参照はすべて相対パス (`./app.mjs` など) なので、`https://<user>.github.io/<repo>/` のようなサブパス配下でもそのまま動作します。

## デプロイ / Deployment

`main` ブランチへの push をトリガーに、GitHub Actions ([`.github/workflows/pages.yml`](.github/workflows/pages.yml)) が以下を実行します。

1. `node scripts/check.mjs` でチェックを実行 (Pull Request でも実行されます)
2. `public/` を `actions/upload-pages-artifact` でアップロード
3. `actions/deploy-pages` で GitHub Pages へデプロイ

シークレットは不要です。初回のみ、リポジトリの **Settings > Pages > Build and deployment > Source** を **GitHub Actions** に設定してください。

## ライセンス / License

ライセンスは未設定です。公開ライセンスを付与する場合は `LICENSE` ファイルを追加してください。

No license has been assigned yet. Add a `LICENSE` file if you want to publish under an open-source license.
