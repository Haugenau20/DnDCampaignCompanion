// functions/src/operator/http/assets.ts
//
// The operator page's two static files, served from memory: its own
// stylesheet, with its own custom properties (it loads nothing of the React
// app or its theme), and the script that adds a copy button. The pages work
// without the script.

/** The stylesheet: usable at 320 px, controls at least 44 px, light and dark. */
export const OPERATOR_CSS = `
:root {
  --bg: #f7f5f0; --surface: #ffffff; --ink: #1d1b16; --muted: #5d584c;
  --line: #d9d3c4; --accent: #6b4f1d; --accent-ink: #ffffff;
  --ok-bg: #e5f2e3; --ok-ink: #1f4d1a; --bad-bg: #f8e3e0; --bad-ink: #7a1d12;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #171511; --surface: #221f19; --ink: #f1ece1; --muted: #b3ab99;
    --line: #3d382d; --accent: #d9a85b; --accent-ink: #171511;
    --ok-bg: #1f3320; --ok-ink: #bfe3b8; --bad-bg: #3b1d19; --bad-ink: #f3c2b9;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink);
  font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
header { background: var(--surface); border-bottom: 1px solid var(--line); padding: 12px 16px; }
header nav { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: center; }
header a { color: var(--ink); font-weight: 600; text-decoration: none; min-height: 44px;
  display: inline-flex; align-items: center; }
header a[aria-current="page"] { color: var(--accent); }
header p { margin: 4px 0 0; color: var(--muted); font-size: 14px; overflow-wrap: anywhere; }
main { max-width: 760px; margin: 0 auto; padding: 16px; }
h1 { font-size: 24px; margin: 8px 0 16px; }
h2 { font-size: 19px; margin: 0 0 12px; }
section { background: var(--surface); border: 1px solid var(--line); border-radius: 8px;
  padding: 16px; margin-bottom: 16px; }
label { display: block; font-weight: 600; margin-bottom: 4px; }
input[type=text], input[type=email], input[type=number], input[type=date] {
  width: 100%; min-height: 44px; padding: 8px 10px; font: inherit; color: var(--ink);
  background: var(--bg); border: 1px solid var(--line); border-radius: 6px; }
.field { margin-bottom: 12px; }
.hint { color: var(--muted); font-size: 14px; margin: 4px 0 0; }
.row { display: flex; flex-wrap: wrap; gap: 12px; }
.row .field { flex: 1 1 120px; }
button { min-height: 44px; padding: 8px 16px; font: inherit; font-weight: 600; border-radius: 6px;
  border: 1px solid var(--accent); background: var(--accent); color: var(--accent-ink); cursor: pointer; }
button.secondary { background: transparent; color: var(--accent); }
.check { display: flex; gap: 8px; align-items: center; min-height: 44px; font-weight: 600; }
.notice { border-radius: 6px; padding: 12px; margin-bottom: 16px; }
.notice.ok { background: var(--ok-bg); color: var(--ok-ink); }
.notice.bad { background: var(--bad-bg); color: var(--bad-ink); }
.link { font-family: ui-monospace, Consolas, monospace; overflow-wrap: anywhere;
  background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 10px; }
ul.links { list-style: none; margin: 0; padding: 0; }
ul.links li { border-top: 1px solid var(--line); padding: 12px 0; }
ul.links li:first-child { border-top: 0; }
.meta { color: var(--muted); font-size: 14px; margin: 2px 0; overflow-wrap: anywhere; }
.status { font-weight: 600; }
dl { display: grid; grid-template-columns: minmax(0, 10rem) minmax(0, 1fr); gap: 4px 12px; margin: 0; }
dt { color: var(--muted); }
dd { margin: 0; overflow-wrap: anywhere; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; padding: 6px 8px 6px 0; border-top: 1px solid var(--line); }
form.inline { display: inline; }
a { color: var(--accent); }
`;

/** Adds a copy button wherever the page marks one; nothing breaks without it. */
export const COPY_JS = `
"use strict";
for (const button of document.querySelectorAll("button[data-copy]")) {
  const source = document.getElementById(button.dataset.copy);
  if (!source || !navigator.clipboard) continue;
  button.hidden = false;
  button.addEventListener("click", () => {
    navigator.clipboard.writeText(source.textContent.trim()).then(() => {
      button.textContent = "Copied";
    });
  });
}
`;
