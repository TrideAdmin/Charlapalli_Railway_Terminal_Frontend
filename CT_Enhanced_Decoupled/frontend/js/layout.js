/**
 * layout.js – injects shared header & footer — LUXURY CINEMATIC REDESIGN
 */

const NAV_HTML = `
<div class="top-bar">
  <div class="container top-bar-inner">
    <div class="tb-item" id="top-time" style="font-family:var(--font-mono,monospace)">--:-- --</div>
    <div class="tb-divider"></div>
    <div class="tb-item">
      <span id="weather-icon"><i data-lucide="cloud" style="width:14px;height:14px;"></i></span>
      <span id="weather-temp">--°C</span>
    </div>
    <div class="tb-divider"></div>
    <div class="tb-item dropdown-trigger" id="lang-trigger" style="position:relative;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      <span id="current-lang">Language</span>
      <span style="font-size:0.5rem;margin-left:2px;">▼</span>
      <div id="lang-menu" style="display:none;position:absolute;top:calc(100% + 8px);right:0;background:#141920;border:1px solid rgba(201,168,76,0.22);border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,0.6);z-index:1000;flex-direction:column;min-width:120px;overflow:hidden;">
        <div class="lang-opt" data-lang="en" style="padding:10px 18px;cursor:pointer;font-size:0.78rem;color:#9ba8b8;border-bottom:1px solid rgba(255,255,255,0.05);transition:all 0.15s;">English</div>
        <div class="lang-opt" data-lang="hi" style="padding:10px 18px;cursor:pointer;font-size:0.78rem;color:#9ba8b8;border-bottom:1px solid rgba(255,255,255,0.05);transition:all 0.15s;">हिंदी</div>
        <div class="lang-opt" data-lang="te" style="padding:10px 18px;cursor:pointer;font-size:0.78rem;color:#9ba8b8;transition:all 0.15s;">తెలుగు</div>
      </div>
    </div>
  </div>
</div>

<div id="google_translate_element" style="display:none;"></div>

<header class="site-header">
  <div class="header-inner">
    <a href="/index.html" class="logo">
      <img class="logo-icon" src="/images/logo.png" alt="CHZ Logo" />
      <div class="logo-abbr">CHZ</div>
      <div class="logo-text">
        <span>Charlapalli</span>
        <span>Railway</span>
        <span>Station</span>
      </div>
    </a>
    <nav class="main-nav" id="mainNav">
      <a href="/index.html" class="nav-link">Home</a>
      <a href="/pages/facilities.html" class="nav-link">Facilities</a>
      <a href="/pages/transport.html" class="nav-link">Transport</a>
      <a href="/pages/safety.html" class="nav-link">Safety</a>
      <a href="/pages/lost-found.html" class="nav-link">Lost & Found</a>
      <a href="/pages/navigate.html" class="nav-link" style="background:var(--orange,#e85d26);color:#fff;padding:0.45rem 1rem;border-radius:8px;font-weight:700;box-shadow:0 0 18px rgba(232,93,38,0.3);">
        <i data-lucide="map" style="width:14px;height:14px;"></i> Navigate
      </a>
      <a href="/pages/contact.html" class="nav-link">Contact</a>
    </nav>
    <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode" title="Toggle dark/light mode">
        <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    <button class="hamburger" id="hamburger" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>`;

const FOOTER_HTML = `
<footer class="site-footer">
  <div class="container footer-inner">
    <div class="footer-col">
      <div class="footer-logo"><i data-lucide="train-front"></i> Charlapalli Terminal</div>
      <p class="footer-desc">Serving Hyderabad's eastern corridor with modern passenger amenities and seamless connectivity to the South Central Railway network.</p>
    </div>
    <div class="footer-col">
      <h4>Quick Links</h4>
      <ul>
        <li><a href="/pages/facilities.html">Facilities</a></li>
        <li><a href="/pages/transport.html">Transport</a></li>
        <li><a href="/pages/safety.html">Safety & Security</a></li>
        <li><a href="/pages/navigate.html">Station Navigator</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Services</h4>
      <ul>
        <li><a href="/pages/lost-found.html">Lost & Found</a></li>
        <li><a href="/pages/contact.html">Contact Us</a></li>
        <li><a href="/index.html#lockers-live">Smart Lockers</a></li>
        <li><a href="/index.html#parking">Parking</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Emergency</h4>
      <p>RPF Control: <strong>9771449927</strong></p>
      <p>Station Manager: <strong>040-27261100</strong></p>
      <p>Medical Help: <strong>139</strong></p>
      <p>Railway Enquiry: <strong>139</strong></p>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="container">
      <span>© 2025 Charlapalli Terminal — South Central Railway</span>
      <span>Data updates are indicative. Verify at station.</span>
    </div>
  </div>
</footer>`;

