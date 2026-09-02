import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'feedback.db');

const BCRYPT_ROUNDS = 10;
const STUDENT_ACCOUNT_COUNT = 1000;
const STUDENT_ID_RE = /^NGU\d{2}\d{4}S$/;
const STAFF_ID_RE = /^NGU\d{2}\d{4}F$/;

const STAFF_SEED = [
  { sequence: 1, name: 'Jordan Staff', jobTitle: 'Feedback Administrator' },
  { sequence: 2, name: 'Riley Morgan', jobTitle: 'Academic Advisor' },
  { sequence: 3, name: 'Casey Nguyen', jobTitle: 'Department Coordinator' },
  { sequence: 4, name: 'Avery Patel', jobTitle: 'Quality Officer' },
  { sequence: 5, name: 'Morgan Lee', jobTitle: 'Student Experience Lead' },
  { sequence: 6, name: 'Quinn Brooks', jobTitle: 'Survey Analyst' },
  { sequence: 7, name: 'Harper Singh', jobTitle: 'Program Director' },
  { sequence: 8, name: 'Cameron Walsh', jobTitle: 'Faculty Liaison' },
  { sequence: 9, name: 'Reese Okonkwo', jobTitle: 'Operations Manager' },
  { sequence: 10, name: 'Drew Alvarez', jobTitle: 'Reporting Specialist' },
];

let db;

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function exec(sql, params = []) {
  db.run(sql, params);
}

function run(sql, params = []) {
  exec(sql, params);
  saveDb();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function ensureColumn(table, column, definition) {
  const cols = all(`PRAGMA table_info(${table})`);
  if (!cols.some((col) => col.name === column)) {
    run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function mapSurvey(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    isActive: Boolean(row.is_active),
    departmentId: row.department_id || null,
    courseId: row.course_id || null,
    departmentName: row.department_name || null,
    courseName: row.course_name || null,
    courseCode: row.course_code || null,
    createdAt: row.created_at,
    openingDate: row.opening_date || null,
    closingDate: row.closing_date || null,
    staffOnly: Boolean(row.staff_only),
  };
}

function mapQuestion(row) {
  let options = [];
  if (row.options) {
    try {
      options = JSON.parse(row.options);
    } catch {
      options = [];
    }
  }

  return {
    id: row.id,
    surveyId: row.survey_id,
    questionText: row.question_text,
    questionType: row.question_type,
    options,
    sortOrder: row.sort_order,
  };
}

function surveySelectSql() {
  return `
    SELECT s.*, d.name AS department_name, c.name AS course_name, c.code AS course_code
    FROM surveys s
    LEFT JOIN departments d ON d.id = s.department_id
    LEFT JOIN courses c ON c.id = s.course_id
  `;
}

function averageRatingForSurveyIds(ids) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const row = get(
    `SELECT ROUND(AVG(a.answer_rating), 1) AS average_rating
     FROM answers a
     JOIN responses r ON r.id = a.response_id
     WHERE a.answer_rating IS NOT NULL AND r.survey_id IN (${placeholders})`,
    ids
  );
  return row?.average_rating || 0;
}

function responseCountForSurveyIds(ids) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const row = get(
    `SELECT COUNT(*) AS count FROM responses WHERE survey_id IN (${placeholders})`,
    ids
  );
  return row?.count || 0;
}

function getSurveyIdsForDepartment(departmentId) {
  return all(
    `SELECT id FROM surveys
     WHERE department_id = ?
        OR course_id IN (SELECT id FROM courses WHERE department_id = ?)`,
    [departmentId, departmentId]
  ).map((row) => row.id);
}

function getSurveyIdsForCourse(courseId) {
  return all('SELECT id FROM surveys WHERE course_id = ?', [courseId]).map((row) => row.id);
}

const PROGRAM_CATALOG = [
  {
    name: 'Information Systems',
    description: 'Information systems, technology, and digital innovation programs.',
    programs: [
      { code: 'BINF', name: 'Bachelor of Information' },
      { code: 'MINF', name: 'Master of Information' },
    ],
  },
  {
    name: 'Business',
    description: 'Business administration, management, and enterprise programs.',
    programs: [
      { code: 'BBUS', name: 'Bachelor of Business' },
      { code: 'MBUS', name: 'Master of Business' },
    ],
  },
  {
    name: 'Medicine',
    description: 'Medical sciences, health, and clinical practice programs.',
    programs: [
      { code: 'BMED', name: 'Bachelor of Medicine' },
      { code: 'MMED', name: 'Master of Medicine' },
    ],
  },
];

const DEPARTMENT_ORDER = ['Information Systems', 'Business', 'Medicine'];

