// ============================================================
// Teacher Management Module — Superadmin
// Covers: Onboarding, HR Letters, Salary Structure, Payroll
// ============================================================

function _escH(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _genEmpId() {
  var ts = (DB.get().users || []).filter(function(u) { return u.role === 'subadmin' && !u.deleted; });
  var yr = new Date().getFullYear().toString().slice(-2);
  return 'SKI' + yr + String(ts.length + 1).padStart(4, '0');
}
function _empBadge(t) {
  var m = { 'Full-Time':['#dbeafe','#1e40af'], 'Part-Time':['#fef3c7','#92400e'], 'Contract':['#e0e7ff','#3730a3'], 'Intern':['#ecfdf5','#065f46'] };
  var p = m[t] || ['#f1f5f9','#475569'];
  return '<span style="background:'+p[0]+';color:'+p[1]+';padding:2px 9px;border-radius:6px;font-size:11px;font-weight:700">'+(t||'Full-Time')+'</span>';
}
function _fmtMonth(m) {
  if (!m) return '-';
  var names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var p = m.split('-'); return (names[parseInt(p[1])-1]||p[1])+' '+p[0];
}

// ==================== LIST ====================
function renderTeachers() {
  var user = Session.current();
  if (!user || user.role !== 'superadmin') { renderLogin(); return; }
  var data = DB.get();
  var all = (data.users || []).filter(function(u) { return u.role === 'subadmin' && !u.deleted; });
  var af = window._tchFilter || 'All';
  var filtered = all.filter(function(t) {
    var active = t.active !== false && t.employmentStatus !== 'Resigned' && t.employmentStatus !== 'Terminated';
    if (af === 'Active') return active;
    if (af === 'Inactive') return !active;
    if (af === 'Probation') return t.employmentStatus === 'Probation';
    if (af === 'Contract') return t.employmentType === 'Contract';
    return true;
  });

  var stats = [
    ['Total Staff', all.length, '#e0e7ff','#0F2050','fa-users'],
    ['Active', all.filter(function(t){return t.active!==false&&t.employmentStatus!=='Resigned';}).length,'#d1fae5','#065f46','fa-check-circle'],
    ['On Probation', all.filter(function(t){return t.employmentStatus==='Probation';}).length,'#fef3c7','#92400e','fa-hourglass-half'],
    ['Contract', all.filter(function(t){return t.employmentType==='Contract';}).length,'#dbeafe','#1e40af','fa-file-signature'],
  ];

  var rows = filtered.map(function(t) {
    var cls = (data.classes||[]).find(function(c){return c.teacherId===t.id;});
    var active = t.active!==false && t.employmentStatus!=='Resigned' && t.employmentStatus!=='Terminated';
    var esl = t.employmentStatus==='Probation'?'Probation':(!active?(t.employmentStatus||'Inactive'):'Active');
    var esbg = esl==='Active'?'#d1fae5':esl==='Probation'?'#fef3c7':'#fee2e2';
    var esc = esl==='Active'?'#065f46':esl==='Probation'?'#92400e':'#991b1b';
    return '<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background 0.15s" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'\'" onclick="openTeacherDetail(\''+t.id+'\')">'+
      '<td style="padding:12px"><div style="display:flex;align-items:center;gap:10px">'+
        '<div style="width:38px;height:38px;border-radius:50%;background:'+(t.avatar||'#10b981')+';display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;color:#fff;flex-shrink:0">'+(t.name||'T').charAt(0).toUpperCase()+'</div>'+
        '<div><div style="font-weight:700;color:#0F2050">'+_escH(t.name)+'</div><div style="font-size:11px;color:#94a3b8">'+(cls?cls.name:(t.email||'—'))+'</div></div>'+
      '</div></td>'+
      '<td style="padding:12px;color:#475569;font-family:monospace;font-size:12px;font-weight:600">'+_escH(t.employeeId||'—')+'</td>'+
      '<td style="padding:12px;color:#64748b">'+_escH(t.designation||'Teacher')+'</td>'+
      '<td style="padding:12px">'+_empBadge(t.employmentType||'Full-Time')+'</td>'+
      '<td style="padding:12px;color:#64748b">'+(t.joiningDate?formatDate(t.joiningDate):'—')+'</td>'+
      '<td style="padding:12px;text-align:right;font-weight:700;color:#374151">₹'+parseFloat(t.baseSalary||0).toLocaleString('en-IN')+'</td>'+
      '<td style="padding:12px;text-align:center"><span style="background:'+esbg+';color:'+esc+';padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700">'+esl+'</span></td>'+
      '<td style="padding:12px;text-align:center" onclick="event.stopPropagation()">'+
        '<button class="btn btn-primary btn-sm" onclick="_tchQuickActions(\''+t.id+'\')" title="Actions"><i class="fas fa-ellipsis-v"></i> Actions</button>'+
      '</td>'+
    '</tr>';
  }).join('');

  var content = '<div>'+
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">'+
      stats.map(function(s){
        return '<div style="background:'+s[2]+';border-radius:14px;padding:16px;display:flex;align-items:center;gap:12px">'+
          '<div style="width:42px;height:42px;border-radius:12px;background:rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:center"><i class="fas '+s[4]+'" style="color:'+s[3]+';font-size:18px"></i></div>'+
          '<div><div style="font-size:24px;font-weight:900;color:'+s[3]+'">'+s[1]+'</div>'+
          '<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:'+s[3]+'">'+s[0]+'</div></div>'+
        '</div>';
      }).join('')+
    '</div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">'+
      '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
        ['All','Active','Inactive','Probation','Contract'].map(function(f){
          return '<button class="btn btn-sm '+(f===af?'btn-primary':'btn-secondary')+'" onclick="_tchSetFilter(\''+f+'\')">'+f+'</button>';
        }).join('')+
      '</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
        '<button class="btn btn-secondary" onclick="openAttendanceReport(null)" title="Attendance Report"><i class="fas fa-chart-bar"></i> Attendance</button>'+
        '<button class="btn btn-secondary" onclick="openLeaveTypeConfig()" title="Configure Leave Types"><i class="fas fa-sliders-h"></i> Leave Config</button>'+
        '<button class="btn btn-primary" onclick="openTeacherOnboarding(null)"><i class="fas fa-user-plus"></i> Add Teacher</button>'+
      '</div>'+
    '</div>'+
    (filtered.length===0
      ? '<div style="background:#fff;border-radius:16px;padding:60px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><i class="fas fa-chalkboard-teacher" style="font-size:42px;color:#cbd5e1;display:block;margin-bottom:12px"></i><div style="color:#64748b;font-size:15px;font-weight:600">No teachers found</div><div style="color:#94a3b8;font-size:13px;margin-top:6px">Click "Add Teacher" to start onboarding.</div></div>'
      : '<div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);overflow-x:auto">'+
          '<table style="width:100%;border-collapse:collapse;font-size:13px;min-width:740px">'+
            '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
              '<th style="text-align:left;padding:12px;color:#64748b;font-weight:700">Employee</th>'+
              '<th style="text-align:left;padding:12px;color:#64748b;font-weight:700">Emp ID</th>'+
              '<th style="text-align:left;padding:12px;color:#64748b;font-weight:700">Designation</th>'+
              '<th style="text-align:left;padding:12px;color:#64748b;font-weight:700">Type</th>'+
              '<th style="text-align:left;padding:12px;color:#64748b;font-weight:700">Joining</th>'+
              '<th style="text-align:right;padding:12px;color:#64748b;font-weight:700">CTC</th>'+
              '<th style="text-align:center;padding:12px;color:#64748b;font-weight:700">Status</th>'+
              '<th style="text-align:center;padding:12px;color:#64748b;font-weight:700">Actions</th>'+
            '</tr></thead>'+
            '<tbody>'+rows+'</tbody>'+
          '</table></div>')
    +'</div>';

  renderLayout('teachers', content, 'Teacher Management', 'Teachers');
}
window._tchSetFilter = function(f) { window._tchFilter = f; renderTeachers(); };

// ==================== DETAIL MODAL ====================
window.openTeacherDetail = function(teacherId) {
  var data = DB.get();
  var t = (data.users||[]).find(function(u){return u.id===teacherId;});
  if (!t) return;
  var cls = (data.classes||[]).find(function(c){return c.teacherId===t.id;});
  var salStructs = DB.getSalaryStructures(teacherId);
  var latestStruct = salStructs[0] || {};
  var hrLetters = DB.getHRLetters(teacherId);
  var salPayments = DB.getSalaryPayments(teacherId);

  function row(label, val) {
    return '<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;gap:8px">'+
      '<span style="min-width:180px;font-size:12px;color:#64748b;font-weight:600">'+label+'</span>'+
      '<span style="font-size:13px;color:#374151;font-weight:600">'+(val||'<span style="color:#94a3b8">—</span>')+'</span>'+
    '</div>';
  }

  var activeStruct = latestStruct.id ? latestStruct : null;
  var letterTypeBadge = {'Offer Letter':'#dbeafe:#1e40af','Appointment Letter':'#d1fae5:#065f46','Probation Confirmation':'#fef3c7:#92400e','Promotion Letter':'#e0e7ff:#3730a3','Increment Letter':'#ecfdf5:#15803d','Experience Letter':'#fce7f3:#9d174d','Relieving Letter':'#fee2e2:#991b1b'};

  var actDate = t.active!==false && t.employmentStatus!=='Resigned' && t.employmentStatus!=='Terminated';
  var esLabel = t.employmentStatus==='Probation'?'Probation':(!actDate?(t.employmentStatus||'Inactive'):'Active');
  var esBg = esLabel==='Active'?'#d1fae5':esLabel==='Probation'?'#fef3c7':'#fee2e2';
  var esColor = esLabel==='Active'?'#065f46':esLabel==='Probation'?'#92400e':'#991b1b';

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'tch-detail-modal';
  overlay.innerHTML = '<div class="modal" style="max-width:760px;width:calc(100% - 24px);max-height:90vh;display:flex;flex-direction:column;padding:0">'+

    // Header
    '<div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:16px;flex-shrink:0">'+
      '<div style="width:56px;height:56px;border-radius:50%;background:'+(t.avatar||'#10b981')+';display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;flex-shrink:0">'+(t.name||'T').charAt(0).toUpperCase()+'</div>'+
      '<div style="flex:1">'+
        '<div style="font-size:18px;font-weight:900;color:#0F2050">'+_escH(t.name)+'</div>'+
        '<div style="font-size:13px;color:#64748b">'+_escH(t.designation||'Teacher')+(t.employeeId?' &nbsp;|&nbsp; <code style="background:#f1f5f9;padding:1px 6px;border-radius:4px;font-size:11px">'+_escH(t.employeeId)+'</code>':'')+'</div>'+
      '</div>'+
      '<span style="background:'+esBg+';color:'+esColor+';padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700">'+esLabel+'</span>'+
      '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'tch-detail-modal\').remove()"><i class="fas fa-times"></i></button>'+
    '</div>'+

    // Tab bar
    '<div style="display:flex;border-bottom:2px solid #e2e8f0;overflow-x:auto;flex-shrink:0;padding:0 24px;background:#fff" id="tch-det-tabs">'+
      ['Profile','Documents','Education','Bank','Employment','HR Letters','Payroll'].map(function(tab,i){
        return '<button onclick="_tchDetTab('+i+')" id="tch-det-tab-'+i+'" style="padding:10px 14px;font-size:12px;font-weight:700;border:none;cursor:pointer;background:none;color:'+(i===0?'#10b981':'#64748b')+';border-bottom:'+(i===0?'2px solid #10b981':'2px solid transparent')+';margin-bottom:-2px;white-space:nowrap;transition:color 0.2s">'+tab+'</button>';
      }).join('')+
    '</div>'+

    // Content
    '<div style="overflow-y:auto;padding:20px 24px;flex:1">'+

      // Profile tab
      '<div id="tch-det-0">'+
        row('Full Name', _escH(t.name))+
        row('Employee ID', _escH(t.employeeId))+
        row('Gender', t.gender)+
        row('Date of Birth', t.dob ? formatDate(t.dob) : '')+
        row('Mobile', _escH(t.phone||t.mobile))+
        row('Email', _escH(t.email))+
        row('Blood Group', t.bloodGroup)+
        row('Marital Status', t.maritalStatus)+
        row('Current Address', _escH(t.currentAddress||t.address))+
        row('Permanent Address', _escH(t.permanentAddress))+
        row('Emergency Contact', _escH(t.emergencyContactName) + (t.emergencyContactPhone ? ' — ' + _escH(t.emergencyContactPhone) : ''))+
      '</div>'+

      // Documents tab
      '<div id="tch-det-1" style="display:none">'+
        row('Aadhaar No.', _escH(t.aadhaarNo))+
        row('PAN No.', _escH(t.panNo))+
        row('Passport No.', _escH(t.passportNo))+
        row('Driving License', _escH(t.drivingLicenseNo))+
        '<div style="margin-top:16px;padding:14px;background:#f8fafc;border-radius:10px;border:1px dashed #cbd5e1;font-size:12px;color:#64748b">'+
          '<i class="fas fa-info-circle" style="margin-right:6px"></i>Physical document scans can be attached via the Edit profile.</div>'+
      '</div>'+

      // Education tab
      '<div id="tch-det-2" style="display:none">'+
        row('SSC (10th)', _escH(t.qualSSC))+
        row('HSC (12th)', _escH(t.qualHSC))+
        row('Graduation', _escH(t.qualGraduation))+
        row('B.Ed. / D.Ed. / NTT / Montessori', _escH(t.qualBEd))+
        row('Other Certifications', _escH(t.qualOther))+
        row('Experience Summary', _escH(t.experienceSummary))+
      '</div>'+

      // Bank tab
      '<div id="tch-det-3" style="display:none">'+
        row('Account Holder', _escH(t.bankAccountHolder))+
        row('Bank Name', _escH(t.bankName))+
        row('Account Number', _escH(t.bankAccount))+
        row('IFSC Code', _escH(t.ifsc))+
        row('UPI ID', _escH(t.upiId))+
      '</div>'+

      // Employment tab
      '<div id="tch-det-4" style="display:none">'+
        row('Joining Date', t.joiningDate ? formatDate(t.joiningDate) : '')+
        row('Designation', _escH(t.designation))+
        row('Department', _escH(t.department))+
        row('Class Assigned', cls ? _escH(cls.name) : (t.assignedClass||''))+
        row('Employment Type', _empBadge(t.employmentType||'Full-Time'))+
        row('Employment Status', '<span style="background:'+esBg+';color:'+esColor+';padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">'+esLabel+'</span>')+
        row('Probation Period', t.probationPeriod ? t.probationPeriod + ' months' : '')+
        row('Confirmation Date', t.confirmationDate ? formatDate(t.confirmationDate) : '')+
        row('Base Salary', t.baseSalary ? '₹' + parseFloat(t.baseSalary).toLocaleString('en-IN') + ' / month' : '')+
      '</div>'+

      // HR Letters tab
      '<div id="tch-det-5" style="display:none">'+
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:20px">'+
          ['Offer Letter','Appointment Letter','Probation Confirmation','Promotion Letter','Increment Letter','Experience Letter','Relieving Letter'].map(function(ltype){
            var p = (letterTypeBadge[ltype]||'#f1f5f9:#475569').split(':');
            var icon = {'Offer Letter':'fa-envelope-open-text','Appointment Letter':'fa-user-check','Probation Confirmation':'fa-check-circle','Promotion Letter':'fa-arrow-up','Increment Letter':'fa-chart-line','Experience Letter':'fa-certificate','Relieving Letter':'fa-sign-out-alt'}[ltype]||'fa-file-alt';
            return '<button onclick="generateHRLetter(\''+teacherId+'\',\''+ltype+'\')" style="padding:14px;border:2px solid '+p[0]+';border-radius:12px;background:'+p[0]+';cursor:pointer;text-align:left;transition:box-shadow 0.2s" onmouseenter="this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.1)\'" onmouseleave="this.style.boxShadow=\'none\'">'+
              '<i class="fas '+icon+'" style="color:'+p[1]+';font-size:20px;display:block;margin-bottom:8px"></i>'+
              '<div style="font-size:12px;font-weight:700;color:'+p[1]+'">'+ltype+'</div>'+
              '<div style="font-size:10px;color:'+p[1]+';opacity:0.7;margin-top:2px">Generate & Print</div>'+
            '</button>';
          }).join('')+
        '</div>'+
        (hrLetters.length > 0
          ? '<h4 style="font-size:13px;font-weight:800;color:#0F2050;margin:0 0 12px">Generated Letters</h4>'+
            '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'+
              '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
                '<th style="text-align:left;padding:8px 10px;color:#64748b;font-weight:700">Type</th>'+
                '<th style="text-align:left;padding:8px 10px;color:#64748b;font-weight:700">Date</th>'+
                '<th style="text-align:center;padding:8px 10px;color:#64748b;font-weight:700">Action</th>'+
              '</tr></thead>'+
              '<tbody>'+
                hrLetters.map(function(l){
                  return '<tr style="border-bottom:1px solid #f1f5f9">'+
                    '<td style="padding:8px 10px;font-weight:600;color:#374151">'+_escH(l.type)+'</td>'+
                    '<td style="padding:8px 10px;color:#64748b">'+formatDate(l.createdAt)+'</td>'+
                    '<td style="padding:8px 10px;text-align:center">'+
                      '<button class="btn btn-secondary btn-sm" onclick="generateHRLetter(\''+teacherId+'\',\''+_escH(l.type)+'\')"><i class="fas fa-print"></i> Re-print</button>'+
                      ' <button class="btn btn-danger btn-sm" onclick="_deleteHRLetter(\''+l.id+'\',\''+teacherId+'\')"><i class="fas fa-trash"></i></button>'+
                    '</td>'+
                  '</tr>';
                }).join('')+
              '</tbody></table></div>'
          : '<div style="text-align:center;color:#94a3b8;padding:20px;font-size:13px">No letters generated yet</div>')+
      '</div>'+

      // Payroll tab
      '<div id="tch-det-6" style="display:none">'+
        (activeStruct
          ? '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:16px">'+
              '<div style="font-size:12px;font-weight:700;color:#065f46;text-transform:uppercase;margin-bottom:10px">Current Salary Structure <span style="font-size:11px;font-weight:600;color:#94a3b8">(effective '+formatDate(activeStruct.effectiveFrom)+')</span></div>'+
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">'+
                [['Basic Salary','basicSalary'],['HRA','hra'],['Conveyance','conveyance'],['Special Allowance','specialAllowance'],['Bonus/Incentive','bonus']].map(function(f){
                  return '<div><span style="color:#64748b;font-weight:600">'+f[0]+':</span> <strong>₹'+parseFloat(activeStruct[f[1]]||0).toLocaleString('en-IN')+'</strong></div>';
                }).join('')+
                '<div style="grid-column:1/-1;border-top:1px solid #bbf7d0;margin-top:4px;padding-top:8px"><span style="color:#064e3b;font-weight:700">Gross: ₹'+parseFloat(activeStruct.grossSalary||0).toLocaleString('en-IN')+'</span> &nbsp;|&nbsp; '+
                  '<span style="color:#ef4444;font-weight:600">Deductions: ₹'+parseFloat(activeStruct.totalDeductions||0).toLocaleString('en-IN')+'</span> &nbsp;|&nbsp; '+
                  '<span style="color:#10b981;font-weight:800;font-size:14px">Net: ₹'+parseFloat(activeStruct.netSalary||0).toLocaleString('en-IN')+'</span></div>'+
              '</div>'+
            '</div>'
          : '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px;margin-bottom:16px;font-size:13px;color:#92400e"><i class="fas fa-exclamation-triangle" style="margin-right:6px"></i>No salary structure defined yet.</div>')+
        '<div style="display:flex;gap:8px;margin-bottom:16px">'+
          '<button class="btn btn-primary btn-sm" onclick="openTeacherSalary(\''+teacherId+'\')"><i class="fas fa-edit"></i> Set Salary Structure</button>'+
          '<button class="btn btn-secondary btn-sm" onclick="openAccPayrollForTeacher(\''+teacherId+'\')"><i class="fas fa-money-check-alt"></i> Process Monthly Pay</button>'+
        '</div>'+
        (salPayments.length > 0
          ? '<h4 style="font-size:13px;font-weight:800;color:#0F2050;margin:0 0 10px">Payment History</h4>'+
            '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'+
              '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
                '<th style="text-align:left;padding:8px 10px;color:#64748b;font-weight:700">Month</th>'+
                '<th style="text-align:right;padding:8px 10px;color:#64748b;font-weight:700">Gross</th>'+
                '<th style="text-align:right;padding:8px 10px;color:#64748b;font-weight:700">Deductions</th>'+
                '<th style="text-align:right;padding:8px 10px;color:#64748b;font-weight:700">Net Pay</th>'+
                '<th style="text-align:left;padding:8px 10px;color:#64748b;font-weight:700">Mode</th>'+
                '<th style="text-align:center;padding:8px 10px;color:#64748b;font-weight:700">Status</th>'+
              '</tr></thead>'+
              '<tbody>'+salPayments.map(function(p){
                return '<tr style="border-bottom:1px solid #f1f5f9">'+
                  '<td style="padding:8px 10px;font-weight:700;color:#374151">'+_fmtMonth(p.month)+'</td>'+
                  '<td style="padding:8px 10px;text-align:right;color:#374151">₹'+parseFloat(p.baseSalary||0).toLocaleString('en-IN')+'</td>'+
                  '<td style="padding:8px 10px;text-align:right;color:#ef4444">₹'+parseFloat(p.deductions||0).toLocaleString('en-IN')+'</td>'+
                  '<td style="padding:8px 10px;text-align:right;font-weight:800;color:#10b981">₹'+parseFloat(p.netAmount||0).toLocaleString('en-IN')+'</td>'+
                  '<td style="padding:8px 10px;color:#64748b">'+(p.paymentMode||'Bank')+'</td>'+
                  '<td style="padding:8px 10px;text-align:center"><span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700">'+p.status+'</span></td>'+
                '</tr>';
              }).join('')+
              '</tbody></table></div>'
          : '<div style="text-align:center;color:#94a3b8;padding:20px;font-size:13px">No salary payments recorded yet</div>')+
      '</div>'+

    '</div>'+

    // Footer
    '<div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px;flex-shrink:0">'+
      '<button class="btn btn-secondary" onclick="document.getElementById(\'tch-detail-modal\').remove()">Close</button>'+
      '<button class="btn btn-primary" onclick="document.getElementById(\'tch-detail-modal\').remove();openTeacherOnboarding(\''+teacherId+'\')"><i class="fas fa-edit"></i> Edit Profile</button>'+
    '</div>'+
  '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window._tchDetTab = function(idx) {
  for (var i = 0; i < 7; i++) {
    var sec = document.getElementById('tch-det-'+i);
    var btn = document.getElementById('tch-det-tab-'+i);
    if (sec) sec.style.display = i === idx ? '' : 'none';
    if (btn) { btn.style.color = i===idx ? '#10b981' : '#64748b'; btn.style.borderBottom = i===idx ? '2px solid #10b981' : '2px solid transparent'; }
  }
};

window._deleteHRLetter = function(lid, teacherId) {
  confirmDialog('Delete this letter record?', function() {
    DB.deleteHRLetter(lid);
    document.getElementById('tch-detail-modal').remove();
    openTeacherDetail(teacherId);
  });
};

window.openAccPayrollForTeacher = function(teacherId) {
  document.getElementById('tch-detail-modal').remove();
  accProcessSalary(teacherId);
};

// ==================== ONBOARDING MODAL ====================
window.openTeacherOnboarding = function(teacherId) {
  var isEdit = !!teacherId;
  var data = DB.get();
  var t = isEdit ? ((data.users||[]).find(function(u){return u.id===teacherId;}) || {}) : {};
  var empId = isEdit ? (t.employeeId||'') : _genEmpId();
  var today = new Date().toISOString().split('T')[0];
  var classes = data.classes || [];
  var classOpts = '<option value="">None</option>' + classes.map(function(c){return '<option value="'+c.id+'"'+(t.assignedClass===c.id?' selected':'')+'>'+_escH(c.name)+'</option>';}).join('');
  var adminUsers = (data.users||[]).filter(function(u){return u.role==='superadmin';});
  var mgrOpts = '<option value="">—</option>' + adminUsers.map(function(u){return '<option value="'+u.id+'"'+(t.reportingManager===u.id?' selected':'')+'>'+_escH(u.name)+'</option>';}).join('');

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'tch-onboard-modal';
  overlay.innerHTML = '<div class="modal" style="max-width:820px;width:calc(100% - 24px);max-height:92vh;display:flex;flex-direction:column;padding:0">'+

    '<div class="modal-header" style="flex-shrink:0;padding:16px 24px">'+
      '<h3 class="modal-title"><i class="fas fa-user-plus" style="color:#10b981;margin-right:8px"></i>'+(isEdit?'Edit Teacher Profile':'Teacher Onboarding')+' <span style="font-size:12px;color:#94a3b8;font-weight:600;margin-left:8px">'+empId+'</span></h3>'+
      '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'tch-onboard-modal\').remove()"><i class="fas fa-times"></i></button>'+
    '</div>'+

    '<div style="display:flex;gap:0;border-bottom:2px solid #e2e8f0;overflow-x:auto;flex-shrink:0;padding:0 24px" id="tob-tabs">'+
      ['Personal','Documents','Education','Bank','Employment'].map(function(s,i){
        return '<button id="tob-tab-'+i+'" onclick="_tobTab('+i+')" style="padding:10px 14px;font-size:12px;font-weight:700;border:none;cursor:pointer;background:none;color:'+(i===0?'#10b981':'#64748b')+';border-bottom:'+(i===0?'2px solid #10b981':'2px solid transparent')+';margin-bottom:-2px;white-space:nowrap">'+s+'</button>';
      }).join('')+
    '</div>'+

    '<div style="overflow-y:auto;padding:20px 24px;flex:1">'+

      // ---- PERSONAL ----
      '<div id="tob-sec-0">'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
          '<div><label class="form-label">Full Name *</label><input id="tob-name" class="form-control" type="text" value="'+_escH(t.name||'')+'"/></div>'+
          '<div><label class="form-label">Employee ID</label><input id="tob-empid" class="form-control" type="text" value="'+_escH(empId)+'"/></div>'+
          '<div><label class="form-label">Gender</label><select id="tob-gender" class="form-control">'+
            '<option value="">Select</option>'+['Male','Female','Other'].map(function(g){return '<option value="'+g+'"'+(t.gender===g?' selected':'')+'>'+g+'</option>';}).join('')+
          '</select></div>'+
          '<div><label class="form-label">Date of Birth</label><input id="tob-dob" class="form-control" type="date" value="'+(t.dob||'')+'"/></div>'+
          '<div><label class="form-label">Mobile Number *</label><input id="tob-mobile" class="form-control" type="text" value="'+_escH(t.phone||t.mobile||'')+'"/></div>'+
          '<div><label class="form-label">Email Address</label><input id="tob-email" class="form-control" type="email" value="'+_escH(t.email||'')+'"/></div>'+
          '<div><label class="form-label">Blood Group</label><select id="tob-blood" class="form-control">'+
            '<option value="">Select</option>'+['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(function(g){return '<option value="'+g+'"'+(t.bloodGroup===g?' selected':'')+'>'+g+'</option>';}).join('')+
          '</select></div>'+
          '<div><label class="form-label">Marital Status</label><select id="tob-marital" class="form-control">'+
            '<option value="">Select</option>'+['Single','Married','Divorced','Widowed'].map(function(m){return '<option value="'+m+'"'+(t.maritalStatus===m?' selected':'')+'>'+m+'</option>';}).join('')+
          '</select></div>'+
          '<div style="grid-column:1/-1"><label class="form-label">Current Address</label><textarea id="tob-curr" class="form-control" rows="2">'+_escH(t.currentAddress||t.address||'')+'</textarea></div>'+
          '<div style="grid-column:1/-1"><label class="form-label">Permanent Address <label style="font-size:11px;font-weight:400;cursor:pointer;margin-left:8px"><input type="checkbox" id="tob-same" onchange="_tobSameAddr()"/> Same as current</label></label><textarea id="tob-perm" class="form-control" rows="2">'+_escH(t.permanentAddress||'')+'</textarea></div>'+
          '<div><label class="form-label">Emergency Contact Name</label><input id="tob-ecn" class="form-control" type="text" value="'+_escH(t.emergencyContactName||'')+'"/></div>'+
          '<div><label class="form-label">Emergency Contact Phone</label><input id="tob-ecp" class="form-control" type="text" value="'+_escH(t.emergencyContactPhone||'')+'"/></div>'+
          (isEdit
            ? '<div><label class="form-label">Username (login)</label><input class="form-control" type="text" value="'+_escH(t.username||'')+'" readonly style="background:#f8fafc;color:#64748b"/></div>'+
              '<div><label class="form-label">New Password <span style="font-weight:400;color:#94a3b8">(optional)</span></label><input id="tob-pass" class="form-control" type="password" placeholder="Leave blank to keep"/></div>'
            : '<div><label class="form-label">Username *</label><input id="tob-uname" class="form-control" type="text" placeholder="Login username"/></div>'+
              '<div><label class="form-label">Password *</label><input id="tob-pass" class="form-control" type="password" placeholder="Login password"/></div>')+
        '</div>'+
      '</div>'+

      // ---- DOCUMENTS ----
      '<div id="tob-sec-1" style="display:none">'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
          '<div><label class="form-label">Aadhaar Card Number</label><input id="tob-aadhaar" class="form-control" type="text" value="'+_escH(t.aadhaarNo||'')+'" placeholder="XXXX XXXX XXXX"/></div>'+
          '<div><label class="form-label">PAN Card Number</label><input id="tob-pan" class="form-control" type="text" value="'+_escH(t.panNo||'')+'" placeholder="ABCDE1234F"/></div>'+
          '<div><label class="form-label">Passport Number (Optional)</label><input id="tob-passport" class="form-control" type="text" value="'+_escH(t.passportNo||'')+'" placeholder="e.g. J1234567"/></div>'+
          '<div><label class="form-label">Driving License (Optional)</label><input id="tob-dl" class="form-control" type="text" value="'+_escH(t.drivingLicenseNo||'')+'" placeholder="License number"/></div>'+
        '</div>'+
        '<div style="margin-top:14px;padding:12px 14px;background:#f8fafc;border-radius:10px;border:1px dashed #cbd5e1;font-size:12px;color:#64748b">'+
          '<i class="fas fa-info-circle" style="margin-right:6px;color:#1AA6CA"></i>Currently storing document reference numbers. Physical document uploads can be added in a future update.</div>'+
      '</div>'+

      // ---- EDUCATION ----
      '<div id="tob-sec-2" style="display:none">'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
          '<div><label class="form-label">SSC (10th) — Board &amp; Year</label><input id="tob-ssc" class="form-control" type="text" value="'+_escH(t.qualSSC||'')+'" placeholder="e.g. Maharashtra Board, 2010"/></div>'+
          '<div><label class="form-label">HSC (12th) — Board &amp; Year</label><input id="tob-hsc" class="form-control" type="text" value="'+_escH(t.qualHSC||'')+'" placeholder="e.g. Maharashtra Board, 2012"/></div>'+
          '<div><label class="form-label">Graduation — Degree / University / Year</label><input id="tob-grad" class="form-control" type="text" value="'+_escH(t.qualGraduation||'')+'" placeholder="e.g. B.A., Pune University, 2015"/></div>'+
          '<div><label class="form-label">B.Ed. / D.Ed. / NTT / Montessori</label><input id="tob-bed" class="form-control" type="text" value="'+_escH(t.qualBEd||'')+'" placeholder="e.g. B.Ed., SNDT, 2016"/></div>'+
          '<div style="grid-column:1/-1"><label class="form-label">Other Certifications</label><textarea id="tob-othcert" class="form-control" rows="2" placeholder="CTET, TET, CPR, etc.">'+_escH(t.qualOther||'')+'</textarea></div>'+
          '<div style="grid-column:1/-1"><label class="form-label">Previous Work Experience</label><textarea id="tob-exp" class="form-control" rows="3" placeholder="School names, duration, roles...">'+_escH(t.experienceSummary||'')+'</textarea></div>'+
        '</div>'+
      '</div>'+

      // ---- BANK ----
      '<div id="tob-sec-3" style="display:none">'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
          '<div><label class="form-label">Account Holder Name</label><input id="tob-holder" class="form-control" type="text" value="'+_escH(t.bankAccountHolder||t.name||'')+'"/></div>'+
          '<div><label class="form-label">Bank Name</label><input id="tob-bank" class="form-control" type="text" value="'+_escH(t.bankName||'')+'" placeholder="e.g. HDFC Bank, SBI"/></div>'+
          '<div><label class="form-label">Account Number</label><input id="tob-accno" class="form-control" type="text" value="'+_escH(t.bankAccount||'')+'" placeholder="XXXXXXXXXXXX"/></div>'+
          '<div><label class="form-label">IFSC Code</label><input id="tob-ifsc" class="form-control" type="text" value="'+_escH(t.ifsc||'')+'" placeholder="e.g. HDFC0001234"/></div>'+
          '<div><label class="form-label">UPI ID (Optional)</label><input id="tob-upi" class="form-control" type="text" value="'+_escH(t.upiId||'')+'" placeholder="mobile@upi"/></div>'+
        '</div>'+
      '</div>'+

      // ---- EMPLOYMENT ----
      '<div id="tob-sec-4" style="display:none">'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
          '<div><label class="form-label">Joining Date *</label><input id="tob-joining" class="form-control" type="date" value="'+(t.joiningDate||today)+'"/></div>'+
          '<div><label class="form-label">Designation</label><input id="tob-desig" class="form-control" type="text" value="'+_escH(t.designation||'Class Teacher')+'" placeholder="e.g. Head Teacher, Nursery Teacher"/></div>'+
          '<div><label class="form-label">Department</label><input id="tob-dept" class="form-control" type="text" value="'+_escH(t.department||'')+'" placeholder="e.g. Pre-Primary, Primary"/></div>'+
          '<div><label class="form-label">Class Assigned</label><select id="tob-class" class="form-control">'+classOpts+'</select></div>'+
          '<div><label class="form-label">Reporting Manager</label><select id="tob-mgr" class="form-control">'+mgrOpts+'</select></div>'+
          '<div><label class="form-label">Employment Type</label><select id="tob-emptype" class="form-control">'+
            ['Full-Time','Part-Time','Contract','Intern'].map(function(et){return '<option value="'+et+'"'+((t.employmentType||'Full-Time')===et?' selected':'')+'>'+et+'</option>';}).join('')+
          '</select></div>'+
          '<div><label class="form-label">Employment Status</label><select id="tob-empstatus" class="form-control">'+
            ['Active','Probation','Resigned','Terminated'].map(function(s){return '<option value="'+s+'"'+((t.employmentStatus||'Active')===s?' selected':'')+'>'+s+'</option>';}).join('')+
          '</select></div>'+
          '<div><label class="form-label">Probation Period (months)</label><input id="tob-probation" class="form-control" type="number" min="0" max="24" value="'+(t.probationPeriod||6)+'"/></div>'+
          '<div><label class="form-label">Confirmation Date</label><input id="tob-confdate" class="form-control" type="date" value="'+(t.confirmationDate||'')+'"/></div>'+
          '<div><label class="form-label">Base Monthly Salary (₹)</label><input id="tob-salary" class="form-control" type="number" min="0" step="0.01" value="'+(t.baseSalary||'')+'"/></div>'+
        '</div>'+
      '</div>'+

    '</div>'+

    '<div class="modal-footer" style="padding:16px 24px;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;border-top:1px solid #e2e8f0">'+
      '<button class="btn btn-secondary" onclick="document.getElementById(\'tch-onboard-modal\').remove()">Cancel</button>'+
      '<button class="btn btn-success" onclick="_saveTeacherOnboarding(\''+teacherId+'\')"><i class="fas fa-save"></i> '+(isEdit?'Save Changes':'Complete Onboarding')+'</button>'+
    '</div>'+
  '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window._tobTab = function(idx) {
  for (var i = 0; i < 5; i++) {
    var sec = document.getElementById('tob-sec-'+i);
    var btn = document.getElementById('tob-tab-'+i);
    if (sec) sec.style.display = i === idx ? '' : 'none';
    if (btn) { btn.style.color = i===idx?'#10b981':'#64748b'; btn.style.borderBottom = i===idx?'2px solid #10b981':'2px solid transparent'; }
  }
};
window._tobSameAddr = function() {
  if (document.getElementById('tob-same').checked) {
    document.getElementById('tob-perm').value = document.getElementById('tob-curr').value;
  }
};

window._saveTeacherOnboarding = function(teacherId) {
  var isEdit = !!teacherId;
  var name = (document.getElementById('tob-name').value||'').trim();
  var mobile = (document.getElementById('tob-mobile').value||'').trim();
  var joining = document.getElementById('tob-joining').value;
  if (!name) { showToast('Full name is required', 'error'); _tobTab(0); return; }
  if (!mobile) { showToast('Mobile number is required', 'error'); _tobTab(0); return; }
  if (!joining) { showToast('Joining date is required', 'error'); _tobTab(4); return; }

  var updates = {
    name: name,
    employeeId: (document.getElementById('tob-empid').value||'').trim() || _genEmpId(),
    gender: document.getElementById('tob-gender').value,
    dob: document.getElementById('tob-dob').value,
    phone: mobile,
    mobile: mobile,
    email: (document.getElementById('tob-email').value||'').trim(),
    bloodGroup: document.getElementById('tob-blood').value,
    maritalStatus: document.getElementById('tob-marital').value,
    currentAddress: (document.getElementById('tob-curr').value||'').trim(),
    permanentAddress: (document.getElementById('tob-perm').value||'').trim(),
    address: (document.getElementById('tob-curr').value||'').trim(),
    emergencyContactName: (document.getElementById('tob-ecn').value||'').trim(),
    emergencyContactPhone: (document.getElementById('tob-ecp').value||'').trim(),
    aadhaarNo: (document.getElementById('tob-aadhaar').value||'').trim(),
    panNo: (document.getElementById('tob-pan').value||'').trim(),
    passportNo: (document.getElementById('tob-passport').value||'').trim(),
    drivingLicenseNo: (document.getElementById('tob-dl').value||'').trim(),
    qualSSC: (document.getElementById('tob-ssc').value||'').trim(),
    qualHSC: (document.getElementById('tob-hsc').value||'').trim(),
    qualGraduation: (document.getElementById('tob-grad').value||'').trim(),
    qualBEd: (document.getElementById('tob-bed').value||'').trim(),
    qualOther: (document.getElementById('tob-othcert').value||'').trim(),
    experienceSummary: (document.getElementById('tob-exp').value||'').trim(),
    bankAccountHolder: (document.getElementById('tob-holder').value||'').trim(),
    bankName: (document.getElementById('tob-bank').value||'').trim(),
    bankAccount: (document.getElementById('tob-accno').value||'').trim(),
    ifsc: (document.getElementById('tob-ifsc').value||'').trim(),
    upiId: (document.getElementById('tob-upi').value||'').trim(),
    joiningDate: joining,
    designation: (document.getElementById('tob-desig').value||'').trim() || 'Class Teacher',
    department: (document.getElementById('tob-dept').value||'').trim(),
    assignedClass: document.getElementById('tob-class').value,
    reportingManager: document.getElementById('tob-mgr').value,
    employmentType: document.getElementById('tob-emptype').value,
    employmentStatus: document.getElementById('tob-empstatus').value,
    probationPeriod: parseInt(document.getElementById('tob-probation').value) || 0,
    confirmationDate: document.getElementById('tob-confdate').value,
    baseSalary: parseFloat(document.getElementById('tob-salary').value) || 0,
  };

  var pass = document.getElementById('tob-pass') ? document.getElementById('tob-pass').value : '';
  if (pass) updates.password = pass;

  if (isEdit) {
    DB.updateUser(teacherId, updates);
    // Update class assignment
    var data = DB.get();
    if (updates.assignedClass) {
      (data.classes||[]).forEach(function(c) {
        if (c.id === updates.assignedClass) c.teacherId = teacherId;
        else if (c.teacherId === teacherId) c.teacherId = null;
      });
      DB.commit();
    }
    document.getElementById('tch-onboard-modal').remove();
    showToast('Teacher profile updated!', 'success');
    renderTeachers();
  } else {
    // Create new subadmin user
    var uname = document.getElementById('tob-uname') ? (document.getElementById('tob-uname').value||'').trim() : '';
    if (!uname) { showToast('Username is required', 'error'); _tobTab(0); return; }
    if (!pass) { showToast('Password is required for new teacher', 'error'); _tobTab(0); return; }
    var data = DB.get();
    if ((data.users||[]).find(function(u){return u.username===uname;})) {
      showToast('Username already exists', 'error'); _tobTab(0); return;
    }
    var newId = 'u_tch_' + Date.now();
    updates.id = newId;
    updates.role = 'subadmin';
    updates.username = uname;
    updates.password = pass;
    updates.active = true;
    updates.deleted = false;
    updates.createdAt = new Date().toISOString();
    updates.avatar = '#' + ['10b981','3b82f6','8b5cf6','f59e0b','ef4444','06b6d4'][Math.floor(Math.random()*6)];
    updates.permissions = { students: true, attendance: true, grades: true, growth: true, activities: true, syllabus: true, announcements: true, leaves: true };
    if (!data.users) data.users = [];
    data.users.push(updates);
    // Assign class
    if (updates.assignedClass) {
      (data.classes||[]).forEach(function(c) {
        if (c.id === updates.assignedClass) c.teacherId = newId;
      });
    }
    DB.commit();
    document.getElementById('tch-onboard-modal').remove();
    showToast('Teacher onboarded successfully!', 'success');
    renderTeachers();
  }
};

// ==================== HR LETTERS ====================
window.openTeacherLetters = function(teacherId) {
  var data = DB.get();
  var t = (data.users||[]).find(function(u){return u.id===teacherId;});
  if (!t) return;
  var letters = DB.getHRLetters(teacherId);
  var letterTypes = ['Offer Letter','Appointment Letter','Probation Confirmation','Promotion Letter','Increment Letter','Experience Letter','Relieving Letter'];
  var icons = {'Offer Letter':'fa-envelope-open-text','Appointment Letter':'fa-user-check','Probation Confirmation':'fa-check-circle','Promotion Letter':'fa-arrow-up','Increment Letter':'fa-chart-line','Experience Letter':'fa-certificate','Relieving Letter':'fa-sign-out-alt'};
  var colors = {'Offer Letter':['#dbeafe','#1e40af'],'Appointment Letter':['#d1fae5','#065f46'],'Probation Confirmation':['#fef3c7','#92400e'],'Promotion Letter':['#e0e7ff','#3730a3'],'Increment Letter':['#ecfdf5','#15803d'],'Experience Letter':['#fce7f3','#9d174d'],'Relieving Letter':['#fee2e2','#991b1b']};

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'tch-letters-modal';
  overlay.innerHTML = '<div class="modal" style="max-width:700px;width:calc(100% - 24px);max-height:88vh;display:flex;flex-direction:column;padding:0">'+
    '<div class="modal-header" style="flex-shrink:0;padding:16px 24px">'+
      '<h3 class="modal-title"><i class="fas fa-file-contract" style="color:#8b5cf6;margin-right:8px"></i>HR Letters — '+_escH(t.name)+'</h3>'+
      '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'tch-letters-modal\').remove()"><i class="fas fa-times"></i></button>'+
    '</div>'+
    '<div style="overflow-y:auto;padding:20px 24px;flex:1">'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin-bottom:24px">'+
        letterTypes.map(function(lt){
          var c = colors[lt]||['#f1f5f9','#475569'];
          return '<button onclick="generateHRLetter(\''+teacherId+'\',\''+lt+'\')" style="padding:16px;border:2px solid '+c[0]+';border-radius:12px;background:'+c[0]+';cursor:pointer;text-align:center;transition:box-shadow 0.2s" onmouseenter="this.style.boxShadow=\'0 4px 14px rgba(0,0,0,0.1)\'" onmouseleave="this.style.boxShadow=\'none\'">'+
            '<i class="fas '+(icons[lt]||'fa-file-alt')+'" style="color:'+c[1]+';font-size:22px;display:block;margin-bottom:8px"></i>'+
            '<div style="font-size:12px;font-weight:700;color:'+c[1]+'">'+lt+'</div>'+
          '</button>';
        }).join('')+
      '</div>'+
      (letters.length > 0
        ? '<h4 style="font-size:13px;font-weight:800;color:#0F2050;margin:0 0 12px"><i class="fas fa-history" style="margin-right:6px"></i>Generated Letters</h4>'+
          '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'+
            '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
              '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Letter Type</th>'+
              '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Generated On</th>'+
              '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Actions</th>'+
            '</tr></thead><tbody>'+
              letters.map(function(l){
                return '<tr style="border-bottom:1px solid #f1f5f9">'+
                  '<td style="padding:10px 12px;font-weight:600;color:#374151">'+_escH(l.type)+'</td>'+
                  '<td style="padding:10px 12px;color:#64748b">'+formatDate(l.createdAt)+'</td>'+
                  '<td style="padding:10px 12px;text-align:center">'+
                    '<button class="btn btn-secondary btn-sm" onclick="generateHRLetter(\''+teacherId+'\',\''+_escH(l.type)+'\')"><i class="fas fa-print"></i> Print</button> '+
                    '<button class="btn btn-danger btn-sm" onclick="_delHRLetterFromModal(\''+l.id+'\',\''+teacherId+'\')"><i class="fas fa-trash"></i></button>'+
                  '</td>'+
                '</tr>';
              }).join('')+
            '</tbody></table></div>'
        : '<div style="text-align:center;color:#94a3b8;padding:24px;font-size:13px">No letters generated yet for this teacher</div>')+
    '</div>'+
    '<div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;flex-shrink:0">'+
      '<button class="btn btn-secondary" onclick="document.getElementById(\'tch-letters-modal\').remove()">Close</button>'+
    '</div>'+
  '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window._delHRLetterFromModal = function(lid, teacherId) {
  confirmDialog('Delete this letter record?', function() {
    DB.deleteHRLetter(lid);
    document.getElementById('tch-letters-modal').remove();
    openTeacherLetters(teacherId);
  });
};

window.generateHRLetter = function(teacherId, letterType) {
  var data = DB.get();
  var t = (data.users||[]).find(function(u){return u.id===teacherId;}) || {};
  var meta = DB.getMeta();
  var principal = (data.users||[]).find(function(u){return u.role==='superadmin';}) || {};
  var sName = meta.schoolName || 'SuperKids India Preschool';
  var sAddr = (meta.schoolAddress || 'Bhosari, Pune – 411026').replace(/\n/g,'<br>');
  var todayStr = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  var salary = parseFloat(t.baseSalary||0).toLocaleString('en-IN');
  var structs = DB.getSalaryStructures(teacherId);
  var struct = structs[0] || {};

  // Save letter record
  DB.addHRLetter({
    id: 'ltr_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
    teacherId: teacherId,
    type: letterType,
    createdBy: Session.current() ? Session.current().id : '',
    createdAt: new Date().toISOString()
  });

  var bodyHTML = '';
  if (letterType === 'Offer Letter') {
    bodyHTML = '<p>Dear <strong>'+_escH(t.name)+'</strong>,</p>'+
      '<p>We are pleased to offer you the position of <strong>'+_escH(t.designation||'Class Teacher')+'</strong> at <strong>'+sName+'</strong>.</p>'+
      '<p>Your employment details are as follows:</p>'+
      '<table style="width:100%;border-collapse:collapse;margin:12px 0"><tbody>'+
        [['Designation',t.designation||'Class Teacher'],['Department',t.department||'Teaching'],['Joining Date',t.joiningDate?new Date(t.joiningDate).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}):''],['Employment Type',t.employmentType||'Full-Time'],['Probation Period',(t.probationPeriod||6)+' months'],['Gross Monthly Salary','₹'+salary]].map(function(r){
          return '<tr><td style="padding:6px 12px;border:1px solid #ddd;width:40%;background:#f9f9f9;font-weight:600">'+r[0]+'</td><td style="padding:6px 12px;border:1px solid #ddd">'+r[1]+'</td></tr>';
        }).join('')+
      '</tbody></table>'+
      '<p>Kindly sign and return a copy of this letter as confirmation of your acceptance.</p>';
  } else if (letterType === 'Appointment Letter') {
    bodyHTML = '<p>Dear <strong>'+_escH(t.name)+'</strong>,</p>'+
      '<p>This is to formally confirm your appointment as <strong>'+_escH(t.designation||'Class Teacher')+'</strong> at '+sName+' with effect from <strong>'+formatDate(t.joiningDate)+'</strong>.</p>'+
      '<p>Your terms of employment are as per the offer letter issued to you. You will be subject to the school\'s HR policies and guidelines.</p>'+
      '<p>We welcome you to our team and wish you a successful career with us.</p>';
  } else if (letterType === 'Probation Confirmation') {
    bodyHTML = '<p>Dear <strong>'+_escH(t.name)+'</strong>,</p>'+
      '<p>We are pleased to inform you that, following a satisfactory evaluation of your performance during the probation period, your services are hereby confirmed as <strong>'+_escH(t.designation||'Class Teacher')+'</strong> with effect from <strong>'+(t.confirmationDate?formatDate(t.confirmationDate):todayStr)+'</strong>.</p>'+
      '<p>You will continue to be governed by all existing terms and conditions of your employment. We look forward to your continued contributions to the school.</p>';
  } else if (letterType === 'Promotion Letter') {
    bodyHTML = '<p>Dear <strong>'+_escH(t.name)+'</strong>,</p>'+
      '<p>We are pleased to announce your promotion to the position of <strong>'+_escH(t.designation||'Senior Teacher')+'</strong> effective <strong>'+todayStr+'</strong>.</p>'+
      '<p>This promotion is in recognition of your excellent performance, dedication, and commitment to the school. Your revised salary structure will be shared separately.</p>'+
      '<p>Congratulations on this achievement! We look forward to your continued contributions.</p>';
  } else if (letterType === 'Increment Letter') {
    bodyHTML = '<p>Dear <strong>'+_escH(t.name)+'</strong>,</p>'+
      '<p>We are pleased to inform you that, in recognition of your performance and contribution, your salary has been revised to <strong>₹'+salary+'</strong> per month with effect from <strong>'+todayStr+'</strong>.</p>'+
      '<p>The revised salary structure will be reflected in your payslip from the next payroll cycle.</p>'+
      '<p>We appreciate your dedication and look forward to your continued growth with us.</p>';
  } else if (letterType === 'Experience Letter') {
    bodyHTML = '<p>To Whom It May Concern,</p>'+
      '<p>This is to certify that <strong>'+_escH(t.name)+'</strong> (Employee ID: '+_escH(t.employeeId||'N/A')+') was employed with <strong>'+sName+'</strong> as <strong>'+_escH(t.designation||'Class Teacher')+'</strong> in the <strong>'+_escH(t.department||'Teaching')+'</strong> department from <strong>'+formatDate(t.joiningDate)+'</strong>.</p>'+
      '<p>During their tenure, they demonstrated excellent dedication, professionalism, and teaching skills. We wish them the very best in their future endeavours.</p>';
  } else if (letterType === 'Relieving Letter') {
    bodyHTML = '<p>Dear <strong>'+_escH(t.name)+'</strong>,</p>'+
      '<p>This is to confirm that you have been relieved from the position of <strong>'+_escH(t.designation||'Class Teacher')+'</strong> at <strong>'+sName+'</strong> with effect from <strong>'+todayStr+'</strong>.</p>'+
      '<p>All pending dues, handovers, and formalities have been completed to the satisfaction of the management. We wish you success in your future career.</p>';
  }

  var salStructSection = '';
  if (letterType === 'Offer Letter' && struct.grossSalary) {
    salStructSection = '<h4 style="margin:16px 0 8px">Salary Structure</h4>'+
      '<table style="width:100%;border-collapse:collapse"><tbody>'+
        [['Basic Salary',struct.basicSalary],['HRA',struct.hra],['Conveyance',struct.conveyance],['Special Allowance',struct.specialAllowance],['Bonus/Incentive',struct.bonus],['Gross Salary',struct.grossSalary],['Total Deductions',struct.totalDeductions],['Net Salary',struct.netSalary]].map(function(r,i){
          var isTot = i>4;
          return '<tr><td style="padding:5px 10px;border:1px solid #ddd;width:50%;'+(isTot?'font-weight:700;background:#f0fdf4':'')+'">'+(r[0])+'</td><td style="padding:5px 10px;border:1px solid #ddd;'+(isTot?'font-weight:700;color:#10b981':'')+'">₹'+parseFloat(r[1]||0).toLocaleString('en-IN')+'</td></tr>';
        }).join('')+
      '</tbody></table>';
  }

  var win = window.open('','_blank');
  win.document.write('<!DOCTYPE html><html><head><title>'+letterType+' — '+_escH(t.name)+'</title>'+
    '<style>body{font-family:Arial,sans-serif;max-width:750px;margin:30px auto;font-size:13px;color:#333;line-height:1.6}'+
    '.letterhead{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0F2050;padding-bottom:14px;margin-bottom:20px}'+
    '.lh-school h1{font-size:20px;margin:0 0 4px;color:#0F2050}.lh-school p{font-size:11px;color:#666;margin:2px 0}'+
    '.ref-box{background:#f8f8f8;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-size:12px}'+
    '.signature{margin-top:40px;text-align:right}.signature p{margin:2px 0;font-size:12px}'+
    '@media print{body{margin:10px}}</style></head><body>'+
    '<div class="letterhead">'+
      '<div class="lh-school"><h1>'+sName+'</h1><p>'+sAddr+'</p></div>'+
      '<div style="text-align:right;font-size:12px;color:#666"><strong>'+letterType+'</strong><br>Date: '+todayStr+'<br>Ref: '+_escH(t.employeeId||'N/A')+'</div>'+
    '</div>'+
    bodyHTML+
    salStructSection+
    '<div class="signature">'+
      '<p><strong>Authorized Signatory</strong></p>'+
      '<p>'+_escH(principal.name||'Principal')+'</p>'+
      '<p>'+sName+'</p>'+
    '</div>'+
    '<p style="font-size:10px;color:#999;margin-top:20px;border-top:1px solid #eee;padding-top:8px">This is a computer-generated letter.</p>'+
    '<script>window.onload=function(){window.print();}<\/script>'+
  '</body></html>');
  win.document.close();
};

