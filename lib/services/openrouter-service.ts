import { fal } from "@fal-ai/client";

/**
 * Premium image generation using GPT-5 Image via OpenRouter.
 * Falls back to Fal AI FLUX Schnell if OpenRouter fails.
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
    const fileName = `creative_gpt5_${Date.now()}.png`;

    // Try GPT-5 Image via OpenRouter first
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      try {
        const result = await this.generateWithGPT5(prompt, openRouterKey, referenceImageUrl);
        if (result) return { success: true, imageUrl: result, fileName };
      } catch (error) {
        // If it's a clear error (no credits, etc), return it directly
        if (error instanceof Error && error.message.includes("credits")) {
          return { success: false, fileName, error: "OpenRouter sem créditos. Recarregue em openrouter.ai/settings/credits" };
        }
        // Otherwise fall through to Fal AI
      }
    }

    // Fallback: Fal AI FLUX Schnell
    if (!process.env.FAL_KEY) {
      return { success: false, fileName, error: "Nenhuma API de imagem configurada (OpenRouter sem créditos, FAL_KEY ausente)" };
    }

    fal.config({ credentials: process.env.FAL_KEY || "" });

    try {
      const enhancedPrompt = `Ultra high quality, professional real estate marketing photo. ${prompt}. Photorealistic, 8K detail, professional lighting.`;
      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: { prompt: enhancedPrompt, image_size: "square_hd", num_images: 1 },
      });
      const imageUrl = result.data?.images?.[0]?.url;
      if (!imageUrl) return { success: false, fileName, error: "Fal AI não retornou imagem" };
      return { success: true, imageUrl, fileName };
    } catch (error) {
      return { success: false, fileName, error: error instanceof Error ? error.message : "Erro na geração" };
    }
  }

  /**
   * Generate image using GPT-5 Image model via OpenRouter chat completions.
   * The model returns an image as a base64 content part in the response.
   */
  private async generateWithGPT5(prompt: string, apiKey: string, referenceImageUrl?: string): Promise<string | null> {
    // Build messages with optional reference image
    const userContent: any[] = [];

    const noTextRule = "CRITICAL RULE: The generated image must contain ZERO text, ZERO words, ZERO letters, ZERO numbers, ZERO logos, ZERO watermarks, ZERO labels, ZERO captions. Generate ONLY a clean photograph with NO text of any kind anywhere in the image.";

    if (referenceImageUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: referenceImageUrl }
      });
      userContent.push({
        type: "text",
        text: `Use this building/property as the MAIN visual reference. Keep the exact same facade, architecture, and colors. Generate a clean professional real estate photograph based on this building. ${noTextRule} Additional visual instructions: ${prompt}`
      });
    } else {
      userContent.push({
        type: "text",
        text: `${prompt} ${noTextRule}`
      });
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://maquina-criativos-seazone.vercel.app",
        "X-Title": "Seazone Criativos",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-image",
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      if (errorText.includes("credits") || errorText.includes("402")) {
        throw new Error("Sem créditos no OpenRouter. Recarregue em openrouter.ai/settings/credits");
      }
      throw new Error(`OpenRouter error: ${res.status}`);
    }

    const data = await res.json();

    // GPT-5 Image response format:
    // message.images[0].image_url.url = "data:image/png;base64,..."
    // OR message.content = array of parts
    const choice = data?.choices?.[0]?.message;
    if (!choice) return null;

    // PRIMARY: GPT-5 returns images in message.images array
    if (Array.isArray(choice.images) && choice.images.length > 0) {
      const img = choice.images[0];
      if (img.image_url?.url) return img.image_url.url;
      if (img.url) return img.url;
    }

    // FALLBACK: Check content array (multimodal response)
    if (Array.isArray(choice.content)) {
      for (const part of choice.content) {
        if (part.type === "image_url" && part.image_url?.url) {
          return part.image_url.url;
        }
        if (part.type === "image" && part.image?.url) {
          return part.image.url;
        }
      }
    }

    // FALLBACK: Check for text response that contains a URL
    if (typeof choice.content === "string") {
      const urlMatch = choice.content.match(/https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp)/i);
      if (urlMatch) return urlMatch[0];

      // Check for base64 in text
      if (choice.content.startsWith("data:image")) return choice.content;
    }

    return null;
  }
}
