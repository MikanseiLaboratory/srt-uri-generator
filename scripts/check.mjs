// Checks for the static site. Runs under plain Node (no dependencies):
//   node scripts/check.mjs
//
// 1. Unit tests for the pure URI builders in public/uri.mjs.
// 2. Static checks on public/: every referenced asset is a relative path
//    (so the site works under https://<user>.github.io/<repo>/) and no
//    external URLs are loaded at runtime.

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  buildAll,
  buildFfmpegUri,
  buildObsUri,
  buildSrtLiveTransmitUri,
  buildVmixUri,
  formatHost,
  msToMicroseconds,
  normalizeParams,
} from "../public/uri.mjs";

const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
let passed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const base = {
  host: "203.0.113.10",
  port: 9000,
  mode: "caller",
  latencyMs: 120,
  streamId: "",
  passphrase: "",
  pbKeyLen: 16,
};

await test("latency is converted to microseconds for OBS and FFmpeg", () => {
  assert.equal(msToMicroseconds(120), 120000);
  assert.equal(buildObsUri(base), "srt://203.0.113.10:9000?mode=caller&latency=120000");
  assert.equal(buildFfmpegUri(base), "srt://203.0.113.10:9000?mode=caller&latency=120000");
});

await test("latency stays in milliseconds for srt-live-transmit and vMix", () => {
  assert.equal(buildSrtLiveTransmitUri(base), "srt://203.0.113.10:9000?mode=caller&latency=120");
  assert.equal(buildVmixUri(base), "srt://203.0.113.10:9000?mode=caller&latency=120");
});

await test("passphrase is percent-encoded with encodeURIComponent and pbkeylen is appended", () => {
  const params = { ...base, passphrase: "p@ss w&rd#1234", pbKeyLen: 32 };
  const expectedSecret = `passphrase=${encodeURIComponent("p@ss w&rd#1234")}&pbkeylen=32`;
  assert.equal(encodeURIComponent("p@ss w&rd#1234"), "p%40ss%20w%26rd%231234");
  assert.ok(buildObsUri(params).endsWith(expectedSecret));
  assert.ok(buildFfmpegUri(params).endsWith(expectedSecret));
  assert.ok(buildSrtLiveTransmitUri(params).endsWith(expectedSecret));
  assert.ok(buildVmixUri(params).endsWith(expectedSecret));
});

await test("pbkeylen is omitted when passphrase is empty or key length is 0", () => {
  assert.ok(!buildObsUri(base).includes("pbkeylen"));
  const noLen = buildObsUri({ ...base, passphrase: "0123456789", pbKeyLen: 0 });
  assert.ok(noLen.includes("passphrase=0123456789"));
  assert.ok(!noLen.includes("pbkeylen"));
});

await test("stream id is percent-encoded", () => {
  const uri = buildObsUri({ ...base, streamId: "#!::r=live/stream1" });
  assert.ok(uri.includes(`streamid=${encodeURIComponent("#!::r=live/stream1")}`));
  assert.ok(!uri.includes("streamid=#"));
});

await test("IPv6 literals are bracketed", () => {
  assert.equal(formatHost("2001:db8::1"), "[2001:db8::1]");
  assert.equal(formatHost("[2001:db8::1]"), "[2001:db8::1]");
  assert.equal(formatHost("example.com"), "example.com");
  assert.ok(buildObsUri({ ...base, host: "2001:db8::1" }).startsWith("srt://[2001:db8::1]:9000?"));
});

await test("buildAll returns one URI per target", () => {
  const all = buildAll(base);
  assert.deepEqual(Object.keys(all).sort(), ["ffmpeg", "obs", "slt", "vmix"]);
});

await test("normalizeParams accepts form strings and reports validation errors", () => {
  const ok = normalizeParams({ host: " relay.example ", port: "4000", latencyMs: "250", pbKeyLen: "24" });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.params.host, "relay.example");
  assert.equal(ok.params.port, 4000);
  assert.equal(ok.params.latencyMs, 250);
  assert.equal(ok.params.pbKeyLen, 24);
  assert.equal(ok.params.mode, "caller");

  const bad = normalizeParams({ host: "", port: "70000", mode: "bogus", latencyMs: "-1", pbKeyLen: "7", passphrase: "short" });
  assert.equal(bad.errors.length, 6);
});

// --- static asset checks -------------------------------------------------

const html = await readFile(path.join(publicDir, "index.html"), "utf8");
const files = await readdir(publicDir);

await test("index.html references only relative local assets", () => {
  const refs = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map((m) => m[1]);
  assert.ok(refs.length > 0, "expected at least one asset reference");
  for (const ref of refs) {
    if (ref.startsWith("data:")) continue;
    assert.ok(!/^(?:[a-z]+:)?\/\//i.test(ref), `external reference found: ${ref}`);
    assert.ok(!ref.startsWith("/"), `root-absolute path breaks under a Pages subpath: ${ref}`);
    const file = ref.replace(/^\.\//, "").split(/[?#]/)[0];
    assert.ok(files.includes(file), `referenced asset missing from public/: ${ref}`);
  }
});

await test("no runtime network access in client modules", async () => {
  for (const name of files.filter((f) => f.endsWith(".mjs"))) {
    const source = await readFile(path.join(publicDir, name), "utf8");
    assert.ok(!/\bfetch\s*\(/.test(source), `${name} calls fetch()`);
    assert.ok(!/XMLHttpRequest|WebSocket|sendBeacon|EventSource/.test(source), `${name} uses a network API`);
    assert.ok(!/https?:\/\//.test(source), `${name} embeds an http(s) URL`);
  }
});

await test("no Cloudflare / Wrangler leftovers", () => {
  assert.ok(!files.some((f) => /wrangler|_worker|_routes/i.test(f)), `found Worker files in public/: ${files}`);
});

if (process.exitCode) {
  console.error(`\n${passed} check(s) passed, some failed.`);
} else {
  console.log(`\nAll ${passed} checks passed.`);
}
