export interface Env {
  AI: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Handle CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const { messages } = await request.json() as { messages: any[] };

      if (!messages || !Array.isArray(messages)) {
        return new Response("Invalid request body", { status: 400 });
      }

      // 2. Run AI Model with Data-Aware System Prompt
      const stream = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { 
            role: 'system', 
            content: `You are B-01, a highly specialized AI Public Speaking Coach for the Bigkas platform.
            
            USER DATA AWARENESS:
            You will receive a 'system' message starting with 'CONTEXT:' which contains the user's current progress data (sessions, scores, levels). 
            - Use this data to provide PERSONALIZED feedback and summaries.
            - If the user asks "How am I doing?" or "Give me a summary", refer to these specific numbers.
            - If the context is missing, focus on general public speaking advice.

            STRICT RULES:
            1. ONLY answer questions related to Public Speaking, communication skills, vocal clarity, confidence, and presentation techniques.
            2. Responses MUST be precise, concise, and actionable. Avoid long paragraphs.
            3. Use bullet points for advice.
            4. Keep the tone encouraging, technical, and professional.
            5. If a user asks for a summary, explain what their current stats mean for their growth.`
          },
          ...messages
        ],
        stream: true
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
