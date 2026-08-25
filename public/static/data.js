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

  function saveToServer(data, quiet) {
    var token = localStorage.getItem('sk_session_token');
    if (!token) return; // no session — skip server sync, local save still happened
    // Only admin roles write the full DB blob; parents/accounting use dedicated endpoints
    var sess = typeof Session !== 'undefined' ? Session.current() : null;
    if (sess && (sess.role === 'parent' || sess.role === 'admission' || sess.role === 'accounting')) return;
    var authHdr = { 'Authorization': 'Bearer ' + token };
    fetch('/api/db', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHdr),
      body: JSON.stringify(data)
    })
    .then(function(r) {
      if (r.status === 401) {
        // Session expired or invalid — clear stale token silently, no toast
        localStorage.removeItem('sk_session_token');
        return;
      }
      if (!r.ok && !quiet) return r.json().then(function(e) {
        window._dbError = e.error || ('DB save failed: HTTP ' + r.status);
        if (typeof showToast === 'function') showToast('⚠️ Server sync failed: ' + window._dbError, 'error');
      });
      window._dbError = null;
    })
    .catch(function() {}); // network errors are silent — local save already succeeded

    // Also push published gallery items to a dedicated small endpoint
    var gallery = (data.gallery || []).filter(function(g) { return g.published; });
    if (gallery.length) {
      fetch('/api/gallery/sync', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHdr),
        body: JSON.stringify({ items: gallery })
      }).catch(function() {});
    }
  }

  var _dy = new Date().getFullYear(); // current academic year for seed data
  const defaults = {
    meta: { version: 3, schoolName: 'SuperKids India Preschool', schoolPhone: '', schoolPhone2: '', schoolEmail: '', schoolWebsite: 'https://superkidsindia.com', schoolAddress: 'Matoshri Apartment, Plot Number 51,\nSector No 10, Bhosari Pradhikaran,\nPin:411026', schoolLogo: '/static/school-logo.png', principalName: '', academicYear: '', letterhead: {} },
    users: [
      {
        id: 'u1', role: 'superadmin', name: 'Dr. Sarah Mitchell', email: 'admin@school.edu',
        username: 'superadmin', password: '', phone: '+1-555-0100',
        avatar: '#6366f1', active: true, deleted: false, createdAt: _dy+'-01-01'
      },
      {
        id: 'u2', role: 'subadmin', name: 'Mr. James Carter', email: 'jcarter@school.edu',
        username: 'subadmin1', password: '', phone: '+1-555-0201',
        avatar: '#10b981', active: true, deleted: false, createdAt: _dy+'-01-10',
        assignedClass: 'cls1',
        permissions: { students: true, attendance: true, grades: true, growth: true, activities: true, syllabus: true, announcements: true, leaves: true }
      },
      {
        id: 'u3', role: 'subadmin', name: 'Ms. Emily Rodriguez', email: 'erodriguez@school.edu',
        username: 'subadmin2', password: '', phone: '+1-555-0202',
        avatar: '#f59e0b', active: true, deleted: false, createdAt: _dy+'-01-12',
        assignedClass: 'cls2',
        permissions: { students: true, attendance: true, grades: true, growth: true, activities: true, syllabus: true, announcements: true, leaves: true }
      },
      {
        id: 'u4', role: 'subadmin', name: 'Mr. David Kim', email: 'dkim@school.edu',
        username: 'subadmin3', password: '', phone: '+1-555-0203',
        avatar: '#ef4444', active: false, deleted: false, createdAt: _dy+'-02-01',
        assignedClass: 'cls3',
        permissions: { students: true, attendance: true, grades: false, growth: true, activities: true, syllabus: false, announcements: false, leaves: true }
      },
      {
        id: 'p1', role: 'parent', name: 'Robert Johnson', email: 'rjohnson@email.com',
        username: 'parent1', password: '', phone: '+1-555-0301',
        avatar: '#8b5cf6', active: true, deleted: false, createdAt: _dy+'-01-15',
        childIds: ['s1', 's2']
      },
      {
        id: 'p2', role: 'parent', name: 'Maria Williams', email: 'mwilliams@email.com',
        username: 'parent2', password: '', phone: '+1-555-0302',
        avatar: '#06b6d4', active: true, deleted: false, createdAt: _dy+'-01-16',
        childIds: ['s3']
      },
      {
        id: 'p3', role: 'parent', name: 'Thomas Brown', email: 'tbrown@email.com',
        username: 'parent3', password: '', phone: '+1-555-0303',
        avatar: '#84cc16', active: true, deleted: false, createdAt: _dy+'-02-05',
        childIds: ['s4', 's5']
      },
      {
        id: 'acc1', role: 'accounting', name: 'Accounts Manager', email: 'accounts@superkidsindia.com',
        username: 'accounting', password: '', phone: '',
        avatar: '#8b5cf6', active: true, deleted: false, createdAt: _dy+'-01-01'
      }
    ],
    classes: [
      { id: 'cls1', name: 'Grade 5-A', grade: '5', section: 'A', teacherId: 'u2', capacity: 30, subjects: ['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Physical Education'] },
      { id: 'cls2', name: 'Grade 6-B', grade: '6', section: 'B', teacherId: 'u3', capacity: 30, subjects: ['Mathematics', 'English', 'Science', 'Social Studies', 'History', 'Geography', 'Physical Education'] },
      { id: 'cls3', name: 'Grade 4-C', grade: '4', section: 'C', teacherId: 'u4', capacity: 25, subjects: ['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Music'] },
    ],
    students: [
      { id: 's1', name: 'Emma Johnson', rollNo: 'G5A-001', classId: 'cls1', dob: '2013-04-15', gender: 'Female', parentId: 'p1', photo: null, address: '123 Main St', bloodGroup: 'A+', deleted: false, joinDate: _dy+'-01-10' },
      { id: 's2', name: 'Ethan Johnson', rollNo: 'G5A-002', classId: 'cls1', dob: '2015-08-22', gender: 'Male', parentId: 'p1', photo: null, address: '123 Main St', bloodGroup: 'O+', deleted: false, joinDate: _dy+'-01-10' },
      { id: 's3', name: 'Sofia Williams', rollNo: 'G6B-001', classId: 'cls2', dob: '2012-11-30', gender: 'Female', parentId: 'p2', photo: null, address: '456 Oak Ave', bloodGroup: 'B+', deleted: false, joinDate: _dy+'-01-10' },
      { id: 's4', name: 'Liam Brown', rollNo: 'G5A-003', classId: 'cls1', dob: '2013-06-18', gender: 'Male', parentId: 'p3', photo: null, address: '789 Pine Rd', bloodGroup: 'AB+', deleted: false, joinDate: _dy+'-01-15' },
      { id: 's5', name: 'Olivia Brown', rollNo: 'G4C-001', classId: 'cls3', dob: '2014-09-05', gender: 'Female', parentId: 'p3', photo: null, address: '789 Pine Rd', bloodGroup: 'A-', deleted: false, joinDate: _dy+'-01-15' },
    ],
    grades: [
      { id: 'g1', studentId: 's1', classId: 'cls1', term: 'Semester 1', year: ''+_dy+'', subject: 'Mathematics', score: 92, maxScore: 100, grade: 'A', teacherComment: 'Excellent problem solver', date: _dy+'-03-15' },
      { id: 'g2', studentId: 's1', classId: 'cls1', term: 'Semester 1', year: ''+_dy+'', subject: 'English', score: 88, maxScore: 100, grade: 'B+', teacherComment: 'Great reader, improve writing', date: _dy+'-03-15' },
      { id: 'g3', studentId: 's1', classId: 'cls1', term: 'Semester 1', year: ''+_dy+'', subject: 'Science', score: 95, maxScore: 100, grade: 'A+', teacherComment: 'Outstanding curiosity', date: _dy+'-03-15' },
      { id: 'g4', studentId: 's1', classId: 'cls1', term: 'Semester 1', year: ''+_dy+'', subject: 'Social Studies', score: 78, maxScore: 100, grade: 'B', teacherComment: 'Good participation', date: _dy+'-03-15' },
      { id: 'g5', studentId: 's1', classId: 'cls1', term: 'Semester 1', year: ''+_dy+'', subject: 'Art', score: 85, maxScore: 100, grade: 'B+', teacherComment: 'Creative talent', date: _dy+'-03-15' },
      { id: 'g6', studentId: 's1', classId: 'cls1', term: 'Semester 1', year: ''+_dy+'', subject: 'Physical Education', score: 90, maxScore: 100, grade: 'A', teacherComment: 'Active and sporty', date: _dy+'-03-15' },
      { id: 'g7', studentId: 's2', classId: 'cls1', term: 'Semester 1', year: ''+_dy+'', subject: 'Mathematics', score: 75, maxScore: 100, grade: 'B', teacherComment: 'Needs practice on fractions', date: _dy+'-03-15' },
      { id: 'g8', studentId: 's2', classId: 'cls1', term: 'Semester 1', year: ''+_dy+'', subject: 'English', score: 80, maxScore: 100, grade: 'B+', teacherComment: 'Good storytelling skills', date: _dy+'-03-15' },
      { id: 'g9', studentId: 's3', classId: 'cls2', term: 'Semester 1', year: ''+_dy+'', subject: 'Mathematics', score: 98, maxScore: 100, grade: 'A+', teacherComment: 'Top of the class!', date: _dy+'-03-15' },
      { id: 'g10', studentId: 's3', classId: 'cls2', term: 'Semester 1', year: ''+_dy+'', subject: 'Science', score: 94, maxScore: 100, grade: 'A', teacherComment: 'Very analytical', date: _dy+'-03-15' },
      { id: 'g11', studentId: 's4', classId: 'cls1', term: 'Semester 1', year: ''+_dy+'', subject: 'Mathematics', score: 70, maxScore: 100, grade: 'B-', teacherComment: 'Shows improvement', date: _dy+'-03-15' },
      { id: 'g12', studentId: 's5', classId: 'cls3', term: 'Semester 1', year: ''+_dy+'', subject: 'Art', score: 96, maxScore: 100, grade: 'A+', teacherComment: 'Exceptional artistic talent', date: _dy+'-03-15' },
    ],
    attendance: [
      { id: 'a1', studentId: 's1', classId: 'cls1', date: _dy+'-04-01', status: 'present', markedBy: 'u2' },
      { id: 'a2', studentId: 's1', classId: 'cls1', date: _dy+'-04-02', status: 'present', markedBy: 'u2' },
      { id: 'a3', studentId: 's1', classId: 'cls1', date: _dy+'-04-03', status: 'absent', markedBy: 'u2' },
      { id: 'a4', studentId: 's1', classId: 'cls1', date: _dy+'-04-04', status: 'present', markedBy: 'u2' },
      { id: 'a5', studentId: 's1', classId: 'cls1', date: _dy+'-04-05', status: 'late', markedBy: 'u2' },
      { id: 'a6', studentId: 's2', classId: 'cls1', date: _dy+'-04-01', status: 'present', markedBy: 'u2' },
      { id: 'a7', studentId: 's2', classId: 'cls1', date: _dy+'-04-02', status: 'absent', markedBy: 'u2' },
      { id: 'a8', studentId: 's3', classId: 'cls2', date: _dy+'-04-01', status: 'present', markedBy: 'u3' },
      { id: 'a9', studentId: 's4', classId: 'cls1', date: _dy+'-04-01', status: 'present', markedBy: 'u2' },
      { id: 'a10', studentId: 's5', classId: 'cls3', date: _dy+'-04-01', status: 'present', markedBy: 'u4' },
    ],
    growth: [
      { id: 'gr1', studentId: 's1', date: _dy+'-01-10', height: 142, weight: 36, bmi: 17.9, recordedBy: 'u2' },
      { id: 'gr2', studentId: 's1', date: _dy+'-04-10', height: 143, weight: 37, bmi: 18.1, recordedBy: 'u2' },
      { id: 'gr3', studentId: 's2', date: _dy+'-01-10', height: 115, weight: 22, bmi: 16.6, recordedBy: 'u2' },
      { id: 'gr4', studentId: 's3', date: _dy+'-01-10', height: 155, weight: 45, bmi: 18.7, recordedBy: 'u3' },
      { id: 'gr5', studentId: 's4', date: _dy+'-01-15', height: 138, weight: 34, bmi: 17.8, recordedBy: 'u2' },
      { id: 'gr6', studentId: 's5', date: _dy+'-01-15', height: 126, weight: 27, bmi: 17.0, recordedBy: 'u4' },
    ],
    activities: [
      { id: 'act1', name: 'Football Team', classId: 'cls1', day: 'Monday', time: '3:00 PM', studentIds: ['s1', 's4'], instructor: 'Coach Wilson' },
      { id: 'act2', name: 'Art Club', classId: null, day: 'Wednesday', time: '3:30 PM', studentIds: ['s1', 's5'], instructor: 'Ms. Turner' },
      { id: 'act3', name: 'Math Olympiad', classId: 'cls2', day: 'Thursday', time: '2:00 PM', studentIds: ['s3'], instructor: 'Ms. Rodriguez' },
      { id: 'act4', name: 'Science Club', classId: null, day: 'Tuesday', time: '3:00 PM', studentIds: ['s1', 's3'], instructor: 'Mr. Carter' },
    ],
    syllabus: [
      {
        id: 'syl1', classId: 'cls1', term: 'Semester 1', year: ''+_dy+'', subject: 'Mathematics',
        topics: [
          { id: 't1', title: 'Fractions & Decimals', weeks: '1-3', status: 'completed', description: 'Understanding fractions, decimals and their operations' },
          { id: 't2', title: 'Geometry Basics', weeks: '4-6', status: 'completed', description: 'Shapes, angles, perimeter and area' },
          { id: 't3', title: 'Statistics & Data', weeks: '7-9', status: 'in_progress', description: 'Bar charts, pie charts and data interpretation' },
          { id: 't4', title: 'Algebra Introduction', weeks: '10-12', status: 'pending', description: 'Variables, expressions and simple equations' },
        ]
      },
      {
        id: 'syl2', classId: 'cls1', term: 'Semester 1', year: ''+_dy+'', subject: 'English',
        topics: [
          { id: 't5', title: 'Reading Comprehension', weeks: '1-4', status: 'completed', description: 'Passages, inference and vocabulary' },
          { id: 't6', title: 'Creative Writing', weeks: '5-8', status: 'in_progress', description: 'Story writing, descriptive writing and poetry' },
          { id: 't7', title: 'Grammar & Punctuation', weeks: '9-12', status: 'pending', description: 'Tenses, clauses and punctuation rules' },
        ]
      },
      {
        id: 'syl3', classId: 'cls2', term: 'Semester 1', year: ''+_dy+'', subject: 'Mathematics',
        topics: [
          { id: 't8', title: 'Ratios & Proportions', weeks: '1-3', status: 'completed', description: 'Ratios, rates and proportional reasoning' },
          { id: 't9', title: 'Linear Equations', weeks: '4-7', status: 'completed', description: 'Solving one and two-variable equations' },
          { id: 't10', title: 'Geometry & Measurement', weeks: '8-12', status: 'in_progress', description: 'Area, volume and coordinate geometry' },
        ]
      }
    ],
    leaves: [
      { id: 'l1', studentId: 's1', parentId: 'p1', fromDate: _dy+'-04-10', toDate: _dy+'-04-11', reason: 'Medical appointment - follow-up visit', status: 'approved', appliedOn: _dy+'-04-08', reviewedBy: 'u2', reviewNote: 'Approved. Get well soon!' },
      { id: 'l2', studentId: 's3', parentId: 'p2', fromDate: _dy+'-04-15', toDate: _dy+'-04-15', reason: 'Family wedding ceremony', status: 'pending', appliedOn: _dy+'-04-12', reviewedBy: null, reviewNote: '' },
      { id: 'l3', studentId: 's4', parentId: 'p3', fromDate: _dy+'-03-20', toDate: _dy+'-03-22', reason: 'Fever and cold', status: 'approved', appliedOn: _dy+'-03-19', reviewedBy: 'u2', reviewNote: 'Approved. Rest well.' },
    ],
    announcements: [
      { id: 'ann1', title: 'Parent-Teacher Meeting', body: 'The PTM is scheduled for April 20th, 2024 from 9 AM to 1 PM. All parents are requested to attend.', postedBy: 'u1', targetRole: 'all', date: _dy+'-04-05', classId: null },
      { id: 'ann2', title: 'Sports Day Registration Open', body: 'Annual Sports Day is on May 5th. Register your child by April 25th with their class teacher.', postedBy: 'u2', targetRole: 'parent', date: _dy+'-04-10', classId: 'cls1' },
      { id: 'ann3', title: 'Semester 2 Exam Schedule', body: 'Semester 2 examinations will begin from May 15th. Detailed schedule attached to your email.', postedBy: 'u1', targetRole: 'all', date: _dy+'-04-12', classId: null },
    ],
    messages: [
      { id: 'm1', from: 'p1', to: 'u2', studentId: 's1', text: 'Hello Mr. Carter, Emma was feeling unwell today. Will she miss the test tomorrow?', time: _dy+'-04-08 10:30', read: true, type: 'inapp' },
      { id: 'm2', from: 'u2', to: 'p1', studentId: 's1', text: 'Dear Mr. Johnson, no worries. Emma can take the makeup test on Friday. Please ensure she rests well.', time: _dy+'-04-08 11:15', read: true, type: 'inapp' },
    ],
    events: [
      { id: 'ev1', title: 'Annual Sports Day', description: 'All students participate in sports activities and friendly competitions', date: _dy+'-05-10', time: '9:00 AM', classId: null, type: 'sports', createdBy: 'u1', createdAt: _dy+'-04-20T10:00:00' },
      { id: 'ev2', title: 'Parent-Teacher Meeting', description: 'Discuss student progress and address parent queries', date: _dy+'-05-20', time: '9:00 AM', classId: null, type: 'meeting', createdBy: 'u1', createdAt: _dy+'-04-22T10:00:00' },
      { id: 'ev3', title: 'Mathematics Olympiad', description: 'Annual math competition – Grade 5-A students only', date: _dy+'-05-15', time: '10:00 AM', classId: 'cls1', type: 'academic', createdBy: 'u2', createdAt: _dy+'-04-25T10:00:00' },
      { id: 'ev4', title: 'Cultural Festival', description: 'Annual cultural event with performances and exhibitions by students', date: _dy+'-06-01', time: '3:00 PM', classId: null, type: 'cultural', createdBy: 'u1', createdAt: _dy+'-04-28T10:00:00' },
    ],
    activityLog: [],
    purchaseOrders: [],
    staffAttendance: [],
    staffLeaves: [],
    salaryPayments: [],
    salaryStructures: [],
    hrLetters: [],
    staffExitRecords: [],
    holidays: (function() {
      var y = new Date().getFullYear();
      return [
        // National Holidays
        { id: 'hol1',  name: 'New Year\'s Day',          date: y+'-01-01', type: 'National',      optional: false },
        { id: 'hol2',  name: 'Republic Day',              date: y+'-01-26', type: 'National',      optional: false },
        { id: 'hol3',  name: 'Independence Day',          date: y+'-08-15', type: 'National',      optional: false },
        { id: 'hol4',  name: 'Gandhi Jayanti',            date: y+'-10-02', type: 'National',      optional: false },
        // Maharashtrian Holidays
        { id: 'hol5',  name: 'Chhatrapati Shivaji Maharaj Jayanti', date: y+'-02-19', type: 'Maharashtra', optional: false },
        { id: 'hol6',  name: 'Gudi Padwa',               date: y+'-03-30', type: 'Maharashtra',   optional: false },
        { id: 'hol7',  name: 'Dr. Babasaheb Ambedkar Jayanti', date: y+'-04-14', type: 'Maharashtra', optional: false },
        { id: 'hol8',  name: 'Maharashtra Day',           date: y+'-05-01', type: 'Maharashtra',   optional: false },
        { id: 'hol9',  name: 'Dussehra (Vijayadashami)', date: y+'-10-02', type: 'Festival',      optional: false },
        // National Festivals
        { id: 'hol10', name: 'Holi',                     date: y+'-03-14', type: 'Festival',      optional: false },
        { id: 'hol11', name: 'Good Friday',              date: y+'-04-18', type: 'Festival',      optional: false },
        { id: 'hol12', name: 'Ram Navami',               date: y+'-04-06', type: 'Festival',      optional: false },
        { id: 'hol13', name: 'Eid ul-Fitr',              date: y+'-03-31', type: 'Festival',      optional: false },
        { id: 'hol14', name: 'Eid ul-Adha',              date: y+'-06-07', type: 'Festival',      optional: false },
        { id: 'hol15', name: 'Janmashtami',              date: y+'-08-16', type: 'Festival',      optional: false },
        { id: 'hol16', name: 'Ganesh Chaturthi',         date: y+'-08-27', type: 'Festival',      optional: false },
        { id: 'hol17', name: 'Navratri Begins',          date: y+'-09-22', type: 'Festival',      optional: true  },
        { id: 'hol18', name: 'Diwali (Lakshmi Pujan)',   date: y+'-10-20', type: 'Festival',      optional: false },
        { id: 'hol19', name: 'Diwali (Bali Pratipada)',  date: y+'-10-21', type: 'Festival',      optional: false },
        { id: 'hol20', name: 'Bhai Dooj',                date: y+'-10-23', type: 'Festival',      optional: true  },
        { id: 'hol21', name: 'Guru Nanak Jayanti',       date: y+'-11-05', type: 'Festival',      optional: false },
        { id: 'hol22', name: 'Christmas',                date: y+'-12-25', type: 'Festival',      optional: false },
        // School Specific
        { id: 'hol23', name: 'Summer Vacation Begins',   date: y+'-04-28', type: 'School',        optional: false },
        { id: 'hol24', name: 'School Reopens',           date: y+'-06-16', type: 'School',        optional: false },
        { id: 'hol25', name: 'Diwali Vacation',          date: y+'-10-19', type: 'School',        optional: false },
        { id: 'hol26', name: 'Winter Break Begins',      date: y+'-12-22', type: 'School',        optional: false },
      ];
    })(),
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
      { id: 'gal1', title: 'Sports Day '+_dy+'', description: 'Annual sports day activities with fun races and games', imageData: '', date: _dy+'-04-10', classId: 'cls1', studentIds: ['s1', 's4'], uploadedBy: 'u2', createdAt: _dy+'-04-10T09:00:00' },
      { id: 'gal2', title: 'Art Club Exhibition', description: 'Beautiful artwork made by our talented students', imageData: '', date: _dy+'-04-12', classId: null, studentIds: ['s1', 's5'], uploadedBy: 'u1', createdAt: _dy+'-04-12T14:00:00' },
      { id: 'gal3', title: 'Science Lab Day', description: 'Students explored chemistry and physics experiments', imageData: '', date: _dy+'-04-15', classId: 'cls2', studentIds: ['s3'], uploadedBy: 'u3', createdAt: _dy+'-04-15T11:00:00' },
      { id: 'gal4', title: 'School Field Trip', description: 'A fun day out visiting the nature museum', imageData: '', date: _dy+'-04-18', classId: 'cls1', studentIds: ['s1', 's2', 's4'], uploadedBy: 'u2', createdAt: _dy+'-04-18T08:30:00' }
    ],
    feeRecords: [
      { id: 'fee1', studentId: 's1', invoiceNo: 'INV-'+_dy+'-001', term: 'Term 1', amount: 15000, dueDate: _dy+'-02-15', paidDate: _dy+'-02-12', status: 'Paid', createdAt: _dy+'-01-20' },
      { id: 'fee2', studentId: 's1', invoiceNo: 'INV-'+_dy+'-002', term: 'Term 2', amount: 15000, dueDate: _dy+'-05-15', paidDate: null, status: 'Pending', createdAt: _dy+'-04-01' },
      { id: 'fee3', studentId: 's2', invoiceNo: 'INV-'+_dy+'-003', term: 'Term 1', amount: 15000, dueDate: _dy+'-02-15', paidDate: _dy+'-02-14', status: 'Paid', createdAt: _dy+'-01-20' },
      { id: 'fee4', studentId: 's2', invoiceNo: 'INV-'+_dy+'-004', term: 'Term 2', amount: 15000, dueDate: _dy+'-04-01', paidDate: null, status: 'Overdue', createdAt: _dy+'-03-01' },
      { id: 'fee5', studentId: 's3', invoiceNo: 'INV-'+_dy+'-005', term: 'Term 1', amount: 18000, dueDate: _dy+'-02-15', paidDate: _dy+'-02-10', status: 'Paid', createdAt: _dy+'-01-20' },
      { id: 'fee6', studentId: 's4', invoiceNo: 'INV-'+_dy+'-006', term: 'Term 1', amount: 15000, dueDate: _dy+'-02-20', paidDate: _dy+'-02-18', status: 'Paid', createdAt: _dy+'-01-25' },
      { id: 'fee7', studentId: 's5', invoiceNo: 'INV-'+_dy+'-007', term: 'Term 1', amount: 12000, dueDate: _dy+'-02-20', paidDate: null, status: 'Overdue', createdAt: _dy+'-01-25' }
    ],
    assignments: [
      { id: 'asgn1', classId: 'cls1', subject: 'Mathematics', title: 'Fractions Worksheet', description: 'Complete exercises 1-20 from Chapter 3 on fractions and decimals.', dueDate: _dy+'-04-25', status: 'Pending', createdAt: _dy+'-04-18' },
      { id: 'asgn2', classId: 'cls1', subject: 'English', title: 'Creative Writing Essay', description: 'Write a 300-word essay on "My Favourite Season". Use descriptive language.', dueDate: _dy+'-04-22', status: 'Submitted', createdAt: _dy+'-04-15' },
      { id: 'asgn3', classId: 'cls1', subject: 'Science', title: 'Plant Growth Observation', description: 'Observe and record your plant growth diary for 5 days with drawings.', dueDate: _dy+'-04-10', status: 'Overdue', createdAt: _dy+'-04-01' },
      { id: 'asgn4', classId: 'cls2', subject: 'Mathematics', title: 'Algebra Problem Set', description: 'Solve all problems from Chapter 7: Linear Equations exercises A and B.', dueDate: _dy+'-04-28', status: 'Pending', createdAt: _dy+'-04-20' },
      { id: 'asgn5', classId: 'cls2', subject: 'Science', title: 'Lab Report: Density', description: 'Write lab report for density experiment conducted in class. Include observations and conclusions.', dueDate: _dy+'-04-20', status: 'Submitted', createdAt: _dy+'-04-12' },
      { id: 'asgn6', classId: 'cls3', subject: 'Art', title: 'Landscape Painting', description: 'Create a landscape painting using watercolours. Theme: Nature in Monsoon.', dueDate: _dy+'-04-30', status: 'Pending', createdAt: _dy+'-04-22' }
    ],
    achievements: [
      { id: 'ach1', studentId: 's1', title: 'Mathematics Topper', description: 'Scored highest marks in the Mathematics unit test with 98/100.', date: _dy+'-03-20', category: 'Academic', icon: 'fa-trophy' },
      { id: 'ach2', studentId: 's1', title: 'Best Athlete', description: 'Won gold medal in 100m sprint at Annual Sports Day.', date: _dy+'-05-10', category: 'Sports', icon: 'fa-medal' },
      { id: 'ach3', studentId: 's1', title: 'Cultural Performance Star', description: 'Outstanding solo dance performance at the Annual Cultural Festival.', date: _dy+'-06-01', category: 'Cultural', icon: 'fa-star' },
      { id: 'ach4', studentId: 's2', title: 'Most Improved Student', description: 'Showed remarkable improvement in English and Mathematics this semester.', date: _dy+'-04-01', category: 'Academic', icon: 'fa-chart-line' },
      { id: 'ach5', studentId: 's3', title: 'Science Olympiad Winner', description: 'First place in the Inter-school Science Olympiad.', date: _dy+'-03-15', category: 'Academic', icon: 'fa-flask' },
      { id: 'ach6', studentId: 's4', title: 'Helpful Classmate Award', description: 'Recognised by teachers for always helping classmates and maintaining positive attitude.', date: _dy+'-04-05', category: 'Behaviour', icon: 'fa-heart' },
      { id: 'ach7', studentId: 's5', title: 'Art Exhibition Winner', description: 'First prize in school-level painting competition.', date: _dy+'-04-12', category: 'Cultural', icon: 'fa-palette' }
    ],
    exams: [
      { id: 'ex1', classId: 'cls1', examName: 'Mid-Term Examination', subject: 'Mathematics', date: '2026-07-10', time: '09:00 AM', duration: '2 hours', venue: 'Room 101' },
      { id: 'ex2', classId: 'cls1', examName: 'Mid-Term Examination', subject: 'English', date: '2026-07-11', time: '09:00 AM', duration: '2 hours', venue: 'Room 101' },
      { id: 'ex3', classId: 'cls1', examName: 'Mid-Term Examination', subject: 'Science', date: '2026-07-12', time: '09:00 AM', duration: '2 hours', venue: 'Room 102' },
      { id: 'ex4', classId: 'cls1', examName: 'Mid-Term Examination', subject: 'Social Studies', date: '2026-07-14', time: '09:00 AM', duration: '1.5 hours', venue: 'Room 101' },
      { id: 'ex5', classId: 'cls2', examName: 'Mid-Term Examination', subject: 'Mathematics', date: '2026-07-10', time: '11:00 AM', duration: '2 hours', venue: 'Room 201' },
      { id: 'ex6', classId: 'cls2', examName: 'Mid-Term Examination', subject: 'Science', date: '2026-07-12', time: '11:00 AM', duration: '2 hours', venue: 'Room 202' },
      { id: 'ex7', classId: 'cls3', examName: 'Mid-Term Examination', subject: 'Mathematics', date: '2026-07-11', time: '09:00 AM', duration: '1.5 hours', venue: 'Room 301' }
    ],
    healthRecords: [
      { id: 'hr1', studentId: 's1', type: 'vaccination', vaccine: 'MMR Booster', date: '2023-06-15', dueDate: null, status: 'Completed', notes: 'No adverse reactions.' },
      { id: 'hr2', studentId: 's1', type: 'vaccination', vaccine: 'Typhoid', date: _dy+'-01-10', dueDate: '2025-01-10', status: 'Completed', notes: '' },
      { id: 'hr3', studentId: 's1', type: 'vaccination', vaccine: 'Hepatitis A', date: null, dueDate: _dy+'-08-01', status: 'Due Soon', notes: '' },
      { id: 'hr4', studentId: 's1', type: 'allergy', name: 'Peanuts', severity: 'High', notes: 'Carries EpiPen. Inform canteen staff.' },
      { id: 'hr5', studentId: 's1', type: 'allergy', name: 'Dust', severity: 'Low', notes: 'Mild allergic rhinitis.' },
      { id: 'hr6', studentId: 's1', type: 'note', title: 'Asthma', details: 'Mild asthma. Has inhaler in school bag. Avoid excessive running in cold weather.', recordedOn: _dy+'-01-15' },
      { id: 'hr7', studentId: 's2', type: 'vaccination', vaccine: 'MMR Booster', date: '2023-06-15', dueDate: null, status: 'Completed', notes: '' },
      { id: 'hr8', studentId: 's3', type: 'vaccination', vaccine: 'Typhoid', date: '2023-12-01', dueDate: _dy+'-12-01', status: 'Completed', notes: '' },
      { id: 'hr9', studentId: 's3', type: 'allergy', name: 'Shellfish', severity: 'Medium', notes: 'Avoid all shellfish in school meals.' },
      { id: 'hr10', studentId: 's4', type: 'vaccination', vaccine: 'MMR Booster', date: '2023-08-20', dueDate: null, status: 'Completed', notes: '' },
      { id: 'hr11', studentId: 's5', type: 'vaccination', vaccine: 'Typhoid', date: _dy+'-02-14', dueDate: '2025-02-14', status: 'Completed', notes: '' }
    ],
    ptmSlots: [
      { id: 'ptm1', classId: 'cls1', date: '2026-07-20', time: '09:00 AM', teacherName: 'Mr. James Carter', duration: '15 min', status: 'Available', bookedBy: null },
      { id: 'ptm2', classId: 'cls1', date: '2026-07-20', time: '09:15 AM', teacherName: 'Mr. James Carter', duration: '15 min', status: 'Available', bookedBy: null },
      { id: 'ptm3', classId: 'cls1', date: '2026-07-20', time: '09:30 AM', teacherName: 'Mr. James Carter', duration: '15 min', status: 'Available', bookedBy: null },
      { id: 'ptm4', classId: 'cls1', date: '2026-07-20', time: '09:45 AM', teacherName: 'Mr. James Carter', duration: '15 min', status: 'Available', bookedBy: null },
      { id: 'ptm5', classId: 'cls2', date: '2026-07-21', time: '10:00 AM', teacherName: 'Ms. Emily Rodriguez', duration: '15 min', status: 'Available', bookedBy: null },
      { id: 'ptm6', classId: 'cls2', date: '2026-07-21', time: '10:15 AM', teacherName: 'Ms. Emily Rodriguez', duration: '15 min', status: 'Available', bookedBy: null },
      { id: 'ptm7', classId: 'cls3', date: '2026-07-22', time: '11:00 AM', teacherName: 'Mr. David Kim', duration: '15 min', status: 'Available', bookedBy: null }
    ],
    grievances: [],
    conductRecords: [
      { id: 'con1', studentId: 's1', date: _dy+'-04-02', type: 'Positive', category: 'Helpfulness', description: 'Helped a new classmate settle in on their first day. Very welcoming.', recordedBy: 'Mr. James Carter' },
      { id: 'con2', studentId: 's1', date: _dy+'-04-05', type: 'Positive', category: 'Academic', description: 'Voluntarily helped slower students during group assignment.', recordedBy: 'Mr. James Carter' },
      { id: 'con3', studentId: 's1', date: _dy+'-04-10', type: 'Negative', category: 'Discipline', description: 'Was talking during exam preparation period. Warning issued.', recordedBy: 'Mr. James Carter' },
      { id: 'con4', studentId: 's2', date: _dy+'-04-03', type: 'Positive', category: 'Sports', description: 'Showed great sportsmanship during football practice.', recordedBy: 'Mr. James Carter' },
      { id: 'con5', studentId: 's3', date: _dy+'-04-04', type: 'Positive', category: 'Academic', description: 'Submitted an exemplary science project ahead of deadline.', recordedBy: 'Ms. Emily Rodriguez' },
      { id: 'con6', studentId: 's4', date: _dy+'-04-06', type: 'Neutral', category: 'General', description: 'Attended counsellor session for time management skills.', recordedBy: 'Mr. James Carter' },
      { id: 'con7', studentId: 's5', date: _dy+'-04-08', type: 'Positive', category: 'Arts', description: 'Won first prize in school painting competition.', recordedBy: 'Ms. Emily Rodriguez' }
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
      if (!_data.feeRecords) { _data.feeRecords = JSON.parse(JSON.stringify(defaults.feeRecords)); mergeChanged = true; }
      if (!_data.assignments) { _data.assignments = JSON.parse(JSON.stringify(defaults.assignments)); mergeChanged = true; }
      if (!_data.achievements) { _data.achievements = JSON.parse(JSON.stringify(defaults.achievements)); mergeChanged = true; }
      if (!_data.exams) { _data.exams = JSON.parse(JSON.stringify(defaults.exams)); mergeChanged = true; }
      if (!_data.healthRecords) { _data.healthRecords = JSON.parse(JSON.stringify(defaults.healthRecords)); mergeChanged = true; }
      if (!_data.ptmSlots) { _data.ptmSlots = JSON.parse(JSON.stringify(defaults.ptmSlots)); mergeChanged = true; }
      if (!_data.grievances) { _data.grievances = []; mergeChanged = true; }
      if (!_data.conductRecords) { _data.conductRecords = JSON.parse(JSON.stringify(defaults.conductRecords)); mergeChanged = true; }
      if (!_data.mealMenus) { _data.mealMenus = {}; mergeChanged = true; }
      // Migrate old single-line address to 3-line format
      if (_data.meta && _data.meta.schoolAddress && _data.meta.schoolAddress.indexOf('\n') === -1 && _data.meta.schoolAddress.indexOf('Plot') !== -1) {
        _data.meta.schoolAddress = 'Matoshri Apartment, Plot Number 51,\nSector No 10, Bhosari Pradhikaran,\nPin:411026';
        mergeChanged = true;
      }
      save(_data);
      if (mergeChanged) saveToServer(_data, true); // quiet — session may not be restored yet
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

  // Salary payments are written through their own dedicated endpoint
  // (not the generic /api/db full-blob sync, which saveToServer() skips
  // for the 'accounting' role) so accounting-role changes actually reach
  // the server instead of only ever living in that browser's localStorage.
  function _salaryAuthHdr() {
    var t = localStorage.getItem('sk_session_token');
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }

  function addSalaryPayment(payment) {
    if (!_data.salaryPayments) _data.salaryPayments = [];
    _data.salaryPayments.unshift(payment);
    save(_data);
    return fetch('/api/salary-payments', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, _salaryAuthHdr()),
      body: JSON.stringify({ payment: payment })
    }).catch(function() {});
  }

  function deleteSalaryPayment(id) {
    if (!_data.salaryPayments) return;
    _data.salaryPayments = _data.salaryPayments.filter(function(p) { return p.id !== id; });
    save(_data);
    fetch('/api/salary-payments/' + id, { method: 'DELETE', headers: _salaryAuthHdr() }).catch(function() {});
  }

  function updateSalaryPayment(id, updates) {
    var p = (_data.salaryPayments || []).find(function(p) { return p.id === id; });
    if (!p) return Promise.resolve();
    Object.assign(p, updates);
    save(_data);
    return fetch('/api/salary-payments/' + id, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, _salaryAuthHdr()),
      body: JSON.stringify({ updates: updates })
    }).catch(function() {});
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
    // Always use fresh dynamic defaults for built-in holidays (hol1..hol26).
    // Only keep user-added custom holidays (IDs not in the default set) from stored data.
    var defaultIds = defaults.holidays.reduce(function(m,h){ m[h.id]=true; return m; }, {});
    var custom = (_data.holidays || []).filter(function(h){ return !defaultIds[h.id]; });
    return defaults.holidays.concat(custom).sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); });
  }
  function _holidayAuthHdr() {
    var t = localStorage.getItem('sk_session_token');
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }
  // Uses a dedicated targeted endpoint (like salary payments) rather than
  // DB.commit(), since saveToServer() skips the full-blob sync for the
  // admission/accounting roles — this way holidays persist for every role
  // that can see the tab, not just superadmin/subadmin.
  function addHoliday(h) {
    if (!_data.holidays) _data.holidays = [];
    _data.holidays.push(h);
    save(_data);
    return fetch('/api/holidays', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, _holidayAuthHdr()),
      body: JSON.stringify({ holiday: h })
    }).catch(function() {});
  }
  function deleteHoliday(id) {
    if (!_data.holidays) return;
    _data.holidays = _data.holidays.filter(function(h){ return h.id !== id; });
    save(_data);
    return fetch('/api/holidays/' + encodeURIComponent(id), { method: 'DELETE', headers: _holidayAuthHdr() }).catch(function() {});
  }

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

  // ---- Fee Records ----
  function getFeeRecords(studentId) {
    return (_data.feeRecords || []).filter(function(r) { return !studentId || r.studentId === studentId; }).sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
  }
  function addFeeRecord(record) { if(!_data.feeRecords)_data.feeRecords=[]; _data.feeRecords.unshift(record); commit(); }
  function updateFeeRecord(id, updates) { var r=(_data.feeRecords||[]).find(function(x){return x.id===id;}); if(r){Object.assign(r,updates);commit();} }

  // ---- Assignments ----
  function getAssignments(classId) {
    return (_data.assignments || []).filter(function(a) { return !classId || a.classId === classId; }).sort(function(a,b){return (a.dueDate||'').localeCompare(b.dueDate||'');});
  }
  function addAssignment(a) { if(!_data.assignments)_data.assignments=[]; _data.assignments.unshift(a); commit(); }
  function updateAssignment(id, updates) { var r=(_data.assignments||[]).find(function(x){return x.id===id;}); if(r){Object.assign(r,updates);commit();} }
  function deleteAssignment(id) { if(!_data.assignments)return; _data.assignments=_data.assignments.filter(function(x){return x.id!==id;}); commit(); }

  // ---- Achievements ----
  function getAchievements(studentId) {
    return (_data.achievements || []).filter(function(a) { return !studentId || a.studentId === studentId; }).sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
  }
  function addAchievement(a) { if(!_data.achievements)_data.achievements=[]; _data.achievements.unshift(a); commit(); }
  function updateAchievement(id, updates) { var r=(_data.achievements||[]).find(function(x){return x.id===id;}); if(r){Object.assign(r,updates);commit();} }
  function deleteAchievement(id) { if(!_data.achievements)return; _data.achievements=_data.achievements.filter(function(x){return x.id!==id;}); commit(); }

  // ---- Exams ----
  function getExams(classId) {
    return (_data.exams || []).filter(function(e) { return !classId || e.classId === classId; }).sort(function(a,b){return (a.date||'').localeCompare(b.date||'');});
  }
  function addExam(e) { if(!_data.exams)_data.exams=[]; _data.exams.unshift(e); commit(); }
  function updateExam(id, updates) { var r=(_data.exams||[]).find(function(x){return x.id===id;}); if(r){Object.assign(r,updates);commit();} }
  function deleteExam(id) { if(!_data.exams)return; _data.exams=_data.exams.filter(function(x){return x.id!==id;}); commit(); }

  // ---- Health Records ----
  function getHealthRecords(studentId) {
    return (_data.healthRecords || []).filter(function(r) { return !studentId || r.studentId === studentId; });
  }
  function addHealthRecord(r) { if(!_data.healthRecords)_data.healthRecords=[]; _data.healthRecords.unshift(r); commit(); }
  function updateHealthRecord(id, updates) { var r=(_data.healthRecords||[]).find(function(x){return x.id===id;}); if(r){Object.assign(r,updates);commit();} }
  function deleteHealthRecord(id) { if(!_data.healthRecords)return; _data.healthRecords=_data.healthRecords.filter(function(x){return x.id!==id;}); commit(); }

  // ---- PTM Slots ----
  function getPTMSlots(classId) {
    return (_data.ptmSlots || []).filter(function(s) { return !classId || s.classId === classId; }).sort(function(a,b){return ((a.date||'')+(a.time||'')).localeCompare((b.date||'')+(b.time||''));});
  }
  function bookPTMSlot(slotId, parentId) {
    var s=(_data.ptmSlots||[]).find(function(x){return x.id===slotId;});
    if(s&&s.status==='Available'){s.status='Booked';s.bookedBy=parentId;commit();}
  }
  function cancelPTMSlot(slotId) {
    var s=(_data.ptmSlots||[]).find(function(x){return x.id===slotId;});
    if(s){s.status='Available';s.bookedBy=null;commit();}
  }
  function addPTMSlot(s) { if(!_data.ptmSlots)_data.ptmSlots=[]; _data.ptmSlots.push(s); commit(); }
  function updatePTMSlot(id, updates) { var s=(_data.ptmSlots||[]).find(function(x){return x.id===id;}); if(s){Object.assign(s,updates);commit();} }
  function deletePTMSlot(id) { if(!_data.ptmSlots)return; _data.ptmSlots=_data.ptmSlots.filter(function(x){return x.id!==id;}); commit(); }

  // ---- Grievances ----
  function getGrievances(parentId) {
    return (_data.grievances || []).filter(function(g) { return !parentId || g.parentId === parentId; }).sort(function(a,b){return (b.submittedDate||'').localeCompare(a.submittedDate||'');});
  }
  function addGrievance(g) { if(!_data.grievances)_data.grievances=[]; _data.grievances.unshift(g); commit(); }
  function updateGrievance(id, updates) { var r=(_data.grievances||[]).find(function(x){return x.id===id;}); if(r){Object.assign(r,updates);commit();} }

  // ---- Conduct Records ----
  function getConductRecords(studentId) {
    return (_data.conductRecords || []).filter(function(r) { return !studentId || r.studentId === studentId; }).sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
  }
  function addConductRecord(r) { if(!_data.conductRecords)_data.conductRecords=[]; _data.conductRecords.unshift(r); commit(); }
  function updateConductRecord(id, updates) { var r=(_data.conductRecords||[]).find(function(x){return x.id===id;}); if(r){Object.assign(r,updates);commit();} }
  function deleteConductRecord(id) { if(!_data.conductRecords)return; _data.conductRecords=_data.conductRecords.filter(function(x){return x.id!==id;}); commit(); }

  // ---- Meal Menu ----
  function getMealMenu(week) {
    if(!_data.mealMenus) _data.mealMenus = {};
    return week ? (_data.mealMenus[week] || null) : _data.mealMenus;
  }
  function saveMealMenu(week, menuData) {
    if(!_data.mealMenus) _data.mealMenus = {};
    _data.mealMenus[week] = menuData;
    commit();
  }

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
    commit();
  }

  function getDocCustomization(studentId) {
    var d = get();
    if (!d.docCustomizations) d.docCustomizations = {};
    return d.docCustomizations[studentId] || {};
  }
  function saveDocCustomization(studentId, data) {
    var d = get();
    if (!d.docCustomizations) d.docCustomizations = {};
    d.docCustomizations[studentId] = Object.assign({}, d.docCustomizations[studentId] || {}, data);
    commit();
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
    updateUser,
    getStaffAttendance, addStaffAttendance, updateStaffAttendance, deleteStaffAttendance,
    getStaffLeaves, addStaffLeave, updateStaffLeave, deleteStaffLeave, getLeaveBalance,
    getSalaryPayments, addSalaryPayment, deleteSalaryPayment, updateSalaryPayment,
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
    getDocCustomization, saveDocCustomization,
    defaults,
    initFromServer, R2_BASE,
    getFeeRecords, addFeeRecord, updateFeeRecord,
    getAssignments, addAssignment, updateAssignment, deleteAssignment,
    getAchievements, addAchievement, updateAchievement, deleteAchievement,
    getExams, addExam, updateExam, deleteExam,
    getHealthRecords, addHealthRecord, updateHealthRecord, deleteHealthRecord,
    getPTMSlots, bookPTMSlot, cancelPTMSlot, addPTMSlot, updatePTMSlot, deletePTMSlot,
    getGrievances, addGrievance, updateGrievance,
    getConductRecords, addConductRecord, updateConductRecord, deleteConductRecord,
    getMealMenu, saveMealMenu
  };
})();

