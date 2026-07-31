import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = { DB: any; MEDIA: any; RESEND_API_KEY?: string }
const app = new Hono<{ Bindings: Bindings }>()

app.use('/static/*', serveStatic({ root: './public' }))

// Browsers auto-request /favicon.ico — serve the square school icon for it
app.get('/favicon.ico', (c) => c.redirect('/static/favicon-192.png', 301))

// ── Security helpers ─────────────────────────────────────────
function esc(s: any): string {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

const ALLOWED_MIME = new Set(['image/jpeg','image/png','image/gif','image/webp','image/avif','image/svg+xml','application/pdf','image/heic','image/heif'])

async function ensureSessionTable(db: any) {
  await db.exec('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, role TEXT NOT NULL, expires_at INTEGER NOT NULL)')
}

async function getSession(c: any): Promise<{token:string,user_id:string,role:string}|null> {
  try {
    const auth = c.req.header('Authorization') || ''
    if (!auth.startsWith('Bearer ')) return null
    const token = auth.slice(7)
    if (!token) return null
    await ensureSessionTable(c.env.DB)
    const row = await c.env.DB.prepare('SELECT * FROM sessions WHERE token=? AND expires_at > ?').bind(token, Date.now()).first<{token:string,user_id:string,role:string}>()
    return row || null
  } catch { return null }
}

// ── DB API ──────────────────────────────────────────────
app.get('/api/init', async (c) => {
  await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
  return c.json({ ok: true })
})

app.get('/api/db', async (c) => {
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('main').first<{ value: string }>()
    if (!row) return c.json(null)
    const data = JSON.parse(row.value)
    // Strip passwords before sending to client — auth is server-side
    if (Array.isArray(data.users)) {
      data.users = data.users.map((u: any) => { const { password: _p, ...safe } = u; return safe })
    }
    return c.json(data)
  } catch { return c.json(null) }
})

app.post('/api/db', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const incoming = await c.req.json()
    // Preserve server-side passwords — client never receives them so sends empty strings
    const existing = await c.env.DB.prepare('SELECT value FROM app_data WHERE key = ?').bind('main').first<{ value: string }>()
    if (existing && Array.isArray(incoming.users)) {
      const existingData = JSON.parse(existing.value)
      const pwMap: Record<string, string> = {}
      for (const u of (existingData.users || [])) if (u.id && u.password) pwMap[u.id] = u.password
      incoming.users = incoming.users.map((u: any) => ({ ...u, password: u.password || pwMap[u.id] || '' }))
    }
    await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key, value, updated_at) VALUES (?, ?, ?)').bind('main', JSON.stringify(incoming), new Date().toISOString()).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── R2 Upload API ────────────────────────────────────────
app.post('/api/upload', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const form = await c.req.formData()
    const file = form.get('file') as File | null
    if (!file) return c.json({ error: 'No file provided' }, 400)
    const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 10).toLowerCase()
    // Browsers on Windows/Linux often report an empty MIME for HEIC files — infer from extension
    const EXT_MIME: Record<string, string> = { heic: 'image/heic', heif: 'image/heif', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', pdf: 'application/pdf' }
    const mimeType = file.type || EXT_MIME[ext] || ''
    if (!ALLOWED_MIME.has(mimeType)) return c.json({ error: 'File type not allowed' }, 400)
    const folder = (c.req.query('folder') || 'gallery').replace(/[^a-z0-9_-]/gi, '')
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    await c.env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: mimeType } })
    const url = `https://pub-92df4935826e41f29b59fa7b32da3a0d.r2.dev/${key}`
    return c.json({ ok: true, url, key })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.delete('/api/upload', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const { key } = await c.req.json()
    if (key) await c.env.MEDIA.delete(key)
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// Custom Assignment file upload — staff-only (any logged-in role except parent).
// Accepts images and PDFs; images get zoom/pan/rotation, PDFs get rotation only.
app.post('/api/custom-assignments/upload', async (c) => {
  const sess = await getSession(c)
  if (!isNonParentStaff(sess)) return c.json({ error: 'Staff login required' }, 401)
  try {
    const form = await c.req.formData()
    const file = form.get('file') as File | null
    if (!file) return c.json({ error: 'No file provided' }, 400)
    if (file.size > 10 * 1024 * 1024) return c.json({ error: 'File too large (max 10MB)' }, 400)
    const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 10).toLowerCase()
    const EXT_MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf' }
    const mimeType = file.type || EXT_MIME[ext] || ''
    const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])
    if (!ALLOWED.has(mimeType)) return c.json({ error: 'Only JPG, PNG, GIF, WEBP, or PDF files are allowed' }, 400)
    const fileType = mimeType === 'application/pdf' ? 'pdf' : 'image'
    const key = `custom-assignments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    await c.env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: mimeType } })
    return c.json({ ok: true, key, fileType })
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
    const metaRow = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('main').first<{value:string}>()
    const metaData = metaRow ? JSON.parse(metaRow.value) : {}
    const effectiveKey = c.env.RESEND_API_KEY || (metaData.meta && metaData.meta.resendApiKey) || ''
    const resendConfigured = !!effectiveKey
    const keySource = c.env.RESEND_API_KEY ? 'cloudflare-secret' : (metaData.meta && metaData.meta.resendApiKey ? 'db-settings' : 'not-set')
    const keyPrefix = effectiveKey ? effectiveKey.slice(0, 6) + '...' : 'NOT SET'
    return c.json({ ok: true, message: 'D1 connected', rows: row?.cnt ?? 0, resendConfigured, keySource, keyPrefix })
  } catch (e: any) { return c.json({ ok: false, message: e.message || 'D1 not available' }) }
})

// ── Auth API ─────────────────────────────────────────────────
app.post('/api/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    if (!username || !password) return c.json({ error: 'Username and password required' }, 400)
    await c.env.DB.exec(`CREATE TABLE IF NOT EXISTS app_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('main').first<{value:string}>()
    if (!row) return c.json({ error: 'Invalid credentials' }, 401)
    const data = JSON.parse(row.value)
    const user = (data.users || []).find((u: any) =>
      u.username === String(username).trim() && u.password === String(password) && !u.deleted
    )
    if (!user) return c.json({ error: 'Invalid credentials' }, 401)
    if (!user.active) return c.json({ error: 'Account not activated. Please contact the school.' }, 401)
    await ensureSessionTable(c.env.DB)
    const token = crypto.randomUUID()
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000
    await c.env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND expires_at < ?').bind(user.id, Date.now()).run()
    await c.env.DB.prepare('INSERT INTO sessions (token,user_id,role,expires_at) VALUES (?,?,?,?)').bind(token, user.id, user.role, expiresAt).run()
    const { password: _pw, ...safeUser } = user
    return c.json({ ok: true, token, user: safeUser })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/logout', async (c) => {
  try {
    const auth = c.req.header('Authorization') || ''
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7)
      await ensureSessionTable(c.env.DB)
      await c.env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(token).run()
    }
    return c.json({ ok: true })
  } catch { return c.json({ ok: true }) }
})

app.get('/api/session', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ ok: false }, 401)
  try {
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('main').first<{value:string}>()
    if (!row) return c.json({ ok: false }, 401)
    const data = JSON.parse(row.value)
    const user = (data.users || []).find((u: any) => u.id === sess.user_id && !u.deleted && u.active)
    if (!user) return c.json({ ok: false }, 401)
    const { password: _pw, ...safeUser } = user
    return c.json({ ok: true, user: safeUser })
  } catch { return c.json({ ok: false }, 401) }
})

// Dedicated gallery sync — accepts just published items array (small payload)
app.post('/api/gallery/sync', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
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

const Layout = ({ children, title = 'SuperKids India Preschool', description = '', canonical = '', jsonLd = '' }: { children: any; title?: string; description?: string; canonical?: string; jsonLd?: string }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  ${description ? `<meta name="description" content="${description}" />` : ''}
  ${canonical ? `<link rel="canonical" href="${canonical}" />` : ''}
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="SuperKids India Preschool" />
  <meta property="og:title" content="${title}" />
  ${description ? `<meta property="og:description" content="${description}" />` : ''}
  ${canonical ? `<meta property="og:url" content="${canonical}" />` : ''}
  <meta property="og:image" content="https://superkidsindia.com/static/school-logo.png" />
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  ${description ? `<meta name="twitter:description" content="${description}" />` : ''}
  <meta name="twitter:image" content="https://superkidsindia.com/static/school-logo.png" />
  <!-- Indexing -->
  <meta name="robots" content="index, follow" />
  <meta name="googlebot" content="index, follow" />
  <link rel="icon" type="image/png" sizes="192x192" href="/static/favicon-192.png">
  <link rel="shortcut icon" href="/static/favicon-192.png">
  <link rel="apple-touch-icon" href="/static/favicon-192.png">
  ${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Nunito:wght@200;300;400;600;700;800;900&family=Raleway+Dots&display=swap" rel="stylesheet">
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
          <a href="/assignments" class="nav-link ${active === 'assignments' ? 'active' : ''}" style="color:${active === 'assignments' ? '#0F2050' : '#2A3B60'}">Assignment</a>
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
      <a href="/assignments" style="color:#2A3B60;padding:10px 12px;font-weight:700;border-radius:8px;display:block;text-decoration:none" onmouseover="this.style.background='#E8EDF5';this.style.color='#0F2050'" onmouseout="this.style.background='';this.style.color='#2A3B60'">📝 Assignment</a>
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
            {label:'Assignment',href:'/assignments'},
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
      <p style="color:#5A6E8F;font-size:0.85rem">© ${new Date().getFullYear()} SuperKids India Preschool. All rights reserved. Made with ❤️ for little superheroes.</p>
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
      ${Array(2).fill([`✦ Enrollment Open for ${new Date().getFullYear()}!`, '🦸 Be A SuperKid!', '✦ Award-Winning Curriculum', '❤️ Safe & Nurturing Environment', '✦ Small Class Sizes', '🎨 Creative Learning Every Day']).flat().map(t =>
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
            <p style="color:#2A3B60;line-height:1.8;font-size:0.95rem;margin-bottom:1.5rem;font-style:italic">&ldquo;${esc(t.text)}&rdquo;</p>
            <div class="flex items-center gap-3">
              <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#0F2050,#1AA6CA);display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:900;color:#fff;flex-shrink:0">
                ${esc(t.parentName.charAt(0).toUpperCase())}
              </div>
              <div>
                <div style="font-weight:800;color:#0F1E3D">${esc(t.parentName)}</div>
                <div style="color:#6B7A9D;font-size:0.85rem">${esc(t.childInfo)}</div>
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
        Limited spots available for ${new Date().getFullYear()}! Schedule a tour today and discover why hundreds of families
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
  return c.html(Layout({
    children: content,
    title: 'SuperKids India Preschool – Bhosari, Pune | Best Preschool for Ages 1.5–6',
    description: 'SuperKids India Preschool in Bhosari, Pune offers play-based early childhood education for ages 1.5–6. Nursery, Jr. KG, Sr. KG, Day Care & more. Enroll today!',
    canonical: 'https://superkidsindia.com/',
    jsonLd: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Preschool",
      "name": "SuperKids India Preschool",
      "url": "https://superkidsindia.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://superkidsindia.com/static/school-logo.png",
        "width": 481,
        "height": 519
      },
      "image": "https://superkidsindia.com/static/school-logo.png",
      "description": "Play-based early childhood education for ages 1.5–6 in Bhosari, Pune.",
      "telephone": "+91-9822-977-644",
      "email": "superkidsprincipal@gmail.com",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Matoshri Apartment, Plot Number 51, Sector No 10, Bhosari Pradhikaran",
        "addressLocality": "Bhosari",
        "addressRegion": "Pune",
        "postalCode": "411026",
        "addressCountry": "IN"
      },
      "geo": { "@type": "GeoCoordinates", "latitude": "18.638", "longitude": "73.858" },
      "openingHours": "Mo-Sa 08:45-15:00",
      "sameAs": ["https://superkidsindia.com"]
    })
  }))
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
            Founded in 2026 by Er. Niv Pawar, a child development specialist,
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
            <h3 style="font-weight:800;color:#0F1E3D;margin-bottom:0.25rem">${esc(t.name)}</h3>
            <p style="color:${esc(t.color)};font-size:0.85rem;font-weight:700;margin-bottom:0.5rem">${esc(t.role)}</p>
            ${t.certification ? `<div class="badge mb-2" style="background:${esc(t.color)}18;color:${esc(t.color)};border:1px solid ${esc(t.color)}33;font-size:0.7rem">${esc(t.certification)}</div>` : ''}
            ${t.experience ? `<p style="color:#6B7A9D;font-size:0.8rem">${esc(t.experience)} experience</p>` : ''}
            ${t.bio ? `<p style="color:#6B7A9D;font-size:0.78rem;margin-top:6px;line-height:1.5">${esc(t.bio)}</p>` : ''}
          </div>`
        }).join('')}
      </div>
    </div>
  </section>

  ${Footer()}
  `
  return c.html(Layout({ children: content, title: 'About Us – SuperKids India Preschool, Bhosari Pune', description: 'Learn about SuperKids India Preschool – our mission, teaching philosophy, experienced faculty, and commitment to nurturing every child\'s potential in Bhosari, Pune.', canonical: 'https://superkidsindia.com/about' }))
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
          {time:'8:45 AM', activity:'Super Arrival & Morning Welcome', emoji:'🌅', color:'#0F2050'},
          {time:'9:00 AM', activity:'Morning Circle & Calendar', emoji:'📅', color:'#C4893A'},
          {time:'9:30 AM', activity:'Learning Centers & STEAM', emoji:'🔬', color:'#1AA6CA'},
          {time:'10:30 AM', activity:'Outdoor Hero Training', emoji:'🌳', color:'#0F2050'},
          {time:'11:30 AM', activity:'Creative Arts & Music', emoji:'🎨', color:'#C4893A'},
          {time:'12:30 PM', activity:'Lunch & Rest Time', emoji:'😴', color:'#E8B020'},
          {time:'1:30 PM', activity:'Story Time & Reading', emoji:'📚', color:'#1AA6CA'},
          {time:'2:15 PM', activity:'Science & Discovery', emoji:'🧪', color:'#0F2050'},
          {time:'3:00 PM', activity:'Wind Down & Pickup', emoji:'🌟', color:'#C4893A'},
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
  return c.html(Layout({ children: content, title: 'Programs & Curriculum – SuperKids India Preschool', description: 'Explore our programs: Playgroup, Nursery, Jr. KG, Sr. KG, Day Care, and After School. Play-based learning designed for children aged 1.5–6 in Bhosari, Pune.', canonical: 'https://superkidsindia.com/programs' }))
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
  return c.html(Layout({ children: content, title: 'Gallery – SuperKids India Preschool', description: 'See our classrooms, activities, events, and happy children at SuperKids India Preschool in Bhosari, Pune.', canonical: 'https://superkidsindia.com/gallery' }))
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
  return c.html(Layout({ children: content, title: 'Contact & Enroll – SuperKids India Preschool, Bhosari Pune', description: 'Contact SuperKids India Preschool to book a visit or enroll your child. Located at Matoshri Apartment, Sector 10, Bhosari Pradhikaran, Pune 411026. Call: 9822-977-644.', canonical: 'https://superkidsindia.com/contact' }))
})

// ================================================================
// ── Assignment (printable worksheets by Class & Subject) ───────
// ================================================================
type AssignClass = { id: string; name: string; age: string; color: string; level: number }
type AssignSubject = { id: string; name: string; emoji: string; color: string }
type Category = { key: string; count: number }

const ASSIGNMENT_CLASSES: AssignClass[] = [
  { id: 'playgroup', name: 'Play Group', age: '1.5–2.5 yrs', color: '#E4572E', level: 1 },
  { id: 'nursery',   name: 'Nursery',    age: '2.5–3.5 yrs', color: '#1AA6CA', level: 2 },
  { id: 'jrkg',      name: 'Jr. KG',     age: '3.5–4.5 yrs', color: '#E8B020', level: 3 },
  { id: 'srkg',      name: 'Sr. KG',     age: '4.5–5.5 yrs', color: '#0F2050', level: 4 },
]

const ASSIGNMENT_SUBJECTS: AssignSubject[] = [
  { id: 'english', name: 'English',          emoji: '🔤', color: '#0F2050' },
  { id: 'math',    name: 'Math',             emoji: '🔢', color: '#1AA6CA' },
  { id: 'evs',     name: 'EVS',              emoji: '🌎', color: '#10B981' },
  { id: 'rhymes',  name: 'Rhymes & Stories', emoji: '🎵', color: '#C4893A' },
  { id: 'art',     name: 'Art & Craft',      emoji: '🎨', color: '#E8B020' },
  { id: 'hindi',   name: 'Hindi / Marathi',  emoji: '📖', color: '#7C3AED' },
]

function findAssignClass(id: string): AssignClass | undefined { return ASSIGNMENT_CLASSES.find(x => x.id === id) }
function findAssignSubject(id: string): AssignSubject | undefined { return ASSIGNMENT_SUBJECTS.find(x => x.id === id) }

