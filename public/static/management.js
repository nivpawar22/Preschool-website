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
      { id: 'acc-admins', label: 'Accounting Admins', icon: 'fa-calculator' },
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
      { id: 'documents', label: 'Documents', icon: 'fa-file-alt' },
    ]},
    { label: 'Student Portal', color: '#10b981', tabs: [
      { id: 'exam-manager', label: 'Exam Schedule', icon: 'fa-clipboard-list' },
      { id: 'meal-manager', label: 'Meal Menu', icon: 'fa-utensils' },
      { id: 'fee-manager', label: 'Fee Management', icon: 'fa-rupee-sign' },
      { id: 'grievance-manager', label: 'Grievances', icon: 'fa-comment-dots' },
    ]},
    { label: 'System', color: '#1AA6CA', tabs: [
      { id: 'log', label: 'Activity Log', icon: 'fa-history' },
      { id: 'settings', label: 'School Settings', icon: 'fa-cog' },
    ]},
  ];

  const tabContent = {
    subadmins: renderSubAdminsTab(),
    'adm-admins': renderAdmAdminsTab(),
    'acc-admins': renderAccAdminsTab(),
    parents: renderParentsTab(),
    team: renderTeamTab(),
    reviews: renderReviewsTab(),
    academic: renderAcademicTab(),
    feeconfig: renderFeeConfigTab(),
    'adm-mgmt': renderAdmissionsManagementTab(),
    receipts: renderReceiptsTab(),
    'adm-reports': renderAdmReportsTab(),
    letterhead: renderLetterheadTab(),
    documents: renderDocumentsTab(),
    'exam-manager': renderExamManagerTab(),
    'meal-manager': renderMealManagerTab(),
    'fee-manager': renderFeeManagerTab(),
    'grievance-manager': renderGrievanceManagerTab(),
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
  if (mgmtTab === 'documents') setTimeout(loadDocumentsTab, 50);
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

function renderAccAdminsTab() {
  const accAdmins = DB.get().users.filter(function(u){ return u.role === 'accounting' && !u.deleted; });
  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-calculator" style="color:#8b5cf6"></i> Accounting Admins (${accAdmins.length})</div>
        <button class="btn btn-primary" onclick="openAddAccAdminModal()"><i class="fas fa-plus"></i> Add Accounting Admin</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${accAdmins.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#888;padding:24px">No Accounting Admins found. Add one above.</td></tr>' :
              accAdmins.map(function(u) {
                return `<tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      ${avatarHtml(u.name, u.avatar)}
                      <div style="font-weight:600">${u.name}</div>
                    </div>
                  </td>
                  <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:6px">${u.username}</code></td>
                  <td>${u.email || '-'}</td>
                  <td>${u.phone || '-'}</td>
                  <td><span class="badge ${u.active?'badge-green':'badge-red'}">${u.active?'Active':'Inactive'}</span></td>
                  <td>
                    <div style="display:flex;gap:4px;flex-wrap:wrap">
                      <button class="btn btn-xs btn-primary" title="Edit" onclick="openEditAccAdminModal('${u.id}')"><i class="fas fa-edit"></i></button>
                      <button class="btn btn-xs" style="${u.active?'background:#FEF7E0;color:#92400e':'background:#d1fae5;color:#065f46'}" onclick="toggleAccAdminStatus('${u.id}')">
                        <i class="fas ${u.active?'fa-user-slash':'fa-user-check'}"></i>
                      </button>
                      ${u.phone ? `<button class="btn btn-xs btn-whatsapp" title="WhatsApp" onclick="wa('${u.phone}','Hello ${u.name}')"><i class="fab fa-whatsapp"></i></button>` : ''}
                      ${Session.canDelete() ? `<button class="btn btn-xs btn-danger" title="Delete" onclick="deleteAccAdmin('${u.id}')"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                  </td>
                </tr>`;
              }).join('')
            }
          </tbody>
        </table>
      </div>
      <div style="padding:12px 16px;font-size:12px;color:#6B7A9D;border-top:1px solid #EDF0F7">
        <i class="fas fa-info-circle"></i> Accounting Admins can manage Fee Collection, Purchase Orders, and Expenses. They do NOT have access to the Management tab.
      </div>
    </div>`;
}

function openAddAccAdminModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <h2 class="modal-title"><i class="fas fa-calculator" style="color:#8b5cf6;margin-right:8px"></i>Add Accounting Admin</h2>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Full Name *</label><input class="form-control" id="aac-name" placeholder="Full name"/></div>
          <div class="form-group"><label class="form-label">Email *</label><input class="form-control" id="aac-email" type="email" placeholder="accounts@school.com"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Username *</label><input class="form-control" id="aac-username" placeholder="e.g. accounts1"/></div>
          <div class="form-group"><label class="form-label">Password *</label><input class="form-control" id="aac-password" type="password" placeholder="Strong password"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="aac-phone" placeholder="+91-98000-00000"/></div>
          <div class="form-group">
            <label class="form-label">Avatar Color</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
              ${['#8b5cf6','#1AA6CA','#10b981','#E8B020','#ef4444','#C4893A','#06b6d4','#f97316'].map(c => `
                <div onclick="document.getElementById('aac-avatar').value='${c}';this.parentElement.querySelectorAll('.aac-opt').forEach(el=>el.style.outline='none');this.style.outline='3px solid #1e293b'"
                     class="aac-opt" style="width:32px;height:32px;border-radius:50%;background:${c};cursor:pointer${c==='#8b5cf6'?';outline:3px solid #1e293b':''}"></div>`).join('')}
              <input type="hidden" id="aac-avatar" value="#8b5cf6"/>
            </div>
          </div>
        </div>
        <div style="background:#F0EBFF;border-radius:10px;padding:12px 16px;margin-top:8px;font-size:13px;color:#4c1d95">
          <i class="fas fa-lock" style="margin-right:6px"></i>
          <strong>Permissions:</strong> Fee Collection, Purchase Orders, Expenses &amp; Salaries
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNewAccAdmin()"><i class="fas fa-save"></i> Create Account</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveNewAccAdmin() {
  const data = DB.get();
  const name = document.getElementById('aac-name').value.trim();
  const email = document.getElementById('aac-email').value.trim();
  const username = document.getElementById('aac-username').value.trim();
  const password = document.getElementById('aac-password').value.trim();
  if (!name || !email || !username || !password) { showToast('Please fill all required fields', 'error'); return; }
  if (data.users.find(u => u.username === username)) { showToast('Username already exists', 'error'); return; }
  const u = {
    id: DB.genId('acc'), role: 'accounting', name, email, username, password,
    phone: document.getElementById('aac-phone').value.trim(),
    avatar: document.getElementById('aac-avatar').value || '#8b5cf6',
    active: true, deleted: false, createdAt: new Date().toISOString().split('T')[0]
  };
  data.users.push(u);
  DB.commit();
  DB.log(Session.current().id, 'CREATE_ACC_ADMIN', `Created ${name} (${username})`);
  document.querySelector('.modal-overlay').remove();
  showToast(`Accounting Admin ${name} created!`, 'success');
  renderManagement();
}

function openEditAccAdminModal(userId) {
  const data = DB.get();
  const u = data.users.find(x => x.id === userId);
  if (!u) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <h2 class="modal-title">Edit Accounting Admin</h2>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Full Name</label><input class="form-control" id="eaac-name" value="${u.name}"/></div>
          <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="eaac-email" type="email" value="${u.email||''}"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="eaac-phone" value="${u.phone||''}"/></div>
          <div class="form-group"><label class="form-label">New Password (leave blank to keep)</label><input class="form-control" id="eaac-pass" type="password" placeholder="New password"/></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEditAccAdmin('${userId}')"><i class="fas fa-save"></i> Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveEditAccAdmin(userId) {
  const data = DB.get();
  const u = data.users.find(x => x.id === userId);
  if (!u) return;
  u.name = document.getElementById('eaac-name').value.trim() || u.name;
  u.email = document.getElementById('eaac-email').value.trim();
  u.phone = document.getElementById('eaac-phone').value.trim();
  const np = document.getElementById('eaac-pass').value.trim();
  if (np) u.password = np;
  DB.commit();
  DB.log(Session.current().id, 'EDIT_ACC_ADMIN', `Edited ${u.name}`);
  document.querySelector('.modal-overlay').remove();
  showToast('Accounting Admin updated!', 'success');
  renderManagement();
}

function toggleAccAdminStatus(userId) {
  const data = DB.get();
  const u = data.users.find(x => x.id === userId);
  if (!u) return;
  u.active = !u.active;
  DB.commit();
  showToast(`${u.name} ${u.active ? 'activated' : 'deactivated'}!`, 'success');
  renderManagement();
}

function deleteAccAdmin(userId) {
  const data = DB.get();
  const u = data.users.find(x => x.id === userId);
  if (!u) return;
  confirmDialog(`Delete ${u.name}? This cannot be undone.`, () => {
    u.deleted = true;
    DB.commit();
    DB.log(Session.current().id, 'DELETE_ACC_ADMIN', `Deleted ${u.name}`);
    showToast('Accounting Admin deleted', 'warning');
    renderManagement();
  });
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
window._actLogLimit = window._actLogLimit || 50;

function exportActivityLogCSV() {
  const data = DB.get();
  const logs = data.activityLog;
  if (!logs.length) { showToast('No logs to export', 'warning'); return; }
  const rows = [['Time', 'User', 'Action', 'Details']];
  logs.forEach(function(l) {
    const u = DB.getUser(l.userId);
    rows.push([
      new Date(l.time).toLocaleString('en-US'),
      u ? u.name : (l.userId || ''),
      l.action || '',
      (l.details || '').replace(/"/g, '""')
    ]);
  });
  const csv = rows.map(function(r) { return r.map(function(c) { return '"' + c + '"'; }).join(','); }).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'activity-log-' + new Date().toISOString().split('T')[0] + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  showToast('Log exported', 'success');
}

function renderActivityLogTab() {
  const data = DB.get();
  const allLogs = data.activityLog;
  const limit = window._actLogLimit;
  const logs = limit === 0 ? allLogs : allLogs.slice(0, limit);

  return `
    <div class="card">
      <div class="card-header" style="flex-wrap:wrap;gap:8px">
        <div class="card-title"><i class="fas fa-history" style="color:#1AA6CA"></i> Activity Log (${allLogs.length} total)</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:12px;color:#6B7A9D;font-weight:600">Show:</span>
          ${[50, 100, 0].map(function(n) {
            return '<button onclick="window._actLogLimit=' + n + ';renderManagement()" class="btn btn-sm ' + (limit === n ? 'btn-primary' : 'btn-secondary') + '" style="font-size:11px">' + (n === 0 ? 'All' : 'Last ' + n) + '</button>';
          }).join('')}
          <button class="btn btn-secondary btn-sm" onclick="exportActivityLogCSV()" title="Export CSV"><i class="fas fa-download"></i> Export CSV</button>
          <button class="btn btn-secondary btn-sm" onclick="clearActivityLog()"><i class="fas fa-trash"></i> Clear Log</button>
        </div>
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
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:1000px">
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
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:16px"><i class="fas fa-stamp" style="color:#C4893A"></i> Document Stamp &amp; Signature</div>
          <p style="font-size:12px;color:#6B7A9D;margin-bottom:16px">These will appear on all printed documents (Admit Cards, Certificates, HR Letters). Upload PNG/JPG with transparent background for best results.</p>

          <!-- School Stamp -->
          <div style="margin-bottom:20px">
            <label class="form-label"><i class="fas fa-stamp"></i> School Stamp / Seal</label>
            <div style="display:flex;align-items:center;gap:14px;padding:12px;background:#f8fafc;border:1px solid #DCE1EF;border-radius:10px;margin-top:6px">
              <div id="stamp-preview" style="width:80px;height:80px;border:2px dashed #DCE1EF;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff;flex-shrink:0">
                ${getDocStamp() ? `<img src="${getDocStamp()}" style="width:76px;height:76px;object-fit:contain;border-radius:50%"/>` : '<i class="fas fa-stamp" style="font-size:28px;color:#DCE1EF"></i>'}
              </div>
              <div style="flex:1">
                <input type="file" id="stamp-upload" accept="image/*" style="display:none" onchange="previewDocImage(this,'stamp-preview','set-stamp-data')"/>
                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('stamp-upload').click()"><i class="fas fa-upload"></i> Upload Stamp</button>
                ${getDocStamp() ? `<button class="btn btn-sm" style="margin-left:8px;background:#fee2e2;color:#dc2626;border:none" onclick="clearDocImage('stamp-preview','set-stamp-data','schoolStamp')"><i class="fas fa-trash"></i> Remove</button>` : ''}
                <div style="font-size:11px;color:#6B7A9D;margin-top:6px">Recommended: Round stamp image, 200×200px, PNG with transparent bg</div>
                <input type="hidden" id="set-stamp-data" value=""/>
              </div>
            </div>
            <div class="form-row" style="margin-top:10px">
              <div class="form-group"><label class="form-label" style="font-size:11px">Stamp Size (px)</label><input class="form-control" id="set-stamp-size" type="number" min="40" max="200" value="${meta.stampSize || 80}"/></div>
              <div class="form-group"><label class="form-label" style="font-size:11px">Horizontal Align</label><select class="form-control" id="set-stamp-halign"><option value="left"${(meta.stampHAlign||'right')==='left'?' selected':''}>Left</option><option value="center"${(meta.stampHAlign||'right')==='center'?' selected':''}>Center</option><option value="right"${(meta.stampHAlign||'right')==='right'?' selected':''}>Right</option></select></div>
              <div class="form-group"><label class="form-label" style="font-size:11px">Vertical Position</label><select class="form-control" id="set-stamp-valign"><option value="above"${(meta.stampVAlign||'above')==='above'?' selected':''}>Above signature</option><option value="overlap"${(meta.stampVAlign||'above')==='overlap'?' selected':''}>Overlap signature</option></select></div>
            </div>
          </div>

          <!-- Principal Signature -->
          <div>
            <label class="form-label"><i class="fas fa-signature"></i> Principal / Authorised Signature</label>
            <div style="display:flex;align-items:center;gap:14px;padding:12px;background:#f8fafc;border:1px solid #DCE1EF;border-radius:10px;margin-top:6px">
              <div id="sign-preview" style="width:120px;height:60px;border:2px dashed #DCE1EF;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff;flex-shrink:0">
                ${getDocSign() ? `<img src="${getDocSign()}" style="max-width:116px;max-height:56px;object-fit:contain"/>` : '<i class="fas fa-signature" style="font-size:24px;color:#DCE1EF"></i>'}
              </div>
              <div style="flex:1">
                <input type="file" id="sign-upload" accept="image/*" style="display:none" onchange="previewDocImage(this,'sign-preview','set-sign-data')"/>
                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('sign-upload').click()"><i class="fas fa-upload"></i> Upload Signature</button>
                ${getDocSign() ? `<button class="btn btn-sm" style="margin-left:8px;background:#fee2e2;color:#dc2626;border:none" onclick="clearDocImage('sign-preview','set-sign-data','principalSignature')"><i class="fas fa-trash"></i> Remove</button>` : ''}
                <div style="font-size:11px;color:#6B7A9D;margin-top:6px">Recommended: PNG with white/transparent background, 300×100px</div>
                <input type="hidden" id="set-sign-data" value=""/>
              </div>
            </div>
            <div class="form-row" style="margin-top:10px">
              <div class="form-group"><label class="form-label" style="font-size:11px">Signature Width (px)</label><input class="form-control" id="set-sign-width" type="number" min="60" max="300" value="${meta.signWidth || 140}"/></div>
              <div class="form-group"><label class="form-label" style="font-size:11px">Signature Height (px)</label><input class="form-control" id="set-sign-height" type="number" min="30" max="150" value="${meta.signHeight || 55}"/></div>
              <div class="form-group"><label class="form-label" style="font-size:11px">Horizontal Align</label><select class="form-control" id="set-sign-halign"><option value="left"${(meta.signHAlign||'right')==='left'?' selected':''}>Left</option><option value="center"${(meta.signHAlign||'right')==='center'?' selected':''}>Center</option><option value="right"${(meta.signHAlign||'right')==='right'?' selected':''}>Right</option></select></div>
            </div>
          </div>

          <button class="btn btn-primary" style="margin-top:8px" onclick="saveDocAssets()"><i class="fas fa-save"></i> Save Stamp &amp; Signature</button>
        </div>

        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:16px"><i class="fas fa-database" style="color:#1AA6CA"></i> Backup &amp; Restore</div>
          <p style="font-size:12px;color:#6B7A9D;margin-bottom:16px">Export a full backup of all school data by academic year. Backups are downloaded as JSON files and can be restored later.</p>

          <!-- Export -->
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px;margin-bottom:14px">
            <div style="font-weight:700;color:#0369a1;margin-bottom:10px;font-size:13px"><i class="fas fa-download"></i> Export Backup</div>
            <div class="form-row" style="margin-bottom:10px">
              <div class="form-group" style="margin-bottom:0">
                <label class="form-label" style="font-size:11px">Academic Year</label>
                <select class="form-control" id="backup-year" style="font-size:13px">
                  ${(function() {
                    var d = DB.get();
                    var years = new Set();
                    var cy = new Date().getFullYear();
                    // Add years from students join dates, fee records, exams etc
                    (d.students||[]).forEach(function(s){ if(s.joinDate) years.add(s.joinDate.slice(0,4)); });
                    (d.feeRecords||[]).forEach(function(f){ if(f.year) years.add(f.year.slice(0,4)); });
                    (d.exams||[]).forEach(function(e){ if(e.date) years.add(e.date.slice(0,4)); });
                    // Always include current and last 5 years
                    for(var i=0;i<=5;i++) years.add(String(cy-i));
                    return Array.from(years).sort().reverse().map(function(y) {
                      var ay = y + '-' + String(parseInt(y)+1).slice(2);
                      return '<option value="' + y + '">' + ay + '</option>';
                    }).join('');
                  })()}
                  <option value="all">All Years (Full Backup)</option>
                </select>
              </div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="exportBackup()"><i class="fas fa-download"></i> Download Backup</button>
          </div>

          <!-- Import -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin-bottom:14px">
            <div style="font-weight:700;color:#15803d;margin-bottom:8px;font-size:13px"><i class="fas fa-upload"></i> Restore Backup</div>
            <p style="font-size:11px;color:#166534;margin-bottom:10px">Upload a previously exported JSON backup file. Existing data will be <strong>merged</strong> — existing records are kept, backup records are added.</p>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <input type="file" id="restore-file" accept=".json" style="display:none" onchange="restoreBackup(this)"/>
              <button class="btn btn-sm" style="background:#16a34a;color:#fff;border:none" onclick="document.getElementById('restore-file').click()"><i class="fas fa-upload"></i> Choose Backup File</button>
              <span id="restore-filename" style="font-size:11px;color:#6B7A9D">No file chosen</span>
            </div>
          </div>

          <!-- Backup history -->
          <div id="backup-history-wrap">
            ${(function() {
              try {
                var hist = JSON.parse(localStorage.getItem('superkids_backup_history') || '[]');
                if (!hist.length) return '<div style="font-size:11px;color:#6B7A9D;text-align:center;padding:8px">No backups recorded yet</div>';
                return '<div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:8px">Recent Backups</div>' +
                  '<div style="max-height:140px;overflow-y:auto">' +
                  hist.slice().reverse().map(function(h) {
                    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#f8fafc;border-radius:6px;margin-bottom:4px;font-size:11px">' +
                      '<div><i class="fas fa-file-archive" style="color:#1AA6CA;margin-right:6px"></i><strong>' + h.year + '</strong> &nbsp; ' + h.records + ' records</div>' +
                      '<div style="color:#6B7A9D">' + h.date + '</div>' +
                    '</div>';
                  }).join('') +
                  '</div>';
              } catch(e) { return ''; }
            })()}
          </div>
        </div>

        <div class="card" style="margin-bottom:16px;border:2px solid #C4893A22">
          <div class="card-title" style="margin-bottom:4px"><i class="fas fa-calendar-check" style="color:#C4893A"></i> Year-End Rollover</div>
          <p style="font-size:12px;color:#6B7A9D;margin-bottom:16px">Promote students to their next class, archive this year's records, and start fresh for the new academic year.</p>
          <button class="btn btn-sm" style="background:#C4893A;color:#fff;border:none;font-weight:700" onclick="openRolloverWizard()"><i class="fas fa-arrow-circle-right"></i> Start Year-End Rollover</button>
        </div>

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

// Convert uploaded file to base64 and show preview
window.previewDocImage = function(input, previewId, hiddenId) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    document.getElementById(hiddenId).value = dataUrl;
    var preview = document.getElementById(previewId);
    if (preview) {
      var isStamp = previewId === 'stamp-preview';
      preview.innerHTML = isStamp
        ? '<img src="' + dataUrl + '" style="width:76px;height:76px;object-fit:contain;border-radius:50%"/>'
        : '<img src="' + dataUrl + '" style="max-width:116px;max-height:56px;object-fit:contain"/>';
    }
  };
  reader.readAsDataURL(file);
};

window.clearDocImage = function(previewId, hiddenId, lsKey) {
  var lsKeyMap = { schoolStamp: DOC_STAMP_KEY, principalSignature: DOC_SIGN_KEY };
  localStorage.removeItem(lsKeyMap[lsKey] || lsKey);
  document.getElementById(hiddenId).value = '';
  var preview = document.getElementById(previewId);
  if (preview) {
    var isStamp = previewId === 'stamp-preview';
    preview.innerHTML = isStamp
      ? '<i class="fas fa-stamp" style="font-size:28px;color:#DCE1EF"></i>'
      : '<i class="fas fa-signature" style="font-size:24px;color:#DCE1EF"></i>';
  }
  showToast('Removed successfully', 'success');
};

// Images stored in localStorage only to avoid SQLITE_TOOBIG on server sync
var DOC_STAMP_KEY = 'superkids_school_stamp';
var DOC_SIGN_KEY  = 'superkids_principal_sign';

function getDocStamp()  { return localStorage.getItem(DOC_STAMP_KEY) || ''; }
function getDocSign()   { return localStorage.getItem(DOC_SIGN_KEY)  || ''; }

window.saveDocAssets = function() {
  var data = DB.get();
  // Save images to localStorage only (too large for D1 SQLite)
  var stampData = (document.getElementById('set-stamp-data') || {}).value;
  if (stampData) localStorage.setItem(DOC_STAMP_KEY, stampData);
  var signData = (document.getElementById('set-sign-data') || {}).value;
  if (signData) localStorage.setItem(DOC_SIGN_KEY, signData);
  // Save small settings to DB meta (these are safe to sync)
  data.meta.stampSize   = parseInt((document.getElementById('set-stamp-size') || {}).value || '90', 10);
  data.meta.stampHAlign = (document.getElementById('set-stamp-halign') || {}).value || 'right';
  data.meta.stampVAlign = (document.getElementById('set-stamp-valign') || {}).value || 'above';
  data.meta.signWidth   = parseInt((document.getElementById('set-sign-width') || {}).value || '150', 10);
  data.meta.signHeight  = parseInt((document.getElementById('set-sign-height') || {}).value || '60', 10);
  data.meta.signHAlign  = (document.getElementById('set-sign-halign') || {}).value || 'right';
  DB.commit();
  showToast('Stamp & Signature saved!', 'success');
};

function resetAllData() {
  confirmDialog('This will DELETE ALL data and reset to defaults. Are you absolutely sure?', () => {
    DB.reset();
    showToast('Data reset to defaults. Please re-login.', 'warning');
    setTimeout(() => { Session.logout(); renderLogin(); }, 1500);
  }, 'Reset Everything', true);
}

window.exportBackup = function() {
  var yearFilter = (document.getElementById('backup-year') || {}).value || 'all';
  var d = DB.get();
  var meta = d.meta || {};
  var ay = yearFilter === 'all' ? 'All Years' : (yearFilter + '-' + String(parseInt(yearFilter)+1).slice(2));

  var filterByYear = function(arr, dateField) {
    if (yearFilter === 'all') return arr || [];
    return (arr || []).filter(function(item) {
      var v = item[dateField] || item.date || item.createdAt || item.joinDate || '';
      return v.startsWith(yearFilter);
    });
  };

  var backup = {
    _version: 1,
    _exportedAt: new Date().toISOString(),
    _academicYear: ay,
    _yearFilter: yearFilter,
    meta: meta,
    students:      yearFilter === 'all' ? (d.students||[])      : (d.students||[]).filter(function(s){ return (s.joinDate||'').startsWith(yearFilter); }),
    classes:       d.classes || [],
    users:         (d.users||[]).filter(function(u){ return u.role !== 'superadmin'; }),
    attendance:    filterByYear(d.attendance,    'date'),
    feeRecords:    filterByYear(d.feeRecords,    'date'),
    assignments:   filterByYear(d.assignments,   'dueDate'),
    achievements:  filterByYear(d.achievements,  'date'),
    exams:         filterByYear(d.exams,         'date'),
    healthRecords: filterByYear(d.healthRecords, 'date'),
    ptmSlots:      filterByYear(d.ptmSlots,      'date'),
    grievances:    filterByYear(d.grievances,    'createdAt'),
    conductRecords:filterByYear(d.conductRecords,'date'),
    holidays:      d.holidays || [],
    leaveRequests: filterByYear(d.leaveRequests, 'createdAt'),
    hrLetters:     filterByYear(d.hrLetters,     'createdAt'),
    salaryRecords: filterByYear(d.salaryRecords, 'month'),
    activityLog:   filterByYear(d.activityLog,   'ts'),
    mealMenu:      d.mealMenu || {},
    examSchedules: filterByYear(d.examSchedules, 'date'),
  };

  var totalRecords = Object.keys(backup).filter(function(k){ return Array.isArray(backup[k]); })
    .reduce(function(sum, k){ return sum + backup[k].length; }, 0);

  var json = JSON.stringify(backup, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var schoolSlug = (meta.schoolName || 'school').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  a.href = url;
  a.download = schoolSlug + '-backup-' + ay.replace(/\//g,'-') + '-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Record in history
  try {
    var hist = JSON.parse(localStorage.getItem('superkids_backup_history') || '[]');
    hist.push({ year: ay, records: totalRecords, date: new Date().toLocaleDateString('en-IN') });
    if (hist.length > 20) hist = hist.slice(-20);
    localStorage.setItem('superkids_backup_history', JSON.stringify(hist));
  } catch(e) {}

  showToast('Backup downloaded: ' + ay + ' (' + totalRecords + ' records)', 'success');
};

window.restoreBackup = function(input) {
  var file = input.files[0];
  if (!file) return;
  var nameEl = document.getElementById('restore-filename');
  if (nameEl) nameEl.textContent = file.name;

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var backup = JSON.parse(e.target.result);
      if (!backup._version || !backup.meta) { showToast('Invalid backup file', 'error'); return; }

      confirmDialog(
        'Restore backup from ' + (backup._academicYear || 'unknown year') + '?\n\nExisting records will be KEPT. Backup records will be merged in. This cannot be undone.',
        function() {
          var d = DB.get();
          var mergeArray = function(existing, incoming, idField) {
            idField = idField || 'id';
            var ids = new Set((existing||[]).map(function(x){ return x[idField]; }));
            var merged = (existing||[]).slice();
            (incoming||[]).forEach(function(item) {
              if (!ids.has(item[idField])) { merged.push(item); ids.add(item[idField]); }
            });
            return merged;
          };

          d.students       = mergeArray(d.students,       backup.students,       'id');
          d.classes        = mergeArray(d.classes,        backup.classes,        'id');
          d.users          = mergeArray(d.users,          backup.users,          'id');
          d.attendance     = mergeArray(d.attendance,     backup.attendance,     'id');
          d.feeRecords     = mergeArray(d.feeRecords,     backup.feeRecords,     'id');
          d.assignments    = mergeArray(d.assignments,    backup.assignments,    'id');
          d.achievements   = mergeArray(d.achievements,   backup.achievements,   'id');
          d.exams          = mergeArray(d.exams,          backup.exams,          'id');
          d.healthRecords  = mergeArray(d.healthRecords,  backup.healthRecords,  'id');
          d.ptmSlots       = mergeArray(d.ptmSlots,       backup.ptmSlots,       'id');
          d.grievances     = mergeArray(d.grievances,     backup.grievances,     'id');
          d.conductRecords = mergeArray(d.conductRecords, backup.conductRecords, 'id');
          d.holidays       = mergeArray(d.holidays,       backup.holidays,       'id');
          d.leaveRequests  = mergeArray(d.leaveRequests,  backup.leaveRequests,  'id');
          d.hrLetters      = mergeArray(d.hrLetters,      backup.hrLetters,      'id');
          d.salaryRecords  = mergeArray(d.salaryRecords,  backup.salaryRecords,  'id');
          d.activityLog    = mergeArray(d.activityLog,    backup.activityLog,    'id');

          DB.commit();
          showToast('Backup restored successfully!', 'success');
          input.value = '';
          if (nameEl) nameEl.textContent = 'No file chosen';
        },
        'Restore Backup'
      );
    } catch(err) {
      showToast('Failed to read backup file: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
};

// ============================================================
// YEAR-END ROLLOVER WIZARD
// ============================================================
window.openRolloverWizard = function() {
  var d = DB.get();
  var classes = (d.classes || []).filter(function(c){ return !c.deleted; });
  var currentAY = d.meta.academicYear || '';
  var cy = new Date().getFullYear();
  var nextAY = (cy) + '-' + String(cy + 1).slice(2);
  if (currentAY) {
    var parts = currentAY.split('-');
    if (parts.length === 2) {
      var nextY = parseInt(parts[0]) + 1;
      nextAY = nextY + '-' + String(nextY + 1).slice(2);
    }
  }

  // Build class mapping rows
  var classOptions = '<option value="graduate">🎓 Graduate / Alumni</option><option value="leave">❌ Mark as Left / Inactive</option>';
  classes.forEach(function(c) {
    classOptions += '<option value="' + c.id + '">' + _mgEsc(c.name) + '</option>';
  });

  var classRows = classes.map(function(cls) {
    var students = (d.students || []).filter(function(s){ return s.classId === cls.id && !s.deleted; });
    // Guess next class by order/name
    var guessNext = _guessNextClass(cls, classes);
    var options = classes.map(function(c) {
      var sel = c.id === guessNext ? ' selected' : '';
      return '<option value="' + c.id + '"' + sel + '>' + _mgEsc(c.name) + '</option>';
    }).join('');
    return '<tr style="border-bottom:1px solid #f1f5f9">' +
      '<td style="padding:10px 12px;font-weight:700;color:#0F2050">' + _mgEsc(cls.name) + '</td>' +
      '<td style="padding:10px 12px;color:#6B7A9D;font-size:12px">' + students.length + ' students</td>' +
      '<td style="padding:10px 12px"><i class="fas fa-arrow-right" style="color:#C4893A;margin-right:8px"></i></td>' +
      '<td style="padding:10px 12px">' +
        '<select class="form-control" id="rollover-cls-' + cls.id + '" style="font-size:12px">' +
          options +
          '<option value="graduate">🎓 Graduate / Alumni</option>' +
          '<option value="leave">❌ Mark as Left / Inactive</option>' +
        '</select>' +
      '</td>' +
    '</tr>';
  }).join('');

  // Archive options
  var archiveChecks = [
    { key: 'attendance',     label: 'Attendance Records' },
    { key: 'feeRecords',     label: 'Fee Records' },
    { key: 'assignments',    label: 'Homework / Assignments' },
    { key: 'achievements',   label: 'Achievements' },
    { key: 'exams',          label: 'Exam Schedules' },
    { key: 'healthRecords',  label: 'Health Records' },
    { key: 'ptmSlots',       label: 'PTM Slots' },
    { key: 'grievances',     label: 'Grievances' },
    { key: 'conductRecords', label: 'Conduct Records' },
    { key: 'grades',         label: 'Grade Records' },
    { key: 'leaveRequests',  label: 'Leave Requests' },
    { key: 'mealMenu',       label: 'Meal Menu' },
  ].map(function(item) {
    return '<label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;font-size:13px">' +
      '<input type="checkbox" id="arc-' + item.key + '" checked style="accent-color:#0F2050;width:15px;height:15px"/> ' + item.label +
    '</label>';
  }).join('');

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'rollover-overlay';
  overlay.innerHTML = '<div class="modal" style="max-width:680px;max-height:90vh;overflow-y:auto">' +
    '<div class="modal-header" style="background:linear-gradient(135deg,#0F2050,#1a3a7a);color:#fff;border-radius:12px 12px 0 0;padding:20px 24px">' +
      '<div>' +
        '<h2 style="margin:0;font-size:18px;color:#fff"><i class="fas fa-calendar-check" style="color:#C4893A;margin-right:10px"></i>Year-End Rollover Wizard</h2>' +
        '<div style="font-size:12px;color:#b0bec5;margin-top:4px">' + (currentAY || 'Current Year') + ' → ' + nextAY + '</div>' +
      '</div>' +
      '<button class="close-btn" style="color:#fff;background:none;border:none;font-size:20px;cursor:pointer" onclick="document.getElementById(\'rollover-overlay\').remove()">✕</button>' +
    '</div>' +
    '<div class="modal-body" style="padding:24px">' +

      // Step 1: New year
      '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;margin-bottom:20px">' +
        '<div style="font-weight:700;color:#0369a1;margin-bottom:10px;font-size:13px"><span style="background:#0F2050;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;margin-right:8px">1</span> New Academic Year</div>' +
        '<div class="form-row" style="margin:0">' +
          '<div class="form-group" style="margin-bottom:0">' +
            '<label class="form-label" style="font-size:11px">New Academic Year</label>' +
            '<input class="form-control" id="rollover-new-ay" value="' + nextAY + '" placeholder="e.g. 2026-27"/>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Step 2: Class promotions
      '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:20px">' +
        '<div style="font-weight:700;color:#92400e;margin-bottom:12px;font-size:13px"><span style="background:#C4893A;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;margin-right:8px">2</span> Promote Students to Next Class</div>' +
        (classes.length ? '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><thead><tr style="background:#f8fafc"><th style="padding:8px 12px;font-size:11px;text-align:left;color:#6B7A9D;font-weight:700">Current Class</th><th style="padding:8px 12px;font-size:11px;color:#6B7A9D;font-weight:700">Students</th><th style="padding:8px 12px"></th><th style="padding:8px 12px;font-size:11px;text-align:left;color:#6B7A9D;font-weight:700">Promote To</th></tr></thead><tbody>' + classRows + '</tbody></table>'
        : '<div style="color:#6B7A9D;font-size:13px;text-align:center;padding:10px">No classes found.</div>') +
      '</div>' +

      // Step 3: Archive
      '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:20px">' +
        '<div style="font-weight:700;color:#15803d;margin-bottom:10px;font-size:13px"><span style="background:#16a34a;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;margin-right:8px">3</span> Archive &amp; Clear Year-Specific Records</div>' +
        '<p style="font-size:11px;color:#166534;margin-bottom:12px">These records will be backed up then cleared so the new year starts fresh. Uncheck to keep them.</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px">' + archiveChecks + '</div>' +
      '</div>' +

      // Warning
      '<div style="background:#fef3c7;border:1px solid #f59e0b44;border-radius:10px;padding:12px;font-size:12px;color:#92400e">' +
        '<i class="fas fa-shield-alt" style="margin-right:6px;color:#d97706"></i>' +
        '<strong>A full backup of the current year will be downloaded automatically before any changes are made.</strong>' +
      '</div>' +
    '</div>' +
    '<div class="modal-footer" style="padding:16px 24px;background:#f8fafc;border-top:1px solid #DCE1EF;display:flex;gap:10px;justify-content:flex-end">' +
      '<button class="btn btn-secondary" onclick="document.getElementById(\'rollover-overlay\').remove()">Cancel</button>' +
      '<button class="btn btn-primary" style="background:#C4893A;border-color:#C4893A;font-weight:700" onclick="executeRollover()"><i class="fas fa-rocket"></i> Execute Rollover</button>' +
    '</div>' +
  '</div>';

  document.body.appendChild(overlay);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
};

// Guess next class by common preschool order
function _guessNextClass(cls, allClasses) {
  var order = ['playgroup','play group','nursery','lkg','jr.kg','jr. kg','junior kg','ukg','sr.kg','sr. kg','senior kg','grade 1','class 1','std 1'];
  var name = (cls.name || '').toLowerCase().trim();
  var idx = order.findIndex(function(o){ return name.includes(o); });
  if (idx === -1 || idx >= order.length - 1) return 'graduate';
  // Find class whose name matches the next order item
  var nextLabel = order[idx + 1];
  var next = allClasses.find(function(c){ return (c.name||'').toLowerCase().includes(nextLabel) && c.id !== cls.id; });
  return next ? next.id : 'graduate';
}

window.executeRollover = function() {
  var newAY = (document.getElementById('rollover-new-ay') || {}).value || '';
  if (!newAY) { showToast('Please enter the new academic year', 'error'); return; }

  var d = DB.get();
  var classes = (d.classes || []).filter(function(c){ return !c.deleted; });

  // Build promotion map
  var promotionMap = {};
  classes.forEach(function(cls) {
    var sel = document.getElementById('rollover-cls-' + cls.id);
    promotionMap[cls.id] = sel ? sel.value : 'graduate';
  });

  // Keys to archive/clear
  var archiveKeys = ['attendance','feeRecords','assignments','achievements','exams','healthRecords','ptmSlots','grievances','conductRecords','grades','leaveRequests','mealMenu'];
  var toArchive = archiveKeys.filter(function(k){ var el = document.getElementById('arc-' + k); return el && el.checked; });

  confirmDialog(
    'This will:\n• Download a full backup\n• Promote students as configured\n• Clear selected records\n• Set academic year to ' + newAY + '\n\nThis cannot be undone. Continue?',
    function() {
      // Step 1: Auto-download backup first
      var currentAY = d.meta.academicYear || 'current';
      var backupData = {
        _version: 1,
        _exportedAt: new Date().toISOString(),
        _academicYear: currentAY,
        _type: 'year-end-rollover-backup',
        meta: d.meta,
        students: d.students || [],
        classes: d.classes || [],
        users: d.users || [],
        attendance: d.attendance || [],
        feeRecords: d.feeRecords || [],
        assignments: d.assignments || [],
        achievements: d.achievements || [],
        exams: d.exams || [],
        healthRecords: d.healthRecords || [],
        ptmSlots: d.ptmSlots || [],
        grievances: d.grievances || [],
        conductRecords: d.conductRecords || [],
        grades: d.grades || [],
        leaveRequests: d.leaveRequests || [],
        hrLetters: d.hrLetters || [],
        salaryRecords: d.salaryRecords || [],
        activityLog: d.activityLog || [],
        mealMenu: d.mealMenu || {},
        holidays: d.holidays || [],
      };
      var json = JSON.stringify(backupData, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var slug = (d.meta.schoolName || 'school').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
      a.href = url;
      a.download = slug + '-ROLLOVER-BACKUP-' + currentAY.replace(/\//g,'-') + '-' + new Date().toISOString().slice(0,10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Step 2: Promote students
      var promotedCount = 0, graduatedCount = 0, leftCount = 0;
      d.students = (d.students || []).map(function(s) {
        if (s.deleted) return s;
        var dest = promotionMap[s.classId];
        if (!dest) return s;
        var updated = Object.assign({}, s, { prevClassId: s.classId, prevAY: d.meta.academicYear });
        if (dest === 'graduate') {
          updated.status = 'alumni';
          updated.graduatedAY = d.meta.academicYear;
          updated.classId = s.classId; // keep last class for records
          graduatedCount++;
        } else if (dest === 'leave') {
          updated.status = 'inactive';
          leftCount++;
        } else {
          updated.classId = dest;
          updated.status = 'active';
          promotedCount++;
        }
        return updated;
      });

      // Step 3: Archive (clear) selected records
      toArchive.forEach(function(key) {
        if (key === 'mealMenu') { d.mealMenu = {}; }
        else { d[key] = []; }
      });

      // Step 4: Update academic year + log
      d.meta.academicYear = newAY;
      var user = Session.current();
      d.activityLog = d.activityLog || [];
      d.activityLog.push({
        id: 'log_' + Date.now(),
        ts: new Date().toISOString(),
        action: 'Year-End Rollover',
        detail: 'Rolled over to ' + newAY + '. Promoted: ' + promotedCount + ', Graduated: ' + graduatedCount + ', Left: ' + leftCount + '. Cleared: ' + toArchive.join(', '),
        userId: user ? user.id : '',
        userName: user ? user.name : 'System',
      });

      DB.commit();

      // Save archive snapshot to localStorage for historical viewer
      try {
        var archiveIndex = JSON.parse(localStorage.getItem('superkids_archives_index') || '[]');
        var archiveKey = 'superkids_archive_' + currentAY.replace(/[^a-z0-9]/gi,'_');
        localStorage.setItem(archiveKey, JSON.stringify(backupData));
        if (!archiveIndex.find(function(a){ return a.key === archiveKey; })) {
          archiveIndex.push({ key: archiveKey, year: currentAY, rolledAt: new Date().toISOString() });
          localStorage.setItem('superkids_archives_index', JSON.stringify(archiveIndex));
        }
      } catch(e) { /* localStorage full — user still has the downloaded backup file */ }

      // Record in backup history
      try {
        var hist = JSON.parse(localStorage.getItem('superkids_backup_history') || '[]');
        hist.push({ year: currentAY + ' (Rollover)', records: Object.values(backupData).filter(Array.isArray).reduce(function(s,a){ return s+a.length; },0), date: new Date().toLocaleDateString('en-IN') });
        if (hist.length > 20) hist = hist.slice(-20);
        localStorage.setItem('superkids_backup_history', JSON.stringify(hist));
      } catch(e) {}

      document.getElementById('rollover-overlay').remove();

      showToast(
        'Rollover complete! ' + promotedCount + ' promoted, ' + graduatedCount + ' graduated, ' + leftCount + ' marked left. New year: ' + newAY,
        'success'
      );

      // Re-render settings to reflect new academic year
      setTimeout(function(){ navigate('settings'); }, 1200);
    },
    'Execute Rollover',
    true
  );
};

// ============================================================
// HISTORICAL RECORDS VIEWER
// ============================================================
function getArchiveIndex() {
  try { return JSON.parse(localStorage.getItem('superkids_archives_index') || '[]'); } catch(e) { return []; }
}
function loadArchive(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e) { return null; }
}

window.renderHistoricalRecords = function() {
  var user = Session.current();
  if (!user || user.role !== 'superadmin') { showToast('Access denied','error'); return; }

  var archiveIndex = getArchiveIndex();
  var selectedKey = window._histSelectedKey || (archiveIndex.length ? archiveIndex[archiveIndex.length-1].key : null);
  var activeTab = window._histActiveTab || 'overview';
  var archive = selectedKey ? loadArchive(selectedKey) : null;

  var yearOptions = archiveIndex.length
    ? archiveIndex.slice().reverse().map(function(a) {
        return '<option value="' + a.key + '"' + (a.key === selectedKey ? ' selected' : '') + '>' + a.year + '</option>';
      }).join('')
    : '<option value="">No archives yet</option>';

  var tabs = [
    { id:'overview',    label:'Overview',    icon:'fa-chart-pie' },
    { id:'students',    label:'Students',    icon:'fa-user-graduate' },
    { id:'teachers',    label:'Teachers',    icon:'fa-chalkboard-teacher' },
    { id:'attendance',  label:'Attendance',  icon:'fa-calendar-check' },
    { id:'fees',        label:'Fees',        icon:'fa-rupee-sign' },
    { id:'exams',       label:'Exams',       icon:'fa-file-alt' },
    { id:'homework',    label:'Homework',    icon:'fa-book-open' },
    { id:'achievements',label:'Achievements',icon:'fa-trophy' },
    { id:'health',      label:'Health',      icon:'fa-heartbeat' },
    { id:'grievances',  label:'Grievances',  icon:'fa-comments' },
    { id:'activity',    label:'Activity Log', icon:'fa-history' },
  ];

  var tabBar = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px">' +
    tabs.map(function(t) {
      var active = t.id === activeTab;
      return '<button onclick="window._histActiveTab=\'' + t.id + '\';renderHistoricalRecords()" style="padding:7px 14px;border-radius:20px;border:1.5px solid ' + (active?'#0F2050':'#DCE1EF') + ';background:' + (active?'#0F2050':'#fff') + ';color:' + (active?'#fff':'#374151') + ';font-size:12px;font-weight:' + (active?'700':'500') + ';cursor:pointer">' +
        '<i class="fas ' + t.icon + '" style="margin-right:5px"></i>' + t.label + '</button>';
    }).join('') +
  '</div>';

  var content = '';
  if (!archive) {
    content = '<div style="text-align:center;padding:60px 20px;color:#6B7A9D">' +
      '<i class="fas fa-archive" style="font-size:48px;margin-bottom:16px;display:block;color:#DCE1EF"></i>' +
      '<div style="font-size:16px;font-weight:700;margin-bottom:8px">No Historical Archives Found</div>' +
      '<p style="font-size:13px;max-width:400px;margin:0 auto">Archives are created automatically during Year-End Rollover. You can also import a backup JSON file below.</p>' +
      '<div style="margin-top:20px">' +
        '<input type="file" id="hist-import-file" accept=".json" style="display:none" onchange="importHistoricalBackup(this)"/>' +
        '<button class="btn btn-primary" onclick="document.getElementById(\'hist-import-file\').click()"><i class="fas fa-upload"></i> Import Backup JSON to View</button>' +
      '</div>' +
    '</div>';
  } else {
    content = tabBar + _renderHistTab(archive, activeTab);
  }

  var html = '<div style="max-width:1100px">' +
    // Header
    '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">' +
      '<div>' +
        '<h2 style="margin:0;font-size:20px;color:#0F2050"><i class="fas fa-history" style="color:#C4893A;margin-right:10px"></i>Historical Records</h2>' +
        '<div style="font-size:12px;color:#6B7A9D;margin-top:3px">View complete school data from previous academic years</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
        (archiveIndex.length ? '<select class="form-control" style="width:160px;font-size:13px" onchange="window._histSelectedKey=this.value;window._histActiveTab=\'overview\';renderHistoricalRecords()">' + yearOptions + '</select>' : '') +
        '<input type="file" id="hist-import-file" accept=".json" style="display:none" onchange="importHistoricalBackup(this)"/>' +
        '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'hist-import-file\').click()"><i class="fas fa-upload"></i> Import JSON</button>' +
        (archive ? '<button class="btn btn-secondary btn-sm" onclick="redownloadArchive(\'' + selectedKey + '\')"><i class="fas fa-download"></i> Download</button>' : '') +
        (archive ? '<button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:none" onclick="deleteArchive(\'' + selectedKey + '\')"><i class="fas fa-trash"></i></button>' : '') +
      '</div>' +
    '</div>' +
    content +
  '</div>';

  renderLayout(html, 'Historical Records');
};

function _renderHistTab(archive, tab) {
  var classes = archive.classes || [];
  var students = (archive.students || []).filter(function(s){ return !s.deleted; });
  var teachers = (archive.users || []).filter(function(u){ return u.role === 'subadmin'; });

  var cls = function(id) { return (classes.find(function(c){ return c.id===id; })||{}).name || '—'; };

  var statCard = function(icon, label, value, color) {
    return '<div style="background:#fff;border:1.5px solid #DCE1EF;border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:14px">' +
      '<div style="width:44px;height:44px;border-radius:12px;background:' + color + '22;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
        '<i class="fas ' + icon + '" style="color:' + color + ';font-size:20px"></i>' +
      '</div>' +
      '<div><div style="font-size:22px;font-weight:900;color:#0F2050">' + value + '</div><div style="font-size:12px;color:#6B7A9D">' + label + '</div></div>' +
    '</div>';
  };

  var tableWrap = function(html) {
    return '<div style="overflow-x:auto;border:1px solid #DCE1EF;border-radius:10px">' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px">' + html + '</table></div>';
  };

  var th = function(label) { return '<th style="padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;background:#0F2050;color:#fff;white-space:nowrap">' + label + '</th>'; };
  var td = function(val, style) { return '<td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;' + (style||'') + '">' + (val||'—') + '</td>'; };
  var trEven = 'background:#f8fafc';

  if (tab === 'overview') {
    var totalAtt = (archive.attendance||[]).length;
    var totalFees = (archive.feeRecords||[]).reduce(function(s,f){ return s+(parseFloat(f.amount||f.paid||0)); },0);
    var graduated = students.filter(function(s){ return s.status==='alumni'; }).length;
    return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:24px">' +
      statCard('fa-user-graduate','Total Students',students.length,'#0F2050') +
      statCard('fa-chalkboard-teacher','Teachers',teachers.length,'#1AA6CA') +
      statCard('fa-school','Classes',classes.length,'#C4893A') +
      statCard('fa-graduation-cap','Graduated',graduated,'#10b981') +
      statCard('fa-calendar-check','Attendance Records',totalAtt,'#8b5cf6') +
      statCard('fa-rupee-sign','Fees Collected','₹'+totalFees.toLocaleString('en-IN'),'#f59e0b') +
      statCard('fa-file-alt','Exams',(archive.exams||[]).length,'#ef4444') +
      statCard('fa-book-open','Assignments',(archive.assignments||[]).length,'#06b6d4') +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
      '<div class="card"><div class="card-title" style="margin-bottom:12px"><i class="fas fa-school" style="color:#1AA6CA"></i> Classes</div>' +
        tableWrap('<tr>' + th('Class') + th('Teacher') + th('Students') + '</tr>' +
          classes.map(function(c,i) {
            var t = (archive.users||[]).find(function(u){ return u.id===c.teacherId; });
            var sc = students.filter(function(s){ return s.classId===c.id; }).length;
            return '<tr style="' + (i%2?trEven:'') + '">' + td(c.name,'font-weight:700') + td(t?t.name:'—') + td(sc) + '</tr>';
          }).join('')) +
      '</div>' +
      '<div class="card"><div class="card-title" style="margin-bottom:12px"><i class="fas fa-info-circle" style="color:#C4893A"></i> Archive Info</div>' +
        '<div style="font-size:13px;line-height:2">' +
          '<div><span style="color:#6B7A9D">Academic Year:</span> <strong>' + (archive._academicYear||'—') + '</strong></div>' +
          '<div><span style="color:#6B7A9D">Exported At:</span> <strong>' + (archive._exportedAt ? new Date(archive._exportedAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '—') + '</strong></div>' +
          '<div><span style="color:#6B7A9D">School:</span> <strong>' + ((archive.meta||{}).schoolName||'—') + '</strong></div>' +
          '<div><span style="color:#6B7A9D">Principal:</span> <strong>' + ((archive.meta||{}).principalName||'—') + '</strong></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  if (tab === 'students') {
    var active = students.filter(function(s){ return s.status!=='alumni'&&s.status!=='inactive'; });
    var alumni = students.filter(function(s){ return s.status==='alumni'; });
    var inactive = students.filter(function(s){ return s.status==='inactive'; });
    var renderStudentTable = function(list, title) {
      if (!list.length) return '';
      return '<div style="margin-bottom:20px"><div style="font-weight:700;color:#0F2050;margin-bottom:8px;font-size:13px">' + title + ' (' + list.length + ')</div>' +
        tableWrap('<tr>' + th('Name') + th('Roll No') + th('Class') + th('DOB') + th('Gender') + th('Blood Grp') + th('Parent') + th('Status') + '</tr>' +
          list.map(function(s,i) {
            var parent = (archive.users||[]).find(function(u){ return u.id===s.parentId; });
            var statusColor = s.status==='alumni'?'#10b981':s.status==='inactive'?'#ef4444':'#1AA6CA';
            return '<tr style="' + (i%2?trEven:'') + '">' +
              td('<strong>' + _mgEsc(s.name) + '</strong>') +
              td(s.rollNo) + td(cls(s.classId)) +
              td(s.dob ? new Date(s.dob).toLocaleDateString('en-IN') : '—') +
              td(s.gender) + td(s.bloodGroup) +
              td(parent ? parent.name : '—') +
              td('<span style="background:' + statusColor + '22;color:' + statusColor + ';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">' + (s.status||'active') + '</span>') +
            '</tr>';
          }).join('')) +
      '</div>';
    };
    return renderStudentTable(active,'Active Students') + renderStudentTable(alumni,'Graduated / Alumni') + renderStudentTable(inactive,'Inactive / Left');
  }

  if (tab === 'teachers') {
    return tableWrap('<tr>' + th('Name') + th('Employee ID') + th('Designation') + th('Class Assigned') + th('Email') + th('Phone') + th('Joining Date') + '</tr>' +
      teachers.map(function(t,i) {
        var assignedCls = classes.find(function(c){ return c.teacherId===t.id; });
        return '<tr style="' + (i%2?trEven:'') + '">' +
          td('<strong>' + _mgEsc(t.name) + '</strong>') +
          td(t.employeeId) + td(t.designation||'Teacher') +
          td(assignedCls ? assignedCls.name : '—') +
          td(t.email) + td(t.phone) +
          td(t.joiningDate ? new Date(t.joiningDate).toLocaleDateString('en-IN') : '—') +
        '</tr>';
      }).join(''));
  }

  if (tab === 'attendance') {
    var attMap = {};
    (archive.attendance||[]).forEach(function(a){ attMap[a.studentId] = (attMap[a.studentId]||{present:0,absent:0,late:0}); attMap[a.studentId][a.status]=(attMap[a.studentId][a.status]||0)+1; });
    return tableWrap('<tr>' + th('Student') + th('Class') + th('Present') + th('Absent') + th('Late') + th('Total') + th('% Present') + '</tr>' +
      students.map(function(s,i) {
        var r = attMap[s.id]||{present:0,absent:0,late:0};
        var total = r.present+r.absent+r.late;
        var pct = total ? Math.round(r.present/total*100) : 0;
        var pctColor = pct>=85?'#10b981':pct>=70?'#f59e0b':'#ef4444';
        return '<tr style="' + (i%2?trEven:'') + '">' +
          td('<strong>' + _mgEsc(s.name) + '</strong>') + td(cls(s.classId)) +
          td('<span style="color:#10b981;font-weight:700">' + r.present + '</span>') +
          td('<span style="color:#ef4444;font-weight:700">' + r.absent + '</span>') +
          td('<span style="color:#f59e0b;font-weight:700">' + r.late + '</span>') +
          td(total) +
          td('<span style="font-weight:700;color:' + pctColor + '">' + pct + '%</span>') +
        '</tr>';
      }).filter(Boolean).join(''));
  }

  if (tab === 'fees') {
    var feeMap = {};
    (archive.feeRecords||[]).forEach(function(f){ var sid=f.studentId; feeMap[sid]=feeMap[sid]||{paid:0,pending:0,count:0}; if(f.status==='paid'||f.status==='Paid') feeMap[sid].paid+=parseFloat(f.amount||0); else feeMap[sid].pending+=parseFloat(f.amount||0); feeMap[sid].count++; });
    var totalCollected = Object.values(feeMap).reduce(function(s,v){ return s+v.paid; },0);
    return '<div style="background:linear-gradient(135deg,#0F2050,#1a3a7a);border-radius:12px;padding:16px 24px;margin-bottom:16px;display:flex;gap:30px;flex-wrap:wrap">' +
      '<div style="color:#fff"><div style="font-size:11px;color:#b0bec5;margin-bottom:2px">Total Collected</div><div style="font-size:22px;font-weight:900;color:#C4893A">₹' + totalCollected.toLocaleString('en-IN') + '</div></div>' +
      '<div style="color:#fff"><div style="font-size:11px;color:#b0bec5;margin-bottom:2px">Total Records</div><div style="font-size:22px;font-weight:900">' + (archive.feeRecords||[]).length + '</div></div>' +
    '</div>' +
    tableWrap('<tr>' + th('Student') + th('Class') + th('Total Paid') + th('Pending') + th('Records') + '</tr>' +
      students.map(function(s,i) {
        var r = feeMap[s.id]||{paid:0,pending:0,count:0};
        if (!r.count) return '';
        return '<tr style="' + (i%2?trEven:'') + '">' +
          td('<strong>' + _mgEsc(s.name) + '</strong>') + td(cls(s.classId)) +
          td('<span style="color:#10b981;font-weight:700">₹' + r.paid.toLocaleString('en-IN') + '</span>') +
          td('<span style="color:' + (r.pending>0?'#ef4444':'#10b981') + ';font-weight:700">₹' + r.pending.toLocaleString('en-IN') + '</span>') +
          td(r.count) +
        '</tr>';
      }).join(''));
  }

  if (tab === 'exams') {
    return tableWrap('<tr>' + th('Subject') + th('Exam Name') + th('Class') + th('Date') + th('Time') + th('Duration') + th('Venue') + '</tr>' +
      (archive.exams||[]).map(function(e,i) {
        var c = classes.find(function(c){ return c.id===e.classId; });
        return '<tr style="' + (i%2?trEven:'') + '">' +
          td('<strong>' + _mgEsc(e.subject) + '</strong>') + td(e.examName) +
          td(c?c.name:'—') +
          td(e.date ? new Date(e.date).toLocaleDateString('en-IN') : '—') +
          td(e.time) + td(e.duration) + td(e.venue) +
        '</tr>';
      }).join(''));
  }

  if (tab === 'homework') {
    return tableWrap('<tr>' + th('Title') + th('Subject') + th('Class') + th('Due Date') + th('Description') + '</tr>' +
      (archive.assignments||[]).map(function(a,i) {
        return '<tr style="' + (i%2?trEven:'') + '">' +
          td('<strong>' + _mgEsc(a.title) + '</strong>') + td(a.subject) +
          td(cls(a.classId)) +
          td(a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-IN') : '—') +
          td('<span style="color:#6B7A9D;font-size:12px">' + _mgEsc((a.description||'').slice(0,80)) + (a.description&&a.description.length>80?'…':'') + '</span>') +
        '</tr>';
      }).join(''));
  }

  if (tab === 'achievements') {
    return tableWrap('<tr>' + th('Student') + th('Class') + th('Title') + th('Category') + th('Date') + th('Description') + '</tr>' +
      (archive.achievements||[]).map(function(a,i) {
        var s = students.find(function(s){ return s.id===a.studentId; });
        return '<tr style="' + (i%2?trEven:'') + '">' +
          td(s?'<strong>'+_mgEsc(s.name)+'</strong>':'—') +
          td(s?cls(s.classId):'—') +
          td('<strong>' + _mgEsc(a.title) + '</strong>') +
          td('<span style="background:#C4893A22;color:#C4893A;padding:2px 8px;border-radius:10px;font-size:11px">' + _mgEsc(a.category||a.type||'—') + '</span>') +
          td(a.date ? new Date(a.date).toLocaleDateString('en-IN') : '—') +
          td('<span style="color:#6B7A9D;font-size:12px">' + _mgEsc((a.description||'').slice(0,60)) + '</span>') +
        '</tr>';
      }).join(''));
  }

  if (tab === 'health') {
    return tableWrap('<tr>' + th('Student') + th('Class') + th('Date') + th('Height') + th('Weight') + th('BMI') + th('Remarks') + '</tr>' +
      (archive.healthRecords||[]).map(function(h,i) {
        var s = students.find(function(s){ return s.id===h.studentId; });
        var bmi = (h.height&&h.weight) ? (h.weight/Math.pow(h.height/100,2)).toFixed(1) : '—';
        return '<tr style="' + (i%2?trEven:'') + '">' +
          td(s?'<strong>'+_mgEsc(s.name)+'</strong>':'—') +
          td(s?cls(s.classId):'—') +
          td(h.date ? new Date(h.date).toLocaleDateString('en-IN') : '—') +
          td(h.height?h.height+' cm':'—') + td(h.weight?h.weight+' kg':'—') + td(bmi) +
          td('<span style="color:#6B7A9D;font-size:12px">' + _mgEsc(h.remarks||'—') + '</span>') +
        '</tr>';
      }).join(''));
  }

  if (tab === 'grievances') {
    return tableWrap('<tr>' + th('Subject') + th('Submitted By') + th('Category') + th('Date') + th('Status') + th('Description') + '</tr>' +
      (archive.grievances||[]).map(function(g,i) {
        var u = (archive.users||[]).find(function(u){ return u.id===g.submittedBy||u.id===g.parentId; });
        var sc = g.status==='resolved'?'#10b981':g.status==='inprogress'?'#f59e0b':'#ef4444';
        return '<tr style="' + (i%2?trEven:'') + '">' +
          td('<strong>' + _mgEsc(g.subject||g.title) + '</strong>') +
          td(u?u.name:g.submittedByName||'—') +
          td(g.category||'—') +
          td(g.createdAt ? new Date(g.createdAt).toLocaleDateString('en-IN') : '—') +
          td('<span style="background:' + sc + '22;color:' + sc + ';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">' + (g.status||'open') + '</span>') +
          td('<span style="color:#6B7A9D;font-size:12px">' + _mgEsc((g.description||g.message||'').slice(0,80)) + '</span>') +
        '</tr>';
      }).join(''));
  }

  if (tab === 'activity') {
    return tableWrap('<tr>' + th('Date & Time') + th('User') + th('Action') + th('Details') + '</tr>' +
      (archive.activityLog||[]).slice().reverse().map(function(l,i) {
        return '<tr style="' + (i%2?trEven:'') + '">' +
          td('<span style="font-size:11px;color:#6B7A9D">' + (l.ts ? new Date(l.ts).toLocaleString('en-IN') : '—') + '</span>') +
          td(l.userName||'System') +
          td('<strong>' + _mgEsc(l.action) + '</strong>') +
          td('<span style="color:#6B7A9D;font-size:12px">' + _mgEsc((l.detail||'').slice(0,100)) + '</span>') +
        '</tr>';
      }).join(''));
  }

  return '<div style="color:#6B7A9D;text-align:center;padding:40px">No data available for this view.</div>';
}

window.importHistoricalBackup = function(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data._version && !data.students) { showToast('Invalid backup file','error'); return; }
      var ay = data._academicYear || data.meta && data.meta.academicYear || file.name.replace(/\.json$/,'');
      var key = 'superkids_archive_imported_' + ay.replace(/[^a-z0-9]/gi,'_') + '_' + Date.now();
      try {
        localStorage.setItem(key, JSON.stringify(data));
        var idx = getArchiveIndex();
        idx.push({ key: key, year: ay + ' (imported)', rolledAt: new Date().toISOString() });
        localStorage.setItem('superkids_archives_index', JSON.stringify(idx));
        window._histSelectedKey = key;
        window._histActiveTab = 'overview';
        showToast('Backup imported: ' + ay,'success');
        renderHistoricalRecords();
      } catch(storageErr) {
        showToast('Not enough storage to save archive in browser. Showing data temporarily.','warning');
        // Show inline without saving
        window._tempArchive = data;
        window._histSelectedKey = key;
        window._histActiveTab = 'overview';
        renderHistoricalRecords();
      }
    } catch(err) { showToast('Failed to read file: ' + err.message,'error'); }
  };
  reader.readAsText(file);
  input.value = '';
};

window.redownloadArchive = function(key) {
  var data = loadArchive(key);
  if (!data) { showToast('Archive not found','error'); return; }
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'archive-' + (data._academicYear||key).replace(/[^a-z0-9]/gi,'-') + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.deleteArchive = function(key) {
  confirmDialog('Delete this archive from browser storage? You cannot undo this. Download it first if you need it.', function() {
    localStorage.removeItem(key);
    var idx = getArchiveIndex().filter(function(a){ return a.key !== key; });
    localStorage.setItem('superkids_archives_index', JSON.stringify(idx));
    window._histSelectedKey = null;
    renderHistoricalRecords();
    showToast('Archive deleted','success');
  });
};

registerRoute('historical-records', function() {
  var user = Session.current();
  if (!user || user.role !== 'superadmin') { renderLogin(); return; }
  renderHistoricalRecords();
});

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
var _teamPhotoImg = null;
var _teamPhotoZoom = 1;
var _teamPhotoRotation = 0;

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
            <div id="team-photo-editor" style="display:none;width:100%;padding:4px 0 2px">
              <div style="display:flex;flex-direction:column;gap:6px">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:11px;font-weight:700;color:#6B7A9D;width:52px;flex-shrink:0"><i class="fas fa-search-plus"></i> Zoom</span>
                  <input type="range" id="team-zoom" min="50" max="300" value="100" style="flex:1" oninput="_teamPhotoZoom=this.value/100;document.getElementById('team-zoom-val').textContent=this.value+'%';drawTeamPhotoCanvas()">
                  <span id="team-zoom-val" style="font-size:11px;color:#0F2050;width:36px;text-align:right">100%</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:11px;font-weight:700;color:#6B7A9D;width:52px;flex-shrink:0"><i class="fas fa-redo"></i> Rotate</span>
                  <input type="range" id="team-rotate" min="-180" max="180" value="0" style="flex:1" oninput="_teamPhotoRotation=parseInt(this.value);document.getElementById('team-rotate-val').textContent=this.value+'°';drawTeamPhotoCanvas()">
                  <span id="team-rotate-val" style="font-size:11px;color:#0F2050;width:36px;text-align:right">0°</span>
                </div>
              </div>
            </div>
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
  _teamPhotoImg = null; _teamPhotoZoom = 1; _teamPhotoRotation = 0;
  document.getElementById('team-photo-preview').innerHTML = '🦸';
  document.getElementById('team-photo-editor').style.display = 'none';
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
  _teamPhotoImg = null; _teamPhotoZoom = 1; _teamPhotoRotation = 0;
  document.getElementById('team-photo-editor').style.display = 'none';
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
  _teamPhotoZoom = 1;
  _teamPhotoRotation = 0;
  var reader = new FileReader();
  reader.onload = function(e) {
    _teamPhotoImg = new Image();
    _teamPhotoImg.onload = function() {
      document.getElementById('team-photo-preview').innerHTML = '<canvas id="team-photo-canvas" style="width:90px;height:90px"></canvas>';
      drawTeamPhotoCanvas();
      var editor = document.getElementById('team-photo-editor');
      if (editor) {
        editor.style.display = 'block';
        document.getElementById('team-zoom').value = 100;
        document.getElementById('team-rotate').value = 0;
        document.getElementById('team-zoom-val').textContent = '100%';
        document.getElementById('team-rotate-val').textContent = '0°';
      }
    };
    _teamPhotoImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
  document.getElementById('team-photo-status').textContent = file.name;
}

function drawTeamPhotoCanvas() {
  var canvas = document.getElementById('team-photo-canvas');
  if (!canvas || !_teamPhotoImg) return;
  var size = 90;
  canvas.width = size;
  canvas.height = size;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(_teamPhotoRotation * Math.PI / 180);
  ctx.scale(_teamPhotoZoom, _teamPhotoZoom);
  var iw = _teamPhotoImg.naturalWidth;
  var ih = _teamPhotoImg.naturalHeight;
  var sc = Math.max(size / iw, size / ih);
  ctx.drawImage(_teamPhotoImg, -iw * sc / 2, -ih * sc / 2, iw * sc, ih * sc);
  ctx.restore();
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

  var canvas = document.getElementById('team-photo-canvas');
  if (_teamPhotoImg && canvas) {
    canvas.toBlob(function(blob) {
      if (!blob) { doSave(''); return; }
      var form = new FormData();
      form.append('file', blob, 'team-photo.jpg');
      fetch('/api/upload?folder=team', { method: 'POST', body: form })
        .then(function(r) { return r.json(); })
        .then(function(res) {
          if (res.key) doSave(res.key);
          else { showToast('Photo upload failed', 'error'); doSave(undefined); }
        })
        .catch(function() { showToast('Photo upload failed', 'error'); doSave(undefined); });
    }, 'image/jpeg', 0.92);
  } else if (photoFile) {
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
  var address = (_raw.indexOf('\n') !== -1) ? _raw : 'Matoshri Apartment,Plot Number 51,\nSector No 10,Bhosari Pradhikaran,\nPin:411026';
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
  var ico = function(fa) { return '<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:#0F2050;color:#fff;font-size:7px;vertical-align:middle;margin-right:4px;flex-shrink:0"><i class="'+fa+'"></i></span>'; };
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
        '<div style="font-family:Arial,sans-serif;font-size:11px;color:#0F2050;font-weight:600;line-height:1.45">' +
          (phone1 ? '<div style="display:flex;align-items:center">'+ico('fas fa-phone')+phone1+'</div>' : '') +
          (phone2 ? '<div style="display:flex;align-items:center">'+ico('fas fa-mobile-alt')+phone2+'</div>' : '') +
          (email ? '<div style="display:flex;align-items:center">'+ico('fas fa-envelope')+email+'</div>' : '') +
          '<div style="display:flex;align-items:center">'+ico('fas fa-globe')+website+'</div>' +
        '</div>' +
        '<div style="font-family:Arial,sans-serif;font-size:11px;color:#0F2050;font-weight:600;line-height:1.45;text-align:right;max-width:48%">' +
          '<div style="font-weight:800;margin-bottom:2px">'+ico('fas fa-home')+schoolName+'</div>' +
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
          '<div style="width:72px;height:72px;border:2px dashed #0F2050;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#0F2050;text-align:center;line-height:1.3"></div>' +
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
  var address = (_rawAddr.indexOf('\n') !== -1) ? _rawAddr : 'Matoshri Apartment,Plot Number 51,\nSector No 10,Bhosari Pradhikaran,\nPin:411026';
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
    '.ico-badge{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:#0F2050;color:#fff;font-size:7px;flex-shrink:0;margin-right:4px}' +
    '.hdr-bl{font-family:Arial,sans-serif;font-size:11px;color:#0F2050;font-weight:600;line-height:1.45}' +
    '.hdr-br{font-family:Arial,sans-serif;font-size:11px;color:#0F2050;font-weight:600;line-height:1.45;text-align:right;max-width:48%}' +
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
          '<div style="font-weight:800;margin-bottom:2px"><span class="ico-badge"><i class="fas fa-home"></i></span>'+schoolName+'</div>' +
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
        '<div class="stamp"></div>' +
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

// ============================================================
// SUPERADMIN — EXAM SCHEDULE MANAGER
// ============================================================
function renderExamManagerTab() {
  var data = DB.get();
  var classes = data.classes || [];
  var selClass = window._examMgrClass || (classes[0] ? classes[0].id : '');
  var exams = DB.getExams(selClass || null);
  var editId = window._examEditId || null;
  var editItem = editId ? exams.find(function(e){return e.id===editId;}) : null;
  var cls = selClass ? DB.getClass(selClass) : null;
  var subjects = cls ? (cls.subjects || []) : [];

  var clsOpts = classes.map(function(c){ return '<option value="'+c.id+'"'+(selClass===c.id?' selected':'')+'>'+_mgEsc(c.name)+'</option>'; }).join('');

  var rows = exams.length === 0
    ? '<tr><td colspan="6" style="text-align:center;padding:32px;color:#94a3b8">No exams added for this class.</td></tr>'
    : exams.map(function(e) {
        return '<tr style="border-bottom:1px solid #f1f5f9">'+
          '<td style="padding:10px 12px;font-weight:700;color:#0F2050">'+_mgEsc(e.examName||'—')+'</td>'+
          '<td style="padding:10px 12px;color:#475569">'+_mgEsc(e.subject||'—')+'</td>'+
          '<td style="padding:10px 12px;color:#64748b">'+(e.date||'—')+'</td>'+
          '<td style="padding:10px 12px;color:#64748b">'+(e.time||'—')+'</td>'+
          '<td style="padding:10px 12px;color:#64748b">'+_mgEsc(e.duration||'—')+'</td>'+
          '<td style="padding:10px 12px">'+
            '<button class="btn btn-xs btn-primary" onclick="window._examEditId=\''+e.id+'\';mgmtTab=\'exam-manager\';renderManagement()"><i class="fas fa-edit"></i></button> '+
            '<button class="btn btn-xs btn-danger" onclick="_delExam(\''+e.id+'\')"><i class="fas fa-trash"></i></button>'+
          '</td>'+
        '</tr>';
      }).join('');

  var subjectField = subjects.length > 0
    ? '<select id="exam-subj" class="form-control">'+subjects.map(function(s){return '<option value="'+s+'"'+((editItem&&editItem.subject===s)?' selected':'')+'>'+s+'</option>';}).join('')+'</select>'
    : '<input id="exam-subj" class="form-control" type="text" value="'+_mgEsc(editItem?editItem.subject:'')+'" placeholder="Subject"/>';

  return '<div class="card">'+
    '<div class="card-header"><div class="card-title"><i class="fas fa-clipboard-list" style="color:#1AA6CA"></i> Exam Schedule Manager</div></div>'+
    '<div style="padding:16px">'+
      '<div style="margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+
        '<label style="font-size:13px;font-weight:700;color:#374151">Class:</label>'+
        '<select class="form-control" style="max-width:200px" onchange="window._examMgrClass=this.value;window._examEditId=null;mgmtTab=\'exam-manager\';renderManagement()">'+clsOpts+'</select>'+
      '</div>'+
      '<div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e2e8f0">'+
        '<div style="font-size:13px;font-weight:800;color:#0F2050;margin-bottom:12px"><i class="fas fa-'+(editItem?'edit':'plus')+'" style="color:#C4893A;margin-right:6px"></i>'+(editItem?'Edit Exam':'Add Exam')+'</div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'+
          '<div><label class="form-label">Exam Name *</label><input id="exam-name" class="form-control" type="text" value="'+_mgEsc(editItem?editItem.examName:'')+'" placeholder="e.g. Mid-Term Examination"/></div>'+
          '<div><label class="form-label">Subject *</label>'+subjectField+'</div>'+
          '<div><label class="form-label">Date *</label><input id="exam-date" class="form-control" type="date" value="'+(editItem?editItem.date:'')+'"/></div>'+
          '<div><label class="form-label">Time</label><input id="exam-time" class="form-control" type="text" value="'+_mgEsc(editItem?editItem.time:'')+'" placeholder="e.g. 09:00 AM"/></div>'+
          '<div><label class="form-label">Duration</label><input id="exam-duration" class="form-control" type="text" value="'+_mgEsc(editItem?editItem.duration:'')+'" placeholder="e.g. 2 hours"/></div>'+
          '<div><label class="form-label">Venue</label><input id="exam-venue" class="form-control" type="text" value="'+_mgEsc(editItem?editItem.venue:'')+'" placeholder="e.g. Room 101"/></div>'+
        '</div>'+
        '<div style="margin-top:12px;display:flex;gap:8px">'+
          '<button class="btn btn-primary btn-sm" onclick="_saveExam(\''+_mgEsc(editId||'')+'\')"><i class="fas fa-save"></i> '+(editItem?'Update':'Add Exam')+'</button>'+
          (editItem?'<button class="btn btn-secondary btn-sm" onclick="window._examEditId=null;mgmtTab=\'exam-manager\';renderManagement()">Cancel</button>':'')+
        '</div>'+
      '</div>'+
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'+
        '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Exam Name</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Subject</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Date</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Time</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Duration</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Actions</th>'+
        '</tr></thead>'+
        '<tbody>'+rows+'</tbody>'+
      '</table></div>'+
    '</div>'+
  '</div>';
}

function _mgEsc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

window._saveExam = function(editId) {
  var name = (document.getElementById('exam-name').value||'').trim();
  var subj = (document.getElementById('exam-subj').value||'').trim();
  var date = document.getElementById('exam-date').value;
  var time = (document.getElementById('exam-time').value||'').trim();
  var duration = (document.getElementById('exam-duration').value||'').trim();
  var venue = (document.getElementById('exam-venue').value||'').trim();
  if (!name) { showToast('Exam name is required', 'error'); return; }
  if (!subj) { showToast('Subject is required', 'error'); return; }
  if (!date) { showToast('Date is required', 'error'); return; }
  var classId = window._examMgrClass || '';
  if (editId) {
    DB.updateExam(editId, { examName: name, subject: subj, date: date, time: time, duration: duration, venue: venue });
    showToast('Exam updated!', 'success');
  } else {
    DB.addExam({ id: DB.genId('ex'), classId: classId, examName: name, subject: subj, date: date, time: time, duration: duration, venue: venue });
    showToast('Exam added!', 'success');
  }
  window._examEditId = null;
  mgmtTab = 'exam-manager';
  renderManagement();
};

window._delExam = function(id) {
  confirmDialog('Delete this exam entry?', function() {
    DB.deleteExam(id);
    showToast('Exam deleted', 'success');
    mgmtTab = 'exam-manager';
    renderManagement();
  });
};

// ============================================================
// SUPERADMIN — MEAL MENU MANAGER
// ============================================================
function renderMealManagerTab() {
  var days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  var meals = ['Breakfast','Lunch','Snack'];
  var today = new Date();
  var startOfWeek = new Date(today);
  var dow = today.getDay();
  startOfWeek.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  var weekKey = window._mealWeek || startOfWeek.toISOString().split('T')[0];
  var menuData = DB.getMealMenu(weekKey) || {};

  function fmtWeek(wk) {
    var d = new Date(wk);
    var end = new Date(d); end.setDate(d.getDate() + 4);
    var opts = { month:'short', day:'numeric' };
    return d.toLocaleDateString('en-IN', opts) + ' – ' + end.toLocaleDateString('en-IN', opts);
  }

  function prevWeek(wk) {
    var d = new Date(wk); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
  }
  function nextWeek(wk) {
    var d = new Date(wk); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0];
  }

  var tableRows = meals.map(function(meal) {
    return '<tr style="border-bottom:1px solid #f1f5f9">'+
      '<td style="padding:10px 12px;font-weight:700;color:#0F2050;background:#f8fafc;min-width:90px">'+meal+'</td>'+
      days.map(function(day) {
        var val = (menuData[day] && menuData[day][meal]) ? menuData[day][meal] : '';
        return '<td style="padding:6px 8px"><input id="meal-'+day+'-'+meal+'" class="form-control" style="min-width:130px;font-size:12px" type="text" value="'+_mgEsc(val)+'" placeholder="e.g. Idli & Chutney"/></td>';
      }).join('')+
    '</tr>';
  }).join('');

  return '<div class="card">'+
    '<div class="card-header"><div class="card-title"><i class="fas fa-utensils" style="color:#10b981"></i> Weekly Meal Menu</div></div>'+
    '<div style="padding:16px">'+
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">'+
        '<button class="btn btn-secondary btn-sm" onclick="window._mealWeek=\''+prevWeek(weekKey)+'\';mgmtTab=\'meal-manager\';renderManagement()"><i class="fas fa-chevron-left"></i></button>'+
        '<span style="font-weight:700;color:#0F2050;font-size:14px">Week of '+fmtWeek(weekKey)+'</span>'+
        '<button class="btn btn-secondary btn-sm" onclick="window._mealWeek=\''+nextWeek(weekKey)+'\';mgmtTab=\'meal-manager\';renderManagement()"><i class="fas fa-chevron-right"></i></button>'+
      '</div>'+
      '<div style="overflow-x:auto;margin-bottom:16px">'+
        '<table style="width:100%;border-collapse:collapse;font-size:13px">'+
          '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
            '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700;min-width:90px">Meal</th>'+
            days.map(function(d){return '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700;min-width:140px">'+d+'</th>';}).join('')+
          '</tr></thead>'+
          '<tbody>'+tableRows+'</tbody>'+
        '</table>'+
      '</div>'+
      '<div style="margin-bottom:16px">'+
        '<label style="font-size:13px;font-weight:700;color:#0F2050;display:block;margin-bottom:6px"><i class="fas fa-sticky-note" style="color:#C4893A;margin-right:6px"></i>Special Instructions to Parents</label>'+
        '<textarea id="meal-special-instructions" class="form-control" rows="3" placeholder="e.g. Please send a water bottle. No nuts this week. Children should bring their tiffin box on Wednesday...">'+_mgEsc(menuData._instructions||'')+'</textarea>'+
        '<div style="font-size:11px;color:#94a3b8;margin-top:4px">This note will appear prominently on the parent meal menu page for this week.</div>'+
      '</div>'+
      '<button class="btn btn-primary" onclick="_saveMealMenu(\''+weekKey+'\')"><i class="fas fa-save"></i> Save Menu for This Week</button>'+
      '<div style="margin-top:12px;padding:10px 14px;background:#eff6ff;border-radius:8px;font-size:12px;color:#1e40af">'+
        '<i class="fas fa-info-circle" style="margin-right:6px"></i>This menu and special instructions are visible to parents in the parent portal under Meal Menu.'+
      '</div>'+
    '</div>'+
  '</div>';
}

window._saveMealMenu = function(weekKey) {
  var days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  var meals = ['Breakfast','Lunch','Snack'];
  var menuData = {};
  days.forEach(function(day) {
    menuData[day] = {};
    meals.forEach(function(meal) {
      var el = document.getElementById('meal-'+day+'-'+meal);
      menuData[day][meal] = el ? el.value.trim() : '';
    });
  });
  var instrEl = document.getElementById('meal-special-instructions');
  menuData._instructions = instrEl ? instrEl.value.trim() : '';
  DB.saveMealMenu(weekKey, menuData);
  showToast('Meal menu saved!', 'success');
};

// ============================================================
// SUPERADMIN — FEE RECORDS MANAGER
// ============================================================
function renderFeeManagerTab() {
  var data = DB.get();
  var students = DB.getStudents(null);
  var classes = data.classes || [];
  var filterClass = window._feeMgrClass || '';
  var filterStatus = window._feeMgrStatus || '';

  var allFees = DB.getFeeRecords(null);
  var filtered = allFees.filter(function(f) {
    var stu = DB.getStudent(f.studentId);
    if (filterClass && (!stu || stu.classId !== filterClass)) return false;
    if (filterStatus && f.status !== filterStatus) return false;
    return true;
  });

  var totalAmount = filtered.reduce(function(s,f){return s+(parseFloat(f.amount)||0);},0);
  var paidAmount = filtered.filter(function(f){return f.status==='Paid';}).reduce(function(s,f){return s+(parseFloat(f.amount)||0);},0);
  var pendingAmount = filtered.filter(function(f){return f.status!=='Paid';}).reduce(function(s,f){return s+(parseFloat(f.amount)||0);},0);

  var clsOpts = '<option value="">All Classes</option>'+classes.map(function(c){return '<option value="'+c.id+'"'+(filterClass===c.id?' selected':'')+'>'+_mgEsc(c.name)+'</option>';}).join('');
  var statusOpts = '<option value="">All Status</option>'+['Pending','Paid','Overdue'].map(function(s){return '<option value="'+s+'"'+(filterStatus===s?' selected':'')+'>'+s+'</option>';}).join('');
  var stuOpts = '<option value="">Select Student</option>'+students.map(function(s){return '<option value="'+s.id+'">'+_mgEsc(s.name)+'</option>';}).join('');

  var statusColor = { Paid:'#065f46', Pending:'#92400e', Overdue:'#991b1b' };
  var statusBg = { Paid:'#d1fae5', Pending:'#fef3c7', Overdue:'#fee2e2' };

  var rows = filtered.length === 0
    ? '<tr><td colspan="7" style="text-align:center;padding:32px;color:#94a3b8">No fee records found.</td></tr>'
    : filtered.map(function(f) {
        var stu = DB.getStudent(f.studentId);
        var cls = stu ? DB.getClass(stu.classId) : null;
        var sc = statusColor[f.status]||'#475569';
        var sb = statusBg[f.status]||'#f1f5f9';
        return '<tr style="border-bottom:1px solid #f1f5f9">'+
          '<td style="padding:10px 12px;font-weight:600;color:#0F2050">'+_mgEsc(stu?stu.name:'—')+'</td>'+
          '<td style="padding:10px 12px;color:#64748b;font-size:11px">'+_mgEsc(cls?cls.name:'—')+'</td>'+
          '<td style="padding:10px 12px;color:#475569">'+_mgEsc(f.term||'—')+'</td>'+
          '<td style="padding:10px 12px;font-weight:700;color:#0F2050">₹'+parseFloat(f.amount||0).toLocaleString('en-IN')+'</td>'+
          '<td style="padding:10px 12px;color:#64748b">'+(f.dueDate||'—')+'</td>'+
          '<td style="padding:10px 12px"><span style="background:'+sb+';color:'+sc+';padding:2px 9px;border-radius:6px;font-size:11px;font-weight:700">'+_mgEsc(f.status||'—')+'</span></td>'+
          '<td style="padding:10px 12px">'+
            (f.status !== 'Paid' ? '<button class="btn btn-xs" style="background:#d1fae5;color:#065f46" onclick="_markFeePaid(\''+f.id+'\')"><i class="fas fa-check"></i> Paid</button> ' : '')+
            '<button class="btn btn-xs btn-danger" onclick="_deleteFeeRecord(\''+f.id+'\')"><i class="fas fa-trash"></i></button>'+
          '</td>'+
        '</tr>';
      }).join('');

  return '<div class="card">'+
    '<div class="card-header"><div class="card-title"><i class="fas fa-rupee-sign" style="color:#C4893A"></i> Fee Management</div>'+
      '<button class="btn btn-primary btn-sm" onclick="_openAddFeeModal()"><i class="fas fa-plus"></i> Add Invoice</button>'+
    '</div>'+
    '<div style="padding:16px">'+
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">'+
        '<div style="background:#eff6ff;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:900;color:#1e40af">₹'+totalAmount.toLocaleString('en-IN')+'</div><div style="font-size:11px;color:#1e40af;font-weight:700">Total Invoiced</div></div>'+
        '<div style="background:#d1fae5;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:900;color:#065f46">₹'+paidAmount.toLocaleString('en-IN')+'</div><div style="font-size:11px;color:#065f46;font-weight:700">Collected</div></div>'+
        '<div style="background:#fee2e2;border-radius:12px;padding:14px;text-align:center"><div style="font-size:20px;font-weight:900;color:#991b1b">₹'+pendingAmount.toLocaleString('en-IN')+'</div><div style="font-size:11px;color:#991b1b;font-weight:700">Pending / Overdue</div></div>'+
      '</div>'+
      '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">'+
        '<select class="form-control" style="max-width:180px" onchange="window._feeMgrClass=this.value;mgmtTab=\'fee-manager\';renderManagement()">'+clsOpts+'</select>'+
        '<select class="form-control" style="max-width:150px" onchange="window._feeMgrStatus=this.value;mgmtTab=\'fee-manager\';renderManagement()">'+statusOpts+'</select>'+
      '</div>'+
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'+
        '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Student</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Class</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Term</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Amount</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Due Date</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Status</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Actions</th>'+
        '</tr></thead>'+
        '<tbody>'+rows+'</tbody>'+
      '</table></div>'+
    '</div>'+
  '</div>';
}

window._openAddFeeModal = function() {
  var students = DB.getStudents(null);
  var stuOpts = '<option value="">Select Student</option>'+students.map(function(s){return '<option value="'+s.id+'">'+_mgEsc(s.name)+'</option>';}).join('');
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'fee-add-modal';
  overlay.innerHTML = '<div class="modal" style="max-width:500px;width:calc(100% - 24px)">'+
    '<div class="modal-header"><h3 class="modal-title"><i class="fas fa-rupee-sign" style="color:#C4893A;margin-right:8px"></i>Add Fee Invoice</h3>'+
      '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'fee-add-modal\').remove()"><i class="fas fa-times"></i></button></div>'+
    '<div class="modal-body" style="padding:20px">'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
        '<div style="grid-column:1/-1"><label class="form-label">Student *</label><select id="fam-stu" class="form-control">'+stuOpts+'</select></div>'+
        '<div><label class="form-label">Term *</label><select id="fam-term" class="form-control"><option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Q1</option><option>Q2</option><option>Annual</option><option>Monthly</option></select></div>'+
        '<div><label class="form-label">Amount (₹) *</label><input id="fam-amt" class="form-control" type="number" min="0" placeholder="e.g. 15000"/></div>'+
        '<div><label class="form-label">Due Date *</label><input id="fam-due" class="form-control" type="date"/></div>'+
        '<div><label class="form-label">Status</label><select id="fam-status" class="form-control"><option>Pending</option><option>Paid</option><option>Overdue</option></select></div>'+
        '<div style="grid-column:1/-1"><label class="form-label">Description</label><input id="fam-desc" class="form-control" type="text" placeholder="Optional notes"/></div>'+
      '</div>'+
    '</div>'+
    '<div class="modal-footer" style="padding:14px 20px;display:flex;justify-content:flex-end;gap:8px">'+
      '<button class="btn btn-secondary" onclick="document.getElementById(\'fee-add-modal\').remove()">Cancel</button>'+
      '<button class="btn btn-primary" onclick="_submitAddFee()"><i class="fas fa-save"></i> Add Invoice</button>'+
    '</div>'+
  '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){if(e.target===overlay)overlay.remove();});
};

window._submitAddFee = function() {
  var studentId = document.getElementById('fam-stu').value;
  var term = document.getElementById('fam-term').value;
  var amount = parseFloat(document.getElementById('fam-amt').value)||0;
  var dueDate = document.getElementById('fam-due').value;
  var status = document.getElementById('fam-status').value;
  var desc = (document.getElementById('fam-desc').value||'').trim();
  if (!studentId) { showToast('Please select a student', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Amount is required', 'error'); return; }
  if (!dueDate) { showToast('Due date is required', 'error'); return; }
  var now = new Date().toISOString().split('T')[0];
  DB.addFeeRecord({ id: DB.genId('fee'), studentId: studentId, invoiceNo: 'INV-'+Date.now(), term: term, amount: amount, dueDate: dueDate, paidDate: status==='Paid'?now:null, status: status, description: desc, createdAt: now });
  showToast('Fee invoice added!', 'success');
  document.getElementById('fee-add-modal').remove();
  mgmtTab = 'fee-manager';
  renderManagement();
};

window._markFeePaid = function(id) {
  var today = new Date().toISOString().split('T')[0];
  DB.updateFeeRecord(id, { status: 'Paid', paidDate: today });
  showToast('Marked as Paid!', 'success');
  mgmtTab = 'fee-manager';
  renderManagement();
};

window._deleteFeeRecord = function(id) {
  confirmDialog('Delete this fee record?', function() {
    // deleteAssignment reuses pattern — we inline delete here
    var data = DB.get();
    data.feeRecords = (data.feeRecords||[]).filter(function(r){return r.id!==id;});
    DB.commit();
    showToast('Deleted', 'success');
    mgmtTab = 'fee-manager';
    renderManagement();
  });
};

// ============================================================
// SUPERADMIN — GRIEVANCE MANAGER
// ============================================================
function renderGrievanceManagerTab() {
  var filterStatus = window._grievFilter || '';
  var allGrievances = DB.getGrievances(null);
  var filtered = filterStatus ? allGrievances.filter(function(g){return g.status===filterStatus;}) : allGrievances;

  var statusColor = { Open:'#ef4444', 'In Review':'#f59e0b', Resolved:'#10b981' };
  var statusBg = { Open:'#fee2e2', 'In Review':'#fef3c7', Resolved:'#d1fae5' };
  var prioColor = { High:'#ef4444', Medium:'#f59e0b', Low:'#10b981' };

  var openCount = allGrievances.filter(function(g){return g.status==='Open';}).length;
  var inReviewCount = allGrievances.filter(function(g){return g.status==='In Review';}).length;
  var resolvedCount = allGrievances.filter(function(g){return g.status==='Resolved';}).length;

  var rows = filtered.length === 0
    ? '<tr><td colspan="7" style="text-align:center;padding:32px;color:#94a3b8">No grievances found.</td></tr>'
    : filtered.map(function(g) {
        var parent = g.parentId ? DB.getUser(g.parentId) : null;
        var parentName = parent ? _mgEsc(parent.name) : 'Unknown';
        var sc = statusColor[g.status]||'#475569';
        var sb = statusBg[g.status]||'#f1f5f9';
        var pc = prioColor[g.priority]||'#475569';
        return '<tr style="border-bottom:1px solid #f1f5f9">'+
          '<td style="padding:10px 12px;font-weight:600;color:#0F2050">'+parentName+'</td>'+
          '<td style="padding:10px 12px;color:#475569">'+_mgEsc(g.category||'—')+'</td>'+
          '<td style="padding:10px 12px;color:#374151;max-width:200px;font-size:12px">'+_mgEsc((g.subject||'').slice(0,50))+'</td>'+
          '<td style="padding:10px 12px"><span style="color:'+pc+';font-weight:700;font-size:12px">'+_mgEsc(g.priority||'—')+'</span></td>'+
          '<td style="padding:10px 12px;color:#64748b;font-size:11px">'+(g.submittedDate||'—')+'</td>'+
          '<td style="padding:10px 12px"><span style="background:'+sb+';color:'+sc+';padding:2px 9px;border-radius:6px;font-size:11px;font-weight:700">'+_mgEsc(g.status||'Open')+'</span></td>'+
          '<td style="padding:10px 12px">'+
            '<button class="btn btn-xs btn-primary" onclick="_openGrievanceDetail(\''+g.id+'\')"><i class="fas fa-eye"></i> View</button>'+
          '</td>'+
        '</tr>';
      }).join('');

  return '<div class="card">'+
    '<div class="card-header"><div class="card-title"><i class="fas fa-comment-dots" style="color:#ef4444"></i> Grievance Manager</div></div>'+
    '<div style="padding:16px">'+
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">'+
        '<div style="background:#fee2e2;border-radius:12px;padding:14px;text-align:center"><div style="font-size:22px;font-weight:900;color:#991b1b">'+openCount+'</div><div style="font-size:11px;color:#991b1b;font-weight:700">Open</div></div>'+
        '<div style="background:#fef3c7;border-radius:12px;padding:14px;text-align:center"><div style="font-size:22px;font-weight:900;color:#92400e">'+inReviewCount+'</div><div style="font-size:11px;color:#92400e;font-weight:700">In Review</div></div>'+
        '<div style="background:#d1fae5;border-radius:12px;padding:14px;text-align:center"><div style="font-size:22px;font-weight:900;color:#065f46">'+resolvedCount+'</div><div style="font-size:11px;color:#065f46;font-weight:700">Resolved</div></div>'+
      '</div>'+
      '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'+
        ['','Open','In Review','Resolved'].map(function(s){return '<button class="btn btn-sm '+(filterStatus===s?'btn-primary':'btn-secondary')+'" onclick="window._grievFilter=\''+s+'\';mgmtTab=\'grievance-manager\';renderManagement()">'+(s||'All')+'</button>';}).join('')+
      '</div>'+
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'+
        '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Parent</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Category</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Subject</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Priority</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Submitted</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Status</th>'+
          '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Action</th>'+
        '</tr></thead>'+
        '<tbody>'+rows+'</tbody>'+
      '</table></div>'+
    '</div>'+
  '</div>';
}

window._openGrievanceDetail = function(id) {
  var allGrievances = DB.getGrievances(null);
  var g = allGrievances.find(function(x){return x.id===id;});
  if (!g) return;
  var parent = g.parentId ? DB.getUser(g.parentId) : null;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'grievance-detail-modal';
  overlay.innerHTML = '<div class="modal" style="max-width:600px;width:calc(100% - 24px)">'+
    '<div class="modal-header"><h3 class="modal-title"><i class="fas fa-comment-dots" style="color:#ef4444;margin-right:8px"></i>Grievance Details</h3>'+
      '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'grievance-detail-modal\').remove()"><i class="fas fa-times"></i></button></div>'+
    '<div style="padding:20px">'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;font-size:13px">'+
        '<div><span style="color:#64748b;font-weight:600">Parent:</span> <strong>'+_mgEsc(parent?parent.name:'Unknown')+'</strong></div>'+
        '<div><span style="color:#64748b;font-weight:600">Category:</span> '+_mgEsc(g.category||'—')+'</div>'+
        '<div><span style="color:#64748b;font-weight:600">Priority:</span> <strong style="color:'+(g.priority==='High'?'#ef4444':g.priority==='Medium'?'#f59e0b':'#10b981')+'">'+_mgEsc(g.priority||'—')+'</strong></div>'+
        '<div><span style="color:#64748b;font-weight:600">Submitted:</span> '+(g.submittedDate||'—')+'</div>'+
      '</div>'+
      '<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:4px">Subject</div><div style="font-size:13px;color:#374151">'+_mgEsc(g.subject||'—')+'</div></div>'+
      '<div style="margin-bottom:16px"><div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:4px">Description</div><div style="font-size:13px;color:#374151;background:#f8fafc;padding:10px;border-radius:8px">'+_mgEsc(g.description||'—')+'</div></div>'+
      (g.resolutionNote ? '<div style="margin-bottom:12px;padding:12px;background:#d1fae5;border-radius:8px"><div style="font-size:11px;font-weight:700;color:#065f46;margin-bottom:4px">RESOLUTION NOTE</div><div style="font-size:13px;color:#065f46">'+_mgEsc(g.resolutionNote)+'</div></div>' : '')+
      '<div style="margin-bottom:8px"><label class="form-label">Resolution Note</label><textarea id="griev-note" class="form-control" rows="3" placeholder="Add resolution note...">'+_mgEsc(g.resolutionNote||'')+'</textarea></div>'+
    '</div>'+
    '<div class="modal-footer" style="padding:14px 20px;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap">'+
      '<button class="btn btn-secondary" onclick="document.getElementById(\'grievance-detail-modal\').remove()">Close</button>'+
      (g.status!=='In Review'?'<button class="btn btn-warning" onclick="_updateGrievanceStatus(\''+id+'\',\'In Review\')"><i class="fas fa-search"></i> Mark In Review</button>':'')+
      (g.status!=='Resolved'?'<button class="btn btn-success" onclick="_updateGrievanceStatus(\''+id+'\',\'Resolved\')"><i class="fas fa-check"></i> Mark Resolved</button>':'')+
    '</div>'+
  '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){if(e.target===overlay)overlay.remove();});
};

window._updateGrievanceStatus = function(id, status) {
  var note = (document.getElementById('griev-note')||{}).value || '';
  DB.updateGrievance(id, { status: status, resolutionNote: note, resolvedDate: status==='Resolved'?new Date().toISOString().split('T')[0]:undefined });
  showToast('Grievance updated to ' + status, 'success');
  var m = document.getElementById('grievance-detail-modal');
  if (m) m.remove();
  mgmtTab = 'grievance-manager';
  renderManagement();
};

// ============================================================
// DOCUMENTS TAB
// ============================================================

if (typeof window._docSubTab === 'undefined') window._docSubTab = 'students';
if (typeof window._docClassId === 'undefined') window._docClassId = '';
if (typeof window._docStudentId === 'undefined') window._docStudentId = '';
if (typeof window._docTeacherId === 'undefined') window._docTeacherId = '';

function renderDocumentsTab() {
  return '<div id="documents-wrap"><div style="text-align:center;padding:32px;color:#6B7A9D"><i class="fas fa-spinner fa-spin"></i> Loading…</div></div>';
}

function loadDocumentsTab() {
  var wrap = document.getElementById('documents-wrap');
  if (!wrap) return;
  var subTab = window._docSubTab || 'students';

  var subTabBar = '<div style="display:flex;gap:8px;margin-bottom:20px">' +
    ['students','teachers'].map(function(st) {
      var labels = { students: '<i class="fas fa-user-graduate"></i> Student Documents', teachers: '<i class="fas fa-chalkboard-teacher"></i> Teacher Documents' };
      var active = subTab === st;
      return '<button class="btn' + (active ? ' btn-primary' : ' btn-secondary') + '" onclick="window._docSubTab=\'' + st + '\';loadDocumentsTab()">' + labels[st] + '</button>';
    }).join('') +
  '</div>';

  var body = '';
  if (subTab === 'students') {
    body = _renderStudentDocsSubTab();
  } else {
    body = _renderTeacherDocsSubTab();
  }

  wrap.innerHTML = '<div class="card"><div class="card-header"><div class="card-title"><i class="fas fa-file-alt" style="color:#C4893A"></i> Documents</div></div><div style="padding:16px">' + subTabBar + body + '</div></div>';
}

function _renderStudentDocsSubTab() {
  var classes = DB.get().classes || [];
  var selClass = window._docClassId || '';
  var selStudent = window._docStudentId || '';
  var students = selClass ? DB.getStudents(selClass) : [];
  var student = selStudent ? DB.getStudent(selStudent) : null;
  var customization = student ? DB.getDocCustomization(selStudent) : {};

  var clsOpts = '<option value="">-- Select Class --</option>' + classes.map(function(c) {
    return '<option value="' + c.id + '"' + (selClass === c.id ? ' selected' : '') + '>' + _mgEsc(c.name) + '</option>';
  }).join('');

  var stuOpts = '<option value="">-- Select Student --</option>' + students.map(function(s) {
    return '<option value="' + s.id + '"' + (selStudent === s.id ? ' selected' : '') + '>' + _mgEsc(s.name) + ' (' + _mgEsc(s.rollNo) + ')</option>';
  }).join('');

  var filterRow = '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:20px;padding:14px;background:#F8F9FB;border-radius:12px;border:1px solid #EDF0F7">' +
    '<div><label class="form-label">Class</label><select class="form-control" onchange="window._docClassId=this.value;window._docStudentId=\'\';loadDocumentsTab()">' + clsOpts + '</select></div>' +
    (selClass ? '<div><label class="form-label">Student</label><select class="form-control" onchange="window._docStudentId=this.value;loadDocumentsTab()">' + stuOpts + '</select></div>' : '') +
  '</div>';

  var cardsHtml = '';
  if (student) {
    var cls = DB.getClass(student.classId);
    var docTypes = [
      { key: 'admit', title: 'Admit Card', icon: 'fa-id-card', desc: 'Exam admit card with schedule and student details.' },
      { key: 'bonafide', title: 'Bonafide Certificate', icon: 'fa-certificate', desc: 'Certifies that the student is enrolled in this institution.' },
      { key: 'character', title: 'Character Certificate', icon: 'fa-award', desc: 'Certifies good character and conduct of the student.' },
    ];
    cardsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">' +
      docTypes.map(function(dt) {
        return '<div style="border:1.5px solid #DCE1EF;border-radius:14px;padding:18px;background:#fff;box-shadow:0 2px 8px rgba(15,32,80,0.04)">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' +
            '<div style="width:44px;height:44px;border-radius:12px;background:#0F205015;display:flex;align-items:center;justify-content:center">' +
              '<i class="fas ' + dt.icon + '" style="color:#0F2050;font-size:20px"></i>' +
            '</div>' +
            '<div><div style="font-weight:700;color:#0F2050;font-size:15px">' + dt.title + '</div><div style="font-size:11px;color:#6B7A9D;margin-top:2px">' + dt.desc + '</div></div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<button class="btn btn-secondary btn-sm" onclick="_openStudentDocModal(\'' + selStudent + '\',\'' + dt.key + '\')"><i class="fas fa-edit"></i> Edit &amp; Preview</button>' +
            '<button class="btn btn-primary btn-sm" onclick="_printStudentDocDirect(\'' + selStudent + '\',\'' + dt.key + '\')"><i class="fas fa-print"></i> Print / Export PDF</button>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  return filterRow + cardsHtml;
}

function _renderTeacherDocsSubTab() {
  var teachers = DB.getSubAdmins();
  var selTeacher = window._docTeacherId || '';
  var teacher = selTeacher ? DB.getUser(selTeacher) : null;

  var tchOpts = '<option value="">-- Select Teacher --</option>' + teachers.map(function(t) {
    return '<option value="' + t.id + '"' + (selTeacher === t.id ? ' selected' : '') + '>' + _mgEsc(t.name) + '</option>';
  }).join('');

  var filterRow = '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:20px;padding:14px;background:#F8F9FB;border-radius:12px;border:1px solid #EDF0F7">' +
    '<div><label class="form-label">Teacher</label><select class="form-control" onchange="window._docTeacherId=this.value;loadDocumentsTab()">' + tchOpts + '</select></div>' +
  '</div>';

  var cardsHtml = '';
  if (teacher) {
    var docTypes = [
      { key: 'joining', title: 'Joining / Appointment Letter', icon: 'fa-user-check', desc: 'Formal appointment confirmation letter.' },
      { key: 'offer', title: 'Offer Letter', icon: 'fa-envelope-open-text', desc: 'Pre-joining offer with CTC and terms.' },
      { key: 'experience', title: 'Experience Letter', icon: 'fa-certificate', desc: 'Certifies tenure and experience.' },
      { key: 'increment', title: 'Increment Letter', icon: 'fa-chart-line', desc: 'Salary revision / increment notification.' },
      { key: 'promotion', title: 'Promotion Letter', icon: 'fa-arrow-up', desc: 'Promotion to new designation.' },
      { key: 'relieving', title: 'Relieving Letter', icon: 'fa-sign-out-alt', desc: 'Relieving from duties on last working day.' },
      { key: 'salary-cert', title: 'Salary Certificate', icon: 'fa-rupee-sign', desc: 'Monthly salary certificate for bank/visa.' },
      { key: 'noc', title: 'NOC (No Objection Certificate)', icon: 'fa-check-square', desc: 'No objection for travel, education, or other purposes.' },
    ];
    cardsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">' +
      docTypes.map(function(dt) {
        return '<div style="border:1.5px solid #DCE1EF;border-radius:14px;padding:18px;background:#fff;box-shadow:0 2px 8px rgba(15,32,80,0.04)">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' +
            '<div style="width:44px;height:44px;border-radius:12px;background:#C4893A15;display:flex;align-items:center;justify-content:center">' +
              '<i class="fas ' + dt.icon + '" style="color:#C4893A;font-size:20px"></i>' +
            '</div>' +
            '<div><div style="font-weight:700;color:#0F2050;font-size:14px">' + dt.title + '</div><div style="font-size:11px;color:#6B7A9D;margin-top:2px">' + dt.desc + '</div></div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<button class="btn btn-secondary btn-sm" onclick="_openTeacherDocModal(\'' + selTeacher + '\',\'' + dt.key + '\')"><i class="fas fa-edit"></i> Customize &amp; Generate</button>' +
            '<button class="btn btn-primary btn-sm" onclick="_printTeacherDocDirect(\'' + selTeacher + '\',\'' + dt.key + '\')"><i class="fas fa-print"></i> Print / Export PDF</button>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  return filterRow + cardsHtml;
}

// ---- Shared signature + stamp area builder ----
function buildDocSignatureArea(meta, opts) {
  opts = opts || {};
  var leftLabel  = opts.leftLabel  || 'Class Teacher';
  var rightLabel = opts.rightLabel || (meta.principalName || 'Principal');
  var showLeft   = opts.showLeft !== false;

  var stampSize  = parseInt(meta.stampSize  || 90, 10);
  var signWidth  = parseInt(meta.signWidth  || 150, 10);
  var signHeight = parseInt(meta.signHeight || 60, 10);

  // Read images from localStorage (not meta — too large for DB sync)
  var stampImg = getDocStamp();
  var signImg  = getDocSign();

  // Signature block (center of right column)
  var signBlock = signImg
    ? '<img src="' + signImg + '" style="display:block;width:' + signWidth + 'px;height:' + signHeight + 'px;object-fit:contain;margin:0 auto 4px;-webkit-print-color-adjust:exact;print-color-adjust:exact"/>'
    : '<div style="height:' + signHeight + 'px"></div>';

  // Stamp block (circular, on the opposite side)
  var stampBlock = stampImg
    ? '<img src="' + stampImg + '" style="display:block;width:' + stampSize + 'px;height:' + stampSize + 'px;object-fit:contain;-webkit-print-color-adjust:exact;print-color-adjust:exact"/>'
    : '<div style="width:' + stampSize + 'px;height:' + stampSize + 'px;border-radius:50%;border:2px dashed #ccc;display:inline-block;font-size:9px;color:#aaa;text-align:center;line-height:' + stampSize + 'px">SEAL</div>';

  var sigTd = 'border:none;border-top:none;border-bottom:none';

  var dividerCol = '<td width="40" style="' + sigTd + '"></td>';

  // Left column: teacher line OR stamp
  var leftCol, middleCol;
  if (showLeft) {
    leftCol = '<td width="30%" style="' + sigTd + ';vertical-align:bottom;padding-right:8px">' +
      '<div style="height:' + signHeight + 'px"></div>' +
      '<div style="border-bottom:1.5px solid #0F1E3D;margin-bottom:6px"></div>' +
      '<div style="font-size:11px;font-weight:700;color:#0F2050">' + _mgEsc(leftLabel) + '</div>' +
    '</td>';
    middleCol = dividerCol +
      '<td width="28%" style="' + sigTd + ';vertical-align:bottom;text-align:center;padding:0 8px">' +
        '<div style="margin:0 auto;display:inline-block">' + stampBlock + '</div>' +
      '</td>' +
      dividerCol;
  } else {
    leftCol = '<td style="' + sigTd + ';vertical-align:bottom;text-align:left">' +
      '<div style="display:inline-block">' + stampBlock + '</div>' +
    '</td>';
    middleCol = dividerCol;
  }

  // Right column: signature image + line + name
  var rightCol = '<td width="30%" style="' + sigTd + ';vertical-align:bottom;text-align:center;padding-left:8px">' +
    signBlock +
    '<div style="border-bottom:1.5px solid #0F1E3D;margin-bottom:6px"></div>' +
    '<div style="font-size:11px;font-weight:700;color:#0F2050">' + _mgEsc(rightLabel) + '</div>' +
  '</td>';

  return '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:44px;border-collapse:collapse;border:none">' +
    '<tr>' + leftCol + middleCol + rightCol + '</tr>' +
  '</table>';
}

// ---- Shared letterhead builder ----
function buildDocLetterhead(meta) {
  var logo = meta.schoolLogo || '/static/school-logo.png';
  var sName = meta.schoolName || 'SuperKids India Preschool';
  var addr = (meta.schoolAddress || '').replace(/\n/g, ', ');
  var phone = meta.schoolPhone || '';
  var email = meta.schoolEmail || '';
  var website = meta.schoolWebsite || '';
  var contactParts = [];
  if (phone) contactParts.push('Tel: ' + phone);
  if (email) contactParts.push('Email: ' + email);
  if (website) contactParts.push(website);
  var contactLine = contactParts.join('  |  ');

  var tdBase = 'border:none;background:#0F2050;-webkit-print-color-adjust:exact;print-color-adjust:exact';
  return '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#0F2050;-webkit-print-color-adjust:exact;print-color-adjust:exact">' +
    '<tr>' +
      '<td width="108" style="' + tdBase + ';padding:16px 8px 16px 18px;vertical-align:middle;text-align:center">' +
        '<div style="width:78px;height:78px;border-radius:50%;border:3px solid #C4893A;overflow:hidden;background:#fff;display:inline-block;line-height:0;-webkit-print-color-adjust:exact;print-color-adjust:exact">' +
          '<img src="' + logo + '" width="72" height="72" style="display:block;border-radius:50%;object-fit:cover;-webkit-print-color-adjust:exact;print-color-adjust:exact" onerror="this.style.display=\'none\'"/>' +
        '</div>' +
      '</td>' +
      '<td style="' + tdBase + ';padding:16px 20px;text-align:center;vertical-align:middle">' +
        '<div style="font-family:Georgia,serif;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:0.8px;line-height:1.2">' + sName + '</div>' +
        (addr ? '<div style="font-size:11px;color:#C4893A;margin-top:6px">' + addr + '</div>' : '') +
        (contactLine ? '<div style="font-size:10px;color:#b0bec5;margin-top:4px">' + contactLine + '</div>' : '') +
      '</td>' +
    '</tr>' +
    '<tr>' +
      '<td colspan="2" style="border:none;height:5px;background:#C4893A;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact"></td>' +
    '</tr>' +
  '</table>';
}

// ---- Student doc modal ----
window._openStudentDocModal = function(studentId, docKey) {
  var student = DB.getStudent(studentId);
  if (!student) return;
  var cust = DB.getDocCustomization(studentId);
  var titles = { admit: 'Admit Card', bonafide: 'Bonafide Certificate', character: 'Character Certificate' };

  var fields = '';
  if (docKey === 'admit') {
    fields = '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">Academic Year</label><input class="form-control" id="dcust-year" value="' + _mgEsc(cust.admitYear || (getAcademicYear ? getAcademicYear() : '2025-26')) + '"/></div>' +
      '<div class="form-group"><label class="form-label">Custom Note</label><input class="form-control" id="dcust-note" value="' + _mgEsc(cust.admitNote || '') + '" placeholder="Optional note"/></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Instructions Text</label><textarea class="form-control" id="dcust-instructions" rows="3">' + _mgEsc(cust.admitInstructions || 'Bring this admit card on all examination days. No candidate will be allowed without the admit card. Mobile phones are strictly prohibited in exam halls.') + '</textarea></div>';
  } else if (docKey === 'bonafide') {
    fields = '<div class="form-group"><label class="form-label">Purpose</label><select class="form-control" id="dcust-purpose" onchange="document.getElementById(\'dcust-custpurpose\').style.display=this.value===\'custom\'?\'block\':\'none\'">' +
      ['for general purposes','for bank account opening','for visa application','custom'].map(function(p) {
        return '<option value="' + p + '"' + ((cust.bonafidePurpose||'for general purposes')===p?' selected':'') + '>' + p + '</option>';
      }).join('') +
    '</select></div>' +
    '<div class="form-group" id="dcust-custpurpose" style="display:' + ((cust.bonafidePurpose||'for general purposes')==='custom'?'block':'none') + '"><label class="form-label">Custom Purpose</label><input class="form-control" id="dcust-custpurposeval" value="' + _mgEsc(cust.bonafideCustomPurpose||'') + '"/></div>' +
    '<div class="form-group"><label class="form-label">Custom Body Paragraph (optional)</label><textarea class="form-control" id="dcust-body" rows="4">' + _mgEsc(cust.bonafideBody||'') + '</textarea></div>';
  } else if (docKey === 'character') {
    fields = '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">Conduct Description</label><input class="form-control" id="dcust-conduct" value="' + _mgEsc(cust.characterConduct||'satisfactory') + '"/></div>' +
      '<div class="form-group"><label class="form-label">Purpose</label><input class="form-control" id="dcust-charpurpose" value="' + _mgEsc(cust.characterPurpose||'bonafide purposes') + '"/></div>' +
    '</div>';
  }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal modal-lg">' +
    '<div class="modal-header"><h2 class="modal-title"><i class="fas fa-edit" style="color:#C4893A;margin-right:8px"></i>Edit ' + titles[docKey] + ' — ' + _mgEsc(student.name) + '</h2><button class="close-btn" onclick="this.closest(\'.modal-overlay\').remove()">✕</button></div>' +
    '<div class="modal-body">' + fields + '</div>' +
    '<div class="modal-footer">' +
      '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
      '<button class="btn btn-primary" onclick="_saveAndPrintStudentDoc(\'' + studentId + '\',\'' + docKey + '\');this.closest(\'.modal-overlay\').remove()"><i class="fas fa-print"></i> Save &amp; Print</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(overlay);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
};

window._saveAndPrintStudentDoc = function(studentId, docKey) {
  var cust = {};
  if (docKey === 'admit') {
    cust.admitYear = (document.getElementById('dcust-year')||{}).value || '';
    cust.admitInstructions = (document.getElementById('dcust-instructions')||{}).value || '';
    cust.admitNote = (document.getElementById('dcust-note')||{}).value || '';
  } else if (docKey === 'bonafide') {
    cust.bonafidePurpose = (document.getElementById('dcust-purpose')||{}).value || 'for general purposes';
    cust.bonafideCustomPurpose = (document.getElementById('dcust-custpurposeval')||{}).value || '';
    cust.bonafideBody = (document.getElementById('dcust-body')||{}).value || '';
  } else if (docKey === 'character') {
    cust.characterConduct = (document.getElementById('dcust-conduct')||{}).value || 'satisfactory';
    cust.characterPurpose = (document.getElementById('dcust-charpurpose')||{}).value || 'bonafide purposes';
  }
  DB.saveDocCustomization(studentId, cust);
  _printStudentDocDirect(studentId, docKey);
};

window._printStudentDocDirect = function(studentId, docKey) {
  var student = DB.getStudent(studentId);
  if (!student) return;
  var meta = DB.getMeta();
  var cls = DB.getClass(student.classId);
  var cust = DB.getDocCustomization(studentId);
  var today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  var ayear = cust.admitYear || (typeof getAcademicYear === 'function' ? getAcademicYear() : '2025-26');

  var lhHtml = buildDocLetterhead(meta);
  var baseCSS = '*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Georgia,serif;color:#0F1E3D;background:#fff;font-size:13px;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '@page{size:A4;margin:15mm}@media print{body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none}}' +
    '.doc-title{text-align:center;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:underline;margin:18px 0 16px;color:#0F2050}' +
    '.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px;background:#f8fafc;border:1px solid #DCE1EF;border-radius:8px;margin-bottom:16px}' +
    '.field label{font-size:10px;color:#6B7A9D;text-transform:uppercase;letter-spacing:.04em;display:block}' +
    '.field .val{font-size:13px;font-weight:700;margin-top:2px}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:14px}' +
    'th{background:#0F2050;color:#fff;padding:8px 10px;font-size:11px;text-transform:uppercase;text-align:left}' +
    '.content-area td{padding:8px 10px;border-bottom:1px solid #f1f5f9}.content-area tr:nth-child(even) td{background:#f8fafc}' +
    '.notice{background:#FEF7E0;border:1px solid #C4893A;border-radius:6px;padding:10px;font-size:11px;color:#9A6A00;margin-bottom:14px;line-height:1.6}' +
    '.body-text{font-size:13px;line-height:1.9;margin-bottom:14px}' +
    '.footer{font-size:10px;color:#6B7A9D;text-align:center;border-top:1px solid #DCE1EF;padding-top:10px;margin-top:16px}' +
    '.page-wrap{border:2px solid #0F2050;margin:8px;padding:0}' +
    '.content-area{padding:20px 28px 28px}';

  var bodyHtml = '';
  if (docKey === 'admit') {
    var exams = DB.getExams(student.classId);
    var instructions = cust.admitInstructions || 'Bring this admit card on all examination days. No candidate will be allowed without the admit card. Mobile phones are strictly prohibited in exam halls.';
    var customNote = cust.admitNote ? '<div class="notice"><strong>Note:</strong> ' + _mgEsc(cust.admitNote) + '</div>' : '';
    bodyHtml = '<div class="doc-title">Admit Card — ' + ayear + '</div>' +
      '<div class="info-grid" style="position:relative">' +
        '<div class="field"><label>Student Name</label><div class="val">' + _mgEsc(student.name) + '</div></div>' +
        '<div class="field"><label>Roll No.</label><div class="val">' + _mgEsc(student.rollNo) + '</div></div>' +
        '<div class="field"><label>Class</label><div class="val">' + _mgEsc(cls ? cls.name : '—') + '</div></div>' +
        '<div class="field"><label>Date of Birth</label><div class="val">' + new Date(student.dob).toLocaleDateString('en-IN') + '</div></div>' +
        '<div class="field"><label>Gender</label><div class="val">' + _mgEsc(student.gender) + '</div></div>' +
        '<div class="field"><label>Blood Group</label><div class="val">' + _mgEsc(student.bloodGroup || '—') + '</div></div>' +
      '</div>' +
      (exams.length ? '<table><thead><tr><th>Subject</th><th>Exam</th><th>Date</th><th>Day</th><th>Time</th><th>Duration</th><th>Venue</th></tr></thead><tbody>' +
        exams.map(function(e) {
          var d = new Date(e.date);
          return '<tr><td><strong>' + _mgEsc(e.subject) + '</strong></td><td>' + _mgEsc(e.examName) + '</td><td>' + d.toLocaleDateString('en-IN') + '</td><td>' + d.toLocaleDateString('en-US',{weekday:'short'}) + '</td><td>' + _mgEsc(e.time) + '</td><td>' + _mgEsc(e.duration) + '</td><td>' + _mgEsc(e.venue) + '</td></tr>';
        }).join('') +
      '</tbody></table>' : '<p style="color:#6B7A9D;text-align:center;margin-bottom:14px">No exam schedule available.</p>') +
      customNote +
      '<div class="notice"><strong>Instructions:</strong> ' + _mgEsc(instructions) + '</div>' +
      buildDocSignatureArea(meta, { leftLabel: "Student's Signature", rightLabel: meta.principalName || 'Principal' });
  } else if (docKey === 'bonafide') {
    var purpose = cust.bonafidePurpose || 'for general purposes';
    if (purpose === 'custom') purpose = cust.bonafideCustomPurpose || 'for general purposes';
    var extraBody = cust.bonafideBody ? '<p>' + _mgEsc(cust.bonafideBody) + '</p><br>' : '';
    bodyHtml = '<div class="doc-title">Bonafide Certificate</div>' +
      '<p class="body-text">This is to certify that <strong>' + _mgEsc(student.name) + '</strong>, son/daughter of (Parent/Guardian), bearing Roll No. <strong>' + _mgEsc(student.rollNo) + '</strong>, Date of Birth <strong>' + new Date(student.dob).toLocaleDateString('en-IN') + '</strong>, is a <em>bonafide student</em> of <strong>' + _mgEsc(meta.schoolName) + '</strong>, currently enrolled in <strong>' + _mgEsc(cls ? cls.name : '—') + '</strong> for the academic year <strong>' + _mgEsc(ayear) + '</strong>.<br><br>' +
      'The student has been studying in this institution since <strong>' + (typeof formatDate === 'function' ? formatDate(student.joinDate) : student.joinDate) + '</strong> and bears a good academic and conduct record as per the school\'s records.<br><br>' +
      extraBody +
      'This certificate is issued on the request of the student/parent <em>' + _mgEsc(purpose) + '</em>.</p>' +
      '<p>Date: <strong>' + today + '</strong></p>' +
      buildDocSignatureArea(meta, { leftLabel: 'Class Teacher' });
  } else if (docKey === 'character') {
    var conduct = cust.characterConduct || 'satisfactory';
    var charPurpose = cust.characterPurpose || 'bonafide purposes';
    bodyHtml = '<div class="doc-title">Character Certificate</div>' +
      '<p class="body-text">This is to certify that <strong>' + _mgEsc(student.name) + '</strong>, Roll No. <strong>' + _mgEsc(student.rollNo) + '</strong>, studied in <strong>' + _mgEsc(cls ? cls.name : '—') + '</strong> at <strong>' + _mgEsc(meta.schoolName) + '</strong> during the academic year <strong>' + _mgEsc(ayear) + '</strong>.<br><br>' +
      'To the best of our knowledge, the character and conduct of the student has been <strong>' + _mgEsc(conduct) + '</strong>. He/She has been a sincere, disciplined, and well-behaved student throughout their association with this institution. We wish him/her all the best in future endeavours.<br><br>' +
      'This certificate is issued at the request of the parent/student for <em>' + _mgEsc(charPurpose) + '</em>.</p>' +
      '<p>Date: <strong>' + today + '</strong></p>' +
      buildDocSignatureArea(meta, { leftLabel: 'Class Teacher' });
  }

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>' + (docKey === 'admit' ? 'Admit Card' : docKey === 'bonafide' ? 'Bonafide Certificate' : 'Character Certificate') + ' — ' + _mgEsc(student.name) + '</title><style>' + baseCSS + '</style></head><body>' +
    '<div class="page-wrap">' +
    lhHtml +
    '<div class="content-area">' + bodyHtml + '<div class="footer">' + _mgEsc(meta.schoolName) + ' &bull; ' + _mgEsc((meta.schoolAddress||'').replace(/\n/g,' | ')) + '<br>This is a computer-generated document.</div></div>' +
    '</div>' +
    '<script>window.onload=function(){window.print();};<\/script></body></html>';

  var win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('Please allow popups to print', 'warning');
};

// ---- Teacher doc modal ----
window._openTeacherDocModal = function(teacherId, docKey) {
  var teacher = DB.getUser(teacherId);
  if (!teacher) return;
  var structs = DB.getSalaryStructures(teacherId);
  var struct = structs[0] || {};
  var salary = parseFloat(teacher.baseSalary || struct.grossSalary || 0).toLocaleString('en-IN');
  var titles = {
    joining: 'Joining / Appointment Letter', offer: 'Offer Letter', experience: 'Experience Letter',
    increment: 'Increment Letter', promotion: 'Promotion Letter', relieving: 'Relieving Letter',
    'salary-cert': 'Salary Certificate', noc: 'NOC (No Objection Certificate)'
  };

  var commonFields = '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Designation</label><input class="form-control" id="tdoc-designation" value="' + _mgEsc(teacher.designation || 'Class Teacher') + '"/></div>' +
    '<div class="form-group"><label class="form-label">Department</label><input class="form-control" id="tdoc-department" value="' + _mgEsc(teacher.department || 'Teaching') + '"/></div>' +
  '</div>' +
  '<div class="form-row">' +
    '<div class="form-group"><label class="form-label">Joining Date</label><input class="form-control" type="date" id="tdoc-joiningdate" value="' + _mgEsc(teacher.joiningDate || '') + '"/></div>' +
    '<div class="form-group"><label class="form-label">Gross Monthly Salary (₹)</label><input class="form-control" id="tdoc-salary" value="' + _mgEsc(String(teacher.baseSalary || struct.grossSalary || '')) + '"/></div>' +
  '</div>';

  var specificFields = '';
  if (docKey === 'joining' || docKey === 'offer') {
    specificFields = '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">Probation Period (months)</label><input class="form-control" id="tdoc-probation" value="' + _mgEsc(String(teacher.probationPeriod || '6')) + '"/></div>' +
      '<div class="form-group"><label class="form-label">Employment Type</label><select class="form-control" id="tdoc-emptype"><option value="Full-Time"' + (teacher.employmentType === 'Full-Time' ? ' selected' : '') + '>Full-Time</option><option value="Part-Time"' + (teacher.employmentType === 'Part-Time' ? ' selected' : '') + '>Part-Time</option><option value="Contract"' + (teacher.employmentType === 'Contract' ? ' selected' : '') + '>Contract</option></select></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">CTC (Annual, ₹)</label><input class="form-control" id="tdoc-ctc" value="' + _mgEsc(String(teacher.ctc || '')) + '" placeholder="e.g. 360000"/></div>';
  } else if (docKey === 'experience' || docKey === 'relieving') {
    specificFields = '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">Last Working Day</label><input class="form-control" type="date" id="tdoc-lwd" value=""/></div>' +
      '<div class="form-group"><label class="form-label">Reason for Leaving</label><input class="form-control" id="tdoc-reason" value="" placeholder="e.g. Resignation"/></div>' +
    '</div>';
  } else if (docKey === 'increment') {
    specificFields = '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">Old Salary (₹)</label><input class="form-control" id="tdoc-oldsalary" value="' + _mgEsc(String(teacher.baseSalary || '')) + '"/></div>' +
      '<div class="form-group"><label class="form-label">New Salary (₹)</label><input class="form-control" id="tdoc-newsalary" value=""/></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Effective Date</label><input class="form-control" type="date" id="tdoc-effdate" value=""/></div>';
  } else if (docKey === 'promotion') {
    specificFields = '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">Old Designation</label><input class="form-control" id="tdoc-olddesig" value="' + _mgEsc(teacher.designation || '') + '"/></div>' +
      '<div class="form-group"><label class="form-label">New Designation</label><input class="form-control" id="tdoc-newdesig" value=""/></div>' +
    '</div>' +
    '<div class="form-group"><label class="form-label">Effective Date</label><input class="form-control" type="date" id="tdoc-effdate" value=""/></div>';
  } else if (docKey === 'salary-cert') {
    var nowDate = new Date();
    specificFields = '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">Month</label><select class="form-control" id="tdoc-month">' +
        ['January','February','March','April','May','June','July','August','September','October','November','December'].map(function(m, i) {
          return '<option value="' + m + '"' + (i === nowDate.getMonth() ? ' selected' : '') + '>' + m + '</option>';
        }).join('') +
      '</select></div>' +
      '<div class="form-group"><label class="form-label">Year</label><input class="form-control" id="tdoc-year" value="' + nowDate.getFullYear() + '"/></div>' +
    '</div>';
  } else if (docKey === 'noc') {
    specificFields = '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">Purpose of NOC</label><input class="form-control" id="tdoc-nocpurpose" value="" placeholder="e.g. Higher Education"/></div>' +
      '<div class="form-group"><label class="form-label">Destination / Country</label><input class="form-control" id="tdoc-nocdest" value="" placeholder="e.g. United Kingdom"/></div>' +
    '</div>';
  }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = '<div class="modal modal-lg">' +
    '<div class="modal-header"><h2 class="modal-title"><i class="fas fa-file-alt" style="color:#C4893A;margin-right:8px"></i>' + _mgEsc(titles[docKey] || docKey) + ' — ' + _mgEsc(teacher.name) + '</h2><button class="close-btn" onclick="this.closest(\'.modal-overlay\').remove()">✕</button></div>' +
    '<div class="modal-body">' + commonFields + specificFields + '<div class="form-group" style="margin-top:12px"><label class="form-label">Custom Note / Additional Paragraph</label><textarea class="form-control" id="tdoc-customnote" rows="3" placeholder="Any additional content to include in this letter..."></textarea></div></div>' +
    '<div class="modal-footer">' +
      '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
      '<button class="btn btn-primary" onclick="_collectAndPrintTeacherDoc(\'' + teacherId + '\',\'' + docKey + '\');this.closest(\'.modal-overlay\').remove()"><i class="fas fa-print"></i> Generate &amp; Print</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(overlay);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
};

function _gV(id) { var el = document.getElementById(id); return el ? el.value : ''; }

window._collectAndPrintTeacherDoc = function(teacherId, docKey) {
  var opts = {
    designation: _gV('tdoc-designation'),
    department: _gV('tdoc-department'),
    joiningDate: _gV('tdoc-joiningdate'),
    salary: _gV('tdoc-salary'),
    customNote: _gV('tdoc-customnote'),
    probation: _gV('tdoc-probation'),
    emptype: _gV('tdoc-emptype'),
    ctc: _gV('tdoc-ctc'),
    lwd: _gV('tdoc-lwd'),
    reason: _gV('tdoc-reason'),
    oldsalary: _gV('tdoc-oldsalary'),
    newsalary: _gV('tdoc-newsalary'),
    effdate: _gV('tdoc-effdate'),
    olddesig: _gV('tdoc-olddesig'),
    newdesig: _gV('tdoc-newdesig'),
    month: _gV('tdoc-month'),
    year: _gV('tdoc-year'),
    nocpurpose: _gV('tdoc-nocpurpose'),
    nocdest: _gV('tdoc-nocdest'),
  };
  _printTeacherDocWithOpts(teacherId, docKey, opts);
};

window._printTeacherDocDirect = function(teacherId, docKey) {
  _printTeacherDocWithOpts(teacherId, docKey, {});
};

window._printTeacherDocWithOpts = function(teacherId, docKey, opts) {
  var teacher = DB.getUser(teacherId);
  if (!teacher) return;
  var meta = DB.getMeta();
  var structs = DB.getSalaryStructures(teacherId);
  var struct = structs[0] || {};
  var principal = (DB.get().users || []).find(function(u) { return u.role === 'superadmin'; }) || {};
  var today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  var _offerExpiry = (function(){ var d = new Date(); d.setDate(d.getDate()+15); return d.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}); })();
  var sName = meta.schoolName || 'SuperKids India Preschool';

  var designation = opts.designation || teacher.designation || 'Class Teacher';
  var department = opts.department || teacher.department || 'Teaching';
  var joiningDate = opts.joiningDate || teacher.joiningDate || '';
  var joiningDateStr = joiningDate ? new Date(joiningDate).toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'}) : '—';
  var salary = parseFloat(opts.salary || teacher.baseSalary || struct.grossSalary || 0).toLocaleString('en-IN');
  var customNote = opts.customNote || '';

  var titles = {
    joining: 'Joining / Appointment Letter', offer: 'Offer Letter', experience: 'Experience Letter',
    increment: 'Increment Letter', promotion: 'Promotion Letter', relieving: 'Relieving Letter',
    'salary-cert': 'Salary Certificate', noc: 'No Objection Certificate'
  };
  var title = titles[docKey] || docKey;

  var gender = (teacher.gender || '').toLowerCase() === 'female' ? 'Ms.' : 'Mr.';
  var grossSal = struct.grossSalary ? '₹' + parseFloat(struct.grossSalary).toLocaleString('en-IN') : (teacher.baseSalary ? '₹' + parseFloat(teacher.baseSalary).toLocaleString('en-IN') : '₹____________');
  var principalName = _mgEsc(meta.principalName || (principal.name || 'Nivrutti Pawar'));
  var sAddrPlain = (meta.schoolAddress || '').replace(/\n/g, ', ');

  var _li = function(txt) { return '<li style="margin-bottom:4px">' + txt + '</li>'; };
  var _h3 = function(n, txt) { return '<h3 style="font-size:13px;font-weight:800;color:#0D1B4A;margin:18px 0 6px">' + (n ? n + '. ' : '') + txt + '</h3>'; };
  var _p  = function(txt) { return '<p style="margin:6px 0;line-height:1.8;text-align:justify">' + txt + '</p>'; };

  var bodyHtml = '';
  if (docKey === 'joining') {
    bodyHtml =
      _p('Dear ' + gender + ' <strong>' + _mgEsc(teacher.name) + '</strong>,') +
      _p('We are pleased to offer you employment with <strong>' + _mgEsc(sName) + '</strong> as <strong>' + _mgEsc(designation) + '</strong>. We are delighted to welcome you to our team and look forward to your contribution in providing quality early childhood education and care.') +
      _p('Your appointment is subject to the following terms and conditions:') +

      _h3('1','Designation') +
      _p('You are appointed as <strong>' + _mgEsc(designation) + '</strong>.') +

      _h3('2','Date of Joining') +
      _p('Your employment will commence on <strong>' + joiningDateStr + '</strong>.') +

      _h3('3','Place of Posting') +
      _p('Your initial place of posting will be:') +
      '<p style="margin:8px 0 8px 20px"><strong>' + _mgEsc(sName) + '</strong><br>Address: ' + (sAddrPlain ? _mgEsc(sAddrPlain) : '___________________________________________') + '</p>' +
      _p('The management may transfer you to another branch or work location, if required.') +

      _h3('4','Working Hours') +
      '<ul style="margin:0 0 10px 20px;padding:0">' +
        _li('Working Days: <strong>Monday to Saturday</strong>') +
        _li('Office Hours: <strong>8:45 AM to 3:15 PM</strong>') +
        _li('Weekly Off: Sunday and other holidays as declared by the school.') +
      '</ul>' +
      _p('You are expected to report to work punctually and maintain regular attendance.') +

      _h3('5','Salary &amp; Benefits') +
      _p('Your Gross Monthly Salary will be <strong>' + grossSal + '</strong>.') +
      _p('Salary will be paid on or before the 7th day of the following month after statutory deductions, if applicable.') +
      _p('Any additional benefits or incentives will be governed by the policies of ' + _mgEsc(sName) + '.') +

      _h3('6','Probation') +
      _p('You will be on probation for <strong>six (6) months</strong> from your date of joining. During this period, your performance, conduct, attendance, and suitability for the role will be assessed.') +
      _p('Upon successful completion of probation, your employment may be confirmed in writing.') +

      _h3('7','Duties &amp; Responsibilities') +
      _p('You shall:') +
      '<ul style="margin:0 0 10px 20px;padding:0">' +
        _li('Perform your assigned duties sincerely and efficiently.') +
        _li('Maintain a safe, caring, and child-friendly learning environment.') +
        _li('Follow the curriculum, teaching plans, and school guidelines.') +
        _li('Attend staff meetings, training sessions, parent meetings, and school events.') +
        _li('Maintain confidentiality regarding students, parents, staff, and school information.') +
        _li('Uphold the values and reputation of ' + _mgEsc(sName) + '.') +
      '</ul>' +

      _h3('8','Code of Conduct') +
      _p('You are expected to:') +
      '<ul style="margin:0 0 10px 20px;padding:0">' +
        _li('Maintain professionalism, honesty, and integrity.') +
        _li('Treat children, parents, colleagues, and visitors with dignity and respect.') +
        _li('Follow all child safety, safeguarding, and hygiene protocols.') +
        _li('Maintain appropriate dress and grooming standards.') +
        _li('Refrain from any behavior that could negatively impact the preschool\'s reputation.') +
      '</ul>' +

      _h3('9','Leave') +
      _p('Leave entitlement shall be governed by the Leave Policy of ' + _mgEsc(sName) + '. All leave requests must be approved by the Principal or Management in advance, except in emergencies.') +

      _h3('10','Confidentiality') +
      _p('You shall maintain strict confidentiality regarding all information related to the preschool, including student records, parent information, financial data, teaching materials, policies, and business operations, during and after your employment.') +

      _h3('11','Notice Period') +
      _p('Either party may terminate this employment by giving <strong>30 days\'</strong> written notice or salary in lieu of notice, subject to applicable laws and school policy.') +
      _p('The management reserves the right to terminate employment without notice in cases of gross misconduct, child safety violations, fraud, theft, breach of confidentiality, or any serious violation of school policies.') +

      _h3('12','Documents Required') +
      _p('Please submit self-attested copies of the following documents before or on your joining date:') +
      '<ul style="margin:0 0 10px 20px;padding:0">' +
        _li('Aadhaar Card') + _li('PAN Card') + _li('Educational Certificates') +
        _li('Experience Certificates (if applicable)') + _li('Address Proof') +
        _li('Passport-size Photographs') + _li('Bank Account Details (Cancelled Cheque/Passbook)') +
      '</ul>' +

      _h3('13','Acceptance of Appointment') +
      _p('Please sign and return a copy of this letter as your acceptance of the appointment and the terms and conditions stated herein.') +

      _p('We warmly welcome you to the ' + _mgEsc(sName) + ' family. We are confident that your dedication, enthusiasm, and commitment will contribute to the growth and success of our students and institution.') +
      _p('We wish you a rewarding and successful career with us.') +

      '<p style="margin:20px 0 2px"><strong>Yours sincerely,</strong></p>' +
      '<p style="margin:0 0 2px">For <strong>' + _mgEsc(sName) + '</strong></p>' +
      buildDocSignatureArea(meta, { showLeft: false, rightLabel: principalName }) +

      '<div style="border:1px solid #ccc;border-radius:6px;padding:16px;margin-top:16px">' +
        '<div style="font-size:13px;font-weight:800;color:#0D1B4A;margin-bottom:12px;border-bottom:1px solid #e2e8f0;padding-bottom:8px">Employee Acceptance</div>' +
        _p('I, ' + gender + ' __________________________________________, accept the appointment as <strong>' + _mgEsc(designation) + '</strong> at ' + _mgEsc(sName) + ' and agree to abide by all the terms and conditions mentioned in this Appointment &amp; Joining Letter.') +
        '<table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:13px"><tbody>' +
          '<tr><td style="padding:10px 0;border:none;width:50%">Employee Signature: _______________________</td><td style="padding:10px 0;border:none">Date: ____________________________________</td></tr>' +
          '<tr><td style="padding:6px 0;border:none">Employee Name: ___________________________</td><td style="padding:6px 0;border:none">Place: ___________________________________</td></tr>' +
        '</tbody></table>' +
      '</div>';

  } else if (docKey === 'offer') {
    var probation = opts.probation || teacher.probationPeriod || 6;
    var emptype = opts.emptype || teacher.employmentType || 'Full-Time';
    bodyHtml =
      _p('Dear ' + gender + ' <strong>' + _mgEsc(teacher.name) + '</strong>,') +
      _p('We are pleased to offer you the position of <strong>' + _mgEsc(designation) + '</strong> at <strong>' + _mgEsc(sName) + '</strong>. Based on your qualifications, experience, and interactions during the selection process, we believe you will be a valuable addition to our team.') +
      _p('At ' + _mgEsc(sName) + ', we are committed to providing a safe, nurturing, and engaging learning environment where every child can learn, grow, and thrive. We are delighted to invite you to join us in our mission of shaping young minds and building a strong educational foundation for our students.') +
      _p('The key terms of this employment offer are as follows:') +

      _h3('', 'Employment Details') +
      '<table style="width:100%;border-collapse:collapse;margin:0 0 12px;font-size:13px"><tbody>' +
        [
          ['Designation', _mgEsc(designation)],
          ['Department', _mgEsc(department)],
          ['Reporting To', 'Owner &amp; Principal'],
          ['Proposed Date of Joining', joiningDateStr],
          ['Place of Posting', _mgEsc(sName) + (sAddrPlain ? ', ' + _mgEsc(sAddrPlain) : '')],
          ['Employment Type', _mgEsc(emptype)]
        ].map(function(r) {
          return '<tr><td style="padding:6px 12px;border:1px solid #DCE1EF;width:42%;background:#f8fafc;font-weight:600;color:#0F2050">' + r[0] + '</td><td style="padding:6px 12px;border:1px solid #DCE1EF">' + r[1] + '</td></tr>';
        }).join('') +
      '</tbody></table>' +

      _h3('', 'Compensation') +
      '<ul style="margin:0 0 10px 20px;padding:0">' +
        _li('Gross Monthly Salary: <strong>' + grossSal + '</strong>') +
        _li('Salary will be paid monthly after applicable statutory deductions.') +
        _li('Detailed salary breakup will be provided during the joining process.') +
      '</ul>' +

      _h3('', 'Probation') +
      _p('Your employment will initially be on probation for <strong>' + probation + ' months</strong>. During this period, your performance and suitability for the role will be evaluated. Upon successful completion of probation, your employment may be confirmed in writing.') +

      _h3('', 'Working Hours') +
      '<ul style="margin:0 0 10px 20px;padding:0">' +
        _li('Working Days: <strong>Monday to Saturday</strong>') +
        _li('Working Hours: <strong>8:45 AM to 3:15 PM</strong>') +
        _li('Weekly holidays and public holidays shall be as per the school calendar.') +
      '</ul>' +

      _h3('', 'Documents Required at Joining') +
      _p('Please submit self-attested copies of the following documents at the time of joining:') +
      '<ul style="margin:0 0 10px 20px;padding:0">' +
        _li('Aadhaar Card') + _li('PAN Card') + _li('Educational Qualification Certificates') +
        _li('Experience Certificates (if applicable)') + _li('Address Proof') +
        _li('Passport-size Photographs') + _li('Bank Account Details') +
      '</ul>' +

      _h3('', 'Acceptance of Offer') +
      _p('This offer is valid until <strong>' + _offerExpiry + '</strong>. Kindly confirm your acceptance by signing and returning a copy of this letter on or before the above date.') +
      _p('Upon acceptance of this offer and successful completion of all pre-employment formalities, you will receive your formal Appointment Letter on your date of joining.') +
      _p('Please note that this offer is subject to:') +
      '<ul style="margin:0 0 10px 20px;padding:0">' +
        _li('Verification of the information and documents provided by you.') +
        _li('Submission of all required documents.') +
        _li('Satisfactory background verification, where applicable.') +
        _li('Compliance with the policies and code of conduct of ' + _mgEsc(sName) + '.') +
      '</ul>' +

      _p('We are excited about the possibility of you joining our team and contributing to the success of our preschool. We believe your dedication, professionalism, and passion for education will make a meaningful difference in the lives of our students.') +
      _p('We warmly welcome you to the ' + _mgEsc(sName) + ' family and look forward to working with you.') +

      '<p style="margin:18px 0 2px"><strong>With best wishes,</strong></p>' +
      '<p style="margin:0 0 2px">For <strong>' + _mgEsc(sName) + '</strong></p>' +
      buildDocSignatureArea(meta, { showLeft: false, rightLabel: principalName }) +

      '<div style="border:1px solid #ccc;border-radius:6px;padding:16px;margin-top:16px;page-break-before:always;-webkit-column-break-before:always;break-before:page">' +
        '<div style="font-size:13px;font-weight:800;color:#0D1B4A;margin-bottom:12px;border-bottom:1px solid #e2e8f0;padding-bottom:8px">Acceptance of Offer</div>' +
        _p('I, ' + gender + ' ______________________________________, hereby accept the offer of employment for the position of <strong>' + _mgEsc(designation) + '</strong> at ' + _mgEsc(sName) + ' under the terms and conditions mentioned above.') +
        '<table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:13px"><tbody>' +
          '<tr><td style="padding:10px 0;border:none;width:50%">Employee Signature: ______________________</td><td style="padding:10px 0;border:none">Date: _________________________________</td></tr>' +
          '<tr><td style="padding:6px 0;border:none">Employee Name: _________________________</td><td style="padding:6px 0;border:none">Place: _________________________________</td></tr>' +
        '</tbody></table>' +
      '</div>';
  } else if (docKey === 'experience') {
    var lwd = opts.lwd ? new Date(opts.lwd).toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'}) : today;
    var leaveReason = opts.reason || 'personal reasons';
    bodyHtml = '<p>To Whom It May Concern,</p>' +
      '<p>This is to certify that <strong>' + _mgEsc(teacher.name) + '</strong> (Employee ID: ' + _mgEsc(teacher.employeeId || 'N/A') + ') was employed with <strong>' + _mgEsc(sName) + '</strong> as <strong>' + _mgEsc(designation) + '</strong> in the <strong>' + _mgEsc(department) + '</strong> department from <strong>' + joiningDateStr + '</strong> to <strong>' + lwd + '</strong>.</p>' +
      '<p>During the tenure, ' + _mgEsc(teacher.name) + ' has demonstrated excellent professional skills, dedication, and commitment. We wish them the very best in their future endeavours.</p>' +
      '<p>This letter is issued at the request of the individual for ' + _mgEsc(leaveReason) + '.</p>';
  } else if (docKey === 'increment') {
    var oldSal = opts.oldsalary ? '₹' + parseFloat(opts.oldsalary).toLocaleString('en-IN') : '(previous salary)';
    var newSal = opts.newsalary ? '₹' + parseFloat(opts.newsalary).toLocaleString('en-IN') : '₹' + salary;
    var effDate = opts.effdate ? new Date(opts.effdate).toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'}) : today;
    bodyHtml = '<p>Dear <strong>' + _mgEsc(teacher.name) + '</strong>,</p>' +
      '<p>We are pleased to inform you that in recognition of your performance, dedication, and contribution to <strong>' + _mgEsc(sName) + '</strong>, your salary has been revised as follows:</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:12px 0"><tbody>' +
        [['Previous Salary', oldSal], ['Revised Salary', newSal], ['Effective Date', effDate]].map(function(r) {
          return '<tr><td style="padding:7px 12px;border:1px solid #DCE1EF;width:40%;background:#f8fafc;font-weight:600;color:#0F2050">' + r[0] + '</td><td style="padding:7px 12px;border:1px solid #DCE1EF;font-weight:700">' + r[1] + '</td></tr>';
        }).join('') +
      '</tbody></table>' +
      '<p>The revised salary will be reflected in your payslip from the next payroll cycle. We appreciate your continued dedication and look forward to your continued contribution.</p>';
  } else if (docKey === 'promotion') {
    var oldD = opts.olddesig || designation;
    var newD = opts.newdesig || designation;
    var promEffDate = opts.effdate ? new Date(opts.effdate).toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'}) : today;
    bodyHtml = '<p>Dear <strong>' + _mgEsc(teacher.name) + '</strong>,</p>' +
      '<p>We are pleased to announce your promotion from <strong>' + _mgEsc(oldD) + '</strong> to <strong>' + _mgEsc(newD) + '</strong> effective <strong>' + promEffDate + '</strong>. This promotion is a recognition of your exceptional performance, dedication, and commitment.</p>' +
      '<p>We look forward to your continued contributions in your new role. Congratulations on this well-deserved achievement!</p>';
  } else if (docKey === 'relieving') {
    var relLwd = opts.lwd ? new Date(opts.lwd).toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'}) : today;
    var relReason = opts.reason || 'personal reasons';
    bodyHtml = '<p>Dear <strong>' + _mgEsc(teacher.name) + '</strong>,</p>' +
      '<p>This is to confirm that you have been relieved from the position of <strong>' + _mgEsc(designation) + '</strong> in the <strong>' + _mgEsc(department) + '</strong> Department at <strong>' + _mgEsc(sName) + '</strong> with effect from <strong>' + relLwd + '</strong>.</p>' +
      '<p>All pending dues, handovers, and formalities have been duly completed. We wish you success in your future career.</p>';
  } else if (docKey === 'salary-cert') {
    var certMonth = opts.month || new Date().toLocaleDateString('en-US', {month:'long'});
    var certYear = opts.year || new Date().getFullYear();
    bodyHtml = '<p>To Whom It May Concern,</p>' +
      '<p>This is to certify that <strong>' + _mgEsc(teacher.name) + '</strong>, employed as <strong>' + _mgEsc(designation) + '</strong> in the <strong>' + _mgEsc(department) + '</strong> Department at <strong>' + _mgEsc(sName) + '</strong>, was paid a gross monthly salary of <strong>₹' + salary + '</strong> for the month of <strong>' + _mgEsc(certMonth) + ' ' + _mgEsc(String(certYear)) + '</strong>.</p>' +
      '<p>This certificate is issued at the request of the individual for banking/official purposes.</p>';
  } else if (docKey === 'noc') {
    var nocPurpose = opts.nocpurpose || 'higher education';
    var nocDest = opts.nocdest || '';
    bodyHtml = '<p>To Whom It May Concern,</p>' +
      '<p>This is to certify that <strong>' + _mgEsc(teacher.name) + '</strong>, designated as <strong>' + _mgEsc(designation) + '</strong> in the <strong>' + _mgEsc(department) + '</strong> Department at <strong>' + _mgEsc(sName) + '</strong>, has been granted <strong>No Objection</strong> to pursue <strong>' + _mgEsc(nocPurpose) + '</strong>' + (nocDest ? ' in <strong>' + _mgEsc(nocDest) + '</strong>' : '') + '.</p>' +
      '<p>The management has no objection to the above and wishes the individual all the best in their endeavours.</p>';
  }

  if (customNote) {
    bodyHtml += '<p style="margin-top:12px">' + _mgEsc(customNote) + '</p>';
  }

  DB.addHRLetter({
    id: 'ltr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    teacherId: teacherId,
    type: title,
    createdBy: Session.current() ? Session.current().id : '',
    createdAt: new Date().toISOString()
  });

  var lhHtml = buildDocLetterhead(meta);
  var baseCSS = '*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Georgia,serif;color:#0F1E3D;background:#fff;font-size:13px;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '@page{size:A4;margin:15mm}@media print{body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none}}' +
    '.doc-title{text-align:center;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-decoration:underline;margin:18px 0 16px;color:#0F2050}' +
    '.ref-box{background:#f9f6f0;border-left:3px solid #C4893A;padding:10px 14px;border-radius:4px;margin-bottom:16px;font-size:12px}' +
    '.content-area table{width:100%;border-collapse:collapse;margin:12px 0}' +
    '.content-area td,.content-area th{padding:7px 12px;border:1px solid #DCE1EF}.content-area th{background:#0F2050;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    'p{margin-bottom:12px;line-height:1.8}' +
    '.footer-note{font-size:10px;color:#6B7A9D;text-align:center;border-top:1px solid #DCE1EF;padding-top:10px;margin-top:16px}' +
    '.content-area{padding:16px 24px 24px}' +
    '.page-wrap{border:2px solid #0F2050;margin:8px;padding:0}';

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>' + _mgEsc(title) + ' — ' + _mgEsc(teacher.name) + '</title><style>' + baseCSS + '</style></head><body>' +
    '<div class="page-wrap">' +
    lhHtml +
    '<div class="content-area">' +
      '<div class="doc-title">' + _mgEsc(title) + '</div>' +
      '<div class="ref-box"><strong>To:</strong> ' + _mgEsc(teacher.name) + ' &nbsp;|&nbsp; <strong>Designation:</strong> ' + _mgEsc(designation) + ' &nbsp;|&nbsp; <strong>Emp ID:</strong> ' + _mgEsc(teacher.employeeId || 'N/A') + '&nbsp;&nbsp;&nbsp;<strong>Date:</strong> ' + today + '</div>' +
      bodyHtml +
      (docKey === 'joining' || docKey === 'offer' ? '' :
        '<p style="font-size:13px;margin-top:20px">Yours sincerely,</p>' +
        buildDocSignatureArea(meta, { showLeft: false, rightLabel: principalName })) +
      '<div class="footer-note">This is a computer-generated document issued by ' + _mgEsc(sName) + '. For queries contact ' + _mgEsc(meta.schoolEmail || '') + '</div>' +
    '</div>' +
    '</div>' +
    '<script>window.onload=function(){window.print();};<\/script></body></html>';

  var win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('Please allow popups to print', 'warning');
};

// ============================================================
// SUPERADMIN — ROUTES for new standalone pages
// ============================================================
registerRoute('exam-schedule', function() {
  var user = Session.current();
  if (!user || user.role !== 'superadmin') { renderLogin(); return; }
  mgmtTab = 'exam-manager';
  renderManagement();
});
registerRoute('meal-menu', function() {
  var user = Session.current();
  if (!user || user.role !== 'superadmin') { renderLogin(); return; }
  mgmtTab = 'meal-manager';
  renderManagement();
});
registerRoute('fee-management', function() {
  var user = Session.current();
  if (!user || user.role !== 'superadmin') { renderLogin(); return; }
  mgmtTab = 'fee-manager';
  renderManagement();
});
registerRoute('grievances', function() {
  var user = Session.current();
  if (!user || user.role !== 'superadmin') { renderLogin(); return; }
  mgmtTab = 'grievance-manager';
  renderManagement();
});

registerRoute('documents', function() {
  var user = Session.current();
  if (!user || user.role !== 'superadmin') { renderLogin(); return; }
  mgmtTab = 'documents';
  renderManagement();
});

registerRoute('management', renderManagement);
registerRoute('my-profile', renderMyProfile);