function syncProgramCatalog() {
  const legacyDeptNames = {
    'School of Computing': 'Information Systems',
    Information: 'Information Systems',
    'School of Business': 'Business',
    'School of Engineering': 'Medicine',
  };

  const legacyProgramNames = {
    'Masters of Information': 'Master of Information',
    'Bachelors of Business': 'Bachelor of Business',
    'Masters of Business': 'Master of Business',
    'Bachelors of Medicine': 'Bachelor of Medicine',
    'Masters of Medicine': 'Master of Medicine',
  };

  for (const [oldName, newName] of Object.entries(legacyDeptNames)) {
    const legacy = get('SELECT id FROM departments WHERE name = ?', [oldName]);
    if (legacy) {
      run('UPDATE departments SET name = ? WHERE id = ?', [newName, legacy.id]);
    }
  }

  for (const [oldName, newName] of Object.entries(legacyProgramNames)) {
    const legacy = get('SELECT id FROM courses WHERE name = ?', [oldName]);
    if (legacy) {
      run('UPDATE courses SET name = ? WHERE id = ?', [newName, legacy.id]);
    }
  }

  for (const dept of PROGRAM_CATALOG) {
    let row = get('SELECT id FROM departments WHERE name = ?', [dept.name]);
    if (!row) {
      run('INSERT INTO departments (name, description) VALUES (?, ?)', [dept.name, dept.description]);
      row = get('SELECT id FROM departments WHERE name = ?', [dept.name]);
    } else {
      run('UPDATE departments SET description = ? WHERE id = ?', [dept.description, row.id]);
    }

    for (const program of dept.programs) {
      const existing = get(
        'SELECT id FROM courses WHERE department_id = ? AND name = ?',
        [row.id, program.name]
      );
      if (!existing) {
        run('INSERT INTO courses (department_id, code, name) VALUES (?, ?, ?)', [
          row.id,
          program.code,
          program.name,
        ]);
      } else {
        run('UPDATE courses SET code = ? WHERE id = ?', [program.code, existing.id]);
      }
    }
  }
}

function syncSurveyCatalog() {
  const departmentSurveys = [
    {
      title: 'Information Department Feedback',
      description: 'Department-wide feedback for Information Systems programs.',
      departmentName: 'Information Systems',
      legacyTitles: ['Bachelor of Information Feedback', 'Overall Information Systems'],
    },
    {
      title: 'Business Department Feedback',
      description: 'Department-wide feedback for Business programs.',
      departmentName: 'Business',
      legacyTitles: ['Master of Business Feedback', 'Overall Business'],
    },
    {
      title: 'Medicine Department Feedback',
      description: 'Department-wide feedback for Medicine programs.',
      departmentName: 'Medicine',
      legacyTitles: ['Overall Medicine'],
    },
  ];

  for (const item of departmentSurveys) {
    const department = get('SELECT id FROM departments WHERE name = ?', [item.departmentName]);
    if (!department) continue;

    let survey = get('SELECT id FROM surveys WHERE title = ?', [item.title]);
    if (!survey) {
      for (const legacyTitle of item.legacyTitles) {
        survey = get('SELECT id FROM surveys WHERE title = ?', [legacyTitle]);
        if (survey) break;
      }
    }

    if (!survey) continue;

    run(
      `UPDATE surveys
       SET title = ?, description = ?, department_id = ?, course_id = NULL, staff_only = 1
       WHERE id = ?`,
      [item.title, item.description, department.id, survey.id]
    );
  }

  run(
    `UPDATE surveys
     SET staff_only = 1
     WHERE title = 'University-wide Student Experience'`
  );
}

function seedData() {
  syncProgramCatalog();
  syncSurveyCatalog();

  const surveyCount = get('SELECT COUNT(*) AS count FROM surveys').count;
  if (surveyCount === 0) {
    const informationSystems = get(`SELECT id FROM departments WHERE name = 'Information Systems'`);
    const business = get(`SELECT id FROM departments WHERE name = 'Business'`);

    if (informationSystems) {
      run(
        `INSERT INTO surveys (title, description, is_active, department_id, course_id, staff_only, created_at)
         VALUES (?, ?, 1, ?, NULL, 1, datetime('now'))`,
        [
          'Information Department Feedback',
          'Department-wide feedback for Information Systems programs.',
          informationSystems.id,
        ]
      );
      run(
        `INSERT INTO questions (survey_id, question_text, question_type, options, sort_order)
         VALUES (1, 'Overall program rating', 'rating', NULL, 1),
                (1, 'What could be improved?', 'text', NULL, 2)`
      );
    }

    if (business) {
      run(
        `INSERT INTO surveys (title, description, is_active, department_id, course_id, staff_only, created_at)
         VALUES (?, ?, 1, ?, NULL, 1, datetime('now'))`,
        ['Business Department Feedback', 'Department-wide feedback for Business programs.', business.id]
      );
      run(
        `INSERT INTO questions (survey_id, question_text, question_type, options, sort_order)
         VALUES (2, 'Program rating', 'rating', NULL, 1),
                (2, 'Additional comments', 'text', NULL, 2)`
      );
    }

    const medicine = get(`SELECT id FROM departments WHERE name = 'Medicine'`);
    if (medicine) {
      run(
        `INSERT INTO surveys (title, description, is_active, department_id, course_id, staff_only, created_at)
         VALUES (?, ?, 1, ?, NULL, 1, datetime('now'))`,
        ['Medicine Department Feedback', 'Department-wide feedback for Medicine programs.', medicine.id]
      );
      run(
        `INSERT INTO questions (survey_id, question_text, question_type, options, sort_order)
         VALUES (3, 'Department support rating', 'rating', NULL, 1),
                (3, 'Suggestions for improvement', 'text', NULL, 2)`
      );
    }

    run(
      `INSERT INTO surveys (title, description, is_active, department_id, course_id, staff_only, created_at)
       VALUES (?, ?, 1, NULL, NULL, 1, datetime('now'))`,
      ['University-wide Student Experience', 'Overall NexGen University experience survey.']
    );
    run(
      `INSERT INTO questions (survey_id, question_text, question_type, options, sort_order)
       VALUES (4, 'Overall university rating', 'rating', NULL, 1),
              (4, 'Campus facilities rating', 'rating', NULL, 2),
              (4, 'General comments', 'text', NULL, 3)`
    );
  }
}

function padAccountNumber(value) {
  return String(value).padStart(4, '0');
}

export function yearCode(date = new Date()) {
  return String(date.getFullYear() % 100).padStart(2, '0');
}

