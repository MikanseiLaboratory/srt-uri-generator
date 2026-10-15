/**
 * Stateless SRT URI builder. Runs in the browser only.
 * The passphrase is interpolated into the returned strings and must not be sent anywhere.
 *
 * Query values use encodeURIComponent. That encoding was verified for the OBS
 * passphrase (including a JSON secret string).
 */

const FFMPEG = {
  id: "ffmpeg",
  latencyScale: 1000,
  keys: {
    peerlatency: "peerlatency",
    enforced: "enforced_encryption",
    conntimeo: "connect_timeout",
    payload: "payload_size",
  },
};

const LIBSRT = {
  id: "libsrt",
  latencyScale: 1,
  keys: {
    peerlatency: "peerlatency",
    enforced: "enforcedencryption",
    conntimeo: "conntimeo",
    payload: "payloadsize",
  },
};

const MODE_LABEL = {
  caller: "Caller",
  listener: "Listener",
  rendezvous: "Rendezvous",
};

const AES_LABEL = {
  16: "AES-128",
  24: "AES-192",
  32: "AES-256",
};

export function encodeSrtQueryValue(value) {
  return encodeURIComponent(String(value));
}

export function normalizeInput(input = {}) {
  const split = splitHostPort(input.host, input.port);
  const mode = cleanMode(input.mode);
  return {
    mode,
    host: split.host,
    port: split.port,
    latencyMs: cleanInt(input.latencyMs ?? input.latency),
    passphrase: input.passphrase == null ? "" : String(input.passphrase),
    pbkeylen: cleanPbkeylen(input.pbkeylen),
    streamid: input.streamid == null ? "" : String(input.streamid),
    transtype: cleanTranstype(input.transtype),
    peerLatencyMs: cleanInt(input.peerLatencyMs),
    tlpktdrop: cleanBit(input.tlpktdrop),
    nakreport: cleanBit(input.nakreport),
    enforcedencryption: cleanBit(input.enforcedencryption),
    conntimeoMs: cleanInt(input.conntimeoMs),
    payloadSize: cleanInt(input.payloadSize),
  };
}

export function buildSrtUri(input, profileName = "libsrt") {
  const norm = normalizeInput(input);
  return buildFromNormalized(norm, profileByName(profileName));
}

/** libsrt / srt-live-transmit URI. Latency stays in milliseconds. */
export function buildSrtCallerUri({ host, port, latencyMs, passphrase, mode = "caller" } = {}) {
  return buildSrtUri({ host, port, mode, latencyMs, passphrase }, "libsrt");
}

export function buildOutputs(input) {
  const norm = normalizeInput(input);
  const obs = buildFromNormalized(norm, FFMPEG);
  const transmit = buildFromNormalized(norm, LIBSRT);
  return {
    obs,
    ffmpeg: obs,
    transmit,
    vmix: buildVmix(norm),
    passphraseWarning: passphraseWarning(norm.passphrase),
    streamidWarning: norm.streamid.length > 512 ? "streamid は 512 文字までです" : "",
  };
}

export function passphraseWarning(passphrase) {
  const len = String(passphrase ?? "").length;
  if (len === 0) return "";
  if (len < 10 || len > 79) return "SRT のパスフレーズは 10〜79 文字です";
  return "";
}

function buildFromNormalized(norm, profile) {
  const authority = authorityOf(norm.host, norm.port, norm.mode);
  if (!authority) return "";
  if ([norm.latencyMs, norm.peerLatencyMs, norm.conntimeoMs, norm.payloadSize].includes(undefined)) {
    return "";
  }
  const params = [`mode=${encodeSrtQueryValue(norm.mode)}`];
  pushScaled(params, "latency", norm.latencyMs, profile.latencyScale);
  pushScaled(params, profile.keys.peerlatency, norm.peerLatencyMs, profile.latencyScale);
  if (norm.passphrase !== "" && norm.pbkeylen) {
    params.push(`pbkeylen=${encodeSrtQueryValue(norm.pbkeylen)}`);
  }
  if (norm.passphrase !== "") {
    params.push(`passphrase=${encodeSrtQueryValue(norm.passphrase)}`);
  }
  if (norm.streamid !== "") {
    params.push(`streamid=${encodeSrtQueryValue(norm.streamid)}`);
  }
  if (norm.transtype) {
    params.push(`transtype=${encodeSrtQueryValue(norm.transtype)}`);
  }
  pushBit(params, "tlpktdrop", norm.tlpktdrop);
  pushBit(params, "nakreport", norm.nakreport);
  pushBit(params, profile.keys.enforced, norm.enforcedencryption);
  if (norm.conntimeoMs != null) {
    params.push(`${profile.keys.conntimeo}=${encodeSrtQueryValue(norm.conntimeoMs)}`);
  }
  if (norm.payloadSize != null) {
    params.push(`${profile.keys.payload}=${encodeSrtQueryValue(norm.payloadSize)}`);
  }
  return `srt://${authority}?${params.join("&")}`;
}

