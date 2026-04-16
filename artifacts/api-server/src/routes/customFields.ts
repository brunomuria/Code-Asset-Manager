import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, customFieldsTable, workspacesTable } from "@workspace/db";
import {
  CreateCustomFieldBody,
  ListCustomFieldsParams,
  CreateCustomFieldParams,
  DeleteCustomFieldParams,
  ListCustomFieldsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function checkWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
  const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId));
  return !!ws && ws.ownerId === userId;
}

router.get("/workspaces/:workspaceId/custom-fields", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = ListCustomFieldsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const fields = await db
    .select()
    .from(customFieldsTable)
    .where(eq(customFieldsTable.workspaceId, params.data.workspaceId));

  res.json(ListCustomFieldsResponse.parse(fields));
});

router.post("/workspaces/:workspaceId/custom-fields", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = CreateCustomFieldParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const body = CreateCustomFieldBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const slug = body.data.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const [field] = await db.insert(customFieldsTable).values({
    workspaceId: params.data.workspaceId,
    name: body.data.name,
    slug,
    fieldType: body.data.fieldType,
    options: body.data.options ?? null,
  }).returning();

  res.status(201).json(field);
});

router.delete("/workspaces/:workspaceId/custom-fields/:fieldId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const params = DeleteCustomFieldParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await checkWorkspaceAccess(params.data.workspaceId, userId))) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  await db
    .delete(customFieldsTable)
    .where(and(eq(customFieldsTable.id, params.data.fieldId), eq(customFieldsTable.workspaceId, params.data.workspaceId)));

  res.sendStatus(204);
});

export default router;
