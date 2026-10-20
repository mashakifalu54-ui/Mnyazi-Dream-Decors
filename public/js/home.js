/*
  home.js: the moving parts of the homepage.
  1. Motion switch (is the visitor OK with animation?)
  2. Phone menu (open / close)
  3. Hero slideshow (new photo every 6 seconds, progress lines, pause button)
  4. Parallax (hero photo moves slower than the page)
  5. Sideways gallery (slides while scrolling on laptops, swipe on phones)
  6. Rise-in on scroll
  7. Photo viewer (tap a photo to see it big; arrows, swipe, Esc)
  8. Footer year
*/

// ---------- 1. Motion switch ----------
// Some people set their phone/computer to "reduce motion". We respect that everywhere.
const wantsLessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!wantsLessMotion) {
  document.documentElement.classList.add('motion');   // css/site.css only animates when this class is there
}


// ---------- 2. Phone menu ----------
const menuBtn = document.getElementById('menuBtn');
const mainNav = document.getElementById('mainNav');

menuBtn.addEventListener('click', function () {
  // toggle() adds the class if it is missing, removes it if it is there.
  // It returns true when the class is now ON (menu open).
  const isOpen = mainNav.classList.toggle('is-open');
  menuBtn.setAttribute('aria-expanded', isOpen);   // tells screen readers if the menu is open
});

// Close the menu after a link is tapped (otherwise it covers the page)
mainNav.addEventListener('click', function (event) {
  if (event.target.tagName === 'A') {
    mainNav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
});


// ---------- 3. Hero slideshow ----------
const hero = document.getElementById('hero');
const slides = document.querySelectorAll('#heroSlides img');       // all 5 hero photos
const progress = document.getElementById('slideProgress');
const slideToggle = document.getElementById('slideToggle');
let current = 0;      // which photo is showing (0 = the first one)
let timer = null;     // the repeating timer, so we can stop it

// Make one thin progress line per photo: <i></i><i></i>...
slides.forEach(function () {
  progress.appendChild(document.createElement('i'));
});
const lines = progress.querySelectorAll('i');

// Load the other hero photos only after the page has finished loading (faster first view)
window.addEventListener('load', function () {
  slides.forEach(function (img) {
    if (img.dataset.src) { img.src = img.dataset.src; }
  });
});

function showSlide(index) {
  slides[current].classList.remove('is-active');
  current = (index + slides.length) % slides.length;   // % brings it back to 0 after the last photo
  slides[current].classList.add('is-active');

  // Lines before the current photo are full, the current one fills up, later ones are empty
  lines.forEach(function (line, i) {
    line.classList.toggle('is-done', i < current);
    line.classList.remove('is-active');
  });
  void lines[current].offsetWidth;          // tiny trick: makes the browser restart the fill animation
  lines[current].classList.add('is-active');
}

function play() {
  clearInterval(timer);
  timer = setInterval(function () { showSlide(current + 1); }, 6000);   // 6000 ms = 6 seconds
  hero.classList.remove('is-paused');
  slideToggle.setAttribute('aria-label', 'Pause slideshow');
}

function pause() {
  clearInterval(timer);
  timer = null;
  hero.classList.add('is-paused');
  slideToggle.setAttribute('aria-label', 'Play slideshow');
}

slideToggle.addEventListener('click', function () {
  if (timer) { pause(); } else { play(); }
});

showSlide(0);
if (wantsLessMotion) { pause(); } else { play(); }


// ---------- 4 + 5. Parallax and sideways gallery ----------
const heroSlides = document.getElementById('heroSlides');
const work = document.getElementById('work');
const workPin = document.getElementById('workPin');
const workTrack = document.getElementById('workTrack');
const workHint = document.getElementById('workHint');
let galleryMode = 'swipe';

// Decide: laptop (slide while scrolling) or phone (swipe). Runs again if the window is resized.
function setUpGallery() {
  const isPhone = window.innerWidth < 760;
  galleryMode = (isPhone || wantsLessMotion) ? 'swipe' : 'pinned';

  work.classList.toggle('is-swipe', galleryMode === 'swipe');
  work.classList.toggle('is-pinned', galleryMode === 'pinned');

  if (galleryMode === 'swipe') {
    work.style.height = '';
    workTrack.style.transform = '';
    workHint.textContent = 'Swipe sideways to see more →';
  } else {
    // How far the photo row must move so the last photo comes into view
    const extra = Math.max(0, workTrack.scrollWidth - window.innerWidth);
    // Make the section taller by that amount: scrolling down through the extra height moves the photos sideways
    work.style.height = (workPin.offsetHeight + extra) + 'px';
    workHint.textContent = 'Keep scrolling to move through the photos →';
  }
  onScroll();
}

function onScroll() {
  const y = window.scrollY;   // how far down the page we are, in pixels

  // Parallax: the hero photo moves at 30% of the scroll speed
  if (!wantsLessMotion && y < window.innerHeight) {
    heroSlides.style.transform = 'translateY(' + (y * 0.3) + 'px)';
  }

  if (galleryMode === 'pinned') {
    const box = work.getBoundingClientRect();
    const headerHeight = 68;
    const scrollRoom = work.offsetHeight - workPin.offsetHeight;
    // 0 = gallery just reached the top, 1 = we scrolled all the way through it
    let amount = (headerHeight - box.top) / Math.max(1, scrollRoom);
    amount = Math.min(1, Math.max(0, amount));
    const distance = Math.max(0, workTrack.scrollWidth - window.innerWidth);
    workTrack.style.transform = 'translateX(' + (-amount * distance) + 'px)';
  }
}

// requestAnimationFrame = "do this just before the next screen paint" (smooth, not 100 times per scroll)
let waiting = false;
window.addEventListener('scroll', function () {
  if (waiting) { return; }
  waiting = true;
  requestAnimationFrame(function () { onScroll(); waiting = false; });
}, { passive: true });
window.addEventListener('resize', setUpGallery);
window.addEventListener('load', setUpGallery);   // photo sizes are known once they have loaded
setUpGallery();


// ---------- 6. Rise-in on scroll ----------
// IntersectionObserver tells us when an element comes onto the screen.
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !wantsLessMotion) {
  const watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        watcher.unobserve(entry.target);   // only once, then stop watching
      }
    });
  }, { threshold: 0.15 });
  reveals.forEach(function (el) { watcher.observe(el); });
} else {
  // Old browser or motion turned off: just show everything
  reveals.forEach(function (el) { el.classList.add('is-visible'); });
}


