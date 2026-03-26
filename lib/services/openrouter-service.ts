export class OpenRouterImageService {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || "";
  }

  async generate(prompt: string): Promise<{
    success: boolean;
    imageUrl?: string;
    fileName: string;
    error?: string;
  }> {
    const fileName = `creative_gpt_${Date.now()}.png`;

    if (!this.apiKey) {
      return { success: false, fileName, error: "OPENROUTER_API_KEY não configurada" };
    }

    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://maquina-criativos-seazone.vercel.app",
          "X-Title": "Seazone Criativos",
        },
        body: JSON.stringify({
          model: "openai/gpt-image-1",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "high",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, fileName, error: `OpenRouter error: ${response.status} - ${error.slice(0, 200)}` };
      }

      const data = await response.json();

      // OpenRouter returns data in OpenAI format
      // Could be url or b64_json
      const imageData = data?.data?.[0];

      if (imageData?.url) {
        return { success: true, imageUrl: imageData.url, fileName };
      }

      if (imageData?.b64_json) {
        return { success: true, imageUrl: `data:image/png;base64,${imageData.b64_json}`, fileName };
      }

      return { success: false, fileName, error: "OpenRouter não retornou imagem" };
    } catch (error) {
      return {
        success: false,
        fileName,
        error: error instanceof Error ? error.message : "Erro OpenRouter",
      };
    }
  }
}
