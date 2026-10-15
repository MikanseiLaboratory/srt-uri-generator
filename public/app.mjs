import { buildOutputs, isValidCount, isValidPort, isValidSrtHost } from "./uri.mjs";
import { applyTranslations, detectLanguage, LANGS, t } from "./i18n.mjs";

const $ = (id) => document.getElementById(id);

const form = $("form");
const host = $("host");
const port = $("port");
const latency = $("latency");
const passphrase = $("passphrase");
const pbkeylen = $("pbkeylen");
const streamid = $("streamid");
const transtype = $("transtype");
const peerLatency = $("peerlatency");
const tlpktdrop = $("tlpktdrop");
const nakreport = $("nakreport");
const enforced = $("enforcedencryption");
const conntimeo = $("conntimeo");
const payloadSize = $("payloadsize");
const mediamtxPath = $("mediamtx-path");
const toast = $("toast");
const outputCard = $("output");
const outputEmpty = $("output-empty");
const mediamtxEmpty = $("mediamtx-empty");
const modeHelp = $("mode-help");
const passCount = $("pass-count");
const togglePass = $("toggle-pass");

const outputs = {
  obs: $("uri-obs"),
  ffmpeg: $("uri-ffmpeg"),
  transmit: $("uri-transmit"),
  vmix: $("uri-vmix"),
  mediamtxYml: $("uri-mediamtx-yml"),
  mediamtxPublish: $("uri-mediamtx-publish"),
  mediamtxRead: $("uri-mediamtx-read"),
};

const errors = {
  host: $("host-error"),
  port: $("port-error"),
  latency: $("latency-error"),
  peerlatency: $("peerlatency-error"),
  conntimeo: $("conntimeo-error"),
  payloadsize: $("payloadsize-error"),
  passphrase: $("pass-warn"),
  streamid: $("stream-warn"),
  mediamtxPath: $("mediamtx-path-error"),
};

const TABS = ["obs", "ffmpeg", "transmit", "vmix", "mediamtx"];
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = Object.fromEntries(TABS.map((key) => [key, $(`panel-${key}`)]));
/** Primary output of each tab, used by the mobile quick-copy bar. */
const QUICK_TARGET = { obs: "obs", ffmpeg: "ffmpeg", transmit: "transmit", vmix: "vmix", mediamtx: "mediamtxPublish" };
const quick = $("quick");
const quickCopy = $("quick-copy");
let outputOnScreen = false;

let lang = detectLanguage(location.search, navigator.languages?.length ? navigator.languages : [navigator.language]);
let activeTab = (() => {
  const wanted = new URLSearchParams(location.search).get("tab");
  return TABS.includes(wanted) ? wanted : "obs";
})();
const touched = new Set();
let toastTimer = 0;

function modeValue() {
  return form.querySelector('input[name="mode"]:checked')?.value ?? "caller";
}

function readInput() {
  return {
    host: host.value,
    port: port.value,
    mode: modeValue(),
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
    mediamtxPath: mediamtxPath.value,
    lang,
  };
}

function setError(input, holder, message) {
  holder.textContent = message;
  if (message) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
  return Boolean(message);
}

function validate(input, built) {
  const listener = input.mode === "listener";
  let invalid = false;

  const hostEmpty = input.host.trim() === "";
  let hostMessage = "";
  if (!hostEmpty && !isValidSrtHost(input.host)) hostMessage = t(lang, "hostInvalid");
  else if (hostEmpty && !listener && touched.has("host")) hostMessage = t(lang, "hostRequired");
  invalid = setError(host, errors.host, hostMessage) || invalid;

  const portEmpty = input.port.trim() === "";
  let portMessage = "";
  if (!portEmpty && !isValidPort(input.port)) portMessage = t(lang, "portInvalid");
  else if (portEmpty && touched.has("port")) portMessage = t(lang, "portRequired");
  invalid = setError(port, errors.port, portMessage) || invalid;

  let latencyMessage = "";
  if (input.latencyMs.trim() === "") latencyMessage = t(lang, "latencyRequired");
  else if (!isValidCount(input.latencyMs)) latencyMessage = t(lang, "latencyInvalid");
  invalid = setError(latency, errors.latency, latencyMessage) || invalid;

  for (const [el, holder, value] of [
    [peerLatency, errors.peerlatency, input.peerLatencyMs],
    [conntimeo, errors.conntimeo, input.conntimeoMs],
    [payloadSize, errors.payloadsize, input.payloadSize],
  ]) {
    invalid = setError(el, holder, isValidCount(value) ? "" : t(lang, "intInvalid")) || invalid;
  }

  invalid = setError(passphrase, errors.passphrase, built.passphraseWarning) || invalid;
  invalid = setError(streamid, errors.streamid, built.streamidWarning) || invalid;
  setError(mediamtxPath, errors.mediamtxPath, built.mediamtx.pathWarning);

  // Invalid numeric fields block the URI; a missing host/port is just "not yet".
  const blocking = Boolean(hostMessage && !hostEmpty) || Boolean(portMessage && !portEmpty) || Boolean(latencyMessage)
    || !isValidCount(input.peerLatencyMs) || !isValidCount(input.conntimeoMs) || !isValidCount(input.payloadSize);
  return { blocking, listener };
}

