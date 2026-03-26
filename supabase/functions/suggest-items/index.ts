import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // MVP: allow any request with a valid Supabase JWT (including anonymous sessions),
  // so guests can use AI features during the friends-and-family testing phase.
  // To restrict to signed-in users only, replace this block with a getUser() check:
  //   const { data: { user }, error } = await supabase.auth.getUser(token)
  //   if (error || !user) return 401
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  try {
    const { prompt } = await req.json()

    if (!prompt) {
      throw new Error("Prompt is required")
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
        response_format: { type: "json_object" }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI Error:", errorText);
      throw new Error(`OpenAI API Error: ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    // Parse to ensure it's valid JSON before sending back
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
