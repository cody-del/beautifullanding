import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// The A2P 10DLC opt-in on the quote form: one optional, unticked box naming the
// business, worded after the SMS Terms on beautifulblindsandshades.com, which
// cover service messages only. Carriers reject a campaign whose opt-in is
// pre-ticked, required, or bundled with agreeing to the terms.
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const form = html.slice(html.indexOf('<form id="consultation-form"'), html.indexOf('</form>'));

test('the form has one optional, unticked text-message opt-in', () => {
  assert.deepEqual(form.match(/<input[^>]*type="checkbox"[^>]*>/g), ['<input id="smsOptIn" name="smsOptIn" type="checkbox">']);
  assert.ok(form.includes('<legend>Text messages (optional)</legend>'));
});

test('the opt-in names the business and carries the full disclosure', () => {
  assert.ok(form.includes('I agree to receive text messages from <strong>Beautiful Blinds &amp; Shades</strong> about my request, including consultations, appointments, estimates, scheduling, project updates, and customer service, at the phone number provided. Message frequency varies. Message &amp; data rates may apply. Reply <strong>STOP</strong> to opt out or <strong>HELP</strong> for help. Consent is not a condition of purchase.'));
});

test('the opt-in sits above the button, and the policy links and no-sharing line below it', () => {
  assert.ok(form.indexOf('smsOptIn') < form.indexOf('type="submit"'));
  const note = form.slice(form.indexOf('type="submit"'));
  assert.ok(note.includes('By submitting this form you agree to our <a href="/privacy-policy/" target="_blank">Privacy Policy</a> &amp; <a href="/terms-of-service/" target="_blank">Terms of Service</a>. SMS consent is not shared with third parties.'));
});
