const ownerVideoButton = document.querySelector('#owner-video-play');
const ownerVideo = document.querySelector('#owner-video-player');
const ownerVideoError = document.querySelector('#owner-video-error');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let resumeAfterScroll = false;
let scrollPausePending = false;
let fullyOffscreen = false;

function pauseForScroll() {
  if (ownerVideo.paused || ownerVideo.ended) return;
  resumeAfterScroll = !reducedMotion.matches;
  // Media pause events are queued. Keep this marker until that event arrives
  // so it isn't confused with a visitor pressing the native Pause control.
  scrollPausePending = true;
  ownerVideo.pause();
}

function showPlaybackError(error) {
  // Pausing during a pending play request rejects it with AbortError. The
  // pause handler already owns that decision, including scroll-resume intent.
  if (error?.name === 'AbortError') return;
  // A browser may require another tap to resume. Keep its native controls
  // available without retrying playback or moving keyboard focus.
  resumeAfterScroll = false;
  if (ownerVideo.error) ownerVideoError.hidden = false;
}

ownerVideoButton.addEventListener('click', () => {
  // Assign the source only after a deliberate click, keeping video downloads
  // out of the landing page's initial load, even if preload hints are ignored.
  if (!ownerVideo.getAttribute('src')) {
    const smallScreen = matchMedia('(max-width: 700px)').matches;
    const saveData = navigator.connection?.saveData;
    ownerVideo.src = smallScreen || saveData
      ? ownerVideo.dataset.sourceMobile
      : ownerVideo.dataset.sourceDesktop;
  }
  ownerVideo.hidden = false;
  ownerVideoButton.hidden = true;
  ownerVideo.focus({preventScroll: true});
  ownerVideo.play().catch(showPlaybackError);
});

ownerVideo.addEventListener('error', () => {
  resumeAfterScroll = false;
  ownerVideoError.hidden = false;
});
ownerVideo.addEventListener('playing', () => { ownerVideoError.hidden = true; });
ownerVideo.addEventListener('pause', () => {
  if (scrollPausePending) {
    scrollPausePending = false;
    return;
  }
  // A visitor's pause must persist across scrolling away and back.
  resumeAfterScroll = false;
});
ownerVideo.addEventListener('ended', () => { resumeAfterScroll = false; });
ownerVideo.addEventListener('play', () => {
  // Also cover a pending play request that starts after the visitor scrolls.
  if (document.hidden) {
    resumeAfterScroll = false;
    ownerVideo.pause();
  } else if (fullyOffscreen) {
    pauseForScroll();
  }
});

// Observe the persistent frame, including before the click-to-play facade is
// replaced. Pause only when fully outside the viewport; resume at 20% visible
// to avoid starting sound again while just a sliver of the player is showing.
if ('IntersectionObserver' in window) {
  const visibility = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    fullyOffscreen = !entry.isIntersecting || entry.intersectionRatio === 0;
    if (fullyOffscreen) {
      pauseForScroll();
    } else if (entry.intersectionRatio >= 0.2 && resumeAfterScroll &&
               !document.hidden && !ownerVideo.ended && !ownerVideo.error) {
      resumeAfterScroll = false;
      if (!reducedMotion.matches) ownerVideo.play().catch(showPlaybackError);
    }
  }, {threshold: [0, 0.2]});
  visibility.observe(ownerVideo.closest('.owner-video-frame'));
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Switching tabs cancels automatic resumption, preventing surprise audio
    // when the visitor returns later. They can use Play to continue.
    resumeAfterScroll = false;
    ownerVideo.pause();
  }
});
