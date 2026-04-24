import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  const { data: usage, error: usageError } = await userClient.rpc('check_and_increment_ai_usage', {
    p_is_anonymous: user.is_anonymous ?? false,
  })

  if (usageError) {
    console.error('Rate limit check error:', usageError)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }

  if (!usage.allowed) {
    return new Response(JSON.stringify({
      error: 'rate_limit_exceeded',
      isAnonymous: user.is_anonymous ?? false,
      limit: usage.limit,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 429,
    })
  }

  try {
    const { prompt } = await req.json()

    if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
      return new Response(JSON.stringify({ error: 'Invalid prompt' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) {
      throw new Error("OpenAI API key not configured")
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates shopping list items based on user prompts. Output ONLY valid JSON in the specific format requested. Format: {"items": [{"name": "Item Name", "quantity": 1}]}. The items should be typical grocery or shopping items. Keep quantities reasonable.',
          },
          {
            role: 'user',
            content: `Create a shopping list for: ${prompt}. Return ONLY the JSON response.`,
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI Error:", errorText);
      throw new Error(`OpenAI API Error: ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content
    const parsed = JSON.parse(content)

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
