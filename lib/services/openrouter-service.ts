import { fal } from "@fal-ai/client";

// "Premium" image generation using FLUX Pro (higher quality than Schnell)
export class PremiumImageService {
  async generate(prompt: string, referenceImageUrl?: string): Promise<{
    success: boolean;
    imageUrl?: string;
    fileName: string;
    error?: string;
  }> {
    const fileName = `creative_pro_${Date.now()}.png`;

    if (!process.env.FAL_KEY) {
      return { success: false, fileName, error: "FAL_KEY não configurada" };
    }

    fal.config({ credentials: process.env.FAL_KEY || "" });

    try {
      let imageUrl: string | undefined;

      if (referenceImageUrl) {
        const result = await fal.subscribe("fal-ai/flux-pro/v1.1/redux" as any, {
          input: {
            image_url: referenceImageUrl,
            prompt,
            num_images: 1,
          },
        });
        const data = result.data as any;
        imageUrl = data?.images?.[0]?.url;
      }

      if (!imageUrl) {
        // Fallback to FLUX Pro text-to-image
        const result = await fal.subscribe("fal-ai/flux-pro/v1.1" as any, {
          input: {
            prompt,
            image_size: "square_hd",
            num_images: 1,
          },
        });
        const data = result.data as any;
        imageUrl = data?.images?.[0]?.url;
      }

      if (!imageUrl) {
        return { success: false, fileName, error: "Não foi possível gerar imagem premium" };
      }

      return { success: true, imageUrl, fileName };
    } catch (error) {
      return {
        success: false,
        fileName,
        error: error instanceof Error ? error.message : "Erro na geração premium",
      };
    }
  }
}
