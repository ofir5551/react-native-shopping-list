// Shared Gemini call for the AI edge functions. Plain fetch and erasable TS only,
// so the local eval script (scripts/eval) can import it under Node as-is.

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite'

export const SUGGEST_SYSTEM_PROMPT =
  'You are a helpful assistant that generates shopping list items based on user prompts. Output ONLY valid JSON in the specific format requested. Format: {"items": [{"name": "Item Name", "quantity": 1}]}. The items should be typical grocery or shopping items. Keep quantities reasonable.'

export const PHOTO_SYSTEM_PROMPT =
  'You are a shopping list parser. Extract shopping items from any image — handwritten lists, receipts, recipes, store shelf labels, chat screenshots (WhatsApp, SMS, etc.), or any other source. The text may be in any language including Hebrew or other RTL languages — preserve the original language of each item name. Output ONLY valid JSON in this format: {"items": [{"name": "Item Name", "quantity": 1}]}. Use reasonable quantities (default to 1 if unclear). Clean up item names (remove prices, checkmarks, strikethroughs, emojis). For unclear or partially legible text, include it as-is — never skip an item just because it is hard to read. If no items are found at all, return {"items": []}.'

type Part = { text: string } | { inlineData: { mimeType: string; data: string } }

type Usage = {
  promptTokenCount?: number
  candidatesTokenCount?: number
  thoughtsTokenCount?: number
}

const ITEMS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, quantity: { type: 'INTEGER' } },
        required: ['name', 'quantity'],
      },
    },
  },
  required: ['items'],
}

export async function generateItems(opts: {
  apiKey: string
  model: string
  system: string
  parts: Part[]
  maxOutputTokens: number
}): Promise<{ result: { items: { name: string; quantity: number }[] }; usage: Usage }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: 'user', parts: opts.parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: ITEMS_SCHEMA,
          maxOutputTokens: opts.maxOutputTokens,
        },
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${await response.text()}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error(`Gemini returned no content (finishReason: ${data.candidates?.[0]?.finishReason ?? 'unknown'})`)
  }

  const result = JSON.parse(text)
  // Gemini sometimes HTML-escapes the ampersand ("peas &amp; carrots").
  for (const item of result.items) item.name = item.name.replaceAll('&amp;', '&')

  return { result, usage: data.usageMetadata ?? {} }
}
