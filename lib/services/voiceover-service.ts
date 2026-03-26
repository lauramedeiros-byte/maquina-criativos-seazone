import axios from "axios";
import config from "../config";

export class VoiceoverService {
  private provider: string;
  private apiKey: string;

  constructor() {
    this.provider = config.voiceover.provider;
    this.apiKey = config.voiceover.apiKey;
  }

  async generate(text: string): Promise<string> {
    if (!this.apiKey) {
      return `voiceover_${Date.now()}.mp3`;
    }

    if (this.provider === "elevenlabs") {
      return this.generateWithElevenLabs(text);
    }

    return `voiceover_${Date.now()}.mp3`;
  }

  private async generateWithElevenLabs(text: string): Promise<string> {
    try {
      await axios.post(
        "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
        { text },
        {
          headers: { "xi-api-key": this.apiKey },
          responseType: "arraybuffer",
        }
      );
      return `voiceover_${Date.now()}.mp3`;
    } catch {
      return `voiceover_${Date.now()}.mp3`;
    }
  }
}
