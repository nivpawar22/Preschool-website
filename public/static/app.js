// ============================================================
// EduTrack - App Router & Shared UI Helpers
// ============================================================

function getAcademicYear() {
  const stored = (DB.get().meta || {}).academicYear;
  if (stored && stored.trim()) return stored.trim();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

// ---- PWA Install prompt ----
let _pwaPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _pwaPrompt = e;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'inline-flex';
});

window.addEventListener('appinstalled', () => {
  _pwaPrompt = null;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'none';
  showToast('App installed! Find it on your home screen.', 'success', 5000);
});

function installPWA() {
  if (!_pwaPrompt) return;
  _pwaPrompt.prompt();
  _pwaPrompt.userChoice.then((result) => {
    if (result.outcome === 'accepted') showToast('Installing...', 'success');
    _pwaPrompt = null;
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'none';
  });
}

// ---- Toast ----
function showToast(msg, type = 'default', duration = 3500) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', default: 'fa-info-circle' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas ${icons[type] || icons.default}"></i><span>${msg}</span>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, duration);
}

// ---- Confirm dialog ----
function confirmDialog(msg, onConfirm, confirmText = 'Delete', dangerMode = true) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-body" style="text-align:center;padding:32px">
        <div style="font-size:48px;margin-bottom:16px">${dangerMode ? '⚠️' : '❓'}</div>
        <h3 style="font-size:18px;font-weight:800;margin:0 0 12px">${dangerMode ? 'Confirm Delete' : 'Confirm Action'}</h3>
        <p style="color:#64748b;margin:0 0 24px">${msg}</p>
        <div style="display:flex;gap:12px;justify-content:center">
          <button class="btn btn-secondary cancel-btn">Cancel</button>
          <button class="btn ${dangerMode ? 'btn-danger' : 'btn-primary'} confirm-btn">${confirmText}</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.cancel-btn').onclick = () => overlay.remove();
  overlay.querySelector('.confirm-btn').onclick = () => { overlay.remove(); onConfirm(); };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

// ---- Helpers ----
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarHtml(name, color, size = '') {
  return `<div class="avatar ${size}" style="background:${color || '#0F2050'}">${initials(name)}</div>`;
}

function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function gradeColor(g) {
  if (!g) return 'grade-F';
  if (g.startsWith('A')) return 'grade-A';
  if (g.startsWith('B')) return 'grade-B';
  if (g.startsWith('C')) return 'grade-C';
  if (g.startsWith('D')) return 'grade-D';
  return 'grade-F';
}

function scoreBarHtml(score, max) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const color = pct >= 90 ? '#10b981' : pct >= 75 ? '#1AA6CA' : pct >= 60 ? '#E8B020' : '#ef4444';
  return `<div style="display:flex;align-items:center;gap:10px">
    <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
    <span style="font-size:12px;font-weight:700;color:${color};width:36px;text-align:right">${score}/${max}</span>
  </div>`;
}

function progressRingHtml(pct, color, size = 60) {
  const safePct = Math.min(Math.max(0, pct), 100);
  const fontSize = Math.floor(size / 5.5);
  return `<div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0">
    <svg viewBox="0 0 36 36" style="width:${size}px;height:${size}px;transform:rotate(-90deg)">
      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none" stroke="#e2e8f0" stroke-width="3"/>
      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"
        stroke-dasharray="${safePct}, 100"/>
    </svg>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:900;color:${color}">${pct}%</div>
  </div>`;
}

function whatsappLink(phone, msg = '') {
  const clean = phone ? phone.replace(/\D/g, '') : '';
  if (!clean) return null;
  const encoded = encodeURIComponent(msg);
  return `https://wa.me/${clean}?text=${encoded}`;
}

function wa(phone, msg) {
  const link = whatsappLink(phone, msg);
  if (link) window.open(link, '_blank');
  else showToast('No phone number available', 'error');
}

// ---- Seen (unread tracker) ----
const Seen = (() => {
  const key = (s, uid) => 'seen_v1_' + s + '_' + uid;
  const mark = (s, uid) => { try { localStorage.setItem(key(s, uid), Date.now().toString()); } catch(e) {} };
  const ts   = (s, uid) => parseInt(localStorage.getItem(key(s, uid)) || '0');
  const count = (s, uid, items, getTs) => {
    const t = ts(s, uid); if (!t) return 0;
    return items.filter(i => { try { return new Date(getTs(i)).getTime() > t; } catch(e) { return false; } }).length;
  };
  return { mark, count };
})();

