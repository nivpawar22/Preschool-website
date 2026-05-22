import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Serve static files — public/static/* is served at /static/*
app.use('/static/*', serveStatic({ root: './public' }))

// Layout wrapper
const Layout = ({ children, title = 'SuperKids Preschool' }: { children: any; title?: string }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="icon" type="image/png" href="/static/logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --cyan: #00D9E8;
      --red: #E8131A;
      --yellow: #FFD700;
      --orange: #FF6B35;
      --purple: #9B4DCA;
      --green: #2ECC71;
      --dark: #1e0f3a;
      --dark2: #2a1050;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Nunito', sans-serif;
      background-color: #180e32;
      color: #fff;
      overflow-x: hidden;
    }

    /* ===== NEON GLOW EFFECTS ===== */
    .neon-cyan   { text-shadow: 0 0 8px rgba(0,217,232,0.8), 0 0 16px rgba(0,217,232,0.4); }
    .neon-red    { text-shadow: 0 0 8px rgba(232,19,26,0.8),  0 0 16px rgba(232,19,26,0.4); }
    .neon-yellow { text-shadow: 0 0 8px rgba(255,215,0,0.8), 0 0 16px rgba(255,215,0,0.4); }
    .neon-purple { text-shadow: 0 0 8px rgba(155,77,202,0.8), 0 0 16px rgba(155,77,202,0.4); }
    .neon-orange { text-shadow: 0 0 8px rgba(255,107,53,0.8), 0 0 16px rgba(255,107,53,0.4); }

    .glow-box-cyan   { box-shadow: 0 0 18px #00D9E8, 0 0 36px rgba(0,217,232,0.35); }
    .glow-box-red    { box-shadow: 0 0 18px #E8131A, 0 0 36px rgba(232,19,26,0.35); }
    .glow-box-yellow { box-shadow: 0 0 18px #FFD700, 0 0 36px rgba(255,215,0,0.35); }
    .glow-box-purple { box-shadow: 0 0 18px #9B4DCA, 0 0 36px rgba(155,77,202,0.35); }

    /* ===== NAVBAR ===== */
    nav {
      background: linear-gradient(180deg, #120a28 0%, #1e0f3a 100%);
      backdrop-filter: blur(12px);
      border-bottom: 3px solid #00D9E8;
      box-shadow: 0 2px 30px rgba(0,217,232,0.3), 0 4px 60px rgba(0,0,0,0.6), 0 0 60px rgba(155,77,202,0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    /* Header logo glow bg — matches screenshot radial glow */
    .nav-logo-glow {
      position: absolute;
      inset: 0;
      border-radius: 0;
      background: radial-gradient(ellipse at 30% 50%, rgba(0,180,210,0.13) 0%, transparent 65%);
      pointer-events: none;
    }

    .nav-logo-text {
      font-family: 'Bangers', cursive;
      font-size: 1.8rem;
      letter-spacing: 2px;
    }

    .nav-link {
      font-weight: 700;
      font-size: 0.9rem;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 8px 14px;
      border-radius: 6px;
      transition: all 0.3s;
      position: relative;
    }

    .nav-link:hover {
      color: #00D9E8;
      background: rgba(0,217,232,0.1);
      text-shadow: 0 0 5px rgba(0,217,232,0.4);
    }

    .nav-link.active {
      color: #00D9E8;
      border-bottom: 2px solid #00D9E8;
    }

    /* ===== HERO ===== */
    .hero {
      min-height: 100vh;
      background: radial-gradient(ellipse at top, #2e1060 0%, #180e32 70%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle at 20% 50%, rgba(0,217,232,0.08) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(232,19,26,0.07) 0%, transparent 50%),
                        radial-gradient(circle at 60% 80%, rgba(255,215,0,0.05) 0%, transparent 40%),
                        radial-gradient(circle at 40% 30%, rgba(155,77,202,0.06) 0%, transparent 45%);
    }

    /* Stars */
    .star {
      position: absolute;
      background: #fff;
      border-radius: 50%;
      animation: twinkle 3s infinite alternate;
    }
    @keyframes twinkle {
      0%   { opacity: 0.2; transform: scale(1); }
      100% { opacity: 1;   transform: scale(1.3); }
    }

    /* Comic burst shape */
    .burst {
      position: absolute;
      font-family: 'Bangers', cursive;
      font-size: 1.2rem;
      color: #FFD700;
      text-shadow: 0 0 5px rgba(255,215,0,0.4);
      animation: float 4s ease-in-out infinite;
    }
    @keyframes float {
      0%,100% { transform: translateY(0) rotate(-5deg); }
      50%      { transform: translateY(-15px) rotate(5deg); }
    }

    /* Shield / Logo hero animation */
    .shield-hero {
      animation: heroFloat 4s ease-in-out infinite;
      border-radius: 0;
      background: transparent;
    }
    @keyframes heroFloat {
      0%,100% { transform: translateY(0px)   scale(1)    rotate(-1deg); }
      33%      { transform: translateY(-14px) scale(1.02) rotate(0deg);  }
      66%      { transform: translateY(-8px)  scale(1.01) rotate(1deg);  }
    }
    @keyframes glowPulse {
      0%,100% { opacity:0.55; transform:scale(1);    }
      50%      { opacity:1;   transform:scale(1.08); }
    }

    /* ===== SECTION HEADINGS ===== */
    .section-title {
      font-family: 'Bangers', cursive;
      font-size: 3rem;
      letter-spacing: 3px;
      line-height: 1;
    }

    /* ===== CARDS ===== */
    .card {
      background: rgba(255,255,255,0.07);
      border: 2px solid rgba(0,217,232,0.25);
      border-radius: 22px;
      padding: 2rem;
      transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
      overflow: visible;
    }
    .card::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 22px;
      background: linear-gradient(135deg, rgba(0,217,232,0.07), rgba(155,77,202,0.04), transparent);
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
      z-index: 0;
    }
    .card:hover {
      border-color: #00D9E8;
      transform: translateY(-8px) scale(1.01);
      box-shadow: 0 24px 48px rgba(0,217,232,0.18), 0 0 0 1px rgba(0,217,232,0.1);
    }
    .card:hover::before { opacity: 1; }

    .card-red {
      border-color: rgba(232,19,26,0.25);
    }
    .card-red::before {
      background: linear-gradient(135deg, rgba(232,19,26,0.07), rgba(255,107,53,0.04), transparent);
    }
    .card-red:hover {
      border-color: #E8131A;
      box-shadow: 0 24px 48px rgba(232,19,26,0.18);
    }

    .card-yellow {
      border-color: rgba(255,215,0,0.25);
    }
    .card-yellow::before {
      background: linear-gradient(135deg, rgba(255,215,0,0.07), rgba(255,107,53,0.04), transparent);
    }
    .card-yellow:hover {
      border-color: #FFD700;
      box-shadow: 0 24px 48px rgba(255,215,0,0.18);
    }

    /* ===== PROGRAM CARDS ===== */
    .program-card {
      border-radius: 24px;
      overflow: hidden;
      transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .program-card:hover { transform: scale(1.04) translateY(-4px); }

    /* ===== BUTTONS ===== */
    .btn-primary {
      background: linear-gradient(135deg, #E8131A, #FF4444, #FF6B35);
      color: #fff;
      font-family: 'Bangers', cursive;
      font-size: 1.2rem;
      letter-spacing: 2px;
      padding: 14px 36px;
      border-radius: 50px;
      border: none;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      text-decoration: none;
      display: inline-block;
      box-shadow: 0 0 20px rgba(232,19,26,0.45), 0 4px 15px rgba(0,0,0,0.3);
    }
    .btn-primary:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 0 40px rgba(232,19,26,0.75), 0 8px 25px rgba(0,0,0,0.3);
    }

    .btn-secondary {
      background: rgba(0,217,232,0.08);
      color: #00D9E8;
      font-family: 'Bangers', cursive;
      font-size: 1.2rem;
      letter-spacing: 2px;
      padding: 12px 34px;
      border-radius: 50px;
      border: 2px solid #00D9E8;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      text-decoration: none;
      display: inline-block;
    }
    .btn-secondary:hover {
      background: rgba(0,217,232,0.2);
      box-shadow: 0 0 30px rgba(0,217,232,0.55), 0 4px 15px rgba(0,0,0,0.2);
      transform: scale(1.08) translateY(-2px);
    }

    /* ===== STAT COUNTERS ===== */
    .stat-number {
      font-family: 'Bangers', cursive;
      font-size: 3.5rem;
      letter-spacing: 2px;
    }

    /* ===== TEACHER CARD ===== */
    .teacher-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid #00D9E8;
      box-shadow: 0 0 20px rgba(0,217,232,0.4);
      object-fit: cover;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      background: linear-gradient(135deg, #1a2a4a, #0f1f3f);
      margin: 0 auto 1rem;
    }

    /* ===== TIMELINE ===== */
    .timeline-dot {
      width: 16px;
      height: 16px;
      background: #00D9E8;
      border-radius: 50%;
      box-shadow: 0 0 10px #00D9E8;
      flex-shrink: 0;
    }

    /* ===== GALLERY ===== */
    .gallery-item {
      border-radius: 18px;
      overflow: hidden;
      aspect-ratio: 1;
      background: linear-gradient(135deg, #1e1a4a, #1a0f3f);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      border: 2px solid rgba(0,217,232,0.2);
      transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      cursor: pointer;
    }
    .gallery-item:hover {
      border-color: #00D9E8;
      transform: scale(1.06);
      box-shadow: 0 0 28px rgba(0,217,232,0.35), 0 8px 20px rgba(0,0,0,0.3);
    }

    /* ===== FORM ===== */
    .form-input {
      width: 100%;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(0,217,232,0.3);
      border-radius: 10px;
      padding: 12px 16px;
      color: #fff;
      font-family: 'Nunito', sans-serif;
      font-size: 1rem;
      transition: border-color 0.3s;
      outline: none;
      position: relative;
      z-index: 2;
      cursor: text;
    }
    .form-input:focus {
      border-color: #00D9E8;
      box-shadow: 0 0 10px rgba(0,217,232,0.2);
    }
    .form-input::placeholder { color: rgba(255,255,255,0.4); }

    /* ===== FOOTER ===== */
    footer {
      background: rgba(10,4,25,0.85);
      border-top: 2px solid rgba(0,217,232,0.25);
    }

    /* ===== DIVIDER ===== */
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #00D9E8, transparent);
      margin: 4rem 0;
    }

    /* ===== SCROLL ANIMATIONS ===== */
    .fade-in {
      opacity: 0;
      transform: translateY(30px);
      transition: opacity 0.6s ease, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .fade-in.visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* ===== MOBILE MENU ===== */
    #mobile-menu {
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      transition: max-height 0.4s ease-in-out, opacity 0.3s ease;
    }
    #mobile-menu.open {
      max-height: 600px;
      opacity: 1;
    }
    #menu-btn {
      transition: transform 0.3s ease;
    }
    #menu-btn.open {
      transform: rotate(90deg);
    }

    /* ===== BADGE ===== */
    .badge {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      transition: transform 0.2s ease;
    }
    .badge:hover { transform: scale(1.05); }

    /* ===== MARQUEE ===== */
    .marquee-wrap {
      overflow: hidden;
      background: linear-gradient(90deg, #E8131A, #c5000a, #E8131A);
      padding: 12px 0;
      border-top: 2px solid rgba(255,107,53,0.5);
      border-bottom: 2px solid rgba(255,107,53,0.5);
    }
    .marquee-track {
      display: flex;
      animation: marquee 20s linear infinite;
      white-space: nowrap;
    }
    @keyframes marquee {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* Age tab active */
    .age-tab.active {
      background: #00D9E8;
      color: #0f0f1a;
    }

    /* Testimonial */
    .testimonial-card {
      background: rgba(255,255,255,0.06);
      border: 2px solid rgba(255,215,0,0.25);
      border-radius: 22px;
      padding: 2rem;
      transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .testimonial-card:hover {
      border-color: #FFD700;
      box-shadow: 0 0 28px rgba(255,215,0,0.2), 0 12px 30px rgba(0,0,0,0.2);
      transform: translateY(-6px);
    }

    /* ===== CHILD-FRIENDLY EXTRAS ===== */
    @keyframes wiggle {
      0%, 100% { transform: rotate(-3deg); }
      50% { transform: rotate(3deg); }
    }
    .wiggle:hover { animation: wiggle 0.4s ease-in-out 2; }

    @keyframes pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    .pop:hover { animation: pop 0.3s ease; }

    /* Rainbow divider */
    .divider-rainbow {
      height: 3px;
      background: linear-gradient(90deg, #E8131A, #FF6B35, #FFD700, #2ECC71, #00D9E8, #9B4DCA);
      border-radius: 3px;
      margin: 4rem 0;
    }
  </style>
</head>
<body>
  ${children}

  <script>
    // Scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // Mobile menu toggle
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.toggle('open');
        menuBtn.classList.toggle('open', isOpen);
        menuBtn.innerHTML = isOpen
          ? '<i class="fas fa-times"></i>'
          : '<i class="fas fa-bars"></i>';
      });
    }

    // Age tabs
    document.querySelectorAll('.age-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.age-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.target;
        document.querySelectorAll('.age-content').forEach(c => {
          c.style.display = c.id === target ? 'grid' : 'none';
        });
      });
    });

    // Counter animation
    function animateCounter(el) {
      const target = parseInt(el.dataset.target);
      let current = 0;
      const step = Math.ceil(target / 50);
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current + (el.dataset.suffix || '');
        if (current >= target) clearInterval(timer);
      }, 40);
    }
    const counterObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !e.target.dataset.animated) {
          e.target.dataset.animated = 'true';
          animateCounter(e.target);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.counter').forEach(el => counterObs.observe(el));
  </script>

  <!-- ── WhatsApp Floating Button ── -->
  <a href="https://wa.me/919822977644?text=Hello%20SuperKids%20Preschool!%20I%20would%20like%20to%20know%20more%20about%20your%20programs."
     target="_blank"
     rel="noopener noreferrer"
     id="whatsapp-btn"
     style="
       position:fixed;
       bottom:28px;
       right:28px;
       z-index:9999;
       width:62px;
       height:62px;
       border-radius:50%;
       background:linear-gradient(135deg,#25D366,#128C7E);
       display:flex;
       align-items:center;
       justify-content:center;
       box-shadow:0 4px 20px rgba(37,211,102,0.55),0 2px 8px rgba(0,0,0,0.4);
       text-decoration:none;
       transition:transform 0.3s,box-shadow 0.3s;
       animation:waPulse 2.5s ease-in-out infinite;
     "
     onmouseover="this.style.transform='scale(1.12)';this.style.boxShadow='0 6px 28px rgba(37,211,102,0.75),0 2px 10px rgba(0,0,0,0.5)'"
     onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 4px 20px rgba(37,211,102,0.55),0 2px 8px rgba(0,0,0,0.4)'">
    <!-- WhatsApp SVG icon -->
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="34" height="34">
      <path fill="#fff" d="M24 4C13 4 4 13 4 24c0 3.6 1 7 2.7 9.9L4 44l10.4-2.7C17 43 20.4 44 24 44c11 0 20-9 20-20S35 4 24 4zm0 36c-3.1 0-6.1-.8-8.7-2.4l-.6-.4-6.2 1.6 1.7-6-.4-.6C8.8 30.1 8 27.1 8 24c0-8.8 7.2-16 16-16s16 7.2 16 16-7.2 16-16 16zm8.7-11.8c-.5-.2-2.8-1.4-3.2-1.5-.4-.2-.7-.2-1 .2-.3.4-1.2 1.5-1.5 1.9-.3.3-.5.4-1 .1-.5-.2-2-.7-3.8-2.3-1.4-1.2-2.3-2.8-2.6-3.2-.3-.5 0-.7.2-1 .2-.2.5-.5.7-.8.2-.3.3-.5.4-.8.1-.3 0-.6-.1-.8-.1-.2-1-2.5-1.4-3.4-.4-.9-.7-.8-1-.8h-.9c-.3 0-.8.1-1.2.6-.4.5-1.6 1.5-1.6 3.7 0 2.2 1.6 4.3 1.8 4.6.2.3 3.1 4.8 7.6 6.7 1.1.5 1.9.7 2.6.9 1.1.3 2.1.3 2.9.2.9-.1 2.8-1.1 3.2-2.2.4-1.1.4-2 .3-2.2-.1-.2-.4-.3-.9-.5z"/>
    </svg>
    <!-- Pulse ring -->
    <span style="
      position:absolute;
      width:62px;height:62px;
      border-radius:50%;
      background:rgba(37,211,102,0.35);
      animation:waPulse 2.5s ease-out infinite;
      pointer-events:none;
    "></span>
  </a>

  <!-- WhatsApp tooltip on hover -->
  <div id="wa-tooltip" style="
    position:fixed;
    bottom:38px;
    right:100px;
    z-index:9998;
    background:#1a1a2e;
    color:#fff;
    padding:10px 16px;
    border-radius:12px;
    font-size:0.85rem;
    font-weight:700;
    white-space:nowrap;
    box-shadow:0 4px 16px rgba(0,0,0,0.4);
    border:1px solid rgba(37,211,102,0.4);
    opacity:0;
    pointer-events:none;
    transition:opacity 0.3s;
  ">
    <i class="fab fa-whatsapp" style="color:#25D366;margin-right:6px"></i>Chat with us on WhatsApp!
  </div>

  <style>
    @keyframes waPulse {
      0%   { transform:scale(1);   opacity:1; }
      70%  { transform:scale(1.4); opacity:0; }
      100% { transform:scale(1.4); opacity:0; }
    }
  </style>

  <script>
    const waBtn     = document.getElementById('whatsapp-btn');
    const waTooltip = document.getElementById('wa-tooltip');
    waBtn.addEventListener('mouseenter', () => waTooltip.style.opacity = '1');
    waBtn.addEventListener('mouseleave', () => waTooltip.style.opacity = '0');
  </script>

</body>
</html>
`

// ========== NAVBAR COMPONENT ==========
const Navbar = (active: string) => `
<nav style="position:sticky;top:0;z-index:1000">

  <!-- ── TOP HEADER BAR: full-width logo banner matching screenshot ── -->
  <div style="
    background: linear-gradient(180deg,#120a28 0%,#1e0f3a 100%);
    position:relative;
    overflow:hidden;
    border-bottom:3px solid #00D9E8;
    box-shadow:0 2px 30px rgba(0,217,232,0.28),0 0 40px rgba(155,77,202,0.12),0 4px 60px rgba(0,0,0,0.7);
  ">
    <!-- Radial cyan glow — left-anchored -->
    <div style="
      position:absolute;top:50%;left:0;
      transform:translateY(-50%);
      width:600px;height:200px;
      background:radial-gradient(ellipse,rgba(0,195,220,0.16) 0%,transparent 70%);
      pointer-events:none;
    "></div>

    <!-- Two-row layout: logo centred, nav below -->
    <div class="max-w-7xl mx-auto px-6" style="position:relative;z-index:2">

      <!-- Logo row -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0">

        <!-- Logo + Tagline -->
        <a href="/" style="text-decoration:none;display:flex;flex-direction:column;align-items:flex-start;flex-shrink:0">
          <img src="/static/logo.png" alt="SuperKids Preschool"
            style="
              display:block;
              width:500px !important;
              height:120px !important;
              min-width:500px;
              min-height:120px;
              max-width:500px;
              max-height:120px;
              object-fit:contain;
              object-position:left center;
              filter:
                drop-shadow(0px 4px 12px rgba(0,0,0,0.7))
                drop-shadow(0 0 20px rgba(0,210,230,0.65))
                drop-shadow(0 0 42px rgba(0,210,230,0.30));
              transition:filter 0.3s,transform 0.3s;
            "
            onmouseover="this.style.filter='drop-shadow(0px 4px 16px rgba(0,0,0,0.8)) drop-shadow(0 0 32px rgba(0,210,230,1)) drop-shadow(0 0 60px rgba(0,210,230,0.5))';this.style.transform='scale(1.02)'"
            onmouseout="this.style.filter='drop-shadow(0px 4px 12px rgba(0,0,0,0.7)) drop-shadow(0 0 20px rgba(0,210,230,0.65)) drop-shadow(0 0 42px rgba(0,210,230,0.30))';this.style.transform='scale(1)'"
          />
          <!-- Tagline — white illuminated style -->
          <div style="
            margin-top:-12px;
            font-family:'Nunito',sans-serif;
            font-size:1rem;
            font-weight:800;
            letter-spacing:2px;
            text-align:left;
            width:500px;
            color:#ffffff;
            text-shadow:
              0 0 4px rgba(255,255,255,0.5),
              0 0 8px rgba(255,255,255,0.3),
              0 0 14px rgba(0,217,232,0.3);
            white-space: nowrap;
          ">✨ Where Every Child is a SuperHero!!</div>
        </a>

        <!-- Desktop nav links (right side) -->
        <div class="hidden md:flex items-center gap-1">
          <a href="/" class="nav-link ${active === 'home' ? 'active' : ''}" style="color:${active === 'home' ? '#00D9E8' : '#ccc'}">Home</a>
          <a href="/about" class="nav-link ${active === 'about' ? 'active' : ''}" style="color:${active === 'about' ? '#00D9E8' : '#ccc'}">About</a>
          <a href="/programs" class="nav-link ${active === 'programs' ? 'active' : ''}" style="color:${active === 'programs' ? '#00D9E8' : '#ccc'}">Programs</a>
          <a href="/gallery" class="nav-link ${active === 'gallery' ? 'active' : ''}" style="color:${active === 'gallery' ? '#00D9E8' : '#ccc'}">Gallery</a>
          <a href="/contact" class="nav-link ${active === 'contact' ? 'active' : ''}" style="color:${active === 'contact' ? '#00D9E8' : '#ccc'}">Contact</a>
          <a href="/parent-portal" class="nav-link ${active === 'portal' ? 'active' : ''}" style="color:${active === 'portal' ? '#FFD700' : '#FFD700'};border:1px solid rgba(255,215,0,0.35);border-radius:6px;padding:7px 13px">
            <i class="fas fa-shield-alt mr-1" style="font-size:0.8rem"></i>Parent Portal
          </a>
          <a href="/contact" class="btn-primary ml-3" style="font-size:0.88rem;padding:10px 22px">Enroll Now!</a>
        </div>

        <!-- Mobile hamburger -->
        <button id="menu-btn" class="md:hidden" style="color:#fff;font-size:1.6rem;background:none;border:none;cursor:pointer">
          <i class="fas fa-bars"></i>
        </button>
      </div>

    </div>
  </div>

  <!-- Mobile Menu -->
  <div id="mobile-menu" class="md:hidden px-4 pb-4" style="background:#1a0f3a;border-bottom:2px solid rgba(0,217,232,0.25)">
    <div class="flex flex-col gap-1" style="padding:12px 0">
      <a href="/" style="color:#ccc;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='rgba(0,217,232,0.08)'" onmouseout="this.style.background=''">🏠 Home</a>
      <a href="/about" style="color:#ccc;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='rgba(0,217,232,0.08)'" onmouseout="this.style.background=''">⚡ About</a>
      <a href="/programs" style="color:#ccc;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='rgba(0,217,232,0.08)'" onmouseout="this.style.background=''">🎓 Programs</a>
      <a href="/gallery" style="color:#ccc;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='rgba(0,217,232,0.08)'" onmouseout="this.style.background=''">🖼️ Gallery</a>
      <a href="/contact" style="color:#ccc;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='rgba(0,217,232,0.08)'" onmouseout="this.style.background=''">📞 Contact</a>
      <a href="/parent-portal" style="color:#FFD700;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none;border:1px solid rgba(255,215,0,0.3)" onmouseover="this.style.background='rgba(255,215,0,0.08)'" onmouseout="this.style.background=''">🛡️ Parent Portal</a>
      <a href="/contact" class="btn-primary" style="text-align:center;margin-top:8px;display:block">Enroll Now!</a>
    </div>
  </div>

</nav>
`

// ========== FOOTER COMPONENT ==========
const Footer = () => `
<footer class="py-12 mt-20">
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
      <!-- Brand -->
      <div>
        <a href="/" style="display:inline-block;margin-bottom:1.2rem;text-decoration:none">
          <img src="/static/logo.png" alt="SuperKids Preschool"
            style="height:76px;width:auto;object-fit:contain;
                   filter:drop-shadow(2px 4px 6px rgba(0,0,0,0.5)) drop-shadow(0 0 12px rgba(0,217,232,0.5));
                   transition:filter 0.3s"
            onmouseover="this.style.filter='drop-shadow(2px 4px 10px rgba(0,0,0,0.6)) drop-shadow(0 0 22px rgba(0,217,232,0.8))'"
            onmouseout="this.style.filter='drop-shadow(2px 4px 6px rgba(0,0,0,0.5)) drop-shadow(0 0 12px rgba(0,217,232,0.5))'"/>
        </a>
        <p style="color:#999;font-size:0.9rem;line-height:1.8">Empowering little superheroes to grow, learn, and shine every single day!</p>
        <div class="flex gap-4 mt-4">
          <a href="#" style="color:#00D9E8;font-size:1.3rem;transition:all 0.3s" class="hover:scale-125"><i class="fab fa-facebook"></i></a>
          <a href="#" style="color:#E8131A;font-size:1.3rem;transition:all 0.3s" class="hover:scale-125"><i class="fab fa-instagram"></i></a>
          <a href="#" style="color:#FFD700;font-size:1.3rem;transition:all 0.3s" class="hover:scale-125"><i class="fab fa-youtube"></i></a>
          <a href="#" style="color:#00D9E8;font-size:1.3rem;transition:all 0.3s" class="hover:scale-125"><i class="fab fa-twitter"></i></a>
        </div>
      </div>

      <!-- Quick Links -->
      <div>
        <h4 style="font-family:'Bangers',cursive;font-size:1.3rem;color:#00D9E8;letter-spacing:2px;margin-bottom:1rem">Quick Links</h4>
        <div class="flex flex-col gap-2">
          ${[
            {label:'Home',     href:'/'},
            {label:'About Us', href:'/about'},
            {label:'Programs', href:'/programs'},
            {label:'Gallery',  href:'/gallery'},
            {label:'Contact',  href:'/contact'},
          ].map(l =>
            `<a href="${l.href}" style="color:#999;text-decoration:none;font-size:0.9rem;transition:color 0.3s"
              onmouseover="this.style.color='#00D9E8'" onmouseout="this.style.color='#999'">
              <i class="fas fa-chevron-right mr-2" style="font-size:0.7rem;color:#E8131A"></i>${l.label}
            </a>`
          ).join('')}
        </div>
      </div>

      <!-- Programs -->
      <div>
        <h4 style="font-family:'Bangers',cursive;font-size:1.3rem;color:#E8131A;letter-spacing:2px;margin-bottom:1rem">Our Programs</h4>
        <div class="flex flex-col gap-2">
          ${['Toddler Titans (1-2)', 'Mini Heroes (2-3)', 'Super Stars (3-4)', 'Power Rangers (4-5)', 'After School Club'].map(p =>
            `<span style="color:#999;font-size:0.9rem"><i class="fas fa-star mr-2" style="color:#FFD700;font-size:0.7rem"></i>${p}</span>`
          ).join('')}
        </div>
      </div>

      <!-- Contact -->
      <div>
        <h4 style="font-family:'Bangers',cursive;font-size:1.3rem;color:#FFD700;letter-spacing:2px;margin-bottom:1rem">Contact Us</h4>
        <div class="flex flex-col gap-3">
          <div class="flex items-start gap-3">
            <i class="fas fa-map-marker-alt mt-1" style="color:#E8131A;width:16px"></i>
            <span style="color:#999;font-size:0.9rem">Super Kids Preschool, Matoshri Apartment,<br>Plot no 51, Sector no 10, Bhosari Pradhikaran,<br>Pin: 411026</span>
          </div>
          <div class="flex items-center gap-3">
            <i class="fas fa-phone" style="color:#00D9E8;width:16px"></i>
            <span style="color:#999;font-size:0.9rem">(+91) 9822-977-644<br>(+91) 9822-977-944</span>
          </div>
          <div class="flex items-center gap-3">
            <i class="fas fa-envelope" style="color:#FFD700;width:16px"></i>
            <span style="color:#999;font-size:0.9rem">superkidsenrollment@gmail.com<br>superkidsprincipal@gmail.com</span>
          </div>
          <div class="flex items-center gap-3">
            <i class="fas fa-clock" style="color:#00D9E8;width:16px"></i>
            <span style="color:#999;font-size:0.9rem">Mon–Fri: 7:00 AM – 6:00 PM</span>
          </div>
        </div>
      </div>
    </div>

    <div class="divider" style="margin:2rem 0"></div>

    <div class="flex flex-col md:flex-row justify-between items-center gap-4">
      <p style="color:#666;font-size:0.85rem">© 2025 SuperKids Preschool. All rights reserved. Made with ❤️ for little superheroes.</p>
      <div class="flex gap-4">
        <a href="#" style="color:#666;font-size:0.85rem;text-decoration:none">Privacy Policy</a>
        <a href="#" style="color:#666;font-size:0.85rem;text-decoration:none">Terms of Use</a>
        <a href="#" style="color:#666;font-size:0.85rem;text-decoration:none">Sitemap</a>
      </div>
    </div>
  </div>
</footer>
`

// ================================================================
// HOME PAGE
// ================================================================
app.get('/', (c) => {
  const content = `
  ${Navbar('home')}

  <!-- MARQUEE -->
  <div class="marquee-wrap">
    <div class="marquee-track">
      ${Array(2).fill(['⚡ Enrollment Open for 2025!', '🦸 Be A SuperKid!', '🎓 Award-Winning Curriculum', '❤️ Safe & Nurturing Environment', '🌟 Small Class Sizes', '🎨 Creative Learning Every Day']).flat().map(t =>
        `<span style="font-family:'Bangers',cursive;font-size:1.1rem;letter-spacing:2px;color:#fff;padding:0 3rem">${t}</span>`
      ).join('')}
    </div>
  </div>

  <!-- HERO SECTION -->
  <section class="hero" style="min-height:95vh;background:radial-gradient(ellipse at top, #2e1060 0%, #180e32 70%)">
    <!-- Floating stars -->
    ${Array.from({length:20}).map(() => {
      const size = Math.random()*3+1
      const top = Math.random()*100
      const left = Math.random()*100
      const delay = Math.random()*3
      return `<div class="star" style="width:${size}px;height:${size}px;top:${top}%;left:${left}%;animation-delay:${delay}s"></div>`
    }).join('')}

    <!-- Floating bursts -->
    <div class="burst" style="top:15%;left:5%;animation-delay:0s">POW!</div>
    <div class="burst" style="top:20%;right:8%;animation-delay:1s;color:#E8131A;text-shadow:0 0 5px rgba(232,19,26,0.4)">ZAP!</div>
    <div class="burst" style="bottom:25%;left:8%;animation-delay:2s;color:#00D9E8;text-shadow:0 0 5px rgba(0,217,232,0.4)">WOW!</div>
    <div class="burst" style="bottom:30%;right:6%;animation-delay:0.5s">BOOM!</div>
    <div class="burst" style="top:60%;left:3%;animation-delay:1.5s;color:#E8131A;text-shadow:0 0 5px rgba(232,19,26,0.4);font-size:0.9rem">SUPER!</div>
    <div class="burst" style="top:50%;right:4%;animation-delay:2.5s;font-size:0.9rem">HERO!</div>

    <div class="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <!-- Text -->
      <div style="z-index:10">
        <div class="badge mb-4" style="background:rgba(232,19,26,0.2);color:#E8131A;border:1px solid rgba(232,19,26,0.4)">
          ⭐ #1 Rated Preschool in Bhosari
        </div>

        <h1 style="font-family:'Bangers',cursive;font-size:clamp(3rem,7vw,5.5rem);line-height:1;margin-bottom:1rem">
          <span class="neon-cyan" style="color:#00D9E8">Unleash</span><br/>
          <span style="color:#fff">Your Child's</span><br/>
          <span class="neon-red" style="color:#E8131A">Inner</span>
          <span class="neon-yellow" style="color:#FFD700"> Hero!</span>
        </h1>

        <p style="color:#ccc;font-size:1.15rem;line-height:1.8;margin-bottom:2rem;max-width:500px">
          At <strong style="color:#00D9E8">SuperKids Preschool</strong>, we believe every child is a superhero waiting to soar. 
          Our award-winning programs nurture curiosity, creativity, and confidence in children aged 1–5.
        </p>

        <div class="flex flex-wrap gap-4 mb-8">
          <a href="/contact" class="btn-primary">
            <i class="fas fa-rocket mr-2"></i>Enroll Today!
          </a>
          <a href="/programs" class="btn-secondary">
            <i class="fas fa-play-circle mr-2"></i>Our Programs
          </a>
        </div>

        <!-- Mini stats -->
        <div class="flex flex-wrap gap-6">
          ${[
            {n:'500+', label:'Happy Kids', color:'#00D9E8'},
            {n:'15+', label:'Years of Excellence', color:'#E8131A'},
            {n:'30+', label:'Super Teachers', color:'#FFD700'},
          ].map(s => `
            <div class="text-center">
              <div style="font-family:'Bangers',cursive;font-size:2rem;color:${s.color};text-shadow:0 0 5px ${s.color}44">${s.n}</div>
              <div style="color:#999;font-size:0.8rem">${s.label}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Hero Graphic — Real Logo -->
      <div class="flex justify-center items-center" style="z-index:10">
        <div style="position:relative;display:inline-block">
          <!-- Soft circular ambient glow — no hard edges -->
          <div style="
            position:absolute;
            top:50%;left:50%;
            transform:translate(-50%,-50%);
            width:110%;height:110%;
            border-radius:50%;
            background:radial-gradient(ellipse at center, rgba(0,217,232,0.12) 0%, rgba(0,217,232,0.04) 45%, transparent 70%);
            pointer-events:none;
            z-index:0;
          "></div>

          <!-- Real logo image (clean transparent bg) -->
          <img src="/static/logo.png" alt="SuperKids Preschool"
            class="shield-hero"
            style="
              width:clamp(300px,44vw,540px);
              height:auto;
              object-fit:contain;
              position:relative;z-index:1;
              filter:
                drop-shadow(0px 8px 24px rgba(0,0,0,0.7))
                drop-shadow(0 0 18px rgba(0,217,232,0.30));
            "
          />

          <!-- Floating sparkles around logo -->
          <div style="position:absolute;top:-14px;right:10px;font-size:1.8rem;animation:float 2s ease-in-out infinite;z-index:2">⭐</div>
          <div style="position:absolute;bottom:20px;left:-24px;font-size:1.4rem;animation:float 2.7s ease-in-out infinite 0.6s;z-index:2">✨</div>
          <div style="position:absolute;top:38%;right:-28px;font-size:2rem;animation:float 3.2s ease-in-out infinite 1.2s;z-index:2">💫</div>
          <div style="position:absolute;bottom:-10px;right:30px;font-size:1.2rem;animation:float 2.4s ease-in-out infinite 0.3s;z-index:2">🌟</div>
        </div>
      </div>
    </div>

    <!-- Scroll indicator -->
    <div style="position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);animation:float 2s ease-in-out infinite;color:#00D9E8;text-align:center">
      <div style="font-size:0.8rem;letter-spacing:2px;margin-bottom:4px;text-transform:uppercase">Scroll</div>
      <i class="fas fa-chevron-down"></i>
    </div>
  </section>

  <!-- WHY SUPERKIDS -->
  <section style="padding:6rem 0;background:linear-gradient(180deg,#180e32,#1e1040)">
    <div class="max-w-7xl mx-auto px-4">
      <div class="text-center mb-12 fade-in">
        <div class="badge mb-4" style="background:rgba(0,217,232,0.1);color:#00D9E8;border:1px solid rgba(0,217,232,0.3)">Why Choose Us</div>
        <h2 class="section-title neon-cyan" style="color:#00D9E8">Why SuperKids?</h2>
        <p style="color:#999;margin-top:1rem;max-width:600px;margin-left:auto;margin-right:auto">We don't just teach — we inspire little superheroes to become the best versions of themselves.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${[
          {icon:'🏆', title:'Award-Winning Curriculum', desc:'Our STEAM-based curriculum is designed by child development experts to make every lesson an adventure.', color:'card'},
          {icon:'🦸', title:'Superhero Teachers', desc:'Our certified educators are passionate, nurturing superheroes who inspire children to reach their full potential.', color:'card-red'},
          {icon:'🛡️', title:'Safe Super HQ', desc:'State-of-the-art safety systems, secure entry, and constant supervision — your child\'s safety is our mission.', color:'card-yellow'},
          {icon:'🎨', title:'Creative Learning', desc:'Art, music, drama, and play-based learning ignite imagination and develop essential cognitive skills.', color:'card-red'},
          {icon:'🌍', title:'Diverse Community', desc:'We celebrate every child\'s unique superpower and teach values of inclusion, empathy, and kindness.', color:'card-yellow'},
          {icon:'📱', title:'Parent Portal', desc:'Stay connected with real-time updates, photos, and progress reports through our SuperKids parent app.', color:'card'},
        ].map(f => `
          <div class="card ${f.color} fade-in text-center">
            <div style="font-size:3rem;margin-bottom:1rem">${f.icon}</div>
            <h3 style="font-family:'Bangers',cursive;font-size:1.4rem;color:#fff;letter-spacing:1px;margin-bottom:0.75rem">${f.title}</h3>
            <p style="color:#aaa;line-height:1.7;font-size:0.95rem">${f.desc}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- STATS BAR -->
  <section style="padding:4rem 0;background:linear-gradient(135deg,#E8131A,#CC1111)">
    <div class="max-w-7xl mx-auto px-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        ${[
          {n:500, suffix:'+', label:'Happy Children', icon:'👦'},
          {n:15, suffix:'+', label:'Years of Excellence', icon:'🏅'},
          {n:30, suffix:'+', label:'Super Educators', icon:'🦸'},
          {n:98, suffix:'%', label:'Parent Satisfaction', icon:'❤️'},
        ].map(s => `
          <div class="fade-in">
            <div style="font-size:2.5rem;margin-bottom:0.5rem">${s.icon}</div>
            <div class="stat-number counter" data-target="${s.n}" data-suffix="${s.suffix}" style="color:#FFD700">0${s.suffix}</div>
            <div style="color:rgba(255,255,255,0.8);font-size:0.9rem;font-weight:600">${s.label}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- PROGRAMS PREVIEW -->
  <section style="padding:6rem 0;background:linear-gradient(180deg,#1e1040,#180e32)">
    <div class="max-w-7xl mx-auto px-4">
      <div class="text-center mb-12 fade-in">
        <div class="badge mb-4" style="background:rgba(232,19,26,0.1);color:#E8131A;border:1px solid rgba(232,19,26,0.3)">Programs</div>
        <h2 class="section-title neon-red" style="color:#E8131A">Our Super Programs</h2>
        <p style="color:#999;margin-top:1rem;max-width:600px;margin-left:auto;margin-right:auto">Age-tailored programs designed to develop every aspect of your child's superpowers.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${[
          {emoji:'🍼', age:'1–2 Years', title:'Toddler Titans', color:'#00D9E8', desc:'Sensory play, motor skills & first friendships in a loving environment.'},
          {emoji:'🦁', age:'2–3 Years', title:'Mini Heroes', color:'#E8131A', desc:'Language explosion, creativity, and social skills through guided play.'},
          {emoji:'⭐', age:'3–4 Years', title:'Super Stars', color:'#FFD700', desc:'Pre-literacy, numeracy, science exploration and team activities.'},
          {emoji:'🚀', age:'4–5 Years', title:'Power Rangers', color:'#00D9E8', desc:'School-readiness program with advanced learning and leadership skills.'},
        ].map(p => `
          <div class="card fade-in text-center" style="border-color:rgba(0,217,232,0.15)">
            <div style="font-size:3rem;margin-bottom:1rem">${p.emoji}</div>
            <div class="badge mb-2" style="background:${p.color}22;color:${p.color};border:1px solid ${p.color}44">${p.age}</div>
            <h3 style="font-family:'Bangers',cursive;font-size:1.5rem;color:${p.color};letter-spacing:1px;margin:0.75rem 0">${p.title}</h3>
            <p style="color:#aaa;font-size:0.9rem;line-height:1.7">${p.desc}</p>
            <a href="/programs" style="display:block;margin-top:1.5rem;color:${p.color};font-weight:700;font-size:0.9rem;text-decoration:none">
              Learn More <i class="fas fa-arrow-right ml-1"></i>
            </a>
          </div>
        `).join('')}
      </div>

      <div class="text-center mt-10 fade-in">
        <a href="/programs" class="btn-secondary">View All Programs <i class="fas fa-arrow-right ml-2"></i></a>
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS -->
  <section style="padding:6rem 0;background:linear-gradient(180deg,#1a0d38,#200e3a)">
    <div class="max-w-7xl mx-auto px-4">
      <div class="text-center mb-12 fade-in">
        <div class="badge mb-4" style="background:rgba(255,215,0,0.1);color:#FFD700;border:1px solid rgba(255,215,0,0.3)">Testimonials</div>
        <h2 class="section-title neon-yellow" style="color:#FFD700">What Super Parents Say</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${[
          {name:'Sarah M.', child:'Mom of Ethan, age 4', text:'SuperKids completely transformed my son! He went from being shy to the most confident kid in his kindergarten class. The teachers are absolute superheroes!', stars:5},
          {name:'David & Lisa K.', child:'Parents of twins, age 3', text:'Both our twins absolutely LOVE going to school every day! The curriculum is incredible — they\'re learning to read at 3! Best decision we ever made.', stars:5},
          {name:'Maria R.', child:'Mom of Sofia, age 2', text:'From day 1, Sofia felt safe and loved. The staff is incredibly professional and caring. I can\'t imagine sending her anywhere else. 10/10!', stars:5},
        ].map(t => `
          <div class="testimonial-card fade-in">
            <div class="flex gap-1 mb-4">
              ${Array(t.stars).fill('⭐').join('')}
            </div>
            <p style="color:#ddd;line-height:1.8;font-size:0.95rem;margin-bottom:1.5rem;font-style:italic">"${t.text}"</p>
            <div class="flex items-center gap-3">
              <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#E8131A,#FFD700);display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:900;color:#fff;flex-shrink:0">
                ${t.name.charAt(0)}
              </div>
              <div>
                <div style="font-weight:800;color:#fff">${t.name}</div>
                <div style="color:#999;font-size:0.85rem">${t.child}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- CTA SECTION -->
  <section style="padding:6rem 0;background:linear-gradient(135deg,#2a1060,#180e32);position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(155,77,202,0.12),rgba(0,217,232,0.05) 50%,transparent 70%)"></div>
    <div class="max-w-3xl mx-auto px-4 text-center" style="position:relative;z-index:1">
      <div style="font-size:4rem;margin-bottom:1rem;animation:float 3s ease-in-out infinite">🦸</div>
      <h2 style="font-family:'Bangers',cursive;font-size:clamp(2.5rem,5vw,4rem);color:#fff;letter-spacing:2px;margin-bottom:1rem">
        Ready to Join the <span style="color:#00D9E8">SuperKids</span> <span style="color:#E8131A">Family?</span>
      </h2>
      <p style="color:#bbb;font-size:1.1rem;line-height:1.8;margin-bottom:2.5rem">
        Limited spots available for 2025! Schedule a tour today and discover why hundreds of families 
        trust SuperKids Preschool to nurture their little heroes.
      </p>
      <div class="flex flex-wrap gap-4 justify-center">
        <a href="/contact" class="btn-primary">
          <i class="fas fa-star mr-2"></i>Schedule a Tour
        </a>
        <a href="/about" class="btn-secondary">
          Learn About Us
        </a>
      </div>
    </div>
  </section>

  ${Footer()}
  `

  return c.html(Layout({ children: content, title: 'SuperKids Preschool - Unleash Your Child\'s Inner Hero!' }))
})

// ================================================================
// ABOUT PAGE
// ================================================================
app.get('/about', (c) => {
  const content = `
  ${Navbar('about')}

  <!-- About Hero -->
  <section style="padding:6rem 0 4rem;background:radial-gradient(ellipse at top,#2e1060,#180e32);position:relative;overflow:hidden">
    <div style="position:absolute;top:20%;left:5%;font-family:'Bangers',cursive;font-size:1.2rem;color:#FFD700;text-shadow:0 0 5px rgba(255,215,0,0.4);animation:float 3s ease-in-out infinite">POW!</div>
    <div style="position:absolute;top:30%;right:8%;font-family:'Bangers',cursive;font-size:1rem;color:#E8131A;text-shadow:0 0 5px rgba(232,19,26,0.4);animation:float 2.5s ease-in-out infinite 1s">ZAP!</div>
    <div class="max-w-4xl mx-auto px-4 text-center">
      <div class="badge mb-4" style="background:rgba(0,217,232,0.1);color:#00D9E8;border:1px solid rgba(0,217,232,0.3)">Our Story</div>
      <h1 class="section-title neon-cyan" style="color:#00D9E8;font-size:clamp(2.5rem,6vw,4.5rem)">About SuperKids</h1>
      <p style="color:#bbb;font-size:1.1rem;line-height:1.8;margin-top:1.5rem">
        Born from a passion to empower every child, SuperKids Preschool has been the leading superhero learning hub for over 15 years.
      </p>
    </div>
  </section>

  <!-- Mission & Vision -->
  <section style="padding:5rem 0;background:linear-gradient(180deg,#180e32,#1e1040)">
    <div class="max-w-7xl mx-auto px-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div class="fade-in">
          <div class="badge mb-4" style="background:rgba(232,19,26,0.1);color:#E8131A;border:1px solid rgba(232,19,26,0.3)">Our Mission</div>
          <h2 style="font-family:'Bangers',cursive;font-size:2.5rem;color:#E8131A;letter-spacing:2px;margin-bottom:1.5rem">Our Heroic Mission</h2>
          <p style="color:#ccc;line-height:1.9;font-size:1rem;margin-bottom:1.5rem">
            At SuperKids Preschool, our mission is simple: <strong style="color:#00D9E8">to unlock the superhero within every child.</strong> 
            We believe that when children feel safe, loved, and inspired, there are no limits to what they can achieve.
          </p>
          <p style="color:#ccc;line-height:1.9;font-size:1rem;margin-bottom:2rem">
            Founded in 2009 by Dr. Amanda Powers, a child development specialist and mother of three, 
            SuperKids was built on the principle that early childhood is the most critical phase of human development — 
            and it should be filled with joy, wonder, and discovery.
          </p>
          <div class="grid grid-cols-2 gap-4">
            ${[
              {icon:'🎯', title:'Child-Centered', desc:'Every decision starts with what\'s best for your child.'},
              {icon:'💡', title:'Innovation', desc:'Continuously evolving our teaching methods.'},
              {icon:'🤝', title:'Partnership', desc:'Parents as partners in every child\'s journey.'},
              {icon:'🌱', title:'Holistic Growth', desc:'Mind, body, and spirit development.'},
            ].map(v => `
              <div class="card" style="padding:1rem">
                <div style="font-size:1.5rem;margin-bottom:0.5rem">${v.icon}</div>
                <div style="font-weight:800;color:#fff;font-size:0.9rem;margin-bottom:0.25rem">${v.title}</div>
                <div style="color:#999;font-size:0.8rem">${v.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Values visual -->
        <div class="fade-in flex justify-center">
          <div style="position:relative;width:350px;height:350px">
            <!-- Central circle — real logo -->
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:130px;height:130px;border-radius:50%;background:rgba(15,15,26,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 30px rgba(0,217,232,0.5);z-index:10;border:3px solid #00D9E8;overflow:hidden">
              <img src="/static/logo.png" alt="SuperKids"
                style="width:118px;height:auto;object-fit:contain;
                       filter:drop-shadow(2px 3px 6px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(0,217,232,0.7))"/>
            </div>
            <!-- Orbiting elements -->
            ${[
              {emoji:'🎨', label:'Creative', angle:0},
              {emoji:'📚', label:'Learning', angle:60},
              {emoji:'⚡', label:'Energy', angle:120},
              {emoji:'❤️', label:'Caring', angle:180},
              {emoji:'🌍', label:'Diverse', angle:240},
              {emoji:'🏅', label:'Excellence', angle:300},
            ].map(o => {
              const rad = (o.angle - 90) * Math.PI / 180
              const x = 175 + 130 * Math.cos(rad) - 30
              const y = 175 + 130 * Math.sin(rad) - 30
              return `
                <div style="position:absolute;left:${x}px;top:${y}px;width:60px;height:60px;border-radius:50%;background:rgba(0,217,232,0.1);border:2px solid rgba(0,217,232,0.4);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.2rem;box-shadow:0 0 15px rgba(0,217,232,0.2)">
                  ${o.emoji}
                  <span style="font-size:0.5rem;color:#00D9E8;margin-top:2px;font-weight:700">${o.label}</span>
                </div>
              `
            }).join('')}
            <!-- Orbit ring -->
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:260px;height:260px;border-radius:50%;border:1px dashed rgba(0,217,232,0.2)"></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="divider" style="max-width:1200px;margin:0 auto"></div>

  <!-- TIMELINE -->
  <section style="padding:4rem 0;background:linear-gradient(180deg,#1e1040,#180e32)">
    <div class="max-w-4xl mx-auto px-4">
      <div class="text-center mb-10 fade-in">
        <h2 class="section-title neon-yellow" style="color:#FFD700">Our Hero's Journey</h2>
      </div>
      <div class="flex flex-col gap-0">
        ${[
          {year:'2009', event:'SuperKids Preschool founded by Dr. Amanda Powers with a vision to revolutionize early childhood education.', color:'#00D9E8'},
          {year:'2011', event:'Expanded to two classrooms after overwhelming demand. Introduced our signature STEAM superhero curriculum.', color:'#E8131A'},
          {year:'2014', event:'Received "Best Preschool in Bhosari" award for 3 consecutive years. Opened our outdoor "Hero Training Grounds."', color:'#FFD700'},
          {year:'2017', event:'Launched SuperKids Parent App — giving parents real-time insights into their child\'s learning journey.', color:'#00D9E8'},
          {year:'2020', event:'Adapted seamlessly during challenging times, offering hybrid learning while maintaining safety and quality.', color:'#E8131A'},
          {year:'2023', event:'Opened our new 5,000 sq ft SuperHQ facility with state-of-the-art classrooms, sensory rooms, and a rooftop garden.', color:'#FFD700'},
          {year:'2025', event:'Celebrating 500+ alumni who are now thriving in schools across the region — our legacy of little superheroes!', color:'#00D9E8'},
        ].map((t, i) => `
          <div class="flex gap-6 fade-in" style="position:relative;padding-bottom:2rem">
            <div class="flex flex-col items-center">
              <div class="timeline-dot" style="background:${t.color};box-shadow:0 0 10px ${t.color};margin-top:6px"></div>
              ${i < 6 ? `<div style="width:2px;flex:1;background:linear-gradient(180deg,${t.color},transparent);margin-top:4px"></div>` : ''}
            </div>
            <div class="card" style="flex:1;padding:1.25rem;margin-bottom:0;border-color:${t.color}33">
              <div style="font-family:'Bangers',cursive;font-size:1.3rem;color:${t.color};margin-bottom:0.5rem">${t.year}</div>
              <p style="color:#ccc;font-size:0.95rem;line-height:1.7">${t.event}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- TEAM -->
  <section style="padding:5rem 0;background:linear-gradient(180deg,#180e32,#220e42)">
    <div class="max-w-7xl mx-auto px-4">
      <div class="text-center mb-12 fade-in">
        <div class="badge mb-4" style="background:rgba(0,217,232,0.1);color:#00D9E8;border:1px solid rgba(0,217,232,0.3)">Meet The Team</div>
        <h2 class="section-title neon-cyan" style="color:#00D9E8">Our Super Educators</h2>
        <p style="color:#999;margin-top:1rem">A dream team of certified, passionate educators dedicated to your child's success.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${[
          {emoji:'👩‍🏫', name:'Dr. Amanda Powers', role:'Founder & Director', exp:'15+ yrs', color:'#00D9E8', cert:'PhD Child Development'},
          {emoji:'🦸‍♀️', name:'Ms. Rachel Storm', role:'Lead Educator (Toddlers)', exp:'8 yrs', color:'#E8131A', cert:'ECE Certified'},
          {emoji:'🧑‍🎨', name:'Mr. Carlos Bright', role:'Creative Arts Director', exp:'10 yrs', color:'#FFD700', cert:'Arts Education MA'},
          {emoji:'👩‍💻', name:'Ms. Priya Nova', role:'STEAM Coordinator', exp:'6 yrs', color:'#00D9E8', cert:'STEM Specialist'},
        ].map(t => `
          <div class="card fade-in text-center">
            <div class="teacher-avatar" style="border-color:${t.color};box-shadow:0 0 20px ${t.color}66">
              ${t.emoji}
            </div>
            <h3 style="font-weight:800;color:#fff;margin-bottom:0.25rem">${t.name}</h3>
            <p style="color:${t.color};font-size:0.85rem;font-weight:700;margin-bottom:0.5rem">${t.role}</p>
            <div class="badge mb-2" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}44;font-size:0.7rem">${t.cert}</div>
            <p style="color:#999;font-size:0.8rem">${t.exp} experience</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  ${Footer()}
  `

  return c.html(Layout({ children: content, title: 'About - SuperKids Preschool' }))
})

// ================================================================
// PROGRAMS PAGE
// ================================================================
app.get('/programs', (c) => {
  const content = `
  ${Navbar('programs')}

  <!-- Programs Hero -->
  <section style="padding:6rem 0 4rem;background:radial-gradient(ellipse at top,#3a0840,#180e32);position:relative;overflow:hidden">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <div class="badge mb-4" style="background:rgba(232,19,26,0.1);color:#E8131A;border:1px solid rgba(232,19,26,0.3)">Learning Programs</div>
      <h1 class="section-title neon-red" style="color:#E8131A;font-size:clamp(2.5rem,6vw,4.5rem)">Our Programs</h1>
      <p style="color:#bbb;font-size:1.1rem;line-height:1.8;margin-top:1.5rem;max-width:600px;margin-left:auto;margin-right:auto">
        Carefully crafted programs that meet your child exactly where they are — and take them beyond where they dreamed they could be.
      </p>
    </div>
  </section>

  <!-- Age filter tabs -->
  <section style="padding:2rem 0;background:#1e0f3a;border-bottom:1px solid rgba(0,217,232,0.15)">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex flex-wrap justify-center gap-3">
        ${[
          {id:'all', label:'All Programs', emoji:'🌟'},
          {id:'toddler', label:'Toddler (1-2)', emoji:'🍼'},
          {id:'mini', label:'Mini Heroes (2-3)', emoji:'🦁'},
          {id:'stars', label:'Super Stars (3-4)', emoji:'⭐'},
          {id:'power', label:'Power Rangers (4-5)', emoji:'🚀'},
          {id:'after', label:'After School', emoji:'🎮'},
        ].map((t, i) => `
          <button class="age-tab ${i === 0 ? 'active' : ''}" data-target="${t.id}" 
            style="padding:10px 20px;border-radius:50px;border:2px solid rgba(0,217,232,0.3);background:${i===0?'#00D9E8':'transparent'};color:${i===0?'#0f0f1a':'#ccc'};font-weight:700;font-size:0.9rem;cursor:pointer;transition:all 0.3s">
            ${t.emoji} ${t.label}
          </button>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- Programs Grid -->
  <section style="padding:5rem 0;background:linear-gradient(180deg,#180e32,#1e1040)">
    <div class="max-w-7xl mx-auto px-4">
      <!-- All programs visible by default -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        ${[
          {id:'toddler', emoji:'🍼', age:'1–2 Years', title:'Toddler Titans', color:'#00D9E8', time:'Half Day | Full Day',
           features:['Sensory play stations', 'Music & movement', 'Language development', 'Social bonding', 'Motor skills development', 'Naptime & care routines'],
           desc:'A warm, nurturing environment where our youngest heroes take their first steps toward discovery. Our Toddler Titans program focuses on sensory exploration, attachment security, and joyful play-based learning.'},
          {id:'mini', emoji:'🦁', age:'2–3 Years', title:'Mini Heroes', color:'#E8131A', time:'Half Day | Full Day',
           features:['Potty training support', 'Early reading readiness', 'Imaginative play', 'Art exploration', 'Outdoor adventures', 'Circle time & stories'],
           desc:'Mini Heroes is where personalities explode! This program harnesses the natural curiosity of 2-3 year olds through structured play, creative expression, and early literacy foundations.'},
          {id:'stars', emoji:'⭐', age:'3–4 Years', title:'Super Stars', color:'#FFD700', time:'Half Day | Full Day',
           features:['Pre-reading & writing', 'Basic math concepts', 'Science experiments', 'Team projects', 'Drama & performance', 'Problem-solving games'],
           desc:'Our Super Stars program is where academic foundations are laid with excitement and enthusiasm. Children engage in STEAM projects, collaborative learning, and begin their journey toward school readiness.'},
          {id:'power', emoji:'🚀', age:'4–5 Years', title:'Power Rangers', color:'#00D9E8', time:'Full Day Program',
           features:['Advanced literacy', 'Math & logic', 'Science projects', 'Leadership skills', 'Digital literacy', 'Kindergarten prep'],
           desc:'The most advanced program, Power Rangers prepares children for their next great adventure: kindergarten! With a rich academic curriculum and leadership development, these children graduate ready to conquer the world.'},
          {id:'after', emoji:'🎮', age:'5+ Years', title:'After School Heroes', color:'#E8131A', time:'2:30 PM – 6:00 PM',
           features:['Homework help', 'STEM workshops', 'Sports & fitness', 'Arts & crafts', 'Cooking classes', 'Club activities'],
           desc:'Our After School program provides a safe, fun, and stimulating environment for school-age children to unwind, learn new skills, and build friendships after their school day.'},
          {id:'after', emoji:'☀️', age:'All Ages', title:'Summer Super Camp', color:'#FFD700', time:'June – August',
           features:['Themed weekly adventures', 'Swimming lessons', 'Field trips', 'Science fairs', 'Art workshops', 'Superhero Olympics'],
           desc:'When school\'s out, the adventure begins! Our Summer Super Camp is packed with themed weeks, outdoor adventures, educational field trips, and unforgettable superhero experiences.'},
        ].map(p => `
          <div class="card fade-in" style="border-color:${p.color}33;position:relative;overflow:visible">
            <div style="position:absolute;top:-15px;right:20px;background:${p.color};color:#0f0f1a;font-family:'Bangers',cursive;font-size:0.9rem;letter-spacing:1px;padding:4px 16px;border-radius:20px;font-weight:900">${p.age}</div>
            <div style="font-size:3rem;margin-bottom:1rem">${p.emoji}</div>
            <h3 style="font-family:'Bangers',cursive;font-size:1.8rem;color:${p.color};letter-spacing:2px;margin-bottom:0.5rem">${p.title}</h3>
            <div class="flex items-center gap-2 mb-3">
              <i class="fas fa-clock" style="color:${p.color};font-size:0.8rem"></i>
              <span style="color:#999;font-size:0.85rem">${p.time}</span>
            </div>
            <p style="color:#bbb;font-size:0.9rem;line-height:1.7;margin-bottom:1.5rem">${p.desc}</p>
            <div class="grid grid-cols-2 gap-2 mb-4">
              ${p.features.map(f => `
                <div class="flex items-center gap-2" style="font-size:0.85rem;color:#ccc">
                  <i class="fas fa-check-circle" style="color:${p.color};font-size:0.8rem;flex-shrink:0"></i>
                  ${f}
                </div>
              `).join('')}
            </div>
            <a href="/contact" class="btn-primary" style="display:block;text-align:center;font-size:1rem;padding:12px">
              Enroll in This Program
            </a>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- Daily Schedule -->
  <section style="padding:5rem 0;background:linear-gradient(180deg,#1e1040,#180e32)">
    <div class="max-w-4xl mx-auto px-4">
      <div class="text-center mb-10 fade-in">
        <h2 class="section-title neon-yellow" style="color:#FFD700">A Super Day at SuperKids</h2>
        <p style="color:#999;margin-top:1rem">Every day is a new adventure! Here's a typical day in our SuperKids universe.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${[
          {time:'7:00 AM', activity:'Super Arrival & Free Play', emoji:'🌅', color:'#00D9E8'},
          {time:'8:00 AM', activity:'Morning Circle & Calendar', emoji:'📅', color:'#E8131A'},
          {time:'8:30 AM', activity:'Superhero Breakfast', emoji:'🥞', color:'#FFD700'},
          {time:'9:00 AM', activity:'Learning Centers & STEAM', emoji:'🔬', color:'#00D9E8'},
          {time:'10:30 AM', activity:'Outdoor Hero Training', emoji:'🌳', color:'#E8131A'},
          {time:'11:30 AM', activity:'Creative Arts & Music', emoji:'🎨', color:'#FFD700'},
          {time:'12:00 PM', activity:'Super Lunch Time', emoji:'🥗', color:'#00D9E8'},
          {time:'12:30 PM', activity:'Rest & Quiet Time', emoji:'😴', color:'#E8131A'},
          {time:'2:00 PM', activity:'Story Time & Reading', emoji:'📚', color:'#FFD700'},
          {time:'3:00 PM', activity:'Afternoon Snack', emoji:'🍎', color:'#00D9E8'},
          {time:'3:30 PM', activity:'Science & Discovery', emoji:'🧪', color:'#E8131A'},
          {time:'5:00 PM', activity:'Wind Down & Pickup', emoji:'🌟', color:'#FFD700'},
        ].map(s => `
          <div class="flex items-center gap-4 card fade-in" style="padding:1rem;border-color:${s.color}22">
            <div style="font-size:1.5rem">${s.emoji}</div>
            <div>
              <div style="font-family:'Bangers',cursive;color:${s.color};font-size:1rem;letter-spacing:1px">${s.time}</div>
              <div style="color:#ccc;font-size:0.9rem">${s.activity}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- Contact CTA (replaces Pricing) -->
  <section style="padding:4rem 0;background:linear-gradient(180deg,#180e32,#220e42)">
    <div class="max-w-3xl mx-auto px-4 text-center fade-in">
      <div class="card" style="border-color:rgba(0,217,232,0.3);padding:3rem">
        <div style="font-size:3rem;margin-bottom:1rem">📞</div>
        <h2 style="font-family:'Bangers',cursive;font-size:2.2rem;color:#00D9E8;letter-spacing:2px;margin-bottom:1rem">Enquire About Fees</h2>
        <p style="color:#999;font-size:1rem;line-height:1.8;margin-bottom:2rem">For fee details and admissions, please get in touch with us directly. We'd love to have your little superhero join our family!</p>
        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <a href="tel:+919822977644" class="btn-primary" style="display:inline-flex;align-items:center;justify-content:center;gap:8px">
            <i class="fas fa-phone"></i> (+91) 9822-977-644
          </a>
          <a href="tel:+919822977944" class="btn-primary" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#E8131A,#cc0000)">
            <i class="fas fa-phone"></i> (+91) 9822-977-944
          </a>
          <a href="/contact" class="btn-secondary" style="display:inline-flex;align-items:center;justify-content:center;gap:8px">
            <i class="fas fa-envelope"></i> Contact Us
          </a>
        </div>
      </div>
    </div>
  </section>

  ${Footer()}
  `

  return c.html(Layout({ children: content, title: 'Programs - SuperKids Preschool' }))
})

// ================================================================
// GALLERY PAGE
// ================================================================
app.get('/gallery', (c) => {
  const content = `
  ${Navbar('gallery')}

  <!-- Gallery Hero -->
  <section style="padding:6rem 0 4rem;background:radial-gradient(ellipse at top,#2a1060,#180e32)">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <div class="badge mb-4" style="background:rgba(255,215,0,0.1);color:#FFD700;border:1px solid rgba(255,215,0,0.3)">Gallery</div>
      <h1 class="section-title neon-yellow" style="color:#FFD700;font-size:clamp(2.5rem,6vw,4.5rem)">Super Moments</h1>
      <p style="color:#bbb;font-size:1.1rem;line-height:1.8;margin-top:1.5rem">
        A glimpse into the magical, learning-filled world of SuperKids Preschool.
      </p>
    </div>
  </section>

  <!-- Gallery Grid -->
  <section style="padding:3rem 0 6rem;background:linear-gradient(180deg,#180e32,#1e1040)">
    <div class="max-w-7xl mx-auto px-4">

      <!-- Category filters -->
      <div class="flex flex-wrap justify-center gap-3 mb-10 fade-in">
        ${['All', 'Learning', 'Art & Craft', 'Outdoor Play', 'Events', 'STEAM', 'Music'].map((cat, i) => `
          <button style="padding:8px 20px;border-radius:50px;border:2px solid ${i===0?'#FFD700':'rgba(255,215,0,0.3)'};background:${i===0?'#FFD700':'transparent'};color:${i===0?'#0f0f1a':'#ccc'};font-weight:700;font-size:0.85rem;cursor:pointer;transition:all 0.3s"
            onmouseover="if(this.style.background!='rgb(255, 215, 0)'){this.style.background='rgba(255,215,0,0.1)';this.style.color='#FFD700'}"
            onmouseout="if(this.style.background!='rgb(255, 215, 0)'){this.style.background='transparent';this.style.color='#ccc'}">
            ${cat}
          </button>
        `).join('')}
      </div>

      <!-- Masonry-style gallery -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        ${[
          {emoji:'🎨', label:'Art Time', caption:'Creative Expression', bg:'linear-gradient(135deg,#1a2a4a,#2a1a4a)'},
          {emoji:'🔬', label:'Science Lab', caption:'STEAM Discovery', bg:'linear-gradient(135deg,#1a3a2a,#1a2a4a)', tall:true},
          {emoji:'🌳', label:'Outdoor Play', caption:'Hero Training Grounds', bg:'linear-gradient(135deg,#2a3a1a,#1a2a1a)'},
          {emoji:'📚', label:'Story Time', caption:'Reading Adventures', bg:'linear-gradient(135deg,#3a2a1a,#2a1a1a)'},
          {emoji:'🎵', label:'Music Class', caption:'Rhythm & Beats', bg:'linear-gradient(135deg,#1a1a3a,#2a1a3a)', wide:true},
          {emoji:'🏃', label:'Sports Day', caption:'Superhero Olympics', bg:'linear-gradient(135deg,#3a1a1a,#2a1a2a)'},
          {emoji:'🍳', label:'Cooking Class', caption:'Little Chefs', bg:'linear-gradient(135deg,#2a2a1a,#3a2a1a)', tall:true},
          {emoji:'🧩', label:'Block Building', caption:'Engineering Minds', bg:'linear-gradient(135deg,#1a2a3a,#2a3a1a)'},
          {emoji:'🎭', label:'Drama Class', caption:'Star Performers', bg:'linear-gradient(135deg,#3a1a2a,#2a1a3a)'},
          {emoji:'🌸', label:'Garden Time', caption:'Little Gardeners', bg:'linear-gradient(135deg,#1a3a1a,#2a3a2a)', wide:true},
          {emoji:'🎪', label:'Superhero Day', caption:'Annual Hero Parade', bg:'linear-gradient(135deg,#3a2a2a,#2a3a2a)'},
          {emoji:'🤸', label:'Gymnastics', caption:'Flexible Superheroes', bg:'linear-gradient(135deg,#2a1a2a,#3a1a3a)'},
          {emoji:'🌈', label:'Rainbow Art', caption:'Colorful Creations', bg:'linear-gradient(135deg,#1a2a4a,#3a1a2a)'},
          {emoji:'🚀', label:'Space Theme', caption:'Cosmic Explorers', bg:'linear-gradient(135deg,#0a0a2a,#1a1a3a)', tall:true},
          {emoji:'🎂', label:'Birthday Fun', caption:'Super Celebrations', bg:'linear-gradient(135deg,#3a2a1a,#2a1a3a)'},
          {emoji:'🤝', label:'Team Work', caption:'Heroes Together', bg:'linear-gradient(135deg,#1a3a2a,#2a2a3a)'},
        ].map((item, i) => `
          <div class="gallery-item fade-in ${item.tall ? 'row-span-2' : ''}" 
            style="background:${item.bg};${item.tall ? 'aspect-ratio:1/2;' : ''}min-height:${item.tall?'300px':'150px'};flex-direction:column;gap:0.5rem;${item.wide ? 'grid-column:span 2;aspect-ratio:2/1;' : ''}">
            <div style="font-size:${item.tall?'4rem':'3rem'}">${item.emoji}</div>
            <div style="font-weight:800;color:#fff;font-size:0.9rem">${item.label}</div>
            <div style="color:#aaa;font-size:0.75rem">${item.caption}</div>
            <div style="position:absolute;inset:0;background:rgba(0,217,232,0.1);opacity:0;transition:opacity 0.3s;display:flex;align-items:center;justify-content:center;border-radius:12px"
              onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
              <i class="fas fa-expand-alt" style="color:#00D9E8;font-size:1.5rem"></i>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Video section -->
      <div class="mt-16 fade-in">
        <div class="text-center mb-8">
          <h2 style="font-family:'Bangers',cursive;font-size:2.5rem;color:#E8131A;letter-spacing:2px">
            <i class="fas fa-play-circle mr-3"></i>See SuperKids In Action
          </h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${[
            {emoji:'🎬', title:'A Day at SuperKids', duration:'2:45', views:'1.2K views'},
            {emoji:'🏆', title:'Superhero Graduation 2024', duration:'5:30', views:'3.8K views'},
            {emoji:'🔬', title:'STEAM Fair Highlights', duration:'3:15', views:'956 views'},
          ].map(v => `
            <div class="card" style="cursor:pointer;border-color:rgba(232,19,26,0.2)" 
              onmouseover="this.style.borderColor='#E8131A'" onmouseout="this.style.borderColor='rgba(232,19,26,0.2)'">
              <div style="background:linear-gradient(135deg,#2a1a1a,#1a1a2a);border-radius:10px;padding:3rem 2rem;text-align:center;margin-bottom:1rem;position:relative">
                <div style="font-size:3rem">${v.emoji}</div>
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
                  <div style="width:56px;height:56px;background:rgba(232,19,26,0.8);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(232,19,26,0.5)">
                    <i class="fas fa-play" style="color:#fff;font-size:1.2rem;margin-left:3px"></i>
                  </div>
                </div>
              </div>
              <h4 style="font-weight:800;color:#fff;margin-bottom:0.5rem">${v.title}</h4>
              <div class="flex justify-between" style="color:#999;font-size:0.85rem">
                <span><i class="fas fa-clock mr-1"></i>${v.duration}</span>
                <span><i class="fas fa-eye mr-1"></i>${v.views}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </section>

  <!-- Social CTA -->
  <section style="padding:4rem 0;background:linear-gradient(135deg,#2a1060,#180e32)">
    <div class="max-w-3xl mx-auto px-4 text-center">
      <h2 style="font-family:'Bangers',cursive;font-size:2.5rem;color:#FFD700;letter-spacing:2px;margin-bottom:1rem">
        Follow Our Super Journey!
      </h2>
      <p style="color:#bbb;margin-bottom:2rem">Join our community and see daily updates, super moments, and more!</p>
      <div class="flex flex-wrap justify-center gap-4">
        ${[
          {icon:'fab fa-instagram', label:'@SuperKidsPreschool', color:'#E8131A'},
          {icon:'fab fa-facebook', label:'SuperKids Preschool', color:'#00D9E8'},
          {icon:'fab fa-youtube', label:'SuperKids TV', color:'#FFD700'},
        ].map(s => `
          <a href="#" style="display:flex;align-items:center;gap:10px;padding:12px 24px;border-radius:50px;border:2px solid ${s.color}44;background:${s.color}11;color:${s.color};text-decoration:none;font-weight:700;transition:all 0.3s"
            onmouseover="this.style.background='${s.color}22';this.style.boxShadow='0 0 20px ${s.color}44'"
            onmouseout="this.style.background='${s.color}11';this.style.boxShadow='none'">
            <i class="${s.icon} text-xl"></i> ${s.label}
          </a>
        `).join('')}
      </div>
    </div>
  </section>

  ${Footer()}
  `

  return c.html(Layout({ children: content, title: 'Gallery - SuperKids Preschool' }))
})

// ================================================================
// CONTACT PAGE
// ================================================================
app.get('/contact', (c) => {
  const content = `
  ${Navbar('contact')}

  <!-- Contact Hero -->
  <section style="padding:6rem 0 4rem;background:radial-gradient(ellipse at top,#2e1060,#180e32)">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <div class="badge mb-4" style="background:rgba(255,215,0,0.1);color:#FFD700;border:1px solid rgba(255,215,0,0.3)">Contact & Enrollment</div>
      <h1 class="section-title neon-yellow" style="color:#FFD700;font-size:clamp(2.5rem,6vw,4.5rem)">Join The Team!</h1>
      <p style="color:#bbb;font-size:1.1rem;line-height:1.8;margin-top:1.5rem;max-width:600px;margin-left:auto;margin-right:auto">
        Ready to enroll your little superhero? Schedule a tour, ask questions, or start your application today!
      </p>
    </div>
  </section>

  <!-- Contact Content -->
  <section style="padding:4rem 0 6rem;background:linear-gradient(180deg,#180e32,#1e1040)">
    <div class="max-w-7xl mx-auto px-4">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">

        <!-- Contact Info -->
        <div class="lg:col-span-1 fade-in">
          <h2 style="font-family:'Bangers',cursive;font-size:2rem;color:#00D9E8;letter-spacing:2px;margin-bottom:2rem">SuperHQ Location</h2>

          ${[
            {icon:'fa-map-marker-alt', color:'#E8131A', title:'Our Super HQ', content:'Super Kids Preschool, Matoshri Apartment,<br>Plot no 51, Sector no 10, Bhosari Pradhikaran<br>Pin: 411026'},
            {icon:'fa-phone-alt', color:'#00D9E8', title:'Call the Hotline', content:'<a href="tel:+919822977644" style="color:#00D9E8;text-decoration:none">(+91) 9822-977-644</a><br><a href="tel:+919822977944" style="color:#00D9E8;text-decoration:none">(+91) 9822-977-944</a>'},
            {icon:'fa-envelope', color:'#FFD700', title:'Super Mail', content:'superkidsenrollment@gmail.com<br>superkidsprincipal@gmail.com'},
            {icon:'fa-clock', color:'#00D9E8', title:'Super Hours', content:'Monday – Friday<br>7:00 AM – 6:00 PM'},
          ].map(info => `
            <div class="flex gap-4 mb-6">
              <div style="width:48px;height:48px;background:${info.color}22;border:2px solid ${info.color}44;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="fas ${info.icon}" style="color:${info.color}"></i>
              </div>
              <div>
                <div style="font-weight:800;color:#fff;margin-bottom:0.25rem">${info.title}</div>
                <div style="color:#999;font-size:0.9rem;line-height:1.6">${info.content}</div>
              </div>
            </div>
          `).join('')}

          <!-- Google Map -->
          <div style="border-radius:16px;overflow:hidden;margin-top:2rem;border:2px solid rgba(0,217,232,0.3)">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d477.8!2d73.832081!3d18.651444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTjCsDM5JzA1LjIiTiA3M8KwNDknNTUuNSJF!5e0!3m2!1sen!2sin!4v1708000000000"
              width="100%" height="260" style="border:0;display:block" allowfullscreen="" loading="lazy"
              referrerpolicy="no-referrer-when-downgrade">
            </iframe>
            <div style="background:#0d1628;padding:10px 14px;display:flex;align-items:center;gap:8px">
              <i class="fas fa-map-marker-alt" style="color:#E8131A"></i>
              <a href="https://www.google.com/maps/place/18%C2%B039'05.2%22N+73%C2%B049'55.5%22E/@18.651213,73.8294641,17z/data=!4m4!3m3!8m2!3d18.651444!4d73.832081?entry=ttu&g_ep=EgoyMDI2MDIxOC4wIKXMDSoASAFQAw%3D%3D" target="_blank" style="color:#00D9E8;font-size:0.85rem;text-decoration:none;font-weight:700">Open in Google Maps ↗</a>
            </div>
          </div>

          <!-- Emergency contact -->
          <div class="card card-red mt-6" style="padding:1.5rem">
            <div class="flex items-center gap-3 mb-2">
              <i class="fas fa-shield-alt" style="color:#E8131A;font-size:1.2rem"></i>
              <span style="font-family:'Bangers',cursive;color:#E8131A;letter-spacing:1px">Emergency Line</span>
            </div>
            <p style="color:#999;font-size:0.85rem">For urgent matters during school hours, call our emergency hotline:<br>
              <a href="tel:+919822977644" style="color:#fff;font-weight:700;text-decoration:none">(+91) 9822-977-644</a> &nbsp;|&nbsp;
              <a href="tel:+919822977944" style="color:#fff;font-weight:700;text-decoration:none">(+91) 9822-977-944</a>
            </p>
          </div>
        </div>

        <!-- Enrollment Form -->
        <div class="lg:col-span-2 fade-in">
          <div class="card" style="border-color:rgba(255,215,0,0.2);padding:2.5rem;position:relative;z-index:1">
            <h2 style="font-family:'Bangers',cursive;font-size:2rem;color:#FFD700;letter-spacing:2px;margin-bottom:0.5rem">
              <i class="fas fa-star mr-3"></i>Enrollment Application
            </h2>
            <p style="color:#999;margin-bottom:2rem;font-size:0.95rem">Fill out this form and our team will contact you within 24 hours to schedule a tour!</p>



            <form id="enroll-form" onsubmit="handleSubmit(event)" style="display:flex;flex-direction:column;gap:1.5rem;position:relative;z-index:2">

              <!-- Web3Forms hidden fields -->
              <input type="hidden" name="access_key" id="w3f-access-key" value="bd2e27b6-9cfe-4db2-8d56-9c002529d6bd" />
              <input type="hidden" name="subject" value="🦸 New SuperKids Enrollment Application!" />
              <input type="hidden" name="from_name" value="SuperKids Preschool Website" />
              <input type="hidden" name="redirect" value="false" />
              <input type="hidden" name="botcheck" value="" style="display:none" />

              <!-- Parent section -->
              <div>
                <h3 style="font-family:'Bangers',cursive;color:#00D9E8;letter-spacing:1px;margin-bottom:1rem;font-size:1.2rem">
                  <i class="fas fa-user-tie mr-2"></i>Parent / Guardian Info
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label style="display:block;color:#ccc;font-size:0.85rem;font-weight:700;margin-bottom:6px">First Name *</label>
                    <input type="text" name="parent_first_name" required placeholder="Your first name" class="form-input" />
                  </div>
                  <div>
                    <label style="display:block;color:#ccc;font-size:0.85rem;font-weight:700;margin-bottom:6px">Last Name *</label>
                    <input type="text" name="parent_last_name" required placeholder="Your last name" class="form-input" />
                  </div>
                  <div>
                    <label style="display:block;color:#ccc;font-size:0.85rem;font-weight:700;margin-bottom:6px">Email Address *</label>
                    <input type="email" name="parent_email" id="parent-email" required placeholder="your@email.com" class="form-input" />
                  </div>
                  <div>
                    <label style="display:block;color:#ccc;font-size:0.85rem;font-weight:700;margin-bottom:6px">Phone Number *</label>
                    <input type="tel" name="parent_phone" required placeholder="(+91) 98XXXXXXXX" class="form-input" />
                  </div>
                </div>
              </div>

              <!-- Child section -->
              <div>
                <h3 style="font-family:'Bangers',cursive;color:#E8131A;letter-spacing:1px;margin-bottom:1rem;font-size:1.2rem">
                  <i class="fas fa-child mr-2"></i>Child Information
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label style="display:block;color:#ccc;font-size:0.85rem;font-weight:700;margin-bottom:6px">Child's Name *</label>
                    <input type="text" name="child_name" required placeholder="Your child's name" class="form-input" />
                  </div>
                  <div>
                    <label style="display:block;color:#ccc;font-size:0.85rem;font-weight:700;margin-bottom:6px">Date of Birth *</label>
                    <input type="date" name="child_dob" required class="form-input" />
                  </div>
                  <div>
                    <label style="display:block;color:#ccc;font-size:0.85rem;font-weight:700;margin-bottom:6px">Program of Interest *</label>
                    <select name="program" required class="form-input" style="cursor:pointer">
                      <option value="" disabled selected>Select a program</option>
                      <option>Toddler Titans (1-2 years)</option>
                      <option>Mini Heroes (2-3 years)</option>
                      <option>Super Stars (3-4 years)</option>
                      <option>Power Rangers (4-5 years)</option>
                      <option>After School Heroes</option>
                      <option>Summer Super Camp</option>
                    </select>
                  </div>
                  <div>
                    <label style="display:block;color:#ccc;font-size:0.85rem;font-weight:700;margin-bottom:6px">Preferred Start Date</label>
                    <input type="date" name="start_date" class="form-input" />
                  </div>
                </div>
              </div>

              <!-- Schedule preference -->
              <div>
                <label style="display:block;color:#ccc;font-size:0.85rem;font-weight:700;margin-bottom:10px">Schedule Preference</label>
                <div class="flex flex-wrap gap-3">
                  ${['Full-Time (5 days)', 'Part-Time (3 days)', 'Half Day', 'Full Day', 'Flexible'].map(opt => `
                    <label style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:50px;border:1px solid rgba(0,217,232,0.3);color:#ccc;font-size:0.85rem;font-weight:600;transition:all 0.3s;position:relative;z-index:2"
                      onmouseover="this.style.borderColor='#00D9E8';this.style.color='#00D9E8'"
                      onmouseout="this.style.borderColor='rgba(0,217,232,0.3)';this.style.color='#ccc'">
                      <input type="checkbox" name="schedule" value="${opt}" style="accent-color:#00D9E8;cursor:pointer"> ${opt}
                    </label>
                  `).join('')}
                </div>
              </div>

              <!-- Message -->
              <div>
                <label style="display:block;color:#ccc;font-size:0.85rem;font-weight:700;margin-bottom:6px">Message / Questions</label>
                <textarea name="message" rows="4" placeholder="Tell us about your child, any special needs, questions, or how you heard about us..." class="form-input" style="resize:vertical"></textarea>
              </div>

              <!-- How did you hear -->
              <div>
                <label style="display:block;color:#ccc;font-size:0.85rem;font-weight:700;margin-bottom:6px">How Did You Hear About Us?</label>
                <select name="referral_source" class="form-input" style="cursor:pointer">
                  <option value="" disabled selected>Select one...</option>
                  <option>Google Search</option>
                  <option>Social Media (Instagram/Facebook)</option>
                  <option>Word of Mouth / Friend Referral</option>
                  <option>Local Advertisement</option>
                  <option>School Event / Fair</option>
                  <option>Other</option>
                </select>
              </div>

              <!-- Submit button -->
              <button type="submit" id="submit-btn" class="btn-primary" style="font-size:1.1rem;padding:16px;position:relative;z-index:2">
                <i class="fas fa-rocket mr-2"></i>Submit Application!
              </button>

              <!-- Error message -->
              <div id="error-msg" style="display:none;background:rgba(232,19,26,0.1);border:1px solid rgba(232,19,26,0.4);border-radius:10px;padding:1rem;color:#ff6b6b;font-size:0.9rem;text-align:center">
                <i class="fas fa-exclamation-triangle mr-2"></i>Something went wrong. Please check your connection and try again, or email us at <strong>superkidsenrollment@gmail.com</strong>
              </div>
            </form>

            <!-- Success message (hidden) -->
            <div id="success-msg" style="display:none;text-align:center;padding:3rem">
              <div style="font-size:4rem;margin-bottom:1rem">🦸</div>
              <h3 style="font-family:'Bangers',cursive;font-size:2rem;color:#00D9E8;letter-spacing:2px">Application Received!</h3>
              <p style="color:#ccc;line-height:1.8;margin-top:1rem">
                Amazing! Your child is one step closer to becoming a SuperKid! Our enrollment team will 
                contact you within <strong style="color:#FFD700">24 hours</strong> to schedule your tour.
              </p>
              <div class="badge mt-4" style="background:rgba(0,217,232,0.1);color:#00D9E8;border:1px solid rgba(0,217,232,0.3);display:inline-block;padding:8px 20px">
                <i class="fas fa-check mr-2"></i>We'll be in touch at <strong>superkidsenrollment@gmail.com</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ Section -->
  <section style="padding:5rem 0;background:linear-gradient(180deg,#1e1040,#180e32)">
    <div class="max-w-4xl mx-auto px-4">
      <div class="text-center mb-10 fade-in">
        <h2 class="section-title neon-cyan" style="color:#00D9E8">Super FAQs</h2>
      </div>
      <div class="flex flex-col gap-4">
        ${[
          {q:'What ages do you accept?', a:'We welcome children from 1 to 5 years old. Our After School Heroes program extends to age 10.'},
          {q:'What is the student-to-teacher ratio?', a:'We maintain a 6:1 ratio for toddlers (1-2), 8:1 for ages 2-3, and 10:1 for our older classes, ensuring personalized attention for every child.'},
          {q:'Are meals and snacks provided?', a:'Yes! We provide nutritious, allergen-aware breakfast, lunch, and two snacks daily in our full-day programs. Our menu is reviewed by a nutritionist.'},
          {q:'What safety measures are in place?', a:'We have keycard-only secure entry, 24/7 CCTV monitoring, trained staff, regular safety drills, and a real-time parent notification system.'},
          {q:'Do you offer financial assistance?', a:'Yes! We offer sibling discounts (15% off), income-based financial assistance, and we accept most childcare subsidy programs. Contact us to learn more.'},
          {q:'Can I schedule a tour before enrolling?', a:'Absolutely! We highly encourage tours. Fill out our enrollment form and check "Schedule Tour" or call us directly to book a time.'},
        ].map((faq, i) => `
          <div class="card fade-in" style="cursor:pointer" onclick="this.querySelector('.faq-ans').style.display=this.querySelector('.faq-ans').style.display==='none'?'block':'none';this.querySelector('.faq-icon').textContent=this.querySelector('.faq-ans').style.display==='none'?'+':'−'">
            <div class="flex justify-between items-center">
              <h4 style="font-weight:800;color:#fff;font-size:1rem">${faq.q}</h4>
              <span class="faq-icon" style="color:#00D9E8;font-size:1.5rem;font-weight:300;min-width:20px;text-align:center">+</span>
            </div>
            <p class="faq-ans" style="display:none;color:#aaa;margin-top:1rem;line-height:1.7;font-size:0.95rem;border-top:1px solid rgba(255,255,255,0.1);padding-top:1rem">${faq.a}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <script>
    async function handleSubmit(e) {
      e.preventDefault();

      const form = document.getElementById('enroll-form');
      const btn  = document.getElementById('submit-btn');
      const errMsg = document.getElementById('error-msg');

      // Loading state
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
      btn.style.opacity = '0.8';
      errMsg.style.display = 'none';

      // Collect all form data
      const data = new FormData(form);

      // Collect checked schedule checkboxes
      const checked = [...form.querySelectorAll('input[name="schedule"]:checked')].map(c => c.value);
      data.delete('schedule');
      data.append('schedule_preference', checked.length ? checked.join(', ') : 'Not specified');

      // Convert FormData to JSON object for Web3Forms
      const jsonData = {};
      data.forEach((value, key) => {
        if (key !== 'botcheck') jsonData[key] = value;
      });

      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(jsonData)
        });

        const json = await res.json();

        if (res.ok && json.success) {
          form.style.display = 'none';
          document.getElementById('success-msg').style.display = 'block';
        } else {
          throw new Error(json.message || 'Submission failed');
        }
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-rocket mr-2"></i>Submit Application!';
        btn.style.opacity = '1';
        errMsg.style.display = 'block';
        console.error('Form error:', err);
      }
    }
  </script>

  ${Footer()}
  `

  return c.html(Layout({ children: content, title: 'Contact & Enroll - SuperKids Preschool' }))
})

// ================================================================
// PARENT PORTAL — LOGIN PAGE
// ================================================================
app.get('/parent-portal', (c) => {
  const content = `
  ${Navbar('portal')}

  <section style="min-height:100vh;background:radial-gradient(ellipse at top,#1a1200,#0f0f1a);display:flex;align-items:center;justify-content:center;padding:4rem 1rem;position:relative;overflow:hidden">

    <!-- Floating background elements -->
    ${Array.from({length:15}).map(() => {
      const size = Math.random()*3+1
      const top  = Math.random()*100
      const left = Math.random()*100
      const delay= Math.random()*3
      return `<div class="star" style="width:${size}px;height:${size}px;top:${top}%;left:${left}%;animation-delay:${delay}s"></div>`
    }).join('')}
    <div style="position:absolute;top:15%;left:5%;font-family:'Bangers',cursive;font-size:1.1rem;color:#FFD700;opacity:0.4;animation:float 3s ease-in-out infinite">🛡️</div>
    <div style="position:absolute;bottom:20%;right:6%;font-family:'Bangers',cursive;font-size:1rem;color:#00D9E8;opacity:0.4;animation:float 2.7s ease-in-out infinite 1s">⭐</div>
    <div style="position:absolute;top:55%;left:3%;font-size:1.5rem;opacity:0.25;animation:float 4s ease-in-out infinite 0.5s">🔐</div>

    <div style="width:100%;max-width:440px;position:relative;z-index:10">

      <!-- Logo / brand -->
      <div class="text-center mb-8">
        <a href="/" style="text-decoration:none;display:inline-block">
          <img src="/static/logo.png" alt="SuperKids"
            style="height:80px;width:auto;object-fit:contain;
                   filter:drop-shadow(0 0 18px rgba(255,215,0,0.5)) drop-shadow(0 4px 12px rgba(0,0,0,0.6));margin:0 auto;display:block"/>
        </a>
        <div style="margin-top:1rem">
          <span style="font-family:'Bangers',cursive;font-size:1.8rem;letter-spacing:3px;color:#FFD700;text-shadow:0 0 8px rgba(255,215,0,0.4)">PARENT PORTAL</span>
        </div>
        <p style="color:#999;font-size:0.85rem;margin-top:0.4rem">Your child's journey, at your fingertips</p>
      </div>

      <!-- Login card -->
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,215,0,0.25);border-radius:20px;padding:2.5rem;box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 40px rgba(255,215,0,0.05)">

        <h2 style="font-family:'Bangers',cursive;font-size:1.5rem;color:#fff;letter-spacing:2px;margin-bottom:0.25rem;text-align:center">
          <i class="fas fa-lock mr-2" style="color:#FFD700"></i>Secure Login
        </h2>
        <p style="color:#777;font-size:0.8rem;text-align:center;margin-bottom:2rem">Demo: any email + password works</p>

        <form id="portal-login" onsubmit="handlePortalLogin(event)" style="display:flex;flex-direction:column;gap:1.25rem">

          <div>
            <label style="display:block;color:#ccc;font-size:0.82rem;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">
              <i class="fas fa-envelope mr-1" style="color:#FFD700;font-size:0.75rem"></i>Email Address
            </label>
            <input type="email" id="portal-email" required placeholder="parent@example.com"
              class="form-input"
              style="border-color:rgba(255,215,0,0.3)"
              onfocus="this.style.borderColor='#FFD700';this.style.boxShadow='0 0 10px rgba(255,215,0,0.2)'"
              onblur="this.style.borderColor='rgba(255,215,0,0.3)';this.style.boxShadow='none'" />
          </div>

          <div>
            <label style="display:block;color:#ccc;font-size:0.82rem;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">
              <i class="fas fa-key mr-1" style="color:#FFD700;font-size:0.75rem"></i>Password
            </label>
            <div style="position:relative">
              <input type="password" id="portal-password" required placeholder="Enter your password"
                class="form-input"
                style="border-color:rgba(255,215,0,0.3);padding-right:48px"
                onfocus="this.style.borderColor='#FFD700';this.style.boxShadow='0 0 10px rgba(255,215,0,0.2)'"
                onblur="this.style.borderColor='rgba(255,215,0,0.3)';this.style.boxShadow='none'" />
              <button type="button" onclick="togglePw()" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:#777;cursor:pointer;font-size:0.9rem" id="pw-eye">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>

          <div class="flex justify-between items-center" style="font-size:0.82rem">
            <label style="cursor:pointer;display:flex;align-items:center;gap:6px;color:#999">
              <input type="checkbox" style="accent-color:#FFD700"> Remember me
            </label>
            <a href="#" style="color:#FFD700;text-decoration:none" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">Forgot password?</a>
          </div>

          <!-- Login button -->
          <button type="submit" id="login-btn"
            style="width:100%;background:linear-gradient(135deg,#FFD700,#FFA500);color:#0f0f1a;font-family:'Bangers',cursive;font-size:1.2rem;letter-spacing:2px;padding:14px;border-radius:50px;border:none;cursor:pointer;transition:all 0.3s;box-shadow:0 0 20px rgba(255,215,0,0.35);margin-top:0.5rem"
            onmouseover="this.style.transform='scale(1.03)';this.style.boxShadow='0 0 35px rgba(255,215,0,0.6)'"
            onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 0 20px rgba(255,215,0,0.35)'">
            <i class="fas fa-shield-alt mr-2"></i>Login to Portal
          </button>

          <!-- Error -->
          <div id="login-error" style="display:none;background:rgba(232,19,26,0.1);border:1px solid rgba(232,19,26,0.4);border-radius:10px;padding:0.75rem 1rem;color:#ff6b6b;font-size:0.85rem;text-align:center">
            <i class="fas fa-exclamation-circle mr-2"></i>Invalid credentials. Please try again.
          </div>
        </form>

        <div class="divider" style="margin:1.5rem 0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,215,0,0.2),transparent)"></div>

        <!-- Demo credentials hint -->
        <div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:1rem;text-align:center">
          <p style="color:#FFD700;font-size:0.78rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:0.5rem">
            <i class="fas fa-info-circle mr-1"></i>Demo Access
          </p>
          <p style="color:#999;font-size:0.8rem;line-height:1.6">
            Email: <strong style="color:#ccc">parent@superkids.com</strong><br>
            Password: <strong style="color:#ccc">superkids123</strong>
          </p>
        </div>
      </div>

      <!-- Footer note -->
      <p style="text-align:center;color:#555;font-size:0.78rem;margin-top:1.5rem;line-height:1.7">
        New to the portal? Contact us at<br>
        <a href="mailto:superkidsenrollment@gmail.com" style="color:#FFD700;text-decoration:none">superkidsenrollment@gmail.com</a>
        &nbsp;•&nbsp;
        <a href="/" style="color:#00D9E8;text-decoration:none">Back to Website</a>
      </p>
    </div>
  </section>

  <script>
    function togglePw() {
      const inp = document.getElementById('portal-password');
      const eye = document.getElementById('pw-eye').querySelector('i');
      if (inp.type === 'password') {
        inp.type = 'text';
        eye.className = 'fas fa-eye-slash';
      } else {
        inp.type = 'password';
        eye.className = 'fas fa-eye';
      }
    }

    function handlePortalLogin(e) {
      e.preventDefault();
      const btn = document.getElementById('login-btn');
      const err = document.getElementById('login-error');
      err.style.display = 'none';
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Authenticating...';
      btn.style.opacity = '0.8';
      btn.disabled = true;
      // Simulate auth delay then redirect to dashboard
      setTimeout(() => {
        window.location.href = '/parent-portal/dashboard';
      }, 900);
    }
  </script>
  `
  return c.html(Layout({ children: content, title: 'Parent Portal Login - SuperKids Preschool' }))
})

// ================================================================
// PARENT PORTAL — DASHBOARD
// ================================================================
app.get('/parent-portal/dashboard', (c) => {

  const today = new Date()
  const days  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months= ['January','February','March','April','May','June','July','August','September','October','November','December']
  const todayStr = `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`

  const content = `

  <!-- Portal-specific nav (no sticky main nav — has its own header) -->
  <style>
    .portal-sidebar-link {
      display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:10px;
      color:#aaa;font-weight:700;font-size:0.88rem;text-decoration:none;transition:all 0.2s;
    }
    .portal-sidebar-link:hover { background:rgba(255,215,0,0.08);color:#FFD700; }
    .portal-sidebar-link.active { background:rgba(255,215,0,0.12);color:#FFD700;border-left:3px solid #FFD700; }
    .portal-stat-card {
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
      border-radius:16px;padding:1.4rem 1.6rem;transition:all 0.3s;
    }
    .portal-stat-card:hover { transform:translateY(-3px);box-shadow:0 10px 30px rgba(0,0,0,0.3); }
    .feed-card {
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      border-radius:14px;padding:1.25rem;transition:border-color 0.2s;
    }
    .feed-card:hover { border-color:rgba(255,215,0,0.25); }
    .portal-badge {
      display:inline-block;padding:3px 10px;border-radius:50px;font-size:0.7rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;
    }
    .msg-card {
      background:rgba(0,217,232,0.04);border:1px solid rgba(0,217,232,0.15);border-radius:14px;padding:1.25rem;
    }
    .event-row {
      display:flex;align-items:center;gap:14px;padding:1rem;border-radius:12px;
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);transition:all 0.2s;
    }
    .event-row:hover { border-color:rgba(255,215,0,0.3);background:rgba(255,215,0,0.04); }
    .photo-thumb {
      border-radius:10px;aspect-ratio:1;background:linear-gradient(135deg,#1a2a4a,#2a1a4a);
      display:flex;align-items:center;justify-content:center;font-size:2rem;border:1px solid rgba(255,255,255,0.08);
      cursor:pointer;transition:all 0.2s;overflow:hidden;
    }
    .photo-thumb:hover { border-color:#FFD700;transform:scale(1.04);box-shadow:0 0 15px rgba(255,215,0,0.2); }
    .attend-dot {
      width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:0.7rem;font-weight:800;flex-shrink:0;
    }
    @media (max-width:768px){
      #portal-sidebar { display:none; }
      #portal-sidebar.mobile-open { display:block;position:fixed;inset:0;z-index:200;overflow-y:auto; }
    }
  </style>

  <!-- TOP HEADER BAR -->
  <header style="background:linear-gradient(180deg,#08101e,#0d1828);border-bottom:2px solid rgba(255,215,0,0.3);position:sticky;top:0;z-index:100;box-shadow:0 2px 30px rgba(255,215,0,0.1)">
    <div style="max-width:1400px;margin:0 auto;padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;height:64px">
      <!-- Left: logo + title -->
      <div style="display:flex;align-items:center;gap:14px">
        <button id="sidebar-toggle" style="display:none;background:none;border:none;color:#FFD700;font-size:1.3rem;cursor:pointer" class="md:hidden">
          <i class="fas fa-bars"></i>
        </button>
        <a href="/" style="text-decoration:none;display:flex;align-items:center;gap:10px">
          <img src="/static/logo.png" alt="SuperKids" style="height:42px;width:auto;filter:drop-shadow(0 0 10px rgba(255,215,0,0.4))"/>
        </a>
        <div style="height:28px;width:1px;background:rgba(255,215,0,0.2)"></div>
        <div>
          <div style="font-family:'Bangers',cursive;font-size:1.1rem;color:#FFD700;letter-spacing:2px;line-height:1">PARENT PORTAL</div>
          <div style="font-size:0.7rem;color:#666;line-height:1;margin-top:2px">${todayStr}</div>
        </div>
      </div>

      <!-- Right: notifications + profile -->
      <div style="display:flex;align-items:center;gap:12px">
        <!-- Notification bell -->
        <button style="position:relative;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:#FFD700;cursor:pointer;transition:all 0.2s"
          onmouseover="this.style.background='rgba(255,215,0,0.16)'" onmouseout="this.style.background='rgba(255,215,0,0.08)'">
          <i class="fas fa-bell"></i>
          <span style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;background:#E8131A;border-radius:50%;font-size:0.6rem;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800">3</span>
        </button>

        <!-- Profile chip -->
        <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:50px;padding:6px 14px 6px 8px;cursor:pointer"
          onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#FFA500);display:flex;align-items:center;justify-content:center;font-weight:900;color:#0f0f1a;font-size:0.9rem;flex-shrink:0">P</div>
          <div>
            <div style="font-weight:700;color:#fff;font-size:0.82rem;line-height:1">Priya Pawar</div>
            <div style="color:#777;font-size:0.7rem;line-height:1">Parent of Arya</div>
          </div>
        </div>

        <!-- Logout -->
        <a href="/parent-portal"
          style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;background:rgba(232,19,26,0.1);border:1px solid rgba(232,19,26,0.3);color:#E8131A;text-decoration:none;font-size:0.8rem;font-weight:700;transition:all 0.2s"
          onmouseover="this.style.background='rgba(232,19,26,0.18)'" onmouseout="this.style.background='rgba(232,19,26,0.1)'">
          <i class="fas fa-sign-out-alt"></i>
          <span class="hidden sm:inline">Logout</span>
        </a>
      </div>
    </div>
  </header>

  <!-- MAIN LAYOUT: sidebar + content -->
  <div style="display:flex;min-height:calc(100vh - 64px);background:#0b0e18">

    <!-- SIDEBAR -->
    <aside id="portal-sidebar" style="width:220px;flex-shrink:0;background:#0d1120;border-right:1px solid rgba(255,255,255,0.06);padding:1.5rem 0.75rem;display:flex;flex-direction:column;gap:0.25rem">
      <div style="padding:0 8px;margin-bottom:1rem">
        <p style="color:#444;font-size:0.7rem;text-transform:uppercase;letter-spacing:2px;font-weight:800">Main Menu</p>
      </div>
      ${[
        {icon:'fa-tachometer-alt',  label:'Dashboard',     href:'#dashboard', active:true},
        {icon:'fa-child',           label:"My Child",      href:'#child'},
        {icon:'fa-calendar-day',    label:'Daily Updates', href:'#updates'},
        {icon:'fa-images',          label:'Photo Gallery', href:'#gallery'},
        {icon:'fa-calendar-check',  label:'Attendance',    href:'#attendance'},
        {icon:'fa-calendar-alt',    label:'Events',        href:'#events'},
        {icon:'fa-comment-dots',    label:'Messages',      href:'#messages'},
      ].map(l => `
        <a href="${l.href}" class="portal-sidebar-link ${l.active?'active':''}">
          <i class="fas ${l.icon}" style="width:16px;text-align:center;font-size:0.85rem"></i> ${l.label}
        </a>
      `).join('')}

      <div style="padding:0 8px;margin:1.25rem 0 0.75rem">
        <p style="color:#444;font-size:0.7rem;text-transform:uppercase;letter-spacing:2px;font-weight:800">Resources</p>
      </div>
      ${[
        {icon:'fa-file-alt',     label:'Progress Reports', href:'#reports'},
        {icon:'fa-utensils',     label:'Menu & Meals',     href:'#meals'},
        {icon:'fa-bell',         label:'Announcements',    href:'#messages'},
      ].map(l => `
        <a href="${l.href}" class="portal-sidebar-link">
          <i class="fas ${l.icon}" style="width:16px;text-align:center;font-size:0.85rem"></i> ${l.label}
        </a>
      `).join('')}

      <div style="flex:1"></div>
      <div style="padding:0.75rem;background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.15);border-radius:12px;margin-top:1rem">
        <p style="color:#FFD700;font-size:0.72rem;font-weight:700;margin-bottom:0.4rem"><i class="fas fa-headset mr-1"></i>Need Help?</p>
        <p style="color:#666;font-size:0.7rem;line-height:1.5">Call us at<br><a href="tel:+919822977644" style="color:#ccc;text-decoration:none">(+91) 9822-977-644</a></p>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main style="flex:1;padding:2rem;overflow-x:hidden" id="dashboard">

      <!-- Welcome banner -->
      <div style="background:linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,165,0,0.04));border:1px solid rgba(255,215,0,0.2);border-radius:18px;padding:1.75rem 2rem;margin-bottom:2rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
        <div>
          <h1 style="font-family:'Bangers',cursive;font-size:2rem;color:#FFD700;letter-spacing:2px;line-height:1;margin-bottom:0.4rem">
            Welcome back, Priya! 👋
          </h1>
          <p style="color:#aaa;font-size:0.92rem">Here's what's happening with <strong style="color:#fff">Arya</strong> today.</p>
        </div>
        <div style="text-align:right">
          <div style="font-size:0.78rem;color:#666;margin-bottom:4px">Class</div>
          <div style="font-family:'Bangers',cursive;color:#00D9E8;font-size:1.1rem;letter-spacing:1px">Super Stars (3–4 yrs)</div>
          <div style="font-size:0.78rem;color:#666;margin-top:2px">Teacher: Ms. Rachel Storm</div>
        </div>
      </div>

      <!-- STATS ROW -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:2rem">
        ${[
          {icon:'fa-check-circle', color:'#00D9E8', label:'Attendance This Month', value:'18/21', sub:'86% present', bg:'rgba(0,217,232,0.06)',border:'rgba(0,217,232,0.2)'},
          {icon:'fa-star',         color:'#FFD700', label:'Achievement Badges', value:'7',     sub:'2 new this week', bg:'rgba(255,215,0,0.06)',border:'rgba(255,215,0,0.2)'},
          {icon:'fa-images',       color:'#E8131A', label:'New Photos',          value:'12',    sub:'Added this week',  bg:'rgba(232,19,26,0.06)',border:'rgba(232,19,26,0.2)'},
          {icon:'fa-comment-dots', color:'#00D9E8', label:'Unread Messages',     value:'3',     sub:'From Ms. Rachel',  bg:'rgba(0,217,232,0.06)',border:'rgba(0,217,232,0.2)'},
        ].map(s => `
          <div class="portal-stat-card" style="background:${s.bg};border-color:${s.border}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
              <div style="width:38px;height:38px;background:${s.color}22;border-radius:10px;display:flex;align-items:center;justify-content:center">
                <i class="fas ${s.icon}" style="color:${s.color};font-size:1rem"></i>
              </div>
            </div>
            <div style="font-family:'Bangers',cursive;font-size:2rem;color:#fff;letter-spacing:1px;line-height:1">${s.value}</div>
            <div style="color:#aaa;font-size:0.78rem;margin-top:4px">${s.label}</div>
            <div style="color:${s.color};font-size:0.72rem;font-weight:700;margin-top:3px">${s.sub}</div>
          </div>
        `).join('')}
      </div>

      <!-- TWO-COLUMN GRID -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem" class="lg-two-col">

        <!-- CHILD PROFILE CARD -->
        <div id="child" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,215,0,0.15);border-radius:18px;padding:1.75rem">
          <h3 style="font-family:'Bangers',cursive;font-size:1.3rem;color:#FFD700;letter-spacing:2px;margin-bottom:1.25rem">
            <i class="fas fa-child mr-2"></i>My Child
          </h3>
          <div style="display:flex;align-items:center;gap:1.25rem;margin-bottom:1.25rem">
            <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#1a3a5a,#0f1f3f);border:3px solid #FFD700;box-shadow:0 0 18px rgba(255,215,0,0.3);display:flex;align-items:center;justify-content:center;font-size:2.2rem;flex-shrink:0">
              🦸‍♀️
            </div>
            <div>
              <div style="font-weight:900;color:#fff;font-size:1.1rem">Arya Pawar</div>
              <div style="color:#FFD700;font-size:0.82rem;font-weight:700;margin:2px 0">Super Stars Program</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <span class="portal-badge" style="background:rgba(0,217,232,0.1);color:#00D9E8;border:1px solid rgba(0,217,232,0.3)">Age 3.5</span>
                <span class="portal-badge" style="background:rgba(255,215,0,0.1);color:#FFD700;border:1px solid rgba(255,215,0,0.3)">Section A</span>
              </div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            ${[
              {label:'Date of Birth', value:'Nov 15, 2021'},
              {label:'Admission No.',  value:'SK-2024-147'},
              {label:'Teacher',        value:'Ms. Rachel Storm'},
              {label:'Roll No.',       value:'12'},
              {label:'Blood Group',    value:'O+'},
              {label:'Emergency No.', value:'(+91) 9822-977-644'},
            ].map(d => `
              <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:0.6rem 0.75rem">
                <div style="color:#555;font-size:0.65rem;text-transform:uppercase;letter-spacing:1px;font-weight:800">${d.label}</div>
                <div style="color:#ccc;font-size:0.82rem;font-weight:600;margin-top:2px">${d.value}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- TODAY'S SCHEDULE -->
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(0,217,232,0.15);border-radius:18px;padding:1.75rem">
          <h3 style="font-family:'Bangers',cursive;font-size:1.3rem;color:#00D9E8;letter-spacing:2px;margin-bottom:1.25rem">
            <i class="fas fa-calendar-day mr-2"></i>Today's Schedule
          </h3>
          <div style="display:flex;flex-direction:column;gap:0.6rem">
            ${[
              {time:'7:00 AM',  act:'Arrival & Free Play',        emoji:'🌅', done:true,  color:'#00D9E8'},
              {time:'8:00 AM',  act:'Morning Circle',             emoji:'📅', done:true,  color:'#FFD700'},
              {time:'8:30 AM',  act:'Superhero Breakfast',        emoji:'🥞', done:true,  color:'#E8131A'},
              {time:'9:00 AM',  act:'STEAM Learning Centers',     emoji:'🔬', done:true,  color:'#00D9E8'},
              {time:'10:30 AM', act:'Outdoor Hero Training',      emoji:'🌳', done:false, color:'#FFD700'},
              {time:'11:30 AM', act:'Creative Arts',              emoji:'🎨', done:false, color:'#E8131A'},
              {time:'12:00 PM', act:'Super Lunch',                emoji:'🥗', done:false, color:'#00D9E8'},
              {time:'2:00 PM',  act:'Story Time & Reading',       emoji:'📚', done:false, color:'#FFD700'},
              {time:'5:00 PM',  act:'Wind Down & Pickup',         emoji:'🌟', done:false, color:'#E8131A'},
            ].map(s => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:${s.done?'rgba(0,217,232,0.05)':'rgba(255,255,255,0.02)'};border:1px solid ${s.done?'rgba(0,217,232,0.15)':'rgba(255,255,255,0.05)'}">
                <span style="font-size:1.1rem">${s.emoji}</span>
                <div style="flex:1">
                  <div style="font-size:0.78rem;color:${s.color};font-weight:700">${s.time}</div>
                  <div style="font-size:0.82rem;color:${s.done?'#888':'#ccc'};${s.done?'text-decoration:line-through;':''}">${s.act}</div>
                </div>
                ${s.done ? `<i class="fas fa-check-circle" style="color:#00D9E8;font-size:0.85rem"></i>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- DAILY UPDATES FEED -->
      <div id="updates" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,215,0,0.1);border-radius:18px;padding:1.75rem;margin-bottom:2rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
          <h3 style="font-family:'Bangers',cursive;font-size:1.3rem;color:#FFD700;letter-spacing:2px">
            <i class="fas fa-rss mr-2"></i>Daily Updates
          </h3>
          <span class="portal-badge" style="background:rgba(255,215,0,0.1);color:#FFD700;border:1px solid rgba(255,215,0,0.3)">Today</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.75rem">
          ${[
            {time:'9:42 AM', teacher:'Ms. Rachel', type:'Learning', color:'#00D9E8', bg:'rgba(0,217,232,0.06)', icon:'fa-book', text:'Arya completed her letter tracing worksheet today! She formed all 5 letters perfectly and was so proud of herself. She is showing great progress in pre-writing skills!', emoji:'✏️'},
            {time:'8:35 AM', teacher:'Ms. Rachel', type:'Meal',     color:'#FFD700', bg:'rgba(255,215,0,0.06)', icon:'fa-utensils', text:'Arya ate a good breakfast today — finished her upma and a full glass of milk. She sat nicely with her friends and even helped pass out napkins!', emoji:'🥣'},
            {time:'7:15 AM', teacher:'Ms. Priya (Aide)', type:'Arrival', color:'#E8131A', bg:'rgba(232,19,26,0.06)', icon:'fa-door-open', text:'Arya arrived happy and energetic today! She walked in confidently and immediately joined the building block station with her friends.', emoji:'🏫'},
          ].map(u => `
            <div class="feed-card" style="border-color:${u.color}22;background:${u.bg}">
              <div style="display:flex;align-items:flex-start;gap:12px">
                <div style="width:40px;height:40px;background:${u.color}18;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${u.emoji}</div>
                <div style="flex:1">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
                    <span class="portal-badge" style="background:${u.color}18;color:${u.color};border:1px solid ${u.color}33">${u.type}</span>
                    <span style="color:#555;font-size:0.75rem"><i class="fas fa-clock mr-1"></i>${u.time}</span>
                    <span style="color:#555;font-size:0.75rem"><i class="fas fa-user-circle mr-1"></i>${u.teacher}</span>
                  </div>
                  <p style="color:#ccc;font-size:0.88rem;line-height:1.6">${u.text}</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="text-align:center;margin-top:1rem">
          <button style="background:none;border:1px solid rgba(255,215,0,0.3);color:#FFD700;border-radius:50px;padding:8px 24px;font-size:0.82rem;font-weight:700;cursor:pointer;transition:all 0.2s"
            onmouseover="this.style.background='rgba(255,215,0,0.08)'" onmouseout="this.style.background='none'">
            View All Updates <i class="fas fa-arrow-right ml-1"></i>
          </button>
        </div>
      </div>

      <!-- PHOTO GALLERY + ATTENDANCE SIDE BY SIDE -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem">

        <!-- RECENT PHOTOS -->
        <div id="gallery" style="background:rgba(255,255,255,0.02);border:1px solid rgba(232,19,26,0.15);border-radius:18px;padding:1.75rem">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
            <h3 style="font-family:'Bangers',cursive;font-size:1.3rem;color:#E8131A;letter-spacing:2px">
              <i class="fas fa-images mr-2"></i>Recent Photos
            </h3>
            <span class="portal-badge" style="background:rgba(232,19,26,0.1);color:#E8131A;border:1px solid rgba(232,19,26,0.3)">12 new</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1rem">
            ${[
              {emoji:'🎨',bg:'linear-gradient(135deg,#1a2a4a,#2a1a4a)',label:'Art Class'},
              {emoji:'🔬',bg:'linear-gradient(135deg,#1a3a2a,#0a2a1a)',label:'Science'},
              {emoji:'🌳',bg:'linear-gradient(135deg,#2a3a1a,#1a2a0a)',label:'Outdoor'},
              {emoji:'📚',bg:'linear-gradient(135deg,#3a2a1a,#2a1a0a)',label:'Story Time'},
              {emoji:'🎵',bg:'linear-gradient(135deg,#1a1a3a,#2a1a3a)',label:'Music'},
              {emoji:'🤸',bg:'linear-gradient(135deg,#2a1a2a,#3a1a3a)',label:'Gymnastics'},
            ].map(p => `
              <div class="photo-thumb" style="background:${p.bg};flex-direction:column;gap:4px;font-size:1.8rem">
                ${p.emoji}
                <span style="font-size:0.6rem;color:#999;font-weight:700">${p.label}</span>
              </div>
            `).join('')}
          </div>
          <button style="width:100%;background:none;border:1px solid rgba(232,19,26,0.3);color:#E8131A;border-radius:10px;padding:9px;font-size:0.82rem;font-weight:700;cursor:pointer;transition:all 0.2s"
            onmouseover="this.style.background='rgba(232,19,26,0.08)'" onmouseout="this.style.background='none'">
            <i class="fas fa-images mr-2"></i>View Full Gallery
          </button>
        </div>

        <!-- ATTENDANCE CALENDAR -->
        <div id="attendance" style="background:rgba(255,255,255,0.02);border:1px solid rgba(0,217,232,0.15);border-radius:18px;padding:1.75rem">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
            <h3 style="font-family:'Bangers',cursive;font-size:1.3rem;color:#00D9E8;letter-spacing:2px">
              <i class="fas fa-calendar-check mr-2"></i>Attendance
            </h3>
            <span style="font-family:'Bangers',cursive;font-size:1.1rem;color:#00D9E8">May 2026</span>
          </div>
          <!-- Mini calendar grid -->
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:0.75rem">
            ${['M','T','W','T','F','S','S'].map(d => `
              <div style="text-align:center;font-size:0.65rem;font-weight:800;color:#555;padding:4px 0">${d}</div>
            `).join('')}
            ${''.padStart(0)}
            <!-- Fill first blank days (May 1 is Thursday) -->
            <div></div><div></div><div></div>
            ${Array.from({length:21}).map((_,i) => {
              const day = i + 1
              const isWeekend = (i + 3) % 7 >= 5
              const isToday   = day === 21
              const status    = isWeekend ? 'weekend' : (day > 21 ? 'future' : (day % 7 === 0 ? 'absent' : 'present'))
              const bg        = isToday ? '#FFD700' : status === 'present' ? 'rgba(0,217,232,0.15)' : status === 'absent' ? 'rgba(232,19,26,0.15)' : status === 'weekend' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)'
              const color     = isToday ? '#0f0f1a' : status === 'present' ? '#00D9E8' : status === 'absent' ? '#E8131A' : '#444'
              return `<div class="attend-dot" style="background:${bg};color:${color};font-size:0.68rem;font-weight:${isToday?'900':'700'};border-radius:8px;width:auto;height:28px;border:${isToday?'2px solid #FFD700':'1px solid transparent'}">${day}</div>`
            }).join('')}
          </div>
          <div style="display:flex;gap:1rem;font-size:0.72rem;flex-wrap:wrap">
            ${[
              {color:'#00D9E8',bg:'rgba(0,217,232,0.15)',label:'Present (18)'},
              {color:'#E8131A',bg:'rgba(232,19,26,0.15)', label:'Absent (3)'},
              {color:'#FFD700',bg:'#FFD700',               label:'Today', textColor:'#0f0f1a'},
            ].map(l => `
              <div style="display:flex;align-items:center;gap:5px">
                <div style="width:12px;height:12px;border-radius:3px;background:${l.bg}"></div>
                <span style="color:${l.textColor||l.color}">${l.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- EVENTS + MESSAGES SIDE BY SIDE -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem">

        <!-- UPCOMING EVENTS -->
        <div id="events" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,215,0,0.12);border-radius:18px;padding:1.75rem">
          <h3 style="font-family:'Bangers',cursive;font-size:1.3rem;color:#FFD700;letter-spacing:2px;margin-bottom:1.25rem">
            <i class="fas fa-calendar-alt mr-2"></i>Upcoming Events
          </h3>
          <div style="display:flex;flex-direction:column;gap:0.75rem">
            ${[
              {date:'May 24',day:'Sat', title:'Superhero Sports Day',     tag:'School Event', color:'#E8131A', emoji:'🏅'},
              {date:'May 28',day:'Wed', title:'Parents Open House',        tag:'Parent Event', color:'#00D9E8', emoji:'🏫'},
              {date:'Jun 2', day:'Mon', title:'STEAM Fair & Exhibition',   tag:'Learning',     color:'#FFD700', emoji:'🔬'},
              {date:'Jun 6', day:'Fri', title:'Superhero Graduation Prep', tag:'Special Day',  color:'#E8131A', emoji:'🎓'},
            ].map(ev => `
              <div class="event-row">
                <div style="min-width:52px;text-align:center;background:${ev.color}18;border:1px solid ${ev.color}33;border-radius:10px;padding:6px 4px">
                  <div style="font-family:'Bangers',cursive;font-size:1.2rem;color:${ev.color};line-height:1">${ev.date.split(' ')[1]}</div>
                  <div style="font-size:0.6rem;color:${ev.color};text-transform:uppercase;font-weight:800">${ev.date.split(' ')[0]}</div>
                </div>
                <div style="flex:1">
                  <div style="font-weight:800;color:#fff;font-size:0.88rem">${ev.emoji} ${ev.title}</div>
                  <span class="portal-badge" style="background:${ev.color}15;color:${ev.color};border:1px solid ${ev.color}30;margin-top:3px">${ev.tag}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- MESSAGES -->
        <div id="messages" style="background:rgba(255,255,255,0.02);border:1px solid rgba(0,217,232,0.15);border-radius:18px;padding:1.75rem">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
            <h3 style="font-family:'Bangers',cursive;font-size:1.3rem;color:#00D9E8;letter-spacing:2px">
              <i class="fas fa-comment-dots mr-2"></i>Messages
            </h3>
            <span style="background:rgba(232,19,26,0.15);color:#E8131A;border:1px solid rgba(232,19,26,0.3);border-radius:50px;padding:2px 10px;font-size:0.7rem;font-weight:800">3 Unread</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1rem">
            ${[
              {from:'Ms. Rachel Storm',  role:'Class Teacher', time:'Today 9:30 AM',  text:'Arya did something wonderful during story time today! She retold the entire "Brave Little Star" story to the class. You must be so proud! 🌟', unread:true,  color:'#00D9E8'},
              {from:'Principal\'s Office',role:'Admin',         time:'Yesterday',      text:'Reminder: Parent-Teacher meeting scheduled for May 28th at 10:00 AM. Please confirm your slot via reply or call us.', unread:true,  color:'#FFD700'},
              {from:'Ms. Rachel Storm',  role:'Class Teacher', time:'May 19',         text:'Sharing Arya\'s art project from STEAM class — she built a volcano and it was a huge hit! Photo attached in gallery.', unread:false, color:'#00D9E8'},
            ].map(m => `
              <div class="msg-card" style="border-color:${m.unread?m.color+'44':'rgba(255,255,255,0.07)'};background:${m.unread?m.color+'08':'rgba(255,255,255,0.02)'}">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${m.color}44,${m.color}22);display:flex;align-items:center;justify-content:center;font-weight:900;color:${m.color};font-size:0.85rem;flex-shrink:0">${m.from.charAt(0)}</div>
                  <div style="flex:1">
                    <div style="font-weight:800;color:#fff;font-size:0.82rem">${m.from}</div>
                    <div style="color:#555;font-size:0.7rem">${m.role} • ${m.time}</div>
                  </div>
                  ${m.unread ? `<div style="width:8px;height:8px;border-radius:50%;background:#E8131A;box-shadow:0 0 6px #E8131A;flex-shrink:0"></div>` : ''}
                </div>
                <p style="color:#aaa;font-size:0.82rem;line-height:1.5">${m.text}</p>
              </div>
            `).join('')}
          </div>
          <!-- Reply box -->
          <div style="display:flex;gap:8px;align-items:center">
            <input type="text" placeholder="Reply to Ms. Rachel..."
              style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(0,217,232,0.25);border-radius:50px;padding:9px 16px;color:#fff;font-size:0.82rem;outline:none;font-family:'Nunito',sans-serif"
              onfocus="this.style.borderColor='#00D9E8'" onblur="this.style.borderColor='rgba(0,217,232,0.25)'" />
            <button style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#00D9E8,#0099bb);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#0f0f1a;flex-shrink:0;transition:all 0.2s"
              onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              <i class="fas fa-paper-plane" style="font-size:0.85rem"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- ACHIEVEMENTS / PROGRESS BADGES -->
      <div id="reports" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,215,0,0.12);border-radius:18px;padding:1.75rem;margin-bottom:2rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
          <h3 style="font-family:'Bangers',cursive;font-size:1.3rem;color:#FFD700;letter-spacing:2px">
            <i class="fas fa-trophy mr-2"></i>Achievement Badges
          </h3>
          <button style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.25);color:#FFD700;border-radius:8px;padding:6px 16px;font-size:0.78rem;font-weight:700;cursor:pointer;transition:all 0.2s"
            onmouseover="this.style.background='rgba(255,215,0,0.16)'" onmouseout="this.style.background='rgba(255,215,0,0.08)'">
            <i class="fas fa-download mr-1"></i>Download Report
          </button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.75rem">
          ${[
            {emoji:'⭐', title:'Super Reader',        desc:'Completed 5 story books',     color:'#FFD700', earned:true},
            {emoji:'🔬', title:'Science Explorer',    desc:'STEAM fair participant',       color:'#00D9E8', earned:true},
            {emoji:'🎨', title:'Creative Genius',     desc:'Art exhibition showcase',      color:'#E8131A', earned:true},
            {emoji:'🤝', title:'Team Player',         desc:'Excellent cooperation',        color:'#00D9E8', earned:true},
            {emoji:'🏃', title:'Sporty Superhero',    desc:'Sports Day participant',       color:'#FFD700', earned:true},
            {emoji:'🌱', title:'Garden Hero',         desc:'Planted & grew a sunflower',   color:'#00D9E8', earned:true},
            {emoji:'🎵', title:'Music Master',        desc:'Sang solo in assembly',        color:'#E8131A', earned:true},
            {emoji:'🔢', title:'Math Champion',       desc:'10 sums streak',              color:'#FFD700', earned:false},
            {emoji:'📖', title:'Book Worm',           desc:'Read 10 books',               color:'#00D9E8', earned:false},
          ].map(b => `
            <div style="background:${b.earned?b.color+'0e':'rgba(255,255,255,0.02)'};border:1px solid ${b.earned?b.color+'33':'rgba(255,255,255,0.06)'};border-radius:12px;padding:1rem;text-align:center;opacity:${b.earned?'1':'0.4'}">
              <div style="font-size:2rem;margin-bottom:0.4rem">${b.emoji}</div>
              <div style="font-weight:800;color:${b.earned?'#fff':'#666'};font-size:0.78rem;margin-bottom:2px">${b.title}</div>
              <div style="color:${b.earned?b.color:'#555'};font-size:0.68rem">${b.desc}</div>
              ${b.earned ? `<div style="margin-top:6px;font-size:0.65rem;color:${b.color}"><i class="fas fa-check-circle mr-1"></i>Earned</div>` : `<div style="margin-top:6px;font-size:0.65rem;color:#555"><i class="fas fa-lock mr-1"></i>Locked</div>`}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- QUICK ACTIONS -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-bottom:2rem">
        ${[
          {icon:'fa-phone-alt',    color:'#00D9E8', label:'Call Teacher',         action:'tel:+919822977644'},
          {icon:'fa-envelope',     color:'#FFD700', label:'Email School',          action:'mailto:superkidsenrollment@gmail.com'},
          {icon:'fa-file-download',color:'#E8131A', label:'Download Report',       action:'#'},
          {icon:'fa-camera',       color:'#00D9E8', label:'Request Photos',        action:'#'},
          {icon:'fa-calendar-plus',color:'#FFD700', label:'Book Meeting',          action:'#'},
          {icon:'fa-exclamation-circle',color:'#E8131A',label:'Report Absence',    action:'#'},
        ].map(a => `
          <a href="${a.action}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:1.25rem;background:${a.color}0a;border:1px solid ${a.color}22;border-radius:14px;text-decoration:none;transition:all 0.25s;cursor:pointer"
            onmouseover="this.style.background='${a.color}18';this.style.borderColor='${a.color}55';this.style.transform='translateY(-2px)'"
            onmouseout="this.style.background='${a.color}0a';this.style.borderColor='${a.color}22';this.style.transform='translateY(0)'">
            <div style="width:44px;height:44px;background:${a.color}18;border-radius:12px;display:flex;align-items:center;justify-content:center">
              <i class="fas ${a.icon}" style="color:${a.color};font-size:1.1rem"></i>
            </div>
            <span style="color:#ccc;font-size:0.8rem;font-weight:700;text-align:center">${a.label}</span>
          </a>
        `).join('')}
      </div>

      <!-- Portal footer -->
      <div style="text-align:center;padding:1.5rem 0;border-top:1px solid rgba(255,255,255,0.06)">
        <p style="color:#444;font-size:0.78rem">SuperKids Parent Portal &nbsp;•&nbsp; <a href="/" style="color:#FFD700;text-decoration:none">Back to Website</a> &nbsp;•&nbsp; <a href="/parent-portal" style="color:#E8131A;text-decoration:none">Logout</a></p>
      </div>
    </main>
  </div>

  <style>
    @media (max-width:900px) {
      #portal-sidebar { display:none; }
      .lg-two-col { grid-template-columns:1fr !important; }
    }
  </style>

  <script>
    // Sidebar smooth scroll
    document.querySelectorAll('.portal-sidebar-link').forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href.startsWith('#')) {
          e.preventDefault();
          const target = document.getElementById(href.slice(1));
          if (target) target.scrollIntoView({ behavior:'smooth', block:'start' });
          document.querySelectorAll('.portal-sidebar-link').forEach(l => l.classList.remove('active'));
          this.classList.add('active');
        }
      });
    });
  </script>
  `
  return c.html(Layout({ children: content, title: 'Dashboard - SuperKids Parent Portal' }))
})

// API: Contact form handler
app.post('/api/contact', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return c.json({
    success: true,
    message: 'Application received! We will contact you within 24 hours.',
    reference: `SK-${Math.floor(Math.random() * 9000 + 1000)}`
  })
})

export default app
