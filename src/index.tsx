import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = { DB: any; MEDIA: any; RESEND_API_KEY?: string }
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
    const folder = (c.req.query('folder') || 'gallery').replace(/[^a-z0-9_-]/gi, '')
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
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

// Download endpoint — streams R2 object as attachment (same-origin, bypasses cross-origin download restriction)
app.get('/api/download', async (c) => {
  const key = c.req.query('key')
  if (!key) return c.json({ error: 'Missing key' }, 400)
  try {
    const obj = await c.env.MEDIA.get(key)
    if (!obj) return c.notFound()
    const headers = new Headers()
    obj.writeHttpMetadata(headers)
    const filename = key.split('/').pop() || 'photo.jpg'
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    headers.set('cache-control', 'private, max-age=3600')
    return new Response(obj.body, { headers })
  } catch { return c.notFound() }
})

app.get('/api/dbstatus', async (c) => {
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const row = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM app_data').first<{ cnt: number }>()
    const resendConfigured = !!(c.env.RESEND_API_KEY)
    const keyPrefix = c.env.RESEND_API_KEY ? c.env.RESEND_API_KEY.slice(0, 6) + '...' : 'NOT SET'
    return c.json({ ok: true, message: 'D1 connected', rows: row?.cnt ?? 0, resendConfigured, keyPrefix })
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
  let d1Items: any[] = []
  let d1Error = ''
  let r2Items: any[] = []
  let r2Error = ''

  // 1. Try D1 — wrapped fully so a hung/missing DB never blocks the response
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
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
    // Normalise image URLs to use /r2/ proxy
    d1Items = d1Items.map((item: any) => {
      if (item.r2Key) return { ...item, imageData: `/r2/${item.r2Key}` }
      if (item.imageData?.startsWith('https://pub-')) {
        const key = item.imageData.replace(/^https:\/\/[^/]+\//, '')
        return { ...item, imageData: `/r2/${key}` }
      }
      return item
    })
  } catch (e: any) { d1Error = e?.message || String(e) }

  // 2. List R2 bucket — runs even when D1 is down
  try {
    const d1Keys = new Set(d1Items.map((i: any) => (i.r2Key || (i.imageData?.startsWith('/r2/') ? i.imageData.slice(4) : null))).filter(Boolean))
    const listed = await c.env.MEDIA.list({ limit: 500 })
    r2Items = (listed.objects as any[])
      .filter((obj: any) => obj.key.startsWith('gallery/'))
      .filter((obj: any) => /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(obj.key))
      .filter((obj: any) => !d1Keys.has(obj.key))
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
  } catch (e: any) { r2Error = e?.message || String(e) }

  return c.json({ items: [...d1Items, ...r2Items], _debug: { d1Count: d1Items.length, r2Count: r2Items.length, d1Error, r2Error } })
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
     style="position:fixed;bottom:28px;right:28px;z-index:9999;width:62px;height:62px;border-radius:50%;background:linear-gradient(135deg,#25D366,#128C7E);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(37,211,102,0.55),0 2px 8px rgba(0,0,0,0.4);text-decoration:none;transition:transform 0.3s,box-shadow 0.3s"
     onmouseover="this.style.transform='scale(1.12)'"
     onmouseout="this.style.transform='scale(1)'">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="34" height="34">
      <path fill="#fff" d="M24 4C13 4 4 13 4 24c0 3.6 1 7 2.7 9.9L4 44l10.4-2.7C17 43 20.4 44 24 44c11 0 20-9 20-20S35 4 24 4zm0 36c-3.1 0-6.1-.8-8.7-2.4l-.6-.4-6.2 1.6 1.7-6-.4-.6C8.8 30.1 8 27.1 8 24c0-8.8 7.2-16 16-16s16 7.2 16 16-7.2 16-16 16zm8.7-11.8c-.5-.2-2.8-1.4-3.2-1.5-.4-.2-.7-.2-1 .2-.3.4-1.2 1.5-1.5 1.9-.3.3-.5.4-1 .1-.5-.2-2-.7-3.8-2.3-1.4-1.2-2.3-2.8-2.6-3.2-.3-.5 0-.7.2-1 .2-.2.5-.5.7-.8.2-.3.3-.5.4-.8.1-.3 0-.6-.1-.8-.1-.2-1-2.5-1.4-3.4-.4-.9-.7-.8-1-.8h-.9c-.3 0-.8.1-1.2.6-.4.5-1.6 1.5-1.6 3.7 0 2.2 1.6 4.3 1.8 4.6.2.3 3.1 4.8 7.6 6.7 1.1.5 1.9.7 2.6.9 1.1.3 2.1.3 2.9.2.9-.1 2.8-1.1 3.2-2.2.4-1.1.4-2 .3-2.2-.1-.2-.4-.3-.9-.5z"/>
    </svg>
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
          ${['Mini Heroes (2-3)','Super Stars (3-4)','Power Rangers (4-5)','Super Heroes (5+)','After School Club'].map(p =>
            `<span style="color:#7B90B5;font-size:0.9rem"><i class="fas fa-star mr-2" style="color:#E8B020;font-size:0.7rem"></i>${p}</span>`
          ).join('')}
        </div>
      </div>

      <div>
        <h4 style="font-family:'Playfair Display',serif;font-size:1.1rem;color:#E8B020;letter-spacing:1px;margin-bottom:1.2rem;font-weight:700">Contact Us</h4>
        <div class="flex flex-col gap-3">
          <div class="flex items-start gap-3">
            <i class="fas fa-map-marker-alt mt-1" style="color:#C4893A;width:16px"></i>
            <span style="color:#7B90B5;font-size:0.9rem">SuperKids India Preschool, Matoshri Apartment,<br>Plot number 51, Sector number 10, Bhosari Pradhikaran<br>Pin: 411026</span>
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
app.get('/', async (c) => {
  // Load parent reviews from D1 for testimonials section
  const fallbackReviews = [
    {parentName:'Sarah M.', childInfo:'Mom of Ethan, age 4', text:'SuperKids completely transformed my son! He went from being shy to the most confident kid in his kindergarten class. The teachers are absolute superheroes!', stars:5},
    {parentName:'David & Lisa K.', childInfo:'Parents of twins, age 3', text:'Both our twins absolutely LOVE going to school every day! The curriculum is incredible — they\'re learning to read at 3! Best decision we ever made.', stars:5},
    {parentName:'Maria R.', childInfo:'Mom of Sofia, age 2', text:'From day 1, Sofia felt safe and loved. The staff is incredibly professional and caring. I can\'t imagine sending her anywhere else. 10/10!', stars:5},
  ]
  let displayReviews: Array<{parentName: string; childInfo: string; text: string; stars: number}> = fallbackReviews
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('reviews').first<{ value: string }>()
    if (row) {
      const d1Reviews = JSON.parse(row.value) as any[]
      const approved = d1Reviews.filter((r: any) => r.status === 'approved')
      if (approved.length > 0) displayReviews = approved.slice(0, 6)
    }
  } catch { /* fall back to hardcoded */ }

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
          {icon:'🛡️', stat:'Highest', label:'Safety Standards'},
          {icon:'📹', stat:'24/7', label:'CCTV Surveillance'},
          {icon:'🦸', stat:'Expert', label:'Super Educators'},
          {icon:'❤️', stat:'100%', label:'Parent Satisfaction'},
        ].map(s => `
          <div class="fade-in">
            <div style="font-size:2.5rem;margin-bottom:0.5rem">${s.icon}</div>
            <div style="font-family:'Playfair Display',serif;font-size:2rem;font-weight:800;color:#E8B020;margin-bottom:4px">${s.stat}</div>
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
          {emoji:'🦁', age:'2–3 Years', title:'Mini Heroes', color:'#C4893A', desc:'Language explosion, creativity, and social skills through guided play.'},
          {emoji:'⭐', age:'3–4 Years', title:'Super Stars', color:'#E8B020', desc:'Pre-literacy, numeracy, science exploration and team activities.'},
          {emoji:'🚀', age:'4–5 Years', title:'Power Rangers', color:'#1AA6CA', desc:'School-readiness program with advanced learning and leadership skills.'},
          {emoji:'🌟', age:'5+ Years', title:'Super Heroes', color:'#0F2050', desc:'Full day program for school-ready children with enriched curriculum and leadership development.'},
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
        ${displayReviews.map(t => `
          <div class="testimonial-card fade-in">
            <div class="flex gap-1 mb-4">
              ${'<span style="color:#E8B020">★</span>'.repeat(t.stars)}${'<span style="color:#DCE1EF">★</span>'.repeat(5 - t.stars)}
            </div>
            <p style="color:#2A3B60;line-height:1.8;font-size:0.95rem;margin-bottom:1.5rem;font-style:italic">"${t.text}"</p>
            <div class="flex items-center gap-3">
              <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#0F2050,#1AA6CA);display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:900;color:#fff;flex-shrink:0">
                ${t.parentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-weight:800;color:#0F1E3D">${t.parentName}</div>
                <div style="color:#6B7A9D;font-size:0.85rem">${t.childInfo}</div>
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
app.get('/about', async (c) => {
  // Load team from D1, fall back to hardcoded if empty
  const fallbackTeam = [
    {id:'f1', name:'Dr. Amanda Powers', role:'Founder & Director', experience:'15+ yrs', certification:'PhD Child Development', color:'#0F2050', photoKey:''},
    {id:'f2', name:'Ms. Rachel Storm', role:'Lead Educator (Toddlers)', experience:'8 yrs', certification:'ECE Certified', color:'#C4893A', photoKey:''},
    {id:'f3', name:'Mr. Carlos Bright', role:'Creative Arts Director', experience:'10 yrs', certification:'Arts Education MA', color:'#E8B020', photoKey:''},
    {id:'f4', name:'Ms. Priya Nova', role:'STEAM Coordinator', experience:'6 yrs', certification:'STEM Specialist', color:'#1AA6CA', photoKey:''},
  ]
  let teamMembers: any[] = fallbackTeam
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('team').first<{ value: string }>()
    if (row) {
      const d1Team = JSON.parse(row.value)
      if (d1Team.length > 0) teamMembers = d1Team
    }
  } catch { /* fall back to hardcoded */ }

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

  <!-- OUR STORY -->
  <section style="padding:5rem 0;background:#F8F9FB">
    <div class="max-w-4xl mx-auto px-4">
      <div class="text-center mb-10 fade-in">
        <div class="badge mb-4" style="background:#FEF8F0;color:#C4893A;border:1px solid #C4893A33">Est. 2025</div>
        <div class="section-accent" style="margin:0 auto 1rem"></div>
        <h2 class="section-title" style="color:#E8B020">Where Every Hero Begins</h2>
        <p style="color:#6B7A9D;margin-top:1rem;max-width:600px;margin-left:auto;margin-right:auto;line-height:1.8">
          Every great adventure starts with a single step — and ours has just begun.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="card fade-in" style="border-color:#0F205033;padding:2rem">
          <div style="font-size:2.5rem;margin-bottom:1rem">🌱</div>
          <h3 style="font-family:'Playfair Display',serif;font-size:1.4rem;color:#0F2050;font-weight:700;margin-bottom:0.75rem">Our Beginning</h3>
          <p style="color:#6B7A9D;line-height:1.8;font-size:0.95rem">SuperKids India Preschool was born from a simple but powerful belief — that every child is a superhero waiting to discover their powers. We opened our doors in Bhosari Pradhikaran with a heartfelt mission: to give every little one the very best start in life, wrapped in warmth, wonder, and world-class learning.</p>
        </div>
        <div class="card fade-in" style="border-color:#C4893A33;padding:2rem">
          <div style="font-size:2.5rem;margin-bottom:1rem">💛</div>
          <h3 style="font-family:'Playfair Display',serif;font-size:1.4rem;color:#C4893A;font-weight:700;margin-bottom:0.75rem">Built with Love</h3>
          <p style="color:#6B7A9D;line-height:1.8;font-size:0.95rem">From our carefully designed classrooms to our superhero-themed curriculum, every detail at SuperKids India has been crafted with love and intention. We wanted a preschool we'd be proud to send our own children to — and that's exactly what we've built for yours.</p>
        </div>
      </div>

      <div class="card fade-in text-center" style="border-color:#E8B02033;padding:2.5rem;background:linear-gradient(135deg,#FEF8F0,#ffffff)">
        <div style="font-size:2.8rem;margin-bottom:1rem">🚀</div>
        <h3 style="font-family:'Playfair Display',serif;font-size:1.5rem;color:#E8B020;font-weight:800;margin-bottom:1rem">Year One — Just the Beginning</h3>
        <p style="color:#2A3B60;line-height:1.9;font-size:1rem;max-width:560px;margin:0 auto">
          We may be brand new, but our passion, preparation, and purpose are anything but. This is Year One of what we know will be a remarkable story — and the children walking through our doors today are the very first chapter. We are honoured to earn your trust, and we promise to make every single day count.
        </p>
        <div class="flex flex-wrap justify-center gap-6 mt-6">
          ${[
            {icon:'🛡️', label:'Safety First'},
            {icon:'📚', label:'Play-Based Learning'},
            {icon:'🤝', label:'Parent Partnership'},
            {icon:'🌟', label:'Every Child Matters'},
          ].map(b => `
            <div class="text-center">
              <div style="font-size:1.8rem">${b.icon}</div>
              <div style="color:#6B7A9D;font-size:0.8rem;margin-top:4px;font-weight:700">${b.label}</div>
            </div>
          `).join('')}
        </div>
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
        ${teamMembers.map((t: any) => {
          const avatarHtml = t.photoKey
            ? `<img src="/r2/${t.photoKey}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentNode.innerHTML='🦸'"/>`
            : `<span style="font-size:2.2rem">🦸</span>`
          return `
          <div class="card fade-in text-center">
            <div style="width:90px;height:90px;border-radius:50%;border:3px solid ${t.color};box-shadow:0 0 0 6px ${t.color}18;margin:0 auto 1rem;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f8faff;flex-shrink:0">
              ${avatarHtml}
            </div>
            <h3 style="font-weight:800;color:#0F1E3D;margin-bottom:0.25rem">${t.name}</h3>
            <p style="color:${t.color};font-size:0.85rem;font-weight:700;margin-bottom:0.5rem">${t.role}</p>
            ${t.certification ? `<div class="badge mb-2" style="background:${t.color}18;color:${t.color};border:1px solid ${t.color}33;font-size:0.7rem">${t.certification}</div>` : ''}
            ${t.experience ? `<p style="color:#6B7A9D;font-size:0.8rem">${t.experience} experience</p>` : ''}
            ${t.bio ? `<p style="color:#6B7A9D;font-size:0.78rem;margin-top:6px;line-height:1.5">${t.bio}</p>` : ''}
          </div>`
        }).join('')}
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
          {id:'mini', label:'Mini Heroes (2-3)', emoji:'🦁'},
          {id:'stars', label:'Super Stars (3-4)', emoji:'⭐'},
          {id:'power', label:'Power Rangers (4-5)', emoji:'🚀'},
          {id:'superstars5', label:'Super Heroes (5+)', emoji:'🌟'},
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
          {id:'mini', emoji:'🦁', age:'2–3 Years', title:'Mini Heroes', color:'#C4893A',
           features:['Potty training support','Early reading readiness','Imaginative play','Art exploration','Outdoor adventures','Circle time & stories'],
           desc:'Mini Heroes is where personalities explode! This program harnesses the natural curiosity of 2-3 year olds through structured play, creative expression, and early literacy foundations.', time:'Full Day'},
          {id:'stars', emoji:'⭐', age:'3–4 Years', title:'Super Stars', color:'#E8B020',
           features:['Pre-reading & writing','Basic math concepts','Science experiments','Team projects','Drama & performance','Problem-solving games'],
           desc:'Our Super Stars program is where academic foundations are laid with excitement and enthusiasm. Children engage in STEAM projects, collaborative learning, and begin their journey toward school readiness.', time:'Full Day'},
          {id:'power', emoji:'🚀', age:'4–5 Years', title:'Power Rangers', color:'#1AA6CA',
           features:['Advanced literacy','Math & logic','Science projects','Leadership skills','Digital literacy','Kindergarten prep'],
           desc:'The most advanced program, Power Rangers prepares children for their next great adventure: kindergarten! With a rich academic curriculum and leadership development, these children graduate ready to conquer the world.', time:'Full Day'},
          {id:'superstars5', emoji:'🌟', age:'5+ Years', title:'Super Heroes', color:'#0F2050',
           features:['Advanced reading & writing','Critical thinking','STEM projects','Leadership workshops','Creative expression','School transition support'],
           desc:'Super Heroes is our full day program for children aged 5 and above. Building on strong foundations, this program develops advanced skills, independent thinking, and confidence to excel in primary school.', time:'Full Day Program'},
          {id:'after', emoji:'🎮', age:'5+ Years', title:'After School Heroes', color:'#C4893A',
           features:['Homework help','STEM workshops','Sports & fitness','Arts & crafts','Cooking classes','Club activities'],
           desc:'Our After School program provides a safe, fun, and stimulating environment for school-age children to unwind, learn new skills, and build friendships after their school day.', time:'2:30 PM – 6:00 PM'},
          {id:'after', emoji:'☀️', age:'All Ages', title:'Summer Super Camp', color:'#E8B020',
           features:['Themed weekly adventures','Swimming lessons','Field trips','Science fairs','Art workshops','Superhero Olympics'],
           desc:'When school\'s out, the adventure begins! Our Summer Super Camp is packed with themed weeks, outdoor adventures, educational field trips, and unforgettable superhero experiences.', time:'June – August'},
        ].map(p => `
          <div class="card fade-in prog-card" data-prog="${p.id}" style="border-color:${p.color}33;position:relative;overflow:visible">
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
          {time:'9:00 AM', activity:'Learning Centers & STEAM', emoji:'🔬', color:'#1AA6CA'},
          {time:'10:30 AM', activity:'Outdoor Hero Training', emoji:'🌳', color:'#0F2050'},
          {time:'11:30 AM', activity:'Creative Arts & Music', emoji:'🎨', color:'#C4893A'},
          {time:'12:30 PM', activity:'Rest & Quiet Time', emoji:'😴', color:'#E8B020'},
          {time:'2:00 PM', activity:'Story Time & Reading', emoji:'📚', color:'#1AA6CA'},
          {time:'3:30 PM', activity:'Science & Discovery', emoji:'🧪', color:'#0F2050'},
          {time:'5:00 PM', activity:'Wind Down & Pickup', emoji:'🌟', color:'#C4893A'},
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

  <script>
    (function() {
      document.querySelectorAll('.age-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          document.querySelectorAll('.age-tab').forEach(function(t) {
            t.style.background = 'transparent';
            t.style.color = '#2A3B60';
            t.style.borderColor = '#DCE1EF';
          });
          tab.style.background = '#0F2050';
          tab.style.color = '#ffffff';
          tab.style.borderColor = '#0F2050';
          var target = tab.dataset.target;
          document.querySelectorAll('.prog-card').forEach(function(card) {
            card.style.display = (target === 'all' || card.dataset.prog === target) ? '' : 'none';
          });
        });
      });
    })();
  </script>

  ${Footer()}
  `
  return c.html(Layout({ children: content, title: 'Programs - SuperKids India Preschool' }))
})

// ================================================================
// GALLERY PAGE — server-side rendered, R2 listed on the server
// ================================================================
app.get('/gallery', async (c) => {
  // ── Fetch data server-side so page renders fully without client JS ──
  const R2_PUBLIC = 'https://pub-92df4935826e41f29b59fa7b32da3a0d.r2.dev'

  let photos: Array<{ key: string; title: string; proxyUrl: string; publicUrl: string; date: string; eventTags: string[] }> = []
  let videos: Array<any> = []
  let r2Error = ''
  let d1Error = ''

  // 1. R2 listing (primary source — no D1 dependency)
  try {
    const listed = await c.env.MEDIA.list({ limit: 500 })
    photos = (listed.objects as any[]).filter((obj: any) => obj.key.startsWith('gallery/')).map((obj: any) => {
      const name = (obj.key.split('/').pop() || obj.key).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      return {
        key: obj.key,
        title: name.charAt(0).toUpperCase() + name.slice(1),
        proxyUrl: `/r2/${obj.key}`,
        publicUrl: `${R2_PUBLIC}/${obj.key}`,
        date: obj.uploaded ? new Date(obj.uploaded).toISOString().split('T')[0] : '',
        eventTags: [] as string[],
      }
    })
  } catch (e: any) { r2Error = e?.message || String(e) }

  // 2. D1 published items (adds video support + richer metadata + eventTags)
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('gallery').first<{ value: string }>()
    if (row) {
      const d1 = JSON.parse(row.value).items || []
      // Add videos from D1
      videos = d1.filter((i: any) => i.type === 'video' && i.youtubeId)
      // Merge D1 photo metadata (title + eventTags) onto matching R2 objects
      const d1Map = new Map(d1.filter((i: any) => i.r2Key).map((i: any) => [i.r2Key, i]))
      photos = photos.map(p => {
        const d1Item = d1Map.get(p.key) as any
        if (d1Item) return { ...p, title: d1Item.title || p.title, eventTags: Array.isArray(d1Item.eventTags) ? d1Item.eventTags : [] }
        return p
      })
      // Add D1 photos that are NOT in R2 listing (e.g. base64 ones — rare)
      d1.filter((i: any) => i.type !== 'video' && !i.r2Key && i.imageData && !i.imageData.startsWith('/r2/')).forEach((i: any) => {
        photos.push({ key: i.id, title: i.title, proxyUrl: i.imageData, publicUrl: i.imageData, date: i.date || '', eventTags: Array.isArray(i.eventTags) ? i.eventTags : [] })
      })
    }
  } catch (e: any) { d1Error = e?.message || String(e) }

  const photoCount = photos.length
  const debugInfo = `R2: ${photoCount} photos${r2Error ? ' (error: ' + r2Error + ')' : ''} | D1: ${videos.length} videos${d1Error ? ' (error: ' + d1Error + ')' : ''}`

  // ── Group photos by first eventTag, fallback to "School Life" ──
  interface PhotoEntry { photo: typeof photos[0]; idx: number }
  const groups = new Map<string, PhotoEntry[]>()
  photos.forEach((p, idx) => {
    const tag = (p.eventTags && p.eventTags.length > 0) ? p.eventTags[0] : 'School Life'
    if (!groups.has(tag)) groups.set(tag, [])
    groups.get(tag)!.push({ photo: p, idx })
  })

  // ── Accent colours per tag ──
  const tagAccentColors: Record<string, string> = {
    'Art Time': '#E8B020', 'Science Lab': '#1AA6CA', 'Outdoor Play': '#10b981',
    'Story Time': '#C4893A', 'Music Class': '#8b5cf6', 'Sport Day': '#ef4444',
    'Cooking Class': '#f97316', 'Block Building': '#0F2050', 'Drama Class': '#ec4899',
    'Garden Time': '#16a34a', 'SuperHero Day': '#dc2626', 'Rainbow Art': '#7c3aed',
    'Birthday Fun': '#E8B020', 'Team Work': '#1AA6CA', 'School Life': '#6B7A9D',
  }

  const tagEntries = Array.from(groups.entries())

  // ── Folder cards — each is a plain <a href="#gfN"> link; CSS :target shows the panel ──
  const folderCardsHtml = tagEntries.map(([tag, items], fIdx) => {
    const accent = tagAccentColors[tag] || '#1AA6CA'
    const count = items.length
    const previews = items.slice(0, 4)
    const previewCells = previews.map(({ photo: p }) =>
      `<img src="${p.publicUrl}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.onerror=null;this.src='${p.proxyUrl}'">`
    ).join('') + Array(Math.max(0, 4 - previews.length)).fill(0).map(() =>
      `<div style="background:${accent}22;display:flex;align-items:center;justify-content:center;font-size:1.4rem">📷</div>`
    ).join('')
    return `
    <a href="#gf${fIdx}" style="display:block;text-decoration:none;background:#fff;border-radius:16px;border:2px solid ${accent}33;box-shadow:0 4px 16px rgba(15,32,80,0.08);overflow:hidden;transition:all 0.25s"
       onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 10px 28px rgba(15,32,80,0.16)'"
       onmouseout="this.style.transform='';this.style.boxShadow='0 4px 16px rgba(15,32,80,0.08)'">
      <div style="height:8px;background:${accent}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;aspect-ratio:4/3;gap:1px;background:#e8edf5">
        ${previewCells}
      </div>
      <div style="padding:12px 14px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid ${accent}22">
        <div>
          <div style="font-weight:800;color:#0F1E3D;font-size:0.9rem">${tag}</div>
          <div style="color:#6B7A9D;font-size:11px;margin-top:2px">${count} photo${count !== 1 ? 's' : ''}</div>
        </div>
        <div style="background:${accent}18;color:${accent};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center">
          <i class="fas fa-folder-open" style="font-size:12px"></i>
        </div>
      </div>
    </a>`
  }).join('')

  // ── Photo panels — hidden by CSS (.gfp), revealed by :target when hash matches ──
  // Photo cards are <a href="#ph-fIdx-jIdx"> links; lightboxes are separate .ph-lb divs shown by :target
  const photoPanelsHtml = tagEntries.map(([tag, items], fIdx) => {
    const accent = tagAccentColors[tag] || '#1AA6CA'
    const playingCardsHtml = items.map(({ photo: p }, jIdx) => `
      <a href="#ph-${fIdx}-${jIdx}" style="display:block;text-decoration:none;background:#fff;border-radius:14px;box-shadow:0 4px 16px rgba(15,32,80,0.1);overflow:hidden;transition:transform 0.25s,box-shadow 0.25s;border:2px solid ${accent}22"
         onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 12px 32px rgba(15,32,80,0.2)'"
         onmouseout="this.style.transform='';this.style.boxShadow='0 4px 16px rgba(15,32,80,0.1)'">
        <div style="position:relative;overflow:hidden;height:160px">
          <img src="${p.publicUrl}" alt="${p.title}" loading="lazy"
               style="width:100%;height:100%;object-fit:cover;display:block"
               onerror="this.onerror=null;this.src='${p.proxyUrl}'">
          <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to bottom,transparent,rgba(0,0,0,0.5));padding:20px 8px 6px;pointer-events:none">
            <div style="color:#fff;font-size:10px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px rgba(0,0,0,0.7)">${p.title}</div>
          </div>
        </div>
        <div style="padding:7px 10px;display:flex;align-items:center;justify-content:space-between;background:${accent}08">
          ${p.date ? `<span style="font-size:9px;color:#94a3b8">${p.date}</span>` : '<span></span>'}
          <span style="font-size:9px;font-weight:700;color:${accent}"><i class="fas fa-expand-alt"></i></span>
        </div>
      </a>`).join('')
    return `
    <div id="gf${fIdx}" class="gfp">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.5rem;flex-wrap:wrap">
        <a href="#gallery-top" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:50px;border:2px solid #DCE1EF;background:#fff;color:#0F2050;font-weight:700;font-size:13px;text-decoration:none"
           onmouseover="this.style.background='#E8EDF5'" onmouseout="this.style.background='#fff'">
          ← All Folders
        </a>
        <h2 style="font-size:1.2rem;font-weight:800;color:#0F1E3D;margin:0">${tag}</h2>
        <span style="background:${accent}22;color:${accent};font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px">${items.length} photos</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px">
        ${playingCardsHtml}
      </div>
    </div>`
  }).join('')

  // ── Photo lightboxes — one per photo, shown by CSS :target, positioned fixed ──
  const photoLightboxesHtml = tagEntries.map(([tag, items], fIdx) => {
    const total = items.length
    return items.map(({ photo: p }, jIdx) => {
      const prevJ = (jIdx - 1 + total) % total
      const nextJ = (jIdx + 1) % total
      const btnBase = 'display:flex;align-items:center;justify-content:center;position:fixed;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);color:#fff;font-size:28px;text-decoration:none;width:50px;height:50px;line-height:1'
      return `
      <div id="ph-${fIdx}-${jIdx}" class="ph-lb">
        <a href="#gf${fIdx}" style="position:fixed;top:14px;right:14px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;text-decoration:none;z-index:1" title="Close">&#215;</a>
        <a href="#ph-${fIdx}-${prevJ}" data-lb-prev style="${btnBase};left:10px;top:50%;transform:translateY(-50%)">&#8249;</a>
        <a href="#ph-${fIdx}-${nextJ}" data-lb-next style="${btnBase};right:10px;top:50%;transform:translateY(-50%)">&#8250;</a>
        <img src="${p.publicUrl}" alt="${p.title}" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,0.6)"
             onerror="this.onerror=null;this.src='${p.proxyUrl}'">
        <div style="margin-top:12px;color:#fff;font-size:14px;font-weight:700;text-align:center;max-width:80vw">${p.title}</div>
        <div style="margin-top:4px;color:rgba(255,255,255,0.5);font-size:12px">${jIdx + 1} / ${total}</div>
      </div>`
    }).join('')
  }).join('')

  const emptyHtml = `
    <div style="text-align:center;padding:80px 20px;background:#fff;border-radius:14px;border:2px dashed #DCE1EF">
      <i class="fas fa-images" style="font-size:3rem;display:block;margin-bottom:1rem;color:#DCE1EF"></i>
      <h3 style="font-size:1.1rem;font-weight:700;color:#0F1E3D;margin-bottom:8px">No Photos Yet</h3>
      <p style="color:#6B7A9D;font-size:0.9rem">Activity photos will appear here once uploaded by the school.</p>
      <p style="color:#94a3b8;font-size:11px;margin-top:12px">${debugInfo}</p>
    </div>`

  const videoCardsHtml = videos.map(v => `
    <div style="border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(15,32,80,0.08);cursor:pointer"
         onclick="openVideoLightbox('${v.youtubeId}')">
      <div style="position:relative">
        <img src="https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block" loading="lazy" alt="${v.title}">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.25)">
          <div style="width:56px;height:56px;background:rgba(196,137,58,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center">
            <i class="fas fa-play" style="color:#fff;font-size:1.1rem;margin-left:3px"></i>
          </div>
        </div>
      </div>
      <div style="padding:14px">
        <h4 style="font-weight:800;color:#0F1E3D;font-size:15px;margin-bottom:4px">${v.title}</h4>
        ${v.description ? `<p style="color:#6B7A9D;font-size:13px;margin:0">${v.description}</p>` : ''}
      </div>
    </div>`).join('')

  const photosJson = JSON.stringify(photos.map(p => ({ title: p.title, publicUrl: p.publicUrl, proxyUrl: p.proxyUrl, date: p.date })))

  const content = `
  ${Navbar('gallery')}

  <section style="padding:5rem 0 3rem;background:linear-gradient(135deg,#0F2050 0%,#1AA6CA 100%)">
    <div class="max-w-4xl mx-auto px-4 text-center">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:6px 18px;border-radius:50px;font-size:0.8rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:1.2rem">Our Gallery</div>
      <h1 style="font-family:'Playfair Display',serif;font-size:clamp(2.2rem,5vw,3.5rem);font-weight:800;color:#fff;margin-bottom:1rem">Super Moments</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:1.05rem;line-height:1.8;max-width:560px;margin:0 auto 1.5rem">A glimpse into the magical, learning-filled world of SuperKids India Preschool.</p>
      <p style="color:rgba(255,255,255,0.7);font-size:0.9rem">${photoCount > 0 ? photoCount + ' photo' + (photoCount !== 1 ? 's' : '') + ' in gallery' : 'No photos yet'}</p>
    </div>
  </section>

  <section style="padding:2.5rem 0 5rem;background:#F8F9FB">
    <div class="max-w-7xl mx-auto px-4">

      ${r2Error ? `<div style="background:#fee2e2;color:#991b1b;padding:12px 16px;border-radius:10px;margin-bottom:20px;font-size:13px;border:1px solid #fca5a5">R2 error: ${r2Error}</div>` : ''}

      <style>
        .gfp{display:none}.gfp:target{display:block}.gfp:target~#gallery-top{display:none!important}
        .ph-lb{display:none}
        .ph-lb:target{display:flex;flex-direction:column;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.93);padding:70px 60px 80px;box-sizing:border-box}
      </style>
      ${photoLightboxesHtml}
      ${photoCount === 0 ? emptyHtml : `
        ${photoPanelsHtml}
        <div id="gallery-top" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px">
          ${folderCardsHtml}
        </div>
      `}

      ${videos.length > 0 ? `
      <div style="margin-top:4rem">
        <div style="text-align:center;margin-bottom:2rem">
          <h2 style="font-family:'Playfair Display',serif;font-size:2rem;color:#C4893A;font-weight:800">See SuperKids In Action</h2>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">
          ${videoCardsHtml}
        </div>
      </div>` : ''}

    </div>
  </section>

  <script>
    function openVideoLightbox(ytId) {
      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.93);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
      ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
      ov.innerHTML = '<div style="background:#000;border-radius:16px;max-width:900px;width:100%;position:relative">'
        + '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:16px">'
        + '<iframe src="https://www.youtube.com/embed/' + ytId + '?autoplay=1&rel=0" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allow="autoplay;encrypted-media" allowfullscreen></iframe>'
        + '</div>'
        + '<button onclick="this.closest(\'div\').parentNode.remove()" style="position:absolute;top:-14px;right:-14px;width:36px;height:36px;border-radius:50%;background:#C4893A;border:none;color:#fff;cursor:pointer;font-size:18px">&#x2715;</button>'
        + '</div>';
      document.body.appendChild(ov);
    }

    // Keyboard nav for CSS :target photo lightboxes
    document.addEventListener('keydown', function(e) {
      var hash = window.location.hash;
      if (!hash.match(/^#ph-/)) return;
      var lb = document.querySelector(hash);
      if (!lb) return;
      if (e.key === 'ArrowLeft')  { var p = lb.querySelector('[data-lb-prev]'); if (p) window.location.hash = p.getAttribute('href'); }
      if (e.key === 'ArrowRight') { var n = lb.querySelector('[data-lb-next]'); if (n) window.location.hash = n.getAttribute('href'); }
      if (e.key === 'Escape')     { var c = lb.querySelector('a[title="Close"]'); if (c) window.location.hash = c.getAttribute('href'); }
    });
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
            {icon:'fa-map-marker-alt', color:'#C4893A', title:'Our Super HQ', content:'SuperKids India Preschool, Matoshri Apartment,<br>Plot number 51, Sector number 10, Bhosari Pradhikaran<br>Pin: 411026'},
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
                      <option>Mini Heroes (2-3 years)</option>
                      <option>Super Stars (3-4 years)</option>
                      <option>Power Rangers (4-5 years)</option>
                      <option>Super Heroes (5+ Full Program)</option>
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
                  ${['Full-Time (5 days)', 'Full Day', 'Flexible'].map(opt => `
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
          {q:'Do you provide food or meals?', a:'We do not provide meals or snacks at SuperKids. We encourage parents to send a healthy packed lunch and snacks from home. Please inform us of any food allergies so we can ensure a safe environment for all children.'},
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
// ── Service Worker ────────────────────────────────────────────
app.get('/sw.js', (c) => {
  const js = `const CACHE='sk-parent-v25';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/parent-portal'])));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/r2/'))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cl=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cl));}return r;}).catch(()=>caches.match(e.request)));
});`;
  return c.body(js, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Service-Worker-Allowed': '/parent-portal',
    'Cache-Control': 'no-cache, no-store'
  });
})

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
  <link rel="stylesheet" href="/static/style.css?v=25"/>
</head>
<body>
  <div id="app"></div>

  <!-- PWA Install Banner (Android / Desktop Chrome) -->
  <div id="pwa-install-banner" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#0F2050;color:#fff;padding:12px 16px;align-items:center;gap:12px;box-shadow:0 -2px 16px rgba(0,0,0,0.35);font-family:Arial,sans-serif">
    <img src="/static/school-logo.png" style="width:42px;height:42px;border-radius:50%;border:2px solid #C4893A;flex-shrink:0;object-fit:contain;background:#fff" onerror="this.style.display='none'">
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:14px">Install SuperKids App</div>
      <div style="font-size:11px;opacity:0.8;margin-top:1px">Quick access from your home screen</div>
    </div>
    <button onclick="window._installPWA()" style="background:#C4893A;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:700;font-size:13px;cursor:pointer;flex-shrink:0">Install</button>
    <button onclick="document.getElementById('pwa-install-banner').style.display='none';sessionStorage.setItem('pwa-banner-dismissed','1')" style="background:transparent;color:#fff;border:none;font-size:20px;cursor:pointer;flex-shrink:0;line-height:1;padding:0 4px">&times;</button>
  </div>

  <!-- PWA iOS Banner -->
  <div id="pwa-ios-banner" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#0F2050;color:#fff;padding:12px 16px;align-items:flex-start;gap:12px;box-shadow:0 -2px 16px rgba(0,0,0,0.35);font-family:Arial,sans-serif">
    <img src="/static/school-logo.png" style="width:40px;height:40px;border-radius:10px;border:2px solid #C4893A;flex-shrink:0;object-fit:contain;background:#fff;margin-top:2px" onerror="this.style.display='none'">
    <div style="flex:1;min-width:0;font-size:13px;line-height:1.5">
      <div style="font-weight:700;margin-bottom:3px">Add to Home Screen</div>
      <div style="opacity:0.85">Tap the <strong style="color:#C4893A">Share</strong> button <span style="font-size:15px">&#x2197;</span> at the bottom of your browser, then tap <strong style="color:#C4893A">"Add to Home Screen"</strong></div>
    </div>
    <button onclick="document.getElementById('pwa-ios-banner').style.display='none';localStorage.setItem('pwa-ios-dismissed','1')" style="background:transparent;color:#fff;border:none;font-size:20px;cursor:pointer;flex-shrink:0;line-height:1;padding:0 4px;margin-top:2px">&times;</button>
  </div>

  <script src="/static/data.js?v=25"></script>
  <script src="/static/app.js?v=25"></script>
  <script src="/static/admin.js?v=25"></script>
  <script src="/static/management.js?v=25"></script>
  <script src="/static/parent.js?v=25"></script>
  <script src="/static/admissions.js?v=25"></script>
  <script src="/static/accounting.js?v=25"></script>
  <script src="/static/teacher.js?v=25"></script>
  <script src="/static/teachers.js?v=25"></script>
  <script>
  (function(){
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return; // already running as installed app, hide everything

    // Service Worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/parent-portal' }).catch(function(){});
    }

    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    // iOS: show manual instructions (once per session unless permanently dismissed)
    if (isIOS && !localStorage.getItem('pwa-ios-dismissed')) {
      document.getElementById('pwa-ios-banner').style.display = 'flex';
    }

    // Android / Desktop Chrome: capture beforeinstallprompt
    var _prompt = null;
    window._installPWA = function() {
      if (!_prompt) return;
      _prompt.prompt();
      _prompt.userChoice.then(function(r) {
        document.getElementById('pwa-install-banner').style.display = 'none';
        _prompt = null;
      });
    };
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      _prompt = e;
      if (!sessionStorage.getItem('pwa-banner-dismissed')) {
        document.getElementById('pwa-install-banner').style.display = 'flex';
      }
    });
    window.addEventListener('appinstalled', function() {
      document.getElementById('pwa-install-banner').style.display = 'none';
    });
  })();
  </script>
