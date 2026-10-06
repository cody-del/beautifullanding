(() => {
  document.querySelectorAll('[data-shade-carousel]').forEach(carousel => {
    const slides = [...carousel.querySelectorAll('.shade-carousel-slide')];
    const track = carousel.querySelector('.shade-carousel-track');
    const previousButton = carousel.querySelector('.shade-carousel-prev');
    const nextButton = carousel.querySelector('.shade-carousel-next');
    const dotsContainer = carousel.querySelector('.shade-carousel-dots');
    const status = carousel.querySelector('.shade-carousel-status');
    if (slides.length < 3) return;
    let current = 0;
    let pointerStart = null;
    let suppressClick = false;
    const dots = slides.map((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'shade-carousel-dot';
      dot.setAttribute('aria-label', `Show gallery photo ${index + 1}`);
      dot.addEventListener('click', () => show(index));
      dotsContainer.appendChild(dot);
      return dot;
    });
    function show(index) {
      current = (index + slides.length) % slides.length;
      const previous = (current - 1 + slides.length) % slides.length;
      const next = (current + 1) % slides.length;
      const focusedSlide = slides.includes(document.activeElement);
      slides.forEach((slide, i) => {
        const active = i === current;
        const visible = active || i === previous || i === next;
        slide.classList.toggle('is-active', active);
        slide.classList.toggle('is-prev', i === previous);
        slide.classList.toggle('is-next', i === next);
        slide.setAttribute('aria-hidden', String(!visible));
        slide.tabIndex = visible && !active ? 0 : -1;
        slide.setAttribute('aria-label', `${i === previous ? 'Show previous photo' : i === next ? 'Show next photo' : 'Photo'}, ${i + 1} of ${slides.length}`);
        dots[i].setAttribute('aria-current', String(active));
      });
      status.textContent = `Photo ${current + 1} of ${slides.length}`;
      if (focusedSlide) slides[current].focus({preventScroll: true});
    }
    previousButton.addEventListener('click', () => show(current - 1));
    nextButton.addEventListener('click', () => show(current + 1));
    slides.forEach((slide, i) => slide.addEventListener('click', () => {
      if (i !== current) show(i);
    }));
    carousel.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        show(current + (event.key === 'ArrowLeft' ? -1 : 1));
      }
    });
    track.addEventListener('pointerdown', event => {
      suppressClick = false;
      if (event.pointerType === 'mouse' || !event.isPrimary) return;
      pointerStart = {x:event.clientX, y:event.clientY};
    });
    track.addEventListener('pointerup', event => {
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        suppressClick = true;
        show(current + (dx < 0 ? 1 : -1));
      }
    });
    track.addEventListener('click', event => {
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      }
    }, true);
    track.addEventListener('pointercancel', () => { pointerStart = null; });
    show(0);
  });
})();
