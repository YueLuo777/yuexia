import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db';
import novelRoutes from './routes/novels';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 允许前端访问（开发环境用）
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// 连接 MongoDB
connectDB();

// API 路由
app.use('/api/novels', novelRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: 'connected' });
});

// ── 托管前端静态文件 ──
// 生产环境：Express 直接提供前端页面
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// 前端路由（React Router 的 SPA 支持）
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 服务已启动: http://localhost:${PORT}`);
});
