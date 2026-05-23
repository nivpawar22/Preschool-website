// ============================================================
// EduTrack - Parent Portal
// ============================================================

let parentSelectedChild = null;

function getParentChildren() {
  const user = Session.current();
  return DB.getStudentsByParent(user.id);
}

function getSelectedChild() {
  const children = getParentChildren();
  if (!children.length) return null;
  if (parentSelectedChild) {
    const found = children.find(c => c.id === parentSelectedChild);
    if (found) return found;
  }
  parentSelectedChild = children[0].id;
  return children[0];
}

function renderChildSelector(selected) {
  const children = getParentChildren();
  if (children.length <= 1) return '';
  return `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
      ${children.map(c => {
        const cls = DB.getClass(c.classId);
        return `
        <div class="student-card ${selected && selected.id === c.id ? 'border-indigo-500' : ''}"
             style="display:flex;align-items:center;gap:10px;padding:12px 16px;border:2px solid ${selected && selected.id === c.id ? '#1AA6CA' : '#DCE1EF'};cursor:pointer;min-width:180px"
             onclick="parentSelectedChild='${c.id}';navigate(currentParentTab)">
          ${avatarHtml(c.name, '#0F2050')}
          <div>
            <div style="font-weight:600">${c.name}</div>
            <div class="text-muted">${cls ? cls.name : ''}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

let currentParentTab = 'parent-home';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// Academic year: Jul–Dec → "YYYY–YYYY+1", Jan–Jun → "YYYY-1–YYYY"
// ---- Home ----
function renderParentHome() {
  currentParentTab = 'parent-home';
  const user = Session.current();
  const children = getParentChildren();

  if (!children.length) {
    renderLayout('parent-home', `
      <div class="empty-state" style="padding:80px">
        <i class="fas fa-child" style="font-size:64px"></i>
        <h3>No Children Linked</h3>
        <p>Your account has no children linked. Please contact the school administrator.</p>
      </div>`, 'Parent Portal', user.name);
    return;
  }

  const child = getSelectedChild();
  const cls = DB.getClass(child.classId);
  const teacher = cls ? DB.getClassTeacher(child.classId) : null;
  const att = DB.getAttendanceSummary(child.id);
  const grades = DB.getGrades(child.id, 'Semester 1', '2024');
  const avgScore = grades.length ? Math.round(grades.reduce((s, g) => s + (g.score / g.maxScore * 100), 0) / grades.length) : null;
  const growth = DB.getGrowth(child.id);
  const lastGrowth = growth[growth.length - 1];
  const leaves = DB.getLeaves(child.id);
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const anns = DB.getAnnouncements(child.classId, 'parent');
  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = DB.getEvents(child.classId).filter(e => e.date >= today).slice(0, 4);

  const content = `
    ${renderChildSelector(child)}

    <!-- Child header -->
    <div class="card" style="background:linear-gradient(135deg,#0F2050,#1AA6CA);color:#fff;margin-bottom:20px">
      <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
        <span><i class="fas fa-sun" style="margin-right:6px"></i>${getGreeting()}, ${user.name.split(' ')[0]}!</span>
        <span>${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
      </div>
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <div class="avatar avatar-xl" style="background:rgba(255,255,255,0.2);font-size:32px">${initials(child.name)}</div>
        <div style="flex:1">
          <div style="font-size:24px;font-weight:900">${child.name}</div>
          <div style="color:#90C4E0;font-size:15px">${cls ? cls.name : ''} · Roll: ${child.rollNo}</div>
          <div style="color:rgba(255,255,255,0.65);font-size:13px">DOB: ${formatDate(child.dob)} · ${child.gender} · ${child.bloodGroup}</div>
        </div>
        ${teacher ? `
        <div style="text-align:right">
          <div style="font-size:13px;color:#90C4E0">Class Teacher</div>
          <div style="font-weight:700">${teacher.name}</div>
          <button class="btn btn-whatsapp btn-sm" style="margin-top:8px" onclick="wa('${teacher.phone}','Hello ${teacher.name}, I am ${user.name}, parent of ${child.name}. I would like to discuss my child\\'s progress.')">
            <i class="fab fa-whatsapp"></i> WhatsApp Teacher
          </button>
        </div>` : ''}
      </div>
    </div>

    <!-- Quick actions -->
    <div class="quick-actions">
      <div class="quick-btn" onclick="navigate('parent-leaves')">
        <i class="fas fa-calendar-plus" style="color:#E8B020"></i>
        <span>Apply Leave</span>
      </div>
      <div class="quick-btn" onclick="navigate('parent-messages')">
        <i class="fas fa-comment-dots" style="color:#1AA6CA"></i>
        <span>Message Teacher</span>
      </div>
      <div class="quick-btn" onclick="navigate('parent-reports')">
        <i class="fas fa-file-alt" style="color:#10b981"></i>
        <span>View Reports</span>
      </div>
      <div class="quick-btn" onclick="navigate('parent-attendance')">
        <i class="fas fa-calendar-check" style="color:#06b6d4"></i>
        <span>Attendance</span>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid-4" style="margin-bottom:20px">
      <div class="stat-card" onclick="navigate('parent-attendance')" style="cursor:pointer">
        <div style="display:flex;align-items:center;gap:14px">
          ${progressRingHtml(att.pct, '#10b981', 60)}
          <div>
            <div style="font-size:14px;font-weight:700;color:#0F1E3D">Attendance</div>
            <div style="font-size:12px;color:#6B7A9D;margin-top:3px">${att.present}P · ${att.absent}A · ${att.late}L</div>
            <div style="margin-top:6px;font-size:11px;font-weight:600;color:${att.pct >= 90 ? '#10b981' : att.pct >= 75 ? '#E8B020' : '#ef4444'}">
              <i class="fas fa-${att.pct >= 90 ? 'check-circle' : att.pct >= 75 ? 'exclamation-circle' : 'times-circle'}"></i>
              ${att.pct >= 90 ? 'Excellent' : att.pct >= 75 ? 'Average' : 'Needs attention'}
            </div>
          </div>
        </div>
      </div>
      <div class="stat-card" onclick="navigate('parent-reports')" style="cursor:pointer">
        <div style="display:flex;align-items:center;gap:14px">
          ${progressRingHtml(avgScore !== null ? avgScore : 0, '#1AA6CA', 60)}
          <div>
            <div style="font-size:14px;font-weight:700;color:#0F1E3D">Avg. Grade</div>
            <div style="font-size:12px;color:#6B7A9D;margin-top:3px">${grades.length} subject${grades.length !== 1 ? 's' : ''}</div>
            <div style="margin-top:6px;font-size:11px;font-weight:600;color:${avgScore !== null && avgScore >= 80 ? '#10b981' : avgScore !== null && avgScore >= 60 ? '#E8B020' : '#ef4444'}">
              <i class="fas fa-star"></i>
              ${avgScore !== null ? (avgScore >= 80 ? 'Performing well' : avgScore >= 60 ? 'Average' : 'Needs improvement') : 'No data yet'}
            </div>
          </div>
        </div>
      </div>
      <div class="stat-card" onclick="navigate('parent-growth')" style="cursor:pointer">
        <div class="stat-icon" style="background:#d1fae5"><i class="fas fa-chart-line" style="color:#10b981"></i></div>
        <div style="font-size:28px;font-weight:900;color:#10b981">${lastGrowth ? lastGrowth.height + 'cm' : 'N/A'}</div>
        <div class="text-muted">Height</div>
        <div style="font-size:12px;color:#6B7A9D">${lastGrowth ? lastGrowth.weight + 'kg · BMI ' + lastGrowth.bmi : 'No data'}</div>
      </div>
      <div class="stat-card" onclick="navigate('parent-leaves')" style="cursor:pointer">
        <div class="stat-icon" style="background:${pendingLeaves ? '#FEF7E0' : '#f0fdf4'}"><i class="fas fa-calendar-times" style="color:${pendingLeaves ? '#E8B020' : '#10b981'}"></i></div>
        <div style="font-size:28px;font-weight:900;color:${pendingLeaves ? '#E8B020' : '#10b981'}">${pendingLeaves}</div>
        <div class="text-muted">Pending Leaves</div>
        <div style="font-size:12px;color:#6B7A9D">${leaves.length} total applied</div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Recent Grades -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-star" style="color:#1AA6CA"></i> Recent Grades</div>
          <button class="btn btn-sm btn-secondary" onclick="navigate('parent-reports')">View All</button>
        </div>
        ${grades.slice(0, 5).map(g => `
          <div class="flex-between" style="padding:8px 0;border-bottom:1px solid #f1f5f9">
            <div style="font-size:13px;font-weight:600">${g.subject}</div>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:13px;color:#6B7A9D">${g.score}/${g.maxScore}</span>
              <span class="grade-badge ${gradeColor(g.grade)}">${g.grade}</span>
            </div>
          </div>`).join('')}
        ${!grades.length ? '<p class="text-muted">No grades recorded yet</p>' : ''}
      </div>

      <!-- Announcements -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-bullhorn" style="color:#E8B020"></i> Announcements</div>
          <button class="btn btn-sm btn-secondary" onclick="navigate('parent-announcements')">View All</button>
        </div>
        ${anns.slice(0, 3).map(a => `
          <div style="padding:10px 0;border-bottom:1px solid #f1f5f9">
            <div style="font-size:13px;font-weight:600">${a.title}</div>
            <div class="text-muted" style="font-size:12px">${a.body.slice(0, 70)}...</div>
            <div style="font-size:11px;color:#6B7A9D;margin-top:4px">${formatDate(a.date)}</div>
          </div>`).join('')}
        ${!anns.length ? '<p class="text-muted">No announcements</p>' : ''}
      </div>
    </div>

    ${upcomingEvents.length ? `
    <!-- Upcoming Events -->
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-calendar-alt" style="color:#1AA6CA"></i> Upcoming Events</div>
        <button class="btn btn-sm btn-secondary" onclick="navigate('parent-events')">View All</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        ${upcomingEvents.map(ev => {
          const typeColors = { sports:'#10b981', academic:'#1AA6CA', cultural:'#C4893A', holiday:'#ef4444', meeting:'#E8B020' };
          const evCls = ev.classId ? DB.getClass(ev.classId) : null;
          const color = typeColors[ev.type] || '#1AA6CA';
          const d = new Date(ev.date);
          return `<div style="border:2px solid ${color}30;border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="navigate('parent-events')">
            <div style="text-align:center;background:${color}15;border-radius:10px;padding:8px 12px;min-width:52px;flex-shrink:0">
              <div style="font-size:20px;font-weight:900;color:${color};line-height:1">${d.getDate()}</div>
              <div style="font-size:10px;color:#6B7A9D;text-transform:uppercase;font-weight:600">${d.toLocaleDateString('en-US',{month:'short'})}</div>
            </div>
            <div style="flex:1;overflow:hidden">
              <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.title}</div>
              <div style="font-size:11px;color:#6B7A9D">${ev.time || ''} ${evCls ? '· ' + evCls.name : '· All School'}</div>
              <span style="font-size:10px;font-weight:700;color:${color};text-transform:capitalize">${ev.type}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}`;

  renderLayout('parent-home', content, 'Parent Dashboard', user.name);
}

// ---- Reports ----
function renderParentReports() {
  currentParentTab = 'parent-reports';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const terms = ['Semester 1', 'Semester 2', 'Final Result'];
  const termFilter = window._parentTermFilter || 'Semester 1';

  if (termFilter === 'Final Result') { renderParentFinalResult(child); return; }

  const grades = DB.getGrades(child.id, termFilter, '2024');
  const cls = DB.getClass(child.classId);

  // Calculate average
  const avg = grades.length ? Math.round(grades.reduce((s, g) => s + (g.score / g.maxScore * 100), 0) / grades.length) : 0;

  const content = `
    ${renderChildSelector(child)}
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-file-alt" style="color:#1AA6CA"></i> Report Card – ${child.name}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${terms.map(t => `<button class="btn btn-sm ${termFilter===t ? (t==='Final Result'?'btn-warning':'btn-primary') : 'btn-secondary'}" onclick="window._parentTermFilter='${t}';renderParentReports()">${t==='Final Result'?'<i class=\\"fas fa-trophy\\"></i> ':''} ${t}</button>`).join('')}
        </div>
      </div>

      <!-- Summary -->
      <div class="grid-3" style="margin-bottom:24px">
        <div class="stat-card">
          <div class="stat-icon" style="background:#E8EDF5"><i class="fas fa-percentage" style="color:#1AA6CA"></i></div>
          <div style="font-size:28px;font-weight:900;color:#1AA6CA">${avg}%</div>
          <div class="text-muted">Overall Average</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#d1fae5"><i class="fas fa-book" style="color:#10b981"></i></div>
          <div style="font-size:28px;font-weight:900;color:#10b981">${grades.length}</div>
          <div class="text-muted">Subjects Graded</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#FEF7E0"><i class="fas fa-school" style="color:#E8B020"></i></div>
          <div style="font-size:24px;font-weight:900;color:#E8B020">${cls ? cls.name : '-'}</div>
          <div class="text-muted">Class</div>
        </div>
      </div>

      <!-- Grades table -->
      ${grades.length ? `
      <div class="table-wrap" style="margin-bottom:24px">
        <table>
          <thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Teacher Comment</th></tr></thead>
          <tbody>
            ${grades.map(g => `<tr>
              <td><strong>${g.subject}</strong></td>
              <td style="width:200px">${scoreBarHtml(g.score, g.maxScore)}</td>
              <td><span class="grade-badge ${gradeColor(g.grade)}">${g.grade}</span></td>
              <td style="color:#6B7A9D;font-size:13px">${g.teacherComment || '-'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Radar Chart -->
      <div style="max-width:400px;margin:0 auto">
        <canvas id="report-radar" height="300"></canvas>
      </div>` : `<div class="empty-state"><i class="fas fa-star"></i><h3>No grades for ${termFilter}</h3></div>`}
    </div>`;

  renderLayout('parent-reports', content, 'Report Cards', child.name);

  if (grades.length) {
    setTimeout(() => {
      const ctx = document.getElementById('report-radar');
      if (!ctx) return;
      new Chart(ctx, {
        type: 'radar',
        data: {
          labels: grades.map(g => g.subject),
          datasets: [{ label: 'Score %', data: grades.map(g => Math.round(g.score/g.maxScore*100)), backgroundColor: 'rgba(26,166,202,0.2)', borderColor: '#1AA6CA', pointBackgroundColor: '#1AA6CA' }]
        },
        options: { responsive: true, scales: { r: { min: 0, max: 100 } } }
      });
    }, 100);
  }
}

// ---- Attendance ----
function renderParentAttendance() {
  currentParentTab = 'parent-attendance';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const att = DB.getAttendanceSummary(child.id);
  const records = DB.getAttendance(child.id).sort((a, b) => b.date.localeCompare(a.date));

  const content = `
    ${renderChildSelector(child)}
    <div class="grid-4" style="margin-bottom:20px">
      <div class="stat-card">
        <div class="stat-icon" style="background:#d1fae5"><i class="fas fa-check-circle" style="color:#10b981"></i></div>
        <div style="font-size:28px;font-weight:900;color:#10b981">${att.present}</div>
        <div class="text-muted">Days Present</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fee2e2"><i class="fas fa-times-circle" style="color:#ef4444"></i></div>
        <div style="font-size:28px;font-weight:900;color:#ef4444">${att.absent}</div>
        <div class="text-muted">Days Absent</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#FEF7E0"><i class="fas fa-clock" style="color:#E8B020"></i></div>
        <div style="font-size:28px;font-weight:900;color:#E8B020">${att.late}</div>
        <div class="text-muted">Days Late</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#E8EDF5"><i class="fas fa-percentage" style="color:#1AA6CA"></i></div>
        <div style="font-size:28px;font-weight:900;color:#1AA6CA">${att.pct}%</div>
        <div class="text-muted">Attendance Rate</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title" style="margin-bottom:16px"><i class="fas fa-calendar" style="color:#1AA6CA"></i> Attendance Records</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Status</th><th>Day</th></tr></thead>
          <tbody>
            ${records.map(r => {
              const d = new Date(r.date);
              const dayName = d.toLocaleDateString('en-US', {weekday: 'long'});
              const statusColors = { present: 'badge-green', absent: 'badge-red', late: 'badge-yellow' };
              return `<tr>
                <td>${formatDate(r.date)}</td>
                <td><span class="badge ${statusColors[r.status]}">${r.status.toUpperCase()}</span></td>
                <td>${dayName}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  renderLayout('parent-attendance', content, 'Attendance', child.name);
}

// ---- Growth ----
function renderParentGrowth() {
  currentParentTab = 'parent-growth';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const records = DB.getGrowth(child.id);
  const last = records[records.length - 1];

  const content = `
    ${renderChildSelector(child)}
    ${last ? `
    <div class="grid-3" style="margin-bottom:20px">
      <div class="stat-card">
        <div class="stat-icon" style="background:#d1fae5"><i class="fas fa-ruler-vertical" style="color:#10b981"></i></div>
        <div style="font-size:28px;font-weight:900;color:#10b981">${last.height} cm</div>
        <div class="text-muted">Current Height</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#E8EDF5"><i class="fas fa-weight" style="color:#1AA6CA"></i></div>
        <div style="font-size:28px;font-weight:900;color:#1AA6CA">${last.weight} kg</div>
        <div class="text-muted">Current Weight</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#FEF7E0"><i class="fas fa-heartbeat" style="color:#E8B020"></i></div>
        <div style="font-size:28px;font-weight:900;color:${last.bmi < 18.5 ? '#E8B020' : last.bmi < 25 ? '#10b981' : '#ef4444'}">${last.bmi}</div>
        <div class="text-muted">BMI – ${last.bmi < 18.5 ? 'Underweight' : last.bmi < 25 ? 'Normal' : 'Overweight'}</div>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title" style="margin-bottom:20px"><i class="fas fa-chart-line" style="color:#10b981"></i> Growth Chart</div>
      ${records.length >= 2 ? `<div style="height:250px;margin-bottom:20px"><canvas id="growth-chart-p"></canvas></div>` : ''}
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Height</th><th>Weight</th><th>BMI</th><th>Status</th></tr></thead>
          <tbody>
            ${records.length ? records.map(r => {
              const bmiStatus = r.bmi < 18.5 ? 'Underweight' : r.bmi < 25 ? 'Normal' : 'Overweight';
              const bmiColor = r.bmi < 18.5 ? '#E8B020' : r.bmi < 25 ? '#10b981' : '#ef4444';
              return `<tr>
                <td>${formatDate(r.date)}</td>
                <td><strong>${r.height} cm</strong></td>
                <td><strong>${r.weight} kg</strong></td>
                <td style="color:${bmiColor};font-weight:700">${r.bmi}</td>
                <td><span class="badge" style="background:${bmiColor}20;color:${bmiColor}">${bmiStatus}</span></td>
              </tr>`;
            }).join('') : `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-chart-line"></i><h3>No growth records</h3></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;

  renderLayout('parent-growth', content, 'Growth Tracker', child.name);

  if (records.length >= 2) {
    setTimeout(() => {
      const ctx = document.getElementById('growth-chart-p');
      if (!ctx) return;
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
}

// ---- Activities ----
function renderParentActivities() {
  currentParentTab = 'parent-activities';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }
  const data = DB.get();
  const childActivities = data.activities.filter(a => a.studentIds.includes(child.id));
  const allActivities = data.activities.filter(a => !a.classId || a.classId === child.classId);

  const content = `
    ${renderChildSelector(child)}
    <div class="card">
      <div class="card-title" style="margin-bottom:16px"><i class="fas fa-running" style="color:#C4893A"></i> ${child.name}'s Activities</div>
      ${childActivities.length ? `
        <div class="grid-2">
          ${childActivities.map(a => `
            <div style="padding:16px;border:2px solid #E8EDF5;border-radius:14px">
              <div style="font-size:16px;font-weight:700;color:#1AA6CA;margin-bottom:6px">${a.name}</div>
              <div class="text-muted"><i class="fas fa-calendar-day"></i> ${a.day}</div>
              <div class="text-muted"><i class="fas fa-clock"></i> ${a.time}</div>
              <div class="text-muted"><i class="fas fa-user"></i> ${a.instructor}</div>
            </div>`).join('')}
        </div>` : `<div class="empty-state"><i class="fas fa-running"></i><h3>Not enrolled in any activities</h3></div>`}
    </div>

    <div class="card">
      <div class="card-title" style="margin-bottom:16px">All Available Activities</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Activity</th><th>Day</th><th>Time</th><th>Instructor</th><th>Enrolled</th></tr></thead>
          <tbody>
            ${allActivities.map(a => `<tr>
              <td><strong>${a.name}</strong></td>
              <td>${a.day}</td>
              <td>${a.time}</td>
              <td>${a.instructor}</td>
              <td>${a.studentIds.includes(child.id) ? '<span class="badge badge-green">Yes</span>' : '<span class="badge badge-gray">No</span>'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  renderLayout('parent-activities', content, 'Activities', child.name);
}

// ---- Syllabus ----
function renderParentSyllabus() {
  currentParentTab = 'parent-syllabus';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const [termFilter, setTermFilter] = [window._parentSylTerm || 'Term 1', (v) => { window._parentSylTerm = v; }];
  const syllabi = DB.getSyllabus(child.classId, termFilter);
  const cls = DB.getClass(child.classId);

  const content = `
    ${renderChildSelector(child)}
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-book-open" style="color:#C4893A"></i> Syllabus – ${cls ? cls.name : ''}</div>
        <div style="display:flex;gap:6px">
          ${['Term 1','Term 2','Term 3'].map(t => `<button class="btn btn-sm ${termFilter===t?'btn-primary':'btn-secondary'}" onclick="window._parentSylTerm='${t}';renderParentSyllabus()">${t}</button>`).join('')}
        </div>
      </div>

      ${syllabi.length ? syllabi.map(syl => {
        const done = syl.topics.filter(t => t.status === 'completed').length;
        const total = syl.topics.length;
        return `
        <div style="margin-bottom:24px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div style="font-size:18px;font-weight:800">${syl.subject}</div>
            <span class="badge badge-blue">${done}/${total} topics done</span>
          </div>
          <div class="progress-bar" style="margin-bottom:14px">
            <div class="progress-fill" style="width:${total?Math.round(done/total*100):0}%"></div>
          </div>
          ${syl.topics.map(t => {
            const statusColors = { completed: '#10b981', in_progress: '#E8B020', pending: '#6B7A9D' };
            const statusLabels = { completed: 'Completed', in_progress: 'In Progress', pending: 'Upcoming' };
            return `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:10px;border:1px solid #DCE1EF;margin-bottom:8px">
              <div style="width:32px;height:32px;border-radius:50%;background:${statusColors[t.status]}20;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="fas ${t.status==='completed'?'fa-check':t.status==='in_progress'?'fa-spinner':'fa-clock'}" style="color:${statusColors[t.status]}"></i>
              </div>
              <div style="flex:1">
                <div style="font-weight:600">${t.title}</div>
                <div class="text-muted">${t.description} · Weeks ${t.weeks}</div>
              </div>
              <span style="font-size:12px;font-weight:600;color:${statusColors[t.status]}">${statusLabels[t.status]}</span>
            </div>`;
          }).join('')}
          <hr class="divider"/>
        </div>`;
      }).join('') : `<div class="empty-state"><i class="fas fa-book-open"></i><h3>No syllabus for ${termFilter}</h3></div>`}
    </div>`;

  renderLayout('parent-syllabus', content, 'Syllabus', child.name);
}

// ---- Leave Application ----
function renderParentLeaves() {
  currentParentTab = 'parent-leaves';
  const user = Session.current();
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const leaves = DB.getLeaves(child.id, user.id);

  const content = `
    ${renderChildSelector(child)}
    <div class="grid-2">
      <!-- Apply Leave Form -->
      <div class="card">
        <div class="card-title" style="margin-bottom:16px"><i class="fas fa-plus-circle" style="color:#1AA6CA"></i> Apply for Leave</div>
        <div class="form-group">
          <label class="form-label">Student</label>
          <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#F8F9FB;border-radius:10px">
            ${avatarHtml(child.name, '#0F2050')}
            <strong>${child.name}</strong>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">From Date *</label>
            <input class="form-control" id="leave-from" type="date" min="${new Date().toISOString().split('T')[0]}"/>
          </div>
          <div class="form-group">
            <label class="form-label">To Date *</label>
            <input class="form-control" id="leave-to" type="date" min="${new Date().toISOString().split('T')[0]}"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Reason *</label>
          <textarea class="form-control" id="leave-reason" rows="4" placeholder="Please describe the reason for leave (medical, family event, etc.)..."></textarea>
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="applyLeave('${child.id}')">
          <i class="fas fa-paper-plane"></i> Submit Leave Application
        </button>
      </div>

      <!-- Leave History -->
      <div class="card">
        <div class="card-title" style="margin-bottom:16px"><i class="fas fa-history" style="color:#6B7A9D"></i> Leave History</div>
        ${leaves.length ? leaves.map(l => {
          const colors = { pending: 'yellow', approved: 'green', rejected: 'red' };
          const icons = { pending: 'fa-clock', approved: 'fa-check-circle', rejected: 'fa-times-circle' };
          return `
          <div class="leave-card ${l.status}" style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div style="font-weight:700;margin-bottom:4px">
                  <i class="fas ${icons[l.status]}" style="color:${l.status==='approved'?'#10b981':l.status==='pending'?'#E8B020':'#ef4444'}"></i>
                  ${formatDate(l.fromDate)} – ${formatDate(l.toDate)}
                </div>
                <div style="font-size:13px;color:#2A3B60">${l.reason}</div>
                ${l.reviewNote ? `<div style="font-size:12px;color:#6B7A9D;margin-top:4px;padding:8px;background:#F8F9FB;border-radius:6px">💬 ${l.reviewNote}</div>` : ''}
                <div style="font-size:11px;color:#6B7A9D;margin-top:4px">Applied: ${formatDate(l.appliedOn)}</div>
              </div>
              <span class="badge badge-${colors[l.status]}">${l.status.toUpperCase()}</span>
            </div>
          </div>`;
        }).join('') : '<div class="empty-state" style="padding:30px"><i class="fas fa-calendar-times"></i><h3>No leaves applied</h3></div>'}
      </div>
    </div>`;

  renderLayout('parent-leaves', content, 'Apply Leave', child.name);
}

function applyLeave(childId) {
  const user = Session.current();
  const fromDate = document.getElementById('leave-from').value;
  const toDate = document.getElementById('leave-to').value;
  const reason = document.getElementById('leave-reason').value.trim();

  if (!fromDate || !toDate || !reason) { showToast('Please fill all required fields', 'error'); return; }
  if (fromDate > toDate) { showToast('From date cannot be after to date', 'error'); return; }

  const data = DB.get();
  data.leaves.push({
    id: DB.genId('l'), studentId: childId, parentId: user.id,
    fromDate, toDate, reason, status: 'pending',
    appliedOn: new Date().toISOString().split('T')[0],
    reviewedBy: null, reviewNote: ''
  });
  DB.commit();
  showToast('Leave application submitted!', 'success');
  renderParentLeaves();
}

// ---- Announcements ----
function renderParentAnnouncements() {
  currentParentTab = 'parent-announcements';
  const child = getSelectedChild();
  const anns = DB.getAnnouncements(child ? child.classId : null, 'parent');

  const content = `
    ${child ? renderChildSelector(child) : ''}
    <div class="card">
      <div class="card-title" style="margin-bottom:16px"><i class="fas fa-bullhorn" style="color:#E8B020"></i> School Announcements</div>
      ${anns.map(a => {
        const poster = DB.getUser(a.postedBy);
        const cls = a.classId ? DB.getClass(a.classId) : null;
        return `
        <div style="padding:16px;border:1px solid #DCE1EF;border-radius:12px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
            <div style="font-size:16px;font-weight:700">${a.title}</div>
            ${cls ? `<span class="badge badge-blue">${cls.name}</span>` : '<span class="badge badge-purple">All School</span>'}
          </div>
          <p style="color:#2A3B60;font-size:14px;margin:0 0 10px;line-height:1.6">${a.body}</p>
          <div style="font-size:12px;color:#6B7A9D">
            <i class="fas fa-user"></i> ${poster ? poster.name : 'School'}
            &nbsp;·&nbsp; <i class="fas fa-calendar"></i> ${formatDate(a.date)}
          </div>
        </div>`;
      }).join('')}
      ${!anns.length ? '<div class="empty-state"><i class="fas fa-bullhorn"></i><h3>No announcements</h3></div>' : ''}
    </div>`;

  renderLayout('parent-announcements', content, 'Announcements');
}

// ---- Messages (Parent → Teacher) ----
let parentMsgTeacherId = null;

function renderParentMessages() {
  currentParentTab = 'parent-messages';
  const user = Session.current();
  const children = getParentChildren();
  const data = DB.get();

  // Get all teachers of my children's classes
  const teachers = [];
  children.forEach(child => {
    const teacher = child.classId ? DB.getClassTeacher(child.classId) : null;
    if (teacher && !teachers.find(t => t.id === teacher.id)) teachers.push(teacher);
  });

  const myMsgs = data.messages.filter(m => m.from === user.id || m.to === user.id);

  const content = `
    <div class="grid-2" style="height:600px">
      <!-- Teacher list -->
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:16px;border-bottom:1px solid #DCE1EF;font-weight:700">Your Teachers</div>
        <div style="overflow-y:auto;height:calc(100% - 56px)">
          ${teachers.map(t => {
            const tMsgs = myMsgs.filter(m => m.from === t.id || m.to === t.id);
            const lastMsg = tMsgs[tMsgs.length - 1];
            const tClass = t.assignedClass ? DB.getClass(t.assignedClass) : null;
            return `
            <div class="flex gap-3" style="padding:14px 16px;cursor:pointer;border-bottom:1px solid #f1f5f9;align-items:center;${parentMsgTeacherId===t.id?'background:#E8EDF5':''}" onclick="parentMsgTeacherId='${t.id}';renderParentMessages()">
              ${avatarHtml(t.name, t.avatar)}
              <div style="flex:1;overflow:hidden">
                <div style="font-weight:600;font-size:14px">${t.name}</div>
                <div class="text-muted" style="font-size:12px">${tClass ? tClass.name : 'Teacher'}</div>
                <div class="text-muted" style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  ${lastMsg ? lastMsg.text.slice(0,40)+'...' : 'Start a conversation'}
                </div>
              </div>
              <button class="btn btn-whatsapp btn-xs" onclick="event.stopPropagation();wa('${t.phone}','Hello ${t.name}, I am ${user.name}, parent of my child. I wanted to discuss their progress.')">
                <i class="fab fa-whatsapp"></i>
              </button>
            </div>`;
          }).join('')}
          ${!teachers.length ? '<div class="empty-state" style="padding:30px"><i class="fas fa-chalkboard-teacher"></i><h3>No teachers found</h3><p>Your children\'s class teachers will appear here</p></div>' : ''}
        </div>
      </div>

      <!-- Chat window -->
      <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column" id="parent-chat-window">
        ${parentMsgTeacherId ? renderParentChatWindow(parentMsgTeacherId) : `
        <div class="flex-center" style="height:100%;flex-direction:column;color:#6B7A9D">
          <i class="fas fa-comment-dots" style="font-size:48px;margin-bottom:16px;opacity:0.4"></i>
          <p>Select a teacher to start chatting</p>
        </div>`}
      </div>
    </div>`;

  renderLayout('parent-messages', content, 'Messages', 'Chat with Teachers');
}

function renderParentChatWindow(teacherId) {
  const user = Session.current();
  const data = DB.get();
  const teacher = DB.getUser(teacherId);
  const msgs = data.messages.filter(m =>
    (m.from === user.id && m.to === teacherId) ||
    (m.from === teacherId && m.to === user.id)
  ).sort((a, b) => a.time.localeCompare(b.time));

  return `
    <div style="padding:16px;border-bottom:1px solid #DCE1EF;display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:10px">
        ${teacher ? avatarHtml(teacher.name, teacher.avatar) : ''}
        <div>
          <div style="font-weight:700">${teacher ? teacher.name : ''}</div>
          <div class="text-muted" style="font-size:12px">Class Teacher</div>
        </div>
      </div>
      ${teacher ? `<button class="btn btn-whatsapp btn-sm" onclick="wa('${teacher.phone}','Hello ${teacher.name}, I am ${user.name}. I wanted to reach out regarding my child.')">
        <i class="fab fa-whatsapp"></i> WhatsApp
      </button>` : ''}
    </div>
    <div id="parent-chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column">
      ${msgs.map(m => `
        <div class="msg-bubble ${m.from === user.id ? 'msg-sent' : 'msg-recv'}">
          ${m.text}
          <div style="font-size:10px;opacity:0.7;margin-top:4px;text-align:right">${formatDateTime(m.time)}</div>
        </div>`).join('')}
      ${!msgs.length ? '<div class="text-muted" style="text-align:center;margin:auto">Start the conversation with ${teacher ? teacher.name : "the teacher"}</div>' : ''}
    </div>
    <div style="padding:14px;border-top:1px solid #DCE1EF;display:flex;gap:10px">
      <input class="form-control" id="parent-msg-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter')parentSendMessage('${teacherId}')"/>
      <button class="btn btn-primary" onclick="parentSendMessage('${teacherId}')"><i class="fas fa-paper-plane"></i></button>
    </div>`;
}

function parentSendMessage(toId) {
  const input = document.getElementById('parent-msg-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;
  const data = DB.get();
  const child = getSelectedChild();
  data.messages.push({
    id: DB.genId('m'), from: Session.current().id, to: toId,
    studentId: child ? child.id : null,
    text, time: new Date().toISOString().replace('T', ' ').slice(0, 16),
    read: false, type: 'inapp'
  });
  DB.commit();
  input.value = '';
  const chatWin = document.getElementById('parent-chat-window');
  if (chatWin) chatWin.innerHTML = renderParentChatWindow(toId);
  const msgArea = document.getElementById('parent-chat-messages');
  if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;
}

// ---- Gallery ----
let _parentGalleryPhotos = [];

function renderParentGallery() {
  currentParentTab = 'parent-gallery';
  const child = getSelectedChild();
  if (!child) {
    renderLayout('parent-gallery', '<div class="empty-state" style="padding:80px"><i class="fas fa-images" style="font-size:64px;color:#c7d2fe"></i><h3>No Children Linked</h3></div>', 'Gallery');
    return;
  }

  const content = `
    ${renderChildSelector(child)}
    <div style="margin-bottom:20px">
      <h3 style="font-size:16px;font-weight:700;color:#0F1E3D;margin:0 0 4px">Activity Gallery</h3>
      <p id="parent-gal-count" style="color:#6B7A9D;font-size:13px;margin:0">Loading…</p>
    </div>
    <div id="parent-gallery-body">
      <div style="display:flex;align-items:center;justify-content:center;height:200px;color:#94a3b8">
        <i class="fas fa-spinner fa-spin" style="font-size:28px"></i>
      </div>
    </div>
    <div class="modal-overlay" id="parent-gallery-lightbox" style="display:none" onclick="if(event.target===this)closeParentGalleryLightbox()">
      <div id="parent-gallery-lightbox-content" style="background:#fff;border-radius:16px;max-width:720px;width:95%;overflow:hidden"></div>
    </div>
  `;

  renderLayout('parent-gallery', content, 'Gallery', child.name);

  fetch('/api/gallery')
    .then(r => r.json())
    .then(({ items = [] }) => {
      _parentGalleryPhotos = items;
      // Show all school photos (R2 direct uploads have no studentIds/classId)
      const tagged = items.filter(p =>
        (p.studentIds || []).includes(child.id) || p.classId === child.classId
      );
      const photos = tagged.length > 0 ? tagged : items;
      const countEl = document.getElementById('parent-gal-count');
      if (countEl) countEl.textContent = `${photos.length} photo${photos.length !== 1 ? 's' : ''} in gallery`;
      const bodyEl = document.getElementById('parent-gallery-body');
      if (!bodyEl) return;
      bodyEl.innerHTML = photos.length === 0
        ? `<div class="empty-state" style="padding:80px">
            <i class="fas fa-images" style="font-size:64px;color:#c7d2fe"></i>
            <h3 style="margin:16px 0 8px">No Photos Yet</h3>
            <p>Activity photos will appear here when uploaded by the school</p>
          </div>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px">
            ${photos.map(p => renderParentGalleryCard(p, child)).join('')}
          </div>`;
    })
    .catch(() => {
      const bodyEl = document.getElementById('parent-gallery-body');
      if (bodyEl) bodyEl.innerHTML = '<div class="empty-state" style="padding:60px"><p style="color:#ef4444">Failed to load gallery. Please refresh.</p></div>';
    });
}

function renderParentGalleryCard(p, child) {
  const cls = p.classId ? DB.getClass(p.classId) : null;
  const isTagged = (p.studentIds || []).includes(child.id);
  const bgColors = ['#0F2050','#1AA6CA','#10b981','#E8B020','#ef4444','#1AA6CA'];
  const bg = bgColors[Math.abs((p.id.charCodeAt(3) || 0)) % bgColors.length];

  return `
    <div class="card" style="padding:0;overflow:hidden;border-radius:14px;cursor:pointer;transition:box-shadow 0.2s"
         onclick="openParentGalleryLightbox('${p.id}')"
         onmouseenter="this.style.boxShadow='0 8px 30px rgba(26,166,202,0.18)'"
         onmouseleave="this.style.boxShadow=''">
      <div style="position:relative;height:175px;overflow:hidden;background:#f1f5f9">
        ${p.imageData ?
          `<img src="${p.imageData}" style="width:100%;height:100%;object-fit:cover" alt="${p.title}">` :
          `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,${bg},${bg}cc)">
            <i class="fas fa-image" style="font-size:40px;color:rgba(255,255,255,0.5)"></i>
          </div>`
        }
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 55%,rgba(0,0,0,0.35));pointer-events:none"></div>
        ${isTagged ? `<span style="position:absolute;top:10px;left:10px;background:#1AA6CA;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:10px"><i class="fas fa-star"></i> Featured</span>` : ''}
        ${p.imageData ? `
          <a href="${p.imageData}" download="${p.title.replace(/[^a-z0-9]/gi,'_')}.jpg"
             onclick="event.stopPropagation()"
             title="Download"
             style="position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.5);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;text-decoration:none">
            <i class="fas fa-download"></i>
          </a>` : ''}
      </div>
      <div style="padding:12px">
        <div style="font-weight:700;font-size:13px;color:#0F1E3D;margin-bottom:4px">${p.title}</div>
        <div style="font-size:12px;color:#6B7A9D"><i class="fas fa-calendar-alt" style="margin-right:4px"></i>${formatDate(p.date)}</div>
        ${cls ? `<div style="font-size:11px;color:#6B7A9D;margin-top:4px">${cls.name}</div>` : ''}
      </div>
    </div>
  `;
}

function openParentGalleryLightbox(photoId) {
  const p = _parentGalleryPhotos.find(g => g.id === photoId);
  if (!p) return;
  const child = getSelectedChild();
  const cls = p.classId ? DB.getClass(p.classId) : null;
  const taggedStudents = (p.studentIds || []).map(sid => DB.getStudent(sid)).filter(Boolean);
  const uploader = DB.getUser(p.uploadedBy);

  document.getElementById('parent-gallery-lightbox-content').innerHTML = `
    <div style="position:relative">
      ${p.imageData ?
        `<img src="${p.imageData}" style="width:100%;max-height:420px;object-fit:cover;display:block" alt="${p.title}">` :
        `<div style="height:260px;background:linear-gradient(135deg,#0F2050,#1AA6CA);display:flex;align-items:center;justify-content:center">
          <i class="fas fa-image" style="font-size:64px;color:rgba(255,255,255,0.4)"></i>
        </div>`
      }
      <button onclick="closeParentGalleryLightbox()" style="position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,0.5);border:none;color:#fff;cursor:pointer;font-size:18px;line-height:36px;text-align:center">×</button>
      ${p.imageData ? `
        <a href="${p.imageData}" download="${p.title.replace(/[^a-z0-9]/gi,'_')}.jpg"
           style="position:absolute;top:12px;left:12px;display:flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(0,0,0,0.5);color:#fff;border-radius:20px;font-size:12px;font-weight:600;text-decoration:none;backdrop-filter:blur(4px)"
           onclick="event.stopPropagation()">
          <i class="fas fa-download"></i> Download
        </a>` : ''}
    </div>
    <div style="padding:20px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <h3 style="margin:0;font-size:17px;font-weight:800;color:#0F1E3D;flex:1">${p.title}</h3>
        ${cls ? `<span class="badge badge-indigo">${cls.name}</span>` : ''}
      </div>
      ${p.description ? `<p style="color:#6B7A9D;margin:0 0 12px;font-size:14px">${p.description}</p>` : ''}
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:#6B7A9D;margin-bottom:${taggedStudents.length?'14px':'0'}">
        <span><i class="fas fa-calendar-alt"></i> ${formatDate(p.date)}</span>
        ${uploader ? `<span><i class="fas fa-chalkboard-teacher"></i> ${uploader.name}</span>` : ''}
      </div>
      ${taggedStudents.length ? `
        <div style="background:#f8faff;border-radius:10px;padding:14px">
          <div style="font-size:12px;font-weight:600;color:#6B7A9D;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em">Students in this photo</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${taggedStudents.map(s => {
              const isThisChild = s.id === (child||{}).id;
              return '<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:' + (isThisChild?'#E8EDF5':'#fff') + ';border:1px solid ' + (isThisChild?'#1AA6CA':'#DCE1EF') + ';border-radius:20px;font-size:13px">'
                + avatarHtml(s.name,'#0F2050','avatar-xs')
                + '<span style="font-weight:600;color:' + (isThisChild?'#0F2050':'#0F1E3D') + '">' + s.name + '</span>'
                + (isThisChild ? '<i class="fas fa-star" style="font-size:10px;color:#E8B020"></i>' : '')
                + '</div>';
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
  document.getElementById('parent-gallery-lightbox').style.display = 'flex';
}

function closeParentGalleryLightbox() {
  const lb = document.getElementById('parent-gallery-lightbox');
  if (lb) lb.style.display = 'none';
}

// ---- Final Result ----
function renderParentFinalResult(child) {
  const data = DB.get();
  const cls = DB.getClass(child.classId);
  const teacher = cls ? DB.getClassTeacher(child.classId) : null;
  const gradesS1 = DB.getGrades(child.id, 'Semester 1', '2024');
  const gradesS2 = DB.getGrades(child.id, 'Semester 2', '2024');
  const allSubjects = [...new Set([...gradesS1.map(g => g.subject), ...gradesS2.map(g => g.subject)])];
  const subjectData = allSubjects.map(subj => {
    const s1 = gradesS1.find(g => g.subject === subj);
    const s2 = gradesS2.find(g => g.subject === subj);
    const scores = [s1, s2].filter(Boolean);
    const avgPct = scores.length ? Math.round(scores.reduce((sum, g) => sum + (g.score / g.maxScore * 100), 0) / scores.length) : 0;
    return { subject: subj, s1Pct: s1 ? Math.round(s1.score/s1.maxScore*100) : null, s2Pct: s2 ? Math.round(s2.score/s2.maxScore*100) : null, avgPct, grade: DB.calcGrade(avgPct, 100) };
  });
  const overallAvg = subjectData.length ? Math.round(subjectData.reduce((s, d) => s + d.avgPct, 0) / subjectData.length) : 0;
  const overallGrade = DB.calcGrade(overallAvg, 100);
  const att = DB.getAttendanceSummary(child.id);
  const growth = DB.getGrowth(child.id);
  const lastGrowth = growth[growth.length - 1];
  const schoolMeta = DB.getMeta();
  const terms = ['Semester 1', 'Semester 2', 'Final Result'];

  const content = `
    ${renderChildSelector(child)}

    <!-- Tab bar -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
      ${terms.map(t => `<button class="btn btn-sm ${t==='Final Result'?'btn-warning':'btn-secondary'}" onclick="window._parentTermFilter='${t}';renderParentReports()">${t==='Final Result'?'<i class=\\"fas fa-trophy\\"></i> ':''} ${t}</button>`).join('')}
    </div>

    <!-- Controls -->
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px">
      <div class="card-title" style="font-size:18px"><i class="fas fa-trophy" style="color:#E8B020"></i> Final Result Card – ${child.name}</div>
      <button class="btn btn-primary" onclick="printFinalResult('${child.id}')">
        <i class="fas fa-file-pdf"></i> Export / Print PDF
      </button>
    </div>

    <!-- School header -->
    <div class="card" style="background:linear-gradient(135deg,#0F2050,#1AA6CA);color:#fff;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <img src="${schoolMeta.schoolLogo || '/static/school-logo.png'}" style="width:80px;height:80px;border-radius:50%;border:3px solid rgba(255,255,255,0.3);background:#fff;object-fit:cover;flex-shrink:0"/>
        <div style="flex:1">
          <div style="font-size:22px;font-weight:900">${schoolMeta.schoolName}</div>
          <div style="color:#c7d2fe;font-size:12px;margin-top:2px;display:flex;flex-wrap:wrap;gap:12px">
            ${schoolMeta.schoolPhone ? `<span><i class="fas fa-phone" style="margin-right:4px"></i>${schoolMeta.schoolPhone}</span>` : ''}
            ${schoolMeta.schoolEmail ? `<span><i class="fas fa-envelope" style="margin-right:4px"></i>${schoolMeta.schoolEmail}</span>` : ''}
          </div>
          ${schoolMeta.schoolAddress ? `<div style="color:#a5b4fc;font-size:11px;margin-top:3px"><i class="fas fa-map-marker-alt" style="margin-right:4px"></i>${schoolMeta.schoolAddress}</div>` : ''}
          <div style="font-size:15px;font-weight:700;margin-top:8px;color:#fbbf24;letter-spacing:0.5px">FINAL RESULT CARD – Academic Year ${schoolMeta.academicYear || getAcademicYear()}</div>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.2);margin-top:16px;padding-top:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">
        <div><div style="font-size:10px;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.05em">Student</div><div style="font-weight:700">${child.name}</div></div>
        <div><div style="font-size:10px;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.05em">Roll No.</div><div style="font-weight:700">${child.rollNo}</div></div>
        <div><div style="font-size:10px;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.05em">Class</div><div style="font-weight:700">${cls ? cls.name : '-'}</div></div>
        <div><div style="font-size:10px;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.05em">Date of Birth</div><div style="font-weight:700">${formatDate(child.dob)}</div></div>
      </div>
    </div>

    <!-- Overall performance -->
    <div class="grid-3" style="margin-bottom:16px">
      <div class="stat-card" style="display:flex;align-items:center;gap:14px">
        ${progressRingHtml(overallAvg, overallAvg >= 80 ? '#10b981' : overallAvg >= 60 ? '#E8B020' : '#ef4444', 68)}
        <div>
          <div style="font-size:13px;font-weight:700">Overall Score</div>
          <div style="font-size:12px;color:#6B7A9D;margin-top:3px">${subjectData.length} subjects</div>
          <div style="font-size:11px;font-weight:600;color:${overallAvg >= 80 ? '#10b981' : overallAvg >= 60 ? '#E8B020' : '#ef4444'};margin-top:4px">
            ${overallAvg >= 90 ? 'Outstanding' : overallAvg >= 80 ? 'Excellent' : overallAvg >= 70 ? 'Good' : overallAvg >= 60 ? 'Average' : 'Needs Improvement'}
          </div>
        </div>
      </div>
      <div class="stat-card" style="text-align:center">
        <div style="font-size:52px;font-weight:900;color:${overallAvg >= 80 ? '#10b981' : overallAvg >= 60 ? '#E8B020' : '#ef4444'};line-height:1">${overallGrade}</div>
        <div style="font-size:13px;color:#6B7A9D;margin-top:6px">Final Grade</div>
      </div>
      <div class="stat-card" style="display:flex;flex-direction:column;gap:10px;justify-content:center">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:#6B7A9D"><i class="fas fa-calendar-check" style="color:#10b981;margin-right:6px"></i>Attendance</span>
          <span style="font-weight:700;color:${att.pct >= 90 ? '#10b981' : '#E8B020'}">${att.pct}%</span>
        </div>
        ${lastGrowth ? `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:#6B7A9D"><i class="fas fa-ruler-vertical" style="color:#1AA6CA;margin-right:6px"></i>Height</span>
          <span style="font-weight:700">${lastGrowth.height}cm</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:#6B7A9D"><i class="fas fa-weight" style="color:#E8B020;margin-right:6px"></i>Weight</span>
          <span style="font-weight:700">${lastGrowth.weight}kg</span>
        </div>` : ''}
      </div>
    </div>

    <!-- Subject table -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:16px"><i class="fas fa-table" style="color:#1AA6CA"></i> Subject-wise Performance</div>
      ${subjectData.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Subject</th><th style="text-align:center">Semester 1</th><th style="text-align:center">Semester 2</th><th style="text-align:center">Final %</th><th>Grade</th><th>Bar</th></tr></thead>
          <tbody>
            ${subjectData.map(d => `<tr>
              <td><strong>${d.subject}</strong></td>
              <td style="text-align:center">${d.s1Pct !== null ? d.s1Pct + '%' : '<span class="text-muted">—</span>'}</td>
              <td style="text-align:center">${d.s2Pct !== null ? d.s2Pct + '%' : '<span class="text-muted">—</span>'}</td>
              <td style="text-align:center;font-weight:700;color:${d.avgPct >= 80 ? '#10b981' : d.avgPct >= 60 ? '#1AA6CA' : '#ef4444'}">${d.avgPct}%</td>
              <td><span class="grade-badge ${gradeColor(d.grade)}">${d.grade}</span></td>
              <td style="min-width:120px">${scoreBarHtml(d.avgPct, 100)}</td>
            </tr>`).join('')}
            <tr style="background:#F8F9FB">
              <td colspan="3"><strong>Overall Average</strong></td>
              <td style="text-align:center;font-weight:900;color:${overallAvg >= 80 ? '#10b981' : '#E8B020'}">${overallAvg}%</td>
              <td><span class="grade-badge ${gradeColor(overallGrade)}">${overallGrade}</span></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>` : `<div class="empty-state"><i class="fas fa-star"></i><h3>No grades recorded yet</h3></div>`}
    </div>

    <!-- Chart -->
    ${subjectData.length >= 2 ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:16px"><i class="fas fa-chart-bar" style="color:#1AA6CA"></i> Semester Comparison Chart</div>
      <div style="height:260px"><canvas id="final-result-chart"></canvas></div>
    </div>` : ''}

    <!-- Signatures -->
    <div class="card">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:40px;padding:8px 0">
        <div style="text-align:center">
          <div style="height:56px;border-bottom:2px solid #0F1E3D;margin-bottom:8px"></div>
          <div style="font-size:13px;font-weight:700">Class Teacher</div>
          <div style="font-size:12px;color:#6B7A9D">${teacher ? teacher.name : ''}</div>
        </div>
        <div style="text-align:center">
          <div style="height:56px;border-bottom:2px solid #0F1E3D;margin-bottom:8px"></div>
          <div style="font-size:13px;font-weight:700">Principal</div>
          <div style="font-size:12px;color:#6B7A9D">${schoolMeta.principalName || ''}</div>
        </div>
        <div style="text-align:center">
          <div style="height:56px;border-bottom:2px solid #0F1E3D;margin-bottom:8px;display:flex;align-items:flex-end;justify-content:center">
            <div style="font-size:14px;font-weight:700;padding-bottom:8px">${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
          </div>
          <div style="font-size:13px;font-weight:700">Date of Issue</div>
        </div>
      </div>
    </div>`;

  renderLayout('parent-reports', content, 'Final Result', child.name);

  if (subjectData.length >= 2) {
    setTimeout(() => {
      const ctx = document.getElementById('final-result-chart');
      if (!ctx) return;
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: subjectData.map(d => d.subject),
          datasets: [
            { label: 'Semester 1', data: subjectData.map(d => d.s1Pct), backgroundColor: 'rgba(26,166,202,0.65)', borderColor: '#1AA6CA', borderWidth: 1 },
            { label: 'Semester 2', data: subjectData.map(d => d.s2Pct), backgroundColor: 'rgba(16,185,129,0.65)', borderColor: '#10b981', borderWidth: 1 },
            { label: 'Final Avg', data: subjectData.map(d => d.avgPct), backgroundColor: 'rgba(245,158,11,0.5)', borderColor: '#E8B020', borderWidth: 2, type: 'line', tension: 0.3 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { min: 0, max: 100, title: { display: true, text: 'Score (%)' } } },
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }, 100);
  }
}

function printFinalResult(childId) {
  const child = DB.getStudent(childId);
  if (!child) return;
  const data = DB.get();
  const cls = DB.getClass(child.classId);
  const teacher = cls ? DB.getClassTeacher(child.classId) : null;
  const gradesS1 = DB.getGrades(child.id, 'Semester 1', '2024');
  const gradesS2 = DB.getGrades(child.id, 'Semester 2', '2024');
  const allSubjects = [...new Set([...gradesS1.map(g => g.subject), ...gradesS2.map(g => g.subject)])];
  const subjectData = allSubjects.map(subj => {
    const s1 = gradesS1.find(g => g.subject === subj);
    const s2 = gradesS2.find(g => g.subject === subj);
    const scores = [s1, s2].filter(Boolean);
    const avgPct = scores.length ? Math.round(scores.reduce((sum, g) => sum + (g.score / g.maxScore * 100), 0) / scores.length) : 0;
    return { subject: subj, s1Pct: s1 ? Math.round(s1.score/s1.maxScore*100) : null, s2Pct: s2 ? Math.round(s2.score/s2.maxScore*100) : null, avgPct, grade: DB.calcGrade(avgPct, 100) };
  });
  const overallAvg = subjectData.length ? Math.round(subjectData.reduce((s, d) => s + d.avgPct, 0) / subjectData.length) : 0;
  const overallGrade = DB.calcGrade(overallAvg, 100);
  const att = DB.getAttendanceSummary(child.id);
  const schoolMeta = DB.getMeta();
  const academicYear = schoolMeta.academicYear || getAcademicYear();

  const gradeBg ={ 'A+':'#d1fae5','A':'#d1fae5','A-':'#d1fae5','B+':'#dbeafe','B':'#dbeafe','B-':'#dbeafe','C+':'#FEF7E0','C':'#FEF7E0','C-':'#FEF7E0','D':'#ffedd5','F':'#fee2e2' };
  const gradeFg = { 'A+':'#065f46','A':'#065f46','A-':'#065f46','B+':'#1e40af','B':'#1e40af','B-':'#1e40af','C+':'#9A6A00','C':'#9A6A00','C-':'#9A6A00','D':'#9a3412','F':'#991b1b' };
  const scoreColor = (pct) => pct >= 80 ? '#10b981' : pct >= 60 ? '#1AA6CA' : '#ef4444';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>Final Result – ${child.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
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
@media print{body{padding:0}@page{margin:1cm}}
</style></head><body>
<div class="header">
  <img src="${schoolMeta.schoolLogo || '/static/school-logo.png'}" class="logo" alt="Logo"/>
  <div style="flex:1">
    <div class="school-name">${schoolMeta.schoolName}</div>
    <div style="color:#c7d2fe;font-size:12px;margin-top:4px;display:flex;gap:16px;flex-wrap:wrap">
      ${schoolMeta.schoolPhone ? `<span>&#128222; ${schoolMeta.schoolPhone}</span>` : ''}
      ${schoolMeta.schoolEmail ? `<span>&#9993; ${schoolMeta.schoolEmail}</span>` : ''}
    </div>
    ${schoolMeta.schoolAddress ? `<div style="color:#a5b4fc;font-size:11px;margin-top:3px">&#128205; ${schoolMeta.schoolAddress}</div>` : ''}
    <div class="report-title">FINAL RESULT CARD – Academic Year ${academicYear}</div>
  </div>
</div>
<div class="info-grid">
  <div><div class="info-label">Student Name</div><div class="info-value">${child.name}</div></div>
  <div><div class="info-label">Roll Number</div><div class="info-value">${child.rollNo}</div></div>
  <div><div class="info-label">Class</div><div class="info-value">${cls ? cls.name : '-'}</div></div>
  <div><div class="info-label">Date of Birth</div><div class="info-value">${new Date(child.dob).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div></div>
</div>
<div class="summary">
  <div class="s-card"><div style="font-size:36px;font-weight:900;color:${scoreColor(overallAvg)}">${overallAvg}%</div><div style="color:#6B7A9D;margin-top:4px">Overall Score</div><div style="font-size:11px;color:#6B7A9D">${subjectData.length} subjects</div></div>
  <div class="s-card"><div style="font-size:48px;font-weight:900;color:${gradeFg[overallGrade]||'#2A3B60'}">${overallGrade}</div><div style="color:#6B7A9D;margin-top:4px">Final Grade</div><div style="font-size:11px;color:#6B7A9D">${overallAvg>=90?'Outstanding':overallAvg>=80?'Excellent':overallAvg>=70?'Good':overallAvg>=60?'Average':'Needs Improvement'}</div></div>
  <div class="s-card"><div style="font-size:28px;font-weight:900;color:${att.pct>=90?'#10b981':'#E8B020'}">${att.pct}%</div><div style="color:#6B7A9D;margin-top:4px">Attendance Rate</div><div style="font-size:11px;color:#6B7A9D">${att.present}P · ${att.absent}A · ${att.late}L</div></div>
</div>
<table>
  <thead><tr><th>Subject</th><th>Semester 1</th><th>Semester 2</th><th>Final %</th><th>Grade</th><th style="width:130px">Performance</th></tr></thead>
  <tbody>
    ${subjectData.map(d => `<tr>
      <td><strong>${d.subject}</strong></td>
      <td style="text-align:center">${d.s1Pct!==null?d.s1Pct+'%':'—'}</td>
      <td style="text-align:center">${d.s2Pct!==null?d.s2Pct+'%':'—'}</td>
      <td style="text-align:center;font-weight:700;color:${scoreColor(d.avgPct)}">${d.avgPct}%</td>
      <td><span class="badge" style="background:${gradeBg[d.grade]||'#f1f5f9'};color:${gradeFg[d.grade]||'#2A3B60'}">${d.grade}</span></td>
      <td><div class="bar-wrap"><div class="bar-fill" style="width:${d.avgPct}%;background:${scoreColor(d.avgPct)}"></div></div></td>
    </tr>`).join('')}
    <tr class="tfoot"><td colspan="3"><strong>Overall Average</strong></td><td style="text-align:center;font-weight:900;color:${scoreColor(overallAvg)}">${overallAvg}%</td><td><span class="badge" style="background:${gradeBg[overallGrade]};color:${gradeFg[overallGrade]}">${overallGrade}</span></td><td></td></tr>
  </tbody>
</table>
<!--CHART_PLACEHOLDER-->
<div class="sigs">
  <div><div class="sig-line"></div><div class="sig-label">Class Teacher</div><div class="sig-name">${teacher ? teacher.name : ''}</div></div>
  <div><div class="sig-line"></div><div class="sig-label">Principal</div><div class="sig-name">${schoolMeta.principalName || ''}</div></div>
  <div><div class="sig-date">${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div><div class="sig-label">Date of Issue</div></div>
</div>
<script>window.onload=()=>{window.print();};<\/script>
</body></html>`;

  // Capture chart image from live canvas if available
  const chartCanvas = document.getElementById('final-result-chart');
  const chartImg = chartCanvas ? chartCanvas.toDataURL('image/png') : null;
  const chartSection = chartImg
    ? `<div style="margin-bottom:16px;border:1px solid #DCE1EF;border-radius:8px;padding:16px">
         <div style="font-size:13px;font-weight:700;color:#0F1E3D;margin-bottom:12px;text-transform:uppercase;letter-spacing:.04em">Semester Comparison Chart</div>
         <img src="${chartImg}" style="width:100%;border-radius:6px"/>
       </div>`
    : '';
  const finalHtml = html.replace('<!--CHART_PLACEHOLDER-->', chartSection);

  const win = window.open('', '_blank');
  if (win) { win.document.write(finalHtml); win.document.close(); }
  else showToast('Please allow popups to export PDF', 'warning');
}

// ---- Parent Events ----
function renderParentEvents() {
  currentParentTab = 'parent-events';
  const child = getSelectedChild();
  const classId = child ? child.classId : null;
  const events = DB.getEvents(classId);
  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.date >= today);
  const past = events.filter(e => e.date < today);

  const typeColors = { sports:'#10b981', academic:'#1AA6CA', cultural:'#C4893A', holiday:'#ef4444', meeting:'#E8B020' };
  const typeIcons = { sports:'fa-running', academic:'fa-book', cultural:'fa-music', holiday:'fa-star', meeting:'fa-users' };

  const evCard = (ev) => {
    const color = typeColors[ev.type] || '#1AA6CA';
    const icon = typeIcons[ev.type] || 'fa-calendar';
    const evCls = ev.classId ? DB.getClass(ev.classId) : null;
    const d = new Date(ev.date);
    return `
    <div style="border:2px solid ${color}30;border-radius:14px;padding:18px;background:#fff;display:flex;gap:14px">
      <div style="text-align:center;background:${color}15;border-radius:12px;padding:12px 14px;min-width:56px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:22px;font-weight:900;color:${color};line-height:1">${d.getDate()}</div>
        <div style="font-size:10px;color:#6B7A9D;text-transform:uppercase;font-weight:600">${d.toLocaleDateString('en-US',{month:'short'})}</div>
        <i class="fas ${icon}" style="color:${color};font-size:14px;margin-top:4px"></i>
      </div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:700;margin-bottom:4px">${ev.title}</div>
        ${ev.description ? `<div style="font-size:13px;color:#6B7A9D;margin-bottom:8px">${ev.description}</div>` : ''}
        <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:#2A3B60">
          ${ev.time ? `<span><i class="fas fa-clock" style="color:#10b981;margin-right:4px"></i>${ev.time}</span>` : ''}
          <span><i class="fas fa-map-marker-alt" style="color:#1AA6CA;margin-right:4px"></i>${evCls ? evCls.name : 'All School'}</span>
          <span style="background:${color}20;color:${color};padding:2px 8px;border-radius:10px;font-weight:700;text-transform:capitalize">${ev.type}</span>
        </div>
      </div>
    </div>`;
  };

  const content = `
    ${child ? renderChildSelector(child) : ''}
    ${upcoming.length ? `
    <div class="card" style="margin-bottom:20px">
      <div class="card-title" style="margin-bottom:16px"><i class="fas fa-calendar-alt" style="color:#1AA6CA"></i> Upcoming Events</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
        ${upcoming.map(evCard).join('')}
      </div>
    </div>` : `<div class="empty-state" style="padding:60px"><i class="fas fa-calendar-alt" style="font-size:48px;color:#c7d2fe"></i><h3>No upcoming events</h3><p>Events scheduled by your school will appear here</p></div>`}
    ${past.length ? `
    <div class="card">
      <div class="card-title" style="margin-bottom:16px;color:#6B7A9D"><i class="fas fa-history"></i> Past Events</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;opacity:0.6">
        ${past.map(evCard).join('')}
      </div>
    </div>` : ''}`;

  renderLayout('parent-events', content, 'School Events');
}

// ---- Register parent routes ----
registerRoute('parent-home', renderParentHome);
registerRoute('parent-reports', renderParentReports);
registerRoute('parent-attendance', renderParentAttendance);
registerRoute('parent-growth', renderParentGrowth);
registerRoute('parent-activities', renderParentActivities);
registerRoute('parent-syllabus', renderParentSyllabus);
registerRoute('parent-leaves', renderParentLeaves);
registerRoute('parent-announcements', renderParentAnnouncements);
registerRoute('parent-events', renderParentEvents);
registerRoute('parent-messages', renderParentMessages);
registerRoute('parent-gallery', renderParentGallery);
