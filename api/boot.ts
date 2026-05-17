import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { modelConfigs } from "@db/schema";
import { eq } from "drizzle-orm";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

/**
 * 模型流式调用路由（放在 tRPC 通配路由之前）
 * 前端 ai.ts 中的 callModelAPIStream 调用此端点
 */
app.post("/api/trpc/model.call", async (c) => {
  try {
    const body = await c.req.json();
    const { modelId, messages, stream } = body as {
      modelId?: string | number;
      messages?: Array<{ role: string; content: string }>;
      stream?: boolean;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: "messages 不能为空" }, 400);
    }

    const db = getDb();
    let model: typeof modelConfigs.$inferSelect | undefined;

    // 1. 先按数字ID查询（前端 select value 是 model.id，即数据库主键）
    if (modelId !== undefined && modelId !== "") {
      const numericId = Number(modelId);
      if (!isNaN(numericId)) {
        const results = await db
          .select()
          .from(modelConfigs)
          .where(eq(modelConfigs.id, numericId));
        model = results[0];
      }
      // 如果按数字ID没找到，再按 modelId 字段查
      if (!model) {
        const results = await db
          .select()
          .from(modelConfigs)
          .where(eq(modelConfigs.modelId, String(modelId)))
          .limit(1);
        model = results[0];
      }
    }

    // 2. 如果没传 modelId 或没找到，使用第一个启用的模型
    if (!model) {
      const results = await db
        .select()
        .from(modelConfigs)
        .where(eq(modelConfigs.enabled, true))
        .limit(1);
      model = results[0];
    }

    if (!model) {
      return c.json({ error: "没有可用的模型配置" }, 404);
    }

    const baseUrl = model.baseUrl.replace(/\/+$/, "");

    // 3. 转发请求到实际模型API（OpenAI 兼容格式）
    const apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelId,
        messages,
        stream: stream !== false, // 默认开启流式
      }),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      return c.json(
        { error: `模型请求失败 (${apiResponse.status}): ${errText.slice(0, 500)}` },
        502
      );
    }

    // 4. 透传流式响应给前端
    return new Response(apiResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    console.error("[model.call] error:", err);
    return c.json(
      { error: err.message || String(err) },
      500
    );
  }
});

// tRPC 路由（其他请求走这里）
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// 404 处理
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// 健康检查
app.get("/health", (c) => c.json({ status: "ok" }));

export default app;

// 生产环境启动服务器
if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "17328");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
