export const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
export function validateReceiptImage(data: string, mime: string) {
  if (typeof data !== 'string' || data.length > 3 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(mime)) {
    throw new Error('Image invalide : JPEG, PNG ou WebP, 2 Mo maximum.');
  }
  const base64 = data.replace(/^data:image\/(?:jpeg|png|webp);base64,/, '').replace(/\s/g, '');
  if (!base64 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || Buffer.byteLength(base64, 'base64') > MAX_RECEIPT_BYTES) {
    throw new Error('Image invalide ou trop volumineuse.');
  }
  return base64;
}
export async function boundedResponseJSON(response: Response, maxBytes = 512 * 1024): Promise<unknown> {
  if (!response.body) throw new Error('Réponse vide');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new Error('Réponse trop volumineuse');
      chunks.push(value);
    }
    const joined = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(joined));
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