// ==================== SALARY STRUCTURE ====================
window.openTeacherSalary = function(teacherId) {
  var data = DB.get();
  var t = (data.users||[]).find(function(u){return u.id===teacherId;}) || {};
  var structs = DB.getSalaryStructures(teacherId);
  var latest = structs[0] || {};
  var today = new Date().toISOString().split('T')[0];

  function calcNet() {
    var basic = parseFloat(document.getElementById('ss-basic').value)||0;
    var hra = parseFloat(document.getElementById('ss-hra').value)||0;
    var conv = parseFloat(document.getElementById('ss-conv').value)||0;
    var special = parseFloat(document.getElementById('ss-special').value)||0;
    var bonus = parseFloat(document.getElementById('ss-bonus').value)||0;
    var pf = parseFloat(document.getElementById('ss-pf').value)||0;
    var pt = parseFloat(document.getElementById('ss-pt').value)||0;
    var tds = parseFloat(document.getElementById('ss-tds').value)||0;
    var other = parseFloat(document.getElementById('ss-otherded').value)||0;
    var gross = basic+hra+conv+special+bonus;
    var totalDed = pf+pt+tds+other;
    var net = gross - totalDed;
    var g = document.getElementById('ss-gross'); if (g) g.value = gross.toFixed(2);
    var td = document.getElementById('ss-totded'); if (td) td.value = totalDed.toFixed(2);
    var n = document.getElementById('ss-net'); if (n) { n.value = net.toFixed(2); n.style.color = net>=0?'#10b981':'#ef4444'; }
    // auto-set base salary
    var bs = document.getElementById('ss-base-hint'); if (bs) bs.textContent = 'CTC: ₹'+gross.toLocaleString('en-IN');
    // suggest PF = 12% of basic
    if (!document.getElementById('ss-pf').dataset.manualPf && basic > 0) {
      var sugPf = Math.round(basic * 0.12);
      document.getElementById('ss-pf').placeholder = 'PF ≈ ₹'+sugPf;
    }
  }

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'tch-salary-modal';
  overlay.innerHTML = '<div class="modal" style="max-width:700px;width:calc(100% - 24px);max-height:90vh;display:flex;flex-direction:column;padding:0">'+
    '<div class="modal-header" style="flex-shrink:0;padding:16px 24px">'+
      '<h3 class="modal-title"><i class="fas fa-rupee-sign" style="color:#10b981;margin-right:8px"></i>Salary Structure — '+_escH(t.name)+'</h3>'+
      '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'tch-salary-modal\').remove()"><i class="fas fa-times"></i></button>'+
    '</div>'+
    '<div style="overflow-y:auto;padding:20px 24px;flex:1">'+

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">'+
        // Earnings
        '<div>'+
          '<div style="font-size:13px;font-weight:800;color:#065f46;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #d1fae5"><i class="fas fa-plus-circle" style="margin-right:6px"></i>Earnings</div>'+
          '<div class="form-group" style="margin-bottom:10px"><label class="form-label">Basic Salary (₹)</label><input id="ss-basic" class="form-control" type="number" min="0" step="0.01" value="'+(latest.basicSalary||t.baseSalary||'')+'" oninput="_ssCalc()"/></div>'+
          '<div class="form-group" style="margin-bottom:10px"><label class="form-label">HRA (₹) <span style="font-weight:400;color:#94a3b8;font-size:11px">Housing Rent Allowance</span></label><input id="ss-hra" class="form-control" type="number" min="0" step="0.01" value="'+(latest.hra||'')+'" oninput="_ssCalc()"/></div>'+
          '<div class="form-group" style="margin-bottom:10px"><label class="form-label">Conveyance (₹)</label><input id="ss-conv" class="form-control" type="number" min="0" step="0.01" value="'+(latest.conveyance||'')+'" oninput="_ssCalc()"/></div>'+
          '<div class="form-group" style="margin-bottom:10px"><label class="form-label">Special Allowance (₹)</label><input id="ss-special" class="form-control" type="number" min="0" step="0.01" value="'+(latest.specialAllowance||'')+'" oninput="_ssCalc()"/></div>'+
          '<div class="form-group" style="margin-bottom:10px"><label class="form-label">Bonus / Incentive (₹)</label><input id="ss-bonus" class="form-control" type="number" min="0" step="0.01" value="'+(latest.bonus||'')+'" oninput="_ssCalc()"/></div>'+
          '<div style="background:#f0fdf4;border-radius:8px;padding:12px;margin-top:8px"><label class="form-label" style="color:#065f46">Gross Salary (₹)</label><input id="ss-gross" class="form-control" type="text" readonly style="background:#ecfdf5;font-weight:800;color:#065f46" value="'+(latest.grossSalary||'0.00')+'"/><div id="ss-base-hint" style="font-size:11px;color:#94a3b8;margin-top:4px"></div></div>'+
        '</div>'+
        // Deductions
        '<div>'+
          '<div style="font-size:13px;font-weight:800;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #fee2e2"><i class="fas fa-minus-circle" style="margin-right:6px"></i>Deductions</div>'+
          '<div class="form-group" style="margin-bottom:10px"><label class="form-label">PF (₹) <span style="font-weight:400;color:#94a3b8;font-size:11px">12% of Basic</span></label><input id="ss-pf" class="form-control" type="number" min="0" step="0.01" value="'+(latest.pfDeduction||'')+'" oninput="this.dataset.manualPf=\'1\';_ssCalc()"/></div>'+
          '<div class="form-group" style="margin-bottom:10px"><label class="form-label">Professional Tax (₹)</label><input id="ss-pt" class="form-control" type="number" min="0" step="0.01" value="'+(latest.professionalTax||200)+'" oninput="_ssCalc()"/></div>'+
          '<div class="form-group" style="margin-bottom:10px"><label class="form-label">TDS (₹)</label><input id="ss-tds" class="form-control" type="number" min="0" step="0.01" value="'+(latest.tds||0)+'" oninput="_ssCalc()"/></div>'+
          '<div class="form-group" style="margin-bottom:10px"><label class="form-label">Other Deductions (₹) <span style="font-weight:400;color:#94a3b8;font-size:11px">Leave / Loan / Advance</span></label><input id="ss-otherded" class="form-control" type="number" min="0" step="0.01" value="'+(latest.otherDeductions||0)+'" oninput="_ssCalc()"/></div>'+
          '<div style="background:#fff5f5;border-radius:8px;padding:12px;margin-top:8px"><label class="form-label" style="color:#991b1b">Total Deductions (₹)</label><input id="ss-totded" class="form-control" type="text" readonly style="background:#fee2e2;font-weight:700;color:#ef4444" value="'+(latest.totalDeductions||'0.00')+'"/></div>'+
          '<div style="background:#f0fdf4;border-radius:8px;padding:12px;margin-top:8px"><label class="form-label" style="color:#10b981">Net Pay (₹)</label><input id="ss-net" class="form-control" type="text" readonly style="background:#ecfdf5;font-weight:900;font-size:16px;color:#10b981" value="'+(latest.netSalary||'0.00')+'"/></div>'+
        '</div>'+
      '</div>'+

      '<div style="margin-top:16px"><label class="form-label">Effective From *</label><input id="ss-effdate" class="form-control" type="date" value="'+(latest.effectiveFrom||today)+'" style="max-width:200px"/></div>'+

      (structs.length > 0
        ? '<div style="margin-top:20px"><h4 style="font-size:13px;font-weight:800;color:#0F2050;margin:0 0 10px"><i class="fas fa-history" style="margin-right:6px"></i>Revision History</h4>'+
            '<table style="width:100%;border-collapse:collapse;font-size:12px">'+
              '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
                '<th style="text-align:left;padding:8px 10px;color:#64748b;font-weight:700">Effective From</th>'+
                '<th style="text-align:right;padding:8px 10px;color:#64748b;font-weight:700">Gross</th>'+
                '<th style="text-align:right;padding:8px 10px;color:#64748b;font-weight:700">Net Pay</th>'+
                '<th style="text-align:center;padding:8px 10px;color:#64748b;font-weight:700">Action</th>'+
              '</tr></thead>'+
              '<tbody>'+structs.map(function(s){
                return '<tr style="border-bottom:1px solid #f1f5f9">'+
                  '<td style="padding:8px 10px;color:#475569">'+formatDate(s.effectiveFrom)+'</td>'+
                  '<td style="padding:8px 10px;text-align:right;color:#374151">₹'+parseFloat(s.grossSalary||0).toLocaleString('en-IN')+'</td>'+
                  '<td style="padding:8px 10px;text-align:right;font-weight:700;color:#10b981">₹'+parseFloat(s.netSalary||0).toLocaleString('en-IN')+'</td>'+
                  '<td style="padding:8px 10px;text-align:center"><button class="btn btn-danger btn-sm" onclick="_delSalStruct(\''+s.id+'\',\''+teacherId+'\')"><i class="fas fa-trash"></i></button></td>'+
                '</tr>';
              }).join('')+
              '</tbody></table></div>'
        : '')+

    '</div>'+
    '<div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0">'+
      '<button class="btn btn-secondary" onclick="document.getElementById(\'tch-salary-modal\').remove()">Cancel</button>'+
      '<button class="btn btn-primary" onclick="_saveSalaryStructure(\''+teacherId+'\')"><i class="fas fa-save"></i> Save Structure</button>'+
    '</div>'+
  '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  // Init calc after DOM ready
  setTimeout(function() { if (typeof _ssCalc === 'function') _ssCalc(); }, 50);
};

