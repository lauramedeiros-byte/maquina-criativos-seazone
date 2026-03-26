import { AvatarService } from "./services/avatar-service";
import { VoiceoverService } from "./services/voiceover-service";
import { ImageGenService } from "./services/image-gen-service";
import { Briefing, Creative } from "./types";
import { getBatchState, setBatchState } from "./batch-state";

export class Orchestrator {
  private avatarService: AvatarService;
  private voiceoverService: VoiceoverService;
  private imageGenService: ImageGenService;

  constructor() {
    this.avatarService = new AvatarService();
    this.voiceoverService = new VoiceoverService();
    this.imageGenService = new ImageGenService();
  }

  async generateCreative(
    briefing: Briefing,
    variant: "static" | "narrated" | "avatar" = "static"
  ): Promise<Creative> {
    const creativeId = `creative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      let result: Partial<Creative> = {};

      switch (variant) {
        case "avatar":
          result = await this.generateWithAvatar(briefing, creativeId);
          break;
        case "narrated":
          result = await this.generateNarrated(briefing, creativeId);
          break;
        case "static":
        default:
          result = await this.generateStatic(briefing, creativeId);
      }

      const duration = Date.now() - startTime;

      return {
        ...result,
        creativeId,
        duration: `${(duration / 1000).toFixed(2)}s`,
        status: "completed",
      } as Creative;
    } catch (error) {
      return {
        creativeId,
        type: variant,
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async generateStatic(briefing: Briefing, _creativeId: string) {
    const imageResult = await this.imageGenService.generate(
      briefing.imagePrompt || "Modern luxury property",
      1
    );

    return {
      type: "static" as const,
      images: imageResult.files,
      briefing: briefing.projectName,
    };
  }

  private async generateNarrated(briefing: Briefing, _creativeId: string) {
    const voiceoverResult = await this.voiceoverService.generate(
      briefing.script
    );
    const imageResult = await this.imageGenService.generate(
      briefing.imagePrompt || "Modern luxury property",
      3
    );

    return {
      type: "narrated" as const,
      voiceover: voiceoverResult,
      images: imageResult.files,
      script: briefing.script,
      briefing: briefing.projectName,
    };
  }

  private async generateWithAvatar(briefing: Briefing, _creativeId: string) {
    const voiceoverResult = await this.voiceoverService.generate(
      briefing.script
    );
    const avatarResult = await this.avatarService.generate({
      script: briefing.script,
      voice: voiceoverResult,
    });
    const imageResult = await this.imageGenService.generate(
      briefing.imagePrompt || "Modern luxury property",
      2
    );

    return {
      type: "avatar" as const,
      avatar: avatarResult,
      voiceover: voiceoverResult,
      images: imageResult.files,
      script: briefing.script,
      briefing: briefing.projectName,
    };
  }

  async generateBatch(briefing: Briefing, count = 45) {
    const distribution = {
      static: Math.floor(count / 3),
      narrated: Math.floor(count / 3),
      avatar: count - 2 * Math.floor(count / 3),
    };

    setBatchState({
      isRunning: true,
      totalCreatives: count,
      completedCreatives: 0,
      currentProject: briefing.projectName,
      distribution,
      creatives: [],
      startTime: Date.now(),
      errors: [],
    });

    const results: Creative[] = [];

    const variants: ("static" | "narrated" | "avatar")[] = [
      ...Array(distribution.static).fill("static"),
      ...Array(distribution.narrated).fill("narrated"),
      ...Array(distribution.avatar).fill("avatar"),
    ];

    for (const variant of variants) {
      if (!getBatchState().isRunning) break;

      const creative = await this.generateCreative(briefing, variant);
      results.push(creative);

      setBatchState({
        completedCreatives: results.length,
        creatives: [...results],
      });
    }

    setBatchState({
      isRunning: false,
      completedCreatives: results.length,
      creatives: results,
    });

    return {
      timestamp: new Date().toISOString(),
      project: briefing.projectName,
      totalCreatives: results.length,
      distribution,
      creatives: results,
    };
  }
}
