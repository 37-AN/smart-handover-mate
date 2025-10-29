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
    const { records } = await req.json();
    
    if (!records || records.length === 0) {
      throw new Error("No records provided");
    }

    console.log(`Processing ${records.length} downtime records`);

    // Initialize Supabase and AI
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process each downtime record with AI
    const processedIssues = [];
    
    for (const record of records) {
      try {
        const machine = record.machine || 'Unknown';
        const description = record.description || '';
        const category = record.category || '';
        const comment = record.comment || '';
        const duration = record.duration || 0;
        const dtStartTime = record.startTime || '';
        const dtEndTime = record.endTime || '';
        const userName = record.userName || '';

        // Ask AI to analyze and add intelligent comment
        const aiPrompt = `Analyze this downtime event and provide:
1. A brief technical analysis (2-3 sentences)
2. Possible root cause
3. Recommended action

Downtime Details:
- Machine: ${machine}
- Issue: ${description}
- Category: ${category}
- Duration: ${duration} minutes
- Existing Comment: ${comment || 'None'}
- User: ${userName}
- Time: ${dtStartTime} to ${dtEndTime}

Keep your response concise and actionable.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are an expert industrial maintenance analyst. Provide brief, technical analysis of downtime events." },
              { role: "user", content: aiPrompt }
            ],
            stream: false,
          }),
        });

        let aiComment = "AI analysis unavailable";
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiComment = aiData.choices?.[0]?.message?.content || "No analysis generated";
        } else {
          console.error("AI request failed:", aiResponse.status, await aiResponse.text());
        }

        // Determine priority based on duration
        let priority = 'low';
        if (duration > 60) priority = 'high';
        else if (duration > 15) priority = 'medium';

        // Determine area from machine name
        let area = 'Unknown';
        if (machine.includes('A1') || machine.includes('Area 1')) area = 'Area 1';
        else if (machine.includes('A2') || machine.includes('Area 2')) area = 'Area 2';
        else if (machine.includes('A3') || machine.includes('Area 3')) area = 'Area 3';
        else if (machine.includes('A4') || machine.includes('Area 4')) area = 'Area 4';
        else if (machine.includes('Mesnac')) area = 'Area 1';

        // Insert issue into database
        const issueDescription = `${description}${comment ? ' - ' + comment : ''}\n\n📊 AI Analysis:\n${aiComment}\n\n⏱️ Duration: ${duration}min | User: ${userName}`;
        
        const { data: issue, error: issueError } = await supabase
          .from('issues')
          .insert({
            area: area,
            machine: machine,
            description: issueDescription,
            priority: priority,
            status: 'ongoing',
          })
          .select()
          .single();

        if (issueError) {
          console.error("Error inserting issue:", issueError);
        } else {
          processedIssues.push(issue);
          console.log(`Created issue for ${machine}`);
        }

      } catch (recordError) {
        console.error("Error processing record:", recordError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Successfully processed ${processedIssues.length} issues from ${records.length} records`,
      issues: processedIssues
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in parse-downtime-report:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
