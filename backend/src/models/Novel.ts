import mongoose from 'mongoose';

const ChapterSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  serialNumber: { type: Number, required: true },
  content: { type: String, default: '' },
  wordCount: { type: Number, default: 0 },
  isSelected: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },
}, { timestamps: true });

const VolumeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isExpanded: { type: Boolean, default: true },
  chapters: [ChapterSchema],
}, { timestamps: true });

const NovelSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['novel', 'script'], required: true },
  cover: { type: String, default: null },
  category: { type: String, default: '未分类' },
  volumes: [VolumeSchema],
  currentChapterId: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true });

export default mongoose.model('Novel', NovelSchema);
