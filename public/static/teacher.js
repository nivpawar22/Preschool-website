// ============================================================
// Teacher Self-Account Module
// Role: subadmin (Class Teacher)
// ============================================================

// ---- My Profile ----
function renderTeacherProfile() {
  const user = Session.current();
  if (!user || user.role !== 'subadmin') { renderLogin(); return; }

  const data = DB.get();
  const myClass = (data.classes || []).find(function(c) { return c.teacherId === user.id; });

  const content = `
    <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start;flex-wrap:wrap">
      <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);text-align:center">
        <div style="width:80px;height:80px;border-radius:50%;background:${user.avatar||'#10b981'};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;font-weight:900;color:#fff">
          ${(user.name||'T').charAt(0).toUpperCase()}
        </div>
        <div style="font-size:18px;font-weight:800;color:#0F2050;margin-bottom:4px">${user.name||''}</div>
        <div style="font-size:13px;color:#10b981;font-weight:700;margin-bottom:8px">${user.designation||'Class Teacher'}</div>
        ${user.employeeId ? `<div style="font-size:12px;color:#64748b;margin-bottom:4px">EMP ID: <strong>${user.employeeId}</strong></div>` : ''}
        ${user.department ? `<div style="font-size:12px;color:#64748b;margin-bottom:4px">Dept: ${user.department}</div>` : ''}
        ${user.qualification ? `<div style="font-size:12px;color:#64748b;margin-bottom:4px">Qualification: ${user.qualification}</div>` : ''}
        ${user.joiningDate ? `<div style="font-size:12px;color:#64748b;margin-bottom:4px">Joined: ${formatDate(user.joiningDate)}</div>` : ''}
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;margin-bottom:8px">Login</div>
          <code style="background:#f1f5f9;padding:4px 10px;border-radius:6px;font-size:12px;color:#475569">${user.username||''}</code>
        </div>
        ${myClass ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;margin-bottom:8px">My Class</div>
          <div style="font-size:14px;font-weight:800;color:#0F2050">${myClass.name}</div>
          <div style="font-size:12px;color:#64748b">Capacity: ${myClass.capacity} • Subjects: ${(myClass.subjects||[]).length}</div>
        </div>` : ''}
      </div>

      <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <h3 style="font-size:15px;font-weight:800;margin:0 0 20px;color:#0F2050">
          <i class="fas fa-edit" style="color:#10b981;margin-right:8px"></i>Edit My Profile
        </h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <label class="form-label">Full Name</label>
            <input id="tp-name" class="form-control" type="text" value="${escHtml(user.name||'')}"/>
          </div>
          <div>
            <label class="form-label">Phone</label>
            <input id="tp-phone" class="form-control" type="text" value="${escHtml(user.phone||'')}"/>
          </div>
          <div>
            <label class="form-label">Email</label>
            <input id="tp-email" class="form-control" type="email" value="${escHtml(user.email||'')}"/>
          </div>
          <div>
            <label class="form-label">Designation</label>
            <input id="tp-designation" class="form-control" type="text" value="${escHtml(user.designation||'Class Teacher')}" placeholder="e.g. Head Teacher"/>
          </div>
          <div>
            <label class="form-label">Qualification</label>
            <input id="tp-qualification" class="form-control" type="text" value="${escHtml(user.qualification||'')}" placeholder="e.g. B.Ed, M.Ed"/>
          </div>
          <div>
            <label class="form-label">Joining Date</label>
            <input id="tp-joining" class="form-control" type="date" value="${user.joiningDate||''}"/>
          </div>
          <div>
            <label class="form-label">Employee ID</label>
            <input id="tp-empid" class="form-control" type="text" value="${escHtml(user.employeeId||'')}" placeholder="e.g. EMP-001"/>
          </div>
          <div>
            <label class="form-label">Department</label>
            <input id="tp-dept" class="form-control" type="text" value="${escHtml(user.department||'')}" placeholder="e.g. Primary"/>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Residential Address</label>
            <textarea id="tp-address" class="form-control" rows="2" placeholder="Home address">${escHtml(user.address||'')}</textarea>
          </div>
          <div>
            <label class="form-label">Emergency Contact Name</label>
            <input id="tp-ecname" class="form-control" type="text" value="${escHtml(user.emergencyContactName||'')}" placeholder="Name"/>
          </div>
          <div>
            <label class="form-label">Emergency Contact Phone</label>
            <input id="tp-ecphone" class="form-control" type="text" value="${escHtml(user.emergencyContactPhone||'')}" placeholder="+91 9XXXXXXXXX"/>
          </div>
          <div>
            <label class="form-label">Bank Account No.</label>
            <input id="tp-bank" class="form-control" type="text" value="${escHtml(user.bankAccount||'')}" placeholder="XXXX XXXX XXXX"/>
          </div>
          <div>
            <label class="form-label">Bank IFSC Code</label>
            <input id="tp-ifsc" class="form-control" type="text" value="${escHtml(user.ifsc||'')}" placeholder="e.g. HDFC0001234"/>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">New Password <span style="font-weight:400;color:#94a3b8">(leave blank to keep current)</span></label>
            <input id="tp-newpass" class="form-control" type="password" placeholder="New password"/>
          </div>
        </div>
        <div style="margin-top:20px;text-align:right">
          <button class="btn btn-primary" onclick="saveTeacherProfile()">
            <i class="fas fa-save"></i> Save Profile
          </button>
        </div>
      </div>
    </div>`;

  renderLayout('teacher-profile', content, 'My Profile', 'My Account / Profile');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.saveTeacherProfile = function() {
  const user = Session.current();
  if (!user) return;
  const updates = {
    name: (document.getElementById('tp-name').value || '').trim() || user.name,
    phone: (document.getElementById('tp-phone').value || '').trim(),
    email: (document.getElementById('tp-email').value || '').trim(),
    designation: (document.getElementById('tp-designation').value || '').trim(),
    qualification: (document.getElementById('tp-qualification').value || '').trim(),
    joiningDate: document.getElementById('tp-joining').value,
    employeeId: (document.getElementById('tp-empid').value || '').trim(),
    department: (document.getElementById('tp-dept').value || '').trim(),
    address: (document.getElementById('tp-address').value || '').trim(),
    emergencyContactName: (document.getElementById('tp-ecname').value || '').trim(),
    emergencyContactPhone: (document.getElementById('tp-ecphone').value || '').trim(),
    bankAccount: (document.getElementById('tp-bank').value || '').trim(),
    ifsc: (document.getElementById('tp-ifsc').value || '').trim(),
  };
  const newPass = (document.getElementById('tp-newpass').value || '').trim();
  if (newPass) updates.password = newPass;
  DB.updateUser(user.id, updates);
  showToast('Profile updated!', 'success');
  renderTeacherProfile();
};

// ---- My Attendance ----
function renderTeacherAttendance() {
  const user = Session.current();
  if (!user || user.role !== 'subadmin') { renderLogin(); return; }

  const now = new Date();
  const selMonth = window._tAttMonth || now.toISOString().slice(0, 7);
  const parts = selMonth.split('-');
  const selYear = parseInt(parts[0]);
  const selMon = parseInt(parts[1]);

  const records = DB.getStaffAttendance(user.id, selMonth);
  const recordMap = {};
  records.forEach(function(r) { recordMap[r.date] = r; });

  const todayStr = now.toISOString().split('T')[0];
  const todayRec = recordMap[todayStr];

  const present = records.filter(function(r) { return r.status === 'Present'; }).length;
  const absent = records.filter(function(r) { return r.status === 'Absent'; }).length;
  const halfDay = records.filter(function(r) { return r.status === 'Half-Day'; }).length;
  const onLeave = records.filter(function(r) { return r.status === 'On-Leave'; }).length;
  const workingDays = present + absent + halfDay + onLeave;

  const firstDay = new Date(selYear, selMon - 1, 1).getDay();
  const daysInMonth = new Date(selYear, selMon, 0).getDate();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let calCells = dayNames.map(function(d) {
    return '<div style="text-align:center;font-size:11px;font-weight:700;color:#64748b;padding:6px 0">' + d + '</div>';
  }).join('');
  for (var i = 0; i < firstDay; i++) calCells += '<div></div>';
  const statusColors = { Present: '#d1fae5', Absent: '#fee2e2', 'Half-Day': '#fef3c7', 'On-Leave': '#dbeafe' };
  const statusTextC = { Present: '#065f46', Absent: '#991b1b', 'Half-Day': '#92400e', 'On-Leave': '#1e40af' };
  for (var d = 1; d <= daysInMonth; d++) {
    const dateStr = selYear + '-' + String(selMon).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const rec = recordMap[dateStr];
    const isToday = dateStr === todayStr;
    const dow = new Date(selYear, selMon-1, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const bg = rec ? (statusColors[rec.status] || '#f8fafc') : (isWeekend ? '#f1f5f9' : '#fff');
    const textColor = rec ? (statusTextC[rec.status] || '#374151') : (isWeekend ? '#94a3b8' : '#374151');
    const shortLabel = rec ? (rec.status === 'Half-Day' ? 'H/D' : rec.status === 'On-Leave' ? 'OL' : rec.status.slice(0,3).toUpperCase()) : '';
    calCells += '<div style="border-radius:8px;padding:5px 4px;min-height:38px;background:' + bg + ';text-align:center;border:' + (isToday ? '2px solid #10b981' : '1px solid #e2e8f0') + '">' +
      '<div style="font-size:13px;font-weight:' + (isToday?'900':'600') + ';color:' + textColor + '">' + d + '</div>' +
      (shortLabel ? '<div style="font-size:9px;font-weight:700;color:' + textColor + '">' + shortLabel + '</div>' : '') +
      '</div>';
  }

  const prevMonth = new Date(selYear, selMon - 2, 1).toISOString().slice(0, 7);
  const nextMonth = new Date(selYear, selMon, 1).toISOString().slice(0, 7);
  const canCheckIn = !todayRec || !todayRec.inTime;
  const canCheckOut = todayRec && todayRec.inTime && !todayRec.outTime;

  const content = `
    <div>
      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:20px">
        <h3 style="font-size:15px;font-weight:800;margin:0 0 14px;color:#0F2050">
          <i class="fas fa-clock" style="color:#10b981;margin-right:8px"></i>Today — ${formatDate(todayStr)}
        </h3>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="display:flex;gap:20px;flex-wrap:wrap">
            ${todayRec
              ? `<div><div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase">Status</div><div style="font-size:16px;font-weight:800;color:${statusTextC[todayRec.status]||'#10b981'}">${todayRec.status}</div></div>
                 ${todayRec.inTime ? `<div><div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase">Check In</div><div style="font-size:16px;font-weight:800;color:#0F2050">${todayRec.inTime}</div></div>` : ''}
                 ${todayRec.outTime ? `<div><div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase">Check Out</div><div style="font-size:16px;font-weight:800;color:#0F2050">${todayRec.outTime}</div></div>` : ''}`
              : '<span style="color:#94a3b8;font-size:14px">Not marked yet</span>'}
          </div>
          <div style="display:flex;gap:8px;margin-left:auto">
            ${canCheckIn ? '<button class="btn btn-primary" onclick="teacherCheckIn()"><i class="fas fa-sign-in-alt"></i> Check In</button>' : ''}
            ${canCheckOut ? '<button class="btn btn-success" onclick="teacherCheckOut()"><i class="fas fa-sign-out-alt"></i> Check Out</button>' : ''}
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${[['Present',present,'#d1fae5','#065f46','fa-check-circle'],['Absent',absent,'#fee2e2','#991b1b','fa-times-circle'],['Half-Day',halfDay,'#fef3c7','#92400e','fa-adjust'],['On-Leave',onLeave,'#dbeafe','#1e40af','fa-umbrella-beach']].map(function(item) {
          return '<div style="background:' + item[2] + ';border-radius:12px;padding:16px;text-align:center">' +
            '<div style="font-size:22px;font-weight:900;color:' + item[3] + '">' + item[1] + '</div>' +
            '<div style="font-size:11px;font-weight:700;color:' + item[3] + ';text-transform:uppercase;margin-top:2px">' + item[0] + '</div>' +
            '</div>';
        }).join('')}
      </div>

      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn btn-secondary btn-sm" onclick="teacherAttSetMonth('${prevMonth}')"><i class="fas fa-chevron-left"></i></button>
            <h3 style="font-size:15px;font-weight:800;margin:0;color:#0F2050;min-width:160px;text-align:center">${monthNames[selMon-1]} ${selYear}</h3>
            <button class="btn btn-secondary btn-sm" onclick="teacherAttSetMonth('${nextMonth}')"><i class="fas fa-chevron-right"></i></button>
          </div>
          <div style="font-size:12px;color:#64748b">Working days recorded: <strong>${workingDays}</strong></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
          ${calCells}
        </div>
        <div style="display:flex;gap:12px;margin-top:14px;flex-wrap:wrap">
          <span style="font-size:11px;font-weight:600;color:#065f46"><span style="background:#d1fae5;padding:2px 8px;border-radius:4px">P</span> Present</span>
          <span style="font-size:11px;font-weight:600;color:#991b1b"><span style="background:#fee2e2;padding:2px 8px;border-radius:4px">A</span> Absent</span>
          <span style="font-size:11px;font-weight:600;color:#92400e"><span style="background:#fef3c7;padding:2px 8px;border-radius:4px">H/D</span> Half-Day</span>
          <span style="font-size:11px;font-weight:600;color:#1e40af"><span style="background:#dbeafe;padding:2px 8px;border-radius:4px">OL</span> On-Leave</span>
        </div>
      </div>
    </div>`;

  renderLayout('teacher-attendance', content, 'My Attendance', 'My Account / Attendance');
}

