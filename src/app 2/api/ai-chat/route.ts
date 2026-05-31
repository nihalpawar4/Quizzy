/**
 * AI Chat API Route — /api/ai-chat
 * Handles chat requests with context from client-side
 * Context is fetched by the ChatWidget (client-side Firestore access)
 * This route ONLY calls Gemini — no Firestore access needed server-side
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse, type ChatMessage } from '@/ai-chatbot/lib/chat';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      context = '',
      history = [],
      userName,
      userRole,
    } = body as {
      message: string;
      context: string;
      history: ChatMessage[];
      userName?: string;
      userRole?: 'student' | 'teacher';
    };

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long. Max 2000 characters.' },
        { status: 400 }
      );
    }

    // Generate AI response (context already provided by client)
    const response = await generateChatResponse({
      message: message.trim(),
      context,
      history,
      userName,
      userRole,
    });

    if (response.error && !response.reply) {
      return NextResponse.json(
        { reply: 'Sorry, I\'m having trouble right now. Please try again in a moment! 🔄', error: response.error },
        { status: 200 }
      );
    }

    return NextResponse.json({
      reply: response.reply,
    });
  } catch (err) {
    console.error('[AI Chat API] Unexpected error:', err);
    return NextResponse.json(
      { reply: 'Oops! Something went wrong. Please try again! 🔄', error: 'Internal server error.' },
      { status: 200 }
    );
  }
}
