import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { appSettings } from "@db/schema";
import { eq } from "drizzle-orm";

export const settingsRouter = createRouter({
  // ─── 获取设置 ───
  get: publicQuery
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(appSettings).where(eq(appSettings.key, input.key));
      return result[0]?.value || null;
    }),

  // ─── 获取所有设置 ───
  list: publicQuery.query(async () => {
    const db = getDb();
    const results = await db.select().from(appSettings);
    // 转换为键值对象
    const settings: Record<string, string | null> = {};
    for (const row of results) {
      settings[row.key] = row.value;
    }
    return settings;
  }),

  // ─── 设置值 ───
  set: publicQuery
    .input(z.object({
      key: z.string(),
      value: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // 先检查是否存在
      const existing = await db.select().from(appSettings).where(eq(appSettings.key, input.key));
      if (existing.length > 0) {
        await db.update(appSettings).set({ value: input.value }).where(eq(appSettings.key, input.key));
      } else {
        await db.insert(appSettings).values({ key: input.key, value: input.value });
      }
      return { success: true };
    }),

  // ─── 删除设置 ───
  remove: publicQuery
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(appSettings).where(eq(appSettings.key, input.key));
      return { success: true };
    }),
});