// ---- Render shared sidebar + layout ----
function renderLayout(activeTab, contentHtml, pageTitle = '', breadcrumb = '') {
  const user = Session.current();
  if (!user) { renderLogin(); return; }

  const isImp = Session.isImpersonating();
  const origUser = Session.originalUser();
  const data = DB.get();

  // Build nav items based on role
  let navItems = [];

  if (user.role === 'admission') {
    navItems = [
      { id: 'admission-dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
      { id: 'admission-inquiries', icon: 'fa-search', label: 'Inquiries' },
      { id: 'admissions-list', icon: 'fa-file-alt', label: 'All Admissions' },
      { id: 'new-admission', icon: 'fa-plus-circle', label: 'New Admission' },
      { id: 'fee-collection', icon: 'fa-rupee-sign', label: 'Fee Collection' },
      { id: 'receipts', icon: 'fa-receipt', label: 'Receipts' },
    ];
  } else if (user.role === 'accounting') {
    navItems = [
      { id: 'acc-dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
      { id: 'acc-fees', icon: 'fa-rupee-sign', label: 'Fee Collection' },
      { id: 'acc-payroll', icon: 'fa-money-check-alt', label: 'Staff Payroll' },
      { id: 'acc-purchase', icon: 'fa-shopping-cart', label: 'Purchase Orders' },
      { id: 'acc-expenses', icon: 'fa-calculator', label: 'Expenses' },
    ];
  } else if (user.role === 'superadmin' || user.role === 'subadmin') {
    const annBadge = Seen.count('ann', user.id, DB.getAnnouncements(''), a => a.date);
    const evtBadge = Seen.count('evt', user.id, data.events || [], e => e.createdAt || e.date);
    const msgBadge = (data.messages || []).filter(m => m.to === user.id && !m.read).length;
    const galBadge = Seen.count('gal', user.id, data.gallery || [], g => g.createdAt || g.date);
    navItems = [
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
      { id: 'students', icon: 'fa-user-graduate', label: 'Students' },
      { id: 'report-card', icon: 'fa-clipboard-list', label: 'Report Card' },
      { id: 'classes', icon: 'fa-school', label: 'Classes' },
      { id: 'attendance', icon: 'fa-calendar-check', label: 'Attendance' },
      { id: 'grades', icon: 'fa-star', label: 'Grades' },
      { id: 'growth', icon: 'fa-chart-line', label: 'Growth' },
      { id: 'activities', icon: 'fa-running', label: 'Activities' },
      { id: 'syllabus', icon: 'fa-book-open', label: 'Syllabus' },
      { id: 'leaves', icon: 'fa-calendar-times', label: 'Leaves', badge: data.leaves.filter(l => l.status === 'pending').length || 0 },
      { id: 'announcements', icon: 'fa-bullhorn', label: 'Announcements', badge: annBadge },
      { id: 'events', icon: 'fa-calendar-alt', label: 'Events', badge: evtBadge },
      { id: 'messages', icon: 'fa-comment-dots', label: 'Messages', badge: msgBadge },
      { id: 'gallery', icon: 'fa-images', label: 'Gallery', badge: galBadge },
    ];

    // Management tab only for superadmin (not impersonated)
    if (user.role === 'superadmin' && !isImp) {
      const pendingStaffLeaves = (DB.getStaffLeaves(null) || []).filter(l => l.status === 'Pending').length;
      // Update leaves badge to include staff leave count
      const leavesNavItem = navItems.find(n => n.id === 'leaves');
      if (leavesNavItem) leavesNavItem.badge = (data.leaves.filter(l => l.status === 'pending').length + pendingStaffLeaves) || 0;
      navItems.push({ id: 'teachers', icon: 'fa-chalkboard-teacher', label: 'Teachers', divider: true, dividerLabel: 'HR' });
      navItems.push({ id: 'management', icon: 'fa-cogs', label: 'Management' });
      navItems.push({ id: 'my-profile', icon: 'fa-user-circle', label: 'My Profile', divider: true, dividerLabel: 'Admin' });
      navItems.push({ id: 'school-settings', icon: 'fa-school', label: 'School Settings' });
    }

    // Filter based on subadmin permissions
    if (user.role === 'subadmin') {
      const perms = user.permissions || {};
      navItems = navItems.filter(n => {
        const permMap = { students: 'students', attendance: 'attendance', grades: 'grades', growth: 'growth', activities: 'activities', syllabus: 'syllabus', announcements: 'announcements', leaves: 'leaves' };
        if (permMap[n.id] !== undefined) return perms[permMap[n.id]];
        return true; // dashboard, classes, messages always allowed
      });
      // Self-account section — always visible to teachers
      const pendingOwnLeaves = (DB.getStaffLeaves(user.id) || []).filter(l => l.status === 'Pending').length;
      const pendingDocReqs = (DB.getHRDocumentRequests(user.id) || []).filter(r => r.status === 'Fulfilled').length;
      const myResignation = (DB.getResignationRecords(user.id) || [])[0];
      navItems.push({ id: 'teacher-profile', icon: 'fa-id-badge', label: 'My Profile', divider: true, dividerLabel: 'My Account' });
      navItems.push({ id: 'teacher-attendance', icon: 'fa-fingerprint', label: 'My Attendance' });
      navItems.push({ id: 'teacher-leaves', icon: 'fa-umbrella-beach', label: 'My Leaves', badge: pendingOwnLeaves });
      navItems.push({ id: 'teacher-salary', icon: 'fa-money-check-alt', label: 'Salary & Payroll' });
      navItems.push({ id: 'teacher-documents', icon: 'fa-folder-open', label: 'My Documents', badge: pendingDocReqs || 0 });
      if (myResignation || true) {
        navItems.push({ id: 'teacher-resignation', icon: 'fa-sign-out-alt', label: 'Resignation' });
      }
    }
  } else {
    // parent — compute notification badges
    const pChildren = DB.getStudentsByParent(user.id);
    const pPendingLeaves = pChildren.reduce((sum, c) => sum + DB.getLeaves(c.id).filter(l => l.status === 'pending').length, 0);
    const pAllAnns = pChildren.reduce((arr, c) => { DB.getAnnouncements(c.classId, 'parent').forEach(a => { if (!arr.find(x => x.id === a.id)) arr.push(a); }); return arr; }, []);
    const pAnnBadge = Seen.count('ann', user.id, pAllAnns, a => a.date);
    const pEvtBadge = Seen.count('evt', user.id, data.events || [], e => e.createdAt || e.date);
    const pUnreadMsgs = (data.messages || []).filter(m => m.to === user.id && !m.read).length;
    const pGalBadge = Seen.count('gal', user.id, data.gallery || [], g => g.createdAt || g.date);

    navItems = [
      { id: 'parent-home', icon: 'fa-home', label: 'Home' },
      { id: 'parent-reports', icon: 'fa-file-alt', label: 'Report Cards' },
      { id: 'parent-attendance', icon: 'fa-calendar-check', label: 'Attendance' },
      { id: 'parent-growth', icon: 'fa-chart-line', label: 'Growth' },
      { id: 'parent-activities', icon: 'fa-running', label: 'Activities' },
      { id: 'parent-syllabus', icon: 'fa-book-open', label: 'Syllabus' },
      { id: 'parent-leaves', icon: 'fa-calendar-times', label: 'Apply Leave', badge: pPendingLeaves },
      { id: 'parent-announcements', icon: 'fa-bullhorn', label: 'Announcements', badge: pAnnBadge },
      { id: 'parent-events', icon: 'fa-calendar-alt', label: 'Events', badge: pEvtBadge },
      { id: 'parent-messages', icon: 'fa-comment-dots', label: 'Messages', badge: pUnreadMsgs },
      { id: 'parent-gallery', icon: 'fa-images', label: 'Gallery', badge: pGalBadge },
      { id: 'parent-review', icon: 'fa-star', label: 'Write a Review' },
    ];
  }

  const navHtml = navItems.map(n => `
    ${n.divider ? `<div class="nav-section-title" style="margin-top:8px">${n.dividerLabel || 'Admin'}</div>` : ''}
    <div class="nav-item ${activeTab === n.id ? 'active' : ''}" onclick="navigate('${n.id}')">
      <span class="icon"><i class="fas ${n.icon}"></i></span>
      ${n.label}
      ${n.badge ? `<span class="badge">${n.badge}</span>` : ''}
    </div>`).join('');

  const roleLabel = isImp ? `Viewing as Sub Admin` : user.role === 'superadmin' ? 'Super Admin' : user.role === 'admission' ? 'Admission Admin' : user.role === 'accounting' ? 'Accounting Admin' : user.role === 'subadmin' ? 'Class Teacher' : 'Parent';
  const roleColor = user.role === 'superadmin' ? '#0F2050' : user.role === 'admission' ? '#C4893A' : user.role === 'accounting' ? '#8b5cf6' : user.role === 'subadmin' ? '#10b981' : '#E8B020';

  document.getElementById('app').innerHTML = `
    <!-- Sidebar -->
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div style="display:flex;align-items:center;gap:10px">
          <img src="${data.meta.schoolLogo || '/static/logo.png'}" alt="School Logo" style="width:52px;height:52px;border-radius:50%;border:2px solid rgba(196,137,58,0.5);background:#fff;object-fit:contain;flex-shrink:0;"/>
          <div>
            <h1 style="font-size:15px;font-weight:900;color:#fff;margin:0;line-height:1.2">SuperKids India</h1>
            <p style="margin:0;font-size:10px;color:#90C4E0">Preschool</p>
          </div>
        </div>
      </div>

      ${isImp ? `
      <div class="impersonate-bar">
        <i class="fas fa-eye"></i>
        Viewing: ${user.name}
        <button class="btn btn-xs" style="background:#fff;color:#0F1E3D;margin-left:auto" onclick="exitImpersonate()">
          <i class="fas fa-sign-out-alt"></i> Exit
        </button>
      </div>` : ''}

      <div class="sidebar-user" ${user.role === 'superadmin' && !isImp ? 'onclick="navigate(\'my-profile\')" style="cursor:pointer" title="Edit Profile"' : ''}>
        ${avatarHtml(user.name, user.avatar)}
        <div class="info">
          <div class="name">${user.name}</div>
          <div class="role" style="color:${roleColor}">${roleLabel}</div>
        </div>
        ${user.role === 'superadmin' && !isImp ? '<i class="fas fa-edit" style="margin-left:auto;font-size:11px;color:#90C4E0"></i>' : ''}
      </div>

      <div style="flex:1">
        <div class="nav-section-title">Navigation</div>
        ${navHtml}
      </div>

      <div class="sidebar-footer">
        <button class="btn btn-secondary" style="width:100%;justify-content:center" onclick="handleLogout()">
          <i class="fas fa-sign-out-alt"></i>
          ${isImp ? 'Exit View' : 'Logout'}
        </button>
      </div>
    </nav>

    <!-- Main -->
    <div class="main-wrapper">
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn btn-secondary btn-sm" onclick="toggleSidebar()" style="margin-right:12px" id="menu-toggle">
            <i class="fas fa-bars"></i>
          </button>
          <div>
            <h2 style="margin:0">${pageTitle}</h2>
            ${breadcrumb ? `<div class="breadcrumb">${breadcrumb}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          ${isImp ? `<span class="badge badge-yellow"><i class="fas fa-user-secret mr-1"></i> Impersonating</span>` : ''}
          <button id="pwa-install-btn" onclick="installPWA()" class="btn btn-primary btn-sm" style="display:none;gap:6px" title="Install app on your device">
            <i class="fas fa-download"></i><span class="topbar-username">Install App</span>
          </button>
          <div class="topbar-school-info" style="display:flex;align-items:center;gap:8px">
            <img src="${data.meta.schoolLogo || '/static/logo.png'}" alt="Logo" style="width:36px;height:36px;border-radius:50%;border:1px solid #DCE1EF;background:#f8fafc;object-fit:contain;"/>
            <span style="font-size:13px;color:#6B7A9D;font-weight:600">${data.meta.schoolName}</span>
          </div>
          <div class="topbar-divider" style="width:1px;height:20px;background:#DCE1EF"></div>
          <span class="topbar-username" style="font-size:13px;color:#6B7A9D">${user.name}</span>
          ${avatarHtml(user.name, user.avatar)}
        </div>
      </div>

      ${isImp ? `
      <div class="imp-banner">
        <span><i class="fas fa-user-secret"></i> You are viewing ${user.name}'s account (${user.assignedClass ? (DB.getClass(user.assignedClass) || {}).name : 'No class'})</span>
        <button class="btn btn-xs" style="background:rgba(0,0,0,0.15);color:#0F1E3D" onclick="exitImpersonate()">
          <i class="fas fa-sign-out-alt"></i> Return to Super Admin
        </button>
      </div>` : ''}

      <div class="page-content">
        ${contentHtml}
      </div>
    </div>`;

}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isOpen = sidebar.classList.toggle('open');
  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.onclick = () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); };
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('active', isOpen);
}

function exitImpersonate() {
  Session.logout(); // Returns to superadmin (returns false)
  navigate('dashboard');
}

function handleLogout() {
  _removeBackGuard();
  const fullyOut = Session.logout();
  if (fullyOut) {
    var token = localStorage.getItem('sk_session_token');
    if (token) {
      fetch('/api/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } }).catch(function() {});
      localStorage.removeItem('sk_session_token');
    }
    renderLogin();
  } else {
    navigate('dashboard');
  }
}

// ---- Router ----
const ROUTES = {};

function registerRoute(id, fn) { ROUTES[id] = fn; }

function navigate(tab) {
  const user = Session.current();
  if (!user) { renderLogin(); return; }
  const fn = ROUTES[tab];
  if (fn) fn();
  else { showToast(`Page not found: ${tab}`, 'warning'); }
}

// ---- Login Screen ----
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-bg">
      <div class="login-orb" style="width:360px;height:360px;background:radial-gradient(circle,rgba(26,166,202,0.2) 0%,transparent 70%);top:5%;right:5%;animation-delay:-3s"></div>
      <div class="login-orb" style="width:220px;height:220px;background:radial-gradient(circle,rgba(196,137,58,0.18) 0%,transparent 70%);bottom:15%;left:10%;animation-delay:-6s"></div>
      <div class="login-orb" style="width:160px;height:160px;background:radial-gradient(circle,rgba(232,176,32,0.15) 0%,transparent 70%);top:45%;left:3%;animation-delay:-1s"></div>

      <div class="login-card">

        <!-- Logo & Branding -->
        <div style="text-align:center;margin-bottom:36px">
          <div style="position:relative;display:inline-block;margin-bottom:18px">
            <img src="/static/logo.png" alt="SuperKids Logo"
              style="width:110px;height:110px;border-radius:50%;object-fit:contain;border:3px solid rgba(196,137,58,0.6);box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 0 6px rgba(26,166,202,0.15);display:block;margin:0 auto;background:#fff"/>
            <div style="position:absolute;bottom:2px;right:2px;width:20px;height:20px;background:#10b981;border-radius:50%;border:2px solid #0F2050;display:flex;align-items:center;justify-content:center">
              <i class="fas fa-check" style="font-size:7px;color:#fff"></i>
            </div>
          </div>
          <h1 style="font-size:22px;font-weight:900;color:#fff;margin:0 0 6px;letter-spacing:-0.3px">SuperKids India Preschool</h1>
          <p style="color:rgba(255,255,255,0.45);font-size:12px;margin:0;letter-spacing:0.5px;text-transform:uppercase">School Management Portal</p>
        </div>

        <!-- Welcome text -->
        <div style="text-align:center;margin-bottom:28px">
          <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0">Welcome back! Please sign in to continue.</p>
        </div>

        <!-- Username -->
        <div style="margin-bottom:18px">
          <label style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.55);display:block;margin-bottom:8px;letter-spacing:0.5px;text-transform:uppercase">
            Username
          </label>
          <div style="position:relative">
            <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.35);font-size:14px">
              <i class="fas fa-user"></i>
            </span>
            <input id="login-user" placeholder="Enter your username" type="text"
              style="padding-left:42px;padding-right:16px;width:100%;box-sizing:border-box"/>
          </div>
        </div>

        <!-- Password -->
        <div style="margin-bottom:24px">
          <label style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.55);display:block;margin-bottom:8px;letter-spacing:0.5px;text-transform:uppercase">
            Password
          </label>
          <div style="position:relative">
            <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.35);font-size:14px">
              <i class="fas fa-lock"></i>
            </span>
            <input id="login-pass" placeholder="Enter your password" type="password"
              style="padding-left:42px;padding-right:48px;width:100%;box-sizing:border-box"/>
            <button onclick="toggleLoginPassword()" id="toggle-pass-btn"
              style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(255,255,255,0.35);cursor:pointer;font-size:14px;padding:4px;line-height:1">
              <i class="fas fa-eye" id="pass-eye-icon"></i>
            </button>
          </div>
        </div>

        <!-- Error -->
        <div id="login-err" style="display:none;align-items:center;gap:8px;color:#fca5a5;font-size:13px;margin-bottom:16px;padding:10px 14px;background:rgba(239,68,68,0.12);border-radius:10px;border:1px solid rgba(239,68,68,0.25)">
          <i class="fas fa-exclamation-circle" style="flex-shrink:0"></i>
          <span id="login-err-text"></span>
        </div>

        <!-- Sign In Button -->
        <button onclick="doLogin()" id="login-btn"
          style="width:100%;padding:15px;border-radius:12px;border:none;background:linear-gradient(135deg,#0F2050 0%,#1AA6CA 100%);color:#fff;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 8px 28px rgba(15,32,80,0.35);transition:transform 0.15s,box-shadow 0.15s;letter-spacing:0.3px"
          onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 14px 36px rgba(15,32,80,0.5)'"
          onmouseleave="this.style.transform='translateY(0)';this.style.boxShadow='0 8px 28px rgba(15,32,80,0.35)'">
          <i class="fas fa-sign-in-alt"></i> Sign In
        </button>

        <!-- Forgot Password -->
        <div style="text-align:center;margin-top:16px">
          <button onclick="renderForgotPassword()"
            style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:13px;cursor:pointer;text-decoration:underline;padding:4px 8px;transition:color 0.15s"
            onmouseenter="this.style.color='rgba(255,255,255,0.85)'"
            onmouseleave="this.style.color='rgba(255,255,255,0.5)'">
            Forgot Password?
          </button>
        </div>

        <p style="text-align:center;margin-top:20px;font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:0.3px">
          © ${new Date().getFullYear()} SuperKids India Preschool
        </p>
      </div>
    </div>`;

  document.getElementById('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

function toggleLoginPassword() {
  const input = document.getElementById('login-pass');
  const icon  = document.getElementById('pass-eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}


// ---- Back-button guard ----
// Prevents the browser/mobile back button from leaving the portal while logged in.
// Strategy: push a sentinel history entry on login; on every popstate while logged in,
// push it back so the history stack never unwinds past the portal.
function _backGuardHandler() {
  if (Session.current()) {
    history.pushState({ portalGuard: true }, '', window.location.href);
  }
}
function _setupBackGuard() {
  history.pushState({ portalGuard: true }, '', window.location.href);
  window.addEventListener('popstate', _backGuardHandler);
}
function _removeBackGuard() {
  window.removeEventListener('popstate', _backGuardHandler);
}

async function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value.trim();
  const err = document.getElementById('login-err');
  const errText = document.getElementById('login-err-text');
  if (!u || !p) { err.style.display = 'flex'; errText.textContent = 'Please enter username and password.'; return; }
  const btn = document.getElementById('login-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…'; }
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      err.style.display = 'flex';
      errText.textContent = json.error || 'Invalid username or password.';
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In'; }
      return;
    }
    err.style.display = 'none';
    localStorage.setItem('sk_session_token', json.token);
    Session.setCurrentUser(json.user);
    DB.log(json.user.id, 'LOGIN', 'User logged in as ' + json.user.role);
    _setupBackGuard();
    if (json.user.role === 'parent') navigate('parent-home');
    else if (json.user.role === 'admission') navigate('admission-dashboard');
    else if (json.user.role === 'accounting') navigate('acc-dashboard');
    else navigate('dashboard');
  } catch (e) {
    err.style.display = 'flex';
    errText.textContent = 'Connection error. Please try again.';
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In'; }
  }
}

// ---- Forgot Password (OTP flow) ----
var _fpEmail = '';
var _fpResendTimer = null;

function _maskEmail(email) {
  var parts = email.split('@');
  var name = parts[0] || '';
  var domain = parts[1] || '';
  return name.slice(0, 2) + '***@' + domain;
}

function renderForgotPassword() {
  _fpEmail = '';
  clearInterval(_fpResendTimer);
  document.getElementById('app').innerHTML =
    '<div class="login-bg">' +
    '<div class="login-orb" style="width:360px;height:360px;background:radial-gradient(circle,rgba(26,166,202,0.2) 0%,transparent 70%);top:5%;right:5%;animation-delay:-3s"></div>' +
    '<div class="login-orb" style="width:220px;height:220px;background:radial-gradient(circle,rgba(196,137,58,0.18) 0%,transparent 70%);bottom:15%;left:10%;animation-delay:-6s"></div>' +
    '<div class="login-card">' +
      '<div style="text-align:center;margin-bottom:28px">' +
        '<img src="/static/logo.png" alt="SuperKids Logo" style="width:72px;height:72px;border-radius:50%;object-fit:contain;border:2px solid rgba(196,137,58,0.5);margin-bottom:14px"/>' +
        '<h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 6px">Forgot Password?</h2>' +
        '<p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0">Enter your registered email to receive a one-time password.</p>' +
      '</div>' +
      '<div style="margin-bottom:20px">' +
        '<label style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.55);display:block;margin-bottom:8px;letter-spacing:0.5px;text-transform:uppercase">Email Address</label>' +
        '<div style="position:relative">' +
          '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.35);font-size:14px"><i class="fas fa-envelope"></i></span>' +
          '<input id="fp-email" type="email" placeholder="Enter your registered email" style="padding-left:42px;padding-right:16px;width:100%;box-sizing:border-box"/>' +
        '</div>' +
      '</div>' +
      '<div id="fp-msg" style="display:none;margin-bottom:16px"></div>' +
      '<button onclick="doSendOtp()" id="fp-btn" style="width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#0F2050 0%,#1AA6CA 100%);color:#fff;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 8px 28px rgba(15,32,80,0.35)">' +
        '<i class="fas fa-paper-plane"></i> Send OTP' +
      '</button>' +
      '<div style="text-align:center;margin-top:16px">' +
        '<button onclick="renderLogin()" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:13px;cursor:pointer;text-decoration:underline;padding:4px 8px" onmouseenter="this.style.color=\'rgba(255,255,255,0.85)\'" onmouseleave="this.style.color=\'rgba(255,255,255,0.5)\'">← Back to Login</button>' +
      '</div>' +
    '</div></div>';
  document.getElementById('fp-email').addEventListener('keydown', function(e) { if (e.key === 'Enter') doSendOtp(); });
}

function _fpMsg(text, success) {
  var el = document.getElementById('fp-msg');
  if (!el) return;
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.gap = '8px';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '10px';
  el.style.fontSize = '13px';
  if (success) {
    el.style.background = 'rgba(16,185,129,0.15)';
    el.style.border = '1px solid rgba(16,185,129,0.35)';
    el.style.color = '#6ee7b7';
  } else {
    el.style.background = 'rgba(239,68,68,0.12)';
    el.style.border = '1px solid rgba(239,68,68,0.25)';
    el.style.color = '#fca5a5';
  }
  el.innerHTML = '<i class="fas ' + (success ? 'fa-check-circle' : 'fa-exclamation-circle') + '" style="flex-shrink:0"></i><span>' + text + '</span>';
}

function doSendOtp() {
  var email = (document.getElementById('fp-email') || {}).value || '';
  if (!email.trim()) { _fpMsg('Please enter your email address.', false); return; }
  _fpEmail = email.trim();
  var btn = document.getElementById('fp-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...'; }
  fetch('/api/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: _fpEmail })
  })
  .then(function(r) { return r.json(); })
  .then(function(r) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP'; }
    if (r.notFound) { _fpMsg('No account found with that email address. Please contact the school.', false); return; }
    if (r.rateLimited) { _fpMsg('Please wait ' + (r.retryAfter || 60) + ' seconds before requesting a new OTP.', false); return; }
    if (r.noEmail) { _fpMsg('Email service not configured. Please contact the school administrator.', false); return; }
    if (r.sent) { renderOtpStep(); return; }
    if (r.error) { _fpMsg('Error: ' + r.error, false); return; }
    _fpMsg('Something went wrong. Please try again.', false);
  })
  .catch(function() {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP'; }
    _fpMsg('Network error. Please try again.', false);
  });
}

function renderOtpStep() {
  clearInterval(_fpResendTimer);
  var masked = _maskEmail(_fpEmail);
  document.getElementById('app').innerHTML =
    '<div class="login-bg">' +
    '<div class="login-orb" style="width:360px;height:360px;background:radial-gradient(circle,rgba(26,166,202,0.2) 0%,transparent 70%);top:5%;right:5%;animation-delay:-3s"></div>' +
    '<div class="login-orb" style="width:220px;height:220px;background:radial-gradient(circle,rgba(196,137,58,0.18) 0%,transparent 70%);bottom:15%;left:10%;animation-delay:-6s"></div>' +
    '<div class="login-card">' +
      '<div style="text-align:center;margin-bottom:28px">' +
        '<div style="width:64px;height:64px;border-radius:50%;background:rgba(196,137,58,0.15);border:2px solid rgba(196,137,58,0.5);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:26px"><i class="fas fa-shield-alt" style="color:#C4893A"></i></div>' +
        '<h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 6px">Enter OTP</h2>' +
        '<p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0">A 6-digit OTP was sent to<br><strong style="color:rgba(255,255,255,0.8)">' + masked + '</strong></p>' +
      '</div>' +
      '<div style="margin-bottom:20px">' +
        '<label style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.55);display:block;margin-bottom:8px;letter-spacing:0.5px;text-transform:uppercase">6-Digit OTP</label>' +
        '<div style="position:relative">' +
          '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.35);font-size:14px"><i class="fas fa-key"></i></span>' +
          '<input id="fp-otp" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="Enter OTP" style="padding-left:42px;padding-right:16px;width:100%;box-sizing:border-box;letter-spacing:6px;font-size:20px;font-weight:700;text-align:center"/>' +
        '</div>' +
      '</div>' +
      '<div id="fp-otp-msg" style="display:none;margin-bottom:16px"></div>' +
      '<button onclick="doVerifyOtp()" id="fp-verify-btn" style="width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#0F2050 0%,#1AA6CA 100%);color:#fff;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 8px 28px rgba(15,32,80,0.35)">' +
        '<i class="fas fa-unlock-alt"></i> Verify OTP' +
      '</button>' +
      '<div style="text-align:center;margin-top:14px">' +
        '<span style="color:rgba(255,255,255,0.4);font-size:13px">Didn\'t receive it? </span>' +
        '<button id="fp-resend-btn" onclick="doResendOtp()" disabled style="background:none;border:none;color:rgba(255,255,255,0.35);font-size:13px;cursor:default;padding:0;font-weight:600">Resend OTP (<span id="fp-countdown">60</span>s)</button>' +
      '</div>' +
      '<div style="text-align:center;margin-top:8px">' +
        '<button onclick="renderForgotPassword()" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:12px;cursor:pointer;text-decoration:underline;padding:4px 8px">← Change email</button>' +
      '</div>' +
    '</div></div>';

  var otp = document.getElementById('fp-otp');
  otp.addEventListener('keydown', function(e) { if (e.key === 'Enter') doVerifyOtp(); });
  otp.addEventListener('input', function() {
    var msg = document.getElementById('fp-otp-msg');
    if (msg) msg.style.display = 'none';
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
  });
  otp.focus();

  var secs = 60;
  _fpResendTimer = setInterval(function() {
    secs--;
    var cd = document.getElementById('fp-countdown');
    var rb = document.getElementById('fp-resend-btn');
    if (!cd || !rb) { clearInterval(_fpResendTimer); return; }
    if (secs <= 0) {
      clearInterval(_fpResendTimer);
      rb.disabled = false;
      rb.style.color = '#1AA6CA';
      rb.style.cursor = 'pointer';
      rb.innerHTML = 'Resend OTP';
    } else {
      cd.textContent = secs;
    }
  }, 1000);
}

function _fpOtpMsg(text, success) {
  var el = document.getElementById('fp-otp-msg');
  if (!el) return;
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.gap = '8px';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '10px';
  el.style.fontSize = '13px';
  if (success) {
    el.style.background = 'rgba(16,185,129,0.15)';
    el.style.border = '1px solid rgba(16,185,129,0.35)';
    el.style.color = '#6ee7b7';
  } else {
    el.style.background = 'rgba(239,68,68,0.12)';
    el.style.border = '1px solid rgba(239,68,68,0.25)';
    el.style.color = '#fca5a5';
  }
  el.innerHTML = '<i class="fas ' + (success ? 'fa-check-circle' : 'fa-exclamation-circle') + '" style="flex-shrink:0"></i><span>' + text + '</span>';
}

function doResendOtp() {
  var rb = document.getElementById('fp-resend-btn');
  if (rb) { rb.disabled = true; rb.style.color = 'rgba(255,255,255,0.35)'; rb.style.cursor = 'default'; rb.innerHTML = 'Resend OTP (<span id="fp-countdown">60</span>s)'; }
  fetch('/api/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: _fpEmail })
  })
  .then(function(r) { return r.json(); })
  .then(function(r) {
    if (r.sent) {
      _fpOtpMsg('New OTP sent to ' + _maskEmail(_fpEmail), true);
      var secs = 60;
      _fpResendTimer = setInterval(function() {
        secs--;
        var cd = document.getElementById('fp-countdown');
        var rb2 = document.getElementById('fp-resend-btn');
        if (!cd || !rb2) { clearInterval(_fpResendTimer); return; }
        if (secs <= 0) {
          clearInterval(_fpResendTimer);
          rb2.disabled = false;
          rb2.style.color = '#1AA6CA';
          rb2.style.cursor = 'pointer';
          rb2.innerHTML = 'Resend OTP';
        } else { cd.textContent = secs; }
      }, 1000);
    } else {
      _fpOtpMsg('Failed to resend. Please try again.', false);
      if (rb) { rb.disabled = false; rb.style.color = '#1AA6CA'; rb.style.cursor = 'pointer'; rb.innerHTML = 'Resend OTP'; }
    }
  })
  .catch(function() {
    _fpOtpMsg('Network error. Please try again.', false);
    if (rb) { rb.disabled = false; rb.style.color = '#1AA6CA'; rb.style.cursor = 'pointer'; rb.innerHTML = 'Resend OTP'; }
  });
}