export function formatStudentId(sequence, year = yearCode()) {
  return `NGU${year}${padAccountNumber(sequence)}S`;
}

export function formatStaffId(sequence, year = yearCode()) {
  return `NGU${year}${padAccountNumber(sequence)}F`;
}

function studentIdGlob(year = yearCode()) {
  return `NGU${year}[0-9][0-9][0-9][0-9]S`;
}

function staffIdGlob(year = yearCode()) {
  return `NGU${year}[0-9][0-9][0-9][0-9]F`;
}

function maxSequenceForYear(ids, year, suffix) {
  const pattern = new RegExp(`^NGU${year}(\\d{4})${suffix}$`);
  let max = 0;
  for (const id of ids) {
    const match = String(id).match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max;
}

function initialPasswordFor(loginId) {
  return `HI${loginId}`;
}

function normalizeLoginId(value) {
  return String(value || '').trim().toUpperCase();
}

function authError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function publicStudentAccount(row) {
  return {
    role: 'student',
    loginId: row.student_id,
    studentId: row.student_id,
    email: row.email,
    name: row.name || '',
    departmentId: row.department_id || null,
    courseId: row.course_id || null,
    mustChangePassword: Boolean(row.must_change_password),
  };
}

function publicStaffAccount(row) {
  return {
    role: 'staff',
    loginId: row.staff_id,
    staffId: row.staff_id,
    email: row.email,
    name: row.name || '',
    departmentId: row.department_id || null,
    jobTitle: row.job_title || '',
    mustChangePassword: Boolean(row.must_change_password),
  };
}

function existingAccountIds(column, table) {
  return new Set(
    all(`SELECT ${column} AS id FROM ${table} WHERE ${column} IS NOT NULL`).map((row) => row.id)
  );
}

function seedAuthAccounts() {
  const year = yearCode();
  const existingStudentIds = existingAccountIds('student_id', 'students');
  const currentYearStudentCount = [...existingStudentIds].filter((id) =>
    new RegExp(`^NGU${year}\\d{4}S$`).test(id)
  ).length;
  const missingStudents = Math.max(0, STUDENT_ACCOUNT_COUNT - currentYearStudentCount);
  if (missingStudents > 0) {
    console.log(
      `Seeding ${missingStudents} student accounts for year ${year} with bcrypt hashes. First run can take a few minutes...`
    );
  }

  const courses = all('SELECT id, department_id FROM courses ORDER BY id');
  let createdStudents = 0;

  for (let sequence = 1; sequence <= STUDENT_ACCOUNT_COUNT; sequence += 1) {
    const studentId = formatStudentId(sequence, year);
    if (existingStudentIds.has(studentId)) continue;

    const course = courses.length ? courses[(sequence - 1) % courses.length] : null;
    const padded = padAccountNumber(sequence);
    const email = `student${year}${padded}@nexgen.edu`;
    const passwordHash = bcrypt.hashSync(initialPasswordFor(studentId), BCRYPT_ROUNDS);
    const existingEmail = get('SELECT email, student_id FROM students WHERE email = ?', [email]);

    if (existingEmail?.student_id && existingEmail.student_id !== studentId) {
      exec(
        `INSERT INTO students (
           email, name, department_id, course_id, student_id, password_hash, must_change_password
         ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          `${studentId.toLowerCase()}@nexgen.edu`,
          `Student ${padded}`,
          course?.department_id || null,
          course?.id || null,
          studentId,
          passwordHash,
        ]
      );
    } else if (existingEmail) {
      exec(
        `UPDATE students
         SET student_id = ?, password_hash = ?, must_change_password = 1,
             name = COALESCE(NULLIF(name, ''), ?),
             department_id = COALESCE(department_id, ?),
             course_id = COALESCE(course_id, ?)
         WHERE email = ?`,
        [
          studentId,
          passwordHash,
          `Student ${padded}`,
          course?.department_id || null,
          course?.id || null,
          email,
        ]
      );
    } else {
      exec(
        `INSERT INTO students (
           email, name, department_id, course_id, student_id, password_hash, must_change_password
         ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          email,
          `Student ${padded}`,
          course?.department_id || null,
          course?.id || null,
          studentId,
          passwordHash,
        ]
      );
    }
    createdStudents += 1;
    existingStudentIds.add(studentId);

    if (createdStudents % 50 === 0) {
      saveDb();
      console.log(`Seeded student accounts: ${createdStudents} new this run`);
    }
  }

  const existingStaffIds = existingAccountIds('staff_id', 'staff');
  let createdStaff = 0;

  for (const member of STAFF_SEED) {
    const staffId = formatStaffId(member.sequence, year);
    if (existingStaffIds.has(staffId)) continue;

    const email = `staff${year}${padAccountNumber(member.sequence)}@nexgen.edu`;
    const emailTaken = get('SELECT staff_id FROM staff WHERE email = ?', [email]);
    const staffEmail =
      emailTaken && emailTaken.staff_id !== staffId ? `${staffId.toLowerCase()}@nexgen.edu` : email;

    exec(
      `INSERT INTO staff (
         staff_id, email, name, password_hash, must_change_password, job_title, created_at
       ) VALUES (?, ?, ?, ?, 1, ?, datetime('now'))`,
      [
        staffId,
        staffEmail,
        member.name,
        bcrypt.hashSync(initialPasswordFor(staffId), BCRYPT_ROUNDS),
        member.jobTitle,
      ]
    );
    createdStaff += 1;
    existingStaffIds.add(staffId);
  }

  saveDb();

  const counts = getAuthAccountCounts();
  if (createdStudents || createdStaff) {
    console.log(
      `Auth seed finished for ${year}: +${createdStudents} students, +${createdStaff} staff (now ${counts.studentAccounts} students, ${counts.staffAccounts} staff).`
    );
  } else {
    console.log(
      `Auth accounts already present for ${year}: ${counts.studentAccounts} students, ${counts.staffAccounts} staff.`
    );
  }
}

export function getAuthAccountCounts() {
  const year = yearCode();
  const students = get(
    `SELECT COUNT(*) AS count FROM students WHERE student_id GLOB ?`,
    [studentIdGlob(year)]
  );
  const staff = get(
    `SELECT COUNT(*) AS count FROM staff WHERE staff_id GLOB ?`,
    [staffIdGlob(year)]
  );
  const firstStudentId = formatStudentId(1, year);
  const lastStudentId = formatStudentId(STUDENT_ACCOUNT_COUNT, year);
  const firstStudent = get(`SELECT student_id FROM students WHERE student_id = ?`, [firstStudentId]);
  const lastStudent = get(`SELECT student_id FROM students WHERE student_id = ?`, [lastStudentId]);
  const studentIds = all(`SELECT student_id FROM students WHERE student_id IS NOT NULL`).map(
    (row) => row.student_id
  );
  const staffIds = all(`SELECT staff_id FROM staff WHERE staff_id IS NOT NULL`).map((row) => row.staff_id);

  return {
    year,
    studentAccounts: students?.count || 0,
    staffAccounts: staff?.count || 0,
    firstStudentId: firstStudent?.student_id || null,
    lastStudentId: lastStudent?.student_id || null,
    nextStudentSequence: maxSequenceForYear(studentIds, year, 'S') + 1,
    nextStaffSequence: maxSequenceForYear(staffIds, year, 'F') + 1,
    rangeComplete:
      (students?.count || 0) === STUDENT_ACCOUNT_COUNT && Boolean(firstStudent) && Boolean(lastStudent),
  };
}

export function authenticateUser(role, loginId, password) {
  const id = normalizeLoginId(loginId);
  const requestedRole = String(role || '').trim().toLowerCase();

  if (requestedRole !== 'student' && requestedRole !== 'staff') {
    throw authError('Choose Student or Staff login.', 400);
  }

  if (!password) {
    throw authError(
      requestedRole === 'staff' ? 'Invalid staff ID or password.' : 'Invalid student ID or password.',
      401
    );
  }

  if (requestedRole === 'student') {
    if (STAFF_ID_RE.test(id)) {
      throw authError('This is a staff ID. Use the Staff tab to sign in.', 400);
    }
    if (!STUDENT_ID_RE.test(id)) {
      throw authError(`Enter a valid student ID (for example ${formatStudentId(1)}).`, 400);
    }

    const row = get('SELECT * FROM students WHERE student_id = ?', [id]);
    if (!row?.password_hash || !bcrypt.compareSync(password, row.password_hash)) {
      throw authError('Invalid student ID or password.', 401);
    }
    return publicStudentAccount(row);
  }

  if (STUDENT_ID_RE.test(id)) {
    throw authError('This is a student ID. Use the Student tab to sign in.', 400);
  }
  if (!STAFF_ID_RE.test(id)) {
    throw authError(`Enter a valid staff ID (for example ${formatStaffId(1)}).`, 400);
  }

  const row = get('SELECT * FROM staff WHERE staff_id = ?', [id]);
  if (!row?.password_hash || !bcrypt.compareSync(password, row.password_hash)) {
    throw authError('Invalid staff ID or password.', 401);
  }
  return publicStaffAccount(row);
}

export function changeUserPassword(role, loginId, currentPassword, newPassword) {
  const requestedRole = String(role || '').trim().toLowerCase();
  const id = normalizeLoginId(loginId);

  if (requestedRole !== 'student' && requestedRole !== 'staff') {
    throw authError('Choose Student or Staff login.', 400);
  }
  if (!currentPassword || !newPassword) {
    throw authError('Current password and new password are required.', 400);
  }
  if (newPassword.length < 8) {
    throw authError('New password must be at least 8 characters.', 400);
  }
  if (newPassword === currentPassword) {
    throw authError('Choose a different password from your current password.', 400);
  }
  if (newPassword.toUpperCase() === initialPasswordFor(id)) {
    throw authError('Choose a different password from your initial password.', 400);
  }

  const account = authenticateUser(requestedRole, id, currentPassword);
  const passwordHash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);

  if (account.role === 'staff') {
    run('UPDATE staff SET password_hash = ?, must_change_password = 0 WHERE staff_id = ?', [
      passwordHash,
      id,
    ]);
    return publicStaffAccount(get('SELECT * FROM staff WHERE staff_id = ?', [id]));
  }

  run('UPDATE students SET password_hash = ?, must_change_password = 0 WHERE student_id = ?', [
    passwordHash,
    id,
  ]);
  return publicStudentAccount(get('SELECT * FROM students WHERE student_id = ?', [id]));
}

