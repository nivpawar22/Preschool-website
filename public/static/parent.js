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
  const lastGrowth = growth.length ? growth[growth.length - 1] : null;
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

  const [termFilter, setTermFilter] = [window._parentSylTerm || 'Semester 1', (v) => { window._parentSylTerm = v; }];
  const syllabi = DB.getSyllabus(child.classId, termFilter);
  const cls = DB.getClass(child.classId);

  const content = `
    ${renderChildSelector(child)}
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i class="fas fa-book-open" style="color:#C4893A"></i> Syllabus – ${cls ? cls.name : ''}</div>
        <div style="display:flex;gap:6px">
          ${['Semester 1','Semester 2'].map(t => `<button class="btn btn-sm ${termFilter===t?'btn-primary':'btn-secondary'}" onclick="window._parentSylTerm='${t}';renderParentSyllabus()">${t}</button>`).join('')}
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

  const child = DB.getStudent(childId);
  if (!child || child.parentId !== user.id) { showToast('Unauthorized', 'error'); return; }

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
  const user = Session.current();
  Seen.mark('ann', user.id);
  const child = getSelectedChild();
  const anns = DB.getAnnouncements(child ? child.classId : null, 'parent');

  const content = `
    ${child ? renderChildSelector(child) : ''}
    <div class="card">
      <div class="card-title" style="margin-bottom:14px"><i class="fas fa-bullhorn" style="color:#E8B020"></i> School Announcements</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:4px">
      ${anns.map(a => {
        const poster = DB.getUser(a.postedBy);
        const cls = a.classId ? DB.getClass(a.classId) : null;
        return `
        <div onclick="expandParentAnnouncement('${a.id}')" style="border:1.5px solid #DCE1EF;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 2px 8px rgba(15,32,80,0.07);cursor:pointer;position:relative;transition:box-shadow 0.15s,transform 0.15s" onmouseover="this.style.boxShadow='0 6px 20px rgba(196,137,58,0.13)';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(15,32,80,0.07)';this.style.transform='translateY(0)'">
          ${a.imageUrl
            ? `<img src="/r2/${a.imageUrl}" style="width:100%;height:auto;display:block">`
            : `<div style="height:5px;background:linear-gradient(90deg,#0F2050,#E8B020,#C4893A)"></div>`}
          <div style="padding:12px 14px 14px">
            <div style="font-size:14px;font-weight:700;color:#0F1E3D;margin-bottom:5px;line-height:1.3">${a.title}</div>
            <div style="font-size:12px;color:#4A5B80;line-height:1.55;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${a.body}</div>
            <div style="font-size:11px;color:#6B7A9D;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px;border-top:1px solid #f1f5f9;padding-top:8px">
              ${cls ? `<span class="badge badge-blue" style="font-size:10px">${cls.name}</span>` : '<span class="badge badge-purple" style="font-size:10px">All School</span>'}
              <span><i class="fas fa-calendar" style="margin-right:3px"></i>${formatDate(a.date)}</span>
            </div>
          </div>
        </div>`;
      }).join('')}
      </div>
      ${!anns.length ? '<div class="empty-state"><i class="fas fa-bullhorn"></i><h3>No announcements</h3></div>' : ''}
    </div>`;

  renderLayout('parent-announcements', content, 'Announcements');
}

function expandParentAnnouncement(id) {
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
        ${a.imageUrl ? `<div style="width:100%;background:#f0f4ff;border-bottom:2px solid #DCE1EF"><img src="/r2/${a.imageUrl}" style="width:100%;height:auto;display:block"></div>` : ''}
        <div style="padding:18px">
          <p style="color:#2A3B60;font-size:14px;line-height:1.8;white-space:pre-wrap;margin:0 0 16px">${a.body}</p>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:#6B7A9D;border-top:1px solid #f1f5f9;padding-top:10px">
            ${cls ? `<span class="badge badge-blue">${cls.name}</span>` : '<span class="badge badge-purple">All School</span>'}
            <span><i class="fas fa-user" style="margin-right:3px"></i>${poster ? poster.name : 'School'}</span>
            <span><i class="fas fa-calendar" style="margin-right:3px"></i>${formatDate(a.date)}</span>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ---- Messages (Parent → Teacher) ----
let parentMsgTeacherId = null;

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
  const user = Session.current();
  Seen.mark('gal', user.id);
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
      // Only show photos explicitly tagged to this child — never leak other students' photos
      const photos = items.filter(p => (p.studentIds || []).includes(child.id));
      // Store only the authorized subset so lightbox can't access untagged photos
      _parentGalleryPhotos = photos;
      const countEl = document.getElementById('parent-gal-count');
      if (countEl) countEl.textContent = `${photos.length} photo${photos.length !== 1 ? 's' : ''} shared for ${child.name}`;
      const bodyEl = document.getElementById('parent-gallery-body');
      if (!bodyEl) return;
      bodyEl.innerHTML = photos.length === 0
        ? `<div class="empty-state" style="padding:80px">
            <i class="fas fa-images" style="font-size:64px;color:#c7d2fe"></i>
            <h3 style="margin:16px 0 8px">No Photos Shared Yet</h3>
            <p style="color:#6B7A9D;max-width:320px;margin:0 auto">Photos tagged to ${child.name} by the school will appear here.</p>
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
        ${(p.r2Key || p.imageData) ? `
          <a href="/api/download?key=${encodeURIComponent(p.r2Key || (p.imageData || '').replace(/^\/r2\//, ''))}"
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
      ${(p.r2Key || p.imageData) ? `
        <a href="/api/download?key=${encodeURIComponent(p.r2Key || (p.imageData || '').replace(/^\/r2\//, ''))}"
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
  const lastGrowth = growth.length ? growth[growth.length - 1] : null;
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
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
body{font-family:Arial,sans-serif;color:#0F1E3D;padding:20px;background:#fff}
/* ── Letterhead Header ── */
.lh-wrap{border:2.5px solid #0F2050;border-radius:10px;overflow:hidden;margin-bottom:18px}
.lh-top{display:flex;align-items:center;gap:20px;padding:18px 26px;background:#0F2050}
.lh-logo{width:76px;height:76px;border-radius:50%;border:3px solid #E8B020;object-fit:cover;background:#fff;flex-shrink:0}
.lh-center{flex:1;text-align:center}
.lh-school-name{font-size:23px;font-weight:900;color:#fff;letter-spacing:-.3px;line-height:1.15}
.lh-school-tag{font-size:10px;color:#E8B020;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin-top:5px}
.lh-seal{width:70px;height:70px;border-radius:50%;border:2px dashed rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:rgba(255,255,255,.35);font-size:8px;font-weight:700;text-align:center;line-height:1.5;letter-spacing:.06em;text-transform:uppercase}
.lh-contact-strip{background:#122a59;padding:7px 26px;display:flex;align-items:center;flex-wrap:wrap;gap:0;font-size:11px;color:#c7d2fe;border-top:1px solid rgba(255,255,255,.12)}
.lh-contact-strip .ci{padding:2px 14px;border-right:1px solid rgba(255,255,255,.2)}
.lh-contact-strip .ci:first-child{padding-left:0}
.lh-contact-strip .ci:last-child{border-right:none}
.lh-addr-strip{background:#0f2050;padding:6px 26px;font-size:11px;color:#a5b4fc;border-top:1px solid rgba(255,255,255,.1)}
.lh-gold-rule{height:4px;background:#E8B020}
.lh-doc-title{background:#E8B020;color:#0F1E3D;text-align:center;padding:10px 26px;font-size:13px;font-weight:900;letter-spacing:.7px;text-transform:uppercase}
/* ── Info Grid ── */
.info-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:14px;background:#F8F9FB;border:1px solid #DCE1EF;border-radius:8px;margin-bottom:16px}
.info-label{font-size:10px;color:#6B7A9D;text-transform:uppercase;letter-spacing:.05em}
.info-value{font-size:13px;font-weight:700;margin-top:3px}
/* ── Summary cards ── */
.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px}
.s-card{border:1px solid #DCE1EF;border-radius:8px;padding:14px;text-align:center}
/* ── Table ── */
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
@media print{
  body{padding:2px;font-size:12px}
  .lh-wrap{margin-bottom:10px!important;border-radius:6px!important}
  .lh-top{padding:10px 16px!important}
  .lh-school-name{font-size:17px!important}
  .lh-seal{width:52px!important;height:52px!important}
  .lh-contact-strip,.lh-addr-strip{padding:5px 16px!important;font-size:10px!important}
  .lh-doc-title{padding:7px 16px!important;font-size:12px!important}
  .info-grid{padding:8px!important;margin-bottom:8px!important;gap:6px!important}
  .summary{margin-bottom:8px!important;gap:8px!important}
  .s-card{padding:8px!important}
  table{margin-bottom:8px!important}
  th{padding:6px 8px!important}
  td{padding:6px 8px!important}
  .sigs{padding:10px!important;gap:20px!important}
  .sig-line{height:36px!important}
  .sig-date{height:36px!important}
  .result-footer{margin-top:6px!important;padding:4px 0!important}
  .no-print{display:none}
}
</style></head><body>

<div class="lh-wrap">
  <div class="lh-top">
    <img src="${schoolMeta.schoolLogo || '/static/school-logo.png'}" class="lh-logo" alt="Logo" onerror="this.style.background='#1e3a6b'"/>
    <div class="lh-center">
      <div class="lh-school-name">${schoolMeta.schoolName}</div>
      <div class="lh-school-tag">Pre&#8209;Primary School</div>
    </div>
    <div class="lh-seal">OFFICIAL<br>SEAL</div>
  </div>
  ${(schoolMeta.schoolPhone || schoolMeta.schoolPhone2 || schoolMeta.schoolEmail || schoolMeta.schoolWebsite) ? `<div class="lh-contact-strip">${[schoolMeta.schoolPhone?`<span class="ci">&#128222; ${schoolMeta.schoolPhone}</span>`:'',schoolMeta.schoolPhone2?`<span class="ci">&#128241; ${schoolMeta.schoolPhone2}</span>`:'',schoolMeta.schoolEmail?`<span class="ci">&#9993; ${schoolMeta.schoolEmail}</span>`:'',schoolMeta.schoolWebsite?`<span class="ci">&#127760; ${schoolMeta.schoolWebsite}</span>`:''].filter(Boolean).join('')}</div>` : ''}
  ${schoolMeta.schoolAddress ? `<div class="lh-addr-strip">&#128205; ${schoolMeta.schoolAddress}</div>` : ''}
  <div class="lh-gold-rule"></div>
  <div class="lh-doc-title">Final Result Card &mdash; Academic Year ${academicYear}</div>
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
<div class="result-footer">${schoolMeta.schoolName}${schoolMeta.schoolAddress ? ' | ' + schoolMeta.schoolAddress : ''}${schoolMeta.schoolWebsite ? ' | ' + schoolMeta.schoolWebsite : ''}</div>
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
  const user = Session.current();
  Seen.mark('evt', user.id);
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

// ---- Write a Review ----
function renderParentReview() {
  currentParentTab = 'parent-review';
  const user = Session.current();
  const child = getSelectedChild();
  const childInfo = child ? `Parent of ${child.name}` : 'SuperKids Parent';

  const content = `
    <div style="max-width:560px;margin:0 auto">
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:40px;margin-bottom:8px">⭐</div>
        <h2 style="font-size:20px;font-weight:800;color:#0F1E3D;margin:0 0 6px">Share Your Experience</h2>
        <p style="color:#6B7A9D;font-size:14px;margin:0">Your review will appear on our public website to help other families.</p>
      </div>

      <div class="card" style="padding:28px">
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:13px;font-weight:700;color:#0F1E3D;margin-bottom:6px">Your Rating</label>
          <div id="star-rating" style="display:flex;gap:8px;font-size:32px;cursor:pointer">
            ${[1,2,3,4,5].map(i => `<span data-star="${i}" onclick="setReviewStar(${i})" style="color:#DCE1EF;transition:color 0.15s;user-select:none">★</span>`).join('')}
          </div>
          <input type="hidden" id="review-stars" value="0">
        </div>

        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:700;color:#0F1E3D;margin-bottom:6px">Your Name</label>
          <input id="review-name" type="text" class="form-input" value="${user ? user.name : ''}" placeholder="Your name" maxlength="60"
                 style="width:100%;padding:10px 14px;border:1.5px solid #DCE1EF;border-radius:10px;font-size:14px;outline:none">
        </div>

        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:700;color:#0F1E3D;margin-bottom:6px">Your Role <span style="color:#94a3b8;font-weight:400">(optional)</span></label>
          <input id="review-childinfo" type="text" class="form-input" value="${childInfo}" placeholder="e.g. Mom of Aryan, age 4" maxlength="80"
                 style="width:100%;padding:10px 14px;border:1.5px solid #DCE1EF;border-radius:10px;font-size:14px;outline:none">
        </div>

        <div style="margin-bottom:24px">
          <label style="display:block;font-size:13px;font-weight:700;color:#0F1E3D;margin-bottom:6px">Your Review</label>
          <textarea id="review-text" placeholder="Share your experience at SuperKids India Preschool…" maxlength="500"
                    style="width:100%;padding:10px 14px;border:1.5px solid #DCE1EF;border-radius:10px;font-size:14px;outline:none;resize:vertical;min-height:110px;font-family:inherit"></textarea>
          <div style="text-align:right;font-size:11px;color:#94a3b8;margin-top:4px"><span id="review-char">0</span>/500</div>
        </div>

        <button onclick="submitParentReview()" id="review-submit-btn"
                style="width:100%;padding:13px;border-radius:12px;border:none;background:linear-gradient(135deg,#0F2050,#1AA6CA);color:#fff;font-size:15px;font-weight:800;cursor:pointer">
          <i class="fas fa-paper-plane" style="margin-right:8px"></i>Submit Review
        </button>
      </div>
    </div>
  `;

  renderLayout('parent-review', content, 'Write a Review');

  // Live char counter
  const ta = document.getElementById('review-text');
  const ch = document.getElementById('review-char');
  if (ta && ch) ta.addEventListener('input', function() { ch.textContent = ta.value.length; });
}

function setReviewStar(n) {
  document.getElementById('review-stars').value = n;
  document.querySelectorAll('#star-rating span').forEach(function(s) {
    s.style.color = parseInt(s.dataset.star) <= n ? '#E8B020' : '#DCE1EF';
  });
}

function submitParentReview() {
  var stars = parseInt(document.getElementById('review-stars').value);
  var name = (document.getElementById('review-name').value || '').trim();
  var childInfo = (document.getElementById('review-childinfo').value || '').trim();
  var text = (document.getElementById('review-text').value || '').trim();

  if (!stars) { showToast('Please select a star rating', 'warning'); return; }
  if (!name) { showToast('Please enter your name', 'warning'); return; }
  if (text.length < 20) { showToast('Please write at least 20 characters', 'warning'); return; }

  var btn = document.getElementById('review-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px"></i>Submitting…'; }

  fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentName: name, childInfo: childInfo, text: text, stars: stars })
  })
  .then(function(r) { return r.json(); })
  .then(function(res) {
    if (res.ok) {
      showToast('Thank you! Your review is now live on our website 🌟', 'success');
      navigate('parent-home');
    } else {
      showToast('Failed to submit: ' + (res.error || 'Unknown error'), 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px"></i>Submit Review'; }
    }
  })
  .catch(function() {
    showToast('Network error. Please try again.', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:8px"></i>Submit Review'; }
  });
}

// ---- Selected child indicator pill ----
function renderChildPill(child) {
  if (!child) return '';
  const cls = DB.getClass(child.classId);
  return `<div style="display:inline-flex;align-items:center;gap:8px;background:#E8EDF5;border:1.5px solid #DCE1EF;border-radius:20px;padding:5px 14px;font-size:12px;font-weight:600;color:#0F2050;margin-bottom:16px">
    <i class="fas fa-child" style="color:#1AA6CA"></i>
    Currently viewing: <strong>${child.name}</strong>${cls ? ' &middot; ' + cls.name : ''}
  </div>`;
}

// ---- Holidays ----
function renderParentHolidays() {
  currentParentTab = 'parent-holidays';
  const user = Session.current();
  const child = getSelectedChild();
  const holidays = DB.getHolidays();
  const today = new Date().toISOString().split('T')[0];
  const events = DB.getEvents(child ? child.classId : null);

  // Only show today's and upcoming holidays/events — no past items
  const byMonth = {};
  holidays.filter(function(h){ return (h.date||'') >= today; }).forEach(function(h) {
    const m = h.date.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push({ ...h, _type: 'holiday' });
  });
  events.filter(function(ev){ return (ev.date||'') >= today; }).forEach(function(ev) {
    const m = ev.date.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push({ ...ev, _type: 'event' });
  });

  const months = Object.keys(byMonth).sort();
  const typeColors = { National: '#ef4444', Festival: '#C4893A', Maharashtra: '#8b5cf6', School: '#10b981', Optional: '#6B7A9D' };
  const evColors = { sports: '#10b981', academic: '#1AA6CA', cultural: '#C4893A', holiday: '#ef4444', meeting: '#E8B020' };

  const upcoming = holidays.filter(function(h) { return h.date >= today; });

  const content = `
    ${child ? renderChildPill(child) : ''}
    ${renderChildSelector(child)}

    ${upcoming.length ? `
    <div class="card" style="background:linear-gradient(135deg,#0F2050,#1AA6CA);color:#fff;margin-bottom:20px">
      <div style="font-size:13px;font-weight:700;color:#90C4E0;margin-bottom:10px"><i class="fas fa-clock" style="margin-right:6px"></i>Next Holiday</div>
      <div style="font-size:20px;font-weight:900">${upcoming[0].name}</div>
      <div style="font-size:14px;color:#90C4E0;margin-top:4px">${formatDate(upcoming[0].date)}</div>
      <span style="display:inline-block;margin-top:8px;background:rgba(255,255,255,0.15);border-radius:10px;padding:3px 12px;font-size:12px;font-weight:700">${upcoming[0].type}</span>
    </div>` : ''}

    ${months.map(function(m) {
      const dt = new Date(m + '-01');
      const monthLabel = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const items = byMonth[m].sort(function(a, b) { return (a.date||'').localeCompare(b.date||''); });
      return `
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:14px"><i class="fas fa-calendar" style="color:#1AA6CA"></i> ${monthLabel}</div>
        ${items.map(function(item) {
          const isToday = (item.date || '') === today;
          const d = new Date(item.date);
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
          if (item._type === 'holiday') {
            const color = typeColors[item.type] || '#6B7A9D';
            return `<div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid #f1f5f9">
              <div style="text-align:center;min-width:48px;background:${color}15;border-radius:10px;padding:6px">
                <div style="font-size:18px;font-weight:900;color:${color}">${d.getDate()}</div>
                <div style="font-size:10px;color:#6B7A9D;font-weight:600">${dayName}</div>
              </div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px">${item.name}</div>
                <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;background:${color}20;color:${color}">${item.type}</span>
              </div>
              ${isToday ? '<span class="badge badge-yellow">Today</span>' : '<span class="badge badge-green">Upcoming</span>'}
            </div>`;
          } else {
            const color = evColors[item.type] || '#1AA6CA';
            return `<div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid #f1f5f9">
              <div style="text-align:center;min-width:48px;background:${color}15;border-radius:10px;padding:6px">
                <div style="font-size:18px;font-weight:900;color:${color}">${d.getDate()}</div>
                <div style="font-size:10px;color:#6B7A9D;font-weight:600">${dayName}</div>
              </div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px">${item.title}</div>
                <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;background:${color}20;color:${color};text-transform:capitalize">${item.type} Event</span>
              </div>
              ${isToday ? '<span class="badge badge-yellow">Today</span>' : '<span class="badge badge-blue">Upcoming</span>'}
            </div>`;
          }
        }).join('')}
      </div>`;
    }).join('')}
    ${!months.length ? '<div class="empty-state"><i class="fas fa-calendar-alt"></i><h3>No holidays or events found</h3></div>' : ''}`;

  renderLayout('parent-holidays', content, 'Holidays & School Calendar', 'School Calendar');
}

// ---- Profile ----
function renderParentProfile() {
  currentParentTab = 'parent-profile';
  const user = Session.current();
  const fullUser = DB.getUser(user.id) || user;

  const content = `
    <div class="grid-2">
      <!-- Profile Info -->
      <div class="card">
        <div class="card-title" style="margin-bottom:18px"><i class="fas fa-user-circle" style="color:#1AA6CA"></i> My Profile</div>
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
          ${avatarHtml(fullUser.name, fullUser.avatar || '#0F2050', 'avatar-xl')}
          <div>
            <div style="font-size:20px;font-weight:900;color:#0F1E3D">${fullUser.name}</div>
            <div style="font-size:13px;color:#6B7A9D">${fullUser.email}</div>
            <div style="font-size:12px;color:#6B7A9D">${fullUser.role === 'parent' ? 'Parent / Guardian' : fullUser.role}</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input class="form-control" id="prof-name" type="text" value="${fullUser.name || ''}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Email (read-only)</label>
          <input class="form-control" type="text" value="${fullUser.email || ''}" disabled style="opacity:0.6"/>
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-control" id="prof-phone" type="text" value="${fullUser.phone || ''}" placeholder="+91-XXXXXXXXXX"/>
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <textarea class="form-control" id="prof-address" rows="3" placeholder="Home address...">${fullUser.address || ''}</textarea>
        </div>
        <button class="btn btn-primary" onclick="saveParentProfile()"><i class="fas fa-save"></i> Save Changes</button>
      </div>

      <div>
        <!-- Change Password -->
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:16px"><i class="fas fa-lock" style="color:#C4893A"></i> Change Password</div>
          <div class="form-group">
            <label class="form-label">Current Password</label>
            <input class="form-control" id="prof-cur-pass" type="password" placeholder="Current password"/>
          </div>
          <div class="form-group">
            <label class="form-label">New Password</label>
            <input class="form-control" id="prof-new-pass" type="password" placeholder="New password (min 6 chars)"/>
          </div>
          <div class="form-group">
            <label class="form-label">Confirm New Password</label>
            <input class="form-control" id="prof-confirm-pass" type="password" placeholder="Confirm new password"/>
          </div>
          <button class="btn btn-warning" onclick="changeParentPassword()"><i class="fas fa-key"></i> Update Password</button>
        </div>

        <!-- Linked Children -->
        <div class="card">
          <div class="card-title" style="margin-bottom:14px"><i class="fas fa-child" style="color:#10b981"></i> Linked Children</div>
          ${DB.getStudentsByParent(user.id).map(function(child) {
            const cls = DB.getClass(child.classId);
            return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9">
              ${avatarHtml(child.name, '#0F2050')}
              <div>
                <div style="font-weight:700">${child.name}</div>
                <div style="font-size:12px;color:#6B7A9D">${cls ? cls.name : ''} &middot; Roll: ${child.rollNo}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;

  renderLayout('parent-profile', content, 'My Profile', user.name);
}

window.saveParentProfile = function() {
  const user = Session.current();
  const name = (document.getElementById('prof-name').value || '').trim();
  const phone = (document.getElementById('prof-phone').value || '').trim();
  const address = (document.getElementById('prof-address').value || '').trim();
  if (!name) { showToast('Name cannot be empty', 'error'); return; }
  DB.updateUser(user.id, { name, phone, address });
  Session.updateCurrent({ name, phone, address });
  showToast('Profile updated successfully!', 'success');
};

window.changeParentPassword = function() {
  const user = Session.current();
  const fullUser = DB.getUser(user.id);
  const cur = (document.getElementById('prof-cur-pass').value || '').trim();
  const np = (document.getElementById('prof-new-pass').value || '').trim();
  const cp = (document.getElementById('prof-confirm-pass').value || '').trim();
  if (!cur || !np || !cp) { showToast('Please fill all password fields', 'error'); return; }
  if (fullUser && fullUser.password !== cur) { showToast('Current password is incorrect', 'error'); return; }
  if (np.length < 6) { showToast('New password must be at least 6 characters', 'error'); return; }
  if (np !== cp) { showToast('Passwords do not match', 'error'); return; }
  DB.updateUser(user.id, { password: np });
  showToast('Password changed successfully!', 'success');
  document.getElementById('prof-cur-pass').value = '';
  document.getElementById('prof-new-pass').value = '';
  document.getElementById('prof-confirm-pass').value = '';
};

// ---- Fees ----
function renderParentFees() {
  currentParentTab = 'parent-fees';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const fees = DB.getFeeRecords(child.id);
  const totalDue = fees.reduce(function(s, f) { return s + (f.amount || 0); }, 0);
  const totalPaid = fees.filter(function(f) { return f.status === 'Paid'; }).reduce(function(s, f) { return s + (f.amount || 0); }, 0);
  const balance = totalDue - totalPaid;

  const statusColors = { Paid: '#10b981', Pending: '#E8B020', Overdue: '#ef4444' };
  const statusBg = { Paid: 'badge-green', Pending: 'badge-yellow', Overdue: 'badge-red' };

  const content = `
    ${renderChildPill(child)}
    ${renderChildSelector(child)}
    <div class="grid-3" style="margin-bottom:20px">
      <div class="stat-card">
        <div class="stat-icon" style="background:#E8EDF5"><i class="fas fa-rupee-sign" style="color:#1AA6CA"></i></div>
        <div style="font-size:26px;font-weight:900;color:#1AA6CA">&#8377;${totalDue.toLocaleString('en-IN')}</div>
        <div class="text-muted">Total Invoiced</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#d1fae5"><i class="fas fa-check-circle" style="color:#10b981"></i></div>
        <div style="font-size:26px;font-weight:900;color:#10b981">&#8377;${totalPaid.toLocaleString('en-IN')}</div>
        <div class="text-muted">Total Paid</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:${balance > 0 ? '#fee2e2' : '#d1fae5'}"><i class="fas fa-balance-scale" style="color:${balance > 0 ? '#ef4444' : '#10b981'}"></i></div>
        <div style="font-size:26px;font-weight:900;color:${balance > 0 ? '#ef4444' : '#10b981'}">&#8377;${balance.toLocaleString('en-IN')}</div>
        <div class="text-muted">${balance > 0 ? 'Balance Due' : 'Fully Paid'}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title" style="margin-bottom:16px"><i class="fas fa-file-invoice" style="color:#1AA6CA"></i> Fee Invoices – ${child.name}</div>
      ${fees.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Invoice No</th><th>Term</th><th>Amount</th><th>Due Date</th><th>Paid Date</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${fees.map(function(f) {
              return `<tr>
                <td><strong>${f.invoiceNo}</strong></td>
                <td>${f.term}</td>
                <td style="font-weight:700">&#8377;${(f.amount||0).toLocaleString('en-IN')}</td>
                <td>${formatDate(f.dueDate)}</td>
                <td>${f.paidDate ? formatDate(f.paidDate) : '<span class="text-muted">-</span>'}</td>
                <td><span class="badge ${statusBg[f.status] || 'badge-gray'}">${f.status}</span></td>
                <td>${f.status === 'Paid' ? `<button class="btn btn-sm btn-secondary" onclick="printFeeReceipt('${f.id}')"><i class="fas fa-download"></i> Receipt</button>` : '<span class="text-muted" style="font-size:12px">-</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : '<div class="empty-state"><i class="fas fa-rupee-sign"></i><h3>No fee records found</h3></div>'}
    </div>`;

  renderLayout('parent-fees', content, 'Fees & Payments', child.name);
}

window.printFeeReceipt = function(feeId) {
  const fee = (DB.getFeeRecords() || []).find(function(f) { return f.id === feeId; });
  if (!fee) return;
  const student = DB.getStudent(fee.studentId);
  const meta = DB.getMeta();
  const cls = student ? DB.getClass(student.classId) : null;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Fee Receipt</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:30px;color:#0F1E3D;background:#fff}
  .hdr{background:#0F2050;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0;display:flex;align-items:center;gap:16px}
  .logo{width:60px;height:60px;border-radius:50%;border:2px solid #E8B020;background:#fff;object-fit:contain}
  .school-name{font-size:20px;font-weight:900}.school-sub{font-size:11px;color:#90C4E0}
  .gold-bar{height:4px;background:#E8B020;margin-bottom:20px}
  .title{text-align:center;font-size:16px;font-weight:900;letter-spacing:1px;text-transform:uppercase;margin-bottom:20px;padding:10px;background:#E8B020;color:#0F1E3D;border-radius:6px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
  .field label{font-size:10px;color:#6B7A9D;text-transform:uppercase;letter-spacing:.04em}
  .field .val{font-size:13px;font-weight:700}
  .amount-box{background:#d1fae5;border:2px solid #10b981;border-radius:10px;padding:18px;text-align:center;margin-bottom:20px}
  .amount-box .amt{font-size:36px;font-weight:900;color:#10b981}
  .footer{font-size:11px;color:#6B7A9D;text-align:center;border-top:1px solid #DCE1EF;padding-top:14px;margin-top:20px}
  .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px}
  .sig-line{height:50px;border-bottom:1.5px solid #0F1E3D;margin-bottom:6px}
  .sig-label{font-size:12px;font-weight:700;text-align:center}
  @media print{body{padding:10px}.no-print{display:none}}</style></head><body>
  <div class="hdr">
    <img src="${meta.schoolLogo || '/static/school-logo.png'}" class="logo" onerror="this.style.background='#1e3a6b'"/>
    <div><div class="school-name">${meta.schoolName}</div><div class="school-sub">${meta.schoolAddress || ''}</div></div>
  </div>
  <div class="gold-bar"></div>
  <div class="title">Fee Payment Receipt</div>
  <div class="grid">
    <div class="field"><label>Invoice No.</label><div class="val">${fee.invoiceNo}</div></div>
    <div class="field"><label>Date of Payment</label><div class="val">${formatDate(fee.paidDate)}</div></div>
    <div class="field"><label>Student Name</label><div class="val">${student ? student.name : '-'}</div></div>
    <div class="field"><label>Roll No.</label><div class="val">${student ? student.rollNo : '-'}</div></div>
    <div class="field"><label>Class</label><div class="val">${cls ? cls.name : '-'}</div></div>
    <div class="field"><label>Term</label><div class="val">${fee.term}</div></div>
    <div class="field"><label>Due Date</label><div class="val">${formatDate(fee.dueDate)}</div></div>
    <div class="field"><label>Status</label><div class="val" style="color:#10b981">PAID</div></div>
  </div>
  <div class="amount-box">
    <div style="font-size:12px;color:#065f46;margin-bottom:6px">Amount Paid</div>
    <div class="amt">&#8377;${(fee.amount||0).toLocaleString('en-IN')}</div>
  </div>
  <div class="sig-row">
    <div><div class="sig-line"></div><div class="sig-label">Parent / Guardian</div></div>
    <div><div class="sig-line"></div><div class="sig-label">School Authorised Signatory</div></div>
  </div>
  <div class="footer">${meta.schoolName} &bull; ${meta.schoolAddress || ''} &bull; ${meta.schoolWebsite || ''}<br>This is a computer-generated receipt. No signature required.</div>
  <script>window.onload=function(){window.print();};<\/script></body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('Please allow popups to print receipt', 'warning');
};

// ---- Homework ----
function renderParentHomework() {
  currentParentTab = 'parent-homework';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const assignments = DB.getAssignments(child.classId);
  const today = new Date().toISOString().split('T')[0];

  const groups = { Pending: [], Submitted: [], Overdue: [] };
  assignments.forEach(function(a) {
    const s = a.status === 'Submitted' ? 'Submitted' : (a.dueDate < today && a.status !== 'Submitted') ? 'Overdue' : 'Pending';
    groups[s].push(a);
  });

  const groupColors = { Pending: '#E8B020', Submitted: '#10b981', Overdue: '#ef4444' };
  const groupIcons = { Pending: 'fa-clock', Submitted: 'fa-check-circle', Overdue: 'fa-exclamation-circle' };
  const groupBg = { Pending: '#FEF7E0', Submitted: '#d1fae5', Overdue: '#fee2e2' };

  const assignCard = function(a) {
    const isOverdue = a.dueDate < today && a.status !== 'Submitted';
    const dueDateColor = isOverdue ? '#ef4444' : (a.dueDate === today ? '#E8B020' : '#6B7A9D');
    return `<div style="border:2px solid #DCE1EF;border-radius:12px;padding:16px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;color:#1AA6CA;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">${a.subject}</div>
          <div style="font-size:15px;font-weight:800;color:#0F1E3D;margin-bottom:6px">${a.title}</div>
          <div style="font-size:13px;color:#6B7A9D;line-height:1.5">${a.description || ''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:11px;font-weight:700;color:${dueDateColor}"><i class="fas fa-calendar-day" style="margin-right:4px"></i>Due: ${formatDate(a.dueDate)}</div>
        </div>
      </div>
    </div>`;
  };

  const content = `
    ${renderChildPill(child)}
    ${renderChildSelector(child)}
    <div class="grid-3" style="margin-bottom:20px">
      ${['Pending','Submitted','Overdue'].map(function(g) {
        return `<div class="stat-card">
          <div class="stat-icon" style="background:${groupBg[g]}"><i class="fas ${groupIcons[g]}" style="color:${groupColors[g]}"></i></div>
          <div style="font-size:28px;font-weight:900;color:${groupColors[g]}">${groups[g].length}</div>
          <div class="text-muted">${g}</div>
        </div>`;
      }).join('')}
    </div>

    ${['Pending','Overdue','Submitted'].map(function(g) {
      if (!groups[g].length) return '';
      return `<div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:14px;color:${groupColors[g]}"><i class="fas ${groupIcons[g]}"></i> ${g} Assignments (${groups[g].length})</div>
        ${groups[g].map(assignCard).join('')}
      </div>`;
    }).join('')}
    ${!assignments.length ? '<div class="empty-state"><i class="fas fa-book-open"></i><h3>No assignments found for this class</h3></div>' : ''}`;

  renderLayout('parent-homework', content, 'Homework & Assignments', child.name);
}

// ---- Achievements ----
function renderParentAchievements() {
  currentParentTab = 'parent-achievements';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const achievements = DB.getAchievements(child.id);
  const catColors = { Academic: '#1AA6CA', Sports: '#10b981', Cultural: '#C4893A', Behaviour: '#E8B020' };
  const catBg = { Academic: '#E8EDF5', Sports: '#d1fae5', Cultural: '#FEF2E8', Behaviour: '#FEF7E0' };

  const counts = {};
  achievements.forEach(function(a) { counts[a.category] = (counts[a.category] || 0) + 1; });

  const content = `
    ${renderChildPill(child)}
    ${renderChildSelector(child)}
    ${achievements.length ? `
    <div class="grid-4" style="margin-bottom:20px">
      ${['Academic','Sports','Cultural','Behaviour'].map(function(cat) {
        const color = catColors[cat] || '#1AA6CA';
        return `<div class="stat-card" style="text-align:center">
          <div class="stat-icon" style="background:${catBg[cat]};margin:0 auto 8px"><i class="fas fa-trophy" style="color:${color}"></i></div>
          <div style="font-size:28px;font-weight:900;color:${color}">${counts[cat] || 0}</div>
          <div class="text-muted">${cat}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${achievements.map(function(a) {
        const color = catColors[a.category] || '#1AA6CA';
        const bg = catBg[a.category] || '#E8EDF5';
        return `<div style="border:2px solid ${color}30;border-radius:16px;padding:20px;background:#fff;position:relative;overflow:hidden">
          <div style="position:absolute;top:-14px;right:-14px;width:60px;height:60px;border-radius:50%;background:${color}12"></div>
          <div style="display:flex;align-items:flex-start;gap:14px">
            <div style="width:48px;height:48px;border-radius:14px;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="fas ${a.icon || 'fa-trophy'}" style="color:${color};font-size:22px"></i>
            </div>
            <div style="flex:1">
              <span style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.04em">${a.category}</span>
              <div style="font-size:15px;font-weight:800;color:#0F1E3D;margin:4px 0">${a.title}</div>
              <div style="font-size:13px;color:#6B7A9D;line-height:1.5">${a.description}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:8px"><i class="fas fa-calendar" style="margin-right:4px"></i>${formatDate(a.date)}</div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>` : '<div class="empty-state"><i class="fas fa-trophy"></i><h3>No achievements recorded yet</h3><p>Achievements will appear here when recorded by teachers</p></div>'}`;

  renderLayout('parent-achievements', content, 'Achievements', child.name);
}

// ---- Exam Schedule ----
function renderParentExams() {
  currentParentTab = 'parent-exams';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const allExams = DB.getExams(child.classId);
  const today = new Date().toISOString().split('T')[0];
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  // Only show upcoming and today's exams
  const exams = allExams.filter(function(e){ return (e.date||'') >= today; });

  const content = `
    ${renderChildPill(child)}
    ${renderChildSelector(child)}
    <div class="card">
      <div class="card-header" style="margin-bottom:16px">
        <div class="card-title"><i class="fas fa-clipboard-list" style="color:#1AA6CA"></i> Exam Schedule</div>
        ${exams.length ? `<span class="badge badge-blue">${exams.filter(function(e){return e.date >= today;}).length} upcoming</span>` : ''}
      </div>
      ${exams.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Exam</th><th>Subject</th><th>Date</th><th>Day</th><th>Time</th><th>Duration</th><th>Venue</th><th></th></tr></thead>
          <tbody>
            ${exams.map(function(e) {
              const d = new Date(e.date);
              const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
              const isSoon = e.date <= in7days;
              const isToday = e.date === today;
              return `<tr>
                <td><strong>${e.examName}</strong></td>
                <td>${e.subject}</td>
                <td style="font-weight:700;color:#0F1E3D">${formatDate(e.date)}</td>
                <td style="color:#6B7A9D">${dayName}</td>
                <td>${e.time}</td>
                <td>${e.duration}</td>
                <td>${e.venue}</td>
                <td>${isToday ? '<span class="badge badge-green">Today</span>' : isSoon ? '<span class="badge badge-yellow"><i class="fas fa-bell"></i> Soon</span>' : ''}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:12px;font-size:12px;color:#6B7A9D"><i class="fas fa-info-circle" style="margin-right:4px"></i>"Soon" badge shown for exams in the next 7 days.</div>` :
      '<div class="empty-state"><i class="fas fa-clipboard-list"></i><h3>No exam schedule available</h3><p>Exam timetable will be shared by your school here</p></div>'}
    </div>`;

  renderLayout('parent-exams', content, 'Exam Schedule', child.name);
}

// ---- Health Records ----
function renderParentHealth() {
  currentParentTab = 'parent-health';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const records = DB.getHealthRecords(child.id);
  const vaccinations = records.filter(function(r) { return r.type === 'vaccination'; });
  const allergies = records.filter(function(r) { return r.type === 'allergy'; });
  const notes = records.filter(function(r) { return r.type === 'note'; });
  const growth = DB.getGrowth(child.id);
  const lastGrowth = growth.length ? growth[growth.length - 1] : null;

  const vacStatusColors = { Completed: '#10b981', 'Due Soon': '#E8B020', Overdue: '#ef4444', Upcoming: '#1AA6CA' };
  const vacStatusBg = { Completed: 'badge-green', 'Due Soon': 'badge-yellow', Overdue: 'badge-red', Upcoming: 'badge-blue' };
  const sevColors = { High: '#ef4444', Medium: '#E8B020', Low: '#10b981' };
  const sevBg = { High: 'badge-red', Medium: 'badge-yellow', Low: 'badge-green' };

  const content = `
    ${renderChildPill(child)}
    ${renderChildSelector(child)}

    ${lastGrowth ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:14px"><i class="fas fa-heartbeat" style="color:#ef4444"></i> Current Health Stats</div>
      <div class="grid-3">
        <div class="stat-card">
          <div class="stat-icon" style="background:#d1fae5"><i class="fas fa-ruler-vertical" style="color:#10b981"></i></div>
          <div style="font-size:26px;font-weight:900;color:#10b981">${lastGrowth.height} cm</div>
          <div class="text-muted">Height</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#E8EDF5"><i class="fas fa-weight" style="color:#1AA6CA"></i></div>
          <div style="font-size:26px;font-weight:900;color:#1AA6CA">${lastGrowth.weight} kg</div>
          <div class="text-muted">Weight</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#FEF7E0"><i class="fas fa-heart" style="color:${lastGrowth.bmi < 18.5 ? '#E8B020' : lastGrowth.bmi < 25 ? '#10b981' : '#ef4444'}"></i></div>
          <div style="font-size:26px;font-weight:900;color:${lastGrowth.bmi < 18.5 ? '#E8B020' : lastGrowth.bmi < 25 ? '#10b981' : '#ef4444'}">${lastGrowth.bmi}</div>
          <div class="text-muted">BMI – ${lastGrowth.bmi < 18.5 ? 'Underweight' : lastGrowth.bmi < 25 ? 'Normal' : 'Overweight'}</div>
        </div>
      </div>
    </div>` : ''}

    <!-- Vaccinations -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:14px"><i class="fas fa-syringe" style="color:#1AA6CA"></i> Vaccination Records</div>
      ${vaccinations.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Vaccine</th><th>Date Given</th><th>Next Due</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>
            ${vaccinations.map(function(v) {
              return `<tr>
                <td><strong>${v.vaccine}</strong></td>
                <td>${v.date ? formatDate(v.date) : '<span class="text-muted">-</span>'}</td>
                <td>${v.dueDate ? formatDate(v.dueDate) : '<span class="text-muted">-</span>'}</td>
                <td><span class="badge ${vacStatusBg[v.status] || 'badge-gray'}">${v.status}</span></td>
                <td style="font-size:12px;color:#6B7A9D">${v.notes || '-'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : '<p class="text-muted">No vaccination records found.</p>'}
    </div>

    <!-- Allergies -->
    ${allergies.length ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:14px"><i class="fas fa-exclamation-triangle" style="color:#E8B020"></i> Allergies</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${allergies.map(function(a) {
          const color = sevColors[a.severity] || '#6B7A9D';
          return `<div style="border:2px solid ${color}30;border-radius:12px;padding:12px 16px;min-width:200px">
            <div style="font-weight:700;font-size:14px">${a.name}</div>
            <span class="badge ${sevBg[a.severity] || 'badge-gray'}" style="margin-top:4px">Severity: ${a.severity}</span>
            ${a.notes ? `<div style="font-size:12px;color:#6B7A9D;margin-top:6px">${a.notes}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <!-- Medical Notes -->
    ${notes.length ? `
    <div class="card">
      <div class="card-title" style="margin-bottom:14px"><i class="fas fa-notes-medical" style="color:#C4893A"></i> Medical Notes</div>
      ${notes.map(function(n) {
        return `<div style="border-left:4px solid #C4893A;padding:12px 16px;margin-bottom:10px;background:#FEF2E8;border-radius:0 10px 10px 0">
          <div style="font-weight:700;margin-bottom:4px">${n.title}</div>
          <div style="font-size:13px;color:#6B7A9D">${n.details}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:6px">Recorded: ${formatDate(n.recordedOn)}</div>
        </div>`;
      }).join('')}
    </div>` : ''}

    ${!vaccinations.length && !allergies.length && !notes.length && !lastGrowth ? '<div class="empty-state"><i class="fas fa-heartbeat"></i><h3>No health records found</h3></div>' : ''}`;

  renderLayout('parent-health', content, 'Health Records', child.name);
}

// ---- Emergency Contacts ----
function renderParentContacts() {
  currentParentTab = 'parent-contacts';
  const user = Session.current();
  const fullUser = DB.getUser(user.id) || user;
  const contacts = fullUser.emergencyContacts || [];

  const content = `
    <div class="grid-2">
      <!-- Contacts List -->
      <div class="card">
        <div class="card-title" style="margin-bottom:16px"><i class="fas fa-phone-alt" style="color:#10b981"></i> Emergency Contacts</div>
        ${contacts.length ? contacts.map(function(c, i) {
          return `<div style="border:2px solid ${c.primary ? '#1AA6CA' : '#DCE1EF'};border-radius:12px;padding:16px;margin-bottom:12px;position:relative">
            ${c.primary ? '<span class="badge badge-blue" style="position:absolute;top:10px;right:10px">Primary</span>' : ''}
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
              ${avatarHtml(c.name, '#0F2050')}
              <div>
                <div style="font-weight:700;font-size:15px">${c.name}</div>
                <div style="font-size:12px;color:#6B7A9D">${c.relation}</div>
              </div>
            </div>
            <div style="font-size:13px;color:#2A3B60;margin-bottom:4px"><i class="fas fa-phone" style="color:#10b981;margin-right:6px"></i>${c.phone}</div>
            ${c.email ? `<div style="font-size:13px;color:#2A3B60;margin-bottom:8px"><i class="fas fa-envelope" style="color:#1AA6CA;margin-right:6px"></i>${c.email}</div>` : ''}
            <button class="btn btn-sm btn-danger" onclick="deleteEmergencyContact(${i})"><i class="fas fa-trash"></i> Remove</button>
          </div>`;
        }).join('') : '<div class="empty-state" style="padding:30px"><i class="fas fa-phone-alt"></i><h3>No emergency contacts yet</h3></div>'}
      </div>

      <!-- Add Contact Form -->
      <div class="card">
        <div class="card-title" style="margin-bottom:16px"><i class="fas fa-plus-circle" style="color:#1AA6CA"></i> Add Emergency Contact</div>
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <input class="form-control" id="ec-name" type="text" placeholder="Contact's full name"/>
        </div>
        <div class="form-group">
          <label class="form-label">Relation *</label>
          <select class="form-control" id="ec-relation">
            <option value="">Select relation</option>
            <option>Father</option><option>Mother</option><option>Grandparent</option>
            <option>Uncle</option><option>Aunt</option><option>Guardian</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Phone *</label>
          <input class="form-control" id="ec-phone" type="tel" placeholder="+91-XXXXXXXXXX"/>
        </div>
        <div class="form-group">
          <label class="form-label">Email (optional)</label>
          <input class="form-control" id="ec-email" type="email" placeholder="email@example.com"/>
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px">
          <input type="checkbox" id="ec-primary" style="width:18px;height:18px;accent-color:#1AA6CA"/>
          <label for="ec-primary" style="font-size:13px;font-weight:600;cursor:pointer">Set as Primary Contact</label>
        </div>
        <button class="btn btn-primary" onclick="addEmergencyContact()"><i class="fas fa-plus"></i> Add Contact</button>
      </div>
    </div>`;

  renderLayout('parent-contacts', content, 'Emergency Contacts', user.name);
}

window.addEmergencyContact = function() {
  const user = Session.current();
  const name = (document.getElementById('ec-name').value || '').trim();
  const relation = (document.getElementById('ec-relation').value || '').trim();
  const phone = (document.getElementById('ec-phone').value || '').trim();
  const email = (document.getElementById('ec-email').value || '').trim();
  const primary = document.getElementById('ec-primary').checked;
  if (!name || !relation || !phone) { showToast('Please fill all required fields', 'error'); return; }
  const fullUser = DB.getUser(user.id) || user;
  const contacts = fullUser.emergencyContacts ? [...fullUser.emergencyContacts] : [];
  if (primary) contacts.forEach(function(c) { c.primary = false; });
  contacts.push({ name, relation, phone, email, primary });
  DB.updateUser(user.id, { emergencyContacts: contacts });
  showToast('Emergency contact added!', 'success');
  renderParentContacts();
};

window.deleteEmergencyContact = function(idx) {
  const user = Session.current();
  const fullUser = DB.getUser(user.id) || user;
  const contacts = fullUser.emergencyContacts ? [...fullUser.emergencyContacts] : [];
  contacts.splice(idx, 1);
  DB.updateUser(user.id, { emergencyContacts: contacts });
  showToast('Contact removed', 'success');
  renderParentContacts();
};

// ---- PTM ----
function renderParentPTM() {
  currentParentTab = 'parent-ptm';
  const user = Session.current();
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const slots = DB.getPTMSlots(child.classId);
  const myBookings = slots.filter(function(s) { return s.bookedBy === user.id; });
  const available = slots.filter(function(s) { return s.status === 'Available'; });

  const content = `
    ${renderChildPill(child)}
    ${renderChildSelector(child)}

    <!-- My Bookings -->
    ${myBookings.length ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:14px"><i class="fas fa-calendar-check" style="color:#10b981"></i> My Bookings</div>
      ${myBookings.map(function(s) {
        return `<div style="border:2px solid #10b981;border-radius:12px;padding:16px;margin-bottom:10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div style="background:#d1fae5;border-radius:10px;padding:10px 16px;text-align:center;min-width:80px">
            <div style="font-weight:900;color:#10b981;font-size:18px">${new Date(s.date).getDate()}</div>
            <div style="font-size:10px;color:#6B7A9D;font-weight:700">${new Date(s.date).toLocaleDateString('en-US',{month:'short'})}</div>
          </div>
          <div style="flex:1">
            <div style="font-weight:700">${s.teacherName}</div>
            <div style="color:#6B7A9D;font-size:13px"><i class="fas fa-clock" style="margin-right:4px"></i>${s.time} &bull; ${s.duration}</div>
            <div style="color:#6B7A9D;font-size:13px">${formatDate(s.date)}</div>
          </div>
          <span class="badge badge-green">Booked</span>
          <button class="btn btn-sm btn-danger" onclick="cancelPTMBooking('${s.id}')"><i class="fas fa-times"></i> Cancel</button>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- Available Slots -->
    <div class="card">
      <div class="card-title" style="margin-bottom:14px"><i class="fas fa-handshake" style="color:#1AA6CA"></i> Available PTM Slots</div>
      ${available.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Time</th><th>Teacher</th><th>Duration</th><th>Action</th></tr></thead>
          <tbody>
            ${available.map(function(s) {
              return `<tr>
                <td>${formatDate(s.date)}</td>
                <td>${s.time}</td>
                <td><strong>${s.teacherName}</strong></td>
                <td>${s.duration}</td>
                <td><button class="btn btn-sm btn-primary" onclick="bookPTMSlot('${s.id}')"><i class="fas fa-calendar-plus"></i> Book</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `<div class="empty-state" style="padding:30px"><i class="fas fa-handshake"></i><h3>${slots.length ? 'All slots are booked' : 'No PTM slots available yet'}</h3></div>`}
    </div>`;

  renderLayout('parent-ptm', content, 'Parent-Teacher Meeting', child.name);
}

window.bookPTMSlot = function(slotId) {
  const user = Session.current();
  DB.bookPTMSlot(slotId, user.id);
  showToast('Slot booked successfully!', 'success');
  renderParentPTM();
};

window.cancelPTMBooking = function(slotId) {
  confirmDialog('Cancel this PTM appointment?', function() {
    DB.cancelPTMSlot(slotId);
    showToast('Booking cancelled', 'success');
    renderParentPTM();
  }, 'Cancel Booking', false);
};

// ---- Grievance ----
function renderParentGrievance() {
  currentParentTab = 'parent-grievance';
  const user = Session.current();
  const grievances = DB.getGrievances(user.id);

  const statusColors = { Open: '#E8B020', 'In Review': '#1AA6CA', Resolved: '#10b981' };
  const statusBg = { Open: 'badge-yellow', 'In Review': 'badge-blue', Resolved: 'badge-green' };

  const content = `
    <div class="grid-2">
      <!-- Submit Form -->
      <div class="card">
        <div class="card-title" style="margin-bottom:16px"><i class="fas fa-comment-dots" style="color:#C4893A"></i> Submit a Grievance</div>
        <div class="form-group">
          <label class="form-label">Category *</label>
          <select class="form-control" id="grv-cat">
            <option value="">Select category</option>
            <option>Academic</option><option>Safety</option><option>Facility</option><option>Staff</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Subject *</label>
          <input class="form-control" id="grv-subject" type="text" placeholder="Brief subject of the grievance"/>
        </div>
        <div class="form-group">
          <label class="form-label">Description *</label>
          <textarea class="form-control" id="grv-desc" rows="5" placeholder="Please describe the issue in detail..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-control" id="grv-priority">
            <option value="Low">Low</option>
            <option value="Medium" selected>Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="submitGrievance()"><i class="fas fa-paper-plane"></i> Submit Grievance</button>
      </div>

      <!-- History -->
      <div class="card">
        <div class="card-title" style="margin-bottom:16px"><i class="fas fa-history" style="color:#6B7A9D"></i> My Grievances</div>
        ${grievances.length ? grievances.map(function(g) {
          const color = statusColors[g.status] || '#6B7A9D';
          return `<div style="border:2px solid ${color}30;border-radius:12px;padding:14px;margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;margin-bottom:8px">
              <div>
                <span style="font-size:11px;font-weight:700;color:#6B7A9D;text-transform:uppercase">${g.category}</span>
                <div style="font-weight:700;font-size:14px;margin-top:2px">${g.subject}</div>
              </div>
              <span class="badge ${statusBg[g.status] || 'badge-gray'}">${g.status}</span>
            </div>
            <div style="font-size:13px;color:#6B7A9D;margin-bottom:8px">${(g.description || '').slice(0, 100)}${g.description && g.description.length > 100 ? '...' : ''}</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:#6B7A9D">
              <span><i class="fas fa-calendar" style="margin-right:3px"></i>${formatDate(g.submittedDate)}</span>
              <span><i class="fas fa-flag" style="margin-right:3px"></i>${g.priority} Priority</span>
              <span>Ref: #${g.id.slice(-6).toUpperCase()}</span>
            </div>
            ${g.resolutionNote ? `<div style="margin-top:8px;padding:8px;background:#d1fae5;border-radius:6px;font-size:12px;color:#065f46"><i class="fas fa-check-circle" style="margin-right:4px"></i>${g.resolutionNote}</div>` : ''}
          </div>`;
        }).join('') : '<div class="empty-state" style="padding:30px"><i class="fas fa-comment-dots"></i><h3>No grievances submitted</h3></div>'}
      </div>
    </div>`;

  renderLayout('parent-grievance', content, 'Grievance Portal', 'Submit & Track');
}

window.submitGrievance = function() {
  const user = Session.current();
  const cat = (document.getElementById('grv-cat').value || '').trim();
  const subject = (document.getElementById('grv-subject').value || '').trim();
  const desc = (document.getElementById('grv-desc').value || '').trim();
  const priority = (document.getElementById('grv-priority').value || 'Medium').trim();
  if (!cat || !subject || !desc) { showToast('Please fill all required fields', 'error'); return; }
  DB.addGrievance({
    id: DB.genId('grv'), parentId: user.id, category: cat, subject, description: desc,
    priority, status: 'Open', submittedDate: new Date().toISOString().split('T')[0], resolutionNote: ''
  });
  showToast('Grievance submitted successfully!', 'success');
  renderParentGrievance();
};

// ---- Conduct ----
function renderParentConduct() {
  currentParentTab = 'parent-conduct';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const records = DB.getConductRecords(child.id);
  const positive = records.filter(function(r) { return r.type === 'Positive'; });
  const negative = records.filter(function(r) { return r.type === 'Negative'; });
  const neutral = records.filter(function(r) { return r.type === 'Neutral'; });

  const typeColors = { Positive: '#10b981', Negative: '#ef4444', Neutral: '#6B7A9D' };
  const typeBg = { Positive: '#d1fae5', Negative: '#fee2e2', Neutral: '#F1F5F9' };
  const typeBadge = { Positive: 'badge-green', Negative: 'badge-red', Neutral: 'badge-gray' };

  // Overall rating: based on positive vs negative ratio
  const total = records.length;
  const score = total ? Math.round(((positive.length - negative.length * 2) / total + 1) * 2.5) : 3;
  const clamped = Math.min(5, Math.max(1, score));

  const content = `
    ${renderChildPill(child)}
    ${renderChildSelector(child)}

    <!-- Summary -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header">
        <div>
          <div class="card-title"><i class="fas fa-star" style="color:#E8B020"></i> Conduct Summary – ${child.name}</div>
          <div style="display:flex;gap:4px;margin-top:6px">
            ${[1,2,3,4,5].map(function(i){ return `<i class="fas fa-star" style="font-size:18px;color:${i <= clamped ? '#E8B020' : '#DCE1EF'}"></i>`; }).join('')}
            <span style="margin-left:8px;font-size:13px;color:#6B7A9D">(${clamped}/5)</span>
          </div>
        </div>
      </div>
      <div class="grid-3" style="margin-top:14px">
        <div class="stat-card">
          <div class="stat-icon" style="background:#d1fae5"><i class="fas fa-thumbs-up" style="color:#10b981"></i></div>
          <div style="font-size:26px;font-weight:900;color:#10b981">${positive.length}</div>
          <div class="text-muted">Positive Incidents</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fee2e2"><i class="fas fa-thumbs-down" style="color:#ef4444"></i></div>
          <div style="font-size:26px;font-weight:900;color:#ef4444">${negative.length}</div>
          <div class="text-muted">Negative Incidents</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#F1F5F9"><i class="fas fa-circle" style="color:#6B7A9D"></i></div>
          <div style="font-size:26px;font-weight:900;color:#6B7A9D">${neutral.length}</div>
          <div class="text-muted">Neutral Notes</div>
        </div>
      </div>
    </div>

    <!-- Records Table -->
    <div class="card">
      <div class="card-title" style="margin-bottom:14px"><i class="fas fa-list" style="color:#6B7A9D"></i> Conduct Records</div>
      ${records.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Recorded By</th></tr></thead>
          <tbody>
            ${records.map(function(r) {
              return `<tr style="background:${typeBg[r.type] || '#fff'}30">
                <td>${formatDate(r.date)}</td>
                <td><span class="badge ${typeBadge[r.type] || 'badge-gray'}">${r.type}</span></td>
                <td><strong>${r.category}</strong></td>
                <td style="font-size:13px">${r.description}</td>
                <td style="font-size:12px;color:#6B7A9D">${r.recordedBy}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : '<div class="empty-state"><i class="fas fa-star"></i><h3>No conduct records</h3></div>'}
    </div>`;

  renderLayout('parent-conduct', content, 'Behaviour & Conduct', child.name);
}

// ---- Documents ----
function renderParentDocuments() {
  currentParentTab = 'parent-documents';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }
  const meta = DB.getMeta();
  const cls = DB.getClass(child.classId);

  const docs = [
    {
      id: 'admit-card',
      title: 'Admit Card',
      icon: 'fa-id-card',
      color: '#1AA6CA',
      desc: 'Official admit card with student details and exam schedule for upcoming examinations.',
      fn: 'printAdmitCard'
    },
    {
      id: 'bonafide',
      title: 'Bonafide Certificate',
      icon: 'fa-certificate',
      color: '#10b981',
      desc: 'Official certificate confirming student is currently enrolled in this school.',
      fn: 'printBonafide'
    },
    {
      id: 'character',
      title: 'Character Certificate',
      icon: 'fa-award',
      color: '#C4893A',
      desc: 'Certificate of good conduct and character issued by the school.',
      fn: 'printCharacterCert'
    }
  ];

  const content = `
    ${renderChildPill(child)}
    ${renderChildSelector(child)}
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${docs.map(function(doc) {
        return `<div style="border:2px solid ${doc.color}30;border-radius:16px;padding:24px;background:#fff;text-align:center">
          <div style="width:56px;height:56px;border-radius:16px;background:${doc.color}15;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
            <i class="fas ${doc.icon}" style="color:${doc.color};font-size:24px"></i>
          </div>
          <div style="font-size:17px;font-weight:800;color:#0F1E3D;margin-bottom:8px">${doc.title}</div>
          <div style="font-size:13px;color:#6B7A9D;margin-bottom:18px;line-height:1.5">${doc.desc}</div>
          <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="${doc.fn}('${child.id}')">
            <i class="fas fa-print" style="margin-right:6px"></i> Download / Print
          </button>
        </div>`;
      }).join('')}
    </div>`;

  renderLayout('parent-documents', content, 'Documents', child.name);
}

window.printAdmitCard = function(childId) {
  const child = DB.getStudent(childId);
  if (!child) return;
  const meta = DB.getMeta();
  const cls = DB.getClass(child.classId);
  const exams = DB.getExams(child.classId);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Admit Card – ${child.name}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:24px;color:#0F1E3D;background:#fff}
  .hdr{background:#0F2050;color:#fff;padding:18px 22px;border-radius:10px 10px 0 0;display:flex;align-items:center;gap:14px;margin-bottom:0}
  .logo{width:56px;height:56px;border-radius:50%;border:2px solid #E8B020;background:#fff;object-fit:contain}
  .school-name{font-size:19px;font-weight:900}.school-sub{font-size:10px;color:#90C4E0}
  .gold-bar{height:4px;background:#E8B020;margin-bottom:0}
  .doc-title{background:#E8B020;color:#0F1E3D;text-align:center;padding:9px;font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;border:1px solid #DCE1EF;border-radius:8px;padding:14px;background:#F8F9FB}
  .field label{font-size:10px;color:#6B7A9D;text-transform:uppercase;letter-spacing:.04em}
  .field .val{font-size:13px;font-weight:700;margin-top:3px}
  .photo-box{width:80px;height:96px;border:2px dashed #DCE1EF;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;text-align:center;margin-left:auto}
  table{width:100%;border-collapse:collapse;border:1px solid #DCE1EF;border-radius:8px;overflow:hidden;margin-bottom:14px}
  th{background:#0F2050;color:#fff;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;text-align:left}
  td{padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:12px}
  .notice{background:#FEF7E0;border:1px solid #E8B020;border-radius:6px;padding:10px;font-size:11px;color:#9A6A00;margin-bottom:14px}
  .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .sig-line{height:44px;border-bottom:1.5px solid #0F1E3D;margin-bottom:6px}
  .sig-label{font-size:11px;font-weight:700;text-align:center}
  .footer{font-size:10px;color:#6B7A9D;text-align:center;border-top:1px solid #DCE1EF;padding-top:10px;margin-top:14px}
  @media print{body{padding:6px}.no-print{display:none}}</style></head><body>
  <div class="hdr">
    <img src="${meta.schoolLogo || '/static/school-logo.png'}" class="logo" onerror="this.style.background='#1e3a6b'"/>
    <div><div class="school-name">${meta.schoolName}</div><div class="school-sub">${meta.schoolAddress || ''}</div></div>
    <div class="photo-box" style="margin-left:auto">Photo<br>Here</div>
  </div>
  <div class="gold-bar"></div>
  <div class="doc-title">Admit Card – ${getAcademicYear ? getAcademicYear() : '2025-26'}</div>
  <div class="info-grid">
    <div class="field"><label>Student Name</label><div class="val">${child.name}</div></div>
    <div class="field"><label>Roll No.</label><div class="val">${child.rollNo}</div></div>
    <div class="field"><label>Class</label><div class="val">${cls ? cls.name : '-'}</div></div>
    <div class="field"><label>Date of Birth</label><div class="val">${new Date(child.dob).toLocaleDateString('en-IN')}</div></div>
    <div class="field"><label>Gender</label><div class="val">${child.gender}</div></div>
    <div class="field"><label>Blood Group</label><div class="val">${child.bloodGroup || '-'}</div></div>
  </div>
  ${exams.length ? `
  <table>
    <thead><tr><th>Subject</th><th>Exam</th><th>Date</th><th>Day</th><th>Time</th><th>Duration</th><th>Venue</th></tr></thead>
    <tbody>${exams.map(function(e){ const d=new Date(e.date); return `<tr><td><strong>${e.subject}</strong></td><td>${e.examName}</td><td>${d.toLocaleDateString('en-IN')}</td><td>${d.toLocaleDateString('en-US',{weekday:'short'})}</td><td>${e.time}</td><td>${e.duration}</td><td>${e.venue}</td></tr>`; }).join('')}</tbody>
  </table>` : '<p style="color:#6B7A9D;text-align:center;margin-bottom:14px">No exam schedule available.</p>'}
  <div class="notice"><strong>Instructions:</strong> Bring this admit card on all examination days. No candidate will be allowed without the admit card. Mobile phones are strictly prohibited in exam halls.</div>
  <div class="sig-row">
    <div><div class="sig-line"></div><div class="sig-label">Student's Signature</div></div>
    <div><div class="sig-line"></div><div class="sig-label">Principal's Signature</div></div>
  </div>
  <div class="footer">${meta.schoolName} &bull; ${meta.schoolAddress || ''}<br>This is a computer-generated admit card.</div>
  <script>window.onload=function(){window.print();};<\/script></body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('Please allow popups to print', 'warning');
};

window.printBonafide = function(childId) {
  const child = DB.getStudent(childId);
  if (!child) return;
  const meta = DB.getMeta();
  const cls = DB.getClass(child.classId);
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Bonafide Certificate</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:30px;color:#0F1E3D;background:#fff}
  .hdr{background:#0F2050;color:#fff;padding:18px 22px;border-radius:10px 10px 0 0;display:flex;align-items:center;gap:14px;margin-bottom:0}
  .logo{width:60px;height:60px;border-radius:50%;border:2px solid #E8B020;background:#fff;object-fit:contain}
  .school-name{font-size:20px;font-weight:900}.school-sub{font-size:10px;color:#90C4E0}
  .gold-bar{height:4px;background:#E8B020;margin-bottom:20px}
  .doc-title{text-align:center;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:20px;border-bottom:2px solid #0F2050;padding-bottom:10px}
  .body{font-size:14px;line-height:2;color:#0F1E3D;margin-bottom:20px}
  .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px}
  .sig-line{height:50px;border-bottom:1.5px solid #0F1E3D;margin-bottom:6px}
  .sig-label{font-size:12px;font-weight:700;text-align:center}
  .footer{font-size:10px;color:#6B7A9D;text-align:center;border-top:1px solid #DCE1EF;padding-top:10px;margin-top:20px}
  .seal{width:90px;height:90px;border-radius:50%;border:2px dashed #DCE1EF;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;text-align:center;margin-left:auto}
  @media print{body{padding:10px}}</style></head><body>
  <div class="hdr">
    <img src="${meta.schoolLogo || '/static/school-logo.png'}" class="logo" onerror="this.style.background='#1e3a6b'"/>
    <div><div class="school-name">${meta.schoolName}</div><div class="school-sub">${meta.schoolAddress || ''}</div></div>
  </div>
  <div class="gold-bar"></div>
  <div class="doc-title">Bonafide Certificate</div>
  <p class="body">
    This is to certify that <strong>${child.name}</strong>, son/daughter of (Parent/Guardian), bearing Roll No. <strong>${child.rollNo}</strong>,
    Date of Birth <strong>${new Date(child.dob).toLocaleDateString('en-IN')}</strong>, is a <em>bonafide student</em> of
    <strong>${meta.schoolName}</strong>, currently enrolled in <strong>${cls ? cls.name : '—'}</strong> for the academic year
    <strong>${getAcademicYear ? getAcademicYear() : '2025-26'}</strong>.<br/><br/>
    The student has been studying in this institution since <strong>${formatDate(child.joinDate)}</strong> and bears a
    good academic and conduct record as per the school's records.<br/><br/>
    This certificate is issued on the request of the student/parent for <em>general purposes</em>.
  </p>
  <p>Date: <strong>${today}</strong></p>
  <div class="sig-row">
    <div><div class="sig-line"></div><div class="sig-label">Class Teacher</div></div>
    <div style="text-align:right"><div class="seal">SCHOOL<br>SEAL</div><div class="sig-line" style="margin-top:8px"></div><div class="sig-label">Principal</div></div>
  </div>
  <div class="footer">${meta.schoolName} &bull; ${meta.schoolAddress || ''}<br>This is a computer-generated certificate.</div>
  <script>window.onload=function(){window.print();};<\/script></body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('Please allow popups to print', 'warning');
};

window.printCharacterCert = function(childId) {
  const child = DB.getStudent(childId);
  if (!child) return;
  const meta = DB.getMeta();
  const cls = DB.getClass(child.classId);
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Character Certificate</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:30px;color:#0F1E3D;background:#fff}
  .hdr{background:#0F2050;color:#fff;padding:18px 22px;border-radius:10px 10px 0 0;display:flex;align-items:center;gap:14px}
  .logo{width:60px;height:60px;border-radius:50%;border:2px solid #E8B020;background:#fff;object-fit:contain}
  .school-name{font-size:20px;font-weight:900}.school-sub{font-size:10px;color:#90C4E0}
  .gold-bar{height:4px;background:#C4893A;margin-bottom:20px}
  .doc-title{text-align:center;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:20px;border-bottom:2px solid #C4893A;padding-bottom:10px;color:#C4893A}
  .body{font-size:14px;line-height:2;color:#0F1E3D;margin-bottom:20px}
  .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px}
  .sig-line{height:50px;border-bottom:1.5px solid #0F1E3D;margin-bottom:6px}
  .sig-label{font-size:12px;font-weight:700;text-align:center}
  .footer{font-size:10px;color:#6B7A9D;text-align:center;border-top:1px solid #DCE1EF;padding-top:10px;margin-top:20px}
  .seal{width:90px;height:90px;border-radius:50%;border:2px dashed #DCE1EF;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;text-align:center;margin-left:auto}
  @media print{body{padding:10px}}</style></head><body>
  <div class="hdr">
    <img src="${meta.schoolLogo || '/static/school-logo.png'}" class="logo" onerror="this.style.background='#1e3a6b'"/>
    <div><div class="school-name">${meta.schoolName}</div><div class="school-sub">${meta.schoolAddress || ''}</div></div>
  </div>
  <div class="gold-bar"></div>
  <div class="doc-title">Character Certificate</div>
  <p class="body">
    This is to certify that <strong>${child.name}</strong>, Roll No. <strong>${child.rollNo}</strong>, studied in
    <strong>${cls ? cls.name : '—'}</strong> at <strong>${meta.schoolName}</strong> during the academic year
    <strong>${getAcademicYear ? getAcademicYear() : '2025-26'}</strong>.<br/><br/>
    To the best of our knowledge, the character and conduct of the student has been <strong>satisfactory</strong>.
    He/She has been a sincere, disciplined, and well-behaved student throughout their association with this institution.
    We wish him/her all the best in future endeavours.<br/><br/>
    This certificate is issued at the request of the parent/student for <em>bonafide purposes</em>.
  </p>
  <p>Date: <strong>${today}</strong></p>
  <div class="sig-row">
    <div><div class="sig-line"></div><div class="sig-label">Class Teacher</div></div>
    <div style="text-align:right"><div class="seal">SCHOOL<br>SEAL</div><div class="sig-line" style="margin-top:8px"></div><div class="sig-label">Principal</div></div>
  </div>
  <div class="footer">${meta.schoolName} &bull; ${meta.schoolAddress || ''}<br>This is a computer-generated certificate.</div>
  <script>window.onload=function(){window.print();};<\/script></body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
  else showToast('Please allow popups to print', 'warning');
};

// ---- Notifications ----
function renderParentNotifications() {
  currentParentTab = 'parent-notifications';
  const user = Session.current();
  const fullUser = DB.getUser(user.id) || user;
  const prefs = fullUser.notifPrefs || {};

  const notifTypes = [
    { key: 'announcements', label: 'Announcements', desc: 'School-wide and class announcements', icon: 'fa-bullhorn', color: '#E8B020' },
    { key: 'leaveUpdates', label: 'Leave Updates', desc: 'Status updates on leave applications', icon: 'fa-calendar-times', color: '#1AA6CA' },
    { key: 'gradeReports', label: 'Grade Reports', desc: 'New grades and report cards', icon: 'fa-star', color: '#C4893A' },
    { key: 'events', label: 'School Events', desc: 'Upcoming events and reminders', icon: 'fa-calendar-alt', color: '#10b981' },
    { key: 'messages', label: 'Messages', desc: 'New messages from teachers', icon: 'fa-comment-dots', color: '#0F2050' },
    { key: 'feeReminders', label: 'Fee Reminders', desc: 'Fee due dates and payment reminders', icon: 'fa-rupee-sign', color: '#ef4444' },
  ];

  const content = `
    <div style="max-width:600px;margin:0 auto">
      <div class="card">
        <div class="card-title" style="margin-bottom:6px"><i class="fas fa-bell" style="color:#E8B020"></i> Notification Preferences</div>
        <p style="color:#6B7A9D;font-size:13px;margin-bottom:20px">Choose which notifications you want to receive from the school.</p>
        ${notifTypes.map(function(n) {
          const isOn = prefs[n.key] !== false;
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f1f5f9">
            <div style="display:flex;align-items:center;gap:14px">
              <div style="width:40px;height:40px;border-radius:12px;background:${n.color}15;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="fas ${n.icon}" style="color:${n.color}"></i>
              </div>
              <div>
                <div style="font-weight:700;font-size:14px">${n.label}</div>
                <div style="font-size:12px;color:#6B7A9D">${n.desc}</div>
              </div>
            </div>
            <label style="position:relative;display:inline-block;width:46px;height:26px;flex-shrink:0;cursor:pointer">
              <input type="checkbox" id="notif-${n.key}" ${isOn ? 'checked' : ''} style="opacity:0;width:0;height:0;position:absolute"/>
              <span onclick="toggleNotifPref('${n.key}')" style="position:absolute;inset:0;border-radius:13px;background:${isOn ? '#1AA6CA' : '#DCE1EF'};transition:background 0.2s;cursor:pointer" id="notif-slider-${n.key}">
                <span style="position:absolute;top:3px;left:${isOn ? '23px' : '3px'};width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.2);transition:left 0.2s" id="notif-knob-${n.key}"></span>
              </span>
            </label>
          </div>`;
        }).join('')}
        <div style="margin-top:20px">
          <button class="btn btn-primary" onclick="saveNotifPrefs()"><i class="fas fa-save"></i> Save Preferences</button>
        </div>
      </div>
    </div>`;

  renderLayout('parent-notifications', content, 'Notification Preferences', user.name);
}

window.toggleNotifPref = function(key) {
  const cb = document.getElementById('notif-' + key);
  const slider = document.getElementById('notif-slider-' + key);
  const knob = document.getElementById('notif-knob-' + key);
  if (!cb) return;
  cb.checked = !cb.checked;
  if (slider) slider.style.background = cb.checked ? '#1AA6CA' : '#DCE1EF';
  if (knob) knob.style.left = cb.checked ? '23px' : '3px';
};

window.saveNotifPrefs = function() {
  const user = Session.current();
  const keys = ['announcements','leaveUpdates','gradeReports','events','messages','feeReminders'];
  const prefs = {};
  keys.forEach(function(k) {
    const cb = document.getElementById('notif-' + k);
    prefs[k] = cb ? cb.checked : true;
  });
  DB.updateUser(user.id, { notifPrefs: prefs });
  showToast('Notification preferences saved!', 'success');
};

// ---- Fix: Message unread badges & mark read ----
// Override renderParentMessages to show unread badges and mark messages as read on open
function renderParentMessages() {
  currentParentTab = 'parent-messages';
  const user = Session.current();
  const children = getParentChildren();
  const data = DB.get();

  // Mark messages as read when chat is open
  if (parentMsgTeacherId) {
    var changed = false;
    data.messages.forEach(function(m) {
      if (m.from === parentMsgTeacherId && m.to === user.id && !m.read) {
        m.read = true;
        changed = true;
      }
    });
    if (changed) DB.commit();
  }

  const teachers = [];
  children.forEach(function(child) {
    const teacher = child.classId ? DB.getClassTeacher(child.classId) : null;
    if (teacher && !teachers.find(function(t) { return t.id === teacher.id; })) teachers.push(teacher);
  });

  const myMsgs = data.messages.filter(function(m) { return m.from === user.id || m.to === user.id; });

  const content = `
    <div class="grid-2" style="height:600px">
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:16px;border-bottom:1px solid #DCE1EF;font-weight:700">Your Teachers</div>
        <div style="overflow-y:auto;height:calc(100% - 56px)">
          ${teachers.map(function(t) {
            const tMsgs = myMsgs.filter(function(m) { return m.from === t.id || m.to === t.id; });
            const lastMsg = tMsgs[tMsgs.length - 1];
            const unread = tMsgs.filter(function(m) { return m.from === t.id && m.to === user.id && !m.read; }).length;
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
              ${unread ? `<span class="badge badge-red" style="flex-shrink:0">${unread}</span>` : ''}
              <button class="btn btn-whatsapp btn-xs" onclick="event.stopPropagation();wa('${t.phone}','Hello ${t.name}, I am ${user.name}, parent of my child. I wanted to discuss their progress.')">
                <i class="fab fa-whatsapp"></i>
              </button>
            </div>`;
          }).join('')}
          ${!teachers.length ? '<div class="empty-state" style="padding:30px"><i class="fas fa-chalkboard-teacher"></i><h3>No teachers found</h3><p>Your children\'s class teachers will appear here</p></div>' : ''}
        </div>
      </div>

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

// ---- Meal Menu ----
function renderParentMeals() {
  currentParentTab = 'parent-meals';
  const child = getSelectedChild();
  if (!child) { renderParentHome(); return; }

  const today = new Date();
  const dow = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const weekKey = window._parentMealWeek || startOfWeek.toISOString().split('T')[0];
  const menuData = DB.getMealMenu ? (DB.getMealMenu(weekKey) || {}) : {};

  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const meals = ['Breakfast','Lunch','Snack'];
  const mealIcons = { Breakfast: 'fa-sun', Lunch: 'fa-utensils', Snack: 'fa-apple-alt' };
  const mealColors = { Breakfast: '#E8B020', Lunch: '#1AA6CA', Snack: '#10b981' };

  function fmtWeek(wk) {
    const d = new Date(wk);
    const end = new Date(d); end.setDate(d.getDate() + 4);
    const opts = { month:'short', day:'numeric' };
    return d.toLocaleDateString('en-IN', opts) + ' – ' + end.toLocaleDateString('en-IN', opts);
  }
  function prevWeek(wk) { const d = new Date(wk); d.setDate(d.getDate()-7); return d.toISOString().split('T')[0]; }
  function nextWeek(wk) { const d = new Date(wk); d.setDate(d.getDate()+7); return d.toISOString().split('T')[0]; }

  const todayDayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][today.getDay()];

  const dayCards = days.map(function(day) {
    const isToday = day === todayDayName && weekKey === startOfWeek.toISOString().split('T')[0];
    const dayMenu = menuData[day] || {};
    const hasMeals = meals.some(function(m){return dayMenu[m];});
    return `<div style="border:2px solid ${isToday?'#1AA6CA':'#DCE1EF'};border-radius:14px;padding:16px;background:${isToday?'#EFF9FF':'#fff'}">
      <div style="font-size:13px;font-weight:800;color:${isToday?'#1AA6CA':'#0F1E3D'};margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
        ${day}
        ${isToday?'<span style="background:#1AA6CA;color:#fff;font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700">TODAY</span>':''}
      </div>
      ${hasMeals
        ? meals.map(function(meal) {
            const val = dayMenu[meal];
            if (!val) return '';
            return `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
              <div style="width:24px;height:24px;border-radius:50%;background:${mealColors[meal]}22;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="fas ${mealIcons[meal]}" style="color:${mealColors[meal]};font-size:11px"></i>
              </div>
              <div><div style="font-size:10px;font-weight:700;color:${mealColors[meal]};text-transform:uppercase">${meal}</div>
              <div style="font-size:12px;color:#374151;margin-top:1px">${val}</div></div>
            </div>`;
          }).join('')
        : '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:16px 0"><i class="fas fa-utensils" style="display:block;font-size:18px;margin-bottom:6px;opacity:0.3"></i>Menu not set</div>'
      }
    </div>`;
  }).join('');

  const content = `
    ${renderChildPill(child)}
    ${renderChildSelector(child)}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <h2 style="margin:0;font-size:18px;font-weight:900;color:#0F1E3D">Weekly Meal Menu</h2>
        <div style="font-size:12px;color:#6B7A9D;margin-top:2px">Week of ${fmtWeek(weekKey)}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="window._parentMealWeek='${prevWeek(weekKey)}';renderParentMeals()"><i class="fas fa-chevron-left"></i> Prev</button>
        <button class="btn btn-secondary btn-sm" onclick="window._parentMealWeek='${nextWeek(weekKey)}';renderParentMeals()">Next <i class="fas fa-chevron-right"></i></button>
      </div>
    </div>
    ${menuData._instructions ? `
    <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #f59e0b44;border-radius:14px;padding:16px 20px;margin-bottom:16px;display:flex;gap:14px;align-items:flex-start">
      <div style="width:36px;height:36px;background:#f59e0b22;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas fa-sticky-note" style="color:#d97706;font-size:16px"></i>
      </div>
      <div>
        <div style="font-size:12px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Special Instructions from School</div>
        <div style="font-size:13px;color:#78350f;line-height:1.6">${menuData._instructions.replace(/\n/g,'<br>')}</div>
      </div>
    </div>` : ''}
    ${Object.keys(menuData).filter(k => k !== '_instructions').length === 0
      ? '<div class="empty-state"><i class="fas fa-utensils"></i><h3>No meal menu available for this week</h3><p>Please check back later or contact the school.</p></div>'
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px">${dayCards}</div>`
    }`;

  renderLayout('parent-meals', content, 'Meal Menu', child.name);
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
registerRoute('parent-review', renderParentReview);
registerRoute('parent-holidays', renderParentHolidays);
registerRoute('parent-profile', renderParentProfile);
registerRoute('parent-fees', renderParentFees);
registerRoute('parent-homework', renderParentHomework);
registerRoute('parent-achievements', renderParentAchievements);
registerRoute('parent-exams', renderParentExams);
registerRoute('parent-health', renderParentHealth);
registerRoute('parent-contacts', renderParentContacts);
registerRoute('parent-ptm', renderParentPTM);
registerRoute('parent-grievance', renderParentGrievance);
registerRoute('parent-conduct', renderParentConduct);
registerRoute('parent-documents', renderParentDocuments);
registerRoute('parent-notifications', renderParentNotifications);
registerRoute('parent-meals', renderParentMeals);
