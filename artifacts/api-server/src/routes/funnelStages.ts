import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, funnelStagesTable, workspacesTable } from "@workspace/db";
import {
  CreateFunnelStageBody,
  UpdateFunnelStageBody,
  ListFunnelStagesParams,
  CreateFunnelStageParams,
  UpdateFunnelStageParams,
  DeleteFunnelStageParams,
  ListFunnelStagesResponse,
  UpdateFunnelStageResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function checkWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
  const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));
  return !!ws && ws.ownerId === userId;
}

router.get("/workspaces/:workspaceId/funnel-stages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = ListFunnelStagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const stages = await db
    .select()
    .from(funnelStagesTable)
    .where(eq(funnelStagesTable.workspaceId, params.data.workspaceId))
    .orderBy(funnelStagesTable.order);

  res.json(ListFunnelStagesResponse.parse(stages));
});

router.post("/workspaces/:workspaceId/funnel-stages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = CreateFunnelStageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const body = CreateFunnelStageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const slug = body.data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [stage] = await db.insert(funnelStagesTable).values({
    workspaceId: params.data.workspaceId,
    name: body.data.name,
    slug,
    order: body.data.order ?? 99,
    color: body.data.color ?? null,
    requiredFields: body.data.requiredFields ?? [],
    isDefault: false,
  }).returning();

  res.status(201).json(stage);
});

router.patch("/workspaces/:workspaceId/funnel-stages/:stageId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = UpdateFunnelStageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const body = UpdateFunnelStageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.name !== undefined) updateData.name = body.data.name;
  if (body.data.color !== undefined) updateData.color = body.data.color;
  if (body.data.order !== undefined) updateData.order = body.data.order;
  if (body.data.requiredFields !== undefined) updateData.requiredFields = body.data.requiredFields;

  const [stage] = await db
    .update(funnelStagesTable)
    .set(updateData)
    .where(and(eq(funnelStagesTable.id, params.data.stageId), eq(funnelStagesTable.workspaceId, params.data.workspaceId)))
    .returning();

  if (!stage) {
    res.status(404).json({ error: "Stage not found" });
    return;
  }

  res.json(UpdateFunnelStageResponse.parse(stage));
});

router.delete("/workspaces/:workspaceId/funnel-stages/:stageId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = DeleteFunnelStageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  await db
    .delete(funnelStagesTable)
    .where(and(eq(funnelStagesTable.id, params.data.stageId), eq(funnelStagesTable.workspaceId, params.data.workspaceId)));

  res.sendStatus(204);
});

export default router;
