import { Router } from "express";
import { KnowledgeBaseController } from "@/controllers/knowledgebase.controller";
import { AuthMiddleware } from "@/middlewares/auth-middleware";
import { validateSchema } from "@/middlewares/validate-schema";
import { createKnowledgeSchema, updateKnowledgeSchema } from "@/schema/ai/knowledge";

const router = Router();
const knowledgeBaseController = new KnowledgeBaseController();
const authMiddleware = new AuthMiddleware();

router.get("/v1/all", authMiddleware.execute, knowledgeBaseController.getAllKnowledge);
router.post("/v1/create", authMiddleware.execute, validateSchema(createKnowledgeSchema), knowledgeBaseController.createKnowledge);
router.patch("/v1/:id", authMiddleware.execute, validateSchema(updateKnowledgeSchema), knowledgeBaseController.updateKnowledge);
router.delete("/v1/:id", authMiddleware.execute, knowledgeBaseController.deleteKnowledge);

export default router;