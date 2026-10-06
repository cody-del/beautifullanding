(() => {
  const track = document.querySelector('#reviews-track');
  const previous = document.querySelector('.reviews-prev');
  const next = document.querySelector('.reviews-next');
  const cards = [...track.querySelectorAll('.reviews-card')];
  const status = document.querySelector('#reviews-position');
  const dialog = document.querySelector('#review-dialog');
  let trigger;
  let scrollTimer;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function update() {
    const max = track.scrollWidth - track.clientWidth;
    previous.disabled = track.scrollLeft < 3;
    next.disabled = track.scrollLeft >= max - 3;
    const viewport = track.getBoundingClientRect();
    const visible = cards.map((card, index) => ({index, rect:card.getBoundingClientRect()}))
      .filter(({rect}) => rect.left < viewport.right - 10 && rect.right > viewport.left + 10);
    if (visible.length) status.textContent = `Reviews ${visible[0].index + 1}–${visible.at(-1).index + 1} of ${cards.length}`;
  }

  function move(direction) {
    const step = cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
    const index = Math.round(track.scrollLeft / step);
    track.scrollTo({left:(index + direction) * step, behavior:reducedMotion.matches ? 'instant' : 'smooth'});
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  track.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(update, 100);
  }, {passive:true});
  new ResizeObserver(update).observe(track);
  update();

  for (const card of cards) {
    card.querySelector('.reviews-read-more').addEventListener('click', event => {
      trigger = event.currentTarget;
      document.querySelector('#review-dialog-name').textContent = card.querySelector('.reviews-name').textContent;
      const text = document.querySelector('#review-dialog-text');
      text.replaceChildren(...card.querySelector('.reviews-excerpt').textContent.split('\n\n').map(paragraph => {
        const p = document.createElement('p');
        p.textContent = paragraph;
        return p;
      }));
      dialog.showModal();
      dialog.scrollTop = 0;
      document.body.style.overflow = 'hidden';
    });
  }
  dialog.querySelector('.review-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    trigger?.focus({preventScroll:true});
  });
})();
