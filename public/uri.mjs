// Pure SRT URI building helpers. No DOM, no network: safe to run in the browser
// and under Node (scripts/check.mjs imports this file directly).

export const MODES = ["caller", "listener", "rendezvous"];
export const KEY_LENGTHS = [0, 16, 24, 32];

export const DEFAULTS = Object.freeze({
  host: "",
  port: 9000,
  mode: "caller",
  latencyMs: 120,
  streamId: "",
  passphrase: "",
  pbKeyLen: 16,
});

/**
 * Normalises raw (string-ish) form values into a typed parameter object and
 * collects human-readable validation errors.
 */
export function normalizeParams(raw) {
  const errors = [];
  const host = String(raw.host ?? "").trim();
  const mode = String(raw.mode ?? DEFAULTS.mode).trim();
  const streamId = String(raw.streamId ?? "").trim();
  const passphrase = String(raw.passphrase ?? "");

  const port = toInt(raw.port, DEFAULTS.port);
  const latencyMs = toInt(raw.latencyMs, DEFAULTS.latencyMs);
  const pbKeyLen = toInt(raw.pbKeyLen, DEFAULTS.pbKeyLen);

  if (host === "") {
    errors.push("ホスト名または IP アドレスを入力してください。");
  } else if (/[\s/?#@]/.test(host)) {
    errors.push("ホスト名に空白や / ? # @ は使用できません。");
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push("ポート番号は 1〜65535 の整数で入力してください。");
  }
  if (!MODES.includes(mode)) {
    errors.push("モードは caller / listener / rendezvous のいずれかを指定してください。");
  }
  if (!Number.isInteger(latencyMs) || latencyMs < 0) {
    errors.push("レイテンシは 0 以上の整数 (ms) で入力してください。");
  }
  if (!KEY_LENGTHS.includes(pbKeyLen)) {
    errors.push("暗号鍵長は 0 / 16 / 24 / 32 のいずれかを指定してください。");
  }
  if (passphrase !== "" && (passphrase.length < 10 || passphrase.length > 79)) {
    errors.push("パスフレーズは 10〜79 文字で指定してください (SRT の仕様)。");
  }

  return {
    params: { host, port, mode, latencyMs, streamId, passphrase, pbKeyLen },
    errors,
  };
}

function toInt(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

/** Wraps IPv6 literals in brackets so they are valid in a URI authority. */
export function formatHost(host) {
  if (host.includes(":") && !host.startsWith("[")) return `[${host}]`;
  return host;
}

export function msToMicroseconds(ms) {
  return ms * 1000;
}

function authority({ host, port }) {
  return `srt://${formatHost(host)}:${port}`;
}

function buildQuery(pairs) {
  const parts = [];
  for (const [key, value] of pairs) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${key}=${value}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

function secretParams(params, encode) {
  if (params.passphrase === "") return [];
  return [
    ["passphrase", encode(params.passphrase)],
    ["pbkeylen", params.pbKeyLen === 0 ? "" : params.pbKeyLen],
  ];
}

/**
 * OBS Studio (Media Source / custom output). OBS hands the URL to FFmpeg's
 * libsrt wrapper, so latency is in microseconds. Query values must be
 * percent-encoded with encodeURIComponent, otherwise characters such as
 * "&" or "#" in the passphrase break the URL.
 */
export function buildObsUri(params) {
  return (
    authority(params) +
    buildQuery([
      ["mode", params.mode],
      ["latency", msToMicroseconds(params.latencyMs)],
      ["streamid", encodeURIComponent(params.streamId)],
      ...secretParams(params, encodeURIComponent),
    ])
  );
}

/** FFmpeg libsrt protocol: latency is in microseconds. */
export function buildFfmpegUri(params) {
  return (
    authority(params) +
    buildQuery([
      ["mode", params.mode],
      ["latency", msToMicroseconds(params.latencyMs)],
      ["streamid", encodeURIComponent(params.streamId)],
      ...secretParams(params, encodeURIComponent),
    ])
  );
}

/** srt-live-transmit (Haivision reference tool): latency is in milliseconds. */
export function buildSrtLiveTransmitUri(params) {
  return (
    authority(params) +
    buildQuery([
      ["mode", params.mode],
      ["latency", params.latencyMs],
      ["streamid", encodeURIComponent(params.streamId)],
      ...secretParams(params, encodeURIComponent),
    ])
  );
}

/** vMix SRT input/output: latency is in milliseconds. */
export function buildVmixUri(params) {
  return (
    authority(params) +
    buildQuery([
      ["mode", params.mode],
      ["latency", params.latencyMs],
      ["streamid", encodeURIComponent(params.streamId)],
      ...secretParams(params, encodeURIComponent),
    ])
  );
}

export const TARGETS = Object.freeze([
  {
    id: "obs",
    label: "OBS Studio",
    latencyUnit: "µs",
    note: "メディアソース / 配信出力の URL 欄に貼り付け。レイテンシはマイクロ秒。",
    build: buildObsUri,
  },
  {
    id: "ffmpeg",
    label: "FFmpeg",
    latencyUnit: "µs",
    note: "ffmpeg -i <URI> / -f mpegts <URI>。レイテンシはマイクロ秒。",
    build: buildFfmpegUri,
  },
  {
    id: "slt",
    label: "srt-live-transmit",
    latencyUnit: "ms",
    note: "srt-live-transmit <入力> <出力>。レイテンシはミリ秒。",
    build: buildSrtLiveTransmitUri,
  },
  {
    id: "vmix",
    label: "vMix",
    latencyUnit: "ms",
    note: "Input/Output の SRT 設定。レイテンシはミリ秒。",
    build: buildVmixUri,
  },
]);

/** Builds every target URI at once, keyed by target id. */
export function buildAll(params) {
  const out = {};
  for (const target of TARGETS) out[target.id] = target.build(params);
  return out;
}
