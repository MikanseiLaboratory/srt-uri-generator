# SRT URI Generator

https://mikanseilaboratory.github.io/srt-uri-generator/

host、port、mode（caller / listener / rendezvous）、latency、passphrase、pbkeylen、streamid から SRT URI を生成します。処理はすべてブラウザ内で行い、入力内容はサーバーに送信せず、保存もしません。GitHub Pages 上の静的ファイル（`public/`）だけで動作します。

A browser-only generator for `srt://` URIs (OBS Studio, FFmpeg, srt-live-transmit, MediaMTX) and vMix input fields. Everything is built client-side from static files on GitHub Pages; nothing you enter is sent or stored.

## 出力

| タブ | 内容 |
| --- | --- |
| OBS | FFmpeg と同じ `srt://` URI。Media Source の Input、または配信設定のサーバー欄に貼り付けます |
| FFmpeg | 同じ URI。受信は `ffmpeg -i "URI"`、送出は `-f mpegts "URI"` |
| srt-live-transmit | libsrt の URI |
| vMix | Hostname、Port、Type、Latency、Passphrase、Stream ID、Key length。URI ではなく、各欄にそのまま入力します |
| MediaMTX | `mediamtx.yml` の SRT 設定（`srt`、`srtAddress`、`paths` の `srtPublishPassphrase` / `srtReadPassphrase`）と、`streamid=publish:<path>` / `read:<path>` を使う送出・受信 URI |

### 単位

latency の入力はミリ秒です。

- OBS、FFmpeg、MediaMTX タブの `latency` と `peerlatency` はマイクロ秒です。2000 ms は `latency=2000000` になります
- FFmpeg の `connect_timeout` はミリ秒のままです
- srt-live-transmit の `latency`、`peerlatency`、`conntimeo` はミリ秒です
- vMix の Latency もミリ秒です

### エンコード

クエリの値は `encodeURIComponent` でエンコードします。`#`、`:`、空白、`&` を含む passphrase と streamid もこの形で渡します。OBS、2024 年 2 月以降の FFmpeg、SRT 1.5 以降の srt-live-transmit は、パーセントエンコードをデコードしてから使います。vMix の Passphrase と Stream ID はエンコードしません。

MediaMTX の streamid（`publish:<path>` / `read:<path>`）は、パス名に使える文字が `[0-9A-Za-z_-./]` に限られ、`:` も URI のクエリで使える文字なので、そのまま出力します。

### ルール

- listener で host を空にすると `srt://:port?mode=listener` になります。caller と rendezvous には host が必要です
- pbkeylen（16 / 24 / 32）は、パスフレーズがあるときだけ付きます
- パスフレーズは 10〜79 文字です
- MediaMTX のパス名は英数字と `_` `-` `.` `/` のみで、`/` で始められず、`.` `..` のセグメントも使えません（MediaMTX の `internal/conf/path.go` と同じ規則）

## 画面

- 日本語 / English の切り替え（`?lang=en` で指定できます）
- OS の設定に合わせたダークモードと手動切り替え
- host / port / latency / パス名の入力内容をその場で検証
- latency のプリセット、パスフレーズの表示切り替えとランダム生成（`crypto.getRandomValues`）
- タブは矢印キー / Home / End で移動できます。`?tab=vmix` のように URL で指定できます
- スマートフォンでは、出力が画面外にあるときに画面下へコピーボタンを表示します

言語とタブ以外の状態は URL に含めません。`localStorage` などへの保存も行いません。

## 開発

依存パッケージはありません。Node.js 20 以上が必要です。

```bash
npm run check                                     # node scripts/check.mjs
python3 -m http.server 8080 --directory public    # npm run serve -> http://localhost:8080/
```

```
public/
  index.html            # 画面
  style.css             # スタイル（ライト / ダーク）
  app.mjs               # フォーム、タブ、コピー、言語切り替え
  i18n.mjs              # UI 文言（ja / en）
  uri.mjs               # URI 生成（ブラウザ内のみで実行）
  ogp.png               # OGP 画像（1200x630）
  favicon.svg / .png    # アイコン
  apple-touch-icon.png
scripts/
  check.mjs             # URI のテストと静的チェック
.github/workflows/
  pages.yml             # チェック + GitHub Pages デプロイ
```

`index.html` からのアセット参照は相対パス（`./app.mjs` など）なので、`https://<user>.github.io/<repo>/` のようなサブパス配下でもそのまま動作します。OGP の `og:url` と `og:image` だけは仕様上、絶対 URL です。

## デプロイ

`main` への push で GitHub Actions（[`.github/workflows/pages.yml`](.github/workflows/pages.yml)）がデプロイします。

1. `node scripts/check.mjs` を実行します（Pull Request でも実行されます）
2. `public/` を `actions/upload-pages-artifact` でアップロードします
3. `actions/deploy-pages` で GitHub Pages に公開します

GitHub の secret は不要です。初回のみ、リポジトリの **Settings > Pages > Build and deployment > Source** を **GitHub Actions** に設定してください。

## ライセンス

ライセンスは未設定です。公開ライセンスを付与する場合は `LICENSE` ファイルを追加してください。
