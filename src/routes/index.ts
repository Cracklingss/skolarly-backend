import { Router } from "express";
import authRoutes from "@/routes/auth.routes";
import aiRoutes from "@/routes/ai.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/ai", aiRoutes);

export default router;