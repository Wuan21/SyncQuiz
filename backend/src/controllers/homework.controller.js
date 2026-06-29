const Homework = require('../models/Homework');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Classroom = require('../models/Classroom');

// Teacher: create assignment
exports.create = async (req, res, next) => {
  try {
    const { quizId, classroomId, title, instructions, dueDate, allowedAttempts, shuffleQuestions, showCorrectAnswers } = req.body;

    const [quiz, classroom] = await Promise.all([
      Quiz.findById(quizId).lean(),
      Classroom.findOne({ _id: classroomId, teacherId: req.user.id }).lean(),
    ]);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (!classroom) return res.status(403).json({ message: 'You do not own this classroom' });

    const hw = await Homework.create({
      teacherId: req.user.id, quizId, classroomId, title,
      instructions, dueDate, allowedAttempts, shuffleQuestions, showCorrectAnswers,
    });
    res.status(201).json(hw);
  } catch (err) { next(err); }
};

// Teacher: list my homework
exports.myHomework = async (req, res, next) => {
  try {
    const hw = await Homework.find({ teacherId: req.user.id })
      .populate('quizId', 'title coverImageUrl')
      .populate('classroomId', 'name')
      .sort('-createdAt')
      .lean();
    res.json(hw);
  } catch (err) { next(err); }
};

// Student: list homework assigned to me (via classrooms I joined)
exports.studentHomework = async (req, res, next) => {
  try {
    const classrooms = await Classroom.find({ students: req.user.id }).select('_id').lean();
    const ids = classrooms.map((c) => c._id);
    const hw = await Homework.find({ classroomId: { $in: ids }, isActive: true })
      .populate('quizId', 'title coverImageUrl questionCount')
      .populate('classroomId', 'name')
      .populate('teacherId', 'fullName avatarUrl')
      .sort('dueDate')
      .lean();

    // Attach my submission status
    const result = hw.map((h) => {
      const mySubs = h.submissions?.filter((s) => s.studentId?.toString() === req.user.id) || [];
      return {
        ...h,
        mySubmissions: mySubs,
        submitted: mySubs.length > 0,
        bestScore: mySubs.length ? Math.max(...mySubs.map((s) => s.percentage)) : null,
        canSubmit: mySubs.length < (h.allowedAttempts || 1) && new Date() <= new Date(h.dueDate),
      };
    });
    res.json(result);
  } catch (err) { next(err); }
};

// Student: submit homework
exports.submit = async (req, res, next) => {
  try {
    const hw = await Homework.findById(req.params.id);
    if (!hw || !hw.isActive) return res.status(404).json({ message: 'Assignment not found' });
    if (new Date() > new Date(hw.dueDate)) return res.status(400).json({ message: 'Assignment past due date' });

    const prevAttempts = hw.submissions.filter((s) => s.studentId?.toString() === req.user.id).length;
    if (prevAttempts >= hw.allowedAttempts) return res.status(400).json({ message: 'No attempts remaining' });

    const questions = await Question.find({ quizId: hw.quizId }).lean();
    const { answers } = req.body; // [{ questionId, selectedOption }]

    let score = 0;
    let maxScore = 0;
    const gradedAnswers = questions.map((q) => {
      const given = answers?.find((a) => a.questionId === q._id.toString());
      const selectedOption = given?.selectedOption ?? -1;
      const isCorrect = selectedOption >= 0 && q.options[selectedOption]?.isCorrect === true;
      const pointsEarned = isCorrect ? q.points : 0;
      score += pointsEarned;
      maxScore += q.points;
      
      const correctOptionIndex = q.options.findIndex((o) => o.isCorrect === true);
      return { questionId: q._id, selectedOption, isCorrect, pointsEarned, correctOptionIndex };
    });

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    hw.submissions.push({
      studentId: req.user.id,
      score, maxScore, percentage,
      attempt: prevAttempts + 1,
      answers: gradedAnswers,
    });
    await hw.save();

    res.json({
      score, maxScore, percentage,
      correct: gradedAnswers.filter((a) => a.isCorrect).length,
      total: questions.length,
      ...(hw.showCorrectAnswers ? { gradedAnswers } : {}),
    });
  } catch (err) { next(err); }
};

// Teacher: get results
exports.results = async (req, res, next) => {
  try {
    const hw = await Homework.findOne({ _id: req.params.id, teacherId: req.user.id })
      .populate('submissions.studentId', 'fullName email avatarUrl')
      .lean();
    if (!hw) return res.status(404).json({ message: 'Not found' });
    res.json(hw);
  } catch (err) { next(err); }
};

// Student/Teacher: get homework details (including sanitized questions for students)
exports.getHomeworkDetails = async (req, res, next) => {
  try {
    const hw = await Homework.findById(req.params.id)
      .populate('quizId', 'title coverImageUrl description defaultTimeLimit questionCount')
      .populate('classroomId', 'name students')
      .populate('teacherId', 'fullName avatarUrl')
      .lean();
    if (!hw || !hw.isActive) return res.status(404).json({ message: 'Assignment not found' });

    // Check if user is teacher or student in this classroom
    const isTeacher = hw.teacherId.toString() === req.user.id;
    const isStudent = hw.classroomId.students.some((s) => s.toString() === req.user.id);
    if (!isTeacher && !isStudent) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const questions = await Question.find({ quizId: hw.quizId._id }).sort({ order: 1 }).lean();

    // Sanitize questions for student: strip correctness of options to prevent cheating
    const sanitizedQuestions = questions.map((q) => {
      const { ...qData } = q;
      qData.id = q._id.toString();
      qData.options = q.options.map((o) => ({
        text: o.text,
        imageUrl: o.imageUrl,
      }));
      return qData;
    });

    res.json({
      ...hw,
      id: hw._id.toString(),
      questions: isTeacher ? questions : sanitizedQuestions,
    });
  } catch (err) { next(err); }
};
