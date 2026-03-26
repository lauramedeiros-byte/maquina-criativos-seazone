import { GoogleGenAI } from "@google/genai";

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (_client) return _client;
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return null;
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

/**
 * Generate text with Gemini (for scripts, parsing, etc.)
 */
export async function geminiText(prompt: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text ?? null;
}

/**
 * Generate image with Gemini (NanoBanana)
 */
export async function geminiImage(
  prompt: string
): Promise<{ success: boolean; imageBase64?: string; mimeType?: string; error?: string }> {
  const client = getClient();
  if (!client) return { success: false, error: "API key não configurada" };

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
      config: {
        responseModalities: ["image", "text"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return {
            success: true,
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          };
        }
      }
    }

    return { success: false, error: "Nenhuma imagem gerada" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro";
    return { success: false, error: msg };
  }
}

export function isConfigured(): boolean {
  return !!process.env.GOOGLE_GENAI_API_KEY;
}
