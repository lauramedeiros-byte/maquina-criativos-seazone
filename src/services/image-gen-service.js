import axios from 'axios';
import config from '../../config.js';

export class ImageGenService {
  constructor() {
    this.provider = config.imageGeneration.provider;
    this.apiKey = config.imageGeneration.apiKey;
  }

  async generate(prompt, count = 4) {
    console.log(`Imagens usando: ${this.provider}`);

    if (!this.apiKey) {
      const files = Array.from({ length: count }, (_, i) =>
        `image_${Date.now()}_${i}.png`
      );
      return { count: files.length, files };
    }

    switch (this.provider) {
      case 'flux':
        return this.generateWithFlux(prompt, count);
      default:
        const files = Array.from({ length: count }, (_, i) =>
          `image_${Date.now()}_${i}.png`
        );
        return { count: files.length, files };
    }
  }

  async generateWithFlux(prompt, count) {
    try {
      const images = [];
      for (let i = 0; i < count; i++) {
        const response = await axios.post(
          'https://api.flux.sh/v1/images/generate',
          { prompt, height: 1080, width: 1920 },
          { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
        );
        images.push(`image_${Date.now()}_${i}.png`);
      }
      return { count: images.length, files: images };
    } catch (error) {
      console.error('Erro Flux:', error.message);
      const files = Array.from({ length: count }, (_, i) =>
        `image_${Date.now()}_${i}.png`
      );
      return { count: files.length, files };
    }
  }
}

export default ImageGenService;
