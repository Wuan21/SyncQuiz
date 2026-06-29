const { parse } = require('csv-parse/sync');
const multer = require('multer');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

/**
 * POST /api/quizzes/:id/import-csv
 * CSV columns: question,optionA,optionB,optionC,optionD,correct,timeLimit,points,explanation
 * "correct" = A|B|C|D
 */
exports.uploadMiddleware = upload.single('file');

exports.importCSV = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, ownerId: req.user.id, isDeleted: false });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found or unauthorized' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const csv = req.file.buffer.toString('utf-8');
    let records;
    try {
      records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      return res.status(400).json({ message: 'Invalid CSV format' });
    }

    if (!records.length) return res.status(400).json({ message: 'CSV is empty' });

    const OPTION_MAP = { A: 0, B: 1, C: 2, D: 3 };
    const startOrder = await Question.countDocuments({ quizId: quiz._id });
    const questions = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const correctIdx = OPTION_MAP[(r.correct || r.answer || 'A').toUpperCase()];
      if (correctIdx === undefined) continue;

      const options = ['optionA', 'optionB', 'optionC', 'optionD'].map((k, oi) => ({
        text: r[k] || r[`option_${String.fromCharCode(65 + oi)}`] || '',
        isCorrect: oi === correctIdx,
        imageUrl: null,
      }));

      questions.push({
        quizId: quiz._id,
        type: 'multiple_choice',
        content: r.question || r.Question || '',
        options,
        timeLimit: parseInt(r.timeLimit || r.time_limit || 30) || 30,
        points: parseInt(r.points || 1000) || 1000,
        explanation: r.explanation || '',
        order: startOrder + i,
      });
    }

    const inserted = await Question.insertMany(questions);
    await Quiz.findByIdAndUpdate(quiz._id, { $inc: { questionCount: inserted.length } });

    res.json({ imported: inserted.length, total: inserted.length + startOrder });
  } catch (err) {
    next(err);
  }
};

// GET /api/quizzes/csv-template — download CSV template
exports.csvTemplate = (_req, res) => {
  const template = [
    'question,optionA,optionB,optionC,optionD,correct,timeLimit,points,explanation',
    'What is the capital of France?,Rome,Paris,London,Berlin,B,30,1000,Paris is the capital of France.',
    'What is 2+2?,3,4,5,6,B,20,500,Basic arithmetic.',
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="syncquiz-template.csv"');
  res.send(template);
};
