/**
 * UI strings. Keys ending in "Html" are inserted as HTML (only for trusted,
 * hard-coded markup such as <code>); everything else is text.
 */
export const STRINGS = {
  ja: {
    documentTitle: "SRT URI Generator – OBS / FFmpeg / srt-live-transmit / vMix / MediaMTX",
    appTitle: "SRT URI Generator",
    tagline: "OBS Studio、FFmpeg、srt-live-transmit、vMix、MediaMTX 用の SRT URI をブラウザ内で生成します。入力内容は外部に送信されません。",
    skipToOutput: "出力へ移動",
    languageLabel: "言語",
    themeToggle: "ダークモード切替",

    sectionInput: "入力",
    sectionConnection: "接続",
    hostHelpHtml: "IPv4、ホスト名、IPv6（<code>[2001:db8::1]</code>）。<code>host:port</code> を貼り付けると port も埋まります。",
    hostInvalid: "host に使えない文字が含まれています",
    hostRequired: "caller と rendezvous では host が必要です",
    portInvalid: "port は 1〜65535 の整数です",
    portRequired: "port を入力してください",
    modeCallerHelp: "listener 側へ接続します。送出側で一般的な設定です。",
    modeListenerHelp: "指定した port で待ち受けます。host を空にすると全インターフェイスで待ち受けます。",
    modeRendezvousHelp: "両側が同じ port で同時に接続します。NAT 越えに使います。",
    latencyHelpHtml: "ミリ秒で入力します。OBS と FFmpeg の URI ではマイクロ秒に変換します（2000 ms → <code>latency=2000000</code>）。",
    latencyInvalid: "latency は 0 以上の整数です",
    latencyRequired: "latency を入力してください",
    intInvalid: "0 以上の整数を入力してください",
    presetsLabel: "latency のプリセット",

    sectionEncryption: "暗号化",
    passphraseHelp: "10〜79 文字。空欄なら暗号化しません。",
    passphraseShow: "表示",
    passphraseHide: "非表示",
    passphraseGenerate: "生成",
    passphraseGenerateLabel: "ランダムなパスフレーズ（32 文字）を生成",
    passphraseCount: "{n} / 79 文字",
    pbkeylenHelp: "パスフレーズがあるときだけ URI に付きます。",
    notSetDefault: "指定しない（デフォルト）",
    notSet: "指定しない",

    sectionStream: "ストリーム",
    streamidHelpHtml: "最大 512 文字。アクセス制御の標準形式の例: <code>#!::r=live,m=publish</code>",
    advancedSummary: "詳細オプション",
    peerlatencyPlaceholder: "空欄なら latency と同じ",
    on: "1 (on)",
    off: "0 (off)",
    resetForm: "入力をクリア",

    sectionOutput: "出力",
    outputEmptyCaller: "host と port を入力すると URI が表示されます。",
    outputEmptyListener: "port を入力すると URI が表示されます。",
    outputInvalid: "赤く表示された項目を修正してください。",
    tabObs: "OBS",
    tabFfmpeg: "FFmpeg",
    tabTransmit: "srt-live-transmit",
    tabVmix: "vMix",
    tabMediamtx: "MediaMTX",
    obsHint: "Media Source の Input、または配信設定のサーバー欄に貼り付けます。latency はマイクロ秒です。",
    ffmpegHintHtml: "受信: <code>ffmpeg -i \"URI\"</code>、送出: <code>-f mpegts \"URI\"</code>。latency はマイクロ秒、connect_timeout はミリ秒です。",
    transmitHintHtml: "libsrt の URI です。latency はミリ秒。パラメータ名は SRTO_ を除いた形（<code>enforcedencryption</code>、<code>conntimeo</code>、<code>payloadsize</code>）です。",
    vmixHint: "vMix の各欄にそのまま入力します（URI ではありません）。Passphrase と Stream ID はエンコードしません。Latency はミリ秒です。",
    mediamtxHint: "MediaMTX を SRT サーバーとして使う構成です。host と port には MediaMTX のアドレスを入力します（既定ポートは 8890）。",
    mediamtxPathLabel: "パス名",
    mediamtxPathHelp: "英数字と _ - . / が使えます。先頭の / は付けません。",
    mediamtxYmlHint: "SRT サーバーを有効にし、パスごとにパスフレーズを設定します。",
    mediamtxPublishLabel: "送出 URI（publish）",
    mediamtxPublishHintHtml: "OBS / FFmpeg 用（latency はマイクロ秒）。FFmpeg では <code>&amp;pkt_size=1316</code> を追加します。",
    mediamtxReadLabel: "受信 URI（read）",
    mediamtxReadHint: "OBS / FFmpeg 用（latency はマイクロ秒）。",
    mediamtxHostRequired: "MediaMTX の host と port を入力すると URI が表示されます。",

    copy: "コピー",
    copied: "コピーしました",
    copyFailed: "コピーできませんでした",
    copyEmpty: "コピーする内容がありません",
    copyLabel: "{name} をコピー",
    quickJump: "出力へ",

    footerPrivacy: "すべてブラウザ内で処理します。入力内容の送信や保存は行いません。",
    footerUnits: "latency の入力はミリ秒です。OBS、FFmpeg、MediaMTX の URI はマイクロ秒、srt-live-transmit と vMix はミリ秒で出力します。",
  },
  en: {
    documentTitle: "SRT URI Generator – OBS / FFmpeg / srt-live-transmit / vMix / MediaMTX",
    appTitle: "SRT URI Generator",
    tagline: "Build SRT URIs for OBS Studio, FFmpeg, srt-live-transmit, vMix and MediaMTX, entirely in your browser. Nothing you enter leaves this device.",
    skipToOutput: "Skip to output",
    languageLabel: "Language",
    themeToggle: "Toggle dark mode",

    sectionInput: "Input",
    sectionConnection: "Connection",
    hostHelpHtml: "IPv4, hostname or IPv6 (<code>[2001:db8::1]</code>). Pasting <code>host:port</code> fills the port too.",
    hostInvalid: "Host contains invalid characters",
    hostRequired: "caller and rendezvous need a host",
    portInvalid: "Port must be an integer from 1 to 65535",
    portRequired: "Enter a port",
    modeCallerHelp: "Connects to the remote listener. The usual choice for an encoder.",
    modeListenerHelp: "Waits for a connection on the port. Leave host empty to listen on all interfaces.",
    modeRendezvousHelp: "Both ends connect at the same time on the same port. Used for NAT traversal.",
    latencyHelpHtml: "In milliseconds. Converted to microseconds for OBS and FFmpeg (2000 ms → <code>latency=2000000</code>).",
    latencyInvalid: "Latency must be an integer of 0 or more",
    latencyRequired: "Enter a latency",
    intInvalid: "Enter an integer of 0 or more",
    presetsLabel: "Latency presets",

    sectionEncryption: "Encryption",
    passphraseHelp: "10–79 characters. Leave empty for no encryption.",
    passphraseShow: "Show",
    passphraseHide: "Hide",
    passphraseGenerate: "Generate",
    passphraseGenerateLabel: "Generate a random 32-character passphrase",
    passphraseCount: "{n} / 79 characters",
    pbkeylenHelp: "Added to the URI only when a passphrase is set.",
    notSetDefault: "Not set (default)",
    notSet: "Not set",

    sectionStream: "Stream",
    streamidHelpHtml: "Up to 512 characters. Standard access-control form, e.g. <code>#!::r=live,m=publish</code>",
    advancedSummary: "Advanced options",
    peerlatencyPlaceholder: "Same as latency if empty",
    on: "1 (on)",
    off: "0 (off)",
    resetForm: "Clear all",

    sectionOutput: "Output",
    outputEmptyCaller: "Enter a host and port to see the URI.",
    outputEmptyListener: "Enter a port to see the URI.",
    outputInvalid: "Fix the highlighted fields to see the URI.",
    tabObs: "OBS",
    tabFfmpeg: "FFmpeg",
    tabTransmit: "srt-live-transmit",
    tabVmix: "vMix",
    tabMediamtx: "MediaMTX",
    obsHint: "Paste into a Media Source's Input or the stream server field. Latency is in microseconds.",
    ffmpegHintHtml: "Receive: <code>ffmpeg -i \"URI\"</code>. Send: <code>-f mpegts \"URI\"</code>. Latency is in microseconds; connect_timeout stays in milliseconds.",
    transmitHintHtml: "libsrt URI. Latency in milliseconds. Parameter names drop the SRTO_ prefix (<code>enforcedencryption</code>, <code>conntimeo</code>, <code>payloadsize</code>).",
    vmixHint: "Enter each value in the matching vMix field (this is not a URI). Passphrase and Stream ID are not encoded. Latency is in milliseconds.",
    mediamtxHint: "MediaMTX acts as the SRT server. Enter its address as host and port (default port 8890).",
    mediamtxPathLabel: "Path name",
    mediamtxPathHelp: "Letters, digits, _ - . and / are allowed. No leading slash.",
    mediamtxYmlHint: "Enables the SRT server and sets a passphrase per path.",
    mediamtxPublishLabel: "Publish URI",
    mediamtxPublishHintHtml: "For OBS / FFmpeg (latency in microseconds). With FFmpeg, add <code>&amp;pkt_size=1316</code>.",
    mediamtxReadLabel: "Read URI",
    mediamtxReadHint: "For OBS / FFmpeg (latency in microseconds).",
    mediamtxHostRequired: "Enter the MediaMTX host and port to see the URIs.",

    copy: "Copy",
    copied: "Copied",
    copyFailed: "Copy failed",
    copyEmpty: "Nothing to copy",
    copyLabel: "Copy {name}",
    quickJump: "Output",

    footerPrivacy: "Everything runs in your browser. Nothing you enter is sent or stored.",
    footerUnits: "Latency is entered in milliseconds. OBS, FFmpeg and MediaMTX URIs use microseconds; srt-live-transmit and vMix use milliseconds.",
  },
};