// ============================================================
// Fee Reconciliation — shared, pure helper
// ============================================================
// Computes a student's REAL fee position from the Fee Structure config and
// their actual recorded payments (the /api/payments D1 table, populated by
// Admissions' "Fee Collection" screen) — as opposed to the legacy, manually
// typed feeRecords "invoices". Used by both the parent portal's Fees tab
// and the superadmin's Fee Management tab so both surfaces agree.
//   classFees: feeConfig.classWiseFees[className] || {}
//   paymentsForStudent: array of payment .data objects (already JSON-parsed)
const FEE_INSTALLMENT_KEYS = [
  { key: 'installment1', label: '1st Installment (Registration + First)' },
  { key: 'installment2', label: '2nd Installment' },
  { key: 'installment3', label: '3rd Installment' },
  { key: 'educationKit', label: 'Education Kit' },
];

// Layers a per-student fee override on top of the class-wide defaults.
// computeFeeSummary() prefers classFees.totalFees as the headline "total
// due" figure over summing the installments (a class's Total Fees can be a
// deliberately independent lump sum) — but once a student has a per-field
// override, that class-level total no longer describes them, so recompute
// it as the sum of their (overridden) installments instead.
function applyFeeOverride(classDefaults, override) {
  var effective = Object.assign({}, classDefaults, override || {});
  if (override && Object.keys(override).length > 0) {
    effective.totalFees = FEE_INSTALLMENT_KEYS.reduce(function(s, i) { return s + (parseFloat(effective[i.key]) || 0); }, 0);
  }
  return effective;
}

