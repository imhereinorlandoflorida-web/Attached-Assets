import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionsRouter from "./sessions";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";
import openaiChatRouter from "./openai-chat";
import scoreRouter from "./score";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionsRouter);
router.use(dashboardRouter);
router.use(aiRouter);
router.use(openaiChatRouter);
router.use(scoreRouter);
router.use(feedbackRouter);

export default router;
