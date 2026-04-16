import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workspacesRouter from "./workspaces";
import leadsRouter from "./leads";
import campaignsRouter from "./campaigns";
import messagesRouter from "./messages";
import funnelStagesRouter from "./funnelStages";
import customFieldsRouter from "./customFields";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workspacesRouter);
router.use(leadsRouter);
router.use(campaignsRouter);
router.use(messagesRouter);
router.use(funnelStagesRouter);
router.use(customFieldsRouter);
router.use(dashboardRouter);

export default router;
