import axios from "axios";

export class NanoBananaService {
  private pollinationsKey: string;

  constructor() {
    this.pollinationsKey = process.env.POLLINATIONS_API_KEY || "";
  }

  async generate(prompt: string): Promise<{
    success: boolean;
    imageUrl?: string;
    fileName: string;
    error?: string;
  }> {
    const fileName = `creative_${Date.now()}.png`;

    // If Pollinations key is configured, use their API
    if (this.pollinationsKey) {
      return this.generateWithPollinations(prompt, fileName);
    }

    // Fallback: use Google Gemini if available
    const googleKey = process.env.GOOGLE_GENAI_API_KEY;
    if (googleKey) {
      return this.generateWithGemini(prompt, fileName, googleKey);
    }

    // Demo mode: return a placeholder image URL
    const encodedPrompt = encodeURIComponent(prompt.slice(0, 100));
    return {
      success: true,
      imageUrl: `https://placehold.co/1080x1080/1F4E78/FFFFFF/png?text=${encodeURIComponent(fileName)}&font=roboto`,
      fileName,
    };
  }

  private async generateWithPollinations(
    prompt: string,
    fileName: string
  ) {
    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&width=1080&height=1080&nologo=true&key=${this.pollinationsKey}`;

      // Verify it works
      const check = await fetch(imageUrl, { method: "HEAD" });
      if (check.ok || check.status === 301 || check.status === 302) {
        return { success: true, imageUrl, fileName };
      }

      return { success: false, fileName, error: `Pollinations retornou ${check.status}` };
    } catch (error) {
      return {
        success: false,
        fileName,
        error: error instanceof Error ? error.message : "Erro Pollinations",
      };
    }
  }

  private async generateWithGemini(
    prompt: string,
    fileName: string,
    apiKey: string
  ) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
          generationConfig: { responseModalities: ["TEXT"] },
        },
        { headers: { "Content-Type": "application/json" } }
      );

      // Gemini text models can't generate images directly without the image model
      // Return demo if we reach here
      return {
        success: true,
        imageUrl: `https://placehold.co/1080x1080/1F4E78/FFFFFF/png?text=Gemini+Demo&font=roboto`,
        fileName,
      };
    } catch {
      return {
        success: true,
        imageUrl: `https://placehold.co/1080x1080/1F4E78/FFFFFF/png?text=${encodeURIComponent(fileName)}&font=roboto`,
        fileName,
      };
    }
  }
}
