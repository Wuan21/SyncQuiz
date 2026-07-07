const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const Classroom = require('../models/Classroom');
const Homework = require('../models/Homework');
const { v4: uuidv4 } = require('uuid');

const genCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const [taught, joined] = await Promise.all([
      Classroom.find({ teacherId: req.user.id })
        .populate('students', 'fullName email avatarUrl')
        .lean(),
      Classroom.find({ students: req.user.id, isActive: true })
        .populate('teacherId', 'fullName email avatarUrl')
        .lean(),
    ]);
    res.json({ taught, joined });
  } catch (err) { next(err); }
});

router.get('/:id/gradebook', authenticate, async (req, res, next) => {
  try {
    const classroom = await Classroom.findOne({ _id: req.params.id, teacherId: req.user.id })
      .populate('students', 'fullName email avatarUrl')
      .lean();

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    const homeworks = await Homework.find({
      classroomId: classroom._id,
      teacherId: req.user.id,
      isActive: true,
    })
      .select('title dueDate allowedAttempts submissions createdAt')
      .sort({ dueDate: 1, createdAt: 1 })
      .lean();

    const now = new Date();
    const studentRows = classroom.students.map((student) => {
      const homeworkResults = homeworks.map((hw) => {
        const submissions = (hw.submissions || [])
          .filter((submission) => submission.studentId?.toString() === student._id.toString())
          .sort((a, b) => {
            if (b.percentage !== a.percentage) return b.percentage - a.percentage;
            return new Date(b.submittedAt) - new Date(a.submittedAt);
          });

        const bestSubmission = submissions[0] || null;
        return {
          homeworkId: hw._id.toString(),
          title: hw.title,
          dueDate: hw.dueDate,
          attemptsUsed: submissions.length,
          allowedAttempts: hw.allowedAttempts || 1,
          submitted: submissions.length > 0,
          bestPercentage: bestSubmission ? bestSubmission.percentage : null,
          bestScore: bestSubmission ? bestSubmission.score : null,
          maxScore: bestSubmission ? bestSubmission.maxScore : null,
          submittedAt: bestSubmission ? bestSubmission.submittedAt : null,
          isOverdue: submissions.length === 0 && new Date(hw.dueDate) < now,
        };
      });

      const completed = homeworkResults.filter((item) => item.submitted);
      const averageScore = completed.length
        ? Math.round(completed.reduce((sum, item) => sum + item.bestPercentage, 0) / completed.length)
        : null;
      const latestSubmission = completed.length
        ? completed
            .map((item) => item.submittedAt)
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a))[0]
        : null;

      return {
        id: student._id.toString(),
        fullName: student.fullName,
        email: student.email,
        avatarUrl: student.avatarUrl,
        homeworkCompleted: completed.length,
        homeworkPending: homeworkResults.filter((item) => !item.submitted).length,
        overdueCount: homeworkResults.filter((item) => item.isOverdue).length,
        averageScore,
        latestSubmission,
        homeworkResults,
      };
    });

    const submittedCount = studentRows.reduce((sum, row) => sum + row.homeworkCompleted, 0);
    const totalPossibleSubmissions = classroom.students.length * homeworks.length;
    const classAverage = studentRows.filter((row) => row.averageScore !== null).length
      ? Math.round(
          studentRows
            .filter((row) => row.averageScore !== null)
            .reduce((sum, row) => sum + row.averageScore, 0) /
            studentRows.filter((row) => row.averageScore !== null).length,
        )
      : null;

    res.json({
      classroom: {
        id: classroom._id.toString(),
        name: classroom.name,
        code: classroom.code,
        description: classroom.description,
        studentCount: classroom.students.length,
      },
      summary: {
        totalHomeworks: homeworks.length,
        totalStudents: classroom.students.length,
        totalPossibleSubmissions,
        submittedCount,
        pendingCount: Math.max(totalPossibleSubmissions - submittedCount, 0),
        completionRate: totalPossibleSubmissions > 0
          ? Math.round((submittedCount / totalPossibleSubmissions) * 100)
          : 0,
        classAverage,
      },
      homeworks: homeworks.map((hw) => ({
        id: hw._id.toString(),
        title: hw.title,
        dueDate: hw.dueDate,
        allowedAttempts: hw.allowedAttempts || 1,
      })),
      students: studentRows,
    });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const code = genCode();
    const classroom = await Classroom.create({ ...req.body, teacherId: req.user.id, code });
    res.status(201).json(classroom);
  } catch (err) { next(err); }
});

router.post('/join/:code', authenticate, async (req, res, next) => {
  try {
    const classroom = await Classroom.findOneAndUpdate(
      { code: req.params.code.toUpperCase(), isActive: true },
      { $addToSet: { students: req.user.id } },
      { new: true },
    );
    if (!classroom) return res.status(404).json({ message: 'Classroom not found' });
    res.json(classroom);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await Classroom.findOneAndDelete({ _id: req.params.id, teacherId: req.user.id });
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
