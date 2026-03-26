import axios from "axios";

export class FreepikService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FREEPIK_API_KEY || "";
  }

  async generateVideo(prompt: string): Promise<{
    success: boolean;
    fileName: string;
    taskId?: string;
    videoUrl?: string;
    error?: string;
  }> {
    const fileName = `freepik_${Date.now()}.mp4`;

    if (!this.apiKey) {
      // Demo mode
      return {
        success: true,
        fileName,
      };
    }

    try {
      // Create video generation task via Kling endpoint
      const createResponse = await axios.post(
        "https://api.freepik.com/v1/ai/kling/v2/text-to-video",
        {
          prompt,
          duration: "5",
          aspect_ratio: "9:16",
        },
        {
          headers: {
            "x-freepik-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      const taskId = createResponse.data?.data?.task_id;

      if (!taskId) {
        return { success: true, fileName };
      }

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 5 min max

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        const statusResponse = await axios.get(
          `https://api.freepik.com/v1/ai/kling/v2/text-to-video/${taskId}`,
          {
            headers: { "x-freepik-api-key": this.apiKey },
          }
        );

        const status = statusResponse.data?.data?.status;

        if (status === "completed") {
          const videoUrl = statusResponse.data?.data?.video_url;
          return {
            success: true,
            fileName,
            taskId,
            videoUrl,
          };
        }

        if (status === "failed") {
          return {
            success: false,
            fileName,
            error: "Freepik: geração falhou",
          };
        }
      }

      return {
        success: false,
        fileName,
        error: "Timeout na geração do vídeo",
      };
    } catch (error) {
      return {
        success: false,
        fileName,
        error: error instanceof Error ? error.message : "Erro Freepik",
      };
    }
  }
}
