/* sentinel:skip-file -- negative-test fixture: deliberately names placeholder tokens it checks for */
/*
 * Minimal offline-integrity smoke test for the HFrEF NMA living meta-analysis dashboard.
 *
 * This is a static single-file HTML app (no build step, no runtime test harness),
 * so the smoke test asserts the structural invariants that have historically broken
 * single-file dashboards: BOM, unbalanced <script> tags, a literal </script> inside a
 * template literal, a missing redirect target, and absence of the pooling engine.
 *
 * Run: node smoke.test.js   (exit 0 = pass, exit 1 = fail)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MAIN = path.join(ROOT, 'HFREF_NMA_REVIEW.html');
const INDEX = path.join(ROOT, 'index.html');

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log('  PASS  ' + name);
  } else {
    failures++;
    console.log('  FAIL  ' + name + (detail ? '  -> ' + detail : ''));
  }
}

// 1. Both shipped files exist.
check('HFREF_NMA_REVIEW.html exists', fs.existsSync(MAIN));
check('index.html exists', fs.existsSync(INDEX));

const main = fs.readFileSync(MAIN, 'utf8');
const index = fs.readFileSync(INDEX, 'utf8');

// 2. No UTF-8 BOM in shipped assets (corrupts offline rendering / git diffs).
check('main has no BOM', main.charCodeAt(0) !== 0xfeff);
check('index has no BOM', index.charCodeAt(0) !== 0xfeff);

// 3. Balanced <script> ... </script> tags.
const opens = (main.match(/<script[ >]/g) || []).length;
const closes = (main.match(/<\/script>/g) || []).length;
check('balanced <script> tags', opens === closes, opens + ' open vs ' + closes + ' close');

// 4. No bare literal </script> inside a backtick template literal. We approximate by
//    rejecting any </script> not preceded by an escape (${'<'}) or quote/concat context.
//    A true positive would break the parser, so a balanced count above is the primary guard;
//    here we additionally assert the documented escape pattern is used where needed.
const badClose = /`[^`]*<\/script>[^`]*`/.test(main);
check('no </script> inside a single template literal span', !badClose);

// 5. The pooling engine and tau^2 estimator are present (core of the stat app).
check('poolWith engine present', /function poolWith\s*\(/.test(main));
check('Paule-Mandel tau2 estimator present', /function pauleMandelTau2\s*\(/.test(main));
check('binaryEffect (log-OR/RR) present', /function binaryEffect\s*\(/.test(main));

// 6. index.html redirects to the dashboard.
check('index redirects to dashboard',
  /url=\.\/HFREF_NMA_REVIEW\.html/.test(index) || /href="\.\/HFREF_NMA_REVIEW\.html"/.test(index));

// 7. No unfilled placeholder tokens in shipped HTML.
check('no unfilled {{...}} / REPLACE_ME / __PLACEHOLDER__ tokens',
  !/\{\{[^}]+\}\}|REPLACE_ME|__PLACEHOLDER__/.test(main));

console.log('');
if (failures) {
  console.error(failures + ' smoke check(s) FAILED');
  process.exit(1);
}
console.log('All smoke checks passed.');
process.exit(0);
