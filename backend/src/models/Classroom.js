const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: null },
    code: { type: String, required: true, unique: true, uppercase: true, length: 6 },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

classroomSchema.index({ teacherId: 1 });

const Classroom = mongoose.model('Classroom', classroomSchema);
module.exports = Classroom;
