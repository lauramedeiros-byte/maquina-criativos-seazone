import { NextResponse } from "next/server";
import { getBatchState, setBatchState } from "@/lib/batch-state";
import { ImageGenService } from "@/lib/services/image-gen-service";
import { VoiceoverService } from "@/lib/services/voiceover-service";
import { AvatarService } from "@/lib/services/avatar-service";
import { Creative } from "@/lib/types";

export const maxDuration = 300;

interface ScriptInput {
  id: number;
  type: "static" | "narrated" | "avatar";
  title: string;
  script: string;
  imagePrompt: string;
  hook: string;
}

interface RequestBody {
  type: "static" | "video";
  scripts: ScriptInput[];
  nomeSpot: string;
  descricaoVisual?: string;
  videoReferencia?: string;
}

export async function POST(request: Request) {
  const body: RequestBody = await request.json();
  const { type, scripts, nomeSpot, descricaoVisual } = body;

  const state = getBatchState();
  if (state.isRunning) {
    return NextResponse.json(
      { error: "Produção já em andamento" },
      { status: 400 }
    );
  }

  const count = scripts.length;

  setBatchState({
    isRunning: true,
    totalCreatives: count,
    completedCreatives: 0,
    currentProject: nomeSpot,
    distribution: {
      static: type === "static" ? count : 0,
      narrated: scripts.filter((s) => s.type === "narrated").length,
      avatar: scripts.filter((s) => s.type === "avatar").length,
    },
    creatives: [],
    startTime: Date.now(),
    errors: [],
  });

  // Return immediately, process in background
  const response = NextResponse.json({
    status: "started",
    message: `Produzindo ${count} criativos ${type === "static" ? "estáticos" : "em vídeo"}`,
    count,
  });

  // Fire and forget
  produceCreatives(scripts, nomeSpot, descricaoVisual || "").catch((error) => {
    setBatchState({
      isRunning: false,
      errors: [error instanceof Error ? error.message : "Erro desconhecido"],
    });
  });

  return response;
}

async function produceCreatives(
  scripts: ScriptInput[],
  nomeSpot: string,
  descricaoVisual: string
) {
  const imageService = new ImageGenService();
  const voiceService = new VoiceoverService();
  const avatarService = new AvatarService();

  const results: Creative[] = [];

  for (const script of scripts) {
    if (!getBatchState().isRunning) break;

    const creativeId = `creative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      const enhancedImagePrompt = descricaoVisual
        ? `${script.imagePrompt}. Visual style: ${descricaoVisual}`
        : script.imagePrompt;

      let images: string[] = [];
      let voiceover: string | undefined;
      let avatar: string | undefined;

      switch (script.type) {
        case "static": {
          const imageResult = await imageService.generate(enhancedImagePrompt, 1);
          images = imageResult.files;
          break;
        }
        case "narrated": {
          voiceover = await voiceService.generate(script.script);
          const imgResult = await imageService.generate(enhancedImagePrompt, 3);
          images = imgResult.files;
          break;
        }
        case "avatar": {
          voiceover = await voiceService.generate(script.script);
          avatar = await avatarService.generate({ script: script.script, voice: voiceover });
          const bgResult = await imageService.generate(enhancedImagePrompt, 2);
          images = bgResult.files;
          break;
        }
      }

      const duration = Date.now() - startTime;

      results.push({
        creativeId,
        type: script.type,
        status: "completed",
        title: script.title,
        script: script.script,
        hook: script.hook,
        images,
        imagePrompt: enhancedImagePrompt,
        voiceover,
        avatar,
        briefing: nomeSpot,
        duration: `${(duration / 1000).toFixed(2)}s`,
      });
    } catch (error) {
      results.push({
        creativeId,
        type: script.type,
        status: "error",
        title: script.title,
        message: error instanceof Error ? error.message : "Erro",
      });
    }

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
}
