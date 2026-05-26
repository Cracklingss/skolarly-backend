import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { ENV } from "@/config/env";

const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY || "");
console.log(ENV.GEMINI_API_KEY);

const CHAT_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
];

const EMBEDDING_MODEL = "gemini-embedding-2";

/**
 * Utility to chunk text for embeddings.
 * If the text exceeds 2000 characters, it is split into chunks with a 200-character overlap.
 */
function chunkText(
  text: string,
  size: number = 2000,
  overlap: number = 200,
): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
    if (start >= text.length - overlap && start < text.length) break;
  }
  return chunks;
}

/**
 * Generate an embedding for a given text using Gemini.
 * Chunks long text and returns the averaged embedding.
 * @param text The input text to embed.
 * @returns An array of numbers representing the vector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const chunks = chunkText(text);
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  // Use gemini-embedding-2 which supports flexible output dimensions.
  // We specify 768 to match the existing database schema.
  const embedOptions = (t: string) => ({
    content: { parts: [{ text: t }], role: "user" },
    outputDimensionality: 768,
  });

  if (chunks.length === 1) {
    const result = await model.embedContent(embedOptions(chunks[0]));
    return result.embedding.values;
  }

  const results = await Promise.all(
    chunks.map((chunk) => model.embedContent(embedOptions(chunk))),
  );
  const embeddings = results.map((r) => r.embedding.values);

  // Average embeddings to maintain single-vector compatibility
  const dim = embeddings[0].length;
  const avg = new Array(dim).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      avg[i] += emb[i];
    }
  }
  return avg.map((v) => v / embeddings.length);
}

/**
 * Generate a chat response based on a prompt and provided context.
 * Falls back through available Gemini models sequentially.
 * @param prompt The user's question.
 * @param context The retrieved knowledge chunks.
 * @param history Optional chat history for conversational memory.
 * @returns The AI's response text.
 */
export async function generateChatResponse(
  prompt: string,
  context: string,
  history: Content[] = [],
): Promise<string> {
  const fullPrompt = `Context:\n${context}\n\nQuestion: ${prompt}`;
  let lastError: any;

  for (const modelName of CHAT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: `You are Skolarly, a friendly and knowledgeable AI study tutor. Your role is to help students learn effectively.

        Your capabilities:
        - Explain complex topics in simple terms
        - Answer questions about any subject
        - Help with homework and assignments
        - Provide study tips and learning strategies
        - Encourage and motivate students
        - Suggest resources for further learning

        Guidelines:
        - Be patient and encouraging
        - Use examples and analogies
        - Break down complex topics
        - Ask clarifying questions when needed
        - Celebrate student progress
        - Format responses with Markdown when helpful`,
      });

      // Limit history to last 6 messages to keep context concise but relevant
      const chat = model.startChat({
        history: history.slice(-6),
      });

      const result = await chat.sendMessage(fullPrompt);
      return result.response.text();
    } catch (error) {
      console.warn(`Model ${modelName} failed, falling back...`, error);
      lastError = error;
    }
  }

  throw new Error(
    `All Gemini models failed. Last error: ${lastError?.message || "Unknown error"}`,
  );
}

export async function generateLessonExplanation(text: string, knowledgebase: string) {
  let lastError: any;
  for (const modelName of CHAT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: `
You are an AI Lesson Explainer designed to help students understand academic topics clearly, simply, and effectively.

Your primary goal is to transform complex lessons, notes, documents, or topics into easy-to-understand explanations suited for the student’s level.

RULES:
1. Always teach, don’t just answer. Explain concepts clearly, including the why and how, not just definitions.
2. Break down complex ideas into smaller, easy-to-understand parts.
3. If the student’s level is not specified, assume a beginner (high school level).
4. Always structure your response in this format:
   Simple Definition:
   Detailed Explanation:
   Real-life Example:
   Key Takeaway:
5. Use simple language. Avoid unnecessary jargon. If technical terms are needed, define them immediately.
6. Use step-by-step explanations for processes, formulas, or problem-solving.
7. Use analogies and real-life examples when helpful.
8. Be concise but complete.
9. End with a short summary or key insight.

INPUT TYPES:
- Topic (e.g. "Photosynthesis")
- Question (e.g. "How does gravity work?")
- Notes or document content (PDF, Word, PPT text)
- Unstructured or messy information

CONSTRAINTS:
- Do not hallucinate or invent facts. If unsure, say you are not certain.
- Do not provide overly advanced explanations unless requested.
- Do not only define terms—always explain them in context.

OUTPUT FORMAT:
Simple Definition:
Detailed Explanation:
Real-life Example:
Key Takeaway:
`
      });

      const result = await model.generateContent(`Lesson Content: ${text} \n\n Context: ${knowledgebase}`);

      return result.response.text();
    } catch (error) {
      console.warn(`Model ${modelName} failed, falling back...`, error);
      lastError = error;
    }
  }

  throw new Error(
    `All Gemini models failed. Last error: ${lastError?.message || "Unknown error"}`,
  );
}
