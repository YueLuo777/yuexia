import express from 'express';
import Novel from '../models/Novel';

const router = express.Router();

// 获取所有作品
router.get('/', async (req, res) => {
  try {
    const novels = await Novel.find().sort({ createdAt: -1 });
    res.json(novels);
  } catch (err) {
    res.status(500).json({ error: '获取作品失败' });
  }
});

// 创建作品
router.post('/', async (req, res) => {
  try {
    const novel = await Novel.create(req.body);
    res.json(novel);
  } catch (err) {
    res.status(500).json({ error: '创建作品失败' });
  }
});

// 更新作品
router.put('/:id', async (req, res) => {
  try {
    const novel = await Novel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(novel);
  } catch (err) {
    res.status(500).json({ error: '更新作品失败' });
  }
});

// 删除作品
router.delete('/:id', async (req, res) => {
  try {
    await Novel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除作品失败' });
  }
});

// 获取单个作品（包含卷/章）
router.get('/:id', async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    res.json(novel);
  } catch (err) {
    res.status(500).json({ error: '获取作品失败' });
  }
});

// 添加卷
router.post('/:id/volumes', async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ error: '作品不存在' });
    novel.volumes.push(req.body);
    await novel.save();
    res.json(novel);
  } catch (err) {
    res.status(500).json({ error: '添加卷失败' });
  }
});

// 更新卷
router.put('/:id/volumes/:volumeId', async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ error: '作品不存在' });
    const volume = novel.volumes.id(req.params.volumeId);
    if (!volume) return res.status(404).json({ error: '卷不存在' });
    Object.assign(volume, req.body);
    await novel.save();
    res.json(novel);
  } catch (err) {
    res.status(500).json({ error: '更新卷失败' });
  }
});

// 删除卷
router.delete('/:id/volumes/:volumeId', async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ error: '作品不存在' });
    novel.volumes = novel.volumes.filter((v: any) => v._id.toString() !== req.params.volumeId);
    await novel.save();
    res.json(novel);
  } catch (err) {
    res.status(500).json({ error: '删除卷失败' });
  }
});

// 添加章节
router.post('/:id/volumes/:volumeId/chapters', async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ error: '作品不存在' });
    const volume = novel.volumes.id(req.params.volumeId);
    if (!volume) return res.status(404).json({ error: '卷不存在' });
    volume.chapters.push(req.body);
    await novel.save();
    res.json(novel);
  } catch (err) {
    res.status(500).json({ error: '添加章节失败' });
  }
});

// 更新章节
router.put('/:id/volumes/:volumeId/chapters/:chapterId', async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ error: '作品不存在' });
    const volume = novel.volumes.id(req.params.volumeId);
    if (!volume) return res.status(404).json({ error: '卷不存在' });
    const chapter = volume.chapters.id(req.params.chapterId);
    if (!chapter) return res.status(404).json({ error: '章节不存在' });
    Object.assign(chapter, req.body);
    await novel.save();
    res.json(novel);
  } catch (err) {
    res.status(500).json({ error: '更新章节失败' });
  }
});

// 删除章节
router.delete('/:id/volumes/:volumeId/chapters/:chapterId', async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ error: '作品不存在' });
    const volume = novel.volumes.id(req.params.volumeId);
    if (!volume) return res.status(404).json({ error: '卷不存在' });
    volume.chapters = volume.chapters.filter((c: any) => c._id.toString() !== req.params.chapterId);
    await novel.save();
    res.json(novel);
  } catch (err) {
    res.status(500).json({ error: '删除章节失败' });
  }
});

export default router;
