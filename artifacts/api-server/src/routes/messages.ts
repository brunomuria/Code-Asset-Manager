import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, generatedMessagesTable, leadsTable, campaignsTable, workspacesTable, activityEventsTable } from "@workspace/db";
import {
  GenerateMessagesBody,
  SendMessageBody,
  ListLeadMessagesParams,
  ListLeadMessagesQueryParams,
  GenerateMessagesParams,
  SendMessageParams,
  ListLeadMessagesResponse,
  GenerateMessagesResponse,
  SendMessageResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

async function checkWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
  const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));
  return !!ws && ws.ownerId === userId;
}

router.get("/workspaces/:workspaceId/leads/:leadId/messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = ListLeadMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const query = ListLeadMessagesQueryParams.safeParse(req.query);

  let messages = await db.select().from(generatedMessagesTable).where(eq(generatedMessagesTable.leadId, params.data.leadId));

  if (query.success && query.data.campaignId) {
    messages = messages.filter((m) => m.campaignId === query.data.campaignId);
  }

  res.json(ListLeadMessagesResponse.parse(messages));
});

router.post("/workspaces/:workspaceId/leads/:leadId/generate-messages", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = GenerateMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const body = GenerateMessagesBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, params.data.leadId), eq(leadsTable.workspaceId, params.data.workspaceId)));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const [campaign] = await db.select().from(campaignsTable).where(and(eq(campaignsTable.id, body.data.campaignId), eq(campaignsTable.workspaceId, params.data.workspaceId)));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const count = body.data.count ?? 3;
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

Generate ${count} personalized outreach messages for this lead based on the campaign context and instructions above. Each message should be distinct. Format your response as a JSON object with a "messages" array containing objects with a "content" field.
Example: {"messages": [{"content": "message 1"}, {"content": "message 2"}, {"content": "message 3"}]}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 8192,
  });

  const rawContent = completion.choices[0]?.message?.content || '{"messages": []}';
  let messageContents: Array<{ content: string }> = [];

  try {
    const parsed = JSON.parse(rawContent);
    if (Array.isArray(parsed)) {
      messageContents = parsed;
    } else if (parsed.messages && Array.isArray(parsed.messages)) {
      messageContents = parsed.messages;
    } else {
      const keys = Object.keys(parsed);
      for (const key of keys) {
        if (Array.isArray(parsed[key])) {
          messageContents = parsed[key];
          break;
        }
      }
    }
  } catch {
    messageContents = [{ content: rawContent }];
  }

  const insertedMessages = await db.insert(generatedMessagesTable).values(
    messageContents.slice(0, count).map((m) => ({
      leadId: lead.id,
      campaignId: campaign.id,
      content: m.content,
      status: "generated" as const,
    }))
  ).returning();

  await db.insert(activityEventsTable).values({
    leadId: lead.id,
    leadName: lead.name,
    workspaceId: params.data.workspaceId,
    eventType: "messages_generated",
    description: `${insertedMessages.length} messages generated for campaign "${campaign.name}"`,
  });

  res.json(GenerateMessagesResponse.parse(insertedMessages));
});

router.post("/workspaces/:workspaceId/leads/:leadId/send-message", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const body = SendMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [message] = await db.select().from(generatedMessagesTable).where(and(eq(generatedMessagesTable.id, body.data.messageId), eq(generatedMessagesTable.leadId, params.data.leadId)));
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  await db.update(generatedMessagesTable).set({ status: "sent", sentAt: new Date() }).where(eq(generatedMessagesTable.id, body.data.messageId));

  const [lead] = await db.update(leadsTable).set({ stage: "tentando-contato", updatedAt: new Date() }).where(and(eq(leadsTable.id, params.data.leadId), eq(leadsTable.workspaceId, params.data.workspaceId))).returning();

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  await db.insert(activityEventsTable).values({
    leadId: lead.id,
    leadName: lead.name,
    workspaceId: params.data.workspaceId,
    eventType: "message_sent",
    description: `Message sent to "${lead.name}" — lead moved to "Tentando Contato"`,
  });

  res.json(SendMessageResponse.parse(lead));
});

export default router;
