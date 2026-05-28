// ============================================================
// EduTrack - Management Panel (Super Admin Only)
// Tabs: Sub-Admins, Parents, Activity Log, School Settings
// ============================================================

let mgmtTab = 'subadmins';

function renderManagement() {
  const user = Session.current();
  if (user.role !== 'superadmin' || Session.isImpersonating()) {
    showToast('Access denied', 'error');
    navigate('dashboard');
    return;
  }

  const groups = [
    { label: 'People Management', color: '#0F2050', tabs: [
      { id: 'subadmins', label: 'Sub Admins', icon: 'fa-user-tie' },
      { id: 'adm-admins', label: 'Admission Admins', icon: 'fa-user-check' },
      { id: 'parents', label: 'Parents', icon: 'fa-users' },
      { id: 'team', label: 'Our Team', icon: 'fa-chalkboard-teacher' },
      { id: 'reviews', label: 'Reviews', icon: 'fa-star' },
    ]},
    { label: 'Academic & Finance', color: '#C4893A', tabs: [
      { id: 'academic', label: 'Academic Setup', icon: 'fa-graduation-cap' },
      { id: 'feeconfig', label: 'Fee Structure', icon: 'fa-rupee-sign' },
      { id: 'adm-mgmt', label: 'Admissions', icon: 'fa-user-check' },
      { id: 'receipts', label: 'Receipts', icon: 'fa-receipt' },
      { id: 'adm-reports', label: 'Reports', icon: 'fa-chart-bar' },
      { id: 'letterhead', label: 'Letter Head', icon: 'fa-file-alt' },
    ]},
    { label: 'System', color: '#1AA6CA', tabs: [
      { id: 'log', label: 'Activity Log', icon: 'fa-history' },
      { id: 'settings', label: 'School Settings', icon: 'fa-cog' },
    ]},
  ];

  const tabContent = {
    subadmins: renderSubAdminsTab(),
    'adm-admins': renderAdmAdminsTab(),
    parents: renderParentsTab(),
    team: renderTeamTab(),
    reviews: renderReviewsTab(),
    academic: renderAcademicTab(),
    feeconfig: renderFeeConfigTab(),
    'adm-mgmt': renderAdmissionsManagementTab(),
    receipts: renderReceiptsTab(),
    'adm-reports': renderAdmReportsTab(),
    letterhead: renderLetterheadTab(),
    log: renderActivityLogTab(),
    settings: renderSettingsTab()
  };

  const groupHtml = groups.map(function(g) {
    const tabs = g.tabs.map(function(t) {
      return '<button class="tab-btn ' + (mgmtTab===t.id?'active':'') + '" onclick="mgmtTab=\'' + t.id + '\';renderManagement()"><i class="fas ' + t.icon + '"></i> ' + t.label + '</button>';
    }).join('');
    return '<div style="margin-bottom:14px">' +
      '<div style="font-size:10px;font-weight:800;color:' + g.color + ';text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;display:flex;align-items:center;gap:8px">' +
        '<span style="display:inline-block;width:18px;height:2px;background:' + g.color + ';border-radius:2px"></span>' + g.label +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px">' + tabs + '</div>' +
    '</div>';
  }).join('<div style="height:1px;background:#EDF0F7;margin:4px 0"></div>');

  const content = `
    <div style="margin-bottom:20px;padding:14px 16px;background:#F8F9FB;border-radius:14px;border:1px solid #EDF0F7">
      ${groupHtml}
    </div>
    ${tabContent[mgmtTab] || ''}`;

  renderLayout('management', content, 'Management', 'Super Admin Only');
  if (mgmtTab === 'team') setTimeout(loadTeamMembers, 50);
  if (mgmtTab === 'reviews') setTimeout(loadReviews, 50);
  if (mgmtTab === 'academic') setTimeout(loadAcademicConfig, 50);
  if (mgmtTab === 'feeconfig') setTimeout(loadFeeConfig, 50);
  if (mgmtTab === 'adm-reports') setTimeout(loadAdmReports, 50);
  if (mgmtTab === 'letterhead') setTimeout(loadLetterheadConfig, 50);
  if (mgmtTab === 'adm-mgmt') setTimeout(loadAdmissionsManagement, 50);
  if (mgmtTab === 'receipts') setTimeout(loadReceiptsManagement, 50);
}

