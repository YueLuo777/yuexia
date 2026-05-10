import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

export async function connectDB() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI 未设置，请在 .env 文件中配置');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Atlas 连接成功');
  } catch (err) {
    console.error('❌ MongoDB 连接失败:', err);
    process.exit(1);
  }
}
