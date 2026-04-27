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
      --dark: #1a1a2e;
      --dark2: #16213e;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Nunito', sans-serif;
      background-color: #0f0f1a;
      color: #fff;
      overflow-x: hidden;
    }

    /* ===== NEON GLOW EFFECTS ===== */
    .neon-cyan { text-shadow: 0 0 6px rgba(0,217,232,0.5), 0 0 12px rgba(0,217,232,0.25); }
    .neon-red  { text-shadow: 0 0 6px rgba(232,19,26,0.5),  0 0 12px rgba(232,19,26,0.25); }
    .neon-yellow { text-shadow: 0 0 6px rgba(255,215,0,0.5), 0 0 12px rgba(255,215,0,0.25); }

    .glow-box-cyan  { box-shadow: 0 0 15px #00D9E8, 0 0 30px rgba(0,217,232,0.3); }
    .glow-box-red   { box-shadow: 0 0 15px #E8131A, 0 0 30px rgba(232,19,26,0.3); }
    .glow-box-yellow{ box-shadow: 0 0 15px #FFD700, 0 0 30px rgba(255,215,0,0.3); }

    /* ===== NAVBAR ===== */
    nav {
      background: linear-gradient(180deg, #0a0e1a 0%, #0d1525 100%);
      backdrop-filter: blur(12px);
      border-bottom: 2px solid #00D9E8;
      box-shadow: 0 2px 30px rgba(0,217,232,0.25), 0 4px 60px rgba(0,0,0,0.6);
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
      background: radial-gradient(ellipse at top, #1a1a3e 0%, #0f0f1a 70%);
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
      background-image: radial-gradient(circle at 20% 50%, rgba(0,217,232,0.05) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(232,19,26,0.05) 0%, transparent 50%),
                        radial-gradient(circle at 60% 80%, rgba(255,215,0,0.03) 0%, transparent 40%);
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
      border-radius: 12px;
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
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(0,217,232,0.2);
      border-radius: 16px;
      padding: 2rem;
      transition: all 0.3s;
      position: relative;
      overflow: visible;
    }
    .card::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(0,217,232,0.05), transparent);
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
      z-index: 0;
    }
    .card:hover {
      border-color: #00D9E8;
      transform: translateY(-6px);
      box-shadow: 0 20px 40px rgba(0,217,232,0.15);
    }
    .card:hover::before { opacity: 1; }

    .card-red {
      border-color: rgba(232,19,26,0.2);
    }
    .card-red::before {
      background: linear-gradient(135deg, rgba(232,19,26,0.05), transparent);
    }
    .card-red:hover {
      border-color: #E8131A;
      box-shadow: 0 20px 40px rgba(232,19,26,0.15);
    }

    .card-yellow {
      border-color: rgba(255,215,0,0.2);
    }
    .card-yellow::before {
      background: linear-gradient(135deg, rgba(255,215,0,0.05), transparent);
    }
    .card-yellow:hover {
      border-color: #FFD700;
      box-shadow: 0 20px 40px rgba(255,215,0,0.15);
    }

    /* ===== PROGRAM CARDS ===== */
    .program-card {
      border-radius: 20px;
      overflow: hidden;
      transition: transform 0.3s;
    }
    .program-card:hover { transform: scale(1.03); }

    /* ===== BUTTONS ===== */
    .btn-primary {
      background: linear-gradient(135deg, #E8131A, #FF4444);
      color: #fff;
      font-family: 'Bangers', cursive;
      font-size: 1.2rem;
      letter-spacing: 2px;
      padding: 14px 36px;
      border-radius: 50px;
      border: none;
      cursor: pointer;
      transition: all 0.3s;
      text-decoration: none;
      display: inline-block;
      box-shadow: 0 0 20px rgba(232,19,26,0.4);
    }
    .btn-primary:hover {
      transform: scale(1.05);
      box-shadow: 0 0 35px rgba(232,19,26,0.7);
    }

    .btn-secondary {
      background: transparent;
      color: #00D9E8;
      font-family: 'Bangers', cursive;
      font-size: 1.2rem;
      letter-spacing: 2px;
      padding: 12px 34px;
      border-radius: 50px;
      border: 2px solid #00D9E8;
      cursor: pointer;
      transition: all 0.3s;
      text-decoration: none;
      display: inline-block;
    }
    .btn-secondary:hover {
      background: rgba(0,217,232,0.15);
      box-shadow: 0 0 25px rgba(0,217,232,0.5);
      transform: scale(1.05);
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
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 1;
      background: linear-gradient(135deg, #1a2a4a, #0f1f3f);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      border: 1px solid rgba(0,217,232,0.2);
      transition: all 0.3s;
      cursor: pointer;
    }
    .gallery-item:hover {
      border-color: #00D9E8;
      transform: scale(1.05);
      box-shadow: 0 0 20px rgba(0,217,232,0.3);
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
      background: rgba(0,0,0,0.6);
      border-top: 2px solid rgba(0,217,232,0.2);
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
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .fade-in.visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* ===== MOBILE MENU ===== */
    #mobile-menu {
      display: none;
    }
    #mobile-menu.open {
      display: block;
    }

    /* ===== BADGE ===== */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* ===== MARQUEE ===== */
    .marquee-wrap {
      overflow: hidden;
      background: linear-gradient(90deg, #E8131A, #E8131A);
      padding: 10px 0;
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
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,215,0,0.2);
      border-radius: 16px;
      padding: 2rem;
      transition: all 0.3s;
    }
    .testimonial-card:hover {
      border-color: #FFD700;
      box-shadow: 0 0 20px rgba(255,215,0,0.15);
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
        mobileMenu.classList.toggle('open');
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
    background: linear-gradient(180deg,#08101e 0%,#0d1828 100%);
    position:relative;
    overflow:hidden;
    border-bottom:2px solid #00D9E8;
    box-shadow:0 2px 30px rgba(0,217,232,0.22),0 4px 60px rgba(0,0,0,0.7);
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
  <div id="mobile-menu" class="md:hidden px-4 pb-4" style="background:#0d1828;border-bottom:1px solid rgba(0,217,232,0.2)">
    <div class="flex flex-col gap-1" style="padding:12px 0">
      <a href="/" style="color:#ccc;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='rgba(0,217,232,0.08)'" onmouseout="this.style.background=''">🏠 Home</a>
      <a href="/about" style="color:#ccc;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='rgba(0,217,232,0.08)'" onmouseout="this.style.background=''">⚡ About</a>
      <a href="/programs" style="color:#ccc;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='rgba(0,217,232,0.08)'" onmouseout="this.style.background=''">🎓 Programs</a>
      <a href="/gallery" style="color:#ccc;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='rgba(0,217,232,0.08)'" onmouseout="this.style.background=''">🖼️ Gallery</a>
      <a href="/contact" style="color:#ccc;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='rgba(0,217,232,0.08)'" onmouseout="this.style.background=''">📞 Contact</a>
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
  <section class="hero" style="min-height:95vh">
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
          <!-- Animated glow ring behind logo -->
          <div style="
            position:absolute;
            inset:-24px;
            border-radius:20px;
            background:radial-gradient(ellipse at 40% 60%, rgba(0,217,232,0.22) 0%, rgba(232,19,26,0.08) 50%, transparent 75%);
            animation:glowPulse 4s ease-in-out infinite;
            pointer-events:none;
            z-index:0;
          "></div>
          <!-- Subtle bottom shadow for depth -->
          <div style="
            position:absolute;
            bottom:-10px;left:10%;right:10%;
            height:20px;
            background:radial-gradient(ellipse,rgba(0,217,232,0.35),transparent 70%);
            filter:blur(8px);
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
                drop-shadow(0px 6px 18px rgba(0,0,0,0.65))
                drop-shadow(0 0 32px rgba(0,217,232,0.80))
                drop-shadow(0 0 64px rgba(0,217,232,0.40));
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
  <section style="padding:6rem 0;background:linear-gradient(180deg,#0f0f1a,#0d1628)">
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
  <section style="padding:6rem 0;background:#0f0f1a">
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
  <section style="padding:6rem 0;background:linear-gradient(180deg,#0d1628,#0f0f1a)">
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
  <section style="padding:6rem 0;background:linear-gradient(135deg,#1a1a3e,#0f0f1a);position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,217,232,0.08),transparent 60%)"></div>
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
  <section style="padding:6rem 0 4rem;background:radial-gradient(ellipse at top,#1a1a3e,#0f0f1a);position:relative;overflow:hidden">
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
  <section style="padding:5rem 0;background:#0f0f1a">
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
  <section style="padding:4rem 0;background:#0f0f1a">
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
  <section style="padding:5rem 0;background:linear-gradient(180deg,#0f0f1a,#0d1628)">
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
  <section style="padding:6rem 0 4rem;background:radial-gradient(ellipse at top,#1a0020,#0f0f1a);position:relative;overflow:hidden">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <div class="badge mb-4" style="background:rgba(232,19,26,0.1);color:#E8131A;border:1px solid rgba(232,19,26,0.3)">Learning Programs</div>
      <h1 class="section-title neon-red" style="color:#E8131A;font-size:clamp(2.5rem,6vw,4.5rem)">Our Programs</h1>
      <p style="color:#bbb;font-size:1.1rem;line-height:1.8;margin-top:1.5rem;max-width:600px;margin-left:auto;margin-right:auto">
        Carefully crafted programs that meet your child exactly where they are — and take them beyond where they dreamed they could be.
      </p>
    </div>
  </section>

  <!-- Age filter tabs -->
  <section style="padding:2rem 0;background:#0f0f1a;border-bottom:1px solid rgba(0,217,232,0.1)">
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
  <section style="padding:5rem 0;background:#0f0f1a">
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
  <section style="padding:5rem 0;background:linear-gradient(180deg,#0d1628,#0f0f1a)">
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
  <section style="padding:4rem 0;background:#0f0f1a">
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
  <section style="padding:6rem 0 4rem;background:radial-gradient(ellipse at top,#001a1a,#0f0f1a)">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <div class="badge mb-4" style="background:rgba(255,215,0,0.1);color:#FFD700;border:1px solid rgba(255,215,0,0.3)">Gallery</div>
      <h1 class="section-title neon-yellow" style="color:#FFD700;font-size:clamp(2.5rem,6vw,4.5rem)">Super Moments</h1>
      <p style="color:#bbb;font-size:1.1rem;line-height:1.8;margin-top:1.5rem">
        A glimpse into the magical, learning-filled world of SuperKids Preschool.
      </p>
    </div>
  </section>

  <!-- Gallery Grid -->
  <section style="padding:3rem 0 6rem;background:#0f0f1a">
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
  <section style="padding:4rem 0;background:linear-gradient(135deg,#1a1a3e,#0f0f1a)">
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
  <section style="padding:6rem 0 4rem;background:radial-gradient(ellipse at top,#1a1a0a,#0f0f1a)">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <div class="badge mb-4" style="background:rgba(255,215,0,0.1);color:#FFD700;border:1px solid rgba(255,215,0,0.3)">Contact & Enrollment</div>
      <h1 class="section-title neon-yellow" style="color:#FFD700;font-size:clamp(2.5rem,6vw,4.5rem)">Join The Team!</h1>
      <p style="color:#bbb;font-size:1.1rem;line-height:1.8;margin-top:1.5rem;max-width:600px;margin-left:auto;margin-right:auto">
        Ready to enroll your little superhero? Schedule a tour, ask questions, or start your application today!
      </p>
    </div>
  </section>

  <!-- Contact Content -->
  <section style="padding:4rem 0 6rem;background:#0f0f1a">
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
  <section style="padding:5rem 0;background:linear-gradient(180deg,#0d1628,#0f0f1a)">
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
