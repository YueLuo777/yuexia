import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { modelConfigs } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const modelRouter = createRouter({
  // ─── 获取所有模型 ───
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(modelConfigs)
      .orderBy(desc(modelConfigs.createdAt));
  }),

  // ─── 获取启用的模型 ───
  listEnabled: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(modelConfigs)
      .where(eq(modelConfigs.enabled, true))
      .orderBy(desc(modelConfigs.createdAt));
  }),

  // ─── 创建模型 ───
  create: publicQuery
    .input(z.object({
      name: z.string().min(1),
      modelId: z.string().min(1),
      baseUrl: z.string().min(1),
      apiKey: z.string().default(""),
      description: z.string().default(""),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(modelConfigs).values({
        name: input.name,
        modelId: input.modelId,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
        description: input.description,
      }).returning();
      return result[0];
    }),

  // ─── 更新模型 ───
  update: publicQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      modelId: z.string().optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      enabled: z.boolean().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.modelId !== undefined) updateData.modelId = updates.modelId;
      if (updates.baseUrl !== undefined) updateData.baseUrl = updates.baseUrl;
      if (updates.apiKey !== undefined) updateData.apiKey = updates.apiKey;
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
      if (updates.description !== undefined) updateData.description = updates.description;

      const result = await db.update(modelConfigs).set(updateData).where(eq(modelConfigs.id, id)).returning();
      return result[0] || null;
    }),

  // ─── 删除模型 ───
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(modelConfigs).where(eq(modelConfigs.id, input.id));
      return { success: true };
    }),

  // ─── 测试模型连通性 ───
  test: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(modelConfigs).where(eq(modelConfigs.id, input.id));
      const model = result[0];
      if (!model) return { success: false, message: "模型不存在" };

      try {
        const baseUrl = model.baseUrl.replace(/\/+$/, "");
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${model.apiKey}`,
          },
          body: JSON.stringify({
            model: model.modelId,
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 5,
          }),
        });

        if (response.ok) {
          return { success: true, message: "连接成功" };
        } else {
          return { success: false, message: `连接失败: ${response.status}` };
        }
      } catch (err: any) {
        return { success: false, message: `请求异常: ${err.message}` };
      }
    }),
});