export async function initDb() {
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 0,
      department_id INTEGER,
      course_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL,
      options TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL,
      student_email TEXT NOT NULL,
      student_name TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      response_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      answer_text TEXT,
      answer_rating INTEGER,
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      email TEXT PRIMARY KEY,
      name TEXT,
      department_id INTEGER,
      course_id INTEGER,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      staff_id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      must_change_password INTEGER DEFAULT 1,
      department_id INTEGER,
      job_title TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  ensureColumn('surveys', 'department_id', 'INTEGER');
  ensureColumn('surveys', 'course_id', 'INTEGER');
  ensureColumn('surveys', 'closing_date', 'TEXT');
  ensureColumn('surveys', 'opening_date', 'TEXT');
  ensureColumn('surveys', 'staff_only', 'INTEGER DEFAULT 0');
  ensureColumn('responses', 'is_anonymous', 'INTEGER DEFAULT 0');
  ensureColumn('students', 'student_id', 'TEXT');
  ensureColumn('students', 'password_hash', 'TEXT');
  ensureColumn('students', 'must_change_password', 'INTEGER DEFAULT 1');

  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_id
    ON students(student_id)
    WHERE student_id IS NOT NULL
  `);

  saveDb();
  seedData();
  seedAuthAccounts();
}

export function listDepartments() {
  const departments = all('SELECT * FROM departments').map((row) => {
    const programs = listCourses(row.id);
    const surveyIds = getSurveyIdsForDepartment(row.id);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      courseCount: programs.length,
      programs,
      surveyCount: surveyIds.length,
      responseCount: responseCountForSurveyIds(surveyIds),
      averageRating: averageRatingForSurveyIds(surveyIds),
    };
  });

  return departments
    .filter((dept) => DEPARTMENT_ORDER.includes(dept.name))
    .sort((a, b) => DEPARTMENT_ORDER.indexOf(a.name) - DEPARTMENT_ORDER.indexOf(b.name));
}

export function getDepartment(id) {
  const row = get('SELECT * FROM departments WHERE id = ?', [id]);
  if (!row) return null;
  const surveyIds = getSurveyIdsForDepartment(id);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    courseCount: get('SELECT COUNT(*) AS count FROM courses WHERE department_id = ?', [id]).count,
    surveyCount: surveyIds.length,
    responseCount: responseCountForSurveyIds(surveyIds),
    averageRating: averageRatingForSurveyIds(surveyIds),
  };
}

export function getDepartmentSummary(id) {
  const department = getDepartment(id);
  if (!department) return null;

  const courses = listCourses(id);
  const surveys = all(`${surveySelectSql()} WHERE s.department_id = ? OR s.course_id IN (
    SELECT id FROM courses WHERE department_id = ?
  ) ORDER BY s.created_at DESC`, [id, id]).map(mapSurvey);

  const surveyReports = surveys.map((survey) => {
    const report = getSurveyReport(survey.id);
    return {
      surveyId: survey.id,
      title: survey.title,
      courseName: survey.courseName,
      totalResponses: report.totalResponses,
      averageRating: report.questionSummaries
        .filter((q) => q.summaryType === 'rating')
        .reduce((sum, q, _, arr) => sum + (q.averageRating || 0) / arr.length, 0) || 0,
    };
  });

  return { department, courses, surveys, surveyReports };
}

export function listCourses(departmentId = null) {
  const sql = departmentId
    ? `SELECT c.*, d.name AS department_name FROM courses c
       JOIN departments d ON d.id = c.department_id
       WHERE c.department_id = ?`
    : `SELECT c.*, d.name AS department_name FROM courses c
       JOIN departments d ON d.id = c.department_id`;
  const params = departmentId ? [departmentId] : [];

  const programNames = PROGRAM_CATALOG.flatMap((dept) => dept.programs.map((p) => p.name));

  return all(sql, params)
    .filter((row) => programNames.includes(row.name))
    .sort((a, b) => {
      const deptOrder =
        DEPARTMENT_ORDER.indexOf(a.department_name) - DEPARTMENT_ORDER.indexOf(b.department_name);
      if (deptOrder !== 0) return deptOrder;
      return a.name.localeCompare(b.name);
    })
    .map((row) => {
      const surveyIds = getSurveyIdsForCourse(row.id);
      return {
        id: row.id,
        departmentId: row.department_id,
        departmentName: row.department_name,
        code: row.code,
        name: row.name,
        surveyCount: surveyIds.length,
        responseCount: responseCountForSurveyIds(surveyIds),
        averageRating: averageRatingForSurveyIds(surveyIds),
      };
    });
}

export function getCourse(id) {
  const row = get(
    `SELECT c.*, d.name AS department_name FROM courses c
     JOIN departments d ON d.id = c.department_id WHERE c.id = ?`,
    [id]
  );
  if (!row) return null;
  const surveyIds = getSurveyIdsForCourse(id);
  return {
    id: row.id,
    departmentId: row.department_id,
    departmentName: row.department_name,
    code: row.code,
    name: row.name,
    surveyCount: surveyIds.length,
    responseCount: responseCountForSurveyIds(surveyIds),
    averageRating: averageRatingForSurveyIds(surveyIds),
  };
}

export function getCourseSummary(id) {
  const course = getCourse(id);
  if (!course) return null;

  const surveys = all(`${surveySelectSql()} WHERE s.course_id = ? ORDER BY s.created_at DESC`, [id]).map(mapSurvey);
  const surveyReports = surveys.map((survey) => getSurveyReport(survey.id));

  return { course, surveys, surveyReports };
}

export function listSurveys({ activeOnly = false, studentOnly = false } = {}) {
  const conditions = [];
  if (activeOnly) conditions.push('s.is_active = 1');
  if (studentOnly) conditions.push('(s.staff_only IS NULL OR s.staff_only = 0)');
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `${surveySelectSql()} ${whereClause} ORDER BY s.created_at DESC`;
  return all(sql).map(mapSurvey).map((survey) => ({
    ...survey,
    responseCount: responseCountForSurveyIds([survey.id]),
    averageRating: averageRatingForSurveyIds([survey.id]),
  }));
}

export function getSurvey(id) {
  const survey = get(`${surveySelectSql()} WHERE s.id = ?`, [id]);
  if (!survey) return null;
  const questions = all(
    'SELECT * FROM questions WHERE survey_id = ? ORDER BY sort_order, id',
    [id]
  ).map(mapQuestion);
  return { ...mapSurvey(survey), questions };
}

export function createSurvey({
  title,
  description,
  isActive = false,
  departmentId = null,
  courseId = null,
  openingDate = null,
  closingDate = null,
  staffOnly = false,
}) {
  run(
    `INSERT INTO surveys (title, description, is_active, department_id, course_id, opening_date, closing_date, staff_only, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      title,
      description || '',
      isActive ? 1 : 0,
      departmentId,
      courseId,
      openingDate || null,
      closingDate || null,
      staffOnly ? 1 : 0,
    ]
  );
  const inserted = get('SELECT id FROM surveys ORDER BY id DESC LIMIT 1');
  if (!inserted?.id) return null;
  return getSurvey(inserted.id);
}