function computeFeeSummary(classFees, paymentsForStudent) {
  classFees = classFees || {};
  paymentsForStudent = paymentsForStudent || [];

  var totalDue = parseFloat(classFees.totalFees) || 0;
  if (!totalDue) {
    totalDue = FEE_INSTALLMENT_KEYS.reduce(function(s, i) { return s + (parseFloat(classFees[i.key]) || 0); }, 0);
  }

  var totalPaid = paymentsForStudent.reduce(function(s, p) { return s + (parseFloat(p.total) || 0); }, 0);

  var paidByLabel = {};
  paymentsForStudent.forEach(function(p) {
    (p.feeItems || []).forEach(function(fi) {
      paidByLabel[fi.type] = (paidByLabel[fi.type] || 0) + (parseFloat(fi.amount) || 0);
    });
  });

  var installments = FEE_INSTALLMENT_KEYS.map(function(i) {
    var due = parseFloat(classFees[i.key]) || 0;
    var paid = paidByLabel[i.label] || 0;
    var status = due === 0 ? 'N/A' : (paid >= due ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Pending'));
    return { key: i.key, label: i.label, due: due, paid: paid, status: status };
  });

  return {
    totalDue: totalDue,
    totalPaid: totalPaid,
    balance: Math.max(0, totalDue - totalPaid),
    installments: installments,
    paidByLabel: paidByLabel,
    paymentCount: paymentsForStudent.length,
  };
}

function _feeAuthHdr() {
  var t = localStorage.getItem('sk_session_token');
  return t ? { 'Authorization': 'Bearer ' + t } : {};
}

// Shared "who actually owes what" panel — computed from real payments
// reconciled against the Fee Structure, same as the parent Fees tab. Used
// identically by Admission Admin's Fee Collection, Accounting's Fee
// Collection, and Super Admin's Fee Management, so every staff role that
// touches fees sees the same numbers, not three different ad-hoc views.
function renderOutstandingBalancesPanel(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:24px;color:#94a3b8"><i class="fas fa-spinner fa-spin"></i> Loading outstanding balances...</div>';

  Promise.all([
    fetch('/api/payments', { headers: _feeAuthHdr() }).then(function(r) { return r.ok ? r.json() : { items: [] }; }),
    fetch('/api/fee-config').then(function(r) { return r.ok ? r.json() : { config: {} }; }),
  ]).then(function(results) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var payItems = results[0].items || [];
    var feeConfig = results[1].config || {};
    var data = DB.get();
    var students = (data.students || []).filter(function(s) { return s.admissionId && !s.deleted; });

    // Cached per-student so the Edit modal can pre-fill without re-fetching.
    window._feeBalCache = window._feeBalCache || {};
    window._feeBalContainerId = containerId;

    var rows = students.map(function(s) {
      var cls = DB.getClass(s.classId);
      var className = cls ? cls.name : '';
      var classDefaults = (feeConfig.classWiseFees || {})[className] || {};
      var override = s.feeOverride || {};
      var effectiveFees = applyFeeOverride(classDefaults, override);
      var stuPayments = payItems.filter(function(p) { return p.admission_id === s.admissionId; }).map(function(p) {
        var d = {}; try { d = typeof p.data === 'string' ? JSON.parse(p.data) : (p.data || {}); } catch (e) {}
        return d;
      });
      var summary = computeFeeSummary(effectiveFees, stuPayments);
      var parent = (data.users || []).find(function(u) { return u.role === 'parent' && Array.isArray(u.childIds) && u.childIds.indexOf(s.id) !== -1; });
      window._feeBalCache[s.id] = { className: className, classDefaults: classDefaults, override: override, summary: summary, dueDates: feeConfig.dueDates || {}, parent: parent };
      return { student: s, className: className, summary: summary, hasOverride: Object.keys(override).length > 0 };
    }).filter(function(r) { return Object.keys((feeConfig.classWiseFees || {})[r.className] || {}).length > 0; })
      .sort(function(a, b) { return b.summary.balance - a.summary.balance; });

    var totalOutstanding = rows.reduce(function(s, r) { return s + r.summary.balance; }, 0);

    var bodyHtml = rows.length === 0
      ? '<div style="text-align:center;padding:24px;color:#94a3b8">No students with a configured fee structure yet.</div>'
      : '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
          '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">' +
            '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Student</th>' +
            '<th style="text-align:left;padding:10px 12px;color:#64748b;font-weight:700">Class</th>' +
            '<th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Total Due</th>' +
            '<th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Total Paid</th>' +
            '<th style="text-align:right;padding:10px 12px;color:#64748b;font-weight:700">Balance</th>' +
            '<th style="text-align:center;padding:10px 12px;color:#64748b;font-weight:700">Action</th>' +
          '</tr></thead>' +
          '<tbody>' + rows.map(function(r) {
            var bal = r.summary.balance;
            var notifyBtn = bal > 0
              ? '<button class="btn btn-sm btn-secondary" id="notify-btn-' + r.student.id + '" onclick="sendFeePendingNotification(\'' + r.student.id + '\',this)" title="Send pending-fees email"><i class="fas fa-bell"></i></button>'
              : '';
            var whatsappBtn = bal > 0
              ? '<button class="btn btn-sm btn-secondary" onclick="sendFeeWhatsApp(\'' + r.student.id + '\')" title="Send pending-fees WhatsApp message"><i class="fab fa-whatsapp" style="color:#25D366"></i></button>'
              : '';
            var editBtn = '<button class="btn btn-sm btn-secondary" onclick="openFeeOverrideModal(\'' + r.student.id + '\')" title="Customize this student\'s fee amounts"><i class="fas fa-edit"></i></button>';
            var overrideBadge = r.hasOverride ? ' <i class="fas fa-tag" style="color:#8b5cf6" title="Custom fee amounts applied"></i>' : '';
            return '<tr style="border-bottom:1px solid #f1f5f9">' +
              '<td style="padding:10px 12px;font-weight:600;color:#0F2050">' + escHtml(r.student.name) + overrideBadge + '</td>' +
              '<td style="padding:10px 12px;color:#64748b">' + escHtml(r.className) + '</td>' +
              '<td style="padding:10px 12px;text-align:right;color:#374151">₹' + r.summary.totalDue.toLocaleString('en-IN') + '</td>' +
              '<td style="padding:10px 12px;text-align:right;color:#10b981;font-weight:700">₹' + r.summary.totalPaid.toLocaleString('en-IN') + '</td>' +
              '<td style="padding:10px 12px;text-align:right;font-weight:800;color:' + (bal > 0 ? '#ef4444' : '#10b981') + '">₹' + bal.toLocaleString('en-IN') + '</td>' +
              '<td style="padding:10px 12px;text-align:center"><div style="display:flex;gap:4px;justify-content:center">' + editBtn + notifyBtn + whatsappBtn + '</div></td>' +
            '</tr>';
          }).join('') + '</tbody></table></div>';

    container.innerHTML = '<div class="card">' +
      '<div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
        '<div class="card-title"><i class="fas fa-balance-scale" style="color:#C4893A"></i> Outstanding Balances <span style="font-weight:400;color:#94a3b8;font-size:12px">(real payments, reconciled)</span></div>' +
        '<span style="font-weight:800;color:' + (totalOutstanding > 0 ? '#ef4444' : '#10b981') + ';font-size:14px">Total Outstanding: ₹' + totalOutstanding.toLocaleString('en-IN') + '</span>' +
      '</div>' +
      '<div style="padding:16px">' + bodyHtml + '</div>' +
    '</div>';
  }).catch(function() {
    var container = document.getElementById(containerId);
    if (container) container.innerHTML = '<div style="text-align:center;padding:24px;color:#94a3b8">Unable to load outstanding balances</div>';
  });
}

