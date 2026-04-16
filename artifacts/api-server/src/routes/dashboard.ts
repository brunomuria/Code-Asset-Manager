import { Router, type IRouter } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db, leadsTable, campaignsTable, generatedMessagesTable, activityEventsTable, workspacesTable, funnelStagesTable } from "@workspace/db";
import {
  GetDashboardParams,
  GetActivityParams,
  GetActivityQueryParams,
  GetDashboardResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function checkWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
  const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));
  return !!ws && ws.ownerId === userId;
}

router.get("/workspaces/:workspaceId/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = GetDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const wid = params.data.workspaceId;

  const [leads, campaigns, allMessages, stages, recentLeads] = await Promise.all([
    db.select().from(leadsTable).where(eq(leadsTable.workspaceId, wid)),
    db.select().from(campaignsTable).where(eq(campaignsTable.workspaceId, wid)),
    db.select().from(generatedMessagesTable).where(
      eq(generatedMessagesTable.leadId, leadsTable.id)
    ).catch(() => []),
    db.select().from(funnelStagesTable).where(eq(funnelStagesTable.workspaceId, wid)).orderBy(funnelStagesTable.order),
    db.select().from(leadsTable).where(eq(leadsTable.workspaceId, wid)).orderBy(desc(leadsTable.createdAt)).limit(5),
  ]);

  const leadsByStageMap: Record<string, number> = {};
  for (const lead of leads) {
    leadsByStageMap[lead.stage] = (leadsByStageMap[lead.stage] || 0) + 1;
  }

  const leadsByStage = stages.map((stage) => ({
    stage: stage.slug,
    stageName: stage.name,
    count: leadsByStageMap[stage.slug] || 0,
    color: stage.color ?? null,
  }));

  const totalMessages = await db.select().from(generatedMessagesTable).where(
    eq(generatedMessagesTable.leadId, leadsTable.id)
  ).catch(() => []);

  const allLeadIds = leads.map((l) => l.id);

  let totalMessagesGenerated = 0;
  let totalMessagesSent = 0;

  if (allLeadIds.length > 0) {
    const msgs = await db.select().from(generatedMessagesTable);
    const relevantMsgs = msgs.filter((m) => allLeadIds.includes(m.leadId));
    totalMessagesGenerated = relevantMsgs.length;
    totalMessagesSent = relevantMsgs.filter((m) => m.status === "sent").length;
  }

  const metrics = {
    totalLeads: leads.length,
    leadsByStage,
    totalCampaigns: campaigns.length,
    totalMessagesGenerated,
    totalMessagesSent,
    recentLeads,
  };

  res.json(GetDashboardResponse.parse(metrics));
});

router.get("/workspaces/:workspaceId/activity", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = GetActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const query = GetActivityQueryParams.safeParse(req.query);
  const limit = query.success && query.data.limit ? query.data.limit : 20;

  const events = await db
    .select()
    .from(activityEventsTable)
    .where(eq(activityEventsTable.workspaceId, params.data.workspaceId))
    .orderBy(desc(activityEventsTable.createdAt))
    .limit(limit);

  res.json(events);
});

export default router;