export function updateSurvey(id, { title, description, isActive, departmentId, courseId, openingDate, closingDate, staffOnly }) {
  const survey = get('SELECT * FROM surveys WHERE id = ?', [id]);
  if (!survey) return null;

  run(
    `UPDATE surveys SET title = ?, description = ?, is_active = ?, department_id = ?, course_id = ?, opening_date = ?, closing_date = ?, staff_only = ? WHERE id = ?`,
    [
      title ?? survey.title,
      description ?? survey.description,
      isActive === undefined ? survey.is_active : isActive ? 1 : 0,
      departmentId === undefined ? survey.department_id : departmentId,
      courseId === undefined ? survey.course_id : courseId,
      openingDate === undefined ? survey.opening_date : openingDate || null,
      closingDate === undefined ? survey.closing_date : closingDate || null,
      staffOnly === undefined ? survey.staff_only : staffOnly ? 1 : 0,
      id,
    ]
  );
  return getSurvey(id);
}

export function deleteSurvey(id) {
  run('DELETE FROM answers WHERE response_id IN (SELECT id FROM responses WHERE survey_id = ?)', [id]);
  run('DELETE FROM responses WHERE survey_id = ?', [id]);
  run('DELETE FROM questions WHERE survey_id = ?', [id]);
  run('DELETE FROM surveys WHERE id = ?', [id]);
}

