'use server';

export interface ParsedReceiptItem {
  id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  category: 'drinks' | 'food' | 'other';
  split_type: 'individual' | 'shared';
  assigned_participant_ids?: string[];
}

export interface ParsedReceiptResult {
  restaurant_name?: string;
  currency?: string;
  items: ParsedReceiptItem[];
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
}

const PROMPT = `You are an expert OCR receipt scanner for restaurants, bars, and cafes worldwide.
Analyze this photo of a restaurant/bar receipt/bill.
Extract all individual items purchased, their quantities, and their UNIT prices.

CRITICAL RULES FOR PRICE EXTRACTION:
- Many receipts show a "Montant" or "Amount" column that is the LINE TOTAL (Qty × Unit Price). You MUST divide by quantity to get unit_price.
  Example: "29  CELTIA BOUTEILLE  72,500" → quantity=29, unit_price=2.500 (72500 / 29 = 2500, i.e. 2.500 in TND).
  Example: "3   CREPE SPECIALE    12,000" → quantity=3, unit_price=4.000 (12000 / 3 = 4000, i.e. 4.000 in TND).
  Example: "7   BECK'S BOUTEILLE  21,000" → quantity=7, unit_price=3.000 (21000 / 7 = 3000, i.e. 3.000 in TND).
  Example: "1   PIZZA NEPTUNE      7,000" → quantity=1, unit_price=7.000.
- Commas may be used as decimal separators (European/Tunisian format): "7,000" means 7.000, "72,500" means 72.500, "180,150" means 180.150.
- In Tunisian Dinar (TND), 1 Dinar = 1000 Millimes. Prices like "7,000" = 7.000 TND, "2,500" = 2.500 TND, "180,150" = 180.150 TND.

CURRENCY DETECTION:
- Detect the currency from the receipt context (country, language, venue name).
- If the receipt is from Tunisia, North Africa, or shows Tunisian brands (Celtia, Boukha, etc.), use "TND".
- If there's a $ symbol, use "USD". If € use "EUR". If £ use "GBP".
- Otherwise infer from context. Default to "TND" if uncertain and the receipt appears North African.
- Return the detected currency in the "currency" field.

For each item:
1. "name": clean, readable item name in its original language (e.g. "Celtia Bouteille", "Pizza Neptune", "Beck's Bouteille", "Café Expresse"). Remove internal codes, tax symbols (*, #, T1, TVA).
2. "quantity": integer count (minimum 1).
3. "unit_price": price for ONE SINGLE unit as a float (e.g. 2.5, not the line total). ALWAYS divide line total by quantity.
4. "category": "drinks" (beer, wine, cocktails, water, coffee, soda, energy drinks), "food" (pizza, crêpe, burger, dishes, desserts), or "other" (nuts/fruits secs like amande/pistache/cajou, cigarettes, shisha, hookah).
5. "split_type": "individual" for personal drinks/dishes; "shared" for platters, shared appetizers, bottles of spirits shared among the table, large shared items.

Also extract:
- "restaurant_name": name of the venue if visible (e.g. "COIAG La Goulette"), else null
- "currency": detected currency code ("TND", "EUR", "USD", "GBP", etc.)
- "subtotal": subtotal before tax/tip if visible, else null
- "tax": tax/TVA amount if visible, else null
- "tip": tip/pourboire if visible, else null
- "total": final total amount as a float (e.g. 180.15 for "180,150" in TND)

Respond ONLY with a valid JSON object matching this schema:
{
  "restaurant_name": "string or null",
  "currency": "TND",
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "unit_price": 0.00,
      "category": "drinks" | "food" | "other",
      "split_type": "individual" | "shared"
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "tip": 0.00,
  "total": 0.00
}`;

export async function checkGeminiServerStatus(): Promise<{ configured: boolean }> {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  return {
    configured: hasKey,
  };
}

