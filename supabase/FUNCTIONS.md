# Edge Functions Documentation

## Overview
This document describes all Supabase Edge Functions in the project.

---

## recommend-videos

**Path:** `/functions/v1/recommend-videos`  
**Authentication:** Required (JWT)  
**Method:** POST

### Purpose
Generates personalized video recommendations using AI based on user watch history.

### How It Works

1. **Authentication Check**
   - Validates user JWT token
   - Returns 401 if unauthorized

2. **Fetch Watch History**
   - Retrieves user's last 10 watched videos
   - Includes video metadata (category, AI solution, tags)

3. **Handle No History**
   - If no watch history exists
   - Returns 8 most popular videos (sorted by views)

4. **Fetch Available Videos**
   - Gets up to 50 videos not yet watched by user
   - Excludes already watched videos

5. **AI Analysis**
   - Uses Lovable AI (Gemini 2.5 Flash model)
   - Analyzes patterns in:
     - Video categories
     - AI solutions used
     - Video topics and themes
     - Tags and descriptions
   - Returns 8 video IDs ordered by relevance

6. **Fallback Logic**
   - If AI returns fewer than 8 recommendations
   - Fills remaining slots with popular unwatched videos

### Request
```typescript
// No body required - uses authenticated user's watch history
```

### Response

**Success (200):**
```json
{
  "recommendations": ["video-id-1", "video-id-2", ...],
  "reason": "AI-powered recommendations based on watch history"
}
```

**No Watch History (200):**
```json
{
  "recommendations": ["video-id-1", "video-id-2", ...],
  "reason": "Popular videos (no watch history)"
}
```

**Unauthorized (401):**
```json
{
  "error": "Unauthorized"
}
```

**Rate Limited (429):**
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

**Quota Exceeded (402):**
```json
{
  "error": "AI service quota exceeded. Please contact support."
}
```

**Server Error (500):**
```json
{
  "error": "Error message"
}
```

### Environment Variables Required
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `LOVABLE_API_KEY`: API key for Lovable AI gateway

### AI Model Configuration
- **Model:** `google/gemini-2.5-flash`
- **Temperature:** 0.7
- **Purpose:** Fast, balanced recommendations
- **Response Format:** JSON array of video IDs

### Error Handling

1. **User Validation**
   - Checks for valid authentication
   - Returns 401 if missing or invalid

2. **Database Errors**
   - Catches and logs Supabase errors
   - Returns 500 with error message

3. **AI Gateway Errors**
   - Handles rate limiting (429)
   - Handles quota exceeded (402)
   - Catches other AI errors

4. **JSON Parsing**
   - Robust parsing of AI response
   - Extracts JSON array even if wrapped in text
   - Validates recommended IDs against available videos

### Performance Considerations

1. **Query Limits**
   - Watch history: 10 most recent
   - Available videos: 50 candidates
   - Final recommendations: 8 videos

2. **Caching Opportunities**
   - Watch history could be cached
   - Popular videos could be cached
   - AI responses could be cached for similar patterns

3. **Database Queries**
   - Uses indexed columns (user_id, watched_at)
   - Efficient NOT IN query for excluding watched videos
   - Proper use of foreign key joins

### Logging
```typescript
console.log("Generating recommendations for user:", user.id)
console.log("Calling Lovable AI for recommendations...")
console.log("AI response:", aiContent)
console.log("Final recommendations:", validIds)
console.error("AI gateway error:", status, errorText)
console.error("Error in recommend-videos function:", error)
```

### Future Improvements

1. **Caching**
   - Cache popular videos for users with no history
   - Cache user preferences and patterns

2. **Advanced Recommendations**
   - Consider like/dislike patterns
   - Factor in video completion rate
   - Use collaborative filtering

3. **Performance**
   - Add response caching
   - Batch process multiple users
   - Pre-compute recommendations

4. **Analytics**
   - Track recommendation accuracy
   - Measure click-through rates
   - A/B test different models

---

## Adding New Edge Functions

### Template Structure
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Your function logic here

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

### Best Practices

1. **Always handle CORS**
   - Include OPTIONS handler
   - Return CORS headers in all responses

2. **Use SECURITY DEFINER for sensitive operations**
   - Set explicit search_path
   - Validate permissions

3. **Comprehensive error handling**
   - Catch all errors
   - Return appropriate status codes
   - Log errors for debugging

4. **Efficient database queries**
   - Use indexes
   - Limit result sets
   - Avoid N+1 queries

5. **Authentication**
   - Validate user tokens
   - Use RLS policies
   - Don't trust client input

### Configuration

Add function configuration to `supabase/config.toml`:

```toml
[functions.your-function-name]
verify_jwt = true  # Require authentication (false for public endpoints)
```

### Deployment

Functions are automatically deployed when code is pushed. No manual deployment needed.
