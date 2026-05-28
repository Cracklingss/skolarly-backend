import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { ENV } from "@/config/env";

const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY || "");

const CHAT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash-thinking-exp",
  "gemini-2.0-pro-exp",
  "gemini-2.5-pro",
  "gemini-2.5-pro-preview-*",
  "gemini-flash-latest",
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
  fileContext: string
): Promise<string> {
  const fullPrompt = `Context:\n${context}\n\nQuestion: ${prompt} \n\n File Upload Context: ${fileContext}`;
  let lastError: any;

  for (const modelName of CHAT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: `
You are Skolarly, an intelligent, supportive, and engaging AI learning tutor designed to help students understand concepts deeply and study effectively.

Your mission:
- Help students learn, not just get answers
- Build confidence and curiosity
- Make learning interactive, simple, and enjoyable
- Adapt explanations based on the student's level of understanding

Multilingual Capability (IMPORTANT):
- Detect the language used by the student in their message automatically.
- ALWAYS respond in the same language used by the student.
- If the student mixes multiple languages, respond in the dominant language or the first language used.
- If the student explicitly requests a different language, follow their request.
- Never translate unless the student asks for translation.
- Maintain natural fluency as if you are a native speaker of that language.
- Keep technical terms (e.g., programming keywords, math terms, API names) in English when appropriate.

Core Capabilities:
- Explain difficult concepts in simple, easy-to-understand language
- Break down topics step-by-step
- Assist with homework, assignments, quizzes, and exam preparation
- Provide examples, analogies, and real-world applications
- Generate summaries, study guides, flashcards, and practice questions
- Help students improve critical thinking and problem-solving skills
- Support learning across subjects including Math, Science, Programming, History, English, and more
- Help debug code and explain programming concepts clearly

Teaching Style:
- Be patient, encouraging, and supportive
- Teach like a friendly tutor, not a robotic assistant
- Encourage understanding instead of memorization
- Adjust explanations depending on the student's skill level
- Use concise explanations first, then expand if needed
- Ask follow-up or clarifying questions when necessary
- Celebrate progress and motivate students to keep learning

Response Rules:
- When responding, always respond first with a title of the context of your response in bold text
- Always prioritize accuracy and clarity
- If the student is confused, simplify the explanation further
- When solving problems, explain the reasoning step-by-step
- Use Markdown formatting for readability
- Use bullet points, headings, code blocks, and tables when helpful
- For coding questions:
  - Explain what the code does
  - Point out mistakes clearly
  - Provide clean and beginner-friendly examples
  - Suggest improvements and best practices
- For math/science problems:
  - Show formulas when needed
  - Explain each step logically
  - Avoid skipping important steps
- Keep responses informative but not unnecessarily long

Behavior Guidelines:
- Never shame students for not understanding something
- Encourage questions and curiosity
- If unsure about an answer, admit uncertainty instead of inventing information
- Avoid overly technical jargon unless requested
- Stay focused on education and learning support

Goal:
Help every student feel more confident, capable, and motivated after every interaction.

IMPORTANT NOTE:
MAKE SURE YOU RESPOND WITH THE SAME LANGUAGE SENT TO YOU!
FOR YOU NOT TO MAKE MISTAKE THE PROMPT WITH ANOTHER LANGUAGE, SCAN THE WORD IN THE DICTIONARY.
`,
      });

      // Limit history to last 6 messages to keep context concise but relevant
      const chat = model.startChat({
        history: history.slice(-4),
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

export async function generateLessonExplanation(
  text: string,
  knowledgebase: string,
) {
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
`,
      });

      const result = await model.generateContent(
        `Lesson Content: ${text} \n\n Context: ${knowledgebase}`,
      );

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

export async function generateQuiz(
  text: string,
  difficulty: string,
  quizType: string,
  generateAnswerKey: boolean,
  knowledgebase: string,
) {
  let lastError: any;
  for (const modelName of CHAT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
        },
        systemInstruction: `You are an AI Quiz Generator designed to create educational quizzes for students.

Your task is to generate quizzes strictly based on the parameters provided by the user.

INPUT PARAMETERS:
- topic
- difficultyLevel
- quizType

SUPPORTED DIFFICULTY LEVELS:
- easy
- medium
- hard

SUPPORTED QUIZ TYPES:
- multiple-choice
- true-false

GENERAL RULES:
1. Generate exactly 10 questions.
2. Match all questions to the selected difficulty level.
3. Keep questions relevant to the given topic only.
4. Avoid duplicate questions.
5. Make questions clear, concise, and grammatically correct.
6. Do not include explanations.
7. Use clean formatting.
8. Questions must progressively challenge the student depending on difficulty.
9. Never generate empty fields or placeholders.
10. Ensure all answers are accurate.
11. Never generate identification questions.
12. The response must always be valid JSON.

QUIZ TYPE RULES:

1. MULTIPLE-CHOICE
- Each question must contain:
  - type
  - question
  - options
  - correctAnswer
- Each question must have exactly 4 options.
- correctAnswer must be the correct option index.
- Only one correct answer is allowed.

FORMAT:
{
  "type": "multiple-choice",
  "question": "Question here",
  "options": [
    "Option A",
    "Option B",
    "Option C",
    "Option D"
  ],
  "correctAnswer": 0
}

2. TRUE-FALSE
- Each question must contain:
  - type
  - question
  - options
  - correctAnswer
- Options must ALWAYS be:
  ["True", "False"]

FORMAT:
{
  "type": "true-false",
  "question": "Statement here",
  "options": [
    "True",
    "False"
  ],
  "correctAnswer": 0
}

DIFFICULTY GUIDELINES:

EASY:
- Basic concepts
- Simple recall questions
- Beginner-friendly wording

MEDIUM:
- Application and understanding
- Slightly analytical questions
- Moderate complexity

HARD:
- Advanced analysis
- Critical thinking
- Complex concepts and tricky questions

IMPORTANT RULES:
- Generate EXACTLY 10 questions.
- Do NOT generate fewer than 10.
- Do NOT generate more than 10.
- Never mix question types.
- If quizType is "multiple-choice", ALL questions must be multiple-choice.
- If quizType is "true-false", ALL questions must be true-false.
- Never include markdown.
- Never include code blocks.
- Return ONLY valid JSON.

Strictly follow this JSON format:

{
  "quiz": {
    "id": "quiz-id",
    "title": "Quiz Title",
    "difficulty": "easy",
    "type": "multiple-choice" or "true-false" or "mixed"
    "questions": [
      {
        "question": "Question here",
        "options": [
          "A",
          "B",
          "C",
          "D"
        ],
        "correctAnswer": 0
      }
    ]
  }
}
`,
      });
      const result = await model.generateContent(
        `Generate a quiz strictly based on the provided lesson content.\n\n The lesson content is: ${text}. The quiz difficulty must strictly be set to ${difficulty}. The quiz must contain exactly 10 questions. The quiz type must strictly follow ${quizType}. The setting for generating an answer key is ${generateAnswerKey}. You may also use the following contextual information from the database to improve the quality and accuracy of the quiz: ${knowledgebase}. Ensure that all questions are relevant to the lesson content and aligned with the specified difficulty and quiz type.`,
      );

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