export async function scanReceiptWithGemini(
  base64Data: string,
  mimeType: string,
  clientApiKey?: string
): Promise<{ success: boolean; data?: ParsedReceiptResult; error?: string }> {
  try {
    const apiKey = (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0)
      ? process.env.GEMINI_API_KEY.trim()
      : (clientApiKey && clientApiKey.trim().length > 0 ? clientApiKey.trim() : '');

    if (!apiKey) {
      return {
        success: false,
        error: 'NO_API_KEY',
      };
    }

    // Clean base64 string if data URL prefix was included
    let cleanBase64 = base64Data;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    cleanBase64 = cleanBase64.replace(/\s/g, '');

    const validMimeType = mimeType || 'image/jpeg';

    // Ultra-fast lite models first (< 2.5s response time without heavy chain-of-thought delay)
    const models = [
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ];
    let lastError = '';

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const payload = {
          contents: [
            {
              parts: [
                { text: PROMPT },
                {
                  inline_data: {
                    mime_type: validMimeType,
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
          },
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errBody = await res.text();
          console.warn(`Gemini (${model}) returned HTTP ${res.status}:`, errBody);
          lastError = `Erreur API Gemini (${model}): HTTP ${res.status}`;
          continue; // try next model
        }

        const json = await res.json();
        const parts = json?.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find((p: any) => p.text && !p.thought) || parts[0];
        const candidateText = textPart?.text;

        if (!candidateText) {
          lastError = 'Aucun texte extrait par Gemini Vision.';
          continue;
        }

        // Clean any accidental markdown code fence
        let cleanedJsonText = candidateText.trim();
        if (cleanedJsonText.startsWith('```json')) {
          cleanedJsonText = cleanedJsonText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanedJsonText.startsWith('```')) {
          cleanedJsonText = cleanedJsonText.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }

        const parsed: ParsedReceiptResult = JSON.parse(cleanedJsonText);

        // Sanitize & validate items
        if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
          return {
            success: false,
            error: 'Aucun article détecté sur cette photo. Essayez avec un meilleur éclairage ou un cadrage plus serré.',
          };
        }

        // Detect currency
        const detectedCurrency = parsed.currency || 'TND';

        // Use 3 decimal places for TND (millimes), 2 for others
        const isTND = detectedCurrency.toUpperCase() === 'TND';
        const roundFactor = isTND ? 1000 : 100;

        const sanitizedItems: ParsedReceiptItem[] = parsed.items
          .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0)
          .map((item, idx) => {
            const qty = Math.max(1, parseInt(String(item.quantity), 10) || 1);
            let unitPrice = parseFloat(String(item.unit_price));
            if (isNaN(unitPrice) || unitPrice < 0) {
              unitPrice = 0;
            }
            unitPrice = Math.round(unitPrice * roundFactor) / roundFactor;

            const category: 'drinks' | 'food' | 'other' =
              item.category === 'drinks' || item.category === 'food' || item.category === 'other'
                ? item.category
                : /biere|beer|celtia|beck|heineken|vin|wine|cocktail|cola|cafe|coffee|water|eau|soda|vodka|whisky|gin|rhum|rum|tequila|jus|juice/i.test(item.name)
                ? 'drinks'
                : /pizza|burger|crep|sandwich|plat|salade|viande|poulet|poisson|grillad|entrecot|steak|pates|couscous|tajine/i.test(item.name)
                ? 'food'
                : 'other';

            const split_type: 'individual' | 'shared' =
              item.split_type === 'shared' || item.split_type === 'individual'
                ? item.split_type
                : 'individual';

            return {
              id: `scan-${Date.now()}-${idx}`,
              name: item.name.trim(),
              quantity: qty,
              unit_price: unitPrice,
              category,
              split_type,
            };
          });

        return {
          success: true,
          data: {
            restaurant_name: parsed.restaurant_name || undefined,
            currency: detectedCurrency,
            items: sanitizedItems,
            subtotal: parsed.subtotal ? Math.round(parsed.subtotal * roundFactor) / roundFactor : undefined,
            tax: parsed.tax ? Math.round(parsed.tax * roundFactor) / roundFactor : undefined,
            tip: parsed.tip ? Math.round(parsed.tip * roundFactor) / roundFactor : undefined,
            total: parsed.total ? Math.round(parsed.total * roundFactor) / roundFactor : undefined,
          },
        };
      } catch (modelErr: any) {
        console.warn(`Error trying ${model}:`, modelErr);
        lastError = modelErr?.message || 'Erreur lors de l\'appel à Gemini';
      }
    }

    return {
      success: false,
      error: lastError || 'Impossible d\'analyser l\'addition. Vérifiez votre clé API Gemini.',
    };
  } catch (err: any) {
    console.error('Fatal error in scanReceiptWithGemini:', err);
    return {
      success: false,
      error: err?.message || 'Une erreur inattendue est survenue lors de l\'analyse.',
    };
  }
}