var FEE_OVERRIDE_FIELDS = [
  { key: 'installment1', label: '1st Installment (Registration + First)' },
  { key: 'installment2', label: '2nd Installment' },
  { key: 'installment3', label: '3rd Installment' },
  { key: 'educationKit', label: 'Education Kit' },
];

window.openFeeOverrideModal = function(studentId) {
  var cached = (window._feeBalCache || {})[studentId];
  if (!cached) return;
  var data = DB.get();
  var student = (data.students || []).find(function(s) { return s.id === studentId; });
  if (!student) return;
  var effective = Object.assign({}, cached.classDefaults, cached.override);

  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'fee-override-modal';
  overlay.innerHTML =
    '<div class="modal" style="max-width:440px;width:100%">' +
      '<div class="modal-header">' +
        '<h3 class="modal-title"><i class="fas fa-edit" style="color:#8b5cf6;margin-right:8px"></i>Customize Fees — ' + escHtml(student.name) + '</h3>' +
        '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'fee-override-modal\').remove()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="modal-body" style="padding:24px">' +
        '<p style="font-size:12px;color:#6B7A9D;margin:0 0 16px">Overrides the class-wide Fee Structure amount for this student only — useful for a discount, scholarship, or negotiated fee. These amounts are what the pending-fees notification will use.</p>' +
        '<div style="display:grid;gap:14px">' +
          FEE_OVERRIDE_FIELDS.map(function(f) {
            return '<div><label class="form-label" style="font-size:12px">' + f.label + '</label>' +
              '<input type="number" min="0" class="form-control fee-override-inp" data-key="' + f.key + '" value="' + (effective[f.key] || '') + '" placeholder="₹0"/></div>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="modal-footer" style="padding:16px 24px;display:flex;justify-content:space-between;gap:12px;border-top:1px solid #e2e8f0">' +
        '<button class="btn btn-secondary" onclick="saveFeeOverride(\'' + studentId + '\', true)"><i class="fas fa-undo" style="margin-right:6px"></i>Reset to Class Default</button>' +
        '<div style="display:flex;gap:12px">' +
          '<button class="btn btn-secondary" onclick="document.getElementById(\'fee-override-modal\').remove()">Cancel</button>' +
          '<button class="btn btn-primary" onclick="saveFeeOverride(\'' + studentId + '\', false)"><i class="fas fa-save" style="margin-right:6px"></i>Save</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
};

window.saveFeeOverride = function(studentId, reset) {
  var feeOverride = {};
  if (!reset) {
    document.querySelectorAll('.fee-override-inp').forEach(function(inp) {
      var v = parseFloat(inp.value);
      if (v >= 0) feeOverride[inp.getAttribute('data-key')] = v;
    });
  }
  fetch('/api/students/' + studentId + '/fee-override', {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': 'application/json' }, _feeAuthHdr()),
    body: JSON.stringify({ feeOverride: feeOverride }),
  })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.error) { showToast(res.error, 'error'); return; }
      var data = DB.get();
      var student = (data.students || []).find(function(s) { return s.id === studentId; });
      if (student) student.feeOverride = feeOverride;
      showToast(reset ? 'Reset to class default fees.' : 'Fee amounts updated for this student.', 'success');
      var modal = document.getElementById('fee-override-modal');
      if (modal) modal.remove();
      if (window._feeBalContainerId) renderOutstandingBalancesPanel(window._feeBalContainerId);
    })
    .catch(function() { showToast('Failed to save fee amounts', 'error'); });
};

