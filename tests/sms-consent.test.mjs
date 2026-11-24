import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// The quote journey collects contact details only; the user removed SMS opt-in.
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const form = html.slice(html.indexOf('<form id="consultation-form"'), html.indexOf('</form>'));

test('the quote form collects the three contact fields without a text-message checkbox', () => {
  assert.deepEqual([...form.matchAll(/<input[^>]*name="([^"]+)"[^>]*required/g)].map(([, name]) => name), ['fullName', 'phone', 'email']);
  assert.doesNotMatch(form, /type="checkbox"|smsOptIn|sms-consent|I agree to receive text messages/);
});

test('the privacy link follows the quote button without another consent prompt', () => {
  const afterButton = form.slice(form.indexOf('type="submit"'));
  assert.match(afterButton, /<a href="\/privacy-policy\/" target="_blank" rel="noopener">Privacy Policy<\/a>/);
  assert.doesNotMatch(afterButton, /By submitting|SMS consent|hardwood-form-reassurance|hardwood-google-badge/);
});

test('the footer retains access to both existing policies', () => {
  const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
  assert.match(footer, /href="\/privacy-policy\/"/);
  assert.match(footer, /href="\/terms-of-service\/"/);
});
