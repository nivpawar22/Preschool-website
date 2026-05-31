// ============================================================
// Teacher Self-Service Module — subadmin role
// Sections: Profile, Attendance, Leaves, Salary, Documents, Resignation
// ============================================================

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _tFmtMonth(m) { if(!m)return '-'; var n=['January','February','March','April','May','June','July','August','September','October','November','December']; var p=m.split('-'); return (n[parseInt(p[1])-1]||p[1])+' '+p[0]; }
function _statusBadge(s, map) { var m=map||{Pending:'#fef3c7:#92400e',Approved:'#d1fae5:#065f46',Rejected:'#fee2e2:#991b1b',Fulfilled:'#dbeafe:#1e40af',Active:'#d1fae5:#065f46',Resigned:'#fef3c7:#92400e'}; var p=(m[s]||'#f1f5f9:#475569').split(':'); return '<span style="background:'+p[0]+';color:'+p[1]+';padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">'+escHtml(s)+'</span>'; }

// ============================================================
// 1. PROFILE MANAGEMENT
// ============================================================
function renderTeacherProfile() {
  var user = Session.current();
  if (!user || user.role !== 'subadmin') { renderLogin(); return; }
  var data = DB.get();
  var myClass = (data.classes||[]).find(function(c){return c.teacherId===user.id;});
  var pendingReq = (DB.getProfileChangeRequests(user.id)||[]).find(function(r){return r.status==='Pending';});
  var tab = window._tpTab || 'info';

  var tabs = [
    {id:'info', label:'Personal Info', icon:'fa-user'},
    {id:'address', label:'Address & Emergency', icon:'fa-map-marker-alt'},
    {id:'bank', label:'Bank Details', icon:'fa-university'},
    {id:'docs', label:'Documents', icon:'fa-folder-open'},
    {id:'password', label:'Change Password', icon:'fa-lock'}
  ];

  var docTypes = ['Aadhaar Card','PAN Card','Educational Certificate','Experience Certificate','Other'];

  var myDocs = (user.documents||[]);

  function tabHtml() {
    if (tab==='info') return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div><label class="form-label">Full Name</label><input id="tp-name" class="form-control" value="${escHtml(user.name||'')}"/></div>
        <div><label class="form-label">Phone</label><input id="tp-phone" class="form-control" value="${escHtml(user.phone||'')}"/></div>
        <div><label class="form-label">Email</label><input id="tp-email" class="form-control" type="email" value="${escHtml(user.email||'')}"/></div>
        <div><label class="form-label">Date of Birth</label><input id="tp-dob" class="form-control" type="date" value="${escHtml(user.dob||'')}"/></div>
        <div><label class="form-label">Gender</label>
          <select id="tp-gender" class="form-control">
            ${['Male','Female','Other'].map(function(g){return '<option value="'+g+'"'+(user.gender===g?' selected':'')+'>'+g+'</option>';}).join('')}
          </select>
        </div>
        <div><label class="form-label">Blood Group</label><input id="tp-blood" class="form-control" value="${escHtml(user.bloodGroup||'')}"/></div>
        <div style="grid-column:1/-1"><label class="form-label">Qualification</label><input id="tp-qual" class="form-control" value="${escHtml(user.qualification||'')}"/></div>
        ${pendingReq ? '<div style="grid-column:1/-1"><div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:12px 16px;font-size:13px;color:#92400e"><i class="fas fa-clock" style="margin-right:6px"></i>Profile update request is pending admin approval</div></div>' : ''}
      </div>`;
    if (tab==='address') return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div style="grid-column:1/-1"><h4 style="font-size:13px;font-weight:700;color:#0F2050;margin:0 0 12px">Current Address</h4></div>
        <div style="grid-column:1/-1"><label class="form-label">Address Line</label><textarea id="tp-addr" class="form-control" rows="2" style="resize:none">${escHtml(user.address||'')}</textarea></div>
        <div><label class="form-label">City</label><input id="tp-city" class="form-control" value="${escHtml(user.city||'')}"/></div>
        <div><label class="form-label">State</label><input id="tp-state" class="form-control" value="${escHtml(user.state||'')}"/></div>
        <div><label class="form-label">PIN Code</label><input id="tp-pin" class="form-control" value="${escHtml(user.pinCode||'')}"/></div>
        <div style="grid-column:1/-1"><h4 style="font-size:13px;font-weight:700;color:#0F2050;margin:16px 0 12px">Emergency Contact</h4></div>
        <div><label class="form-label">Contact Name</label><input id="tp-emname" class="form-control" value="${escHtml(user.emergencyName||'')}"/></div>
        <div><label class="form-label">Relationship</label><input id="tp-emrel" class="form-control" value="${escHtml(user.emergencyRelation||'')}"/></div>
        <div><label class="form-label">Contact Phone</label><input id="tp-emphone" class="form-control" value="${escHtml(user.emergencyPhone||'')}"/></div>
        <div><label class="form-label">Alt Phone</label><input id="tp-emphone2" class="form-control" value="${escHtml(user.emergencyPhone2||'')}"/></div>
      </div>`;
    if (tab==='bank') return `
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#92400e">
        <i class="fas fa-shield-alt" style="margin-right:6px"></i>Bank details are view-only. Contact HR to update bank information.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div><label class="form-label">Account Holder Name</label><input class="form-control" value="${escHtml(user.bankAccountName||user.name||'')}" readonly style="background:#f8fafc"/></div>
        <div><label class="form-label">Account Number</label><input class="form-control" value="${escHtml(user.bankAccount||'')}" readonly style="background:#f8fafc"/></div>
        <div><label class="form-label">IFSC Code</label><input class="form-control" value="${escHtml(user.bankIFSC||'')}" readonly style="background:#f8fafc"/></div>
        <div><label class="form-label">Bank Name</label><input class="form-control" value="${escHtml(user.bankName||'')}" readonly style="background:#f8fafc"/></div>
        <div><label class="form-label">Branch</label><input class="form-control" value="${escHtml(user.bankBranch||'')}" readonly style="background:#f8fafc"/></div>
        <div><label class="form-label">Payment Mode</label><input class="form-control" value="${escHtml(user.paymentMode||'Bank Transfer')}" readonly style="background:#f8fafc"/></div>
      </div>
      <button class="btn btn-secondary" style="margin-top:16px" onclick="teacherRequestDoc('Bank Details Update Request')"><i class="fas fa-paper-plane"></i> Request Bank Update from HR</button>`;
    if (tab==='docs') {
      var docRows = myDocs.length > 0 ? myDocs.map(function(d,i){
        var viewBtn = d.r2Key
          ? '<a href="/r2/'+escHtml(d.r2Key)+'" target="_blank" class="btn btn-sm btn-secondary" style="font-size:11px"><i class="fas fa-eye"></i> View</a>'
          : (d.fileData||d.data ? '<a href="'+(d.fileData||d.data)+'" target="_blank" class="btn btn-sm btn-secondary" style="font-size:11px"><i class="fas fa-eye"></i> View</a>' : '—');
        return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 12px;font-size:13px;font-weight:600;color:#374151">'+escHtml(d.type)+'</td><td style="padding:10px 12px;font-size:12px;color:#64748b">'+escHtml(d.name||d.fileName||'')+'</td><td style="padding:10px 12px;font-size:11px;color:#94a3b8">'+formatDate(d.uploadedAt)+'</td><td style="padding:10px 12px;text-align:center">'+viewBtn+'</td></tr>';
      }).join('') : '<tr><td colspan="4" style="text-align:center;padding:24px;color:#94a3b8">No documents uploaded yet</td></tr>';
      return `
        <div style="margin-bottom:20px">
          <h4 style="font-size:13px;font-weight:800;color:#0F2050;margin:0 0 12px">Upload Document</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end">
            <div><label class="form-label">Document Type</label>
              <select id="tp-doctype" class="form-control">
                ${docTypes.map(function(d){return '<option>'+d+'</option>';}).join('')}
              </select>
            </div>
            <div><label class="form-label">Select File</label><input id="tp-docfile" class="form-control" type="file" accept=".pdf,.jpg,.jpeg,.png"/></div>
            <button class="btn btn-primary" onclick="teacherUploadDoc()"><i class="fas fa-upload"></i> Upload</button>
          </div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
              <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Document Type</th>
              <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">File Name</th>
              <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Uploaded</th>
              <th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Status</th>
            </tr></thead>
            <tbody>${docRows}</tbody>
          </table>
        </div>`;
    }
    if (tab==='password') return `
      <div style="max-width:400px">
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#1e40af">
          <i class="fas fa-info-circle" style="margin-right:6px"></i>Use a strong password with letters, numbers and symbols.
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div><label class="form-label">Current Password</label><input id="tp-curpwd" class="form-control" type="password" placeholder="Enter current password"/></div>
          <div><label class="form-label">New Password</label><input id="tp-newpwd" class="form-control" type="password" placeholder="Min 8 characters"/></div>
          <div><label class="form-label">Confirm New Password</label><input id="tp-confpwd" class="form-control" type="password" placeholder="Re-enter new password"/></div>
          <button class="btn btn-primary" onclick="teacherChangePassword()"><i class="fas fa-key"></i> Change Password</button>
        </div>
      </div>`;
    return '';
  }

  var hasSaveBtn = tab === 'info' || tab === 'address';
  var saveLabel = pendingReq ? 'Re-submit Update' : 'Submit for Approval';

  var content = `
    <div style="display:grid;grid-template-columns:280px 1fr;gap:20px;align-items:start">
      <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);text-align:center;position:sticky;top:20px">
        <div style="width:80px;height:80px;border-radius:50%;background:${user.avatar||'#10b981'};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;font-weight:900;color:#fff">${(user.name||'T').charAt(0).toUpperCase()}</div>
        <div style="font-size:18px;font-weight:800;color:#0F2050;margin-bottom:4px">${escHtml(user.name||'')}</div>
        <div style="font-size:13px;color:#10b981;font-weight:700;margin-bottom:8px">${escHtml(user.designation||'Class Teacher')}</div>
        ${user.employeeId||user.empId ? `<div style="font-family:monospace;font-size:12px;font-weight:700;color:#64748b;background:#f1f5f9;padding:4px 10px;border-radius:6px;display:inline-block;margin-bottom:8px">${escHtml(user.employeeId||user.empId||'')}</div>` : ''}
        ${user.department ? `<div style="font-size:12px;color:#64748b;margin-bottom:4px"><i class="fas fa-building" style="margin-right:4px;color:#94a3b8"></i>${escHtml(user.department)}</div>` : ''}
        ${user.joiningDate ? `<div style="font-size:12px;color:#64748b;margin-bottom:4px"><i class="fas fa-calendar" style="margin-right:4px;color:#94a3b8"></i>Joined: ${formatDate(user.joiningDate)}</div>` : ''}
        ${myClass ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0"><div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:4px">My Class</div><div style="font-size:14px;font-weight:800;color:#0F2050">${escHtml(myClass.name)}</div></div>` : ''}
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0">
          <div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;margin-bottom:4px">Documents</div>
          <div style="font-size:20px;font-weight:900;color:#0F2050">${myDocs.length}</div>
          <div style="font-size:11px;color:#94a3b8">uploaded</div>
        </div>
      </div>

      <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;border-bottom:2px solid #f1f5f9;padding-bottom:16px">
          ${tabs.map(function(t){return '<button class="btn btn-sm '+(t.id===tab?'btn-primary':'btn-secondary')+'" onclick="window._tpTab=\''+t.id+'\';renderTeacherProfile()"><i class="fas '+t.icon+'" style="margin-right:4px"></i>'+t.label+'</button>';}).join('')}
        </div>
        ${tabHtml()}
        ${hasSaveBtn ? `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;gap:10px">
          <button class="btn btn-primary" onclick="saveTeacherProfile()"><i class="fas fa-paper-plane"></i> ${saveLabel}</button>
          <div style="font-size:12px;color:#94a3b8;align-self:center"><i class="fas fa-info-circle"></i> Changes require admin approval before taking effect</div>
        </div>` : ''}
      </div>
    </div>`;

  renderLayout('teacher-profile', content, 'My Profile', 'My Account / Profile');
}

window._tpTab = 'info';

window.teacherUploadDoc = function() {
  var user = Session.current(); if(!user) return;
  var type = (document.getElementById('tp-doctype')||{}).value;
  var fileList = (document.getElementById('tp-docfile')||{}).files;
  if (!type || !fileList || !fileList[0]) { showToast('Please select a document type and file', 'error'); return; }
  var file = fileList[0];
  if (file.size > 10 * 1024 * 1024) { showToast('File must be under 10MB', 'error'); return; }
  showToast('Uploading...', 'default', 10000);
  var formData = new FormData();
  formData.append('file', file);
  fetch('/api/upload?folder=teacher-docs', { method: 'POST', body: formData })
    .then(function(r){ return r.json(); })
    .then(function(res) {
      if (res.error) throw new Error(res.error);
      var docs = user.documents ? JSON.parse(JSON.stringify(user.documents)) : [];
      docs.push({ type: type, name: file.name, r2Key: res.key, uploadedAt: new Date().toISOString() });
      DB.updateUser(user.id, { documents: docs });
      var data = DB.get(); var updated = (data.users||[]).find(function(u){return u.id===user.id;}); if(updated) Session.updateCurrent(updated);
      showToast('Document uploaded!', 'success');
      renderTeacherProfile();
    })
    .catch(function(err) {
      showToast('Upload failed: '+(err.message||'Check connection'), 'error');
    });
};

window.saveTeacherProfile = function() {
  var user = Session.current(); if (!user) return;
  var tab = window._tpTab || 'info';
  var updates = {};
  if (tab === 'info') {
    updates.name = (document.getElementById('tp-name')||{}).value||'';
    updates.phone = (document.getElementById('tp-phone')||{}).value||'';
    updates.email = (document.getElementById('tp-email')||{}).value||'';
    updates.dob = (document.getElementById('tp-dob')||{}).value||'';
    updates.gender = (document.getElementById('tp-gender')||{}).value||'';
    updates.bloodGroup = (document.getElementById('tp-blood')||{}).value||'';
    updates.qualification = (document.getElementById('tp-qual')||{}).value||'';
  } else if (tab === 'address') {
    updates.address = (document.getElementById('tp-addr')||{}).value||'';
    updates.city = (document.getElementById('tp-city')||{}).value||'';
    updates.state = (document.getElementById('tp-state')||{}).value||'';
    updates.pinCode = (document.getElementById('tp-pin')||{}).value||'';
    updates.emergencyName = (document.getElementById('tp-emname')||{}).value||'';
    updates.emergencyRelation = (document.getElementById('tp-emrel')||{}).value||'';
    updates.emergencyPhone = (document.getElementById('tp-emphone')||{}).value||'';
    updates.emergencyPhone2 = (document.getElementById('tp-emphone2')||{}).value||'';
  }
  if (!Object.keys(updates).length) return;
  // Submit as profile change request
  var existing = (DB.getProfileChangeRequests(user.id)||[]).find(function(r){return r.status==='Pending';});
  if (existing) {
    DB.updateProfileChangeRequest(existing.id, { changes: updates, updatedAt: new Date().toISOString() });
  } else {
    DB.addProfileChangeRequest({ id:'pcr_'+Date.now(), teacherId: user.id, teacherName: user.name, changes: updates, status: 'Pending', section: tab, createdAt: new Date().toISOString() });
  }
  showToast('Profile update submitted for admin approval!', 'success');
  renderTeacherProfile();
};

window.teacherChangePassword = function() {
  var user = Session.current(); if(!user) return;
  var cur = (document.getElementById('tp-curpwd')||{}).value||'';
  var nw = (document.getElementById('tp-newpwd')||{}).value||'';
  var conf = (document.getElementById('tp-confpwd')||{}).value||'';
  if (cur !== user.password) { showToast('Current password is incorrect', 'error'); return; }
  if (nw.length < 6) { showToast('New password must be at least 6 characters', 'error'); return; }
  if (nw !== conf) { showToast('Passwords do not match', 'error'); return; }
  DB.updateUser(user.id, { password: nw });
  var data = DB.get(); var updated = (data.users||[]).find(function(u){return u.id===user.id;}); if(updated) Session.updateCurrent(updated);
  showToast('Password changed successfully!', 'success');
  renderTeacherProfile();
};

// ============================================================
// 2. ATTENDANCE MANAGEMENT
// ============================================================
function renderTeacherAttendance() {
  var user = Session.current();
  if (!user || user.role !== 'subadmin') { renderLogin(); return; }

  var now = new Date();
  var defMonth = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  var month = window._tAttMonth || defMonth;
  var [yr, mo] = month.split('-');
  var allRecs = DB.getStaffAttendance(user.id);
  var monthRecs = allRecs.filter(function(r){return r.date&&r.date.startsWith(month);});

  var todayStr = now.toISOString().slice(0,10);
  var todayRec = allRecs.find(function(r){return r.date===todayStr;});

  var stats = {
    present: monthRecs.filter(function(r){return r.status==='Present';}).length,
    absent: monthRecs.filter(function(r){return r.status==='Absent';}).length,
    halfDay: monthRecs.filter(function(r){return r.status==='Half-Day';}).length,
    late: monthRecs.filter(function(r){return r.lateArrival;}).length,
    onLeave: monthRecs.filter(function(r){return r.status==='On-Leave';}).length
  };
  var total = monthRecs.length;
  var attPct = total ? Math.round((stats.present + stats.halfDay*0.5) / total * 100) : 0;

  // Build calendar
  var daysInMonth = new Date(parseInt(yr), parseInt(mo), 0).getDate();
  var firstDay = new Date(parseInt(yr), parseInt(mo)-1, 1).getDay();
  var recMap = {};
  monthRecs.forEach(function(r){recMap[r.date]=r;});

  var calDays = '';
  for (var i=0;i<firstDay;i++) calDays += '<div></div>';
  for (var d=1;d<=daysInMonth;d++) {
    var dateStr = yr+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var rec = recMap[dateStr];
    var isToday = dateStr===todayStr;
    var dow = new Date(parseInt(yr),parseInt(mo)-1,d).getDay();
    var isWeekend = dow===0||dow===6;
    var bg='#f8fafc', col='#64748b', border='1px solid #e2e8f0';
    if(isToday){border='2px solid #6366f1';}
    if(rec){
      if(rec.status==='Present'){bg='#d1fae5';col='#065f46';}
      else if(rec.status==='Absent'){bg='#fee2e2';col='#991b1b';}
      else if(rec.status==='Half-Day'){bg='#fef3c7';col='#92400e';}
      else if(rec.status==='On-Leave'){bg='#e0e7ff';col='#3730a3';}
    } else if(isWeekend){bg='#f1f5f9';col='#94a3b8';}
    var lateTag = rec&&rec.lateArrival ? '<div style="font-size:8px;color:#f97316;font-weight:700;line-height:1">LATE</div>' : '';
    calDays += '<div style="background:'+bg+';border:'+border+';border-radius:8px;padding:6px;text-align:center;cursor:default;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center">'+
      '<div style="font-size:13px;font-weight:'+(isToday?'900':'600')+';color:'+col+'">'+(isToday?'<strong>':'')+(d)+(isToday?'</strong>':'')+'</div>'+
      (rec?'<div style="font-size:9px;font-weight:700;color:'+col+';line-height:1;margin-top:2px">'+rec.status.slice(0,4).toUpperCase()+'</div>':'')+
      lateTag+
    '</div>';
  }

  var corrReqs = DB.getAttendanceCorrectionRequests(user.id)||[];

  var content = `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn btn-secondary btn-sm" onclick="teacherAttPrevMonth()"><i class="fas fa-chevron-left"></i></button>
          <span style="font-size:15px;font-weight:800;color:#0F2050;min-width:130px;text-align:center">${_tFmtMonth(month)}</span>
          <button class="btn btn-secondary btn-sm" onclick="teacherAttNextMonth()"><i class="fas fa-chevron-right"></i></button>
        </div>
        <div style="display:flex;gap:8px">
          ${!todayRec ? `<button class="btn btn-primary" onclick="teacherMarkAttendance()"><i class="fas fa-fingerprint"></i> Mark Today</button>` :
            `<div style="background:#d1fae5;color:#065f46;padding:8px 16px;border-radius:10px;font-size:13px;font-weight:700"><i class="fas fa-check-circle" style="margin-right:6px"></i>Marked: ${escHtml(todayRec.status)}${todayRec.checkIn?' at '+todayRec.checkIn:''}</div>`}
          <button class="btn btn-secondary" onclick="teacherRequestCorrection()"><i class="fas fa-edit"></i> Request Correction</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px">
        ${[['Present',stats.present,'#d1fae5','#065f46','fa-check-circle'],['Absent',stats.absent,'#fee2e2','#991b1b','fa-times-circle'],['Half-Day',stats.halfDay,'#fef3c7','#92400e','fa-adjust'],['Late',stats.late,'#fff7ed','#c2410c','fa-clock'],['Attendance',attPct+'%','#eff6ff','#1e40af','fa-chart-pie']].map(function(s){
          return '<div style="background:'+s[2]+';border-radius:14px;padding:16px;text-align:center"><i class="fas '+s[4]+'" style="font-size:18px;color:'+s[3]+';margin-bottom:8px;display:block"></i><div style="font-size:22px;font-weight:900;color:'+s[3]+'">'+s[1]+'</div><div style="font-size:10px;font-weight:700;color:'+s[3]+';text-transform:uppercase">'+s[0]+'</div></div>';
        }).join('')}
      </div>

      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:20px">
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px">
          ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(function(d){return '<div style="text-align:center;font-size:11px;font-weight:700;color:#94a3b8;padding:6px">'+d+'</div>';}).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">${calDays}</div>
        <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">
          ${[['#d1fae5','#065f46','Present'],['#fee2e2','#991b1b','Absent'],['#fef3c7','#92400e','Half-Day'],['#e0e7ff','#3730a3','On Leave']].map(function(l){return '<div style="display:flex;align-items:center;gap:6px"><div style="width:12px;height:12px;border-radius:3px;background:'+l[0]+';border:1px solid '+l[1]+'"></div><span style="font-size:11px;color:#64748b">'+l[2]+'</span></div>';}).join('')}
        </div>
      </div>

      ${corrReqs.length > 0 ? `
      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <h3 style="font-size:14px;font-weight:800;color:#0F2050;margin:0 0 16px"><i class="fas fa-edit" style="color:#f59e0b;margin-right:8px"></i>Correction Requests</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
            <th style="text-align:left;padding:8px 12px;color:#64748b;font-weight:700">Date</th>
            <th style="text-align:left;padding:8px 12px;color:#64748b;font-weight:700">Requested Status</th>
            <th style="text-align:left;padding:8px 12px;color:#64748b;font-weight:700">Reason</th>
            <th style="text-align:center;padding:8px 12px;color:#64748b;font-weight:700">Status</th>
          </tr></thead>
          <tbody>${corrReqs.map(function(r){return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 12px;color:#374151">'+formatDate(r.date)+'</td><td style="padding:8px 12px">'+_statusBadge(r.requestedStatus,{'Present':'#d1fae5:#065f46','Half-Day':'#fef3c7:#92400e'})+'</td><td style="padding:8px 12px;color:#64748b;font-size:11px">'+escHtml(r.reason||'')+'</td><td style="padding:8px 12px;text-align:center">'+_statusBadge(r.status)+'</td></tr>';}).join('')}</tbody>
        </table>
      </div>` : ''}
    </div>`;

  renderLayout('teacher-attendance', content, 'My Attendance', 'My Account / Attendance');
}

window.teacherAttPrevMonth = function() {
  var m = window._tAttMonth || new Date().toISOString().slice(0,7);
  var d = new Date(m+'-01'); d.setMonth(d.getMonth()-1);
  window._tAttMonth = d.toISOString().slice(0,7);
  renderTeacherAttendance();
};
window.teacherAttNextMonth = function() {
  var m = window._tAttMonth || new Date().toISOString().slice(0,7);
  var d = new Date(m+'-01'); d.setMonth(d.getMonth()+1);
  window._tAttMonth = d.toISOString().slice(0,7);
  renderTeacherAttendance();
};
window.teacherAttSetMonth = function(m) { window._tAttMonth = m; renderTeacherAttendance(); };

window.teacherMarkAttendance = function() {
  var user = Session.current(); if(!user) return;
  var now = new Date();
  var todayStr = now.toISOString().slice(0,10);
  var timeStr = now.toTimeString().slice(0,5);
  // Determine if late (after 9:15 AM)
  var lateArrival = now.getHours() > 9 || (now.getHours()===9 && now.getMinutes()>15);
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:28px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.2)">'+
    '<h3 style="margin:0 0 16px;font-size:16px;font-weight:800;color:#0F2050"><i class="fas fa-fingerprint" style="color:#6366f1;margin-right:8px"></i>Mark Attendance — '+formatDate(todayStr)+'</h3>'+
    (lateArrival?'<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#c2410c"><i class="fas fa-clock" style="margin-right:6px"></i>Late arrival will be noted (after 9:15 AM)</div>':'')+
    '<div style="margin-bottom:14px"><label class="form-label">Status</label><select id="mark-att-status" class="form-control"><option value="Present">Present</option><option value="Half-Day">Half-Day</option></select></div>'+
    '<div style="margin-bottom:14px"><label class="form-label">Check-In Time</label><input id="mark-att-time" class="form-control" type="time" value="'+timeStr+'"/></div>'+
    '<div style="margin-bottom:16px"><label class="form-label">Note (optional)</label><input id="mark-att-note" class="form-control" placeholder="Any note..."/></div>'+
    '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" onclick="teacherSaveMarkAttendance(\''+todayStr+'\','+lateArrival+')"><i class="fas fa-fingerprint"></i> Confirm</button></div>'+
  '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
};

window.teacherSaveMarkAttendance = function(date, lateArrival) {
  var user = Session.current(); if(!user) return;
  var status = (document.getElementById('mark-att-status')||{}).value||'Present';
  var checkIn = (document.getElementById('mark-att-time')||{}).value||'';
  var note = (document.getElementById('mark-att-note')||{}).value||'';
  DB.addStaffAttendance({ id:'sa_'+Date.now(), teacherId:user.id, date:date, status:status, checkIn:checkIn, lateArrival:lateArrival, note:note, createdAt:new Date().toISOString() });
  document.querySelector('.modal-overlay').remove();
  showToast('Attendance marked!','success');
  renderTeacherAttendance();
};

window.teacherCheckIn = function() { teacherMarkAttendance(); };
window.teacherCheckOut = function() {
  var user = Session.current(); if(!user) return;
  var todayStr = new Date().toISOString().slice(0,10);
  var recs = DB.getStaffAttendance(user.id);
  var todayRec = recs.find(function(r){return r.date===todayStr;});
  if(!todayRec){showToast('No check-in record found for today','error');return;}
  var timeStr = new Date().toTimeString().slice(0,5);
  DB.updateStaffAttendance(todayRec.id, { checkOut: timeStr });
  showToast('Check-out recorded at '+timeStr,'success');
  renderTeacherAttendance();
};

window.teacherRequestCorrection = function() {
  var user = Session.current(); if(!user) return;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:28px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.2)">'+
    '<h3 style="margin:0 0 16px;font-size:16px;font-weight:800;color:#0F2050"><i class="fas fa-edit" style="color:#f59e0b;margin-right:8px"></i>Request Attendance Correction</h3>'+
    '<div style="margin-bottom:14px"><label class="form-label">Date *</label><input id="corr-date" class="form-control" type="date" value="'+new Date().toISOString().slice(0,10)+'"/></div>'+
    '<div style="margin-bottom:14px"><label class="form-label">Requested Status *</label><select id="corr-status" class="form-control"><option value="Present">Present</option><option value="Half-Day">Half-Day</option><option value="On-Leave">On Leave</option></select></div>'+
    '<div style="margin-bottom:14px"><label class="form-label">Check-In Time</label><input id="corr-checkin" class="form-control" type="time"/></div>'+
    '<div style="margin-bottom:16px"><label class="form-label">Reason *</label><textarea id="corr-reason" class="form-control" rows="2" placeholder="Explain why correction is needed..." style="resize:none"></textarea></div>'+
    '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" onclick="teacherSaveCorrection()"><i class="fas fa-paper-plane"></i> Submit Request</button></div>'+
  '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
};

window.teacherSaveCorrection = function() {
  var user = Session.current(); if(!user) return;
  var date = (document.getElementById('corr-date')||{}).value;
  var status = (document.getElementById('corr-status')||{}).value;
  var checkIn = (document.getElementById('corr-checkin')||{}).value;
  var reason = (document.getElementById('corr-reason')||{}).value||'';
  if(!date||!status||!reason.trim()){showToast('Please fill required fields','error');return;}
  DB.addAttendanceCorrectionRequest({ id:'acr_'+Date.now(), teacherId:user.id, teacherName:user.name, date:date, requestedStatus:status, checkIn:checkIn, reason:reason, status:'Pending', createdAt:new Date().toISOString() });
  document.querySelector('.modal-overlay').remove();
  showToast('Correction request submitted!','success');
  renderTeacherAttendance();
};

// ============================================================
// 3. LEAVE MANAGEMENT
// ============================================================
function renderTeacherLeaves() {
  var user = Session.current();
  if (!user || user.role !== 'subadmin') { renderLogin(); return; }

  var year = new Date().getFullYear().toString();
  var balance = DB.getLeaveBalance(user.id, year);
  var leaves = DB.getStaffLeaves(user.id);
  var holidays = DB.getHolidays();
  var tab = window._tlTab || 'leaves';

  var upcoming = holidays.filter(function(h){return h.date >= new Date().toISOString().slice(0,10);}).slice(0,10);

  var leaveContent = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:20px">
      ${balance.map(function(b){
        var barColor = b.remaining>3?'#10b981':b.remaining>0?'#f59e0b':'#ef4444';
        var pct = Math.round((b.remaining/b.total)*100);
        return '<div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-top:4px solid '+barColor+'">'+
          '<div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:8px">'+escHtml(b.type)+'</div>'+
          '<div style="font-size:32px;font-weight:900;color:#0F2050">'+b.remaining+'<span style="font-size:13px;color:#94a3b8;font-weight:500">/'+b.total+'</span></div>'+
          '<div style="font-size:11px;color:#94a3b8">days remaining</div>'+
          '<div style="background:#e2e8f0;border-radius:4px;height:6px;margin-top:10px;overflow:hidden"><div style="background:'+barColor+';height:100%;width:'+pct+'%;border-radius:4px"></div></div>'+
          '<div style="font-size:11px;color:#94a3b8;margin-top:4px">'+b.used+' used this year</div>'+
        '</div>';
      }).join('')}
    </div>
    <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">
        <h3 style="font-size:14px;font-weight:800;margin:0;color:#0F2050"><i class="fas fa-list" style="color:#6366f1;margin-right:8px"></i>My Leave Requests</h3>
        <button class="btn btn-primary" onclick="teacherApplyLeave()"><i class="fas fa-plus"></i> Apply Leave</button>
      </div>
      ${leaves.length===0?'<div style="text-align:center;color:#94a3b8;padding:40px"><i class="fas fa-umbrella-beach" style="font-size:36px;display:block;margin-bottom:12px"></i>No leave requests yet</div>':
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'+
          '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0"><th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Type</th><th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">From</th><th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">To</th><th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Days</th><th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Reason</th><th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Status</th><th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Remarks</th><th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Action</th></tr></thead>'+
          '<tbody>'+leaves.map(function(l){return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 12px"><span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">'+escHtml(l.leaveType)+'</span></td><td style="padding:10px 12px;color:#475569">'+formatDate(l.fromDate)+'</td><td style="padding:10px 12px;color:#475569">'+formatDate(l.toDate)+'</td><td style="padding:10px 12px;text-align:center;font-weight:700">'+l.days+'</td><td style="padding:10px 12px;color:#374151;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escHtml(l.reason||'')+'">'+escHtml(l.reason||'')+'</td><td style="padding:10px 12px;text-align:center">'+_statusBadge(l.status)+'</td><td style="padding:10px 12px;color:#64748b;font-size:12px">'+escHtml(l.remarks||'—')+'</td><td style="padding:10px 12px;text-align:center">'+(l.status==='Pending'?'<button class="btn btn-danger btn-sm" onclick="teacherCancelLeave(\''+l.id+'\')"><i class="fas fa-times"></i></button>':'')+'</td></tr>';}).join('')+
          '</tbody></table></div>'}
    </div>`;

  var holidayContent = `
    <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
      <h3 style="font-size:14px;font-weight:800;margin:0 0 16px;color:#0F2050"><i class="fas fa-calendar-alt" style="color:#ef4444;margin-right:8px"></i>School Holiday Calendar ${new Date().getFullYear()}</h3>
      ${holidays.length===0?'<div style="text-align:center;color:#94a3b8;padding:40px">No holidays configured</div>':
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">'+
          holidays.map(function(h){
            var isPast = h.date < new Date().toISOString().slice(0,10);
            var typeColors = {National:'#fee2e2:#991b1b',Festival:'#fef3c7:#92400e',School:'#e0e7ff:#3730a3'};
            var tc = (typeColors[h.type]||'#f1f5f9:#475569').split(':');
            return '<div style="background:'+tc[0]+';border-radius:12px;padding:16px;opacity:'+(isPast?'0.6':'1')+'">'+
              '<div style="font-size:13px;font-weight:800;color:'+tc[1]+'">'+escHtml(h.name)+'</div>'+
              '<div style="font-size:12px;color:'+tc[1]+';margin-top:4px;opacity:0.8">'+formatDate(h.date)+'</div>'+
              '<span style="font-size:10px;background:rgba(0,0,0,0.08);color:'+tc[1]+';padding:2px 8px;border-radius:4px;font-weight:700;display:inline-block;margin-top:6px">'+escHtml(h.type)+'</span>'+
              (isPast?'<span style="font-size:10px;color:'+tc[1]+';margin-left:6px;opacity:0.7">Past</span>':'')+
            '</div>';
          }).join('')+
        '</div>'}
    </div>`;

  var content = `
    <div>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button class="btn btn-sm ${tab==='leaves'?'btn-primary':'btn-secondary'}" onclick="window._tlTab='leaves';renderTeacherLeaves()"><i class="fas fa-umbrella-beach" style="margin-right:4px"></i>My Leaves</button>
        <button class="btn btn-sm ${tab==='holidays'?'btn-primary':'btn-secondary'}" onclick="window._tlTab='holidays';renderTeacherLeaves()"><i class="fas fa-calendar-alt" style="margin-right:4px"></i>Holiday Calendar</button>
      </div>
      ${tab==='leaves' ? leaveContent : holidayContent}
    </div>`;

  renderLayout('teacher-leaves', content, 'My Leaves', 'My Account / Leaves');
}

