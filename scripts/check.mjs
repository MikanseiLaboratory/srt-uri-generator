import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOutputs, buildSrtCallerUri, buildSrtUri, encodeSrtQueryValue } from "../public/uri.mjs";

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

{
  const html = readFileSync(join(siteRoot, "public/index.html"), "utf8");
  const app = readFileSync(join(siteRoot, "public/app.mjs"), "utf8");
  const uri = readFileSync(join(siteRoot, "public/uri.mjs"), "utf8");
  const wf = readFileSync(join(siteRoot, ".github/workflows/pages.yml"), "utf8");
  for (const id of ["host", "port", "mode", "latency", "passphrase", "pbkeylen", "streamid", "toast"]) {
    assert(html.includes(`id="${id}"`), `generator has ${id}`);
  }
  assert(html.includes('value="caller"'), "generator default mode is caller");
  assert(html.includes('value="2000"'), "generator default latency");
  assert(html.includes('value="listener"') && html.includes('value="rendezvous"'), "all three modes");
  assert(html.includes("./app.mjs"), "page loads the client module");
  assert(!html.includes("status.html"), "page no longer links to the flow dashboard");
  assert(!/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage/.test(html + app + uri), "client does not send or store the passphrase");
  for (const ref of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
    assert(!/^(?:[a-z]+:)?\/\//i.test(ref[1]) && !ref[1].startsWith("/"), `asset path must be relative for the Pages subpath: ${ref[1]}`);
  }
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
