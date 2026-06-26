const Category = require('../models/Category');

exports.list = async (_req, res, next) => {
  try {
    const cats = await Category.find({ isActive: true }).sort('name').lean();
    res.json(cats);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, color, iconUrl } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const cat = await Category.create({ name, slug, description, color, iconUrl });
    res.status(201).json(cat);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, { isActive: false });
    res.status(204).send();
  } catch (err) { next(err); }
};