window._ssCalc = function() {
  var basic = parseFloat(document.getElementById('ss-basic').value)||0;
  var hra = parseFloat(document.getElementById('ss-hra').value)||0;
  var conv = parseFloat(document.getElementById('ss-conv').value)||0;
  var special = parseFloat(document.getElementById('ss-special').value)||0;
  var bonus = parseFloat(document.getElementById('ss-bonus').value)||0;
  var pf = parseFloat(document.getElementById('ss-pf').value)||0;
  var pt = parseFloat(document.getElementById('ss-pt').value)||0;
  var tds = parseFloat(document.getElementById('ss-tds').value)||0;
  var other = parseFloat(document.getElementById('ss-otherded').value)||0;
  var gross = basic+hra+conv+special+bonus;
  var totalDed = pf+pt+tds+other;
  var net = gross - totalDed;
  var g = document.getElementById('ss-gross'); if (g) g.value = gross.toFixed(2);
  var td = document.getElementById('ss-totded'); if (td) td.value = totalDed.toFixed(2);
  var n = document.getElementById('ss-net'); if (n) { n.value = net.toFixed(2); n.style.color = net>=0?'#10b981':'#ef4444'; }
};

window._saveSalaryStructure = function(teacherId) {
  var basic = parseFloat(document.getElementById('ss-basic').value)||0;
  var hra = parseFloat(document.getElementById('ss-hra').value)||0;
  var conv = parseFloat(document.getElementById('ss-conv').value)||0;
  var special = parseFloat(document.getElementById('ss-special').value)||0;
  var bonus = parseFloat(document.getElementById('ss-bonus').value)||0;
  var pf = parseFloat(document.getElementById('ss-pf').value)||0;
  var pt = parseFloat(document.getElementById('ss-pt').value)||0;
  var tds = parseFloat(document.getElementById('ss-tds').value)||0;
  var other = parseFloat(document.getElementById('ss-otherded').value)||0;
  var effDate = document.getElementById('ss-effdate').value;
  if (!effDate) { showToast('Effective date is required', 'error'); return; }
  if (basic <= 0) { showToast('Basic salary is required', 'error'); return; }
  var gross = basic+hra+conv+special+bonus;
  var totalDed = pf+pt+tds+other;
  var net = gross - totalDed;

  DB.addSalaryStructure({
    id: 'ss_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
    teacherId: teacherId,
    effectiveFrom: effDate,
    basicSalary: basic, hra: hra, conveyance: conv, specialAllowance: special, bonus: bonus,
    grossSalary: gross,
    pfDeduction: pf, professionalTax: pt, tds: tds, otherDeductions: other,
    totalDeductions: totalDed, netSalary: net,
    createdBy: Session.current() ? Session.current().id : '',
    createdAt: new Date().toISOString()
  });
  // Also update user's baseSalary
  DB.updateUser(teacherId, { baseSalary: net });
  document.getElementById('tch-salary-modal').remove();
  showToast('Salary structure saved!', 'success');
  renderTeachers();
};