export const LANGS = Object.keys(STRINGS);

export function t(lang, key, vars = {}) {
  const table = STRINGS[lang] || STRINGS.ja;
  let text = table[key] ?? STRINGS.ja[key] ?? key;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

/** Applies data-i18n, data-i18n-html, data-i18n-placeholder, data-i18n-label and data-i18n-title attributes. */
export function applyTranslations(root, lang) {
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(lang, el.dataset.i18n);
  for (const el of root.querySelectorAll("[data-i18n-html]")) el.innerHTML = t(lang, el.dataset.i18nHtml);
  for (const el of root.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(lang, el.dataset.i18nPlaceholder);
  for (const el of root.querySelectorAll("[data-i18n-label]")) el.setAttribute("aria-label", t(lang, el.dataset.i18nLabel));
  for (const el of root.querySelectorAll("[data-i18n-title]")) el.title = t(lang, el.dataset.i18nTitle);
}

/** Picks the initial language: ?lang= in the URL first, then the browser language. */
export function detectLanguage(search, navigatorLanguages = []) {
  const fromUrl = new URLSearchParams(search).get("lang");
  if (fromUrl && LANGS.includes(fromUrl)) return fromUrl;
  const first = String(navigatorLanguages[0] || "").toLowerCase();
  return first.startsWith("ja") ? "ja" : first ? "en" : "ja";
}
