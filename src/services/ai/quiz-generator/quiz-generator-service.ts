import { KnowledgeBaseRepository } from "@/repositories/knowledgebase.repository";
import { generateEmbedding, generateQuiz } from "../core/gemini-service";

export async function QuizGeneratorService(
  context: string,
  difficulty: string,
  quizType: string,
  generateAnswerKey: boolean,
) {
  const knowledgeBaseRepository = new KnowledgeBaseRepository();

  try {
    // 1. Generate embedding for the question
    const embedding = await generateEmbedding(context);
    const vectorStr = `[${embedding.join(",")}]`;

    // 2. Search for similar context in both repositories
    const [relevantKB] = await Promise.all([
      knowledgeBaseRepository.searchSimilar(vectorStr, 3),
    ]);

    // 3. Format combined context
    let knowledgebase = "";

    if (relevantKB.length > 0) {
      knowledgebase +=
        "Knowledge Base Info:\n" +
        relevantKB
          .map((k: any) => `Q: ${k.question}\nA: ${k.answer}`)
          .join("\n\n") +
        "\n\n";
    }

    if (!knowledgebase) {
      knowledgebase = "No specific knowledge or blogs found in the database.";
    }

    const raw = await generateQuiz(
      context,
      difficulty,
      quizType,
      generateAnswerKey,
      knowledgebase,
    );

    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const quiz = JSON.parse(cleaned);

    return {
      code: 200,
      status: "success",
      data: {
        quiz,
        sources: [
          ...relevantKB.map((k: any) => ({
            type: "kb",
            title: k.question,
            distance: k.distance,
          })),
        ],
      },
    };
  } catch (error) {
    console.error("AskAIService Error", error);
    return {
      code: 500,
      status: "error",
      message: "AI assistant is currently unavailable",
    };
  }
}
