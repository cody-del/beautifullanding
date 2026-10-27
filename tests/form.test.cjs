const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../dist/form.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');

function element(props = {}) {
  const events = new Map();
  const attributes = new Map();
  return {
    hidden: false, textContent: '', focused: 0, ...props,
    addEventListener(name, handler) { events.set(name, handler); },
    emit(name, event) { return events.get(name)(event); },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    removeAttribute(name) { attributes.delete(name); },
    focus() { this.focused++; },
  };
}

function setup({values = {}, respond = async () => ({ok: true, json: async () => ({success: true, contactId: 'contact-1'})}), gtag = true, now = 20000, hostname = 'localhost'} = {}) {
  const value = {fullName: 'Jane Smith', phone: '(260) 555-0123', email: 'Jane@Example.com', ...values};
  const errors = {};
  const field = (id, type, label) => element({
    id, type, value: value[id], labels: [{textContent: label}],
    get validity() { return {valid: type !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.value)}; },
  });
  const fields = [field('fullName', 'text', 'Full name'), field('phone', 'tel', 'Phone number'), field('email', 'email', 'Email address')];
  const honeypot = element({id: 'website', value: ''});
  const button = element({disabled: false, textContent: 'Get My Free Quote'});
  const form = element({
    fullName: fields[0], phone: fields[1], email: fields[2], website: honeypot,
    querySelectorAll(selector) { assert.equal(selector, 'input[required]'); return fields; },
    querySelector(selector) { assert.equal(selector, 'button[type="submit"]'); return button; },
    reset() { this.wasReset = true; },
  });
  const status = element({hidden: true});
  const success = element({hidden: true});
  const nodes = {'#consultation-form': form, '#form-status': status, '#consultation-success': success};
  const requests = [];
  const calls = [];
  const context = {
    document: {
      querySelector: selector => nodes[selector],
      getElementById: id => (errors[id] ??= element({hidden: true})),
    },
    FormData: class {
      constructor(target) { assert.equal(target, form); }
      *[Symbol.iterator]() { for (const input of [honeypot, ...fields]) yield [input.id, input.value]; }
    },
    fetch: async (url, init) => { requests.push({url, ...init, body: JSON.parse(init.body)}); return respond(); },
    performance: {now: () => now},
    setTimeout: resolve => resolve(),
    AbortSignal: {timeout: ms => ({timeoutMs: ms})},
    TypeError, SyntaxError, Error,
    location: {hostname},
  };
  if (gtag) context.gtag = (...args) => calls.push(args);
  vm.runInNewContext(source, context);
  const submit = () => form.emit('submit', {preventDefault() {}});
  return {form, fields, honeypot, button, status, success, errors, requests, calls, submit};
}

