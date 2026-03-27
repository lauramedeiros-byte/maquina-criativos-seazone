import { fal } from "@fal-ai/client";
import { readFileSync } from "fs";
import { basename } from "path";

// Configure credentials lazily — ensure env var is read at call time, not import time
function ensureConfig() {
  fal.config({
    credentials: process.env.FAL_KEY || "",
  });
}

// ─── Storage Helpers ──────────────────────────────────────────────────────────

export async function uploadToFalStorage(filePath: string): Promise<string> {
  ensureConfig();
  const buffer = readFileSync(filePath);
  const filename = basename(filePath);
  return uploadBufferToFalStorage(buffer, filename);
}

export async function uploadBufferToFalStorage(
  buffer: Buffer,
  filename: string
): Promise<string> {
  ensureConfig();
  const blob = new Blob([new Uint8Array(buffer)]);
  const file = new File([blob], filename);
  const url = await fal.storage.upload(file);
  return url;
}

// ─── Image Service (FLUX Schnell — free tier) ─────────────────────────────────

export class FalImageService {
  async generate(
    prompt: string,
    referenceImageUrl?: string
  ): Promise<{
    success: boolean;
    imageUrl?: string;
    fileName: string;
    error?: string;
  }> {
    const fileName = `creative_${Date.now()}.png`;

    if (!process.env.FAL_KEY) {
      return { success: false, fileName, error: "FAL_KEY não configurada" };
    }

    ensureConfig();

    try {
      let imageUrl: string | undefined;

      if (referenceImageUrl) {
        console.log("[FalImageService] Using reference image:", referenceImageUrl.substring(0, 80));
        // Use image-to-image with the reference asset (facade, aerial, etc.)
        try {
          const result = await fal.subscribe("fal-ai/flux/dev/image-to-image" as any, {
            input: {
              prompt,
              image_url: referenceImageUrl,
              strength: 0.35,
              num_images: 1,
            },
          });
          const data = result.data as any;
          imageUrl = data?.images?.[0]?.url;
        } catch {
          // If image-to-image fails, fall back to text-to-image
        }
      }

      // Fallback or no reference: use text-to-image
      if (!imageUrl) {
        const result = await fal.subscribe("fal-ai/flux/schnell", {
          input: {
            prompt,
            image_size: "square_hd",
            num_images: 1,
          },
        });
        imageUrl = result.data?.images?.[0]?.url;
      }

      if (!imageUrl) {
        return { success: false, fileName, error: "Fal AI não retornou imagem" };
      }

      return { success: true, imageUrl, fileName };
    } catch (error) {
      return {
        success: false,
        fileName,
        error: error instanceof Error ? error.message : "Erro Fal AI",
      };
    }
  }
}

// ─── Video Service ────────────────────────────────────────────────────────────

export class FalVideoService {
  async generate(
    prompt: string,
    referenceImageUrl?: string
  ): Promise<{
    success: boolean;
    videoUrl?: string;
    fileName: string;
    error?: string;
  }> {
    const fileName = `video_${Date.now()}.mp4`;

    if (!process.env.FAL_KEY) {
      return { success: false, fileName, error: "FAL_KEY não configurada" };
    }

    ensureConfig();

    try {
      let videoUrl: string | undefined;

      if (referenceImageUrl) {
        const result = await fal.subscribe(
          "fal-ai/kling-video/v2/master/image-to-video",
          {
            input: {
              prompt,
              image_url: referenceImageUrl,
              duration: "5",
            },
          }
        );
        videoUrl = result.data?.video?.url;
      } else {
        const result = await fal.subscribe(
          "fal-ai/kling-video/v2/master/text-to-video",
          {
            input: {
              prompt,
              duration: "5",
              aspect_ratio: "9:16",
            },
          }
        );
        videoUrl = result.data?.video?.url;
      }

      if (!videoUrl) {
        return { success: false, fileName, error: "Fal AI não retornou vídeo" };
      }

      return { success: true, videoUrl, fileName };
    } catch (error) {
      return {
        success: false,
        fileName,
        error: error instanceof Error ? error.message : "Erro Fal AI (vídeo)",
      };
    }
  }
}