window.teacherApplyLeave = function() {
  var user = Session.current(); if(!user) return;
  var today = new Date().toISOString().slice(0,10);
  var ltConfig = DB.getLeaveTypeConfig().filter(function(lt){return lt.active;});
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:28px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.2)">'+
    '<h3 style="margin:0 0 20px;font-size:16px;font-weight:800;color:#0F2050"><i class="fas fa-umbrella-beach" style="color:#1AA6CA;margin-right:8px"></i>Apply for Leave</h3>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
      '<div style="grid-column:1/-1"><label class="form-label">Leave Type *</label><select id="tl-type" class="form-control">'+ltConfig.map(function(lt){return '<option value="'+escHtml(lt.name)+'">'+escHtml(lt.name)+' ('+escHtml(lt.code)+')</option>';}).join('')+'</select></div>'+
      '<div><label class="form-label">From Date *</label><input id="tl-from" class="form-control" type="date" value="'+today+'" onchange="teacherCalcDays()"/></div>'+
      '<div><label class="form-label">To Date *</label><input id="tl-to" class="form-control" type="date" value="'+today+'" onchange="teacherCalcDays()"/></div>'+
      '<div style="grid-column:1/-1;background:#f8fafc;border-radius:10px;padding:12px;text-align:center"><span style="font-size:13px;color:#64748b;font-weight:600">Duration: </span><span id="tl-days" style="font-size:18px;font-weight:900;color:#0F2050">1</span><span style="font-size:13px;color:#64748b"> day(s)</span></div>'+
      '<div style="grid-column:1/-1"><label class="form-label">Reason *</label><textarea id="tl-reason" class="form-control" rows="3" placeholder="Reason for leave..." style="resize:none"></textarea></div>'+
    '</div>'+
    '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" onclick="teacherSaveLeave()"><i class="fas fa-paper-plane"></i> Submit</button></div>'+
  '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
};

