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

  const tabs = [
    { id: 'subadmins', label: 'Sub Admins', icon: 'fa-user-tie' },
    { id: 'parents', label: 'Parents', icon: 'fa-users' },
    { id: 'team', label: 'Our Team', icon: 'fa-chalkboard-teacher' },
    { id: 'log', label: 'Activity Log', icon: 'fa-history' },
    { id: 'settings', label: 'School Settings', icon: 'fa-cog' },
  ];

  const tabContent = {
    subadmins: renderSubAdminsTab(),
    parents: renderParentsTab(),
    team: renderTeamTab(),
    log: renderActivityLogTab(),
    settings: renderSettingsTab()
  };

  const content = `
    <div class="tab-bar">
      ${tabs.map(t => `<button class="tab-btn ${mgmtTab===t.id?'active':''}" onclick="mgmtTab='${t.id}';renderManagement()">
        <i class="fas ${t.icon}"></i> ${t.label}
      </button>`).join('')}
    </div>
    ${tabContent[mgmtTab] || ''}`;

  renderLayout('management', content, 'Management', 'Super Admin Only');
  if (mgmtTab === 'team') setTimeout(loadTeamMembers, 50);
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

function openAddSubAdminModal() {
  const data = DB.get();
  const PERM_KEYS = ['students', 'attendance', 'grades', 'growth', 'activities', 'syllabus', 'announcements', 'leaves'];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header"><h2 class="modal-title">Add Sub Admin / Teacher</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
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
          <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="sa-phone" placeholder="+1-555-0000"/></div>
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

  const sa = {
    id: DB.genId('u'), role: 'subadmin', name, email, username, password,
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
    <div class="card" style="max-width:600px">
      <div class="card-title" style="margin-bottom:20px"><i class="fas fa-cog" style="color:#1AA6CA"></i> School Settings</div>
      
      <!-- School Logo Preview -->
      <div style="display:flex;align-items:center;gap:16px;padding:16px;background:#F8F9FB;border-radius:12px;border:1px solid #DCE1EF;margin-bottom:20px">
        <img src="${meta.schoolLogo || '/static/school-logo.png'}" alt="School Logo" style="width:64px;height:64px;border-radius:12px;object-fit:cover;border:2px solid #e0e7ff;background:#fff"/>
        <div>
          <div style="font-weight:700;color:#1e293b">${meta.schoolName}</div>
          <div style="font-size:12px;color:#6B7A9D;margin-top:2px">School Logo & Name</div>
        </div>
      </div>

      <div class="form-group"><label class="form-label">School Name</label><input class="form-control" id="set-name" value="${meta.schoolName}"/></div>
      <div class="form-group"><label class="form-label">School Phone</label><input class="form-control" id="set-phone" value="${meta.schoolPhone || ''}"/></div>
      <hr class="divider"/>
      <div style="padding:14px;background:#fee2e2;border-radius:10px;margin-bottom:16px">
        <div style="font-weight:700;color:#991b1b;margin-bottom:8px"><i class="fas fa-exclamation-triangle"></i> Danger Zone</div>
        <div style="font-size:13px;color:#7f1d1d;margin-bottom:12px">Resetting data will permanently clear all students, grades, attendance and other records. This cannot be undone.</div>
        <button class="btn btn-danger btn-sm" onclick="resetAllData()"><i class="fas fa-skull-crossbones"></i> Reset All Data</button>
      </div>
      <button class="btn btn-primary" onclick="saveSettings()"><i class="fas fa-save"></i> Save Settings</button>
    </div>`;
}

function saveSettings() {
  const data = DB.get();
  data.meta.schoolName = document.getElementById('set-name').value.trim() || data.meta.schoolName;
  data.meta.schoolPhone = document.getElementById('set-phone').value.trim();
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
    fetch('/api/upload', { method: 'POST', body: form })
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

// Register route
registerRoute('management', renderManagement);
registerRoute('my-profile', renderMyProfile);