test('the page has the hidden spam field and a hidden thank-you state', () => {
  assert.match(html, /<div class="hardwood-honeypot" aria-hidden="true"><label for="website">Website<\/label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"><\/div>/);
  assert.match(html, /<div id="consultation-success" class="hardwood-form hardwood-form-success" role="status" tabindex="-1" hidden>/);
  assert.doesNotMatch(html, /does not send your details/);
  assert.doesNotMatch(source, /does not send your details/);
});

test('a confirmed lead fires the conversion once, with user data first, then shows the thank-you state', async () => {
  const page = setup();
  await page.submit();
  assert.equal(page.requests.length, 1);
  const [sent] = page.requests;
  assert.equal(sent.url, '/api/consultation');
  assert.equal(sent.method, 'POST');
  assert.equal(sent.headers['Content-Type'], 'application/json');
  assert.deepEqual(sent.body, {website: '', fullName: 'Jane Smith', phone: '(260) 555-0123', email: 'Jane@Example.com', elapsedMs: 20000});
  assert.deepEqual(JSON.parse(JSON.stringify(page.calls)), [
    ['set', 'user_data', {email: 'jane@example.com', phone_number: '+12605550123'}],
    ['event', 'conversion', {send_to: 'AW-18483436683/KcYjCIqetaIdEIu5y-1E', transaction_id: 'lead_contact-1'}],
  ]);
  assert.equal(page.form.hidden, true);
  assert.equal(page.form.wasReset, true);
  assert.equal(page.success.hidden, false);
  assert.equal(page.success.focused, 1);
  assert.equal(page.status.hidden, true);
  assert.equal(page.button.disabled, false);
});

test('no conversion fires when the lead is refused or cannot be sent', async () => {
  for (const respond of [
    async () => ({ok: false, json: async () => ({success: false, error: 'Please enter a valid phone number and email address.'})}),
    async () => ({ok: true, json: async () => ({success: false})}),
    async () => ({ok: false, json: async () => {throw new SyntaxError('Unexpected token <');}}),
    async () => {throw new TypeError('Failed to fetch');},
  ]) {
    const page = setup({respond});
    await page.submit();
    assert.deepEqual(page.calls, []);
    assert.equal(page.form.hidden, false);
    assert.equal(page.success.hidden, true);
    assert.equal(page.status.hidden, false);
    assert.match(page.status.textContent, /valid phone|\(260\) 222-6467/);
    assert.equal(page.button.disabled, false);
    assert.equal(page.button.textContent, 'Get My Free Quote');
  }
});

test('invalid fields are flagged locally and nothing is sent', async () => {
  const page = setup({values: {phone: '555-0123', email: 'not-an-email'}});
  await page.submit();
  assert.equal(page.requests.length, 0);
  assert.deepEqual(page.calls, []);
  assert.equal(page.errors['phone-error'].textContent, 'Please enter a 10-digit US phone number.');
  assert.equal(page.errors['email-error'].textContent, 'Please enter a valid email address.');
  assert.equal(page.fields[1].focused, 1);
});

test('a blocked Google tag never breaks a delivered lead', async () => {
  const page = setup({gtag: false});
  await page.submit();
  assert.equal(page.success.hidden, false);
});

test('a second click while sending does not send the lead twice', async () => {
  let release;
  const page = setup({respond: () => new Promise(resolve => { release = () => resolve({ok: true, json: async () => ({success: true, contactId: 'contact-1'})}); })});
  const first = page.submit();
  await new Promise(resolve => setImmediate(resolve));
  await page.submit();
  release();
  await first;
  assert.equal(page.requests.length, 1);
  assert.equal(page.calls.filter(call => call[0] === 'event').length, 1);
});

// GA4: until 2026-10-27 the page loaded only the Ads tag, so the ad traffic it carries was
// missing from www.beautifulblindsandshades.com's GA4 property. Only the production host sends.
const GA4 = 'G-TBE6JC5ZYG';
const NOT_PRODUCTION = ['beautifullanding.netlify.app', 'deploy-preview-5--beautifullanding.netlify.app', '69a1b2c3d4e5f6--beautifullanding.netlify.app', 'localhost', '127.0.0.1', 'www.beautifulblindsandshades.com', 'go.beautifulblindsandshades.com.evil.example'];

function headConfigs(hostname) {
  const head = html.slice(0, html.indexOf('</head>'));
  const context = {location: {hostname}, Date};
  context.window = context;
  for (const [, script] of head.matchAll(/<script>([^<]*)<\/script>/g)) vm.runInNewContext(script, context);
  return Array.from(context.dataLayer, args => Array.from(args)).filter(([command]) => command === 'config').map(([, id]) => id);
}

test('GA4 is configured after the Ads tag on the production host only', () => {
  assert.deepEqual(headConfigs('go.beautifulblindsandshades.com'), ['AW-18483436683', 'AW-18483436683/u3LoCM_FtaIdEIu5y-1E', GA4]);
  for (const hostname of NOT_PRODUCTION) assert.deepEqual(headConfigs(hostname), ['AW-18483436683', 'AW-18483436683/u3LoCM_FtaIdEIu5y-1E'], hostname);
});

test('a confirmed lead on the production host also sends one generate_lead, to GA4 only', async () => {
  const page = setup({hostname: 'go.beautifulblindsandshades.com'});
  await page.submit();
  assert.deepEqual(JSON.parse(JSON.stringify(page.calls)), [
    ['set', 'user_data', {email: 'jane@example.com', phone_number: '+12605550123'}],
    ['event', 'conversion', {send_to: 'AW-18483436683/KcYjCIqetaIdEIu5y-1E', transaction_id: 'lead_contact-1'}],
    ['event', 'generate_lead', {send_to: GA4, form_name: 'landing_page_form'}],
  ]);
});

test('GA4 gets no lead event for a refused (honeypot, too fast) submission or off the production host', async () => {
  // netlify/lib/consultation.mjs refuses a filled honeypot or a too-fast submission with a 400.
  const refused = setup({hostname: 'go.beautifulblindsandshades.com', values: {}, respond: async () => ({ok: false, json: async () => ({success: false, error: 'Unable to submit this request.'})})});
  refused.honeypot.value = 'http://spam.example';
  await refused.submit();
  assert.deepEqual(refused.calls, []);
  for (const hostname of NOT_PRODUCTION) {
    const page = setup({hostname});
    await page.submit();
    assert.deepEqual(page.calls.filter(([, name]) => name === 'generate_lead'), [], hostname);
    assert.equal(page.calls.filter(([, name]) => name === 'conversion').length, 1, hostname);
  }
});