window.teacherCheckIn = function() {
  const user = Session.current();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const inTime = now.toTimeString().slice(0, 5);
  const month = now.toISOString().slice(0, 7);
  const existing = DB.getStaffAttendance(user.id, month).find(function(r) { return r.date === todayStr; });
  if (existing) {
    DB.updateStaffAttendance(existing.id, { inTime: inTime, status: 'Present' });
  } else {
    DB.addStaffAttendance({
      id: 'sa_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      teacherId: user.id, date: todayStr, status: 'Present',
      inTime: inTime, outTime: '', notes: '',
      markedBy: user.id, createdAt: now.toISOString()
    });
  }
  showToast('Checked in at ' + inTime, 'success');
  renderTeacherAttendance();
};

window.teacherCheckOut = function() {
  const user = Session.current();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const outTime = now.toTimeString().slice(0, 5);
  const month = now.toISOString().slice(0, 7);
  const existing = DB.getStaffAttendance(user.id, month).find(function(r) { return r.date === todayStr; });
  if (existing) {
    DB.updateStaffAttendance(existing.id, { outTime: outTime });
    showToast('Checked out at ' + outTime, 'success');
    renderTeacherAttendance();
  }
};

window.teacherAttSetMonth = function(month) {
  window._tAttMonth = month;
  renderTeacherAttendance();
};

