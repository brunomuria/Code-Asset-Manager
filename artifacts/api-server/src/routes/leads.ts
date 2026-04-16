import { Router, type IRouter } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db, leadsTable, workspacesTable, funnelStagesTable, activityEventsTable, campaignsTable, generatedMessagesTable } from "@workspace/db";
import {
  CreateLeadBody,
  UpdateLeadBody,
  ListLeadsParams,
  ListLeadsQueryParams,
  CreateLeadParams,
  GetLeadParams,
  UpdateLeadParams,
  DeleteLeadParams,
  ListLeadsResponse,
  GetLeadResponse,
  UpdateLeadResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

async function checkWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
  const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));
  return !!ws && ws.ownerId === userId;
}

async function logActivity(leadId: string, leadName: string, workspaceId: string, eventType: string, description: string): Promise<void> {
  await db.insert(activityEventsTable).values({ leadId, leadName, workspaceId, eventType, description });
}

async function triggerAutoMessageGeneration(lead: { id: string; name: string; workspaceId: string; stage: string; company?: string | null; role?: string | null; email?: string | null; phone?: string | null; notes?: string | null; source?: string | null; customFieldValues?: unknown }): Promise<void> {
  try {
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .where(and(
        eq(campaignsTable.workspaceId, lead.workspaceId),
        eq(campaignsTable.triggerStage, lead.stage),
        eq(campaignsTable.isActive, true)
      ));

    for (const campaign of campaigns) {
      const prompt = `Campaign Context: ${campaign.context}

Instructions: ${campaign.promptInstructions}

Lead Information:
- Name: ${lead.name}
- Company: ${lead.company || "N/A"}
- Role: ${lead.role || "N/A"}
- Email: ${lead.email || "N/A"}
- Phone: ${lead.phone || "N/A"}
- Notes: ${lead.notes || "N/A"}
- Source: ${lead.source || "N/A"}
- Custom Fields: ${JSON.stringify(lead.customFieldValues || {})}

Generate 3 personalized outreach messages for this lead. Format as JSON array with "content" field for each message.
Response format: [{"content": "message 1"}, {"content": "message 2"}, {"content": "message 3"}]`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });

      const rawContent = completion.choices[0]?.message?.content || "{}";
      let messages: Array<{ content: string }> = [];

      try {
        const parsed = JSON.parse(rawContent);
        if (Array.isArray(parsed)) {
          messages = parsed;
        } else if (parsed.messages && Array.isArray(parsed.messages)) {
          messages = parsed.messages;
        } else {
          const keys = Object.keys(parsed);
          for (const key of keys) {
            if (Array.isArray(parsed[key])) {
              messages = parsed[key];
              break;
            }
          }
        }
      } catch {
        continue;
      }

      if (messages.length > 0) {
        await db.insert(generatedMessagesTable).values(
          messages.map((m: { content: string }) => ({
            leadId: lead.id,
            campaignId: campaign.id,
            content: m.content,
            status: "generated" as const,
          }))
        );
      }
    }
  } catch (err) {
    // Background process - don't fail the main request
  }
}

router.get("/workspaces/:workspaceId/leads", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = ListLeadsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const query = ListLeadsQueryParams.safeParse(req.query);

  let leads = await db.select().from(leadsTable).where(eq(leadsTable.workspaceId, params.data.workspaceId));

  if (query.success) {
    if (query.data.stage) {
      leads = leads.filter((l) => l.stage === query.data.stage);
    }
    if (query.data.assigneeId) {
      leads = leads.filter((l) => l.assigneeId === query.data.assigneeId);
    }
    if (query.data.search) {
      const s = query.data.search.toLowerCase();
      leads = leads.filter((l) =>
        l.name.toLowerCase().includes(s) ||
        (l.company?.toLowerCase() || "").includes(s) ||
        (l.email?.toLowerCase() || "").includes(s)
      );
    }
  }

  res.json(ListLeadsResponse.parse(leads));
});