window._delSalStruct = function(id, teacherId) {
  confirmDialog('Delete this salary revision?', function() {
    DB.deleteSalaryStructure(id);
    document.getElementById('tch-salary-modal').remove();
    openTeacherSalary(teacherId);
  });
};

// ==================== LEAVE MANAGEMENT (ADMIN) ====================
window.openTeacherLeaveAdmin = function(teacherId) {
  var data = DB.get();
  var teacher = (data.users || []).find(function(u) { return u.id === teacherId; });
  if (!teacher) return;
  var year = new Date().getFullYear().toString();
  var leaves = DB.getStaffLeaves(teacherId);
  var balance = DB.getLeaveBalance(teacherId, year);

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'tch-leave-admin-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';

  var balCards = balance.map(function(b) {
    var pct = Math.max(0, Math.round((b.remaining / b.total) * 100));
    var col = pct > 50 ? '#10b981' : pct > 25 ? '#f59e0b' : '#ef4444';
    return '<div style="background:#f8fafc;border-radius:10px;padding:14px 16px;flex:1;min-width:120px">'+
      '<div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px">'+_escH(b.type)+'</div>'+
      '<div style="font-size:22px;font-weight:900;color:'+col+'">'+b.remaining+'<span style="font-size:11px;color:#94a3b8;font-weight:500">/'+b.total+'</span></div>'+
      '<div style="font-size:10px;color:#94a3b8;margin-top:2px">'+b.used+' used</div>'+
      '<div style="margin-top:8px;background:#e2e8f0;border-radius:4px;height:5px"><div style="background:'+col+';width:'+pct+'%;height:5px;border-radius:4px"></div></div>'+
    '</div>';
  }).join('');

  var leaveRows = leaves.length > 0
    ? leaves.map(function(l) {
        var sc = l.status === 'Approved' ? '#10b981' : l.status === 'Rejected' ? '#ef4444' : '#f59e0b';
        return '<tr style="border-bottom:1px solid #f1f5f9">'+
          '<td style="padding:10px 12px;color:#374151">'+formatDate(l.fromDate)+(l.toDate && l.toDate !== l.fromDate ? ' to '+formatDate(l.toDate) : '')+'</td>'+
          '<td style="padding:10px 12px;color:#475569">'+_escH(l.leaveType)+'</td>'+
          '<td style="padding:10px 12px;text-align:center;font-weight:700;color:#374151">'+(l.days||1)+'</td>'+
          '<td style="padding:10px 12px;color:#64748b;font-size:12px">'+_escH(l.reason||'-')+'</td>'+
          '<td style="padding:10px 12px;text-align:center"><span style="background:'+sc+'22;color:'+sc+';padding:2px 10px;border-radius:6px;font-size:11px;font-weight:700">'+l.status+'</span></td>'+
          (l.status === 'Pending' ?
            '<td style="padding:10px 12px;text-align:center">'+
              '<div style="display:flex;gap:6px;justify-content:center">'+
              '<button class="btn btn-success btn-sm" onclick="adminReviewTeacherLeave(\''+l.id+'\',\'Approved\',\''+teacherId+'\')"><i class="fas fa-check"></i></button>'+
              '<button class="btn btn-danger btn-sm" onclick="adminReviewTeacherLeave(\''+l.id+'\',\'Rejected\',\''+teacherId+'\')"><i class="fas fa-times"></i></button>'+
              '</div>'+
            '</td>' :
            '<td style="padding:10px 12px;text-align:center;font-size:11px;color:#94a3b8">'+(l.remarks||'-')+'</td>'
          )+
        '</tr>';
      }).join('')
    : '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8">No leave records</td></tr>';

  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:820px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.2)">'+
      '<div style="padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'+
        '<div>'+
          '<h3 style="margin:0;font-size:16px;font-weight:800;color:#0F2050">Leave Record — '+_escH(teacher.name)+'</h3>'+
          '<div style="font-size:12px;color:#64748b;margin-top:2px">'+year+' Leave Balance</div>'+
        '</div>'+
        '<button onclick="document.getElementById(\'tch-leave-admin-modal\').remove()" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer">&times;</button>'+
      '</div>'+
      '<div style="padding:20px 24px;flex:1;overflow-y:auto">'+
        '<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">'+balCards+'</div>'+
        '<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">'+
          '<table style="width:100%;border-collapse:collapse;font-size:13px">'+
            '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
              '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Date(s)</th>'+
              '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Type</th>'+
              '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Days</th>'+
              '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Reason</th>'+
              '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Status</th>'+
              '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Action</th>'+
            '</tr></thead>'+
            '<tbody>'+leaveRows+'</tbody>'+
          '</table>'+
        '</div>'+
      '</div>'+
      '<div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;flex-shrink:0">'+
        '<button class="btn btn-secondary" onclick="document.getElementById(\'tch-leave-admin-modal\').remove()">Close</button>'+
      '</div>'+
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window.adminReviewTeacherLeave = function(lid, status, teacherId) {
  DB.updateStaffLeave(lid, { status: status, approvedBy: Session.current().id, approvedAt: new Date().toISOString() });
  showToast('Leave ' + status.toLowerCase() + '!', status === 'Approved' ? 'success' : 'warning');
  document.getElementById('tch-leave-admin-modal').remove();
  openTeacherLeaveAdmin(teacherId);
};

