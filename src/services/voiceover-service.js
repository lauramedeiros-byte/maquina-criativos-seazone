import axios from 'axios';
import config from '../../config.js';

export class VoiceoverService {
  constructor() {
    this.provider = config.voiceover.provider;
    this.apiKey = config.voiceover.apiKey;
  }

  async generate(text) {
    console.log(`Voice over usando: ${this.provider}`);

    if (!this.apiKey) {
      return `voiceover_${Date.now()}.mp3`;
    }

    switch (this.provider) {
      case 'elevenlabs':
        return this.generateWithElevenLabs(text);
      default:
        return `voiceover_${Date.now()}.mp3`;
    }
  }

  async generateWithElevenLabs(text) {
    try {
      const response = await axios.post(
        'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
        { text: text },
        {
          headers: { 'xi-api-key': this.apiKey },
          responseType: 'arraybuffer',
        }
      );

      return `voiceover_${Date.now()}.mp3`;
    } catch (error) {
      console.error('Erro ElevenLabs:', error.message);
      return `voiceover_${Date.now()}.mp3`;
    }
  }
}

export default VoiceoverService;
