import { fal } from "@fal-ai/client";

/**
 * "Premium" image generation.
 * Tries OpenAI GPT Image (via OpenRouter) first, falls back to FLUX Schnell.
 */
export class PremiumImageService {
  async generate(
    prompt: string,
    referenceImageUrl?: string
  ): Promise<{
    success: boolean;
    imageUrl?: string;
    fileName: string;
    error?: string;
  }> {
    const fileName = `creative_pro_${Date.now()}.png`;

    // Try OpenRouter/OpenAI image generation first
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      try {
        const result = await this.tryOpenRouter(prompt, openRouterKey);
        if (result) return { success: true, imageUrl: result, fileName };
      } catch {
        // Fall through to Fal AI
      }
    }

    // Fallback: use Fal AI FLUX Schnell with enhanced prompt
    if (!process.env.FAL_KEY) {
      return { success: false, fileName, error: "Nenhuma API de imagem configurada" };
    }

    fal.config({ credentials: process.env.FAL_KEY || "" });

    try {
      const enhancedPrompt = `Ultra high quality, professional real estate marketing photo. ${prompt}. Photorealistic, 8K detail, professional lighting, luxury feel.`;

      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: {
          prompt: enhancedPrompt,
          image_size: "square_hd",
          num_images: 1,
        },
      });

      const imageUrl = result.data?.images?.[0]?.url;
      if (!imageUrl) {
        return { success: false, fileName, error: "Não foi possível gerar imagem" };
      }

      return { success: true, imageUrl, fileName };
    } catch (error) {
      return {
        success: false,
        fileName,
        error: error instanceof Error ? error.message : "Erro na geração",
      };
    }
  }

  private async tryOpenRouter(prompt: string, apiKey: string): Promise<string | null> {
    // Try the OpenRouter images endpoint
    const res = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://maquina-criativos-seazone.vercel.app",
        "X-Title": "Seazone Criativos",
      },
      body: JSON.stringify({
        model: "openai/dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const img = data?.data?.[0];
    if (img?.url) return img.url;
    if (img?.b64_json) return `data:image/png;base64,${img.b64_json}`;
    return null;
  }
}