router.post("/workspaces/:workspaceId/leads", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = CreateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const body = CreateLeadBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const stage = body.data.stage || "base";

  if (stage !== "base") {
    const stages = await db.select().from(funnelStagesTable).where(eq(funnelStagesTable.workspaceId, params.data.workspaceId));
    const targetStage = stages.find((s) => s.slug === stage);
    if (targetStage && targetStage.requiredFields.length > 0) {
      const leadData = body.data as Record<string, unknown>;
      const missing = targetStage.requiredFields.filter((f) => !leadData[f]);
      if (missing.length > 0) {
        res.status(422).json({ error: "Required fields missing for this stage", missingFields: missing });
        return;
      }
    }
  }

  const [lead] = await db.insert(leadsTable).values({
    workspaceId: params.data.workspaceId,
    name: body.data.name,
    email: body.data.email ?? null,
    phone: body.data.phone ?? null,
    company: body.data.company ?? null,
    role: body.data.role ?? null,
    source: body.data.source ?? null,
    notes: body.data.notes ?? null,
    stage,
    assigneeId: body.data.assigneeId ?? null,
    customFieldValues: (body.data.customFieldValues as Record<string, unknown>) || {},
  }).returning();

  await logActivity(lead.id, lead.name, params.data.workspaceId, "created", `Lead "${lead.name}" created in stage "${stage}"`);

  triggerAutoMessageGeneration({ ...lead, workspaceId: params.data.workspaceId });

  res.status(201).json(GetLeadResponse.parse(lead));
});

router.get("/workspaces/:workspaceId/leads/:leadId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(and(eq(leadsTable.id, params.data.leadId), eq(leadsTable.workspaceId, params.data.workspaceId)));

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(GetLeadResponse.parse(lead));
});

router.patch("/workspaces/:workspaceId/leads/:leadId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const body = UpdateLeadBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, params.data.leadId), eq(leadsTable.workspaceId, params.data.workspaceId)));
  if (!existing) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const newStage = body.data.stage;
  if (newStage && newStage !== existing.stage) {
    const stages = await db.select().from(funnelStagesTable).where(eq(funnelStagesTable.workspaceId, params.data.workspaceId));
    const targetStage = stages.find((s) => s.slug === newStage);
    if (targetStage && targetStage.requiredFields.length > 0) {
      const merged = { ...existing, ...body.data } as Record<string, unknown>;
      const missing = targetStage.requiredFields.filter((f) => {
        const val = merged[f];
        return val == null || val === "";
      });
      if (missing.length > 0) {
        res.status(422).json({ error: "Required fields missing for this stage", missingFields: missing });
        return;
      }
    }
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.name !== undefined) updateData.name = body.data.name;
  if (body.data.email !== undefined) updateData.email = body.data.email;
  if (body.data.phone !== undefined) updateData.phone = body.data.phone;
  if (body.data.company !== undefined) updateData.company = body.data.company;
  if (body.data.role !== undefined) updateData.role = body.data.role;
  if (body.data.source !== undefined) updateData.source = body.data.source;
  if (body.data.notes !== undefined) updateData.notes = body.data.notes;
  if (body.data.stage !== undefined) updateData.stage = body.data.stage;
  if (body.data.assigneeId !== undefined) updateData.assigneeId = body.data.assigneeId;
  if (body.data.customFieldValues !== undefined) updateData.customFieldValues = body.data.customFieldValues;
  updateData.updatedAt = new Date();

  const [lead] = await db.update(leadsTable).set(updateData).where(and(eq(leadsTable.id, params.data.leadId), eq(leadsTable.workspaceId, params.data.workspaceId))).returning();

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  if (newStage && newStage !== existing.stage) {
    await logActivity(lead.id, lead.name, params.data.workspaceId, "stage_changed", `Lead "${lead.name}" moved to "${newStage}"`);
    triggerAutoMessageGeneration({ ...lead, workspaceId: params.data.workspaceId });
  } else {
    await logActivity(lead.id, lead.name, params.data.workspaceId, "updated", `Lead "${lead.name}" updated`);
  }

  res.json(UpdateLeadResponse.parse(lead));
});

router.delete("/workspaces/:workspaceId/leads/:leadId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  await db.delete(leadsTable).where(and(eq(leadsTable.id, params.data.leadId), eq(leadsTable.workspaceId, params.data.workspaceId)));

  res.sendStatus(204);
});

export default router;