// ==================== LEAVE TYPE CONFIG ====================
window.openLeaveTypeConfig = function() {
  var config = DB.getLeaveTypeConfig();
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'leave-config-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';

  function renderRows(cfg) {
    return cfg.map(function(lt, i) {
      return '<tr style="border-bottom:1px solid #f1f5f9">'+
        '<td style="padding:10px 12px"><input class="form-control" value="'+_escH(lt.name)+'" onchange="window._ltcData['+i+'].name=this.value" style="min-width:140px"/></td>'+
        '<td style="padding:10px 12px;text-align:center"><input class="form-control" value="'+_escH(lt.code)+'" onchange="window._ltcData['+i+'].code=this.value" style="max-width:70px;text-align:center"/></td>'+
        '<td style="padding:10px 12px;text-align:center"><input class="form-control" type="number" min="0" max="365" value="'+lt.totalDays+'" onchange="window._ltcData['+i+'].totalDays=+this.value" style="max-width:80px;text-align:center"/></td>'+
        '<td style="padding:10px 12px;text-align:center"><input type="checkbox" '+(lt.paid?'checked':'')+' onchange="window._ltcData['+i+'].paid=this.checked" style="transform:scale(1.3)"/></td>'+
        '<td style="padding:10px 12px;text-align:center"><input type="checkbox" '+(lt.carryForward?'checked':'')+' onchange="window._ltcData['+i+'].carryForward=this.checked" style="transform:scale(1.3)"/></td>'+
        '<td style="padding:10px 12px;text-align:center"><input type="checkbox" '+(lt.active?'checked':'')+' onchange="window._ltcData['+i+'].active=this.checked" style="transform:scale(1.3)"/></td>'+
        '<td style="padding:10px 12px;text-align:center"><button class="btn btn-danger btn-sm" onclick="window._ltcDelete('+i+')"><i class="fas fa-trash"></i></button></td>'+
      '</tr>';
    }).join('');
  }

  window._ltcData = JSON.parse(JSON.stringify(config));
  window._ltcDelete = function(i) {
    window._ltcData.splice(i, 1);
    var tbody = document.getElementById('ltc-tbody');
    if (tbody) tbody.innerHTML = renderRows(window._ltcData);
  };
  window._ltcAdd = function() {
    window._ltcData.push({ id: 'ltc_'+Date.now(), name: 'New Leave Type', code: 'NL', totalDays: 10, carryForward: false, paid: true, active: true });
    var tbody = document.getElementById('ltc-tbody');
    if (tbody) tbody.innerHTML = renderRows(window._ltcData);
  };

  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:760px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.2)">'+
      '<div style="padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'+
        '<h3 style="margin:0;font-size:16px;font-weight:800;color:#0F2050"><i class="fas fa-sliders-h" style="margin-right:8px;color:#6366f1"></i>Configure Leave Types</h3>'+
        '<button onclick="document.getElementById(\'leave-config-modal\').remove()" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer">&times;</button>'+
      '</div>'+
      '<div style="padding:20px 24px;flex:1;overflow-y:auto">'+
        '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#1e40af">'+
          '<i class="fas fa-info-circle" style="margin-right:6px"></i>These settings apply to all teachers. Changes take effect immediately.'+
        '</div>'+
        '<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">'+
          '<table style="width:100%;border-collapse:collapse;font-size:13px">'+
            '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
              '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Leave Type</th>'+
              '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Code</th>'+
              '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Days/Year</th>'+
              '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Paid</th>'+
              '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Carry Fwd</th>'+
              '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Active</th>'+
              '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Del</th>'+
            '</tr></thead>'+
            '<tbody id="ltc-tbody">'+renderRows(window._ltcData)+'</tbody>'+
          '</table>'+
        '</div>'+
        '<button class="btn btn-secondary" onclick="window._ltcAdd()" style="margin-top:12px"><i class="fas fa-plus"></i> Add Leave Type</button>'+
      '</div>'+
      '<div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0">'+
        '<button class="btn btn-secondary" onclick="document.getElementById(\'leave-config-modal\').remove()">Cancel</button>'+
        '<button class="btn btn-primary" onclick="_saveLeaveTypeConfig()"><i class="fas fa-save"></i> Save Configuration</button>'+
      '</div>'+
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window._saveLeaveTypeConfig = function() {
  DB.saveLeaveTypeConfig(window._ltcData);
  document.getElementById('leave-config-modal').remove();
  showToast('Leave type configuration saved!', 'success');
  renderTeachers();
};

