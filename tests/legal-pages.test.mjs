import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PAGES, legalContent} from '../scripts/legal-pages.mjs';

// The copies of beautifulblindsandshades.com's Privacy Policy and Terms that the
// quote form and footer link to. A2P reviewers read both, so the clauses the SMS
// opt-in relies on are pinned here.
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const page = {};
for (const {path} of PAGES) page[path] = await read(`../dist/${path}/index.html`);
const main = html => html.slice(html.indexOf('<main'), html.indexOf('</main>'));

test('both pages are on this domain, out of search, and script-free', () => {
  for (const [path, html] of Object.entries(page)) {
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'), path);
    assert.doesNotMatch(html, /<script/i, path);
    assert.ok(html.includes('<a href="/privacy-policy/">Privacy Policy</a><a href="/terms-of-service/">Terms of Service</a>'), path);
  }
  assert.ok(page['privacy-policy'].includes('<title>Privacy Policy | Beautiful Blinds &amp; Shades</title>'));
  assert.ok(page['terms-of-service'].includes('<title>Terms of Service | Beautiful Blinds &amp; Shades</title>'));
});

test('the Privacy Policy keeps its mobile-information clause', () => {
  const policy = main(page['privacy-policy']);
  assert.ok(policy.includes('<h2>Mobile Information and SMS</h2>'));
  assert.ok(policy.includes('Mobile information will not be shared with third parties or affiliates for marketing or promotional purposes.'));
});

test('the Terms keep their SMS terms and link to the local Privacy Policy', () => {
  const terms = main(page['terms-of-service']);
  assert.ok(terms.includes('<h2>SMS Terms</h2>'));
  for (const clause of ['Message frequency varies', 'message and data rates may apply', 'Reply <strong>STOP</strong> to opt out', '<strong>HELP</strong> for assistance', 'Consent is not a condition of purchase']) {
    assert.ok(terms.includes(clause), clause);
  }
  assert.ok(terms.includes('<a href="/privacy-policy/">Privacy Policy</a>'));
});

test('the landing page footer links to both pages', async () => {
  const index = await read('../dist/index.html');
  const footer = index.slice(index.indexOf('<footer'), index.indexOf('</footer>'));
  assert.ok(footer.includes('<a href="/privacy-policy/">Privacy Policy</a><a href="/terms-of-service/">Terms of Service</a>'));
});

test('the rebuild strips the main site\'s markup and refuses anything unexpected', () => {
  assert.equal(
    legalContent('<main class="m"><div class="x"><p class="a">Hi<!-- --> <strong>there</strong><br/><a href="/privacy-policy" class="b">P</a> <a href="https://example.com">E</a></p></div></main>'),
    '<p>Hi <strong>there</strong><br><a href="/privacy-policy/">P</a> <a href="https://example.com" target="_blank" rel="noopener">E</a></p>',
  );
  assert.throws(() => legalContent('<main><script>alert(1)</script></main>'), /Unexpected <script>/);
  assert.throws(() => legalContent('<main><img src="x"></main>'), /Unexpected <img>/);
  assert.throws(() => legalContent('<p>no main</p>'), /No <main>/);
});
