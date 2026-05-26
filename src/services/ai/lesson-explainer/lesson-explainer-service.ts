import { KnowledgeBaseRepository } from "@/repositories/knowledgebase.repository";
import { generateEmbedding, generateLessonExplanation } from "../core/gemini-service";

export async function LessonExplainerService(context: string) {
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
      knowledgebase += "Knowledge Base Info:\n" + relevantKB.map((k: any) => `Q: ${k.question}\nA: ${k.answer}`).join("\n\n") + "\n\n";
    }

    if (!knowledgebase) {
      knowledgebase = "No specific knowledge or blogs found in the database.";
    }

    const answer = await generateLessonExplanation(context, knowledgebase);

    return {
      code: 200,
      status: "success",
      data: {
        answer,
        sources: [
          ...relevantKB.map((k: any) => ({ type: "kb", title: k.question, distance: k.distance }))
        ]
      },
    };
  } catch (error) {
    console.error("AskAIService Error", error);
    return { code: 500, status: "error", message: "AI assistant is currently unavailable" };
  }
}