window.sendFeePendingNotification = function(studentId, btnEl) {
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
  fetch('/api/fee-reminders/notify-student/' + studentId, { method: 'POST', headers: _feeAuthHdr() })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res.error) { showToast(res.error, 'error'); return; }
      if (res.sent) showToast('Fee reminder emailed to parent.', 'success');
      else if (res.noBalance) showToast('This student has no outstanding balance.', 'info');
      else if (res.noEmail) showToast('Parent has no email on file — cannot notify.', 'warning');
      else if (res.optedOut) showToast('Parent has opted out of fee reminders.', 'warning');
      else if (res.notConfigured) showToast('Email sending is not configured (Resend API key missing).', 'warning');
    })
    .catch(function() { showToast('Failed to send notification', 'error'); })
    .finally(function() {
      if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="fas fa-bell"></i>'; }
    });
};

window.sendFeeWhatsApp = function(studentId) {
  var cached = (window._feeBalCache || {})[studentId];
  var data = DB.get();
  var student = (data.students || []).find(function(s) { return s.id === studentId; });
  if (!cached || !student) return;
  var parent = cached.parent;
  if (!parent || !parent.phone) { showToast('Parent has no phone number on file.', 'warning'); return; }
  var phone = (parent.phone || '').replace(/\D/g, '').slice(-10);
  if (phone.length < 10) { showToast('Parent phone number is invalid.', 'warning'); return; }

  var pending = (cached.summary.installments || []).filter(function(i) { return i.status === 'Pending' || i.status === 'Partially Paid'; });
  if (pending.length === 0) { showToast('This student has no outstanding balance.', 'info'); return; }

  var meta = data.meta || {};
  var schoolName = meta.schoolName || 'SuperKids India Preschool';
  var lines = pending.map(function(i) {
    var due = cached.dueDates[i.key];
    return '- ' + i.label + ': ₹' + (i.due - i.paid).toLocaleString('en-IN') + (due ? ' (Due: ' + due + ')' : '');
  }).join('\n');
  var msg = 'Dear Parent,\n\nThis is a reminder that ' + student.name + ' has a pending fee balance at ' + schoolName + ':\n\n' +
    lines + '\n\nTotal Outstanding: ₹' + cached.summary.balance.toLocaleString('en-IN') +
    '\n\nPlease contact the school office to make payment.\n\nThank you!\n' + schoolName;
  window.open('https://wa.me/91' + phone + '?text=' + encodeURIComponent(msg), '_blank');
};

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

  function setCurrentUser(user) {
    _user = user;
    _impersonating = null;
  }

  return { login, logout, impersonate, current, isImpersonating, originalUser, hasPermission, canDelete, updateCurrent, setCurrentUser };
})();

