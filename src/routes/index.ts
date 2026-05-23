import { Router } from "express";
import authRoutes from "@/routes/auth.routes";
import knowledgeBaseRoutes from "@/routes/knowledgebase.routes";
import aiRoutes from "@/routes/ai.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/ai", aiRoutes);
router.use("/knowledgebase", knowledgeBaseRoutes);

export default router;