function render() {
  const input = readInput();
  const built = buildOutputs(input);

  outputs.obs.textContent = built.obs;
  outputs.ffmpeg.textContent = built.ffmpeg;
  outputs.transmit.textContent = built.transmit;
  outputs.vmix.textContent = built.vmix;
  outputs.mediamtxYml.textContent = built.mediamtx.yml;
  outputs.mediamtxPublish.textContent = built.mediamtx.publish;
  outputs.mediamtxRead.textContent = built.mediamtx.read;

  const { blocking, listener } = validate(input, built);

  const hasUri = built.obs !== "";
  outputEmpty.hidden = hasUri || activeTab === "mediamtx";
  outputEmpty.textContent = blocking ? t(lang, "outputInvalid") : t(lang, listener ? "outputEmptyListener" : "outputEmptyCaller");
  for (const key of ["obs", "ffmpeg", "transmit", "vmix"]) {
    panels[key].querySelector(".out").hidden = !hasUri;
  }

  const mtx = built.mediamtx;
  outputs.mediamtxYml.closest(".out").hidden = mtx.yml === "";
  outputs.mediamtxPublish.closest(".out").hidden = mtx.publish === "";
  outputs.mediamtxRead.closest(".out").hidden = mtx.read === "";
  mediamtxEmpty.hidden = mtx.publish !== "" || Boolean(mtx.pathWarning) || blocking;

  modeHelp.textContent = t(lang, `mode${input.mode[0].toUpperCase()}${input.mode.slice(1)}Help`);
  passCount.textContent = passphrase.value ? t(lang, "passphraseCount", { n: passphrase.value.length }) : "";
  for (const chip of document.querySelectorAll("[data-latency]")) {
    chip.setAttribute("aria-pressed", String(chip.dataset.latency === latency.value.trim()));
  }
  updateQuickBar();
}

function updateQuickBar() {
  const target = QUICK_TARGET[activeTab];
  const text = outputs[target].textContent;
  const name = document.querySelector(`[data-copy="${target}"]`).dataset.copyName;
  quickCopy.setAttribute("aria-label", t(lang, "copyLabel", { name }));
  quickCopy.querySelector("[data-i18n]").textContent = quickCopy.classList.contains("is-copied") ? t(lang, "copied") : t(lang, "copyLabel", { name });
  const visible = text !== "" && !outputOnScreen;
  quick.classList.toggle("is-visible", visible);
  document.body.classList.toggle("has-quick", visible);
}

function showToast(message, bad) {
  toast.textContent = message;
  toast.classList.toggle("bad", Boolean(bad));
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

async function copyText(text, button) {
  if (!text) {
    touched.add("host");
    touched.add("port");
    render();
    showToast(t(lang, "copyEmpty"), true);
    return;
  }
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    ok = fallbackCopy(text);
  }
  showToast(t(lang, ok ? "copied" : "copyFailed"), !ok);
  if (ok && button) {
    const label = button.querySelector("[data-i18n]");
    button.classList.add("is-copied");
    label.textContent = t(lang, "copied");
    clearTimeout(button.copyTimer);
    button.copyTimer = setTimeout(() => {
      button.classList.remove("is-copied");
      label.textContent = t(lang, "copy");
      updateQuickBar();
    }, 1600);
  }
}