// Global auth header helper — used by admin.js and other modules
function skAuthHeader() {
  var token = localStorage.getItem('sk_session_token');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

// Convert iPhone HEIC/HEIF images to JPEG before upload — most browsers
// can't display HEIC, so we transcode client-side. Loads the converter
// from CDN lazily, only when a HEIC file is actually selected.
// Never rejects: if conversion isn't possible the original file is
// returned and uploaded as-is (the server accepts image/heic).
function skPrepareImageFile(file) {
  var isHeic = /\.hei[cf]$/i.test(file.name || '') || /image\/hei[cf]/i.test(file.type || '');
  if (!isHeic) return Promise.resolve(file);

  function renamed(blob, type, ext) {
    var name = (file.name || 'photo').replace(/\.hei[cf]$/i, '') + ext;
    try { return new File([blob], name, { type: type }); }
    catch (e) { return blob; }
  }

  function convert() {
    return heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 }).then(function(out) {
      var blob = Array.isArray(out) ? out[0] : out;
      return renamed(blob, 'image/jpeg', '.jpg');
    });
  }

  function loadAndConvert() {
    if (typeof heic2any !== 'undefined') return convert();
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = function() { convert().then(resolve, reject); };
      s.onerror = function() { reject(new Error('Could not load HEIC converter')); };
      document.head.appendChild(s);
    });
  }

  // Sniff the real container first — iOS often hands over ".heic" files
  // that are actually JPEG already, which the HEIC decoder rejects with
  // "ERR_LIBHEIF format not supported"
  var sniff;
  try { sniff = file.slice(0, 16).arrayBuffer(); } catch (e) { sniff = Promise.reject(e); }
  return sniff.then(function(buf) {
    var b = new Uint8Array(buf);
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) {
      return renamed(file, 'image/jpeg', '.jpg'); // JPEG in disguise — just relabel
    }
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) {
      return renamed(file, 'image/png', '.png'); // PNG in disguise
    }
    return loadAndConvert();
  })
  .catch(function() {
    // Conversion failed or unsupported variant — upload the original;
    // the server accepts HEIC directly as a fallback
    return file;
  });
}
