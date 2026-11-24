(() => {
  const hero = document.querySelector('.paper-hero');
  const copy = hero?.querySelector('.paper-hero-content');
  const quote = hero?.querySelector('.consultation-anchor');
  if (!hero || !copy || !quote) return;
  let queued = false;

  function layout() {
    queued = false;
    const bounds = hero.getBoundingClientRect();
    const copyBounds = copy.getBoundingClientRect();
    const quoteBounds = quote.getBoundingClientRect();
    const copyBottom = copyBounds.bottom - bounds.top;
    // Keep the copy on video; let the quote card extend into the white area.
    const mediaHeight = window.innerWidth <= 800
      ? quoteBounds.top - bounds.top + 64
      : Math.max(copyBottom + 48, quoteBounds.bottom - bounds.top - 88);
    hero.style.setProperty('--hero-media-height', `${Math.ceil(mediaHeight)}px`);
    hero.style.setProperty('--hero-toggle-top', `${Math.round(copyBottom - 12)}px`);
    hero.style.setProperty('--hero-toggle-right', `${Math.max(12, bounds.right - copyBounds.right)}px`);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(layout);
  }
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    observer.observe(copy);
    observer.observe(quote);
  }
  window.addEventListener('resize', schedule, {passive: true});
  document.fonts?.ready.then(schedule);
  layout();
})();
