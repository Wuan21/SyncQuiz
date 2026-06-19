require('dotenv').config();

const { connectDB, disconnectDB, getDB } = require('../src/config/database');

async function seed() {
  await connectDB();
  const db = getDB();

  console.log('\n🌱 Starting database seed...\n');

  // ============================================================
  // 1. CATEGORIES
  // ============================================================
  const categoriesCol = db.collection('categories');
  await categoriesCol.drop().catch(() => {});

  const categories = await categoriesCol.insertMany([
    { name: 'Mathematics',       slug: 'mathematics',       createdAt: new Date() },
    { name: 'Science',           slug: 'science',           createdAt: new Date() },
    { name: 'History',           slug: 'history',           createdAt: new Date() },
    { name: 'Geography',         slug: 'geography',         createdAt: new Date() },
    { name: 'Literature',        slug: 'literature',        createdAt: new Date() },
    { name: 'English',           slug: 'english',           createdAt: new Date() },
    { name: 'Technology',        slug: 'technology',        createdAt: new Date() },
    { name: 'Arts',              slug: 'arts',              createdAt: new Date() },
    { name: 'Sports',            slug: 'sports',            createdAt: new Date() },
    { name: 'General Knowledge', slug: 'general-knowledge', createdAt: new Date() },
  ]);
  console.log(`✅ categories     — ${Object.keys(categories.insertedIds).length} docs`);

  const catIds = categories.insertedIds;

  // ============================================================
  // 2. USERS
  // ============================================================
  const usersCol = db.collection('users');
  await usersCol.drop().catch(() => {});

  // password_hash = bcrypt hash of "Password@123" (pre-hashed for seed only)
  const HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

  const users = await usersCol.insertMany([
    {
      email:        'admin@syncquiz.com',
      passwordHash: HASH,
      fullName:     'System Admin',
      avatarUrl:    null,
      role:         'admin',
      isActive:     true,
      createdAt:    new Date(),
      updatedAt:    new Date(),
      deletedAt:    null,
    },
    {
      email:        'teacher1@syncquiz.com',
      passwordHash: HASH,
      fullName:     'Nguyen Van A',
      avatarUrl:    null,
      role:         'teacher',
      isActive:     true,
      createdAt:    new Date(),
      updatedAt:    new Date(),
      deletedAt:    null,
    },
    {
      email:        'teacher2@syncquiz.com',
      passwordHash: HASH,
      fullName:     'Tran Thi B',
      avatarUrl:    null,
      role:         'teacher',
      isActive:     true,
      createdAt:    new Date(),
      updatedAt:    new Date(),
      deletedAt:    null,
    },
    {
      email:        'student1@syncquiz.com',
      passwordHash: HASH,
      fullName:     'Le Van C',
      avatarUrl:    null,
      role:         'student',
      isActive:     true,
      createdAt:    new Date(),
      updatedAt:    new Date(),
      deletedAt:    null,
    },
    {
      email:        'student2@syncquiz.com',
      passwordHash: HASH,
      fullName:     'Pham Thi D',
      avatarUrl:    null,
      role:         'student',
      isActive:     true,
      createdAt:    new Date(),
      updatedAt:    new Date(),
      deletedAt:    null,
    },
    {
      email:        'student3@syncquiz.com',
      passwordHash: HASH,
      fullName:     'Hoang Van E',
      avatarUrl:    null,
      role:         'student',
      isActive:     true,
      createdAt:    new Date(),
      updatedAt:    new Date(),
      deletedAt:    null,
    },
  ]);
  console.log(`✅ users          — ${Object.keys(users.insertedIds).length} docs`);

  const teacherId  = users.insertedIds[1];
  const studentId1 = users.insertedIds[3];
  const studentId2 = users.insertedIds[4];
  const studentId3 = users.insertedIds[5];

  // ============================================================
  // 3. QUIZZES
  // ============================================================
  const quizzesCol = db.collection('quizzes');
  await quizzesCol.drop().catch(() => {});

  const quizzes = await quizzesCol.insertMany([
    {
      ownerId:           teacherId,
      categoryId:        catIds[0],   // Mathematics
      title:             'Basic Mathematics Quiz',
      description:       'Test your knowledge of basic math operations',
      coverImageUrl:     null,
      visibility:        'public',
      shuffleQuestions:  false,
      shuffleAnswers:    false,
      defaultTimeLimit:  30,
      totalPlays:        0,
      isDeleted:         false,
      createdAt:         new Date(),
      updatedAt:         new Date(),
      deletedAt:         null,
    },
    {
      ownerId:           teacherId,
      categoryId:        catIds[6],   // Technology
      title:             'Introduction to Programming',
      description:       'Fundamentals of programming concepts',
      coverImageUrl:     null,
      visibility:        'public',
      shuffleQuestions:  true,
      shuffleAnswers:    true,
      defaultTimeLimit:  45,
      totalPlays:        0,
      isDeleted:         false,
      createdAt:         new Date(),
      updatedAt:         new Date(),
      deletedAt:         null,
    },
    {
      ownerId:           teacherId,
      categoryId:        catIds[2],   // History
      title:             'Vietnam History',
      description:       'Key events in Vietnamese history',
      coverImageUrl:     null,
      visibility:        'private',
      shuffleQuestions:  false,
      shuffleAnswers:    false,
      defaultTimeLimit:  60,
      totalPlays:        0,
      isDeleted:         false,
      createdAt:         new Date(),
      updatedAt:         new Date(),
      deletedAt:         null,
    },
  ]);
  console.log(`✅ quizzes        — ${Object.keys(quizzes.insertedIds).length} docs`);

  const quizId1 = quizzes.insertedIds[0];
  const quizId2 = quizzes.insertedIds[1];

  // ============================================================
  // 4. QUESTIONS
  // ============================================================
  const questionsCol = db.collection('questions');
  await questionsCol.drop().catch(() => {});

  const questions = await questionsCol.insertMany([
    // Quiz 1 — Math
    {
      quizId:    quizId1,
      type:      'single_choice',
      content:   'What is 5 + 7?',
      imageUrl:  null,
      timeLimit: 20,
      points:    100,
      position:  0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      quizId:    quizId1,
      type:      'true_false',
      content:   'Is 144 a perfect square?',
      imageUrl:  null,
      timeLimit: 15,
      points:    100,
      position:  1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      quizId:    quizId1,
      type:      'fill_blank',
      content:   'The result of 9 × 9 is ___.',
      imageUrl:  null,
      timeLimit: 20,
      points:    150,
      position:  2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      quizId:    quizId1,
      type:      'multiple_choice',
      content:   'Which of the following are prime numbers?',
      imageUrl:  null,
      timeLimit: 30,
      points:    200,
      position:  3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Quiz 2 — Programming
    {
      quizId:    quizId2,
      type:      'single_choice',
      content:   'Which language is known as the language of the web?',
      imageUrl:  null,
      timeLimit: 20,
      points:    100,
      position:  0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      quizId:    quizId2,
      type:      'true_false',
      content:   'Python is a compiled language.',
      imageUrl:  null,
      timeLimit: 15,
      points:    100,
      position:  1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  console.log(`✅ questions      — ${Object.keys(questions.insertedIds).length} docs`);

  const qIds = questions.insertedIds;

  // ============================================================
  // 5. ANSWER OPTIONS
  // ============================================================
  const answersCol = db.collection('answer_options');
  await answersCol.drop().catch(() => {});

  await answersCol.insertMany([
    // Q0 — 5 + 7
    { questionId: qIds[0], content: '10',  isCorrect: false, position: 0 },
    { questionId: qIds[0], content: '11',  isCorrect: false, position: 1 },
    { questionId: qIds[0], content: '12',  isCorrect: true,  position: 2 },
    { questionId: qIds[0], content: '13',  isCorrect: false, position: 3 },
    // Q1 — true/false
    { questionId: qIds[1], content: 'True',  isCorrect: true,  position: 0 },
    { questionId: qIds[1], content: 'False', isCorrect: false, position: 1 },
    // Q2 — fill blank (no options, answer validated by text)
    // Q3 — multiple choice prime numbers
    { questionId: qIds[3], content: '2',  isCorrect: true,  position: 0 },
    { questionId: qIds[3], content: '4',  isCorrect: false, position: 1 },
    { questionId: qIds[3], content: '7',  isCorrect: true,  position: 2 },
    { questionId: qIds[3], content: '9',  isCorrect: false, position: 3 },
    { questionId: qIds[3], content: '11', isCorrect: true,  position: 4 },
    // Q4 — language of the web
    { questionId: qIds[4], content: 'Python',     isCorrect: false, position: 0 },
    { questionId: qIds[4], content: 'JavaScript', isCorrect: true,  position: 1 },
    { questionId: qIds[4], content: 'Java',        isCorrect: false, position: 2 },
    { questionId: qIds[4], content: 'C++',         isCorrect: false, position: 3 },
    // Q5 — Python compiled?
    { questionId: qIds[5], content: 'True',  isCorrect: false, position: 0 },
    { questionId: qIds[5], content: 'False', isCorrect: true,  position: 1 },
  ]);
  console.log(`✅ answer_options — 17 docs`);

  // ============================================================
  // 6. CLASSROOMS
  // ============================================================
  const classroomsCol = db.collection('classrooms');
  await classroomsCol.drop().catch(() => {});

  const classrooms = await classroomsCol.insertMany([
    {
      ownerId:     teacherId,
      name:        'Math Class 10A',
      description: 'Mathematics for grade 10 class A',
      joinCode:    'MATH01',
      isActive:    true,
      createdAt:   new Date(),
      updatedAt:   new Date(),
      deletedAt:   null,
    },
    {
      ownerId:     teacherId,
      name:        'Programming Fundamentals',
      description: 'Introduction to programming for beginners',
      joinCode:    'PROG01',
      isActive:    true,
      createdAt:   new Date(),
      updatedAt:   new Date(),
      deletedAt:   null,
    },
  ]);
  console.log(`✅ classrooms     — ${Object.keys(classrooms.insertedIds).length} docs`);

  const classroomId1 = classrooms.insertedIds[0];

  // ============================================================
  // 7. CLASSROOM MEMBERS
  // ============================================================
  const membersCol = db.collection('classroom_members');
  await membersCol.drop().catch(() => {});

  await membersCol.insertMany([
    { classroomId: classroomId1, userId: teacherId,  role: 'teacher', joinedAt: new Date() },
    { classroomId: classroomId1, userId: studentId1, role: 'student', joinedAt: new Date() },
    { classroomId: classroomId1, userId: studentId2, role: 'student', joinedAt: new Date() },
    { classroomId: classroomId1, userId: studentId3, role: 'student', joinedAt: new Date() },
  ]);
  console.log(`✅ classroom_members — 4 docs`);

  // ============================================================
  // 8. HOMEWORK ASSIGNMENTS
  // ============================================================
  const hwCol = db.collection('homework_assignments');
  await hwCol.drop().catch(() => {});

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7); // 7 days from now

  const hw = await hwCol.insertMany([
    {
      classroomId: classroomId1,
      quizId:      quizId1,
      assignedBy:  teacherId,
      deadline:    deadline,
      allowLate:   false,
      createdAt:   new Date(),
    },
  ]);
  console.log(`✅ homework_assignments — ${Object.keys(hw.insertedIds).length} docs`);

  const hwId = hw.insertedIds[0];

  // ============================================================
  // 9. HOMEWORK SUBMISSIONS (placeholder — not_started)
  // ============================================================
  const submissionsCol = db.collection('homework_submissions');
  await submissionsCol.drop().catch(() => {});

  await submissionsCol.insertMany([
    { assignmentId: hwId, studentId: studentId1, totalScore: 0, maxScore: 550, status: 'not_started', startedAt: null, submittedAt: null },
    { assignmentId: hwId, studentId: studentId2, totalScore: 0, maxScore: 550, status: 'not_started', startedAt: null, submittedAt: null },
    { assignmentId: hwId, studentId: studentId3, totalScore: 0, maxScore: 550, status: 'not_started', startedAt: null, submittedAt: null },
  ]);
  console.log(`✅ homework_submissions — 3 docs`);

  // ============================================================
  // 10. CREATE INDEXES
  // ============================================================
  console.log('\n📑 Creating indexes...');

  await usersCol.createIndex({ email: 1 }, { unique: true });
  await usersCol.createIndex({ role: 1 });

  await quizzesCol.createIndex({ ownerId: 1 });
  await quizzesCol.createIndex({ visibility: 1, isDeleted: 1 });
  // Note: text index requires Atlas Search or non-strict API mode — skipped for now

  await questionsCol.createIndex({ quizId: 1, position: 1 });

  await answersCol.createIndex({ questionId: 1 });

  await classroomsCol.createIndex({ joinCode: 1 }, { unique: true });
  await classroomsCol.createIndex({ ownerId: 1 });

  await membersCol.createIndex({ classroomId: 1, userId: 1 }, { unique: true });

  await hwCol.createIndex({ classroomId: 1 });
  await hwCol.createIndex({ quizId: 1 });

  await submissionsCol.createIndex({ assignmentId: 1, studentId: 1 }, { unique: true });

  console.log('✅ Indexes created');

  // ============================================================
  // SUMMARY
  // ============================================================
  const colNames = await db.listCollections().toArray();
  console.log('\n📂 Collections created:');
  colNames.forEach(c => console.log(`   • ${c.name}`));

  console.log('\n🎉 Seed completed successfully!\n');
  await disconnectDB();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
