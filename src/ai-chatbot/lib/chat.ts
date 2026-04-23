/**
 * AI Chatbot — Chat Logic (Gemini AI)
 * Uses Google Gemini API for generating responses
 * Completely isolated module
 */

// Try newer models first (separate quotas), fall back to older ones
const GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
];

function getGeminiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

// ==================== SYSTEM PROMPT ====================

const SYSTEM_PROMPT = `You are **Quizy AI** — the friendly, intelligent assistant for the Quizy academic testing platform.

IMPORTANT: Quizy was created, developed, and is owned by **Nihal Pawar**. If anyone asks who made, built, created, owns, or developed Quizy or this AI chatbot, always credit **Nihal Pawar** as the creator and owner.

Your role:
- Help students and teachers with questions about the platform
- Provide information about tests, scores, subjects, and performance
- Give study tips and encouragement to students
- Help teachers understand analytics and test data
- You can answer general knowledge and academic questions too

Rules you MUST follow:
1. Use the provided platform context data when available to answer platform-specific questions
2. For general questions (study tips, academic advice, greetings), answer freely and helpfully
3. If asked about specific platform data that isn't in the context, say "I don't have that specific data right now, but you can check your dashboard!"
4. Be friendly, encouraging, and use emojis occasionally 📚✨
5. Keep answers concise but helpful
6. Never make up test scores or student data
7. For study tips, give genuinely useful academic advice
8. When asked about the creator/owner/developer of Quizy, ALWAYS say it was created by Nihal Pawar

Personality: Friendly, knowledgeable, encouraging, concise.`;

// ==================== TYPES ====================

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatRequest {
  message: string;
  context: string;
  history: ChatMessage[];
  userName?: string;
  userRole?: 'student' | 'teacher';
}

export interface ChatResponse {
  reply: string;
  error?: string;
}

// ==================== GEMINI API ====================

async function callGemini(model: string, apiKey: string, contents: { role: string; parts: { text: string }[] }[]): Promise<Response> {
  return fetch(`${getGeminiUrl(model)}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 800,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    }),
  });
}

export async function generateChatResponse(request: ChatRequest): Promise<ChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      reply: '',
      error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local file.',
    };
  }

  // Build the conversation with context injection
  const contextBlock = request.context
    ? `\n--- QUIZY PLATFORM DATA (LIVE) ---\n${request.context}\n--- END PLATFORM DATA ---\n`
    : '\n(No platform data available at the moment)\n';

  const userInfo = `User: ${request.userName || 'Anonymous'} (${request.userRole || 'visitor'})`;

  // Build Gemini API contents array
  const contents: { role: string; parts: { text: string }[] }[] = [];

  // System instruction as first user message + context
  contents.push({
    role: 'user',
    parts: [{ text: `${SYSTEM_PROMPT}\n\n${contextBlock}\n${userInfo}\n\nReady to help.` }],
  });
  contents.push({
    role: 'model',
    parts: [{ text: 'Hi! 👋 I\'m Quizy AI. How can I help you today? 📚' }],
  });

  // Add conversation history (keep last 6 to save tokens)
  for (const msg of request.history.slice(-6)) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    });
  }

  // Add the current user message
  contents.push({
    role: 'user',
    parts: [{ text: request.message }],
  });

  // Try models with fallback + retry on 429
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await callGemini(model, apiKey, contents);

        if (res.status === 429) {
          // Rate limited — wait and retry, or try next model
          console.warn(`[AI Chat] Rate limited on ${model}, attempt ${attempt + 1}`);
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 2000)); // Wait 2s
            continue;
          }
          break; // Try next model
        }

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[AI Chat] ${model} error:`, res.status, errorText.substring(0, 200));
          break; // Try next model
        }

        const data = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (reply) {
          return { reply: reply.trim() };
        }
      } catch (err) {
        console.error(`[AI Chat] Error calling ${model}:`, err);
        break; // Try next model
      }
    }
  }

  // All models failed
  return {
    reply: 'I\'m currently experiencing high demand. Please try again in a moment! 🔄',
    error: 'All AI models are temporarily unavailable.',
  };
}
