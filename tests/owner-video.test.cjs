const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../dist/owner-video.js'), 'utf8');

function setup({reduced = false, smallScreen = false, saveData = false, observer = true} = {}) {
  const events = new Map();
  const mediaTasks = [];
  const frame = {};
  const motion = {matches: reduced};
  const video = {
    hidden: true, paused: true, ended: false, error: null, currentTime: 12,
    dataset: {sourceMobile: 'mobile.mp4', sourceDesktop: 'desktop.mp4'},
    playCalls: 0, pauseCalls: 0, blocked: false, deferred: false,
    addEventListener(name, handler) {
      const handlers = events.get(name) || [];
      events.set(name, [...handlers, handler]);
    },
    emit(name) { for (const handler of events.get(name) || []) handler(); },
    getAttribute(name) { return this[name] || null; },
    closest(selector) { assert.equal(selector, '.owner-video-frame'); return frame; },
    focus() {},
    play() {
      this.playCalls++;
      if (this.blocked) return Promise.reject({name: 'NotAllowedError'});
      this.paused = false;
      mediaTasks.push(() => this.emit('play'));
      if (this.deferred) return new Promise((resolve, reject) => {
        this.rejectPendingPlay = reject;
      });
      return Promise.resolve();
    },
    pause() {
      if (this.paused) return;
      this.pauseCalls++;
      this.paused = true;
      mediaTasks.push(() => this.emit('pause'));
      this.rejectPendingPlay?.({name: 'AbortError'});
      this.rejectPendingPlay = null;
    }
  };
  const button = {hidden: false, addEventListener(name, handler) { this.click = handler; }};
  const error = {hidden: true};
  const doc = {
    hidden: false,
    querySelector(selector) {
      return {'#owner-video-player': video, '#owner-video-play': button, '#owner-video-error': error}[selector];
    },
    addEventListener(name, handler) { this[name] = handler; }
  };
  let intersect;
  const context = {
    document: doc, navigator: {connection: {saveData}},
    matchMedia(query) { return query.includes('reduced-motion') ? motion : {matches: smallScreen}; },
    window: observer ? {IntersectionObserver: true} : {},
    IntersectionObserver: class {
      constructor(callback) { intersect = callback; }
      observe(target) { assert.equal(target, frame); }
    }
  };
  vm.runInNewContext(source, context);
  return {
    video, button, error, motion,
    view(ratio) { intersect([{isIntersecting: ratio > 0, intersectionRatio: ratio}]); },
    hide(hidden) { doc.hidden = hidden; doc.visibilitychange(); },
    flush() { while (mediaTasks.length) mediaTasks.shift()(); }
  };
}

function start(player) {
  player.view(1);
  player.button.click();
  player.flush();
}

test('scrolling into view never starts an unplayed video or downloads its source', () => {
  const p = setup();
  p.view(0); p.view(1);
  assert.equal(p.video.playCalls, 0);
  assert.equal(p.video.src, undefined);
});

test('a deliberate click keeps responsive sources and native player available', () => {
  for (const [options, expected] of [[{}, 'desktop.mp4'], [{smallScreen: true}, 'mobile.mp4'], [{saveData: true}, 'mobile.mp4']]) {
    const p = setup(options);
    start(p);
    assert.equal(p.video.src, expected);
    assert.equal(p.video.hidden, false);
    assert.equal(p.button.hidden, true);
  }
});

test('only a fully offscreen player pauses, then resumes from the same position at 20%', () => {
  const p = setup();
  start(p);
  p.view(0.01);
  assert.equal(p.video.paused, false);
  p.view(0); p.flush();
  assert.equal(p.video.paused, true);
  p.view(0.05);
  assert.equal(p.video.paused, true);
  p.view(0.2); p.flush();
  assert.equal(p.video.paused, false);
  assert.equal(p.video.currentTime, 12);
  p.view(0); p.flush(); p.view(1); p.flush();
  assert.equal(p.video.playCalls, 3);
});

test('queued scroll pause survives a fast exit and re-entry', () => {
  const p = setup();
  start(p);
  p.view(0); p.view(1); p.flush();
  assert.equal(p.video.paused, false);
  p.view(0); p.flush(); p.view(1); p.flush();
  assert.equal(p.video.playCalls, 3);
});

test('a manual pause remains paused after scrolling away and back', () => {
  const p = setup();
  start(p);
  p.video.pause(); p.flush(); p.view(0); p.view(1); p.flush();
  assert.equal(p.video.paused, true);
  assert.equal(p.video.playCalls, 1);
  p.video.play(); p.flush(); p.view(0); p.flush(); p.view(1); p.flush();
  assert.equal(p.video.paused, false);
});

test('switching tabs cancels playback and any pending scroll resume', () => {
  for (const alreadyOffscreen of [false, true]) {
    const p = setup();
    start(p);
    if (alreadyOffscreen) p.view(0);
    p.hide(true); p.flush(); p.view(1); p.hide(false); p.view(1); p.flush();
    assert.equal(p.video.paused, true);
    assert.equal(p.video.playCalls, 1);
  }
});

test('ended videos and reduced-motion preferences prevent automatic resumption', () => {
  const ended = setup();
  start(ended);
  ended.video.ended = true; ended.video.paused = true; ended.video.emit('ended');
  ended.view(0); ended.view(1);
  assert.equal(ended.video.playCalls, 1);
  const reduced = setup({reduced: true});
  start(reduced);
  reduced.view(0); reduced.flush(); reduced.view(1);
  assert.equal(reduced.video.paused, true);
  const changed = setup();
  start(changed); changed.view(0); changed.flush(); changed.motion.matches = true; changed.view(1);
  assert.equal(changed.video.playCalls, 1);
});

test('blocked resumes leave controls available and never retry automatically', async () => {
  const p = setup();
  start(p); p.view(0); p.flush(); p.video.blocked = true; p.view(1);
  await Promise.resolve();
  p.view(0); p.view(1);
  assert.equal(p.video.playCalls, 2);
  assert.equal(p.video.hidden, false);
  assert.equal(p.video.paused, true);
});

test('scroll pausing a still-loading play request preserves resume intent', async () => {
  const p = setup();
  p.video.deferred = true;
  start(p); p.view(0); p.flush();
  await Promise.resolve();
  p.video.deferred = false; p.view(1); p.flush();
  assert.equal(p.video.paused, false);
  assert.equal(p.video.playCalls, 2);
});

test('a delayed play event cannot leave audio playing offscreen', () => {
  const p = setup();
  p.view(1); p.button.click(); p.view(0); p.flush();
  assert.equal(p.video.paused, true);
  p.view(1); p.flush();
  assert.equal(p.video.paused, false);
});

test('without IntersectionObserver, manual playback and hidden-tab pause still work', () => {
  const p = setup({observer: false});
  p.button.click(); p.flush();
  assert.equal(p.video.paused, false);
  p.hide(true); p.flush();
  assert.equal(p.video.paused, true);
});