// ==================== ATTENDANCE REPORT ====================
window.openAttendanceReport = function(teacherId) {
  var data = DB.get();
  var teachers = teacherId
    ? [(data.users || []).find(function(u) { return u.id === teacherId; })].filter(Boolean)
    : (data.users || []).filter(function(u) { return u.role === 'subadmin' && !u.deleted; });

  var now = new Date();
  var defMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  window._attRptMonth = window._attRptMonth || defMonth;

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'att-report-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';

  function buildReport() {
    var month = window._attRptMonth;
    var rows = teachers.map(function(t) {
      var recs = DB.getStaffAttendance(t.id).filter(function(r) { return r.date && r.date.startsWith(month); });
      var present = recs.filter(function(r) { return r.status === 'Present'; }).length;
      var absent = recs.filter(function(r) { return r.status === 'Absent'; }).length;
      var halfDay = recs.filter(function(r) { return r.status === 'Half-Day'; }).length;
      var late = recs.filter(function(r) { return r.lateArrival; }).length;
      var total = recs.length;
      var pct = total ? Math.round((present + halfDay * 0.5) / total * 100) : 0;
      var col = pct >= 85 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';
      var cls = (data.classes||[]).find(function(c) { return c.teacherId === t.id; });
      return '<tr style="border-bottom:1px solid #f1f5f9">'+
        '<td style="padding:10px 12px">'+
          '<div style="font-weight:700;color:#374151;font-size:13px">'+_escH(t.name)+'</div>'+
          '<div style="font-size:11px;color:#94a3b8">'+(cls ? _escH(cls.name) : _escH(t.designation||'Teacher'))+'</div>'+
        '</td>'+
        '<td style="padding:10px 12px;text-align:center;color:#10b981;font-weight:700">'+present+'</td>'+
        '<td style="padding:10px 12px;text-align:center;color:#ef4444;font-weight:700">'+absent+'</td>'+
        '<td style="padding:10px 12px;text-align:center;color:#f59e0b;font-weight:700">'+halfDay+'</td>'+
        '<td style="padding:10px 12px;text-align:center;color:#f97316;font-weight:700">'+late+'</td>'+
        '<td style="padding:10px 12px;text-align:center">'+
          '<span style="background:'+col+'22;color:'+col+';padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700">'+pct+'%</span>'+
        '</td>'+
        '<td style="padding:10px 12px;text-align:center">'+
          '<button class="btn btn-sm" style="background:#eff6ff;color:#2563eb;border:none" onclick="openTeacherAttLog(\''+t.id+'\',\''+month+'\')"><i class="fas fa-eye"></i></button>'+
        '</td>'+
      '</tr>';
    }).join('');

    var allRecs = [];
    teachers.forEach(function(t) {
      DB.getStaffAttendance(t.id).filter(function(r) { return r.date && r.date.startsWith(month); }).forEach(function(r) { allRecs.push(r); });
    });
    var totPresent = allRecs.filter(function(r) { return r.status === 'Present'; }).length;
    var totLate = allRecs.filter(function(r) { return r.lateArrival; }).length;
    var avgPct = allRecs.length ? Math.round((totPresent / allRecs.length) * 100) : 0;

    return '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">'+
        '<div style="background:#d1fae5;border-radius:10px;padding:14px 20px;flex:1;min-width:100px;text-align:center">'+
          '<div style="font-size:22px;font-weight:900;color:#065f46">'+teachers.length+'</div>'+
          '<div style="font-size:11px;color:#065f46;font-weight:700;margin-top:2px">Total Staff</div>'+
        '</div>'+
        '<div style="background:#dbeafe;border-radius:10px;padding:14px 20px;flex:1;min-width:100px;text-align:center">'+
          '<div style="font-size:22px;font-weight:900;color:#1e40af">'+avgPct+'%</div>'+
          '<div style="font-size:11px;color:#1e40af;font-weight:700;margin-top:2px">Avg Attendance</div>'+
        '</div>'+
        '<div style="background:#fef3c7;border-radius:10px;padding:14px 20px;flex:1;min-width:100px;text-align:center">'+
          '<div style="font-size:22px;font-weight:900;color:#92400e">'+totLate+'</div>'+
          '<div style="font-size:11px;color:#92400e;font-weight:700;margin-top:2px">Late Arrivals</div>'+
        '</div>'+
      '</div>'+
      '<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">'+
        '<table style="width:100%;border-collapse:collapse;font-size:13px">'+
          '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
            '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Teacher</th>'+
            '<th style="text-align:center;padding:10px 12px;color:#10b981;font-weight:700">Present</th>'+
            '<th style="text-align:center;padding:10px 12px;color:#ef4444;font-weight:700">Absent</th>'+
            '<th style="text-align:center;padding:10px 12px;color:#f59e0b;font-weight:700">Half-Day</th>'+
            '<th style="text-align:center;padding:10px 12px;color:#f97316;font-weight:700">Late</th>'+
            '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Attendance%</th>'+
            '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Details</th>'+
          '</tr></thead>'+
          '<tbody>'+(rows || '<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8">No data for this month</td></tr>')+'</tbody>'+
        '</table>'+
      '</div>';
  }

  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:900px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.2)">'+
      '<div style="padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'+
        '<h3 style="margin:0;font-size:16px;font-weight:800;color:#0F2050"><i class="fas fa-chart-bar" style="margin-right:8px;color:#6366f1"></i>Attendance Report'+
          (teacherId && teachers[0] ? ' — '+_escH(teachers[0].name) : '')+'</h3>'+
        '<button onclick="document.getElementById(\'att-report-modal\').remove()" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer">&times;</button>'+
      '</div>'+
      '<div style="padding:16px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:12px;flex-shrink:0">'+
        '<label style="font-size:13px;font-weight:600;color:#374151">Month:</label>'+
        '<input type="month" value="'+window._attRptMonth+'" id="att-rpt-month" class="form-control" style="max-width:180px" onchange="window._attRptMonth=this.value;document.getElementById(\'att-rpt-body\').innerHTML=window._buildAttRpt()"/>'+
        '<button class="btn btn-secondary btn-sm" onclick="_printAttReport()"><i class="fas fa-print"></i> Print Report</button>'+
      '</div>'+
      '<div id="att-rpt-body" style="padding:20px 24px;flex:1;overflow-y:auto">'+buildReport()+'</div>'+
      '<div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;flex-shrink:0">'+
        '<button class="btn btn-secondary" onclick="document.getElementById(\'att-report-modal\').remove()">Close</button>'+
      '</div>'+
    '</div>';

  window._buildAttRpt = buildReport;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window.openTeacherAttLog = function(teacherId, month) {
  var data = DB.get();
  var teacher = (data.users || []).find(function(u) { return u.id === teacherId; });
  if (!teacher) return;
  var recs = DB.getStaffAttendance(teacherId).filter(function(r) { return !month || (r.date && r.date.startsWith(month)); });
  recs.sort(function(a, b) { return (b.date||'').localeCompare(a.date||''); });

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'att-log-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';

  var statColor = { 'Present':'#10b981','Absent':'#ef4444','Half-Day':'#f59e0b','On-Leave':'#6366f1' };
  var rows = recs.length > 0
    ? recs.map(function(r) {
        var sc = statColor[r.status] || '#94a3b8';
        return '<tr style="border-bottom:1px solid #f1f5f9">'+
          '<td style="padding:9px 12px;color:#374151;font-size:13px">'+formatDate(r.date)+'</td>'+
          '<td style="padding:9px 12px;text-align:center"><span style="background:'+sc+'22;color:'+sc+';padding:2px 10px;border-radius:6px;font-size:11px;font-weight:700">'+r.status+'</span></td>'+
          '<td style="padding:9px 12px;color:#475569;font-size:12px;text-align:center">'+(r.checkIn||'—')+'</td>'+
          '<td style="padding:9px 12px;color:#475569;font-size:12px;text-align:center">'+(r.checkOut||'—')+'</td>'+
          '<td style="padding:9px 12px;text-align:center">'+
            (r.lateArrival ? '<span style="background:#fff7ed;color:#f97316;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700"><i class="fas fa-clock"></i> Late</span>' : '<span style="color:#94a3b8;font-size:11px">—</span>')+
          '</td>'+
          '<td style="padding:9px 12px;color:#64748b;font-size:12px">'+_escH(r.note||'—')+'</td>'+
        '</tr>';
      }).join('')
    : '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8">No records found</td></tr>';

  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:720px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.2)">'+
      '<div style="padding:16px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'+
        '<h3 style="margin:0;font-size:15px;font-weight:800;color:#0F2050">Daily Log — '+_escH(teacher.name)+(month?' ('+_fmtMonth(month)+')':'')+'</h3>'+
        '<button onclick="document.getElementById(\'att-log-modal\').remove()" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer">&times;</button>'+
      '</div>'+
      '<div style="flex:1;overflow-y:auto">'+
        '<table style="width:100%;border-collapse:collapse;font-size:13px">'+
          '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">'+
            '<th style="text-align:left;padding:9px 12px;color:#64748b;font-weight:700">Date</th>'+
            '<th style="text-align:center;padding:9px 12px;color:#64748b;font-weight:700">Status</th>'+
            '<th style="text-align:center;padding:9px 12px;color:#64748b;font-weight:700">Check In</th>'+
            '<th style="text-align:center;padding:9px 12px;color:#64748b;font-weight:700">Check Out</th>'+
            '<th style="text-align:center;padding:9px 12px;color:#64748b;font-weight:700">Late</th>'+
            '<th style="text-align:left;padding:9px 12px;color:#64748b;font-weight:700">Note</th>'+
          '</tr></thead>'+
          '<tbody>'+rows+'</tbody>'+
        '</table>'+
      '</div>'+
      '<div style="padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;flex-shrink:0">'+
        '<button class="btn btn-secondary" onclick="document.getElementById(\'att-log-modal\').remove()">Close</button>'+
      '</div>'+
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window._printAttReport = function() {
  var month = window._attRptMonth || '';
  var data = DB.get();
  var teachers = (data.users || []).filter(function(u) { return u.role === 'subadmin' && !u.deleted; });
  var rows = teachers.map(function(t) {
    var recs = DB.getStaffAttendance(t.id).filter(function(r) { return !month || (r.date && r.date.startsWith(month)); });
    var present = recs.filter(function(r) { return r.status === 'Present'; }).length;
    var absent = recs.filter(function(r) { return r.status === 'Absent'; }).length;
    var halfDay = recs.filter(function(r) { return r.status === 'Half-Day'; }).length;
    var late = recs.filter(function(r) { return r.lateArrival; }).length;
    var total = recs.length;
    var pct = total ? Math.round((present + halfDay * 0.5) / total * 100) : 0;
    return '<tr><td>'+_escH(t.name)+'</td><td>'+_escH(t.designation||'-')+'</td><td>'+present+'</td><td>'+absent+'</td><td>'+halfDay+'</td><td>'+late+'</td><td>'+pct+'%</td></tr>';
  }).join('');
  var meta = DB.getMeta();
  var win = window.open('', '_blank');
  win.document.write('<!DOCTYPE html><html><head><title>Attendance Report</title><style>'+
    'body{font-family:Arial,sans-serif;margin:30px;color:#333}h2{color:#0F2050}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f8fafc;font-weight:700;color:#475569}tr:nth-child(even){background:#f9fafb}'+
    '.header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0F2050;padding-bottom:12px;margin-bottom:20px}'+
    '@media print{.noprint{display:none}}'+
    '</style></head><body>'+
    '<div class="header"><div><h2>'+_escH(meta.name||'SuperKids India')+'</h2><div style="font-size:12px;color:#666">Staff Attendance Report — '+_fmtMonth(month)+'</div></div><div style="font-size:11px;color:#666;text-align:right">Generated: '+new Date().toLocaleString('en-IN')+'</div></div>'+
    '<table><thead><tr><th>Teacher</th><th>Designation</th><th>Present</th><th>Absent</th><th>Half-Day</th><th>Late</th><th>Attendance%</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '<script>window.onload=function(){window.print();}<\/script>'+
    '</body></html>');
  win.document.close();
};