export function addQuestion(surveyId, { questionText, questionType, options = [] }) {
  const orderRow = get(
    'SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM questions WHERE survey_id = ?',
    [surveyId]
  );
  run(
    `INSERT INTO questions (survey_id, question_text, question_type, options, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [surveyId, questionText, questionType, questionType === 'choice' ? JSON.stringify(options) : null, orderRow.max_order + 1]
  );
  return mapQuestion(get('SELECT * FROM questions ORDER BY id DESC LIMIT 1'));
}

export function deleteQuestion(questionId) {
  run('DELETE FROM answers WHERE question_id = ?', [questionId]);
  run('DELETE FROM questions WHERE id = ?', [questionId]);
}

function mapResponder(row) {
  if (row.is_anonymous) {
    return { studentName: 'Anonymous student', studentEmail: '', isAnonymous: true };
  }
  return { studentName: row.student_name, studentEmail: row.student_email, isAnonymous: false };
}

export function submitResponse(surveyId, { studentEmail, studentName, answers, isAnonymous = false }) {
  const survey = get('SELECT * FROM surveys WHERE id = ?', [surveyId]);
  if (!survey) {
    const error = new Error('Survey not found.');
    error.status = 404;
    throw error;
  }
  if (survey.staff_only) {
    const error = new Error('This survey is not available to students.');
    error.status = 403;
    throw error;
  }

  const existing = get(
    'SELECT id FROM responses WHERE survey_id = ? AND student_email = ?',
    [surveyId, studentEmail]
  );
  if (existing) {
    const error = new Error('You have already submitted this survey.');
    error.status = 409;
    throw error;
  }

  run(
    `INSERT INTO responses (survey_id, student_email, student_name, is_anonymous, submitted_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [surveyId, studentEmail, isAnonymous ? '' : studentName || '', isAnonymous ? 1 : 0]
  );

  const response = get('SELECT * FROM responses ORDER BY id DESC LIMIT 1');
  for (const answer of answers) {
    run(
      `INSERT INTO answers (response_id, question_id, answer_text, answer_rating) VALUES (?, ?, ?, ?)`,
      [response.id, answer.questionId, answer.answerText || null, answer.answerRating ?? null]
    );
  }
  return { id: response.id, submittedAt: response.submitted_at };
}

export function getStudentResponses(studentEmail) {
  const rows = all(
    `SELECT r.id, r.survey_id, r.submitted_at, s.title AS survey_title
     FROM responses r JOIN surveys s ON s.id = r.survey_id
     WHERE r.student_email = ? ORDER BY r.submitted_at DESC`,
    [studentEmail]
  );

  return rows.map((row) => ({
    id: row.id,
    surveyId: row.survey_id,
    surveyTitle: row.survey_title,
    submittedAt: row.submitted_at,
    answers: all(
      `SELECT a.*, q.question_text, q.question_type FROM answers a
       JOIN questions q ON q.id = a.question_id WHERE a.response_id = ?`,
      [row.id]
    ).map((answer) => ({
      questionText: answer.question_text,
      questionType: answer.question_type,
      answerText: answer.answer_text,
      answerRating: answer.answer_rating,
    })),
  }));
}

export function getStudentProfile(email) {
  const row = get(
    `SELECT s.*, d.name AS department_name, c.name AS course_name, c.code AS course_code
     FROM students s
     LEFT JOIN departments d ON d.id = s.department_id
     LEFT JOIN courses c ON c.id = s.course_id
     WHERE s.email = ?`,
    [email]
  );

  if (!row) {
    return {
      email,
      name: '',
      studentId: null,
      departmentId: null,
      courseId: null,
      departmentName: null,
      courseName: null,
      courseCode: null,
    };
  }

  return {
    email: row.email,
    name: row.name || '',
    studentId: row.student_id || null,
    departmentId: row.department_id || null,
    courseId: row.course_id || null,
    departmentName: row.department_name || null,
    courseName: row.course_name || null,
    courseCode: row.course_code || null,
  };
}

export function saveStudentProfile(email, { name, departmentId = null, courseId = null }) {
  let resolvedDepartmentId = departmentId || null;
  if (courseId && !resolvedDepartmentId) {
    const course = get('SELECT department_id FROM courses WHERE id = ?', [courseId]);
    resolvedDepartmentId = course?.department_id || null;
  }

  const existing = get('SELECT email FROM students WHERE email = ?', [email]);
  if (existing) {
    run('UPDATE students SET name = ?, department_id = ?, course_id = ? WHERE email = ?', [
      name || '',
      resolvedDepartmentId,
      courseId || null,
      email,
    ]);
  } else {
    run('INSERT INTO students (email, name, department_id, course_id) VALUES (?, ?, ?, ?)', [
      email,
      name || '',
      resolvedDepartmentId,
      courseId || null,
    ]);
  }

  return getStudentProfile(email);
}

function surveyTargetsStudent(survey, profile) {
  if (!survey.departmentId && !survey.courseId) return true;
  if (survey.courseId) return profile.courseId === survey.courseId;
  return profile.departmentId === survey.departmentId;
}

export function getStudentSurveyStatus(studentEmail) {
  const now = new Date();
  const profile = getStudentProfile(studentEmail);
  const surveys = listSurveys({ activeOnly: true, studentOnly: true }).filter((survey) => {
    if (survey.openingDate && new Date(survey.openingDate) > now) return false;
    if (survey.closingDate && new Date(survey.closingDate) < now) return false;
    return surveyTargetsStudent(survey, profile);
  });
  const completedIds = new Set(
    all('SELECT survey_id FROM responses WHERE student_email = ?', [studentEmail]).map((r) => r.survey_id)
  );
  return surveys.map((survey) => ({
    ...survey,
    status: completedIds.has(survey.id) ? 'completed' : 'pending',
  }));
}

export function listAllResponses() {
  return all(`
    SELECT r.*, s.title AS survey_title,
           s.department_id AS survey_department_id,
           s.course_id AS survey_course_id,
           sd.name AS survey_department_name,
           sc.name AS survey_course_name,
           sc.code AS survey_course_code,
           st.department_id AS student_department_id,
           st.course_id AS student_course_id,
           stc.name AS student_course_name,
           stc.code AS student_course_code
    FROM responses r
    JOIN surveys s ON s.id = r.survey_id
    LEFT JOIN departments sd ON sd.id = s.department_id
    LEFT JOIN courses sc ON sc.id = s.course_id
    LEFT JOIN students st ON st.email = r.student_email
    LEFT JOIN courses stc ON stc.id = st.course_id
    ORDER BY r.submitted_at DESC
  `).map((row) => ({
    id: row.id,
    surveyId: row.survey_id,
    surveyTitle: row.survey_title,
    ...mapResponder(row),
    submittedAt: row.submitted_at,
    departmentName: row.survey_department_name,
    courseName: row.survey_course_name,
    courseCode: row.survey_course_code,
    departmentId: row.survey_department_id || null,
    courseId: row.survey_course_id || null,
    studentDepartmentId: row.student_department_id || null,
    studentCourseId: row.student_course_id || null,
    studentCourseName: row.student_course_name || null,
    studentCourseCode: row.student_course_code || null,
    answers: all(
      `SELECT a.*, q.question_text, q.question_type FROM answers a
       JOIN questions q ON q.id = a.question_id WHERE a.response_id = ?`,
      [row.id]
    ).map((answer) => ({
      questionText: answer.question_text,
      questionType: answer.question_type,
      answerText: answer.answer_text,
      answerRating: answer.answer_rating,
    })),
  }));
}

function getResponseTrendLast7Days() {
  const rows = all(`
    SELECT date(submitted_at) AS day, COUNT(*) AS count
    FROM responses
    WHERE date(submitted_at) >= date('now', '-6 days')
    GROUP BY date(submitted_at)
    ORDER BY day ASC
  `);

  const countByDay = Object.fromEntries(rows.map((row) => [row.day, row.count]));
  const trend = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = get(`SELECT date('now', '-${offset} days') AS day`).day;
    trend.push({
      date: day,
      count: countByDay[day] || 0,
    });
  }

  return trend;
}

