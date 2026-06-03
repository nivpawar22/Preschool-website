// ============================================================
// EduTrack - Admin / Sub-Admin Panel
// ============================================================

// ---- Dashboard ----
function renderDashboard() {
  const data = DB.get();
  const user = Session.current();
  const isSubAdmin = user.role === 'subadmin';
  const myClassId = isSubAdmin ? user.assignedClass : null;

  const allStudents = DB.getStudents(myClassId);
  const allClasses = myClassId ? [DB.getClass(myClassId)].filter(Boolean) : data.classes;
  const pendingLeaves = data.leaves.filter(l => l.status === 'pending' && (!myClassId || (DB.getStudent(l.studentId) || {}).classId === myClassId));
  const recentAnn = DB.getAnnouncements(myClassId).slice(0, 3);

  // Attendance today
  const today = new Date().toISOString().split('T')[0];
  const todayAtt = data.attendance.filter(a => a.date === today && (!myClassId || (DB.getStudent(a.studentId) || {}).classId === myClassId));

  const stats = [
    { label: 'Students', value: allStudents.length, icon: 'fa-user-graduate', color: '#1AA6CA', bg: '#E8EDF5' },
    { label: 'Classes', value: allClasses.length, icon: 'fa-school', color: '#10b981', bg: '#d1fae5' },
    { label: 'Pending Leaves', value: pendingLeaves.length, icon: 'fa-calendar-times', color: '#E8B020', bg: '#FEF7E0' },
    { label: "Today's Attendance", value: todayAtt.length + ' marked', icon: 'fa-calendar-check', color: '#ef4444', bg: '#fee2e2' },
  ];

  const content = `
    <div class="grid-4" style="margin-bottom:24px">
      ${stats.map(s => `
        <div class="stat-card">
          <div class="stat-icon" style="background:${s.bg}">
            <i class="fas ${s.icon}" style="color:${s.color}"></i>
          </div>
          <div style="font-size:28px;font-weight:900;color:${s.color}">${s.value}</div>
          <div style="font-size:13px;color:#6B7A9D;margin-top:4px">${s.label}</div>
        </div>`).join('')}
    </div>

    <div class="grid-2">
      <!-- Recent Students -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-user-graduate" style="color:#1AA6CA"></i> Recent Students</div>
          <button class="btn btn-primary btn-sm" onclick="navigate('students')">View All</button>
        </div>
        ${allStudents.slice(0, 5).map(s => {
          const cls = DB.getClass(s.classId);
          const att = DB.getAttendanceSummary(s.id);
          return `
          <div class="flex-between" style="padding:10px 0;border-bottom:1px solid #f1f5f9">
            <div class="flex gap-3 align-items-center" style="align-items:center">
              ${avatarHtml(s.name, '#0F2050')}
              <div>
                <div style="font-size:14px;font-weight:600">${s.name}</div>
                <div class="text-muted">${cls ? cls.name : '-'} · Roll: ${s.rollNo}</div>
              </div>
            </div>
            <span class="badge ${att.pct >= 90 ? 'badge-green' : att.pct >= 75 ? 'badge-yellow' : 'badge-red'}">${att.pct}%</span>
          </div>`;
        }).join('')}
        ${allStudents.length === 0 ? '<div class="empty-state"><i class="fas fa-user-graduate"></i><p>No students yet</p></div>' : ''}
      </div>

      <!-- Announcements -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-bullhorn" style="color:#E8B020"></i> Announcements</div>
          <button class="btn btn-primary btn-sm" onclick="navigate('announcements')">View All</button>
        </div>
        ${recentAnn.length ? recentAnn.map(a => `
          <div style="padding:12px 0;border-bottom:1px solid #f1f5f9">
            <div style="font-size:14px;font-weight:600;margin-bottom:4px">${a.title}</div>
            <div class="text-muted" style="font-size:12px">${a.body.slice(0, 80)}...</div>
            <div style="font-size:11px;color:#6B7A9D;margin-top:4px">${formatDate(a.date)}</div>
          </div>`).join('') : '<div class="empty-state"><i class="fas fa-bullhorn"></i><p>No announcements</p></div>'}
      </div>
    </div>

    <!-- Pending Leaves -->
    ${pendingLeaves.length ? `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-calendar-times" style="color:#ef4444"></i> Pending Leave Requests</div>
        <button class="btn btn-sm btn-secondary" onclick="navigate('leaves')">View All</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>Dates</th><th>Reason</th><th>Parent</th><th>Actions</th></tr></thead>
          <tbody>
            ${pendingLeaves.map(l => {
              const stu = DB.getStudent(l.studentId);
              const par = DB.getUser(l.parentId);
              return `<tr>
                <td><strong>${stu ? stu.name : '-'}</strong></td>
                <td>${formatDate(l.fromDate)} – ${formatDate(l.toDate)}</td>
                <td style="max-width:200px">${l.reason}</td>
                <td>${par ? par.name : '-'}</td>
                <td>
                  <button class="btn btn-success btn-xs" onclick="reviewLeave('${l.id}','approved')"><i class="fas fa-check"></i> Approve</button>
                  <button class="btn btn-danger btn-xs" style="margin-left:4px" onclick="reviewLeave('${l.id}','rejected')"><i class="fas fa-times"></i> Reject</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}`;

  renderLayout('dashboard', content, 'Dashboard', isSubAdmin ? `Class Teacher · ${(DB.getClass(myClassId) || {}).name || ''}` : 'Super Admin');
}

// ---- Students ----
let studentSearch = '';
let studentClassFilter = '';

function renderStudents() {
  const user = Session.current();
  const isSubAdmin = user.role === 'subadmin';
  const myClassId = isSubAdmin ? user.assignedClass : null;
  const data = DB.get();

  let students = DB.getStudents(myClassId);
  if (studentSearch) students = students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.rollNo.toLowerCase().includes(studentSearch.toLowerCase()));
  if (studentClassFilter) students = students.filter(s => s.classId === studentClassFilter);

  const classes = myClassId ? [DB.getClass(myClassId)].filter(Boolean) : data.classes;

  const content = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-user-graduate" style="color:#1AA6CA"></i> Students (${students.length})</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <div class="search-box">
            <i class="fas fa-search icon"></i>
            <input class="form-control" style="width:200px;padding-left:36px" placeholder="Search..." value="${studentSearch}" oninput="studentSearch=this.value;renderStudents()"/>
          </div>
          ${!myClassId ? `<select class="form-control" style="width:150px" onchange="studentClassFilter=this.value;renderStudents()">
            <option value="">All Classes</option>
            ${data.classes.map(c => `<option value="${c.id}" ${studentClassFilter===c.id?'selected':''}>${c.name}</option>`).join('')}
          </select>` : ''}
          <button class="btn btn-primary" onclick="openAddStudentModal()"><i class="fas fa-plus"></i> Add Student</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Student</th><th>Roll No.</th><th>Class</th><th>DOB</th><th>Parent</th><th>Attendance</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${students.length ? students.map(s => {
              const cls = DB.getClass(s.classId);
              const par = DB.getUser(s.parentId);
              const att = DB.getAttendanceSummary(s.id);
              return `<tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    ${avatarHtml(s.name, '#0F2050')}
                    <div>
                      <div style="font-weight:600">${s.name}</div>
                      <div class="text-muted">${s.gender} · ${s.bloodGroup}</div>
                    </div>
                  </div>
                </td>
                <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:6px">${s.rollNo}</code></td>
                <td>${cls ? `<span class="badge badge-blue">${cls.name}</span>` : '-'}</td>
                <td>${formatDate(s.dob)}</td>
                <td>
                  ${par ? `<div style="font-size:13px;font-weight:600">${par.name}</div>
                  <button class="btn btn-xs btn-whatsapp" onclick="wa('${par.phone}','Hello ${par.name}, I am ${user.name}, the class teacher of ${s.name}.')">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                  </button>` : '-'}
                </td>
                <td>
                  <span class="badge ${att.pct >= 90 ? 'badge-green' : att.pct >= 75 ? 'badge-yellow' : 'badge-red'}">${att.pct}%</span>
                </td>
                <td>
                  <div style="display:flex;gap:4px;flex-wrap:wrap">
                    <button class="btn btn-xs btn-primary" onclick="openStudentProfile('${s.id}')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-xs btn-secondary" onclick="openEditStudentModal('${s.id}')"><i class="fas fa-edit"></i></button>
                    ${Session.canDelete() ? `<button class="btn btn-xs btn-danger" onclick="deleteStudent('${s.id}')"><i class="fas fa-trash"></i></button>` : ''}
                  </div>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-user-graduate"></i><h3>No students found</h3></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;

  renderLayout('students', content, 'Students', isSubAdmin ? (DB.getClass(myClassId) || {}).name : 'All Classes');
}

function openStudentProfile(sid) {
  const data = DB.get();
  const s = DB.getStudent(sid);
  if (!s) return;
  const user = Session.current();
  const cls = DB.getClass(s.classId);
  const par = DB.getUser(s.parentId);
  const grades = DB.getGrades(sid, 'Term 1', '2024');
  const att = DB.getAttendanceSummary(sid);
  const growth = DB.getGrowth(sid);
  const lastGrowth = growth[growth.length - 1];
  const leaves = DB.getLeaves(sid);
  const activities = data.activities.filter(a => a.studentIds.includes(sid));

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-xl">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:16px">
          ${avatarHtml(s.name, '#0F2050', 'avatar-lg')}
          <div>
            <div class="modal-title">${s.name}</div>
            <div style="color:#6B7A9D;font-size:13px">${cls ? cls.name : '-'} · Roll: ${s.rollNo} · ${s.gender} · ${s.bloodGroup}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${par ? `<button class="btn btn-whatsapp btn-sm" onclick="wa('${par.phone}','Hello ${par.name}, I wanted to discuss ${s.name}\\'s progress. - ${user.name}')">
            <i class="fab fa-whatsapp"></i> WhatsApp Parent
          </button>` : ''}
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
      </div>
      <div class="modal-body">
        <div class="grid-2 gap-4" style="margin-bottom:20px">
          <div class="stat-card">
            <div class="stat-icon" style="background:#d1fae5"><i class="fas fa-calendar-check" style="color:#10b981"></i></div>
            <div style="font-size:24px;font-weight:800;color:#10b981">${att.pct}%</div>
            <div class="text-muted">Attendance (${att.present}P / ${att.absent}A / ${att.late}L)</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#E8EDF5"><i class="fas fa-star" style="color:#1AA6CA"></i></div>
            <div style="font-size:24px;font-weight:800;color:#1AA6CA">${grades.length ? Math.round(grades.reduce((s,g) => s + (g.score/g.maxScore*100), 0) / grades.length) : '-'}%</div>
            <div class="text-muted">Average Grade (${grades.length} subjects)</div>
          </div>
        </div>

        <!-- Grades Table -->
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:14px"><i class="fas fa-star" style="color:#1AA6CA"></i> Grades - Term 1 2024</div>
          ${grades.length ? `<div class="table-wrap"><table>
            <thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Teacher Comment</th><th>Actions</th></tr></thead>
            <tbody>${grades.map(g => `<tr>
              <td><strong>${g.subject}</strong></td>
              <td>${scoreBarHtml(g.score, g.maxScore)}</td>
              <td><span class="grade-badge ${gradeColor(g.grade)}">${g.grade}</span></td>
              <td style="font-size:12px;color:#6B7A9D">${g.teacherComment || '-'}</td>
              <td><button class="btn btn-xs btn-secondary" onclick="openEditGradeModal('${g.id}')"><i class="fas fa-edit"></i></button></td>
            </tr>`).join('')}</tbody>
          </table></div>` : '<p class="text-muted">No grades recorded</p>'}
          <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="openAddGradeModal('${s.id}','${s.classId}')">
            <i class="fas fa-plus"></i> Add Grade
          </button>
        </div>

        <!-- Growth -->
        ${lastGrowth ? `
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:14px"><i class="fas fa-chart-line" style="color:#10b981"></i> Latest Growth Record</div>
          <div style="display:flex;gap:24px;flex-wrap:wrap">
            <div><div style="font-size:22px;font-weight:800">${lastGrowth.height} cm</div><div class="text-muted">Height</div></div>
            <div><div style="font-size:22px;font-weight:800">${lastGrowth.weight} kg</div><div class="text-muted">Weight</div></div>
            <div><div style="font-size:22px;font-weight:800">${lastGrowth.bmi}</div><div class="text-muted">BMI</div></div>
            <div><div style="font-size:14px;font-weight:600">${formatDate(lastGrowth.date)}</div><div class="text-muted">Recorded</div></div>
          </div>
          <button class="btn btn-success btn-sm" style="margin-top:12px" onclick="openAddGrowthModal('${s.id}')">
            <i class="fas fa-plus"></i> Log Growth
          </button>
        </div>` : ''}

        <!-- Parent Info -->
        ${par ? `
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:14px"><i class="fas fa-user" style="color:#E8B020"></i> Parent / Guardian</div>
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            ${avatarHtml(par.name, par.avatar)}
            <div style="flex:1">
              <div style="font-weight:700">${par.name}</div>
              <div class="text-muted">${par.email} · ${par.phone}</div>
            </div>
            <button class="btn btn-whatsapp" onclick="wa('${par.phone}','Hello ${par.name}, I am ${user.name}, the class teacher of ${s.name}. I would like to discuss their academic progress.')">
              <i class="fab fa-whatsapp"></i> WhatsApp
            </button>
          </div>
        </div>` : ''}

        <!-- Activities -->
        ${activities.length ? `
        <div class="card">
          <div class="card-title" style="margin-bottom:14px"><i class="fas fa-running" style="color:#C4893A"></i> Activities</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${activities.map(a => `<span class="badge badge-purple">${a.name} · ${a.day}</span>`).join('')}
          </div>
        </div>` : ''}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function openAddStudentModal(prefillClassId = null) {
  const data = DB.get();
  const parents = DB.getParents();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <h2 class="modal-title">Add New Student</h2>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input class="form-control" id="st-name" placeholder="Student full name"/>
          </div>
          <div class="form-group">
            <label class="form-label">Roll Number *</label>
            <input class="form-control" id="st-roll" placeholder="e.g. G5A-010"/>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Class *</label>
            <select class="form-control" id="st-class">
              <option value="">Select Class</option>
              ${data.classes.map(c => `<option value="${c.id}" ${prefillClassId===c.id?'selected':''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Gender *</label>
            <select class="form-control" id="st-gender">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Date of Birth</label>
            <input class="form-control" id="st-dob" type="date"/>
          </div>
          <div class="form-group">
            <label class="form-label">Blood Group</label>
            <select class="form-control" id="st-blood">
              <option value="">Select</option>
              ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => `<option>${b}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <input class="form-control" id="st-addr" placeholder="Home address"/>
        </div>
        <div class="form-group">
          <label class="form-label">Join Date</label>
          <input class="form-control" id="st-join" type="date" value="${new Date().toISOString().split('T')[0]}"/>
        </div>
        <hr class="divider"/>
        <div class="form-group">
          <label class="form-label">Assign to Existing Parent</label>
          <select class="form-control" id="st-parent">
            <option value="">No parent assigned</option>
            ${parents.map(p => `<option value="${p.id}">${p.name} (${p.username})</option>`).join('')}
          </select>
        </div>
        <div style="background:#FEF7E0;border-radius:10px;padding:12px;font-size:13px;color:#9A6A00;margin-top:8px">
          <i class="fas fa-info-circle"></i> To create a new parent account and link this child, use the "Management → Parents" section.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNewStudent()"><i class="fas fa-save"></i> Add Student</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveNewStudent() {
  const data = DB.get();
  const name = document.getElementById('st-name').value.trim();
  const roll = document.getElementById('st-roll').value.trim();
  const cls = document.getElementById('st-class').value;
  const gender = document.getElementById('st-gender').value;
  const parentId = document.getElementById('st-parent').value || null;

  if (!name || !roll || !cls) { showToast('Please fill required fields', 'error'); return; }

  const id = DB.genId('s');
  const student = {
    id, name, rollNo: roll, classId: cls, gender,
    dob: document.getElementById('st-dob').value,
    bloodGroup: document.getElementById('st-blood').value,
    address: document.getElementById('st-addr').value,
    joinDate: document.getElementById('st-join').value,
    parentId, photo: null, deleted: false
  };

  data.students.push(student);

  // Link to parent
  if (parentId) {
    const par = data.users.find(u => u.id === parentId);
    if (par) {
      if (!par.childIds) par.childIds = [];
      par.childIds.push(id);
    }
  }

  DB.commit();
  DB.log(Session.current().id, 'ADD_STUDENT', `Added ${name}`);
  document.querySelector('.modal-overlay').remove();
  showToast(`Student ${name} added successfully!`, 'success');
  renderStudents();
}

function openEditStudentModal(sid) {
  const data = DB.get();
  const s = data.students.find(x => x.id === sid);
  if (!s) return;
  const parents = DB.getParents();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <h2 class="modal-title">Edit Student</h2>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input class="form-control" id="est-name" value="${s.name}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Roll Number</label>
            <input class="form-control" id="est-roll" value="${s.rollNo}"/>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Class</label>
            <select class="form-control" id="est-class">
              ${data.classes.map(c => `<option value="${c.id}" ${s.classId===c.id?'selected':''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Gender</label>
            <select class="form-control" id="est-gender">
              ${['Male','Female','Other'].map(g => `<option ${s.gender===g?'selected':''}>${g}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Date of Birth</label>
            <input class="form-control" id="est-dob" type="date" value="${s.dob || ''}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Blood Group</label>
            <select class="form-control" id="est-blood">
              ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => `<option ${s.bloodGroup===b?'selected':''}>${b}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <input class="form-control" id="est-addr" value="${s.address || ''}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Parent</label>
          <select class="form-control" id="est-parent">
            <option value="">No parent</option>
            ${parents.map(p => `<option value="${p.id}" ${s.parentId===p.id?'selected':''}>${p.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEditStudent('${sid}')"><i class="fas fa-save"></i> Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveEditStudent(sid) {
  const data = DB.get();
  const s = data.students.find(x => x.id === sid);
  if (!s) return;
  s.name = document.getElementById('est-name').value.trim() || s.name;
  s.rollNo = document.getElementById('est-roll').value.trim() || s.rollNo;
  s.classId = document.getElementById('est-class').value || s.classId;
  s.gender = document.getElementById('est-gender').value;
  s.dob = document.getElementById('est-dob').value;
  s.bloodGroup = document.getElementById('est-blood').value;
  s.address = document.getElementById('est-addr').value;
  const newParentId = document.getElementById('est-parent').value || null;
  if (newParentId !== s.parentId) {
    // Remove from old parent
    if (s.parentId) {
      const oldPar = data.users.find(u => u.id === s.parentId);
      if (oldPar && oldPar.childIds) oldPar.childIds = oldPar.childIds.filter(c => c !== sid);
    }
    // Add to new parent
    if (newParentId) {
      const newPar = data.users.find(u => u.id === newParentId);
      if (newPar) { if (!newPar.childIds) newPar.childIds = []; newPar.childIds.push(sid); }
    }
    s.parentId = newParentId;
  }
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Student updated!', 'success');
  renderStudents();
}

function deleteStudent(sid) {
  if (!Session.canDelete()) { showToast('Only Super Admin can permanently delete records', 'error'); return; }
  const s = DB.getStudent(sid);
  confirmDialog(`Delete student "${s.name}"? This cannot be undone.`, () => {
    const data = DB.get();
    const stu = data.students.find(x => x.id === sid);
    if (stu) stu.deleted = true;
    DB.commit();
    DB.log(Session.current().id, 'DELETE_STUDENT', `Deleted ${stu.name}`);
    showToast('Student deleted', 'warning');
    renderStudents();
  });
}

// ---- Classes ----
function renderClasses() {
  const data = DB.get();
  const user = Session.current();
  const isSubAdmin = user.role === 'subadmin';
  const myClassId = isSubAdmin ? user.assignedClass : null;
  const classes = myClassId ? data.classes.filter(c => c.id === myClassId) : data.classes;

  const content = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-school" style="color:#10b981"></i> Classes (${classes.length})</div>
        ${!isSubAdmin ? `<button class="btn btn-primary" onclick="openAddClassModal()"><i class="fas fa-plus"></i> Add Class</button>` : ''}
      </div>
      <div class="grid-3">
        ${classes.map(cls => {
          const teacher = DB.getUser(cls.teacherId);
          const students = DB.getStudents(cls.id);
          return `
          <div class="card" style="cursor:pointer;border:2px solid #DCE1EF;padding:20px" onclick="">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
              <div class="stat-icon" style="background:#d1fae5;margin-bottom:0"><i class="fas fa-school" style="color:#10b981"></i></div>
              <div>
                <div style="font-size:16px;font-weight:800">${cls.name}</div>
                <div class="text-muted">Grade ${cls.grade} · Section ${cls.section}</div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:12px">
              <div><div style="font-size:22px;font-weight:800;color:#1AA6CA">${students.length}</div><div class="text-muted">Students</div></div>
              <div><div style="font-size:22px;font-weight:800;color:#10b981">${cls.subjects.length}</div><div class="text-muted">Subjects</div></div>
              <div><div style="font-size:22px;font-weight:800;color:#E8B020">${cls.capacity}</div><div class="text-muted">Capacity</div></div>
            </div>
            <div style="padding:10px;background:#F8F9FB;border-radius:10px;margin-bottom:12px">
              <div style="font-size:12px;color:#6B7A9D;margin-bottom:4px">Class Teacher</div>
              ${teacher ? `<div style="font-weight:600">${teacher.name}</div>` : '<div style="color:#6B7A9D">Not assigned</div>'}
            </div>
            <div style="font-size:12px;color:#6B7A9D;margin-bottom:8px">Subjects</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${cls.subjects.map(sub => `<span class="badge badge-blue" style="font-size:11px">${sub}</span>`).join('')}
            </div>
            ${!isSubAdmin ? `
            <div style="display:flex;gap:8px;margin-top:16px">
              <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();openEditClassModal('${cls.id}')"><i class="fas fa-edit"></i> Edit</button>
              ${Session.canDelete() ? `<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteClass('${cls.id}')"><i class="fas fa-trash"></i></button>` : ''}
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;

  renderLayout('classes', content, 'Classes');
}

function openAddClassModal() {
  const data = DB.get();
  const teachers = DB.getSubAdmins();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Add New Class</h2>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Class Name *</label>
            <input class="form-control" id="cls-name" placeholder="e.g. Grade 5-A"/>
          </div>
          <div class="form-group">
            <label class="form-label">Grade *</label>
            <input class="form-control" id="cls-grade" placeholder="e.g. 5"/>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Section</label>
            <input class="form-control" id="cls-section" placeholder="e.g. A"/>
          </div>
          <div class="form-group">
            <label class="form-label">Capacity</label>
            <input class="form-control" id="cls-cap" type="number" value="30"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Class Teacher</label>
          <select class="form-control" id="cls-teacher">
            <option value="">None</option>
            ${teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Subjects (comma-separated)</label>
          <input class="form-control" id="cls-subjects" placeholder="Mathematics, English, Science"/>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNewClass()"><i class="fas fa-save"></i> Add Class</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveNewClass() {
  const data = DB.get();
  const name = document.getElementById('cls-name').value.trim();
  const grade = document.getElementById('cls-grade').value.trim();
  if (!name || !grade) { showToast('Name and grade required', 'error'); return; }
  const cls = {
    id: DB.genId('cls'), name, grade,
    section: document.getElementById('cls-section').value,
    capacity: parseInt(document.getElementById('cls-cap').value) || 30,
    teacherId: document.getElementById('cls-teacher').value || null,
    subjects: document.getElementById('cls-subjects').value.split(',').map(s => s.trim()).filter(Boolean)
  };
  data.classes.push(cls);
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Class added!', 'success');
  renderClasses();
}

function openEditClassModal(clsId) {
  const data = DB.get();
  const cls = data.classes.find(c => c.id === clsId);
  if (!cls) return;
  const teachers = DB.getSubAdmins();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Edit Class</h2>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Class Name</label>
            <input class="form-control" id="ecls-name" value="${cls.name}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Grade</label>
            <input class="form-control" id="ecls-grade" value="${cls.grade}"/>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Section</label>
            <input class="form-control" id="ecls-section" value="${cls.section}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Capacity</label>
            <input class="form-control" id="ecls-cap" type="number" value="${cls.capacity}"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Class Teacher</label>
          <select class="form-control" id="ecls-teacher">
            <option value="">None</option>
            ${teachers.map(t => `<option value="${t.id}" ${cls.teacherId===t.id?'selected':''}>${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Subjects (comma-separated)</label>
          <input class="form-control" id="ecls-subjects" value="${cls.subjects.join(', ')}"/>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEditClass('${clsId}')">Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveEditClass(clsId) {
  const data = DB.get();
  const cls = data.classes.find(c => c.id === clsId);
  if (!cls) return;
  cls.name = document.getElementById('ecls-name').value.trim() || cls.name;
  cls.grade = document.getElementById('ecls-grade').value;
  cls.section = document.getElementById('ecls-section').value;
  cls.capacity = parseInt(document.getElementById('ecls-cap').value) || cls.capacity;
  cls.teacherId = document.getElementById('ecls-teacher').value || null;
  cls.subjects = document.getElementById('ecls-subjects').value.split(',').map(s => s.trim()).filter(Boolean);
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Class updated!', 'success');
  renderClasses();
}

function deleteClass(clsId) {
  if (!Session.canDelete()) return;
  confirmDialog('Delete this class? Students will be unassigned.', () => {
    const data = DB.get();
    data.classes = data.classes.filter(c => c.id !== clsId);
    data.students.forEach(s => { if (s.classId === clsId) s.classId = null; });
    DB.commit();
    showToast('Class deleted', 'warning');
    renderClasses();
  });
}

// ---- Attendance ----
let attDate = new Date().toISOString().split('T')[0];
let attClassFilter = '';

function renderAttendance() {
  const user = Session.current();
  const isSubAdmin = user.role === 'subadmin';
  const data = DB.get();
  const myClassId = isSubAdmin ? user.assignedClass : attClassFilter;
  const classes = isSubAdmin ? [DB.getClass(myClassId)].filter(Boolean) : data.classes;

  const students = DB.getStudents(myClassId || null);
  const existingAtt = DB.getAttendanceByClass(myClassId || null, attDate);

  const getStatus = (sid) => {
    const rec = existingAtt.find(a => a.studentId === sid);
    return rec ? rec.status : null;
  };

  const content = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-calendar-check" style="color:#10b981"></i> Daily Attendance</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          ${!isSubAdmin ? `<select class="form-control" style="width:160px" onchange="attClassFilter=this.value;renderAttendance()">
            <option value="">All Classes</option>
            ${data.classes.map(c => `<option value="${c.id}" ${attClassFilter===c.id?'selected':''}>${c.name}</option>`).join('')}
          </select>` : ''}
          <input type="date" class="form-control" style="width:160px" value="${attDate}" onchange="attDate=this.value;renderAttendance()"/>
          <button class="btn btn-success" onclick="markAllPresent()"><i class="fas fa-check-double"></i> All Present</button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Student</th><th>Class</th><th>Present</th><th>Absent</th><th>Late</th></tr>
          </thead>
          <tbody>
            ${students.map(s => {
              const cls = DB.getClass(s.classId);
              const status = getStatus(s.id);
              return `<tr id="att-row-${s.id}">
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    ${avatarHtml(s.name, '#0F2050')}
                    <strong>${s.name}</strong>
                  </div>
                </td>
                <td>${cls ? cls.name : '-'}</td>
                <td><button class="btn btn-xs ${status==='present'?'btn-success':'btn-secondary'}" onclick="markAtt('${s.id}','present')"><i class="fas fa-check"></i>${status==='present'?' ✓':''}</button></td>
                <td><button class="btn btn-xs ${status==='absent'?'btn-danger':'btn-secondary'}" onclick="markAtt('${s.id}','absent')"><i class="fas fa-times"></i>${status==='absent'?' ✓':''}</button></td>
                <td><button class="btn btn-xs ${status==='late'?'btn-warning':'btn-secondary'}" onclick="markAtt('${s.id}','late')"><i class="fas fa-clock"></i>${status==='late'?' ✓':''}</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Summary -->
    ${myClassId || attClassFilter ? '' : ''}
    <div class="card">
      <div class="card-title" style="margin-bottom:14px">Monthly Summary</div>
      ${students.slice(0,8).map(s => {
        const att = DB.getAttendanceSummary(s.id);
        return `<div class="flex-between" style="margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px;min-width:180px">
            ${avatarHtml(s.name, '#0F2050')}
            <span style="font-size:13px;font-weight:600">${s.name}</span>
          </div>
          <div style="flex:1;margin:0 16px">${scoreBarHtml(att.present, att.total || 1)}</div>
          <span class="badge ${att.pct>=90?'badge-green':att.pct>=75?'badge-yellow':'badge-red'}">${att.pct}%</span>
        </div>`;
      }).join('')}
    </div>`;

  renderLayout('attendance', content, 'Attendance');
}

function markAtt(sid, status) {
  const data = DB.get();
  const user = Session.current();
  const existing = data.attendance.find(a => a.studentId === sid && a.date === attDate);
  if (existing) {
    existing.status = status;
    existing.markedBy = user.id;
  } else {
    const stu = DB.getStudent(sid);
    data.attendance.push({ id: DB.genId('a'), studentId: sid, classId: stu ? stu.classId : null, date: attDate, status, markedBy: user.id });
  }
  DB.commit();
  renderAttendance();
}

function markAllPresent() {
  const user = Session.current();
  const isSubAdmin = user.role === 'subadmin';
  const myClassId = isSubAdmin ? user.assignedClass : attClassFilter;
  const students = DB.getStudents(myClassId || null);
  const data = DB.get();
  students.forEach(s => {
    const existing = data.attendance.find(a => a.studentId === s.id && a.date === attDate);
    if (existing) existing.status = 'present';
    else data.attendance.push({ id: DB.genId('a'), studentId: s.id, classId: s.classId, date: attDate, status: 'present', markedBy: user.id });
  });
  DB.commit();
  showToast('All students marked present!', 'success');
  renderAttendance();
}

// ---- Grades ----
let gradesClassFilter = '';
let gradesTerm = 'Semester 1';
let gradesStudentFilter = '';

function renderGrades() {
  const user = Session.current();
  const isSubAdmin = user.role === 'subadmin';
  const data = DB.get();
  const myClassId = isSubAdmin ? user.assignedClass : gradesClassFilter;
  const students = DB.getStudents(myClassId || null);
  const terms = ['Semester 1', 'Semester 2'];

  const content = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-star" style="color:#1AA6CA"></i> Grades Management</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${!isSubAdmin ? `<select class="form-control" style="width:150px" onchange="gradesClassFilter=this.value;gradesStudentFilter='';renderGrades()">
            <option value="">All Classes</option>
            ${data.classes.map(c => `<option value="${c.id}" ${gradesClassFilter===c.id?'selected':''}>${c.name}</option>`).join('')}
          </select>` : ''}
          <select class="form-control" style="width:140px" onchange="gradesStudentFilter=this.value;renderGrades()">
            <option value="">All Students</option>
            ${students.map(s => `<option value="${s.id}" ${gradesStudentFilter===s.id?'selected':''}>${s.name}</option>`).join('')}
          </select>
          <select class="form-control" style="width:130px" onchange="gradesTerm=this.value;renderGrades()">
            ${terms.map(t => `<option ${gradesTerm===t?'selected':''}>${t}</option>`).join('')}
          </select>
          <button class="btn btn-primary" onclick="openBulkGradeModal()"><i class="fas fa-plus"></i> Add Grades</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Student</th><th>Class</th><th>Subject</th><th>Score</th><th>Grade</th><th>Comment</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${(() => {
              const grades = data.grades.filter(g =>
                students.some(s => s.id === g.studentId) &&
                g.term === gradesTerm &&
                (!gradesStudentFilter || g.studentId === gradesStudentFilter)
              );
              if (!grades.length) return `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-star"></i><h3>No grades${gradesStudentFilter ? ' for selected student' : ''} in ${gradesTerm}</h3></div></td></tr>`;
              return grades.map(g => {
                const stu = DB.getStudent(g.studentId);
                const cls = stu ? DB.getClass(stu.classId) : null;
                return `<tr>
                  <td>${stu ? stu.name : '-'}</td>
                  <td>${cls ? `<span class="badge badge-blue">${cls.name}</span>` : '-'}</td>
                  <td><strong>${g.subject}</strong></td>
                  <td>${scoreBarHtml(g.score, g.maxScore)}</td>
                  <td><span class="grade-badge ${gradeColor(g.grade)}">${g.grade}</span></td>
                  <td style="font-size:12px;max-width:200px">${g.teacherComment || '-'}</td>
                  <td>
                    <button class="btn btn-xs btn-secondary" onclick="openEditGradeModal('${g.id}')"><i class="fas fa-edit"></i></button>
                    ${Session.canDelete() ? `<button class="btn btn-xs btn-danger" onclick="deleteGrade('${g.id}')"><i class="fas fa-trash"></i></button>` : ''}
                  </td>
                </tr>`;
              }).join('');
            })()}
          </tbody>
        </table>
      </div>
    </div>`;

  renderLayout('grades', content, 'Grades');
}

function openAddGradeModal(studentId, classId) {
  const cls = DB.getClass(classId);
  const subjects = cls ? cls.subjects : ['Mathematics', 'English', 'Science'];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h2 class="modal-title">Add Grade</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Subject *</label>
          <select class="form-control" id="gr-subject">
            ${subjects.map(s => `<option>${s}</option>`).join('')}
            <option value="custom">Custom...</option>
          </select>
        </div>
        <div class="form-group" id="gr-custom-wrap" style="display:none">
          <label class="form-label">Custom Subject</label>
          <input class="form-control" id="gr-custom-subject" placeholder="Subject name"/>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Score *</label>
            <input class="form-control" id="gr-score" type="number" min="0" max="100" placeholder="0"/>
          </div>
          <div class="form-group">
            <label class="form-label">Max Score</label>
            <input class="form-control" id="gr-max" type="number" value="100"/>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Term</label>
            <select class="form-control" id="gr-term">
              <option>Semester 1</option><option>Semester 2</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Year</label>
            <input class="form-control" id="gr-year" value="2024"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Teacher Comment</label>
          <textarea class="form-control" id="gr-comment" rows="2" placeholder="Optional comment"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNewGrade('${studentId}','${classId}')">Save Grade</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.getElementById('gr-subject').onchange = function() {
    document.getElementById('gr-custom-wrap').style.display = this.value === 'custom' ? 'block' : 'none';
  };
}

function saveNewGrade(studentId, classId) {
  const data = DB.get();
  const subjectEl = document.getElementById('gr-subject');
  const subject = subjectEl.value === 'custom' ? document.getElementById('gr-custom-subject').value.trim() : subjectEl.value;
  const score = parseInt(document.getElementById('gr-score').value);
  const maxScore = parseInt(document.getElementById('gr-max').value) || 100;
  if (!subject || isNaN(score)) { showToast('Subject and score required', 'error'); return; }
  const grade = DB.calcGrade(score, maxScore);
  data.grades.push({
    id: DB.genId('g'), studentId, classId,
    term: document.getElementById('gr-term').value,
    year: document.getElementById('gr-year').value,
    subject, score, maxScore, grade,
    teacherComment: document.getElementById('gr-comment').value,
    date: new Date().toISOString().split('T')[0]
  });
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Grade added!', 'success');
  if (document.querySelector('.student-card')) openStudentProfile(studentId);
  else renderGrades();
}

function openEditGradeModal(gid) {
  const data = DB.get();
  const g = data.grades.find(x => x.id === gid);
  if (!g) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h2 class="modal-title">Edit Grade - ${g.subject}</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Score</label>
            <input class="form-control" id="egr-score" type="number" value="${g.score}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Max Score</label>
            <input class="form-control" id="egr-max" type="number" value="${g.maxScore}"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Teacher Comment</label>
          <textarea class="form-control" id="egr-comment" rows="3">${g.teacherComment || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEditGrade('${gid}')">Save</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveEditGrade(gid) {
  const data = DB.get();
  const g = data.grades.find(x => x.id === gid);
  if (!g) return;
  g.score = parseInt(document.getElementById('egr-score').value) || g.score;
  g.maxScore = parseInt(document.getElementById('egr-max').value) || g.maxScore;
  g.grade = DB.calcGrade(g.score, g.maxScore);
  g.teacherComment = document.getElementById('egr-comment').value;
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Grade updated!', 'success');
  renderGrades();
}

function deleteGrade(gid) {
  if (!Session.canDelete()) return;
  confirmDialog('Delete this grade record?', () => {
    const data = DB.get();
    data.grades = data.grades.filter(g => g.id !== gid);
    DB.commit();
    showToast('Grade deleted', 'warning');
    renderGrades();
  });
}

function openBulkGradeModal() {
  const user = Session.current();
  const myClassId = user.role === 'subadmin' ? user.assignedClass : gradesClassFilter;
  const students = DB.getStudents(myClassId || null);
  const cls = DB.getClass(myClassId);
  const subjects = cls ? cls.subjects : ['Mathematics', 'English'];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header"><h2 class="modal-title">Bulk Add Grades</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Subject</label>
            <select class="form-control" id="bulk-sub">${subjects.map(s => `<option>${s}</option>`).join('')}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Term</label>
            <select class="form-control" id="bulk-term"><option>Semester 1</option><option>Semester 2</option></select>
          </div>
        </div>
        <div class="table-wrap" style="margin-top:16px">
          <table>
            <thead><tr><th>Student</th><th>Score (out of 100)</th><th>Comment</th></tr></thead>
            <tbody>
              ${students.map(s => `<tr>
                <td>${s.name}</td>
                <td><input class="form-control" id="bscore-${s.id}" type="number" min="0" max="100" placeholder="Score" style="width:80px"/></td>
                <td><input class="form-control" id="bcomment-${s.id}" placeholder="Optional comment"/></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveBulkGrades(${JSON.stringify(students.map(s=>({id:s.id,classId:s.classId})))})">Save All</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveBulkGrades(students) {
  const data = DB.get();
  const subject = document.getElementById('bulk-sub').value;
  const term = document.getElementById('bulk-term').value;
  let count = 0;
  students.forEach(st => {
    const scoreEl = document.getElementById(`bscore-${st.id}`);
    const commentEl = document.getElementById(`bcomment-${st.id}`);
    if (scoreEl && scoreEl.value !== '') {
      const score = parseInt(scoreEl.value);
      const grade = DB.calcGrade(score, 100);
      data.grades.push({
        id: DB.genId('g'), studentId: st.id, classId: st.classId,
        term, year: '2024', subject, score, maxScore: 100, grade,
        teacherComment: commentEl ? commentEl.value : '', date: new Date().toISOString().split('T')[0]
      });
      count++;
    }
  });
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast(`${count} grades saved!`, 'success');
  renderGrades();
}

// ---- Growth ----
function renderGrowth() {
  const user = Session.current();
  const isSubAdmin = user.role === 'subadmin';
  const data = DB.get();
  const myClassId = isSubAdmin ? user.assignedClass : null;
  const students = DB.getStudents(myClassId);

  const content = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-chart-line" style="color:#10b981"></i> Growth Tracker</div>
        <button class="btn btn-primary" onclick="openAddGrowthBulkModal()"><i class="fas fa-plus"></i> Log Growth</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>Class</th><th>Latest Height</th><th>Latest Weight</th><th>BMI</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${students.map(s => {
              const growthRecs = DB.getGrowth(s.id);
              const last = growthRecs[growthRecs.length - 1];
              const cls = DB.getClass(s.classId);
              const bmiStatus = last ? (last.bmi < 18.5 ? 'Underweight' : last.bmi < 25 ? 'Normal' : 'Overweight') : '-';
              const bmiColor = last ? (last.bmi < 18.5 ? '#E8B020' : last.bmi < 25 ? '#10b981' : '#ef4444') : '#6B7A9D';
              return `<tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    ${avatarHtml(s.name, '#10b981')}
                    <strong>${s.name}</strong>
                  </div>
                </td>
                <td>${cls ? cls.name : '-'}</td>
                <td>${last ? `<strong>${last.height} cm</strong>` : '-'}</td>
                <td>${last ? `<strong>${last.weight} kg</strong>` : '-'}</td>
                <td>${last ? `<span style="color:${bmiColor};font-weight:700">${last.bmi} <small>(${bmiStatus})</small></span>` : '-'}</td>
                <td>${last ? formatDate(last.date) : 'No data'}</td>
                <td>
                  <button class="btn btn-xs btn-primary" onclick="openAddGrowthModal('${s.id}')"><i class="fas fa-plus"></i> Log</button>
                  <button class="btn btn-xs btn-secondary" onclick="viewGrowthHistory('${s.id}')"><i class="fas fa-history"></i></button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  renderLayout('growth', content, 'Growth Tracker');
}

function openAddGrowthModal(sid) {
  const s = DB.getStudent(sid);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h2 class="modal-title">Log Growth - ${s ? s.name : ''}</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Height (cm) *</label>
            <input class="form-control" id="gr-height" type="number" placeholder="e.g. 142"/>
          </div>
          <div class="form-group">
            <label class="form-label">Weight (kg) *</label>
            <input class="form-control" id="gr-weight" type="number" placeholder="e.g. 36"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Date</label>
          <input class="form-control" id="gr-date" type="date" value="${new Date().toISOString().split('T')[0]}"/>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-success" onclick="saveGrowth('${sid}')"><i class="fas fa-save"></i> Log Growth</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveGrowth(sid) {
  const data = DB.get();
  const h = parseFloat(document.getElementById('gr-height').value);
  const w = parseFloat(document.getElementById('gr-weight').value);
  if (!h || !w) { showToast('Height and weight required', 'error'); return; }
  const bmi = DB.calcBMI(h, w);
  data.growth.push({
    id: DB.genId('gr'), studentId: sid,
    date: document.getElementById('gr-date').value,
    height: h, weight: w, bmi,
    recordedBy: Session.current().id
  });
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Growth recorded!', 'success');
  renderGrowth();
}

function openAddGrowthBulkModal() {
  const user = Session.current();
  const myClassId = user.role === 'subadmin' ? user.assignedClass : null;
  const students = DB.getStudents(myClassId);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header"><h2 class="modal-title">Bulk Log Growth</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Date</label>
          <input class="form-control" id="bulk-gr-date" type="date" value="${new Date().toISOString().split('T')[0]}" style="max-width:200px"/>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Height (cm)</th><th>Weight (kg)</th></tr></thead>
            <tbody>
              ${students.map(s => `<tr>
                <td>${s.name}</td>
                <td><input class="form-control" id="bh-${s.id}" type="number" placeholder="Height" style="width:100px"/></td>
                <td><input class="form-control" id="bw-${s.id}" type="number" placeholder="Weight" style="width:100px"/></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-success" onclick="saveBulkGrowth(${JSON.stringify(students.map(s=>s.id))})">Save All</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveBulkGrowth(studentIds) {
  const data = DB.get();
  const date = document.getElementById('bulk-gr-date').value;
  let count = 0;
  studentIds.forEach(sid => {
    const h = parseFloat(document.getElementById(`bh-${sid}`).value);
    const w = parseFloat(document.getElementById(`bw-${sid}`).value);
    if (h && w) {
      data.growth.push({ id: DB.genId('gr'), studentId: sid, date, height: h, weight: w, bmi: DB.calcBMI(h, w), recordedBy: Session.current().id });
      count++;
    }
  });
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast(`${count} growth records saved!`, 'success');
  renderGrowth();
}

function viewGrowthHistory(sid) {
  const s = DB.getStudent(sid);
  const records = DB.getGrowth(sid);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <h2 class="modal-title">Growth History - ${s ? s.name : ''}</h2>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="chart-wrap" style="height:200px;margin-bottom:20px"><canvas id="growth-chart"></canvas></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Height (cm)</th><th>Weight (kg)</th><th>BMI</th><th>Status</th></tr></thead>
            <tbody>
              ${records.map(r => {
                const bmiStatus = r.bmi < 18.5 ? 'Underweight' : r.bmi < 25 ? 'Normal' : 'Overweight';
                const bmiColor = r.bmi < 18.5 ? '#E8B020' : r.bmi < 25 ? '#10b981' : '#ef4444';
                return `<tr>
                  <td>${formatDate(r.date)}</td>
                  <td><strong>${r.height} cm</strong></td>
                  <td><strong>${r.weight} kg</strong></td>
                  <td style="color:${bmiColor};font-weight:700">${r.bmi}</td>
                  <td><span class="badge" style="background:${bmiColor}20;color:${bmiColor}">${bmiStatus}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  setTimeout(() => {
    const ctx = document.getElementById('growth-chart');
    if (!ctx || !records.length) return;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: records.map(r => formatDate(r.date)),
        datasets: [
          { label: 'Height (cm)', data: records.map(r => r.height), borderColor: '#1AA6CA', tension: 0.4, fill: false },
          { label: 'Weight (kg)', data: records.map(r => r.weight), borderColor: '#10b981', tension: 0.4, fill: false }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }, 100);
}

// ---- Activities ----
function renderActivities() {
  const user = Session.current();
  const isSubAdmin = user.role === 'subadmin';
  const data = DB.get();
  const myClassId = isSubAdmin ? user.assignedClass : null;

  const activities = myClassId ? data.activities.filter(a => !a.classId || a.classId === myClassId) : data.activities;

  const content = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-running" style="color:#C4893A"></i> Activities & Clubs</div>
        <button class="btn btn-primary" onclick="openAddActivityModal()"><i class="fas fa-plus"></i> Add Activity</button>
      </div>
      <div class="grid-2">
        ${activities.map(act => {
          const enrolled = act.studentIds.map(sid => DB.getStudent(sid)).filter(Boolean);
          return `
          <div class="card" style="border:2px solid #DCE1EF;padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
              <div>
                <div style="font-size:16px;font-weight:800">${act.name}</div>
                <div class="text-muted">${act.day} · ${act.time} · ${act.instructor}</div>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-xs btn-secondary" onclick="openEditActivityModal('${act.id}')"><i class="fas fa-edit"></i></button>
                ${Session.canDelete() ? `<button class="btn btn-xs btn-danger" onclick="deleteActivity('${act.id}')"><i class="fas fa-trash"></i></button>` : ''}
              </div>
            </div>
            <div style="font-size:12px;font-weight:600;color:#6B7A9D;margin-bottom:8px">Enrolled Students (${enrolled.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${enrolled.map(s => `<span class="badge badge-purple">${s.name}</span>`).join('')}
              ${!enrolled.length ? '<span class="text-muted">No students enrolled</span>' : ''}
            </div>
            <button class="btn btn-sm btn-secondary" style="margin-top:12px" onclick="openEnrollModal('${act.id}')">
              <i class="fas fa-user-plus"></i> Manage Enrollment
            </button>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  renderLayout('activities', content, 'Activities');
}

function openAddActivityModal() {
  const user = Session.current();
  const myClassId = user.role === 'subadmin' ? user.assignedClass : null;
  const data = DB.get();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h2 class="modal-title">Add Activity</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Activity Name *</label><input class="form-control" id="act-name" placeholder="e.g. Football Team"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Day</label>
            <select class="form-control" id="act-day">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=>`<option>${d}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label class="form-label">Time</label><input class="form-control" id="act-time" placeholder="e.g. 3:00 PM"/></div>
        </div>
        <div class="form-group"><label class="form-label">Instructor</label><input class="form-control" id="act-instructor" placeholder="Instructor name"/></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNewActivity()">Add Activity</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveNewActivity() {
  const data = DB.get();
  const user = Session.current();
  const myClassId = user.role === 'subadmin' ? user.assignedClass : null;
  const name = document.getElementById('act-name').value.trim();
  if (!name) { showToast('Activity name required', 'error'); return; }
  data.activities.push({
    id: DB.genId('act'), name,
    classId: myClassId,
    day: document.getElementById('act-day').value,
    time: document.getElementById('act-time').value,
    instructor: document.getElementById('act-instructor').value,
    studentIds: []
  });
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Activity added!', 'success');
  renderActivities();
}

function openEnrollModal(actId) {
  const data = DB.get();
  const act = data.activities.find(a => a.id === actId);
  if (!act) return;
  const user = Session.current();
  const myClassId = user.role === 'subadmin' ? user.assignedClass : null;
  const students = DB.getStudents(myClassId);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h2 class="modal-title">Manage Enrollment - ${act.name}</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        ${students.map(s => `
          <label style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;border:1px solid #DCE1EF;margin-bottom:6px">
            <input type="checkbox" id="enroll-${s.id}" ${act.studentIds.includes(s.id)?'checked':''} style="width:16px;height:16px;accent-color:#1AA6CA"/>
            ${avatarHtml(s.name, '#0F2050')}
            ${s.name}
          </label>`).join('')}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEnrollment('${actId}',${JSON.stringify(students.map(s=>s.id))})">Save</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveEnrollment(actId, studentIds) {
  const data = DB.get();
  const act = data.activities.find(a => a.id === actId);
  if (!act) return;
  act.studentIds = studentIds.filter(sid => document.getElementById(`enroll-${sid}`) && document.getElementById(`enroll-${sid}`).checked);
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Enrollment updated!', 'success');
  renderActivities();
}

function openEditActivityModal(actId) {
  const data = DB.get();
  const act = data.activities.find(a => a.id === actId);
  if (!act) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h2 class="modal-title">Edit Activity</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Activity Name</label><input class="form-control" id="eact-name" value="${act.name}"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Day</label>
            <select class="form-control" id="eact-day">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=>`<option ${act.day===d?'selected':''}>${d}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label class="form-label">Time</label><input class="form-control" id="eact-time" value="${act.time}"/></div>
        </div>
        <div class="form-group"><label class="form-label">Instructor</label><input class="form-control" id="eact-instructor" value="${act.instructor}"/></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEditActivity('${actId}')">Save</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveEditActivity(actId) {
  const data = DB.get();
  const act = data.activities.find(a => a.id === actId);
  if (!act) return;
  act.name = document.getElementById('eact-name').value.trim() || act.name;
  act.day = document.getElementById('eact-day').value;
  act.time = document.getElementById('eact-time').value;
  act.instructor = document.getElementById('eact-instructor').value;
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Activity updated!', 'success');
  renderActivities();
}

function deleteActivity(actId) {
  if (!Session.canDelete()) { showToast('Only Super Admin can delete', 'error'); return; }
  confirmDialog('Delete this activity?', () => {
    const data = DB.get();
    data.activities = data.activities.filter(a => a.id !== actId);
    DB.commit();
    showToast('Activity deleted', 'warning');
    renderActivities();
  });
}

// ---- Syllabus ----
let syllabusClassFilter2 = '';
let syllabusTerm2 = 'Term 1';

function renderSyllabus() {
  const user = Session.current();
  const isSubAdmin = user.role === 'subadmin';
  const data = DB.get();
  const myClassId = isSubAdmin ? user.assignedClass : syllabusClassFilter2;

  const syllabi = DB.getSyllabus(myClassId || '', syllabusTerm2);
  const cls = DB.getClass(myClassId);

  const content = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-book-open" style="color:#C4893A"></i> Syllabus Management</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${!isSubAdmin ? `<select class="form-control" style="width:150px" onchange="syllabusClassFilter2=this.value;renderSyllabus()">
            <option value="">Select Class</option>
            ${data.classes.map(c => `<option value="${c.id}" ${syllabusClassFilter2===c.id?'selected':''}>${c.name}</option>`).join('')}
          </select>` : ''}
          <select class="form-control" style="width:120px" onchange="syllabusTerm2=this.value;renderSyllabus()">
            <option>Term 1</option><option>Term 2</option><option>Term 3</option>
          </select>
          ${(myClassId || isSubAdmin) ? `<button class="btn btn-primary" onclick="openAddSyllabusModal('${myClassId}')"><i class="fas fa-plus"></i> Add Subject Syllabus</button>` : ''}
        </div>
      </div>

      ${!myClassId && !isSubAdmin ? `<div class="empty-state"><i class="fas fa-book-open"></i><h3>Select a class</h3><p>Choose a class to view and manage syllabus</p></div>` :
      syllabi.length ? syllabi.map(syl => {
        const totalTopics = syl.topics.length;
        const done = syl.topics.filter(t => t.status === 'completed').length;
        const inprog = syl.topics.filter(t => t.status === 'in_progress').length;
        return `
        <div class="card" style="margin-bottom:20px;border:2px solid #DCE1EF">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div>
              <div style="font-size:18px;font-weight:800">${syl.subject}</div>
              <div class="text-muted">${cls ? cls.name : ''} · ${syl.term} ${syl.year}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="badge badge-green">${done} Done</span>
              <span class="badge badge-yellow">${inprog} In Progress</span>
              <span class="badge badge-gray">${totalTopics - done - inprog} Pending</span>
              <button class="btn btn-xs btn-primary" onclick="openAddTopicModal('${syl.id}')"><i class="fas fa-plus"></i> Add Topic</button>
              ${Session.canDelete() ? `<button class="btn btn-xs btn-danger" onclick="deleteSyllabus('${syl.id}')"><i class="fas fa-trash"></i></button>` : ''}
            </div>
          </div>
          <div class="progress-bar" style="margin-bottom:16px">
            <div class="progress-fill" style="width:${Math.round(done/totalTopics*100)||0}%"></div>
          </div>
          ${syl.topics.map(t => {
            const statusColors = { completed: '#10b981', in_progress: '#E8B020', pending: '#6B7A9D' };
            const statusLabels = { completed: 'Completed', in_progress: 'In Progress', pending: 'Pending' };
            return `
            <div class="topic-row">
              <div style="flex:1">
                <div style="font-weight:600">${t.title}</div>
                <div class="text-muted">Weeks ${t.weeks} · ${t.description}</div>
              </div>
              <span class="topic-status-badge" style="background:${statusColors[t.status]}20;color:${statusColors[t.status]}">${statusLabels[t.status]}</span>
              <div style="display:flex;gap:4px">
                ${t.status !== 'completed' ? `<button class="btn btn-xs btn-success" onclick="updateTopicStatus('${syl.id}','${t.id}','completed')">✓ Done</button>` : ''}
                ${t.status === 'pending' ? `<button class="btn btn-xs btn-warning" onclick="updateTopicStatus('${syl.id}','${t.id}','in_progress')">Start</button>` : ''}
                ${Session.canDelete() ? `<button class="btn btn-xs btn-danger" onclick="deleteTopic('${syl.id}','${t.id}')"><i class="fas fa-trash"></i></button>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>`;
      }).join('') : `<div class="empty-state"><i class="fas fa-book-open"></i><h3>No syllabus for ${syllabusTerm2}</h3><p>Add subjects and topics to build the syllabus</p></div>`}
    </div>`;

  renderLayout('syllabus', content, 'Syllabus');
}

function openAddSyllabusModal(classId) {
  const cls = DB.getClass(classId);
  const subjects = cls ? cls.subjects : [];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h2 class="modal-title">Add Subject Syllabus</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Subject *</label>
          <select class="form-control" id="syl-sub">
            ${subjects.map(s => `<option>${s}</option>`).join('')}
            <option value="custom">Custom...</option>
          </select>
        </div>
        <div class="form-group" id="syl-custom-wrap" style="display:none">
          <label class="form-label">Custom Subject</label>
          <input class="form-control" id="syl-custom" placeholder="Subject name"/>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Term</label>
            <select class="form-control" id="syl-term"><option>Term 1</option><option>Term 2</option><option>Term 3</option></select>
          </div>
          <div class="form-group">
            <label class="form-label">Year</label>
            <input class="form-control" id="syl-year" value="2024"/>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNewSyllabus('${classId}')">Create</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.getElementById('syl-sub').onchange = function() {
    document.getElementById('syl-custom-wrap').style.display = this.value === 'custom' ? 'block' : 'none';
  };
}

function saveNewSyllabus(classId) {
  const data = DB.get();
  const subEl = document.getElementById('syl-sub');
  const subject = subEl.value === 'custom' ? document.getElementById('syl-custom').value.trim() : subEl.value;
  if (!subject) { showToast('Subject required', 'error'); return; }
  data.syllabus.push({
    id: DB.genId('syl'), classId, subject,
    term: document.getElementById('syl-term').value,
    year: document.getElementById('syl-year').value,
    topics: []
  });
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Syllabus created!', 'success');
  renderSyllabus();
}

function openAddTopicModal(sylId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h2 class="modal-title">Add Topic</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Topic Title *</label><input class="form-control" id="tp-title" placeholder="e.g. Fractions & Decimals"/></div>
        <div class="form-group"><label class="form-label">Weeks</label><input class="form-control" id="tp-weeks" placeholder="e.g. 1-3"/></div>
        <div class="form-group"><label class="form-label">Description</label><textarea class="form-control" id="tp-desc" rows="2" placeholder="Brief description"></textarea></div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" id="tp-status"><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNewTopic('${sylId}')">Add Topic</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function saveNewTopic(sylId) {
  const data = DB.get();
  const syl = data.syllabus.find(s => s.id === sylId);
  if (!syl) return;
  const title = document.getElementById('tp-title').value.trim();
  if (!title) { showToast('Topic title required', 'error'); return; }
  syl.topics.push({
    id: DB.genId('t'), title,
    weeks: document.getElementById('tp-weeks').value,
    description: document.getElementById('tp-desc').value,
    status: document.getElementById('tp-status').value
  });
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Topic added!', 'success');
  renderSyllabus();
}

function updateTopicStatus(sylId, topicId, status) {
  const data = DB.get();
  const syl = data.syllabus.find(s => s.id === sylId);
  if (!syl) return;
  const topic = syl.topics.find(t => t.id === topicId);
  if (topic) { topic.status = status; DB.commit(); renderSyllabus(); }
}

function deleteTopic(sylId, topicId) {
  const data = DB.get();
  const syl = data.syllabus.find(s => s.id === sylId);
  if (!syl) return;
  syl.topics = syl.topics.filter(t => t.id !== topicId);
  DB.commit();
  renderSyllabus();
}

function deleteSyllabus(sylId) {
  if (!Session.canDelete()) return;
  confirmDialog('Delete this syllabus?', () => {
    const data = DB.get();
    data.syllabus = data.syllabus.filter(s => s.id !== sylId);
    DB.commit();
    showToast('Syllabus deleted', 'warning');
    renderSyllabus();
  });
}

// ---- Leaves ----
function renderLeaves() {
  const user = Session.current();
  const isSubAdmin = user.role === 'subadmin';
  const myClassId = isSubAdmin ? user.assignedClass : null;
  const leaves = DB.getLeaves(null, null, myClassId);

  const content = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-calendar-times" style="color:#ef4444"></i> Leave Requests (${leaves.length})</div>
      </div>
      ${leaves.length ? leaves.map(l => {
        const stu = DB.getStudent(l.studentId);
        const par = DB.getUser(l.parentId);
        const colors = { pending: 'yellow', approved: 'green', rejected: 'red' };
        return `
        <div class="leave-card ${l.status}" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
            <div>
              <div style="font-weight:700;font-size:16px">${stu ? stu.name : '-'}</div>
              <div class="text-muted">${par ? par.name + ' (Parent)' : ''}</div>
              <div style="margin:8px 0;font-size:14px"><i class="fas fa-calendar" style="color:#1AA6CA"></i> ${formatDate(l.fromDate)} – ${formatDate(l.toDate)}</div>
              <div style="font-size:14px;color:#2A3B60"><strong>Reason:</strong> ${l.reason}</div>
              ${l.reviewNote ? `<div style="font-size:13px;color:#6B7A9D;margin-top:4px"><strong>Note:</strong> ${l.reviewNote}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
              <span class="badge badge-${colors[l.status]}">${l.status.toUpperCase()}</span>
              <span style="font-size:11px;color:#6B7A9D">Applied: ${formatDate(l.appliedOn)}</span>
              ${l.status === 'pending' ? `
                <div style="display:flex;gap:6px">
                  <button class="btn btn-xs btn-success" onclick="reviewLeave('${l.id}','approved')"><i class="fas fa-check"></i> Approve</button>
                  <button class="btn btn-xs btn-danger" onclick="reviewLeave('${l.id}','rejected')"><i class="fas fa-times"></i> Reject</button>
                </div>` : ''}
              ${par ? `<button class="btn btn-xs btn-whatsapp" onclick="wa('${par.phone}','Hello ${par.name}, regarding ${stu ? stu.name : ""}\\'s leave request from ${l.fromDate} to ${l.toDate}: it has been ${l.status}.')">
                <i class="fab fa-whatsapp"></i> Notify Parent
              </button>` : ''}
            </div>
          </div>
        </div>`;
      }).join('') : '<div class="empty-state"><i class="fas fa-calendar-times"></i><h3>No leave requests</h3></div>'}
    </div>`;

  renderLayout('leaves', content, 'Leave Requests');
}

function reviewLeave(lid, status) {
  const data = DB.get();
  const leave = data.leaves.find(l => l.id === lid);
  if (!leave) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-header"><h2 class="modal-title">${status === 'approved' ? 'Approve' : 'Reject'} Leave</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Note to Parent (optional)</label>
          <textarea class="form-control" id="review-note" rows="3" placeholder="e.g. Approved. Please bring a medical certificate."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn ${status==='approved'?'btn-success':'btn-danger'}" onclick="confirmReviewLeave('${lid}','${status}')">
          ${status === 'approved' ? 'Approve' : 'Reject'}
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function confirmReviewLeave(lid, status) {
  const data = DB.get();
  const leave = data.leaves.find(l => l.id === lid);
  if (!leave) return;
  leave.status = status;
  leave.reviewedBy = Session.current().id;
  leave.reviewNote = document.getElementById('review-note').value;
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast(`Leave ${status}!`, status === 'approved' ? 'success' : 'warning');
  renderLeaves();
}

// ---- Announcements ----
function renderAnnouncements() {
  const user = Session.current();
  Seen.mark('ann', user.id);
  const isSubAdmin = user.role === 'subadmin';
  const myClassId = isSubAdmin ? user.assignedClass : null;
  const anns = DB.getAnnouncements(myClassId);

  const content = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-bullhorn" style="color:#E8B020"></i> Announcements</div>
        <button class="btn btn-primary" onclick="openAddAnnouncementModal()"><i class="fas fa-plus"></i> Post Announcement</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:4px">
      ${anns.map(a => {
        const poster = DB.getUser(a.postedBy);
        const cls = a.classId ? DB.getClass(a.classId) : null;
        return `
        <div onclick="expandAnnouncement('${a.id}')" style="border:1px solid #e0e7ff;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 2px 8px rgba(15,32,80,0.07);cursor:pointer;position:relative;transition:box-shadow 0.15s,transform 0.15s" onmouseover="this.style.boxShadow='0 6px 20px rgba(15,32,80,0.13)';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(15,32,80,0.07)';this.style.transform='translateY(0)'">
          ${a.imageUrl
            ? `<img src="/r2/${a.imageUrl}" style="width:100%;height:auto;display:block">`
            : `<div style="height:5px;background:linear-gradient(90deg,#0F2050,#E8B020,#C4893A)"></div>`}
          <div style="padding:12px 14px 14px">
            <div style="font-size:14px;font-weight:700;color:#0F1E3D;margin-bottom:5px;line-height:1.3">${a.title}</div>
            <div style="font-size:12px;color:#4A5B80;line-height:1.55;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${a.body}</div>
            <div style="font-size:11px;color:#6B7A9D;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px;border-top:1px solid #f1f5f9;padding-top:8px">
              ${cls ? `<span class="badge badge-blue" style="font-size:10px">${cls.name}</span>` : '<span class="badge badge-gray" style="font-size:10px">All</span>'}
              <span><i class="fas fa-calendar" style="margin-right:3px"></i>${formatDate(a.date)}</span>
            </div>
          </div>
          ${Session.canDelete() ? `<div style="position:absolute;top:8px;right:8px" onclick="event.stopPropagation()">
            <button class="btn btn-xs btn-danger" onclick="deleteAnnouncement('${a.id}')" title="Delete" style="opacity:0.85"><i class="fas fa-trash"></i></button>
          </div>` : ''}
        </div>`;
      }).join('')}
      </div>
      ${!anns.length ? '<div class="empty-state"><i class="fas fa-bullhorn"></i><h3>No announcements</h3></div>' : ''}
    </div>`;

  renderLayout('announcements', content, 'Announcements');
}

function expandAnnouncement(id) {
  const data = DB.get();
  const a = data.announcements.find(x => x.id === id);
  if (!a) return;
  const poster = DB.getUser(a.postedBy);
  const cls = a.classId ? DB.getClass(a.classId) : null;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:560px">
      <div class="modal-header">
        <h2 class="modal-title"><i class="fas fa-bullhorn" style="color:#E8B020;margin-right:8px"></i>${a.title}</h2>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="padding:0">
        ${a.imageUrl ? `<div style="width:100%;background:#f0f4ff;border-bottom:2px solid #e0e7ff"><img src="/r2/${a.imageUrl}" style="width:100%;height:auto;display:block"></div>` : ''}
        <div style="padding:18px">
          <p style="color:#2A3B60;font-size:14px;line-height:1.8;white-space:pre-wrap;margin:0 0 16px">${a.body}</p>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:#6B7A9D;border-top:1px solid #f1f5f9;padding-top:10px">
            ${cls ? `<span class="badge badge-blue">${cls.name}</span>` : '<span class="badge badge-gray">All</span>'}
            <span><i class="fas fa-user" style="margin-right:3px"></i>${poster ? poster.name : 'School'}</span>
            <span><i class="fas fa-calendar" style="margin-right:3px"></i>${formatDate(a.date)}</span>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function openAddAnnouncementModal() {
  const user = Session.current();
  const data = DB.get();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h2 class="modal-title">Post Announcement</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Title *</label><input class="form-control" id="ann-title" placeholder="Announcement title"/></div>
        <div class="form-group"><label class="form-label">Message *</label><textarea class="form-control" id="ann-body" rows="4" placeholder="Enter announcement content..."></textarea></div>
        <div class="form-group">
          <label class="form-label">Greeting Image (optional)</label>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div id="ann-img-preview" style="width:60px;height:60px;border:1.5px dashed #DCE1EF;border-radius:8px;background:#F8F9FB;display:flex;align-items:center;justify-content:center;overflow:hidden">
              <i class="fas fa-image" style="color:#DCE1EF;font-size:22px"></i>
            </div>
            <div>
              <input type="file" id="ann-img-input" accept="image/*" style="display:none" onchange="uploadAnnouncementImage(this)">
              <button type="button" onclick="document.getElementById('ann-img-input').click()" style="padding:6px 12px;border:1.5px solid #1AA6CA;border-radius:6px;background:#E5F5FF;color:#1AA6CA;font-size:12px;cursor:pointer;font-weight:600"><i class="fas fa-upload"></i> Upload Image</button>
              <div style="font-size:11px;color:#6B7A9D;margin-top:4px">Optional greeting image for occasions</div>
            </div>
          </div>
          <input type="hidden" id="ann-img-url" value="">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Target Audience</label>
            <select class="form-control" id="ann-target"><option value="all">All</option><option value="parent">Parents Only</option><option value="subadmin">Teachers Only</option></select>
          </div>
          ${user.role === 'superadmin' ? `<div class="form-group">
            <label class="form-label">For Class (optional)</label>
            <select class="form-control" id="ann-class">
              <option value="">All Classes</option>
              ${data.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>` : ''}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-warning" onclick="saveAnnouncement()"><i class="fas fa-bullhorn"></i> Post</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function uploadAnnouncementImage(input) {
  if (!input.files || !input.files[0]) return;
  showToast('Uploading image…', 'default');
  var form = new FormData();
  form.append('file', input.files[0]);
  var _annTok = localStorage.getItem('sk_session_token');
  fetch('/api/upload?folder=announcements', {method: 'POST', headers: _annTok ? {'Authorization':'Bearer '+_annTok} : {}, body: form})
    .then(function(r) { return r.json(); })
    .then(function(r) {
      if (r.error) { showToast('Upload failed', 'error'); return; }
      var urlEl = document.getElementById('ann-img-url');
      if (urlEl) urlEl.value = r.key;
      var preview = document.getElementById('ann-img-preview');
      if (preview) preview.innerHTML = '<img src="/r2/'+r.key+'" style="width:100%;height:100%;object-fit:cover;border-radius:6px">';
      showToast('Image uploaded', 'success');
    })
    .catch(function() { showToast('Upload failed', 'error'); });
}

function saveAnnouncement() {
  const data = DB.get();
  const user = Session.current();
  const title = document.getElementById('ann-title').value.trim();
  const body = document.getElementById('ann-body').value.trim();
  if (!title || !body) { showToast('Title and message required', 'error'); return; }
  const classEl = document.getElementById('ann-class');
  const imgEl = document.getElementById('ann-img-url');
  data.announcements.unshift({
    id: DB.genId('ann'), title, body,
    imageUrl: imgEl ? imgEl.value || null : null,
    postedBy: user.id,
    targetRole: document.getElementById('ann-target').value,
    date: new Date().toISOString().split('T')[0],
    classId: classEl ? classEl.value || null : (user.role === 'subadmin' ? user.assignedClass : null)
  });
  DB.commit();
  document.querySelector('.modal-overlay').remove();
  showToast('Announcement posted!', 'success');
  renderAnnouncements();
}

function deleteAnnouncement(id) {
  if (!Session.canDelete()) return;
  const data = DB.get();
  data.announcements = data.announcements.filter(a => a.id !== id);
  DB.commit();
  showToast('Announcement deleted', 'warning');
  renderAnnouncements();
}

// ---- Messages ----
let msgTargetId = null;
let msgStudentId = null;

function renderMessages() {
  const user = Session.current();
  const data = DB.get();
  const myClassId = user.role === 'subadmin' ? user.assignedClass : null;
  const students = DB.getStudents(myClassId);

  // Get unique conversations (parents of my students)
  const parentIds = [...new Set(students.map(s => s.parentId).filter(Boolean))];
  const parents = parentIds.map(pid => DB.getUser(pid)).filter(Boolean);

  const myMsgs = data.messages.filter(m => m.from === user.id || m.to === user.id);

  const content = `
    <div class="grid-2" style="height:600px">
      <!-- Conversations list -->
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:16px;border-bottom:1px solid #DCE1EF;font-weight:700">Conversations</div>
        <div style="overflow-y:auto;height:calc(100% - 56px)">
          ${parents.map(p => {
            const pMsgs = myMsgs.filter(m => m.from === p.id || m.to === p.id);
            const lastMsg = pMsgs[pMsgs.length - 1];
            const childrenOfParent = DB.getStudentsByParent(p.id).filter(s => students.some(st => st.id === s.id));
            return `
            <div class="flex gap-3" style="padding:14px 16px;cursor:pointer;border-bottom:1px solid #f1f5f9;align-items:center;${msgTargetId===p.id?'background:#E8EDF5':''}" onclick="openConversation('${p.id}','${childrenOfParent[0]?.id||''}')">
              ${avatarHtml(p.name, p.avatar)}
              <div style="flex:1;overflow:hidden">
                <div style="font-weight:600;font-size:14px">${p.name}</div>
                <div class="text-muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  ${lastMsg ? lastMsg.text.slice(0, 40) + '...' : 'No messages yet'}
                </div>
                <div style="display:flex;gap:4px;margin-top:2px;flex-wrap:wrap">
                  ${childrenOfParent.map(s => `<span class="badge badge-blue" style="font-size:10px">${s.name}</span>`).join('')}
                </div>
              </div>
              <button class="btn btn-whatsapp btn-xs" onclick="event.stopPropagation();wa('${p.phone}','Hello ${p.name}')">
                <i class="fab fa-whatsapp"></i>
              </button>
            </div>`;
          }).join('')}
          ${!parents.length ? '<div class="empty-state" style="padding:30px"><i class="fas fa-comment-dots"></i><p>No parent conversations</p></div>' : ''}
        </div>
      </div>

      <!-- Chat window -->
      <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column" id="chat-window">
        ${msgTargetId ? renderChatWindow(msgTargetId) : `
        <div class="flex-center" style="height:100%;flex-direction:column;color:#6B7A9D">
          <i class="fas fa-comment-dots" style="font-size:48px;margin-bottom:16px;opacity:0.4"></i>
          <p>Select a conversation</p>
        </div>`}
      </div>
    </div>`;

  renderLayout('messages', content, 'Messages');
}

function openConversation(parentId, studentId) {
  msgTargetId = parentId;
  msgStudentId = studentId;
  renderMessages();
}

function renderChatWindow(parentId) {
  const user = Session.current();
  const data = DB.get();
  const parent = DB.getUser(parentId);
  const msgs = data.messages.filter(m =>
    (m.from === user.id && m.to === parentId) ||
    (m.from === parentId && m.to === user.id)
  ).sort((a, b) => a.time.localeCompare(b.time));

  return `
    <div style="padding:16px;border-bottom:1px solid #DCE1EF;display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:10px">
        ${parent ? avatarHtml(parent.name, parent.avatar) : ''}
        <div>
          <div style="font-weight:700">${parent ? parent.name : ''}</div>
          <div class="text-muted" style="font-size:12px">Parent</div>
        </div>
      </div>
      ${parent ? `<button class="btn btn-whatsapp btn-sm" onclick="wa('${parent.phone}','Hello ${parent.name}, I wanted to get in touch regarding your child.')">
        <i class="fab fa-whatsapp"></i> WhatsApp
      </button>` : ''}
    </div>
    <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column">
      ${msgs.map(m => `
        <div class="msg-bubble ${m.from === user.id ? 'msg-sent' : 'msg-recv'}">
          ${m.text}
          <div style="font-size:10px;opacity:0.7;margin-top:4px;text-align:right">${formatDateTime(m.time)}</div>
        </div>`).join('')}
      ${!msgs.length ? '<div class="text-muted" style="text-align:center;margin:auto">No messages yet. Start the conversation!</div>' : ''}
    </div>
    <div style="padding:14px;border-top:1px solid #DCE1EF;display:flex;gap:10px">
      <input class="form-control" id="msg-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter')sendMessage('${parentId}')"/>
      <button class="btn btn-primary" onclick="sendMessage('${parentId}')"><i class="fas fa-paper-plane"></i></button>
    </div>`;
}

function sendMessage(toId) {
  const input = document.getElementById('msg-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;
  const data = DB.get();
  data.messages.push({
    id: DB.genId('m'), from: Session.current().id, to: toId,
    studentId: msgStudentId || null,
    text, time: new Date().toISOString().replace('T', ' ').slice(0, 16),
    read: false, type: 'inapp'
  });
  DB.commit();
  input.value = '';
  // Refresh just the chat area
  const chatWin = document.getElementById('chat-window');
  if (chatWin) chatWin.innerHTML = renderChatWindow(toId);
  const msgArea = document.getElementById('chat-messages');
  if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;
}

// ============================================================
// Gallery (Admin)
// ============================================================

let _galFilterClass = '';
let _galSelectedFiles = []; // array of {name, dataUrl}
let _galCurrentTab = 'photo';

function renderGallery() {
  const data = DB.get();
  const user = Session.current();
  Seen.mark('gal', user.id);
  const isSubAdmin = user.role === 'subadmin';
  const myClassId = isSubAdmin ? user.assignedClass : null;
  const allClasses = myClassId ? [DB.getClass(myClassId)].filter(Boolean) : data.classes;

  const uploadModal = `
    <div class="modal-overlay" id="gallery-upload-modal" style="display:none">
      <div class="modal" style="max-width:560px;max-height:90vh;overflow-y:auto">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fas fa-cloud-upload-alt" style="color:#1AA6CA"></i> Upload Photo / Video</h3>
          <button class="modal-close" onclick="closeGalleryModal()">×</button>
        </div>
        <div class="modal-body">
          <!-- Tabs -->
          <div style="display:flex;gap:4px;background:#F1F3F9;border-radius:10px;padding:4px;margin-bottom:20px">
            <button id="gal-tab-photo" onclick="switchGalleryTab('photo')"
              style="flex:1;padding:9px;border-radius:8px;border:none;background:#0F2050;color:#fff;font-weight:700;cursor:pointer;font-size:13px">
              📷 Photo
            </button>
            <button id="gal-tab-video" onclick="switchGalleryTab('video')"
              style="flex:1;padding:9px;border-radius:8px;border:none;background:transparent;color:#6B7A9D;font-weight:700;cursor:pointer;font-size:13px">
              ▶ YouTube Video
            </button>
          </div>

          <!-- Photo Section -->
          <div id="gal-photo-section">
            <div id="gallery-upload-area"
                 style="border:2px dashed #c7d2fe;border-radius:12px;padding:32px;text-align:center;cursor:pointer;background:#f8faff;margin-bottom:20px;transition:border-color 0.2s"
                 onclick="document.getElementById('gallery-file-input').click()"
                 ondragover="event.preventDefault();this.style.borderColor='#1AA6CA'"
                 ondragleave="this.style.borderColor='#c7d2fe'"
                 ondrop="handleGalleryDrop(event)">
              <i class="fas fa-cloud-upload-alt" style="font-size:40px;color:#1AA6CA;margin-bottom:12px"></i>
              <p style="font-weight:600;color:#334155;margin:0 0 4px">Click to select or drag &amp; drop</p>
              <p style="font-size:12px;color:#6B7A9D;margin:0">JPG, PNG, GIF up to 5MB</p>
              <input type="file" id="gallery-file-input" accept="image/*" multiple style="display:none" onchange="previewGalleryImages(this)">
            </div>
            <div id="gallery-preview-wrap" style="display:none;margin-bottom:20px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <span id="gallery-preview-count" style="font-size:13px;font-weight:600;color:#0F1E3D"></span>
                <button onclick="clearGalleryFiles()" style="font-size:12px;color:#ef4444;background:none;border:none;cursor:pointer"><i class="fas fa-times"></i> Clear all</button>
              </div>
              <div id="gallery-preview-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px"></div>
            </div>
          </div>

          <!-- Video Section -->
          <div id="gal-video-section" style="display:none;margin-bottom:20px">
            <div style="margin-bottom:16px">
              <label class="form-label">YouTube URL <span style="color:#ef4444">*</span></label>
              <div style="display:flex;gap:8px">
                <input id="gal-youtube-url" class="form-control" placeholder="https://www.youtube.com/watch?v=..." oninput="previewYoutubeUrl()" style="flex:1">
              </div>
              <p style="font-size:12px;color:#6B7A9D;margin:6px 0 0">Paste a YouTube video link — the thumbnail will be shown automatically.</p>
            </div>
            <div id="gal-video-preview" style="display:none;border-radius:12px;overflow:hidden;border:1px solid #DCE1EF">
              <img id="gal-video-thumb" src="" style="width:100%;max-height:200px;object-fit:cover;display:block" alt="Video thumbnail">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Title <span style="color:#ef4444">*</span></label>
            <input id="gal-title" class="form-control" placeholder="e.g. Sports Day 2024">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="gal-desc" class="form-control" rows="2" placeholder="Optional description of this activity"></textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Date</label>
              <input id="gal-date" class="form-control" type="date">
            </div>
            <div class="form-group">
              <label class="form-label">Class</label>
              <select id="gal-class" class="form-control" onchange="updateGalleryStudentList()">
                <option value="">All Classes</option>
                ${allClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <label class="form-label" style="margin:0"><i class="fas fa-user-tag"></i> Tag Students <span style="font-size:12px;font-weight:400;color:#6B7A9D">(optional)</span></label>
              <button type="button" onclick="tagAllStudents()" style="font-size:12px;color:#1AA6CA;background:none;border:1px solid #1AA6CA;border-radius:20px;padding:2px 10px;cursor:pointer;font-weight:600">Tag All</button>
            </div>
            <div id="gallery-student-list" style="display:flex;flex-wrap:wrap;gap:8px;padding:12px;background:#F8F9FB;border-radius:8px;border:1px solid #DCE1EF;min-height:52px">
              ${DB.getStudents(myClassId).map(s => `
                <label style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#fff;border:1px solid #DCE1EF;border-radius:20px;cursor:pointer;font-size:13px;font-weight:500;user-select:none">
                  <input type="checkbox" class="gal-student-cb" value="${s.id}" style="cursor:pointer">
                  ${avatarHtml(s.name,'#0F2050','avatar-xs')} ${s.name}
                </label>
              `).join('')}
            </div>
          </div>

          <div class="form-group">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <label class="form-label" style="margin:0"><i class="fas fa-tag"></i> Tag Events <span style="font-size:12px;font-weight:400;color:#6B7A9D">(optional)</span></label>
              <button type="button" onclick="tagAllEvents()" style="font-size:12px;color:#C4893A;background:none;border:1px solid #C4893A;border-radius:20px;padding:2px 10px;cursor:pointer;font-weight:600">Tag All</button>
            </div>
            <div id="gallery-event-list" style="display:flex;flex-wrap:wrap;gap:8px;padding:12px;background:#F8F9FB;border-radius:8px;border:1px solid #DCE1EF">
              ${['Art Time','Science Lab','Outdoor Play','Story Time','Music Class','Sport Day','Cooking Class','Block Building','Drama Class','Garden Time','SuperHero Day','Rainbow Art','Birthday Fun','Team Work'].map(ev => `
                <label style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#fff;border:1px solid #DCE1EF;border-radius:20px;cursor:pointer;font-size:13px;font-weight:500;user-select:none">
                  <input type="checkbox" class="gal-event-cb" value="${ev}" style="cursor:pointer;accent-color:#C4893A">
                  ${ev}
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Publish to Website -->
          <div style="margin-top:16px;padding:14px;background:#E8F7FC;border-radius:10px;border:1px solid rgba(26,166,202,0.3)">
            <label style="display:flex;align-items:center;gap:12px;cursor:pointer">
              <input type="checkbox" id="gal-publish" checked style="width:18px;height:18px;accent-color:#0F2050;cursor:pointer;flex-shrink:0">
              <div>
                <div style="font-weight:700;color:#0F2050;font-size:14px"><i class="fas fa-globe" style="color:#1AA6CA;margin-right:6px"></i>Publish to Website Gallery</div>
                <div style="font-size:12px;color:#6B7A9D;margin-top:2px">When checked, this item will appear on the public gallery page immediately</div>
              </div>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeGalleryModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveGalleryItem()">
            <i class="fas fa-cloud-upload-alt"></i> <span id="gal-upload-btn-text">Upload Photos</span>
          </button>
        </div>
      </div>
    </div>
    <div class="modal-overlay" id="gallery-lightbox" style="display:none" onclick="if(event.target===this)closeGalleryLightbox()">
      <div id="gallery-lightbox-content" style="background:#fff;border-radius:16px;max-width:780px;width:95%;overflow:hidden"></div>
    </div>`;

  const filterBar = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        ${!myClassId ? `
        <select class="form-control" style="width:180px" onchange="_galFilterClass=this.value;renderGallery()">
          <option value="">All Classes</option>
          ${data.classes.map(c => `<option value="${c.id}"${_galFilterClass===c.id?' selected':''}>${c.name}</option>`).join('')}
        </select>` : `<span class="badge badge-indigo">${(DB.getClass(myClassId)||{}).name||''}</span>`}
        <span id="gal-count" style="font-size:13px;color:#64748b">Loading…</span>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <span id="db-status-badge" style="padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;background:#F8F9FB;color:#6B7A9D;border:1px solid #DCE1EF;cursor:pointer" onclick="checkDbStatus()" title="Click to check DB connection">
          <i class="fas fa-circle" style="font-size:8px;margin-right:5px"></i>Checking DB...
        </span>
        ${!isSubAdmin ? `<button class="btn btn-secondary" onclick="forceSyncGallery()" title="Sync published photos to website"><i class="fas fa-sync-alt"></i> Sync to Website</button>` : ''}
        <button class="btn btn-primary" onclick="openGalleryUpload()">
          <i class="fas fa-cloud-upload-alt"></i> Upload Photo / Video
        </button>
      </div>
    </div>
    <div id="gallery-body" style="min-height:200px">
      <div style="display:flex;align-items:center;justify-content:center;height:200px;color:#94a3b8">
        <i class="fas fa-spinner fa-spin" style="font-size:28px"></i>
      </div>
    </div>
    ${uploadModal}`;

  renderLayout('gallery', filterBar, 'Gallery', 'Activity Photos & Daily Life');
  setTimeout(checkDbStatus, 500);

  // Async fetch from R2
  fetch('/api/gallery')
    .then(r => r.json())
    .then(({ items = [] }) => {
      _galleryPhotos = items;
      let photos = items;
      if (myClassId) {
        photos = photos.filter(p =>
          !p.classId || p.classId === myClassId ||
          (p.studentIds || []).some(sid => (DB.getStudent(sid) || {}).classId === myClassId)
        );
      }
      if (_galFilterClass) {
        photos = photos.filter(p =>
          !p.classId || p.classId === _galFilterClass ||
          (p.studentIds || []).some(sid => (DB.getStudent(sid) || {}).classId === _galFilterClass)
        );
      }
      const countEl = document.getElementById('gal-count');
      if (countEl) countEl.textContent = `${photos.length} photo${photos.length !== 1 ? 's' : ''}`;
      const bodyEl = document.getElementById('gallery-body');
      if (!bodyEl) return;
      bodyEl.innerHTML = photos.length === 0
        ? `<div class="empty-state" style="padding:80px">
            <i class="fas fa-images" style="font-size:64px;color:#c7d2fe"></i>
            <h3 style="margin:16px 0 8px">No Photos Yet</h3>
            <p>Upload activity photos to share with parents</p>
            <button class="btn btn-primary" style="margin-top:12px" onclick="openGalleryUpload()">
              <i class="fas fa-plus"></i> Upload First Photo
            </button>
          </div>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px">
            ${photos.map(p => renderGalleryCard(p)).join('')}
          </div>`;
    })
    .catch(() => {
      const bodyEl = document.getElementById('gallery-body');
      if (bodyEl) bodyEl.innerHTML = '<div class="empty-state" style="padding:60px"><p style="color:#ef4444">Failed to load gallery. Please refresh.</p></div>';
    });
}

function renderGalleryCard(p) {
  const cls = p.classId ? DB.getClass(p.classId) : null;
  const taggedStudents = (p.studentIds || []).map(sid => DB.getStudent(sid)).filter(Boolean);
  const uploader = DB.getUser(p.uploadedBy);
  const user = Session.current();
  const canDel = Session.canDelete() || (user && p.uploadedBy === user.id);
  const bgColors = ['#0F2050','#1AA6CA','#10b981','#E8B020','#ef4444','#1AA6CA'];
  const bg = bgColors[Math.abs(p.id.charCodeAt(3) || 0) % bgColors.length];

  const isVideo = p.type === 'video';
  const thumb = isVideo ? p.thumbnail : p.imageData;

  return `
    <div class="card" style="padding:0;overflow:hidden;border-radius:14px;transition:box-shadow 0.2s;cursor:pointer"
         onclick="openGalleryLightbox('${p.id}')"
         onmouseenter="this.style.boxShadow='0 8px 30px rgba(26,166,202,0.18)'"
         onmouseleave="this.style.boxShadow=''">
      <div style="position:relative;height:190px;overflow:hidden;background:#f1f5f9">
        ${thumb ?
          `<img src="${thumb}" style="width:100%;height:100%;object-fit:cover" alt="${p.title}">` :
          `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,${bg},${bg}cc)">
            <i class="fas ${isVideo ? 'fa-youtube' : 'fa-image'}" style="font-size:44px;color:rgba(255,255,255,0.5)"></i>
          </div>`
        }
        ${isVideo ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.15)">
          <div style="width:52px;height:52px;background:rgba(196,137,58,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(196,137,58,0.4)">
            <i class="fas fa-play" style="color:#fff;font-size:1.1rem;margin-left:3px"></i>
          </div>
        </div>` : ''}
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,0.35));pointer-events:none"></div>
        ${cls ? `<span style="position:absolute;top:10px;left:10px;background:rgba(26,166,202,0.9);color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600">${cls.name}</span>` : ''}
        ${p.published ? `<span style="position:absolute;bottom:10px;left:10px;background:rgba(15,32,80,0.88);color:#90C4E0;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700"><i class="fas fa-globe" style="margin-right:4px"></i>Live</span>` : '<span style="position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,0.55);color:rgba(255,255,255,0.6);padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700">Draft</span>'}
        ${canDel ? `
          <button class="btn btn-danger btn-xs"
            style="position:absolute;top:8px;right:8px;opacity:0.9"
            onclick="event.stopPropagation();deleteGalleryPhoto('${p.id}')">
            <i class="fas fa-trash"></i>
          </button>` : ''}
      </div>
      <div style="padding:14px">
        <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#0F1E3D">${p.title}</div>
        <div style="font-size:12px;color:#6B7A9D;margin-bottom:8px"><i class="fas fa-calendar-alt" style="margin-right:4px"></i>${formatDate(p.date)}</div>
        ${taggedStudents.length ? `
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:6px">
            <i class="fas fa-user-tag" style="font-size:11px;color:#6B7A9D"></i>
            ${taggedStudents.slice(0,3).map(s => `<span style="font-size:11px;background:#E8EDF5;color:#0F2050;padding:2px 8px;border-radius:10px">${s.name.split(' ')[0]}</span>`).join('')}
            ${taggedStudents.length > 3 ? `<span style="font-size:11px;color:#6B7A9D">+${taggedStudents.length-3}</span>` : ''}
          </div>
        ` : ''}
        ${(p.eventTags && p.eventTags.length) ? `
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:6px">
            <i class="fas fa-tag" style="font-size:11px;color:#C4893A"></i>
            ${p.eventTags.slice(0,2).map(ev => `<span style="font-size:11px;background:#FEF8F0;color:#C4893A;padding:2px 8px;border-radius:10px;border:1px solid #C4893A33">${ev}</span>`).join('')}
            ${p.eventTags.length > 2 ? `<span style="font-size:11px;color:#6B7A9D">+${p.eventTags.length-2}</span>` : ''}
          </div>
        ` : ''}
        ${uploader ? `<div style="font-size:11px;color:#6B7A9D;margin-top:4px">By ${uploader.name}</div>` : ''}
      </div>
    </div>
  `;
}

function openGalleryLightbox(photoId) {
  const p = _galleryPhotos.find(g => g.id === photoId);
  if (!p) return;
  const cls = p.classId ? DB.getClass(p.classId) : null;
  const taggedStudents = (p.studentIds || []).map(sid => DB.getStudent(sid)).filter(Boolean);
  const uploader = DB.getUser(p.uploadedBy);
  const isVideo = p.type === 'video';

  document.getElementById('gallery-lightbox-content').innerHTML = `
    <div style="position:relative">
      ${isVideo ?
        `<div style="position:relative;padding-bottom:56.25%;height:0;background:#000;border-radius:16px 16px 0 0;overflow:hidden">
          <iframe src="https://www.youtube.com/embed/${p.youtubeId}?autoplay=1&rel=0"
            style="position:absolute;top:0;left:0;width:100%;height:100%;border:none"
            allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>
        </div>` :
        p.imageData ?
          `<img src="${p.imageData}" style="width:100%;max-height:460px;object-fit:cover;display:block" alt="${p.title}">` :
          `<div style="height:280px;background:linear-gradient(135deg,#0F2050,#1AA6CA);display:flex;align-items:center;justify-content:center">
            <i class="fas fa-image" style="font-size:64px;color:rgba(255,255,255,0.4)"></i>
          </div>`
      }
      <button onclick="closeGalleryLightbox()" style="position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,0.5);border:none;color:#fff;cursor:pointer;font-size:18px;line-height:36px;text-align:center">×</button>
    </div>
    <div style="padding:20px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px">
        <h3 style="margin:0;font-size:18px;font-weight:800;color:#0F1E3D">${p.title}</h3>
        ${cls ? `<span class="badge badge-indigo">${cls.name}</span>` : ''}
      </div>
      ${p.description ? `<p style="color:#6B7A9D;margin:0 0 12px;font-size:14px">${p.description}</p>` : ''}
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:#6B7A9D;margin-bottom:14px">
        <span><i class="fas fa-calendar-alt"></i> ${formatDate(p.date)}</span>
        ${uploader ? `<span><i class="fas fa-user"></i> ${uploader.name}</span>` : ''}
      </div>
      ${taggedStudents.length ? `
        <div style="margin-bottom:12px">
          <div style="font-size:12px;font-weight:600;color:#6B7A9D;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em"><i class="fas fa-user-tag" style="margin-right:4px"></i>Students</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${taggedStudents.map(s => {
              const scls = DB.getClass(s.classId);
              return `<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:#F8F9FB;border-radius:20px;font-size:13px;border:1px solid #DCE1EF">
                ${avatarHtml(s.name,'#0F2050','avatar-xs')}
                <span style="font-weight:600">${s.name}</span>
                ${scls ? `<span style="color:#6B7A9D">${scls.name}</span>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>
      ` : ''}
      ${(p.eventTags && p.eventTags.length) ? `
        <div style="margin-bottom:14px">
          <div style="font-size:12px;font-weight:600;color:#6B7A9D;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em"><i class="fas fa-tag" style="margin-right:4px;color:#C4893A"></i>Events</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${p.eventTags.map(ev => `<span style="padding:5px 14px;background:#FEF8F0;color:#C4893A;border-radius:20px;font-size:13px;font-weight:600;border:1px solid #C4893A33">${ev}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      <div style="border-top:1px solid #DCE1EF;padding-top:16px;margin-top:4px;display:flex;gap:10px;flex-wrap:wrap">
        <button id="gal-lb-publish-btn"
          onclick="toggleGalleryPublish('${p.id}')"
          style="flex:1;padding:10px 18px;border-radius:10px;border:none;cursor:pointer;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s;${p.published ? 'background:#FEF7E0;color:#E8B020' : 'background:linear-gradient(135deg,#0F2050,#1AA6CA);color:#fff'}">
          <i class="fas ${p.published ? 'fa-eye-slash' : 'fa-globe'}"></i>
          ${p.published ? 'Unpublish from Website' : 'Publish to Website'}
        </button>
      </div>
    </div>
  `;
  document.getElementById('gallery-lightbox').style.display = 'flex';
}

function closeGalleryLightbox() {
  const lb = document.getElementById('gallery-lightbox');
  if (lb) lb.style.display = 'none';
}

function checkDbStatus() {
  var badge = document.getElementById('db-status-badge');
  if (!badge) return;
  badge.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:8px;margin-right:5px"></i>Checking...';
  fetch('/api/dbstatus')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.ok) {
        badge.style.background = '#E8F7EC'; badge.style.color = '#1a7a3c'; badge.style.borderColor = '#1a7a3c44';
        badge.innerHTML = '<i class="fas fa-circle" style="font-size:8px;margin-right:5px;color:#1a7a3c"></i>DB Connected (' + d.rows + ' row' + (d.rows!==1?'s':'') + ')';
      } else {
        badge.style.background = '#FEF2F2'; badge.style.color = '#b91c1c'; badge.style.borderColor = '#b91c1c44';
        badge.innerHTML = '<i class="fas fa-circle" style="font-size:8px;margin-right:5px;color:#b91c1c"></i>DB Error: ' + d.message;
      }
    })
    .catch(function() {
      badge.style.background = '#FEF2F2'; badge.style.color = '#b91c1c'; badge.style.borderColor = '#b91c1c44';
      badge.innerHTML = '<i class="fas fa-circle" style="font-size:8px;margin-right:5px;color:#b91c1c"></i>DB Unreachable';
    });
}

function forceSyncGallery() {
  var data = DB.get();
  var published = (data.gallery || []).filter(function(g) { return g.published; });
  if (!published.length) { showToast('No published photos to sync. Mark photos as published first.', 'warning'); return; }
  var btn = event && event.target ? event.target.closest('button') : null;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...'; }
  fetch('/api/gallery/sync', {
    method: 'POST',
    headers: Object.assign({'Content-Type':'application/json'}, typeof skAuthHeader === 'function' ? skAuthHeader() : {}),
    body: JSON.stringify({ items: published })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync to Website'; }
    if (d.ok) {
      showToast(d.count + ' photo' + (d.count!==1?'s':'') + ' synced to website gallery!', 'success');
      checkDbStatus();
    } else {
      showToast('Sync failed: ' + (d.error || 'unknown error'), 'error');
    }
  })
  .catch(function(e) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync to Website'; }
    showToast('Sync failed: ' + e.message, 'error');
  });
}

async function toggleGalleryPublish(photoId) {
  const data = DB.get();
  const item = (data.gallery || []).find(function(g) { return g.id === photoId; });
  if (!item) return;

  const btn = document.getElementById('gal-lb-publish-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Please wait...'; }

  // If publishing a base64 photo, upload it to R2 first
  if (!item.published && item.imageData && item.imageData.startsWith('data:')) {
    try {
      var arr = item.imageData.split(',');
      var mime = arr[0].match(/:(.*?);/)[1];
      var bstr = atob(arr[1]);
      var n = bstr.length;
      var u8arr = new Uint8Array(n);
      while (n--) { u8arr[n] = bstr.charCodeAt(n); }
      var blob = new Blob([u8arr], { type: mime });
      var ext = mime.split('/')[1] || 'jpg';
      var formData = new FormData();
      formData.append('file', blob, 'photo.' + ext);
      var r = await fetch('/api/upload', { method: 'POST', headers: typeof skAuthHeader === 'function' ? skAuthHeader() : {}, body: formData });
      var result = await r.json();
      if (result.ok) {
        item.imageData = result.url;
        item.r2Key = result.key;
      }
    } catch(e) {}
  }

  item.published = !item.published;
  DB.commit();
  syncPublishedGallery();
  closeGalleryLightbox();
  showToast(item.published ? 'Photo published to website!' : 'Photo unpublished.', item.published ? 'success' : 'info');
  navigate('gallery');
}

function openGalleryUpload() {
  _galSelectedFiles = [];
  const modal = document.getElementById('gallery-upload-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.getElementById('gal-title').value = '';
  document.getElementById('gal-desc').value = '';
  document.getElementById('gal-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('gal-class').value = '';
  document.getElementById('gallery-preview-wrap').style.display = 'none';
  document.getElementById('gallery-upload-area').style.display = 'block';
  document.querySelectorAll('.gal-student-cb').forEach(cb => { cb.checked = false; });
  document.querySelectorAll('.gal-event-cb').forEach(cb => { cb.checked = false; });;
  const btn = document.getElementById('gal-upload-btn-text');
  if (btn) btn.textContent = 'Upload Photos';
  // Reset tab state
  _galCurrentTab = 'photo';
  const photoSec = document.getElementById('gal-photo-section');
  const videoSec = document.getElementById('gal-video-section');
  if (photoSec) photoSec.style.display = '';
  if (videoSec) videoSec.style.display = 'none';
  const photoTab = document.getElementById('gal-tab-photo');
  const videoTab = document.getElementById('gal-tab-video');
  if (photoTab) photoTab.style.cssText = 'flex:1;padding:9px;border-radius:8px;border:none;background:#0F2050;color:#fff;font-weight:700;cursor:pointer;font-size:13px';
  if (videoTab) videoTab.style.cssText = 'flex:1;padding:9px;border-radius:8px;border:none;background:transparent;color:#6B7A9D;font-weight:700;cursor:pointer;font-size:13px';
  const ytUrl = document.getElementById('gal-youtube-url');
  if (ytUrl) ytUrl.value = '';
  const ytPreview = document.getElementById('gal-video-preview');
  if (ytPreview) ytPreview.style.display = 'none';
  const pubCb = document.getElementById('gal-publish');
  if (pubCb) pubCb.checked = true;
  updateGalleryStudentList();
}

function closeGalleryModal() {
  const modal = document.getElementById('gallery-upload-modal');
  if (modal) modal.style.display = 'none';
}

function previewGalleryImages(input) {
  const files = [...input.files];
  if (!files.length) return;
  const valid = files.filter(f => f.type.startsWith('image/'));
  if (!valid.length) return;
  let loaded = 0;
  valid.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      _galSelectedFiles.push({ name: file.name, dataUrl: e.target.result });
      loaded++;
      if (loaded === valid.length) renderGalleryPreviews();
    };
    reader.readAsDataURL(file);
  });
}

function renderGalleryPreviews() {
  const wrap = document.getElementById('gallery-preview-wrap');
  const grid = document.getElementById('gallery-preview-grid');
  const countEl = document.getElementById('gallery-preview-count');
  const area = document.getElementById('gallery-upload-area');
  if (!wrap || !grid) return;
  countEl.textContent = `${_galSelectedFiles.length} photo${_galSelectedFiles.length !== 1 ? 's' : ''} selected`;
  grid.innerHTML = _galSelectedFiles.map((f, i) => `
    <div style="position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1;background:#f1f5f9">
      <img src="${f.dataUrl}" style="width:100%;height:100%;object-fit:cover">
      <button onclick="removeGalleryFile(${i})" title="Remove"
        style="position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,0.6);border:none;color:#fff;cursor:pointer;font-size:10px;line-height:18px;text-align:center;padding:0">×</button>
    </div>`).join('');
  wrap.style.display = 'block';
  area.style.display = _galSelectedFiles.length >= 20 ? 'none' : 'block';
  const btn = document.getElementById('gal-upload-btn-text');
  if (btn) btn.textContent = `Upload ${_galSelectedFiles.length} Photo${_galSelectedFiles.length !== 1 ? 's' : ''}`;
}

function removeGalleryFile(index) {
  _galSelectedFiles.splice(index, 1);
  if (_galSelectedFiles.length === 0) clearGalleryFiles();
  else renderGalleryPreviews();
}

function handleGalleryDrop(event) {
  event.preventDefault();
  const files = [...event.dataTransfer.files].filter(f => f.type.startsWith('image/'));
  if (!files.length) { showToast('Please drop image files', 'warning'); return; }
  const input = document.getElementById('gallery-file-input');
  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));
  input.files = dt.files;
  previewGalleryImages(input);
  document.getElementById('gallery-upload-area').style.borderColor = '#c7d2fe';
}

function clearGalleryFiles() {
  _galSelectedFiles = [];
  const wrap = document.getElementById('gallery-preview-wrap');
  const area = document.getElementById('gallery-upload-area');
  if (wrap) wrap.style.display = 'none';
  if (area) area.style.display = 'block';
  const input = document.getElementById('gallery-file-input');
  if (input) input.value = '';
  const btn = document.getElementById('gal-upload-btn-text');
  if (btn) btn.textContent = 'Upload Photos';
}

function tagAllStudents() {
  const cbs = document.querySelectorAll('.gal-student-cb');
  const allChecked = [...cbs].every(cb => cb.checked);
  cbs.forEach(cb => { cb.checked = !allChecked; });
}

function tagAllEvents() {
  const cbs = document.querySelectorAll('.gal-event-cb');
  const allChecked = [...cbs].every(cb => cb.checked);
  cbs.forEach(cb => { cb.checked = !allChecked; });
}

function updateGalleryStudentList() {
  const classId = document.getElementById('gal-class') ? document.getElementById('gal-class').value : '';
  const user = Session.current();
  const myClassId = user.role === 'subadmin' ? user.assignedClass : null;
  const students = DB.getStudents(classId || myClassId || null);
  const list = document.getElementById('gallery-student-list');
  if (!list) return;
  list.innerHTML = students.length ? students.map(s => `
    <label style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#fff;border:1px solid #DCE1EF;border-radius:20px;cursor:pointer;font-size:13px;font-weight:500;user-select:none">
      <input type="checkbox" class="gal-student-cb" value="${s.id}" style="cursor:pointer">
      ${avatarHtml(s.name,'#0F2050','avatar-xs')} ${s.name}
    </label>
  `).join('') : '<span style="font-size:13px;color:#6B7A9D">No students found</span>';
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const bytes = atob(data);
  const ab = new ArrayBuffer(bytes.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < bytes.length; i++) ia[i] = bytes.charCodeAt(i);
  return new Blob([ab], { type: mime });
}

async function saveGalleryItem() {
  const title = document.getElementById('gal-title').value.trim();
  if (!title) { showToast('Please enter a title', 'warning'); return; }

  const publish = document.getElementById('gal-publish') ? document.getElementById('gal-publish').checked : true;

  if (_galCurrentTab === 'video') {
    const url = (document.getElementById('gal-youtube-url').value || '').trim();
    const ytId = extractYoutubeId(url);
    if (!ytId) { showToast('Please enter a valid YouTube URL', 'warning'); return; }
    const classId = document.getElementById('gal-class').value || null;
    const description = document.getElementById('gal-desc').value.trim();
    const date = document.getElementById('gal-date').value || new Date().toISOString().split('T')[0];
    const eventTags = [...document.querySelectorAll('.gal-event-cb:checked')].map(cb => cb.value);
    const user = Session.current();
    DB.addGalleryItem({
      id: DB.genId('gal'), title, description,
      type: 'video', youtubeId: ytId,
      thumbnail: 'https://img.youtube.com/vi/' + ytId + '/hqdefault.jpg',
      imageData: '', date, classId, studentIds: [], eventTags,
      published: publish,
      uploadedBy: user.id, createdAt: new Date().toISOString()
    });
    DB.log(user.id, 'GALLERY_VIDEO', 'Added YouTube video: ' + title);
    if (publish) autoSyncToWebsite();
    closeGalleryModal();
    showToast('Video added to gallery' + (publish ? ' & published to website!' : '!'), 'success');
    navigate('gallery');
    return;
  }

  // Photo upload - upload to R2 first, then save URL
  if (!_galSelectedFiles.length) { showToast('Please select at least one image', 'warning'); return; }
  const classId = document.getElementById('gal-class').value || null;
  const studentIds = [...document.querySelectorAll('.gal-student-cb:checked')].map(function(cb) { return cb.value; });
  const eventTags = [...document.querySelectorAll('.gal-event-cb:checked')].map(function(cb) { return cb.value; });
  const description = document.getElementById('gal-desc').value.trim();
  const date = document.getElementById('gal-date').value || new Date().toISOString().split('T')[0];
  const user = Session.current();
  const btn = document.getElementById('gal-upload-btn-text');
  if (btn) btn.textContent = 'Uploading...';

  // Upload all files to R2
  var uploadPromises = _galSelectedFiles.map(function(file, i) {
    // Convert dataUrl back to blob
    var arr = file.dataUrl.split(',');
    var mime = arr[0].match(/:(.*?);/)[1];
    var bstr = atob(arr[1]);
    var n = bstr.length;
    var u8arr = new Uint8Array(n);
    while(n--) { u8arr[n] = bstr.charCodeAt(n); }
    var blob = new Blob([u8arr], { type: mime });
    var formData = new FormData();
    formData.append('file', blob, file.name || ('photo-' + i + '.jpg'));
    return fetch('/api/upload', { method: 'POST', headers: typeof skAuthHeader === 'function' ? skAuthHeader() : {}, body: formData })
      .then(function(r) { return r.json(); })
      .then(function(result) {
        if (!result.ok) throw new Error(result.error || 'Upload failed');
        return { url: result.url, key: result.key, index: i };
      });
  });

  Promise.all(uploadPromises).then(function(results) {
    results.forEach(function(result, i) {
      DB.addGalleryItem({
        id: DB.genId('gal'),
        title: _galSelectedFiles.length === 1 ? title : title + ' (' + (i + 1) + ')',
        description: description,
        type: 'image',
        imageData: result.url,  // R2 URL instead of base64
        r2Key: result.key,
        date: date,
        classId: classId,
        studentIds: studentIds,
        eventTags: eventTags,
        published: publish,
        uploadedBy: user.id,
        createdAt: new Date(Date.now() + i).toISOString()
      });
    });
    DB.log(user.id, 'GALLERY_UPLOAD', 'Uploaded ' + _galSelectedFiles.length + ' photo(s): ' + title);
    if (publish) autoSyncToWebsite();
    closeGalleryModal();
    showToast(_galSelectedFiles.length + ' photo' + (_galSelectedFiles.length !== 1 ? 's' : '') + ' uploaded' + (publish ? ' & published!' : '!'), 'success');
    navigate('gallery');
  }).catch(function(err) {
    showToast('Upload failed: ' + err.message, 'error');
    if (btn) btn.textContent = 'Upload Photos';
  });
  return; // early return, async continues above
}

function deleteGalleryPhoto(id) {
  confirmDialog('Delete this photo? This cannot be undone.', function() {
    var data = DB.get();
    var item = (data.gallery || []).find(function(g) { return g.id === id; });
    if (item && item.r2Key) {
      fetch('/api/upload', { method: 'DELETE', headers: Object.assign({'Content-Type':'application/json'}, typeof skAuthHeader === 'function' ? skAuthHeader() : {}), body: JSON.stringify({ key: item.r2Key }) }).catch(function(){});
    }
    DB.deleteGalleryItem(id);
    // Sync updated gallery to D1 so deleted item doesn't reappear on public gallery
    var updatedData = DB.get();
    var published = (updatedData.gallery || []).filter(function(i) { return i.published; });
    fetch('/api/gallery/sync', {
      method: 'POST',
      headers: Object.assign({'Content-Type':'application/json'}, typeof skAuthHeader === 'function' ? skAuthHeader() : {}),
      body: JSON.stringify({ items: published })
    }).catch(function(){});
    showToast('Photo deleted', 'success');
    navigate('gallery');
  });
}

function switchGalleryTab(tab) {
  _galCurrentTab = tab;
  const photoTab = document.getElementById('gal-tab-photo');
  const videoTab = document.getElementById('gal-tab-video');
  const photoSec = document.getElementById('gal-photo-section');
  const videoSec = document.getElementById('gal-video-section');
  if (!photoTab || !videoTab) return;
  if (tab === 'photo') {
    photoTab.style.cssText = 'flex:1;padding:9px;border-radius:8px;border:none;background:#0F2050;color:#fff;font-weight:700;cursor:pointer;font-size:13px';
    videoTab.style.cssText = 'flex:1;padding:9px;border-radius:8px;border:none;background:transparent;color:#6B7A9D;font-weight:700;cursor:pointer;font-size:13px';
    photoSec.style.display = '';
    videoSec.style.display = 'none';
  } else {
    videoTab.style.cssText = 'flex:1;padding:9px;border-radius:8px;border:none;background:#0F2050;color:#fff;font-weight:700;cursor:pointer;font-size:13px';
    photoTab.style.cssText = 'flex:1;padding:9px;border-radius:8px;border:none;background:transparent;color:#6B7A9D;font-weight:700;cursor:pointer;font-size:13px';
    photoSec.style.display = 'none';
    videoSec.style.display = '';
  }
}

function extractYoutubeId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function previewYoutubeUrl() {
  const url = document.getElementById('gal-youtube-url').value.trim();
  const ytId = extractYoutubeId(url);
  const preview = document.getElementById('gal-video-preview');
  const thumb = document.getElementById('gal-video-thumb');
  if (ytId && preview && thumb) {
    thumb.src = 'https://img.youtube.com/vi/' + ytId + '/hqdefault.jpg';
    preview.style.display = 'block';
  } else if (preview) {
    preview.style.display = 'none';
  }
}

function autoSyncToWebsite() {
  const data = DB.get();
  const published = (data.gallery || []).filter(function(item) { return item.published; });
  syncPublishedGallery();
  if (!published.length) return;
  fetch('/api/gallery/sync', {
    method: 'POST',
    headers: Object.assign({'Content-Type':'application/json'}, typeof skAuthHeader === 'function' ? skAuthHeader() : {}),
    body: JSON.stringify({ items: published })
  }).catch(function() {});
}

function syncPublishedGallery() {
  const data = DB.get();
  const published = (data.gallery || []).filter(function(item) { return item.published; });
  const exportData = {
    items: published.map(function(item) {
      return {
        id: item.id,
        title: item.title,
        description: item.description || '',
        type: item.type || 'image',
        imageData: item.type === 'video' ? '' : (item.imageData || ''),
        youtubeId: item.youtubeId || '',
        thumbnail: item.thumbnail || '',
        date: item.date
      };
    }),
    publishedAt: new Date().toISOString()
  };
  try { localStorage.setItem('sk_gallery_published', JSON.stringify(exportData)); } catch(e) {}
  return exportData;
}

function publishGalleryToWebsite() {
  const data = DB.get();
  const published = (data.gallery || []).filter(function(item) { return item.published; });
  if (!published.length) {
    showToast('No items are marked for publishing. Check "Publish to Website" when uploading.', 'warning');
    return;
  }
  const exportData = syncPublishedGallery();
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gallery-data.json';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  showToast(published.length + ' item(s) published to website & JSON downloaded!', 'success');
}

// ---- Events ----
const _evTypeStyles = {
  sports:   { bg: '#d1fae5', color: '#065f46', icon: 'fa-running' },
  academic: { bg: '#E8EDF5', color: '#5b21b6', icon: 'fa-book' },
  cultural: { bg: '#fce7f3', color: '#9d174d', icon: 'fa-music' },
  holiday:  { bg: '#fee2e2', color: '#991b1b', icon: 'fa-star' },
  meeting:  { bg: '#FEF7E0', color: '#9A6A00', icon: 'fa-users' },
};

function _buildEventsUI(events, anniversaryEvents) {
  const user = Session.current();
  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.date >= today);
  const past = events.filter(e => e.date < today);
  const upcomingAnniv = anniversaryEvents.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const pastAnniv = anniversaryEvents.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const eventCard = (ev) => {
    const tc = _evTypeStyles[ev.type] || _evTypeStyles.academic;
    const cls = ev.classId ? DB.getClass(ev.classId) : null;
    const creator = DB.getUser(ev.createdBy);
    const canDel = user.role === 'superadmin' || ev.createdBy === user.id;
    return `
    <div style="border:2px solid #DCE1EF;border-radius:14px;padding:18px;background:#fff;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:12px;background:${tc.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas ${tc.icon}" style="color:${tc.color};font-size:18px"></i>
          </div>
          <div>
            <div style="font-size:15px;font-weight:700">${ev.title}</div>
            <div style="font-size:12px;color:#6B7A9D">${cls ? cls.name : 'All School'}</div>
          </div>
        </div>
        ${canDel ? `<button class="btn btn-xs btn-danger" onclick="deleteEventById('${ev.id}')"><i class="fas fa-trash"></i></button>` : ''}
      </div>
      ${ev.description ? `<div style="font-size:13px;color:#6B7A9D">${ev.description}</div>` : ''}
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="background:${tc.bg};color:${tc.color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:capitalize">${ev.type}</span>
        <span style="font-size:13px;color:#2A3B60"><i class="fas fa-calendar" style="color:#1AA6CA;margin-right:4px"></i>${formatDate(ev.date)}</span>
        ${ev.time ? `<span style="font-size:13px;color:#2A3B60"><i class="fas fa-clock" style="color:#10b981;margin-right:4px"></i>${ev.time}</span>` : ''}
        ${creator ? `<span style="font-size:11px;color:#6B7A9D">by ${creator.name}</span>` : ''}
      </div>
    </div>`;
  };

  const anniversaryCard = (ev) => {
    return `
    <div style="border:2px solid #fda4af;border-radius:14px;padding:18px;background:#fff0f3;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:12px;background:#fce7f3;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:22px">&#x1F491;</div>
          <div>
            <div style="font-size:15px;font-weight:700;color:#9d174d">${ev.title}</div>
            <div style="font-size:12px;color:#be185d">${ev._studentName ? 'Student: ' + ev._studentName : 'Parents\' Anniversary'}</div>
          </div>
        </div>
        <span style="background:#fce7f3;color:#9d174d;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap">Anniversary</span>
      </div>
      ${ev.description ? `<div style="font-size:13px;color:#be185d">${ev.description}</div>` : ''}
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:13px;color:#2A3B60"><i class="fas fa-calendar" style="color:#e11d48;margin-right:4px"></i>${formatDate(ev.date)}</span>
      </div>
    </div>`;
  };

  const content = `
    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-calendar-alt" style="color:#1AA6CA"></i> Upcoming Events</div>
        <button class="btn btn-primary" onclick="openAddEventModal()"><i class="fas fa-plus"></i> Add Event</button>
      </div>
      ${(upcoming.length || upcomingAnniv.length) ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">${upcoming.map(eventCard).join('')}${upcomingAnniv.map(anniversaryCard).join('')}</div>`
        : `<div class="empty-state"><i class="fas fa-calendar-alt"></i><h3>No upcoming events</h3><p>Schedule events for students and parents</p></div>`}
    </div>
    ${(past.length || pastAnniv.length) ? `
    <div class="card">
      <div class="card-header">
        <div class="card-title" style="color:#6B7A9D"><i class="fas fa-history"></i> Past Events</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;opacity:0.6">
        ${past.map(eventCard).join('')}${pastAnniv.map(anniversaryCard).join('')}
      </div>
    </div>` : ''}`;

  renderLayout('events', content, 'School Events');
}

function renderEvents() {
  const user = Session.current();
  Seen.mark('evt', user.id);
  const events = DB.getEvents();
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  if (user.role === 'superadmin' || user.role === 'subadmin') {
    fetch('/api/admissions', { headers: typeof skAuthHeader === 'function' ? skAuthHeader() : {} })
      .then(function(r) { return r.json(); })
      .then(function(result) {
        const admissions = result.items || [];
        const anniversaryEvents = [];
        admissions.forEach(function(adm) {
          var fd = {};
          try { fd = adm.data ? (typeof adm.data === 'string' ? JSON.parse(adm.data) : adm.data) : {}; } catch(e) {}
          if (fd.marriageDate) {
            var parts = fd.marriageDate.split('-');
            if (parts.length === 3) {
              var thisYearDate = currentYear + '-' + parts[1] + '-' + parts[2];
              var parentName = fd.fatherName || fd.motherName || 'Parent';
              anniversaryEvents.push({
                id: 'anniv-' + adm.id,
                title: '\u{1F491} ' + parentName + ' Anniversary',
                date: thisYearDate,
                type: '_anniversary',
                description: fd.anniversaryNote || '',
                _synthetic: true,
                _studentName: fd.studentName || ''
              });
            }
          }
        });
        _buildEventsUI(events, anniversaryEvents);
      })
      .catch(function() { _buildEventsUI(events, []); });
  } else {
    _buildEventsUI(events, []);
  }
}

function openAddEventModal() {
  const data = DB.get();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h2 class="modal-title"><i class="fas fa-calendar-plus" style="color:#1AA6CA;margin-right:8px"></i>Add Event</h2><button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Event Title *</label>
          <input class="form-control" id="ev-title" placeholder="e.g., Annual Sports Day"/>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-control" id="ev-desc" rows="2" placeholder="Brief description of the event"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Date *</label>
            <input class="form-control" id="ev-date" type="date"/>
          </div>
          <div class="form-group">
            <label class="form-label">Time</label>
            <input class="form-control" id="ev-time" placeholder="e.g., 9:00 AM"/>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Event Type</label>
            <select class="form-control" id="ev-type">
              <option value="academic">Academic</option>
              <option value="sports">Sports</option>
              <option value="cultural">Cultural</option>
              <option value="meeting">Meeting</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Class (leave blank for All School)</label>
            <select class="form-control" id="ev-class">
              <option value="">All School</option>
              ${data.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEvent()"><i class="fas fa-save"></i> Add Event</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.getElementById('ev-date').value = new Date().toISOString().split('T')[0];
}

function saveEvent() {
  const title = document.getElementById('ev-title').value.trim();
  const date = document.getElementById('ev-date').value;
  if (!title || !date) { showToast('Title and date are required', 'error'); return; }
  const user = Session.current();
  DB.addEvent({
    id: DB.genId('ev'), title,
    description: document.getElementById('ev-desc').value.trim(),
    date, time: document.getElementById('ev-time').value.trim(),
    classId: document.getElementById('ev-class').value || null,
    type: document.getElementById('ev-type').value,
    createdBy: user.id, createdAt: new Date().toISOString()
  });
  DB.log(user.id, 'ADD_EVENT', `Added event: ${title}`);
  document.querySelector('.modal-overlay').remove();
  showToast('Event added!', 'success');
  renderEvents();
}

function deleteEventById(id) {
  confirmDialog('Delete this event?', () => {
    DB.deleteEvent(id);
    DB.log(Session.current().id, 'DELETE_EVENT', 'Deleted event');
    showToast('Event deleted', 'warning');
    renderEvents();
  });
}

// ---- Report Card ----
let rcStudentId = '';
let rcType = 'Final Result';

function renderReportCard() {
  const data = DB.get();
  const user = Session.current();
  const students = data.students || [];
  const classes = data.classes || [];

  const classOptions = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const studentOptions = students.map(s => {
    const cls = classes.find(c => c.id === s.classId);
    return `<option value="${s.id}" ${rcStudentId === s.id ? 'selected' : ''}>${s.name}${cls ? ' – ' + cls.name : ''}</option>`;
  }).join('');

  const tabs = ['Semester 1', 'Semester 2', 'Final Result'];
  const tabHtml = tabs.map(t => `
    <button class="btn ${rcType === t ? 'btn-primary' : ''}" onclick="rcSetType('${t}')"
      style="border-radius:20px;padding:6px 18px;font-size:13px;font-weight:600;margin-right:6px">${t}</button>
  `).join('');

  let tableHtml = '';
  if (rcStudentId) {
    const student = DB.getStudent(rcStudentId);
    const cls = student ? classes.find(c => c.id === student.classId) : null;
    const year = (DB.getMeta().academicYear || getAcademicYear()).split('-')[0];

    if (rcType === 'Final Result') {
      const g1 = DB.getGrades(rcStudentId, 'Semester 1', year);
      const g2 = DB.getGrades(rcStudentId, 'Semester 2', year);
      const allSubj = [...new Set([...g1.map(g => g.subject), ...g2.map(g => g.subject)])];
      const rows = allSubj.map(subj => {
        const s1 = g1.find(g => g.subject === subj);
        const s2 = g2.find(g => g.subject === subj);
        const scores = [s1, s2].filter(Boolean);
        const avg = scores.length ? Math.round(scores.reduce((s, g) => s + g.score / g.maxScore * 100, 0) / scores.length) : 0;
        const grade = DB.calcGrade(avg, 100);
        return `<tr>
          <td>${subj}</td>
          <td style="text-align:center">${s1 ? Math.round(s1.score/s1.maxScore*100)+'%' : '—'}</td>
          <td style="text-align:center">${s2 ? Math.round(s2.score/s2.maxScore*100)+'%' : '—'}</td>
          <td style="text-align:center;font-weight:700">${avg}%</td>
          <td style="text-align:center"><span class="badge" style="background:${avg>=80?'#d1fae5':avg>=60?'#dbeafe':'#ffedd5'};color:${avg>=80?'#065f46':avg>=60?'#1e40af':'#9a3412'}">${grade}</span></td>
        </tr>`;
      }).join('');
      const overallAvg = allSubj.length ? Math.round(allSubj.map(subj => {
        const s1 = g1.find(g => g.subject === subj); const s2 = g2.find(g => g.subject === subj);
        const scores = [s1,s2].filter(Boolean);
        return scores.length ? scores.reduce((s,g) => s + g.score/g.maxScore*100, 0) / scores.length : 0;
      }).reduce((a,b)=>a+b,0)/allSubj.length) : 0;
      const att = DB.getAttendanceSummary(rcStudentId);
      tableHtml = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
          <div class="card" style="padding:16px;text-align:center"><div style="font-size:32px;font-weight:900;color:${overallAvg>=80?'#10b981':overallAvg>=60?'#1AA6CA':'#ef4444'}">${overallAvg}%</div><div style="font-size:12px;color:#888;margin-top:4px">Overall Score</div></div>
          <div class="card" style="padding:16px;text-align:center"><div style="font-size:36px;font-weight:900;color:#0F2050">${DB.calcGrade(overallAvg,100)}</div><div style="font-size:12px;color:#888;margin-top:4px">Final Grade</div></div>
          <div class="card" style="padding:16px;text-align:center"><div style="font-size:28px;font-weight:900;color:${att.pct>=90?'#10b981':'#E8B020'}">${att.pct}%</div><div style="font-size:12px;color:#888;margin-top:4px">Attendance</div></div>
        </div>
        <table class="data-table"><thead><tr><th>Subject</th><th>Semester 1</th><th>Semester 2</th><th>Final %</th><th>Grade</th></tr></thead><tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#888">No grades recorded</td></tr>'}</tbody></table>`;
    } else {
      const grades = DB.getGrades(rcStudentId, rcType, year);
      const rows = grades.map(g => {
        const pct = Math.round(g.score / g.maxScore * 100);
        const grade = DB.calcGrade(pct, 100);
        return `<tr>
          <td>${g.subject}</td>
          <td style="text-align:center">${g.score} / ${g.maxScore}</td>
          <td style="text-align:center;font-weight:700">${pct}%</td>
          <td style="text-align:center"><span class="badge" style="background:${pct>=80?'#d1fae5':pct>=60?'#dbeafe':'#ffedd5'};color:${pct>=80?'#065f46':pct>=60?'#1e40af':'#9a3412'}">${grade}</span></td>
          ${g.remarks ? `<td>${g.remarks}</td>` : '<td style="color:#aaa">—</td>'}
        </tr>`;
      }).join('');
      tableHtml = `<table class="data-table"><thead><tr><th>Subject</th><th>Score</th><th>Percentage</th><th>Grade</th><th>Remarks</th></tr></thead><tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#888">No grades recorded for ' + rcType + '</td></tr>'}</tbody></table>`;
    }
  }

  const content = `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <label class="form-label">Select Student</label>
          <select class="form-control" id="rc-student-sel" onchange="rcSetStudent(this.value)">
            <option value="">-- Select a student --</option>
            ${studentOptions}
          </select>
        </div>
        ${rcStudentId ? `<button class="btn btn-success" onclick="printAdminResult('${rcStudentId}','${rcType}')" style="margin-top:20px"><i class="fas fa-file-pdf"></i> Download PDF</button>` : ''}
      </div>
    </div>
    ${rcStudentId ? `
    <div class="card" style="margin-bottom:16px">
      <div style="margin-bottom:12px">${tabHtml}</div>
      ${tableHtml}
    </div>` : '<div style="text-align:center;color:#888;padding:40px 0;font-size:15px"><i class="fas fa-clipboard-list" style="font-size:40px;display:block;margin-bottom:12px;opacity:0.3"></i>Select a student to view their report card</div>'}`;

  renderLayout('report-card', content, 'Report Card', 'View & download student report cards');
}

function rcSetStudent(id) { rcStudentId = id; renderReportCard(); }
function rcSetType(t) { rcType = t; renderReportCard(); }

function printAdminResult(studentId, type) {
  const student = DB.getStudent(studentId);
  if (!student) return;
  const data = DB.get();
  const cls = DB.getClass(student.classId);
  const teacher = cls ? DB.getClassTeacher(student.classId) : null;
  const meta = DB.getMeta();
  const year = (meta.academicYear || getAcademicYear()).split('-')[0];
  const academicYear = meta.academicYear || getAcademicYear();
  const scoreColor = (p) => p >= 80 ? '#10b981' : p >= 60 ? '#1AA6CA' : '#ef4444';
  const gradeBg = { 'A+':'#d1fae5','A':'#d1fae5','A-':'#d1fae5','B+':'#dbeafe','B':'#dbeafe','B-':'#dbeafe','C+':'#FEF7E0','C':'#FEF7E0','C-':'#FEF7E0','D':'#ffedd5','F':'#fee2e2' };
  const gradeFg = { 'A+':'#065f46','A':'#065f46','A-':'#065f46','B+':'#1e40af','B':'#1e40af','B-':'#1e40af','C+':'#9A6A00','C':'#9A6A00','C-':'#9A6A00','D':'#9a3412','F':'#991b1b' };

  let tableHtml = '';
  let summaryHtml = '';
  let docTitle = type + ' Card';

  if (type === 'Final Result') {
    const g1 = DB.getGrades(studentId, 'Semester 1', year);
    const g2 = DB.getGrades(studentId, 'Semester 2', year);
    const allSubj = [...new Set([...g1.map(g => g.subject), ...g2.map(g => g.subject)])];
    const subjectData = allSubj.map(subj => {
      const s1 = g1.find(g => g.subject === subj); const s2 = g2.find(g => g.subject === subj);
      const scores = [s1,s2].filter(Boolean);
      const avg = scores.length ? Math.round(scores.reduce((s,g) => s + g.score/g.maxScore*100, 0)/scores.length) : 0;
      return { subject: subj, s1Pct: s1 ? Math.round(s1.score/s1.maxScore*100) : null, s2Pct: s2 ? Math.round(s2.score/s2.maxScore*100) : null, avg, grade: DB.calcGrade(avg, 100) };
    });
    const overallAvg = subjectData.length ? Math.round(subjectData.reduce((s,d)=>s+d.avg,0)/subjectData.length) : 0;
    const overallGrade = DB.calcGrade(overallAvg, 100);
    const att = DB.getAttendanceSummary(studentId);
    summaryHtml = `<div class="summary">
      <div class="s-card"><div style="font-size:36px;font-weight:900;color:${scoreColor(overallAvg)}">${overallAvg}%</div><div style="color:#6B7A9D;margin-top:4px">Overall Score</div></div>
      <div class="s-card"><div style="font-size:48px;font-weight:900;color:${gradeFg[overallGrade]||'#2A3B60'}">${overallGrade}</div><div style="color:#6B7A9D;margin-top:4px">Final Grade</div></div>
      <div class="s-card"><div style="font-size:28px;font-weight:900;color:${att.pct>=90?'#10b981':'#E8B020'}">${att.pct}%</div><div style="color:#6B7A9D;margin-top:4px">Attendance</div><div style="font-size:11px;color:#6B7A9D">${att.present}P · ${att.absent}A · ${att.late}L</div></div>
    </div>`;
    tableHtml = `<table><thead><tr><th>Subject</th><th>Semester 1</th><th>Semester 2</th><th>Final %</th><th>Grade</th><th style="width:120px">Performance</th></tr></thead><tbody>
      ${subjectData.map(d=>`<tr><td><strong>${d.subject}</strong></td><td style="text-align:center">${d.s1Pct!==null?d.s1Pct+'%':'—'}</td><td style="text-align:center">${d.s2Pct!==null?d.s2Pct+'%':'—'}</td><td style="text-align:center;font-weight:700;color:${scoreColor(d.avg)}">${d.avg}%</td><td><span class="badge" style="background:${gradeBg[d.grade]||'#f1f5f9'};color:${gradeFg[d.grade]||'#2A3B60'}">${d.grade}</span></td><td><div class="bar-wrap"><div class="bar-fill" style="width:${d.avg}%;background:${scoreColor(d.avg)}"></div></div></td></tr>`).join('')}
      <tr class="tfoot"><td colspan="3"><strong>Overall Average</strong></td><td style="text-align:center;font-weight:900;color:${scoreColor(overallAvg)}">${overallAvg}%</td><td><span class="badge" style="background:${gradeBg[overallGrade]};color:${gradeFg[overallGrade]}">${overallGrade}</span></td><td></td></tr>
    </tbody></table>`;
  } else {
    const grades = DB.getGrades(studentId, type, year);
    const avgPct = grades.length ? Math.round(grades.reduce((s,g) => s + g.score/g.maxScore*100, 0)/grades.length) : 0;
    const overallGrade = DB.calcGrade(avgPct, 100);
    summaryHtml = `<div class="summary">
      <div class="s-card"><div style="font-size:36px;font-weight:900;color:${scoreColor(avgPct)}">${avgPct}%</div><div style="color:#6B7A9D;margin-top:4px">Average Score</div></div>
      <div class="s-card"><div style="font-size:48px;font-weight:900;color:${gradeFg[overallGrade]||'#2A3B60'}">${overallGrade}</div><div style="color:#6B7A9D;margin-top:4px">Overall Grade</div></div>
      <div class="s-card"><div style="font-size:28px;font-weight:900;color:#1AA6CA">${grades.length}</div><div style="color:#6B7A9D;margin-top:4px">Subjects Evaluated</div></div>
    </div>`;
    tableHtml = `<table><thead><tr><th>Subject</th><th>Score</th><th>Percentage</th><th>Grade</th><th>Remarks</th></tr></thead><tbody>
      ${grades.length ? grades.map(g => {
        const pct = Math.round(g.score/g.maxScore*100);
        const gr = DB.calcGrade(pct, 100);
        return `<tr><td><strong>${g.subject}</strong></td><td style="text-align:center">${g.score} / ${g.maxScore}</td><td style="text-align:center;font-weight:700;color:${scoreColor(pct)}">${pct}%</td><td><span class="badge" style="background:${gradeBg[gr]||'#f1f5f9'};color:${gradeFg[gr]||'#2A3B60'}">${gr}</span></td><td style="color:#555">${g.remarks||'—'}</td></tr>`;
      }).join('') : '<tr><td colspan="5" style="text-align:center;color:#888">No grades recorded</td></tr>'}
    </tbody></table>`;
  }

  const dob = student.dob ? (() => { try { return new Date(student.dob).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); } catch(e) { return student.dob; } })() : '—';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${docTitle} – ${student.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;print-color-adjust:exact;-webkit-print-color-adjust:exact}
body{font-family:Arial,sans-serif;color:#0F1E3D;padding:24px;background:#fff}
.header{display:flex;align-items:center;gap:20px;padding:20px 24px;background:linear-gradient(135deg,#0F2050,#1AA6CA);color:#fff;border-radius:10px;margin-bottom:18px}
.logo{width:80px;height:80px;border-radius:50%;border:3px solid rgba(255,255,255,0.35);object-fit:cover;background:#fff;flex-shrink:0}
.school-name{font-size:22px;font-weight:900}
.report-title{font-size:15px;color:#fbbf24;font-weight:700;margin-top:6px;letter-spacing:.5px}
.info-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:14px;background:#F8F9FB;border:1px solid #DCE1EF;border-radius:8px;margin-bottom:16px}
.info-label{font-size:10px;color:#6B7A9D;text-transform:uppercase;letter-spacing:.05em}
.info-value{font-size:13px;font-weight:700;margin-top:3px}
.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px}
.s-card{border:1px solid #DCE1EF;border-radius:8px;padding:14px;text-align:center}
table{width:100%;border-collapse:collapse;border:1px solid #DCE1EF;border-radius:8px;overflow:hidden;margin-bottom:16px}
th{background:#f1f5f9;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6B7A9D;text-align:left;border-bottom:2px solid #DCE1EF}
td{padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
.tfoot td{background:#F8F9FB;font-weight:700;border-top:2px solid #DCE1EF}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700}
.bar-wrap{width:100%;background:#DCE1EF;border-radius:4px;height:7px}
.bar-fill{height:7px;border-radius:4px}
.sigs{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;padding:16px;border:1px solid #DCE1EF;border-radius:8px}
.sig-line{height:52px;border-bottom:1.5px solid #0F1E3D;margin-bottom:6px}
.sig-date{height:52px;border-bottom:1.5px solid #0F1E3D;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;font-weight:700;font-size:13px}
.sig-label{font-size:12px;font-weight:700;text-align:center}
.sig-name{font-size:11px;color:#6B7A9D;text-align:center;margin-top:3px}
.result-footer{text-align:center;font-size:10px;color:#555;padding:6px 0;margin-top:8px;border-top:1px solid #DCE1EF}
@media print{body{padding:2px;font-size:12px}.header{padding:10px 14px!important;margin-bottom:8px!important}.no-print{display:none}}
</style></head><body>
<div class="header">
  <img src="${meta.schoolLogo||'/static/logo.png'}" class="logo" alt="Logo"/>
  <div style="flex:1">
    <div class="school-name">${meta.schoolName||'SuperKids India Preschool'}</div>
    <div style="color:#c7d2fe;font-size:12px;margin-top:4px;display:flex;gap:16px;flex-wrap:wrap">
      ${meta.schoolPhone ? `<span>&#128222; ${meta.schoolPhone}</span>` : '<span>&#128222; 9822-977-644 / 9822-977-944</span>'}
      ${meta.schoolEmail ? `<span>&#9993; ${meta.schoolEmail}</span>` : '<span>&#9993; superkidsprincipal@gmail.com</span>'}
    </div>
    ${meta.schoolAddress ? `<div style="color:#a5b4fc;font-size:11px;margin-top:3px">&#128205; ${meta.schoolAddress}</div>` : ''}
    <div class="report-title">${docTitle.toUpperCase()} – Academic Year ${academicYear}</div>
  </div>
</div>
<div class="info-grid">
  <div><div class="info-label">Student Name</div><div class="info-value">${student.name}</div></div>
  <div><div class="info-label">Roll Number</div><div class="info-value">${student.rollNo||'—'}</div></div>
  <div><div class="info-label">Class</div><div class="info-value">${cls ? cls.name : '—'}</div></div>
  <div><div class="info-label">Date of Birth</div><div class="info-value">${dob}</div></div>
</div>
${summaryHtml}
${tableHtml}
<div class="sigs">
  <div><div class="sig-line"></div><div class="sig-label">Class Teacher</div><div class="sig-name">${teacher ? teacher.name : ''}</div></div>
  <div><div class="sig-line"></div><div class="sig-label">Principal</div><div class="sig-name">${meta.principalName||''}</div></div>
  <div><div class="sig-date">${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div><div class="sig-label">Date of Issue</div></div>
</div>
<div class="result-footer">${meta.schoolName||'SuperKids India Preschool'}${meta.schoolAddress?' | '+meta.schoolAddress:''}${meta.schoolWebsite?' | '+meta.schoolWebsite:' | https://superkidsindia.com'}</div>
<script>window.onload=()=>{window.print();};<\/script>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('Please allow popups to export PDF', 'warning');
}

// ---- Register all admin routes ----
registerRoute('dashboard', renderDashboard);
registerRoute('students', renderStudents);
registerRoute('classes', renderClasses);
registerRoute('attendance', renderAttendance);
registerRoute('grades', renderGrades);
registerRoute('growth', renderGrowth);
registerRoute('activities', renderActivities);
registerRoute('syllabus', renderSyllabus);
registerRoute('leaves', renderLeaves);
registerRoute('announcements', renderAnnouncements);
registerRoute('messages', renderMessages);
registerRoute('gallery', renderGallery);
registerRoute('events', renderEvents);
registerRoute('report-card', renderReportCard);
registerRoute('school-settings', renderSchoolSettings);

// ---- School Settings ----
function renderSchoolSettings() {
  const meta = DB.getMeta();
  const content = `
    <div style="max-width:680px;margin:0 auto">
      <div class="card">
        <div class="card-title" style="margin-bottom:24px"><i class="fas fa-school" style="color:#1AA6CA"></i> School Settings</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:4px">
          <div class="form-group">
            <label class="form-label">School Name <span style="color:#ef4444">*</span></label>
            <input class="form-control" id="ss-name" type="text" value="${meta.schoolName || ''}" placeholder="School Name"/>
          </div>
          <div class="form-group">
            <label class="form-label">Principal Name</label>
            <input class="form-control" id="ss-principal" type="text" value="${meta.principalName || ''}" placeholder="Principal Name"/>
          </div>
          <div class="form-group">
            <label class="form-label">Phone / Contact</label>
            <input class="form-control" id="ss-phone" type="tel" value="${meta.schoolPhone || ''}" placeholder="+91-XXXX-XXXXXX"/>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-control" id="ss-email" type="email" value="${meta.schoolEmail || ''}" placeholder="info@school.edu"/>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">School Address</label>
            <input class="form-control" id="ss-address" type="text" value="${meta.schoolAddress || ''}" placeholder="Street, City, State, PIN"/>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Academic Year <span style="font-size:12px;color:#6B7A9D;font-weight:400">(leave blank to auto-compute)</span></label>
            <input class="form-control" id="ss-year" type="text" value="${meta.academicYear || ''}" placeholder="e.g. 2025-2026"/>
            <div style="font-size:12px;color:#6B7A9D;margin-top:5px"><i class="fas fa-info-circle"></i> Auto-compute: July–Dec = current year start, Jan–June = previous year start. Currently: <strong>${getAcademicYear()}</strong></div>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-top:8px">
          <button class="btn btn-primary" onclick="saveSchoolSettings()"><i class="fas fa-save"></i> Save Settings</button>
          <button class="btn btn-secondary" onclick="navigate('dashboard')">Cancel</button>
        </div>
      </div>
    </div>`;
  renderLayout('school-settings', content, 'School Settings', 'Configure school details');
}

function saveSchoolSettings() {
  const name = document.getElementById('ss-name').value.trim();
  const principal = document.getElementById('ss-principal').value.trim();
  const phone = document.getElementById('ss-phone').value.trim();
  const email = document.getElementById('ss-email').value.trim();
  const address = document.getElementById('ss-address').value.trim();
  const year = document.getElementById('ss-year').value.trim();
  if (!name) { showToast('School name is required', 'error'); return; }
  DB.updateMeta({ schoolName: name, principalName: principal, schoolPhone: phone, schoolEmail: email, schoolAddress: address, academicYear: year });
  showToast('School settings saved successfully!', 'success');
  setTimeout(() => renderSchoolSettings(), 600);
}