// ==================== EXIT MANAGEMENT ====================
window.openExitManagement = function(teacherId) {
  var data = DB.get();
  var teacher = (data.users || []).find(function(u) { return u.id === teacherId; });
  if (!teacher) return;
  var exitRec = (DB.getStaffExitRecords(teacherId) || [])[0];

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'exit-mgmt-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';

  var status = exitRec ? exitRec.exitStatus : 'Active';
  var statusColors = { Active:'#10b981', Resigned:'#f59e0b', Terminated:'#ef4444', Relieved:'#6366f1', Archived:'#94a3b8' };
  var sc = statusColors[status] || '#94a3b8';

  var ffItems = exitRec && exitRec.ffItems ? exitRec.ffItems : [
    { label: 'Salary Settlement', status: 'Pending', amount: '' },
    { label: 'Leave Encashment', status: 'Pending', amount: '' },
    { label: 'PF Settlement', status: 'Pending', amount: '' },
    { label: 'Gratuity', status: 'Pending', amount: '' },
    { label: 'Bonus/Incentives', status: 'Pending', amount: '' },
    { label: 'Asset Return', status: 'Pending', amount: '' }
  ];

  var ffRows = ffItems.map(function(item, i) {
    return '<tr>'+
      '<td style="padding:10px 12px;color:#374151;font-size:13px">'+_escH(item.label)+'</td>'+
      '<td style="padding:10px 12px">'+
        '<select id="ff_status_'+i+'" class="form-control" style="font-size:12px">'+
          ['Pending','In-Progress','Done'].map(function(s) { return '<option value="'+s+'"'+(item.status===s?' selected':'')+'>'+s+'</option>'; }).join('')+
        '</select>'+
      '</td>'+
      '<td style="padding:10px 12px"><input id="ff_amount_'+i+'" class="form-control" placeholder="₹ Amount" value="'+_escH(item.amount||'')+'" style="font-size:12px"/></td>'+
    '</tr>';
  }).join('');

  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:860px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.2)">'+
      '<div style="padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'+
        '<div>'+
          '<h3 style="margin:0;font-size:16px;font-weight:800;color:#0F2050"><i class="fas fa-sign-out-alt" style="margin-right:8px;color:#ef4444"></i>Exit Management — '+_escH(teacher.name)+'</h3>'+
          '<div style="font-size:12px;margin-top:4px"><span style="background:'+sc+'22;color:'+sc+';padding:2px 10px;border-radius:6px;font-size:11px;font-weight:700">'+status+'</span></div>'+
        '</div>'+
        '<button onclick="document.getElementById(\'exit-mgmt-modal\').remove()" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer">&times;</button>'+
      '</div>'+

      '<div style="flex:1;overflow-y:auto;padding:20px 24px">'+

        '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:16px">'+
          '<h4 style="margin:0 0 12px;font-size:13px;font-weight:800;color:#b91c1c"><i class="fas fa-file-alt" style="margin-right:6px"></i>Resignation Details</h4>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'+
            '<div><label class="form-label" style="font-size:11px">Exit Type</label>'+
              '<select id="exit-type" class="form-control" style="font-size:12px">'+
                ['Resignation','Termination','Retirement','End of Contract'].map(function(t) {
                  return '<option value="'+t+'"'+(exitRec&&exitRec.exitType===t?' selected':'')+'>'+t+'</option>';
                }).join('')+
              '</select>'+
            '</div>'+
            '<div><label class="form-label" style="font-size:11px">Resignation Date</label>'+
              '<input id="exit-res-date" class="form-control" type="date" value="'+(exitRec&&exitRec.resignationDate||'')+'" style="font-size:12px"/>'+
            '</div>'+
            '<div><label class="form-label" style="font-size:11px">Last Working Date</label>'+
              '<input id="exit-lwd" class="form-control" type="date" value="'+(exitRec&&exitRec.lastWorkingDate||'')+'" style="font-size:12px"/>'+
            '</div>'+
          '</div>'+
          '<div style="margin-top:10px"><label class="form-label" style="font-size:11px">Reason / Comments</label>'+
            '<textarea id="exit-reason" class="form-control" rows="2" style="font-size:12px;resize:none">'+(exitRec&&exitRec.reason||'')+'</textarea>'+
          '</div>'+
          '<div style="margin-top:10px"><label class="form-label" style="font-size:11px">Exit Status</label>'+
            '<select id="exit-status" class="form-control" style="font-size:12px;max-width:200px">'+
              ['Active','Resigned','Terminated','Relieved','Archived'].map(function(s) {
                return '<option value="'+s+'"'+(status===s?' selected':'')+'>'+s+'</option>';
              }).join('')+
            '</select>'+
          '</div>'+
        '</div>'+

        '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin-bottom:16px">'+
          '<h4 style="margin:0 0 12px;font-size:13px;font-weight:800;color:#1e40af"><i class="fas fa-calendar-check" style="margin-right:6px"></i>Notice Period & Relieving</h4>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'+
            '<div><label class="form-label" style="font-size:11px">Notice Period (days)</label>'+
              '<input id="exit-notice" class="form-control" type="number" min="0" value="'+(exitRec&&exitRec.noticePeriodDays||30)+'" style="font-size:12px"/>'+
            '</div>'+
            '<div><label class="form-label" style="font-size:11px">Notice Serving Status</label>'+
              '<select id="exit-notice-status" class="form-control" style="font-size:12px">'+
                ['Full Notice','Partial Notice','Buyout'].map(function(s) {
                  return '<option value="'+s+'"'+(exitRec&&exitRec.noticeStatus===s?' selected':'')+'>'+s+'</option>';
                }).join('')+
              '</select>'+
            '</div>'+
            '<div><label class="form-label" style="font-size:11px">Relieving Letter Issued</label>'+
              '<select id="exit-rel-letter" class="form-control" style="font-size:12px">'+
                ['Pending','Issued'].map(function(s) {
                  return '<option value="'+s+'"'+(exitRec&&exitRec.relievingLetter===s?' selected':'')+'>'+s+'</option>';
                }).join('')+
              '</select>'+
            '</div>'+
          '</div>'+
        '</div>'+

        '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:16px">'+
          '<h4 style="margin:0 0 12px;font-size:13px;font-weight:800;color:#065f46"><i class="fas fa-rupee-sign" style="margin-right:6px"></i>Full & Final Settlement</h4>'+
          '<div style="border:1px solid #d1fae5;border-radius:8px;overflow:hidden">'+
            '<table style="width:100%;border-collapse:collapse;font-size:12px">'+
              '<thead><tr style="background:#ecfdf5;border-bottom:1px solid #d1fae5">'+
                '<th style="padding:8px 12px;text-align:left;color:#065f46;font-weight:700">Component</th>'+
                '<th style="padding:8px 12px;text-align:center;color:#065f46;font-weight:700">Status</th>'+
                '<th style="padding:8px 12px;text-align:left;color:#065f46;font-weight:700">Amount (₹)</th>'+
              '</tr></thead>'+
              '<tbody>'+ffRows+'</tbody>'+
            '</table>'+
          '</div>'+
          '<div style="margin-top:10px"><label class="form-label" style="font-size:11px">F&F Settlement Date</label>'+
            '<input id="exit-ff-date" class="form-control" type="date" value="'+(exitRec&&exitRec.ffSettlementDate||'')+'" style="font-size:12px;max-width:200px"/>'+
          '</div>'+
        '</div>'+

        '<div><label class="form-label" style="font-size:12px;font-weight:700">Additional Notes</label>'+
          '<textarea id="exit-notes" class="form-control" rows="2" placeholder="Any additional remarks..." style="font-size:12px;resize:none">'+(exitRec&&exitRec.notes||'')+'</textarea>'+
        '</div>'+

      '</div>'+

      '<div style="padding:14px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">'+
        '<div>'+
          (exitRec && exitRec.exitStatus !== 'Active' ?
            '<button class="btn btn-sm" style="background:#fff7ed;color:#f97316;border:1px solid #fed7aa" onclick="generateExitLetter(\''+teacherId+'\')"><i class="fas fa-file-download"></i> Generate Relieving Letter</button>' : '')+
        '</div>'+
        '<div style="display:flex;gap:10px">'+
          '<button class="btn btn-secondary" onclick="document.getElementById(\'exit-mgmt-modal\').remove()">Cancel</button>'+
          '<button class="btn btn-primary" onclick="_saveExitRecord(\''+teacherId+'\')"><i class="fas fa-save"></i> Save</button>'+
        '</div>'+
      '</div>'+
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window._saveExitRecord = function(teacherId) {
  var ffLabels = ['Salary Settlement','Leave Encashment','PF Settlement','Gratuity','Bonus/Incentives','Asset Return'];
  var ffItems = ffLabels.map(function(label, i) {
    return {
      label: label,
      status: (document.getElementById('ff_status_'+i) || {}).value || 'Pending',
      amount: (document.getElementById('ff_amount_'+i) || {}).value || ''
    };
  });

  var exitStatus = document.getElementById('exit-status').value;
  var existing = (DB.getStaffExitRecords(teacherId) || [])[0];

  var record = {
    id: existing ? existing.id : 'exit_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),
    teacherId: teacherId,
    exitType: document.getElementById('exit-type').value,
    resignationDate: document.getElementById('exit-res-date').value,
    lastWorkingDate: document.getElementById('exit-lwd').value,
    reason: document.getElementById('exit-reason').value,
    exitStatus: exitStatus,
    noticePeriodDays: parseInt(document.getElementById('exit-notice').value) || 30,
    noticeStatus: document.getElementById('exit-notice-status').value,
    relievingLetter: document.getElementById('exit-rel-letter').value,
    ffItems: ffItems,
    ffSettlementDate: document.getElementById('exit-ff-date').value,
    notes: document.getElementById('exit-notes').value,
    updatedBy: Session.current() ? Session.current().id : '',
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    DB.updateStaffExitRecord(existing.id, record);
  } else {
    DB.addStaffExitRecord(record);
  }

  if (exitStatus === 'Resigned' || exitStatus === 'Terminated' || exitStatus === 'Archived') {
    DB.updateUser(teacherId, { active: false, employmentStatus: exitStatus });
  } else if (exitStatus === 'Active') {
    DB.updateUser(teacherId, { active: true, employmentStatus: 'Active' });
  }

  document.getElementById('exit-mgmt-modal').remove();
  showToast('Exit record saved!', 'success');
  renderTeachers();
};