function selectTab(key, { focus = false } = {}) {
  activeTab = key;
  for (const tab of tabs) {
    const selected = tab.dataset.tab === key;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  }
  for (const [name, panel] of Object.entries(panels)) panel.hidden = name !== key;
  syncUrl();
  render();
}

function syncUrl() {
  const params = new URLSearchParams();
  if (lang !== "ja") params.set("lang", lang);
  if (activeTab !== "obs") params.set("tab", activeTab);
  const query = params.toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
}

function setLanguage(next) {
  if (!LANGS.includes(next)) return;
  lang = next;
  document.documentElement.lang = next;
  document.title = t(lang, "documentTitle");
  applyTranslations(document, lang);
  for (const button of document.querySelectorAll("[data-lang]")) {
    button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
  }
  togglePass.textContent = t(lang, passphrase.type === "password" ? "passphraseShow" : "passphraseHide");
  for (const button of document.querySelectorAll("[data-copy]")) {
    button.setAttribute("aria-label", t(lang, "copyLabel", { name: button.dataset.copyName }));
  }
  syncUrl();
  render();
}

function currentTheme() {
  const forced = document.documentElement.dataset.theme;
  if (forced) return forced;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("theme-toggle").setAttribute("aria-pressed", String(theme === "dark"));
}

function randomPassphrase(length = 32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const out = [];
  const bytes = new Uint8Array(length * 2);
  while (out.length < length) {
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      // Rejection sampling keeps the distribution uniform (248 = 4 * 62).
      if (b < 248 && out.length < length) out.push(alphabet[b % alphabet.length]);
    }
  }
  return out.join("");
}

for (const el of document.querySelectorAll("[data-field]")) {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
}
for (const el of [host, port]) {
  el.addEventListener("blur", () => {
    touched.add(el.id);
    render();
  });
}

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", () => copyText(outputs[button.dataset.copy].textContent, button));
}

for (const chip of document.querySelectorAll("[data-latency]")) {
  chip.addEventListener("click", () => {
    latency.value = chip.dataset.latency;
    render();
  });
}

togglePass.addEventListener("click", () => {
  const hidden = passphrase.type === "password";
  passphrase.type = hidden ? "text" : "password";
  togglePass.setAttribute("aria-pressed", String(hidden));
  togglePass.textContent = t(lang, hidden ? "passphraseHide" : "passphraseShow");
});

$("gen-pass").addEventListener("click", () => {
  passphrase.value = randomPassphrase();
  if (passphrase.type === "password") togglePass.click();
  render();
  passphrase.focus();
});

form.addEventListener("submit", (event) => event.preventDefault());
form.addEventListener("reset", () => {
  touched.clear();
  // The path field lives in the output card, outside the form.
  mediamtxPath.value = mediamtxPath.defaultValue;
  requestAnimationFrame(() => {
    render();
    host.focus();
  });
});

for (const tab of tabs) {
  tab.addEventListener("click", () => selectTab(tab.dataset.tab));
  tab.addEventListener("keydown", (event) => {
    const index = TABS.indexOf(activeTab);
    let next = null;
    if (event.key === "ArrowRight") next = TABS[(index + 1) % TABS.length];
    else if (event.key === "ArrowLeft") next = TABS[(index - 1 + TABS.length) % TABS.length];
    else if (event.key === "Home") next = TABS[0];
    else if (event.key === "End") next = TABS[TABS.length - 1];
    if (next) {
      event.preventDefault();
      selectTab(next, { focus: true });
    }
  });
}

for (const button of document.querySelectorAll("[data-lang]")) {
  button.addEventListener("click", () => setLanguage(button.dataset.lang));
}

quickCopy.addEventListener("click", () => copyText(outputs[QUICK_TARGET[activeTab]].textContent, quickCopy));
if ("IntersectionObserver" in window) {
  new IntersectionObserver((entries) => {
    outputOnScreen = entries.some((entry) => entry.isIntersecting);
    updateQuickBar();
  }, { threshold: 0.15 }).observe(outputCard);
}

$("theme-toggle").addEventListener("click", () => setTheme(currentTheme() === "dark" ? "light" : "dark"));
$("theme-toggle").setAttribute("aria-pressed", String(currentTheme() === "dark"));

selectTab(activeTab);
setLanguage(lang);