window.teacherCalcDays = function() {
  var from = (document.getElementById('tl-from')||{}).value;
  var to = (document.getElementById('tl-to')||{}).value;
  if (from && to) {
    var d = Math.max(1, Math.round((new Date(to)-new Date(from))/(1000*86400))+1);
    var el = document.getElementById('tl-days'); if(el) el.textContent = d;
  }
};

window.teacherSaveLeave = function() {
  var user = Session.current(); if(!user) return;
  var type = (document.getElementById('tl-type')||{}).value;
  var from = (document.getElementById('tl-from')||{}).value;
  var to = (document.getElementById('tl-to')||{}).value;
  var reason = ((document.getElementById('tl-reason')||{}).value||'').trim();
  if(!type||!from||!to||!reason){showToast('Please fill all required fields','error');return;}
  var days = Math.max(1,Math.round((new Date(to)-new Date(from))/(1000*86400))+1);
  DB.addStaffLeave({ id:'sl_'+Date.now(), teacherId:user.id, teacherName:user.name, leaveType:type, fromDate:from, toDate:to, days:days, reason:reason, status:'Pending', createdAt:new Date().toISOString() });
  document.querySelector('.modal-overlay').remove();
  showToast('Leave request submitted!','success');
  renderTeacherLeaves();
};

