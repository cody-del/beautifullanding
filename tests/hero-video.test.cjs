const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../dist/hero-video.js'), 'utf8');

function setup({reduced = false, saveData = false, mobile = false, observer = true} = {}) {
  const listeners = new Map();
  const classes = new Set();
  const hero = {};
  const label = {};
  const icon = () => ({toggleAttribute(name, value) { assert.equal(name, 'hidden'); this.hidden = value; }});
  const pauseIcon = icon();
  const playIcon = icon();
  const video = {
    paused: true, muted: false, playCalls: 0, blocked: false, currentTime: 7,
    dataset: {sourceMobile: 'mobile.mp4', sourceDesktop: 'desktop.mp4'},
    classList: {add(name) { classes.add(name); }, remove(name) { classes.delete(name); }},
    getAttribute(name) { return this[name]; },
    addEventListener(name, fn) { listeners.set(name, fn); },
    emit(name) { listeners.get(name)?.(); },
    play() {
      this.playCalls++;
      if (this.blocked) return Promise.reject({name: 'NotAllowedError'});
      this.paused = false;
      this.emit('play'); this.emit('playing');
      return Promise.resolve();
    },
    pause() { this.paused = true; this.emit('pause'); }
  };
  const button = {
    hidden: true,
    querySelector(selector) { return {'.hero-video-label': label, '.hero-pause-icon': pauseIcon, '.hero-play-icon': playIcon}[selector]; },
    addEventListener(name, fn) { this.click = fn; }
  };
  const motion = {matches: reduced, addEventListener(name, fn) { this.change = fn; }};
  const document = {
    hidden: false,
    querySelector(selector) { return {'.paper-hero': hero, '#hero-video': video, '#hero-video-toggle': button}[selector]; },
    addEventListener(name, fn) { this[name] = fn; }
  };
  let intersection;
  vm.runInNewContext(source, {
    document, navigator: {connection: {saveData}},
    matchMedia(query) { return query.includes('reduced-motion') ? motion : {matches: mobile}; },
    window: observer ? {IntersectionObserver: true} : {},
    IntersectionObserver: class {
      constructor(fn) { intersection = fn; }
      observe(target) { assert.equal(target, hero); }
    }
  });
  return {
    video, button, label, pauseIcon, playIcon, classes,
    view(ratio) { intersection([{isIntersecting: ratio > 0, intersectionRatio: ratio}]); },
    hide(hidden) { document.hidden = hidden; document.visibilitychange(); },
    reduce(matches) { motion.matches = matches; motion.change(); }
  };
}

test('silent responsive playback starts only when the hero is visible', () => {
  for (const mobile of [false, true]) {
    const p = setup({mobile});
    assert.equal(p.video.src, undefined);
    p.view(0); assert.equal(p.video.src, undefined);
    p.view(1);
    assert.equal(p.video.src, mobile ? 'mobile.mp4' : 'desktop.mp4');
    assert.equal(p.video.muted, true);
    assert.equal(p.video.paused, false);
    assert.equal(p.button.hidden, false);
    assert.equal(p.label.textContent, 'Pause video');
    assert.equal(p.pauseIcon.hidden, false);
    assert.equal(p.playIcon.hidden, true);
  }
});

test('manual pause persists across scroll and tab changes; Play continues at the same time', () => {
  const p = setup();
  p.view(1); p.button.click();
  assert.equal(p.label.textContent, 'Play video');
  assert.equal(p.pauseIcon.hidden, true);
  p.view(0); p.view(1); p.hide(true); p.hide(false);
  assert.equal(p.video.paused, true);
  p.button.click();
  assert.equal(p.video.paused, false);
  assert.equal(p.video.currentTime, 7);
});

test('automatic playback pauses offscreen and in hidden tabs, then resumes when appropriate', () => {
  const p = setup();
  p.view(1); p.view(0);
  assert.equal(p.video.paused, true);
  p.hide(true); p.view(1);
  assert.equal(p.video.paused, true);
  p.hide(false);
  assert.equal(p.video.paused, false);
  p.view(0); p.hide(true); p.hide(false);
  assert.equal(p.video.paused, true);
  p.view(1); assert.equal(p.video.paused, false);
});

test('reduced motion and data saver show the poster without downloading video, with manual opt-in', () => {
  for (const options of [{reduced: true}, {saveData: true}]) {
    const p = setup(options);
    p.view(1);
    assert.equal(p.video.src, undefined);
    assert.equal(p.label.textContent, 'Play video');
    p.button.click();
    assert.equal(p.video.paused, false);
    if (options.saveData) assert.equal(p.video.src, 'mobile.mp4');
  }
});

test('enabling reduced motion pauses the clip and does not restart it on scrolling', () => {
  const p = setup();
  p.view(1); p.reduce(true); p.view(0); p.view(1); p.reduce(false);
  assert.equal(p.video.paused, true);
});

test('autoplay restrictions offer Play and do not repeatedly retry without a click', async () => {
  const p = setup();
  p.video.blocked = true; p.view(1);
  await Promise.resolve();
  p.view(0); p.view(1);
  assert.equal(p.video.playCalls, 1);
  assert.equal(p.label.textContent, 'Play video');
  p.video.blocked = false; p.button.click();
  assert.equal(p.video.paused, false);
});

test('media errors restore the poster and stop automatic retries', () => {
  const p = setup();
  p.view(1);
  assert.equal(p.classes.has('is-ready'), true);
  p.video.emit('error'); p.view(0); p.view(1);
  assert.equal(p.classes.has('is-ready'), false);
  assert.equal(p.video.paused, true);
  assert.equal(p.video.playCalls, 1);
});

test('without IntersectionObserver, the pause control still works', () => {
  const p = setup({observer: false});
  assert.equal(p.video.paused, false);
  p.button.click(); assert.equal(p.video.paused, true);
});

test('page keeps the hero decorative and preserves a keyboard-operable pause control', () => {
  const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
  assert.match(html, /class="hero-media" aria-hidden="true"/);
  assert.match(html, /<video id="hero-video" muted loop playsinline preload="none" disablepictureinpicture tabindex="-1"/);
  assert.match(html, /<button id="hero-video-toggle"[^>]*type="button"[^>]*aria-controls="hero-video"/);
  assert.match(html, /src="hero-video.js" defer/);
});
