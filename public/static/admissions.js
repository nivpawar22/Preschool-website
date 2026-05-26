// ============================================================
// SuperKids – Admission Management Module
// Roles: admission (operations), superadmin (config + reports)
// ============================================================

var _adm = { inquiries:[], admissions:[], payments:[], feeConfig:null, academicConfig:null };
var _admFormId = null;
var _admFormData = {};
var _admSaving = false;
var _inqFilter = 'all';
var _inqSearch = '';
var _admFilter = 'all';
var _admSearch = '';
var _feeAdmId = null;
var _feeAdmData = null;

var INQ_S = {
  'new':{'label':'New','color':'#0F2050','bg':'#E8EDF5'},
  'contacted':{'label':'Contacted','color':'#1AA6CA','bg':'#E5F5FF'},
  'interested':{'label':'Interested','color':'#E8B020','bg':'#FEF8E0'},
  'follow-up':{'label':'Follow-up','color':'#C4893A','bg':'#FEF0E0'},
  'converted':{'label':'Converted','color':'#059669','bg':'#D1FAE5'},
  'rejected':{'label':'Rejected','color':'#dc2626','bg':'#FEE2E2'},
};
var INQ_KEYS = ['new','contacted','interested','follow-up','converted','rejected'];

var ADM_S = {
  'application_submitted':{'label':'Submitted','color':'#0F2050','bg':'#E8EDF5'},
  'docs_pending':{'label':'Docs Pending','color':'#C4893A','bg':'#FEF0E0'},
  'docs_verified':{'label':'Docs Verified','color':'#1AA6CA','bg':'#E5F5FF'},
  'fees_pending':{'label':'Fees Pending','color':'#E8B020','bg':'#FEF8E0'},
  'approved':{'label':'Approved','color':'#059669','bg':'#D1FAE5'},
  'rejected':{'label':'Rejected','color':'#dc2626','bg':'#FEE2E2'},
  'enrolled':{'label':'Enrolled','color':'#7c3aed','bg':'#EDE9FE'},
};
var ADM_KEYS = ['application_submitted','docs_pending','docs_verified','fees_pending','approved','rejected','enrolled'];

var DEFAULT_CLASSES = [
  {id:'playgroup',name:'Play Group',ageGroup:'1.5–2.5 yrs'},
  {id:'nursery',name:'Nursery',ageGroup:'2.5–3.5 yrs'},
  {id:'jrkg',name:'Jr. KG',ageGroup:'3.5–4.5 yrs'},
  {id:'srkg',name:'Sr. KG',ageGroup:'4.5–5.5 yrs'},
  {id:'superhero',name:'Super Heroes 5+',ageGroup:'5+ yrs'},
];
var DEFAULT_FEE_HEADS = ['Admission Fees','Tuition Fees (Monthly)','Annual Fees','Activity Fees','Transport Fees'];
var DEFAULT_KIT = [
  {id:'bag',name:'School Bag',price:800},
  {id:'uniform',name:'Uniform (Set of 2)',price:1200},
  {id:'books',name:'Book Set',price:1500},
  {id:'stationery',name:'Stationery Kit',price:600},
  {id:'shoes',name:'Shoes',price:700},
  {id:'idCard',name:'ID Card',price:100},
];
var PAYMENT_MODES = ['Cash','UPI','Credit Card','Debit Card','Net Banking','Cheque'];

