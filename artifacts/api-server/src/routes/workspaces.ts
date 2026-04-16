import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, workspacesTable, funnelStagesTable } from "@workspace/db";
import {
  CreateWorkspaceBody,
  GetWorkspaceParams,
  ListWorkspacesResponse,
  GetWorkspaceResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const DEFAULT_STAGES = [
  { name: "Base", slug: "base", order: 0, color: "#6B7280", requiredFields: [], isDefault: true },
  { name: "Lead Mapeado", slug: "lead-mapeado", order: 1, color: "#3B82F6", requiredFields: [], isDefault: true },
  { name: "Tentando Contato", slug: "tentando-contato", order: 2, color: "#F59E0B", requiredFields: [], isDefault: true },
  { name: "Conexão Iniciada", slug: "conexao-iniciada", order: 3, color: "#8B5CF6", requiredFields: [], isDefault: true },
  { name: "Desqualificado", slug: "desqualificado", order: 4, color: "#EF4444", requiredFields: [], isDefault: true },
  { name: "Qualificado", slug: "qualificado", order: 5, color: "#10B981", requiredFields: [], isDefault: true },
  { name: "Reunião Agendada", slug: "reuniao-agendada", order: 6, color: "#EC4899", requiredFields: [], isDefault: true },
];

router.get("/workspaces", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const workspaces = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.ownerId, userId));
  res.json(ListWorkspacesResponse.parse(workspaces));
});

router.post("/workspaces", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const parsed = CreateWorkspaceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [workspace] = await db
    .insert(workspacesTable)
    .values({ name: parsed.data.name, ownerId: userId })
    .returning();

  await db.insert(funnelStagesTable).values(
    DEFAULT_STAGES.map((s) => ({ ...s, workspaceId: workspace.id }))
  );

  res.status(201).json(GetWorkspaceResponse.parse(workspace));
});

router.get("/workspaces/:workspaceId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = GetWorkspaceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [workspace] = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.id, params.data.workspaceId));

  if (!workspace || workspace.ownerId !== userId) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  res.json(GetWorkspaceResponse.parse(workspace));
});

export default router;
