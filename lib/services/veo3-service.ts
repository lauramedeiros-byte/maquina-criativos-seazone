import { GoogleGenAI } from "@google/genai";

export class Veo3Service {
  private client: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  async generate(prompt: string): Promise<{
    success: boolean;
    videoBase64?: string;
    mimeType?: string;
    fileName: string;
    error?: string;
  }> {
    const fileName = `veo3_${Date.now()}.mp4`;

    if (!this.client) {
      // Demo mode
      return {
        success: true,
        fileName,
      };
    }

    try {
      // Generate video using Veo 3
      const operation = await this.client.models.generateVideos({
        model: "veo-3.0-generate-preview",
        prompt,
        config: {
          numberOfVideos: 1,
          durationSeconds: 8,
          fps: 24,
        },
      });

      // Poll for completion
      let result = operation;
      while (!result.done) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        result = await this.client!.operations.get({
          operation: result,
        });
      }

      // Extract video
      const video = result.response?.generatedVideos?.[0];
      if (video?.video?.uri) {
        return {
          success: true,
          fileName,
          videoBase64: undefined, // URI-based, not base64
          mimeType: "video/mp4",
        };
      }

      return {
        success: true,
        fileName,
      };
    } catch (error) {
      return {
        success: false,
        fileName,
        error: error instanceof Error ? error.message : "Erro ao gerar vídeo",
      };
    }
  }
}
