const ownerVideoButton = document.querySelector('#owner-video-play');
const ownerVideo = document.querySelector('#owner-video-player');
const ownerVideoError = document.querySelector('#owner-video-error');

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
  ownerVideo.play().catch(() => {
    // If playback is blocked, leave native controls available for another tap.
    if (ownerVideo.error) ownerVideoError.hidden = false;
  });
});

ownerVideo.addEventListener('error', () => { ownerVideoError.hidden = false; });
ownerVideo.addEventListener('playing', () => { ownerVideoError.hidden = true; });

// Stop audio when the visitor leaves the video to read or request a quote.
// Resuming always remains the visitor's choice through the native controls.
if ('IntersectionObserver' in window) {
  const visibility = new IntersectionObserver(([entry]) => {
    if (entry.intersectionRatio < 0.15 && !ownerVideo.paused) ownerVideo.pause();
  }, {threshold: [0, 0.15]});
  visibility.observe(ownerVideo);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) ownerVideo.pause();
});
