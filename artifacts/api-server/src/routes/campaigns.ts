import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, campaignsTable, workspacesTable } from "@workspace/db";
import {
  CreateCampaignBody,
  UpdateCampaignBody,
  ListCampaignsParams,
  CreateCampaignParams,
  GetCampaignParams,
  UpdateCampaignParams,
  DeleteCampaignParams,
  ListCampaignsResponse,
  GetCampaignResponse,
  UpdateCampaignResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function checkWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
  const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));
  return !!ws && ws.ownerId === userId;
}

router.get("/workspaces/:workspaceId/campaigns", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = ListCampaignsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const campaigns = await db.select().from(campaignsTable).where(eq(campaignsTable.workspaceId, params.data.workspaceId));
  res.json(ListCampaignsResponse.parse(campaigns));
});

router.post("/workspaces/:workspaceId/campaigns", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = CreateCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const body = CreateCampaignBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [campaign] = await db.insert(campaignsTable).values({
    workspaceId: params.data.workspaceId,
    name: body.data.name,
    description: body.data.description ?? null,
    context: body.data.context,
    promptInstructions: body.data.promptInstructions,
    triggerStage: body.data.triggerStage ?? null,
    isActive: body.data.isActive ?? true,
  }).returning();

  res.status(201).json(GetCampaignResponse.parse(campaign));
});

router.get("/workspaces/:workspaceId/campaigns/:campaignId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const [campaign] = await db.select().from(campaignsTable).where(and(eq(campaignsTable.id, params.data.campaignId), eq(campaignsTable.workspaceId, params.data.workspaceId)));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(GetCampaignResponse.parse(campaign));
});

router.patch("/workspaces/:workspaceId/campaigns/:campaignId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = UpdateCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const body = UpdateCampaignBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.name !== undefined) updateData.name = body.data.name;
  if (body.data.description !== undefined) updateData.description = body.data.description;
  if (body.data.context !== undefined) updateData.context = body.data.context;
  if (body.data.promptInstructions !== undefined) updateData.promptInstructions = body.data.promptInstructions;
  if (body.data.triggerStage !== undefined) updateData.triggerStage = body.data.triggerStage;
  if (body.data.isActive !== undefined) updateData.isActive = body.data.isActive;

  const [campaign] = await db.update(campaignsTable).set(updateData).where(and(eq(campaignsTable.id, params.data.campaignId), eq(campaignsTable.workspaceId, params.data.workspaceId))).returning();

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(UpdateCampaignResponse.parse(campaign));
});

router.delete("/workspaces/:workspaceId/campaigns/:campaignId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = DeleteCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  await db.delete(campaignsTable).where(and(eq(campaignsTable.id, params.data.campaignId), eq(campaignsTable.workspaceId, params.data.workspaceId)));
  res.sendStatus(204);
});

export default router;
