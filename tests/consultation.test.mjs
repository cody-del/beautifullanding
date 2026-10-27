import {test} from 'node:test';
import assert from 'node:assert/strict';
import {submitConsultation, GHL_UPSERT_URL, LEAD_TAG, LEAD_SOURCE, MIN_FILL_MS, SMS_OPT_IN_TAG} from '../netlify/lib/consultation.mjs';

const env = {GHL_PRIVATE_TOKEN: 'pit-test', GHL_LOCATION_ID: 'location-1'};
const valid = {fullName: 'Test Person', phone: '(260) 555-0123', email: 'test@example.com', website: '', elapsedMs: 20000};
const mustNotCall = () => {throw Error('must not call');};
const created = async () => ({ok: true, status: 201, json: async () => ({new: true, contact: {id: 'contact-1'}})});
const capture = () => {
  const sent = {};
  const fetcher = async (url, request) => {
    Object.assign(sent, {url, method: request.method, headers: request.headers, body: JSON.parse(request.body)});
    return created();
  };
  return {sent, fetcher};
};

test('incomplete, invalid and spam requests never reach GHL', async () => {
  for (const data of [
    null, [], {}, 'Test Person',
    {...valid, phone: '123'}, {...valid, phone: '22605550123'}, {...valid, email: 'invalid'}, {...valid, email: 'a@b.c'},
    {...valid, fullName: ' '}, {...valid, fullName: 'x'.repeat(101)}, {...valid, fullName: 42},
    {...valid, email: `${'a'.repeat(250)}@example.com`},
    {...valid, website: 'https://spam.example'},
    {...valid, elapsedMs: undefined}, {...valid, elapsedMs: MIN_FILL_MS - 1},
    {...valid, elapsedMs: '20000'}, {...valid, elapsedMs: 20000.5},
    {...valid, smsOptIn: 'on'}, {...valid, smsOptIn: 1},
  ]) {
    const result = await submitConsultation(data, {env, fetcher: mustNotCall, rateLimited: mustNotCall});
    assert.equal(result.status, 400, JSON.stringify(data));
    assert.equal(result.body.success, false);
  }
});

test('upserts the contact into GHL tagged google_landing_page and returns its id', async () => {
  const {sent, fetcher} = capture();
  const result = await submitConsultation({...valid, fullName: '  Test   Van  Person ', email: ' Test@Example.com '}, {env, fetcher});
  assert.deepEqual(result, {status: 200, body: {success: true, contactId: 'contact-1'}});
  assert.equal(sent.url, GHL_UPSERT_URL);
  assert.equal(sent.method, 'POST');
  assert.equal(sent.headers.Authorization, 'Bearer pit-test');
  assert.equal(sent.headers.Version, '2021-07-28');
  assert.deepEqual(sent.body, {
    locationId: 'location-1', firstName: 'Test', lastName: 'Van Person', phone: '+12605550123', email: 'test@example.com',
    source: 'Google Ads Landing Page (go.beautifulblindsandshades.com)', tags: ['google_landing_page'],
  });
  assert.equal(LEAD_TAG, 'google_landing_page');
  assert.equal(LEAD_SOURCE, 'Google Ads Landing Page (go.beautifulblindsandshades.com)');
});

test('a single name is sent as the first name, and an 11-digit number keeps its country code', async () => {
  const {sent, fetcher} = capture();
  await submitConsultation({...valid, fullName: 'Cher', phone: '1-260-555-0123'}, {env, fetcher});
  assert.equal(sent.body.firstName, 'Cher');
  assert.equal('lastName' in sent.body, false);
  assert.equal(sent.body.phone, '+12605550123');
});

test('falls back to GHL_API_KEY, and refuses to send without credentials', async t => {
  t.mock.method(console, 'error', () => {});
  let auth;
  await submitConsultation(valid, {env: {GHL_API_KEY: 'pit-legacy', GHL_LOCATION_ID: 'location-1'}, fetcher: async (url, request) => {
    auth = request.headers.Authorization;
    return created();
  }});
  assert.equal(auth, 'Bearer pit-legacy');
  for (const missing of [{}, {GHL_PRIVATE_TOKEN: 'pit-test'}, {GHL_LOCATION_ID: 'location-1'}]) {
    const result = await submitConsultation(valid, {env: missing, fetcher: mustNotCall});
    assert.equal(result.status, 500);
    assert.match(result.body.error, /\(260\) 222-6467/);
  }
});

test('exactly the minimum fill time is accepted', async () => {
  const result = await submitConsultation({...valid, elapsedMs: MIN_FILL_MS}, {env, fetcher: created});
  assert.equal(result.status, 200);
});

test('never reports success unless GHL returns a contact id', async t => {
  t.mock.method(console, 'error', () => {});
  for (const fetcher of [
    async () => ({ok: false, status: 401, json: async () => ({message: 'Invalid JWT'})}),
    async () => ({ok: false, status: 422, json: async () => ({message: 'Unprocessable'})}),
    async () => ({ok: true, status: 200, json: async () => ({contact: {}})}),
    async () => ({ok: true, status: 200, json: async () => ({})}),
    async () => ({ok: true, status: 200, json: async () => {throw new SyntaxError('Unexpected token <');}}),
    async () => {throw new TypeError('fetch failed');},
  ]) {
    const result = await submitConsultation(valid, {env, fetcher});
    assert.equal(result.status, 502);
    assert.equal(result.body.success, false);
    assert.match(result.body.error, /\(260\) 222-6467/);
  }
});

test('logs never contain the token or the lead’s details', async t => {
  const logged = [];
  t.mock.method(console, 'error', (...args) => logged.push(args.join(' ')));
  t.mock.method(console, 'log', (...args) => logged.push(args.join(' ')));
  await submitConsultation(valid, {env, fetcher: async () => ({ok: false, status: 400, json: async () => ({message: valid.email})})});
  await submitConsultation(valid, {env, fetcher: async () => {throw new TypeError(`fetch failed for ${valid.email}`);}});
  await submitConsultation(valid, {env: {}, fetcher: mustNotCall});
  assert.equal(logged.length, 3);
  for (const line of logged) {
    for (const secret of ['pit-test', 'test@example.com', '555-0123', '5550123', 'Test Person']) assert.equal(line.includes(secret), false, line);
  }
});

test('rate-limited visitors are told to wait, and only valid leads count toward the limit', async () => {
  const limited = await submitConsultation(valid, {env, fetcher: mustNotCall, rateLimited: () => true});
  assert.equal(limited.status, 429);
  assert.equal(limited.body.success, false);
  let checks = 0;
  await submitConsultation({...valid, phone: '1'}, {env, fetcher: mustNotCall, rateLimited: () => {checks++; return false;}});
  assert.equal(checks, 0);
});

test('adds the SMS opt-in tag only when the box was ticked', async () => {
  assert.equal(SMS_OPT_IN_TAG, 'sms-transactional-opt-in');
  for (const [consent, tags] of [
    [{}, ['google_landing_page']],
    [{smsOptIn: false}, ['google_landing_page']],
    [{smsOptIn: true}, ['google_landing_page', 'sms-transactional-opt-in']],
  ]) {
    const {sent, fetcher} = capture();
    await submitConsultation({...valid, ...consent}, {env, fetcher});
    assert.deepEqual(sent.body.tags, tags, JSON.stringify(consent));
  }
});
