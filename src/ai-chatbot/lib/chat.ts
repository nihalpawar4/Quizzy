/**
 * AI Chatbot — Chat Logic (Gemini AI + Offline Fallback)
 * Uses Google Gemini API for generating responses
 * Falls back to built-in knowledge when API is unavailable
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

// ==================== OFFLINE FALLBACK ====================
// Built-in knowledge base — used when ALL Gemini models are unavailable

const FALLBACK_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ['hello', 'hi', 'hey', 'howdy', 'greetings', 'good morning', 'good evening', 'good afternoon'],
    response: "Hey there! 👋 I'm Quizy AI, your study buddy. I can help you with study tips, platform info, and more. What would you like to know? 📚",
  },
  {
    keywords: ['who made', 'who created', 'who built', 'who owns', 'creator', 'owner', 'developer', 'founded', 'ownership'],
    response: "Quizy was created and is owned by **Nihal Pawar** ✨ He built this entire platform to help students excel in their academics! 🚀",
  },
  {
    keywords: ['what is quizy', 'about quizy', 'tell me about', 'what does quizy do', 'explain quizy'],
    response: "Quizy is an academic testing platform for students of Class 5-10! 📚 It features:\n\n- **Interactive Tests** with multiple question types\n- **Real-time Progress Tracking** 📊\n- **AI-Powered Assistance** (that's me! 🤖)\n- **Teacher Dashboard** for analytics\n- **Study Materials** and notes\n- **Community Q&A Forum**\n\nCreated by **Nihal Pawar** to make learning fun and effective! ✨",
  },
  {
    keywords: ['study tips', 'how to study', 'study advice', 'exam tips', 'prepare for exam'],
    response: "Here are some proven study tips! 📖✨\n\n1. **Active Recall** — Test yourself instead of just reading\n2. **Spaced Repetition** — Review material at increasing intervals\n3. **Pomodoro Technique** — 25 min study + 5 min break 🍅\n4. **Teach Someone** — Explaining helps you understand deeply\n5. **Practice Problems** — Use Quizy tests to practice!\n6. **Sleep Well** — Your brain consolidates memory during sleep 😴\n7. **Stay Hydrated** — Drink water, it helps focus 💧\n\nConsistency beats intensity. A little every day goes a long way! 💪",
  },
  {
    keywords: ['math', 'mathematics', 'algebra', 'geometry', 'calculus'],
    response: "Math tips! ➕✨\n\n- **Practice daily** — even 15 minutes helps build confidence\n- **Understand formulas** — don't just memorize, understand WHY they work\n- **Draw diagrams** for geometry problems 📐\n- **Check your work** by substituting answers back\n- **Start with easier problems**, then build up difficulty\n\nMath is like a muscle — the more you exercise it, the stronger it gets! 💪📊",
  },
  {
    keywords: ['science', 'physics', 'chemistry', 'biology'],
    response: "Science study tips! 🔬✨\n\n- **Visualize concepts** — draw diagrams, watch animations\n- **Connect theory to real life** — why does ice float? Why is sky blue?\n- **Practice numerical problems** step by step\n- **Make flashcards** for important definitions and reactions\n- **Do experiments** when possible — hands-on learning sticks!\n\nStay curious — that's what science is all about! 🧪🌟",
  },
  {
    keywords: ['english', 'grammar', 'writing', 'essay', 'reading'],
    response: "English tips! ✍️📚\n\n- **Read daily** — novels, newspapers, anything! It builds vocabulary\n- **Write regularly** — even a short diary entry helps\n- **Learn 5 new words daily** and use them in sentences\n- **Practice grammar** with exercises\n- **Read your work aloud** — you'll catch errors easily\n\nLanguage is a skill that improves with practice! Keep reading and writing! 📖✨",
  },
  {
    keywords: ['test', 'tests', 'quiz', 'exam', 'available test', 'upcoming test'],
    response: "You can find all available tests on your **Student Dashboard** 📝\n\n- Tests are organized by **subject** and **class**\n- Your teacher creates and assigns tests for your class\n- You'll get **notifications** when new tests are available 🔔\n- After completing a test, you get **instant results** with detailed analytics!\n\nHead to your dashboard to see what's waiting for you! 🚀",
  },
  {
    keywords: ['performance', 'score', 'result', 'how am i doing', 'progress', 'performing'],
    response: "Check your performance on your **Dashboard**! 📊\n\n- **Test Results** — see scores for each test\n- **Average Score** — track your overall performance\n- **Subject-wise Analysis** — find your strengths and weak areas\n- **Progress Trends** — see how you're improving over time 📈\n\nSign in and visit your dashboard for the latest stats! Keep pushing forward! 💪✨",
  },
  {
    keywords: ['register', 'sign up', 'create account', 'join', 'get started'],
    response: "Joining Quizy is easy and **free**! 🎉\n\n1. Go to the **Sign Up** page\n2. Enter your name, email, and password\n3. Select your role (Student/Teacher) and class\n4. You're in! Start taking tests right away! 🚀\n\nIt takes less than a minute. Welcome to the Quizy family! 🎓✨",
  },
  {
    keywords: ['feature', 'features', 'what can', 'capabilities'],
    response: "Quizy is packed with features! 🚀\n\n📝 **Interactive Tests** — MCQ, True/False, Fill in Blanks & more\n📊 **Real-time Analytics** — track your progress instantly\n🤖 **AI Assistant** — that's me! Always here to help\n💬 **Community Q&A** — ask and answer questions\n📚 **Study Materials** — access notes from teachers\n🔔 **Notifications** — never miss a test or update\n🏆 **Leaderboards** — compete with classmates\n\nAll built with ❤️ by **Nihal Pawar**!",
  },
  {
    keywords: ['help', 'support', 'contact', 'issue', 'problem', 'bug'],
    response: "Need help? Here's what you can do:\n\n1. **Check your Dashboard** for the latest info\n2. **Ask me** — I can answer most questions! 🤖\n3. **Community Q&A** — post your question on the forum\n4. **Contact Support** — use the contact form on the landing page\n\nI'm here to help you succeed! What specific issue can I help with? 💪",
  },
  {
    keywords: ['thank', 'thanks', 'thank you', 'thx', 'appreciate'],
    response: "You're welcome! 😊 Happy to help! If you need anything else, just ask. Good luck with your studies! 📚✨💪",
  },
  {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'quit'],
    response: "Goodbye! 👋 Good luck with your studies — you've got this! Come back anytime you need help. See you soon! 🌟📚",
  },
];

function getOfflineResponse(message: string): string {
  const msg = message.toLowerCase().trim();

  // Check keyword matches
  for (const entry of FALLBACK_RESPONSES) {
    if (entry.keywords.some((kw) => msg.includes(kw))) {
      return entry.response;
    }
  }

  // Default fallback
  return "I'm here to help! 😊 You can ask me about:\n\n📚 **Study tips** for any subject\n📝 **Tests & scores** on Quizy\n🎓 **How Quizy works**\n💡 **Academic advice**\n\nJust type your question and I'll do my best to answer! ✨";
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
    // No API key — use offline fallback
    return { reply: getOfflineResponse(request.message) };
  }

  // Build the conversation with context injection
  const contextBlock = request.context
    ? `\n--- QUIZY PLATFORM DATA (LIVE) ---\n${request.context}\n--- END PLATFORM DATA ---\n`
    : '\n(No platform data available at the moment)\n';

  const userInfo = `User: ${request.userName || 'Anonymous'} (${request.userRole || 'visitor'})`;

  // Build Gemini API contents array
  const contents: { role: string; parts: { text: string }[] }[] = [];

  // System instruction + context
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
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          break; // Try next model
        }

        if (!res.ok) {
          break; // Try next model
        }

        const data = await res.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (reply) {
          return { reply: reply.trim() };
        }
      } catch {
        break; // Try next model
      }
    }
  }

  // ALL models failed — use offline fallback (never show error to user)
  return { reply: getOfflineResponse(request.message) };
}