// ---- Sub-Admins Tab ----
function renderSubAdminsTab() {
  const data = DB.get();
  const subadmins = DB.getSubAdmins();

  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-user-tie" style="color:#1AA6CA"></i> Sub Admins / Teachers (${subadmins.length})</div>
        <button class="btn btn-primary" onclick="openAddSubAdminModal()"><i class="fas fa-plus"></i> Add Sub Admin</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Teacher</th><th>Username</th><th>Assigned Class</th><th>Status</th><th>Permissions</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${subadmins.map(sa => {
              const cls = DB.getClass(sa.assignedClass);
              const perms = sa.permissions || {};
              const permCount = Object.values(perms).filter(Boolean).length;
              return `<tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    ${avatarHtml(sa.name, sa.avatar)}
                    <div>
                      <div style="font-weight:600">${sa.name}</div>
                      <div class="text-muted">${sa.email}</div>
                    </div>
                  </div>
                </td>
                <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:6px">${sa.username}</code></td>
                <td>${cls ? `<span class="badge badge-blue">${cls.name}</span>` : '<span class="text-muted">None</span>'}</td>
                <td><span class="badge ${sa.active?'badge-green':'badge-red'}">${sa.active?'Active':'Inactive'}</span></td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <div class="progress-bar" style="width:80px"><div class="progress-fill" style="width:${Math.round(permCount/8*100)}%"></div></div>
                    <span style="font-size:12px;color:#6B7A9D">${permCount}/8</span>
                  </div>
                </td>
                <td>
                  <div style="display:flex;gap:4px;flex-wrap:wrap">
                    <button class="btn btn-xs btn-primary" title="Edit" onclick="openEditSubAdminModal('${sa.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-xs btn-warning" title="Permissions" onclick="openPermissionsModal('${sa.id}')"><i class="fas fa-key"></i></button>
                    <button class="btn btn-xs" style="${sa.active?'background:#FEF7E0;color:#92400e':'background:#d1fae5;color:#065f46'}" onclick="toggleSubAdminStatus('${sa.id}')">
                      <i class="fas ${sa.active?'fa-user-slash':'fa-user-check'}"></i>
                    </button>
                    <button class="btn btn-xs" style="background:#e0e7ff;color:#3730a3" title="Switch to account" onclick="impersonateSubAdmin('${sa.id}')">
                      <i class="fas fa-user-secret"></i>
                    </button>
                    <button class="btn btn-xs btn-whatsapp" title="WhatsApp" onclick="wa('${sa.phone}','Hello ${sa.name}')">
                      <i class="fab fa-whatsapp"></i>
                    </button>
                    ${Session.canDelete() ? `<button class="btn btn-xs btn-danger" title="Delete" onclick="deleteSubAdmin('${sa.id}')"><i class="fas fa-trash"></i></button>` : ''}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderAdmAdminsTab() {
  const admAdmins = DB.get().users.filter(function(u){ return u.role === 'admission' && !u.deleted; });
  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-user-check" style="color:#C4893A"></i> Admission Admins (${admAdmins.length})</div>
        <button class="btn btn-primary" onclick="openAddSubAdminModal('admission')"><i class="fas fa-plus"></i> Add Admission Admin</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${admAdmins.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#888;padding:24px">No Admission Admins found. Add one above.</td></tr>' :
              admAdmins.map(function(sa) {
                return `<tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      ${avatarHtml(sa.name, sa.avatar)}
                      <div style="font-weight:600">${sa.name}</div>
                    </div>
                  </td>
                  <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:6px">${sa.username}</code></td>
                  <td>${sa.email || '-'}</td>
                  <td>${sa.phone || '-'}</td>
                  <td><span class="badge ${sa.active?'badge-green':'badge-red'}">${sa.active?'Active':'Inactive'}</span></td>
                  <td>
                    <div style="display:flex;gap:4px;flex-wrap:wrap">
                      <button class="btn btn-xs btn-primary" title="Edit" onclick="openEditSubAdminModal('${sa.id}')"><i class="fas fa-edit"></i></button>
                      <button class="btn btn-xs" style="${sa.active?'background:#FEF7E0;color:#92400e':'background:#d1fae5;color:#065f46'}" onclick="toggleSubAdminStatus('${sa.id}')">
                        <i class="fas ${sa.active?'fa-user-slash':'fa-user-check'}"></i>
                      </button>
                      ${sa.phone ? `<button class="btn btn-xs btn-whatsapp" title="WhatsApp" onclick="wa('${sa.phone}','Hello ${sa.name}')"><i class="fab fa-whatsapp"></i></button>` : ''}
                      ${Session.canDelete() ? `<button class="btn btn-xs btn-danger" title="Delete" onclick="deleteSubAdmin('${sa.id}')"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                  </td>
                </tr>`;
              }).join('')
            }
          </tbody>
        </table>
      </div>
      <div style="padding:12px 16px;font-size:12px;color:#6B7A9D;border-top:1px solid #EDF0F7">
        <i class="fas fa-info-circle"></i> Admission Admins can manage the Admissions portal. They do NOT have access to the Management tab.
      </div>
    </div>`;
}

function openAddSubAdminModal(defaultRole) {
  const data = DB.get();
  const PERM_KEYS = ['students', 'attendance', 'grades', 'growth', 'activities', 'syllabus', 'announcements', 'leaves'];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header"><h2 class="modal-title">Add Staff Account</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Full Name *</label><input class="form-control" id="sa-name" placeholder="Teacher full name"/></div>
          <div class="form-group"><label class="form-label">Email *</label><input class="form-control" id="sa-email" type="email" placeholder="teacher@school.edu"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Username *</label><input class="form-control" id="sa-username" placeholder="e.g. jcarter"/></div>
          <div class="form-group"><label class="form-label">Password *</label><input class="form-control" id="sa-password" type="password" placeholder="Strong password"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="sa-phone" placeholder="+91-98000-00000"/></div>
          <div class="form-group">
            <label class="form-label">Staff Role</label>
            <select class="form-control" id="sa-role" onchange="document.getElementById('sa-class-row').style.display=this.value==='admission'?'none':'block'">
              <option value="subadmin" ${defaultRole==='admission'?'':'selected'}>Class Teacher / Sub Admin</option>
              <option value="admission" ${defaultRole==='admission'?'selected':''}>Admission Admin</option>
            </select>
          </div>
        </div>
        <div class="form-row" id="sa-class-row" style="display:${defaultRole==='admission'?'none':'flex'}">
          <div class="form-group"></div>
          <div class="form-group">
            <label class="form-label">Assign Class</label>
            <select class="form-control" id="sa-class">
              <option value="">None</option>
              ${data.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Avatar Color</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${['#1AA6CA','#10b981','#E8B020','#ef4444','#C4893A','#06b6d4','#84cc16','#f97316'].map(c => `
              <div onclick="document.getElementById('sa-avatar').value='${c}';this.parentElement.querySelectorAll('.av-opt').forEach(el=>el.style.outline='none');this.style.outline='3px solid #1e293b'" 
                   class="av-opt" style="width:32px;height:32px;border-radius:50%;background:${c};cursor:pointer"></div>`).join('')}
            <input type="hidden" id="sa-avatar" value="#1AA6CA"/>
          </div>
        </div>
        <hr class="divider"/>
        <div class="form-group">
          <label class="form-label">Permissions</label>
          <div class="perm-grid">
            ${PERM_KEYS.map(p => `
              <label class="perm-item">
                <input type="checkbox" id="perm-${p}" checked/>
                <span style="text-transform:capitalize">${p}</span>
              </label>`).join('')}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNewSubAdmin()"><i class="fas fa-save"></i> Create Account</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveNewSubAdmin() {
  const data = DB.get();
  const name = document.getElementById('sa-name').value.trim();
  const email = document.getElementById('sa-email').value.trim();
  const username = document.getElementById('sa-username').value.trim();
  const password = document.getElementById('sa-password').value.trim();

  if (!name || !email || !username || !password) { showToast('Please fill all required fields', 'error'); return; }
  if (data.users.find(u => u.username === username)) { showToast('Username already exists', 'error'); return; }

  const PERM_KEYS = ['students', 'attendance', 'grades', 'growth', 'activities', 'syllabus', 'announcements', 'leaves'];
  const permissions = {};
  PERM_KEYS.forEach(p => { permissions[p] = document.getElementById(`perm-${p}`) ? document.getElementById(`perm-${p}`).checked : true; });

  const classId = document.getElementById('sa-class').value || null;

  const selectedRole = (document.getElementById('sa-role') || {}).value || 'subadmin';
  const sa = {
    id: DB.genId('u'), role: selectedRole, name, email, username, password,
    phone: document.getElementById('sa-phone').value,
    avatar: document.getElementById('sa-avatar').value || '#1AA6CA',
    active: true, deleted: false,
    createdAt: new Date().toISOString().split('T')[0],
    assignedClass: classId, permissions
  };

  data.users.push(sa);

  // Update class teacher
  if (classId) {
    const cls = data.classes.find(c => c.id === classId);
    if (cls) cls.teacherId = sa.id;
  }

  DB.commit();
  DB.log(Session.current().id, 'CREATE_SUBADMIN', `Created ${name} (${username})`);
  document.querySelector('.modal-overlay').remove();
  showToast(`Sub Admin ${name} created!`, 'success');
  renderManagement();
}

function openEditSubAdminModal(saId) {
  const data = DB.get();
  const sa = data.users.find(u => u.id === saId);
  if (!sa) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header"><h2 class="modal-title">Edit Sub Admin</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Full Name</label><input class="form-control" id="esa-name" value="${sa.name}"/></div>
          <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="esa-email" type="email" value="${sa.email}"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="esa-phone" value="${sa.phone||''}"/></div>
          <div class="form-group">
            <label class="form-label">Assigned Class</label>
            <select class="form-control" id="esa-class">
              <option value="">None</option>
              ${data.classes.map(c => `<option value="${c.id}" ${sa.assignedClass===c.id?'selected':''}>${c.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group"><label class="form-label">New Password (leave blank to keep)</label><input class="form-control" id="esa-pass" type="password" placeholder="New password"/></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEditSubAdmin('${saId}')">Save</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveEditSubAdmin(saId) {
  const data = DB.get();
  const sa = data.users.find(u => u.id === saId);
  if (!sa) return;
  sa.name = document.getElementById('esa-name').value.trim() || sa.name;
  sa.email = document.getElementById('esa-email').value.trim() || sa.email;
  sa.phone = document.getElementById('esa-phone').value;
  const newPass = document.getElementById('esa-pass').value.trim();
  if (newPass) sa.password = newPass;
  sa.assignedClass = document.getElementById('esa-class').value || null;
  DB.commit();
  DB.log(Session.current().id, 'EDIT_SUBADMIN', `Updated ${sa.name}`);
  document.querySelector('.modal-overlay').remove();
  showToast('Sub admin updated!', 'success');
  renderManagement();
}

function openPermissionsModal(saId) {
  const data = DB.get();
  const sa = data.users.find(u => u.id === saId);
  if (!sa) return;
  const perms = sa.permissions || {};
  const PERM_KEYS = ['students', 'attendance', 'grades', 'growth', 'activities', 'syllabus', 'announcements', 'leaves'];
  const PERM_ICONS = {
    students: 'fa-user-graduate', attendance: 'fa-calendar-check', grades: 'fa-star',
    growth: 'fa-chart-line', activities: 'fa-running', syllabus: 'fa-book-open',
    announcements: 'fa-bullhorn', leaves: 'fa-calendar-times'
  };

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Permissions – ${sa.name}</h2>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div style="background:#FEF7E0;border-radius:10px;padding:12px;font-size:13px;color:#92400e;margin-bottom:16px">
          <i class="fas fa-info-circle"></i> Sub Admins cannot permanently delete records. Only Super Admin can delete data.
          Sub Admins do NOT have access to the Management tab.
        </div>
        <div class="perm-grid">
          ${PERM_KEYS.map(p => `
            <label class="perm-item">
              <input type="checkbox" id="ep-${p}" ${perms[p]?'checked':''}/>
              <i class="fas ${PERM_ICONS[p] || 'fa-check'}" style="color:#1AA6CA"></i>
              <span style="text-transform:capitalize">${p}</span>
            </label>`).join('')}
        </div>
        <div style="margin-top:16px;padding:12px;background:#f1f5f9;border-radius:10px;font-size:13px;color:#2A3B60">
          <strong>Always Allowed:</strong> Dashboard, Classes, Messages (view only)
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="savePermissions('${saId}')"><i class="fas fa-save"></i> Save Permissions</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function savePermissions(saId) {
  const data = DB.get();
  const sa = data.users.find(u => u.id === saId);
  if (!sa) return;
  const PERM_KEYS = ['students', 'attendance', 'grades', 'growth', 'activities', 'syllabus', 'announcements', 'leaves'];
  if (!sa.permissions) sa.permissions = {};
  PERM_KEYS.forEach(p => {
    const el = document.getElementById(`ep-${p}`);
    if (el) sa.permissions[p] = el.checked;
  });
  DB.commit();
  DB.log(Session.current().id, 'UPDATE_PERMISSIONS', `Updated permissions for ${sa.name}`);
  document.querySelector('.modal-overlay').remove();
  showToast('Permissions saved!', 'success');
  renderManagement();
}

function toggleSubAdminStatus(saId) {
  const data = DB.get();
  const sa = data.users.find(u => u.id === saId);
  if (!sa) return;
  sa.active = !sa.active;
  DB.commit();
  DB.log(Session.current().id, sa.active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', `${sa.active?'Activated':'Deactivated'} ${sa.name}`);
  showToast(`${sa.name} ${sa.active ? 'activated' : 'deactivated'}!`, 'success');
  renderManagement();
}

function impersonateSubAdmin(saId) {
  const success = Session.impersonate(saId);
  if (success) {
    showToast(`Switched to ${DB.getUser(saId).name}'s view`, 'warning');
    navigate('dashboard');
  } else {
    showToast('Cannot switch to this account', 'error');
  }
}

function deleteSubAdmin(saId) {
  if (!Session.canDelete()) return;
  const sa = DB.getUser(saId);
  confirmDialog(`Permanently delete Sub Admin "${sa.name}"?`, () => {
    const data = DB.get();
    const user = data.users.find(u => u.id === saId);
    if (user) user.deleted = true;
    // Unassign from class
    data.classes.forEach(c => { if (c.teacherId === saId) c.teacherId = null; });
    DB.commit();
    DB.log(Session.current().id, 'DELETE_USER', `Deleted ${sa.name}`);
    showToast('Sub Admin deleted', 'warning');
    renderManagement();
  });
}

// ---- Parents Tab ----
function renderParentsTab() {
  const data = DB.get();
  const parents = DB.getParents();

  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-users" style="color:#10b981"></i> Parent Accounts (${parents.length})</div>
        <button class="btn btn-primary" onclick="openAddParentModal()"><i class="fas fa-plus"></i> Add Parent + Child</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Parent</th><th>Username</th><th>Contact</th><th>Children</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${parents.map(p => {
              const children = DB.getStudentsByParent(p.id);
              return `<tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    ${avatarHtml(p.name, p.avatar)}
                    <div>
                      <div style="font-weight:600">${p.name}</div>
                      <div class="text-muted">${p.email}</div>
                    </div>
                  </div>
                </td>
                <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:6px">${p.username}</code></td>
                <td>
                  <div style="font-size:13px">${p.phone || '-'}</div>
                  ${p.phone ? `<button class="btn btn-xs btn-whatsapp" onclick="wa('${p.phone}','Hello ${p.name}')"><i class="fab fa-whatsapp"></i></button>` : ''}
                </td>
                <td>
                  <div style="display:flex;flex-wrap:wrap;gap:4px">
                    ${children.map(c => `<span class="badge badge-blue">${c.name}</span>`).join('')}
                    ${!children.length ? '<span class="text-muted">None linked</span>' : ''}
                  </div>
                </td>
                <td><span class="badge ${p.active?'badge-green':'badge-red'}">${p.active?'Active':'Inactive'}</span></td>
                <td>
                  <div style="display:flex;gap:4px;flex-wrap:wrap">
                    <button class="btn btn-xs btn-secondary" onclick="openEditParentModal('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-xs" style="${p.active?'background:#FEF7E0;color:#92400e':'background:#d1fae5;color:#065f46'}" onclick="toggleParentStatus('${p.id}')">
                      <i class="fas ${p.active?'fa-user-slash':'fa-user-check'}"></i>
                    </button>
                    <button class="btn btn-xs btn-primary" onclick="openLinkChildModal('${p.id}')"><i class="fas fa-user-plus"></i> Link Child</button>
                    ${Session.canDelete() ? `<button class="btn btn-xs btn-danger" onclick="deleteParent('${p.id}')"><i class="fas fa-trash"></i></button>` : ''}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function openAddParentModal() {
  const data = DB.get();
  const unlinkedStudents = data.students.filter(s => !s.deleted && !s.parentId);
  const allStudents = data.students.filter(s => !s.deleted);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header"><h2 class="modal-title">Add Parent Account</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Full Name *</label><input class="form-control" id="par-name" placeholder="Parent full name"/></div>
          <div class="form-group"><label class="form-label">Email *</label><input class="form-control" id="par-email" type="email" placeholder="parent@email.com"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Username *</label><input class="form-control" id="par-username" placeholder="e.g. rjohnson"/></div>
          <div class="form-group"><label class="form-label">Password *</label><input class="form-control" id="par-password" type="password" placeholder="Set password"/></div>
        </div>
        <div class="form-group"><label class="form-label">Phone (for WhatsApp)</label><input class="form-control" id="par-phone" placeholder="+1-555-0000"/></div>
        <hr class="divider"/>
        <div class="form-group">
          <label class="form-label">Link Children (check all that apply)</label>
          <div style="max-height:250px;overflow-y:auto;border:2px solid #DCE1EF;border-radius:10px;padding:12px">
            ${allStudents.length ? allStudents.map(s => {
              const cls = DB.getClass(s.classId);
              const existingParent = s.parentId ? DB.getUser(s.parentId) : null;
              return `
              <label style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;margin-bottom:4px;${existingParent?'opacity:0.6':''}">
                <input type="checkbox" name="par-child" value="${s.id}" style="width:16px;height:16px;accent-color:#1AA6CA" ${existingParent?'disabled title="Already has parent"':''}/>
                ${avatarHtml(s.name, '#1AA6CA')}
                <span style="flex:1">${s.name}</span>
                <span class="badge badge-blue">${cls ? cls.name : '-'}</span>
                ${existingParent ? `<span class="badge badge-yellow">Has parent: ${existingParent.name}</span>` : ''}
              </label>`;
            }).join('') : '<p class="text-muted">No students available. Add students first.</p>'}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNewParent()"><i class="fas fa-save"></i> Create Parent Account</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveNewParent() {
  const data = DB.get();
  const name = document.getElementById('par-name').value.trim();
  const email = document.getElementById('par-email').value.trim();
  const username = document.getElementById('par-username').value.trim();
  const password = document.getElementById('par-password').value.trim();

  if (!name || !email || !username || !password) { showToast('Please fill all required fields', 'error'); return; }
  if (data.users.find(u => u.username === username)) { showToast('Username already exists', 'error'); return; }

  const selectedChildren = [...document.querySelectorAll('input[name="par-child"]:checked')].map(el => el.value);

  const parentId = DB.genId('p');
  const parent = {
    id: parentId, role: 'parent', name, email, username, password,
    phone: document.getElementById('par-phone').value,
    avatar: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    active: true, deleted: false,
    createdAt: new Date().toISOString().split('T')[0],
    childIds: selectedChildren
  };

  data.users.push(parent);

  // Link children
  selectedChildren.forEach(sid => {
    const stu = data.students.find(s => s.id === sid);
    if (stu) stu.parentId = parentId;
  });

  DB.commit();
  DB.log(Session.current().id, 'CREATE_PARENT', `Created parent ${name} linked to ${selectedChildren.length} children`);
  document.querySelector('.modal-overlay').remove();
  showToast(`Parent ${name} created${selectedChildren.length ? ' with ' + selectedChildren.length + ' children' : ''}!`, 'success');
  mgmtTab = 'parents';
  renderManagement();
}

function openEditParentModal(pid) {
  const data = DB.get();
  const p = data.users.find(u => u.id === pid);
  if (!p) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h2 class="modal-title">Edit Parent</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Full Name</label><input class="form-control" id="epar-name" value="${p.name}"/></div>
          <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="epar-email" value="${p.email}"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="epar-phone" value="${p.phone||''}"/></div>
          <div class="form-group"><label class="form-label">New Password</label><input class="form-control" id="epar-pass" type="password" placeholder="Leave blank to keep"/></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEditParent('${pid}')">Save</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveEditParent(pid) {
  const data = DB.get();
  const p = data.users.find(u => u.id === pid);
  if (!p) return;
  p.name = document.getElementById('epar-name').value.trim() || p.name;
  p.email = document.getElementById('epar-email').value.trim() || p.email;
  p.phone = document.getElementById('epar-phone').value;
  const np = document.getElementById('epar-pass').value.trim();
  if (np) p.password = np;
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Parent updated!', 'success');
  renderManagement();
}

function openLinkChildModal(parentId) {
  const data = DB.get();
  const parent = DB.getUser(parentId);
  const existing = parent.childIds || [];
  const allStudents = data.students.filter(s => !s.deleted);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h2 class="modal-title">Link Children to ${parent.name}</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div style="max-height:350px;overflow-y:auto">
          ${allStudents.map(s => {
            const cls = DB.getClass(s.classId);
            const isLinked = existing.includes(s.id);
            const otherParent = (!isLinked && s.parentId) ? DB.getUser(s.parentId) : null;
            return `
            <label style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;border:1px solid #DCE1EF;margin-bottom:6px">
              <input type="checkbox" name="link-child" value="${s.id}" ${isLinked?'checked':''} style="width:16px;height:16px;accent-color:#1AA6CA"/>
              ${avatarHtml(s.name, '#1AA6CA')}
              <span style="flex:1">${s.name}</span>
              <span class="badge badge-blue">${cls ? cls.name : '-'}</span>
              ${otherParent ? `<span class="badge badge-yellow">${otherParent.name}</span>` : ''}
            </label>`;
          }).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveLinkChildren('${parentId}', ${JSON.stringify(allStudents.map(s=>s.id))})">Save Links</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveLinkChildren(parentId, allIds) {
  const data = DB.get();
  const parent = data.users.find(u => u.id === parentId);
  if (!parent) return;

  const newIds = allIds.filter(id => {
    const el = document.querySelector(`input[name="link-child"][value="${id}"]`);
    return el && el.checked;
  });

  const oldIds = parent.childIds || [];

  // Remove from students no longer linked
  oldIds.filter(id => !newIds.includes(id)).forEach(id => {
    const stu = data.students.find(s => s.id === id);
    if (stu && stu.parentId === parentId) stu.parentId = null;
  });

  // Add newly linked
  newIds.filter(id => !oldIds.includes(id)).forEach(id => {
    const stu = data.students.find(s => s.id === id);
    if (stu) stu.parentId = parentId;
  });

  parent.childIds = newIds;
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Children linked!', 'success');
  renderManagement();
}

function toggleParentStatus(pid) {
  const data = DB.get();
  const p = data.users.find(u => u.id === pid);
  if (!p) return;
  p.active = !p.active;
  DB.commit();
  showToast(`${p.name} ${p.active ? 'activated' : 'deactivated'}!`, 'success');
  renderManagement();
}

function deleteParent(pid) {
  if (!Session.canDelete()) return;
  const p = DB.getUser(pid);
  confirmDialog(`Delete parent "${p.name}"?`, () => {
    const data = DB.get();
    const user = data.users.find(u => u.id === pid);
    if (user) user.deleted = true;
    data.students.forEach(s => { if (s.parentId === pid) s.parentId = null; });
    DB.commit();
    showToast('Parent deleted', 'warning');
    renderManagement();
  });
}

// ---- Activity Log Tab ----
function renderActivityLogTab() {
  const data = DB.get();
  const logs = data.activityLog.slice(0, 100);

  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-history" style="color:#1AA6CA"></i> Activity Log (Last ${logs.length})</div>
        <button class="btn btn-secondary btn-sm" onclick="clearActivityLog()"><i class="fas fa-trash"></i> Clear Log</button>
      </div>
      ${logs.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
        <tbody>
          ${logs.map(l => {
            const u = DB.getUser(l.userId);
            const actionColors = {
              LOGIN: 'badge-green', LOGOUT: 'badge-gray', IMPERSONATE: 'badge-yellow',
              RETURN_SELF: 'badge-blue', CREATE_SUBADMIN: 'badge-purple',
              DELETE_STUDENT: 'badge-red', ADD_STUDENT: 'badge-green'
            };
            return `<tr>
              <td style="font-size:12px;white-space:nowrap">${formatDateTime(l.time)}</td>
              <td>${u ? u.name : l.userId}</td>
              <td><span class="badge ${actionColors[l.action] || 'badge-gray'}" style="font-size:11px">${l.action}</span></td>
              <td style="font-size:13px;color:#6B7A9D">${l.details}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>` : '<div class="empty-state"><i class="fas fa-history"></i><h3>No activity recorded</h3></div>'}
    </div>`;
}

function clearActivityLog() {
  confirmDialog('Clear all activity logs?', () => {
    DB.get().activityLog = [];
    DB.commit();
    renderManagement();
    showToast('Log cleared', 'warning');
  }, 'Clear', true);
}

// ---- Settings Tab ----
function renderSettingsTab() {
  const data = DB.get();
  const meta = data.meta;

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:900px">
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:20px"><i class="fas fa-school" style="color:#1AA6CA"></i> School Identity</div>
          <div style="display:flex;align-items:center;gap:16px;padding:16px;background:#F8F9FB;border-radius:12px;border:1px solid #DCE1EF;margin-bottom:20px">
            <img src="${meta.schoolLogo || '/static/school-logo.png'}" alt="School Logo" style="width:64px;height:64px;border-radius:12px;object-fit:cover;border:2px solid #e0e7ff;background:#fff"/>
            <div>
              <div style="font-weight:700;color:#1e293b">${meta.schoolName}</div>
              <div style="font-size:12px;color:#6B7A9D;margin-top:2px">School Logo & Name</div>
            </div>
          </div>
          <div class="form-group"><label class="form-label">School Name</label><input class="form-control" id="set-name" value="${meta.schoolName}"/></div>
          <div class="form-group"><label class="form-label">Principal Name</label><input class="form-control" id="set-principal" value="${meta.principalName || ''}"/></div>
          <div class="form-group"><label class="form-label">School Address</label><textarea class="form-control" id="set-address" rows="2">${meta.schoolAddress || ''}</textarea></div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:16px"><i class="fas fa-phone" style="color:#059669"></i> Contact Details</div>
          <div class="form-group"><label class="form-label">Primary Phone</label><input class="form-control" id="set-phone" value="${meta.schoolPhone || ''}"/></div>
          <div class="form-group"><label class="form-label">Secondary Phone</label><input class="form-control" id="set-phone2" value="${meta.schoolPhone2 || ''}" placeholder="Optional alternate number"/></div>
          <div class="form-group"><label class="form-label">Email Address</label><input class="form-control" id="set-email" type="email" value="${meta.schoolEmail || ''}"/></div>
          <div class="form-group"><label class="form-label">Website</label><input class="form-control" id="set-website" value="${meta.schoolWebsite || ''}" placeholder="e.g. https://superkidsindia.com"/></div>
          <div class="form-group"><label class="form-label">Academic Year</label><input class="form-control" id="set-academic-year" value="${meta.academicYear || ''}" placeholder="e.g. 2025-2026"/></div>
          <button class="btn btn-primary" onclick="saveSettings()"><i class="fas fa-save"></i> Save Settings</button>
        </div>
      </div>
      <div>
        <div style="padding:14px;background:#fee2e2;border-radius:10px;margin-bottom:16px">
          <div style="font-weight:700;color:#991b1b;margin-bottom:8px"><i class="fas fa-exclamation-triangle"></i> Danger Zone</div>
          <div style="font-size:13px;color:#7f1d1d;margin-bottom:12px">Resetting data will permanently clear all students, grades, attendance and other records. This cannot be undone.</div>
          <button class="btn btn-danger btn-sm" onclick="resetAllData()"><i class="fas fa-skull-crossbones"></i> Reset All Data</button>
        </div>
      </div>
    </div>`;
}

function saveSettings() {
  const data = DB.get();
  data.meta.schoolName = document.getElementById('set-name').value.trim() || data.meta.schoolName;
  data.meta.schoolPhone = document.getElementById('set-phone').value.trim();
  data.meta.schoolPhone2 = (document.getElementById('set-phone2') || {}).value || '';
  data.meta.schoolEmail = (document.getElementById('set-email') || {}).value.trim() || '';
  data.meta.schoolWebsite = (document.getElementById('set-website') || {}).value.trim() || '';
  data.meta.schoolAddress = (document.getElementById('set-address') || {}).value.trim() || '';
  data.meta.principalName = (document.getElementById('set-principal') || {}).value.trim() || '';
  data.meta.academicYear = (document.getElementById('set-academic-year') || {}).value.trim() || '';
  DB.commit();
  showToast('Settings saved!', 'success');
}

function resetAllData() {
  confirmDialog('This will DELETE ALL data and reset to defaults. Are you absolutely sure?', () => {
    DB.reset();
    showToast('Data reset to defaults. Please re-login.', 'warning');
    setTimeout(() => { Session.logout(); renderLogin(); }, 1500);
  }, 'Reset Everything', true);
}

// ---- My Profile (Super Admin) ----
function renderMyProfile() {
  const user = Session.current();
  if (user.role !== 'superadmin' || Session.isImpersonating()) {
    showToast('Access denied', 'error');
    navigate('dashboard');
    return;
  }

  const content = `
    <div style="max-width:680px;margin:0 auto">
      <!-- Profile Card -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-title" style="margin-bottom:24px">
          <i class="fas fa-user-circle" style="color:#1AA6CA"></i> My Profile
        </div>

        <div style="display:flex;align-items:center;gap:20px;padding:20px;background:linear-gradient(135deg,#eef2ff,#fdf4ff);border-radius:14px;margin-bottom:24px">
          <div style="width:80px;height:80px;border-radius:50%;background:${user.avatar || '#1AA6CA'};display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;color:#fff;flex-shrink:0;box-shadow:0 4px 12px rgba(26,166,202,0.3)">
            ${(user.name || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div>
            <div style="font-size:20px;font-weight:800;color:#1e293b">${user.name}</div>
            <div style="font-size:13px;color:#1AA6CA;font-weight:600;margin-top:2px"><i class="fas fa-shield-alt"></i> Super Admin</div>
            <div style="font-size:12px;color:#6B7A9D;margin-top:4px"><i class="fas fa-envelope"></i> ${user.email || 'Not set'} &nbsp; <i class="fas fa-phone"></i> ${user.phone || 'Not set'}</div>
          </div>
        </div>

        <!-- Edit Profile Form -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Full Name <span style="color:#ef4444">*</span></label>
            <input class="form-control" id="prof-name" type="text" value="${user.name || ''}" placeholder="Full Name" required/>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address <span style="color:#ef4444">*</span></label>
            <input class="form-control" id="prof-email" type="email" value="${user.email || ''}" placeholder="admin@school.com" required/>
            <div style="font-size:11px;color:#6B7A9D;margin-top:4px"><i class="fas fa-info-circle"></i> Required for password reset</div>
          </div>
          <div class="form-group">
            <label class="form-label">Mobile Number <span style="color:#ef4444">*</span></label>
            <input class="form-control" id="prof-phone" type="tel" value="${user.phone || ''}" placeholder="+1-555-0100" required/>
            <div style="font-size:11px;color:#6B7A9D;margin-top:4px"><i class="fas fa-info-circle"></i> Required for password reset</div>
          </div>
          <div class="form-group">
            <label class="form-label">Username</label>
            <input class="form-control" value="${user.username || ''}" disabled style="background:#f1f5f9;color:#6B7A9D;cursor:not-allowed"/>
          </div>
          <div class="form-group">
            <label class="form-label">Avatar Color</label>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px" id="avatar-picker">
              ${['#1AA6CA','#ec4899','#10b981','#E8B020','#ef4444','#06b6d4','#C4893A','#84cc16'].map(c=>`
                <div onclick="selectAvatarColor('${c}')" style="width:30px;height:30px;border-radius:50%;background:${c};cursor:pointer;border:3px solid ${user.avatar===c?'#1e293b':'transparent'};transition:border 0.2s" data-color="${c}"></div>
              `).join('')}
            </div>
            <input type="hidden" id="prof-avatar" value="${user.avatar || '#1AA6CA'}"/>
          </div>
        </div>
        <button class="btn btn-primary" onclick="saveProfile()" style="margin-top:8px">
          <i class="fas fa-save"></i> Save Profile
        </button>
      </div>

      <!-- Change Password Card -->
      <div class="card">
        <div class="card-title" style="margin-bottom:20px">
          <i class="fas fa-key" style="color:#E8B020"></i> Change Password
        </div>
        
        <div style="padding:12px;background:#FEF7E0;border-radius:10px;margin-bottom:20px;font-size:13px;color:#92400e">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>Password Reset Requirements:</strong> You must have a valid <strong>Email</strong> and <strong>Mobile Number</strong> saved in your profile to reset your password.
          ${(!user.email || !user.phone) ? `<div style="margin-top:8px;color:#dc2626;font-weight:700"><i class="fas fa-times-circle"></i> Please complete your profile (email + mobile) before changing password.</div>` : `<div style="margin-top:8px;color:#065f46;font-weight:700"><i class="fas fa-check-circle"></i> Profile is complete. You can change your password.</div>`}
        </div>

        ${(!user.email || !user.phone) ? `
        <div style="text-align:center;padding:20px;color:#6B7A9D">
          <i class="fas fa-lock" style="font-size:36px;margin-bottom:12px;opacity:0.4"></i>
          <p>Complete your profile above (set email &amp; mobile) to enable password change.</p>
          <button class="btn btn-primary btn-sm" onclick="document.getElementById('prof-email').focus()">
            <i class="fas fa-edit"></i> Complete Profile First
          </button>
        </div>
        ` : `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Current Password <span style="color:#ef4444">*</span></label>
            <div style="position:relative">
              <input class="form-control" id="pw-current" type="password" placeholder="Enter current password"/>
              <i class="fas fa-eye" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#6B7A9D;cursor:pointer" onclick="togglePwVis('pw-current',this)"></i>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">New Password <span style="color:#ef4444">*</span></label>
            <div style="position:relative">
              <input class="form-control" id="pw-new" type="password" placeholder="Min 6 characters"/>
              <i class="fas fa-eye" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#6B7A9D;cursor:pointer" onclick="togglePwVis('pw-new',this)"></i>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Confirm New Password <span style="color:#ef4444">*</span></label>
            <div style="position:relative">
              <input class="form-control" id="pw-confirm" type="password" placeholder="Repeat new password"/>
              <i class="fas fa-eye" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#6B7A9D;cursor:pointer" onclick="togglePwVis('pw-confirm',this)"></i>
            </div>
          </div>
        </div>
        <div style="font-size:12px;color:#6B7A9D;margin-bottom:16px">
          <i class="fas fa-shield-alt"></i> Password reset verification will be sent to: <strong>${user.email}</strong> &amp; <strong>${user.phone}</strong>
        </div>
        <button class="btn btn-warning" onclick="changePassword()">
          <i class="fas fa-key"></i> Change Password
        </button>
        `}
      </div>
    </div>`;

  renderLayout('my-profile', content, 'My Profile', 'Super Admin');
}

function selectAvatarColor(color) {
  document.getElementById('prof-avatar').value = color;
  document.querySelectorAll('#avatar-picker div[data-color]').forEach(el => {
    el.style.border = `3px solid ${el.dataset.color === color ? '#1e293b' : 'transparent'}`;
  });
}

function togglePwVis(inputId, icon) {
  const inp = document.getElementById(inputId);
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    inp.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

function saveProfile() {
  const name = document.getElementById('prof-name').value.trim();
  const email = document.getElementById('prof-email').value.trim();
  const phone = document.getElementById('prof-phone').value.trim();
  const avatar = document.getElementById('prof-avatar').value;

  if (!name) { showToast('Name is required.', 'error'); return; }
  if (!email) { showToast('Email is required.', 'error'); document.getElementById('prof-email').focus(); return; }
  if (!phone) { showToast('Mobile number is required.', 'error'); document.getElementById('prof-phone').focus(); return; }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.', 'error');
    document.getElementById('prof-email').focus();
    return;
  }

  const data = DB.get();
  const user = Session.current();
  const idx = data.users.findIndex(u => u.id === user.id);
  if (idx === -1) { showToast('User not found.', 'error'); return; }

  data.users[idx].name = name;
  data.users[idx].email = email;
  data.users[idx].phone = phone;
  data.users[idx].avatar = avatar;
  DB.commit();

  // Update session
  Session.updateCurrent(data.users[idx]);
  showToast('Profile updated successfully!', 'success');

  // Re-render to reflect changes
  setTimeout(() => renderMyProfile(), 600);
}

function changePassword() {
  const current = document.getElementById('pw-current').value;
  const newPw = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;

  const user = Session.current();

  if (!current) { showToast('Enter your current password.', 'error'); return; }
  if (current !== user.password) { showToast('Current password is incorrect.', 'error'); return; }
  if (!newPw || newPw.length < 6) { showToast('New password must be at least 6 characters.', 'error'); return; }
  if (newPw !== confirm) { showToast('Passwords do not match.', 'error'); return; }
  if (newPw === current) { showToast('New password must be different from current.', 'warning'); return; }

  // Verify mandatory fields (email + phone)
  if (!user.email || !user.phone) {
    showToast('Email and mobile number are required to change password. Please update your profile first.', 'error');
    return;
  }

  const data = DB.get();
  const idx = data.users.findIndex(u => u.id === user.id);
  data.users[idx].password = newPw;
  DB.commit();
  Session.updateCurrent(data.users[idx]);

  document.getElementById('pw-current').value = '';
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-confirm').value = '';
  showToast('Password changed successfully!', 'success');
}

// ---- Our Team Tab ----
var _teamMembers = [];
var _editingTeamId = null;

function renderTeamTab() {
  var colors = ['#0F2050','#1AA6CA','#C4893A','#E8B020','#10b981','#8b5cf6'];
  var modalHtml = `
    <div class="modal-overlay" id="team-modal" style="display:none" onclick="if(event.target===this)closeTeamModal()">
      <div style="background:#fff;border-radius:18px;max-width:520px;width:95%;padding:28px;max-height:90vh;overflow-y:auto">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h3 id="team-modal-title" style="font-size:17px;font-weight:800;color:#0F1E3D;margin:0">Add Team Member</h3>
          <button onclick="closeTeamModal()" style="width:32px;height:32px;border-radius:50%;border:none;background:#f1f5f9;cursor:pointer;font-size:16px">×</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px;background:#f8faff;border-radius:12px">
            <div id="team-photo-preview" style="width:90px;height:90px;border-radius:50%;border:3px solid #1AA6CA;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#e8edf5;font-size:2rem">🦸</div>
            <button onclick="document.getElementById('team-photo-input').click()" style="padding:7px 16px;border-radius:8px;border:1.5px solid #1AA6CA;background:#fff;color:#1AA6CA;font-weight:700;font-size:13px;cursor:pointer">
              <i class="fas fa-camera" style="margin-right:6px"></i>Upload Photo
            </button>
            <input type="file" id="team-photo-input" accept="image/*" style="display:none" onchange="previewTeamPhoto(this)">
            <span id="team-photo-status" style="font-size:11px;color:#94a3b8"></span>
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#6B7A9D;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Full Name *</label>
            <input id="team-name" type="text" placeholder="e.g. Dr. Amanda Powers" maxlength="60"
                   style="width:100%;padding:10px 14px;border:1.5px solid #DCE1EF;border-radius:10px;font-size:14px;outline:none">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#6B7A9D;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Role / Title *</label>
            <input id="team-role" type="text" placeholder="e.g. Lead Educator (Toddlers)" maxlength="80"
                   style="width:100%;padding:10px 14px;border:1.5px solid #DCE1EF;border-radius:10px;font-size:14px;outline:none">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:#6B7A9D;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Experience</label>
              <input id="team-experience" type="text" placeholder="e.g. 8 yrs" maxlength="30"
                     style="width:100%;padding:10px 14px;border:1.5px solid #DCE1EF;border-radius:10px;font-size:14px;outline:none">
            </div>
            <div>
              <label style="display:block;font-size:12px;font-weight:700;color:#6B7A9D;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Certification</label>
              <input id="team-cert" type="text" placeholder="e.g. ECE Certified" maxlength="60"
                     style="width:100%;padding:10px 14px;border:1.5px solid #DCE1EF;border-radius:10px;font-size:14px;outline:none">
            </div>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#6B7A9D;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Bio <span style="color:#94a3b8;text-transform:none;font-weight:400">(optional)</span></label>
            <textarea id="team-bio" placeholder="Short description about this team member…" maxlength="200" rows="3"
                      style="width:100%;padding:10px 14px;border:1.5px solid #DCE1EF;border-radius:10px;font-size:14px;outline:none;resize:none;font-family:inherit"></textarea>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#6B7A9D;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">Accent Colour</label>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              ${colors.map(function(col) {
                return '<div onclick="selectTeamColor(\'' + col + '\')" data-color="' + col + '" style="width:32px;height:32px;border-radius:50%;background:' + col + ';cursor:pointer;border:3px solid transparent;transition:border 0.15s" title="' + col + '"></div>';
              }).join('')}
            </div>
            <input type="hidden" id="team-color" value="${colors[0]}">
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:22px">
          <button onclick="closeTeamModal()" style="flex:1;padding:11px;border-radius:10px;border:1.5px solid #DCE1EF;background:#fff;color:#6B7A9D;font-weight:700;cursor:pointer">Cancel</button>
          <button onclick="saveTeamMember()" id="team-save-btn" style="flex:2;padding:11px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F2050,#1AA6CA);color:#fff;font-weight:700;cursor:pointer">
            <i class="fas fa-save" style="margin-right:6px"></i>Save Member
          </button>
        </div>
      </div>
    </div>`;

  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-chalkboard-teacher" style="color:#1AA6CA"></i> Our Team <span style="font-size:12px;color:#94a3b8" id="team-count"></span></div>
        <button class="btn btn-primary" onclick="openAddTeamMemberModal()"><i class="fas fa-plus"></i> Add Member</button>
      </div>
      <p style="color:#6B7A9D;font-size:13px;margin:0 0 16px">Team members added here will automatically appear on the public About page.</p>
      <div id="team-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px">
        <div style="text-align:center;padding:40px;color:#94a3b8"><i class="fas fa-spinner fa-spin"></i> Loading…</div>
      </div>
    </div>
    ${modalHtml}`;
}

function loadTeamMembers() {
  fetch('/api/team')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      _teamMembers = res.members || [];
      renderTeamCards();
    })
    .catch(function() {
      var b = document.getElementById('team-body');
      if (b) b.innerHTML = '<p style="color:#ef4444;padding:20px">Failed to load team. Please try again.</p>';
    });
}

function renderTeamCards() {
  var body = document.getElementById('team-body');
  var count = document.getElementById('team-count');
  if (count) count.textContent = '(' + _teamMembers.length + ')';
  if (!body) return;
  if (!_teamMembers.length) {
    body.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#94a3b8;grid-column:1/-1"><i class="fas fa-users" style="font-size:40px;margin-bottom:12px;display:block"></i><p>No team members yet. Click "Add Member" to get started.</p></div>';
    return;
  }
  body.innerHTML = _teamMembers.map(function(t) {
    var photoHtml = t.photoKey
      ? '<img src="/r2/' + t.photoKey + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentNode.innerHTML=\'🦸\'">'
      : '<span style="font-size:2rem">🦸</span>';
    return '<div style="background:#fff;border-radius:14px;padding:20px;text-align:center;border:1.5px solid #DCE1EF;box-shadow:0 2px 8px rgba(15,32,80,0.06)">'
      + '<div style="width:80px;height:80px;border-radius:50%;border:3px solid ' + t.color + ';margin:0 auto 12px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f8faff">'
      + photoHtml + '</div>'
      + '<div style="font-weight:800;color:#0F1E3D;font-size:14px;margin-bottom:4px">' + t.name + '</div>'
      + '<div style="color:' + t.color + ';font-size:12px;font-weight:700;margin-bottom:6px">' + t.role + '</div>'
      + (t.certification ? '<div style="font-size:11px;background:' + t.color + '18;color:' + t.color + ';border-radius:8px;padding:2px 8px;display:inline-block;margin-bottom:6px">' + t.certification + '</div><br>' : '')
      + (t.experience ? '<div style="font-size:11px;color:#94a3b8">' + t.experience + ' experience</div>' : '')
      + '<div style="display:flex;gap:8px;justify-content:center;margin-top:14px">'
      + '<button onclick="editTeamMember(\'' + t.id + '\')" style="flex:1;padding:7px;border-radius:8px;border:1.5px solid #DCE1EF;background:#fff;color:#0F2050;font-size:12px;font-weight:700;cursor:pointer"><i class="fas fa-edit"></i> Edit</button>'
      + '<button onclick="deleteTeamMember(\'' + t.id + '\')" style="padding:7px 12px;border-radius:8px;border:none;background:#fee2e2;color:#ef4444;font-size:12px;font-weight:700;cursor:pointer"><i class="fas fa-trash"></i></button>'
      + '</div></div>';
  }).join('');
}

function openAddTeamMemberModal() {
  _editingTeamId = null;
  document.getElementById('team-modal-title').textContent = 'Add Team Member';
  document.getElementById('team-name').value = '';
  document.getElementById('team-role').value = '';
  document.getElementById('team-experience').value = '';
  document.getElementById('team-cert').value = '';
  document.getElementById('team-bio').value = '';
  document.getElementById('team-color').value = '#0F2050';
  document.getElementById('team-photo-preview').innerHTML = '🦸';
  document.getElementById('team-photo-status').textContent = '';
  document.getElementById('team-photo-input').value = '';
  selectTeamColor('#0F2050');
  document.getElementById('team-modal').style.display = 'flex';
}

function editTeamMember(id) {
  var t = _teamMembers.find(function(m) { return m.id === id; });
  if (!t) return;
  _editingTeamId = id;
  document.getElementById('team-modal-title').textContent = 'Edit Team Member';
  document.getElementById('team-name').value = t.name || '';
  document.getElementById('team-role').value = t.role || '';
  document.getElementById('team-experience').value = t.experience || '';
  document.getElementById('team-cert').value = t.certification || '';
  document.getElementById('team-bio').value = t.bio || '';
  document.getElementById('team-color').value = t.color || '#0F2050';
  selectTeamColor(t.color || '#0F2050');
  var preview = document.getElementById('team-photo-preview');
  if (t.photoKey) {
    preview.innerHTML = '<img src="/r2/' + t.photoKey + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
  } else {
    preview.innerHTML = '🦸';
  }
  document.getElementById('team-photo-status').textContent = '';
  document.getElementById('team-photo-input').value = '';
  document.getElementById('team-modal').style.display = 'flex';
}

function closeTeamModal() {
  document.getElementById('team-modal').style.display = 'none';
  _editingTeamId = null;
}

function selectTeamColor(color) {
  document.getElementById('team-color').value = color;
  document.querySelectorAll('[data-color]').forEach(function(el) {
    el.style.border = el.dataset.color === color ? '3px solid #0F1E3D' : '3px solid transparent';
  });
}

function previewTeamPhoto(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('team-photo-preview').innerHTML =
      '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
  };
  reader.readAsDataURL(file);
  document.getElementById('team-photo-status').textContent = file.name + ' selected';
}

function saveTeamMember() {
  var name = (document.getElementById('team-name').value || '').trim();
  var role = (document.getElementById('team-role').value || '').trim();
  if (!name || !role) { showToast('Name and Role are required', 'warning'); return; }

  var btn = document.getElementById('team-save-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; }

  var photoFile = document.getElementById('team-photo-input').files[0];

  function doSave(photoKey) {
    var existing = _editingTeamId ? _teamMembers.find(function(m) { return m.id === _editingTeamId; }) : null;
    var member = {
      id: _editingTeamId || ('team_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
      name: name,
      role: role,
      experience: (document.getElementById('team-experience').value || '').trim(),
      certification: (document.getElementById('team-cert').value || '').trim(),
      bio: (document.getElementById('team-bio').value || '').trim(),
      color: document.getElementById('team-color').value || '#0F2050',
      photoKey: photoKey !== undefined ? photoKey : (existing ? existing.photoKey || '' : ''),
    };

    if (_editingTeamId) {
      _teamMembers = _teamMembers.map(function(m) { return m.id === _editingTeamId ? member : m; });
    } else {
      _teamMembers.push(member);
    }

    fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members: _teamMembers })
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.ok) {
        showToast('Team member saved! Changes are now live on the website.', 'success');
        closeTeamModal();
        renderTeamCards();
      } else {
        showToast('Save failed: ' + (res.error || 'Unknown error'), 'error');
      }
    })
    .catch(function() { showToast('Network error. Please try again.', 'error'); })
    .finally(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save" style="margin-right:6px"></i>Save Member'; }
    });
  }

  if (photoFile) {
    var form = new FormData();
    form.append('file', photoFile);
    fetch('/api/upload?folder=team', { method: 'POST', body: form })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.key) doSave(res.key);
        else { showToast('Photo upload failed', 'error'); doSave(undefined); }
      })
      .catch(function() { showToast('Photo upload failed', 'error'); doSave(undefined); });
  } else {
    doSave(undefined);
  }
}

