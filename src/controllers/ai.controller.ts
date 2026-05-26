import { Request, Response } from "express";
import { AskAIService } from "@/services/ai/chat/ask-ai-service";
import { LessonExplainerService } from "@/services/ai/lesson-explainer/lesson-explainer-service";
import extractText from "../lib/file-upload-parser";

export class AIController {
  /**
   * Main RAG Chat Endpoint
   */
  public ask = async (req: Request, res: Response) => {
    const { question, history } = req.body;
    const result = await AskAIService(question, history);
    return res.status(result.code).json(result);
  };

  public lessonExplainer = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        const { title, content } = req.body;

        const result = await LessonExplainerService(title + content);

        return res.status(result.code).json(result);
      }

      const extractedText = await extractText(req.file.path);

      const result = await LessonExplainerService(extractedText);

      return res.status(result.code).json(result)
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to process lesson",
      });
    }
  };
}