// ── Inject layout ──────────────────────────────────────────────────────────
document.body.insertAdjacentHTML('afterbegin', NAV_HTML);
document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('beforeend', FOOTER_HTML);
  initLayout();
});

function initLayout() {
  // Theme init — default is light
  const saved = localStorage.getItem('ct-theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('ct-theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('ct-theme', 'dark');
      }
    });
  }

  // Mobile nav
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('mainNav');
  if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
      nav.classList.toggle('open');
      const spans = hamburger.querySelectorAll('span');
      hamburger.classList.toggle('open');
    });
    nav.querySelectorAll('a').forEach(l => l.addEventListener('click', () => {
      nav.classList.remove('open');
      hamburger.classList.remove('open');
    }));
  }

  // Active nav
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (path === '/' && href === '/index.html')) {
      link.classList.add('active');
    }
  });

  // Language dropdown
  const trigger = document.getElementById('lang-trigger');
  const menu = document.getElementById('lang-menu');
  if (trigger && menu) {
    trigger.addEventListener('click', e => {
      const isOpen = menu.style.display !== 'none';
      menu.style.display = isOpen ? 'none' : 'flex';
      e.stopPropagation();
    });
    document.addEventListener('click', () => { if (menu) menu.style.display = 'none'; });
    document.querySelectorAll('.lang-opt').forEach(opt => {
      opt.addEventListener('mouseenter', () => { opt.style.background = 'rgba(201,168,76,0.08)'; opt.style.color = '#c9a84c'; });
      opt.addEventListener('mouseleave', () => { opt.style.background = ''; opt.style.color = '#9ba8b8'; });
      opt.addEventListener('click', e => {
        e.stopPropagation();
        menu.style.display = 'none';
        const lang = opt.getAttribute('data-lang');
        const change = () => {
          const sel = document.querySelector('select.goog-te-combo');
          if (sel) { sel.value = lang; sel.dispatchEvent(new Event('change')); }
        };
        change(); setTimeout(change, 500);
      });
    });
  }

  // Clock
  updateTime();
  setInterval(updateTime, 1000);

  // Weather
  updateWeather();
  setInterval(updateWeather, 600000);

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
      }
    });
  });

  // Scroll reveal
  initScrollReveal();
}

function updateTime() {
  const now = new Date();
  let h = now.getHours(), m = now.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const el = document.getElementById('top-time');
  if (el) el.textContent = `${h}:${m < 10 ? '0' + m : m} ${ampm}`;
}

async function updateWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=17.4520&longitude=78.5996&current_weather=true');
    const data = await res.json();
    if (data?.current_weather) {
      const temp = Math.round(data.current_weather.temperature);
      const code = data.current_weather.weathercode;
      let icon = 'cloud';
      if (code === 0) icon = 'sun';
      else if (code <= 3) icon = 'cloud-sun';
      else if (code <= 48) icon = 'cloud-fog';
      else if (code <= 67) icon = 'cloud-rain';
      else if (code <= 77) icon = 'snowflake';
      else if (code <= 82) icon = 'cloud-drizzle';
      else if (code >= 95) icon = 'cloud-lightning';
      const wi = document.getElementById('weather-icon');
      const wt = document.getElementById('weather-temp');
      if (wi) { wi.innerHTML = `<i data-lucide="${icon}" style="width:14px;height:14px;"></i>`; if (window.lucide) lucide.createIcons({ nodes: [wi] }); }
      if (wt) wt.textContent = `${temp}°C`;
    }
  } catch (e) { /* silent */ }
}

function initScrollReveal() {
  const els = document.querySelectorAll('.facility-card, .wait-card, .locker-card, .park-card, .wt-stat-card, .emergency-card, .transport-card, .contact-info-card, .digital-card, .access-item');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('revealed'));
    return;
  }
  els.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 6) * 0.06}s`;
  });
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  els.forEach(el => obs.observe(el));
}

// Google Translate
window.googleTranslateElementInit = () => {
  new google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: 'en,te,hi', autoDisplay: false }, 'google_translate_element');
};
const gtScript = document.createElement('script');
gtScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
document.head.appendChild(gtScript);
