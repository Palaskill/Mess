'use server';

export interface ParsedReceiptItem {
  id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  category: 'drinks' | 'food' | 'other';
  split_type: 'individual' | 'shared';
}

export interface ParsedReceiptResult {
  restaurant_name?: string;
  items: ParsedReceiptItem[];
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
}

const PROMPT = `You are an expert OCR receipt scanner for restaurants, bars, and cafes.
Analyze this photo of a restaurant/bar receipt/bill.
Extract all individual items purchased, their quantities, and their unit prices.

For each item:
1. "name": clean, readable item name in its original language (e.g. "Heineken 33cl", "Burger Cheese", "Fromage Chèvre", "Pizza Margherita"). Remove any internal cashier codes or tax symbols like (*, #, T1, TVA).
2. "quantity": integer count of this item (minimum 1). If an item appears as "2x Burger 12.00", quantity is 2 and unit_price is 12.00 (or if 24.00 total, unit_price is 12.00).
3. "unit_price": price for ONE unit as a float/number (e.g. 8.50). Always unit price, not line total.
4. "category": determine whether this item is "drinks" (beer, wine, cocktails, water, coffee, soda), "food" (burgers, pizza, cheese, meat, dishes, dessert, tapas), or "other".
5. "split_type": set to "individual" for drinks, personal coffee/soda, single dishes; set to "shared" for shared plates (cheese platters, charcuterie, pizza to share, tapas, nachos, large wine bottles).

Also extract:
- "restaurant_name": name of the venue if visible, else null
- "subtotal": subtotal amount before tax/tip if visible
- "tax": tax/TVA amount if visible
- "tip": tip/pourboire if visible
- "total": final total amount of the bill (float/number)

Respond ONLY with a valid JSON object matching this schema:
{
  "restaurant_name": "string or null",
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

export async function scanReceiptWithGemini(
  base64Data: string,
  mimeType: string,
  clientApiKey?: string
): Promise<{ success: boolean; data?: ParsedReceiptResult; error?: string }> {
  try {
    const apiKey = (clientApiKey && clientApiKey.trim().length > 0)
      ? clientApiKey.trim()
      : process.env.GEMINI_API_KEY;

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

    // Try Gemini 2.5 Flash first, then fallback to Gemini 1.5 Flash
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
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
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errBody = await res.text();
          console.warn(`Gemini (${model}) returned HTTP ${res.status}:`, errBody);
          lastError = `Erreur API Gemini (${model}): HTTP ${res.status}`;
          continue; // try next model
        }

        const json = await res.json();
        const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

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

        const sanitizedItems: ParsedReceiptItem[] = parsed.items
          .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0)
          .map((item, idx) => {
            const qty = Math.max(1, parseInt(String(item.quantity), 10) || 1);
            let unitPrice = parseFloat(String(item.unit_price));
            if (isNaN(unitPrice) || unitPrice < 0) {
              unitPrice = 0;
            }
            unitPrice = Math.round(unitPrice * 100) / 100;

            const category: 'drinks' | 'food' | 'other' =
              item.category === 'drinks' || item.category === 'food' || item.category === 'other'
                ? item.category
                : /biere|beer|vin|wine|cocktail|cola|cafe|coffee|water|eau/i.test(item.name)
                ? 'drinks'
                : 'food';

            const split_type: 'individual' | 'shared' =
              item.split_type === 'shared' || item.split_type === 'individual'
                ? item.split_type
                : category === 'food'
                ? 'shared'
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
            items: sanitizedItems,
            subtotal: parsed.subtotal ? Math.round(parsed.subtotal * 100) / 100 : undefined,
            tax: parsed.tax ? Math.round(parsed.tax * 100) / 100 : undefined,
            tip: parsed.tip ? Math.round(parsed.tip * 100) / 100 : undefined,
            total: parsed.total ? Math.round(parsed.total * 100) / 100 : undefined,
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
