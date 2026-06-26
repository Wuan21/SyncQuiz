const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const Classroom = require('../models/Classroom');
const { v4: uuidv4 } = require('uuid');

const genCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const classrooms = await Classroom.find({ teacherId: req.user.id })
      .populate('students', 'fullName email avatarUrl')
      .lean();
    res.json(classrooms);
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
