import { TARGETS, normalizeParams } from "./uri.mjs";

const form = document.getElementById("form");
const errorsEl = document.getElementById("errors");
const resultsEl = document.getElementById("results");

const outputs = new Map();

for (const target of TARGETS) {
  const wrapper = document.createElement("div");
  wrapper.className = "result";
  wrapper.dataset.target = target.id;

  const heading = document.createElement("div");
  const h3 = document.createElement("h3");
  h3.textContent = `${target.label} (latency: ${target.latencyUnit})`;
  const note = document.createElement("p");
  note.className = "note";
  note.textContent = target.note;
  heading.append(h3, note);

  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "コピー";
  copy.disabled = true;

  const output = document.createElement("output");
  output.id = `uri-${target.id}`;
  output.setAttribute("for", "form");

  copy.addEventListener("click", async () => {
    const text = output.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = "コピーしました";
    } catch {
      copy.textContent = "コピー失敗";
    }
    setTimeout(() => {
      copy.textContent = "コピー";
    }, 1500);
  });

  wrapper.append(heading, copy, output);
  resultsEl.append(wrapper);
  outputs.set(target.id, { output, copy, build: target.build });
}

function readForm() {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function render() {
  const { params, errors } = normalizeParams(readForm());

  errorsEl.replaceChildren(
    ...errors.map((message) => {
      const li = document.createElement("li");
      li.textContent = message;
      return li;
    }),
  );

  const valid = errors.length === 0;
  for (const { output, copy, build } of outputs.values()) {
    output.textContent = valid ? build(params) : "";
    copy.disabled = !valid;
  }
}

form.addEventListener("input", render);
form.addEventListener("change", render);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  render();
});

render();
