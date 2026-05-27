import { Router } from "express";
import { AIController } from "@/controllers/ai.controller";
import { validateSchema } from "@/middlewares/validate-schema";
import { askSchema } from "@/schema/ai/chat.schema";
import { upload } from "@/middlewares/upload-middleware";
import { AuthMiddleware } from "@/middlewares/auth-middleware";

const router = Router();
const aiController = new AIController();
const authMiddleware = new AuthMiddleware();

// Public route for portfolio visitors to ask questions
router.post("/v1/ask", authMiddleware.execute, upload.single("file"), aiController.ask);
router.post("/v1/lesson-explainer", authMiddleware.execute, upload.single("file"), aiController.lessonExplainer);
router.post("/v1/quiz-generator", authMiddleware.execute, upload.single("file"), aiController.quizGenerator);

export default router;