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
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      throw new Error("imageBase64 is required")
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
            content: 'You are a shopping list parser. Extract shopping items from any image — handwritten lists, receipts, recipes, store shelf labels, chat screenshots (WhatsApp, SMS, etc.), or any other source. The text may be in any language including Hebrew or other RTL languages — preserve the original language of each item name. Output ONLY valid JSON in this format: {"items": [{"name": "Item Name", "quantity": 1}]}. Use reasonable quantities (default to 1 if unclear). Clean up item names (remove prices, checkmarks, strikethroughs, emojis). For unclear or partially legible text, include it as-is — never skip an item just because it is hard to read. If no items are found at all, return {"items": []}.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'auto',
                },
              },
              {
                type: 'text',
                text: 'Extract all shopping items from this image. Return ONLY the JSON response.',
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
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
