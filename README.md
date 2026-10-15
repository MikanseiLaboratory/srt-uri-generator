# SRT URI

https://mikanseilaboratory.github.io/srt-uri-generator/

host、port、mode（caller、listener、rendezvous）、latency、passphrase、pbkeylen、streamid から URI を生成します。組み立てはブラウザ内だけで行い、パスフレーズはサーバーに送信せず、保存もしません。GitHub Pages 上の静的ファイル（`public/`）のみで動作します。

A browser-only generator for `srt://` URIs (OBS Studio, FFmpeg, srt-live-transmit) and vMix input fields. Everything is built client-side from plain static files served by GitHub Pages; the passphrase is never sent or stored anywhere.

## コピーできるもの

| 出力 | 中身 |
| --- | --- |
| OBS | FFmpeg と同じ `srt://` URI です。Media Source の Input、または配信のサーバーに貼り付けます |
| FFmpeg | 同じ URI です。受信は `ffmpeg -i "URI"`、送出は `-f mpegts "URI"` を使用します |
| srt-live-transmit | libsrt の URI です |
| vMix | Hostname、Port、Type、Latency、Passphrase、Stream ID、Key length です。URI ではありません |

latency の入力はミリ秒です。

- OBS と FFmpeg の `latency` と `peerlatency` はマイクロ秒です。2000 ms は `latency=2000000` になります
- FFmpeg の `connect_timeout` はミリ秒のままです
- srt-live-transmit の `latency`、`peerlatency`、`conntimeo` はミリ秒です
- vMix の Latency もミリ秒です。パスフレーズはそのままで、パーセントエンコードしません

クエリの値は `encodeURIComponent` でエンコードします。`#`、`:`、空白、`&` を含む passphrase と streamid もこの形で渡します。OBS、2024年2月以降の FFmpeg、SRT 1.5 以降の srt-live-transmit は、パーセントエンコードをデコードしてから使います。

listener で host を空にすると `srt://:port?mode=listener` になります。caller と rendezvous には host が必要です。pbkeylen（16、24、32）は、パスフレーズがあるときだけ付きます。パスフレーズは 10〜79 文字です。

## 開発

依存パッケージはありません。Node.js 20 以上が必要です。

```bash
npm run check                                     # node scripts/check.mjs
python3 -m http.server 8080 --directory public    # npm run serve -> http://localhost:8080/
```

```
public/
  index.html   # 画面
  app.mjs      # フォームと表示の制御
  uri.mjs      # URI 生成（ブラウザ内のみで実行）
scripts/
  check.mjs    # URI のテストと静的チェック
.github/workflows/
  pages.yml    # チェック + GitHub Pages デプロイ
```

`index.html` からのアセット参照は相対パス（`./app.mjs`）なので、`https://<user>.github.io/<repo>/` のようなサブパス配下でもそのまま動作します。

## デプロイ

`main` への push で GitHub Actions（[`.github/workflows/pages.yml`](.github/workflows/pages.yml)）がデプロイします。

1. `node scripts/check.mjs` を実行します（Pull Request でも実行されます）
2. `public/` を `actions/upload-pages-artifact` でアップロードします
3. `actions/deploy-pages` で GitHub Pages に公開します

GitHub の secret は不要です。初回のみ、リポジトリの **Settings > Pages > Build and deployment > Source** を **GitHub Actions** に設定してください。

## ライセンス

ライセンスは未設定です。公開ライセンスを付与する場合は `LICENSE` ファイルを追加してください。
