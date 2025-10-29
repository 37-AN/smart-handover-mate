import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, handoverId, issueId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for accessing conversation history
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch relevant history for context
    let contextMessages: Array<{ role: string; content: string }> = [];
    
    // Get past similar issues for context
    const { data: pastIssues } = await supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // Get conversation history if handoverId or issueId provided
    if (handoverId || issueId) {
      const query = supabase
        .from('ai_conversations')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (handoverId) query.eq('handover_id', handoverId);
      if (issueId) query.eq('issue_id', issueId);
      
      const { data: history } = await query;
      if (history) {
        contextMessages = history.map(h => ({
          role: h.role as string,
          content: h.message as string
        }));
      }
    }

    // Build comprehensive system prompt
    const systemPrompt = `You are an expert industrial maintenance AI assistant for shift handovers and issue tracking.

Your role is to:
1. Help technicians document shift handovers efficiently
2. Analyze issues and suggest solutions based on historical data
3. Categorize and prioritize problems automatically
4. Remember past issues to provide context for troubleshooting
5. Parse downtime reports and extract key information
6. Provide quick, actionable feedback

Historical Context:
${pastIssues ? pastIssues.map(issue => 
  `- Area ${issue.area}, ${issue.machine}: ${issue.description} (Status: ${issue.status})`
).join('\n') : 'No historical issues yet.'}

Be concise, technical, and actionable. Always suggest specific next steps.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...contextMessages,
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI gateway error");
    }

    // Store the user message
    if (handoverId || issueId) {
      const userMessage = messages[messages.length - 1];
      await supabase.from('ai_conversations').insert({
        handover_id: handoverId || null,
        issue_id: issueId || null,
        message: userMessage.content,
        role: 'user'
      });
    }

    // Stream the response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Error in ai-assistant:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