</body>
</html>`)
})

// ── Team API ─────────────────────────────────────────────────
app.get('/api/team', async (c) => {
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('team').first<{ value: string }>()
    return c.json({ members: row ? JSON.parse(row.value) : [] })
  } catch (e: any) { return c.json({ members: [], error: e.message }) }
})

app.post('/api/team', async (c) => {
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const { members } = await c.req.json()
    await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key, value, updated_at) VALUES (?, ?, ?)').bind('team', JSON.stringify(members || []), new Date().toISOString()).run()
    return c.json({ ok: true, count: (members || []).length })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Parent Reviews API ───────────────────────────────────────
app.get('/api/reviews', async (c) => {
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('reviews').first<{ value: string }>()
    const reviews = row ? JSON.parse(row.value) : []
    return c.json({ ok: true, reviews })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/reviews', async (c) => {
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const { parentName, childInfo, text, stars } = await c.req.json()
    if (!text || !parentName || !stars) return c.json({ error: 'Missing fields' }, 400)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('reviews').first<{ value: string }>()
    const reviews = row ? JSON.parse(row.value) : []
    const newReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      parentName: String(parentName).slice(0, 60),
      childInfo: String(childInfo || '').slice(0, 80),
      text: String(text).slice(0, 500),
      stars: Math.min(5, Math.max(1, Number(stars))),
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
    }
    reviews.unshift(newReview)
    await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key, value, updated_at) VALUES (?, ?, ?)').bind('reviews', JSON.stringify(reviews), new Date().toISOString()).run()
    return c.json({ ok: true, review: newReview })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.put('/api/reviews/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { status } = await c.req.json()
    if (!['approved', 'pending'].includes(status)) return c.json({ error: 'Invalid status' }, 400)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('reviews').first<{ value: string }>()
    const reviews = row ? JSON.parse(row.value) : []
    const idx = reviews.findIndex((r: any) => r.id === id)
    if (idx === -1) return c.json({ error: 'Review not found' }, 404)
    reviews[idx].status = status
    await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key, value, updated_at) VALUES (?, ?, ?)').bind('reviews', JSON.stringify(reviews), new Date().toISOString()).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.delete('/api/reviews/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('reviews').first<{ value: string }>()
    const reviews = row ? JSON.parse(row.value) : []
    const updated = reviews.filter((r: any) => r.id !== id)
    await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key, value, updated_at) VALUES (?, ?, ?)').bind('reviews', JSON.stringify(updated), new Date().toISOString()).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/contact', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return c.json({
    success: true,
    message: 'Application received! We will contact you within 24 hours.',
    reference: `SK-${Math.floor(Math.random() * 9000 + 1000)}`
  })
})

// ── Admission: shared table setup + counter helpers ───────────
async function ensureAdmTables(db: any) {
  await db.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
  await db.exec(`CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, data TEXT NOT NULL, status TEXT DEFAULT 'new', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
  await db.exec(`CREATE TABLE IF NOT EXISTS admissions (id TEXT PRIMARY KEY, data TEXT NOT NULL, status TEXT DEFAULT 'application_submitted', academic_year TEXT, class_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
  await db.exec(`CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, admission_id TEXT, data TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
}