function buildVmix(norm) {
  if ([norm.latencyMs, norm.peerLatencyMs, norm.conntimeoMs, norm.payloadSize].includes(undefined)) return "";
  if (!authorityOf(norm.host, norm.port, norm.mode)) return "";
  const lines = [
    `Hostname: ${norm.host || "(空欄。Listener で全インターフェイス)"}`,
    `Port: ${norm.port}`,
    `Type: ${MODE_LABEL[norm.mode]}`,
  ];
  if (norm.latencyMs != null) lines.push(`Latency: ${norm.latencyMs} ms`);
  if (norm.peerLatencyMs != null) lines.push(`Peer latency: ${norm.peerLatencyMs} ms`);
  if (norm.passphrase !== "") lines.push(`Passphrase: ${norm.passphrase}`);
  if (norm.streamid !== "") lines.push(`Stream ID: ${norm.streamid}`);
  if (norm.passphrase !== "" && norm.pbkeylen) {
    lines.push(`Key length: ${norm.pbkeylen} (${AES_LABEL[norm.pbkeylen]})`);
  }
  if (norm.transtype) lines.push(`Transtype: ${norm.transtype}`);
  if (norm.tlpktdrop) lines.push(`Too-late packet drop: ${norm.tlpktdrop}`);
  if (norm.nakreport) lines.push(`NAK report: ${norm.nakreport}`);
  if (norm.enforcedencryption) lines.push(`Enforced encryption: ${norm.enforcedencryption}`);
  if (norm.conntimeoMs != null) lines.push(`Connect timeout: ${norm.conntimeoMs} ms`);
  if (norm.payloadSize != null) lines.push(`Payload size: ${norm.payloadSize}`);
  return lines.join("\n");
}

function authorityOf(host, port, mode) {
  if (!/^\d+$/.test(String(port ?? ""))) return "";
  const portNum = Number(port);
  if (!Number.isSafeInteger(portNum) || portNum < 1 || portNum > 65535) return "";
  const rawHost = String(host ?? "").trim();
  const formatted = formatSrtHost(rawHost);
  if (rawHost && !formatted) return "";
  if (!formatted) {
    return mode === "listener" ? `:${portNum}` : "";
  }
  return `${formatted}:${portNum}`;
}

function formatSrtHost(host) {
  const h = String(host ?? "").trim();
  if (!h) return "";
  if (/[\s/?#@\\]/.test(h)) return "";
  if (h.startsWith("[") && h.endsWith("]")) {
    const inner = h.slice(1, -1);
    if (!inner || inner.includes("]")) return "";
    return `[${inner}]`;
  }
  if (h.includes(":")) {
    if (h.includes("]")) return "";
    return `[${h}]`;
  }
  return h;
}

function splitHostPort(host, port) {
  let h = String(host ?? "").trim();
  let p = String(port ?? "").trim();
  const bracketed = h.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (bracketed) {
    h = bracketed[1];
    if (!p && bracketed[2]) p = bracketed[2];
    return { host: h, port: p };
  }
  const withPort = h.match(/^([^:\[\]]+):(\d+)$/);
  if (withPort) {
    h = withPort[1];
    if (!p) p = withPort[2];
  }
  return { host: h, port: p };
}

function profileByName(name) {
  return name === "ffmpeg" || name === "obs" ? FFMPEG : LIBSRT;
}

function cleanMode(mode) {
  const value = String(mode ?? "").trim().toLowerCase();
  if (value === "listener" || value === "rendezvous" || value === "caller") return value;
  return "caller";
}

function cleanTranstype(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "live" || text === "file") return text;
  return "";
}

function cleanPbkeylen(value) {
  const text = String(value ?? "").trim();
  if (text === "16" || text === "24" || text === "32") return text;
  return "";
}

function cleanBit(value) {
  const text = String(value ?? "").trim();
  if (text === "0" || text === "1") return text;
  return "";
}

/** null omits the parameter. undefined rejects the URI. */
function cleanInt(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (text === "") return null;
  if (!/^\d+$/.test(text)) return undefined;
  const n = Number(text);
  if (!Number.isSafeInteger(n)) return undefined;
  return String(n);
}

function pushScaled(params, key, value, scale) {
  if (value == null) return;
  const scaled = String(Number(value) * scale);
  params.push(`${key}=${encodeSrtQueryValue(scaled)}`);
}

function pushBit(params, key, value) {
  if (!value) return;
  params.push(`${key}=${encodeSrtQueryValue(value)}`);
}
