import { buildOutputs } from "./uri.mjs";

const host = document.getElementById("host");
const port = document.getElementById("port");
const mode = document.getElementById("mode");
const latency = document.getElementById("latency");
const passphrase = document.getElementById("passphrase");
const pbkeylen = document.getElementById("pbkeylen");
const streamid = document.getElementById("streamid");
const transtype = document.getElementById("transtype");
const peerLatency = document.getElementById("peerlatency");
const tlpktdrop = document.getElementById("tlpktdrop");
const nakreport = document.getElementById("nakreport");
const enforced = document.getElementById("enforcedencryption");
const conntimeo = document.getElementById("conntimeo");
const payloadSize = document.getElementById("payloadsize");
const passWarn = document.getElementById("pass-warn");
const streamWarn = document.getElementById("stream-warn");
const toast = document.getElementById("toast");

const outputs = {
  obs: document.getElementById("uri-obs"),
  ffmpeg: document.getElementById("uri-ffmpeg"),
  transmit: document.getElementById("uri-transmit"),
  vmix: document.getElementById("uri-vmix"),
};

let toastTimer = 0;

function readInput() {
  return {
    host: host.value,
    port: port.value,
    mode: mode.value,
    latencyMs: latency.value,
    passphrase: passphrase.value,
    pbkeylen: pbkeylen.value,
    streamid: streamid.value,
    transtype: transtype.value,
    peerLatencyMs: peerLatency.value,
    tlpktdrop: tlpktdrop.value,
    nakreport: nakreport.value,
    enforcedencryption: enforced.value,
    conntimeoMs: conntimeo.value,
    payloadSize: payloadSize.value,
  };
}

function render() {
  const built = buildOutputs(readInput());
  outputs.obs.value = built.obs;
  outputs.ffmpeg.value = built.ffmpeg;
  outputs.transmit.value = built.transmit;
  outputs.vmix.value = built.vmix;
  passWarn.textContent = built.passphraseWarning;
  streamWarn.textContent = built.streamidWarning;
}

function showToast(message, bad) {
  toast.textContent = message;
  toast.classList.toggle("bad", Boolean(bad));
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

async function copyText(text, target) {
  if (!text) {
    const listener = mode.value === "listener";
    showToast(listener ? "port を入力してください" : "host と port を入力してください", true);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast("コピーしました");
  } catch {
    target.focus();
    target.select();
    const ok = document.execCommand("copy");
    showToast(ok ? "コピーしました" : "コピーできませんでした", !ok);
  }
}

for (const el of document.querySelectorAll("[data-field]")) {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
}

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", () => {
    const key = button.getAttribute("data-copy");
    const target = outputs[key];
    copyText(target.value, target);
  });
}

document.getElementById("toggle-pass").addEventListener("click", (event) => {
  const hidden = passphrase.type === "password";
  passphrase.type = hidden ? "text" : "password";
  event.currentTarget.textContent = hidden ? "非表示" : "表示";
});

render();
