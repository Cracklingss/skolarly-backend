import { Request, Response } from "express";
import { AskAIService } from "@/services/ai/chat/ask-ai-service";
import { LessonExplainerService } from "@/services/ai/lesson-explainer/lesson-explainer-service";
import { QuizGeneratorService } from "@/services/ai/quiz-generator/quiz-generator-service";
import extractText from "../lib/file-upload-parser";
import { number } from "zod";
import { generate } from "officeparser";

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

      return res.status(result.code).json(result);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to process lesson",
      });
    }
  };

  public quizGenerator = async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "File upload not found!",
        });
      }
      const { difficulty, numberOfQuestions, quizType, generateAnswerKey } =
        req.body;
        console.log(req.body);

      const extractedText = await extractText(req.file.path);

      const result = await QuizGeneratorService(extractedText, difficulty,numberOfQuestions, quizType, generateAnswerKey);

      return res.status(result.code).json(result);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to process lesson",
      });
    }
  };
}