// ── Custom Assignments (user-uploaded, class/subject-tagged) ────
async function ensureCustomAssignmentTable(db: any) {
  await db.exec(`CREATE TABLE IF NOT EXISTS custom_assignments (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, subject_id TEXT NOT NULL, title TEXT NOT NULL, image_key TEXT NOT NULL, zoom REAL DEFAULT 1, pan_x REAL DEFAULT 0, pan_y REAL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
  // Schema migrations for columns added after the table already existed in production.
  try { await db.exec(`ALTER TABLE custom_assignments ADD COLUMN rotation REAL DEFAULT 0`) } catch { /* column already exists */ }
  try { await db.exec(`ALTER TABLE custom_assignments ADD COLUMN file_type TEXT DEFAULT 'image'`) } catch { /* column already exists */ }
}
type CustomAssignmentRow = { id: string; class_id: string; subject_id: string; title: string; image_key: string; zoom: number; pan_x: number; pan_y: number; rotation: number; file_type: string; created_at: string }
function caTransform(row: CustomAssignmentRow): string {
  return `translate(${row.pan_x}%,${row.pan_y}%) scale(${row.zoom}) rotate(${row.rotation || 0}deg)`
}
// Custom Assignment creation/deletion is restricted to logged-in staff — any role except 'parent'.
function isNonParentStaff(sess: { role: string } | null): boolean {
  return !!sess && sess.role !== 'parent'
}

// ── Category helpers (dynamic per-subject, per-class sheet counts) ─
function categoryTotal(categories: Category[]): number { return categories.reduce((s, c) => s + c.count, 0) }
function resolveCategory(num: number, categories: Category[]): { key: string; idx: number } {
  let acc = 0
  for (const c of categories) {
    if (num <= acc + c.count) return { key: c.key, idx: num - acc - 1 }
    acc += c.count
  }
  return { key: categories[categories.length - 1].key, idx: 0 }
}

const MATH_TOTAL_NUMS: Record<number, number> = { 1: 10, 2: 20, 3: 30, 4: 50 }
const MATH_ROWS_PER_SHEET: Record<number, number> = { 1: 6, 2: 6, 3: 7, 4: 8 }
const MATH_COUNT_MAX: Record<number, number> = { 1: 5, 2: 8, 3: 12, 4: 16 }
const ENGLISH_ROWS_PER_SHEET: Record<number, number> = { 1: 6, 2: 6, 3: 7, 4: 8 }
const LINE_ROWS_PER_SHEET: Record<number, number> = { 1: 6, 2: 6, 3: 7, 4: 8 }

function getMathCategories(level: number): Category[] {
  return [
    { key: 'numtrace', count: MATH_TOTAL_NUMS[level] },
    { key: 'count', count: 6 },
    { key: 'pattern', count: 6 },
    { key: 'shapes', count: 3 },
    { key: 'ops', count: 6 },
    { key: 'missing', count: 4 },
    { key: 'size', count: 4 },
  ]
}
function getEnglishCategories(_level: number): Category[] {
  return [
    { key: 'alpha', count: 26 },
    { key: 'lines', count: 6 },
    { key: 'word', count: 20 },
    { key: 'sentence', count: 6 },
    { key: 'beginsound', count: 6 },
    { key: 'rhymewords', count: 4 },
  ]
}
function getEvsCategories(_level: number): Category[] {
  return [
    { key: 'vocab', count: 18 },
    { key: 'colors', count: 10 },
    { key: 'oddoneout', count: 6 },
  ]
}
function getRhymesCategories(_level: number): Category[] {
  return [{ key: 'rhyme', count: 18 }]
}
function getArtCategories(_level: number): Category[] {
  return [{ key: 'art', count: 24 }]
}
function getHindiCategories(level: number): Category[] {
  return level <= 2
    ? [{ key: 'letter', count: 7 }, { key: 'word', count: 5 }]
    : [{ key: 'letter', count: 17 }, { key: 'word', count: 5 }]
}
function getCategoriesFor(subjectId: string, level: number): Category[] {
  switch (subjectId) {
    case 'english': return getEnglishCategories(level)
    case 'math': return getMathCategories(level)
    case 'evs': return getEvsCategories(level)
    case 'rhymes': return getRhymesCategories(level)
    case 'art': return getArtCategories(level)
    default: return getHindiCategories(level)
  }
}
function getSubjectSetCount(subjectId: string, level: number): number {
  return categoryTotal(getCategoriesFor(subjectId, level))
}

// ── Content pools ───────────────────────────────────────────────
const ALPHABET_WORDS: { ch: string; word: string; emoji: string; extras: { word: string; emoji: string }[] }[] = [
  { ch: 'A', word: 'Apple',     emoji: '🍎', extras: [{ word: 'Ant', emoji: '🐜' }, { word: 'Airplane', emoji: '✈️' }] },
  { ch: 'B', word: 'Ball',      emoji: '⚽', extras: [{ word: 'Banana', emoji: '🍌' }, { word: 'Butterfly', emoji: '🦋' }] },
  { ch: 'C', word: 'Cat',       emoji: '🐱', extras: [{ word: 'Car', emoji: '🚗' }, { word: 'Cake', emoji: '🎂' }] },
  { ch: 'D', word: 'Dog',       emoji: '🐶', extras: [{ word: 'Duck', emoji: '🦆' }, { word: 'Drum', emoji: '🥁' }] },
  { ch: 'E', word: 'Elephant',  emoji: '🐘', extras: [{ word: 'Egg', emoji: '🥚' }, { word: 'Ear', emoji: '👂' }] },
  { ch: 'F', word: 'Fish',      emoji: '🐟', extras: [{ word: 'Flower', emoji: '🌸' }, { word: 'Frog', emoji: '🐸' }] },
  { ch: 'G', word: 'Grapes',    emoji: '🍇', extras: [{ word: 'Goat', emoji: '🐐' }, { word: 'Guitar', emoji: '🎸' }] },
  { ch: 'H', word: 'Hat',       emoji: '🎩', extras: [{ word: 'Horse', emoji: '🐎' }, { word: 'House', emoji: '🏠' }] },
  { ch: 'I', word: 'Ice Cream', emoji: '🍦', extras: [{ word: 'Insect', emoji: '🐛' }, { word: 'Ink', emoji: '🖊️' }] },
  { ch: 'J', word: 'Juice',     emoji: '🧃', extras: [{ word: 'Jacket', emoji: '🧥' }, { word: 'Jeep', emoji: '🚙' }] },
  { ch: 'K', word: 'Kite',      emoji: '🪁', extras: [{ word: 'Key', emoji: '🔑' }, { word: 'Koala', emoji: '🐨' }] },
  { ch: 'L', word: 'Lion',      emoji: '🦁', extras: [{ word: 'Leaf', emoji: '🍃' }, { word: 'Lemon', emoji: '🍋' }] },
  { ch: 'M', word: 'Moon',      emoji: '🌙', extras: [{ word: 'Monkey', emoji: '🐒' }, { word: 'Mango', emoji: '🥭' }] },
  { ch: 'N', word: 'Nest',      emoji: '🪺', extras: [{ word: 'Nose', emoji: '👃' }, { word: 'Net', emoji: '🥅' }] },
  { ch: 'O', word: 'Orange',    emoji: '🍊', extras: [{ word: 'Owl', emoji: '🦉' }, { word: 'Octopus', emoji: '🐙' }] },
  { ch: 'P', word: 'Pig',       emoji: '🐷', extras: [{ word: 'Pencil', emoji: '✏️' }, { word: 'Pumpkin', emoji: '🎃' }] },
  { ch: 'Q', word: 'Queen',     emoji: '👑', extras: [{ word: 'Quill', emoji: '🪶' }, { word: 'Question', emoji: '❓' }] },
  { ch: 'R', word: 'Rainbow',   emoji: '🌈', extras: [{ word: 'Rabbit', emoji: '🐇' }, { word: 'Rose', emoji: '🌹' }] },
  { ch: 'S', word: 'Sun',       emoji: '☀️', extras: [{ word: 'Star', emoji: '⭐' }, { word: 'Snake', emoji: '🐍' }] },
  { ch: 'T', word: 'Tree',      emoji: '🌳', extras: [{ word: 'Tiger', emoji: '🐯' }, { word: 'Train', emoji: '🚂' }] },
  { ch: 'U', word: 'Umbrella',  emoji: '☂️', extras: [{ word: 'Unicorn', emoji: '🦄' }, { word: 'UFO', emoji: '🛸' }] },
  { ch: 'V', word: 'Van',       emoji: '🚐', extras: [{ word: 'Violin', emoji: '🎻' }, { word: 'Volcano', emoji: '🌋' }] },
  { ch: 'W', word: 'Watermelon',emoji: '🍉', extras: [{ word: 'Whale', emoji: '🐳' }, { word: 'Watch', emoji: '⌚' }] },
  { ch: 'X', word: 'X-ray',     emoji: '🩻', extras: [{ word: 'Xylophone', emoji: '🎹' }] },
  { ch: 'Y', word: 'Yo-yo',     emoji: '🪀', extras: [{ word: 'Yarn', emoji: '🧶' }, { word: 'Yellow', emoji: '🟡' }] },
  { ch: 'Z', word: 'Zebra',     emoji: '🦓', extras: [{ word: 'Zero', emoji: '0️⃣' }] },
]

const CVC_WORDS: { w: string; e: string }[] = [
  {w:'Cat',e:'🐱'}, {w:'Dog',e:'🐶'}, {w:'Sun',e:'☀️'}, {w:'Hat',e:'🎩'},
  {w:'Pen',e:'🖊️'}, {w:'Cup',e:'☕'}, {w:'Bed',e:'🛏️'}, {w:'Fox',e:'🦊'},
  {w:'Map',e:'🗺️'}, {w:'Net',e:'🥅'}, {w:'Pig',e:'🐷'}, {w:'Top',e:'🎯'},
  {w:'Van',e:'🚐'}, {w:'Box',e:'📦'}, {w:'Jam',e:'🍯'}, {w:'Egg',e:'🥚'},
  {w:'Owl',e:'🦉'}, {w:'Bus',e:'🚌'}, {w:'Kite',e:'🪁'}, {w:'Star',e:'⭐'},
]

const SENTENCES_BY_LEVEL: Record<number, string[]> = {
  1: ['I am happy.', 'I see a cat.', 'I like milk.', 'Go up.', 'Sit down.', 'I love mom.'],
  2: ['I am happy.', 'I like my mom.', 'The cat is fat.', 'I see a red bus.', 'I can hop.', 'The sun is hot.'],
  3: ['I can run and jump.', 'The dog can bark.', 'I see a big tree.', 'We play in the park.', 'The sun is bright today.', 'I like to read books.'],
  4: ['I can run and jump very fast.', 'The little dog likes to play outside.', 'We visited the zoo last Sunday.', 'My family enjoys reading books together.', 'The bright sun makes me feel happy.', 'I want to grow up and help others.'],
}

const BEGIN_SOUND_ITEMS: { e: string; word: string; letter: string }[] = [
  {e:'🍎',word:'Apple',letter:'A'}, {e:'🐶',word:'Dog',letter:'D'}, {e:'🐟',word:'Fish',letter:'F'},
  {e:'🐘',word:'Elephant',letter:'E'}, {e:'⚽',word:'Ball',letter:'B'}, {e:'🐱',word:'Cat',letter:'C'},
  {e:'🎩',word:'Hat',letter:'H'}, {e:'🦁',word:'Lion',letter:'L'}, {e:'🌙',word:'Moon',letter:'M'},
  {e:'🐷',word:'Pig',letter:'P'}, {e:'☀️',word:'Sun',letter:'S'}, {e:'🌳',word:'Tree',letter:'T'},
  {e:'🚐',word:'Van',letter:'V'}, {e:'🦓',word:'Zebra',letter:'Z'}, {e:'🪁',word:'Kite',letter:'K'},
  {e:'🧃',word:'Juice',letter:'J'}, {e:'🍇',word:'Grapes',letter:'G'}, {e:'☂️',word:'Umbrella',letter:'U'},
]

const RHYMING_PAIRS: { a: { w: string; e: string }; b: { w: string; e: string }; distractor: { w: string; e: string } }[] = [
  { a:{w:'Cat',e:'🐱'}, b:{w:'Hat',e:'🎩'}, distractor:{w:'Dog',e:'🐶'} },
  { a:{w:'Sun',e:'☀️'}, b:{w:'Bun',e:'🍞'}, distractor:{w:'Moon',e:'🌙'} },
  { a:{w:'Star',e:'⭐'}, b:{w:'Car',e:'🚗'}, distractor:{w:'Tree',e:'🌳'} },
  { a:{w:'Fox',e:'🦊'}, b:{w:'Box',e:'📦'}, distractor:{w:'Bee',e:'🐝'} },
]

const EVS_TOPICS: { title: string; items: { e: string; label: string }[] }[] = [
  { title: 'My Body Parts', items: [{e:'👁️',label:'Eye'},{e:'👃',label:'Nose'},{e:'👂',label:'Ear'},{e:'👄',label:'Mouth'},{e:'🦷',label:'Teeth'},{e:'🖐️',label:'Hand'},{e:'🦶',label:'Foot'},{e:'💇',label:'Hair'}] },
  { title: 'Wild Animals', items: [{e:'🦁',label:'Lion'},{e:'🐯',label:'Tiger'},{e:'🐘',label:'Elephant'},{e:'🦒',label:'Giraffe'},{e:'🦓',label:'Zebra'},{e:'🐒',label:'Monkey'},{e:'🐊',label:'Crocodile'},{e:'🦍',label:'Gorilla'}] },
  { title: 'Domestic Animals', items: [{e:'🐶',label:'Dog'},{e:'🐱',label:'Cat'},{e:'🐄',label:'Cow'},{e:'🐐',label:'Goat'},{e:'🐑',label:'Sheep'},{e:'🐎',label:'Horse'},{e:'🐖',label:'Pig'},{e:'🐇',label:'Rabbit'}] },
  { title: 'Birds', items: [{e:'🐦',label:'Sparrow'},{e:'🦜',label:'Parrot'},{e:'🦚',label:'Peacock'},{e:'🦢',label:'Swan'},{e:'🦉',label:'Owl'},{e:'🐓',label:'Hen'},{e:'🦩',label:'Flamingo'},{e:'🦆',label:'Duck'}] },
  { title: 'Fruits', items: [{e:'🍎',label:'Apple'},{e:'🍌',label:'Banana'},{e:'🍇',label:'Grapes'},{e:'🍊',label:'Orange'},{e:'🍉',label:'Watermelon'},{e:'🍓',label:'Strawberry'},{e:'🥭',label:'Mango'},{e:'🍍',label:'Pineapple'}] },
  { title: 'Vegetables', items: [{e:'🥕',label:'Carrot'},{e:'🥦',label:'Broccoli'},{e:'🍆',label:'Brinjal'},{e:'🥔',label:'Potato'},{e:'🌽',label:'Corn'},{e:'🧅',label:'Onion'},{e:'🥒',label:'Cucumber'},{e:'🍅',label:'Tomato'}] },
  { title: 'Land Transport', items: [{e:'🚗',label:'Car'},{e:'🚌',label:'Bus'},{e:'🚲',label:'Bicycle'},{e:'🚂',label:'Train'},{e:'🏍️',label:'Bike'},{e:'🚕',label:'Taxi'},{e:'🚚',label:'Truck'},{e:'🛺',label:'Auto'}] },
  { title: 'Water & Air Transport', items: [{e:'⛵',label:'Boat'},{e:'🚤',label:'Speedboat'},{e:'🛳️',label:'Ship'},{e:'✈️',label:'Airplane'},{e:'🚁',label:'Helicopter'},{e:'🛶',label:'Canoe'},{e:'⚓',label:'Anchor'},{e:'🚀',label:'Rocket'}] },
  { title: 'My Family', items: [{e:'👨',label:'Father'},{e:'👩',label:'Mother'},{e:'👦',label:'Brother'},{e:'👧',label:'Sister'},{e:'👴',label:'Grandpa'},{e:'👵',label:'Grandma'},{e:'👶',label:'Baby'},{e:'👪',label:'Family'}] },
  { title: 'Good Habits', items: [{e:'🪥',label:'Brush Teeth'},{e:'🛁',label:'Bathe Daily'},{e:'🙏',label:'Say Thanks'},{e:'📚',label:'Read Books'},{e:'🥗',label:'Eat Healthy'},{e:'😴',label:'Sleep Early'},{e:'🧹',label:'Keep Clean'},{e:'🚰',label:'Wash Hands'}] },
  { title: 'Community Helpers', items: [{e:'👮',label:'Police'},{e:'🧑‍🚒',label:'Firefighter'},{e:'👨‍⚕️',label:'Doctor'},{e:'👨‍🏫',label:'Teacher'},{e:'👨‍🌾',label:'Farmer'},{e:'📮',label:'Postman'},{e:'👷',label:'Builder'},{e:'🧑‍🍳',label:'Cook'}] },
  { title: 'Festivals of India', items: [{e:'🪔',label:'Diwali'},{e:'🎨',label:'Holi'},{e:'🎊',label:'Eid'},{e:'🌟',label:'Christmas'},{e:'🪁',label:'Makar Sankranti'},{e:'🙏',label:'Ganesh Chaturthi'},{e:'🎆',label:'New Year'},{e:'🌾',label:'Pongal'}] },
  { title: 'National Symbols', items: [{e:'🇮🇳',label:'National Flag'},{e:'🦚',label:'National Bird'},{e:'🐯',label:'National Animal'},{e:'🌸',label:'National Flower'},{e:'🏏',label:'National Sport'},{e:'🌾',label:'National Fruit'},{e:'🎵',label:'National Anthem'},{e:'🏛️',label:'National Emblem'}] },
  { title: 'Seasons', items: [{e:'☀️',label:'Summer'},{e:'🌧️',label:'Monsoon'},{e:'❄️',label:'Winter'},{e:'🍂',label:'Autumn'},{e:'🌸',label:'Spring'},{e:'🌤️',label:'Pleasant Day'},{e:'⛄',label:'Snowfall'},{e:'🌡️',label:'Weather'}] },
  { title: 'Days of the Week', items: [{e:'1️⃣',label:'Monday'},{e:'2️⃣',label:'Tuesday'},{e:'3️⃣',label:'Wednesday'},{e:'4️⃣',label:'Thursday'},{e:'5️⃣',label:'Friday'},{e:'6️⃣',label:'Saturday'},{e:'7️⃣',label:'Sunday'},{e:'📅',label:'Week'}] },
  { title: 'Colors Around Us', items: [{e:'🔴',label:'Red'},{e:'🔵',label:'Blue'},{e:'🟡',label:'Yellow'},{e:'🟢',label:'Green'},{e:'🟠',label:'Orange'},{e:'🟣',label:'Purple'},{e:'⚪',label:'White'},{e:'⚫',label:'Black'}] },
  { title: 'Water Animals', items: [{e:'🐟',label:'Fish'},{e:'🐠',label:'Tropical Fish'},{e:'🐬',label:'Dolphin'},{e:'🐳',label:'Whale'},{e:'🐢',label:'Turtle'},{e:'🦀',label:'Crab'},{e:'🦑',label:'Squid'},{e:'🐡',label:'Pufferfish'}] },
  { title: 'My Senses', items: [{e:'👀',label:'Sight'},{e:'👃',label:'Smell'},{e:'👂',label:'Hearing'},{e:'👅',label:'Taste'},{e:'🖐️',label:'Touch'},{e:'🧠',label:'Think'},{e:'❤️',label:'Feel'},{e:'🗣️',label:'Speak'}] },
]

const ODD_ONE_OUT: { items: { e: string; label: string }[]; oddIdx: number; hint: string }[] = [
  { items: [{e:'🍎',label:'Apple'},{e:'🍌',label:'Banana'},{e:'🍇',label:'Grapes'},{e:'🚗',label:'Car'}], oddIdx: 3, hint: 'Find the one that is not a fruit!' },
  { items: [{e:'🐶',label:'Dog'},{e:'🐱',label:'Cat'},{e:'🐄',label:'Cow'},{e:'✈️',label:'Airplane'}], oddIdx: 3, hint: 'Find the one that is not an animal!' },
  { items: [{e:'🔴',label:'Red'},{e:'🔵',label:'Blue'},{e:'🟡',label:'Yellow'},{e:'🐟',label:'Fish'}], oddIdx: 3, hint: 'Find the one that is not a color!' },
  { items: [{e:'🚗',label:'Car'},{e:'🚌',label:'Bus'},{e:'🚲',label:'Bicycle'},{e:'🍕',label:'Pizza'}], oddIdx: 3, hint: 'Find the one that is not a vehicle!' },
  { items: [{e:'☀️',label:'Sun'},{e:'🌙',label:'Moon'},{e:'⭐',label:'Star'},{e:'🐕',label:'Dog'}], oddIdx: 3, hint: 'Find the one that is not in the sky!' },
  { items: [{e:'👁️',label:'Eye'},{e:'👃',label:'Nose'},{e:'👂',label:'Ear'},{e:'🍪',label:'Cookie'}], oddIdx: 3, hint: 'Find the one that is not a body part!' },
]

const COLOR_WORDS: { name: string; hex: string; matches: { e: string; label: string }[]; distractors: { e: string; label: string }[] }[] = [
  { name: 'Red', hex: '#E53E3E',
    matches: [{e:'🍎',label:'Apple'},{e:'🎈',label:'Balloon'},{e:'🌹',label:'Rose'},{e:'🍓',label:'Strawberry'},{e:'🍒',label:'Cherry'}],
    distractors: [{e:'🍌',label:'Banana'},{e:'🐸',label:'Frog'},{e:'🍇',label:'Grapes'},{e:'☀️',label:'Sun'},{e:'🍋',label:'Lemon'},{e:'🌿',label:'Leaf'},{e:'🍊',label:'Orange'}] },
  { name: 'Blue', hex: '#3182CE',
    matches: [{e:'🫐',label:'Blueberry'},{e:'🦋',label:'Butterfly'},{e:'💧',label:'Water Drop'},{e:'🐟',label:'Fish'},{e:'👖',label:'Jeans'}],
    distractors: [{e:'🍎',label:'Apple'},{e:'🐰',label:'Rabbit'},{e:'🍄',label:'Mushroom'},{e:'🍒',label:'Cherry'},{e:'🌻',label:'Sunflower'},{e:'🍞',label:'Bread'},{e:'🥕',label:'Carrot'}] },
  { name: 'Yellow', hex: '#ECC94B',
    matches: [{e:'🍌',label:'Banana'},{e:'🌻',label:'Sunflower'},{e:'⭐',label:'Star'},{e:'🍋',label:'Lemon'},{e:'🐥',label:'Chick'}],
    distractors: [{e:'🍇',label:'Grapes'},{e:'🐸',label:'Frog'},{e:'🍅',label:'Tomato'},{e:'🌳',label:'Tree'},{e:'🫐',label:'Blueberry'},{e:'🍆',label:'Brinjal'},{e:'🐳',label:'Whale'}] },
  { name: 'Green', hex: '#38A169',
    matches: [{e:'🥦',label:'Broccoli'},{e:'🐸',label:'Frog'},{e:'🌿',label:'Leaf'},{e:'🍏',label:'Green Apple'},{e:'🥒',label:'Cucumber'}],
    distractors: [{e:'🍎',label:'Apple'},{e:'🍌',label:'Banana'},{e:'☀️',label:'Sun'},{e:'🍇',label:'Grapes'},{e:'🐟',label:'Fish'},{e:'🍓',label:'Strawberry'},{e:'🎈',label:'Balloon'}] },
  { name: 'Orange', hex: '#ED8936',
    matches: [{e:'🍊',label:'Orange'},{e:'🥕',label:'Carrot'},{e:'🎃',label:'Pumpkin'},{e:'🦊',label:'Fox'},{e:'🍑',label:'Peach'}],
    distractors: [{e:'🍎',label:'Apple'},{e:'🐟',label:'Fish'},{e:'🍇',label:'Grapes'},{e:'🌿',label:'Leaf'},{e:'🐧',label:'Penguin'},{e:'☁️',label:'Cloud'},{e:'🍋',label:'Lemon'}] },
  { name: 'Purple', hex: '#805AD5',
    matches: [{e:'🍇',label:'Grapes'},{e:'🍆',label:'Brinjal'},{e:'🔮',label:'Crystal Ball'},{e:'🟣',label:'Purple Circle'}],
    distractors: [{e:'🍎',label:'Apple'},{e:'🍌',label:'Banana'},{e:'🌳',label:'Tree'},{e:'🍊',label:'Orange'},{e:'🐟',label:'Fish'},{e:'☀️',label:'Sun'},{e:'🍓',label:'Strawberry'}] },
  { name: 'Pink', hex: '#ED64A6',
    matches: [{e:'🌸',label:'Cherry Blossom'},{e:'🎀',label:'Ribbon'},{e:'🐷',label:'Pig'},{e:'🧁',label:'Cupcake'},{e:'🩷',label:'Pink Heart'}],
    distractors: [{e:'🍎',label:'Apple'},{e:'🐸',label:'Frog'},{e:'🍇',label:'Grapes'},{e:'🌳',label:'Tree'},{e:'🐟',label:'Fish'},{e:'☀️',label:'Sun'},{e:'🍋',label:'Lemon'}] },
  { name: 'Brown', hex: '#975A16',
    matches: [{e:'🐻',label:'Bear'},{e:'🌰',label:'Chestnut'},{e:'🍫',label:'Chocolate'},{e:'🦴',label:'Bone'},{e:'🪵',label:'Wood'}],
    distractors: [{e:'🍎',label:'Apple'},{e:'🍌',label:'Banana'},{e:'🐟',label:'Fish'},{e:'🌸',label:'Flower'},{e:'☀️',label:'Sun'},{e:'🍇',label:'Grapes'},{e:'🎈',label:'Balloon'}] },
  { name: 'Black', hex: '#1A202C',
    matches: [{e:'⚫',label:'Black Circle'},{e:'🐈‍⬛',label:'Black Cat'},{e:'🎩',label:'Top Hat'},{e:'🕶️',label:'Sunglasses'},{e:'🖤',label:'Black Heart'}],
    distractors: [{e:'🍎',label:'Apple'},{e:'🍌',label:'Banana'},{e:'🌸',label:'Flower'},{e:'☀️',label:'Sun'},{e:'🍇',label:'Grapes'},{e:'🐟',label:'Fish'},{e:'🎈',label:'Balloon'}] },
  { name: 'White', hex: '#E2E8F0',
    matches: [{e:'⚪',label:'White Circle'},{e:'☁️',label:'Cloud'},{e:'🐑',label:'Sheep'},{e:'🥛',label:'Milk'},{e:'❄️',label:'Snowflake'}],
    distractors: [{e:'🍎',label:'Apple'},{e:'🍌',label:'Banana'},{e:'🌳',label:'Tree'},{e:'☀️',label:'Sun'},{e:'🍇',label:'Grapes'},{e:'🐟',label:'Fish'},{e:'🎈',label:'Balloon'}] },
]

const RHYMES: { title: string; lines: string[]; emoji: string }[] = [
  { title: 'Twinkle Twinkle Little Star', emoji: '⭐', lines: ['Twinkle, twinkle, little star,', 'How I wonder what you are!', 'Up above the world so high,', 'Like a diamond in the sky.'] },
  { title: 'Baa Baa Black Sheep', emoji: '🐑', lines: ['Baa, baa, black sheep,', 'Have you any wool?', 'Yes sir, yes sir,', 'Three bags full.'] },
  { title: 'Johny Johny Yes Papa', emoji: '👶', lines: ['Johny Johny, yes papa,', 'Eating sugar? No papa.', 'Telling lies? No papa,', 'Open your mouth, ha ha ha!'] },
  { title: 'Rain Rain Go Away', emoji: '🌧️', lines: ['Rain, rain, go away,', 'Come again another day.', 'Little children want to play,', 'Rain, rain, go away.'] },
  { title: 'Humpty Dumpty', emoji: '🥚', lines: ['Humpty Dumpty sat on a wall,', 'Humpty Dumpty had a great fall.', 'All the king\'s horses and all the king\'s men,', 'Couldn\'t put Humpty together again.'] },
  { title: 'Jack and Jill', emoji: '⛰️', lines: ['Jack and Jill went up the hill,', 'To fetch a pail of water.', 'Jack fell down and broke his crown,', 'And Jill came tumbling after.'] },
  { title: 'Row Row Row Your Boat', emoji: '🚣', lines: ['Row, row, row your boat,', 'Gently down the stream.', 'Merrily, merrily, merrily, merrily,', 'Life is but a dream.'] },
  { title: 'Old MacDonald Had a Farm', emoji: '🚜', lines: ['Old MacDonald had a farm,', 'E-I-E-I-O!', 'And on that farm he had a cow,', 'E-I-E-I-O!'] },
  { title: 'Itsy Bitsy Spider', emoji: '🕷️', lines: ['The itsy bitsy spider climbed up the water spout.', 'Down came the rain and washed the spider out.', 'Out came the sun and dried up all the rain,', 'And the itsy bitsy spider climbed up again.'] },
  { title: 'Hickory Dickory Dock', emoji: '🐭', lines: ['Hickory dickory dock,', 'The mouse ran up the clock.', 'The clock struck one,', 'The mouse ran down, hickory dickory dock.'] },
  { title: 'Mary Had a Little Lamb', emoji: '🐑', lines: ['Mary had a little lamb,', 'Its fleece was white as snow.', 'And everywhere that Mary went,', 'The lamb was sure to go.'] },
  { title: 'The Wheels on the Bus', emoji: '🚌', lines: ['The wheels on the bus go round and round,', 'Round and round, round and round.', 'The wheels on the bus go round and round,', 'All through the town.'] },
  { title: 'Are You Sleeping', emoji: '🔔', lines: ['Are you sleeping, are you sleeping,', 'Brother John, Brother John?', 'Morning bells are ringing,', 'Ding, ding, dong.'] },
  { title: 'Five Little Monkeys', emoji: '🐒', lines: ['Five little monkeys jumping on the bed,', 'One fell off and bumped his head.', 'Mama called the doctor and the doctor said,', 'No more monkeys jumping on the bed!'] },
  { title: 'If You\'re Happy and You Know It', emoji: '👏', lines: ['If you\'re happy and you know it, clap your hands.', 'If you\'re happy and you know it, clap your hands.', 'If you\'re happy and you know it, and you really want to show it,', 'If you\'re happy and you know it, clap your hands.'] },
  { title: 'One Two Buckle My Shoe', emoji: '👞', lines: ['One, two, buckle my shoe,', 'Three, four, knock at the door,', 'Five, six, pick up sticks,', 'Seven, eight, lay them straight.'] },
  { title: 'Ring a Ring o\' Roses', emoji: '🌹', lines: ['Ring a ring o\' roses,', 'A pocket full of posies.', 'A-tishoo! A-tishoo!', 'We all fall down.'] },
  { title: 'Little Miss Muffet', emoji: '🕸️', lines: ['Little Miss Muffet sat on a tuffet,', 'Eating her curds and whey.', 'Along came a spider, who sat down beside her,', 'And frightened Miss Muffet away.'] },
]

// ── Art & Craft: detailed multi-part SVG line-art (trace + color) ──
type ArtPrompt = { name: string; emoji: string; hint: string; svg: string }
const ART_PROMPTS: ArtPrompt[] = [
  { name:'Sun', emoji:'☀️', hint:'Color it yellow & orange!', svg:`<circle cx="60" cy="60" r="22" fill="#FFE9A8"/><line x1="60" y1="18" x2="60" y2="4"/><line x1="60" y1="102" x2="60" y2="116"/><line x1="18" y1="60" x2="4" y2="60"/><line x1="102" y1="60" x2="116" y2="60"/><line x1="30" y1="30" x2="20" y2="20"/><line x1="90" y1="30" x2="100" y2="20"/><line x1="30" y1="90" x2="20" y2="100"/><line x1="90" y1="90" x2="100" y2="100"/>` },
  { name:'Tree', emoji:'🌳', hint:'Color the leaves green & trunk brown!', svg:`<rect x="50" y="80" width="20" height="32" fill="#D9B382"/><circle cx="60" cy="55" r="36" fill="#A8DDA8"/><circle cx="34" cy="70" r="20" fill="#A8DDA8"/><circle cx="86" cy="70" r="20" fill="#A8DDA8"/>` },
  { name:'Apple', emoji:'🍎', hint:'Color it red!', svg:`<path d="M60,40 C40,20 10,35 14,62 C18,90 42,110 60,105 C78,110 102,90 106,62 C110,35 80,20 60,40 Z" fill="#FFB3B3"/><path d="M60,40 C58,30 56,24 60,16" fill="none"/><path d="M60,20 C68,10 80,14 78,24" fill="#B8E6B8"/>` },
  { name:'Butterfly', emoji:'🦋', hint:'Color the wings with bright colors!', svg:`<ellipse cx="34" cy="42" rx="26" ry="18" fill="#FFD6E8"/><ellipse cx="34" cy="76" rx="20" ry="14" fill="#C7E8FF"/><ellipse cx="86" cy="42" rx="26" ry="18" fill="#FFD6E8"/><ellipse cx="86" cy="76" rx="20" ry="14" fill="#C7E8FF"/><line x1="60" y1="30" x2="60" y2="94"/><line x1="60" y1="30" x2="50" y2="14"/><line x1="60" y1="30" x2="70" y2="14"/>` },
  { name:'Flower', emoji:'🌸', hint:'Color the petals pink!', svg:`<circle cx="60" cy="60" r="12" fill="#FFE9A8"/><ellipse cx="60" cy="30" rx="14" ry="20" fill="#FFC2DD"/><ellipse cx="60" cy="90" rx="14" ry="20" fill="#FFC2DD"/><ellipse cx="30" cy="60" rx="20" ry="14" fill="#FFC2DD"/><ellipse cx="90" cy="60" rx="20" ry="14" fill="#FFC2DD"/><line x1="60" y1="72" x2="60" y2="112"/><ellipse cx="70" cy="100" rx="12" ry="6" fill="#B8E6B8"/>` },
  { name:'Umbrella', emoji:'☂️', hint:'Color the canopy any color you like!', svg:`<path d="M14,60 A46,46 0 0,1 106,60" fill="#AEE6E6"/><line x1="14" y1="60" x2="14" y2="66"/><line x1="42" y1="60" x2="42" y2="66"/><line x1="60" y1="60" x2="60" y2="110"/><line x1="78" y1="60" x2="78" y2="66"/><line x1="106" y1="60" x2="106" y2="66"/><path d="M60,110 C50,110 48,100 56,98" fill="none"/>` },
  { name:'House', emoji:'🏠', hint:'Color the roof and walls!', svg:`<polygon points="60,16 108,54 12,54" fill="#F4B183"/><rect x="20" y="54" width="80" height="50" fill="#FFF3C4"/><rect x="50" y="72" width="20" height="32" fill="#C68642"/><rect x="26" y="62" width="16" height="16" fill="#BEE3F8"/><rect x="78" y="62" width="16" height="16" fill="#BEE3F8"/>` },
  { name:'Fish', emoji:'🐟', hint:'Color it blue or orange!', svg:`<ellipse cx="52" cy="60" rx="38" ry="24" fill="#FFD8A8"/><polygon points="90,60 112,42 112,78" fill="#FFD8A8"/><circle cx="34" cy="52" r="4" fill="#2D3748"/><path d="M40,60 Q52,50 64,60 Q52,70 40,60 Z" fill="none"/>` },
  { name:'Boat', emoji:'⛵', hint:'Color the sail and boat!', svg:`<polygon points="20,80 100,80 88,100 32,100" fill="#D9B382"/><line x1="60" y1="80" x2="60" y2="18"/><polygon points="60,20 60,78 24,78" fill="#D6EFFF"/><path d="M8,100 Q60,112 112,100" fill="none"/>` },
  { name:'Kite', emoji:'🪁', hint:'Color each section a different color!', svg:`<polygon points="60,10 100,55 60,110 20,55" fill="#FFD6E8"/><line x1="20" y1="55" x2="100" y2="55"/><line x1="60" y1="10" x2="60" y2="110"/><path d="M60,110 Q66,116 60,122 Q54,128 60,134" fill="none"/>` },
  { name:'Balloon', emoji:'🎈', hint:'Color it your favorite color!', svg:`<ellipse cx="60" cy="46" rx="30" ry="36" fill="#FF8FA3"/><polygon points="52,80 68,80 60,90" fill="#FF8FA3"/><path d="M60,90 Q50,100 60,110 Q70,120 62,128" fill="none"/>` },
  { name:'Star', emoji:'⭐', hint:'Color it golden yellow!', svg:`<polygon points="60,8 74,44 112,44 82,66 94,104 60,80 26,104 38,66 8,44 46,44" fill="#FFE066"/>` },
  { name:'Heart', emoji:'❤️', hint:'Color it red or pink!', svg:`<path d="M60,104 C10,70 10,26 40,20 C52,18 60,30 60,38 C60,30 68,18 80,20 C110,26 110,70 60,104 Z" fill="#FF8FA3"/>` },
  { name:'Ice Cream', emoji:'🍦', hint:'Color the scoop pink and cone brown!', svg:`<polygon points="42,58 78,58 60,110" fill="#E8C39E"/><circle cx="60" cy="42" r="26" fill="#FFC2DD"/><line x1="42" y1="70" x2="78" y2="70"/><line x1="46" y1="82" x2="74" y2="82"/>` },
  { name:'Car', emoji:'🚗', hint:'Color the body your favorite color!', svg:`<rect x="14" y="60" width="92" height="26" rx="6" fill="#A8D8FF"/><path d="M30,60 L42,34 L78,34 L90,60" fill="#A8D8FF"/><circle cx="36" cy="90" r="12" fill="#4A5568"/><circle cx="84" cy="90" r="12" fill="#4A5568"/><line x1="52" y1="34" x2="52" y2="60"/>` },
  { name:'Rainbow', emoji:'🌈', hint:'Color each arc a different color!', svg:`<path d="M10,100 A50,50 0 0,1 110,100" fill="none" style="stroke:#E53E3E"/><path d="M26,100 A34,34 0 0,1 94,100" fill="none" style="stroke:#ECC94B"/><path d="M42,100 A18,18 0 0,1 78,100" fill="none" style="stroke:#3182CE"/><ellipse cx="14" cy="102" rx="14" ry="8" fill="#EDF2F7"/><ellipse cx="106" cy="102" rx="14" ry="8" fill="#EDF2F7"/>` },
  { name:'Cake', emoji:'🎂', hint:'Color the layers and candle!', svg:`<rect x="24" y="66" width="72" height="34" fill="#FFC2DD"/><rect x="34" y="42" width="52" height="24" fill="#BEE3F8"/><line x1="60" y1="42" x2="60" y2="24"/><ellipse cx="60" cy="20" rx="5" ry="8" fill="#FFA94D"/><line x1="24" y1="82" x2="96" y2="82"/>` },
  { name:'Bird', emoji:'🐦', hint:'Color the body and wing!', svg:`<ellipse cx="56" cy="64" rx="34" ry="24" fill="#A8D8FF"/><circle cx="94" cy="46" r="14" fill="#A8D8FF"/><polygon points="106,44 120,48 106,52" fill="#FFA94D"/><ellipse cx="46" cy="70" rx="16" ry="10" fill="#7FB3E8"/><line x1="30" y1="88" x2="20" y2="100"/><line x1="46" y1="88" x2="46" y2="102"/>` },
  { name:'Elephant', emoji:'🐘', hint:'Color it grey!', svg:`<ellipse cx="56" cy="66" rx="34" ry="26" fill="#CBD5E0"/><circle cx="94" cy="46" r="20" fill="#CBD5E0"/><ellipse cx="110" cy="38" rx="14" ry="18" fill="#B8C2CE"/><path d="M78,50 Q68,80 78,100" fill="none"/><rect x="34" y="88" width="10" height="20" fill="#CBD5E0"/><rect x="70" y="88" width="10" height="20" fill="#CBD5E0"/>` },
  { name:'Duck', emoji:'🦆', hint:'Color it yellow!', svg:`<ellipse cx="56" cy="66" rx="32" ry="26" fill="#FFE066"/><circle cx="94" cy="44" r="18" fill="#FFE066"/><polygon points="108,44 122,40 122,50" fill="#FFA94D"/><ellipse cx="50" cy="60" rx="16" ry="10" fill="#F6C744"/>` },
  { name:'Snowman', emoji:'⛄', hint:'Leave it white, color the buttons & nose!', svg:`<circle cx="60" cy="90" r="26" fill="#F0F8FF"/><circle cx="60" cy="52" r="19" fill="#F0F8FF"/><circle cx="60" cy="22" r="13" fill="#F0F8FF"/><polygon points="60,26 78,30 60,34" fill="#FFA94D"/><circle cx="60" cy="82" r="3" fill="#2D3748"/><circle cx="60" cy="94" r="3" fill="#2D3748"/><line x1="41" y1="50" x2="20" y2="40"/><line x1="79" y1="50" x2="100" y2="40"/>` },
  { name:'Train', emoji:'🚂', hint:'Color the engine your favorite color!', svg:`<rect x="14" y="50" width="40" height="36" fill="#A8D8FF"/><rect x="58" y="34" width="48" height="52" fill="#FF8FA3"/><circle cx="70" cy="30" r="10" fill="#FF8FA3"/><circle cx="30" cy="98" r="10" fill="#4A5568"/><circle cx="90" cy="98" r="10" fill="#4A5568"/>` },
  { name:'Cloud', emoji:'☁️', hint:'Leave it white or color it light grey!', svg:`<circle cx="40" cy="66" r="20" fill="#EDF2F7"/><circle cx="68" cy="52" r="26" fill="#EDF2F7"/><circle cx="94" cy="66" r="18" fill="#EDF2F7"/><rect x="32" y="66" width="70" height="24" rx="12" fill="#EDF2F7"/>` },
  { name:'Ladybug', emoji:'🐞', hint:'Color it red with black spots!', svg:`<ellipse cx="60" cy="64" rx="36" ry="30" fill="#FF6B6B"/><line x1="60" y1="34" x2="60" y2="94"/><circle cx="46" cy="52" r="5" fill="#2D3748"/><circle cx="74" cy="52" r="5" fill="#2D3748"/><circle cx="46" cy="78" r="5" fill="#2D3748"/><circle cx="74" cy="78" r="5" fill="#2D3748"/><circle cx="60" cy="20" r="12" fill="#2D3748"/><line x1="52" y1="12" x2="46" y2="4"/><line x1="68" y1="12" x2="74" y2="4"/>` },
]

const HINDI_VOWELS: string[] = ['अ','आ','इ','ई','उ','ऊ','ऋ','ए','ऐ','ओ','औ','अं','अः']
const HINDI_LETTERS: string[] = [
  ...HINDI_VOWELS,
  'क','ख','ग','घ','ङ','च','छ','ज','झ','ञ','ट','ठ','ड','ढ','ण',
  'त','थ','द','ध','न','प','फ','ब','भ','म','य','र','ल','व',
  'श','ष','स','ह','ळ','क्ष','त्र','ज्ञ','श्र',
]
const HINDI_WORDS_SIMPLE: string[] = ['घर', 'आम', 'माँ', 'गाय', 'नल']
const HINDI_WORDS_ADVANCED: string[] = ['पानी', 'केला', 'सूरज', 'किताब', 'दरवाज़ा']

// ── Reusable box / row builders ──────────────────────────────────
function dottedRow(unit: string, fontSizePx: number, color: string, forceRepeats?: number): string {
  const W = 760
  const charW = fontSizePx * 0.62
  const itemW = unit.length * charW * 1.3
  const repeats = forceRepeats ? Math.max(1, Math.min(8, forceRepeats)) : Math.max(1, Math.min(5, Math.floor(W / itemW)))
  const slotW = W / repeats
  // Raleway Dots glyph metrics (measured): caps/digits ~0.68em tall, descenders ~0.32em below baseline.
  const capHeight = fontSizePx * 0.68
  const descent = fontSizePx * 0.32
  const topY = Math.round(fontSizePx * 0.06)
  const baseY = Math.round(topY + capHeight)
  const midY = Math.round((topY + baseY) / 2)
  const H = Math.round(baseY + descent + fontSizePx * 0.1)
  const itemTextLen = Math.min(slotW - 12, unit.length * charW)
  const glyphs = Array.from({ length: repeats }, (_, i) => {
    const x = Math.round(i * slotW + (slotW - itemTextLen) / 2)
    const opacity = repeats > 1 ? (1 - i * (0.72 / (repeats - 1))).toFixed(2) : '1'
    return `<text x="${x}" y="${baseY}" textLength="${itemTextLen.toFixed(0)}" lengthAdjust="spacing" font-family="'Raleway Dots',cursive" font-size="${fontSizePx}" fill="${color}" fill-opacity="${opacity}" stroke="none">${esc(unit)}</text>`
  }).join('')
  const rule = `<line x1="0" y1="${topY}" x2="${W}" y2="${topY}" stroke="#C7CEDB" stroke-width="1.5"/>` +
    `<line x1="0" y1="${midY}" x2="${W}" y2="${midY}" stroke="#B7C0D1" stroke-width="1.5" stroke-dasharray="4,4"/>` +
    `<line x1="0" y1="${baseY}" x2="${W}" y2="${baseY}" stroke="#C7CEDB" stroke-width="1.5"/>`
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMid meet" class="dotted-row" style="height:${H}px">${rule}${glyphs}</svg>`
}

function practiceSheet(bigModel: string, traceUnit: string, rows: number, wordLine: string, extraHtml: string = ''): string {
  const fontSize = traceUnit.length <= 3 ? 46 : traceUnit.length <= 8 ? 34 : 24
  const rowsHtml = Array.from({ length: rows }, () => `<div class="ps-row">${dottedRow(traceUnit, fontSize, '#0F2050')}</div>`).join('')
  return `
    <div class="ps-model">${esc(bigModel)}</div>
    ${wordLine ? `<div class="ps-wordline">${wordLine}</div>` : ''}
    <div class="ps-rows">${rowsHtml}</div>
    ${extraHtml}`
}

function numberBox(n: number, rows: number, extraHtml: string = ''): string {
  const dots = '●'.repeat(Math.min(n, 20))
  return practiceSheet(`${n}`, `${n}`, rows, `<span class="ps-dots">${dots}</span>`, extraHtml)
}

const NUM_WORDS_1_19 = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
const NUM_WORDS_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty']
function numberToWords(n: number): string {
  if (n < 20) return NUM_WORDS_1_19[n]
  const tens = Math.floor(n / 10), ones = n % 10
  return ones === 0 ? NUM_WORDS_TENS[tens] : `${NUM_WORDS_TENS[tens]}-${NUM_WORDS_1_19[ones]}`
}

function numberActivityHtml(n: number): string {
  const emoji = COUNT_EMOJI[(n - 1) % COUNT_EMOJI.length]
  const countSection = n <= 20 ? `
    <div class="na-section">
      <div class="na-label">Count the ${esc(emoji)}</div>
      <div class="na-objects">${emoji.repeat(n)}</div>
    </div>` : ''
  const scatterCount = 9
  const range = Math.max(12, n + 6)
  const candidates: number[] = []
  for (let v = 1; v <= range; v++) if (v !== n) candidates.push(v)
  const rankedCandidates = candidates
    .map((v, i) => ({ v, k: (v * 13 + i * 7 + n * 5) % 997 }))
    .sort((a, b) => a.k - b.k)
    .map(x => x.v)
  const scatter: number[] = [n, ...rankedCandidates.slice(0, scatterCount - 1)]
  const shuffled = scatter
    .map((v, i) => ({ v, k: (v * 13 + i * 7) % 97 }))
    .sort((a, b) => a.k - b.k)
    .map(x => x.v)
  const scatterHtml = shuffled.map((v, i) => {
    const rot = ((v * 7 + i * 3) % 11) - 5
    const big = i % 3 === 0
    return `<span class="na-num" style="transform:rotate(${rot}deg);font-size:${big ? '1.8rem' : '1.4rem'}">${v}</span>`
  }).join('')
  return `
    ${countSection}
    <div class="na-section">
      <div class="na-label">Circle the number ${n}</div>
      <div class="na-scatter">${scatterHtml}</div>
    </div>
    <div class="na-word">${numberToWords(n)}</div>`
}

function countRow(n: number, emoji: string): string {
  const options = Array.from(new Set([n - 1, n, n + 1].filter(x => x >= 1)))
  while (options.length < 3) options.push(options[options.length - 1] + 1)
  return `
    <div class="cm-row">
      <div class="cm-objects">${emoji.repeat(n)}</div>
      <div class="cm-options">${options.map(o => `<span class="cm-opt">${o}</span>`).join('')}</div>
    </div>`
}

function patternRow(seq: string[]): string {
  return `<div class="pat-row">${seq.map(s => s === '?' ? `<span class="pat-blank">?</span>` : `<span class="pat-item">${s}</span>`).join('')}</div>`
}

function shapeBox(name: string, shapeHtml: string, emoji: string): string {
  return `
    <div class="shape-box">
      <div class="shape-outline">${shapeHtml}</div>
      <div class="shape-name">${esc(name)}</div>
      <div class="shape-example">${emoji}</div>
    </div>`
}

function mathRow(a: number, b: number, op: '+' | '-', emoji: string): string {
  return `
    <div class="mr-row">
      <span class="mr-icons">${emoji.repeat(a)}</span><span class="mr-op">${op}</span><span class="mr-icons">${emoji.repeat(b)}</span>
      <span class="mr-eq">=</span><span class="mr-blank">?</span>
    </div>`
}

function missingNumberRow(seq: (number | null)[]): string {
  return `<div class="pat-row">${seq.map(n => n === null ? `<span class="pat-blank">?</span>` : `<span class="pat-item" style="font-size:1.6rem;font-weight:800;color:#0F2050">${n}</span>`).join('')}</div>`
}

function sizeCompareRow(label: string, a: { e: string; big: boolean }, b: { e: string; big: boolean }): string {
  return `
    <div class="sc-row">
      <div class="sc-label">${esc(label)}</div>
      <span class="sc-item" style="font-size:${a.big ? '3rem' : '1.6rem'}">${a.e}</span>
      <span class="sc-item" style="font-size:${b.big ? '3rem' : '1.6rem'}">${b.e}</span>
    </div>`
}

const SHAPE_POOL: { name: string; emoji: string; html: string }[] = [
  {name:'Circle',    emoji:'⚽', html:`<div style="width:70px;height:70px;border-radius:50%;border:3px dashed #0F2050"></div>`},
  {name:'Square',    emoji:'📦', html:`<div style="width:70px;height:70px;border:3px dashed #0F2050"></div>`},
  {name:'Triangle',  emoji:'🍕', html:`<svg width="72" height="64" viewBox="0 0 72 64"><polygon points="36,4 68,60 4,60" fill="none" stroke="#0F2050" stroke-width="3" stroke-dasharray="6,4"/></svg>`},
  {name:'Rectangle', emoji:'📱', html:`<div style="width:90px;height:56px;border:3px dashed #0F2050"></div>`},
  {name:'Star',      emoji:'⭐', html:`<svg width="72" height="72" viewBox="0 0 72 72"><polygon points="36,4 44,26 68,26 48,40 56,64 36,50 16,64 24,40 4,26 28,26" fill="none" stroke="#0F2050" stroke-width="3" stroke-dasharray="6,4"/></svg>`},
  {name:'Diamond',   emoji:'💎', html:`<div style="width:64px;height:64px;border:3px dashed #0F2050;transform:rotate(45deg)"></div>`},
  {name:'Oval',      emoji:'🥚', html:`<div style="width:90px;height:64px;border-radius:50%;border:3px dashed #0F2050"></div>`},
  {name:'Pentagon',  emoji:'🏠', html:`<svg width="72" height="68" viewBox="0 0 72 68"><polygon points="36,4 68,28 56,64 16,64 4,28" fill="none" stroke="#0F2050" stroke-width="3" stroke-dasharray="6,4"/></svg>`},
  {name:'Hexagon',   emoji:'🍯', html:`<svg width="72" height="68" viewBox="0 0 72 68"><polygon points="20,4 52,4 68,34 52,64 20,64 4,34" fill="none" stroke="#0F2050" stroke-width="3" stroke-dasharray="6,4"/></svg>`},
]

const COUNT_EMOJI = ['🍓','🚗','🐟','🌸','⭐','🎈','🍪','🦋','🐝','🍇','🎁','🐬']
const PATTERN_POOL_AB: string[][] = [
  ['🔴','🔵','🔴','🔵','🔴','?'],
  ['🟩','🟦','🟩','🟦','🟩','?'],
  ['🔺','🔻','🔺','🔻','🔺','?'],
  ['🐝','🦋','🐝','🦋','🐝','?'],
]
const PATTERN_POOL_ADV: string[][] = [
  ['⭐','⭐','🌙','⭐','⭐','?'],
  ['🍎','🍎','🍌','🍎','🍎','?'],
  ['🐝','🐝','🦋','🐝','🐝','?'],
  ['🔵','🔴','🔴','🔵','🔴','?'],
]

// ── Pre-writing line patterns (standing, sleeping, slanting, zigzag, curvy) ──
type LinePattern = { name: string; kind: 'vertical' | 'slantLeft' | 'slantRight' | 'path'; path?: string }
const LINE_PATTERNS: LinePattern[] = [
  { name: 'Standing Line', kind: 'vertical' },
  { name: 'Sleeping Line', kind: 'path', path: 'M13,30 L747,30' },
  { name: 'Slanting Line (Left to Right)', kind: 'slantRight' },
  { name: 'Slanting Line (Right to Left)', kind: 'slantLeft' },
  { name: 'Zigzag Line', kind: 'path', path: 'M13,30 L114,10 L215,50 L317,10 L418,50 L519,10 L621,50 L747,10' },
  { name: 'Curvy Line', kind: 'path', path: 'M13,30 C 76,0 139,60 203,30 C 266,0 329,60 393,30 C 456,0 519,60 583,30 C 646,0 709,60 747,30' },
]

function lineRowSvg(pattern: LinePattern): string {
  if (pattern.kind === 'path') {
    return `<svg viewBox="0 0 760 60" preserveAspectRatio="xMinYMid meet" class="pw-svg">
      <circle cx="13" cy="30" r="6" fill="#10B981"/>
      <path d="${pattern.path}" fill="none" stroke="#9CA9C7" stroke-width="2.5" stroke-dasharray="8,7" stroke-linecap="round"/>
    </svg>`
  }
  const strokesCount = 8
  const spacing = 760 / (strokesCount + 1)
  let marks = ''
  for (let i = 1; i <= strokesCount; i++) {
    const x = spacing * i
    if (pattern.kind === 'vertical') {
      marks += `<circle cx="${x}" cy="6" r="5" fill="#10B981"/><line x1="${x}" y1="10" x2="${x}" y2="54"/>`
    } else if (pattern.kind === 'slantRight') {
      marks += `<circle cx="${x - 10}" cy="10" r="5" fill="#10B981"/><line x1="${x - 10}" y1="10" x2="${x + 10}" y2="54"/>`
    } else {
      marks += `<circle cx="${x + 10}" cy="10" r="5" fill="#10B981"/><line x1="${x + 10}" y1="10" x2="${x - 10}" y2="54"/>`
    }
  }
  return `<svg viewBox="0 0 760 60" preserveAspectRatio="xMinYMid meet" class="pw-svg"><g stroke="#9CA9C7" stroke-width="2.5" stroke-dasharray="8,7" stroke-linecap="round" fill="none">${marks}</g></svg>`
}

const LINE_STYLE = `
  .pw-grid{display:flex;flex-direction:column;gap:14px}
  .pw-row{border-top:1.5px solid #DCE1EF;border-bottom:1.5px dashed #DCE1EF;padding:6px 0}
  .pw-svg{width:100%;height:56px;display:block}
`

// ================================================================
// ── Per-subject worksheet content generator ─────────────────────
// ================================================================
function getAssignmentContent(classInfo: AssignClass, subjectId: string, num: number): { title: string; instructions: string; bodyHtml: string; extraStyle: string } {
  const level = classInfo.level
  const categories = getCategoriesFor(subjectId, level)
  const { key, idx } = resolveCategory(num, categories)

  if (subjectId === 'english') {
    const rows = ENGLISH_ROWS_PER_SHEET[level]
    if (key === 'alpha') {
      const l = ALPHABET_WORDS[idx]
      const lower = l.ch.toLowerCase()
      const vocabItems = [{ word: l.word, emoji: l.emoji }, ...l.extras]
      const vocabHtml = `
        <div class="vocab-box">
          <div class="vocab-title">'${l.ch}' is for...</div>
          <div class="vocab-items">${vocabItems.map(it => `
            <div class="vocab-item"><div class="vocab-emoji">${it.emoji}</div><div class="vocab-label">${esc(it.word)}</div></div>
          `).join('')}</div>
        </div>`
      return {
        title: `Letter ${l.ch}${lower}`,
        instructions: `Trace the big letter, then trace it ${rows} more times on the lines below. Say: "${l.ch} is for ${l.word}!"`,
        bodyHtml: practiceSheet(`${l.ch}${lower}`, `${l.ch}${lower}`, rows, vocabHtml),
        extraStyle: PRACTICE_STYLE + VOCAB_STYLE,
      }
    }
    if (key === 'lines') {
      const pattern = LINE_PATTERNS[idx % LINE_PATTERNS.length]
      const lineRows = LINE_ROWS_PER_SHEET[level]
      const rowsHtml = Array.from({ length: lineRows }, () => `<div class="pw-row">${lineRowSvg(pattern)}</div>`).join('')
      return {
        title: pattern.name,
        instructions: 'Start at the green dot. Trace each line slowly with a pencil or crayon, left to right.',
        bodyHtml: `<div class="pw-grid">${rowsHtml}</div>`,
        extraStyle: LINE_STYLE,
      }
    }
    if (key === 'word') {
      const w = CVC_WORDS[idx]
      return {
        title: `Word: ${w.w}`,
        instructions: `Say the word out loud, then trace it ${rows} times on the lines below.`,
        bodyHtml: practiceSheet(w.w, w.w, rows, `${w.e} <b>${esc(w.w)}</b>`),
        extraStyle: PRACTICE_STYLE,
      }
    }
    if (key === 'sentence') {
      const s = SENTENCES_BY_LEVEL[level][idx]
      return {
        title: `Sentence Practice ${idx + 1}`,
        instructions: 'Read the sentence, then trace it neatly on each line below.',
        bodyHtml: practiceSheet(s, s, rows, ''),
        extraStyle: PRACTICE_STYLE,
      }
    }
    if (key === 'beginsound') {
      const items = [0,1,2,3].map(o => BEGIN_SOUND_ITEMS[(idx * 4 + o) % BEGIN_SOUND_ITEMS.length])
      return {
        title: `Beginning Sounds — Set ${idx + 1}`,
        instructions: level <= 2
          ? 'Say each picture\'s name, listen for the first sound, then trace its letter.'
          : 'Say each picture\'s name, sound out its first letter, then trace the letter it starts with.',
        bodyHtml: `<div class="bs-grid">${items.map(it => `
          <div class="bs-box"><div class="bs-emoji">${it.e}</div><div class="bs-word">${esc(it.word)}</div><div class="bs-letter">${it.letter}${it.letter.toLowerCase()}</div></div>
        `).join('')}</div>`,
        extraStyle: BS_STYLE,
      }
    }
    // rhymewords
    const pair = RHYMING_PAIRS[idx % RHYMING_PAIRS.length]
    const otherDistractor = RHYMING_PAIRS[(idx + 2) % RHYMING_PAIRS.length].distractor
    const options = [pair.b, pair.distractor, otherDistractor]
    return {
      title: `Rhyming Words — Set ${idx + 1}`,
      instructions: `"${pair.a.w}" rhymes with one of the words below. Circle the word that rhymes with "${pair.a.w}".`,
      bodyHtml: `
        <div class="rw-target">${pair.a.e} <b>${esc(pair.a.w)}</b></div>
        <div class="bs-grid">${options.map(o => `
          <div class="bs-box"><div class="bs-emoji">${o.e}</div><div class="bs-word">${esc(o.w)}</div></div>
        `).join('')}</div>`,
      extraStyle: BS_STYLE + `.rw-target{text-align:center;font-size:1.4rem;margin-bottom:16px;color:#0F2050}`,
    }
  }

  if (subjectId === 'math') {
    const rows = MATH_ROWS_PER_SHEET[level]
    if (key === 'numtrace') {
      const n = idx + 1
      const traceRows = Math.max(3, rows - 2)
      return {
        title: `Number ${n}`,
        instructions: `Count the dots, then trace the number ${traceRows} more times on the lines below. Count the pictures and circle the matching number too!`,
        bodyHtml: numberBox(n, traceRows, numberActivityHtml(n)),
        extraStyle: PRACTICE_STYLE + NUM_ACTIVITY_STYLE,
      }
    }
    if (key === 'count') {
      const maxCount = MATH_COUNT_MAX[level]
      const rows3 = Array.from({ length: 3 }, (_, r) => {
        const n = ((idx * 3 + r) % maxCount) + 1
        const e = COUNT_EMOJI[(idx * 3 + r) % COUNT_EMOJI.length]
        return countRow(n, e)
      })
      return {
        title: `Count and Circle — Set ${idx + 1}`,
        instructions: 'Count the pictures in each row, then draw a circle around the correct number.',
        bodyHtml: `<div class="cm-grid">${rows3.join('')}</div>`,
        extraStyle: CM_STYLE,
      }
    }
    if (key === 'pattern') {
      const pool = level <= 2 ? PATTERN_POOL_AB : [...PATTERN_POOL_AB, ...PATTERN_POOL_ADV]
      const p1 = pool[(idx * 2) % pool.length]
      const p2 = pool[(idx * 2 + 1) % pool.length]
      return {
        title: `Patterns — Set ${idx + 1}`,
        instructions: 'Look at the pattern in each row. Draw or write what comes next in the box.',
        bodyHtml: `<div class="pat-grid">${patternRow(p1)}${patternRow(p2)}</div>`,
        extraStyle: PAT_STYLE,
      }
    }
    if (key === 'shapes') {
      const pool = level >= 3 ? SHAPE_POOL : SHAPE_POOL.slice(0, 6)
      const per = Math.ceil(pool.length / 3)
      const shapes = pool.slice(idx * per, idx * per + per)
      return {
        title: `Shapes — Set ${idx + 1}`,
        instructions: 'Trace the outline of each shape with a pencil, say its name, then find something at home shaped like it.',
        bodyHtml: `<div class="shapes-grid">${shapes.map(s => shapeBox(s.name, s.html, s.emoji)).join('')}</div>`,
        extraStyle: SHAPES_STYLE,
      }
    }
    if (key === 'ops') {
      const emoji = COUNT_EMOJI[idx % COUNT_EMOJI.length]
      let title = ''
      let mathRows: string[] = []
      if (level === 1) {
        title = `One More! — Set ${idx + 1}`
        mathRows = [mathRow(idx + 1, 1, '+', emoji)]
      } else if (level === 2) {
        title = `Count On — Set ${idx + 1}`
        mathRows = [mathRow(idx + 1, 1, '+', emoji), mathRow(idx + 1, 2, '+', emoji)]
      } else if (level === 3) {
        const pairs: [number, number][] = [[2,1],[1,2],[3,1],[2,2],[4,1],[3,2]]
        const [a, b] = pairs[idx]
        title = `Addition — Set ${idx + 1}`
        mathRows = [mathRow(a, b, '+', emoji)]
      } else {
        const pairs: [number, number, '+' | '-'][] = [[8,5,'+'],[9,6,'+'],[7,4,'+'],[12,5,'-'],[15,7,'-'],[18,9,'-']]
        const [a, b, op] = pairs[idx]
        title = `Addition & Subtraction — Set ${idx + 1}`
        mathRows = [mathRow(a, b, op, emoji)]
      }
      return {
        title,
        instructions: 'Count the pictures, then write the answer in the blank box.',
        bodyHtml: `<div class="mr-grid">${mathRows.join('')}</div>`,
        extraStyle: MR_STYLE,
      }
    }
    if (key === 'missing') {
      const total = MATH_TOTAL_NUMS[level]
      const start = 1 + idx * Math.floor(total / 4)
      const seq: (number | null)[] = [start, start + 1, null, start + 3, start + 4]
      return {
        title: `Missing Numbers — Set ${idx + 1}`,
        instructions: 'Look at the number sequence. Write the missing number in the empty box.',
        bodyHtml: `<div class="pat-grid">${missingNumberRow(seq)}</div>`,
        extraStyle: PAT_STYLE,
      }
    }
    // size
    const comparisons = [
      { label: 'Which is BIGGER? Circle it.', a: { e: '🐘', big: true }, b: { e: '🐭', big: false } },
      { label: 'Which is TALLER? Circle it.', a: { e: '🌳', big: true }, b: { e: '🌱', big: false } },
      { label: 'Which has MORE? Circle it.', a: { e: '🍎🍎🍎', big: true }, b: { e: '🍎', big: false } },
      { label: 'Which is SMALLER? Circle it.', a: { e: '🐜', big: false }, b: { e: '🐻', big: true } },
    ]
    const c = comparisons[idx % comparisons.length]
    return {
      title: `Big or Small — Set ${idx + 1}`,
      instructions: 'Look at each pair of pictures, then circle the one the question asks for.',
      bodyHtml: `<div class="sc-grid">${sizeCompareRow(c.label, c.a, c.b)}</div>`,
      extraStyle: SC_STYLE,
    }
  }

  if (subjectId === 'evs') {
    if (key === 'vocab') {
      const itemCount = level === 1 ? 4 : level === 2 ? 6 : 8
      const rotated = EVS_TOPICS[(idx + (level - 1) * 3) % EVS_TOPICS.length]
      const items = rotated.items.slice(0, itemCount)
      return {
        title: rotated.title,
        instructions: level <= 2 ? 'Look at each picture and say the word out loud.' : 'Look at each picture, say the word out loud, then tick your favorites.',
        bodyHtml: `<div class="wg-grid">${items.map(it => `
          <div class="wg-box"><div class="wg-emoji">${it.e}</div><div class="wg-label">${esc(it.label)}</div>${level >= 2 ? `<div class="wg-check"></div>` : ''}</div>
        `).join('')}</div>`,
        extraStyle: WG_STYLE,
      }
    }
    if (key === 'colors') {
      const c = COLOR_WORDS[idx % COLOR_WORDS.length]
      const matchCount = Math.min(c.matches.length, level === 1 ? 3 : 4)
      const itemCount = level === 1 ? 6 : level === 2 ? 8 : level === 3 ? 9 : 10
      const items = [...c.matches.slice(0, matchCount), ...c.distractors.slice(0, Math.max(0, itemCount - matchCount))]
      const shuffled = items
        .map((it, i) => ({ it, k: ((i + 1) * 13 + idx * 7) % 97 }))
        .sort((a, b) => a.k - b.k)
        .map(x => x.it)
      const colorRows = 3
      return {
        title: `Color: ${c.name}`,
        instructions: `Trace and print the color "${c.name}". Then find and circle ${matchCount} ${c.name.toLowerCase()} objects below.`,
        bodyHtml: `
          <div style="display:flex;justify-content:flex-end;margin-bottom:6px">
            <div class="color-swatch" style="background:${c.hex}"></div>
          </div>
          ${practiceSheet(c.name, c.name, colorRows, '')}
          <div class="color-section">
            <div class="color-label">Find and circle ${matchCount} ${c.name.toLowerCase()} objects.</div>
            <div class="wg-grid">${shuffled.map(it => `
              <div class="wg-box"><div class="wg-emoji">${it.e}</div><div class="wg-label">${esc(it.label)}</div></div>
            `).join('')}</div>
          </div>
        `,
        extraStyle: PRACTICE_STYLE + WG_STYLE + COLOR_STYLE,
      }
    }
    // oddoneout
    const grp = ODD_ONE_OUT[idx % ODD_ONE_OUT.length]
    return {
      title: `Odd One Out — Set ${idx + 1}`,
      instructions: grp.hint,
      bodyHtml: `<div class="wg-grid">${grp.items.map(it => `
        <div class="wg-box"><div class="wg-emoji">${it.e}</div><div class="wg-label">${esc(it.label)}</div></div>
      `).join('')}</div>`,
      extraStyle: WG_STYLE,
    }
  }

  if (subjectId === 'rhymes') {
    const rhyme = RHYMES[idx % RHYMES.length]
    const activity = level === 1
      ? 'Listen to the rhyme with a grown-up, then color a picture about it in the box below.'
      : level === 2
      ? 'Read the rhyme with a grown-up, trace the title, then draw a picture about it below.'
      : level === 3
      ? 'Read the rhyme, circle the main character\'s picture, then draw a scene from the rhyme below.'
      : 'Read the rhyme aloud, then draw a picture and write one sentence about it below.'
    return {
      title: rhyme.title,
      instructions: activity,
      bodyHtml: `
        <div class="rhyme-box">
          <div class="rhyme-title">${rhyme.emoji} ${esc(rhyme.title)}</div>
          <div class="rhyme-lines">${rhyme.lines.map(l => esc(l)).join('<br>')}</div>
        </div>
        <div class="draw-box">Draw &amp; color a picture about this rhyme here!</div>
      `,
      extraStyle: RHYME_STYLE,
    }
  }

  if (subjectId === 'art') {
    const prompt = ART_PROMPTS[(idx + (level - 1) * 6) % ART_PROMPTS.length]
    return {
      title: `Trace & Color: ${prompt.name}`,
      instructions: `Trace the outline of the ${prompt.name.toLowerCase()} with a pencil or crayon, then color it in. ${prompt.hint}`,
      bodyHtml: `
        <div class="art-trace"><svg viewBox="0 0 120 120" class="art-svg">${prompt.svg}</svg></div>
        <div class="art-name">${prompt.emoji} ${esc(prompt.name)}</div>
      `,
      extraStyle: ART_STYLE,
    }
  }

  // hindi
  if (key === 'letter') {
    const pool = level <= 2 ? HINDI_VOWELS : HINDI_LETTERS
    const perSheet = level <= 2 ? 2 : 3
    const letters = pool.slice(idx * perSheet, idx * perSheet + perSheet)
    return {
      title: `Hindi Varnamala — Set ${idx + 1}`,
      instructions: 'Say each letter out loud, then trace it with a pencil or crayon.',
      bodyHtml: `<div class="hi-grid">${letters.map(l => `
        <div class="hi-box"><div class="hi-big">${l}</div><div class="hi-trace-row">${(l + ' ').repeat(3)}</div></div>
      `).join('')}</div>`,
      extraStyle: HI_STYLE,
    }
  }
  const words = level <= 2 ? HINDI_WORDS_SIMPLE : HINDI_WORDS_ADVANCED
  const word = words[idx % words.length]
  return {
    title: `Hindi Word: ${word}`,
    instructions: 'Say the word out loud, then trace it with a pencil or crayon.',
    bodyHtml: `<div class="hi-grid" style="grid-template-columns:1fr"><div class="hi-box"><div class="hi-big" style="font-size:2.6rem">${word}</div><div class="hi-trace-row">${(word + '   ').repeat(3)}</div></div></div>`,
    extraStyle: HI_STYLE,
  }
}

const PRACTICE_STYLE = `
  .ps-model{font-family:'Nunito',sans-serif;font-weight:900;font-size:4.6rem;line-height:1.1;color:#0F2050;text-align:center;margin-bottom:10px;word-break:break-word}
  .ps-wordline{text-align:center;font-size:1rem;color:#2A3B60;margin-bottom:18px}
  .ps-dots{color:#E8B020;font-size:1.1rem;letter-spacing:4px}
  .ps-rows{display:flex;flex-direction:column;gap:10px}
  .ps-row{padding:2px 0}
  .dotted-row{display:block;width:100%}
`
const VOCAB_STYLE = `
  .vocab-box{border:3px solid #1AA6CA;border-radius:16px;padding:22px 18px 16px;margin:4px 0 8px;position:relative;background:#F0FBFF}
  .vocab-title{position:absolute;top:-15px;left:20px;background:#fff;padding:2px 14px;border:2px solid #1AA6CA;border-radius:20px;font-weight:800;color:#1AA6CA;font-size:1rem}
  .vocab-items{display:flex;justify-content:space-around;flex-wrap:wrap;gap:16px;margin-top:6px}
  .vocab-item{text-align:center;min-width:90px}
  .vocab-emoji{font-size:3.4rem;line-height:1}
  .vocab-label{font-weight:800;color:#0F2050;margin-top:8px;font-size:1.05rem}
`
const NUM_ACTIVITY_STYLE = `
  .na-section{margin-top:8px;border:2px dashed #DCE1EF;border-radius:14px;padding:8px 16px;background:#fff}
  .na-label{font-weight:800;color:#0F2050;margin-bottom:6px;font-size:0.95rem}
  .na-objects{font-size:2.2rem;line-height:1.2;letter-spacing:5px;word-break:break-word}
  .na-scatter{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;padding:4px}
  .na-num{font-family:'Nunito',sans-serif;font-weight:800;color:#0F2050;display:inline-block}
  .na-word{text-align:center;font-family:'Playfair Display',serif;font-weight:900;font-size:2.1rem;color:#1AA6CA;text-transform:lowercase;margin-top:8px}
`
const CM_STYLE = `
  .cm-grid{display:flex;flex-direction:column;gap:10px}
  .cm-row{display:flex;align-items:center;justify-content:space-between;border:2px dashed #DCE1EF;border-radius:14px;padding:12px 16px;background:#fff;gap:10px;flex-wrap:wrap}
  .cm-objects{font-size:1.5rem;letter-spacing:4px;flex:1;min-width:180px}
  .cm-options{display:flex;gap:10px}
  .cm-opt{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border:2px solid #0F2050;border-radius:50%;font-weight:800;font-size:1.1rem;color:#0F2050}
`
const PAT_STYLE = `
  .pat-grid{display:flex;flex-direction:column;gap:14px}
  .pat-row{display:flex;align-items:center;gap:10px;border:2px dashed #DCE1EF;border-radius:14px;padding:14px 18px;background:#fff}
  .pat-item{font-size:1.8rem}
  .pat-blank{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border:2px solid #E8B020;border-radius:10px;font-weight:800;color:#E8B020;font-size:1.3rem}
`
const SHAPES_STYLE = `
  .shapes-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .shape-box{border:2px dashed #DCE1EF;border-radius:14px;padding:16px 10px;text-align:center;background:#fff}
  .shape-outline{display:flex;align-items:center;justify-content:center;height:90px;margin-bottom:8px}
  .shape-name{font-weight:800;color:#0F2050;font-size:1rem}
  .shape-example{font-size:1.6rem;margin-top:4px}
  @media(max-width:700px){.shapes-grid{grid-template-columns:repeat(2,1fr)}}
`
const MR_STYLE = `
  .mr-grid{display:flex;flex-direction:column;gap:12px}
  .mr-row{display:flex;align-items:center;gap:14px;border:2px dashed #DCE1EF;border-radius:14px;padding:14px 18px;background:#fff;font-size:1.6rem;flex-wrap:wrap}
  .mr-icons{letter-spacing:2px}
  .mr-op{font-weight:900;color:#E8B020}
  .mr-eq{font-weight:900;color:#0F2050}
  .mr-blank{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border:2px solid #0F2050;border-radius:10px;font-weight:800;color:#0F2050}
`
const SC_STYLE = `
  .sc-grid{display:flex;flex-direction:column;gap:14px}
  .sc-row{display:flex;align-items:center;gap:24px;border:2px dashed #DCE1EF;border-radius:14px;padding:18px 22px;background:#fff;flex-wrap:wrap}
  .sc-label{font-weight:800;color:#0F2050;font-size:0.95rem;flex-basis:100%}
  .sc-item{display:inline-flex}
`
const WG_STYLE = `
  .wg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .wg-box{border:2px dashed #DCE1EF;border-radius:14px;padding:14px 8px;text-align:center;background:#fff}
  .wg-emoji{font-size:2.8rem}
  .wg-label{font-weight:800;margin-top:6px;font-size:0.85rem;color:#2A3B60}
  .wg-check{width:22px;height:22px;border:2px solid #0F2050;border-radius:6px;margin:10px auto 0}
  @media(max-width:700px){.wg-grid{grid-template-columns:repeat(2,1fr)}}
`
const COLOR_STYLE = `
  .color-swatch{width:56px;height:56px;border-radius:12px;border:3px solid #0F2050;box-shadow:0 3px 10px rgba(0,0,0,0.18)}
  .color-section{margin-top:18px}
  .color-label{font-weight:800;color:#0F2050;margin-bottom:12px;font-size:1rem}
`
const BS_STYLE = `
  .bs-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
  .bs-box{border:2px dashed #DCE1EF;border-radius:14px;padding:16px 10px;text-align:center;background:#fff}
  .bs-emoji{font-size:3.2rem}
  .bs-word{font-weight:700;color:#2A3B60;margin-top:6px;font-size:0.95rem}
  .bs-letter{font-family:'Nunito',sans-serif;font-weight:900;font-size:2rem;color:transparent;-webkit-text-stroke:2px #0F2050;margin-top:8px}
`
const RHYME_STYLE = `
  .rhyme-box{border:2px dashed #DCE1EF;border-radius:14px;padding:22px 26px;background:#FEF8F0}
  .rhyme-title{font-family:'Playfair Display',serif;font-weight:800;color:#0F2050;font-size:1.3rem;margin-bottom:12px;text-align:center}
  .rhyme-lines{font-size:1.05rem;line-height:2;color:#2A3B60;text-align:center;font-style:italic}
  .draw-box{margin-top:20px;border:2px dashed #9CA9C7;border-radius:12px;height:260px;display:flex;align-items:center;justify-content:center;color:#9CA9C7;font-size:0.9rem;text-align:center;padding:0 20px}
`
const ART_STYLE = `
  .art-trace{display:flex;justify-content:center;margin-bottom:14px}
  .art-svg{width:300px;height:300px}
  .art-svg *{stroke:#0F2050;stroke-width:2.5;stroke-dasharray:6,4;stroke-linecap:round;stroke-linejoin:round}
  .art-svg line, .art-svg path[fill="none"]{stroke-width:2.8}
  .art-name{text-align:center;font-family:'Playfair Display',serif;font-weight:800;color:#0F2050;font-size:1.3rem}
`
const HI_STYLE = `
  .hi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .hi-box{border:2px dashed #DCE1EF;border-radius:14px;padding:14px 8px;text-align:center;background:#fff}
  .hi-big{font-size:3.6rem;line-height:1;color:transparent;-webkit-text-stroke:2.5px #7C3AED}
  .hi-trace-row{font-size:2rem;color:transparent;-webkit-text-stroke:1.4px #9CA9C7;letter-spacing:10px;margin-top:10px}
  @media(max-width:700px){.hi-grid{grid-template-columns:repeat(2,1fr)}}
`

// ── School letterhead banner (logo + name in bordered box) ─────
function schoolBannerHtml(opts: { tag?: string; classInfo?: AssignClass; subjectInfo?: AssignSubject }): string {
  const { tag, classInfo, subjectInfo } = opts
  return `
  <style>${SK_BANNER_STYLE}</style>
  <div class="sk-banner">
    <div class="sk-banner-inner">
      <img src="/static/logo.png" alt="SuperKids India Preschool" class="sk-banner-logo">
      <div class="sk-banner-title">
        <div class="sk-banner-line1">SuperKids India</div>
        <div class="sk-banner-line2">Preschool</div>
      </div>
      ${tag ? `<div class="sk-banner-tag">${esc(tag)}</div>` : ''}
    </div>
    <div class="sk-banner-pills">
      ${ASSIGNMENT_CLASSES.map(cl => `
        <a href="/assignments/${cl.id}" class="sk-pill ${classInfo && cl.id === classInfo.id ? 'sk-pill-active' : ''}" style="background:${classInfo && cl.id === classInfo.id ? cl.color : cl.color + '18'};color:${classInfo && cl.id === classInfo.id ? '#fff' : cl.color}">${esc(cl.name)}</a>
      `).join('')}
      <a href="/assignments/custom-assignment" class="sk-pill" style="background:#7C3AED18;color:#7C3AED;border:1.5px dashed #7C3AED">+ Custom Assignment</a>
    </div>
    <div class="sk-banner-bar">
      <span>${subjectInfo ? `${subjectInfo.emoji} ${esc(subjectInfo.name)}` : 'Free Printable Worksheets'}</span>
      <span>superkidsindia.com</span>
    </div>
  </div>`
}

const SK_BANNER_STYLE = `
  .sk-banner{border:4px solid #0F2050;border-radius:14px;background:#fff;overflow:hidden;box-shadow:0 6px 24px rgba(15,32,80,0.14)}
  .sk-banner-inner{display:flex;align-items:center;gap:18px;padding:20px 28px;flex-wrap:wrap}
  .sk-banner-logo{height:72px;width:72px;object-fit:contain;flex-shrink:0}
  .sk-banner-title{flex:1;min-width:200px}
  .sk-banner-line1{font-family:'Playfair Display',serif;font-weight:900;font-size:2rem;color:#0F2050;text-transform:uppercase;letter-spacing:1px;line-height:1.1}
  .sk-banner-line2{font-family:'Playfair Display',serif;font-weight:900;font-size:1.4rem;color:#0F2050;text-transform:uppercase;letter-spacing:3px;line-height:1.1}
  .sk-banner-tag{font-family:'Playfair Display',serif;font-weight:800;color:#1AA6CA;font-size:1.1rem;text-align:right}
  .sk-banner-pills{display:flex;flex-wrap:wrap;gap:8px;padding:0 28px 18px}
  .sk-pill{padding:7px 18px;border-radius:50px;font-weight:800;font-size:0.8rem;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;transition:transform 0.2s}
  .sk-pill:hover{transform:scale(1.05)}
  .sk-banner-bar{background:#0F2050;color:#fff;padding:10px 28px;display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;font-weight:700;flex-wrap:wrap;gap:6px}
  @media(max-width:600px){.sk-banner-inner{padding:16px 18px}.sk-banner-pills{padding:0 18px 14px}.sk-banner-bar{padding:10px 18px}}
  .sk-namedate-bar{background:#fff;color:#0F2050;padding:14px 28px;display:flex;gap:32px;align-items:center;font-size:0.95rem;font-weight:800;border-top:2px solid #0F2050;flex-wrap:wrap}
  .sk-namedate-bar .nd-field{display:flex;align-items:center;gap:10px;flex:1;min-width:220px}
  .sk-namedate-bar .nd-field-date{flex:0.6;min-width:160px}
  .sk-namedate-bar .nd-line{flex:1;border-bottom:1.5px solid #0F2050;height:1px;min-width:60px}
  @media(max-width:600px){.sk-namedate-bar{padding:12px 18px}}
`

// ── Print worksheet letterhead (compact) ────────────────────────
function worksheetLetterheadHtml(classInfo: AssignClass, subjectInfo: AssignSubject, title: string, extraThumbHtml?: string): string {
  return `
  <div class="sk-banner sk-banner-compact">
    <div class="sk-banner-inner">
      <img src="/static/logo.png" alt="SuperKids India Preschool" class="sk-banner-logo" style="height:56px;width:56px">
      <div class="sk-banner-title">
        <div class="sk-banner-line1" style="font-size:1.4rem">SuperKids India</div>
        <div class="sk-banner-line2" style="font-size:1rem">Preschool</div>
      </div>
      ${extraThumbHtml || ''}
      <div style="text-align:right">
        <div class="worksheet-title">${subjectInfo.emoji} ${esc(title)}</div>
        <div class="worksheet-tag">${esc(classInfo.name)} • ${esc(subjectInfo.name)}</div>
      </div>
    </div>
    <div class="sk-namedate-bar">
      <div class="nd-field"><span>Name:</span><span class="nd-line"></span></div>
      <div class="nd-field nd-field-date"><span>Date:</span><span class="nd-line"></span></div>
    </div>
  </div>`
}

function printWorksheetPage(classInfo: AssignClass, subjectInfo: AssignSubject, num: number): string {
  const { title, instructions, bodyHtml, extraStyle } = getAssignmentContent(classInfo, subjectInfo.id, num)
  const needsDevanagari = subjectInfo.id === 'hindi'
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} – ${esc(classInfo.name)} ${esc(subjectInfo.name)} – SuperKids India Preschool</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Nunito:wght@200;300;400;600;700;800;900&family=Raleway+Dots${needsDevanagari ? '&family=Noto+Sans+Devanagari:wght@600;800' : ''}&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Nunito',sans-serif;background:#F0F2F7;color:#0F1E3D;padding:24px 16px}
${needsDevanagari ? `.hi-big,.hi-trace-row{font-family:'Noto Sans Devanagari','Nunito',sans-serif}` : ''}
.toolbar{max-width:850px;margin:0 auto 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.toolbar a, .toolbar button{font-family:'Nunito',sans-serif;font-weight:800;font-size:0.85rem;letter-spacing:0.5px;text-decoration:none;border-radius:50px;padding:10px 22px;cursor:pointer;border:none}
.back-link{color:#0F2050;background:#fff;border:2px solid #0F2050 !important}
.print-btn{color:#fff;background:linear-gradient(135deg,#0F2050,#1AA6CA);box-shadow:0 4px 16px rgba(15,32,80,0.25)}
.sheet{max-width:850px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(15,32,80,0.12);padding:0 0 28px;overflow:hidden}
.sheet-body{padding:22px 36px 0}
${SK_BANNER_STYLE}
.sk-banner-compact{border-radius:0;border-left:none;border-right:none;border-top:none}
.worksheet-title{font-family:'Playfair Display',serif;font-weight:800;color:#0F2050;font-size:1.5rem}
.worksheet-tag{font-size:0.75rem;color:#1AA6CA;font-weight:800;text-transform:uppercase;letter-spacing:1px}
.instructions{background:#FEF8F0;border:1.5px solid #C4893A33;border-radius:10px;padding:10px 16px;font-size:0.85rem;color:#7A4E1D;margin:16px 0 20px}
.sheet-footer{margin-top:24px;padding-top:12px;border-top:1.5px solid #DCE1EF;text-align:center;font-size:0.7rem;color:#9CA9C7}
${extraStyle}
@media print{
  @page{size:A4;margin:10mm}
  body{background:#fff;padding:0}
  .toolbar{display:none}
  .sheet{box-shadow:none;border-radius:0;max-width:100%}
  .sk-banner{border-radius:0}
  .sheet-body{padding:12px 30px 0 !important}
  .instructions{margin:8px 0 12px !important}
  .sheet-footer{margin-top:10px !important;padding-top:6px !important}
}
</style>
</head>
<body>
  <div class="toolbar">
    <a href="/assignments/${classInfo.id}/${subjectInfo.id}" class="back-link">&larr; Back to ${esc(subjectInfo.name)}</a>
    <button class="print-btn" onclick="window.print()"><i>🖨️</i> Print / Save as PDF</button>
  </div>
  <div class="sheet">
    ${worksheetLetterheadHtml(classInfo, subjectInfo, title)}
    <div class="sheet-body">
      <div class="instructions">📌 ${esc(instructions)}</div>
      ${bodyHtml}
      <div class="sheet-footer">SuperKids India Preschool &middot; Free printable worksheet for home practice &middot; superkidsindia.com</div>
    </div>
  </div>
</body>
</html>`
}

// ================================================================
// ── Custom Tracing Sheet Generator (public tool) ────────────────
// ================================================================
function customTracingPage(rawText: string, linesParam: string, caseParam: string, fontSizeParam?: string, colsParam?: string): string {
  const text = (rawText || '').slice(0, 40).trim()
  const lines = Math.min(12, Math.max(1, parseInt(linesParam, 10) || 6))
  let displayText = text
  if (caseParam === 'upper') displayText = text.toUpperCase()
  else if (caseParam === 'lower') displayText = text.toLowerCase()
  else if (caseParam === 'title') displayText = text.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())

  const hasText = displayText.length > 0
  const autoFontSize = displayText.length <= 3 ? 46 : displayText.length <= 8 ? 34 : 24
  const allowedFontSizes = [22, 28, 34, 40, 46, 54, 62]
  const fontSizeNum = parseInt(fontSizeParam || '', 10)
  const ctFontSize = allowedFontSizes.includes(fontSizeNum) ? fontSizeNum : autoFontSize
  const colsNum = parseInt(colsParam || '', 10)
  const forceCols = colsParam && colsParam !== 'auto' && colsNum >= 1 && colsNum <= 8 ? colsNum : undefined
  const rowsHtml = hasText ? Array.from({ length: lines }, () => `<div class="ct-row">${dottedRow(displayText, ctFontSize, '#0F2050', forceCols)}</div>`).join('') : ''

  const content = `
  ${Navbar('assignments')}
  <section class="no-print" style="padding:3rem 0 4rem;background:linear-gradient(135deg,#E8F7FC,#FEF8F0)">
    <div class="max-w-4xl mx-auto px-4">
      <div class="badge mb-4" style="background:#E8F7FC;color:#1AA6CA;border:1px solid #1AA6CA33">Custom Tool</div>
      <div class="section-accent" style="margin:0 auto 1rem"></div>
      <h1 class="section-title" style="color:#1AA6CA;font-size:clamp(2.1rem,5vw,3.2rem);text-align:center">Custom Tracing Sheet</h1>
      <p style="color:#6B7A9D;font-size:1rem;line-height:1.8;margin-top:1rem;text-align:center;max-width:600px;margin-left:auto;margin-right:auto">
        Type any letter, word, or short sentence below and instantly generate a printable multi-line tracing worksheet — perfect for names, spellings, or extra practice.
      </p>
    </div>
  </section>
  <section class="no-print" style="padding:0 0 3rem;background:#F8F9FB">
    <div class="max-w-3xl mx-auto px-4">
      <form method="GET" action="/assignments/custom-tracing" class="card" style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;padding:2rem">
        <div style="flex:2;min-width:220px">
          <label style="font-weight:800;color:#0F2050;font-size:0.85rem;display:block;margin-bottom:6px">Text to trace</label>
          <input type="text" name="text" maxlength="40" value="${esc(text)}" placeholder="e.g. A, cat, or I am happy" class="form-input" required>
        </div>
        <div style="flex:1;min-width:140px">
          <label style="font-weight:800;color:#0F2050;font-size:0.85rem;display:block;margin-bottom:6px">Letter case</label>
          <select name="case" class="form-input">
            <option value="asis" ${caseParam === 'asis' || !caseParam ? 'selected' : ''}>As typed</option>
            <option value="upper" ${caseParam === 'upper' ? 'selected' : ''}>UPPERCASE</option>
            <option value="lower" ${caseParam === 'lower' ? 'selected' : ''}>lowercase</option>
            <option value="title" ${caseParam === 'title' ? 'selected' : ''}>Title Case</option>
          </select>
        </div>
        <div style="flex:1;min-width:140px">
          <label style="font-weight:800;color:#0F2050;font-size:0.85rem;display:block;margin-bottom:6px">Practice lines (rows)</label>
          <select name="lines" class="form-input">
            ${[3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${lines === n ? 'selected' : ''}>${n} lines</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;min-width:140px">
          <label style="font-weight:800;color:#0F2050;font-size:0.85rem;display:block;margin-bottom:6px">Font size</label>
          <select name="fontSize" class="form-input">
            <option value="auto" ${!fontSizeParam || fontSizeParam === 'auto' ? 'selected' : ''}>Auto</option>
            <option value="22" ${fontSizeParam === '22' ? 'selected' : ''}>Small</option>
            <option value="28" ${fontSizeParam === '28' ? 'selected' : ''}>Small-Medium</option>
            <option value="34" ${fontSizeParam === '34' ? 'selected' : ''}>Medium</option>
            <option value="40" ${fontSizeParam === '40' ? 'selected' : ''}>Medium-Large</option>
            <option value="46" ${fontSizeParam === '46' ? 'selected' : ''}>Large</option>
            <option value="54" ${fontSizeParam === '54' ? 'selected' : ''}>Extra Large</option>
            <option value="62" ${fontSizeParam === '62' ? 'selected' : ''}>Huge</option>
          </select>
        </div>
        <div style="flex:1;min-width:140px">
          <label style="font-weight:800;color:#0F2050;font-size:0.85rem;display:block;margin-bottom:6px">Columns per line</label>
          <select name="cols" class="form-input">
            <option value="auto" ${!colsParam || colsParam === 'auto' ? 'selected' : ''}>Auto</option>
            ${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}" ${colsParam === String(n) ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <button type="submit" class="btn-primary" style="padding:14px 32px">Generate Sheet</button>
      </form>
    </div>
  </section>
  ${hasText ? `
  <section class="ct-sheet-section" style="padding:0 0 5rem;background:#F8F9FB">
    <div class="max-w-4xl mx-auto px-4">
      <div class="toolbar no-print" style="max-width:100%;margin:0 0 16px;display:flex;justify-content:flex-end">
        <button class="print-btn" onclick="window.print()" style="color:#fff;background:linear-gradient(135deg,#0F2050,#1AA6CA);border:none;border-radius:50px;padding:12px 28px;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif">🖨️ Print / Save as PDF</button>
      </div>
      <div class="sheet ct-sheet">
        <div class="sk-banner sk-banner-compact">
          <div class="sk-banner-inner">
            <img src="/static/logo.png" alt="SuperKids India Preschool" class="sk-banner-logo" style="height:56px;width:56px">
            <div class="sk-banner-title">
              <div class="sk-banner-line1" style="font-size:1.4rem">SuperKids India</div>
              <div class="sk-banner-line2" style="font-size:1rem">Preschool</div>
            </div>
            <div style="text-align:right">
              <div class="worksheet-title">✏️ Custom Tracing Sheet</div>
              <div class="worksheet-tag">Practice Worksheet</div>
            </div>
          </div>
          <div class="sk-namedate-bar">
            <div class="nd-field"><span>Name:</span><span class="nd-line"></span></div>
            <div class="nd-field nd-field-date"><span>Date:</span><span class="nd-line"></span></div>
          </div>
        </div>
        <div class="sheet-body" style="padding:22px 36px 28px">
          <div class="instructions">📌 Trace the big model, then trace it on every line below with a pencil or crayon.</div>
          <div class="ct-model">${esc(displayText)}</div>
          <div class="ct-rows">${rowsHtml}</div>
          <div class="sheet-footer">SuperKids India Preschool &middot; Free printable worksheet for home practice &middot; superkidsindia.com</div>
        </div>
      </div>
    </div>
  </section>` : ''}
  <style>
    .sk-banner{border:4px solid #0F2050;border-radius:14px;background:#fff;overflow:hidden;box-shadow:0 6px 24px rgba(15,32,80,0.14)}
    .sk-banner-inner{display:flex;align-items:center;gap:18px;padding:16px 24px;flex-wrap:wrap}
    .sk-banner-logo{object-fit:contain;flex-shrink:0}
    .sk-banner-title{flex:1;min-width:180px}
    .sk-banner-line1{font-family:'Playfair Display',serif;font-weight:900;color:#0F2050;text-transform:uppercase;letter-spacing:1px;line-height:1.1}
    .sk-banner-line2{font-family:'Playfair Display',serif;font-weight:900;color:#0F2050;text-transform:uppercase;letter-spacing:3px;line-height:1.1}
    .worksheet-title{font-family:'Playfair Display',serif;font-weight:800;color:#0F2050;font-size:1.3rem}
    .worksheet-tag{font-size:0.75rem;color:#1AA6CA;font-weight:800;text-transform:uppercase;letter-spacing:1px}
    .sk-namedate-bar{background:#fff;color:#0F2050;padding:14px 24px;display:flex;gap:32px;align-items:center;font-size:0.95rem;font-weight:800;border-top:2px solid #0F2050;flex-wrap:wrap}
    .sk-namedate-bar .nd-field{display:flex;align-items:center;gap:10px;flex:1;min-width:220px}
    .sk-namedate-bar .nd-field-date{flex:0.6;min-width:160px}
    .sk-namedate-bar .nd-line{flex:1;border-bottom:1.5px solid #0F2050;height:1px;min-width:60px}
    .sheet{max-width:100%;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(15,32,80,0.12);overflow:hidden}
    .instructions{background:#FEF8F0;border:1.5px solid #C4893A33;border-radius:10px;padding:10px 16px;font-size:0.85rem;color:#7A4E1D;margin:16px 0 20px}
    .sheet-footer{margin-top:24px;padding-top:12px;border-top:1.5px solid #DCE1EF;text-align:center;font-size:0.7rem;color:#9CA9C7}
    .ct-model{font-family:'Nunito',sans-serif;font-weight:900;font-size:3rem;line-height:1.1;color:#0F2050;text-align:center;margin-bottom:20px;word-break:break-word}
    .ct-rows{display:flex;flex-direction:column;gap:10px}
    .ct-row{padding:2px 0}
    .dotted-row{display:block;width:100%}
    @media print{
      @page{size:A4;margin:10mm}
      .no-print{display:none !important}
      .sheet{box-shadow:none;border-radius:0}
      .ct-sheet-section{padding:0;background:#fff}
      .sheet-body{padding:14px 24px 16px !important}
      .instructions{margin:10px 0 14px !important}
      .ct-model{margin-bottom:12px !important}
      .ct-rows{gap:6px !important}
      .sheet-footer{margin-top:10px !important;padding-top:8px !important}
      nav, footer, #whatsapp-btn, #wa-tooltip{display:none !important}
      body{padding:0}
    }
  </style>
  ${Footer()}
  `
  return Layout({ children: content, title: 'Custom Tracing Sheet Generator – SuperKids India Preschool', description: 'Create and print a custom multi-line tracing worksheet for any letter, word, or sentence — free and instant, no login needed.', canonical: 'https://superkidsindia.com/assignments/custom-tracing' })
}

app.get('/assignments/custom-tracing', (c) => {
  const text = c.req.query('text') || ''
  const lines = c.req.query('lines') || '6'
  const caseParam = c.req.query('case') || 'asis'
  const fontSizeParam = c.req.query('fontSize') || 'auto'
  const colsParam = c.req.query('cols') || 'auto'
  return c.html(customTracingPage(text, lines, caseParam, fontSizeParam, colsParam))
})

// ================================================================
// ── Custom Assignment (public upload tool) ──────────────────────
// ================================================================
app.post('/api/custom-assignments', async (c) => {
  try {
    const sess = await getSession(c)
    if (!isNonParentStaff(sess)) return c.json({ error: 'Staff login required' }, 401)
    await ensureCustomAssignmentTable(c.env.DB)
    const body = await c.req.json()
    const cl = findAssignClass(String(body.classId || ''))
    const subj = findAssignSubject(String(body.subjectId || ''))
    const title = String(body.title || '').trim().slice(0, 80)
    const imageKey = String(body.imageKey || '').trim()
    if (!cl || !subj || !title || !imageKey) return c.json({ error: 'Missing or invalid fields' }, 400)
    const zoom = Math.min(5, Math.max(0.5, parseFloat(body.zoom) || 1))
    const panX = Math.min(60, Math.max(-60, parseFloat(body.panX) || 0))
    const panY = Math.min(60, Math.max(-60, parseFloat(body.panY) || 0))
    const rotation = Math.min(180, Math.max(-180, parseFloat(body.rotation) || 0))
    const fileType = body.fileType === 'pdf' ? 'pdf' : 'image'
    const id = `ca_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    await c.env.DB.prepare('INSERT INTO custom_assignments (id,class_id,subject_id,title,image_key,zoom,pan_x,pan_y,rotation,file_type) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(id, cl.id, subj.id, title, imageKey, zoom, panX, panY, rotation, fileType).run()
    return c.json({ ok: true, id, classId: cl.id, subjectId: subj.id })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.delete('/api/custom-assignments/:id', async (c) => {
  try {
    const sess = await getSession(c)
    if (!isNonParentStaff(sess)) return c.json({ error: 'Staff login required' }, 401)
    await ensureCustomAssignmentTable(c.env.DB)
    const id = c.req.param('id')
    const row = await c.env.DB.prepare('SELECT * FROM custom_assignments WHERE id=?').bind(id).first<CustomAssignmentRow>()
    if (!row) return c.json({ error: 'Not found' }, 404)
    try { await c.env.MEDIA.delete(row.image_key) } catch { /* ignore R2 delete errors */ }
    await c.env.DB.prepare('DELETE FROM custom_assignments WHERE id=?').bind(id).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

function customAssignmentFormPage(): string {
  const content = `
  ${Navbar('assignments')}
  <section style="padding:3rem 0 3rem;background:linear-gradient(135deg,#E8F7FC,#FEF8F0)">
    <div class="max-w-3xl mx-auto px-4">
      <div class="badge mb-4" style="background:#E8F7FC;color:#1AA6CA;border:1px solid #1AA6CA33">Staff Tool</div>
      <div class="section-accent" style="margin:0 auto 1rem"></div>
      <h1 class="section-title" style="color:#1AA6CA;font-size:clamp(2.1rem,5vw,3.2rem);text-align:center">Custom Assignment</h1>
      <p style="color:#6B7A9D;font-size:1rem;line-height:1.8;margin-top:1rem;text-align:center;max-width:560px;margin-left:auto;margin-right:auto">
        Upload a picture or PDF, pick the class and subject, and save — it will appear right there in that class's worksheet list, ready to view and print.
      </p>
    </div>
  </section>
  <section style="padding:0 0 5rem;background:#F8F9FB">
    <div class="max-w-3xl mx-auto px-4">
      <div id="ca-login-gate" class="card" style="padding:2.5rem;text-align:center;display:none">
        <div style="font-size:2.4rem;margin-bottom:0.75rem">🔒</div>
        <h3 style="font-family:'Playfair Display',serif;font-size:1.3rem;color:#0F2050;font-weight:800;margin-bottom:0.5rem">Staff Login Required</h3>
        <p style="color:#6B7A9D;font-size:0.9rem;margin-bottom:1.25rem">Creating or removing a custom assignment is restricted to school staff. Log in below to continue — you'll stay right here on this page.</p>
        <form style="max-width:320px;margin:0 auto;text-align:left" onsubmit="event.preventDefault();caStaffLogin();return false">
          <div style="margin-bottom:12px">
            <label style="font-weight:800;color:#0F2050;font-size:0.85rem;display:block;margin-bottom:6px">Username</label>
            <input type="text" id="ca-login-username" class="form-input" autocomplete="username">
          </div>
          <div style="margin-bottom:16px">
            <label style="font-weight:800;color:#0F2050;font-size:0.85rem;display:block;margin-bottom:6px">Password</label>
            <input type="password" id="ca-login-password" class="form-input" autocomplete="current-password">
          </div>
          <button type="submit" class="btn-primary" style="width:100%;padding:12px">Log In</button>
          <div id="ca-login-status" style="margin-top:10px;text-align:center;font-size:0.85rem;font-weight:700"></div>
        </form>
      </div>
      <div id="ca-form-wrap" class="card" style="padding:2rem;display:none">
        <div style="margin-bottom:16px">
          <label style="font-weight:800;color:#0F2050;font-size:0.85rem;display:block;margin-bottom:6px">Assignment Name</label>
          <input type="text" id="ca-title" maxlength="80" placeholder="e.g. Fruit Coloring Sheet" class="form-input">
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4" style="margin-bottom:16px">
          <div>
            <label style="font-weight:800;color:#0F2050;font-size:0.85rem;display:block;margin-bottom:6px">Class</label>
            <select id="ca-class" class="form-input">
              ${ASSIGNMENT_CLASSES.map(cl => `<option value="${cl.id}">${esc(cl.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-weight:800;color:#0F2050;font-size:0.85rem;display:block;margin-bottom:6px">Subject</label>
            <select id="ca-subject" class="form-input">
              ${ASSIGNMENT_SUBJECTS.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <label style="font-weight:800;color:#0F2050;font-size:0.85rem;display:block;margin-bottom:6px">Upload Image or PDF</label>
          <input type="file" id="ca-file" accept="image/*,application/pdf" class="form-input">
        </div>
        <div style="margin-bottom:20px">
          <label style="font-weight:800;color:#0F2050;font-size:0.85rem;display:block;margin-bottom:10px">Adjust</label>
          <div class="ca-cropbox" id="ca-cropbox">
            <img id="ca-preview-img" style="display:none" alt="Preview">
            <canvas id="ca-preview-pdf" style="display:none"></canvas>
            <div id="ca-placeholder">No file selected yet</div>
          </div>
          <div class="ca-sliders">
            <label id="ca-zoom-row">Zoom <input type="range" id="ca-zoom" min="0.5" max="3" step="0.05" value="1"></label>
            <label id="ca-panx-row">Horizontal <input type="range" id="ca-panx" min="-60" max="60" step="1" value="0"></label>
            <label id="ca-pany-row">Vertical <input type="range" id="ca-pany" min="-60" max="60" step="1" value="0"></label>
            <label id="ca-rotation-row">Tilt / Rotate <input type="range" id="ca-rotation" min="-180" max="180" step="1" value="0"></label>
          </div>
          <div id="ca-pdf-hint" style="display:none;font-size:0.78rem;color:#6B7A9D;text-align:center;margin-top:10px;max-width:320px;margin-left:auto;margin-right:auto">📄 This preview shows page 1 only. Zoom/pan/tilt adjust how it displays, but printing will still include every page of the PDF in sequence.</div>
        </div>
        <button type="button" class="btn-primary" style="width:100%;padding:14px" onclick="saveCustomAssignment()">Save Assignment</button>
        <div id="ca-status" style="margin-top:12px;text-align:center;font-size:0.9rem;color:#0F2050;font-weight:700"></div>
      </div>
    </div>
  </section>
  <style>
    .ca-cropbox{width:100%;max-width:320px;aspect-ratio:4/5;margin:0 auto 16px;border:2px dashed #DCE1EF;border-radius:14px;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center;position:relative}
    .ca-cropbox img, .ca-cropbox canvas{width:100%;height:100%;object-fit:contain;transform-origin:center center}
    #ca-placeholder{color:#9CA9C7;font-size:0.85rem;text-align:center;padding:0 20px}
    .ca-sliders{display:flex;flex-direction:column;gap:10px;max-width:320px;margin:0 auto}
    .ca-sliders label{display:flex;align-items:center;gap:10px;font-size:0.85rem;color:#2A3B60;font-weight:700}
    .ca-sliders input[type=range]{flex:1}
  </style>
  <script>
    let caFile = null;
    let caIsPdf = false;
    const caImg = document.getElementById('ca-preview-img');
    const caPdf = document.getElementById('ca-preview-pdf');
    const caPlaceholder = document.getElementById('ca-placeholder');

    async function caCheckStaffLogin(){
      const token = localStorage.getItem('sk_session_token');
      let ok = false;
      if (token) {
        try {
          const res = await fetch('/api/session', { headers: { 'Authorization': 'Bearer ' + token } });
          const json = await res.json();
          ok = !!(json.ok && json.user && json.user.role !== 'parent');
        } catch (e) { ok = false; }
      }
      document.getElementById('ca-form-wrap').style.display = ok ? 'block' : 'none';
      document.getElementById('ca-login-gate').style.display = ok ? 'none' : 'block';
      return ok;
    }
    caCheckStaffLogin();

    async function caStaffLogin(){
      const status = document.getElementById('ca-login-status');
      const username = document.getElementById('ca-login-username').value.trim();
      const password = document.getElementById('ca-login-password').value;
      if (!username || !password) { status.style.color = '#D64545'; status.textContent = 'Please enter username and password.'; return; }
      status.style.color = '#0F2050';
      status.textContent = 'Logging in...';
      try {
        const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const json = await res.json();
        if (!json.ok || !json.token) {
          status.style.color = '#D64545';
          status.textContent = json.error || 'Invalid username or password.';
          return;
        }
        if (json.user && json.user.role === 'parent') {
          status.style.color = '#D64545';
          status.textContent = 'Parent accounts cannot create or delete custom assignments.';
          return;
        }
        localStorage.setItem('sk_session_token', json.token);
        status.style.color = '#1AA6CA';
        status.textContent = 'Logged in!';
        await caCheckStaffLogin();
      } catch (e) {
        status.style.color = '#D64545';
        status.textContent = 'Something went wrong. Please try again.';
      }
    }

    let pdfjsLoadPromise = null;
    function loadPdfJs(){
      if (pdfjsLoadPromise) return pdfjsLoadPromise;
      pdfjsLoadPromise = new Promise(function(resolve, reject){
        const s = document.createElement('script');
        s.src = '/static/pdfjs/pdf.min.js';
        s.onload = function(){ pdfjsLib.GlobalWorkerOptions.workerSrc = '/static/pdfjs/pdf.worker.min.js'; resolve(); };
        s.onerror = reject;
        document.head.appendChild(s);
      });
      return pdfjsLoadPromise;
    }

    document.getElementById('ca-file').addEventListener('change', function(e){
      const f = e.target.files[0];
      if (!f) return;
      caFile = f;
      caIsPdf = f.type === 'application/pdf';
      document.getElementById('ca-pdf-hint').style.display = caIsPdf ? 'block' : 'none';
      document.getElementById('ca-zoom').value = 1;
      document.getElementById('ca-panx').value = 0;
      document.getElementById('ca-pany').value = 0;
      document.getElementById('ca-rotation').value = 0;
      caPlaceholder.style.display = 'none';
      if (caIsPdf) {
        caImg.style.display = 'none';
        caPdf.style.display = 'block';
        const reader = new FileReader();
        reader.onload = async function(ev){
          try {
            await loadPdfJs();
            const typedArray = new Uint8Array(ev.target.result);
            const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
            const page = await pdf.getPage(1);
            const baseViewport = page.getViewport({ scale: 1 });
            const targetWidth = caPdf.clientWidth || 320;
            const scale = (targetWidth / baseViewport.width) * 2;
            const viewport = page.getViewport({ scale: scale });
            caPdf.width = viewport.width;
            caPdf.height = viewport.height;
            const ctx = caPdf.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            caApplyTransform();
          } catch (err) {
            document.getElementById('ca-status').textContent = 'Could not preview this PDF, but it can still be saved.';
          }
        };
        reader.readAsArrayBuffer(f);
      } else {
        caPdf.style.display = 'none';
        caImg.style.display = 'block';
        const reader = new FileReader();
        reader.onload = function(ev){
          caImg.src = ev.target.result;
          caApplyTransform();
        };
        reader.readAsDataURL(f);
      }
    });
    function caApplyTransform(){
      const z = document.getElementById('ca-zoom').value;
      const x = document.getElementById('ca-panx').value;
      const y = document.getElementById('ca-pany').value;
      const r = document.getElementById('ca-rotation').value;
      const t = 'translate(' + x + '%,' + y + '%) scale(' + z + ') rotate(' + r + 'deg)';
      caImg.style.transform = t;
      caPdf.style.transform = t;
    }
    ['ca-zoom','ca-panx','ca-pany','ca-rotation'].forEach(function(id){
      document.getElementById(id).addEventListener('input', caApplyTransform);
    });
    async function saveCustomAssignment(){
      const status = document.getElementById('ca-status');
      const token = localStorage.getItem('sk_session_token');
      if (!token) { status.textContent = 'Please log in as staff first.'; return; }
      const title = document.getElementById('ca-title').value.trim();
      const classId = document.getElementById('ca-class').value;
      const subjectId = document.getElementById('ca-subject').value;
      if (!title) { status.textContent = 'Please enter an assignment name.'; return; }
      if (!caFile) { status.textContent = 'Please choose a file.'; return; }
      status.textContent = 'Uploading...';
      try {
        const fd = new FormData();
        fd.append('file', caFile);
        const upRes = await fetch('/api/custom-assignments/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
        const upJson = await upRes.json();
        if (!upJson.ok) { status.textContent = 'Upload failed: ' + (upJson.error || ''); return; }
        status.textContent = 'Saving...';
        const payload = {
          classId: classId, subjectId: subjectId, title: title, imageKey: upJson.key,
          fileType: upJson.fileType,
          zoom: document.getElementById('ca-zoom').value,
          panX: document.getElementById('ca-panx').value,
          panY: document.getElementById('ca-pany').value,
          rotation: document.getElementById('ca-rotation').value,
        };
        const res = await fetch('/api/custom-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (json.ok) {
          status.textContent = 'Saved! Redirecting...';
          window.location.href = '/assignments/' + classId + '/' + subjectId;
        } else {
          status.textContent = 'Save failed: ' + (json.error || '');
        }
      } catch (err) {
        status.textContent = 'Something went wrong. Please try again.';
      }
    }
  </script>
  ${Footer()}
  `
  return Layout({ children: content, title: 'Custom Assignment – SuperKids India Preschool', description: 'Staff can upload a picture or PDF, tag it to a class and subject, and it will appear in that worksheet list for students to view and print.', canonical: 'https://superkidsindia.com/assignments/custom-assignment' })
}

app.get('/assignments/custom-assignment', (c) => c.html(customAssignmentFormPage()))

function printCustomAssignmentPage(classInfo: AssignClass, subjectInfo: AssignSubject, row: CustomAssignmentRow): string {
  const isPdf = row.file_type === 'pdf'
  const transform = caTransform(row)
  const bodyMedia = isPdf
    ? `<div id="ca-pdf-pages"><div id="ca-pdf-loading">Loading document…</div></div>`
    : `<img src="/r2/${esc(row.image_key)}" style="transform:${transform}" alt="${esc(row.title)}">`
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(row.title)} – ${esc(classInfo.name)} ${esc(subjectInfo.name)} – SuperKids India Preschool</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
${isPdf ? `<script src="/static/pdfjs/pdf.min.js"></script>` : ''}
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Nunito',sans-serif;background:#F0F2F7;color:#0F1E3D;padding:24px 16px}
.toolbar{max-width:850px;margin:0 auto 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.toolbar a, .toolbar button{font-family:'Nunito',sans-serif;font-weight:800;font-size:0.85rem;letter-spacing:0.5px;text-decoration:none;border-radius:50px;padding:10px 22px;cursor:pointer;border:none}
.back-link{color:#0F2050;background:#fff;border:2px solid #0F2050 !important}
.print-btn{color:#fff;background:linear-gradient(135deg,#0F2050,#1AA6CA);box-shadow:0 4px 16px rgba(15,32,80,0.25)}
.delete-btn{color:#fff;background:#D64545;display:none}
.sheet{max-width:850px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(15,32,80,0.12);padding:0 0 20px;overflow:hidden}
.sheet-body{padding:16px 24px 0}
${SK_BANNER_STYLE}
.sk-banner-compact{border-radius:0;border-left:none;border-right:none;border-top:none}
.worksheet-title{font-family:'Playfair Display',serif;font-weight:800;color:#0F2050;font-size:1.5rem}
.worksheet-tag{font-size:0.75rem;color:#1AA6CA;font-weight:800;text-transform:uppercase;letter-spacing:1px}
.instructions{background:#FEF8F0;border:1.5px solid #C4893A33;border-radius:10px;padding:8px 16px;font-size:0.85rem;color:#7A4E1D;margin:12px 0 14px}
.sheet-footer{margin-top:14px;padding-top:10px;border-top:1.5px solid #DCE1EF;text-align:center;font-size:0.7rem;color:#9CA9C7}
.ca-image-wrap{width:100%;margin:0 auto;border:1px solid #DCE1EF;border-radius:10px;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center}
.ca-image-wrap img{width:100%;height:auto;max-height:78vh;object-fit:contain;transform-origin:center center}
#ca-pdf-pages{width:100%;display:flex;flex-direction:column;align-items:center;gap:10px}
#ca-pdf-loading{padding:40px;color:#9CA9C7;font-size:0.9rem}
.ca-pdf-page{max-width:100%;border:1px solid #DCE1EF;border-radius:6px;overflow:hidden;page-break-inside:avoid;break-inside:avoid}
.ca-pdf-page canvas{display:block;max-width:100%;height:auto;transform-origin:center center}
@media print{
  @page{size:A4;margin:10mm}
  body{background:#fff;padding:0}
  .toolbar{display:none}
  .sheet{box-shadow:none;border-radius:0;max-width:100%}
  .sk-banner{border-radius:0}
  .ca-image-wrap img{max-height:190mm}
  .ca-pdf-page canvas{max-height:190mm !important;width:auto !important;max-width:100%}
  .ca-pdf-page:first-child{page-break-before:avoid}
}
</style>
</head>
<body>
  <div class="toolbar">
    <a href="/assignments/${classInfo.id}/${subjectInfo.id}" class="back-link">&larr; Back to ${esc(subjectInfo.name)}</a>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="delete-btn" id="ca-delete-btn" onclick="caDeleteAssignment()">🗑️ Delete</button>
      <button class="print-btn" onclick="window.print()"><i>🖨️</i> Print / Save as PDF</button>
    </div>
  </div>
  <div class="sheet">
    ${worksheetLetterheadHtml(classInfo, subjectInfo, row.title)}
    <div class="sheet-body">
      <div class="instructions">📌 Follow the ${isPdf ? 'document' : 'picture'} above to complete this assignment.</div>
      <div class="ca-image-wrap">${bodyMedia}</div>
      <div class="sheet-footer">SuperKids India Preschool &middot; Custom assignment &middot; superkidsindia.com</div>
    </div>
  </div>
  <script>
    (async function caCheckDeletePerm(){
      const token = localStorage.getItem('sk_session_token');
      if (!token) return;
      try {
        const res = await fetch('/api/session', { headers: { 'Authorization': 'Bearer ' + token } });
        const json = await res.json();
        if (json.ok && json.user && json.user.role !== 'parent') {
          document.getElementById('ca-delete-btn').style.display = 'inline-block';
        }
      } catch (e) { /* not logged in */ }
    })();
    async function caDeleteAssignment(){
      if (!confirm('Delete this custom assignment? This cannot be undone.')) return;
      const token = localStorage.getItem('sk_session_token');
      try {
        const res = await fetch('/api/custom-assignments/${row.id}', { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        const json = await res.json();
        if (json.ok) {
          window.location.href = '/assignments/${classInfo.id}/${subjectInfo.id}';
        } else {
          alert('Delete failed: ' + (json.error || ''));
        }
      } catch (e) { alert('Something went wrong. Please try again.'); }
    }
    ${isPdf ? `
    (async function caRenderPdf(){
      const container = document.getElementById('ca-pdf-pages');
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/static/pdfjs/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument('/r2/${esc(row.image_key)}').promise;
        container.innerHTML = '';
        const targetWidth = Math.min(container.clientWidth || 760, 760);
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = targetWidth / baseViewport.width;
          const viewport = page.getViewport({ scale: scale * 2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = (viewport.width / 2) + 'px';
          canvas.style.transform = '${transform}';
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
          const wrap = document.createElement('div');
          wrap.className = 'ca-pdf-page';
          wrap.appendChild(canvas);
          container.appendChild(wrap);
        }
      } catch (e) {
        container.innerHTML = '<div style="padding:30px;text-align:center;color:#D64545;font-size:0.9rem">Could not preview this PDF. <a href="/r2/${esc(row.image_key)}" target="_blank" rel="noopener">Open it directly</a> instead.</div>';
      }
    })();` : ''}
  </script>
</body>
</html>`
}

app.get('/assignments/custom/:id', async (c) => {
  try {
    await ensureCustomAssignmentTable(c.env.DB)
    const row = await c.env.DB.prepare('SELECT * FROM custom_assignments WHERE id=?').bind(c.req.param('id')).first<CustomAssignmentRow>()
    if (!row) return c.html('<div style="font-family:sans-serif;text-align:center;margin-top:80px;color:#555"><h2>Assignment not found</h2><a href="/assignments">&larr; Back to Assignments</a></div>', 404)
    const cl = findAssignClass(row.class_id)
    const subj = findAssignSubject(row.subject_id)
    if (!cl || !subj) return c.html('<div style="font-family:sans-serif;text-align:center;margin-top:80px;color:#555"><h2>Assignment not found</h2><a href="/assignments">&larr; Back to Assignments</a></div>', 404)
    return c.html(printCustomAssignmentPage(cl, subj, row))
  } catch (e: any) {
    return c.html('<div style="font-family:sans-serif;text-align:center;margin-top:80px;color:#555"><h2>Error loading assignment</h2></div>', 500)
  }
})

app.get('/assignments', (c) => {
  const content = `
  ${Navbar('assignments')}
  <section style="padding:3rem 0 4rem;background:linear-gradient(135deg,#E8F7FC,#FEF8F0)">
    <div class="max-w-5xl mx-auto px-4">
      ${schoolBannerHtml({ tag: 'Free Printable Worksheets' })}
      <p style="color:#6B7A9D;font-size:1.05rem;line-height:1.8;margin-top:2rem;text-align:center;max-width:640px;margin-left:auto;margin-right:auto">
        Choose your child's class below to see 100+ print-at-home worksheets across English, Math, EVS, Rhymes &amp; Stories, Art &amp; Craft, and Hindi / Marathi. No login needed!
      </p>
      <div style="text-align:center;margin-top:1.5rem">
        <a href="/assignments/custom-tracing" class="btn-secondary" style="display:inline-flex;align-items:center;gap:8px">✏️ Try the Custom Tracing Sheet Generator</a>
      </div>
    </div>
  </section>
  <section style="padding:2rem 0 5rem;background:#F8F9FB">
    <div class="max-w-6xl mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        ${ASSIGNMENT_CLASSES.map(cl => {
          const total = ASSIGNMENT_SUBJECTS.reduce((s, sub) => s + getSubjectSetCount(sub.id, cl.level), 0)
          return `
          <a href="/assignments/${cl.id}" class="card fade-in" style="border-color:${cl.color}33;text-decoration:none;display:block">
            <div class="badge mb-3" style="background:${cl.color}14;color:${cl.color};border:1px solid ${cl.color}33">${esc(cl.age)}</div>
            <h3 style="font-family:'Playfair Display',serif;font-size:1.5rem;color:${cl.color};font-weight:800;margin-bottom:0.5rem">${esc(cl.name)}</h3>
            <p style="color:#2A3B60;font-size:0.9rem;line-height:1.6">${ASSIGNMENT_SUBJECTS.length} subjects &middot; ${total}+ worksheets</p>
          </a>`
        }).join('')}
      </div>
    </div>
  </section>
  ${Footer()}
  `
  return c.html(Layout({ children: content, title: 'Assignment – Free Printable Worksheets by Class – SuperKids India Preschool', description: 'Free printable worksheets for Play Group, Nursery, Jr. KG, and Sr. KG covering English, Math, EVS, Rhymes & Stories, Art & Craft, and Hindi / Marathi. Print at home for daily learning.', canonical: 'https://superkidsindia.com/assignments' }))
})

app.get('/assignments/:classId', (c) => {
  const cl = findAssignClass(c.req.param('classId'))
  if (!cl) return c.html('<div style="font-family:sans-serif;text-align:center;margin-top:80px;color:#555"><h2>Class not found</h2><a href="/assignments">&larr; Back to Assignments</a></div>', 404)
  const content = `
  ${Navbar('assignments')}
  <section style="padding:3rem 0 2.5rem;background:linear-gradient(135deg,#E8F7FC,#FEF8F0)">
    <div class="max-w-5xl mx-auto px-4">
      ${schoolBannerHtml({ tag: cl.name, classInfo: cl })}
      <p style="color:#6B7A9D;font-size:0.95rem;margin-top:1.5rem;text-align:center">
        <a href="/assignments" style="color:#1AA6CA;font-weight:700;text-decoration:none">Assignments</a> &rsaquo; <b style="color:${cl.color}">${esc(cl.name)}</b>
      </p>
    </div>
  </section>
  <section style="padding:1rem 0 5rem;background:#F8F9FB">
    <div class="max-w-6xl mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        ${ASSIGNMENT_SUBJECTS.map(s => `
          <a href="/assignments/${cl.id}/${s.id}" class="card fade-in" style="border-color:${s.color}33;text-decoration:none;display:block">
            <div style="font-size:2.6rem;margin-bottom:0.75rem">${s.emoji}</div>
            <h3 style="font-family:'Playfair Display',serif;font-size:1.3rem;color:${s.color};font-weight:800;margin-bottom:0.4rem">${esc(s.name)}</h3>
            <p style="color:#2A3B60;font-size:0.9rem">${getSubjectSetCount(s.id, cl.level)} worksheets</p>
          </a>
        `).join('')}
      </div>
    </div>
  </section>
  ${Footer()}
  `
  return c.html(Layout({ children: content, title: `${cl.name} Assignments – SuperKids India Preschool`, description: `Free printable ${cl.name} worksheets across English, Math, EVS, Rhymes & Stories, Art & Craft, and Hindi / Marathi.`, canonical: `https://superkidsindia.com/assignments/${cl.id}` }))
})

app.get('/assignments/:classId/:subjectId', async (c) => {
  const cl = findAssignClass(c.req.param('classId'))
  const subj = findAssignSubject(c.req.param('subjectId'))
  if (!cl || !subj) return c.html('<div style="font-family:sans-serif;text-align:center;margin-top:80px;color:#555"><h2>Not found</h2><a href="/assignments">&larr; Back to Assignments</a></div>', 404)
  const count = getSubjectSetCount(subj.id, cl.level)
  const items = Array.from({ length: count }, (_, i) => {
    const num = i + 1
    const { title, instructions } = getAssignmentContent(cl, subj.id, num)
    return { num, title, instructions }
  })
  let customItems: CustomAssignmentRow[] = []
  try {
    await ensureCustomAssignmentTable(c.env.DB)
    const rows = await c.env.DB.prepare('SELECT * FROM custom_assignments WHERE class_id=? AND subject_id=? ORDER BY created_at DESC').bind(cl.id, subj.id).all()
    customItems = rows.results || []
  } catch { /* no custom assignments yet */ }
  const content = `
  ${Navbar('assignments')}
  <section style="padding:3rem 0 2.5rem;background:linear-gradient(135deg,#E8F7FC,#FEF8F0)">
    <div class="max-w-5xl mx-auto px-4">
      ${schoolBannerHtml({ tag: `${cl.name} • ${subj.name}`, classInfo: cl, subjectInfo: subj })}
      <p style="color:#6B7A9D;font-size:0.95rem;margin-top:1.5rem;text-align:center">
        <a href="/assignments" style="color:#1AA6CA;font-weight:700;text-decoration:none">Assignments</a> &rsaquo;
        <a href="/assignments/${cl.id}" style="color:${cl.color};font-weight:700;text-decoration:none">${esc(cl.name)}</a> &rsaquo;
        <b style="color:${subj.color}">${esc(subj.name)}</b>
      </p>
      <div class="max-w-xl mx-auto" style="margin-top:1.5rem">
        <input type="text" id="assignment-search" placeholder="🔍 Search worksheets by name or topic..." class="form-input" style="width:100%;padding:14px 22px;font-size:1rem;border-radius:50px">
      </div>
    </div>
  </section>
  <section style="padding:1rem 0 5rem;background:#F8F9FB">
    <div class="max-w-6xl mx-auto px-4">
      <div id="assignment-search-empty" style="display:none;text-align:center;color:#9CA9C7;padding:3rem 1rem;font-size:0.95rem">No worksheets match your search. Try a different word.</div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${customItems.map(row => `
          <div class="card fade-in" style="border-color:#7C3AED33" data-search="${esc(row.title.toLowerCase())}">
            <div class="badge mb-2" style="background:#7C3AED14;color:#7C3AED;border:1px solid #7C3AED33;font-size:0.68rem">Custom${row.file_type === 'pdf' ? ' · PDF' : ''}</div>
            <div style="width:100%;aspect-ratio:16/10;border-radius:10px;overflow:hidden;background:#F0F2F7;margin-bottom:0.75rem;display:flex;align-items:center;justify-content:center">
              ${row.file_type === 'pdf'
                ? `<div style="font-size:2.6rem">📄</div>`
                : `<img src="/r2/${esc(row.image_key)}" alt="${esc(row.title)}" style="width:100%;height:100%;object-fit:contain;transform:${caTransform(row)};transform-origin:center center">`}
            </div>
            <h3 style="font-family:'Playfair Display',serif;font-size:1.1rem;color:#7C3AED;font-weight:700;margin-bottom:0.75rem">${esc(row.title)}</h3>
            <a href="/assignments/custom/${row.id}" class="btn-primary" style="display:block;text-align:center;font-size:0.8rem;padding:11px">
              <i class="fas fa-print mr-2"></i>View &amp; Print
            </a>
            <button type="button" class="ca-card-delete" data-id="${row.id}" style="display:none;width:100%;text-align:center;font-size:0.75rem;padding:9px;margin-top:8px;border-radius:50px;border:none;cursor:pointer;background:#D6454514;color:#D64545;font-weight:800">🗑️ Delete</button>
          </div>
        `).join('')}
        ${items.map(it => `
          <div class="card fade-in" style="border-color:${subj.color}33" data-search="${esc((it.title + ' ' + it.instructions).toLowerCase())}">
            <div class="badge mb-2" style="background:${subj.color}14;color:${subj.color};border:1px solid ${subj.color}33;font-size:0.68rem">Worksheet ${it.num}</div>
            <h3 style="font-family:'Playfair Display',serif;font-size:1.1rem;color:${subj.color};font-weight:700;margin-bottom:0.5rem">${esc(it.title)}</h3>
            <p style="color:#2A3B60;font-size:0.85rem;line-height:1.6;margin-bottom:1.2rem">${esc(it.instructions)}</p>
            <a href="/assignments/${cl.id}/${subj.id}/${it.num}" class="btn-primary" style="display:block;text-align:center;font-size:0.8rem;padding:11px">
              <i class="fas fa-print mr-2"></i>View &amp; Print
            </a>
          </div>
        `).join('')}
      </div>
    </div>
  </section>
  <script>
    (function assignmentSearchFilter(){
      const input = document.getElementById('assignment-search');
      const cards = document.querySelectorAll('[data-search]');
      const emptyMsg = document.getElementById('assignment-search-empty');
      if (!input) return;
      input.addEventListener('input', function(){
        const q = this.value.trim().toLowerCase();
        let visible = 0;
        cards.forEach(function(card){
          const match = !q || card.dataset.search.indexOf(q) !== -1;
          card.style.display = match ? '' : 'none';
          if (match) visible++;
        });
        emptyMsg.style.display = visible === 0 ? 'block' : 'none';
      });
    })();
    (async function caCheckListDeletePerm(){
      const btns = document.querySelectorAll('.ca-card-delete');
      if (!btns.length) return;
      const token = localStorage.getItem('sk_session_token');
      if (!token) return;
      try {
        const res = await fetch('/api/session', { headers: { 'Authorization': 'Bearer ' + token } });
        const json = await res.json();
        if (!(json.ok && json.user && json.user.role !== 'parent')) return;
        btns.forEach(function(btn){
          btn.style.display = 'block';
          btn.addEventListener('click', async function(){
            if (!confirm('Delete this custom assignment? This cannot be undone.')) return;
            try {
              const dres = await fetch('/api/custom-assignments/' + btn.dataset.id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
              const djson = await dres.json();
              if (djson.ok) { btn.closest('.card').remove(); }
              else { alert('Delete failed: ' + (djson.error || '')); }
            } catch (e) { alert('Something went wrong. Please try again.'); }
          });
        });
      } catch (e) { /* not logged in */ }
    })();
  </script>
  ${Footer()}
  `
  return c.html(Layout({ children: content, title: `${cl.name} ${subj.name} Worksheets – SuperKids India Preschool`, description: `${count} free printable ${subj.name} worksheets for ${cl.name}.`, canonical: `https://superkidsindia.com/assignments/${cl.id}/${subj.id}` }))
})

app.get('/assignments/:classId/:subjectId/:num', (c) => {
  const cl = findAssignClass(c.req.param('classId'))
  const subj = findAssignSubject(c.req.param('subjectId'))
  const num = parseInt(c.req.param('num'), 10)
  const count = cl && subj ? getSubjectSetCount(subj.id, cl.level) : 0
  if (!cl || !subj || !Number.isInteger(num) || num < 1 || num > count) {
    return c.html('<div style="font-family:sans-serif;text-align:center;margin-top:80px;color:#555"><h2>Worksheet not found</h2><a href="/assignments">&larr; Back to Assignments</a></div>', 404)
  }
  return c.html(printWorksheetPage(cl, subj, num))
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
  <link rel="apple-touch-icon" href="/static/favicon-192.png"/>
  <link rel="icon" type="image/png" sizes="192x192" href="/static/favicon-192.png"/>
  <link rel="shortcut icon" href="/static/favicon-192.png"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&family=Nunito:wght@400;600;700;800;900&family=Cinzel:wght@600;700;900&family=Bodoni+Moda:wght@700;900&display=swap" rel="stylesheet"/>
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

  <script src="/static/data.js?v=33"></script>
  <script src="/static/app.js?v=33"></script>
  <script src="/static/admin.js?v=33"></script>
  <script src="/static/management.js?v=33"></script>
  <script src="/static/parent.js?v=33"></script>
  <script src="/static/admissions.js?v=33"></script>
  <script src="/static/accounting.js?v=33"></script>
  <script src="/static/teacher.js?v=33"></script>
  <script src="/static/teachers.js?v=33"></script>
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
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
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
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
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
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
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
  await db.exec(`CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, data TEXT NOT NULL, source TEXT DEFAULT 'manual', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
}

// ── Minimal RFC4180 CSV parser (handles quoted fields, escaped quotes,
// commas/newlines inside quotes) — used to import Google Sheet exports.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else { inQuotes = false }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else if (ch === '\r') {
      // skip — \n handles the row break
    } else {
      field += ch
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((v) => v !== ''))
}

// Google Sheets CSV export renders dates per the sheet's locale (commonly
// M/D/YYYY or D/M/YYYY) — normalize to YYYY-MM-DD to match the app's format.
function normalizeSheetDate(raw: string): string {
  const s = (raw || '').trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return s
}

async function nextCounter(db: any, key: string, prefix: string, year: string) {
  const row = await db.prepare('SELECT value FROM app_data WHERE key = ?').bind(key).first<{value:string}>()
  const n = row ? (parseInt(row.value) + 1) : 1
  await db.prepare('INSERT OR REPLACE INTO app_data (key,value,updated_at) VALUES (?,?,?)').bind(key, String(n), new Date().toISOString()).run()
  return `${prefix}-${year.split('-')[0]}-${String(n).padStart(4,'0')}`
}

// ── Inquiries ────────────────────────────────────────────────
app.get('/api/inquiries', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
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
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
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
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    await c.env.DB.prepare('DELETE FROM inquiries WHERE id=?').bind(c.req.param('id')).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Admissions ───────────────────────────────────────────────
app.get('/api/admissions', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    const rows = await c.env.DB.prepare('SELECT * FROM admissions ORDER BY created_at DESC').all()
    return c.json({ items: rows.results || [] })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/admissions/:id', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    const row = await c.env.DB.prepare('SELECT * FROM admissions WHERE id=?').bind(c.req.param('id')).first()
    if (!row) return c.json({ error: 'Not found' }, 404)
    return c.json({ item: row })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// Renumber all admissions sequentially per year (creation order) and reset
// the counters to match — fixes gaps left by deleted test admissions.
// Cascades renames into payment receipts and enrolled students' roll numbers.
app.post('/api/admissions/renumber', async (c) => {
  const sess = await getSession(c)
  if (!sess || sess.role !== 'superadmin') return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    const rows = await c.env.DB.prepare('SELECT * FROM admissions ORDER BY created_at ASC').all()
    const items = (rows.results || []) as any[]
    const counters: Record<string, number> = {}
    const renames: Record<string, string> = {}
    const now = new Date().toISOString()
    for (const row of items) {
      let d: any = {}
      try { d = row.data ? JSON.parse(row.data) : {} } catch {}
      const m = /^SKI-(\d{4})-/.exec(d.admissionNo || '')
      const year = m ? m[1] : String(new Date(row.created_at || Date.now()).getFullYear())
      counters[year] = (counters[year] || 0) + 1
      const newNo = `SKI-${year}-${String(counters[year]).padStart(4, '0')}`
      if (d.admissionNo !== newNo) {
        if (d.admissionNo) renames[d.admissionNo] = newNo
        d.admissionNo = newNo
        await c.env.DB.prepare('UPDATE admissions SET data=?, updated_at=? WHERE id=?').bind(JSON.stringify(d), now, row.id).run()
      }
    }
    // Counters continue from the real count (also reset years with zero admissions left)
    const curYear = new Date().getFullYear().toString()
    if (!counters[curYear]) counters[curYear] = 0
    for (const [year, n] of Object.entries(counters)) {
      await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key,value,updated_at) VALUES (?,?,?)').bind(`adm_counter_${year}`, String(n), now).run()
    }
    if (Object.keys(renames).length) {
      const pays = await c.env.DB.prepare('SELECT * FROM payments').all()
      for (const p of (pays.results || []) as any[]) {
        let pd: any = {}
        try { pd = p.data ? JSON.parse(p.data) : {} } catch {}
        if (pd.admissionNo && renames[pd.admissionNo]) {
          pd.admissionNo = renames[pd.admissionNo]
          await c.env.DB.prepare('UPDATE payments SET data=? WHERE id=?').bind(JSON.stringify(pd), p.id).run()
        }
      }
      const blobRow = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('main').first<{value:string}>()
      if (blobRow) {
        try {
          const blob = JSON.parse(blobRow.value)
          let changed = false
          for (const s of (blob.students || [])) {
            if (s.rollNo && renames[s.rollNo]) { s.rollNo = renames[s.rollNo]; changed = true }
          }
          if (changed) await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key,value,updated_at) VALUES (?,?,?)').bind('main', JSON.stringify(blob), now).run()
        } catch {}
      }
    }
    return c.json({ ok: true, renumbered: Object.keys(renames).length, total: items.length, counters })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/admissions', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
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
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
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
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  if (sess.role !== 'superadmin') return c.json({ error: 'Only Super Admin can delete admissions' }, 403)
  try {
    await ensureAdmTables(c.env.DB)
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM admissions WHERE id=?').bind(id).run()
    // Cascade: remove the student and parent profiles created from this
    // admission out of the shared portal data so every role sees the same DB
    const safeId = id.replace(/[^a-z0-9]/gi, '_')
    const blobRow = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('main').first<{value:string}>()
    if (blobRow) {
      try {
        const blob = JSON.parse(blobRow.value)
        let changed = false
        const sBefore = (blob.students || []).length
        blob.students = (blob.students || []).filter((s: any) => s.admissionId !== id && s.id !== `stu_${safeId}`)
        if (blob.students.length !== sBefore) changed = true
        const uBefore = (blob.users || []).length
        blob.users = (blob.users || []).filter((u: any) => !(u.role === 'parent' && (u.admissionId === id || u.id === `par_${safeId}`)))
        if (blob.users.length !== uBefore) changed = true
        if (changed) {
          await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key,value,updated_at) VALUES (?,?,?)').bind('main', JSON.stringify(blob), new Date().toISOString()).run()
        }
      } catch {}
    }
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Payments ─────────────────────────────────────────────────
app.get('/api/payments', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    const rows = await c.env.DB.prepare('SELECT * FROM payments ORDER BY created_at DESC').all()
    return c.json({ items: rows.results || [] })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/payments/:id', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    const row = await c.env.DB.prepare('SELECT * FROM payments WHERE id=?').bind(c.req.param('id')).first()
    if (!row) return c.json({ error: 'Not found' }, 404)
    return c.json({ item: row })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/payments', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
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
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    await c.env.DB.prepare('DELETE FROM payments WHERE id=?').bind(c.req.param('id')).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Expenses ─────────────────────────────────────────────────
// Visible/editable by the Accounting role and Super Admin only.
function canManageExpenses(sess: {role:string} | null): boolean {
  return !!sess && (sess.role === 'accounting' || sess.role === 'superadmin')
}

app.get('/api/expenses', async (c) => {
  const sess = await getSession(c)
  if (!canManageExpenses(sess)) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    const rows = await c.env.DB.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all()
    return c.json({ items: rows.results || [] })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/expenses', async (c) => {
  const sess = await getSession(c)
  if (!canManageExpenses(sess)) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    const { data } = await c.req.json()
    const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
    const now = new Date().toISOString()
    await c.env.DB.prepare('INSERT INTO expenses (id,data,source,created_at,updated_at) VALUES (?,?,?,?,?)').bind(id, JSON.stringify(data), 'manual', now, now).run()
    return c.json({ ok: true, id })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.delete('/api/expenses/:id', async (c) => {
  const sess = await getSession(c)
  if (!canManageExpenses(sess)) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    await c.env.DB.prepare('DELETE FROM expenses WHERE id=?').bind(c.req.param('id')).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// Returns the last-used Google Sheet URL so the sync modal can pre-fill it.
app.get('/api/expenses/sheet-config', async (c) => {
  const sess = await getSession(c)
  if (!canManageExpenses(sess)) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('expense_sheet_url').first<{value:string}>()
    return c.json({ sheetUrl: row ? row.value : '' })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// Pulls the expense rows from a Google Sheet (must be shared "Anyone with
// the link — Viewer") via its CSV export and replaces all previously
// sheet-synced expense records with the current sheet content. Manually
// added expenses (source='manual') are left untouched.
app.post('/api/expenses/sync-sheet', async (c) => {
  const sess = await getSession(c)
  if (!canManageExpenses(sess)) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    const body = await c.req.json().catch(() => ({} as any))
    let sheetUrl = (body.sheetUrl || '').trim()
    if (!sheetUrl) {
      const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('expense_sheet_url').first<{value:string}>()
      sheetUrl = row ? row.value : ''
    }
    if (!sheetUrl) return c.json({ error: 'No Google Sheet URL provided' }, 400)

    const idMatch = /\/d\/([a-zA-Z0-9-_]+)/.exec(sheetUrl)
    if (!idMatch) return c.json({ error: 'Could not find a spreadsheet ID in that URL' }, 400)
    const gidMatch = /[?#&]gid=(\d+)/.exec(sheetUrl)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gidMatch ? gidMatch[1] : '0'}`

    const resp = await fetch(csvUrl, { redirect: 'follow' })
    if (!resp.ok) {
      return c.json({ error: `Could not fetch the sheet (HTTP ${resp.status}). Make sure it's shared as "Anyone with the link" – Viewer.` }, 502)
    }
    const csvText = await resp.text()
    if (/^\s*<(!doctype|html)/i.test(csvText)) {
      return c.json({ error: 'The sheet is not publicly viewable. In Google Sheets, use Share → "Anyone with the link" → Viewer, then try again.' }, 502)
    }

    const rows = parseCsv(csvText)
    if (rows.length < 2) return c.json({ error: 'The sheet has no data rows' }, 400)

    const header = rows[0].map((h) => h.trim().toLowerCase())
    const findCol = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)))
    const colDate = findCol('date')
    const colCategory = findCol('categ')
    const colDescription = findCol('description', 'particular', 'item', 'purpose')
    const colPayee = findCol('payee', 'vendor', 'paid to', 'paid by')
    const colAmount = findCol('amount', 'cost', 'price', 'total')
    const colNotes = findCol('note', 'remark')

    const now = new Date().toISOString()
    const imported: any[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.every((v) => !v || !v.trim())) continue
      const rawAmount = colAmount >= 0 ? (r[colAmount] || '') : ''
      const amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0
      const description = colDescription >= 0 ? (r[colDescription] || '').trim() : ''
      if (!description && !amount) continue
      imported.push({
        category: (colCategory >= 0 ? (r[colCategory] || '').trim() : '') || 'Other',
        description,
        payee: colPayee >= 0 ? (r[colPayee] || '').trim() : '',
        amount,
        date: normalizeSheetDate(colDate >= 0 ? (r[colDate] || '') : ''),
        notes: colNotes >= 0 ? (r[colNotes] || '').trim() : '',
        createdAt: now,
        createdBy: sess!.user_id
      })
    }

    await c.env.DB.prepare(`DELETE FROM expenses WHERE source='sheet'`).run()
    for (let i = 0; i < imported.length; i++) {
      await c.env.DB.prepare('INSERT INTO expenses (id,data,source,created_at,updated_at) VALUES (?,?,?,?,?)')
        .bind(`sheet_${i}_${Date.now()}`, JSON.stringify(imported[i]), 'sheet', now, now).run()
    }
    await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key,value,updated_at) VALUES (?,?,?)').bind('expense_sheet_url', sheetUrl, now).run()

    return c.json({ ok: true, imported: imported.length })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Public Receipt View (no auth) ────────────────────────────
// Shared school header (logo, name, gold subtitle, contact bar, address) —
// server-rendered equivalent of schoolPrintHeaderHtml() in static/app.js,
// used so every printed page (client popups + this public receipt page)
// renders with the same design and fonts.
const SCHOOL_PRINT_FONTS_HTML =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Bodoni+Moda:wght@700;900&display=swap" rel="stylesheet">'

const SCHOOL_PRINT_HEADER_CSS = `
.sph{width:100%;font-family:'Poppins','Segoe UI',Arial,sans-serif;background:#fff;container-type:inline-size}
.sph-gold-bar{height:6px;background:#c99b3a}
.sph-top{display:flex;align-items:center;gap:24px;background:#141b4d;padding:22px 40px;flex-wrap:wrap}
.sph-logo{width:88px;height:88px;flex-shrink:0;border-radius:50%;overflow:hidden;border:3px solid #c99b3a;background:#141b4d}
.sph-logo img{width:100%;height:100%;object-fit:contain}
.sph-titles{display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}
.sph-name{font-family:'Bodoni Moda',serif;font-weight:700;letter-spacing:.5px;color:#fff;line-height:1.1;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.sph-sub{font-family:'Cinzel',serif;font-weight:600;font-size:15px;letter-spacing:3px;color:#d8a13e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.sph-motto{margin-left:auto;max-width:220px;text-align:right;flex-shrink:0}
.sph-sanskrit{font-family:'Cinzel',serif;font-weight:700;font-size:14px;color:#d8a13e}
.sph-tagline{font-family:'Poppins','Segoe UI',Arial,sans-serif;font-style:italic;font-size:10px;color:#c8ccdd;line-height:1.3}
.sph-tagline span{font-style:normal}
.sph-contact{display:flex;justify-content:space-between;align-items:flex-start;background:#dbaa8b;padding:12px 40px;gap:24px;flex-wrap:wrap}
.sph-cleft{display:flex;flex-direction:column;gap:2px;min-width:0}
.sph-crow,.sph-crow-r{display:flex;align-items:center;gap:7px;font-weight:700;color:#141b4d;font-size:12px;font-family:'Times New Roman';line-height:1.5}
.sph-crow a,.sph-cright a{color:#141b4d;text-decoration:none}
.sph-ico{width:17px;height:17px;border-radius:50%;background:#141b4d;color:#dbaa8b;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sph-ico svg{width:9px;height:9px}
.sph-cright{text-align:right;color:#141b4d;font-weight:700;font-size:12px;line-height:1.5;font-family:'Times New Roman';min-width:0}
.sph-cright>div{line-height:1.5}
.sph-crow-r{justify-content:flex-end}
@container (max-width: 700px){
  .sph-top{padding:14px 18px;gap:14px}
  .sph-logo{width:56px;height:56px}
  .sph-motto{display:none}
  .sph-sub{font-size:11px;letter-spacing:2px}
  .sph-contact{padding:10px 18px;gap:12px}
  .sph-crow,.sph-crow-r{font-size:11px}
}
@container (max-width: 420px){
  .sph-name{font-size:16px !important}
}
`

// Keeps the school name on a single line at any container width by
// scaling the font down as the name gets longer, instead of letting it
// wrap to 2-3 lines.
function schoolNameFontSizePx(name: string): number {
  const len = (name || '').length
  if (len <= 12) return 34
  if (len <= 16) return 29
  if (len <= 20) return 25
  if (len <= 24) return 21
  if (len <= 28) return 18
  if (len <= 34) return 16
  return 14
}

function schoolPrintHeaderHtml(meta: any, subtitle: string): string {
  const schoolName = meta.schoolName || 'SuperKids India Preschool'
  const logoUrl = meta.schoolLogo || '/static/school-logo.png'
  const phone1 = meta.schoolPhone || '9822-977-644'
  const phone2 = meta.schoolPhone2 || '9822-977-944'
  const email = meta.schoolEmail || 'superkidsprincipal@gmail.com'
  const website = meta.schoolWebsite || 'https://superkidsindia.com/'
  const rawAddr = meta.schoolAddress || ''
  const address = rawAddr.indexOf('\n') !== -1 ? rawAddr : 'Matoshri Apartment, Plot Number 51,\nSector No 10, Bhosari Pradhikaran,\nPin:411026'
  const addrLines = address.split('\n')
  const nameFontSize = schoolNameFontSizePx(schoolName)
  return `
<div class="sph">
  <div class="sph-gold-bar"></div>
  <div class="sph-top">
    <div class="sph-logo"><img src="${logoUrl}" alt="Logo"/></div>
    <div class="sph-titles">
      <div class="sph-name" style="font-size:${nameFontSize}px">${schoolName}</div>
      <div class="sph-sub">${subtitle.toUpperCase()}</div>
    </div>
    <div class="sph-motto">
      <div class="sph-sanskrit">।सा विद्या या विमुक्तये।</div>
      <div class="sph-tagline"><span>True education is that which liberates the mind, develops character, and inspires wisdom</span></div>
    </div>
  </div>
  <div class="sph-contact">
    <div class="sph-cleft">
      <div class="sph-crow"><span class="sph-ico"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.3 11.3 0 003.55.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.3 11.3 0 00.57 3.55 1 1 0 01-.25 1.02l-2.2 2.22z"></path></svg></span>${phone1}</div>
      ${phone2 ? `<div class="sph-crow"><span class="sph-ico"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2H7zm0 3h10v13H7V5zm5 14.5a1 1 0 110 2 1 1 0 010-2z"></path></svg></span>${phone2}</div>` : ''}
      ${email ? `<div class="sph-crow"><span class="sph-ico"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v.01L12 12l8-5.99V6H4zm16 2.24l-7.4 5.55a1 1 0 01-1.2 0L4 8.24V18h16V8.24z"></path></svg></span><a href="mailto:${email}">${email}</a></div>` : ''}
      ${website ? `<div class="sph-crow"><span class="sph-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"></path></svg></span><a href="${website}" target="_blank" rel="noopener">${website}</a></div>` : ''}
    </div>
    <div class="sph-cright">
      <div class="sph-crow-r"><span class="sph-ico"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 8h-2.5v9H15v-6H9v6H5.5v-9H3l9-8z"></path></svg></span>${schoolName}</div>
      ${addrLines.map(l => `<div>${l}</div>`).join('')}
    </div>
  </div>
</div>`
}

app.get('/receipt/:id', async (c) => {
  try {
    await ensureAdmTables(c.env.DB)
    const row = await c.env.DB.prepare('SELECT * FROM payments WHERE id=?').bind(c.req.param('id')).first<{id:string,data:string}>()
    if (!row) return c.html('<div style="font-family:sans-serif;text-align:center;margin-top:80px;color:#555"><h2>Receipt not found</h2></div>', 404)
    const d: any = JSON.parse(row.data || '{}')
    const metaRow = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('main').first<{value:string}>()
    const meta: any = metaRow ? JSON.parse(metaRow.value) : {}
    const schoolName = meta.schoolName || 'SuperKids India Preschool'
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
${SCHOOL_PRINT_FONTS_HTML}
<title>Receipt ${d.receiptNo||''} — ${schoolName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
body{font-family:Arial,sans-serif;font-size:13px;color:#0F1E3D;background:#EFF3F8;padding:16px;min-height:100vh}
.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.15)}
${SCHOOL_PRINT_HEADER_CSS}
.rt{text-align:center;padding:8px;font-size:14px;font-weight:800;letter-spacing:.5px;background:#E8EDF5;color:#141b4d;border-bottom:3px solid #141b4d}
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
  ${schoolPrintHeaderHtml(meta, 'Fee Payment Receipt')}
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
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
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
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureAdmTables(c.env.DB)
    const { config } = await c.req.json()
    await c.env.DB.prepare('INSERT OR REPLACE INTO app_data (key,value,updated_at) VALUES (?,?,?)').bind('fee_config', JSON.stringify(config), new Date().toISOString()).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── OTP helpers ───────────────────────────────────────────────
async function ensureOtpTable(db: any) {
  await db.exec('CREATE TABLE IF NOT EXISTS password_reset_otps (id TEXT PRIMARY KEY, email TEXT NOT NULL, otp TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER DEFAULT 0, attempts INTEGER DEFAULT 0)')
  try { await db.exec('ALTER TABLE password_reset_otps ADD COLUMN attempts INTEGER DEFAULT 0') } catch {}
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
    const apiKey = c.env.RESEND_API_KEY || (data.meta && data.meta.resendApiKey) || ''
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
        from: meta.resendFromEmail ? `${schoolName} <${meta.resendFromEmail}>` : 'SuperKids India Preschool <onboarding@resend.dev>',
        to: [email.trim()],
        subject: `Your ${schoolName} OTP – Password Recovery`,
        html,
        ...(meta.schoolEmail ? { reply_to: meta.schoolEmail } : {})
      })
    })
    if (!res.ok) {
      let resendError = ''
      try { const j: any = await res.json(); resendError = j.message || j.name || JSON.stringify(j) } catch { resendError = String(res.status) }
      console.error('Resend OTP error:', resendError)
      return c.json({ error: 'Resend error: ' + resendError })
    }
    return c.json({ sent: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/verify-otp', async (c) => {
  try {
    const { email, otp } = await c.req.json()
    if (!email || !otp) return c.json({ error: 'Email and OTP required' }, 400)
    await ensureOtpTable(c.env.DB)
    const now = Date.now()
    // Find the active (unused, unexpired) OTP record for this email
    const record = await c.env.DB.prepare(
      'SELECT * FROM password_reset_otps WHERE email=? AND used=0 AND expires_at > ?'
    ).bind(email.toLowerCase(), now).first<{id:string,otp:string,attempts:number}>()
    if (!record) return c.json({ invalid: true })
    // Check attempt limit
    if ((record.attempts || 0) >= 5) return c.json({ locked: true })
    // Verify OTP value
    if (record.otp !== String(otp).trim()) {
      await c.env.DB.prepare('UPDATE password_reset_otps SET attempts=attempts+1 WHERE id=?').bind(record.id).run()
      const newAttempts = (record.attempts || 0) + 1
      if (newAttempts >= 5) return c.json({ locked: true })
      return c.json({ invalid: true })
    }
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
    if (!apiKey) return c.json({ notConfigured: true })
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

// ── Staff Attendance (GPS-validated) ─────────────────────────
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (x: number) => x * Math.PI / 180
  const φ1 = toRad(lat1), φ2 = toRad(lat2)
  const Δφ = toRad(lat2 - lat1), Δλ = toRad(lon2 - lon1)
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

async function ensureStaffAttTable(db: any) {
  await db.exec('CREATE TABLE IF NOT EXISTS staff_attendance (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT NOT NULL, date TEXT NOT NULL, check_in TEXT, check_in_lat REAL, check_in_lng REAL, check_out TEXT, check_out_lat REAL, check_out_lng REAL, distance_meters REAL, status TEXT DEFAULT \'Present\', late_arrival INTEGER DEFAULT 0, note TEXT DEFAULT \'\', created_at TEXT DEFAULT CURRENT_TIMESTAMP)')
}

app.post('/api/staff-attendance', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const { status, checkInTime, lat, lng, note } = await c.req.json()
    if (typeof lat !== 'number' || typeof lng !== 'number') return c.json({ error: 'Valid GPS coordinates required' }, 400)
    const row = await c.env.DB.prepare('SELECT value FROM app_data WHERE key=?').bind('main').first<{value:string}>()
    const data = row ? JSON.parse(row.value) : {}
    const meta = data.meta || {}
    const schoolLat = Number(meta.schoolLat || 0)
    const schoolLng = Number(meta.schoolLng || 0)
    const schoolRadius = Number(meta.schoolRadius || 200)
    if (!schoolLat || !schoolLng) return c.json({ notConfigured: true, error: 'School location not configured. Ask admin to set GPS coordinates in School Settings.' }, 422)
    const distance = haversineMeters(lat, lng, schoolLat, schoolLng)
    if (distance > schoolRadius) return c.json({ outsidePremises: true, distance, limit: Math.round(schoolRadius) }, 403)
    const user = (data.users || []).find((u: any) => u.id === sess.user_id)
    const userName = user ? (user.name || user.username) : 'Unknown'
    const todayStr = new Date().toISOString().slice(0, 10)
    const now = new Date()
    const checkIn = checkInTime || now.toTimeString().slice(0, 5)
    const lateArrival = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15) ? 1 : 0
    await ensureStaffAttTable(c.env.DB)
    const existing = await c.env.DB.prepare('SELECT id FROM staff_attendance WHERE user_id=? AND date=?').bind(sess.user_id, todayStr).first<{id:string}>()
    if (existing) return c.json({ alreadyMarked: true, error: 'Attendance already marked for today' }, 409)
    const id = `sa_${Date.now()}_${Math.random().toString(36).slice(2,5)}`
    await c.env.DB.prepare('INSERT INTO staff_attendance (id,user_id,user_name,date,check_in,check_in_lat,check_in_lng,distance_meters,status,late_arrival,note) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id, sess.user_id, userName, todayStr, checkIn, lat, lng, distance, status || 'Present', lateArrival, note || '').run()
    return c.json({ ok: true, id, distance, lateArrival: !!lateArrival })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/staff-attendance/checkout', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const body = await c.req.json().catch(() => ({}))
    const { lat, lng } = body as any
    const todayStr = new Date().toISOString().slice(0, 10)
    const checkOut = new Date().toTimeString().slice(0, 5)
    await ensureStaffAttTable(c.env.DB)
    const existing = await c.env.DB.prepare('SELECT id FROM staff_attendance WHERE user_id=? AND date=?').bind(sess.user_id, todayStr).first<{id:string}>()
    if (!existing) return c.json({ error: 'No check-in found for today' }, 404)
    await c.env.DB.prepare('UPDATE staff_attendance SET check_out=?,check_out_lat=?,check_out_lng=? WHERE id=?').bind(checkOut, lat || null, lng || null, existing.id).run()
    return c.json({ ok: true, checkOut })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/staff-attendance', async (c) => {
  const sess = await getSession(c)
  if (!sess) return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureStaffAttTable(c.env.DB)
    const month = c.req.query('month') || ''
    const userId = sess.role === 'superadmin' ? (c.req.query('userId') || '') : sess.user_id
    let query = 'SELECT * FROM staff_attendance WHERE 1=1'
    const params: any[] = []
    if (userId) { query += ' AND user_id=?'; params.push(userId) }
    if (month) { query += ' AND date LIKE ?'; params.push(month + '%') }
    query += ' ORDER BY date DESC, check_in'
    const rows = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ items: rows.results || [] })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/staff-attendance/all', async (c) => {
  const sess = await getSession(c)
  if (!sess || sess.role !== 'superadmin') return c.json({ error: 'Unauthorized' }, 401)
  try {
    await ensureStaffAttTable(c.env.DB)
    const month = c.req.query('month') || new Date().toISOString().slice(0, 7)
    const rows = await c.env.DB.prepare('SELECT * FROM staff_attendance WHERE date LIKE ? ORDER BY date DESC, user_name').bind(month + '%').all()
    return c.json({ items: rows.results || [] })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

export default app