// ---- My Leaves ----
function renderTeacherLeaves() {
  const user = Session.current();
  if (!user || user.role !== 'subadmin') { renderLogin(); return; }

  const year = new Date().getFullYear().toString();
  const balance = DB.getLeaveBalance(user.id, year);
  const leaves = DB.getStaffLeaves(user.id);

  function statusBadge(s) {
    const map = { Pending: '#fef3c7:#92400e', Approved: '#d1fae5:#065f46', Rejected: '#fee2e2:#991b1b' };
    const p = (map[s] || '#f1f5f9:#475569').split(':');
    return '<span style="background:' + p[0] + ';color:' + p[1] + ';padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">' + s + '</span>';
  }

  const content = `
    <div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        ${balance.map(function(b) {
          var barColor = b.remaining > 3 ? '#10b981' : b.remaining > 0 ? '#f59e0b' : '#ef4444';
          var pct = Math.round((b.remaining / b.total) * 100);
          return '<div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-top:4px solid ' + barColor + '">' +
            '<div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:8px">' + b.type + ' Leave</div>' +
            '<div style="font-size:32px;font-weight:900;color:#0F2050">' + b.remaining + '</div>' +
            '<div style="font-size:12px;color:#94a3b8">of ' + b.total + ' days remaining</div>' +
            '<div style="background:#e2e8f0;border-radius:4px;height:6px;margin-top:10px;overflow:hidden">' +
              '<div style="background:' + barColor + ';height:100%;width:' + pct + '%;border-radius:4px;transition:width 0.3s"></div>' +
            '</div>' +
            '<div style="font-size:11px;color:#94a3b8;margin-top:4px">' + b.used + ' used this year</div>' +
            '</div>';
        }).join('')}
      </div>

      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">
          <h3 style="font-size:15px;font-weight:800;margin:0;color:#0F2050">
            <i class="fas fa-umbrella-beach" style="color:#1AA6CA;margin-right:8px"></i>My Leave Requests
            <span style="font-size:13px;font-weight:600;color:#64748b;margin-left:6px">(${leaves.length})</span>
          </h3>
          <button class="btn btn-primary" onclick="teacherApplyLeave()">
            <i class="fas fa-plus"></i> Apply for Leave
          </button>
        </div>
        ${leaves.length === 0
          ? '<div style="text-align:center;color:#94a3b8;padding:40px;font-size:14px"><i class="fas fa-umbrella-beach" style="display:block;font-size:36px;margin-bottom:12px"></i>No leave requests yet</div>'
          : '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
              '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">' +
                '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Type</th>' +
                '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">From</th>' +
                '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">To</th>' +
                '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Days</th>' +
                '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Reason</th>' +
                '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Status</th>' +
                '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Remarks</th>' +
                '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Action</th>' +
              '</tr></thead>' +
              '<tbody>' +
                leaves.map(function(l) {
                  return '<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'\'">' +
                    '<td style="padding:10px 12px"><span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">' + l.leaveType + '</span></td>' +
                    '<td style="padding:10px 12px;color:#475569">' + formatDate(l.fromDate) + '</td>' +
                    '<td style="padding:10px 12px;color:#475569">' + formatDate(l.toDate) + '</td>' +
                    '<td style="padding:10px 12px;text-align:center;font-weight:700;color:#374151">' + l.days + '</td>' +
                    '<td style="padding:10px 12px;color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escHtml(l.reason||'') + '">' + escHtml(l.reason||'') + '</td>' +
                    '<td style="padding:10px 12px;text-align:center">' + statusBadge(l.status) + '</td>' +
                    '<td style="padding:10px 12px;color:#64748b;font-size:12px">' + escHtml(l.remarks||'') + '</td>' +
                    '<td style="padding:10px 12px;text-align:center">' +
                      (l.status === 'Pending' ? '<button class="btn btn-danger btn-sm" onclick="teacherCancelLeave(\'' + l.id + '\')"><i class="fas fa-times"></i> Cancel</button>' : '') +
                    '</td>' +
                    '</tr>';
                }).join('') +
              '</tbody></table></div>'}
      </div>
    </div>`;

  renderLayout('teacher-leaves', content, 'My Leaves', 'My Account / Leaves');
}