async function nextCounter(db: any, key: string, prefix: string, year: string) {
  const row = await db.prepare('SELECT value FROM app_data WHERE key = ?').bind(key).first<{value:string}>()
  const n = row ? (parseInt(row.value) + 1) : 1
  await db.prepare('INSERT OR REPLACE INTO app_data (key,value,updated_at) VALUES (?,?,?)').bind(key, String(n), new Date().toISOString()).run()
  return `${prefix}-${year.split('-')[0]}-${String(n).padStart(4,'0')}`
}

// ── Inquiries ────────────────────────────────────────────────
app.get('/api/inquiries', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const rows = await c.env.DB.prepare('SELECT * FROM inquiries ORDER BY created_at DESC').all()
    return c.json({ items: rows.results || [] })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/inquiries', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const { data } = await c.req.json()
    const id = `inq_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
    const now = new Date().toISOString()
    await c.env.DB.prepare('INSERT INTO inquiries (id,data,status,created_at,updated_at) VALUES (?,?,?,?,?)').bind(id, JSON.stringify(data), 'new', now, now).run()
    return c.json({ ok: true, id })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.put('/api/inquiries/:id', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const id = c.req.param('id')
    const body = await c.req.json()
    const now = new Date().toISOString()
    if (body.data !== undefined && body.status !== undefined) {
      await c.env.DB.prepare('UPDATE inquiries SET data=?,status=?,updated_at=? WHERE id=?').bind(JSON.stringify(body.data), body.status, now, id).run()
    } else if (body.data !== undefined) {
      await c.env.DB.prepare('UPDATE inquiries SET data=?,updated_at=? WHERE id=?').bind(JSON.stringify(body.data), now, id).run()
    } else if (body.status !== undefined) {
      await c.env.DB.prepare('UPDATE inquiries SET status=?,updated_at=? WHERE id=?').bind(body.status, now, id).run()
    }
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.delete('/api/inquiries/:id', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    await c.env.DB.prepare('DELETE FROM inquiries WHERE id=?').bind(c.req.param('id')).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Admissions ───────────────────────────────────────────────
app.get('/api/admissions', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const rows = await c.env.DB.prepare('SELECT * FROM admissions ORDER BY created_at DESC').all()
    return c.json({ items: rows.results || [] })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/admissions/:id', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const row = await c.env.DB.prepare('SELECT * FROM admissions WHERE id=?').bind(c.req.param('id')).first()
    if (!row) return c.json({ error: 'Not found' }, 404)
    return c.json({ item: row })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/admissions', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const { data, status } = await c.req.json()
    const year = new Date().getFullYear().toString()
    const admissionNo = await nextCounter(c.env.DB, `adm_counter_${year}`, 'SKI', `${year}-${parseInt(year)+1}`)
    const id = `adm_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
    const now = new Date().toISOString()
    const enriched = { ...data, admissionNo }
    await c.env.DB.prepare('INSERT INTO admissions (id,data,status,academic_year,class_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(id, JSON.stringify(enriched), status || 'application_submitted', enriched.academicYear || '', enriched.classId || '', now, now).run()
    return c.json({ ok: true, id, admissionNo })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.put('/api/admissions/:id', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const id = c.req.param('id')
    const body = await c.req.json()
    const now = new Date().toISOString()
    if (body.data !== undefined) {
      const s = body.status || 'application_submitted'
      await c.env.DB.prepare('UPDATE admissions SET data=?,status=?,updated_at=? WHERE id=?').bind(JSON.stringify(body.data), s, now, id).run()
    } else if (body.status !== undefined) {
      await c.env.DB.prepare('UPDATE admissions SET status=?,updated_at=? WHERE id=?').bind(body.status, now, id).run()
    }
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.delete('/api/admissions/:id', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    await c.env.DB.prepare('DELETE FROM admissions WHERE id=?').bind(c.req.param('id')).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Payments ─────────────────────────────────────────────────
app.get('/api/payments', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const rows = await c.env.DB.prepare('SELECT * FROM payments ORDER BY created_at DESC').all()
    return c.json({ items: rows.results || [] })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/payments/:id', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const row = await c.env.DB.prepare('SELECT * FROM payments WHERE id=?').bind(c.req.param('id')).first()
    if (!row) return c.json({ error: 'Not found' }, 404)
    return c.json({ item: row })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/payments', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const { data, admissionId } = await c.req.json()
    const year = new Date().getFullYear().toString()
    const receiptNo = await nextCounter(c.env.DB, `rcp_counter_${year}`, 'RCP', `${year}-${parseInt(year)+1}`)
    const id = `pay_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
    const enriched = { ...data, receiptNo }
    await c.env.DB.prepare('INSERT INTO payments (id,admission_id,data,created_at) VALUES (?,?,?,?)').bind(id, admissionId || '', JSON.stringify(enriched), new Date().toISOString()).run()
    return c.json({ ok: true, id, receiptNo })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.delete('/api/payments/:id', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    await c.env.DB.prepare('DELETE FROM payments WHERE id=?').bind(c.req.param('id')).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Public Receipt View (no auth) ────────────────────────────
app.get('/receipt/:id', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const row = await c.env.DB.prepare('SELECT * FROM payments WHERE id=?').bind(c.req.param('id')).first<{id:string,data:string}>()
    if (!row) return c.html('<div style="font-family:sans-serif;text-align:center;margin-top:80px;color:#555"><h2>Receipt not found</h2></div>', 404)
    const d: any = JSON.parse(row.data || '{}')
    const metaRow = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('main').first<{value:string}>()
    const meta: any = metaRow ? JSON.parse(metaRow.value) : {}
    const schoolName = meta.schoolName || 'SuperKids India Preschool'
    const rawAddr = meta.schoolAddress || 'Matoshri Apartment, Plot Number 51,\nSector No 10, Bhosari Pradhikaran,\nPin: 411026'
    const logoUrl = meta.schoolLogo || '/static/school-logo.png'
    const phone1 = meta.schoolPhone || '9822-977-644'
    const phone2 = meta.schoolPhone2 || '9822-977-944'
    const email = meta.schoolEmail || 'superkidsprincipal@gmail.com'
    const website = meta.schoolWebsite || 'https://superkidsindia.com'
    const addrHtml = rawAddr.replace(/\n/g, '<br>')
    const fmtRs = (n: number) => '&#8377;' + (n || 0).toLocaleString('en-IN')
    const infoRows: [string,string][] = [
      ['Receipt No.', d.receiptNo||'–'], ['Payment Date', d.paymentDate||'–'],
      ['Student Name', d.studentName||'–'], ['Admission No.', d.admissionNo||'–'],
      ['Class / Program', d.classId||'–'], ['Payment Mode', d.paymentMode||'–'],
      ...(d.transactionId ? [['Transaction ID', d.transactionId] as [string,string]] : []),
      ['Academic Year', d.academicYear||'–']
    ]
    const html = `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
<title>Receipt ${d.receiptNo||''} — ${schoolName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
body{font-family:Arial,sans-serif;font-size:13px;color:#0F1E3D;background:#EFF3F8;padding:16px;min-height:100vh}
.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.15)}
.hdr{background:#0F2050}
.hdr-top{display:flex;align-items:center;padding:14px 18px;gap:14px}
.hdr-top img{width:62px;height:62px;border-radius:50%;border:3px solid #E8B020;background:#fff;object-fit:contain;flex-shrink:0}
.hdr-name{font-size:18px;font-weight:900;color:#fff;letter-spacing:-.3px}
.hdr-sub{font-size:9px;color:#E8B020;font-weight:700;letter-spacing:.15em;text-transform:uppercase;margin-top:3px}
.hdr-bar{background:#dcad92;padding:8px 18px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.ico-badge{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:#0F2050;color:#fff;font-size:7px;flex-shrink:0;margin-right:4px}
.hdr-bl{font-size:11px;color:#0F2050;font-weight:600;line-height:1.8;min-width:0}
.hdr-bl div{display:flex;align-items:flex-start;overflow-wrap:anywhere;word-break:break-word}
.hdr-bl div .ico-badge{margin-top:2px;flex-shrink:0}
.hdr-br{font-size:11px;color:#0F2050;font-weight:600;text-align:right;line-height:1.7;min-width:0;word-break:break-word}
.rt{text-align:center;padding:8px;font-size:14px;font-weight:800;letter-spacing:.5px;background:#E8EDF5;color:#0F2050;border-bottom:3px solid #0F2050}
.ig{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ddd}
.ic{padding:9px 14px;border-bottom:1px solid #eee;border-right:1px solid #eee}
.ic:nth-child(even){border-right:none}
.il{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
.iv{font-weight:700;font-size:13px;word-break:break-word}
.ft{width:100%;border-collapse:collapse;border:1px solid #ddd}
.ft th{background:#F8F9FB;padding:8px 14px;text-align:left;font-size:11px;text-transform:uppercase;color:#666;border-bottom:1px solid #ddd}
.ft td{padding:8px 14px;border-bottom:1px solid #eee}
.tr-total{background:#F0FFF8;font-weight:900;font-size:15px;color:#059669}
.footer{background:#F8F9FB;padding:14px 18px;text-align:center;font-size:10px;color:#555;border-top:1px solid #eee;line-height:1.6}
@media(max-width:500px){
  body{padding:0;background:#fff}
  .wrap{border-radius:0;box-shadow:none}
  .hdr-top{padding:10px 12px;gap:8px}
  .hdr-top img{width:44px;height:44px;border:2px solid #E8B020}
  .hdr-name{font-size:13px}
  .hdr-sub{font-size:7px;letter-spacing:.06em}
  .hdr-bar{flex-direction:row;gap:6px;padding:7px 10px;align-items:flex-start}
  .hdr-bl{font-size:9px;line-height:1.7;word-break:break-word;flex:1;min-width:0}
  .hdr-br{font-size:9px;line-height:1.6;word-break:break-word;flex:1;min-width:0;text-align:right}
  .hdr-bl div .ico-badge{width:12px;height:12px;font-size:6px;margin-top:2px}
  .rt{font-size:12px;padding:6px}
  .ig{grid-template-columns:1fr}
  .ic{border-right:none}
  .il{font-size:9px}
  .iv{font-size:12px}
  .ft th,.ft td{padding:7px 10px;font-size:12px}
  .tr-total{font-size:13px}
  .footer{padding:10px 12px;font-size:10px}
}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-top">
      <img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'">
      <div style="flex:1"><div class="hdr-name">${schoolName}</div><div class="hdr-sub">Fee Payment Receipt</div></div>
    </div>
    <div class="hdr-bar">
      <div class="hdr-bl">
        <div><span class="ico-badge"><i class="fas fa-phone"></i></span>${phone1}</div>
        <div><span class="ico-badge"><i class="fas fa-mobile-alt"></i></span>${phone2}</div>
        <div><span class="ico-badge"><i class="fas fa-envelope"></i></span>${email}</div>
        <div><span class="ico-badge"><i class="fas fa-globe"></i></span>${website}</div>
      </div>
      <div class="hdr-br">
        <div style="font-weight:800;margin-bottom:2px"><span class="ico-badge"><i class="fas fa-home"></i></span>${schoolName}</div>
        <div>${rawAddr.replace(/\n/g, '<br>')}</div>
      </div>
    </div>
  </div>
  <div class="rt">PAYMENT RECEIPT</div>
  <div class="ig">
    ${infoRows.map(([l,v]) => `<div class="ic"><div class="il">${l}</div><div class="iv">${v}</div></div>`).join('')}
  </div>
  <table class="ft">
    <thead><tr><th>Fee Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${(d.feeItems||[]).map((f: any) => `<tr><td>${f.type}</td><td style="text-align:right;font-weight:700">${fmtRs(f.amount)}</td></tr>`).join('')}
      ${d.discount ? `<tr><td style="color:#dc2626">Discount</td><td style="text-align:right;color:#dc2626;font-weight:700">- ${fmtRs(d.discount)}</td></tr>` : ''}
      <tr class="tr-total"><td style="padding:10px 14px">Total Paid</td><td style="padding:10px 14px;text-align:right">${fmtRs(d.total)}</td></tr>
    </tbody>
  </table>
  <div class="footer">
    <strong>${schoolName}</strong><br>
    <span style="color:#aaa;font-size:10px">Computer-generated receipt. No physical signature required.</span>
  </div>
</div>
</body></html>`
    return c.html(html)
  } catch (e: any) { return c.html('<div style="font-family:sans-serif;text-align:center;margin-top:80px;color:#555"><h2>Error loading receipt</h2></div>', 500) }
})

// ── Admission Config (superadmin) ─────────────────────────────
app.get('/api/academic-config', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('academic_config').first<{value:string}>()
    return c.json({ config: row ? JSON.parse(row.value) : null })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/academic-config', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const { config } = await c.req.json()
    await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key,value,updated_at) VALUES (?,?,?)').bind('academic_config', JSON.stringify(config), new Date().toISOString()).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/fee-config', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('fee_config').first<{value:string}>()
    return c.json({ config: row ? JSON.parse(row.value) : null })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/fee-config', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const { config } = await c.req.json()
    await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key,value,updated_at) VALUES (?,?,?)').bind('fee_config', JSON.stringify(config), new Date().toISOString()).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── OTP helpers ───────────────────────────────────────────────
async function ensureOtpTable(db: any) {
  await db.exec(`CREATE TABLE IF NOT EXISTS password_reset_otps (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER DEFAULT 0
  )`)
}

app.post('/api/request-otp', async (c) => {
  try {
    const { email } = await c.req.json()
    if (!email) return c.json({ error: 'Email required' }, 400)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('main').first<{value:string}>()
    if (!row) return c.json({ notFound: true })
    const data = JSON.parse(row.value)
    const user = (data.users || []).find((u: any) => u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase())
    if (!user) return c.json({ notFound: true })
    const apiKey = c.env.RESEND_API_KEY
    if (!apiKey) return c.json({ noEmail: true })
    await ensureOtpTable(c.env.DB)
    const now = Date.now()
    // Rate limit: block if an OTP was issued in the last 60 seconds
    const recent = await c.env.DB.prepare(
      'SELECT id FROM password_reset_otps WHERE email=? AND used=0 AND expires_at > ?'
    ).bind(email.toLowerCase(), now + 540000).first<{id:string}>()
    if (recent) return c.json({ rateLimited: true, retryAfter: 60 })
    // Delete old OTPs for this email and generate new
    await c.env.DB.prepare('DELETE FROM password_reset_otps WHERE email=?').bind(email.toLowerCase()).run()
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const id = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO password_reset_otps (id,email,otp,expires_at,used) VALUES (?,?,?,?,0)'
    ).bind(id, email.toLowerCase(), otp, now + 600000).run()
    const meta = data.meta || {}
    const schoolName = meta.schoolName || 'SuperKids India Preschool'
    const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#0F2050;padding:20px 24px;border-radius:8px 8px 0 0;text-align:center">
        <div style="font-size:22px;font-weight:900;color:#fff">${schoolName}</div>
        <div style="font-size:11px;color:#C4893A;letter-spacing:.15em;margin-top:4px">PASSWORD RECOVERY</div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;padding:28px 24px;border-radius:0 0 8px 8px">
        <p style="color:#1a202c;font-size:15px;margin:0 0 8px">Hello <strong>${user.name || user.username}</strong>,</p>
        <p style="color:#4a5568;font-size:14px;margin:0 0 20px">Use the one-time password below to recover your account:</p>
        <div style="text-align:center;margin:0 0 24px">
          <div style="display:inline-block;background:#0F2050;color:#fff;font-size:34px;font-weight:900;letter-spacing:10px;padding:18px 36px;border-radius:12px;font-family:monospace">${otp}</div>
          <div style="font-size:12px;color:#718096;margin-top:10px">Valid for <strong>10 minutes</strong>. Do not share this with anyone.</div>
        </div>
        <p style="font-size:12px;color:#a0aec0;border-top:1px solid #e2e8f0;padding-top:16px;margin:0">
          If you did not request this, please contact us immediately.<br>
          Phone: ${meta.schoolPhone || '9822-977-644'} &nbsp;|&nbsp; Email: ${meta.schoolEmail || 'superkidsprincipal@gmail.com'}
        </p>
      </div>
    </div>`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${schoolName} <onboarding@resend.dev>`,
        to: [email.trim()],
        subject: `Your ${schoolName} OTP – Password Recovery`,
        html
      })
    })
    if (!res.ok) { console.error('Resend OTP error:', await res.text()); return c.json({ error: 'Failed to send OTP email' }, 500) }
    return c.json({ sent: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/verify-otp', async (c) => {
  try {
    const { email, otp } = await c.req.json()
    if (!email || !otp) return c.json({ error: 'Email and OTP required' }, 400)
    await ensureOtpTable(c.env.DB)
    const now = Date.now()
    const record = await c.env.DB.prepare(
      'SELECT * FROM password_reset_otps WHERE email=? AND otp=? AND used=0 AND expires_at > ?'
    ).bind(email.toLowerCase(), String(otp).trim(), now).first<{id:string}>()
    if (!record) return c.json({ invalid: true })
    await c.env.DB.prepare('UPDATE password_reset_otps SET used=1 WHERE id=?').bind(record.id).run()
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('main').first<{value:string}>()
    if (!row) return c.json({ error: 'Data not found' }, 500)
    const data = JSON.parse(row.value)
    const user = (data.users || []).find((u: any) => u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase())
    if (!user) return c.json({ error: 'User not found' }, 404)
    return c.json({ verified: true, name: user.name || user.username, username: user.username, password: user.password })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json()
    if (!email) return c.json({ error: 'Email required' }, 400)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('main').first<{ value: string }>()
    if (!row) return c.json({ notFound: true })
    const data = JSON.parse(row.value)
    const users: any[] = data.users || []
    const user = users.find((u: any) => u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase())
    if (!user) return c.json({ notFound: true })
    const apiKey = c.env.RESEND_API_KEY
    if (!apiKey) return c.json({ notConfigured: true, username: user.username, password: user.password, name: user.name || user.username })
    const meta = data.meta || {}
    const schoolName = meta.schoolName || 'SuperKids India Preschool'
    const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#b8860b;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0">${schoolName}</h2>
      </div>
      <div style="background:#fff;border:1px solid #e5c66b;padding:24px;border-radius:0 0 8px 8px">
        <p>Hello <strong>${user.name || user.username}</strong>,</p>
        <p>You requested your login credentials. Here are your account details:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border:1px solid #ddd;background:#fdf5e0;font-weight:bold">Username</td><td style="padding:8px;border:1px solid #ddd">${user.username}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#fdf5e0;font-weight:bold">Password</td><td style="padding:8px;border:1px solid #ddd">${user.password}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#fdf5e0;font-weight:bold">Role</td><td style="padding:8px;border:1px solid #ddd;text-transform:capitalize">${user.role}</td></tr>
        </table>
        <p style="font-size:12px;color:#888">If you did not request this, please contact your school administrator.<br>
        Phone: ${meta.schoolPhone || '9822-977-644'} / ${meta.schoolPhone2 || '9822-977-944'}<br>
        Email: ${meta.schoolEmail || 'superkidsprincipal@gmail.com'}</p>
      </div>
    </div>`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${schoolName} <onboarding@resend.dev>`,
        to: [email.trim()],
        subject: `Your ${schoolName} Login Credentials`,
        html
      })
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return c.json({ error: 'Failed to send email' }, 500)
    }
    return c.json({ sent: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

export default app