// ---------- 7. Photo viewer ----------
const shots = document.querySelectorAll('#workTrack .shot');
const viewer = document.getElementById('viewer');
const viewerImg = document.getElementById('viewerImg');
const viewerCaption = document.getElementById('viewerCaption');
let shown = 0;   // which gallery photo is open in the viewer

function openPhoto(index) {
  // Wrap around: before the first goes to the last, after the last goes to the first
  shown = (index + shots.length) % shots.length;
  const img = shots[shown].querySelector('img');
  viewerImg.src = img.src;
  viewerImg.alt = img.alt;
  viewerCaption.textContent = shots[shown].querySelector('b').textContent + ' · ' + img.alt;
  if (!viewer.open) { viewer.showModal(); }      // showModal() opens the <dialog>
}

// forEach runs the same code for every photo button
shots.forEach(function (shot, index) {
  shot.addEventListener('click', function () { openPhoto(index); });
});

document.getElementById('viewerPrev').addEventListener('click', function () { openPhoto(shown - 1); });
document.getElementById('viewerNext').addEventListener('click', function () { openPhoto(shown + 1); });
document.getElementById('viewerClose').addEventListener('click', function () { viewer.close(); });

// Tapping the dark area around the photo also closes the viewer
viewer.addEventListener('click', function (event) {
  if (event.target === viewer) { viewer.close(); }
});

// Left / right arrow keys move between photos while the viewer is open
viewer.addEventListener('keydown', function (event) {
  if (event.key === 'ArrowRight') { openPhoto(shown + 1); }
  if (event.key === 'ArrowLeft') { openPhoto(shown - 1); }
});

// Swipe on phones: remember where the finger started, compare where it ended
let touchStartX = null;
viewer.addEventListener('touchstart', function (event) {
  touchStartX = event.touches[0].clientX;
}, { passive: true });
viewer.addEventListener('touchend', function (event) {
  if (touchStartX === null) { return; }
  const moved = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(moved) > 40) { openPhoto(moved < 0 ? shown + 1 : shown - 1); }   // 40px = a real swipe, not a tap
  touchStartX = null;
});


// ---------- 8. Footer year ----------
document.getElementById('year').textContent = new Date().getFullYear();