window.teacherCancelLeave = function(id) {
  confirmDialog('Cancel this leave request?', function() {
    DB.deleteStaffLeave(id);
    showToast('Leave request cancelled','warning');
    renderTeacherLeaves();
  });
};

// ============================================================
// 4. SALARY & PAYROLL
// ============================================================
function renderTeacherSalary() {
  var user = Session.current();
  if (!user || user.role !== 'subadmin') { renderLogin(); return; }

  var payments = DB.getSalaryPayments(user.id);
  var structs = DB.getSalaryStructures(user.id);
  var latestStruct = structs[0] || null;
  var thisYear = new Date().getFullYear().toString();
  var yearTotal = payments.filter(function(p){return (p.month||'').startsWith(thisYear);}).reduce(function(s,p){return s+parseFloat(p.netAmount||0);},0);
  var tab = window._tSalTab || 'slips';

  function structView() {
    if (!latestStruct) return '<div style="text-align:center;color:#94a3b8;padding:60px"><i class="fas fa-rupee-sign" style="font-size:40px;display:block;margin-bottom:12px"></i>No salary structure defined yet.<br><span style="font-size:13px">Contact HR for details.</span></div>';
    var earn = [['Basic Salary','basicSalary'],['HRA','hra'],['Conveyance','conveyance'],['Special Allowance','specialAllowance'],['Bonus','bonus']];
    var ded = [['PF Deduction','pfDeduction'],['Professional Tax','professionalTax'],['TDS','tds'],['Other Deductions','otherDeductions']];
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px">
        <h4 style="font-size:13px;font-weight:800;color:#065f46;margin:0 0 14px"><i class="fas fa-plus-circle" style="margin-right:6px"></i>Earnings</h4>
        ${earn.map(function(e){var v=parseFloat(latestStruct[e[1]]||0);return v>0?'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #d1fae5"><span style="font-size:13px;color:#374151">'+e[0]+'</span><span style="font-weight:700;color:#065f46">₹'+v.toLocaleString('en-IN')+'</span></div>':'';}).join('')}
        <div style="display:flex;justify-content:space-between;padding:10px 0 0;margin-top:4px"><span style="font-size:13px;font-weight:800;color:#065f46">Gross Salary</span><span style="font-size:16px;font-weight:900;color:#065f46">₹${parseFloat(latestStruct.grossSalary||0).toLocaleString('en-IN')}</span></div>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px">
        <h4 style="font-size:13px;font-weight:800;color:#991b1b;margin:0 0 14px"><i class="fas fa-minus-circle" style="margin-right:6px"></i>Deductions</h4>
        ${ded.map(function(e){var v=parseFloat(latestStruct[e[1]]||0);return v>0?'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #fecaca"><span style="font-size:13px;color:#374151">'+e[0]+'</span><span style="font-weight:700;color:#991b1b">₹'+v.toLocaleString('en-IN')+'</span></div>':'';}).join('')}
        <div style="display:flex;justify-content:space-between;padding:10px 0 0;margin-top:4px"><span style="font-size:13px;font-weight:800;color:#991b1b">Total Deductions</span><span style="font-size:16px;font-weight:900;color:#991b1b">₹${parseFloat(latestStruct.totalDeductions||0).toLocaleString('en-IN')}</span></div>
      </div>
      <div style="grid-column:1/-1;background:linear-gradient(135deg,#0F2050,#1AA6CA);border-radius:14px;padding:24px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:13px;color:rgba(255,255,255,0.8);font-weight:700;text-transform:uppercase">Net Monthly Salary</div><div style="font-size:10px;color:rgba(255,255,255,0.6);margin-top:2px">Effective from ${formatDate(latestStruct.effectiveFrom)}</div></div>
        <div style="font-size:32px;font-weight:900;color:#fff">₹${parseFloat(latestStruct.netSalary||0).toLocaleString('en-IN')}</div>
      </div>
    </div>
    ${structs.length>1?`<div style="margin-top:20px"><h4 style="font-size:13px;font-weight:800;color:#0F2050;margin:0 0 12px"><i class="fas fa-history" style="margin-right:6px"></i>Increment History</h4>
      <table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0"><th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Effective From</th><th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Gross</th><th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Net Salary</th></tr></thead>
      <tbody>${structs.map(function(s){return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 12px;color:#374151">'+formatDate(s.effectiveFrom)+'</td><td style="padding:10px 12px;text-align:right;color:#374151">₹'+parseFloat(s.grossSalary||0).toLocaleString('en-IN')+'</td><td style="padding:10px 12px;text-align:right;font-weight:800;color:#10b981">₹'+parseFloat(s.netSalary||0).toLocaleString('en-IN')+'</td></tr>';}).join('')}</tbody></table></div>`:''}`;
  }

  function slipsView() {
    return `<div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="font-size:14px;font-weight:800;margin:0;color:#0F2050"><i class="fas fa-money-check-alt" style="color:#10b981;margin-right:8px"></i>Salary Slips</h3>
        <button class="btn btn-secondary btn-sm" onclick="teacherDownloadSalaryCert()"><i class="fas fa-download"></i> Salary Certificate</button>
      </div>
      ${payments.length===0?'<div style="text-align:center;color:#94a3b8;padding:60px"><i class="fas fa-money-check-alt" style="font-size:40px;display:block;margin-bottom:12px"></i>No salary slips yet</div>':
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'+
          '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0"><th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Month</th><th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Basic</th><th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">+Allow</th><th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">-Deduct</th><th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Net Pay</th><th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Status</th><th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Actions</th></tr></thead>'+
          '<tbody>'+payments.map(function(p){return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 12px;font-weight:700;color:#374151">'+_tFmtMonth(p.month)+'</td><td style="padding:10px 12px;text-align:right;color:#374151">₹'+parseFloat(p.baseSalary||0).toLocaleString('en-IN')+'</td><td style="padding:10px 12px;text-align:right;color:#10b981">+₹'+parseFloat(p.allowances||0).toLocaleString('en-IN')+'</td><td style="padding:10px 12px;text-align:right;color:#ef4444">-₹'+parseFloat(p.deductions||0).toLocaleString('en-IN')+'</td><td style="padding:10px 12px;text-align:right;font-weight:800;color:#0F2050;font-size:14px">₹'+parseFloat(p.netAmount||0).toLocaleString('en-IN')+'</td><td style="padding:10px 12px;text-align:center">'+_statusBadge(p.status||'Pending',{Paid:'#d1fae5:#065f46',Pending:'#fef3c7:#92400e'})+'</td><td style="padding:10px 12px;text-align:center"><div style="display:flex;gap:4px;justify-content:center"><button class="btn btn-secondary btn-sm" onclick="teacherViewSlip(\''+p.id+'\')" title="View"><i class="fas fa-eye"></i></button><button class="btn btn-secondary btn-sm" onclick="teacherPrintSlip(\''+p.id+'\')" title="Print"><i class="fas fa-print"></i></button></div></td></tr>';}).join('')+
          '</tbody></table></div>'}
    </div>`;
  }

  var content = `
    <div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #10b981"><div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">Total Paid ${thisYear}</div><div style="font-size:24px;font-weight:900;color:#0F2050">₹${yearTotal.toLocaleString('en-IN')}</div></div>
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #8b5cf6"><div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">Salary Slips</div><div style="font-size:24px;font-weight:900;color:#0F2050">${payments.length}</div></div>
        <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #f59e0b"><div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">Net Monthly</div><div style="font-size:24px;font-weight:900;color:#0F2050">₹${parseFloat(latestStruct?latestStruct.netSalary:user.baseSalary||0).toLocaleString('en-IN')}</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button class="btn btn-sm ${tab==='slips'?'btn-primary':'btn-secondary'}" onclick="window._tSalTab='slips';renderTeacherSalary()"><i class="fas fa-money-check-alt" style="margin-right:4px"></i>Salary Slips</button>
        <button class="btn btn-sm ${tab==='structure'?'btn-primary':'btn-secondary'}" onclick="window._tSalTab='structure';renderTeacherSalary()"><i class="fas fa-layer-group" style="margin-right:4px"></i>Salary Structure</button>
      </div>
      ${tab==='slips' ? slipsView() : '<div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">'+structView()+'</div>'}
    </div>`;

  renderLayout('teacher-salary', content, 'Salary & Payroll', 'My Account / Salary');
}

window.teacherViewSlip = function(id) {
  var user = Session.current(); if(!user) return;
  var p = (DB.getSalaryPayments(user.id)||[]).find(function(x){return x.id===id;});
  if(!p) return;
  var meta = DB.getMeta();
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  var earn = [['Basic Salary',p.baseSalary],['Allowances',p.allowances]];
  var ded = [['Deductions',p.deductions]];
  overlay.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2)">'+
    '<div style="background:linear-gradient(135deg,#0F2050,#1AA6CA);padding:24px;border-radius:16px 16px 0 0;color:#fff">'+
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;opacity:0.8;margin-bottom:4px">'+escHtml(meta.name||'SuperKids India Preschool')+'</div>'+
      '<div style="font-size:18px;font-weight:900;margin-bottom:4px">Salary Slip — '+_tFmtMonth(p.month)+'</div>'+
    '</div>'+
    '<div style="padding:24px">'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:10px;font-size:13px">'+
        '<div><div style="color:#94a3b8;font-size:11px;font-weight:700">Employee Name</div><div style="font-weight:700;color:#0F2050">'+escHtml(user.name)+'</div></div>'+
        '<div><div style="color:#94a3b8;font-size:11px;font-weight:700">Employee ID</div><div style="font-weight:700;color:#0F2050">'+escHtml(user.employeeId||user.empId||user.id)+'</div></div>'+
        '<div><div style="color:#94a3b8;font-size:11px;font-weight:700">Designation</div><div style="font-weight:700;color:#0F2050">'+escHtml(user.designation||'Teacher')+'</div></div>'+
        '<div><div style="color:#94a3b8;font-size:11px;font-weight:700">Payment Mode</div><div style="font-weight:700;color:#0F2050">'+escHtml(p.paymentMode||'Bank Transfer')+'</div></div>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">'+
        '<div style="background:#f0fdf4;border-radius:10px;padding:16px"><div style="font-size:12px;font-weight:800;color:#065f46;margin-bottom:12px">Earnings</div>'+
          earn.map(function(e){return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #d1fae5;font-size:13px"><span style="color:#374151">'+e[0]+'</span><span style="font-weight:700;color:#065f46">₹'+parseFloat(e[1]||0).toLocaleString('en-IN')+'</span></div>';}).join('')+
        '</div>'+
        '<div style="background:#fef2f2;border-radius:10px;padding:16px"><div style="font-size:12px;font-weight:800;color:#991b1b;margin-bottom:12px">Deductions</div>'+
          ded.map(function(e){return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #fecaca;font-size:13px"><span style="color:#374151">'+e[0]+'</span><span style="font-weight:700;color:#991b1b">₹'+parseFloat(e[1]||0).toLocaleString('en-IN')+'</span></div>';}).join('')+
        '</div>'+
      '</div>'+
      '<div style="background:linear-gradient(135deg,#0F2050,#1AA6CA);border-radius:12px;padding:20px;display:flex;justify-content:space-between;align-items:center;color:#fff">'+
        '<span style="font-size:14px;font-weight:800">Net Pay</span>'+
        '<span style="font-size:28px;font-weight:900">₹'+parseFloat(p.netAmount||0).toLocaleString('en-IN')+'</span>'+
      '</div>'+
    '</div>'+
    '<div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;gap:10px;justify-content:flex-end">'+
      '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Close</button>'+
      '<button class="btn btn-primary" onclick="teacherPrintSlip(\''+id+'\')"><i class="fas fa-print"></i> Print</button>'+
    '</div>'+
  '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
};

window.teacherPrintSlip = function(id) {
  var user = Session.current(); if(!user) return;
  var p = (DB.getSalaryPayments(user.id)||[]).find(function(x){return x.id===id;});
  if(!p) return;
  var meta = DB.getMeta();
  var lh = (typeof _skLetterhead==='function') ? _skLetterhead(meta, 'SALARY SLIP — '+_tFmtMonth(p.month), 'Pay Period: '+_tFmtMonth(p.month)+'&nbsp;&nbsp;|&nbsp;&nbsp;Generated: '+new Date().toLocaleDateString('en-IN')) : null;
  var win = window.open('','_blank');
  if (lh) {
    win.document.write('<!DOCTYPE html><html><head><title>Salary Slip - '+_tFmtMonth(p.month)+'</title><style>'+lh.css+'</style></head><body>'+
      lh.header+
      '<div class="sk-body">'+
        '<table style="margin-bottom:16px">'+
          '<tr><td style="width:50%;border:none;padding:4px 0"><strong>Name:</strong> '+escHtml(user.name)+'</td><td style="border:none;padding:4px 0"><strong>Emp ID:</strong> '+escHtml(user.employeeId||user.empId||user.id)+'</td></tr>'+
          '<tr><td style="border:none;padding:4px 0"><strong>Designation:</strong> '+escHtml(user.designation||'Teacher')+'</td><td style="border:none;padding:4px 0"><strong>Payment Mode:</strong> '+escHtml(p.paymentMode||'Bank Transfer')+'</td></tr>'+
          '<tr><td style="border:none;padding:4px 0"><strong>Bank:</strong> '+escHtml(user.bankName||'—')+'</td><td style="border:none;padding:4px 0"><strong>Account No:</strong> '+escHtml(user.bankAccount||'—')+'</td></tr>'+
        '</table>'+
        '<table>'+
          '<thead><tr><th>Earnings</th><th style="text-align:right">Amount (₹)</th><th>Deductions</th><th style="text-align:right">Amount (₹)</th></tr></thead>'+
          '<tbody>'+
            '<tr><td>Basic Salary</td><td style="text-align:right">'+parseFloat(p.baseSalary||0).toLocaleString('en-IN')+'</td><td>Total Deductions</td><td style="text-align:right">'+parseFloat(p.deductions||0).toLocaleString('en-IN')+'</td></tr>'+
            '<tr><td>Allowances</td><td style="text-align:right">'+parseFloat(p.allowances||0).toLocaleString('en-IN')+'</td><td></td><td></td></tr>'+
            '<tr><td><strong>Gross Earnings</strong></td><td style="text-align:right"><strong>'+parseFloat((parseFloat(p.baseSalary||0)+parseFloat(p.allowances||0))).toLocaleString('en-IN')+'</strong></td><td></td><td></td></tr>'+
          '</tbody>'+
        '</table>'+
        '<table><tr><td class="net-row" colspan="4">NET PAY: ₹ '+parseFloat(p.netAmount||0).toLocaleString('en-IN')+' &nbsp;('+escHtml((typeof _numToWords==='function'?_numToWords(Math.round(p.netAmount||0)):''))+' Only)</td></tr></table>'+
        '<div style="margin-top:40px;display:flex;justify-content:space-between;font-size:12px">'+
          '<div><p>Employee Signature</p><br><p style="font-weight:700">______________________________</p></div>'+
          '<div style="text-align:right"><p>Authorized Signatory</p><br><p style="font-weight:700">______________________________</p><p style="color:#666">'+escHtml(meta.schoolName||'SuperKids India Preschool')+'</p></div>'+
        '</div>'+
        '<div class="footer-note">This is a computer-generated salary slip. No signature required.</div>'+
      '</div>'+
      '<script>window.onload=function(){window.print();}<\/script></body></html>');
  } else {
    // Fallback if _skLetterhead not yet loaded
    win.document.write('<!DOCTYPE html><html><head><title>Salary Slip</title></head><body>'+
      '<h2>'+escHtml(meta.schoolName||'SuperKids India Preschool')+'</h2>'+
      '<p>NET PAY: ₹'+parseFloat(p.netAmount||0).toLocaleString('en-IN')+'</p>'+
      '<script>window.onload=function(){window.print();}<\/script></body></html>');
  }
  win.document.close();
};

window.teacherDownloadSalaryCert = function() {
  var user = Session.current(); if(!user) return;
  var meta = DB.getMeta();
  var structs = DB.getSalaryStructures(user.id);
  var latest = structs[0];
  var today = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  var lh = (typeof _skLetterhead==='function') ? _skLetterhead(meta, 'SALARY CERTIFICATE', 'Date: '+today+'&nbsp;&nbsp;|&nbsp;&nbsp;Ref: '+escHtml(user.employeeId||user.id)+'/SC/'+new Date().getFullYear()) : null;
  var sName = meta.schoolName||meta.name||'SuperKids India Preschool';
  var win = window.open('','_blank');
  win.document.write('<!DOCTYPE html><html><head><title>Salary Certificate</title><style>'+(lh?lh.css:'body{font-family:Arial,sans-serif;margin:60px;color:#333;line-height:1.8}')+'p{margin-bottom:14px;font-size:14px}</style></head><body>'+
    (lh ? lh.header : '<h1>'+escHtml(sName)+'</h1>')+
    '<div class="sk-body">'+
      '<p>To Whom It May Concern,</p>'+
      '<p>This is to certify that <strong>'+escHtml(user.name)+'</strong>, Employee ID: <strong>'+escHtml(user.employeeId||user.empId||user.id)+'</strong>, is employed as <strong>'+escHtml(user.designation||'Teacher')+'</strong> at <strong>'+escHtml(sName)+'</strong>'+(user.joiningDate?' with effect from <strong>'+formatDate(user.joiningDate)+'</strong>':'')+'.</p>'+
      (latest?'<p>Their gross monthly salary is <strong>₹'+parseFloat(latest.grossSalary||0).toLocaleString('en-IN')+'</strong> and net monthly salary is <strong>₹'+parseFloat(latest.netSalary||0).toLocaleString('en-IN')+'</strong> (Rupees '+escHtml(_numToWords(Math.round(latest.netSalary||0)))+' only).</p>':'<p>Their current monthly salary is <strong>₹'+parseFloat(user.baseSalary||0).toLocaleString('en-IN')+'</strong> per month.</p>')+
      '<p>This certificate is issued on request for official/banking/visa purposes only and does not constitute any guarantee or obligation on the part of the institution.</p>'+
      '<div class="signature">'+
        '<p>Yours faithfully,</p><br><br>'+
        '<p style="font-weight:700">______________________________</p>'+
        '<p style="font-weight:700">Principal / HR Manager</p>'+
        '<p style="color:#666">'+escHtml(sName)+'</p>'+
      '</div>'+
      '<div class="footer-note">Computer-generated salary certificate — '+escHtml(sName)+'. Not valid without official stamp.</div>'+
    '</div>'+
    '<script>window.onload=function(){window.print();}<\/script></body></html>');
  win.document.close();
};

function _numToWords(n) {
  if (n===0) return 'Zero';
  var ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  var tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function two(n){return n<20?ones[n]:tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');}
  function three(n){return n>=100?ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+two(n%100):''):two(n);}
  if(n<1000)return three(n);
  if(n<100000)return three(Math.floor(n/1000))+' Thousand'+(n%1000?' '+three(n%1000):'');
  if(n<10000000)return three(Math.floor(n/100000))+' Lakh'+(n%100000?' '+_numToWords(n%100000):'');
  return three(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+_numToWords(n%10000000):'');
}

// ============================================================
// 5. DOCUMENTS & LETTERS
// ============================================================
function renderTeacherDocuments() {
  var user = Session.current();
  if (!user || user.role !== 'subadmin') { renderLogin(); return; }

  var myLetters = DB.getHRLetters(user.id);
  var myRequests = DB.getHRDocumentRequests(user.id);
  var tab = window._tDocTab || 'letters';

  var letterTypeIcons = {'Offer Letter':'fa-envelope-open-text','Appointment Letter':'fa-user-check','Probation Confirmation':'fa-check-circle','Promotion Letter':'fa-arrow-up','Increment Letter':'fa-chart-line','Experience Letter':'fa-certificate','Relieving Letter':'fa-sign-out-alt','Salary Certificate':'fa-file-invoice','Service Certificate':'fa-award'};
  var letterTypeBg = {'Offer Letter':'#dbeafe:#1e40af','Appointment Letter':'#d1fae5:#065f46','Probation Confirmation':'#fef3c7:#92400e','Promotion Letter':'#e0e7ff:#3730a3','Increment Letter':'#dcfce7:#166534','Experience Letter':'#fce7f3:#9d174d','Relieving Letter':'#fee2e2:#991b1b','Salary Certificate':'#f0fdf4:#065f46','Service Certificate':'#eff6ff:#1e40af'};

  var requestableTypes = ['Offer Letter','Appointment Letter','Experience Letter','Salary Certificate','Service Certificate','NOC','Form-16','Increment Letter'];

  var lettersContent = `
    <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
      <h3 style="font-size:14px;font-weight:800;margin:0 0 16px;color:#0F2050"><i class="fas fa-file-contract" style="color:#6366f1;margin-right:8px"></i>My HR Letters & Documents</h3>
      ${myLetters.length===0?'<div style="text-align:center;color:#94a3b8;padding:60px"><i class="fas fa-folder-open" style="font-size:40px;display:block;margin-bottom:12px"></i>No documents issued yet.<br><span style="font-size:13px">Request from HR using the "Request Document" tab.</span></div>':
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">'+
          myLetters.map(function(l){
            var icon = letterTypeIcons[l.type]||'fa-file-alt';
            var bg = (letterTypeBg[l.type]||'#f1f5f9:#475569').split(':');
            return '<div style="background:'+bg[0]+';border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:8px">'+
              '<i class="fas '+icon+'" style="font-size:24px;color:'+bg[1]+'"></i>'+
              '<div style="font-size:13px;font-weight:800;color:'+bg[1]+'">'+escHtml(l.type)+'</div>'+
              '<div style="font-size:11px;color:'+bg[1]+';opacity:0.7">Issued: '+formatDate(l.issuedDate)+'</div>'+
              '<button onclick="teacherPrintIssuedLetter(\''+l.id+'\')" style="background:rgba(0,0,0,0.1);border:none;border-radius:8px;padding:6px 12px;color:'+bg[1]+';font-size:11px;font-weight:700;cursor:pointer"><i class="fas fa-download" style="margin-right:4px"></i>Download</button>'+
            '</div>';
          }).join('')+
        '</div>'}
    </div>`;

  var requestContent = `
    <div>
      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:20px">
        <h3 style="font-size:14px;font-weight:800;margin:0 0 16px;color:#0F2050"><i class="fas fa-paper-plane" style="color:#10b981;margin-right:8px"></i>Request a Document</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
          ${requestableTypes.map(function(type){
            var icon = letterTypeIcons[type]||'fa-file-alt';
            return '<button onclick="teacherRequestDoc(\''+escHtml(type)+'\')" style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;cursor:pointer;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;transition:all 0.2s" onmouseenter="this.style.borderColor=\'#6366f1\';this.style.background=\'#eff6ff\'" onmouseleave="this.style.borderColor=\'#e2e8f0\';this.style.background=\'#f8fafc\'">'+
              '<i class="fas '+icon+'" style="font-size:20px;color:#6366f1"></i>'+
              '<span style="font-size:12px;font-weight:700;color:#374151">'+escHtml(type)+'</span>'+
            '</button>';
          }).join('')}
        </div>
      </div>
      ${myRequests.length > 0 ? `
      <div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <h3 style="font-size:14px;font-weight:800;margin:0 0 16px;color:#0F2050">Request History</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
            <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Document Type</th>
            <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Requested</th>
            <th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Note</th>
            <th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Status</th>
          </tr></thead>
          <tbody>${myRequests.map(function(r){return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:10px 12px;font-weight:600;color:#374151">'+escHtml(r.docType)+'</td><td style="padding:10px 12px;color:#64748b;font-size:12px">'+formatDate(r.createdAt)+'</td><td style="padding:10px 12px;color:#64748b;font-size:12px">'+escHtml(r.note||'—')+'</td><td style="padding:10px 12px;text-align:center">'+_statusBadge(r.status)+'</td></tr>';}).join('')}</tbody>
        </table>
      </div>` : ''}
    </div>`;

  var content = `
    <div>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button class="btn btn-sm ${tab==='letters'?'btn-primary':'btn-secondary'}" onclick="window._tDocTab='letters';renderTeacherDocuments()"><i class="fas fa-folder-open" style="margin-right:4px"></i>My Letters</button>
        <button class="btn btn-sm ${tab==='request'?'btn-primary':'btn-secondary'}" onclick="window._tDocTab='request';renderTeacherDocuments()"><i class="fas fa-paper-plane" style="margin-right:4px"></i>Request Document</button>
      </div>
      ${tab==='letters' ? lettersContent : requestContent}
    </div>`;

  renderLayout('teacher-documents', content, 'My Documents', 'My Account / Documents');
}

window.teacherRequestDoc = function(docType) {
  var user = Session.current(); if(!user) return;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:28px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.2)">'+
    '<h3 style="margin:0 0 16px;font-size:16px;font-weight:800;color:#0F2050"><i class="fas fa-paper-plane" style="color:#10b981;margin-right:8px"></i>Request: '+escHtml(docType)+'</h3>'+
    '<div style="margin-bottom:14px"><label class="form-label">Purpose / Note (optional)</label><textarea id="docreq-note" class="form-control" rows="3" placeholder="Why do you need this document?" style="resize:none"></textarea></div>'+
    '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#1e40af"><i class="fas fa-info-circle" style="margin-right:6px"></i>HR will process your request within 2-3 working days.</div>'+
    '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button><button class="btn btn-primary" onclick="teacherSubmitDocRequest(\''+escHtml(docType)+'\')"><i class="fas fa-paper-plane"></i> Submit Request</button></div>'+
  '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
};

window.teacherSubmitDocRequest = function(docType) {
  var user = Session.current(); if(!user) return;
  var note = ((document.getElementById('docreq-note')||{}).value||'').trim();
  DB.addHRDocumentRequest({ id:'hdr_'+Date.now(), teacherId:user.id, teacherName:user.name, docType:docType, note:note, status:'Pending', createdAt:new Date().toISOString() });
  document.querySelector('.modal-overlay').remove();
  showToast('Document request submitted to HR!','success');
  renderTeacherDocuments();
};

window.teacherPrintIssuedLetter = function(letterId) {
  var user = Session.current(); if(!user) return;
  var letters = DB.getHRLetters(user.id);
  var letter = letters.find(function(l){return l.id===letterId;});
  if(!letter){showToast('Letter not found','error');return;}
  // Re-generate the letter using the same generator from teachers.js if available
  if(typeof generateHRLetter === 'function') {
    generateHRLetter(user.id, letter.type);
  } else {
    var meta = DB.getMeta();
    var today = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
    var lh2 = (typeof _skLetterhead==='function') ? _skLetterhead(meta, letter.type.toUpperCase(), 'Date: '+formatDate(letter.issuedDate||letter.createdAt)+'&nbsp;&nbsp;|&nbsp;&nbsp;Ref: '+escHtml(user.employeeId||user.id)+'/'+new Date().getFullYear()) : null;
    var sName2 = meta.schoolName||meta.name||'SuperKids India Preschool';
    var win = window.open('','_blank');
    win.document.write('<!DOCTYPE html><html><head><title>'+escHtml(letter.type)+'</title><style>'+(lh2?lh2.css:'body{font-family:Arial,sans-serif;margin:60px;color:#333;line-height:1.8}')+'p{margin-bottom:14px}</style></head><body>'+
      (lh2?lh2.header:'<h1>'+escHtml(sName2)+'</h1>')+
      '<div class="sk-body">'+
        '<p>To Whom It May Concern,</p>'+
        '<p>This is to certify that <strong>'+escHtml(user.name)+'</strong> (Employee ID: '+escHtml(user.employeeId||user.empId||user.id)+') is employed with <strong>'+escHtml(sName2)+'</strong> as <strong>'+escHtml(user.designation||'Teacher')+'</strong>.</p>'+
        '<p>This letter is issued on request for official purposes.</p>'+
        '<div class="signature">'+
          '<p>Yours faithfully,</p><br><br>'+
          '<p style="font-weight:700">______________________________</p>'+
          '<p style="font-weight:700">Principal / HR Manager</p>'+
          '<p style="color:#666">'+escHtml(sName2)+'</p>'+
        '</div>'+
        '<div class="footer-note">Computer-generated document — '+escHtml(sName2)+'</div>'+
      '</div>'+
      '<script>window.onload=function(){window.print();}<\/script></body></html>');
    win.document.close();
  }
};

// ============================================================
// 6 & 7. RESIGNATION & EXIT DOCUMENTS
// ============================================================
function renderTeacherResignation() {
  var user = Session.current();
  if (!user || user.role !== 'subadmin') { renderLogin(); return; }

  var myResignation = (DB.getResignationRecords(user.id)||[])[0];
  var myExitRec = (DB.getStaffExitRecords(user.id)||[])[0];
  var tab = window._tResTab || (myResignation ? 'status' : 'submit');

  var statusColors = { Pending:'#fef3c7:#92400e', Approved:'#d1fae5:#065f46', Rejected:'#fee2e2:#991b1b', Processing:'#dbeafe:#1e40af', Completed:'#f0fdf4:#065f46' };

  var submitContent = myResignation && myResignation.status !== 'Rejected' ? `
    <div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:12px;padding:20px;text-align:center">
      <i class="fas fa-check-circle" style="font-size:40px;color:#059669;display:block;margin-bottom:12px"></i>
      <div style="font-size:16px;font-weight:800;color:#065f46">Resignation Already Submitted</div>
      <div style="font-size:13px;color:#065f46;margin-top:8px">Status: ${_statusBadge(myResignation.status)}</div>
      <div style="font-size:12px;color:#64748b;margin-top:6px">Submitted on ${formatDate(myResignation.createdAt)}</div>
    </div>` : `
    <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:20px;font-size:13px;color:#991b1b">
        <i class="fas fa-exclamation-triangle" style="margin-right:6px"></i>
        Please read your employment contract before submitting resignation. A notice period as specified will apply.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div><label class="form-label">Resignation Date *</label><input id="res-date" class="form-control" type="date" value="${new Date().toISOString().slice(0,10)}"/></div>
        <div><label class="form-label">Proposed Last Working Day *</label><input id="res-lwd" class="form-control" type="date"/></div>
        <div style="grid-column:1/-1"><label class="form-label">Reason for Resignation *</label>
          <select id="res-reason" class="form-control">
            <option value="">-- Select reason --</option>
            ${['Personal Reasons','Career Growth','Higher Studies','Relocation','Better Opportunity','Health Reasons','Other'].map(function(r){return '<option value="'+r+'">'+r+'</option>';}).join('')}
          </select>
        </div>
        <div style="grid-column:1/-1"><label class="form-label">Resignation Letter / Additional Note</label><textarea id="res-note" class="form-control" rows="4" placeholder="Write your resignation note or paste resignation letter content..." style="resize:none"></textarea></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button class="btn btn-danger" onclick="teacherSubmitResignation()"><i class="fas fa-paper-plane"></i> Submit Resignation</button>
      </div>
    </div>`;

  var statusContent = myResignation ? `
    <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <div>
          <h3 style="font-size:15px;font-weight:800;color:#0F2050;margin:0 0 6px">Resignation Status</h3>
          <div>${_statusBadge(myResignation.status)}</div>
        </div>
        ${myResignation.status==='Rejected'?'<button class="btn btn-danger btn-sm" onclick="window._tResTab=\'submit\';renderTeacherResignation()"><i class="fas fa-redo"></i> Re-submit</button>':''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:13px">
        <div style="background:#f8fafc;border-radius:10px;padding:14px"><div style="font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:4px">SUBMITTED ON</div><div style="font-weight:700;color:#374151">${formatDate(myResignation.createdAt)}</div></div>
        <div style="background:#f8fafc;border-radius:10px;padding:14px"><div style="font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:4px">PROPOSED LAST DAY</div><div style="font-weight:700;color:#374151">${formatDate(myResignation.lastWorkingDay)}</div></div>
        <div style="background:#f8fafc;border-radius:10px;padding:14px"><div style="font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:4px">REASON</div><div style="font-weight:700;color:#374151">${escHtml(myResignation.reason||'—')}</div></div>
        <div style="background:#f8fafc;border-radius:10px;padding:14px"><div style="font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:4px">HR REMARKS</div><div style="font-weight:700;color:#374151">${escHtml(myResignation.hrRemarks||'Awaiting review')}</div></div>
      </div>
      ${myResignation.note?'<div style="margin-top:16px;background:#f8fafc;border-radius:10px;padding:14px"><div style="font-size:11px;color:#94a3b8;font-weight:700;margin-bottom:4px">RESIGNATION NOTE</div><div style="font-size:13px;color:#374151;line-height:1.6">'+escHtml(myResignation.note)+'</div></div>':''}
    </div>` : '<div style="text-align:center;color:#94a3b8;padding:60px"><i class="fas fa-inbox" style="font-size:40px;display:block;margin-bottom:12px"></i>No resignation submitted yet</div>';

  // Exit Documents Section
  var exitDocTypes = ['Experience Letter','Relieving Letter','Service Certificate','Salary Certificate','Full & Final Settlement Letter'];
  var canDownloadExit = myExitRec && (myExitRec.exitStatus === 'Relieved' || myExitRec.exitStatus === 'Archived' || myResignation && myResignation.status === 'Approved');

  var exitDocsContent = `
    <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
      <h3 style="font-size:14px;font-weight:800;margin:0 0 16px;color:#0F2050"><i class="fas fa-file-export" style="color:#6366f1;margin-right:8px"></i>Exit Documents</h3>
      ${!canDownloadExit ? '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;font-size:13px;color:#92400e;margin-bottom:16px"><i class="fas fa-lock" style="margin-right:6px"></i>Exit documents will be available after your resignation is approved and relieving is processed by HR.</div>' : ''}
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px">
        ${exitDocTypes.map(function(type){
          var icons={'Experience Letter':'fa-certificate','Relieving Letter':'fa-sign-out-alt','Service Certificate':'fa-award','Salary Certificate':'fa-file-invoice','Full & Final Settlement Letter':'fa-rupee-sign'};
          var icon = icons[type]||'fa-file-alt';
          return '<div style="border:1px solid '+(canDownloadExit?'#e2e8f0':'#e2e8f0')+';border-radius:12px;padding:20px;text-align:center;background:'+(canDownloadExit?'#f8fafc':'#f1f5f9')+'">'+
            '<i class="fas '+icon+'" style="font-size:24px;color:'+(canDownloadExit?'#6366f1':'#cbd5e1')+';display:block;margin-bottom:8px"></i>'+
            '<div style="font-size:12px;font-weight:700;color:'+(canDownloadExit?'#374151':'#94a3b8')+';margin-bottom:8px">'+escHtml(type)+'</div>'+
            (canDownloadExit?'<button onclick="teacherDownloadExitDoc(\''+escHtml(type)+'\')" style="background:#6366f1;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;cursor:pointer"><i class="fas fa-download" style="margin-right:4px"></i>Download</button>':
              '<span style="font-size:11px;color:#94a3b8"><i class="fas fa-lock" style="margin-right:4px"></i>Locked</span>')+
          '</div>';
        }).join('')}
      </div>
    </div>`;

  var content = `
    <div>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button class="btn btn-sm ${tab==='submit'?'btn-primary':'btn-secondary'}" onclick="window._tResTab='submit';renderTeacherResignation()"><i class="fas fa-paper-plane" style="margin-right:4px"></i>Submit Resignation</button>
        <button class="btn btn-sm ${tab==='status'?'btn-primary':'btn-secondary'}" onclick="window._tResTab='status';renderTeacherResignation()"><i class="fas fa-tasks" style="margin-right:4px"></i>Track Status</button>
        <button class="btn btn-sm ${tab==='exit'?'btn-primary':'btn-secondary'}" onclick="window._tResTab='exit';renderTeacherResignation()"><i class="fas fa-file-export" style="margin-right:4px"></i>Exit Documents</button>
      </div>
      ${tab==='submit' ? submitContent : tab==='status' ? statusContent : exitDocsContent}
    </div>`;

  renderLayout('teacher-resignation', content, 'Resignation', 'My Account / Resignation');
}

window.teacherSubmitResignation = function() {
  var user = Session.current(); if(!user) return;
  var date = (document.getElementById('res-date')||{}).value;
  var lwd = (document.getElementById('res-lwd')||{}).value;
  var reason = (document.getElementById('res-reason')||{}).value;
  var note = ((document.getElementById('res-note')||{}).value||'').trim();
  if(!date||!lwd||!reason){showToast('Please fill all required fields','error');return;}
  if(lwd<=date){showToast('Last working day must be after resignation date','error');return;}
  DB.addResignationRecord({ id:'res_'+Date.now(), teacherId:user.id, teacherName:user.name, designation:user.designation||'Teacher', resignationDate:date, lastWorkingDay:lwd, reason:reason, note:note, status:'Pending', hrRemarks:'', createdAt:new Date().toISOString() });
  showToast('Resignation submitted successfully!','success');
  window._tResTab='status';
  renderTeacherResignation();
};

window.teacherDownloadExitDoc = function(type) {
  var user = Session.current(); if(!user) return;
  if(typeof generateHRLetter === 'function') {
    generateHRLetter(user.id, type);
  } else {
    var meta = DB.getMeta();
    var today = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
    var myExit = (DB.getStaffExitRecords(user.id)||[])[0];
    var lwd = myExit&&myExit.lastWorkingDate ? new Date(myExit.lastWorkingDate).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}) : today;
    var joining = user.joiningDate ? new Date(user.joiningDate).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}) : '—';
    var lhX = (typeof _skLetterhead==='function') ? _skLetterhead(meta, type.toUpperCase(), 'Date: '+today+'&nbsp;&nbsp;|&nbsp;&nbsp;Ref: '+escHtml(user.employeeId||user.id)+'/'+new Date().getFullYear()) : null;
    var sNameX = meta.schoolName||meta.name||'SuperKids India Preschool';
    var win = window.open('','_blank');
    win.document.write('<!DOCTYPE html><html><head><title>'+escHtml(type)+'</title><style>'+(lhX?lhX.css:'body{font-family:Arial,sans-serif;margin:60px;color:#333;line-height:1.8}')+'p{margin-bottom:14px}</style></head><body>'+
      (lhX?lhX.header:'<h1>'+escHtml(sNameX)+'</h1>')+
      '<div class="sk-body">'+
        '<p>To Whom It May Concern,</p>'+
        '<p>This is to certify that <strong>'+escHtml(user.name)+'</strong> (Emp ID: <strong>'+escHtml(user.employeeId||user.empId||user.id)+'</strong>) worked as <strong>'+escHtml(user.designation||'Teacher')+'</strong> at <strong>'+escHtml(sNameX)+'</strong> from <strong>'+joining+'</strong> to <strong>'+lwd+'</strong>.</p>'+
        '<p>They have discharged their duties diligently and professionally. We wish them the very best in their future endeavours.</p>'+
        '<div class="signature">'+
          '<p>Yours faithfully,</p><br><br>'+
          '<p style="font-weight:700">______________________________</p>'+
          '<p style="font-weight:700">Principal / HR Manager</p>'+
          '<p style="color:#666">'+escHtml(sNameX)+'</p>'+
        '</div>'+
        '<div class="footer-note">Computer-generated document — '+escHtml(sNameX)+'</div>'+
      '</div>'+
      '<script>window.onload=function(){window.print();}<\/script></body></html>');
    win.document.close();
    DB.addHRLetter({id:'rl_'+Date.now(), teacherId:user.id, type:type, issuedDate:new Date().toISOString().slice(0,10), issuedBy:user.id, createdAt:new Date().toISOString()});
  }
};

// ============================================================
// ROUTES
// ============================================================
registerRoute('teacher-profile', renderTeacherProfile);
registerRoute('teacher-attendance', renderTeacherAttendance);
registerRoute('teacher-leaves', renderTeacherLeaves);
registerRoute('teacher-salary', renderTeacherSalary);
registerRoute('teacher-documents', renderTeacherDocuments);
registerRoute('teacher-resignation', renderTeacherResignation);
