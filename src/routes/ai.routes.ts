import { Router } from "express";
import { AIController } from "@/controllers/ai.controller";
import { validateSchema } from "@/middlewares/validate-schema";
import { askSchema } from "@/schema/ai/chat.schema";
import { upload } from "@/middlewares/upload-middleware";

const router = Router();
const aiController = new AIController();

// Public route for portfolio visitors to ask questions
router.post("/v1/ask", validateSchema(askSchema), aiController.ask);
router.post("/v1/lesson-explainer", upload.single("file"), aiController.lessonExplainer);
router.post("/v1/quiz-generator", upload.single("file"), aiController.quizGenerator);

export default router;