window.teacherApplyLeave = function() {
  const today = new Date().toISOString().split('T')[0];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'teacher-leave-modal';
  overlay.innerHTML = `
    <div class="modal" style="max-width:480px;width:100%">
      <div class="modal-header">
        <h3 class="modal-title"><i class="fas fa-umbrella-beach" style="color:#1AA6CA;margin-right:8px"></i>Apply for Leave</h3>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('teacher-leave-modal').remove()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:24px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div style="grid-column:1/-1">
            <label class="form-label">Leave Type *</label>
            <select id="tl-type" class="form-control">
              ${DB.getLeaveTypeConfig().filter(function(lt){return lt.active;}).map(function(lt){return '<option value="'+lt.name+'">'+lt.name+' ('+lt.code+')</option>';}).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">From Date *</label>
            <input id="tl-from" class="form-control" type="date" value="${today}" onchange="teacherCalcDays()"/>
          </div>
          <div>
            <label class="form-label">To Date *</label>
            <input id="tl-to" class="form-control" type="date" value="${today}" onchange="teacherCalcDays()"/>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Number of Days</label>
            <input id="tl-days" class="form-control" type="text" readonly value="1" style="background:#f8fafc;font-weight:700;color:#0F2050"/>
          </div>
          <div style="grid-column:1/-1">
            <label class="form-label">Reason *</label>
            <textarea id="tl-reason" class="form-control" rows="3" placeholder="Please provide a reason for leave..."></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="padding:16px 24px;display:flex;justify-content:flex-end;gap:12px;border-top:1px solid #e2e8f0">
        <button class="btn btn-secondary" onclick="document.getElementById('teacher-leave-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="teacherSaveLeave()"><i class="fas fa-paper-plane"></i> Submit</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window.teacherCalcDays = function() {
  const from = document.getElementById('tl-from').value;
  const to = document.getElementById('tl-to').value;
  if (from && to) {
    const d1 = new Date(from), d2 = new Date(to);
    if (d2 >= d1) {
      const days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
      const el = document.getElementById('tl-days');
      if (el) el.value = days;
    }
  }
};

window.teacherSaveLeave = function() {
  const user = Session.current();
  const leaveType = document.getElementById('tl-type').value;
  const fromDate = document.getElementById('tl-from').value;
  const toDate = document.getElementById('tl-to').value;
  const days = parseInt(document.getElementById('tl-days').value) || 1;
  const reason = (document.getElementById('tl-reason').value || '').trim();

  if (!fromDate) { showToast('From date is required', 'error'); return; }
  if (!toDate || toDate < fromDate) { showToast('To date must be on or after from date', 'error'); return; }
  if (!reason) { showToast('Reason is required', 'error'); return; }

  DB.addStaffLeave({
    id: 'sl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    teacherId: user.id,
    leaveType: leaveType,
    fromDate: fromDate,
    toDate: toDate,
    days: days,
    reason: reason,
    status: 'Pending',
    approvedBy: '',
    remarks: '',
    createdAt: new Date().toISOString()
  });
  document.getElementById('teacher-leave-modal').remove();
  showToast('Leave application submitted!', 'success');
  renderTeacherLeaves();
};

window.teacherCancelLeave = function(id) {
  confirmDialog('Cancel this leave application?', function() {
    DB.deleteStaffLeave(id);
    showToast('Leave request cancelled', 'success');
    renderTeacherLeaves();
  });
};

// ---- Salary Slips ----
function renderTeacherSalary() {
  const user = Session.current();
  if (!user || user.role !== 'subadmin') { renderLogin(); return; }

  const payments = DB.getSalaryPayments(user.id);
  const thisYear = new Date().getFullYear().toString();
  const yearTotal = payments
    .filter(function(p) { return (p.month || '').startsWith(thisYear); })
    .reduce(function(s, p) { return s + (parseFloat(p.netAmount) || 0); }, 0);

  function formatMonth(m) {
    if (!m) return '-';
    const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const parts = m.split('-');
    return (names[parseInt(parts[1])-1] || parts[1]) + ' ' + parts[0];
  }

  function statusBadge(s) {
    return s === 'Paid'
      ? '<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">PAID</span>'
      : '<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">PENDING</span>';
  }

  const content = `
    <div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #10b981">
          <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">Total Paid ${thisYear}</div>
          <div style="font-size:24px;font-weight:900;color:#0F2050">₹${yearTotal.toLocaleString('en-IN')}</div>
        </div>
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #8b5cf6">
          <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">Salary Slips</div>
          <div style="font-size:24px;font-weight:900;color:#0F2050">${payments.length}</div>
        </div>
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #f59e0b">
          <div style="font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">Monthly Salary</div>
          <div style="font-size:24px;font-weight:900;color:#0F2050">₹${parseFloat(user.baseSalary||0).toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <h3 style="font-size:15px;font-weight:800;margin:0 0 16px;color:#0F2050">
          <i class="fas fa-money-check-alt" style="color:#10b981;margin-right:8px"></i>Salary Slips
        </h3>
        ${payments.length === 0
          ? '<div style="text-align:center;color:#94a3b8;padding:40px;font-size:14px"><i class="fas fa-money-check-alt" style="display:block;font-size:36px;margin-bottom:12px"></i>No salary slips yet.<br><span style="font-size:13px">Your accounting department will add slips once salary is processed.</span></div>'
          : '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
              '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">' +
                '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Month</th>' +
                '<th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Basic</th>' +
                '<th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">+Allow</th>' +
                '<th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">-Deduct</th>' +
                '<th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Net Pay</th>' +
                '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Mode</th>' +
                '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Status</th>' +
                '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Actions</th>' +
              '</tr></thead>' +
              '<tbody>' +
                payments.map(function(p) {
                  return '<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'\'">' +
                    '<td style="padding:10px 12px;font-weight:700;color:#374151">' + formatMonth(p.month) + '</td>' +
                    '<td style="padding:10px 12px;text-align:right;color:#374151">₹' + parseFloat(p.baseSalary||0).toLocaleString('en-IN') + '</td>' +
                    '<td style="padding:10px 12px;text-align:right;color:#10b981">+₹' + parseFloat(p.allowances||0).toLocaleString('en-IN') + '</td>' +
                    '<td style="padding:10px 12px;text-align:right;color:#ef4444">-₹' + parseFloat(p.deductions||0).toLocaleString('en-IN') + '</td>' +
                    '<td style="padding:10px 12px;text-align:right;font-weight:800;color:#0F2050;font-size:14px">₹' + parseFloat(p.netAmount||0).toLocaleString('en-IN') + '</td>' +
                    '<td style="padding:10px 12px"><span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600">' + (p.paymentMode||'Bank Transfer') + '</span></td>' +
                    '<td style="padding:10px 12px;text-align:center">' + statusBadge(p.status) + '</td>' +
                    '<td style="padding:10px 12px;text-align:center;display:flex;gap:4px;justify-content:center">' +
                      '<button class="btn btn-secondary btn-sm" onclick="teacherViewSlip(\'' + p.id + '\')"><i class="fas fa-eye"></i></button>' +
                      '<button class="btn btn-secondary btn-sm" onclick="teacherPrintSlip(\'' + p.id + '\')"><i class="fas fa-print"></i></button>' +
                    '</td>' +
                    '</tr>';
                }).join('') +
              '</tbody></table></div>'}
      </div>
    </div>`;

  renderLayout('teacher-salary', content, 'Salary Slips', 'My Account / Salary');
}

window.teacherViewSlip = function(id) {
  const user = Session.current();
  const data = DB.get();
  const payment = (data.salaryPayments || []).find(function(p) { return p.id === id; });
  if (!payment) { showToast('Salary slip not found', 'error'); return; }
  const paidByUser = payment.paidBy ? DB.getUser(payment.paidBy) : null;
  const meta = DB.getMeta();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const mParts = (payment.month || '').split('-');
  const mLabel = (months[parseInt(mParts[1])-1] || mParts[1]) + ' ' + mParts[0];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'salary-slip-modal';
  overlay.innerHTML = `
    <div class="modal" style="max-width:580px;width:100%">
      <div style="padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:16px;border-bottom:2px solid #e2e8f0">
          <div>
            <div style="font-size:20px;font-weight:900;color:#0F2050">SALARY SLIP</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px">${meta.schoolName || 'SuperKids India Preschool'}</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('salary-slip-modal').remove()"><i class="fas fa-times"></i></button>
        </div>
        <div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:16px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
          <div><span style="color:#64748b;font-weight:600">Employee:</span> <strong>${user.name}</strong></div>
          <div><span style="color:#64748b;font-weight:600">Emp ID:</span> ${user.employeeId||'N/A'}</div>
          <div><span style="color:#64748b;font-weight:600">Designation:</span> ${user.designation||'Class Teacher'}</div>
          <div><span style="color:#64748b;font-weight:600">Department:</span> ${user.department||'Teaching'}</div>
          <div><span style="color:#64748b;font-weight:600">Pay Period:</span> <strong>${mLabel}</strong></div>
          <div><span style="color:#64748b;font-weight:600">Payment Date:</span> ${formatDate(payment.paymentDate)}</div>
          <div><span style="color:#64748b;font-weight:600">Payment Mode:</span> ${payment.paymentMode||'Bank Transfer'}</div>
          <div><span style="color:#64748b;font-weight:600">Status:</span> <span style="color:#10b981;font-weight:800">${payment.status}</span></div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
          <thead>
            <tr style="background:#f8fafc">
              <th style="text-align:left;padding:10px 12px;border:1px solid #e2e8f0;color:#64748b">Earnings</th>
              <th style="text-align:right;padding:10px 12px;border:1px solid #e2e8f0;color:#64748b">Amount</th>
              <th style="text-align:left;padding:10px 12px;border:1px solid #e2e8f0;color:#64748b">Deductions</th>
              <th style="text-align:right;padding:10px 12px;border:1px solid #e2e8f0;color:#64748b">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:10px 12px;border:1px solid #e2e8f0">Basic Salary</td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:right">₹${parseFloat(payment.baseSalary||0).toLocaleString('en-IN')}</td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0">Deductions</td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:right;color:#ef4444">₹${parseFloat(payment.deductions||0).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border:1px solid #e2e8f0">Allowances</td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:right;color:#10b981">₹${parseFloat(payment.allowances||0).toLocaleString('en-IN')}</td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0"></td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0"></td>
            </tr>
            <tr style="background:#f0fdf4">
              <td style="padding:12px;border:2px solid #10b981;font-weight:800;color:#0F2050">Net Pay</td>
              <td style="padding:12px;border:2px solid #10b981;text-align:right;font-size:18px;font-weight:900;color:#10b981">₹${parseFloat(payment.netAmount||0).toLocaleString('en-IN')}</td>
              <td colspan="2" style="padding:12px;border:2px solid #10b981;color:#64748b;font-size:12px">
                ${paidByUser ? 'Processed by: ' + paidByUser.name : ''}
              </td>
            </tr>
          </tbody>
        </table>
        ${payment.remarks ? '<div style="font-size:12px;color:#64748b;margin-bottom:16px"><strong>Remarks:</strong> ' + escHtml(payment.remarks) + '</div>' : ''}
      </div>
      <div style="padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:12px">
        <button class="btn btn-secondary" onclick="document.getElementById('salary-slip-modal').remove()">Close</button>
        <button class="btn btn-primary" onclick="teacherPrintSlip('${id}')"><i class="fas fa-print"></i> Print</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window.teacherPrintSlip = function(id) {
  const user = Session.current();
  const data = DB.get();
  const payment = (data.salaryPayments || []).find(function(p) { return p.id === id; });
  if (!payment) return;
  const paidByUser = payment.paidBy ? DB.getUser(payment.paidBy) : null;
  const meta = DB.getMeta();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const mParts = (payment.month || '').split('-');
  const mLabel = (months[parseInt(mParts[1])-1] || mParts[1]) + ' ' + mParts[0];

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Salary Slip - ${mLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width:680px; margin:30px auto; font-size:13px; color:#333; }
    .header { display:flex; justify-content:space-between; margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #333; }
    h1 { font-size:20px; margin:0 0 4px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; background:#f5f5f5; padding:12px; border-radius:6px; margin-bottom:16px; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    th, td { padding:9px 12px; border:1px solid #ccc; }
    th { background:#f5f5f5; font-weight:700; }
    .net td { background:#f0fff4; font-weight:bold; font-size:15px; }
    .net td:nth-child(2) { color:#10b981; font-size:18px; }
    @media print { body { margin:10px; } button { display:none; } }
  </style></head><body>
  <div class="header">
    <div><h1>SALARY SLIP</h1><div style="font-size:12px;color:#666">${meta.schoolName || 'SuperKids India Preschool'}</div></div>
    <div style="text-align:right;font-size:13px"><strong>${mLabel}</strong><br>Issued: ${formatDate(payment.paymentDate)}</div>
  </div>
  <div class="info-grid">
    <div><strong>Employee:</strong> ${user.name}</div>
    <div><strong>Emp ID:</strong> ${user.employeeId||'N/A'}</div>
    <div><strong>Designation:</strong> ${user.designation||'Class Teacher'}</div>
    <div><strong>Department:</strong> ${user.department||'Teaching'}</div>
    <div><strong>Payment Mode:</strong> ${payment.paymentMode||'Bank Transfer'}</div>
    <div><strong>Status:</strong> ${payment.status}</div>
  </div>
  <table>
    <thead><tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr></thead>
    <tbody>
      <tr><td>Basic Salary</td><td>₹${parseFloat(payment.baseSalary||0).toLocaleString('en-IN')}</td><td>Deductions</td><td>₹${parseFloat(payment.deductions||0).toLocaleString('en-IN')}</td></tr>
      <tr><td>Allowances</td><td>₹${parseFloat(payment.allowances||0).toLocaleString('en-IN')}</td><td></td><td></td></tr>
      <tr class="net"><td>Net Pay</td><td>₹${parseFloat(payment.netAmount||0).toLocaleString('en-IN')}</td><td colspan="2">${paidByUser ? 'Processed by: ' + paidByUser.name : ''}</td></tr>
    </tbody>
  </table>
  ${payment.remarks ? '<p><strong>Remarks:</strong> ' + escHtml(payment.remarks) + '</p>' : ''}
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  win.document.close();
};

// ---- Route Registration ----
registerRoute('teacher-profile', renderTeacherProfile);
registerRoute('teacher-attendance', renderTeacherAttendance);
registerRoute('teacher-leaves', renderTeacherLeaves);
registerRoute('teacher-salary', renderTeacherSalary);
