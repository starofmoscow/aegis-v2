// ============================================================
// EE AEGIS V2.0 — Chat API Route (Streaming)
// POST /api/chat — Multi-provider AI orchestration with SSE
// ============================================================

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { orchestrate, checkProviderAvailability } from '@/lib/ai/orchestrator';
import type { AIMessage, AIProvider } from '@/types';

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1),
  })),
  provider: z.string().optional(),
  taskType: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { messages, provider, taskType } = parsed.data;

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = orchestrate(
            messages as AIMessage[],
            taskType as any,
            provider as AIProvider | undefined,
          );

          for await (const chunk of generator) {
            const data = JSON.stringify({
              content: chunk.content,
              provider: chunk.provider,
              model: chunk.model,
              done: chunk.done,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          const errorData = JSON.stringify({
            error: error.message || 'AI provider error',
            done: true,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET /api/chat — Return available providers
export async function GET() {
  const availability = checkProviderAvailability();
  return Response.json({ providers: availability });
}
