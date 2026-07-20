#!/usr/bin/env node
// verify-csp.mjs — asserts every external host referenced in src/ is present
// in public/_headers connect-src. Prevents silent CSP/runtime drift.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) { if (!p.includes('node_modules')) walk(p, out); }
    // Exclude test fixtures: CSP must reflect hosts contacted by shipped
    // runtime code, not example/placeholder domains used in unit tests.
    else if (/\.(ts|tsx|js|jsx)$/.test(f) && !/\.(test|spec)\.[jt]sx?$/.test(f) && !p.includes('__tests__')) out.push(p);
  }
  return out;
}

const headers = readFileSync('public/_headers', 'utf8');
const cspLine = headers.split('\n').find(l => l.includes('Content-Security-Policy'));
const connectSrc = cspLine.match(/connect-src ([^;]+);/)?.[1] || '';

const hostPattern = /https:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi;
const referenced = new Set();
for (const file of walk('src')) {
  const content = readFileSync(file, 'utf8');
  let m;
  while ((m = hostPattern.exec(content))) referenced.add(m[1]);
}

const missing = [...referenced].filter(h =>
  !connectSrc.includes(h) && !connectSrc.includes(h.split('.').slice(-2).join('.'))
);

if (missing.length) {
  console.error(`BUILD BLOCKED: hosts referenced in src/ but missing from CSP connect-src: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('verify-csp: OK');
