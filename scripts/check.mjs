import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMediamtx,
  buildOutputs,
  buildSrtCallerUri,
  buildSrtUri,
  encodeSrtQueryValue,
  isValidCount,
  isValidPort,
  isValidSrtHost,
  mediamtxPathWarning,
} from "../public/uri.mjs";
import { detectLanguage, LANGS, STRINGS, t } from "../public/i18n.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(root, "..");
const failures = [];

function assert(cond, message) {
  if (!cond) failures.push(message);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

{
  const uri = buildSrtCallerUri({
    host: "203.0.113.10",
    port: 6100,
    latencyMs: 2000,
    passphrase: '{"passphrase":"example"}',
  });
  assert(
    uri === "srt://203.0.113.10:6100?mode=caller&latency=2000&passphrase=%7B%22passphrase%22%3A%22example%22%7D",
    `libsrt URI encoding mismatch: ${uri}`,
  );
  assert(encodeSrtQueryValue('{"passphrase":"example"}') === "%7B%22passphrase%22%3A%22example%22%7D", "encodeURIComponent passphrase");
  assert(buildSrtCallerUri({ host: "", port: 6100, latencyMs: 2000 }) === "", "caller without host should yield empty URI");
  assert(buildSrtCallerUri({ host: "203.0.113.10", port: "", latencyMs: 2000 }) === "", "empty port should yield empty URI");
}

{
  const input = {
    host: "203.0.113.10",
    port: "9000",
    mode: "caller",
    latencyMs: "2000",
    passphrase: "correct horse",
    pbkeylen: "32",
    streamid: "#!::r=live,m=publish",
  };
  const obs = buildSrtUri(input, "ffmpeg");
  const transmit = buildSrtUri(input, "libsrt");
  assert(
    obs ===
      "srt://203.0.113.10:9000?mode=caller&latency=2000000&pbkeylen=32&passphrase=correct%20horse&streamid=%23!%3A%3Ar%3Dlive%2Cm%3Dpublish",
    `OBS/FFmpeg URI mismatch: ${obs}`,
  );
  assert(
    transmit ===
      "srt://203.0.113.10:9000?mode=caller&latency=2000&pbkeylen=32&passphrase=correct%20horse&streamid=%23!%3A%3Ar%3Dlive%2Cm%3Dpublish",
    `srt-live-transmit URI mismatch: ${transmit}`,
  );
  assert(obs.includes("passphrase=correct%20horse"), "OBS passphrase uses encodeURIComponent");
  assert(!transmit.includes("pbkeylen=32") || input.passphrase, "pbkeylen stays with passphrase");
}

{
  const withoutPass = buildSrtUri(
    { host: "203.0.113.10", port: "9000", mode: "listener", latencyMs: "120", pbkeylen: "16" },
    "libsrt",
  );
  assert(withoutPass === "srt://203.0.113.10:9000?mode=listener&latency=120", `pbkeylen without passphrase: ${withoutPass}`);
  const listener = buildSrtUri({ host: "", port: "9000", mode: "listener", latencyMs: "2000" }, "libsrt");
  assert(listener === "srt://:9000?mode=listener&latency=2000", `listener without host: ${listener}`);
  const ipv6 = buildSrtUri({ host: "2001:db8::1", port: "9000", mode: "rendezvous", latencyMs: "0" }, "libsrt");
  assert(ipv6 === "srt://[2001:db8::1]:9000?mode=rendezvous&latency=0", `ipv6: ${ipv6}`);
  const pasted = buildSrtUri({ host: "[2001:db8::1]:9000", port: "", mode: "caller" }, "libsrt");
  assert(pasted === "srt://[2001:db8::1]:9000?mode=caller", `pasted ipv6: ${pasted}`);
  assert(buildSrtUri({ host: "[::1", port: "9000" }, "libsrt") === "", "unbalanced bracket yields no URI");
  assert(buildSrtUri({ host: "::1]", port: "9000" }, "libsrt") === "", "stray closing bracket yields no URI");
}

{
  const input = {
    host: "203.0.113.10",
    port: "9000",
    mode: "caller",
    latencyMs: "200",
    peerLatencyMs: "100",
    passphrase: "a&b=c d",
    enforcedencryption: "1",
    conntimeoMs: "3000",
    payloadSize: "1316",
    tlpktdrop: "1",
    nakreport: "0",
    transtype: "live",
  };
  const ffmpeg = buildSrtUri(input, "ffmpeg");
  const libsrt = buildSrtUri(input, "libsrt");
  assert(ffmpeg.includes("latency=200000"), ffmpeg);
  assert(ffmpeg.includes("peerlatency=100000"), ffmpeg);
  assert(ffmpeg.includes("passphrase=a%26b%3Dc%20d"), ffmpeg);
  assert(ffmpeg.includes("enforced_encryption=1"), ffmpeg);
  assert(ffmpeg.includes("connect_timeout=3000"), ffmpeg);
  assert(ffmpeg.includes("payload_size=1316"), ffmpeg);
  assert(libsrt.includes("latency=200"), libsrt);
  assert(libsrt.includes("peerlatency=100"), libsrt);
  assert(libsrt.includes("enforcedencryption=1"), libsrt);
  assert(libsrt.includes("conntimeo=3000"), libsrt);
  assert(libsrt.includes("payloadsize=1316"), libsrt);
  assert(libsrt.includes("tlpktdrop=1"), libsrt);
  assert(libsrt.includes("nakreport=0"), libsrt);
  assert(libsrt.includes("transtype=live"), libsrt);
  assert(!libsrt.includes("enforced_encryption"), "libsrt must not use the ffmpeg parameter name");
  assert(buildSrtUri({ ...input, latencyMs: "12ms" }, "libsrt") === "", "invalid latency should not emit a URI");
}

{
  const built = buildOutputs({
    host: "203.0.113.10",
    port: "9000",
    mode: "caller",
    latencyMs: "2000",
    passphrase: '{"passphrase":"example"}',
    pbkeylen: "32",
    streamid: "#!::r=live,m=publish",
  });
  assert(built.obs === built.ffmpeg, "OBS and FFmpeg share the FFmpeg SRT URI");
  assert(built.obs.includes("latency=2000000"), built.obs);
  assert(built.transmit.includes("latency=2000"), built.transmit);
  assert(built.transmit.includes("passphrase=%7B%22passphrase%22%3A%22example%22%7D"), built.transmit);
  assert(built.vmix.includes('Passphrase: {"passphrase":"example"}'), "vMix keeps the raw passphrase");
  assert(!built.vmix.includes("%7B"), "vMix must not percent-encode the passphrase");
  assert(built.vmix.includes("Type: Caller"), built.vmix);
  assert(built.vmix.includes("Latency: 2000 ms"), built.vmix);
  assert(built.vmix.includes("Key length: 32 (AES-256)"), built.vmix);
  assert(built.vmix.includes("Stream ID: #!::r=live,m=publish"), built.vmix);
  assert(buildOutputs({ host: "", port: "1", mode: "caller" }).obs === "", "caller still needs a host");
  assert(passphraseLength(built) === "", "example JSON passphrase is long enough");
}

function passphraseLength(built) {
  return built.passphraseWarning;
}

{
  assert(buildOutputs({ host: "203.0.113.10", port: "9", passphrase: "short" }).passphraseWarning.includes("10"), "short passphrase warning");
  assert(buildOutputs({ host: "203.0.113.10", port: "9", passphrase: "" }).passphraseWarning === "", "empty passphrase has no warning");
}

// Language-aware messages: default stays Japanese, "en" switches, semantics untouched.
{
  const base = { host: "203.0.113.10", port: "9", passphrase: "short", streamid: "x".repeat(513) };
  const ja = buildOutputs(base);
  const en = buildOutputs({ ...base, lang: "en" });
  assert(ja.passphraseWarning === "SRT のパスフレーズは 10〜79 文字です", `default warning is Japanese: ${ja.passphraseWarning}`);
  assert(en.passphraseWarning === "SRT passphrases must be 10–79 characters", `English warning: ${en.passphraseWarning}`);
  assert(ja.streamidWarning.includes("512") && en.streamidWarning.includes("512"), "streamid warning in both languages");
  assert(ja.obs === en.obs && ja.transmit === en.transmit, "language does not change the URIs");
  const vmixJa = buildOutputs({ host: "", port: "9000", mode: "listener" }).vmix;
  const vmixEn = buildOutputs({ host: "", port: "9000", mode: "listener", lang: "en" }).vmix;
  assert(vmixJa.includes("Hostname: (空欄。Listener で全インターフェイス)"), vmixJa);
  assert(vmixEn.includes("Hostname: (empty: listen on all interfaces)"), vmixEn);
  assert(buildOutputs({ ...base, lang: "xx" }).passphraseWarning === ja.passphraseWarning, "unknown language falls back to Japanese");
}

// Field validators used for inline feedback.
{
  assert(isValidSrtHost("") && isValidSrtHost("203.0.113.10") && isValidSrtHost("srt.example.net"), "plain hosts are valid");
  assert(isValidSrtHost("2001:db8::1") && isValidSrtHost("[2001:db8::1]") && isValidSrtHost("[2001:db8::1]:9000") && isValidSrtHost("host:9000"), "ipv6 and host:port forms are valid");
  assert(!isValidSrtHost("bad host") && !isValidSrtHost("a/b") && !isValidSrtHost("user@host") && !isValidSrtHost("[::1") && !isValidSrtHost("a?b"), "invalid host characters are rejected");
  assert(isValidPort("") && isValidPort("1") && isValidPort("65535"), "port range accepted");
  assert(!isValidPort("0") && !isValidPort("65536") && !isValidPort("12a") && !isValidPort("-1"), "port range rejected");
  assert(isValidCount("") && isValidCount("0") && isValidCount("2000"), "counts accepted");
  assert(!isValidCount("12ms") && !isValidCount("-5") && !isValidCount("1.5"), "counts rejected");
}

// MediaMTX: key names and stream ID convention verified against bluenviron/mediamtx
// (mediamtx.yml, docs/3-publish/03-srt-clients.md, docs/4-read/02-srt.md, internal/conf/path.go).
{
  const input = {
    host: "203.0.113.10",
    port: "8890",
    mode: "listener",
    latencyMs: "2000",
    passphrase: "correct horse battery",
    pbkeylen: "32",
    streamid: "#!::r=live,m=publish",
    mediamtxPath: "mystream",
  };
  const mtx = buildMediamtx(input);
  assert(
    mtx.yml === 'srt: true\nsrtAddress: :8890\n\npaths:\n  mystream:\n    srtPublishPassphrase: "correct horse battery"\n    srtReadPassphrase: "correct horse battery"',
    `mediamtx yml mismatch:\n${mtx.yml}`,
  );
  assert(
    mtx.publish === "srt://203.0.113.10:8890?mode=caller&latency=2000000&pbkeylen=32&passphrase=correct%20horse%20battery&streamid=publish:mystream",
    `mediamtx publish mismatch: ${mtx.publish}`,
  );
  assert(mtx.read.endsWith("&streamid=read:mystream") && mtx.read.includes("mode=caller"), `mediamtx read mismatch: ${mtx.read}`);
  assert(!mtx.publish.includes("m%3Dpublish") && !mtx.publish.includes("%23!"), "MediaMTX URIs replace the user's streamid");
  assert(mtx.publish.includes("latency=2000000"), "MediaMTX URIs use the OBS/FFmpeg microsecond profile");
  assert(mtx.pathWarning === "", "valid path has no warning");
  assert(buildOutputs(input).mediamtx.publish === mtx.publish, "buildOutputs exposes the MediaMTX output");

  const plain = buildMediamtx({ host: "203.0.113.10", port: "8890", mediamtxPath: "live/cam-1.main" });
  assert(plain.yml === "srt: true\nsrtAddress: :8890\n\npaths:\n  live/cam-1.main:", `no passphrase, no passphrase keys:\n${plain.yml}`);
  assert(plain.publish === "srt://203.0.113.10:8890?mode=caller&streamid=publish:live/cam-1.main", `slash path stays verbatim: ${plain.publish}`);

  const quoted = buildMediamtx({ host: "h", port: "8890", passphrase: 'a"b\\c d: e', mediamtxPath: "123" });
  assert(quoted.yml.includes('  "123":\n    srtPublishPassphrase: "a\\"b\\\\c d: e"'), `yaml quoting:\n${quoted.yml}`);
  assert(quoted.publish.includes("passphrase=a%22b%5Cc%20d%3A%20e"), `MediaMTX URI passphrase still uses encodeURIComponent: ${quoted.publish}`);

  const noHost = buildMediamtx({ host: "", port: "8890", mode: "listener", mediamtxPath: "s" });
  assert(noHost.yml.includes("srtAddress: :8890") && noHost.publish === "" && noHost.read === "", "yml without host, URIs need the server host");
  assert(buildMediamtx({ host: "h", port: "", mediamtxPath: "s" }).yml === "", "no port, no yml");
  assert(buildMediamtx({ host: "h", port: "8890", latencyMs: "12ms", mediamtxPath: "s" }).yml === "", "invalid latency blocks MediaMTX output");

  const bad = buildMediamtx({ host: "h", port: "8890", mediamtxPath: "/x" });
  assert(bad.yml === "" && bad.publish === "" && bad.pathWarning.includes("/"), "invalid path blocks output and reports");
  assert(mediamtxPathWarning("") !== "" && mediamtxPathWarning("   ") !== "", "empty path warns");
  assert(mediamtxPathWarning("a b") !== "" && mediamtxPathWarning("a:b") !== "" && mediamtxPathWarning("日本") !== "", "disallowed characters warn");
  assert(mediamtxPathWarning("a/../b") !== "" && mediamtxPathWarning("./a") !== "", "dot segments warn");
  assert(mediamtxPathWarning("a_b-c.d/e") === "", "allowed characters pass");
  assert(mediamtxPathWarning("/x", "en") === "Path name cannot start with /", mediamtxPathWarning("/x", "en"));
  assert(mediamtxPathWarning("/x") === "パス名は / で始められません", mediamtxPathWarning("/x"));
}

// i18n tables are complete and consistent.
{
  assert(LANGS.includes("ja") && LANGS.includes("en"), "ja and en available");
  const jaKeys = Object.keys(STRINGS.ja).sort();
  const enKeys = Object.keys(STRINGS.en).sort();
  assert(JSON.stringify(jaKeys) === JSON.stringify(enKeys), `ja/en keys differ: ${jaKeys.filter((k) => !enKeys.includes(k))} ${enKeys.filter((k) => !jaKeys.includes(k))}`);
  for (const lang of LANGS) {
    for (const [key, value] of Object.entries(STRINGS[lang])) {
      assert(typeof value === "string" && value.trim() !== "", `${lang}.${key} is a non-empty string`);
      assert(key.endsWith("Html") || !/<[a-z]/i.test(value), `${lang}.${key} contains markup without the Html suffix`);
    }
  }
  assert(t("en", "passphraseCount", { n: 12 }) === "12 / 79 characters", "placeholder substitution");
  assert(t("ja", "nope") === "nope", "unknown key returns the key");
  assert(detectLanguage("?lang=en", ["ja-JP"]) === "en", "URL lang wins");
  assert(detectLanguage("", ["ja-JP"]) === "ja" && detectLanguage("", ["en-US"]) === "en" && detectLanguage("", []) === "ja", "browser language fallback");
  assert(detectLanguage("?lang=zz", ["fr"]) === "en", "unknown URL lang ignored");
}

{
  const html = readFileSync(join(siteRoot, "public/index.html"), "utf8");
  const wf = readFileSync(join(siteRoot, ".github/workflows/pages.yml"), "utf8");
  const publicFiles = walk(join(siteRoot, "public")).filter((f) => /\.(html|mjs|js|css)$/.test(f));
  const clientSource = publicFiles.map((f) => readFileSync(f, "utf8")).join("\n");
  for (const id of ["host", "port", "mode", "latency", "passphrase", "pbkeylen", "streamid", "toast"]) {
    assert(html.includes(`id="${id}"`), `generator has ${id}`);
  }
  for (const id of ["lang-switch", "theme-toggle", "tab-obs", "tab-ffmpeg", "tab-transmit", "tab-vmix", "tab-mediamtx", "mediamtx-path", "uri-mediamtx-yml", "uri-mediamtx-publish", "uri-mediamtx-read", "quick-copy", "gen-pass", "toggle-pass"]) {
    assert(html.includes(`id="${id}"`), `page has ${id}`);
  }
  assert(html.includes('value="caller"'), "generator default mode is caller");
  assert(html.includes('value="2000"'), "generator default latency");
  assert(html.includes('value="listener"') && html.includes('value="rendezvous"'), "all three modes");
  assert(html.includes("./app.mjs"), "page loads the client module");
  assert(html.includes("./style.css"), "page loads the stylesheet");
  assert(!html.includes("status.html"), "page no longer links to the flow dashboard");
  assert(!/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/.test(clientSource), "client does not send or store the passphrase");
  assert(!/@import|url\(\s*["']?(?:https?:)?\/\//.test(clientSource), "no remote stylesheets or fonts");
  for (const ref of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
    assert(!/^(?:[a-z]+:)?\/\//i.test(ref[1]) && !ref[1].startsWith("/"), `asset path must be relative for the Pages subpath: ${ref[1]}`);
  }
  for (const key of html.matchAll(/data-i18n(?:-html|-placeholder|-label|-title)?="([^"]+)"/g)) {
    assert(key[1] in STRINGS.ja, `i18n key used in HTML exists: ${key[1]}`);
  }
  for (const key of html.matchAll(/data-i18n-html="([^"]+)"/g)) {
    assert(key[1].endsWith("Html"), `data-i18n-html keys must end with Html: ${key[1]}`);
  }
  for (const key of html.matchAll(/data-i18n="([^"]+)"/g)) {
    assert(!key[1].endsWith("Html"), `data-i18n keys must not be Html keys: ${key[1]}`);
  }
  // The static (no-JS) Japanese text must match the dictionary so the two cannot drift.
  for (const m of html.matchAll(/<(\w+)[^>]*?\sdata-i18n(?:-html)?="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)) {
    assert(m[3].trim() === STRINGS.ja[m[2]], `static text for ${m[2]} matches STRINGS.ja: ${m[3].trim()}`);
  }
  for (const m of html.matchAll(/data-i18n-label="([^"]+)"[^>]*\baria-label="([^"]*)"|aria-label="([^"]*)"[^>]*\bdata-i18n-label="([^"]+)"/g)) {
    const key = m[1] ?? m[4];
    const label = m[2] ?? m[3];
    assert(label === STRINGS.ja[key], `static aria-label for ${key} matches STRINGS.ja: ${label}`);
  }

  // OGP / social preview metadata and icons.
  const meta = (attr, name) => {
    const m = html.match(new RegExp(`<meta[^>]*\\b${attr}="${name.replace(/[:.]/g, "\\$&")}"[^>]*\\bcontent="([^"]*)"`))
      || html.match(new RegExp(`<meta[^>]*\\bcontent="([^"]*)"[^>]*\\b${attr}="${name.replace(/[:.]/g, "\\$&")}"`));
    return m ? m[1] : null;
  };
  const site = "https://mikanseilaboratory.github.io/srt-uri-generator/";
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
  assert(title.includes("SRT URI Generator") && title.length > 20, `title is descriptive: ${title}`);
  assert((meta("name", "description") ?? "").length > 40, "meta description present");
  assert(meta("property", "og:type") === "website", "og:type");
  assert((meta("property", "og:title") ?? "").includes("SRT URI Generator"), "og:title");
  assert((meta("property", "og:description") ?? "").length > 40, "og:description");
  assert(meta("property", "og:url") === site, `og:url is the Pages URL: ${meta("property", "og:url")}`);
  assert(meta("property", "og:image") === `${site}ogp.png`, `og:image is absolute: ${meta("property", "og:image")}`);
  assert(meta("property", "og:image:width") === "1200" && meta("property", "og:image:height") === "630", "og:image dimensions declared");
  assert(meta("name", "twitter:card") === "summary_large_image", "twitter:card");
  assert(meta("name", "twitter:image") === `${site}ogp.png`, "twitter:image");
  assert(/<link[^>]*rel="icon"[^>]*href="\.\/favicon\.svg"/.test(html), "svg favicon linked");
  assert(/<link[^>]*rel="icon"[^>]*href="\.\/favicon\.png"/.test(html), "png favicon linked");
  assert(/<link[^>]*rel="apple-touch-icon"[^>]*href="\.\/apple-touch-icon\.png"/.test(html), "apple touch icon linked");
  const pngSize = (file) => {
    const buf = readFileSync(join(siteRoot, "public", file));
    const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    return isPng ? [buf.readUInt32BE(16), buf.readUInt32BE(20)] : null;
  };
  assert(JSON.stringify(pngSize("ogp.png")) === "[1200,630]", `public/ogp.png is a 1200x630 PNG: ${pngSize("ogp.png")}`);
  assert(pngSize("favicon.png") !== null, "public/favicon.png is a PNG");
  assert(pngSize("apple-touch-icon.png") !== null, "public/apple-touch-icon.png is a PNG");
  assert(readFileSync(join(siteRoot, "public/favicon.svg"), "utf8").startsWith("<svg"), "public/favicon.svg exists");
  assert(wf.includes("actions/upload-pages-artifact"), "workflow uploads the Pages artifact");
  assert(wf.includes("actions/deploy-pages"), "workflow deploys with deploy-pages");
  assert(/path:\s*public\b/.test(wf), "Pages artifact is the public directory");
  assert(!wf.includes("secrets."), "deploy needs no GitHub secrets");
  assert(!/cloudflare|wrangler|CLOUDFLARE_|AWS_/i.test(wf), "workflow has no Cloudflare or AWS setup");
  const banned = ["makuhari", "osaki", "glight", "幕張", "大崎", "MediaConnect", "ZWC8fo4XfKkF5BVQVuCpEYul", "57.182.0.18"];
  for (const file of walk(siteRoot)) {
    if (file.endsWith("package-lock.json") || file.endsWith(`${sep}check.mjs`) || /\.(png|jpe?g|gif|ico|webp)$/i.test(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const word of banned) {
      assert(!text.includes(word), `${file} still contains ${word}`);
    }
    if (file.includes(`${sep}public${sep}`)) {
      assert(!/tgs|TGS|glight|Glight/i.test(text), `${file} still names a specific deployment`);
    }
  }
}

if (failures.length) {
  console.error(failures.map((f) => `FAIL ${f}`).join("\n"));
  process.exit(1);
}
console.log("ok");
