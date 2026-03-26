import config from '../config.js';
import { AvatarService } from './services/avatar-service.js';
import { VoiceoverService } from './services/voiceover-service.js';
import { ImageGenService } from './services/image-gen-service.js';
import { VideoEditor } from './services/video-editor.js';
import fs from 'fs';
import path from 'path';

export class Orchestrator {
  constructor() {
    this.avatarService = new AvatarService();
    this.voiceoverService = new VoiceoverService();
    this.imageGenService = new ImageGenService();
    this.videoEditor = new VideoEditor();
    this.outputDir = config.app.outputDir;
    this.tempDir = config.app.tempDir;
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.outputDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async generateCreative(briefing, variant = 'standard') {
    const creativeId = `creative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`\n🎬 Gerando criativo: ${creativeId}`);
    console.log(`   Tipo: ${variant}`);

    const startTime = Date.now();

    try {
      let result = {};

      switch (variant) {
        case 'avatar':
          result = await this.generateWithAvatar(briefing, creativeId);
          break;
        case 'narrated':
          result = await this.generateNarrated(briefing, creativeId);
          break;
        case 'static':
        default:
          result = await this.generateStatic(briefing, creativeId);
      }

      const duration = Date.now() - startTime;
      result.duration = `${(duration / 1000).toFixed(2)}s`;
      result.creativeId = creativeId;

      console.log(`   ✅ Criativo gerado em ${result.duration}`);
      return result;
    } catch (error) {
      console.error(`   ❌ Erro ao gerar: ${error.message}`);
      return {
        creativeId,
        variant,
        status: 'error',
        message: error.message,
      };
    }
  }

  async generateStatic(briefing, creativeId) {
    console.log('   📸 Gerando imagens estáticas...');

    const imageResult = await this.imageGenService.generate(
      briefing.imagePrompt || 'Modern luxury property',
      1
    );

    return {
      type: 'static',
      status: 'completed',
      images: imageResult.files,
      briefing: briefing.projectName,
    };
  }

  async generateNarrated(briefing, creativeId) {
    console.log('   🎙️  Gerando voz e imagens...');

    // Generate voiceover
    const voiceoverResult = await this.voiceoverService.generate(briefing.script);

    // Generate images
    const imageResult = await this.imageGenService.generate(
      briefing.imagePrompt || 'Modern luxury property',
      3
    );

    console.log(`   📹 Editando vídeo narrado...`);

    return {
      type: 'narrated',
      status: 'completed',
      voiceover: voiceoverResult,
      images: imageResult.files,
      script: briefing.script,
      briefing: briefing.projectName,
    };
  }

  async generateWithAvatar(briefing, creativeId) {
    console.log('   👤 Gerando avatar sincronizado...');

    // Generate voiceover
    const voiceoverResult = await this.voiceoverService.generate(briefing.script);

    // Generate avatar video
    const avatarResult = await this.avatarService.generate({
      script: briefing.script,
      voice: voiceoverResult,
    });

    // Generate images for background
    const imageResult = await this.imageGenService.generate(
      briefing.imagePrompt || 'Modern luxury property',
      2
    );

    console.log(`   🎬 Finalizando vídeo com avatar...`);

    return {
      type: 'avatar',
      status: 'completed',
      avatar: avatarResult,
      voiceover: voiceoverResult,
      images: imageResult.files,
      script: briefing.script,
      briefing: briefing.projectName,
    };
  }

  async generateBatch(briefing, count = 45) {
    console.log(`\n🚀 Iniciando batch de ${count} criativos`);
    console.log(`📦 Projeto: ${briefing.projectName}`);
    console.log('════════════════════════════════════════════\n');

    const results = [];
    const distribution = {
      static: Math.floor(count / 3),
      narrated: Math.floor(count / 3),
      avatar: count - (2 * Math.floor(count / 3)),
    };

    console.log(`📊 Distribuição:`);
    console.log(`   • ${distribution.static} estáticas (imagens)`);
    console.log(`   • ${distribution.narrated} narradas (vídeo + voz)`);
    console.log(`   • ${distribution.avatar} com avatar\n`);

    // Generate static creatives
    for (let i = 0; i < distribution.static; i++) {
      const creative = await this.generateCreative(briefing, 'static');
      results.push(creative);
    }

    // Generate narrated creatives
    for (let i = 0; i < distribution.narrated; i++) {
      const creative = await this.generateCreative(briefing, 'narrated');
      results.push(creative);
    }

    // Generate avatar creatives
    for (let i = 0; i < distribution.avatar; i++) {
      const creative = await this.generateCreative(briefing, 'avatar');
      results.push(creative);
    }

    // Save results to file
    const reportPath = path.join(this.outputDir, `batch_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      project: briefing.projectName,
      totalCreatives: results.length,
      distribution,
      creatives: results,
    }, null, 2));

    console.log(`\n✅ Batch completado!`);
    console.log(`   📊 Total: ${results.length} criativos`);
    console.log(`   📁 Relatório: ${reportPath}`);

    return {
      status: 'completed',
      totalCreatives: results.length,
      results,
      reportPath,
    };
  }

  async generateImages(prompt, count = 4) {
    return this.imageGenService.generate(prompt, count);
  }

  async generateVoiceover(text) {
    return this.voiceoverService.generate(text);
  }

  async generateAvatar(script, voice) {
    return this.avatarService.generate({ script, voice });
  }
}

export default Orchestrator;
