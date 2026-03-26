import axios from "axios";
import config from "../config";

export class ImageGenService {
  private provider: string;
  private apiKey: string;

  constructor() {
    this.provider = config.imageGeneration.provider;
    this.apiKey = config.imageGeneration.apiKey;
  }

  async generate(prompt: string, count = 4) {
    if (!this.apiKey) {
      return this.mockGenerate(count);
    }

    if (this.provider === "flux") {
      return this.generateWithFlux(prompt, count);
    }

    return this.mockGenerate(count);
  }

  private async generateWithFlux(prompt: string, count: number) {
    try {
      const images: string[] = [];
      for (let i = 0; i < count; i++) {
        await axios.post(
          "https://api.flux.sh/v1/images/generate",
          { prompt, height: 1080, width: 1920 },
          { headers: { Authorization: `Bearer ${this.apiKey}` } }
        );
        images.push(`image_${Date.now()}_${i}.png`);
      }
      return { count: images.length, files: images };
    } catch {
      return this.mockGenerate(count);
    }
  }

  private mockGenerate(count: number) {
    const files = Array.from(
      { length: count },
      (_, i) => `image_${Date.now()}_${i}.png`
    );
    return { count: files.length, files };
  }
}
