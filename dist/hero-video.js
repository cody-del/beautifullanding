(() => {
  const hero = document.querySelector('.paper-hero');
  const video = document.querySelector('#hero-video');
  const button = document.querySelector('#hero-video-toggle');
  if (!hero || !video || !button) return;

  const label = button.querySelector('.hero-video-label');
  const pauseIcon = button.querySelector('.hero-pause-icon');
  const playIcon = button.querySelector('.hero-play-icon');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = navigator.connection?.saveData;
  let wantsPlayback = !motion.matches && !saveData;
  let inView = !('IntersectionObserver' in window);

  function updateControl() {
    const playing = !video.paused;
    label.textContent = playing ? 'Pause video' : 'Play video';
    pauseIcon.toggleAttribute('hidden', !playing);
    playIcon.toggleAttribute('hidden', playing);
  }

  function syncPlayback() {
    if (!wantsPlayback || !inView || document.hidden) {
      video.pause();
      return;
    }
    if (!video.getAttribute('src')) {
      const mobile = matchMedia('(max-width: 700px)').matches || saveData;
      video.src = mobile ? video.dataset.sourceMobile : video.dataset.sourceDesktop;
    }
    if (!video.paused) return;
    // The exported clip has no audio track. Keep the muted property as well
    // for inline autoplay policies, including Safari on mobile.
    video.muted = true;
    video.play().catch(error => {
      if (error.name === 'AbortError') return; // A deliberate/offscreen pause.
      wantsPlayback = false;
      updateControl(); // Browser autoplay restrictions leave an explicit Play.
    });
  }

  button.addEventListener('click', () => {
    wantsPlayback = video.paused;
    syncPlayback();
  });
  video.addEventListener('play', updateControl);
  video.addEventListener('pause', updateControl);
  video.addEventListener('playing', () => { video.classList.add('is-ready'); });
  video.addEventListener('error', () => {
    wantsPlayback = false;
    video.classList.remove('is-ready');
    video.pause();
    updateControl();
  });
  document.addEventListener('visibilitychange', syncPlayback);
  motion.addEventListener('change', () => {
    if (motion.matches) wantsPlayback = false;
    syncPlayback();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1];
      inView = entry.isIntersecting && entry.intersectionRatio > 0;
      syncPlayback();
    }, {threshold: [0]}).observe(hero);
  }

  button.hidden = false;
  updateControl();
  syncPlayback();
})();