function deleteTeamMember(id) {
  confirmDialog('Remove this team member from the website?', function() {
    _teamMembers = _teamMembers.filter(function(m) { return m.id !== id; });
    fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members: _teamMembers })
    })
    .then(function(r) { return r.json(); })
    .then(function() { showToast('Team member removed', 'success'); renderTeamCards(); })
    .catch(function() { showToast('Failed to remove member', 'error'); });
  });
}

// ---- Reviews Tab ----
function renderReviewsTab() {
  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-star" style="color:#E8B020"></i> Parent Reviews</div>
        <div style="font-size:12px;color:#6B7A9D">Approve reviews to make them visible on the public homepage</div>
      </div>
      <div id="reviews-list" style="padding:8px 0">
        <div style="text-align:center;padding:32px;color:#6B7A9D"><i class="fas fa-spinner fa-spin"></i> Loading reviews…</div>
      </div>
    </div>`;
}

function loadReviews() {
  fetch('/api/reviews')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var list = document.getElementById('reviews-list');
      if (!list) return;
      var reviews = data.reviews || [];
      if (reviews.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:40px;color:#6B7A9D"><i class="fas fa-star" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:12px"></i>No reviews yet. Parents can submit reviews from the Parent Portal.</div>';
        return;
      }
      var pending = reviews.filter(function(r) { return r.status !== 'approved'; });
      var approved = reviews.filter(function(r) { return r.status === 'approved'; });
      function reviewCard(r) {
        var isPending = r.status !== 'approved';
        var stars = '';
        for (var i = 0; i < 5; i++) stars += '<i class="fas fa-star" style="color:' + (i < r.stars ? '#E8B020' : '#DCE1EF') + ';font-size:12px"></i>';
        return `<div style="border:1.5px solid ${isPending ? '#E8B02033' : '#10b98133'};border-radius:12px;padding:16px;margin-bottom:12px;background:${isPending ? '#FFFDF0' : '#F0FFF8'}">
          <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                <span style="font-weight:800;color:#0F1E3D;font-size:14px">${r.parentName}</span>
                <span style="font-size:11px;color:#6B7A9D">${r.childInfo || ''}</span>
                <span style="font-size:10px;color:#94a3b8;margin-left:auto">${r.date || ''}</span>
              </div>
              <div style="margin-bottom:6px">${stars}</div>
              <p style="color:#2A3B60;font-size:13px;line-height:1.6;margin:0">${r.text}</p>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
              <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${isPending ? '#FEF8E0' : '#D1FAE5'};color:${isPending ? '#C4893A' : '#059669'}">${isPending ? 'Pending' : 'Approved'}</span>
              ${isPending ? `<button onclick="approveReview('${r.id}')" style="padding:6px 14px;border-radius:8px;border:none;background:#10b981;color:#fff;font-size:12px;font-weight:700;cursor:pointer"><i class="fas fa-check" style="margin-right:4px"></i>Approve</button>` : `<button onclick="unapproveReview('${r.id}')" style="padding:6px 14px;border-radius:8px;border:none;background:#f1f5f9;color:#6B7A9D;font-size:12px;font-weight:700;cursor:pointer"><i class="fas fa-undo" style="margin-right:4px"></i>Unapprove</button>`}
              <button onclick="deleteReview('${r.id}')" style="padding:6px 14px;border-radius:8px;border:none;background:#FEE2E2;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer"><i class="fas fa-trash" style="margin-right:4px"></i>Delete</button>
            </div>
          </div>
        </div>`;
      }
      var html = '';
      if (pending.length > 0) {
        html += '<div style="font-size:11px;font-weight:700;color:#C4893A;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px"><i class="fas fa-clock" style="margin-right:4px"></i>Pending Approval (' + pending.length + ')</div>';
        html += pending.map(reviewCard).join('');
      }
      if (approved.length > 0) {
        html += '<div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.05em;margin:16px 0 8px"><i class="fas fa-check-circle" style="margin-right:4px"></i>Approved & Live (' + approved.length + ')</div>';
        html += approved.map(reviewCard).join('');
      }
      list.innerHTML = html;
    })
    .catch(function() {
      var list = document.getElementById('reviews-list');
      if (list) list.innerHTML = '<div style="text-align:center;padding:32px;color:#dc2626">Failed to load reviews.</div>';
    });
}

function approveReview(id) {
  fetch('/api/reviews/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) })
    .then(function(r) { return r.json(); })
    .then(function() { showToast('Review approved — now live on homepage', 'success'); loadReviews(); })
    .catch(function() { showToast('Failed to approve review', 'error'); });
}

function unapproveReview(id) {
  fetch('/api/reviews/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'pending' }) })
    .then(function(r) { return r.json(); })
    .then(function() { showToast('Review moved back to pending', 'success'); loadReviews(); })
    .catch(function() { showToast('Failed to update review', 'error'); });
}

function deleteReview(id) {
  if (!confirm('Delete this review permanently?')) return;
  fetch('/api/reviews/' + id, { method: 'DELETE' })
    .then(function(r) { return r.json(); })
    .then(function() { showToast('Review deleted', 'success'); loadReviews(); })
    .catch(function() { showToast('Failed to delete review', 'error'); });
}

// Register route
// ---- Academic Setup Tab ----
function renderAcademicTab() {
  return '<div id="academic-wrap"><div style="text-align:center;padding:32px;color:#6B7A9D"><i class="fas fa-spinner fa-spin"></i> Loading…</div></div>';
}

function loadAcademicConfig() {
  var wrap = document.getElementById('academic-wrap'); if (!wrap) return;
  fetch('/api/academic-config').then(function(r){return r.json();}).then(function(res) {
    var cfg = res.config || { currentYear: getAcademicYear(), admissionOpen: true, classes: [
      {id:'playgroup',name:'Play Group',ageGroup:'1.5–2.5 yrs',capacity:20},
      {id:'nursery',name:'Nursery',ageGroup:'2.5–3.5 yrs',capacity:25},
      {id:'jrkg',name:'Jr. KG',ageGroup:'3.5–4.5 yrs',capacity:30},
      {id:'srkg',name:'Sr. KG',ageGroup:'4.5–5.5 yrs',capacity:30},
      {id:'superhero',name:'Super Heroes 5+',ageGroup:'5+ yrs',capacity:25},
    ]};
    wrap.innerHTML = '<div class="card">' +
      '<div class="card-header" style="margin-bottom:20px"><div class="card-title"><i class="fas fa-graduation-cap" style="color:#C4893A"></i> Academic Year & Admission Settings</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:16px">' +
        '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">' +
          '<div><label style="display:block;font-size:11px;font-weight:700;color:#6B7A9D;margin-bottom:4px;text-transform:uppercase">Current Academic Year</label><input id="ac-year" value="'+(cfg.currentYear||'')+'" style="width:100%;padding:9px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px;box-sizing:border-box"></div>' +
          '<div><label style="display:block;font-size:11px;font-weight:700;color:#6B7A9D;margin-bottom:4px;text-transform:uppercase">Admission Start Date</label><input id="ac-start" type="date" value="'+(cfg.admissionStartDate||'')+'" style="width:100%;padding:9px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px;box-sizing:border-box"></div>' +
          '<div><label style="display:block;font-size:11px;font-weight:700;color:#6B7A9D;margin-bottom:4px;text-transform:uppercase">Admission End Date</label><input id="ac-end" type="date" value="'+(cfg.admissionEndDate||'')+'" style="width:100%;padding:9px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px;box-sizing:border-box"></div>' +
        '</div>' +
        '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;font-weight:600;color:#2A3B60"><input type="checkbox" id="ac-open" '+(cfg.admissionOpen?'checked':'')+' style="width:18px;height:18px;accent-color:#C4893A;cursor:pointer"> Admissions Currently Open</label>' +
        '<div><div style="font-size:13px;font-weight:700;color:#0F1E3D;margin-bottom:10px">Classes & Seat Capacity</div>' +
          '<div id="ac-classes">' +
            cfg.classes.map(function(c,i) {
              return '<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:center;margin-bottom:8px">' +
                '<input value="'+c.name+'" id="acc-name-'+i+'" placeholder="Class name" style="padding:8px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px">' +
                '<input value="'+c.ageGroup+'" id="acc-age-'+i+'" placeholder="Age group" style="padding:8px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px">' +
                '<input type="number" value="'+(c.capacity||25)+'" id="acc-cap-'+i+'" placeholder="Seats" style="padding:8px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px">' +
                '<button onclick="this.closest(\'div\').remove()" style="width:32px;height:32px;border-radius:8px;border:1.5px solid #FEE2E2;background:#FEE2E2;color:#dc2626;cursor:pointer;font-size:14px">×</button>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<button onclick="addAcClass()" class="btn btn-secondary" style="margin-top:6px;font-size:12px"><i class="fas fa-plus" style="margin-right:4px"></i>Add Class</button>' +
        '</div>' +
        '<div style="display:flex;justify-content:flex-end"><button onclick="saveAcademicConfig()" class="btn btn-primary"><i class="fas fa-save" style="margin-right:6px"></i>Save Academic Config</button></div>' +
      '</div></div>';
  });
}

window.addAcClass = function() {
  var container = document.getElementById('ac-classes'); if (!container) return;
  var i = container.children.length;
  var row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:center;margin-bottom:8px';
  row.innerHTML = '<input id="acc-name-'+i+'" placeholder="Class name" style="padding:8px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px">' +
    '<input id="acc-age-'+i+'" placeholder="Age group" style="padding:8px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px">' +
    '<input type="number" id="acc-cap-'+i+'" placeholder="Seats" style="padding:8px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px">' +
    '<button onclick="this.closest(\'div\').remove()" style="width:32px;height:32px;border-radius:8px;border:1.5px solid #FEE2E2;background:#FEE2E2;color:#dc2626;cursor:pointer;font-size:14px">×</button>';
  container.appendChild(row);
};

function saveAcademicConfig() {
  var rows = document.getElementById('ac-classes').children;
  var classes = [];
  for (var i = 0; i < rows.length; i++) {
    var n = (document.getElementById('acc-name-'+i)||{}).value || '';
    var a = (document.getElementById('acc-age-'+i)||{}).value || '';
    var cap = parseInt((document.getElementById('acc-cap-'+i)||{}).value) || 25;
    if (n) classes.push({id: n.toLowerCase().replace(/\s+/g,'_'), name: n, ageGroup: a, capacity: cap});
  }
  var cfg = {
    currentYear: (document.getElementById('ac-year')||{}).value || getAcademicYear(),
    admissionOpen: (document.getElementById('ac-open')||{}).checked || false,
    admissionStartDate: (document.getElementById('ac-start')||{}).value || '',
    admissionEndDate: (document.getElementById('ac-end')||{}).value || '',
    classes: classes,
  };
  fetch('/api/academic-config', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({config:cfg})})
    .then(function(r){return r.json();}).then(function(){showToast('Academic config saved','success');})
    .catch(function(){showToast('Failed to save','error');});
}

// ---- Fee Structure Config Tab ----
var _feeCfg = null;

function renderFeeConfigTab() {
  return '<div id="feeconfig-wrap"><div style="text-align:center;padding:32px;color:#6B7A9D"><i class="fas fa-spinner fa-spin"></i> Loading…</div></div>';
}

function loadFeeConfig() {
  var wrap = document.getElementById('feeconfig-wrap'); if (!wrap) return;
  Promise.all([
    fetch('/api/fee-config').then(function(r){return r.json();}),
    fetch('/api/academic-config').then(function(r){return r.json();}),
  ]).then(function(results) {
    var fc = results[0].config || {};
    var ac = results[1].config || {};
    _feeCfg = {
      classWise: fc.classWiseFees || {},
      kit: (fc.kitItems||[]).length > 0 ? fc.kitItems : [
        {id:'bag',name:'School Bag'},{id:'uniform',name:'Uniform (Set of 2)'},
        {id:'books',name:'Book Set'},{id:'stationery',name:'Stationery Kit'},
        {id:'shoes',name:'Shoes'},{id:'idCard',name:'ID Card'},
      ],
      classWiseKit: fc.classWiseKit || {},
      activities: fc.activities || [],
      classes: (ac.classes||[]).length > 0 ? ac.classes : [
        {name:'Play Group'},{name:'Nursery'},{name:'Jr. KG'},{name:'Sr. KG'},{name:'Super Heroes 5+'},
      ],
    };
    renderFeeConfigUI();
  }).catch(function(){ var w=document.getElementById('feeconfig-wrap'); if(w) w.innerHTML='<div style="color:#dc2626;padding:20px">Failed to load fee config</div>'; });
}

var FEE_COLS = [
  {id:'installment1', label:'1st Installment', sub:'Registration + First'},
  {id:'installment2', label:'2nd Installment', sub:''},
  {id:'installment3', label:'3rd Installment', sub:''},
  {id:'totalFees', label:'Total Fees', sub:''},
  {id:'educationKit', label:'Edu. Kit Total', sub:'Sum of kit items'},
];

function renderFeeConfigUI() {
  var wrap = document.getElementById('feeconfig-wrap'); if (!wrap || !_feeCfg) return;
  var cfg = _feeCfg;

  wrap.innerHTML =
    '<div class="card" style="margin-bottom:16px">' +
      '<div class="card-header" style="margin-bottom:16px"><div class="card-title"><i class="fas fa-rupee-sign" style="color:#E8B020"></i> Class-wise Fee Structure</div></div>' +
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
        '<thead><tr style="background:#F8F9FB">' +
          '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6B7A9D;text-transform:uppercase;min-width:110px">Class</th>' +
          FEE_COLS.map(function(c){
            return '<th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:700;color:#6B7A9D;text-transform:uppercase;white-space:nowrap;min-width:140px">' +
              c.label + (c.sub ? '<div style="font-weight:400;color:#94a3b8;font-size:9px;text-transform:none;margin-top:1px">'+c.sub+'</div>' : '') +
            '</th>';
          }).join('') +
        '</tr></thead><tbody>' +
          cfg.classes.map(function(cls) {
            var fees = cfg.classWise[cls.name] || {};
            return '<tr style="border-bottom:1px solid #F1F5F9"><td style="padding:10px 12px;font-weight:700;color:#0F1E3D">'+cls.name+'</td>' +
              FEE_COLS.map(function(c){
                return '<td style="padding:5px 6px"><input type="number" class="fee-struct-inp" data-class="'+cls.name+'" data-col="'+c.id+'" value="'+(fees[c.id]||'')+'" placeholder="₹0" style="width:120px;padding:6px 10px;border:1.5px solid #DCE1EF;border-radius:6px;font-size:13px;text-align:right;box-sizing:border-box"></td>';
              }).join('') +
            '</tr>';
          }).join('') +
        '</tbody></table></div>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:14px"><button onclick="saveFeeStructure()" class="btn btn-primary"><i class="fas fa-save" style="margin-right:6px"></i>Save Fee Structure</button></div>' +
    '</div>' +

    '<div class="card" style="margin-bottom:16px">' +
      '<div class="card-header" style="margin-bottom:16px"><div class="card-title"><i class="fas fa-running" style="color:#1AA6CA"></i> After-School Activities</div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 140px auto;gap:10px;align-items:center;padding:14px;background:#F8F9FB;border-radius:10px;margin-bottom:14px">' +
        '<input id="new-act-name" type="text" placeholder="Activity name (e.g. Dance, Music, Art)" style="padding:9px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px;outline:none">' +
        '<input id="new-act-fee" type="number" placeholder="Fee (₹)" style="padding:9px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px;outline:none;text-align:right">' +
        '<button onclick="addActivity()" class="btn btn-primary"><i class="fas fa-plus"></i> Add</button>' +
      '</div>' +
      '<div id="activities-list">' + renderActivitiesList(cfg.activities) + '</div>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:14px"><button onclick="saveActivities()" class="btn btn-primary"><i class="fas fa-save" style="margin-right:6px"></i>Save Activities</button></div>' +
    '</div>' +

    '<div class="card">' +
      '<div class="card-title" style="margin-bottom:4px"><i class="fas fa-shopping-bag" style="color:#C4893A"></i> Education Kit</div>' +
      '<div style="font-size:11px;color:#6B7A9D;margin-bottom:16px">Define item names globally, then set prices per class.</div>' +
      '<div style="padding:16px;background:#F8F9FB;border-radius:12px;margin-bottom:20px">' +
        '<div style="font-weight:700;font-size:13px;color:#0F1E3D;margin-bottom:10px">Kit Item Names</div>' +
        '<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">' +
          '<input id="new-kit-name" type="text" placeholder="e.g. School Bag, Uniform…" style="flex:1;padding:9px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px;outline:none">' +
          '<button onclick="addKitItem()" class="btn btn-primary" style="flex-shrink:0"><i class="fas fa-plus"></i> Add</button>' +
        '</div>' +
        '<div id="kit-items-list">' + renderKitItemsList(cfg.kit) + '</div>' +
        '<div style="margin-top:12px;display:flex;justify-content:flex-end"><button onclick="saveKitItems()" class="btn btn-secondary"><i class="fas fa-save" style="margin-right:6px"></i>Save Item Names</button></div>' +
      '</div>' +
      '<div>' +
        '<div style="font-weight:700;font-size:13px;color:#0F1E3D;margin-bottom:10px">Kit Prices by Class</div>' +
        '<div style="margin-bottom:14px">' +
          '<label style="font-size:12px;color:#6B7A9D;font-weight:600;margin-right:10px">Select Class:</label>' +
          '<select id="kit-class-sel" onchange="renderKitPricesForClass()" style="padding:8px 14px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px;outline:none;background:#fff">' +
            cfg.classes.map(function(c){ return '<option value="'+c.name+'">'+c.name+'</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<div id="kit-prices-wrap">' + renderKitPricesForClassHtml(cfg.classes.length>0?cfg.classes[0].name:'', cfg.kit, cfg.classWiseKit) + '</div>' +
      '</div>' +
    '</div>';
}

function renderActivitiesList(activities) {
  if (!activities || activities.length === 0) {
    return '<div style="text-align:center;padding:20px;color:#6B7A9D;font-size:13px">No activities yet. Add one above.</div>';
  }
  return '<div style="display:flex;flex-direction:column;gap:8px">' +
    activities.map(function(a, i) {
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff;border:1.5px solid #DCE1EF;border-radius:8px">' +
        '<div style="flex:1;font-weight:600;font-size:13px;color:#0F1E3D"><i class="fas fa-star" style="color:#E8B020;font-size:10px;margin-right:8px"></i>'+a.name+'</div>' +
        '<div style="font-weight:800;color:#059669;font-size:14px">₹'+(a.fee||0).toLocaleString('en-IN')+'</div>' +
        '<button onclick="removeActivity('+i+')" style="width:28px;height:28px;border-radius:6px;border:1.5px solid #FEE2E2;background:#FEE2E2;color:#dc2626;cursor:pointer;font-size:14px;line-height:1">×</button>' +
      '</div>';
    }).join('') +
  '</div>';
}

window.addActivity = function() {
  var name = ((document.getElementById('new-act-name')||{}).value||'').trim();
  var fee = parseFloat((document.getElementById('new-act-fee')||{}).value) || 0;
  if (!name) { showToast('Enter activity name','warning'); return; }
  if (!_feeCfg) return;
  _feeCfg.activities.push({id: name.toLowerCase().replace(/\s+/g,'_')+'_'+Date.now(), name: name, fee: fee});
  var el = document.getElementById('activities-list'); if (el) el.innerHTML = renderActivitiesList(_feeCfg.activities);
  var ni = document.getElementById('new-act-name'); if (ni) ni.value = '';
  var fi2 = document.getElementById('new-act-fee'); if (fi2) fi2.value = '';
};

window.removeActivity = function(i) {
  if (!_feeCfg) return;
  _feeCfg.activities.splice(i, 1);
  var el = document.getElementById('activities-list'); if (el) el.innerHTML = renderActivitiesList(_feeCfg.activities);
};

function saveFeeStructure() {
  if (!_feeCfg) return;
  var inputs = document.querySelectorAll('.fee-struct-inp');
  var classWiseFees = {};
  inputs.forEach(function(inp) {
    var cls = inp.getAttribute('data-class');
    var col = inp.getAttribute('data-col');
    if (!classWiseFees[cls]) classWiseFees[cls] = {};
    var v = parseFloat(inp.value);
    if (v > 0) classWiseFees[cls][col] = v;
  });
  _feeCfg.classWise = classWiseFees;
  var cfg = {classWiseFees: classWiseFees, kitItems: _feeCfg.kit, activities: _feeCfg.activities};
  fetch('/api/fee-config', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({config:cfg})})
    .then(function(r){return r.json();}).then(function(){showToast('Fee structure saved','success');})
    .catch(function(){showToast('Failed to save','error');});
}

function saveActivities() {
  if (!_feeCfg) return;
  var cfg = {classWiseFees: _feeCfg.classWise, kitItems: _feeCfg.kit, activities: _feeCfg.activities};
  fetch('/api/fee-config', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({config:cfg})})
    .then(function(r){return r.json();}).then(function(){showToast('Activities saved','success');})
    .catch(function(){showToast('Failed to save','error');});
}

function renderKitItemsList(kit) {
  if (!kit || kit.length === 0) return '<div style="font-size:13px;color:#6B7A9D">No items yet. Add items above.</div>';
  return '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
    kit.map(function(k,i){
      return '<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:#fff;border:1.5px solid #DCE1EF;border-radius:20px">' +
        '<span style="font-size:12px;font-weight:600;color:#0F1E3D">'+k.name+'</span>' +
        '<button onclick="removeKitItem('+i+')" style="width:18px;height:18px;border-radius:50%;border:none;background:#FEE2E2;color:#dc2626;cursor:pointer;font-size:11px;line-height:1;padding:0;flex-shrink:0">×</button>' +
      '</div>';
    }).join('') +
  '</div>';
}

function renderKitPricesForClassHtml(className, kit, classWiseKit) {
  if (!kit || kit.length === 0) return '<div style="font-size:13px;color:#6B7A9D;padding:16px;text-align:center">No kit items defined. Add items above first.</div>';
  var cp = (classWiseKit && classWiseKit[className]) ? classWiseKit[className] : {};
  return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin-bottom:12px">' +
    kit.map(function(k){
      return '<div style="padding:12px;border:1.5px solid #DCE1EF;border-radius:10px;background:#fff">' +
        '<div style="font-size:13px;font-weight:700;color:#0F1E3D;margin-bottom:6px">'+k.name+'</div>' +
        '<input type="number" id="kit-price-'+k.id+'" value="'+(cp[k.id]||'')+'" placeholder="Enter price (₹)" style="width:100%;padding:8px;border:1.5px solid #DCE1EF;border-radius:6px;font-size:13px;box-sizing:border-box;outline:none">' +
      '</div>';
    }).join('') +
  '</div>' +
  '<div style="display:flex;justify-content:flex-end"><button onclick="saveKitPrices()" class="btn btn-primary"><i class="fas fa-save" style="margin-right:6px"></i>Save Prices for '+(className||'Class')+'</button></div>';
}

window.renderKitPricesForClass = function() {
  var sel = document.getElementById('kit-class-sel');
  var cn = sel ? sel.value : '';
  var wrap = document.getElementById('kit-prices-wrap');
  if (wrap && _feeCfg) wrap.innerHTML = renderKitPricesForClassHtml(cn, _feeCfg.kit, _feeCfg.classWiseKit||{});
};

window.addKitItem = function() {
  var name = ((document.getElementById('new-kit-name')||{}).value||'').trim();
  if (!name) { showToast('Enter item name','warning'); return; }
  if (!_feeCfg) return;
  _feeCfg.kit.push({id:name.toLowerCase().replace(/\s+/g,'_')+'_'+Date.now(), name:name});
  var el = document.getElementById('kit-items-list'); if(el) el.innerHTML = renderKitItemsList(_feeCfg.kit);
  var ni = document.getElementById('new-kit-name'); if(ni) ni.value='';
};

window.removeKitItem = function(i) {
  if (!_feeCfg) return;
  _feeCfg.kit.splice(i,1);
  var el = document.getElementById('kit-items-list'); if(el) el.innerHTML = renderKitItemsList(_feeCfg.kit);
};

window.saveKitItems = function() {
  if (!_feeCfg) return;
  var cfg = {classWiseFees:_feeCfg.classWise, kitItems:_feeCfg.kit, classWiseKit:_feeCfg.classWiseKit||{}, activities:_feeCfg.activities};
  fetch('/api/fee-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config:cfg})})
    .then(function(r){return r.json();}).then(function(){showToast('Kit items saved','success');})
    .catch(function(){showToast('Failed to save','error');});
};

function saveKitPrices() {
  if (!_feeCfg) return;
  var sel = document.getElementById('kit-class-sel');
  var className = sel ? sel.value : '';
  if (!className) { showToast('Select a class','warning'); return; }
  if (!_feeCfg.classWiseKit) _feeCfg.classWiseKit = {};
  var classPrices = {};
  (_feeCfg.kit||[]).forEach(function(k){
    var inp = document.getElementById('kit-price-'+k.id);
    var v = parseFloat(inp ? inp.value : '') || 0;
    if (v > 0) classPrices[k.id] = v;
  });
  _feeCfg.classWiseKit[className] = classPrices;
  var cfg = {classWiseFees:_feeCfg.classWise, kitItems:_feeCfg.kit, classWiseKit:_feeCfg.classWiseKit, activities:_feeCfg.activities};
  fetch('/api/fee-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config:cfg})})
    .then(function(r){return r.json();}).then(function(){showToast('Kit prices saved for '+className,'success');})
    .catch(function(){showToast('Failed to save','error');});
}

// ---- Admission Reports Tab ----
function renderAdmReportsTab() {
  return '<div id="adm-rep-wrap"><div style="text-align:center;padding:32px;color:#6B7A9D"><i class="fas fa-spinner fa-spin"></i> Loading…</div></div>';
}

function loadAdmReports() {
  var wrap = document.getElementById('adm-rep-wrap'); if (!wrap) return;
  Promise.all([
    fetch('/api/inquiries').then(function(r){return r.json();}),
    fetch('/api/admissions').then(function(r){return r.json();}),
    fetch('/api/payments').then(function(r){return r.json();}),
  ]).then(function(results) {
    var inq = results[0].items || [];
    var adm = results[1].items || [];
    var pay = results[2].items || [];

    var totalCol = pay.reduce(function(s,p){var d=p.data?JSON.parse(p.data):{};return s+(d.total||0);},0);
    var convRate = inq.length > 0 ? Math.round(inq.filter(function(i){return i.status==='converted';}).length / inq.length * 100) : 0;

    var byStatus = {};
    adm.forEach(function(a){ byStatus[a.status]=(byStatus[a.status]||0)+1; });

    var byClass = {};
    adm.forEach(function(a){ var d=a.data?JSON.parse(a.data):{}; var cls=d.classId||'Unknown'; byClass[cls]=(byClass[cls]||0)+1; });

    var inqBySource = {};
    inq.forEach(function(i){ var d=i.data?JSON.parse(i.data):{};var src=d.source||'Unknown';inqBySource[src]=(inqBySource[src]||0)+1; });

    var admStatus = {'application_submitted':'Submitted','docs_pending':'Docs Pending','docs_verified':'Docs Verified','fees_pending':'Fees Pending','approved':'Approved','rejected':'Rejected','enrolled':'Enrolled'};

    wrap.innerHTML =
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        [{icon:'fa-search',label:'Total Inquiries',val:inq.length,color:'#0F2050'},
         {icon:'fa-file-alt',label:'Total Admissions',val:adm.length,color:'#C4893A'},
         {icon:'fa-graduation-cap',label:'Enrolled',val:adm.filter(function(a){return a.status==='enrolled';}).length,color:'#059669'},
         {icon:'fa-rupee-sign',label:'Total Collection',val:'₹'+totalCol.toLocaleString('en-IN'),color:'#E8B020'},
        ].map(function(s){return '<div class="card" style="border-left:4px solid '+s.color+';padding:16px"><div style="display:flex;align-items:center;gap:12px"><div style="width:40px;height:40px;border-radius:10px;background:'+s.color+'18;display:flex;align-items:center;justify-content:center"><i class="fas '+s.icon+'" style="color:'+s.color+'"></i></div><div><div style="font-size:22px;font-weight:900;color:#0F1E3D">'+s.val+'</div><div style="font-size:12px;color:#6B7A9D">'+s.label+'</div></div></div></div>';}).join('') +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">' +
        '<div class="card"><div class="card-title" style="margin-bottom:14px"><i class="fas fa-chart-pie" style="color:#C4893A"></i> Admissions by Status</div>' +
          Object.keys(byStatus).map(function(s){ var pct=adm.length?Math.round(byStatus[s]/adm.length*100):0; return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:3px"><span>'+(admStatus[s]||s)+'</span><span>'+byStatus[s]+'</span></div><div style="background:#F1F5F9;border-radius:4px;height:7px"><div style="background:#C4893A;height:7px;border-radius:4px;width:'+pct+'%"></div></div></div>'; }).join('') +
        '</div>' +
        '<div class="card"><div class="card-title" style="margin-bottom:14px"><i class="fas fa-school" style="color:#0F2050"></i> Admissions by Class</div>' +
          Object.keys(byClass).map(function(cls){ var pct=adm.length?Math.round(byClass[cls]/adm.length*100):0; return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:3px"><span>'+cls+'</span><span>'+byClass[cls]+'</span></div><div style="background:#F1F5F9;border-radius:4px;height:7px"><div style="background:#0F2050;height:7px;border-radius:4px;width:'+pct+'%"></div></div></div>'; }).join('') +
        '</div>' +
        '<div class="card"><div class="card-title" style="margin-bottom:14px"><i class="fas fa-funnel-dollar" style="color:#059669"></i> Inquiry Sources & Conversion</div>' +
          '<div style="background:#D1FAE5;border:1.5px solid #10b98133;border-radius:10px;padding:14px;margin-bottom:14px;text-align:center"><div style="font-size:28px;font-weight:900;color:#059669">'+convRate+'%</div><div style="font-size:12px;color:#6B7A9D">Conversion Rate</div></div>' +
          Object.keys(inqBySource).map(function(src){ return '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;padding:4px 0;border-bottom:1px solid #F1F5F9"><span>'+src+'</span><span style="color:#0F2050">'+inqBySource[src]+'</span></div>'; }).join('') +
        '</div>' +
      '</div>';
  }).catch(function(){
    var wrap=document.getElementById('adm-rep-wrap'); if(wrap) wrap.innerHTML='<div style="color:#dc2626;padding:20px">Failed to load reports</div>';
  });
}

// ============================================================
// LETTER HEAD
// ============================================================
function renderLetterheadTab() {
  return '<div id="letterhead-wrap"><div style="text-align:center;padding:32px;color:#6B7A9D"><i class="fas fa-spinner fa-spin"></i> Loading…</div></div>';
}

function loadLetterheadConfig() {
  var wrap = document.getElementById('letterhead-wrap'); if (!wrap) return;
  var meta = DB.get().meta;
  var lh = meta.letterhead || {};

  wrap.innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:1100px">' +
      '<div>' +
        '<div class="card" style="margin-bottom:16px">' +
          '<div class="card-title" style="margin-bottom:16px"><i class="fas fa-pen-nib" style="color:#0F2050"></i> Letter Content</div>' +
          '<div class="form-group"><label class="form-label">Salutation / Opening</label>' +
            '<input class="form-control" id="lh-salutation" value="' + ((lh.salutation||'To Whomsoever It May Concern,').replace(/"/g,'&quot;')) + '"/>' +
          '</div>' +
          '<div class="form-group"><label class="form-label">Default Body Text</label>' +
            '<textarea class="form-control" id="lh-body" rows="5" placeholder="Enter default letter body text…">' + (lh.body||'') + '</textarea>' +
          '</div>' +
          '<div class="form-group"><label class="form-label">Closing / Regards</label>' +
            '<input class="form-control" id="lh-closing" value="' + ((lh.closing||'Yours Sincerely,').replace(/"/g,'&quot;')) + '"/>' +
          '</div>' +
        '</div>' +
        '<div class="card" style="margin-bottom:16px">' +
          '<div class="card-title" style="margin-bottom:14px"><i class="fas fa-signature" style="color:#C4893A"></i> Principal\'s Signature</div>' +
          '<div id="lh-sig-preview" style="margin-bottom:12px">' +
            (lh.signatureUrl
              ? '<img src="' + lh.signatureUrl + '" style="width:'+(lh.signatureWidth||120)+'px;height:auto;object-fit:contain;display:block;border:1.5px solid #DCE1EF;border-radius:8px;padding:6px;background:#fff"/>'
              : '<div style="color:#6B7A9D;font-size:13px;padding:12px 0">No signature uploaded yet.</div>') +
          '</div>' +
          (lh.signatureUrl ? (
            '<div style="margin-bottom:14px;background:#F8F9FB;border:1px solid #DCE1EF;border-radius:10px;padding:14px">' +
              '<div style="font-size:11px;font-weight:700;color:#6B7A9D;text-transform:uppercase;margin-bottom:10px"><i class="fas fa-sliders-h"></i> Adjust Signature</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">' +
                '<div>' +
                  '<label style="font-size:12px;font-weight:600;color:#2A3B60;display:flex;justify-content:space-between"><span>Size (Width)</span><span id="sig-w-label">'+(lh.signatureWidth||120)+'px</span></label>' +
                  '<input type="range" id="sig-width" min="50" max="280" step="5" value="'+(lh.signatureWidth||120)+'" oninput="adjustSig()" style="width:100%;margin-top:6px;accent-color:#C4893A">' +
                '</div>' +
                '<div>' +
                  '<label style="font-size:12px;font-weight:600;color:#2A3B60;display:flex;justify-content:space-between"><span>Vertical Position</span><span id="sig-y-label">'+(lh.signatureOffsetY||0)+'px</span></label>' +
                  '<input type="range" id="sig-offsety" min="-30" max="40" step="2" value="'+(lh.signatureOffsetY||0)+'" oninput="adjustSig()" style="width:100%;margin-top:6px;accent-color:#C4893A">' +
                '</div>' +
                '<div>' +
                  '<label style="font-size:12px;font-weight:600;color:#2A3B60;display:flex;justify-content:space-between"><span>Horizontal Position</span><span id="sig-x-label">'+(lh.signatureOffsetX||0)+'px</span></label>' +
                  '<input type="range" id="sig-offsetx" min="-100" max="200" step="5" value="'+(lh.signatureOffsetX||0)+'" oninput="adjustSig()" style="width:100%;margin-top:6px;accent-color:#C4893A">' +
                '</div>' +
              '</div>' +
            '</div>'
          ) : '') +
          '<div style="display:flex;gap:10px;align-items:center">' +
            '<div onclick="document.getElementById(\'lh-sig-input\').click()" style="flex:1;padding:10px 16px;border:2px dashed #DCE1EF;border-radius:8px;text-align:center;cursor:pointer;font-size:13px;color:#6B7A9D" onmouseover="this.style.borderColor=\'#C4893A\'" onmouseout="this.style.borderColor=\'#DCE1EF\'">' +
              '<i class="fas fa-upload" style="margin-right:6px;color:#C4893A"></i>Upload Signature (PNG/JPG)' +
            '</div>' +
            (lh.signatureUrl ? '<button onclick="removeSignature()" style="padding:8px 12px;border-radius:8px;border:1.5px solid #FEE2E2;background:#FEE2E2;color:#dc2626;cursor:pointer;font-size:12px;font-weight:700"><i class="fas fa-times"></i> Remove</button>' : '') +
          '</div>' +
          '<input type="file" id="lh-sig-input" accept="image/*" onchange="uploadSignature(this)" style="display:none">' +
        '</div>' +
        '<div style="display:flex;gap:10px">' +
          '<button onclick="saveLetterhead()" class="btn btn-primary"><i class="fas fa-save" style="margin-right:6px"></i>Save Letter Head</button>' +
          '<button onclick="printLetterhead()" class="btn btn-secondary"><i class="fas fa-print" style="margin-right:6px"></i>Preview &amp; Print</button>' +
        '</div>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:11px;font-weight:700;color:#6B7A9D;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px"><i class="fas fa-eye" style="margin-right:5px"></i>Live Preview</div>' +
        '<div id="lh-preview-box" style="border:1.5px solid #DCE1EF;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">' +
          buildLetterheadHtml(meta, lh) +
        '</div>' +
        '<div style="margin-top:12px;padding:10px 14px;background:#F8F9FB;border-radius:8px;font-size:11px;color:#6B7A9D"><i class="fas fa-info-circle" style="margin-right:4px;color:#1AA6CA"></i>Logo &amp; contact details come from School Settings.</div>' +
      '</div>' +
    '</div>';
}

function buildLetterheadHtml(meta, lh) {
  var logoUrl = meta.schoolLogo || '/static/school-logo.png';
  var schoolName = meta.schoolName || 'SuperKids India Preschool';
  var _raw = meta.schoolAddress || '';
  var address = (_raw.indexOf('\n') !== -1) ? _raw : 'Matoshri Apartment Plot Number 51,\nSector Number 10 Bhosari Pradhikaran,\nPin:411026';
  var phone1 = meta.schoolPhone || '';
  var phone2 = meta.schoolPhone2 || '';
  var email = meta.schoolEmail || '';
  var website = meta.schoolWebsite || 'https://superkidsindia.com';
  var principal = meta.principalName || 'Principal';
  var sigUrl = lh.signatureUrl || '';
  var sigWidth = lh.signatureWidth || 120;
  var sigOffsetY = lh.signatureOffsetY || 0;
  var sigOffsetX = lh.signatureOffsetX || 0;
  var salutation = lh.salutation || 'To Whomsoever It May Concern,';
  var body = lh.body || '[Letter content will appear here…]';
  var closing = lh.closing || 'Yours Sincerely,';
  var today = new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'long', year:'numeric'});
  var ico = function(fa) { return '<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:#29B6F6;color:#fff;font-size:7px;vertical-align:middle;margin-right:4px;flex-shrink:0"><i class="'+fa+'"></i></span>'; };
  var addrHtml = address.replace(/\n/g,'<br>');

  return '<div style="font-family:Georgia,serif;font-size:13px;color:#1a1a2e;background:#fff">' +
    '<div style="background-color:#0F2050">' +
      '<div style="display:flex;align-items:center;padding:18px 24px;gap:16px">' +
        '<img src="'+logoUrl+'" style="width:72px;height:72px;border-radius:50%;border:3px solid #E8B020;background:#fff;object-fit:contain;flex-shrink:0"/>' +
        '<div style="flex:1">' +
          '<div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.3px;font-family:Arial,sans-serif">'+schoolName+'</div>' +
          '<div style="font-size:10px;color:#E8B020;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin-top:4px">Official School Correspondence</div>' +
        '</div>' +
      '</div>' +
      '<div style="background-color:#dcad92;padding:7px 24px;display:flex;justify-content:space-between;align-items:flex-start">' +
        '<div style="font-family:Arial,sans-serif;font-size:11px;color:#0F2050;font-weight:600;line-height:1.9">' +
          (phone1 ? '<div style="display:flex;align-items:center">'+ico('fas fa-phone')+phone1+'</div>' : '') +
          (phone2 ? '<div style="display:flex;align-items:center">'+ico('fas fa-mobile-alt')+phone2+'</div>' : '') +
          (email ? '<div style="display:flex;align-items:center">'+ico('fas fa-envelope')+email+'</div>' : '') +
          '<div style="display:flex;align-items:center">'+ico('fas fa-globe')+website+'</div>' +
        '</div>' +
        '<div style="font-family:Arial,sans-serif;font-size:11px;color:#0F2050;font-weight:600;line-height:1.65;text-align:right;max-width:48%">' +
          '<div style="font-weight:800;margin-bottom:2px">'+ico('fas fa-home')+schoolName+','+'</div>' +
          '<div>'+addrHtml+'</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div style="padding:22px 24px">' +
      '<div style="text-align:right;font-size:12px;color:#555;margin-bottom:18px">Date: '+today+'</div>' +
      '<div style="font-size:13px;color:#1a1a2e;margin-bottom:16px;font-weight:600">'+salutation+'</div>' +
      '<div style="font-size:13px;color:#444;line-height:1.9;min-height:72px;white-space:pre-wrap">'+body+'</div>' +
      '<div style="margin-top:28px;font-size:13px;color:#1a1a2e">'+closing+'</div>' +
      '<div style="margin-top:36px;display:flex;justify-content:space-between;align-items:flex-end">' +
        '<div>' +
          (sigUrl ? '<img src="'+sigUrl+'" style="width:'+sigWidth+'px;height:auto;object-fit:contain;display:block;margin-top:'+sigOffsetY+'px;margin-left:'+sigOffsetX+'px;margin-bottom:4px"/>' :
            '<div style="height:50px;border-bottom:1.5px solid #0F2050;width:170px;margin-bottom:4px"></div>') +
          '<div style="font-size:12px;font-weight:800;color:#0F2050">'+principal+'</div>' +
          '<div style="font-size:11px;color:#666">Principal — '+schoolName+'</div>' +
        '</div>' +
        '<div style="text-align:center">' +
          '<div style="width:72px;height:72px;border:2px dashed #0F2050;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#0F2050;text-align:center;line-height:1.3">SCHOOL<br>STAMP</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div style="background:#F8F9FB;border-top:2px solid #dcad92;padding:7px 22px;text-align:center;font-size:10px;color:#666">' +
      schoolName + ' | ' + address + (website ? ' | ' + website : '') +
    '</div>' +
  '</div>';
}

window.adjustSig = function() {
  var w = parseInt((document.getElementById('sig-width')||{}).value||120);
  var y = parseInt((document.getElementById('sig-offsety')||{}).value||0);
  var x = parseInt((document.getElementById('sig-offsetx')||{}).value||0);
  var wl = document.getElementById('sig-w-label'); if(wl) wl.textContent = w+'px';
  var yl = document.getElementById('sig-y-label'); if(yl) yl.textContent = y+'px';
  var xl = document.getElementById('sig-x-label'); if(xl) xl.textContent = x+'px';
  var prev = document.getElementById('lh-sig-preview');
  if (prev) {
    var img = prev.querySelector('img');
    if (img) { img.style.width = w+'px'; img.style.marginTop = y+'px'; img.style.marginLeft = x+'px'; }
  }
  var lh = Object.assign({}, DB.get().meta.letterhead||{}, {signatureWidth:w, signatureOffsetY:y, signatureOffsetX:x});
  DB.updateMeta({letterhead:lh});
  var pb = document.getElementById('lh-preview-box');
  if (pb) pb.innerHTML = buildLetterheadHtml(DB.get().meta, lh);
};

window.saveLetterhead = function() {
  var existing = DB.get().meta.letterhead || {};
  var lh = {
    salutation: (document.getElementById('lh-salutation')||{}).value || 'To Whomsoever It May Concern,',
    body: (document.getElementById('lh-body')||{}).value || '',
    closing: (document.getElementById('lh-closing')||{}).value || 'Yours Sincerely,',
    signatureUrl: existing.signatureUrl || '',
    signatureWidth: existing.signatureWidth || 120,
    signatureOffsetY: existing.signatureOffsetY || 0,
    signatureOffsetX: existing.signatureOffsetX || 0,
  };
  DB.updateMeta({letterhead: lh});
  var pb = document.getElementById('lh-preview-box');
  if (pb) pb.innerHTML = buildLetterheadHtml(DB.get().meta, lh);
  showToast('Letter head saved','success');
};

window.uploadSignature = function(input) {
  if (!input.files || !input.files[0]) return;
  showToast('Uploading signature…','default');
  var form = new FormData(); form.append('file', input.files[0]);
  fetch('/api/upload?folder=signatures', {method:'POST', body:form})
    .then(function(r){return r.json();})
    .then(function(r){
      if (r.error) { showToast('Upload failed','error'); return; }
      var sigUrl = '/r2/' + r.key;
      var lh = Object.assign({}, DB.get().meta.letterhead || {}, {signatureUrl: sigUrl});
      DB.updateMeta({letterhead: lh});
      var prev = document.getElementById('lh-sig-preview');
      if (prev) { prev.innerHTML = '<img src="'+sigUrl+'" style="width:'+(lh.signatureWidth||120)+'px;height:auto;object-fit:contain;display:block;border:1.5px solid #DCE1EF;border-radius:8px;padding:6px;background:#fff"/>'; }
      var pb = document.getElementById('lh-preview-box');
      if (pb) pb.innerHTML = buildLetterheadHtml(DB.get().meta, lh);
      showToast('Signature uploaded','success');
    }).catch(function(){showToast('Upload failed','error');});
};

window.removeSignature = function() {
  var lh = Object.assign({}, DB.get().meta.letterhead || {}, {signatureUrl: ''});
  DB.updateMeta({letterhead: lh});
  loadLetterheadConfig();
  showToast('Signature removed','success');
};

window.printLetterhead = function() {
  var meta = DB.get().meta;
  var lh = {
    salutation: (document.getElementById('lh-salutation')||{}).value || (meta.letterhead||{}).salutation || 'To Whomsoever It May Concern,',
    body: (document.getElementById('lh-body')||{}).value || (meta.letterhead||{}).body || '',
    closing: (document.getElementById('lh-closing')||{}).value || (meta.letterhead||{}).closing || 'Yours Sincerely,',
    signatureUrl: (meta.letterhead||{}).signatureUrl || '',
    signatureWidth: (meta.letterhead||{}).signatureWidth || 120,
    signatureOffsetY: (meta.letterhead||{}).signatureOffsetY || 0,
    signatureOffsetX: (meta.letterhead||{}).signatureOffsetX || 0,
  };
  var logoUrl = meta.schoolLogo || '/static/school-logo.png';
  var schoolName = meta.schoolName || 'SuperKids India Preschool';
  var _rawAddr = meta.schoolAddress || '';
  var address = (_rawAddr.indexOf('\n') !== -1) ? _rawAddr : 'Matoshri Apartment Plot Number 51,\nSector Number 10 Bhosari Pradhikaran,\nPin:411026';
  var phone1 = meta.schoolPhone || '';
  var phone2 = meta.schoolPhone2 || '';
  var email = meta.schoolEmail || '';
  var website = meta.schoolWebsite || 'https://superkidsindia.com';
  var principal = meta.principalName || 'Principal';
  var today = new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'long', year:'numeric'});
  var addrHtml = address.replace(/\n/g,'<br>');

  var win = window.open('', '_blank', 'width=820,height=700');
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"><title>Letter Head – '+schoolName+'</title><style>' +
    '@page{margin:6mm}' +
    'body{font-family:Georgia,serif;font-size:13px;color:#1a1a2e;margin:0;padding:0;max-width:800px;margin:0 auto;print-color-adjust:exact;-webkit-print-color-adjust:exact;color-adjust:exact}' +
    '.hdr{background-color:#0F2050}' +
    '.hdr-top{display:flex;align-items:center;padding:18px 28px;gap:18px}' +
    '.hdr-top img{width:72px;height:72px;border-radius:50%;border:3px solid #E8B020;background:#fff;object-fit:contain;flex-shrink:0}' +
    '.hdr-name{font-size:22px;font-weight:900;color:#fff;font-family:Arial,sans-serif;letter-spacing:-0.3px}' +
    '.hdr-sub{font-size:10px;color:#E8B020;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin-top:4px}' +
    '.hdr-bar{background-color:#dcad92;padding:7px 28px;display:flex;justify-content:space-between;align-items:flex-start}' +
    '.ico-badge{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:#29B6F6;color:#fff;font-size:7px;flex-shrink:0;margin-right:4px}' +
    '.hdr-bl{font-family:Arial,sans-serif;font-size:11px;color:#0F2050;font-weight:600;line-height:1.9}' +
    '.hdr-br{font-family:Arial,sans-serif;font-size:11px;color:#0F2050;font-weight:600;line-height:1.65;text-align:right;max-width:48%}' +
    '.body{padding:28px}' +
    '.sig-line{height:50px;border-bottom:1.5px solid #0F2050;width:180px;margin-bottom:5px}' +
    '.stamp{width:72px;height:72px;border:2px dashed #0F2050;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#0F2050;text-align:center;line-height:1.4}' +
    '.footer{text-align:center;font-size:10px;color:#555;padding:6px 28px;margin-top:6px}' +
    '.pborder{box-sizing:border-box}' +
    '@media print{body{max-width:100%;print-color-adjust:exact;-webkit-print-color-adjust:exact;color-adjust:exact}' +
    '.hdr{background-color:#0F2050!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}' +
    '.hdr-bar{background-color:#dcad92!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}' +
    '.pborder{border:1pt solid #0F2050!important;box-sizing:border-box;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}}' +
  '</style></head><body><div class="pborder">' +
    '<div class="hdr">' +
      '<div class="hdr-top"><img src="'+logoUrl+'" alt="Logo"/><div style="flex:1"><div class="hdr-name">'+schoolName+'</div><div class="hdr-sub">Official School Correspondence</div></div></div>' +
      '<div class="hdr-bar">' +
        '<div class="hdr-bl">' +
          (phone1 ? '<div style="display:flex;align-items:center"><span class="ico-badge"><i class="fas fa-phone"></i></span>'+phone1+'</div>' : '') +
          (phone2 ? '<div style="display:flex;align-items:center"><span class="ico-badge"><i class="fas fa-mobile-alt"></i></span>'+phone2+'</div>' : '') +
          (email ? '<div style="display:flex;align-items:center"><span class="ico-badge"><i class="fas fa-envelope"></i></span>'+email+'</div>' : '') +
          '<div style="display:flex;align-items:center"><span class="ico-badge"><i class="fas fa-globe"></i></span>'+website+'</div>' +
        '</div>' +
        '<div class="hdr-br">' +
          '<div style="font-weight:800;margin-bottom:2px"><span class="ico-badge"><i class="fas fa-home"></i></span>'+schoolName+','+'</div>' +
          '<div>'+addrHtml+'</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="body">' +
      '<div style="text-align:right;font-size:12px;color:#555;margin-bottom:20px">Date: '+today+'</div>' +
      '<div style="margin-bottom:18px;font-weight:600">'+lh.salutation+'</div>' +
      '<div style="line-height:1.9;min-height:100px;white-space:pre-wrap">'+lh.body+'</div>' +
      '<div style="margin-top:30px;margin-bottom:44px">'+lh.closing+'</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end">' +
        '<div>' +
          (lh.signatureUrl ? '<img src="'+lh.signatureUrl+'" style="width:'+(lh.signatureWidth||120)+'px;height:auto;object-fit:contain;display:block;margin-top:'+(lh.signatureOffsetY||0)+'px;margin-left:'+(lh.signatureOffsetX||0)+'px;margin-bottom:5px"/>' : '<div class="sig-line"></div>') +
          '<div style="font-weight:800;color:#0F2050">'+principal+'</div>' +
          '<div style="font-size:11px;color:#666">Principal — '+schoolName+'</div>' +
        '</div>' +
        '<div class="stamp">SCHOOL<br>STAMP</div>' +
      '</div>' +
    '</div>' +
  '</div>' +
  '<div class="footer">'+schoolName+' | '+address+(website ? ' | '+website : '')+'</div>' +
  '</body></html>');
  win.document.close();
  setTimeout(function(){ win.print(); }, 500);
};

// ── Receipts Management Tab ──────────────────────────────────────────────────
function renderReceiptsTab() {
  return '<div id="receipts-mgmt-wrap"><div style="text-align:center;padding:40px;color:#888"><i class="fas fa-spinner fa-spin fa-2x"></i></div></div>';
}

function loadReceiptsManagement() {
  var wrap = document.getElementById('receipts-mgmt-wrap');
  if (!wrap) return;
  fetch('/api/payments')
    .then(function(r){ return r.json(); })
    .then(function(data) {
      var payments = data.items || [];
      if (!payments.length) {
        wrap.innerHTML = '<div style="padding:32px;text-align:center;color:#888">No fee receipts found.</div>';
        return;
      }
      var html = '<div style="overflow-x:auto">' +
        '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
        '<thead><tr style="background:#0F2050;color:#fff">' +
        '<th style="padding:10px 8px;text-align:left">Receipt#</th>' +
        '<th style="padding:10px 8px;text-align:left">Student</th>' +
        '<th style="padding:10px 8px;text-align:left">Class</th>' +
        '<th style="padding:10px 8px;text-align:left">Amount</th>' +
        '<th style="padding:10px 8px;text-align:left">Date</th>' +
        '<th style="padding:10px 8px;text-align:left">Month</th>' +
        '<th style="padding:10px 8px;text-align:center">Action</th>' +
        '</tr></thead><tbody>';
      payments.forEach(function(p, i) {
        var d = {};
        try { d = typeof p.data === 'string' ? JSON.parse(p.data) : (p.data || {}); } catch(e) {}
        var bg = i % 2 === 0 ? '#fff' : '#f8f5f0';
        var amt = '&#8377;' + Number(p.amount || d.total || d.amount || d.subtotal || 0).toLocaleString('en-IN');
        var dt = p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '-';
        var studentName = p.student_name || d.studentName || d.student_name || '-';
        var className = p.class_name || d.className || d.class_name || '-';
        var feeMonth = p.fee_month || d.feeMonth || d.fee_month || d.month || '-';
        var receiptNo = p.receipt_number || d.receiptNo || d.receiptNumber || p.id;
        html += '<tr style="background:' + bg + ';border-bottom:1px solid #e0d6c8">' +
          '<td style="padding:9px 8px;font-weight:600;color:#0F2050">#' + receiptNo + '</td>' +
          '<td style="padding:9px 8px">' + studentName + '</td>' +
          '<td style="padding:9px 8px">' + className + '</td>' +
          '<td style="padding:9px 8px;font-weight:600;color:#27ae60">' + amt + '</td>' +
          '<td style="padding:9px 8px">' + dt + '</td>' +
          '<td style="padding:9px 8px">' + feeMonth + '</td>' +
          '<td style="padding:9px 8px;text-align:center">' +
            '<button onclick="deleteReceipt(\'' + p.id + '\')" style="background:#c0392b;color:#fff;border:none;border-radius:4px;padding:5px 12px;cursor:pointer;font-size:12px"><i class="fas fa-trash-alt"></i> Delete</button>' +
          '</td></tr>';
      });
      html += '</tbody></table></div>';
      wrap.innerHTML = '<div style="margin-bottom:12px;color:#c0392b;font-size:13px"><i class="fas fa-exclamation-triangle"></i> Deleting a receipt is permanent and cannot be undone.</div>' + html;
    })
    .catch(function(e) {
      wrap.innerHTML = '<div style="padding:32px;color:#c0392b">Failed to load receipts: ' + e.message + '</div>';
    });
}

window.deleteReceipt = function(id) {
  confirmDialog('Are you sure you want to permanently delete this receipt? This cannot be undone.', function() {
    fetch('/api/payments/' + id, { method: 'DELETE' })
      .then(function(r) {
        if (!r.ok) throw new Error('Server error ' + r.status);
        return r.json();
      })
      .then(function() {
        showToast('Receipt deleted successfully.');
        loadReceiptsManagement();
      })
      .catch(function(e) {
        showToast('Failed to delete receipt: ' + e.message, 'error');
      });
  }, 'Delete Receipt', true);
};

// ── Admissions Management Tab ────────────────────────────────────────────────
var ADM_STATUS_LABEL = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected', waitlisted: 'Waitlisted',
  application_submitted: 'Submitted', under_review: 'Under Review'
};
var ADM_STATUS_COLOR = {
  pending: '#e67e22', approved: '#27ae60', rejected: '#c0392b', waitlisted: '#8e44ad',
  application_submitted: '#2980b9', under_review: '#f39c12'
};

function renderAdmissionsManagementTab() {
  return '<div id="adm-mgmt-wrap"><div style="text-align:center;padding:40px;color:#888"><i class="fas fa-spinner fa-spin fa-2x"></i></div></div>';
}

function loadAdmissionsManagement() {
  var wrap = document.getElementById('adm-mgmt-wrap');
  if (!wrap) return;
  var isSuperAdmin = (Session.current() || {}).role === 'superadmin';
  fetch('/api/admissions')
    .then(function(r){ return r.json(); })
    .then(function(data) {
      var admissions = data.items || [];
      if (!admissions.length) {
        wrap.innerHTML = '<div style="padding:32px;text-align:center;color:#888">No admission records found.</div>';
        return;
      }
      var html = '<div style="overflow-x:auto">' +
        '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
        '<thead><tr style="background:#0F2050;color:#fff">' +
        '<th style="padding:10px 8px;text-align:left">Adm#</th>' +
        '<th style="padding:10px 8px;text-align:left">Student Name</th>' +
        '<th style="padding:10px 8px;text-align:left">Class</th>' +
        '<th style="padding:10px 8px;text-align:left">Parent</th>' +
        '<th style="padding:10px 8px;text-align:left">Date</th>' +
        '<th style="padding:10px 8px;text-align:center">Status</th>' +
        '<th style="padding:10px 8px;text-align:center">Actions</th>' +
        '</tr></thead><tbody>';
      admissions.forEach(function(a, i) {
        var d = {};
        try { d = typeof a.data === 'string' ? JSON.parse(a.data) : (a.data || {}); } catch(e) {}
        var bg = i % 2 === 0 ? '#fff' : '#f8f5f0';
        var status = a.status || 'pending';
        var statusColor = ADM_STATUS_COLOR[status] || '#888';
        var statusLabel = ADM_STATUS_LABEL[status] || status;
        var dt = a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : '-';
        var studentName = d.studentName || d.student_name || d.childName || d.child_name || '-';
        var className = d.className || d.class_name || d.classApplied || a.class_id || '-';
        var parentName = d.parentName || d.parent_name || d.guardianName || d.fatherName || d.motherName || '-';
        var admNo = d.admissionNo || a.id;
        var isApproved = (status === 'approved');
        var approveBtn = !isApproved
          ? '<button onclick="approveAdmission(\'' + a.id + '\')" style="background:#27ae60;color:#fff;border:none;border-radius:4px;padding:5px 10px;cursor:pointer;font-size:12px;margin-right:4px"><i class="fas fa-check"></i> Approve</button>'
          : '';
        var canDelete = isSuperAdmin || !isApproved;
        var deleteBtn = canDelete
          ? '<button onclick="deleteAdmission(\'' + a.id + '\')" style="background:#c0392b;color:#fff;border:none;border-radius:4px;padding:5px 10px;cursor:pointer;font-size:12px"><i class="fas fa-trash-alt"></i> Delete</button>'
          : '<span style="font-size:12px;color:#27ae60;font-weight:600"><i class="fas fa-check-circle"></i> Approved</span>';
        html += '<tr style="background:' + bg + ';border-bottom:1px solid #e0d6c8">' +
          '<td style="padding:9px 8px;font-weight:600;color:#0F2050">' + admNo + '</td>' +
          '<td style="padding:9px 8px">' + studentName + '</td>' +
          '<td style="padding:9px 8px">' + className + '</td>' +
          '<td style="padding:9px 8px">' + parentName + '</td>' +
          '<td style="padding:9px 8px">' + dt + '</td>' +
          '<td style="padding:9px 8px;text-align:center"><span style="background:' + statusColor + ';color:#fff;border-radius:12px;padding:3px 10px;font-size:12px;font-weight:600">' + statusLabel + '</span></td>' +
          '<td style="padding:9px 8px;text-align:center">' +
            approveBtn + deleteBtn +
          '</td></tr>';
      });
      html += '</tbody></table></div>';
      wrap.innerHTML = '<div style="margin-bottom:12px;color:#c0392b;font-size:13px"><i class="fas fa-exclamation-triangle"></i> Use Approve to confirm an admission. Deleting is permanent and cannot be undone.</div>' + html;
    })
    .catch(function(e) {
      wrap.innerHTML = '<div style="padding:32px;color:#c0392b">Failed to load admissions: ' + e.message + '</div>';
    });
}

window.approveAdmission = function(id) {
  confirmDialog('Approve this admission? The student status will be set to Approved.', function() {
    fetch('/api/admissions/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    })
      .then(function(r) {
        if (!r.ok) throw new Error('Server error ' + r.status);
        return r.json();
      })
      .then(function() {
        showToast('Admission approved successfully.');
        loadAdmissionsManagement();
      })
      .catch(function(e) {
        showToast('Failed to approve admission: ' + e.message, 'error');
      });
  }, 'Approve Admission', false);
};

window.deleteAdmission = function(id) {
  confirmDialog('Are you sure you want to permanently delete this admission record? This cannot be undone.', function() {
    fetch('/api/admissions/' + id, { method: 'DELETE' })
      .then(function(r) {
        if (!r.ok) throw new Error('Server error ' + r.status);
        return r.json();
      })
      .then(function() {
        showToast('Admission deleted successfully.');
        loadAdmissionsManagement();
      })
      .catch(function(e) {
        showToast('Failed to delete admission: ' + e.message, 'error');
      });
  }, 'Delete Admission', true);
};

registerRoute('management', renderManagement);
registerRoute('my-profile', renderMyProfile);
