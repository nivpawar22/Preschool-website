// ============================================================
// EduTrack - Central Data Store
// Roles: superadmin | subadmin (class teacher) | parent
// ============================================================

const DB = (() => {
  const STORE_KEY = 'edutrack_v3';

  const R2_BASE = 'https://pub-92df4935826e41f29b59fa7b32da3a0d.r2.dev';

  async function loadFromServer() {
    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          return { ...JSON.parse(JSON.stringify(defaults)), ...data };
        }
      }
    } catch(e) {}
    return null;
  }

  function saveToServer(data) {
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(e) {
        window._dbError = e.error || ('DB save failed: HTTP ' + r.status);
        if (typeof showToast === 'function') showToast('⚠️ Server sync failed: ' + window._dbError, 'error');
      });
      window._dbError = null;
    })
    .catch(function(e) { window._dbError = e.message; });

    // Also push published gallery items to a dedicated small endpoint
    var gallery = (data.gallery || []).filter(function(g) { return g.published; });
    if (gallery.length) {
      fetch('/api/gallery/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: gallery })
      }).catch(function() {});
    }
  }

  const defaults = {
    meta: { version: 3, schoolName: 'SuperKids India Preschool', schoolPhone: '', schoolPhone2: '', schoolEmail: '', schoolWebsite: 'https://superkidsindia.com', schoolAddress: 'Matoshri Apartment, Plot Number 51,\nSector No 10, Bhosari Pradhikaran,\nPin:411026', schoolLogo: '/static/school-logo.png', principalName: '', academicYear: '', letterhead: {} },
    users: [
      {
        id: 'u1', role: 'superadmin', name: 'Dr. Sarah Mitchell', email: 'admin@school.edu',
        username: 'superadmin', password: 'admin123', phone: '+1-555-0100',
        avatar: '#6366f1', active: true, deleted: false, createdAt: '2024-01-01'
      },
      {
        id: 'u2', role: 'subadmin', name: 'Mr. James Carter', email: 'jcarter@school.edu',
        username: 'subadmin1', password: 'teacher123', phone: '+1-555-0201',
        avatar: '#10b981', active: true, deleted: false, createdAt: '2024-01-10',
        assignedClass: 'cls1',
        permissions: { students: true, attendance: true, grades: true, growth: true, activities: true, syllabus: true, announcements: true, leaves: true }
      },
      {
        id: 'u3', role: 'subadmin', name: 'Ms. Emily Rodriguez', email: 'erodriguez@school.edu',
        username: 'subadmin2', password: 'teacher123', phone: '+1-555-0202',
        avatar: '#f59e0b', active: true, deleted: false, createdAt: '2024-01-12',
        assignedClass: 'cls2',
        permissions: { students: true, attendance: true, grades: true, growth: true, activities: true, syllabus: true, announcements: true, leaves: true }
      },
      {
        id: 'u4', role: 'subadmin', name: 'Mr. David Kim', email: 'dkim@school.edu',
        username: 'subadmin3', password: 'teacher123', phone: '+1-555-0203',
        avatar: '#ef4444', active: false, deleted: false, createdAt: '2024-02-01',
        assignedClass: 'cls3',
        permissions: { students: true, attendance: true, grades: false, growth: true, activities: true, syllabus: false, announcements: false, leaves: true }
      },
      {
        id: 'p1', role: 'parent', name: 'Robert Johnson', email: 'rjohnson@email.com',
        username: 'parent1', password: 'parent123', phone: '+1-555-0301',
        avatar: '#8b5cf6', active: true, deleted: false, createdAt: '2024-01-15',
        childIds: ['s1', 's2']
      },
      {
        id: 'p2', role: 'parent', name: 'Maria Williams', email: 'mwilliams@email.com',
        username: 'parent2', password: 'parent123', phone: '+1-555-0302',
        avatar: '#06b6d4', active: true, deleted: false, createdAt: '2024-01-16',
        childIds: ['s3']
      },
      {
        id: 'p3', role: 'parent', name: 'Thomas Brown', email: 'tbrown@email.com',
        username: 'parent3', password: 'parent123', phone: '+1-555-0303',
        avatar: '#84cc16', active: true, deleted: false, createdAt: '2024-02-05',
        childIds: ['s4', 's5']
      },
      {
        id: 'acc1', role: 'accounting', name: 'Accounts Manager', email: 'accounts@superkidsindia.com',
        username: 'accounting', password: 'accounts123', phone: '',
        avatar: '#8b5cf6', active: true, deleted: false, createdAt: '2024-01-01'
      }
    ],
    classes: [
      { id: 'cls1', name: 'Grade 5-A', grade: '5', section: 'A', teacherId: 'u2', capacity: 30, subjects: ['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Physical Education'] },
      { id: 'cls2', name: 'Grade 6-B', grade: '6', section: 'B', teacherId: 'u3', capacity: 30, subjects: ['Mathematics', 'English', 'Science', 'Social Studies', 'History', 'Geography', 'Physical Education'] },
      { id: 'cls3', name: 'Grade 4-C', grade: '4', section: 'C', teacherId: 'u4', capacity: 25, subjects: ['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Music'] },
    ],
    students: [
      { id: 's1', name: 'Emma Johnson', rollNo: 'G5A-001', classId: 'cls1', dob: '2013-04-15', gender: 'Female', parentId: 'p1', photo: null, address: '123 Main St', bloodGroup: 'A+', deleted: false, joinDate: '2024-01-10' },
      { id: 's2', name: 'Ethan Johnson', rollNo: 'G5A-002', classId: 'cls1', dob: '2015-08-22', gender: 'Male', parentId: 'p1', photo: null, address: '123 Main St', bloodGroup: 'O+', deleted: false, joinDate: '2024-01-10' },
      { id: 's3', name: 'Sofia Williams', rollNo: 'G6B-001', classId: 'cls2', dob: '2012-11-30', gender: 'Female', parentId: 'p2', photo: null, address: '456 Oak Ave', bloodGroup: 'B+', deleted: false, joinDate: '2024-01-10' },
      { id: 's4', name: 'Liam Brown', rollNo: 'G5A-003', classId: 'cls1', dob: '2013-06-18', gender: 'Male', parentId: 'p3', photo: null, address: '789 Pine Rd', bloodGroup: 'AB+', deleted: false, joinDate: '2024-01-15' },
      { id: 's5', name: 'Olivia Brown', rollNo: 'G4C-001', classId: 'cls3', dob: '2014-09-05', gender: 'Female', parentId: 'p3', photo: null, address: '789 Pine Rd', bloodGroup: 'A-', deleted: false, joinDate: '2024-01-15' },
    ],
    grades: [
      { id: 'g1', studentId: 's1', classId: 'cls1', term: 'Semester 1', year: '2024', subject: 'Mathematics', score: 92, maxScore: 100, grade: 'A', teacherComment: 'Excellent problem solver', date: '2024-03-15' },
      { id: 'g2', studentId: 's1', classId: 'cls1', term: 'Semester 1', year: '2024', subject: 'English', score: 88, maxScore: 100, grade: 'B+', teacherComment: 'Great reader, improve writing', date: '2024-03-15' },
      { id: 'g3', studentId: 's1', classId: 'cls1', term: 'Semester 1', year: '2024', subject: 'Science', score: 95, maxScore: 100, grade: 'A+', teacherComment: 'Outstanding curiosity', date: '2024-03-15' },
      { id: 'g4', studentId: 's1', classId: 'cls1', term: 'Semester 1', year: '2024', subject: 'Social Studies', score: 78, maxScore: 100, grade: 'B', teacherComment: 'Good participation', date: '2024-03-15' },
      { id: 'g5', studentId: 's1', classId: 'cls1', term: 'Semester 1', year: '2024', subject: 'Art', score: 85, maxScore: 100, grade: 'B+', teacherComment: 'Creative talent', date: '2024-03-15' },
      { id: 'g6', studentId: 's1', classId: 'cls1', term: 'Semester 1', year: '2024', subject: 'Physical Education', score: 90, maxScore: 100, grade: 'A', teacherComment: 'Active and sporty', date: '2024-03-15' },
      { id: 'g7', studentId: 's2', classId: 'cls1', term: 'Semester 1', year: '2024', subject: 'Mathematics', score: 75, maxScore: 100, grade: 'B', teacherComment: 'Needs practice on fractions', date: '2024-03-15' },
      { id: 'g8', studentId: 's2', classId: 'cls1', term: 'Semester 1', year: '2024', subject: 'English', score: 80, maxScore: 100, grade: 'B+', teacherComment: 'Good storytelling skills', date: '2024-03-15' },
      { id: 'g9', studentId: 's3', classId: 'cls2', term: 'Semester 1', year: '2024', subject: 'Mathematics', score: 98, maxScore: 100, grade: 'A+', teacherComment: 'Top of the class!', date: '2024-03-15' },
      { id: 'g10', studentId: 's3', classId: 'cls2', term: 'Semester 1', year: '2024', subject: 'Science', score: 94, maxScore: 100, grade: 'A', teacherComment: 'Very analytical', date: '2024-03-15' },
      { id: 'g11', studentId: 's4', classId: 'cls1', term: 'Semester 1', year: '2024', subject: 'Mathematics', score: 70, maxScore: 100, grade: 'B-', teacherComment: 'Shows improvement', date: '2024-03-15' },
      { id: 'g12', studentId: 's5', classId: 'cls3', term: 'Semester 1', year: '2024', subject: 'Art', score: 96, maxScore: 100, grade: 'A+', teacherComment: 'Exceptional artistic talent', date: '2024-03-15' },
    ],
    attendance: [
      { id: 'a1', studentId: 's1', classId: 'cls1', date: '2024-04-01', status: 'present', markedBy: 'u2' },
      { id: 'a2', studentId: 's1', classId: 'cls1', date: '2024-04-02', status: 'present', markedBy: 'u2' },
      { id: 'a3', studentId: 's1', classId: 'cls1', date: '2024-04-03', status: 'absent', markedBy: 'u2' },
      { id: 'a4', studentId: 's1', classId: 'cls1', date: '2024-04-04', status: 'present', markedBy: 'u2' },
      { id: 'a5', studentId: 's1', classId: 'cls1', date: '2024-04-05', status: 'late', markedBy: 'u2' },
      { id: 'a6', studentId: 's2', classId: 'cls1', date: '2024-04-01', status: 'present', markedBy: 'u2' },
      { id: 'a7', studentId: 's2', classId: 'cls1', date: '2024-04-02', status: 'absent', markedBy: 'u2' },
      { id: 'a8', studentId: 's3', classId: 'cls2', date: '2024-04-01', status: 'present', markedBy: 'u3' },
      { id: 'a9', studentId: 's4', classId: 'cls1', date: '2024-04-01', status: 'present', markedBy: 'u2' },
      { id: 'a10', studentId: 's5', classId: 'cls3', date: '2024-04-01', status: 'present', markedBy: 'u4' },
    ],
    growth: [
      { id: 'gr1', studentId: 's1', date: '2024-01-10', height: 142, weight: 36, bmi: 17.9, recordedBy: 'u2' },
      { id: 'gr2', studentId: 's1', date: '2024-04-10', height: 143, weight: 37, bmi: 18.1, recordedBy: 'u2' },
      { id: 'gr3', studentId: 's2', date: '2024-01-10', height: 115, weight: 22, bmi: 16.6, recordedBy: 'u2' },
      { id: 'gr4', studentId: 's3', date: '2024-01-10', height: 155, weight: 45, bmi: 18.7, recordedBy: 'u3' },
      { id: 'gr5', studentId: 's4', date: '2024-01-15', height: 138, weight: 34, bmi: 17.8, recordedBy: 'u2' },
      { id: 'gr6', studentId: 's5', date: '2024-01-15', height: 126, weight: 27, bmi: 17.0, recordedBy: 'u4' },
    ],
    activities: [
      { id: 'act1', name: 'Football Team', classId: 'cls1', day: 'Monday', time: '3:00 PM', studentIds: ['s1', 's4'], instructor: 'Coach Wilson' },
      { id: 'act2', name: 'Art Club', classId: null, day: 'Wednesday', time: '3:30 PM', studentIds: ['s1', 's5'], instructor: 'Ms. Turner' },
      { id: 'act3', name: 'Math Olympiad', classId: 'cls2', day: 'Thursday', time: '2:00 PM', studentIds: ['s3'], instructor: 'Ms. Rodriguez' },
      { id: 'act4', name: 'Science Club', classId: null, day: 'Tuesday', time: '3:00 PM', studentIds: ['s1', 's3'], instructor: 'Mr. Carter' },
    ],
    syllabus: [
      {
        id: 'syl1', classId: 'cls1', term: 'Semester 1', year: '2024', subject: 'Mathematics',
        topics: [
          { id: 't1', title: 'Fractions & Decimals', weeks: '1-3', status: 'completed', description: 'Understanding fractions, decimals and their operations' },
          { id: 't2', title: 'Geometry Basics', weeks: '4-6', status: 'completed', description: 'Shapes, angles, perimeter and area' },
          { id: 't3', title: 'Statistics & Data', weeks: '7-9', status: 'in_progress', description: 'Bar charts, pie charts and data interpretation' },
          { id: 't4', title: 'Algebra Introduction', weeks: '10-12', status: 'pending', description: 'Variables, expressions and simple equations' },
        ]
      },
      {
        id: 'syl2', classId: 'cls1', term: 'Semester 1', year: '2024', subject: 'English',
        topics: [
          { id: 't5', title: 'Reading Comprehension', weeks: '1-4', status: 'completed', description: 'Passages, inference and vocabulary' },
          { id: 't6', title: 'Creative Writing', weeks: '5-8', status: 'in_progress', description: 'Story writing, descriptive writing and poetry' },
          { id: 't7', title: 'Grammar & Punctuation', weeks: '9-12', status: 'pending', description: 'Tenses, clauses and punctuation rules' },
        ]
      },
      {
        id: 'syl3', classId: 'cls2', term: 'Semester 1', year: '2024', subject: 'Mathematics',
        topics: [
          { id: 't8', title: 'Ratios & Proportions', weeks: '1-3', status: 'completed', description: 'Ratios, rates and proportional reasoning' },
          { id: 't9', title: 'Linear Equations', weeks: '4-7', status: 'completed', description: 'Solving one and two-variable equations' },
          { id: 't10', title: 'Geometry & Measurement', weeks: '8-12', status: 'in_progress', description: 'Area, volume and coordinate geometry' },
        ]
      }
    ],
    leaves: [
      { id: 'l1', studentId: 's1', parentId: 'p1', fromDate: '2024-04-10', toDate: '2024-04-11', reason: 'Medical appointment - follow-up visit', status: 'approved', appliedOn: '2024-04-08', reviewedBy: 'u2', reviewNote: 'Approved. Get well soon!' },
      { id: 'l2', studentId: 's3', parentId: 'p2', fromDate: '2024-04-15', toDate: '2024-04-15', reason: 'Family wedding ceremony', status: 'pending', appliedOn: '2024-04-12', reviewedBy: null, reviewNote: '' },
      { id: 'l3', studentId: 's4', parentId: 'p3', fromDate: '2024-03-20', toDate: '2024-03-22', reason: 'Fever and cold', status: 'approved', appliedOn: '2024-03-19', reviewedBy: 'u2', reviewNote: 'Approved. Rest well.' },
    ],
    announcements: [
      { id: 'ann1', title: 'Parent-Teacher Meeting', body: 'The PTM is scheduled for April 20th, 2024 from 9 AM to 1 PM. All parents are requested to attend.', postedBy: 'u1', targetRole: 'all', date: '2024-04-05', classId: null },
      { id: 'ann2', title: 'Sports Day Registration Open', body: 'Annual Sports Day is on May 5th. Register your child by April 25th with their class teacher.', postedBy: 'u2', targetRole: 'parent', date: '2024-04-10', classId: 'cls1' },
      { id: 'ann3', title: 'Semester 2 Exam Schedule', body: 'Semester 2 examinations will begin from May 15th. Detailed schedule attached to your email.', postedBy: 'u1', targetRole: 'all', date: '2024-04-12', classId: null },
    ],
    messages: [
      { id: 'm1', from: 'p1', to: 'u2', studentId: 's1', text: 'Hello Mr. Carter, Emma was feeling unwell today. Will she miss the test tomorrow?', time: '2024-04-08 10:30', read: true, type: 'inapp' },
      { id: 'm2', from: 'u2', to: 'p1', studentId: 's1', text: 'Dear Mr. Johnson, no worries. Emma can take the makeup test on Friday. Please ensure she rests well.', time: '2024-04-08 11:15', read: true, type: 'inapp' },
    ],
    events: [
      { id: 'ev1', title: 'Annual Sports Day', description: 'All students participate in sports activities and friendly competitions', date: '2024-05-10', time: '9:00 AM', classId: null, type: 'sports', createdBy: 'u1', createdAt: '2024-04-20T10:00:00' },
      { id: 'ev2', title: 'Parent-Teacher Meeting', description: 'Discuss student progress and address parent queries', date: '2024-05-20', time: '9:00 AM', classId: null, type: 'meeting', createdBy: 'u1', createdAt: '2024-04-22T10:00:00' },
      { id: 'ev3', title: 'Mathematics Olympiad', description: 'Annual math competition – Grade 5-A students only', date: '2024-05-15', time: '10:00 AM', classId: 'cls1', type: 'academic', createdBy: 'u2', createdAt: '2024-04-25T10:00:00' },
      { id: 'ev4', title: 'Cultural Festival', description: 'Annual cultural event with performances and exhibitions by students', date: '2024-06-01', time: '3:00 PM', classId: null, type: 'cultural', createdBy: 'u1', createdAt: '2024-04-28T10:00:00' },
    ],
    activityLog: [],
    purchaseOrders: [],
    expenses: [],
    staffAttendance: [],
    staffLeaves: [],
    salaryPayments: [],
    salaryStructures: [],
    hrLetters: [],
    staffExitRecords: [],
    holidays: [
      { id: 'hol1', name: 'Republic Day', date: '2025-01-26', type: 'National', optional: false },
      { id: 'hol2', name: 'Holi', date: '2025-03-14', type: 'Festival', optional: false },
      { id: 'hol3', name: 'Good Friday', date: '2025-04-18', type: 'Festival', optional: false },
      { id: 'hol4', name: 'Independence Day', date: '2025-08-15', type: 'National', optional: false },
      { id: 'hol5', name: 'Gandhi Jayanti', date: '2025-10-02', type: 'National', optional: false },
      { id: 'hol6', name: 'Diwali', date: '2025-10-20', type: 'Festival', optional: false },
      { id: 'hol7', name: 'Christmas', date: '2025-12-25', type: 'Festival', optional: false }
    ],
    profileChangeRequests: [],
    attendanceCorrectionRequests: [],
    hrDocumentRequests: [],
    resignationRecords: [],
    leaveTypeConfig: [
      { id: 'ltc_casual', name: 'Casual Leave', code: 'CL', totalDays: 12, carryForward: false, paid: true, active: true },
      { id: 'ltc_sick', name: 'Sick Leave', code: 'SL', totalDays: 12, carryForward: false, paid: true, active: true },
      { id: 'ltc_earned', name: 'Earned Leave', code: 'EL', totalDays: 15, carryForward: true, paid: true, active: true }
    ],
    gallery: [
      { id: 'gal1', title: 'Sports Day 2024', description: 'Annual sports day activities with fun races and games', imageData: '', date: '2024-04-10', classId: 'cls1', studentIds: ['s1', 's4'], uploadedBy: 'u2', createdAt: '2024-04-10T09:00:00' },
      { id: 'gal2', title: 'Art Club Exhibition', description: 'Beautiful artwork made by our talented students', imageData: '', date: '2024-04-12', classId: null, studentIds: ['s1', 's5'], uploadedBy: 'u1', createdAt: '2024-04-12T14:00:00' },
      { id: 'gal3', title: 'Science Lab Day', description: 'Students explored chemistry and physics experiments', imageData: '', date: '2024-04-15', classId: 'cls2', studentIds: ['s3'], uploadedBy: 'u3', createdAt: '2024-04-15T11:00:00' },
      { id: 'gal4', title: 'School Field Trip', description: 'A fun day out visiting the nature museum', imageData: '', date: '2024-04-18', classId: 'cls1', studentIds: ['s1', 's2', 's4'], uploadedBy: 'u2', createdAt: '2024-04-18T08:30:00' }
    ]
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge: keep saved data but ensure all default keys exist
        const merged = Object.assign({}, defaults, parsed);
        return merged;
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(defaults));
  }

  function save(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  function reset() {
    localStorage.removeItem(STORE_KEY);
    return JSON.parse(JSON.stringify(defaults));
  }

  let _data = load();

  function get() { return _data; }

  function commit() { save(_data); saveToServer(_data); }

  async function initFromServer() {
    const serverData = await loadFromServer();
    if (serverData) {
      _data = serverData;
      // Merge in any new default users (e.g. accounting admin) missing from saved data
      let mergeChanged = false;
      const existingIds = new Set((_data.users || []).map(function(u) { return u.id; }));
      defaults.users.forEach(function(du) {
        if (!existingIds.has(du.id)) {
          (_data.users = _data.users || []).push(JSON.parse(JSON.stringify(du)));
          mergeChanged = true;
        }
      });
      if (!_data.purchaseOrders) { _data.purchaseOrders = []; mergeChanged = true; }
      if (!_data.expenses) { _data.expenses = []; mergeChanged = true; }
      if (!_data.staffAttendance) { _data.staffAttendance = []; mergeChanged = true; }
      if (!_data.staffLeaves) { _data.staffLeaves = []; mergeChanged = true; }
      if (!_data.salaryPayments) { _data.salaryPayments = []; mergeChanged = true; }
      if (!_data.salaryStructures) { _data.salaryStructures = []; mergeChanged = true; }
      if (!_data.hrLetters) { _data.hrLetters = []; mergeChanged = true; }
      if (!_data.staffExitRecords) { _data.staffExitRecords = []; mergeChanged = true; }
      if (!_data.holidays) { _data.holidays = JSON.parse(JSON.stringify(defaults.holidays)); mergeChanged = true; }
      if (!_data.profileChangeRequests) { _data.profileChangeRequests = []; mergeChanged = true; }
      if (!_data.attendanceCorrectionRequests) { _data.attendanceCorrectionRequests = []; mergeChanged = true; }
      if (!_data.hrDocumentRequests) { _data.hrDocumentRequests = []; mergeChanged = true; }
      if (!_data.resignationRecords) { _data.resignationRecords = []; mergeChanged = true; }
      if (!_data.leaveTypeConfig) { _data.leaveTypeConfig = JSON.parse(JSON.stringify(defaults.leaveTypeConfig)); mergeChanged = true; }
      // Migrate old single-line address to 3-line format
      if (_data.meta && _data.meta.schoolAddress && _data.meta.schoolAddress.indexOf('\n') === -1 && _data.meta.schoolAddress.indexOf('Plot') !== -1) {
        _data.meta.schoolAddress = 'Matoshri Apartment, Plot Number 51,\nSector No 10, Bhosari Pradhikaran,\nPin:411026';
        mergeChanged = true;
      }
      save(_data);
      if (mergeChanged) saveToServer(_data);
    }
    // Sync classes from Management → Classes & Seat Capacity
    try {
      const acRes = await fetch('/api/academic-config');
      if (acRes.ok) {
        const acData = await acRes.json();
        const acClasses = (acData.config && acData.config.classes) ? acData.config.classes : [];
        if (acClasses.length > 0) {
          const existingById = {};
          (_data.classes || []).forEach(function(c) { existingById[c.id] = c; });
          _data.classes = acClasses.map(function(c) {
            const ex = existingById[c.id] || {};
            return { id: c.id, name: c.name, grade: c.ageGroup || '', section: '', teacherId: ex.teacherId || null, capacity: c.capacity || 25, subjects: ex.subjects || [] };
          });
          save(_data);
        }
      }
    } catch(e) {}
    // Sync approved/enrolled admissions → students + parent profiles
    try {
      const admRes = await fetch('/api/admissions');
      if (admRes.ok) {
        const admData = await admRes.json();
        const approved = (admData.items || []).filter(function(a) { return a.status === 'approved' || a.status === 'enrolled'; });
        let changed = false;
        approved.forEach(function(adm) {
          let d = {};
          try { d = typeof adm.data === 'string' ? JSON.parse(adm.data) : (adm.data || {}); } catch(e) { return; }
          if (!d.studentName) return;
          const stuId = 'stu_' + adm.id.replace(/[^a-z0-9]/gi, '_');
          const parId = 'par_' + adm.id.replace(/[^a-z0-9]/gi, '_');
          // Find matching class by name or id
          const cls = (_data.classes || []).find(function(c) {
            return c.name.toLowerCase() === (d.classId || '').toLowerCase() || c.id.toLowerCase() === (d.classId || '').toLowerCase();
          });
          // Compose address from admission form fields
          const fullAddr = [d.address1, d.address2, d.city, d.pincode].filter(Boolean).join(', ') || d.address || '';
          const resolvedClassId = cls ? cls.id : (d.classId || '');
          // Create student if not already present; update address/class if missing
          const existingStu = (_data.students || []).find(function(s) { return s.id === stuId || s.admissionId === adm.id; });
          if (!existingStu) {
            (_data.students = _data.students || []).push({
              id: stuId, name: d.studentName,
              rollNo: d.admissionNo || stuId.slice(-6).toUpperCase(),
              classId: resolvedClassId,
              dob: d.dob || '', gender: d.gender || '', parentId: parId,
              photo: null, address: fullAddr, bloodGroup: d.bloodGroup || '',
              deleted: false, joinDate: d.admissionDate || new Date().toISOString().split('T')[0],
              admissionId: adm.id
            });
            changed = true;
          } else {
            // Update address and classId if they are missing/blank on existing student
            if ((!existingStu.address || existingStu.address === '') && fullAddr) {
              existingStu.address = fullAddr; changed = true;
            }
            if ((!existingStu.classId || existingStu.classId === '') && resolvedClassId) {
              existingStu.classId = resolvedClassId; changed = true;
            }
            if (!existingStu.admissionId) { existingStu.admissionId = adm.id; changed = true; }
          }
          // Create parent profile if not already present
          const hasPar = (_data.users || []).some(function(u) { return u.id === parId || u.admissionId === adm.id; });
          if (!hasPar) {
            const parentName = d.fatherName || d.motherName || d.guardianName || (d.studentName + "'s Parent");
            const phone = (d.fatherMobile || d.motherMobile || '').replace(/\D/g, '').slice(-10);
            const uname = (parentName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'parent') + (phone.slice(-4) || Math.floor(1000 + Math.random() * 9000).toString());
            (_data.users = _data.users || []).push({
              id: parId, role: 'parent', name: parentName,
              email: d.fatherEmail || d.motherEmail || '',
              username: uname, password: 'parent123', phone: phone,
              avatar: '#1AA6CA', active: false, deleted: false,
              createdAt: new Date().toISOString(), childIds: [stuId], admissionId: adm.id
            });
            // Ensure student points to this parent
            const stu = (_data.students || []).find(function(s) { return s.id === stuId; });
            if (stu) stu.parentId = parId;
            changed = true;
          }
        });
        if (changed) save(_data);
      }
    } catch(e) {}
  }

  function genId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  // ---- User helpers ----
  function findUser(username, password) {
    return _data.users.find(u => u.username === username && u.password === password && !u.deleted && u.active);
  }

  function findUserByCredentials(username, password) {
    return _data.users.find(u => u.username === username && u.password === password && !u.deleted);
  }

  function getUser(id) {
    return _data.users.find(u => u.id === id);
  }

  function getSubAdmins() {
    return _data.users.filter(u => u.role === 'subadmin' && !u.deleted);
  }

  function getParents() {
    return _data.users.filter(u => u.role === 'parent' && !u.deleted);
  }

  // ---- Class helpers ----
  function getClass(id) {
    return _data.classes.find(c => c.id === id);
  }

  function getClassTeacher(classId) {
    const cls = getClass(classId);
    if (!cls) return null;
    return getUser(cls.teacherId);
  }

  // ---- Student helpers ----
  function getStudents(classId = null) {
    return _data.students.filter(s => !s.deleted && (classId ? s.classId === classId : true));
  }

  function getStudent(id) {
    return _data.students.find(s => s.id === id && !s.deleted);
  }

  function getStudentsByParent(parentId) {
    const parent = getUser(parentId);
    if (!parent || !parent.childIds) return [];
    return _data.students.filter(s => parent.childIds.includes(s.id) && !s.deleted);
  }

  // ---- Grade helpers ----
  function getGrades(studentId, term = null, year = null) {
    return _data.grades.filter(g =>
      g.studentId === studentId &&
      (term ? g.term === term : true) &&
      (year ? g.year === year : true)
    );
  }

  function getClassGrades(classId, term = null) {
    const studentIds = getStudents(classId).map(s => s.id);
    return _data.grades.filter(g =>
      studentIds.includes(g.studentId) &&
      (term ? g.term === term : true)
    );
  }

  // ---- Attendance helpers ----
  function getAttendance(studentId, month = null) {
    return _data.attendance.filter(a =>
      a.studentId === studentId &&
      (month ? a.date.startsWith(month) : true)
    );
  }

  function getAttendanceByClass(classId, date) {
    const studentIds = getStudents(classId).map(s => s.id);
    return _data.attendance.filter(a => studentIds.includes(a.studentId) && a.date === date);
  }

  // ---- Growth helpers ----
  function getGrowth(studentId) {
    return _data.growth.filter(g => g.studentId === studentId).sort((a, b) => a.date.localeCompare(b.date));
  }

  // ---- Leave helpers ----
  function getLeaves(studentId = null, parentId = null, classId = null) {
    return _data.leaves.filter(l => {
      if (studentId && l.studentId !== studentId) return false;
      if (parentId && l.parentId !== parentId) return false;
      if (classId) {
        const stu = getStudent(l.studentId);
        if (!stu || stu.classId !== classId) return false;
      }
      return true;
    });
  }

  // ---- Syllabus helpers ----
  function getSyllabus(classId, term = null) {
    return _data.syllabus.filter(s =>
      s.classId === classId &&
      (term ? s.term === term : true)
    );
  }

  // ---- Announcement helpers ----
  function getAnnouncements(classId = null, role = null) {
    return _data.announcements.filter(a => {
      if (classId && a.classId && a.classId !== classId) return false;
      if (role && a.targetRole !== 'all' && a.targetRole !== role) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  // ---- Gallery helpers ----
  function getGallery(studentId = null, classId = null) {
    const gallery = _data.gallery || [];
    return gallery.filter(p => {
      if (studentId && !(p.studentIds || []).includes(studentId)) return false;
      if (classId && p.classId && p.classId !== classId) return false;
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function addGalleryItem(item) {
    if (!_data.gallery) _data.gallery = [];
    _data.gallery.unshift(item);
    commit();
  }

  function deleteGalleryItem(id) {
    if (!_data.gallery) return;
    _data.gallery = _data.gallery.filter(g => g.id !== id);
    commit();
  }

  // ---- Events ----
  function getEvents(classId = null) {
    const events = _data.events || [];
    return events
      .filter(e => !classId || !e.classId || e.classId === classId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function addEvent(event) {
    if (!_data.events) _data.events = [];
    _data.events.push(event);
    commit();
  }

  function deleteEvent(id) {
    if (!_data.events) return;
    _data.events = _data.events.filter(e => e.id !== id);
    commit();
  }

  // ---- Purchase Orders ----
  function getPurchaseOrders() {
    return (_data.purchaseOrders || []).slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  function addPurchaseOrder(po) {
    if (!_data.purchaseOrders) _data.purchaseOrders = [];
    _data.purchaseOrders.unshift(po);
    commit();
  }

  function deletePurchaseOrder(id) {
    if (!_data.purchaseOrders) return;
    _data.purchaseOrders = _data.purchaseOrders.filter(p => p.id !== id);
    commit();
  }

  // ---- Expenses ----
  function getExpenses(category) {
    const expenses = _data.expenses || [];
    return expenses
      .filter(e => !category || e.category === category)
      .slice()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  function addExpense(expense) {
    if (!_data.expenses) _data.expenses = [];
    _data.expenses.unshift(expense);
    commit();
  }

  function deleteExpense(id) {
    if (!_data.expenses) return;
    _data.expenses = _data.expenses.filter(e => e.id !== id);
    commit();
  }

  // ---- Update User ----
  function updateUser(id, updates) {
    const u = (_data.users || []).find(function(u) { return u.id === id; });
    if (u) { Object.assign(u, updates); commit(); }
  }

  // ---- Staff Attendance ----
  function getStaffAttendance(teacherId, month) {
    return (_data.staffAttendance || [])
      .filter(function(r) { return (!teacherId || r.teacherId === teacherId) && (!month || (r.date || '').startsWith(month)); })
      .sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
  }

  function addStaffAttendance(record) {
    if (!_data.staffAttendance) _data.staffAttendance = [];
    var idx = _data.staffAttendance.findIndex(function(r) { return r.teacherId === record.teacherId && r.date === record.date; });
    if (idx >= 0) { Object.assign(_data.staffAttendance[idx], record); }
    else { _data.staffAttendance.unshift(record); }
    commit();
  }

  function updateStaffAttendance(id, updates) {
    var r = (_data.staffAttendance || []).find(function(r) { return r.id === id; });
    if (r) { Object.assign(r, updates); commit(); }
  }

  function deleteStaffAttendance(id) {
    if (!_data.staffAttendance) return;
    _data.staffAttendance = _data.staffAttendance.filter(function(r) { return r.id !== id; });
    commit();
  }

  // ---- Staff Leaves ----
  function getStaffLeaves(teacherId) {
    return (_data.staffLeaves || [])
      .filter(function(l) { return !teacherId || l.teacherId === teacherId; })
      .sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
  }

  function addStaffLeave(leave) {
    if (!_data.staffLeaves) _data.staffLeaves = [];
    _data.staffLeaves.unshift(leave);
    commit();
  }

  function updateStaffLeave(id, updates) {
    var l = (_data.staffLeaves || []).find(function(l) { return l.id === id; });
    if (l) { Object.assign(l, updates); commit(); }
  }

  function deleteStaffLeave(id) {
    if (!_data.staffLeaves) return;
    _data.staffLeaves = _data.staffLeaves.filter(function(l) { return l.id !== id; });
    commit();
  }

  function getLeaveBalance(teacherId, year) {
    var ltConfig = (_data.leaveTypeConfig || defaults.leaveTypeConfig).filter(function(lt) { return lt.active; });
    var approved = (_data.staffLeaves || []).filter(function(l) {
      return l.teacherId === teacherId && l.status === 'Approved' && (l.fromDate || '').startsWith(year);
    });
    var used = {};
    approved.forEach(function(l) { used[l.leaveType] = (used[l.leaveType] || 0) + (l.days || 0); });
    return ltConfig.map(function(lt) {
      return { type: lt.name, code: lt.code, total: lt.totalDays, used: used[lt.name] || 0, remaining: lt.totalDays - (used[lt.name] || 0), paid: lt.paid };
    });
  }

  // ---- Salary Payments ----
  function getSalaryPayments(teacherId) {
    return (_data.salaryPayments || [])
      .filter(function(p) { return !teacherId || p.teacherId === teacherId; })
      .sort(function(a, b) { return (b.month || '').localeCompare(a.month || ''); });
  }

  function addSalaryPayment(payment) {
    if (!_data.salaryPayments) _data.salaryPayments = [];
    _data.salaryPayments.unshift(payment);
    commit();
  }

  function deleteSalaryPayment(id) {
    if (!_data.salaryPayments) return;
    _data.salaryPayments = _data.salaryPayments.filter(function(p) { return p.id !== id; });
    commit();
  }

  // ---- Salary Structures ----
  function getSalaryStructures(teacherId) {
    return (_data.salaryStructures || [])
      .filter(function(s) { return !teacherId || s.teacherId === teacherId; })
      .sort(function(a, b) { return (b.effectiveFrom || '').localeCompare(a.effectiveFrom || ''); });
  }
  function addSalaryStructure(struct) {
    if (!_data.salaryStructures) _data.salaryStructures = [];
    _data.salaryStructures.unshift(struct);
    commit();
  }
  function deleteSalaryStructure(id) {
    if (!_data.salaryStructures) return;
    _data.salaryStructures = _data.salaryStructures.filter(function(s) { return s.id !== id; });
    commit();
  }

  // ---- HR Letters ----
  function getHRLetters(teacherId) {
    return (_data.hrLetters || [])
      .filter(function(l) { return !teacherId || l.teacherId === teacherId; })
      .sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
  }
  function addHRLetter(letter) {
    if (!_data.hrLetters) _data.hrLetters = [];
    _data.hrLetters.unshift(letter);
    commit();
  }
  function deleteHRLetter(id) {
    if (!_data.hrLetters) return;
    _data.hrLetters = _data.hrLetters.filter(function(l) { return l.id !== id; });
    commit();
  }

  // ---- Exit Records ----
  function getStaffExitRecords(teacherId) {
    return (_data.staffExitRecords || [])
      .filter(function(r) { return !teacherId || r.teacherId === teacherId; })
      .sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
  }
  function addStaffExitRecord(record) {
    if (!_data.staffExitRecords) _data.staffExitRecords = [];
    _data.staffExitRecords.unshift(record);
    commit();
  }
  function updateStaffExitRecord(id, updates) {
    var r = (_data.staffExitRecords || []).find(function(r) { return r.id === id; });
    if (r) { Object.assign(r, updates); commit(); }
  }
  function deleteStaffExitRecord(id) {
    if (!_data.staffExitRecords) return;
    _data.staffExitRecords = _data.staffExitRecords.filter(function(r) { return r.id !== id; });
    commit();
  }

  // ---- Leave Type Config ----
  function getLeaveTypeConfig() {
    return (_data.leaveTypeConfig || JSON.parse(JSON.stringify(defaults.leaveTypeConfig)));
  }
  function saveLeaveTypeConfig(config) {
    _data.leaveTypeConfig = config;
    commit();
  }

  // ---- Holidays ----
  function getHolidays() {
    return (_data.holidays || defaults.holidays).slice().sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); });
  }
  function addHoliday(h) { if(!_data.holidays)_data.holidays=[]; _data.holidays.push(h); commit(); }
  function deleteHoliday(id) { if(!_data.holidays)return; _data.holidays=_data.holidays.filter(function(h){return h.id!==id;}); commit(); }

  // ---- Profile Change Requests ----
  function getProfileChangeRequests(teacherId) {
    return (_data.profileChangeRequests||[]).filter(function(r){return !teacherId||r.teacherId===teacherId;}).sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
  }
  function addProfileChangeRequest(r) { if(!_data.profileChangeRequests)_data.profileChangeRequests=[]; _data.profileChangeRequests.unshift(r); commit(); }
  function updateProfileChangeRequest(id,updates) { var r=(_data.profileChangeRequests||[]).find(function(x){return x.id===id;}); if(r){Object.assign(r,updates);commit();} }

  // ---- Attendance Correction Requests ----
  function getAttendanceCorrectionRequests(teacherId) {
    return (_data.attendanceCorrectionRequests||[]).filter(function(r){return !teacherId||r.teacherId===teacherId;}).sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
  }
  function addAttendanceCorrectionRequest(r) { if(!_data.attendanceCorrectionRequests)_data.attendanceCorrectionRequests=[]; _data.attendanceCorrectionRequests.unshift(r); commit(); }
  function updateAttendanceCorrectionRequest(id,updates) { var r=(_data.attendanceCorrectionRequests||[]).find(function(x){return x.id===id;}); if(r){Object.assign(r,updates);commit();} }

  // ---- HR Document Requests ----
  function getHRDocumentRequests(teacherId) {
    return (_data.hrDocumentRequests||[]).filter(function(r){return !teacherId||r.teacherId===teacherId;}).sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
  }
  function addHRDocumentRequest(r) { if(!_data.hrDocumentRequests)_data.hrDocumentRequests=[]; _data.hrDocumentRequests.unshift(r); commit(); }
  function updateHRDocumentRequest(id,updates) { var r=(_data.hrDocumentRequests||[]).find(function(x){return x.id===id;}); if(r){Object.assign(r,updates);commit();} }

  // ---- Resignation Records ----
  function getResignationRecords(teacherId) {
    return (_data.resignationRecords||[]).filter(function(r){return !teacherId||r.teacherId===teacherId;}).sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
  }
  function addResignationRecord(r) { if(!_data.resignationRecords)_data.resignationRecords=[]; _data.resignationRecords.unshift(r); commit(); }
  function updateResignationRecord(id,updates) { var r=(_data.resignationRecords||[]).find(function(x){return x.id===id;}); if(r){Object.assign(r,updates);commit();} }

  // ---- Activity log ----
  function log(userId, action, details) {
    _data.activityLog.unshift({ id: genId('log'), userId, action, details, time: new Date().toISOString() });
    if (_data.activityLog.length > 500) _data.activityLog.splice(400);
    commit();
  }

  // Calc letter grade
  function calcGrade(score, max) {
    const pct = (score / max) * 100;
    if (pct >= 97) return 'A+';
    if (pct >= 93) return 'A';
    if (pct >= 90) return 'A-';
    if (pct >= 87) return 'B+';
    if (pct >= 83) return 'B';
    if (pct >= 80) return 'B-';
    if (pct >= 77) return 'C+';
    if (pct >= 73) return 'C';
    if (pct >= 70) return 'C-';
    if (pct >= 60) return 'D';
    return 'F';
  }

  function calcBMI(height_cm, weight_kg) {
    const h = height_cm / 100;
    return +(weight_kg / (h * h)).toFixed(1);
  }

  function getAttendanceSummary(studentId) {
    const records = getAttendance(studentId);
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const total = records.length;
    return { present, absent, late, total, pct: total ? Math.round((present / total) * 100) : 0 };
  }

  function getMeta() { return { ...defaults.meta, ...get().meta }; }
  function updateMeta(fields) {
    const d = get();
    d.meta = { ...getMeta(), ...fields };
    commit(d);
  }

  return {
    get, commit, reset, genId, log,
    findUser, findUserByCredentials, getUser, getSubAdmins, getParents,
    getClass, getClassTeacher,
    getStudents, getStudent, getStudentsByParent,
    getGrades, getClassGrades,
    getAttendance, getAttendanceByClass, getAttendanceSummary,
    getGrowth,
    getLeaves,
    getSyllabus,
    getAnnouncements,
    getGallery, addGalleryItem, deleteGalleryItem,
    getEvents, addEvent, deleteEvent,
    getPurchaseOrders, addPurchaseOrder, deletePurchaseOrder,
    getExpenses, addExpense, deleteExpense,
    updateUser,
    getStaffAttendance, addStaffAttendance, updateStaffAttendance, deleteStaffAttendance,
    getStaffLeaves, addStaffLeave, updateStaffLeave, deleteStaffLeave, getLeaveBalance,
    getSalaryPayments, addSalaryPayment, deleteSalaryPayment,
    getSalaryStructures, addSalaryStructure, deleteSalaryStructure,
    getHRLetters, addHRLetter, deleteHRLetter,
    getStaffExitRecords, addStaffExitRecord, updateStaffExitRecord, deleteStaffExitRecord,
    getLeaveTypeConfig, saveLeaveTypeConfig,
    getHolidays, addHoliday, deleteHoliday,
    getProfileChangeRequests, addProfileChangeRequest, updateProfileChangeRequest,
    getAttendanceCorrectionRequests, addAttendanceCorrectionRequest, updateAttendanceCorrectionRequest,
    getHRDocumentRequests, addHRDocumentRequest, updateHRDocumentRequest,
    getResignationRecords, addResignationRecord, updateResignationRecord,
    calcGrade, calcBMI,
    getMeta, updateMeta,
    defaults,
    initFromServer, R2_BASE
  };
})();

// ============================================================
// Session State
// ============================================================
const Session = (() => {
  let _user = null;
  let _impersonating = null; // superadmin switching to subadmin

  function login(username, password) {
    const user = DB.findUser(username, password);
    if (!user) return null;
    _user = user;
    _impersonating = null;
    DB.log(user.id, 'LOGIN', `User logged in as ${user.role}`);
    return user;
  }

  function logout() {
    if (_impersonating) {
      // return to superadmin
      const sa = _impersonating;
      _impersonating = null;
      _user = sa;
      DB.log(sa.id, 'RETURN_SELF', 'Returned from impersonation');
      return false; // don't fully logout
    }
    DB.log(_user.id, 'LOGOUT', 'User logged out');
    _user = null;
    return true; // fully logged out
  }

  function impersonate(subadminId) {
    if (!_user || _user.role !== 'superadmin') return false;
    const target = DB.getUser(subadminId);
    if (!target || target.role !== 'subadmin') return false;
    _impersonating = _user;
    _user = target;
    DB.log(_impersonating.id, 'IMPERSONATE', `Switched to ${target.name}`);
    return true;
  }

  function current() { return _user; }
  function isImpersonating() { return !!_impersonating; }
  function originalUser() { return _impersonating; }

  function hasPermission(perm) {
    if (!_user) return false;
    if (_user.role === 'superadmin') return true;
    if (_user.role === 'parent') return false;
    return _user.permissions && _user.permissions[perm];
  }

  function canDelete() {
    return _user && _user.role === 'superadmin' && !_impersonating;
  }

  function updateCurrent(updatedUser) {
    if (_user && _user.id === updatedUser.id) _user = { ..._user, ...updatedUser };
  }

  return { login, logout, impersonate, current, isImpersonating, originalUser, hasPermission, canDelete, updateCurrent };
})();