window.generateExitLetter = function(teacherId) {
  var data = DB.get();
  var teacher = (data.users || []).find(function(u) { return u.id === teacherId; });
  if (!teacher) return;
  var exitRec = (DB.getStaffExitRecords(teacherId) || [])[0];
  var meta = DB.getMeta();
  var schoolName = meta.name || 'SuperKids India Preschool';
  var today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  var lwd = exitRec && exitRec.lastWorkingDate ? new Date(exitRec.lastWorkingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : today;
  var joining = teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

  var win = window.open('', '_blank');
  win.document.write('<!DOCTYPE html><html><head><title>Relieving Letter</title><style>'+
    'body{font-family:Arial,sans-serif;margin:60px;color:#333;line-height:1.7}'+
    'h1{color:#0F2050;font-size:20px;text-align:center;margin-bottom:4px}'+
    '.school-sub{text-align:center;color:#666;font-size:13px;margin-bottom:40px}'+
    '.letter-ref{color:#666;font-size:12px;margin-bottom:30px}'+
    '.signature{margin-top:60px}'+
    '@media print{body{margin:40px}}'+
    '</style></head><body>'+
    '<h1>'+_escH(schoolName)+'</h1>'+
    '<div class="school-sub">'+_escH(meta.address||'')+'<br/>'+_escH(meta.phone||'')+' | '+_escH(meta.email||'')+'</div>'+
    '<div style="text-align:center;font-size:16px;font-weight:700;text-decoration:underline;margin-bottom:24px;color:#0F2050">RELIEVING LETTER</div>'+
    '<div class="letter-ref">Date: '+today+'<br/>Ref: '+_escH(teacher.empId||teacher.id)+'/REL/'+(new Date().getFullYear())+'</div>'+
    '<p>To Whom It May Concern,</p>'+
    '<p>This is to certify that <strong>'+_escH(teacher.name)+'</strong>, Employee ID: <strong>'+_escH(teacher.empId||teacher.id)+'</strong>, was employed with <strong>'+_escH(schoolName)+'</strong> as <strong>'+_escH(teacher.designation||'Teacher')+'</strong> from <strong>'+joining+'</strong> to <strong>'+lwd+'</strong>.</p>'+
    '<p>'+_escH(teacher.name)+' has been relieved from their duties effective <strong>'+lwd+'</strong> following '+(exitRec&&exitRec.exitType ? exitRec.exitType.toLowerCase() : 'separation')+'. During their tenure, they have discharged their responsibilities sincerely and diligently.</p>'+
    '<p>We wish them all the best in their future endeavours.</p>'+
    '<div class="signature">'+
      '<p>Yours faithfully,</p><br/><br/>'+
      '<p><strong>______________________________</strong></p>'+
      '<p><strong>Principal / HR Manager</strong></p>'+
      '<p>'+_escH(schoolName)+'</p>'+
    '</div>'+
    '<script>window.onload=function(){window.print();}<\/script>'+
    '</body></html>');
  win.document.close();

  DB.addHRLetter({
    id: 'rl_'+Date.now(),
    teacherId: teacherId,
    type: 'Relieving Letter',
    issuedDate: new Date().toISOString().slice(0,10),
    issuedBy: Session.current() ? Session.current().id : '',
    createdAt: new Date().toISOString()
  });
};

// ==================== QUICK ACTIONS PANEL ====================
window._tchQuickActions = function(teacherId) {
  var data = DB.get();
  var teacher = (data.users || []).find(function(u) { return u.id === teacherId; });
  if (!teacher) return;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'tch-quick-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:500px;box-shadow:0 20px 60px rgba(0,0,0,0.2)">'+
      '<div style="padding:16px 24px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between">'+
        '<div>'+
          '<div style="font-size:15px;font-weight:800;color:#0F2050">'+_escH(teacher.name)+'</div>'+
          '<div style="font-size:11px;color:#94a3b8">'+_escH(teacher.designation||'Teacher')+' • '+_escH(teacher.empId||'')+'</div>'+
        '</div>'+
        '<button onclick="document.getElementById(\'tch-quick-modal\').remove()" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer">&times;</button>'+
      '</div>'+
      '<div style="padding:20px 24px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'+
        '<button onclick="document.getElementById(\'tch-quick-modal\').remove();openTeacherOnboarding(\''+teacherId+'\')" style="padding:16px;display:flex;flex-direction:column;align-items:center;gap:8px;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer">'+
          '<i class="fas fa-user-edit" style="font-size:20px;color:#6366f1"></i><span style="font-size:12px;font-weight:700;color:#374151">Edit Profile</span>'+
        '</button>'+
        '<button onclick="document.getElementById(\'tch-quick-modal\').remove();openTeacherLetters(\''+teacherId+'\')" style="padding:16px;display:flex;flex-direction:column;align-items:center;gap:8px;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer">'+
          '<i class="fas fa-envelope-open-text" style="font-size:20px;color:#0ea5e9"></i><span style="font-size:12px;font-weight:700;color:#374151">HR Letters</span>'+
        '</button>'+
        '<button onclick="document.getElementById(\'tch-quick-modal\').remove();openTeacherSalary(\''+teacherId+'\')" style="padding:16px;display:flex;flex-direction:column;align-items:center;gap:8px;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer">'+
          '<i class="fas fa-rupee-sign" style="font-size:20px;color:#10b981"></i><span style="font-size:12px;font-weight:700;color:#374151">Salary</span>'+
        '</button>'+
        '<button onclick="document.getElementById(\'tch-quick-modal\').remove();openTeacherLeaveAdmin(\''+teacherId+'\')" style="padding:16px;display:flex;flex-direction:column;align-items:center;gap:8px;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer">'+
          '<i class="fas fa-umbrella-beach" style="font-size:20px;color:#f59e0b"></i><span style="font-size:12px;font-weight:700;color:#374151">Leaves</span>'+
        '</button>'+
        '<button onclick="document.getElementById(\'tch-quick-modal\').remove();openAttendanceReport(\''+teacherId+'\')" style="padding:16px;display:flex;flex-direction:column;align-items:center;gap:8px;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer">'+
          '<i class="fas fa-fingerprint" style="font-size:20px;color:#8b5cf6"></i><span style="font-size:12px;font-weight:700;color:#374151">Attendance</span>'+
        '</button>'+
        '<button onclick="document.getElementById(\'tch-quick-modal\').remove();openExitManagement(\''+teacherId+'\')" style="padding:16px;display:flex;flex-direction:column;align-items:center;gap:8px;border-radius:12px;border:1px solid #fecaca;background:#fef2f2;cursor:pointer">'+
          '<i class="fas fa-sign-out-alt" style="font-size:20px;color:#ef4444"></i><span style="font-size:12px;font-weight:700;color:#ef4444">Exit</span>'+
        '</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

// ==================== ROUTE ====================
registerRoute('teachers', renderTeachers);