export function getDashboardStats() {
  const totals = get(`
    SELECT
      (SELECT COUNT(*) FROM departments) AS total_departments,
      (SELECT COUNT(*) FROM courses) AS total_courses,
      (SELECT COUNT(*) FROM surveys) AS total_surveys,
      (SELECT COUNT(*) FROM surveys WHERE is_active = 1) AS active_surveys,
      (SELECT COUNT(*) FROM responses) AS total_responses,
      (SELECT COUNT(DISTINCT student_email) FROM responses) AS unique_students
  `);

  const avgRating = get(`
    SELECT ROUND(AVG(answer_rating), 1) AS average_rating FROM answers WHERE answer_rating IS NOT NULL
  `);

  return {
    totalDepartments: totals.total_departments,
    totalCourses: totals.total_courses,
    totalSurveys: totals.total_surveys,
    activeSurveys: totals.active_surveys,
    totalResponses: totals.total_responses,
    uniqueStudents: totals.unique_students,
    averageRating: avgRating?.average_rating || 0,
    responseTrend: getResponseTrendLast7Days(),
    departments: listDepartments().slice(0, 5),
    recentResponses: listAllResponses().slice(0, 5),
    surveySummaries: all(`
      SELECT s.id, s.title, s.is_active, COUNT(r.id) AS response_count,
             ROUND(AVG(a.answer_rating), 1) AS average_rating
      FROM surveys s
      LEFT JOIN responses r ON r.survey_id = s.id
      LEFT JOIN answers a ON a.response_id = r.id AND a.answer_rating IS NOT NULL
      GROUP BY s.id ORDER BY s.created_at DESC
    `).map((row) => ({
      id: row.id,
      title: row.title,
      isActive: Boolean(row.is_active),
      responseCount: row.response_count,
      averageRating: row.average_rating || 0,
    })),
  };
}

