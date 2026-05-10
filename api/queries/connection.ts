import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@db/schema";

let instance: ReturnType<typeof drizzle<typeof schema>>;

// 从环境变量或默认值获取连接字符串
function getConnectionString(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    "postgresql://postgres:postgres@localhost:5432/yuexia"
  );
}

export function getDb() {
  if (!instance) {
    const pool = new Pool({
      connectionString: getConnectionString(),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // 远程连接放宽到 10 秒
    });

    // 监听连接错误
    pool.on("error", (err) => {
      console.error("[DB] 连接池错误:", err.message);
    });

    instance = drizzle(pool, { schema });
  }
  return instance;
}

// 获取原始 pool（用于执行原始 SQL，如创建扩展）
export function getPool() {
  const db = getDb();
  return (db as any).$client as Pool;
}

// 初始化数据库：创建 pgvector 扩展、表、以及默认用户
export async function initDatabase() {
  const pool = getPool();

  try {
    // 创建 pgvector 扩展
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("[DB] pgvector 扩展已就绪");
  } catch (err: any) {
    console.error("[DB] 初始化失败:", err.message);
    console.error("[DB] 请确保 PostgreSQL 已安装且 pgvector 扩展可用");
    throw err;
  }

  // 检查连接
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("[DB] PostgreSQL 连接成功:", result.rows[0].now);
  } catch (err: any) {
    console.error("[DB] 连接测试失败:", err.message);
  }

  return getDb();
}
