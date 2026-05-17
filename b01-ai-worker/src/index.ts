export interface Env {
  AI: any;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...init.headers,
    },
  });
}

function corsResponse(response: Response) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return jsonResponse({
        ok: true,
        service: "b01-ai-worker",
        status: "online",
      });
    }

    // --- ROUTE: /banner-message (Dynamic Greetings) ---
    if (url.pathname === "/banner-message" && request.method === "POST") {
      try {
        const { context } = await request.json() as { context: any };
        
        const prompt = `You are B-01, an AI speaking coach for students in Dasmariñas, Cavite. 
        Generate a short, enthusiastic greeting for the user's dashboard.
        
        User Progress Context:
        ${JSON.stringify(context)}
        
        Tone: Friendly, encouraging, and relatable to a student in Cavite. 
        Requirements:
        1. Be extremely concise (10-15 words max).
        2. Mention a specific stat if relevant (e.g. "Improved by 5%!" or "3-day streak!").
        3. Use simple, clear English.
        4. Do NOT use hashtags or emojis.
        5. IMPORTANT: Do NOT include quotation marks in the output. Just the plain text message.
        
        Output only the message text.`;

        const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { role: "system", content: "You are a helpful dashboard assistant for students in Dasmariñas, Cavite." },
            { role: "user", content: prompt }
          ]
        });

        return jsonResponse({
          message: response.response.trim().replace(/^"|"$/g, ''),
        });
      } catch (e: any) {
        return jsonResponse({ error: e.message }, { status: 500 });
      }
    }

    // --- ROUTE: /random-topic (Dynamic Practice Topics) ---
    if (url.pathname === "/random-topic") {
      try {
        const prompt = `Generate a super casual, "slice-of-life" public speaking topic for a student in Dasmariñas, Cavite (SHS/College).
        
        Tone: Very friendly, informal, and grounded. 
        Think: "TikTok storytime," "vlog topic," or "chatting with a friend."
        
        Requirements:
        1. Topics must be about things students see, hear, do, or think about daily in Dasmariñas/Cavite (e.g., traffic in Aguinaldo Highway, SM Dasma hangouts, Kadiwa market, local campus life, or Cavite weather).
        2. Titles should be catchy and informal (e.g., "The Aguinaldo Highway Struggle," "SM Dasma vs Robinson's," "Why I Love/Hate Cavite Traffic").
        3. Provide a title and a 1-sentence instruction that is supportive and low-pressure.
        4. Return ONLY a JSON object: {"title": "...", "body": "..."}`;

        const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { role: "system", content: "You are a friendly, relatable vlog-style topic generator for students in Dasmariñas, Cavite. Output only valid JSON." },
            { role: "user", content: prompt }
          ]
        });

        let finalData;
        try {
          const rawText = response.response;
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          finalData = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse topic" };
        } catch (e) {
          finalData = { error: "Topic generation failed" };
        }

        return jsonResponse(finalData);
      } catch (e: any) {
        return jsonResponse({ error: e.message }, { status: 500 });
      }
    }

    // --- ROUTE: /transcribe (Used by Python Backend) ---
    if (url.pathname === "/transcribe" && request.method === "POST") {
      try {
        const audioBlob = await request.arrayBuffer();
        
        // 1. Speech-to-Text using Whisper
        const whisperResponse = await env.AI.run("@cf/openai/whisper", {
          audio: [...new Uint8Array(audioBlob)],
        });

        const transcript = whisperResponse.text || "";

        // 2. Fast Verbal Analysis using Llama-3
        // We ask Llama to count fillers and evaluate relevance based on a topic if provided
        const topic = url.searchParams.get("topic") || "General Speaking";
        
        const analysisPrompt = `Analyze this transcript for a public speaking app.
        Transcript: "${transcript}"
        Topic: "${topic}"
        
        Tasks:
        1. Count the number of filler words (um, uh, like, so, basically).
        2. Give a relevance score (1.0 to 5.0) compared to the topic.
        3. Provide 2 short verbal coaching tips.

        Return ONLY a JSON object:
        {
          "transcript": "...",
          "filler_count": 0,
          "relevance_score": 0.0,
          "recommendations": ["tip1", "tip2"]
        }`;

        const analysisResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { role: "system", content: "You are a speech analysis engine. Output only valid JSON." },
            { role: "user", content: analysisPrompt }
          ]
        });

        // Parse Llama's response (handling potential markdown)
        let finalData;
        try {
          const rawText = analysisResponse.response;
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          finalData = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse analysis" };
        } catch (e) {
          finalData = { transcript, error: "Analysis failed, but transcription succeeded" };
        }

        return jsonResponse({ ...finalData, transcript });

      } catch (e: any) {
        return jsonResponse({ error: e.message }, { status: 500 });
      }
    }

    // --- ROUTE: /chat (B-01 Interactive Coach) ---
    if (request.method === "POST") {
      try {
        const { messages } = await request.json() as { messages: any[] };

        // Extract context
        const contextMsg = messages.find(m => m.role === 'system' && m.content.startsWith('CONTEXT:'));
        const filteredMessages = messages.filter(m => m !== contextMsg);

        const systemPrompt = `You are B-01, a highly specialized, NO-FLUFF AI Public Speaking Coach.
        
        ${contextMsg ? `USER DATA:\n${contextMsg.content}\n
        INSTRUCTIONS:\n
        1. Use 'fullTimeline' for growth analysis.
        2. ALWAYS provide exact percentage growth.
        3. Be extremely CONCISE (2 sentences max).` : 'No data available.'}

        STRICT RULES:
        - Never say "I don't have data".
        - Data-first answers only.`;

        const stream = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            { role: 'system', content: systemPrompt },
            ...filteredMessages
          ],
          stream: true
        });

        return corsResponse(new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
          },
        }));
      } catch (e: any) {
        return jsonResponse({ error: e.message }, { status: 500 });
      }
    }

    return corsResponse(new Response("Not Found", { status: 404 }));
  },
};
