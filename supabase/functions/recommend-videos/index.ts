import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating recommendations for user:", user.id);

    // Get user's watch history
    const { data: watchHistory, error: watchError } = await supabaseClient
      .from("watch_history")
      .select(`
        videos (
          id,
          title,
          description,
          category,
          ai_solution,
          tags
        )
      `)
      .eq("user_id", user.id)
      .order("watched_at", { ascending: false })
      .limit(10);

    if (watchError) throw watchError;

    const watchedVideos = watchHistory?.map((wh: any) => wh.videos).filter(Boolean) || [];
    const watchedVideoIds = watchedVideos.map((v: any) => v.id);

    if (watchedVideos.length === 0) {
      // No watch history - return popular videos
      const { data: popularVideos, error: popularError } = await supabaseClient
        .from("videos")
        .select("id, title, description, category")
        .order("views", { ascending: false })
        .limit(8);

      if (popularError) throw popularError;

      return new Response(
        JSON.stringify({
          recommendations: popularVideos?.map((v: any) => v.id) || [],
          reason: "Popular videos (no watch history)",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get all available videos (excluding watched ones)
    const { data: availableVideos, error: availableError } = await supabaseClient
      .from("videos")
      .select("id, title, description, category, ai_solution, tags")
      .not("id", "in", `(${watchedVideoIds.join(",")})`)
      .limit(50);

    if (availableError) throw availableError;

    if (!availableVideos || availableVideos.length === 0) {
      return new Response(
        JSON.stringify({
          recommendations: [],
          reason: "No new videos available",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use Lovable AI to analyze and recommend
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const watchHistorySummary = watchedVideos
      .map(
        (v: any) =>
          `- ${v.title} (Category: ${v.category || "N/A"}, AI: ${v.ai_solution || "N/A"})`
      )
      .join("\n");

    const availableVideosList = availableVideos
      .map(
        (v: any) =>
          `ID: ${v.id} | Title: ${v.title} | Category: ${v.category || "N/A"} | AI: ${v.ai_solution || "N/A"} | Description: ${v.description?.slice(0, 100) || "N/A"}`
      )
      .join("\n");

    const prompt = `You are a video recommendation AI. Based on the user's watch history, recommend 8 videos from the available videos that they would most likely enjoy.

WATCH HISTORY:
${watchHistorySummary}

AVAILABLE VIDEOS:
${availableVideosList}

Analyze patterns in:
1. Categories the user prefers
2. AI solutions they're interested in
3. Topics and themes from titles/descriptions
4. Any tags if available

Return ONLY the video IDs as a JSON array of strings, ordered by relevance (most relevant first). Example: ["id1", "id2", "id3"]`;

    console.log("Calling Lovable AI for recommendations...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a video recommendation expert. Analyze user preferences and suggest relevant videos. Return only valid JSON arrays of video IDs.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service quota exceeded. Please contact support." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "[]";

    console.log("AI response:", aiContent);

    // Parse the AI response
    let recommendedIds: string[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendedIds = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
    }

    // Validate and filter recommended IDs
    const validIds = recommendedIds.filter((id: string) =>
      availableVideos.some((v: any) => v.id === id)
    );

    // If we don't have enough recommendations, add some popular ones
    if (validIds.length < 8) {
      const remainingIds = availableVideos
        .filter((v: any) => !validIds.includes(v.id))
        .slice(0, 8 - validIds.length)
        .map((v: any) => v.id);
      validIds.push(...remainingIds);
    }

    console.log("Final recommendations:", validIds);

    return new Response(
      JSON.stringify({
        recommendations: validIds.slice(0, 8),
        reason: "AI-powered recommendations based on watch history",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in recommend-videos function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
