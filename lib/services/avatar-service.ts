import axios from "axios";
import config from "../config";

export class AvatarService {
  private provider: string;
  private apiKey: string;

  constructor() {
    this.provider = config.avatar.provider;
    this.apiKey = config.avatar.apiKey;
  }

  async generate(options: {
    script: string;
    voice?: string;
  }): Promise<string> {
    if (!this.apiKey) {
      return `avatar_${Date.now()}.mp4`;
    }

    if (this.provider === "did") {
      return this.generateWithDID(options);
    }

    return `avatar_${Date.now()}.mp4`;
  }

  private async generateWithDID(options: {
    script: string;
  }): Promise<string> {
    try {
      const response = await axios.post(
        "https://api.d-id.com/talks",
        { script: { type: "text", input: options.script } },
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );
      return response.data.result_url;
    } catch {
      return `avatar_${Date.now()}.mp4`;
    }
  }
}
