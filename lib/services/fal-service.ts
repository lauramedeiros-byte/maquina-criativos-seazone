import { fal } from "@fal-ai/client";
import { readFileSync } from "fs";
import { basename } from "path";

fal.config({
  credentials: process.env.FAL_KEY || "",
});

// ─── Storage Helpers ──────────────────────────────────────────────────────────

/**
 * Uploads a local file to Fal storage and returns the hosted URL.
 * Use this to convert local asset paths into URLs before passing them
 * as referenceImageUrl to generate().
 */
export async function uploadToFalStorage(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath);
  const filename = basename(filePath);
  return uploadBufferToFalStorage(buffer, filename);
}

/**
 * Uploads a Buffer to Fal storage and returns the hosted URL.
 * Useful when the file is already in memory (e.g. from a multipart upload).
 */
export async function uploadBufferToFalStorage(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const blob = new Blob([new Uint8Array(buffer)]);
  const file = new File([blob], filename);
  const url = await fal.storage.upload(file);
  return url;
}

// ─── Image Service ────────────────────────────────────────────────────────────

export class FalImageService {
  /**
   * Generates an image from a text prompt.
   * When referenceImageUrl is provided the image-to-image model is used so
   * the output stays visually close to the reference asset (logo, facade, etc.).
   */
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

    try {
      let imageUrl: string | undefined;

      if (referenceImageUrl) {
        // Image-to-image: reference asset guides the output style/composition
        const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
          input: {
            prompt,
            image_url: referenceImageUrl,
            strength: 0.65,
            num_images: 1,
          },
        });
        imageUrl = result.data?.images?.[0]?.url;
      } else {
        // Text-to-image: no reference, use fast Schnell model
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
  /**
   * Generates a video from a text prompt.
   * When referenceImageUrl is provided the image-to-video model is used,
   * animating the reference asset (e.g. a facade render or aerial photo).
   */
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

    try {
      let videoUrl: string | undefined;

      if (referenceImageUrl) {
        // Image-to-video: animates the reference image
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
        // Text-to-video: no reference image
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
