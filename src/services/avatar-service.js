import axios from 'axios';
import config from '../../config.js';

export class AvatarService {
  constructor() {
    this.provider = config.avatar.provider;
    this.apiKey = config.avatar.apiKey;
  }

  async generate(options) {
    console.log(`Avatar usando: ${this.provider}`);

    if (!this.apiKey) {
      return `avatar_${Date.now()}.mp4`;
    }

    switch (this.provider) {
      case 'did':
        return this.generateWithDID(options);
      default:
        return `avatar_${Date.now()}.mp4`;
    }
  }

  async generateWithDID(options) {
    try {
      const response = await axios.post('https://api.d-id.com/talks', {
        script: { type: 'text', input: options.script },
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });

      return response.data.result_url;
    } catch (error) {
      console.error('Erro D-ID:', error.message);
      return `avatar_${Date.now()}.mp4`;
    }
  }
}

export default AvatarService;
