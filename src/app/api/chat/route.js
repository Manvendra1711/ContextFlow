import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { threads, messages as dbMessages } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
  try {
    const { messages, threadId, parentThreadId, branchMessageId, branchedText } = await req.json();
    
    // Read API key from server environment
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let model;
    
    // Automatically select provider based on available keys (prioritize OpenRouter)
    if (openrouterKey) {
      const openrouter = createOpenRouter({ apiKey: openrouterKey });
      // Use :free suffix models to avoid credit issues
      model = openrouter(process.env.OPENROUTER_MODEL || 'openrouter/free');
    } else if (googleKey) {
      const google = createGoogleGenerativeAI({ apiKey: googleKey });
      model = google(process.env.GEMINI_MODEL || 'gemini-2.5-flash');
    } else if (openaiKey) {
      const openai = createOpenAI({ apiKey: openaiKey });
      model = openai('gpt-4o-mini');
    } else if (anthropicKey) {
      const anthropic = createAnthropic({ apiKey: anthropicKey });
      model = anthropic('claude-3-5-sonnet-20240620');
    } else {
      return new Response('No AI API keys configured on the server. Please add a key to your .env.local file.', { status: 500 });
    }

    // Handle Thread Creation/Updating in memory
    if (threadId && !threads.has(threadId)) {
      threads.set(threadId, {
        id: threadId,
        parentThreadId: parentThreadId || null,
        branchMessageId: branchMessageId || null,
        branchedText: branchedText || null,
        createdAt: Date.now()
      });
    }

    const extractText = (m) => m.parts ? m.parts.filter(p => p.type === 'text').map(p => p.text).join('') : m.content || '';

    // Save the incoming user message
    const lastUserMessage = messages[messages.length - 1];
    dbMessages.set(lastUserMessage.id, {
      id: lastUserMessage.id,
      threadId: threadId,
      role: 'user',
      content: extractText(lastUserMessage),
      createdAt: Date.now()
    });

    // --- CONTEXT MERGING LOGIC ---
    let systemPrompt = "You are a helpful AI assistant. Always be concise.";
    let contextMessages = [];

    // If this thread has a parent, fetch the history!
    const currentThread = threads.get(threadId);
    if (currentThread && currentThread.parentThreadId) {
       const parentMessages = Array.from(dbMessages.values())
          .filter(m => m.threadId === currentThread.parentThreadId)
          .sort((a, b) => a.createdAt - b.createdAt);
       
       // Find the branch point
       const branchIndex = parentMessages.findIndex(m => m.id === currentThread.branchMessageId);
       
       if (branchIndex !== -1) {
          // Slice the history up to the branch point
          const slicedHistory = parentMessages.slice(0, branchIndex + 1);
          
          systemPrompt += "\n\n[CONTEXT: You are in a branched thread. Below is the history of the conversation before this branch occurred:]\n";
          
          slicedHistory.forEach(m => {
             systemPrompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n\n`;
          });

          if (branchedText) {
             systemPrompt += `[CONTEXT NOTE: The user specifically highlighted this part of your last answer to ask a follow-up question: "${branchedText}"]\n`;
          }
       }
    }

    // Strip UIMessage properties and convert to strict CoreMessages
    const coreMessages = messages.map(m => ({
      role: m.role,
      content: extractText(m)
    }));
    
    console.log("Sending request to:", openrouterKey ? 'OpenRouter' : googleKey ? 'Gemini' : 'OpenAI');

    // Stream the text response
    const result = streamText({
      model: model,
      messages: coreMessages,
      system: systemPrompt,
      maxTokens: 4096,
      async onFinish({ text, toolCalls, toolResults, finishReason, usage }) {
        // Save AI response to our in-memory DB when finished
        const aiMessageId = uuidv4();
        dbMessages.set(aiMessageId, {
          id: aiMessageId,
          threadId: threadId,
          role: 'assistant',
          content: text,
          createdAt: Date.now()
        });
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(error.message || 'Internal Server Error', { status: 500 });
  }
}
