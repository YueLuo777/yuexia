import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  novels, volumes, chapters, materials, prompts,
  modelConfigs, appSettings, plotPoints,
} from "@db/schema";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// ─── 备份文件夹路径 ───
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.resolve(__dirname, "../数据库");

async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

function getBackupFilePath(): string {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return path.join(BACKUP_DIR, `backup_${ts}.json`);
}

// ─── 导出的数据类型 ───
interface BackupData {
  meta: {
    version: string;
    exportedAt: string;
    tables: string[];
  };
  novels: any[];
  volumes: any[];
  chapters: any[];
  materials: any[];
  prompts: any[];
  modelConfigs: any[];
  appSettings: any[];
  plotPoints: any[];
}

export const backupRouter = createRouter({
  // ─── 导出所有数据 ───
  export: publicQuery.mutation(async () => {
    await ensureBackupDir();
    const db = getDb();

    // 从所有表读取数据
    const [
      novelsData,
      volumesData,
      chaptersData,
      materialsData,
      promptsData,
      modelConfigsData,
      appSettingsData,
      plotPointsData,
    ] = await Promise.all([
      db.select().from(novels),
      db.select().from(volumes),
      db.select().from(chapters),
      db.select().from(materials),
      db.select().from(prompts),
      db.select().from(modelConfigs),
      db.select().from(appSettings),
      db.select().from(plotPoints),
    ]);

    // 处理 plotPoints 的 embedding 字段（向量转数组）
    const processedPlotPoints = plotPointsData.map((pp: any) => ({
      ...pp,
      embedding: pp.embedding ? Array.from(pp.embedding) : null,
    }));

    const backup: BackupData = {
      meta: {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        tables: ["novels", "volumes", "chapters", "materials", "prompts", "modelConfigs", "appSettings", "plotPoints"],
      },
      novels: novelsData,
      volumes: volumesData,
      chapters: chaptersData,
      materials: materialsData,
      prompts: promptsData,
      modelConfigs: modelConfigsData,
      appSettings: appSettingsData,
      plotPoints: processedPlotPoints,
    };

    const filePath = getBackupFilePath();
    await fs.writeFile(filePath, JSON.stringify(backup, null, 2), "utf-8");

    return {
      success: true,
      fileName: path.basename(filePath),
      filePath: filePath,
      recordCount: {
        novels: novelsData.length,
        volumes: volumesData.length,
        chapters: chaptersData.length,
        materials: materialsData.length,
        prompts: promptsData.length,
        modelConfigs: modelConfigsData.length,
        appSettings: appSettingsData.length,
        plotPoints: plotPointsData.length,
      },
    };
  }),

  // ─── 导入数据 ───
  import: publicQuery
    .input(z.object({ fileName: z.string() }))
    .mutation(async ({ input }) => {
      const filePath = path.join(BACKUP_DIR, input.fileName);

      // 读取并解析
      const raw = await fs.readFile(filePath, "utf-8");
      const backup: BackupData = JSON.parse(raw);

      // 校验格式
      if (!backup.meta || !backup.meta.version) {
        throw new Error("无效的备份文件格式");
      }

      const db = getDb();
      const inserted: Record<string, number> = {};

      // 按依赖顺序导入：先父表，后子表
      // 1. novels
      if (backup.novels?.length) {
        let count = 0;
        for (const item of backup.novels) {
          const { id, ...data } = item;
          try {
            await db.insert(novels).values(data).onConflictDoNothing();
            count++;
          } catch { /* ignore duplicates */ }
        }
        inserted.novels = count;
      }

      // 2. volumes
      if (backup.volumes?.length) {
        let count = 0;
        for (const item of backup.volumes) {
          const { id, ...data } = item;
          try {
            await db.insert(volumes).values(data).onConflictDoNothing();
            count++;
          } catch { /* ignore */ }
        }
        inserted.volumes = count;
      }

      // 3. chapters
      if (backup.chapters?.length) {
        let count = 0;
        for (const item of backup.chapters) {
          const { id, ...data } = item;
          try {
            await db.insert(chapters).values(data).onConflictDoNothing();
            count++;
          } catch { /* ignore */ }
        }
        inserted.chapters = count;
      }

      // 4. materials
      if (backup.materials?.length) {
        let count = 0;
        for (const item of backup.materials) {
          const { id, ...data } = item;
          try {
            await db.insert(materials).values(data).onConflictDoNothing();
            count++;
          } catch { /* ignore */ }
        }
        inserted.materials = count;
      }

      // 5. prompts
      if (backup.prompts?.length) {
        let count = 0;
        for (const item of backup.prompts) {
          const { id, ...data } = item;
          try {
            await db.insert(prompts).values(data).onConflictDoNothing();
            count++;
          } catch { /* ignore */ }
        }
        inserted.prompts = count;
      }

      // 6. modelConfigs
      if (backup.modelConfigs?.length) {
        let count = 0;
        for (const item of backup.modelConfigs) {
          const { id, ...data } = item;
          try {
            await db.insert(modelConfigs).values(data).onConflictDoNothing();
            count++;
          } catch { /* ignore */ }
        }
        inserted.modelConfigs = count;
      }

      // 7. appSettings
      if (backup.appSettings?.length) {
        let count = 0;
        for (const item of backup.appSettings) {
          const { id, ...data } = item;
          try {
            await db.insert(appSettings).values(data).onConflictDoNothing();
            count++;
          } catch { /* ignore */ }
        }
        inserted.appSettings = count;
      }

      // 8. plotPoints（最后导入，因为可能依赖其他表）
      if (backup.plotPoints?.length) {
        let count = 0;
        for (const item of backup.plotPoints) {
          const { id, embedding, ...data } = item;
          try {
            await db.insert(plotPoints).values({
              ...data,
              embedding: embedding,
            }).onConflictDoNothing();
            count++;
          } catch { /* ignore */ }
        }
        inserted.plotPoints = count;
      }

      return {
        success: true,
        fileName: input.fileName,
        imported: inserted,
        total: Object.values(inserted).reduce((a, b) => a + b, 0),
      };
    }),

  // ─── 列出所有备份文件 ───
  list: publicQuery.query(async () => {
    try {
      await ensureBackupDir();
      const files = await fs.readdir(BACKUP_DIR);
      const backups = await Promise.all(
        files
          .filter((f) => f.endsWith(".json"))
          .map(async (f) => {
            const fp = path.join(BACKUP_DIR, f);
            const stat = await fs.stat(fp);
            let recordCount = 0;
            try {
              const raw = await fs.readFile(fp, "utf-8");
              const data = JSON.parse(raw);
              recordCount = Object.values(data)
                .filter((v) => Array.isArray(v))
                .reduce((sum: number, arr: any) => sum + arr.length, 0);
            } catch { /* ignore parse errors */ }
            return {
              fileName: f,
              size: stat.size,
              createdAt: stat.birthtime.toISOString(),
              recordCount,
            };
          })
      );
      return backups.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch {
      return [];
    }
  }),

  // ─── 删除备份文件 ───
  delete: publicQuery
    .input(z.object({ fileName: z.string() }))
    .mutation(async ({ input }) => {
      const filePath = path.join(BACKUP_DIR, input.fileName);
      await fs.unlink(filePath);
      return { success: true };
    }),

  // ─── 清空所有表（谨慎使用）───
  clearAll: publicQuery.mutation(async () => {
    const db = getDb();
    // 按依赖顺序删除：子表先删
    await db.delete(plotPoints);
    await db.delete(chapters);
    await db.delete(volumes);
    await db.delete(materials);
    await db.delete(prompts);
    await db.delete(modelConfigs);
    await db.delete(appSettings);
    await db.delete(novels);
    return { success: true };
  }),
});