export function getUniversityReport() {
  const stats = getDashboardStats();
  const departments = listDepartments();
  const courses = listCourses();
  const surveys = listSurveys()
    .map((survey) => getSurveyReport(survey.id))
    .filter(Boolean);

  return {
    ...stats,
    departments,
    courses,
    surveys,
  };
}

export function getSurveyReport(surveyId) {
  const survey = getSurvey(surveyId);
  if (!survey) return null;

  const responses = all('SELECT * FROM responses WHERE survey_id = ? ORDER BY submitted_at DESC', [surveyId]);

  const questionSummaries = survey.questions.map((question) => {
    const answers = all(
      `SELECT a.* FROM answers a JOIN responses r ON r.id = a.response_id
       WHERE a.question_id = ? AND r.survey_id = ?`,
      [question.id, surveyId]
    );

    if (question.questionType === 'rating') {
      const ratings = answers.map((a) => a.answer_rating).filter((v) => v != null);
      const average = ratings.length
        ? Math.round((ratings.reduce((sum, n) => sum + n, 0) / ratings.length) * 10) / 10
        : 0;
      return { ...question, summaryType: 'rating', responseCount: ratings.length, averageRating: average };
    }

    if (question.questionType === 'choice') {
      const counts = {};
      for (const option of question.options) counts[option] = 0;
      for (const answer of answers) {
        if (answer.answer_text && counts[answer.answer_text] !== undefined) counts[answer.answer_text] += 1;
      }
      return { ...question, summaryType: 'choice', responseCount: answers.length, choiceCounts: counts };
    }

    return {
      ...question,
      summaryType: 'text',
      responseCount: answers.length,
      textResponses: answers.filter((a) => a.answer_text).map((a) => ({ text: a.answer_text, responseId: a.response_id })),
    };
  });

  return {
    survey,
    totalResponses: responses.length,
    questionSummaries,
    recentSubmissions: responses.slice(0, 10).map((row) => ({
      id: row.id,
      ...mapResponder(row),
      submittedAt: row.submitted_at,
    })),
  };
}

export function buildExportRows(type, id = null) {
  if (type === 'university') {
    const report = getUniversityReport();
    const rows = [['Report', 'NexGen University Overall Feedback']];
    rows.push(['Total responses', report.totalResponses]);
    rows.push(['Average rating', report.averageRating]);
    rows.push([]);
    rows.push(['Department', 'Responses', 'Average rating']);
    report.departments.forEach((d) => rows.push([d.name, d.responseCount, d.averageRating]));
    return rows;
  }

  if (type === 'department') {
    const summary = getDepartmentSummary(id);
    if (!summary) return [];
    const rows = [['Department', summary.department.name], ['Responses', summary.department.responseCount], []];
    rows.push(['Survey', 'Course', 'Responses', 'Average rating']);
    summary.surveyReports.forEach((s) => rows.push([s.title, s.courseName || 'Department-wide', s.totalResponses, s.averageRating]));
    return rows;
  }

  if (type === 'course') {
    const summary = getCourseSummary(id);
    if (!summary) return [];
    const rows = [['Course', `${summary.course.code} - ${summary.course.name}`], []];
    summary.surveyReports.forEach((report) => {
      rows.push(['Survey', report.survey.title]);
      report.questionSummaries.forEach((q) => {
        if (q.summaryType === 'rating') rows.push([q.questionText, q.averageRating]);
        if (q.summaryType === 'text') q.textResponses.forEach((t) => rows.push([q.questionText, t.text]));
      });
      rows.push([]);
    });
    return rows;
  }

  if (type === 'survey') {
    const report = getSurveyReport(id);
    if (!report) return [];
    const rows = [['Survey', report.survey.title], []];
    report.recentSubmissions.forEach((s) => {
      rows.push(['Student', s.studentName || s.studentEmail, 'Submitted', s.submittedAt]);
    });
    return rows;
  }

  if (type === 'responses') {
    const rows = [['Student', 'Email', 'Survey', 'Department', 'Course', 'Submitted']];
    listAllResponses().forEach((r) => {
      rows.push([
        r.isAnonymous ? 'Anonymous student' : (r.studentName || 'Student'),
        r.isAnonymous ? '' : (r.studentEmail || ''),
        r.surveyTitle,
        r.departmentName || '',
        r.courseCode ? `${r.courseCode} ${r.courseName}` : '',
        r.submittedAt,
      ]);
    });
    return rows;
  }

  return [];
}