// ── Helpers ──────────────────────────────────────────────────
function admBadge(status, map) {
  var s = map[status] || {label:status, color:'#6B7A9D', bg:'#F1F5F9'};
  return '<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+s.bg+';color:'+s.color+'">'+s.label+'</span>';
}
function fmtRs(n) { return '₹'+(n||0).toLocaleString('en-IN'); }
function admGet(path) { return fetch(path).then(function(r){return r.json();}); }
function admPost(path,body) { return fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json();}); }
function admPut(path,body) { return fetch(path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json();}); }
function admDel(path) { return fetch(path,{method:'DELETE'}).then(function(r){return r.json();}); }
function fi(id) { var e=document.getElementById(id); return e?e.value.trim():''; }
function fc(id) { var e=document.getElementById(id); return e?e.checked:false; }
function fLabel(label, required) {
  return '<label style="display:block;font-size:11px;font-weight:700;color:#6B7A9D;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">'+label+(required?' <span style="color:#dc2626">*</span>':'')+'</label>';
}
function fInput(id, label, type, val, ph, required) {
  return '<div>'+fLabel(label,required)+'<input id="'+id+'" type="'+(type||'text')+'" value="'+(val||'').toString().replace(/"/g,'&quot;')+'" placeholder="'+(ph||'')+'" style="width:100%;padding:9px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box"></div>';
}
function fSelect(id, label, opts, val, required) {
  return '<div>'+fLabel(label,required)+'<select id="'+id+'" style="width:100%;padding:9px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;cursor:pointer">'+
    opts.map(function(o){var v=typeof o==='string'?o:o.value;var l=typeof o==='string'?o:o.label;return '<option value="'+v+'"'+(v===val?' selected':'')+'>'+l+'</option>';}).join('')+
  '</select></div>';
}
function fTextarea(id, label, val, ph) {
  return '<div>'+fLabel(label,false)+'<textarea id="'+id+'" placeholder="'+(ph||'')+'" rows="3" style="width:100%;padding:9px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box;resize:vertical">'+(val||'')+'</textarea></div>';
}
function secHead(icon, title, color) {
  color=color||'#0F2050';
  return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px"><div style="width:32px;height:32px;border-radius:8px;background:'+color+';display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas '+icon+'" style="color:#fff;font-size:13px"></i></div><h3 style="font-size:15px;font-weight:800;color:#0F1E3D;margin:0">'+title+'</h3></div>';
}
function secWrap(content) {
  return '<div style="background:#F8F9FB;border-radius:12px;padding:20px;margin-bottom:16px">'+content+'</div>';
}
function grid2(a,b) { return '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">'+a+b+'</div>'; }
function grid4(items) { return '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">'+items.join('')+'</div>'; }

function loadAdmConfig(cb) {
  Promise.all([admGet('/api/academic-config'),admGet('/api/fee-config')]).then(function(r){
    _adm.academicConfig = r[0].config || {classes:DEFAULT_CLASSES,currentYear:getAcademicYear(),admissionOpen:true};
    _adm.feeConfig = r[1].config || {feeHeads:[],classWiseFees:{},kitItems:[]};
    if(cb) cb();
  }).catch(function(){ _adm.academicConfig={classes:DEFAULT_CLASSES,currentYear:getAcademicYear()}; _adm.feeConfig={feeHeads:[],classWiseFees:{},kitItems:[]}; if(cb) cb(); });
}

// ============================================================
// DASHBOARD
// ============================================================
function renderAdmissionDashboard() {
  renderLayout('admission-dashboard',
    '<div id="adm-dash"><div style="text-align:center;padding:48px;color:#6B7A9D"><i class="fas fa-spinner fa-spin fa-2x"></i></div></div>',
    'Admission Dashboard','Overview');
  Promise.all([admGet('/api/inquiries'),admGet('/api/admissions'),admGet('/api/payments')]).then(function(r){
    _adm.inquiries=r[0].items||[]; _adm.admissions=r[1].items||[]; _adm.payments=r[2].items||[];
    var inq=_adm.inquiries, adm=_adm.admissions, pay=_adm.payments;
    var col=pay.reduce(function(s,p){var d=p.data?JSON.parse(p.data):{};return s+(d.total||0);},0);
    var el=document.getElementById('adm-dash'); if(!el) return;
    el.innerHTML=
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">'+
        [{icon:'fa-search',label:'Inquiries',val:inq.length,sub:inq.filter(function(i){return i.status==='new';}).length+' new',color:'#0F2050'},
         {icon:'fa-file-alt',label:'Admissions',val:adm.length,sub:adm.filter(function(a){return a.status==='enrolled';}).length+' enrolled',color:'#C4893A'},
         {icon:'fa-clock',label:'Fees Pending',val:adm.filter(function(a){return a.status==='fees_pending';}).length,sub:'students',color:'#E8B020'},
         {icon:'fa-rupee-sign',label:'Collection',val:fmtRs(col),sub:pay.length+' payments',color:'#059669'},
        ].map(function(s){return '<div class="card" style="border-left:4px solid '+s.color+';padding:16px"><div style="display:flex;align-items:center;gap:12px"><div style="width:44px;height:44px;border-radius:12px;background:'+s.color+'18;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas '+s.icon+'" style="color:'+s.color+';font-size:18px"></i></div><div><div style="font-size:22px;font-weight:900;color:#0F1E3D">'+s.val+'</div><div style="font-size:12px;color:#6B7A9D;font-weight:600">'+s.label+'</div><div style="font-size:11px;color:'+s.color+';font-weight:700">'+s.sub+'</div></div></div></div>';}).join('')+
      '</div>'+
      '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">'+
        ['<button class="card" onclick="navigate(\'admission-inquiries\')" style="text-align:left;cursor:pointer;background:linear-gradient(135deg,#0F2050,#1A3A7A);color:#fff;padding:20px"><div style="font-size:2rem;margin-bottom:8px">🔍</div><div style="font-size:15px;font-weight:800">Manage Inquiries</div><div style="font-size:12px;opacity:0.8;margin-top:4px">Track & follow up leads</div></button>',
         '<button class="card" onclick="admNewForm()" style="text-align:left;cursor:pointer;background:linear-gradient(135deg,#C4893A,#E8B020);color:#fff;padding:20px"><div style="font-size:2rem;margin-bottom:8px">📋</div><div style="font-size:15px;font-weight:800">New Admission</div><div style="font-size:12px;opacity:0.8;margin-top:4px">Fill student admission form</div></button>',
         '<button class="card" onclick="navigate(\'fee-collection\')" style="text-align:left;cursor:pointer;background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:20px"><div style="font-size:2rem;margin-bottom:8px">💳</div><div style="font-size:15px;font-weight:800">Collect Fee</div><div style="font-size:12px;opacity:0.8;margin-top:4px">Record fee payment</div></button>',
        ].join('')+
      '</div>'+
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">'+
        '<div class="card"><div class="card-header" style="margin-bottom:12px"><div class="card-title"><i class="fas fa-search" style="color:#0F2050"></i> Recent Inquiries</div><button class="btn btn-sm btn-secondary" onclick="navigate(\'admission-inquiries\')">View All</button></div>'+
          (inq.length===0?'<div style="text-align:center;padding:24px;color:#6B7A9D">No inquiries yet</div>':inq.slice(0,5).map(function(i){var d=i.data?JSON.parse(i.data):{};return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F8F9FB"><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13px;color:#0F1E3D">'+( d.studentName||'–')+'</div><div style="font-size:11px;color:#6B7A9D">'+(d.parentName||'')+' · '+(d.mobile||'')+'</div></div>'+admBadge(i.status,INQ_S)+'</div>';}).join(''))+
        '</div>'+
        '<div class="card"><div class="card-header" style="margin-bottom:12px"><div class="card-title"><i class="fas fa-file-alt" style="color:#C4893A"></i> Recent Admissions</div><button class="btn btn-sm btn-secondary" onclick="navigate(\'admissions-list\')">View All</button></div>'+
          (adm.length===0?'<div style="text-align:center;padding:24px;color:#6B7A9D">No admissions yet</div>':adm.slice(0,5).map(function(a){var d=a.data?JSON.parse(a.data):{};return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F8F9FB"><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13px;color:#0F1E3D">'+(d.studentName||'–')+'</div><div style="font-size:11px;color:#6B7A9D">'+(d.admissionNo||'')+' · '+(d.classId||'')+'</div></div>'+admBadge(a.status,ADM_S)+'</div>';}).join(''))+
        '</div>'+
      '</div>';
  });
}

// ============================================================
// INQUIRIES
// ============================================================
var _inqEditId = null;

function renderAdmissionInquiries() {
  renderLayout('admission-inquiries',
    '<div id="inq-wrap"><div style="text-align:center;padding:48px;color:#6B7A9D"><i class="fas fa-spinner fa-spin fa-2x"></i></div></div>',
    'Inquiries','Manage & Follow-up Leads');
  admGet('/api/inquiries').then(function(r){ _adm.inquiries=r.items||[]; renderInqList(); });
}

function renderInqList() {
  var wrap=document.getElementById('inq-wrap'); if(!wrap) return;
  var list=_adm.inquiries.filter(function(i){
    var d=i.data?JSON.parse(i.data):{};
    var ms=_inqFilter==='all'||i.status===_inqFilter;
    var q=_inqSearch.toLowerCase();
    var mq=!q||(d.studentName||'').toLowerCase().includes(q)||(d.parentName||'').toLowerCase().includes(q)||(d.mobile||'').includes(q);
    return ms&&mq;
  });

  wrap.innerHTML=
    '<div class="card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
      '<input type="text" placeholder="Search name, mobile…" value="'+_inqSearch+'" oninput="_inqSearch=this.value;renderInqList()" style="flex:1;min-width:180px;padding:8px 14px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px">'+
      '<div style="display:flex;gap:6px;flex-wrap:wrap">'+
        (['all'].concat(INQ_KEYS)).map(function(s){
          var lbl=s==='all'?'All':(INQ_S[s]||{label:s}).label;
          var active=_inqFilter===s;
          var col=s==='all'?'#0F2050':(INQ_S[s]||{color:'#6B7A9D'}).color;
          return '<button onclick="_inqFilter=\''+s+'\';renderInqList()" style="padding:5px 12px;border-radius:20px;border:1.5px solid '+(active?col:'#DCE1EF')+';background:'+(active?col:'#fff')+';color:'+(active?'#fff':'#2A3B60')+';font-size:11px;font-weight:700;cursor:pointer">'+lbl+'</button>';
        }).join('')+
      '</div>'+
      '<button class="btn btn-primary" onclick="openInqModal()"><i class="fas fa-plus"></i> Add Inquiry</button>'+
    '</div></div>'+
    '<div class="card">'+
      '<div style="font-size:12px;color:#6B7A9D;margin-bottom:12px">'+list.length+' record(s)</div>'+
      (list.length===0?'<div style="text-align:center;padding:48px;color:#6B7A9D"><i class="fas fa-search" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:12px"></i>No inquiries found</div>':
        list.map(function(i){
          var d=i.data?JSON.parse(i.data):{};
          return '<div style="border:1.5px solid #DCE1EF;border-radius:12px;padding:14px;margin-bottom:10px">'+
            '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">'+
              '<div style="flex:1;min-width:160px">'+
                '<div style="font-weight:800;font-size:14px;color:#0F1E3D">'+(d.studentName||'–')+'</div>'+
                '<div style="font-size:12px;color:#6B7A9D;margin-top:2px">'+(d.parentName||'')+' · <a href="tel:'+(d.mobile||'')+'" style="color:#1AA6CA;text-decoration:none">'+(d.mobile||'–')+'</a></div>'+
                '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">'+
                  (d.interestedClass?'<span style="font-size:11px;background:#F1F5F9;color:#6B7A9D;padding:2px 8px;border-radius:6px">'+d.interestedClass+'</span>':'')+
                  (d.source?'<span style="font-size:11px;background:#F1F5F9;color:#6B7A9D;padding:2px 8px;border-radius:6px">'+d.source+'</span>':'')+
                  '<span style="font-size:11px;color:#94a3b8">'+(i.created_at?i.created_at.split('T')[0]:'')+'</span>'+
                '</div>'+
                (d.notes?'<div style="font-size:12px;color:#2A3B60;margin-top:6px;background:#F8F9FB;padding:6px 10px;border-radius:6px;border-left:3px solid #DCE1EF">'+d.notes+'</div>':'')+
              '</div>'+
              '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">'+
                admBadge(i.status,INQ_S)+
                '<select onchange="updateInqStatus(\''+i.id+'\',this.value)" style="padding:4px 8px;border:1.5px solid #DCE1EF;border-radius:6px;font-size:11px;cursor:pointer">'+
                  INQ_KEYS.map(function(s){return '<option value="'+s+'"'+(s===i.status?' selected':'')+'>'+( INQ_S[s]||{label:s}).label+'</option>';}).join('')+
                '</select>'+
                '<div style="display:flex;gap:6px">'+
                  (i.status!=='converted'?'<button onclick="convertInqToAdm(\''+i.id+'\')" style="padding:5px 10px;border-radius:6px;border:1.5px solid #059669;background:#D1FAE5;color:#059669;font-size:11px;font-weight:700;cursor:pointer" title="Convert to Admission"><i class="fas fa-arrow-right"></i> Admit</button>':'')+
                  '<button onclick="openInqModal(\''+i.id+'\')" style="padding:5px 10px;border-radius:6px;border:1.5px solid #DCE1EF;background:#fff;color:#2A3B60;font-size:11px;cursor:pointer"><i class="fas fa-edit"></i></button>'+
                  '<button onclick="deleteInq(\''+i.id+'\')" style="padding:5px 10px;border-radius:6px;border:1.5px solid #FEE2E2;background:#FEE2E2;color:#dc2626;font-size:11px;cursor:pointer"><i class="fas fa-trash"></i></button>'+
                '</div>'+
              '</div>'+
            '</div></div>';
        }).join('')
      )+
    '</div>';
}

function openInqModal(id) {
  _inqEditId=id||null;
  var d={};
  if(id){ var f=_adm.inquiries.find(function(i){return i.id===id;}); if(f) d=f.data?JSON.parse(f.data):{}; }
  var m=document.createElement('div'); m.className='modal-overlay'; m.id='inq-modal';
  m.onclick=function(e){if(e.target===m)closeInqModal();};
  var cls=DEFAULT_CLASSES.map(function(c){return {value:c.name,label:c.name+' ('+c.ageGroup+')'};});
  m.innerHTML='<div style="background:#fff;border-radius:18px;max-width:560px;width:95%;padding:28px;max-height:90vh;overflow-y:auto">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'+
      '<h3 style="font-size:17px;font-weight:800;color:#0F1E3D;margin:0">'+(id?'Edit Inquiry':'New Inquiry')+'</h3>'+
      '<button onclick="closeInqModal()" style="width:32px;height:32px;border-radius:50%;border:none;background:#f1f5f9;cursor:pointer;font-size:16px">×</button>'+
    '</div>'+
    '<div style="display:flex;flex-direction:column;gap:14px">'+
      grid4([fInput('inq-sn','Student Name','text',d.studentName,'Child\'s full name',true),fInput('inq-pn','Parent Name','text',d.parentName,'Father/Mother name',true)])+
      grid4([fInput('inq-mob','Mobile','tel',d.mobile,'10-digit',true),fInput('inq-email','Email','email',d.email,'')])+
      grid4([fSelect('inq-cls','Interested Class',[{value:'',label:'Select…'}].concat(cls),d.interestedClass,true),fSelect('inq-src','Source',[{value:'',label:'Select…'},'Walk-in','Phone','Website','Social Media','Referral','Other'],d.source)])+
      fInput('inq-city','City','text',d.city,'e.g. Pune')+
      fTextarea('inq-notes','Notes',d.notes,'Call notes, follow-up details…')+
      '<div style="display:flex;gap:10px;justify-content:flex-end">'+
        '<button onclick="closeInqModal()" class="btn btn-secondary">Cancel</button>'+
        '<button onclick="saveInq()" class="btn btn-primary" id="inq-save-btn"><i class="fas fa-save" style="margin-right:6px"></i>Save</button>'+
      '</div>'+
    '</div>'+
  '</div>';
  document.body.appendChild(m);
}
function closeInqModal(){ var m=document.getElementById('inq-modal'); if(m) m.remove(); }

function saveInq() {
  var d={studentName:fi('inq-sn'),parentName:fi('inq-pn'),mobile:fi('inq-mob'),email:fi('inq-email'),interestedClass:fi('inq-cls'),source:fi('inq-src'),city:fi('inq-city'),notes:fi('inq-notes')};
  if(!d.studentName||!d.parentName||!d.mobile){showToast('Fill required fields','warning');return;}
  var btn=document.getElementById('inq-save-btn'); if(btn){btn.disabled=true;btn.textContent='Saving…';}
  var p=_inqEditId?admPut('/api/inquiries/'+_inqEditId,{data:d}):admPost('/api/inquiries',{data:d});
  p.then(function(r){
    if(r.error){showToast(r.error,'error');return;}
    showToast(_inqEditId?'Inquiry updated':'Inquiry added','success');
    closeInqModal(); renderAdmissionInquiries();
  }).catch(function(){showToast('Failed','error');});
}

function updateInqStatus(id,status) {
  admPut('/api/inquiries/'+id,{status:status}).then(function(){
    var i=_adm.inquiries.find(function(x){return x.id===id;}); if(i) i.status=status;
    showToast('Status updated','success'); renderInqList();
  });
}

function deleteInq(id) {
  confirmDialog('Delete this inquiry?',function(){
    admDel('/api/inquiries/'+id).then(function(){
      _adm.inquiries=_adm.inquiries.filter(function(i){return i.id!==id;});
      showToast('Deleted','success'); renderInqList();
    });
  });
}

function convertInqToAdm(inqId) {
  var inq=_adm.inquiries.find(function(i){return i.id===inqId;}); if(!inq) return;
  var d=inq.data?JSON.parse(inq.data):{};
  _admFormId=null;
  _admFormData={fromInquiryId:inqId,fatherMobile:d.mobile||'',interestedClass:d.interestedClass||''};
  updateInqStatus(inqId,'converted');
  admNewForm();
}

// ============================================================
// ADMISSIONS LIST
// ============================================================
function renderAdmissionsList() {
  renderLayout('admissions-list',
    '<div id="adm-list"><div style="text-align:center;padding:48px;color:#6B7A9D"><i class="fas fa-spinner fa-spin fa-2x"></i></div></div>',
    'All Admissions','Student Admission Records');
  admGet('/api/admissions').then(function(r){ _adm.admissions=r.items||[]; renderAdmList(); });
}

function renderAdmList() {
  var wrap=document.getElementById('adm-list'); if(!wrap) return;
  var list=_adm.admissions.filter(function(a){
    var d=a.data?JSON.parse(a.data):{};
    var ms=_admFilter==='all'||a.status===_admFilter;
    var q=_admSearch.toLowerCase();
    var mq=!q||(d.studentName||'').toLowerCase().includes(q)||(d.admissionNo||'').toLowerCase().includes(q)||(d.fatherMobile||'').includes(q)||(d.motherMobile||'').includes(q);
    return ms&&mq;
  });

  wrap.innerHTML=
    '<div class="card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
      '<input type="text" placeholder="Search name, adm. no, mobile…" value="'+_admSearch+'" oninput="_admSearch=this.value;renderAdmList()" style="flex:1;min-width:180px;padding:8px 14px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px">'+
      '<select onchange="_admFilter=this.value;renderAdmList()" style="padding:8px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px;cursor:pointer">'+
        '<option value="all">All Status</option>'+ADM_KEYS.map(function(s){return '<option value="'+s+'"'+(_admFilter===s?' selected':'')+'>'+(ADM_S[s]||{label:s}).label+'</option>';}).join('')+
      '</select>'+
      '<button class="btn btn-primary" onclick="admNewForm()"><i class="fas fa-plus"></i> New Admission</button>'+
    '</div></div>'+
    '<div class="card"><div style="font-size:12px;color:#6B7A9D;margin-bottom:12px">'+list.length+' record(s)</div>'+
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'+
      '<thead><tr style="background:#F8F9FB">'+['Adm. No','Student','Class','Parent Mobile','Status','Actions'].map(function(h){return '<th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#6B7A9D;text-transform:uppercase;white-space:nowrap">'+h+'</th>';}).join('')+'</tr></thead>'+
      '<tbody>'+
        (list.length===0?'<tr><td colspan="6" style="text-align:center;padding:48px;color:#6B7A9D">No admissions found</td></tr>':
          list.map(function(a){
            var d=a.data?JSON.parse(a.data):{};
            return '<tr style="border-bottom:1px solid #F1F5F9">'+
              '<td style="padding:10px 12px;font-weight:700;color:#0F2050">'+(d.admissionNo||'–')+'</td>'+
              '<td style="padding:10px 12px;font-weight:700">'+(d.studentName||'–')+'</td>'+
              '<td style="padding:10px 12px;color:#6B7A9D">'+(d.classId||'–')+'</td>'+
              '<td style="padding:10px 12px;color:#6B7A9D">'+(d.fatherMobile||d.motherMobile||'–')+'</td>'+
              '<td style="padding:10px 12px">'+admBadge(a.status,ADM_S)+'</td>'+
              '<td style="padding:10px 12px"><div style="display:flex;gap:6px;flex-wrap:wrap">'+
                '<button onclick="admEditForm(\''+a.id+'\')" style="padding:5px 10px;border-radius:6px;border:1.5px solid #1AA6CA;background:#E5F5FF;color:#1AA6CA;font-size:11px;cursor:pointer"><i class="fas fa-edit"></i></button>'+
                '<button onclick="openCollectFeeModal(\''+a.id+'\')" style="padding:5px 10px;border-radius:6px;border:1.5px solid #059669;background:#D1FAE5;color:#059669;font-size:11px;cursor:pointer" title="Collect Fee"><i class="fas fa-rupee-sign"></i></button>'+
                '<select onchange="updateAdmStatus(\''+a.id+'\',this.value)" style="padding:4px 8px;border:1.5px solid #DCE1EF;border-radius:6px;font-size:11px;cursor:pointer">'+ADM_KEYS.map(function(s){return '<option value="'+s+'"'+(s===a.status?' selected':'')+'>'+(ADM_S[s]||{label:s}).label+'</option>';}).join('')+'</select>'+
                '<button onclick="deleteAdm(\''+a.id+'\')" style="padding:5px 10px;border-radius:6px;border:1.5px solid #FEE2E2;background:#FEE2E2;color:#dc2626;font-size:11px;cursor:pointer"><i class="fas fa-trash"></i></button>'+
              '</div></td>'+
            '</tr>';
          }).join('')
        )+
      '</tbody></table></div></div>';
}

function updateAdmStatus(id,status) {
  admPut('/api/admissions/'+id,{status:status}).then(function(){
    var a=_adm.admissions.find(function(x){return x.id===id;}); if(a) a.status=status;
    showToast('Status updated','success'); renderAdmList();
  });
}
function deleteAdm(id) {
  confirmDialog('Delete this admission permanently?',function(){
    admDel('/api/admissions/'+id).then(function(){
      _adm.admissions=_adm.admissions.filter(function(a){return a.id!==id;});
      showToast('Deleted','success'); renderAdmList();
    });
  });
}
function admNewForm() { _admFormId=null; if(!_admFormData) _admFormData={}; navigate('new-admission'); }
function admEditForm(id) { _admFormId=id; _admFormData={}; navigate('new-admission'); }

// ============================================================
// ADMISSION FORM
// ============================================================
function renderNewAdmission() {
  var isEdit=!!_admFormId;
  if(isEdit) {
    renderLayout('new-admission','<div style="text-align:center;padding:64px;color:#6B7A9D"><i class="fas fa-spinner fa-spin fa-2x"></i></div>',isEdit?'Edit Admission':'New Admission','');
    admGet('/api/admissions/'+_admFormId).then(function(r){
      if(!r.item){showToast('Not found','error');return;}
      _admFormData=r.item.data?JSON.parse(r.item.data):{};
      buildAdmForm(r.item.status);
    });
    return;
  }
  if(!_admFormData) _admFormData={};
  buildAdmForm('application_submitted');
}

function buildAdmForm(curStatus) {
  loadAdmConfig(function(){
    var isEdit=!!_admFormId;
    var fd=_admFormData||{};
    var classes=(_adm.academicConfig||{}).classes||DEFAULT_CLASSES;
    var kitItems=((_adm.feeConfig||{}).kitItems||[]).length>0?(_adm.feeConfig.kitItems||DEFAULT_KIT):DEFAULT_KIT;
    var kit=fd.kit||{};

    var html='<div style="max-width:900px;margin:0 auto">'+
      (isEdit?'<div class="card" style="margin-bottom:16px;padding:12px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+
        '<span style="font-size:12px;font-weight:700;color:#6B7A9D">Status:</span>'+admBadge(curStatus,ADM_S)+
        '<div style="margin-left:auto;display:flex;gap:8px">'+
          '<button onclick="printAdmForm()" class="btn btn-secondary" style="font-size:12px"><i class="fas fa-print" style="margin-right:4px"></i>Print</button>'+
          '<button onclick="navigate(\'admissions-list\')" class="btn btn-secondary" style="font-size:12px"><i class="fas fa-list" style="margin-right:4px"></i>All Admissions</button>'+
        '</div></div>':'') +

      secWrap(secHead('fa-child','Student Information','#0F2050')+
        grid4([fInput('af-sn','Student Full Name','text',fd.studentName,'As per birth certificate',true),
               fSelect('af-cls','Program / Class',[{value:'',label:'Select Program…'}].concat(classes.map(function(c){return {value:c.name,label:c.name+' ('+c.ageGroup+')'}})),fd.classId,true)])+
        '<div style="height:12px"></div>'+
        grid4([fInput('af-dob','Date of Birth','date',fd.dob,'',true),fSelect('af-gender','Gender',['','Male','Female','Other'],fd.gender,true)])+
        '<div style="height:12px"></div>'+
        grid4([fSelect('af-bg','Blood Group',['','A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'],fd.bloodGroup),fInput('af-aadhaar','Student Aadhaar','text',fd.aadhaar,'12-digit')])+
        '<div style="height:12px"></div>'+
        grid4([fInput('af-religion','Religion','text',fd.religion,'e.g. Hindu'),fInput('af-mtongue','Mother Tongue','text',fd.motherTongue,'e.g. Marathi')])) +

      secWrap(secHead('fa-user-tie','Father\'s Details','#C4893A')+
        grid4([fInput('af-fn','Father\'s Full Name','text',fd.fatherName,'',true),fInput('af-fmob','Mobile','tel',fd.fatherMobile,'')])+
        '<div style="height:12px"></div>'+
        grid4([fInput('af-femail','Email','email',fd.fatherEmail,''),fInput('af-fprof','Profession','text',fd.fatherProfession,'')])+
        '<div style="height:12px"></div>'+
        grid4([fInput('af-fqual','Qualification','text',fd.fatherQualification,'e.g. B.E.'),fInput('af-faadh','Aadhaar','text',fd.fatherAadhaar,'')])) +

      secWrap(secHead('fa-user','Mother\'s Details','#E8B020')+
        grid4([fInput('af-mn','Mother\'s Full Name','text',fd.motherName,'',true),fInput('af-mmob','Mobile','tel',fd.motherMobile,'')])+
        '<div style="height:12px"></div>'+
        grid4([fInput('af-memail','Email','email',fd.motherEmail,''),fInput('af-mprof','Profession','text',fd.motherProfession,'')])+
        '<div style="height:12px"></div>'+
        fInput('af-maadh','Mother Aadhaar','text',fd.motherAadhaar,'')) +

      secWrap(secHead('fa-map-marker-alt','Residential Address','#1AA6CA')+
        grid4([fInput('af-addr1','Address Line 1','text',fd.address1,'House/Flat, Building',true),fInput('af-addr2','Address Line 2','text',fd.address2,'Area, Landmark')])+
        '<div style="height:12px"></div>'+
        grid4([fInput('af-city','City','text',fd.city||'Pune','',true),fInput('af-pin','PIN Code','text',fd.pincode,'')])) +

      secWrap(secHead('fa-phone-alt','Emergency Contact','#7c3aed')+
        grid4([fInput('af-ename','Contact Person','text',fd.emergencyName,''),fInput('af-erel','Relationship','text',fd.emergencyRelation,'e.g. Uncle')])+
        '<div style="height:12px"></div>'+
        grid4([fInput('af-emob','Mobile','tel',fd.emergencyMobile,''),fInput('af-ealt','Alternate Number','tel',fd.emergencyAlt,'')])) +

      secWrap(secHead('fa-heartbeat','Medical Information','#dc2626')+
        grid4([fInput('af-allergy','Known Allergies','text',fd.allergies,'e.g. Peanuts (or None)'),fInput('af-doctor','Family Doctor','text',fd.doctorName,'')])+
        '<div style="height:12px"></div>'+
        fTextarea('af-medcond','Medical Conditions',fd.medicalConditions,'Ongoing conditions, medications…')) +

      secWrap(secHead('fa-shopping-bag','Education Kit Selection','#E8B020')+
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin-bottom:12px">'+
          kitItems.map(function(k){
            return '<label id="kit-lbl-'+k.id+'" style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border:1.5px solid '+(kit[k.id]?'#E8B020':'#DCE1EF')+';border-radius:10px;background:'+(kit[k.id]?'#FEF8E0':'#fff')+'">'+
              '<input type="checkbox" id="kit-'+k.id+'" '+(kit[k.id]?'checked':'')+' onchange="updateKitTotal()" style="width:16px;height:16px;accent-color:#E8B020;cursor:pointer">'+
              '<div><div style="font-size:13px;font-weight:700;color:#0F1E3D">'+k.name+'</div><div style="font-size:11px;color:#C4893A;font-weight:700">'+fmtRs(k.price)+'</div></div></label>';
          }).join('')+
        '</div>'+
        '<div style="background:#FEF8E0;border:1.5px solid #E8B02033;border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">'+
          '<span style="font-weight:700;color:#2A3B60">Kit Total</span>'+
          '<span id="kit-total" style="font-size:18px;font-weight:900;color:#E8B020">'+fmtRs(kitItems.reduce(function(s,k){return s+(kit[k.id]?k.price:0);},0))+'</span>'+
        '</div>') +

      secWrap(secHead('fa-folder-open','Document Uploads','#059669')+
        '<div style="font-size:12px;color:#6B7A9D;margin-bottom:12px">Accepted: JPG, PNG, PDF</div>'+
        '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">'+
          [{id:'studentPhoto',label:'Student Photo',req:true},{id:'birthCertificate',label:'Birth Certificate',req:true},
           {id:'aadhaarCard',label:'Student Aadhaar',req:true},{id:'parentAadhaar',label:'Parent Aadhaar',req:true},
           {id:'addressProof',label:'Address Proof',req:true},{id:'vaccinationCard',label:'Vaccination Card',req:true},
           {id:'transferCertificate',label:'Transfer Certificate',req:false},{id:'medicalCertificate',label:'Medical Certificate',req:false},
          ].map(function(doc){
            var ex=(fd.docs||{})[doc.id];
            return '<div style="border:1.5px dashed '+(ex?'#059669':'#DCE1EF')+';border-radius:10px;padding:12px;background:'+(ex?'#F0FFF8':'#fff')+'">'+
              '<div style="font-size:12px;font-weight:700;color:#2A3B60;margin-bottom:8px">'+doc.label+(doc.req?' <span style="color:#dc2626">*</span>':'')+'</div>'+
              (ex?'<div style="display:flex;align-items:center;gap:8px"><i class="fas fa-check-circle" style="color:#059669"></i><a href="/r2/'+ex+'" target="_blank" style="font-size:12px;color:#059669;font-weight:700">Uploaded</a><button onclick="removeAdmDoc(\''+doc.id+'\')" style="margin-left:auto;font-size:10px;color:#dc2626;background:none;border:none;cursor:pointer">Remove</button></div>':
                '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 10px;border-radius:6px;background:#F8F9FB;font-size:12px;color:#6B7A9D"><i class="fas fa-upload" style="color:#1AA6CA"></i>Choose file…<input type="file" accept="image/*,.pdf" onchange="uploadAdmDoc(\''+doc.id+'\',this)" style="display:none"></label>')+
            '</div>';
          }).join('')+
        '</div>') +

      secWrap(secHead('fa-file-signature','Declaration','#0F2050')+
        '<div style="background:#fff;border:1.5px solid #DCE1EF;border-radius:10px;padding:14px;font-size:13px;color:#2A3B60;line-height:1.8;margin-bottom:14px">'+
          'I/We declare that all information furnished is true and correct. I/We agree to abide by the rules and regulations of SuperKids India Preschool and give permission for school-use photos/videos of my child.'+
        '</div>'+
        '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;font-weight:600;color:#2A3B60">'+
          '<input type="checkbox" id="af-decl" '+(fd.declarationAccepted?'checked':'')+' style="width:18px;height:18px;accent-color:#0F2050;cursor:pointer">'+
          'I/We accept the above declaration and school rules.'+
        '</label>') +

      '<div class="card" style="display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap;padding:16px">'+
        '<button onclick="navigate(\'admissions-list\')" class="btn btn-secondary">Cancel</button>'+
        '<button onclick="saveAdmForm(true)" class="btn btn-secondary"><i class="fas fa-save" style="margin-right:4px"></i>Save Draft</button>'+
        '<button onclick="saveAdmForm(false)" class="btn btn-primary" id="af-submit"><i class="fas fa-check" style="margin-right:4px"></i>'+(isEdit?'Update':'Submit Admission')+'</button>'+
      '</div>'+
    '</div>';

    renderLayout('new-admission',html,isEdit?'Edit Admission':'New Admission',isEdit?'Update student details':'Complete student admission form');

    window.updateKitTotal=function(){
      var kItems=(_adm.feeConfig&&(_adm.feeConfig.kitItems||[]).length>0)?_adm.feeConfig.kitItems:DEFAULT_KIT;
      var total=kItems.reduce(function(s,k){var cb=document.getElementById('kit-'+k.id);var lbl=document.getElementById('kit-lbl-'+k.id);if(cb&&cb.checked){if(lbl){lbl.style.borderColor='#E8B020';lbl.style.background='#FEF8E0';}return s+k.price;}else{if(lbl){lbl.style.borderColor='#DCE1EF';lbl.style.background='#fff';}return s;}},0);
      var el=document.getElementById('kit-total'); if(el) el.textContent=fmtRs(total);
    };
  });
}

function collectAdmFormData() {
  var kItems=DEFAULT_KIT; var kit={};
  kItems.forEach(function(k){kit[k.id]=fc('kit-'+k.id);});
  return {
    studentName:fi('af-sn'),classId:fi('af-cls'),dob:fi('af-dob'),gender:fi('af-gender'),bloodGroup:fi('af-bg'),aadhaar:fi('af-aadhaar'),religion:fi('af-religion'),motherTongue:fi('af-mtongue'),
    fatherName:fi('af-fn'),fatherMobile:fi('af-fmob'),fatherEmail:fi('af-femail'),fatherProfession:fi('af-fprof'),fatherQualification:fi('af-fqual'),fatherAadhaar:fi('af-faadh'),
    motherName:fi('af-mn'),motherMobile:fi('af-mmob'),motherEmail:fi('af-memail'),motherProfession:fi('af-mprof'),motherAadhaar:fi('af-maadh'),
    address1:fi('af-addr1'),address2:fi('af-addr2'),city:fi('af-city'),pincode:fi('af-pin'),
    emergencyName:fi('af-ename'),emergencyRelation:fi('af-erel'),emergencyMobile:fi('af-emob'),emergencyAlt:fi('af-ealt'),
    allergies:fi('af-allergy'),doctorName:fi('af-doctor'),medicalConditions:fi('af-medcond'),
    kit:kit,declarationAccepted:fc('af-decl'),
    docs:(_admFormData||{}).docs||{},admissionNo:(_admFormData||{}).admissionNo||'',fromInquiryId:(_admFormData||{}).fromInquiryId||'',
  };
}

function saveAdmForm(isDraft) {
  if(_admSaving) return;
  var data=collectAdmFormData();
  if(!isDraft){
    if(!data.studentName){showToast('Student name required','warning');return;}
    if(!data.classId){showToast('Select a program','warning');return;}
    if(!data.fatherName&&!data.motherName){showToast('At least one parent name required','warning');return;}
  }
  _admSaving=true;
  var btn=document.getElementById('af-submit'); if(btn){btn.disabled=true;btn.textContent='Saving…';}
  var method=_admFormId?'PUT':'POST';
  var path=_admFormId?'/api/admissions/'+_admFormId:'/api/admissions';
  var status=isDraft?'docs_pending':'application_submitted';
  var p=_admFormId?admPut(path,{data:data,status:status}):admPost(path,{data:data,status:status});
  p.then(function(r){
    _admSaving=false;
    if(r.error){showToast(r.error,'error');if(btn){btn.disabled=false;btn.textContent=_admFormId?'Update':'Submit Admission';}return;}
    showToast(isDraft?'Draft saved':(_admFormId?'Updated':'Admission submitted! No: '+(r.admissionNo||'')),'success',5000);
    _admFormId=null; _admFormData={};
    navigate('admissions-list');
  }).catch(function(){_admSaving=false;showToast('Failed','error');if(btn){btn.disabled=false;btn.textContent=_admFormId?'Update':'Submit Admission';}});
}

function uploadAdmDoc(docId,input) {
  if(!input.files||!input.files[0]) return;
  showToast('Uploading…','default');
  var form=new FormData(); form.append('file',input.files[0]);
  fetch('/api/upload?folder=admissions',{method:'POST',body:form}).then(function(r){return r.json();}).then(function(r){
    if(r.error){showToast('Upload failed','error');return;}
    if(!_admFormData) _admFormData={};
    if(!_admFormData.docs) _admFormData.docs={};
    _admFormData.docs[docId]=r.key;
    showToast('Uploaded','success');
    var wrapper=input.closest('[style*="dashed"]');
    if(wrapper){wrapper.style.borderColor='#059669';wrapper.style.background='#F0FFF8';
      wrapper.innerHTML=wrapper.querySelector('div').outerHTML+'<div style="display:flex;align-items:center;gap:8px"><i class="fas fa-check-circle" style="color:#059669"></i><a href="/r2/'+r.key+'" target="_blank" style="font-size:12px;color:#059669;font-weight:700">Uploaded</a></div>';}
  }).catch(function(){showToast('Upload failed','error');});
}

function removeAdmDoc(docId) {
  if(_admFormData&&_admFormData.docs) delete _admFormData.docs[docId];
  buildAdmForm((_admFormData||{}).status||'application_submitted');
}

function printAdmForm() {
  var fd=_admFormData||{}; if(!fd.studentName){showToast('Load an admission first','warning');return;}
  var meta=DB.get().meta;
  var schoolName=meta.schoolName||'SuperKids India Preschool';
  var schoolAddr=meta.schoolAddress||'Plot number 51, Sector number 10, Bhosari Pradhikaran, Pune – 411026';
  var logoUrl=meta.schoolLogo||'/static/school-logo.png';
  var phone1=meta.schoolPhone||'';
  var phone2=meta.schoolPhone2||'';
  var email=meta.schoolEmail||'';
  var website=meta.schoolWebsite||'https://superkidsindia.com';
  var principal=meta.principalName||'Principal';
  var win=window.open('','_blank','width=900,height=700');
  var now=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admission Form</title><style>' +
    'body{font-family:Arial,sans-serif;font-size:13px;color:#0F1E3D;padding:0;max-width:800px;margin:0 auto;print-color-adjust:exact;-webkit-print-color-adjust:exact;color-adjust:exact}' +
    '.hdr{background-color:#0F2050}' +
    '.hdr-top{display:flex;align-items:center;padding:14px 20px;gap:14px}' +
    '.hdr-top img{width:64px;height:64px;border-radius:50%;border:3px solid #E8B020;background:#fff;object-fit:contain;flex-shrink:0}' +
    '.hdr-name{font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.3px}' +
    '.hdr-sub{font-size:9px;color:#E8B020;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin-top:3px}' +
    '.hdr-bar{background-color:#dcad92;padding:7px 20px;display:flex;justify-content:space-between;align-items:flex-start}' +
    '.hdr-bl{font-family:Arial,sans-serif;font-size:11px;color:#0F2050;font-weight:600;line-height:1.75}' +
    '.hdr-br{font-family:Arial,sans-serif;font-size:11px;color:#0F2050;font-weight:600;line-height:1.75;text-align:right;max-width:46%}' +
    '.ft{text-align:center;font-size:14px;font-weight:bold;border:2px solid #0F2050;padding:8px;margin:14px 16px;background-color:#E8EDF5}' +
    '.sec{margin:0 16px 12px;border:1px solid #ddd;border-radius:4px}' +
    '.sh{background-color:#0F2050;color:#fff;padding:6px 12px;font-weight:bold;font-size:13px}' +
    '.sb{padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
    '.fl{font-size:10px;color:#666;text-transform:uppercase}.fv{font-weight:700;padding:3px 0;border-bottom:1px solid #ddd;min-height:20px}' +
    '.sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin:24px 16px 0}.sl{border-top:2px solid #0F2050;padding-top:6px;text-align:center;font-size:11px;font-weight:bold;color:#0F2050;height:44px}' +
    '.footer{text-align:center;font-size:10px;color:#555;padding:6px 16px;margin-top:6px}' +
    '.pborder{box-sizing:border-box}' +
    '@media print{body{padding:0;print-color-adjust:exact;-webkit-print-color-adjust:exact;color-adjust:exact}' +
    '.hdr{background-color:#0F2050!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}' +
    '.hdr-bar{background-color:#dcad92!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}' +
    '.sh{background-color:#0F2050!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}' +
    '.ft{background-color:#E8EDF5!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}' +
    '.pborder{border:1pt solid #0F2050!important;min-height:99vh;box-sizing:border-box;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}}' +
  '</style></head><body><div class="pborder">'+
    '<div class="hdr">' +
      '<div class="hdr-top"><img src="'+logoUrl+'" alt="Logo"/><div style="flex:1"><div class="hdr-name">'+schoolName+'</div><div class="hdr-sub">Official Admission Record</div></div></div>' +
      '<div class="hdr-bar">' +
        '<div class="hdr-bl">'+
          (phone1?'<div>&#9742;&nbsp;'+phone1+'</div>':'')+
          (phone2?'<div style="padding-left:14px">'+phone2+'</div>':'')+
          (email?'<div>&#9993;&nbsp;'+email+'</div>':'')+
          '<div>&#8853;&nbsp;'+website+'</div>'+
        '</div>'+
        '<div class="hdr-br">'+
          '<div style="font-weight:800">&#8962;&nbsp;'+schoolName+'</div>'+
          '<div>'+schoolAddr+'</div>'+
        '</div>'+
      '</div>' +
    '</div>'+
    '<div class="ft">STUDENT ADMISSION FORM — Academic Year '+((_adm.academicConfig&&_adm.academicConfig.currentYear)||getAcademicYear())+'</div>'+
    '<div class="sec"><div class="sh">Student Information</div><div class="sb">'+
      [['Admission No.',fd.admissionNo||'–'],['Student Name',fd.studentName||''],['Date of Birth',fd.dob||''],['Gender',fd.gender||''],['Blood Group',fd.bloodGroup||''],['Class / Program',fd.classId||''],['Religion',fd.religion||''],['Mother Tongue',fd.motherTongue||'']].map(function(f){return '<div><div class="fl">'+f[0]+'</div><div class="fv">'+f[1]+'</div></div>';}).join('')+
    '</div></div>'+
    '<div class="sec"><div class="sh">Father\'s Details</div><div class="sb">'+
      [['Full Name',fd.fatherName||''],['Mobile',fd.fatherMobile||''],['Email',fd.fatherEmail||''],['Profession',fd.fatherProfession||''],['Qualification',fd.fatherQualification||''],['Aadhaar',fd.fatherAadhaar||'']].map(function(f){return '<div><div class="fl">'+f[0]+'</div><div class="fv">'+f[1]+'</div></div>';}).join('')+
    '</div></div>'+
    '<div class="sec"><div class="sh">Mother\'s Details</div><div class="sb">'+
      [['Full Name',fd.motherName||''],['Mobile',fd.motherMobile||''],['Email',fd.motherEmail||''],['Profession',fd.motherProfession||''],['Aadhaar',fd.motherAadhaar||'']].map(function(f){return '<div><div class="fl">'+f[0]+'</div><div class="fv">'+f[1]+'</div></div>';}).join('')+
    '</div></div>'+
    '<div class="sec"><div class="sh">Address</div><div class="sb" style="grid-template-columns:1fr">'+
      '<div><div class="fl">Residential Address</div><div class="fv">'+[fd.address1,fd.address2,fd.city,fd.pincode].filter(Boolean).join(', ')+'</div></div>'+
    '</div></div>'+
    '<div class="sec"><div class="sh">Emergency Contact</div><div class="sb">'+
      [['Name',fd.emergencyName||''],['Relationship',fd.emergencyRelation||''],['Primary Mobile',fd.emergencyMobile||''],['Alternate Mobile',fd.emergencyAlt||'']].map(function(f){return '<div><div class="fl">'+f[0]+'</div><div class="fv">'+f[1]+'</div></div>';}).join('')+
    '</div></div>'+
    '<div style="background:#f9f9f9;border:1px solid #ddd;padding:11px 16px;border-radius:4px;font-size:12px;margin:0 16px 14px"><strong>Declaration:</strong> I/We declare that all information furnished is true and correct. I/We agree to abide by the rules and regulations of '+schoolName+'.</div>'+
    '<div class="sigs"><div class="sl">Parent / Guardian Signature</div><div class="sl">Admission Admin</div><div class="sl">'+principal+'</div></div>'+
    '<div style="text-align:right;font-size:10px;color:#aaa;padding:4px 16px">Date: '+now+'</div>'+
  '</div>'+
  '<div class="footer">'+schoolName+' | '+schoolAddr+(website?' | '+website:'')+'</div>'+
  '</body></html>');
  win.document.close(); setTimeout(function(){win.print();},500);
}

// ============================================================
// FEE COLLECTION
// ============================================================
function renderFeeCollection() {
  renderLayout('fee-collection',
    '<div id="fee-wrap"><div style="text-align:center;padding:48px;color:#6B7A9D"><i class="fas fa-spinner fa-spin fa-2x"></i></div></div>',
    'Fee Collection','Record Student Payments');
  Promise.all([admGet('/api/admissions'),admGet('/api/payments'),admGet('/api/fee-config'),admGet('/api/academic-config')]).then(function(r){
    _adm.admissions=r[0].items||[]; _adm.payments=r[1].items||[]; _adm.feeConfig=r[2].config||{};
    _adm.academicConfig=r[3].config||{currentYear:getAcademicYear()};
    buildFeeCollectionUI();
  });
}

function buildFeeItemsHtml(classId, feeConfig) {
  var classWise=(feeConfig&&feeConfig.classWiseFees)||{};
  var classFees=classId?(classWise[classId]||{}):{};
  var activities=(feeConfig&&feeConfig.activities)||[];
  var INST=[
    {id:'installment1',name:'1st Installment (Registration + First)'},
    {id:'installment2',name:'2nd Installment'},
    {id:'installment3',name:'3rd Installment'},
    {id:'educationKit',name:'Education Kit'},
  ];
  var html=INST.map(function(inst){
    var amt=classFees[inst.id]||'';
    return '<label style="display:flex;align-items:center;gap:10px;padding:9px 12px;border:1.5px solid #DCE1EF;border-radius:8px;cursor:pointer;background:#fff">'+
      '<input type="checkbox" class="fee-cb" data-name="'+inst.name+'" onchange="calcFeeTotal()" style="width:16px;height:16px;accent-color:#059669;cursor:pointer;flex-shrink:0">'+
      '<span style="flex:1;font-size:13px;font-weight:600;color:#2A3B60">'+inst.name+'</span>'+
      (classFees[inst.id]?'<span style="font-size:11px;color:#059669;font-weight:700;flex-shrink:0">₹'+Number(classFees[inst.id]).toLocaleString('en-IN')+'</span>':'')+
      '<input type="number" class="fee-amt" value="'+amt+'" placeholder="₹0" oninput="calcFeeTotal()" style="width:100px;padding:5px 8px;border:1.5px solid #DCE1EF;border-radius:6px;font-size:13px;text-align:right;flex-shrink:0">'+
    '</label>';
  }).join('');
  if(activities.length>0){
    html+='<div style="font-size:11px;font-weight:700;color:#1AA6CA;text-transform:uppercase;padding:10px 2px 4px;letter-spacing:0.05em">After-School Activities</div>';
    html+=activities.map(function(act){
      return '<label style="display:flex;align-items:center;gap:10px;padding:9px 12px;border:1.5px solid #DCE1EF;border-radius:8px;cursor:pointer;background:#F8F9FB">'+
        '<input type="checkbox" class="fee-cb" data-name="'+act.name+'" onchange="calcFeeTotal()" style="width:16px;height:16px;accent-color:#1AA6CA;cursor:pointer;flex-shrink:0">'+
        '<span style="flex:1;font-size:13px;font-weight:600;color:#2A3B60"><i class="fas fa-star" style="color:#E8B020;font-size:10px;margin-right:5px"></i>'+act.name+'</span>'+
        '<input type="number" class="fee-amt" value="'+(act.fee||'')+'" placeholder="₹0" oninput="calcFeeTotal()" style="width:100px;padding:5px 8px;border:1.5px solid #DCE1EF;border-radius:6px;font-size:13px;text-align:right;flex-shrink:0">'+
      '</label>';
    }).join('');
  }
  return html;
}

function buildFeeCollectionUI() {
  var wrap=document.getElementById('fee-wrap'); if(!wrap) return;
  var pay=_adm.payments;
  var fc=_adm.feeConfig||{};
  var totalCol=pay.reduce(function(s,p){var d=p.data?JSON.parse(p.data):{};return s+(d.total||0);},0);
  var today=new Date().toISOString().split('T')[0];
  var todayPay=pay.filter(function(p){return p.created_at&&p.created_at.startsWith(today);});

  wrap.innerHTML=
    '<div class="grid grid-cols-3 gap-4 mb-6">'+
      [{label:'Total Collection',val:fmtRs(totalCol),color:'#059669',icon:'fa-rupee-sign'},
       {label:'Payments Today',val:todayPay.length,color:'#1AA6CA',icon:'fa-calendar-day'},
       {label:'Fees Pending',val:_adm.admissions.filter(function(a){return a.status==='fees_pending';}).length+' students',color:'#E8B020',icon:'fa-clock'},
      ].map(function(s){return '<div class="card" style="border-left:4px solid '+s.color+';padding:16px"><div style="display:flex;align-items:center;gap:12px"><div style="width:40px;height:40px;border-radius:10px;background:'+s.color+'18;display:flex;align-items:center;justify-content:center"><i class="fas '+s.icon+'" style="color:'+s.color+'"></i></div><div><div style="font-size:22px;font-weight:900;color:#0F1E3D">'+s.val+'</div><div style="font-size:12px;color:#6B7A9D">'+s.label+'</div></div></div></div>';}).join('')+
    '</div>'+
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">'+
      '<div class="card"><div class="card-header" style="margin-bottom:16px"><div class="card-title"><i class="fas fa-plus-circle" style="color:#059669"></i> Collect Payment</div></div>'+
        '<div style="display:flex;flex-direction:column;gap:12px">'+
          '<div>'+fLabel('Search Student',true)+
            '<input id="fee-srch" type="text" placeholder="Name or admission number…" oninput="feeSearchStudents(this.value)" style="width:100%;padding:9px 12px;border:1.5px solid #DCE1EF;border-radius:8px;font-size:13px;box-sizing:border-box">'+
            '<div id="fee-srch-results" style="max-height:180px;overflow-y:auto;border:1.5px solid #DCE1EF;border-top:none;border-radius:0 0 8px 8px;display:none;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:100;position:relative"></div>'+
          '</div>'+
          '<div id="fee-sel-card" style="display:none;background:#F0FFF8;border:1.5px solid #059669;border-radius:10px;padding:12px">'+
            '<div style="font-weight:800;font-size:14px;color:#0F1E3D" id="fee-sel-name">–</div>'+
            '<div style="font-size:12px;color:#6B7A9D" id="fee-sel-info">–</div>'+
          '</div>'+
          '<div>'+fLabel('Fee Items',true)+
            '<div id="fee-items" style="display:flex;flex-direction:column;gap:6px">'+
              buildFeeItemsHtml(null, fc)+
            '</div>'+
          '</div>'+
          grid4([fSelect('fee-mode','Payment Mode',PAYMENT_MODES,'Cash'),fInput('fee-txn','Transaction ID / UTR','text','','For UPI/NEFT/Cheque')])+
          fInput('fee-disc','Discount (₹)','number','0','')+
          '<div style="background:#F0FFF8;border:1.5px solid #059669;border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:center">'+
            '<span style="font-size:14px;font-weight:700;color:#0F1E3D">Total Amount</span>'+
            '<span id="fee-total" style="font-size:24px;font-weight:900;color:#059669">₹0</span>'+
          '</div>'+
          '<button onclick="recordFeePayment()" class="btn btn-primary" style="width:100%"><i class="fas fa-check" style="margin-right:8px"></i>Record Payment &amp; Print Receipt</button>'+
        '</div>'+
      '</div>'+
      '<div class="card"><div class="card-header" style="margin-bottom:12px"><div class="card-title"><i class="fas fa-receipt" style="color:#C4893A"></i> Recent Payments</div><button class="btn btn-sm btn-secondary" onclick="navigate(\'receipts\')">All</button></div>'+
        (pay.length===0?'<div style="text-align:center;padding:32px;color:#6B7A9D">No payments yet</div>':
          pay.slice(0,8).map(function(p){var d=p.data?JSON.parse(p.data):{};return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #F1F5F9"><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13px">'+(d.studentName||'–')+'</div><div style="font-size:11px;color:#6B7A9D">'+(d.receiptNo||'')+' · '+(d.paymentMode||'')+'</div></div><div style="text-align:right"><div style="font-weight:800;color:#059669">'+fmtRs(d.total)+'</div><div style="font-size:10px;color:#6B7A9D">'+(d.paymentDate||'')+'</div></div><button onclick="printReceipt(\''+p.id+'\')" style="padding:5px 9px;border-radius:6px;border:1.5px solid #C4893A;background:#FEF0E0;color:#C4893A;font-size:11px;cursor:pointer"><i class="fas fa-print"></i></button></div>';}).join('')
        )+
      '</div>'+
    '</div>';

  window.feeSearchStudents=function(q){
    var res=document.getElementById('fee-srch-results'); if(!q){res.style.display='none';return;}
    var matches=_adm.admissions.filter(function(a){var d=a.data?JSON.parse(a.data):{};return (d.studentName||'').toLowerCase().includes(q.toLowerCase())||(d.admissionNo||'').toLowerCase().includes(q.toLowerCase());}).slice(0,8);
    if(!matches.length){res.style.display='none';return;}
    res.style.display='block';
    res.innerHTML=matches.map(function(a){var d=a.data?JSON.parse(a.data):{};return '<div onclick="selectFeeStudent(\''+a.id+'\')" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #F1F5F9;font-size:13px" onmouseover="this.style.background=\'#F8F9FB\'" onmouseout="this.style.background=\'#fff\'"><div style="font-weight:700">'+(d.studentName||'–')+'</div><div style="font-size:11px;color:#6B7A9D">'+(d.admissionNo||'')+' · '+(d.classId||'')+'</div></div>';}).join('');
  };
  window.selectFeeStudent=function(id){
    _feeAdmId=id; var a=_adm.admissions.find(function(x){return x.id===id;}); if(!a) return;
    _feeAdmData=a.data?JSON.parse(a.data):{};
    document.getElementById('fee-srch').value=_feeAdmData.studentName||'';
    document.getElementById('fee-srch-results').style.display='none';
    document.getElementById('fee-sel-card').style.display='block';
    document.getElementById('fee-sel-name').textContent=_feeAdmData.studentName||'–';
    document.getElementById('fee-sel-info').textContent=(_feeAdmData.admissionNo||'')+' · '+(_feeAdmData.classId||'')+' · '+(_feeAdmData.fatherName||'');
    var feeWrap=document.getElementById('fee-items');
    if(feeWrap) feeWrap.innerHTML=buildFeeItemsHtml(_feeAdmData.classId, _adm.feeConfig||{});
    calcFeeTotal();
  };
  window.calcFeeTotal=function(){
    var cbs=document.querySelectorAll('.fee-cb'), amts=document.querySelectorAll('.fee-amt');
    var disc=parseFloat((document.getElementById('fee-disc')||{}).value)||0;
    var total=0; cbs.forEach(function(cb,i){if(cb.checked) total+=parseFloat(amts[i].value)||0;});
    total=Math.max(0,total-disc);
    var el=document.getElementById('fee-total'); if(el) el.textContent=fmtRs(total);
  };
}

function openCollectFeeModal(admId) {
  _feeAdmId=admId; var a=_adm.admissions.find(function(x){return x.id===admId;}); if(!a) return;
  _feeAdmData=a.data?JSON.parse(a.data):{};
  navigate('fee-collection');
  setTimeout(function(){
    window.selectFeeStudent&&window.selectFeeStudent(admId);
  },300);
}

function recordFeePayment() {
  if(!_feeAdmId||!_feeAdmData){showToast('Select a student first','warning');return;}
  var cbs=document.querySelectorAll('.fee-cb'), amts=document.querySelectorAll('.fee-amt');
  var feeItems=[]; var subtotal=0;
  cbs.forEach(function(cb,i){if(cb.checked){var amt=parseFloat(amts[i].value)||0;feeItems.push({type:cb.getAttribute('data-name'),amount:amt});subtotal+=amt;}});
  if(!feeItems.length){showToast('Select at least one fee item','warning');return;}
  var disc=parseFloat((document.getElementById('fee-disc')||{}).value)||0;
  var total=Math.max(0,subtotal-disc);
  var payData={admissionId:_feeAdmId,admissionNo:_feeAdmData.admissionNo||'',studentName:_feeAdmData.studentName||'',classId:_feeAdmData.classId||'',feeItems:feeItems,subtotal:subtotal,discount:disc,total:total,paymentMode:fi('fee-mode'),transactionId:fi('fee-txn'),paymentDate:new Date().toISOString().split('T')[0],collectedBy:(Session.current()||{}).name||'',academicYear:((_adm.academicConfig&&_adm.academicConfig.currentYear)||getAcademicYear())};
  admPost('/api/payments',{data:payData,admissionId:_feeAdmId}).then(function(r){
    if(r.error){showToast(r.error,'error');return;}
    showToast('Payment recorded! Receipt: '+(r.receiptNo||''),'success',5000);
    _feeAdmId=null; _feeAdmData=null;
    if(r.id) setTimeout(function(){printReceipt(r.id);},200);
    navigate('fee-collection');
  }).catch(function(){showToast('Failed to record payment','error');});
}

// ============================================================
// RECEIPTS
// ============================================================
function renderReceipts() {
  renderLayout('receipts',
    '<div id="rcpt-wrap"><div style="text-align:center;padding:48px;color:#6B7A9D"><i class="fas fa-spinner fa-spin fa-2x"></i></div></div>',
    'Receipts','Payment History');
  admGet('/api/payments').then(function(r){ _adm.payments=r.items||[]; buildReceiptsList(); });
}

function buildReceiptsList() {
  var wrap=document.getElementById('rcpt-wrap'); if(!wrap) return;
  var pay=_adm.payments;
  wrap.innerHTML='<div class="card"><div style="font-size:12px;color:#6B7A9D;margin-bottom:12px">'+pay.length+' payment records</div>'+
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'+
      '<thead><tr style="background:#F8F9FB">'+['Receipt No','Student','Class','Amount','Mode','Date',''].map(function(h){return '<th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#6B7A9D;text-transform:uppercase;white-space:nowrap">'+h+'</th>';}).join('')+'</tr></thead>'+
      '<tbody>'+
        (pay.length===0?'<tr><td colspan="7" style="text-align:center;padding:48px;color:#6B7A9D">No payments yet</td></tr>':
          pay.map(function(p){var d=p.data?JSON.parse(p.data):{};return '<tr style="border-bottom:1px solid #F1F5F9">'+
            '<td style="padding:10px 12px;font-weight:700;color:#0F2050">'+(d.receiptNo||'–')+'</td>'+
            '<td style="padding:10px 12px;font-weight:700">'+(d.studentName||'–')+'</td>'+
            '<td style="padding:10px 12px;color:#6B7A9D">'+(d.classId||'–')+'</td>'+
            '<td style="padding:10px 12px;font-weight:800;color:#059669">'+fmtRs(d.total)+'</td>'+
            '<td style="padding:10px 12px">'+(d.paymentMode||'–')+'</td>'+
            '<td style="padding:10px 12px;color:#6B7A9D;white-space:nowrap">'+(d.paymentDate||'')+'</td>'+
            '<td style="padding:10px 12px"><button onclick="printReceipt(\''+p.id+'\')" class="btn btn-sm btn-secondary"><i class="fas fa-print" style="margin-right:4px"></i>Print</button></td>'+
          '</tr>';}).join('')
        )+
      '</tbody></table></div></div>';
}

function printReceipt(payId) {
  admGet('/api/payments/'+payId).then(function(r){
    if(!r.item){showToast('Receipt not found','error');return;}
    var d=r.item.data?JSON.parse(r.item.data):{};
    var meta=DB.get().meta;
    var schoolName=meta.schoolName||'SuperKids India Preschool';
    var schoolAddr=meta.schoolAddress||'Plot number 51, Sector number 10, Bhosari Pradhikaran, Pune – 411026';
    var logoUrl=meta.schoolLogo||'/static/school-logo.png';
    var phone1=meta.schoolPhone||'';
    var phone2=meta.schoolPhone2||'';
    var email=meta.schoolEmail||'';
    var website=meta.schoolWebsite||'https://superkidsindia.com';
    var principal=meta.principalName||'Principal';
    var now=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
    var win=window.open('','_blank','width=700,height=620');
    win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt '+(d.receiptNo||'')+'</title><style>' +
      'body{font-family:Arial,sans-serif;font-size:13px;color:#0F1E3D;padding:0;max-width:600px;margin:0 auto;print-color-adjust:exact;-webkit-print-color-adjust:exact;color-adjust:exact}' +
      '.hdr{background-color:#0F2050}' +
      '.hdr-top{display:flex;align-items:center;padding:14px 18px;gap:14px}' +
      '.hdr-top img{width:62px;height:62px;border-radius:50%;border:3px solid #E8B020;background:#fff;object-fit:contain;flex-shrink:0}' +
      '.hdr-name{font-size:18px;font-weight:900;color:#fff;letter-spacing:-0.3px}' +
      '.hdr-sub{font-size:9px;color:#E8B020;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin-top:3px}' +
      '.hdr-bar{background-color:#dcad92;padding:7px 18px;display:flex;justify-content:space-between;align-items:flex-start}' +
      '.hdr-bl{font-family:Arial,sans-serif;font-size:11px;color:#0F2050;font-weight:600;line-height:1.75}' +
      '.hdr-br{font-family:Arial,sans-serif;font-size:11px;color:#0F2050;font-weight:600;line-height:1.75;text-align:right;max-width:46%}' +
      '.rt{text-align:center;padding:8px;font-size:14px;font-weight:800;letter-spacing:0.5px;background-color:#E8EDF5;color:#0F2050;border-bottom:3px solid #0F2050}' +
      '.ig{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #ddd}' +
      '.ic{padding:8px 12px;border-bottom:1px solid #eee;border-right:1px solid #eee}' +
      '.il{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.05em}' +
      '.iv{font-weight:700;font-size:13px}' +
      '.ft{width:100%;border-collapse:collapse;border:1px solid #ddd}' +
      '.ft th{background-color:#F8F9FB;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#666;border-bottom:1px solid #ddd}' +
      '.tr{background-color:#F0FFF8;font-weight:900;font-size:15px;color:#059669}' +
      '.ftr{background-color:#F8F9FB;padding:14px 18px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;text-align:center}' +
      '.sl{height:40px;border-bottom:2px solid #0F2050;margin-bottom:5px}' +
      '.slbl{font-size:11px;font-weight:700;color:#0F2050}' +
      '.stmp{border:2px dashed #0F2050;border-radius:50%;width:68px;height:68px;display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:8px;font-weight:700;color:#0F2050;text-align:center;line-height:1.3}' +
      '.footer{text-align:center;font-size:10px;color:#555;padding:6px 18px;margin-top:6px}' +
      '.pborder{box-sizing:border-box}' +
      '@media print{body{padding:0;print-color-adjust:exact;-webkit-print-color-adjust:exact;color-adjust:exact}' +
      '.hdr{background-color:#0F2050!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}' +
      '.hdr-bar{background-color:#dcad92!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}' +
      '.rt{background-color:#E8EDF5!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}' +
      '.tr{background-color:#F0FFF8!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}' +
      '.ft th{background-color:#F8F9FB!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}' +
      '.ftr{background-color:#F8F9FB!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}' +
      '.pborder{border:1pt solid #0F2050!important;min-height:99vh;box-sizing:border-box;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;color-adjust:exact!important}}' +
    '</style></head><body><div class="pborder">'+
      '<div class="hdr">' +
        '<div class="hdr-top"><img src="'+logoUrl+'" alt="Logo"/><div style="flex:1"><div class="hdr-name">'+schoolName+'</div><div class="hdr-sub">Fee Payment Receipt</div></div></div>' +
        '<div class="hdr-bar">' +
          '<div class="hdr-bl">'+
            (phone1?'<div>&#9742;&nbsp;'+phone1+'</div>':'')+
            (phone2?'<div style="padding-left:14px">'+phone2+'</div>':'')+
            (email?'<div>&#9993;&nbsp;'+email+'</div>':'')+
            '<div>&#8853;&nbsp;'+website+'</div>'+
          '</div>'+
          '<div class="hdr-br">'+
            '<div style="font-weight:800">&#8962;&nbsp;'+schoolName+'</div>'+
            '<div>'+schoolAddr+'</div>'+
          '</div>'+
        '</div>' +
      '</div>'+
      '<div class="rt">PAYMENT RECEIPT</div>'+
      '<div class="ig">'+
        [['Receipt No.',d.receiptNo||'–'],['Payment Date',d.paymentDate||'–'],['Student Name',d.studentName||'–'],['Admission No.',d.admissionNo||'–'],['Class / Program',d.classId||'–'],['Payment Mode',d.paymentMode||'–'],['Transaction ID',d.transactionId||'–'],['Academic Year',d.academicYear||'']].map(function(f){return '<div class="ic"><div class="il">'+f[0]+'</div><div class="iv">'+f[1]+'</div></div>';}).join('')+
      '</div>'+
      '<table class="ft"><thead><tr><th>Fee Description</th><th style="text-align:right">Amount (₹)</th></tr></thead><tbody>'+
        (d.feeItems||[]).map(function(f){return '<tr><td style="padding:7px 12px;border-bottom:1px solid #eee">'+f.type+'</td><td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700">'+fmtRs(f.amount)+'</td></tr>';}).join('')+
        (d.discount?'<tr><td style="padding:7px 12px;color:#dc2626">Discount</td><td style="padding:7px 12px;text-align:right;color:#dc2626;font-weight:700">- '+fmtRs(d.discount)+'</td></tr>':'')+
        '<tr class="tr"><td style="padding:10px 12px">Total Paid</td><td style="padding:10px 12px;text-align:right">'+fmtRs(d.total)+'</td></tr>'+
      '</tbody></table>'+
      '<div class="ftr"><div><div class="sl"></div><div class="slbl">Accountant Signature</div></div><div><div class="stmp">SCHOOL<br>STAMP</div></div><div><div class="sl"></div><div class="slbl">'+principal+'</div></div></div>'+
      '<div style="text-align:center;font-size:10px;color:#aaa;padding:6px">Computer-generated receipt. Printed: '+now+'</div>'+
    '</div>'+
    '<div class="footer">'+schoolName+' | '+schoolAddr+(website?' | '+website:'')+'</div>'+
    '</body></html>');
    win.document.close(); setTimeout(function(){win.print();},500);
  }).catch(function(){showToast('Failed to load receipt','error');});
}

// ============================================================
// ROUTE REGISTRATIONS
// ============================================================
registerRoute('admission-dashboard', renderAdmissionDashboard);
registerRoute('admission-inquiries', renderAdmissionInquiries);
registerRoute('admissions-list', renderAdmissionsList);
registerRoute('new-admission', function(){ if(!_admFormId&&!_admFormData) _admFormData={}; renderNewAdmission(); });
registerRoute('fee-collection', renderFeeCollection);
registerRoute('receipts', renderReceipts);