function doVerifyOtp() {
  var otp = (document.getElementById('fp-otp') || {}).value || '';
  if (!otp || otp.replace(/\D/g,'').length !== 6) { _fpOtpMsg('Please enter the 6-digit OTP.', false); return; }
  var btn = document.getElementById('fp-verify-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; }
  fetch('/api/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: _fpEmail, otp: otp.trim() })
  })
  .then(function(r) { return r.json(); })
  .then(function(r) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-unlock-alt"></i> Verify OTP'; }
    if (r.locked) { _fpOtpMsg('Too many incorrect attempts. Please request a new OTP.', false); return; }
    if (r.invalid) { _fpOtpMsg('Incorrect or expired OTP. Please try again.', false); return; }
    if (r.error) { _fpOtpMsg('Error: ' + r.error, false); return; }
    if (r.verified) {
      clearInterval(_fpResendTimer);
      document.getElementById('app').innerHTML =
        '<div class="login-bg">' +
        '<div class="login-orb" style="width:360px;height:360px;background:radial-gradient(circle,rgba(26,166,202,0.2) 0%,transparent 70%);top:5%;right:5%;animation-delay:-3s"></div>' +
        '<div class="login-card">' +
          '<div style="text-align:center;margin-bottom:20px">' +
            '<div style="width:52px;height:52px;border-radius:50%;background:rgba(16,185,129,0.15);border:2px solid rgba(16,185,129,0.4);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:22px"><i class="fas fa-check-circle" style="color:#10b981"></i></div>' +
            '<h2 style="font-size:18px;font-weight:800;color:#fff;margin:0 0 4px">Identity Verified</h2>' +
            '<p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0">Your login credentials are shown below.</p>' +
          '</div>' +
          '<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:18px;margin-bottom:20px">' +
            '<div style="font-size:11px;font-weight:700;color:#C4893A;letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px"><i class="fas fa-key" style="margin-right:6px"></i>Your Login Credentials</div>' +
            '<table style="width:100%;border-collapse:collapse">' +
              '<tr><td style="padding:7px 6px;color:rgba(255,255,255,0.45);font-size:11px;text-transform:uppercase;letter-spacing:.05em;width:90px">Name</td><td style="padding:7px 6px;font-weight:700;color:#fff;word-break:break-word">' + (r.name||'') + '</td></tr>' +
              '<tr><td style="padding:7px 6px;color:rgba(255,255,255,0.45);font-size:11px;text-transform:uppercase;letter-spacing:.05em">Username</td><td style="padding:7px 6px;font-weight:700;color:#fff;letter-spacing:.05em">' + (r.username||'') + '</td></tr>' +
              '<tr><td style="padding:7px 6px;color:rgba(255,255,255,0.45);font-size:11px;text-transform:uppercase;letter-spacing:.05em">Password</td><td style="padding:7px 6px;font-weight:700;color:#E8B020;letter-spacing:.05em">' + (r.password||'') + '</td></tr>' +
            '</table>' +
          '</div>' +
          '<div style="font-size:11px;color:rgba(255,255,255,0.35);text-align:center;margin-bottom:16px">Keep your credentials safe. Do not share them with anyone.</div>' +
          '<button onclick="renderLogin()" style="width:100%;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,#0F2050 0%,#1AA6CA 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">' +
            '<i class="fas fa-sign-in-alt"></i> Back to Login' +
          '</button>' +
        '</div></div>';
    }
  })
  .catch(function() {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-unlock-alt"></i> Verify OTP'; }
    _fpOtpMsg('Network error. Please try again.', false);
  });
}

// ---- Init ----
window.addEventListener('DOMContentLoaded', () => {
  // Show loading while fetching data from server
  document.getElementById('app').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;background:#0F2050"><img src="/static/logo.png" style="width:80px;height:80px;border-radius:50%;object-fit:contain"><div style="color:#90C4E0;font-size:14px;font-weight:600">Loading SuperKids Portal...</div></div>';

  DB.initFromServer().then(function() {
    var token = localStorage.getItem('sk_session_token');
    if (token) {
      fetch('/api/session', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(function(r) { return r.json(); })
        .then(function(json) {
          if (json && json.ok && json.user) {
            Session.setCurrentUser(json.user);
            if (json.user.role === 'parent') navigate('parent-home');
            else if (json.user.role === 'admission') navigate('admission-dashboard');
            else if (json.user.role === 'accounting') navigate('acc-dashboard');
            else navigate('dashboard');
          } else {
            localStorage.removeItem('sk_session_token');
            renderLogin();
          }
        })
        .catch(function() {
          localStorage.removeItem('sk_session_token');
          renderLogin();
        });
    } else {
      renderLogin();
    }
  });
});
