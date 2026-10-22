import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { variants } from './variants.mjs';

const tpl = readFileSync('src/template.css', 'utf8');

// Bundled fonts ship only with the server-installed theme: Mastodon's CSP
// limits font-src to the instance itself, so pasted CSS can't load them.
const fontDir = 'mastodon/app/javascript/styles/tangerineui-fonts';
const faces = JSON.parse(readFileSync('src/fonts/faces.json', 'utf8'));
mkdirSync(fontDir, { recursive: true });
for (const f of [...faces.map((x) => x.file), 'OFL.txt']) copyFileSync(`src/fonts/${f}`, `${fontDir}/${f}`);
const fontFaces = faces.map((f) => `@font-face {
    font-family: Fredoka;
    font-style: normal;
    font-weight: 300 700;
    font-stretch: 75% 125%;
    font-display: swap;
    src: url('@/styles/tangerineui-fonts/${f.file}') format('woff2');
    unicode-range: ${f.unicodeRange};
}
`).join('');

for (const v of variants) {
  const out = tpl.replace(/\{\{([^}]+)\}\}/g, (_, k) => {
    if (!(k in v.values)) throw new Error(`missing value '${k}' for variant '${v.suffix || 'tangerine'}'`);
    return v.values[k];
  });
  if (out.includes('{{')) throw new Error(`unsubstituted placeholder remains for variant '${v.suffix}'`);
  writeFileSync(`TangerineUI${v.suffix}.css`, out);
  mkdirSync(`mastodon/app/javascript/styles/${v.scssDir}`, { recursive: true });
  writeFileSync(`mastodon/app/javascript/styles/${v.scssDir}/${v.scssDir}.scss`, fontFaces + out);
  // Top-level entry point referenced by config/themes.yml. Without this wrapper
  // the theme is missing from styles/ and `rails assets:precompile` fails.
  writeFileSync(`mastodon/app/javascript/styles/${v.scssDir}.scss`, `@use 'application';\n@use '${v.scssDir}/${v.scssDir}';\n`);
  console.log(`built TangerineUI${v.suffix}.css (+ ${v.scssDir}.scss + ${v.scssDir}/${v.scssDir}.scss)`);
}
