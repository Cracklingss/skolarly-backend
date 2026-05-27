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
    console.log(req);
  try {
    // MULTIPART FORM DATA VALUES ARE STRINGS
    const question = req.body.question;

    // SAFELY PARSE HISTORY
    let history = [];

    try {
      history = JSON.parse(req.body.history || "[]");
    } catch (error) {
      console.error("Failed to parse history:", error);

      return res.status(400).json({
        success: false,
        message: "Invalid history format",
      });
    }

    console.log("QUESTION:", question);
    console.log("HISTORY:", history);
    console.log("FILE:", req.file);

    // NO FILE UPLOADED
    if (!req.file) {
      const result = await AskAIService(
        question,
        history,
        "No File Upload"
      );

      return res.status(result.code).json(result);
    }

    // EXTRACT FILE TEXT
    const extractedText = await extractText(req.file.path);

    // ASK AI
    const result = await AskAIService(
      question,
      history,
      extractedText
    );

    return res.status(result.code).json(result);

  } catch (error) {
    console.error("ASK CONTROLLER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });
  }
};

  public lessonExplainer = async (req: Request, res: Response) => {
    const { title, content } = req.body;
    if (!req.file) {

      const result = await LessonExplainerService(title + content);

      return res.status(result.code).json(result);
    }

    const extractedText = await extractText(req.file.path);

    const result = await LessonExplainerService(title + content + extractedText);

    return res.status(result.code).json(result);
  };

  public quizGenerator = async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        message: "File upload not found!",
      });
    }
    const { difficulty, quizType, generateAnswerKey } =
      req.body;
    console.log(req.body);

    const extractedText = await extractText(req.file.path);

    const result = await QuizGeneratorService(
      extractedText,
      difficulty,
      quizType,
      generateAnswerKey,
    );

    return res.status(result.code).json(result);
  };
}
