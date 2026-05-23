import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = { DB: any; MEDIA: any }
const app = new Hono<{ Bindings: Bindings }>()

app.use('/static/*', serveStatic({ root: './public' }))

// ── DB API ──────────────────────────────────────────────
app.get('/api/init', async (c) => {
  await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
  return c.json({ ok: true })
})

app.get('/api/db', async (c) => {
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('main').first<{ value: string }>()
    return c.json(row ? JSON.parse(row.value) : null)
  } catch { return c.json(null) }
})

app.post('/api/db', async (c) => {
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const data = await c.req.json()
    await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key, value, updated_at) VALUES (?, ?, ?)').bind('main', JSON.stringify(data), new Date().toISOString()).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── R2 Upload API ────────────────────────────────────────
app.post('/api/upload', async (c) => {
  try {
    const form = await c.req.formData()
    const file = form.get('file') as File | null
    if (!file) return c.json({ error: 'No file provided' }, 400)
    const ext = file.name.split('.').pop() || 'jpg'
    const key = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    await c.env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
    const url = `https://pub-92df4935826e41f29b59fa7b32da3a0d.r2.dev/${key}`
    return c.json({ ok: true, url, key })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.delete('/api/upload', async (c) => {
  try {
    const { key } = await c.req.json()
    if (key) await c.env.MEDIA.delete(key)
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/dbstatus', async (c) => {
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const row = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM app_data').first<{ cnt: number }>()
    return c.json({ ok: true, message: 'D1 connected', rows: row?.cnt ?? 0 })
  } catch (e: any) { return c.json({ ok: false, message: e.message || 'D1 not available' }) }
})

// Dedicated gallery sync — accepts just published items array (small payload)
app.post('/api/gallery/sync', async (c) => {
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const body = await c.req.json()
    const items = body.items || []
    await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key, value, updated_at) VALUES (?, ?, ?)').bind('gallery', JSON.stringify({ items }), new Date().toISOString()).run()
    return c.json({ ok: true, count: items.length })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// Proxy R2 objects through the worker (no need for a public bucket URL)
app.get('/r2/*', async (c) => {
  const key = c.req.path.replace('/r2/', '')
  if (!key) return c.notFound()
  try {
    const obj = await c.env.MEDIA.get(key)
    if (!obj) return c.notFound()
    const headers = new Headers()
    obj.writeHttpMetadata(headers)
    headers.set('cache-control', 'public, max-age=31536000')
    return new Response(obj.body, { headers })
  } catch { return c.notFound() }
})

app.get('/api/gallery', async (c) => {
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)

    // 1. Get published items from D1
    let d1Items: any[] = []
    try {
      const galleryRow = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('gallery').first<{ value: string }>()
      if (galleryRow) {
        d1Items = JSON.parse(galleryRow.value).items || []
      } else {
        const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('main').first<{ value: string }>()
        if (row) {
          const data = JSON.parse(row.value)
          d1Items = (data.gallery || []).filter((item: any) => item.published === true)
        }
      }
    } catch (_) {}

    // Normalize D1 item image URLs: prefer /r2/ proxy over public domain URL
    d1Items = d1Items.map((item: any) => {
      if (item.r2Key) return { ...item, imageData: `/r2/${item.r2Key}` }
      if (item.imageData && item.imageData.startsWith('https://pub-')) {
        const key = item.imageData.replace(/^https:\/\/[^/]+\//, '')
        return { ...item, imageData: `/r2/${key}` }
      }
      return item
    })

    // 2. Also list R2 bucket to catch photos not yet in D1
    let r2Items: any[] = []
    let r2Error = ''
    try {
      const d1Keys = new Set([
        ...d1Items.map((i: any) => i.r2Key).filter(Boolean),
        ...d1Items.map((i: any) => {
          if (i.imageData && i.imageData.startsWith('/r2/')) return i.imageData.replace('/r2/', '')
          return null
        }).filter(Boolean)
      ])
      const listed = await c.env.MEDIA.list({ limit: 500 })
      r2Items = (listed.objects as any[])
        .filter((obj: any) => !d1Keys.has(obj.key))
        .filter((obj: any) => /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(obj.key))
        .map((obj: any) => {
          const name = obj.key.split('/').pop() || obj.key
          const title = name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
          return {
            id: obj.key,
            title: title.charAt(0).toUpperCase() + title.slice(1),
            description: '',
            type: 'image',
            imageData: `/r2/${obj.key}`,
            r2Key: obj.key,
            date: obj.uploaded ? new Date(obj.uploaded).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          }
        })
    } catch (e: any) { r2Error = e.message || 'R2 list failed' }

    const items = [...d1Items, ...r2Items]
    return c.json({ items, _debug: { d1Count: d1Items.length, r2Count: r2Items.length, r2Error } })
  } catch (e: any) { return c.json({ items: [], _debug: { error: String(e) } }) }
})

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
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --navy:        #0F2050;
      --navy-dark:   #081535;
      --navy-light:  #E8EDF5;
      --bronze:      #C4893A;
      --bronze-dark: #9A6A25;
      --bronze-light:#FEF8F0;
      --teal:        #1AA6CA;
      --teal-light:  #E8F7FC;
      --gold:        #E8B020;
      --gold-light:  #FEF7E0;
      --green:       #10B981;
      --white:       #ffffff;
      --bg-alt:      #F8F9FB;
      --text-dark:   #0F1E3D;
      --text-mid:    #2A3B60;
      --text-muted:  #6B7A9D;
      --border:      #DCE1EF;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Nunito', sans-serif;
      background-color: #ffffff;
      color: #0F1E3D;
      overflow-x: hidden;
    }

    nav {
      background: #ffffff;
      border-bottom: 2px solid #DCE1EF;
      box-shadow: 0 2px 20px rgba(15,32,80,0.07);
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .nav-link {
      font-weight: 700;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 8px 14px;
      border-radius: 8px;
      transition: all 0.25s;
      position: relative;
      color: #2A3B60;
      text-decoration: none;
    }
    .nav-link:hover  { color: #0F2050; background: #E8EDF5; }
    .nav-link.active { color: #0F2050; background: #E8EDF5; }

    .hero {
      min-height: 100vh;
      background: linear-gradient(135deg, #E8EDF5 0%, #FEF8F0 50%, #E8F7FC 100%);
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
      background-image:
        radial-gradient(circle at 20% 30%, rgba(15,32,80,0.06) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(196,137,58,0.05) 0%, transparent 50%),
        radial-gradient(circle at 60% 20%, rgba(26,166,202,0.04) 0%, transparent 40%);
    }

    .star {
      position: absolute;
      background: #0F2050;
      border-radius: 50%;
      opacity: 0.12;
      animation: twinkle 3s infinite alternate;
    }
    @keyframes twinkle {
      0%   { opacity: 0.06; transform: scale(1); }
      100% { opacity: 0.2;  transform: scale(1.3); }
    }

    .burst {
      position: absolute;
      font-family: 'Playfair Display', serif;
      font-size: 1rem;
      color: #C4893A;
      opacity: 0.3;
      animation: float 4s ease-in-out infinite;
    }
    @keyframes float {
      0%,100% { transform: translateY(0) rotate(-5deg); }
      50%      { transform: translateY(-15px) rotate(5deg); }
    }

    .shield-hero {
      animation: heroFloat 4s ease-in-out infinite;
      filter: drop-shadow(0 20px 40px rgba(15,32,80,0.18));
    }
    @keyframes heroFloat {
      0%,100% { transform: translateY(0px) scale(1) rotate(-1deg); }
      33%      { transform: translateY(-14px) scale(1.02) rotate(0deg); }
      66%      { transform: translateY(-8px) scale(1.01) rotate(1deg); }
    }

    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: 2.8rem;
      font-weight: 800;
      letter-spacing: 1px;
      line-height: 1.1;
    }

    .card {
      background: #ffffff;
      border: 1.5px solid #DCE1EF;
      border-radius: 20px;
      padding: 2rem;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
      overflow: visible;
      box-shadow: 0 2px 12px rgba(15,32,80,0.05);
    }
    .card::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(15,32,80,0.03), rgba(196,137,58,0.02), transparent);
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
      z-index: 0;
    }
    .card:hover {
      border-color: #C4893A;
      transform: translateY(-6px);
      box-shadow: 0 16px 36px rgba(15,32,80,0.1);
    }
    .card:hover::before { opacity: 1; }

    .card-red   { border-color: #FEF8F0; }
    .card-red:hover   { border-color: #C4893A; box-shadow: 0 16px 36px rgba(196,137,58,0.12); }
    .card-yellow { border-color: #FEF7E0; }
    .card-yellow:hover { border-color: #E8B020; box-shadow: 0 16px 36px rgba(232,176,32,0.12); }

    .program-card {
      border-radius: 20px;
      overflow: hidden;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .program-card:hover { transform: scale(1.03) translateY(-4px); }

    .btn-primary {
      background: linear-gradient(135deg, #0F2050, #1AA6CA);
      color: #fff;
      font-family: 'Nunito', sans-serif;
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: 1.5px;
      padding: 14px 36px;
      border-radius: 50px;
      border: none;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      text-decoration: none;
      display: inline-block;
      box-shadow: 0 4px 20px rgba(15,32,80,0.25);
      text-transform: uppercase;
    }
    .btn-primary:hover {
      transform: scale(1.05) translateY(-2px);
      box-shadow: 0 8px 32px rgba(15,32,80,0.35);
      background: linear-gradient(135deg, #1AA6CA, #0F2050);
    }

    .btn-secondary {
      background: transparent;
      color: #0F2050;
      font-family: 'Nunito', sans-serif;
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: 1.5px;
      padding: 12px 34px;
      border-radius: 50px;
      border: 2px solid #0F2050;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      text-decoration: none;
      display: inline-block;
      text-transform: uppercase;
    }
    .btn-secondary:hover {
      background: #E8EDF5;
      box-shadow: 0 4px 20px rgba(15,32,80,0.15);
      transform: scale(1.05) translateY(-2px);
    }

    .stat-number {
      font-family: 'Playfair Display', serif;
      font-size: 3.5rem;
      font-weight: 800;
      letter-spacing: 1px;
    }

    .teacher-avatar {
      width: 100px; height: 100px;
      border-radius: 50%;
      border: 3px solid #C4893A;
      box-shadow: 0 0 0 6px #FEF8F0;
      object-fit: cover;
      display: flex; align-items: center; justify-content: center;
      font-size: 2.5rem;
      background: linear-gradient(135deg, #E8EDF5, #FEF8F0);
      margin: 0 auto 1rem;
    }

    .timeline-dot {
      width: 16px; height: 16px;
      background: #0F2050;
      border-radius: 50%;
      box-shadow: 0 0 0 4px #E8EDF5;
      flex-shrink: 0;
    }

    .gallery-item {
      border-radius: 16px;
      overflow: hidden;
      aspect-ratio: 1;
      background: linear-gradient(135deg, #E8EDF5, #FEF8F0);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      border: 1.5px solid #DCE1EF;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      cursor: pointer;
    }
    .gallery-item:hover {
      border-color: #C4893A;
      transform: scale(1.05);
      box-shadow: 0 12px 30px rgba(196,137,58,0.14);
    }

    .form-input {
      width: 100%;
      background: #F8F9FB;
      border: 1.5px solid #DCE1EF;
      border-radius: 10px;
      padding: 12px 16px;
      color: #0F1E3D;
      font-family: 'Nunito', sans-serif;
      font-size: 1rem;
      transition: border-color 0.3s;
      outline: none;
      position: relative;
      z-index: 2;
      cursor: text;
    }
    .form-input:focus {
      border-color: #1AA6CA;
      box-shadow: 0 0 0 3px rgba(26,166,202,0.12);
      background: #ffffff;
    }
    .form-input::placeholder { color: #9CA3AF; }

    footer { background: #0A1428; border-top: none; }

    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #0F2050, #C4893A, transparent);
      margin: 4rem 0;
    }

    .fade-in {
      opacity: 0;
      transform: translateY(30px);
      transition: opacity 0.6s ease, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .fade-in.visible { opacity: 1; transform: translateY(0); }

    #mobile-menu {
      max-height: 0; overflow: hidden; opacity: 0;
      transition: max-height 0.4s ease-in-out, opacity 0.3s ease;
    }
    #mobile-menu.open { max-height: 600px; opacity: 1; }
    #menu-btn { transition: transform 0.3s ease; }
    #menu-btn.open { transform: rotate(90deg); }

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

    .marquee-wrap {
      overflow: hidden;
      background: linear-gradient(90deg, #0F2050, #1AA6CA, #0F2050);
      padding: 12px 0;
    }
    .marquee-track {
      display: flex;
      animation: marquee 22s linear infinite;
      white-space: nowrap;
    }
    @keyframes marquee {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    .age-tab.active { background: #0F2050; color: #ffffff; }

    .testimonial-card {
      background: #ffffff;
      border: 1.5px solid #DCE1EF;
      border-radius: 20px;
      padding: 2rem;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 2px 12px rgba(15,32,80,0.05);
    }
    .testimonial-card:hover {
      border-color: #E8B020;
      box-shadow: 0 12px 30px rgba(232,176,32,0.12);
      transform: translateY(-6px);
    }

    .neon-cyan   { color: #1AA6CA !important; }
    .neon-red    { color: #C4893A !important; }
    .neon-yellow { color: #E8B020 !important; }
    .neon-purple { color: #0F2050 !important; }
    .neon-orange { color: #E8B020 !important; }

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

    .divider-rainbow {
      height: 3px;
      background: linear-gradient(90deg, #0F2050, #1AA6CA, #E8B020, #C4893A, #0F2050);
      border-radius: 3px;
      margin: 4rem 0;
    }

    @keyframes waPulse {
      0%   { transform: scale(1);   opacity: 1; }
      70%  { transform: scale(1.4); opacity: 0; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    /* Premium section accent line */
    .section-accent {
      display: inline-block;
      width: 60px;
      height: 3px;
      background: linear-gradient(90deg, #C4893A, #E8B020);
      border-radius: 2px;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  ${children}

  <script>
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

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

  <!-- WhatsApp Floating Button -->
  <a href="https://wa.me/919822977644?text=Hello%20SuperKids%20Preschool!%20I%20would%20like%20to%20know%20more%20about%20your%20programs."
     target="_blank" rel="noopener noreferrer" id="whatsapp-btn"
     style="position:fixed;bottom:28px;right:28px;z-index:9999;width:62px;height:62px;border-radius:50%;background:linear-gradient(135deg,#25D366,#128C7E);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(37,211,102,0.55),0 2px 8px rgba(0,0,0,0.4);text-decoration:none;transition:transform 0.3s,box-shadow 0.3s;animation:waPulse 2.5s ease-in-out infinite"
     onmouseover="this.style.transform='scale(1.12)'"
     onmouseout="this.style.transform='scale(1)'">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="34" height="34">
      <path fill="#fff" d="M24 4C13 4 4 13 4 24c0 3.6 1 7 2.7 9.9L4 44l10.4-2.7C17 43 20.4 44 24 44c11 0 20-9 20-20S35 4 24 4zm0 36c-3.1 0-6.1-.8-8.7-2.4l-.6-.4-6.2 1.6 1.7-6-.4-.6C8.8 30.1 8 27.1 8 24c0-8.8 7.2-16 16-16s16 7.2 16 16-7.2 16-16 16zm8.7-11.8c-.5-.2-2.8-1.4-3.2-1.5-.4-.2-.7-.2-1 .2-.3.4-1.2 1.5-1.5 1.9-.3.3-.5.4-1 .1-.5-.2-2-.7-3.8-2.3-1.4-1.2-2.3-2.8-2.6-3.2-.3-.5 0-.7.2-1 .2-.2.5-.5.7-.8.2-.3.3-.5.4-.8.1-.3 0-.6-.1-.8-.1-.2-1-2.5-1.4-3.4-.4-.9-.7-.8-1-.8h-.9c-.3 0-.8.1-1.2.6-.4.5-1.6 1.5-1.6 3.7 0 2.2 1.6 4.3 1.8 4.6.2.3 3.1 4.8 7.6 6.7 1.1.5 1.9.7 2.6.9 1.1.3 2.1.3 2.9.2.9-.1 2.8-1.1 3.2-2.2.4-1.1.4-2 .3-2.2-.1-.2-.4-.3-.9-.5z"/>
    </svg>
    <span style="position:absolute;width:62px;height:62px;border-radius:50%;background:rgba(37,211,102,0.35);animation:waPulse 2.5s ease-out infinite;pointer-events:none"></span>
  </a>

  <div id="wa-tooltip" style="position:fixed;bottom:38px;right:100px;z-index:9998;background:#0A1428;color:#fff;padding:10px 16px;border-radius:12px;font-size:0.85rem;font-weight:700;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.2);border:1px solid rgba(37,211,102,0.4);opacity:0;pointer-events:none;transition:opacity 0.3s">
    <i class="fab fa-whatsapp" style="color:#25D366;margin-right:6px"></i>Chat with us on WhatsApp!
  </div>

  <script>
    const waBtn = document.getElementById('whatsapp-btn');
    const waTooltip = document.getElementById('wa-tooltip');
    waBtn.addEventListener('mouseenter', () => waTooltip.style.opacity = '1');
    waBtn.addEventListener('mouseleave', () => waTooltip.style.opacity = '0');
  </script>
</body>
</html>
`

// ========== NAVBAR ==========
const Navbar = (active: string) => `
<nav style="position:sticky;top:0;z-index:1000">
  <div style="background:#ffffff;position:relative;overflow:hidden;border-bottom:2px solid #DCE1EF;box-shadow:0 2px 20px rgba(15,32,80,0.07)">
    <div style="position:absolute;top:50%;left:0;transform:translateY(-50%);width:500px;height:160px;background:radial-gradient(ellipse,rgba(15,32,80,0.04) 0%,transparent 70%);pointer-events:none"></div>
    <div class="max-w-7xl mx-auto px-6" style="position:relative;z-index:2">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0">
        <a href="/" style="text-decoration:none;display:flex;align-items:center;gap:14px;flex-shrink:0">
          <img src="/static/logo.png" alt="SuperKids India Preschool"
            style="height:88px;width:88px;object-fit:contain;filter:drop-shadow(0px 4px 12px rgba(15,32,80,0.18));transition:transform 0.3s,filter 0.3s;flex-shrink:0"
            onmouseover="this.style.transform='scale(1.06)';this.style.filter='drop-shadow(0px 6px 16px rgba(15,32,80,0.28))'"
            onmouseout="this.style.transform='scale(1)';this.style.filter='drop-shadow(0px 4px 12px rgba(15,32,80,0.18))'"
          />
          <div>
            <div style="font-family:'Playfair Display',serif;font-size:1.45rem;font-weight:800;color:#0F2050;line-height:1.15;letter-spacing:0.3px">SuperKids India</div>
            <div style="font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:#C4893A;line-height:1.2;letter-spacing:0.3px">Preschool</div>
            <div style="font-family:'Nunito',sans-serif;font-size:0.7rem;font-weight:800;letter-spacing:1.5px;color:#1AA6CA;margin-top:3px;white-space:nowrap">✦ Where Every Child is a SuperHero ✦</div>
          </div>
        </a>

        <div class="hidden md:flex items-center gap-1">
          <a href="/" class="nav-link ${active === 'home' ? 'active' : ''}" style="color:${active === 'home' ? '#0F2050' : '#2A3B60'}">Home</a>
          <a href="/about" class="nav-link ${active === 'about' ? 'active' : ''}" style="color:${active === 'about' ? '#0F2050' : '#2A3B60'}">About</a>
          <a href="/programs" class="nav-link ${active === 'programs' ? 'active' : ''}" style="color:${active === 'programs' ? '#0F2050' : '#2A3B60'}">Programs</a>
          <a href="/gallery" class="nav-link ${active === 'gallery' ? 'active' : ''}" style="color:${active === 'gallery' ? '#0F2050' : '#2A3B60'}">Gallery</a>
          <a href="/contact" class="nav-link ${active === 'contact' ? 'active' : ''}" style="color:${active === 'contact' ? '#0F2050' : '#2A3B60'}">Contact</a>
          <a href="/contact" class="btn-primary ml-3" style="font-size:0.82rem;padding:10px 22px;letter-spacing:1px">Enroll Now</a>
          <a href="/parent-portal" class="nav-link ${active === 'portal' ? 'active' : ''}" style="color:#0F2050;border:1.5px solid #0F2050;border-radius:8px;padding:7px 13px;margin-left:6px">
            <i class="fas fa-shield-alt mr-1" style="font-size:0.8rem"></i>Parent Portal
          </a>
        </div>

        <button id="menu-btn" class="md:hidden" style="color:#0F2050;font-size:1.6rem;background:none;border:none;cursor:pointer">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </div>
  </div>

  <div id="mobile-menu" class="md:hidden px-4 pb-4" style="background:#ffffff;border-bottom:2px solid #DCE1EF">
    <div style="display:flex;align-items:center;gap:10px;padding:12px 12px 8px;border-bottom:1px solid #DCE1EF;margin-bottom:8px">
      <img src="/static/logo.png" style="height:52px;width:52px;object-fit:contain" alt="SuperKids"/>
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:1rem;font-weight:800;color:#0F2050">SuperKids India</div>
        <div style="font-size:0.7rem;font-weight:700;color:#C4893A">Preschool</div>
      </div>
    </div>
    <div class="flex flex-col gap-1" style="padding:4px 0">
      <a href="/" style="color:#2A3B60;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='#E8EDF5';this.style.color='#0F2050'" onmouseout="this.style.background='';this.style.color='#2A3B60'">🏠 Home</a>
      <a href="/about" style="color:#2A3B60;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='#E8EDF5';this.style.color='#0F2050'" onmouseout="this.style.background='';this.style.color='#2A3B60'">About Us</a>
      <a href="/programs" style="color:#2A3B60;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='#E8EDF5';this.style.color='#0F2050'" onmouseout="this.style.background='';this.style.color='#2A3B60'">Programs</a>
      <a href="/gallery" style="color:#2A3B60;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='#E8EDF5';this.style.color='#0F2050'" onmouseout="this.style.background='';this.style.color='#2A3B60'">Gallery</a>
      <a href="/contact" style="color:#2A3B60;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='#E8EDF5';this.style.color='#0F2050'" onmouseout="this.style.background='';this.style.color='#2A3B60'">Contact</a>
      <a href="/contact" class="btn-primary" style="text-align:center;margin-top:8px;display:block">Enroll Now</a>
      <a href="/parent-portal" style="color:#0F2050;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none;border:1.5px solid #0F2050;margin-top:6px" onmouseover="this.style.background='#E8EDF5'" onmouseout="this.style.background=''">🛡️ Parent Portal</a>
    </div>
  </div>
</nav>
`

// ========== FOOTER ==========
const Footer = () => `
<footer class="py-14 mt-20">
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-10">
      <div>
        <a href="/" style="display:inline-block;margin-bottom:1.2rem;text-decoration:none">
          <img src="/static/logo.png" alt="SuperKids India Preschool"
            style="height:80px;width:80px;object-fit:contain;filter:drop-shadow(2px 4px 8px rgba(0,0,0,0.5)) drop-shadow(0 0 14px rgba(26,166,202,0.25));transition:filter 0.3s,transform 0.3s"
            onmouseover="this.style.filter='drop-shadow(2px 4px 12px rgba(0,0,0,0.6)) drop-shadow(0 0 22px rgba(26,166,202,0.45))';this.style.transform='scale(1.06)'"
            onmouseout="this.style.filter='drop-shadow(2px 4px 8px rgba(0,0,0,0.5)) drop-shadow(0 0 14px rgba(26,166,202,0.25))';this.style.transform='scale(1)'"/>
        </a>
        <p style="color:#7B90B5;font-size:0.9rem;line-height:1.8">Empowering little superheroes to grow, learn, and shine every single day!</p>
        <div class="flex gap-4 mt-5">
          <a href="https://www.facebook.com/superkidsindiapreschool/" target="_blank" rel="noopener" style="color:#1AA6CA;font-size:1.3rem;transition:all 0.3s" class="hover:scale-125"><i class="fab fa-facebook"></i></a>
          <a href="https://www.instagram.com/superkidsindiapreschool/" target="_blank" rel="noopener" style="color:#C4893A;font-size:1.3rem;transition:all 0.3s" class="hover:scale-125"><i class="fab fa-instagram"></i></a>
          <a href="https://www.youtube.com/@SuperKidsIndiaPreschool" target="_blank" rel="noopener" style="color:#E8B020;font-size:1.3rem;transition:all 0.3s" class="hover:scale-125"><i class="fab fa-youtube"></i></a>
        </div>
      </div>

      <div>
        <h4 style="font-family:'Playfair Display',serif;font-size:1.1rem;color:#1AA6CA;letter-spacing:1px;margin-bottom:1.2rem;font-weight:700">Quick Links</h4>
        <div class="flex flex-col gap-2">
          ${[
            {label:'Home',href:'/'},
            {label:'About Us',href:'/about'},
            {label:'Programs',href:'/programs'},
            {label:'Gallery',href:'/gallery'},
            {label:'Contact',href:'/contact'},
          ].map(l =>
            `<a href="${l.href}" style="color:#7B90B5;text-decoration:none;font-size:0.9rem;transition:color 0.3s"
              onmouseover="this.style.color='#1AA6CA'" onmouseout="this.style.color='#7B90B5'">
              <i class="fas fa-chevron-right mr-2" style="font-size:0.7rem;color:#C4893A"></i>${l.label}
            </a>`
          ).join('')}
        </div>
      </div>

      <div>
        <h4 style="font-family:'Playfair Display',serif;font-size:1.1rem;color:#C4893A;letter-spacing:1px;margin-bottom:1.2rem;font-weight:700">Our Programs</h4>
        <div class="flex flex-col gap-2">
          ${['Toddler Titans (1-2)','Mini Heroes (2-3)','Super Stars (3-4)','Power Rangers (4-5)','After School Club'].map(p =>
            `<span style="color:#7B90B5;font-size:0.9rem"><i class="fas fa-star mr-2" style="color:#E8B020;font-size:0.7rem"></i>${p}</span>`
          ).join('')}
        </div>
      </div>

      <div>
        <h4 style="font-family:'Playfair Display',serif;font-size:1.1rem;color:#E8B020;letter-spacing:1px;margin-bottom:1.2rem;font-weight:700">Contact Us</h4>
        <div class="flex flex-col gap-3">
          <div class="flex items-start gap-3">
            <i class="fas fa-map-marker-alt mt-1" style="color:#C4893A;width:16px"></i>
            <span style="color:#7B90B5;font-size:0.9rem">Super Kids Preschool, Matoshri Apartment,<br>Plot no 51, Sector no 10, Bhosari Pradhikaran,<br>Pin: 411026</span>
          </div>
          <div class="flex items-center gap-3">
            <i class="fas fa-phone" style="color:#1AA6CA;width:16px"></i>
            <span style="color:#7B90B5;font-size:0.9rem">(+91) 9822-977-644<br>(+91) 9822-977-944</span>
          </div>
          <div class="flex items-center gap-3">
            <i class="fas fa-envelope" style="color:#E8B020;width:16px"></i>
            <span style="color:#7B90B5;font-size:0.9rem">superkidsenrollment@gmail.com<br>superkidsprincipal@gmail.com</span>
          </div>
          <div class="flex items-center gap-3">
            <i class="fas fa-clock" style="color:#1AA6CA;width:16px"></i>
            <span style="color:#7B90B5;font-size:0.9rem">Mon–Fri: 7:00 AM – 6:00 PM</span>
          </div>
        </div>
      </div>
    </div>

    <div style="height:2px;background:linear-gradient(90deg,transparent,#0F2050,#C4893A,transparent);margin:2.5rem 0"></div>

    <div class="flex flex-col md:flex-row justify-between items-center gap-4">
      <p style="color:#5A6E8F;font-size:0.85rem">© 2025 SuperKids India Preschool. All rights reserved. Made with ❤️ for little superheroes.</p>
      <div class="flex gap-4">
        <a href="#" style="color:#5A6E8F;font-size:0.85rem;text-decoration:none">Privacy Policy</a>
        <a href="#" style="color:#5A6E8F;font-size:0.85rem;text-decoration:none">Terms of Use</a>
        <a href="#" style="color:#5A6E8F;font-size:0.85rem;text-decoration:none">Sitemap</a>
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

  <div class="marquee-wrap">
    <div class="marquee-track">
      ${Array(2).fill(['✦ Enrollment Open for 2025!', '🦸 Be A SuperKid!', '✦ Award-Winning Curriculum', '❤️ Safe & Nurturing Environment', '✦ Small Class Sizes', '🎨 Creative Learning Every Day']).flat().map(t =>
        `<span style="font-family:'Nunito',sans-serif;font-size:0.95rem;font-weight:800;letter-spacing:2px;color:#fff;padding:0 3rem">${t}</span>`
      ).join('')}
    </div>
  </div>

  <!-- HERO -->
  <section class="hero" style="min-height:95vh">
    ${Array.from({length:18}).map(() => {
      const size = Math.random()*2.5+1
      const top = Math.random()*100
      const left = Math.random()*100
      const delay = Math.random()*3
      return `<div class="star" style="width:${size}px;height:${size}px;top:${top}%;left:${left}%;animation-delay:${delay}s"></div>`
    }).join('')}

    <div class="burst" style="top:15%;left:5%;animation-delay:0s;font-size:0.9rem">Excellence</div>
    <div class="burst" style="top:20%;right:8%;animation-delay:1s;color:#1AA6CA;font-size:0.85rem">Inspire</div>
    <div class="burst" style="bottom:25%;left:8%;animation-delay:2s;font-size:0.85rem">Nurture</div>
    <div class="burst" style="bottom:30%;right:6%;animation-delay:0.5s;color:#E8B020;font-size:0.8rem">Grow</div>

    <div class="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div style="z-index:10">
        <div class="badge mb-5" style="background:#FEF8F0;color:#C4893A;border:1px solid #C4893A44">
          ✦ #1 Rated Preschool in Bhosari
        </div>

        <div class="section-accent"></div>

        <h1 style="font-family:'Playfair Display',serif;font-size:clamp(2.8rem,6.5vw,5rem);line-height:1.1;margin-bottom:1.2rem;font-weight:800">
          <span style="color:#0F2050">Unleash</span><br/>
          <span style="color:#0F1E3D">Your Child's</span><br/>
          <span style="color:#1AA6CA">Inner</span>
          <span style="color:#C4893A"> Hero</span>
        </h1>

        <p style="color:#6B7A9D;font-size:1.1rem;line-height:1.9;margin-bottom:2rem;max-width:500px">
          At <strong style="color:#0F2050">SuperKids India Preschool</strong>, we believe every child is a superhero waiting to soar.
          Our award-winning programs nurture curiosity, creativity, and confidence in children aged 1–5.
        </p>

        <div class="flex flex-wrap gap-4 mb-8">
          <a href="/contact" class="btn-primary">
            <i class="fas fa-rocket mr-2"></i>Enroll Today
          </a>
          <a href="/programs" class="btn-secondary">
            <i class="fas fa-play-circle mr-2"></i>Our Programs
          </a>
        </div>

        <div class="flex flex-wrap gap-8">
          ${[
            {n:'500+', label:'Happy Kids', color:'#0F2050'},
            {n:'15+', label:'Years of Excellence', color:'#C4893A'},
            {n:'30+', label:'Super Teachers', color:'#1AA6CA'},
          ].map(s => `
            <div class="text-center">
              <div style="font-family:'Playfair Display',serif;font-size:2rem;font-weight:800;color:${s.color}">${s.n}</div>
              <div style="color:#6B7A9D;font-size:0.8rem;margin-top:2px">${s.label}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="flex justify-center items-center" style="z-index:10">
        <div style="position:relative;display:inline-block">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:110%;height:110%;border-radius:50%;background:radial-gradient(ellipse at center,rgba(15,32,80,0.07) 0%,rgba(196,137,58,0.04) 45%,transparent 70%);pointer-events:none;z-index:0"></div>
          <img src="/static/logo.png" alt="SuperKids Preschool"
            class="shield-hero"
            style="width:clamp(280px,42vw,520px);height:auto;object-fit:contain;position:relative;z-index:1"
          />
          <div style="position:absolute;top:-14px;right:10px;font-size:1.6rem;animation:float 2s ease-in-out infinite;z-index:2">⭐</div>
          <div style="position:absolute;bottom:20px;left:-24px;font-size:1.3rem;animation:float 2.7s ease-in-out infinite 0.6s;z-index:2">✨</div>
          <div style="position:absolute;top:38%;right:-28px;font-size:1.8rem;animation:float 3.2s ease-in-out infinite 1.2s;z-index:2">💫</div>
          <div style="position:absolute;bottom:-10px;right:30px;font-size:1.1rem;animation:float 2.4s ease-in-out infinite 0.3s;z-index:2">🌟</div>
        </div>
      </div>
    </div>

    <div style="position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);animation:float 2s ease-in-out infinite;color:#0F2050;text-align:center;opacity:0.6">
      <div style="font-size:0.75rem;letter-spacing:2px;margin-bottom:4px;text-transform:uppercase">Scroll</div>
      <i class="fas fa-chevron-down"></i>
    </div>
  </section>

  <!-- WHY SUPERKIDS -->
  <section style="padding:6rem 0;background:#F8F9FB">
    <div class="max-w-7xl mx-auto px-4">
      <div class="text-center mb-14 fade-in">
        <div class="badge mb-4" style="background:#E8EDF5;color:#0F2050;border:1px solid #0F205033">Why Choose Us</div>
        <div class="section-accent" style="margin:0 auto 1rem"></div>
        <h2 class="section-title" style="color:#0F2050">Why SuperKids?</h2>
        <p style="color:#6B7A9D;margin-top:1rem;max-width:600px;margin-left:auto;margin-right:auto;line-height:1.8">We don't just teach — we inspire little superheroes to become the best versions of themselves.</p>
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
            <div style="font-size:2.8rem;margin-bottom:1rem">${f.icon}</div>
            <h3 style="font-family:'Playfair Display',serif;font-size:1.2rem;color:#0F1E3D;font-weight:700;margin-bottom:0.75rem">${f.title}</h3>
            <p style="color:#6B7A9D;line-height:1.7;font-size:0.95rem">${f.desc}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- STATS BAR -->
  <section style="padding:4.5rem 0;background:linear-gradient(135deg,#0F2050,#1AA6CA)">
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
            <div class="stat-number counter" data-target="${s.n}" data-suffix="${s.suffix}" style="color:#E8B020">0${s.suffix}</div>
            <div style="color:rgba(255,255,255,0.85);font-size:0.9rem;font-weight:600;margin-top:4px">${s.label}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- PROGRAMS PREVIEW -->
  <section style="padding:6rem 0;background:#ffffff">
    <div class="max-w-7xl mx-auto px-4">
      <div class="text-center mb-14 fade-in">
        <div class="badge mb-4" style="background:#FEF8F0;color:#C4893A;border:1px solid #C4893A33">Programs</div>
        <div class="section-accent" style="margin:0 auto 1rem"></div>
        <h2 class="section-title" style="color:#C4893A">Our Super Programs</h2>
        <p style="color:#6B7A9D;margin-top:1rem;max-width:600px;margin-left:auto;margin-right:auto;line-height:1.8">Age-tailored programs designed to develop every aspect of your child's superpowers.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${[
          {emoji:'🍼', age:'1–2 Years', title:'Toddler Titans', color:'#0F2050', desc:'Sensory play, motor skills & first friendships in a loving environment.'},
          {emoji:'🦁', age:'2–3 Years', title:'Mini Heroes', color:'#C4893A', desc:'Language explosion, creativity, and social skills through guided play.'},
          {emoji:'⭐', age:'3–4 Years', title:'Super Stars', color:'#E8B020', desc:'Pre-literacy, numeracy, science exploration and team activities.'},
          {emoji:'🚀', age:'4–5 Years', title:'Power Rangers', color:'#1AA6CA', desc:'School-readiness program with advanced learning and leadership skills.'},
        ].map(p => `
          <div class="card fade-in text-center">
            <div style="font-size:2.8rem;margin-bottom:1rem">${p.emoji}</div>
            <div class="badge mb-2" style="background:${p.color}18;color:${p.color};border:1px solid ${p.color}33">${p.age}</div>
            <h3 style="font-family:'Playfair Display',serif;font-size:1.3rem;color:${p.color};font-weight:700;margin:0.75rem 0">${p.title}</h3>
            <p style="color:#6B7A9D;font-size:0.9rem;line-height:1.7">${p.desc}</p>
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
  <section style="padding:6rem 0;background:#F8F9FB">
    <div class="max-w-7xl mx-auto px-4">
      <div class="text-center mb-14 fade-in">
        <div class="badge mb-4" style="background:#FEF7E0;color:#E8B020;border:1px solid #E8B02033">Testimonials</div>
        <div class="section-accent" style="margin:0 auto 1rem"></div>
        <h2 class="section-title" style="color:#E8B020">What Super Parents Say</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${[
          {name:'Sarah M.', child:'Mom of Ethan, age 4', text:'SuperKids completely transformed my son! He went from being shy to the most confident kid in his kindergarten class. The teachers are absolute superheroes!', stars:5},
          {name:'David & Lisa K.', child:'Parents of twins, age 3', text:'Both our twins absolutely LOVE going to school every day! The curriculum is incredible — they\'re learning to read at 3! Best decision we ever made.', stars:5},
          {name:'Maria R.', child:'Mom of Sofia, age 2', text:'From day 1, Sofia felt safe and loved. The staff is incredibly professional and caring. I can\'t imagine sending her anywhere else. 10/10!', stars:5},
        ].map(t => `
          <div class="testimonial-card fade-in">
            <div class="flex gap-1 mb-4">
              ${Array(t.stars).fill('<span style="color:#E8B020">★</span>').join('')}
            </div>
            <p style="color:#2A3B60;line-height:1.8;font-size:0.95rem;margin-bottom:1.5rem;font-style:italic">"${t.text}"</p>
            <div class="flex items-center gap-3">
              <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#0F2050,#1AA6CA);display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:900;color:#fff;flex-shrink:0">
                ${t.name.charAt(0)}
              </div>
              <div>
                <div style="font-weight:800;color:#0F1E3D">${t.name}</div>
                <div style="color:#6B7A9D;font-size:0.85rem">${t.child}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section style="padding:6rem 0;background:linear-gradient(135deg,#E8EDF5,#FEF8F0);position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(15,32,80,0.05),rgba(196,137,58,0.03) 50%,transparent 70%)"></div>
    <div class="max-w-3xl mx-auto px-4 text-center" style="position:relative;z-index:1">
      <div style="font-size:3.5rem;margin-bottom:1rem;animation:float 3s ease-in-out infinite">🦸</div>
      <div class="section-accent" style="margin:0 auto 1rem"></div>
      <h2 style="font-family:'Playfair Display',serif;font-size:clamp(2.2rem,5vw,3.5rem);color:#0F1E3D;font-weight:800;margin-bottom:1rem">
        Ready to Join the <span style="color:#0F2050">SuperKids</span> <span style="color:#C4893A">Family?</span>
      </h2>
      <p style="color:#6B7A9D;font-size:1.1rem;line-height:1.8;margin-bottom:2.5rem">
        Limited spots available for 2025! Schedule a tour today and discover why hundreds of families
        trust SuperKids Preschool to nurture their little heroes.
      </p>
      <div class="flex flex-wrap gap-4 justify-center">
        <a href="/contact" class="btn-primary">
          <i class="fas fa-star mr-2"></i>Schedule a Tour
        </a>
        <a href="/about" class="btn-secondary">Learn About Us</a>
      </div>
    </div>
  </section>

  ${Footer()}
  `
  return c.html(Layout({ children: content, title: 'SuperKids India Preschool - Unleash Your Child\'s Inner Hero!' }))
})

// ================================================================
// ABOUT PAGE
// ================================================================
app.get('/about', (c) => {
  const content = `
  ${Navbar('about')}

  <section style="padding:6rem 0 4rem;background:linear-gradient(135deg,#E8EDF5,#FEF8F0);position:relative;overflow:hidden">
    <div style="position:absolute;top:20%;left:5%;font-family:'Nunito',sans-serif;font-size:0.9rem;color:#C4893A;opacity:0.35;animation:float 3s ease-in-out infinite;font-weight:800">Excellence</div>
    <div style="position:absolute;top:30%;right:8%;font-family:'Nunito',sans-serif;font-size:0.8rem;color:#1AA6CA;opacity:0.35;animation:float 2.5s ease-in-out infinite 1s;font-weight:800">Inspire</div>
    <div class="max-w-4xl mx-auto px-4 text-center">
      <div class="badge mb-4" style="background:#E8EDF5;color:#0F2050;border:1px solid #0F205033">Our Story</div>
      <div class="section-accent" style="margin:0 auto 1rem"></div>
      <h1 class="section-title" style="color:#0F2050;font-size:clamp(2.3rem,5.5vw,4rem)">About SuperKids</h1>
      <p style="color:#6B7A9D;font-size:1.1rem;line-height:1.8;margin-top:1.5rem">
        Born from a passion to empower every child, SuperKids India Preschool has been the leading superhero learning hub for over 15 years.
      </p>
    </div>
  </section>

  <!-- Mission & Vision -->
  <section style="padding:5rem 0;background:#ffffff">
    <div class="max-w-7xl mx-auto px-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div class="fade-in">
          <div class="badge mb-4" style="background:#FEF8F0;color:#C4893A;border:1px solid #C4893A33">Our Mission</div>
          <div class="section-accent"></div>
          <h2 style="font-family:'Playfair Display',serif;font-size:2.3rem;color:#C4893A;font-weight:800;margin-bottom:1.5rem">Our Heroic Mission</h2>
          <p style="color:#2A3B60;line-height:1.9;font-size:1rem;margin-bottom:1.5rem">
            At SuperKids Preschool, our mission is simple: <strong style="color:#0F2050">to unlock the superhero within every child.</strong>
            We believe that when children feel safe, loved, and inspired, there are no limits to what they can achieve.
          </p>
          <p style="color:#2A3B60;line-height:1.9;font-size:1rem;margin-bottom:2rem">
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
                <div style="font-weight:800;color:#0F1E3D;font-size:0.9rem;margin-bottom:0.25rem">${v.title}</div>
                <div style="color:#6B7A9D;font-size:0.8rem">${v.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="fade-in flex justify-center">
          <div style="position:relative;width:350px;height:350px">
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:130px;height:130px;border-radius:50%;background:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(15,32,80,0.18);z-index:10;border:3px solid #C4893A;overflow:hidden">
              <img src="/static/logo.png" alt="SuperKids" style="width:120px;height:120px;object-fit:contain"/>
            </div>
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
                <div style="position:absolute;left:${x}px;top:${y}px;width:60px;height:60px;border-radius:50%;background:#E8EDF5;border:2px solid #0F205044;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.2rem;box-shadow:0 2px 8px rgba(15,32,80,0.1)">
                  ${o.emoji}
                  <span style="font-size:0.5rem;color:#0F2050;margin-top:2px;font-weight:700">${o.label}</span>
                </div>
              `
            }).join('')}
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:260px;height:260px;border-radius:50%;border:1px dashed #C4893A44"></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="divider" style="max-width:1200px;margin:0 auto"></div>

  <!-- TIMELINE -->
  <section style="padding:4rem 0;background:#F8F9FB">
    <div class="max-w-4xl mx-auto px-4">
      <div class="text-center mb-10 fade-in">
        <div class="section-accent" style="margin:0 auto 1rem"></div>
        <h2 class="section-title" style="color:#E8B020">Our Hero's Journey</h2>
      </div>
      <div class="flex flex-col gap-0">
        ${[
          {year:'2009', event:'SuperKids Preschool founded by Dr. Amanda Powers with a vision to revolutionize early childhood education.', color:'#0F2050'},
          {year:'2011', event:'Expanded to two classrooms after overwhelming demand. Introduced our signature STEAM superhero curriculum.', color:'#C4893A'},
          {year:'2014', event:'Received "Best Preschool in Bhosari" award for 3 consecutive years. Opened our outdoor "Hero Training Grounds."', color:'#E8B020'},
          {year:'2017', event:'Launched SuperKids Parent App — giving parents real-time insights into their child\'s learning journey.', color:'#0F2050'},
          {year:'2020', event:'Adapted seamlessly during challenging times, offering hybrid learning while maintaining safety and quality.', color:'#1AA6CA'},
          {year:'2023', event:'Opened our new 5,000 sq ft SuperHQ facility with state-of-the-art classrooms, sensory rooms, and a rooftop garden.', color:'#C4893A'},
          {year:'2025', event:'Celebrating 500+ alumni who are now thriving in schools across the region — our legacy of little superheroes!', color:'#0F2050'},
        ].map((t, i) => `
          <div class="flex gap-6 fade-in" style="position:relative;padding-bottom:2rem">
            <div class="flex flex-col items-center">
              <div class="timeline-dot" style="background:${t.color};box-shadow:0 0 0 4px ${t.color}22;margin-top:6px"></div>
              ${i < 6 ? `<div style="width:2px;flex:1;background:linear-gradient(180deg,${t.color}44,transparent);margin-top:4px"></div>` : ''}
            </div>
            <div class="card" style="flex:1;padding:1.25rem;margin-bottom:0;border-color:${t.color}33">
              <div style="font-family:'Playfair Display',serif;font-size:1.2rem;color:${t.color};margin-bottom:0.5rem;font-weight:700">${t.year}</div>
              <p style="color:#2A3B60;font-size:0.95rem;line-height:1.7">${t.event}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- TEAM -->
  <section style="padding:5rem 0;background:#ffffff">
    <div class="max-w-7xl mx-auto px-4">
      <div class="text-center mb-12 fade-in">
        <div class="badge mb-4" style="background:#E8EDF5;color:#0F2050;border:1px solid #0F205033">Meet The Team</div>
        <div class="section-accent" style="margin:0 auto 1rem"></div>
        <h2 class="section-title" style="color:#0F2050">Our Super Educators</h2>
        <p style="color:#6B7A9D;margin-top:1rem">A dream team of certified, passionate educators dedicated to your child's success.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${[
          {emoji:'👩‍🏫', name:'Dr. Amanda Powers', role:'Founder & Director', exp:'15+ yrs', color:'#0F2050', cert:'PhD Child Development'},
          {emoji:'🦸‍♀️', name:'Ms. Rachel Storm', role:'Lead Educator (Toddlers)', exp:'8 yrs', color:'#C4893A', cert:'ECE Certified'},
          {emoji:'🧑‍🎨', name:'Mr. Carlos Bright', role:'Creative Arts Director', exp:'10 yrs', color:'#E8B020', cert:'Arts Education MA'},
          {emoji:'👩‍💻', name:'Ms. Priya Nova', role:'STEAM Coordinator', exp:'6 yrs', color:'#1AA6CA', cert:'STEM Specialist'},
        ].map(t => `
          <div class="card fade-in text-center">
            <div class="teacher-avatar" style="border-color:${t.color};box-shadow:0 0 0 6px ${t.color}18">${t.emoji}</div>
            <h3 style="font-weight:800;color:#0F1E3D;margin-bottom:0.25rem">${t.name}</h3>
            <p style="color:${t.color};font-size:0.85rem;font-weight:700;margin-bottom:0.5rem">${t.role}</p>
            <div class="badge mb-2" style="background:${t.color}18;color:${t.color};border:1px solid ${t.color}33;font-size:0.7rem">${t.cert}</div>
            <p style="color:#6B7A9D;font-size:0.8rem">${t.exp} experience</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  ${Footer()}
  `
  return c.html(Layout({ children: content, title: 'About - SuperKids India Preschool' }))
})

// ================================================================
// PROGRAMS PAGE
// ================================================================
app.get('/programs', (c) => {
  const content = `
  ${Navbar('programs')}

  <section style="padding:6rem 0 4rem;background:linear-gradient(135deg,#FEF8F0,#E8EDF5);position:relative;overflow:hidden">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <div class="badge mb-4" style="background:#FEF8F0;color:#C4893A;border:1px solid #C4893A33">Learning Programs</div>
      <div class="section-accent" style="margin:0 auto 1rem"></div>
      <h1 class="section-title" style="color:#C4893A;font-size:clamp(2.3rem,5.5vw,4rem)">Our Programs</h1>
      <p style="color:#6B7A9D;font-size:1.1rem;line-height:1.8;margin-top:1.5rem;max-width:600px;margin-left:auto;margin-right:auto">
        Carefully crafted programs that meet your child exactly where they are — and take them beyond where they dreamed they could be.
      </p>
    </div>
  </section>

  <section style="padding:2rem 0;background:#ffffff;border-bottom:1.5px solid #DCE1EF">
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
            style="padding:10px 20px;border-radius:50px;border:2px solid #DCE1EF;background:${i===0?'#0F2050':'transparent'};color:${i===0?'#ffffff':'#2A3B60'};font-weight:700;font-size:0.9rem;cursor:pointer;transition:all 0.3s">
            ${t.emoji} ${t.label}
          </button>
        `).join('')}
      </div>
    </div>
  </section>

  <section style="padding:5rem 0;background:#F8F9FB">
    <div class="max-w-7xl mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        ${[
          {id:'toddler', emoji:'🍼', age:'1–2 Years', title:'Toddler Titans', color:'#0F2050',
           features:['Sensory play stations','Music & movement','Language development','Social bonding','Motor skills development','Naptime & care routines'],
           desc:'A warm, nurturing environment where our youngest heroes take their first steps toward discovery. Our Toddler Titans program focuses on sensory exploration, attachment security, and joyful play-based learning.', time:'Half Day | Full Day'},
          {id:'mini', emoji:'🦁', age:'2–3 Years', title:'Mini Heroes', color:'#C4893A',
           features:['Potty training support','Early reading readiness','Imaginative play','Art exploration','Outdoor adventures','Circle time & stories'],
           desc:'Mini Heroes is where personalities explode! This program harnesses the natural curiosity of 2-3 year olds through structured play, creative expression, and early literacy foundations.', time:'Half Day | Full Day'},
          {id:'stars', emoji:'⭐', age:'3–4 Years', title:'Super Stars', color:'#E8B020',
           features:['Pre-reading & writing','Basic math concepts','Science experiments','Team projects','Drama & performance','Problem-solving games'],
           desc:'Our Super Stars program is where academic foundations are laid with excitement and enthusiasm. Children engage in STEAM projects, collaborative learning, and begin their journey toward school readiness.', time:'Half Day | Full Day'},
          {id:'power', emoji:'🚀', age:'4–5 Years', title:'Power Rangers', color:'#1AA6CA',
           features:['Advanced literacy','Math & logic','Science projects','Leadership skills','Digital literacy','Kindergarten prep'],
           desc:'The most advanced program, Power Rangers prepares children for their next great adventure: kindergarten! With a rich academic curriculum and leadership development, these children graduate ready to conquer the world.', time:'Full Day Program'},
          {id:'after', emoji:'🎮', age:'5+ Years', title:'After School Heroes', color:'#C4893A',
           features:['Homework help','STEM workshops','Sports & fitness','Arts & crafts','Cooking classes','Club activities'],
           desc:'Our After School program provides a safe, fun, and stimulating environment for school-age children to unwind, learn new skills, and build friendships after their school day.', time:'2:30 PM – 6:00 PM'},
          {id:'after', emoji:'☀️', age:'All Ages', title:'Summer Super Camp', color:'#E8B020',
           features:['Themed weekly adventures','Swimming lessons','Field trips','Science fairs','Art workshops','Superhero Olympics'],
           desc:'When school\'s out, the adventure begins! Our Summer Super Camp is packed with themed weeks, outdoor adventures, educational field trips, and unforgettable superhero experiences.', time:'June – August'},
        ].map(p => `
          <div class="card fade-in" style="border-color:${p.color}33;position:relative;overflow:visible">
            <div style="position:absolute;top:-15px;right:20px;background:${p.color};color:#ffffff;font-family:'Nunito',sans-serif;font-size:0.85rem;font-weight:800;letter-spacing:1px;padding:4px 16px;border-radius:20px">${p.age}</div>
            <div style="font-size:2.8rem;margin-bottom:1rem">${p.emoji}</div>
            <h3 style="font-family:'Playfair Display',serif;font-size:1.6rem;color:${p.color};font-weight:700;margin-bottom:0.5rem">${p.title}</h3>
            <div class="flex items-center gap-2 mb-3">
              <i class="fas fa-clock" style="color:${p.color};font-size:0.8rem"></i>
              <span style="color:#6B7A9D;font-size:0.85rem">${p.time}</span>
            </div>
            <p style="color:#2A3B60;font-size:0.9rem;line-height:1.7;margin-bottom:1.5rem">${p.desc}</p>
            <div class="grid grid-cols-2 gap-2 mb-4">
              ${p.features.map(f => `
                <div class="flex items-center gap-2" style="font-size:0.85rem;color:#2A3B60">
                  <i class="fas fa-check-circle" style="color:${p.color};font-size:0.8rem;flex-shrink:0"></i>${f}
                </div>
              `).join('')}
            </div>
            <a href="/contact" class="btn-primary" style="display:block;text-align:center;font-size:0.9rem;padding:12px">
              Enroll in This Program
            </a>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- Daily Schedule -->
  <section style="padding:5rem 0;background:#ffffff">
    <div class="max-w-4xl mx-auto px-4">
      <div class="text-center mb-10 fade-in">
        <div class="section-accent" style="margin:0 auto 1rem"></div>
        <h2 class="section-title" style="color:#E8B020">A Super Day at SuperKids</h2>
        <p style="color:#6B7A9D;margin-top:1rem">Every day is a new adventure! Here's a typical day in our SuperKids universe.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${[
          {time:'7:00 AM', activity:'Super Arrival & Free Play', emoji:'🌅', color:'#0F2050'},
          {time:'8:00 AM', activity:'Morning Circle & Calendar', emoji:'📅', color:'#C4893A'},
          {time:'8:30 AM', activity:'Superhero Breakfast', emoji:'🥞', color:'#E8B020'},
          {time:'9:00 AM', activity:'Learning Centers & STEAM', emoji:'🔬', color:'#1AA6CA'},
          {time:'10:30 AM', activity:'Outdoor Hero Training', emoji:'🌳', color:'#0F2050'},
          {time:'11:30 AM', activity:'Creative Arts & Music', emoji:'🎨', color:'#C4893A'},
          {time:'12:00 PM', activity:'Super Lunch Time', emoji:'🥗', color:'#E8B020'},
          {time:'12:30 PM', activity:'Rest & Quiet Time', emoji:'😴', color:'#1AA6CA'},
          {time:'2:00 PM', activity:'Story Time & Reading', emoji:'📚', color:'#0F2050'},
          {time:'3:00 PM', activity:'Afternoon Snack', emoji:'🍎', color:'#C4893A'},
          {time:'3:30 PM', activity:'Science & Discovery', emoji:'🧪', color:'#E8B020'},
          {time:'5:00 PM', activity:'Wind Down & Pickup', emoji:'🌟', color:'#1AA6CA'},
        ].map(s => `
          <div class="flex items-center gap-4 card fade-in" style="padding:1rem;border-color:${s.color}22">
            <div style="font-size:1.5rem">${s.emoji}</div>
            <div>
              <div style="font-family:'Playfair Display',serif;color:${s.color};font-size:0.95rem;font-weight:700">${s.time}</div>
              <div style="color:#2A3B60;font-size:0.9rem">${s.activity}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- Fee Enquiry -->
  <section style="padding:4rem 0;background:#F8F9FB">
    <div class="max-w-3xl mx-auto px-4 text-center fade-in">
      <div class="card" style="border-color:#0F205033;padding:3rem">
        <div style="font-size:2.8rem;margin-bottom:1rem">📞</div>
        <div class="section-accent" style="margin:0 auto 1rem"></div>
        <h2 style="font-family:'Playfair Display',serif;font-size:2rem;color:#0F2050;font-weight:800;margin-bottom:1rem">Enquire About Fees</h2>
        <p style="color:#6B7A9D;font-size:1rem;line-height:1.8;margin-bottom:2rem">For fee details and admissions, please get in touch with us directly. We'd love to have your little superhero join our family!</p>
        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <a href="tel:+919822977644" class="btn-primary" style="display:inline-flex;align-items:center;justify-content:center;gap:8px">
            <i class="fas fa-phone"></i> (+91) 9822-977-644
          </a>
          <a href="tel:+919822977944" class="btn-primary" style="display:inline-flex;align-items:center;justify-content:center;gap:8px">
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
  return c.html(Layout({ children: content, title: 'Programs - SuperKids India Preschool' }))
})

// ================================================================
// GALLERY PAGE
// ================================================================
app.get('/gallery', (c) => {
  const content = `
  ${Navbar('gallery')}

  <section style="padding:5rem 0 3rem;background:linear-gradient(135deg,#0F2050 0%,#1AA6CA 100%);position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2220%22 cy=%2220%22 r=%2215%22 fill=%22rgba(255,255,255,0.04)%22/><circle cx=%2280%22 cy=%2270%22 r=%2225%22 fill=%22rgba(255,255,255,0.03)%22/><circle cx=%2260%22 cy=%2215%22 r=%228%22 fill=%22rgba(255,255,255,0.05)%22/></svg>') center/cover"></div>
    <div class="max-w-4xl mx-auto px-4 text-center" style="position:relative">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:6px 18px;border-radius:50px;font-size:0.8rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:1.2rem">Our Gallery</div>
      <h1 style="font-family:'Playfair Display',serif;font-size:clamp(2.2rem,5vw,3.5rem);font-weight:800;color:#fff;margin-bottom:1rem;line-height:1.2">Super Moments</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:1.05rem;line-height:1.8;max-width:560px;margin:0 auto 1.5rem">
        A glimpse into the magical, learning-filled world of SuperKids India Preschool.
      </p>
      <div id="gal-stat" style="color:rgba(255,255,255,0.7);font-size:0.9rem">
        <i class="fas fa-spinner fa-spin" style="margin-right:6px"></i>Loading gallery…
      </div>
    </div>
  </section>

  <section style="padding:2.5rem 0 5rem;background:#F8F9FB">
    <div class="max-w-7xl mx-auto px-4">

      <!-- Status / debug banner (hidden by default, shown if error) -->
      <div id="gal-error-bar" style="display:none;background:#fee2e2;color:#991b1b;padding:12px 16px;border-radius:10px;margin-bottom:20px;font-size:14px;border:1px solid #fca5a5"></div>

      <!-- Photo grid -->
      <div id="pub-gallery-grid" style="columns:2;gap:12px;column-fill:balance">
        <div style="break-inside:avoid;text-align:center;padding:80px 20px;color:#6B7A9D;background:#fff;border-radius:14px">
          <i class="fas fa-spinner fa-spin" style="font-size:2.5rem;display:block;margin-bottom:1rem;color:#DCE1EF"></i>
          Loading photos…
        </div>
      </div>

      <!-- Video section -->
      <div id="pub-video-section" style="display:none;margin-top:4rem">
        <div class="text-center mb-8">
          <div class="section-accent" style="margin:0 auto 1rem"></div>
          <h2 style="font-family:'Playfair Display',serif;font-size:2rem;color:#C4893A;font-weight:800">See SuperKids In Action</h2>
        </div>
        <div id="pub-gallery-videos" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px"></div>
      </div>

    </div>
  </section>

  <!-- Lightbox overlay -->
  <div id="pub-lightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)closePubLightbox()">
    <button onclick="navPubLightbox(-1)" style="position:fixed;left:12px;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);color:#fff;font-size:18px;cursor:pointer;z-index:10000;transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">&#8249;</button>
    <button onclick="navPubLightbox(1)" style="position:fixed;right:12px;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);color:#fff;font-size:18px;cursor:pointer;z-index:10000;transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">&#8250;</button>
    <button onclick="closePubLightbox()" style="position:fixed;top:16px;right:16px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:20px;cursor:pointer;z-index:10000">&#x2715;</button>
    <div id="pub-lightbox-inner" style="max-width:900px;width:100%;max-height:90vh;display:flex;flex-direction:column;align-items:center">
      <img id="pub-lightbox-img" src="" alt="" style="max-width:100%;max-height:75vh;object-fit:contain;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,0.5)">
      <div id="pub-lightbox-info" style="margin-top:14px;text-align:center;color:#fff;max-width:600px"></div>
      <div id="pub-lightbox-counter" style="margin-top:8px;color:rgba(255,255,255,0.5);font-size:13px"></div>
    </div>
  </div>

  <script>
(function(){
  var _photos = [];
  var _lbIdx = 0;

  function imgCard(p, idx) {
    var src = p.imageData || '';
    return '<div data-idx="'+idx+'" style="break-inside:avoid;margin-bottom:12px;border-radius:12px;overflow:hidden;cursor:pointer;position:relative;background:#e2e8f0;box-shadow:0 2px 10px rgba(15,32,80,0.08);transition:transform 0.2s,box-shadow 0.2s" onclick="openPubLightbox('+idx+')" onmouseover="this.style.transform=\'scale(1.02)\';this.style.boxShadow=\'0 8px 24px rgba(15,32,80,0.18)\'" onmouseout="this.style.transform=\'scale(1)\';this.style.boxShadow=\'0 2px 10px rgba(15,32,80,0.08)\'">'
      + '<img src="'+src+'" alt="'+p.title+'" loading="lazy" style="width:100%;height:auto;display:block;min-height:120px;background:#e2e8f0"'
      + ' onerror="this.onerror=null;this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">'
      + '<div style="display:none;min-height:160px;background:linear-gradient(135deg,#E8EDF5,#E8F7FC);align-items:center;justify-content:center;flex-direction:column;gap:8px;padding:20px">'
      + '<i class="fas fa-image" style="font-size:2rem;color:#94a3b8"></i>'
      + '<span style="font-size:11px;color:#94a3b8;text-align:center">'+p.title+'</span>'
      + '</div>'
      + '<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(15,32,80,0.6) 0%,transparent 50%);opacity:0;transition:opacity 0.2s" class="gal-hover-overlay"></div>'
      + '<div style="position:absolute;bottom:0;left:0;right:0;padding:10px 12px;color:#fff;font-size:12px;font-weight:700;opacity:0;transition:opacity 0.2s" class="gal-hover-label">'+p.title+'</div>'
      + '</div>';
  }

  function renderItems(items, debug) {
    var grid = document.getElementById('pub-gallery-grid');
    var stat = document.getElementById('gal-stat');
    var errBar = document.getElementById('gal-error-bar');
    _photos = items.filter(function(i){ return i.type !== 'video'; });
    var videos = items.filter(function(i){ return i.type === 'video'; });

    if(stat) stat.innerHTML = _photos.length + ' photo' + (_photos.length!==1?'s':'') + (videos.length ? ' &amp; '+videos.length+' video'+(videos.length!==1?'s':'') : '') + ' in gallery';

    if(debug && debug.r2Error) {
      if(errBar){ errBar.style.display='block'; errBar.textContent='R2 listing error: '+debug.r2Error+'. Photos uploaded via admin panel will still appear after sync.'; }
    }

    if(!_photos.length) {
      grid.style.columns = '';
      grid.innerHTML = '<div style="text-align:center;padding:80px 20px;color:#6B7A9D;background:#fff;border-radius:14px;border:2px dashed #DCE1EF">'
        + '<i class="fas fa-images" style="font-size:3.5rem;display:block;margin-bottom:1rem;color:#DCE1EF"></i>'
        + '<h3 style="font-size:1.2rem;font-weight:700;color:#0F1E3D;margin-bottom:8px">No Photos Yet</h3>'
        + '<p style="color:#6B7A9D;font-size:0.9rem">Activity photos will appear here once uploaded by the school.</p>'
        + (debug ? '<p style="margin-top:12px;font-size:11px;color:#94a3b8">D1: '+debug.d1Count+' items · R2: '+debug.r2Count+' items'+(debug.r2Error?' · R2 error: '+debug.r2Error:'')+'</p>' : '')
        + '</div>';
      return;
    }

    // Masonry-style columns — 2 cols on mobile, 3 on tablet, 4 on desktop
    grid.style.cssText = 'column-count:2;column-gap:12px';
    grid.innerHTML = _photos.map(function(p,i){ return imgCard(p,i); }).join('');

    // Hover overlay effect via CSS would be cleaner but we wire it inline
    grid.querySelectorAll('[data-idx]').forEach(function(el){
      el.addEventListener('mouseover',function(){
        var ov=el.querySelector('.gal-hover-overlay');
        var lb=el.querySelector('.gal-hover-label');
        if(ov) ov.style.opacity='1';
        if(lb) lb.style.opacity='1';
      });
      el.addEventListener('mouseout',function(){
        var ov=el.querySelector('.gal-hover-overlay');
        var lb=el.querySelector('.gal-hover-label');
        if(ov) ov.style.opacity='0';
        if(lb) lb.style.opacity='0';
      });
    });

    // Responsive columns
    function setColumns(){
      var w=window.innerWidth;
      grid.style.columnCount = w>=1024?'4': w>=768?'3':'2';
    }
    setColumns();
    window.addEventListener('resize',setColumns);

    // Videos
    var vidSec = document.getElementById('pub-video-section');
    var vidGrid = document.getElementById('pub-gallery-videos');
    if(!videos.length){ if(vidSec) vidSec.style.display='none'; return; }
    if(vidSec) vidSec.style.display='';
    if(vidGrid) vidGrid.innerHTML = videos.map(function(v){
      var thumb = v.thumbnail || 'https://img.youtube.com/vi/'+(v.youtubeId||'')+'/hqdefault.jpg';
      return '<div style="border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(15,32,80,0.08);cursor:pointer" onclick="openPubVideoLightbox(\''+v.youtubeId+'\')">'
        +'<div style="position:relative"><img src="'+thumb+'" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block" loading="lazy" alt="'+v.title+'">'
        +'<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.25)">'
        +'<div style="width:56px;height:56px;background:rgba(196,137,58,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center">'
        +'<i class="fas fa-play" style="color:#fff;font-size:1.2rem;margin-left:3px"></i></div></div></div>'
        +'<div style="padding:14px"><h4 style="font-weight:800;color:#0F1E3D;margin-bottom:6px;font-size:15px">'+v.title+'</h4>'
        +(v.description?'<p style="color:#6B7A9D;font-size:13px;margin:0">'+v.description+'</p>':'')+'</div></div>';
    }).join('');
  }

  window.openPubLightbox = function(idx){
    if(!_photos.length) return;
    _lbIdx = Math.max(0,Math.min(idx,_photos.length-1));
    showLightboxPhoto();
    document.getElementById('pub-lightbox').style.display='flex';
    document.body.style.overflow='hidden';
  };

  function showLightboxPhoto(){
    var p = _photos[_lbIdx];
    if(!p) return;
    var img = document.getElementById('pub-lightbox-img');
    var info = document.getElementById('pub-lightbox-info');
    var counter = document.getElementById('pub-lightbox-counter');
    img.src = p.imageData || '';
    img.alt = p.title;
    info.innerHTML = '<div style="font-weight:800;font-size:1.05rem;margin-bottom:4px">'+p.title+'</div>'
      +(p.description?'<div style="font-size:0.88rem;color:rgba(255,255,255,0.7);margin-bottom:4px">'+p.description+'</div>':'')
      +'<div style="font-size:0.8rem;color:rgba(255,255,255,0.5)">'+p.date+'</div>';
    counter.textContent = (_lbIdx+1)+' / '+_photos.length;
  }

  window.navPubLightbox = function(dir){
    _lbIdx = (_lbIdx + dir + _photos.length) % _photos.length;
    showLightboxPhoto();
  };

  window.closePubLightbox = function(){
    document.getElementById('pub-lightbox').style.display='none';
    document.body.style.overflow='';
  };

  document.addEventListener('keydown',function(e){
    var lb=document.getElementById('pub-lightbox');
    if(!lb||lb.style.display==='none') return;
    if(e.key==='ArrowLeft') navPubLightbox(-1);
    if(e.key==='ArrowRight') navPubLightbox(1);
    if(e.key==='Escape') closePubLightbox();
  });

  window.openPubVideoLightbox = function(ytId){
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    ov.innerHTML='<div style="background:#000;border-radius:16px;max-width:900px;width:100%;position:relative">'
      +'<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:16px">'
      +'<iframe src="https://www.youtube.com/embed/'+ytId+'?autoplay=1&rel=0" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>'
      +'</div>'
      +'<button onclick="this.closest(\'div\').parentNode.remove()" style="position:absolute;top:-14px;right:-14px;width:36px;height:36px;border-radius:50%;background:#C4893A;border:none;color:#fff;cursor:pointer;font-size:18px;box-shadow:0 4px 12px rgba(0,0,0,0.4)">&#x2715;</button>'
      +'</div>';
    document.body.appendChild(ov);
  };

  // Load gallery data
  var stat = document.getElementById('gal-stat');
  fetch('/api/gallery?t='+Date.now())
    .then(function(r){ return r.ok ? r.json() : {items:[],_debug:{error:'HTTP '+r.status}}; })
    .then(function(d){
      renderItems(d.items||[], d._debug);
    })
    .catch(function(e){
      if(stat) stat.textContent = 'Failed to load gallery';
      var grid=document.getElementById('pub-gallery-grid');
      if(grid) grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px;color:#ef4444">Failed to load gallery: '+e.message+'</div>';
    });
})();
</script>

  <!-- Social CTA -->
  <section style="padding:4rem 0;background:linear-gradient(135deg,#E8EDF5,#FEF8F0)">
    <div class="max-w-3xl mx-auto px-4 text-center">
      <div class="section-accent" style="margin:0 auto 1rem"></div>
      <h2 style="font-family:'Playfair Display',serif;font-size:2.2rem;color:#0F1E3D;font-weight:800;margin-bottom:1rem">
        Follow Our Super Journey!
      </h2>
      <p style="color:#6B7A9D;margin-bottom:2rem">Join our community and see daily updates, super moments, and more!</p>
      <div class="flex flex-wrap justify-center gap-4">
        ${[
          {icon:'fab fa-instagram', label:'@superkidsindiapreschool', color:'#C4893A', url:'https://www.instagram.com/superkidsindiapreschool/'},
          {icon:'fab fa-facebook', label:'superkidsindiapreschool', color:'#0F2050', url:'https://www.facebook.com/superkidsindiapreschool/'},
          {icon:'fab fa-youtube', label:'SuperKidsIndiaPreschool', color:'#E8B020', url:'https://www.youtube.com/@SuperKidsIndiaPreschool'},
        ].map(s => `
          <a href="${s.url}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:12px 24px;border-radius:50px;border:2px solid ${s.color}44;background:${s.color}11;color:${s.color};text-decoration:none;font-weight:700;transition:all 0.3s"
            onmouseover="this.style.background='${s.color}22';this.style.boxShadow='0 4px 20px ${s.color}33'"
            onmouseout="this.style.background='${s.color}11';this.style.boxShadow='none'">
            <i class="${s.icon} text-xl"></i> ${s.label}
          </a>
        `).join('')}
      </div>
    </div>
  </section>

  ${Footer()}
  `
  return c.html(Layout({ children: content, title: 'Gallery - SuperKids India Preschool' }))
})

// ================================================================
// CONTACT PAGE
// ================================================================
app.get('/contact', (c) => {
  const content = `
  ${Navbar('contact')}

  <section style="padding:6rem 0 4rem;background:linear-gradient(135deg,#E8EDF5,#FEF7E0)">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <div class="badge mb-4" style="background:#E8EDF5;color:#0F2050;border:1px solid #0F205033">Contact & Enrollment</div>
      <div class="section-accent" style="margin:0 auto 1rem"></div>
      <h1 class="section-title" style="color:#0F2050;font-size:clamp(2.3rem,5.5vw,4rem)">Join The Family!</h1>
      <p style="color:#6B7A9D;font-size:1.1rem;line-height:1.8;margin-top:1.5rem;max-width:600px;margin-left:auto;margin-right:auto">
        Ready to enroll your little superhero? Schedule a tour, ask questions, or start your application today!
      </p>
    </div>
  </section>

  <section style="padding:4rem 0 6rem;background:#ffffff">
    <div class="max-w-7xl mx-auto px-4">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">

        <div class="lg:col-span-1 fade-in">
          <div class="section-accent"></div>
          <h2 style="font-family:'Playfair Display',serif;font-size:1.8rem;color:#0F2050;font-weight:800;margin-bottom:2rem">SuperHQ Location</h2>

          ${[
            {icon:'fa-map-marker-alt', color:'#C4893A', title:'Our Super HQ', content:'Super Kids Preschool, Matoshri Apartment,<br>Plot no 51, Sector no 10, Bhosari Pradhikaran<br>Pin: 411026'},
            {icon:'fa-phone-alt', color:'#0F2050', title:'Call the Hotline', content:'<a href="tel:+919822977644" style="color:#0F2050;text-decoration:none">(+91) 9822-977-644</a><br><a href="tel:+919822977944" style="color:#0F2050;text-decoration:none">(+91) 9822-977-944</a>'},
            {icon:'fa-envelope', color:'#E8B020', title:'Super Mail', content:'superkidsenrollment@gmail.com<br>superkidsprincipal@gmail.com'},
            {icon:'fa-clock', color:'#1AA6CA', title:'Super Hours', content:'Monday – Friday<br>7:00 AM – 6:00 PM'},
          ].map(info => `
            <div class="flex gap-4 mb-6">
              <div style="width:48px;height:48px;background:${info.color}15;border:1.5px solid ${info.color}33;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="fas ${info.icon}" style="color:${info.color}"></i>
              </div>
              <div>
                <div style="font-weight:800;color:#0F1E3D;margin-bottom:0.25rem">${info.title}</div>
                <div style="color:#6B7A9D;font-size:0.9rem;line-height:1.6">${info.content}</div>
              </div>
            </div>
          `).join('')}

          <div style="border-radius:16px;overflow:hidden;margin-top:2rem;border:1.5px solid #DCE1EF">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d477.8!2d73.832081!3d18.651444!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTjCsDM5JzA1LjIiTiA3M8KwNDknNTUuNSJF!5e0!3m2!1sen!2sin!4v1708000000000"
              width="100%" height="260" style="border:0;display:block" allowfullscreen="" loading="lazy"
              referrerpolicy="no-referrer-when-downgrade">
            </iframe>
            <div style="background:#F8F9FB;padding:10px 14px;display:flex;align-items:center;gap:8px;border-top:1px solid #DCE1EF">
              <i class="fas fa-map-marker-alt" style="color:#C4893A"></i>
              <a href="https://www.google.com/maps/place/18%C2%B039'05.2%22N+73%C2%B049'55.5%22E/@18.651213,73.8294641,17z" target="_blank" style="color:#0F2050;font-size:0.85rem;text-decoration:none;font-weight:700">Open in Google Maps ↗</a>
            </div>
          </div>

          <div class="card card-red mt-6" style="padding:1.5rem">
            <div class="flex items-center gap-3 mb-2">
              <i class="fas fa-shield-alt" style="color:#C4893A;font-size:1.2rem"></i>
              <span style="font-family:'Playfair Display',serif;color:#C4893A;font-weight:700">Emergency Line</span>
            </div>
            <p style="color:#6B7A9D;font-size:0.85rem">For urgent matters during school hours:<br>
              <a href="tel:+919822977644" style="color:#0F1E3D;font-weight:700;text-decoration:none">(+91) 9822-977-644</a> &nbsp;|&nbsp;
              <a href="tel:+919822977944" style="color:#0F1E3D;font-weight:700;text-decoration:none">(+91) 9822-977-944</a>
            </p>
          </div>
        </div>

        <!-- Enrollment Form -->
        <div class="lg:col-span-2 fade-in">
          <div class="card" style="border-color:#E8B02033;padding:2.5rem;position:relative;z-index:1">
            <div class="section-accent"></div>
            <h2 style="font-family:'Playfair Display',serif;font-size:1.8rem;color:#E8B020;font-weight:800;margin-bottom:0.5rem">
              Enrollment Application
            </h2>
            <p style="color:#6B7A9D;margin-bottom:2rem;font-size:0.95rem">Fill out this form and our team will contact you within 24 hours to schedule a tour!</p>

            <form id="enroll-form" onsubmit="handleSubmit(event)" style="display:flex;flex-direction:column;gap:1.5rem;position:relative;z-index:2">
              <input type="hidden" name="access_key" value="bd2e27b6-9cfe-4db2-8d56-9c002529d6bd" />
              <input type="hidden" name="subject" value="New SuperKids Enrollment Application!" />
              <input type="hidden" name="from_name" value="SuperKids Preschool Website" />
              <input type="hidden" name="redirect" value="false" />
              <input type="hidden" name="botcheck" value="" style="display:none" />

              <div>
                <h3 style="font-family:'Playfair Display',serif;color:#0F2050;margin-bottom:1rem;font-size:1.1rem;font-weight:700">
                  <i class="fas fa-user-tie mr-2"></i>Parent / Guardian Info
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label style="display:block;color:#2A3B60;font-size:0.85rem;font-weight:700;margin-bottom:6px">First Name *</label>
                    <input type="text" name="parent_first_name" required placeholder="Your first name" class="form-input" />
                  </div>
                  <div>
                    <label style="display:block;color:#2A3B60;font-size:0.85rem;font-weight:700;margin-bottom:6px">Last Name *</label>
                    <input type="text" name="parent_last_name" required placeholder="Your last name" class="form-input" />
                  </div>
                  <div>
                    <label style="display:block;color:#2A3B60;font-size:0.85rem;font-weight:700;margin-bottom:6px">Email Address *</label>
                    <input type="email" name="parent_email" required placeholder="your@email.com" class="form-input" />
                  </div>
                  <div>
                    <label style="display:block;color:#2A3B60;font-size:0.85rem;font-weight:700;margin-bottom:6px">Phone Number *</label>
                    <input type="tel" name="parent_phone" required placeholder="(+91) 98XXXXXXXX" class="form-input" />
                  </div>
                </div>
              </div>

              <div>
                <h3 style="font-family:'Playfair Display',serif;color:#C4893A;margin-bottom:1rem;font-size:1.1rem;font-weight:700">
                  <i class="fas fa-child mr-2"></i>Child Information
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label style="display:block;color:#2A3B60;font-size:0.85rem;font-weight:700;margin-bottom:6px">Child's Name *</label>
                    <input type="text" name="child_name" required placeholder="Your child's name" class="form-input" />
                  </div>
                  <div>
                    <label style="display:block;color:#2A3B60;font-size:0.85rem;font-weight:700;margin-bottom:6px">Date of Birth *</label>
                    <input type="date" name="child_dob" required class="form-input" />
                  </div>
                  <div>
                    <label style="display:block;color:#2A3B60;font-size:0.85rem;font-weight:700;margin-bottom:6px">Program of Interest *</label>
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
                    <label style="display:block;color:#2A3B60;font-size:0.85rem;font-weight:700;margin-bottom:6px">Preferred Start Date</label>
                    <input type="date" name="start_date" class="form-input" />
                  </div>
                </div>
              </div>

              <div>
                <label style="display:block;color:#2A3B60;font-size:0.85rem;font-weight:700;margin-bottom:10px">Schedule Preference</label>
                <div class="flex flex-wrap gap-3">
                  ${['Full-Time (5 days)', 'Part-Time (3 days)', 'Half Day', 'Full Day', 'Flexible'].map(opt => `
                    <label style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:50px;border:1.5px solid #DCE1EF;color:#2A3B60;font-size:0.85rem;font-weight:600;transition:all 0.3s;position:relative;z-index:2"
                      onmouseover="this.style.borderColor='#1AA6CA';this.style.color='#1AA6CA'"
                      onmouseout="this.style.borderColor='#DCE1EF';this.style.color='#2A3B60'">
                      <input type="checkbox" name="schedule" value="${opt}" style="accent-color:#1AA6CA;cursor:pointer"> ${opt}
                    </label>
                  `).join('')}
                </div>
              </div>

              <div>
                <label style="display:block;color:#2A3B60;font-size:0.85rem;font-weight:700;margin-bottom:6px">Message / Questions</label>
                <textarea name="message" rows="4" placeholder="Tell us about your child, any special needs, questions..." class="form-input" style="resize:vertical"></textarea>
              </div>

              <div>
                <label style="display:block;color:#2A3B60;font-size:0.85rem;font-weight:700;margin-bottom:6px">How Did You Hear About Us?</label>
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

              <button type="submit" id="submit-btn" class="btn-primary" style="font-size:1rem;padding:16px;position:relative;z-index:2">
                <i class="fas fa-rocket mr-2"></i>Submit Application
              </button>

              <div id="error-msg" style="display:none;background:rgba(196,137,58,0.08);border:1px solid rgba(196,137,58,0.4);border-radius:10px;padding:1rem;color:#9A6A25;font-size:0.9rem;text-align:center">
                <i class="fas fa-exclamation-triangle mr-2"></i>Something went wrong. Please try again or email us at <strong>superkidsenrollment@gmail.com</strong>
              </div>
            </form>

            <div id="success-msg" style="display:none;text-align:center;padding:3rem">
              <div style="font-size:3.5rem;margin-bottom:1rem">🦸</div>
              <div class="section-accent" style="margin:0 auto 1rem"></div>
              <h3 style="font-family:'Playfair Display',serif;font-size:2rem;color:#0F2050;font-weight:800">Application Received!</h3>
              <p style="color:#2A3B60;line-height:1.8;margin-top:1rem">
                Amazing! Your child is one step closer to becoming a SuperKid! Our enrollment team will
                contact you within <strong style="color:#E8B020">24 hours</strong> to schedule your tour.
              </p>
              <div class="badge mt-4" style="background:#E8EDF5;color:#0F2050;border:1px solid #0F205033;display:inline-block;padding:8px 20px">
                <i class="fas fa-check mr-2"></i>We'll be in touch soon!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section style="padding:5rem 0;background:#F8F9FB">
    <div class="max-w-4xl mx-auto px-4">
      <div class="text-center mb-10 fade-in">
        <div class="section-accent" style="margin:0 auto 1rem"></div>
        <h2 class="section-title" style="color:#0F2050">Frequently Asked Questions</h2>
      </div>
      <div class="flex flex-col gap-4">
        ${[
          {q:'What ages do you accept?', a:'We welcome children from 1 to 5 years old. Our After School Heroes program extends to age 10.'},
          {q:'What is the student-to-teacher ratio?', a:'We maintain a 6:1 ratio for toddlers (1-2), 8:1 for ages 2-3, and 10:1 for our older classes, ensuring personalized attention for every child.'},
          {q:'Are meals and snacks provided?', a:'Yes! We provide nutritious, allergen-aware breakfast, lunch, and two snacks daily in our full-day programs. Our menu is reviewed by a nutritionist.'},
          {q:'What safety measures are in place?', a:'We have keycard-only secure entry, 24/7 CCTV monitoring, trained staff, regular safety drills, and a real-time parent notification system.'},
          {q:'Do you offer financial assistance?', a:'Yes! We offer sibling discounts (15% off), income-based financial assistance, and we accept most childcare subsidy programs. Contact us to learn more.'},
          {q:'Can I schedule a tour before enrolling?', a:'Absolutely! We highly encourage tours. Fill out our enrollment form or call us directly to book a time.'},
        ].map((faq, i) => `
          <div class="card fade-in" style="cursor:pointer" onclick="this.querySelector('.faq-ans').style.display=this.querySelector('.faq-ans').style.display==='none'?'block':'none';this.querySelector('.faq-icon').textContent=this.querySelector('.faq-ans').style.display==='none'?'+':'−'">
            <div class="flex justify-between items-center">
              <h4 style="font-weight:800;color:#0F1E3D;font-size:1rem">${faq.q}</h4>
              <span class="faq-icon" style="color:#0F2050;font-size:1.5rem;font-weight:300;min-width:20px;text-align:center">+</span>
            </div>
            <p class="faq-ans" style="display:none;color:#6B7A9D;margin-top:1rem;line-height:1.7;font-size:0.95rem;border-top:1px solid #DCE1EF;padding-top:1rem">${faq.a}</p>
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
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
      btn.style.opacity = '0.8';
      errMsg.style.display = 'none';
      const data = new FormData(form);
      const checked = [...form.querySelectorAll('input[name="schedule"]:checked')].map(c => c.value);
      data.delete('schedule');
      data.append('schedule_preference', checked.length ? checked.join(', ') : 'Not specified');
      const jsonData = {};
      data.forEach((value, key) => { if (key !== 'botcheck') jsonData[key] = value; });
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(jsonData)
        });
        const json = await res.json();
        if (res.ok && json.success) {
          form.style.display = 'none';
          document.getElementById('success-msg').style.display = 'block';
        } else { throw new Error(json.message || 'Submission failed'); }
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-rocket mr-2"></i>Submit Application';
        btn.style.opacity = '1';
        errMsg.style.display = 'block';
      }
    }
  </script>

  ${Footer()}
  `
  return c.html(Layout({ children: content, title: 'Contact & Enroll - SuperKids India Preschool' }))
})

// ================================================================
// PARENT PORTAL
// ================================================================
app.get('/parent-portal', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"/>
  <title>SuperKids India – Parent Portal</title>
  <link rel="manifest" href="/static/manifest.json"/>
  <meta name="theme-color" content="#0F2050"/>
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <meta name="apple-mobile-web-app-title" content="SuperKids"/>
  <link rel="apple-touch-icon" href="/static/school-logo.png"/>
  <link rel="icon" href="/static/logo.svg" type="image/svg+xml"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="/static/style.css"/>
</head>
<body>
  <div id="app"></div>
  <script src="/static/data.js"></script>
  <script src="/static/app.js"></script>
  <script src="/static/admin.js"></script>
  <script src="/static/management.js"></script>
  <script src="/static/parent.js"></script>
</body>
</html>`)
})

app.post('/api/contact', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return c.json({
    success: true,
    message: 'Application received! We will contact you within 24 hours.',
    reference: `SK-${Math.floor(Math.random() * 9000 + 1000)}`
  })
})

export default app
