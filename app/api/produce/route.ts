import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";
import {
  FalImageService,
  FalVideoService,
  uploadToFalStorage,
} from "@/lib/services/fal-service";

export const maxDuration = 300;

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

function isImagePath(assetPath: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(assetPath).toLowerCase());
}

interface RequestBody {
  scriptId: number;
  type: "static" | "narrated" | "avatar";
  platform: "fal-image" | "fal-video";
  script: string;
  imagePrompt: string;
  title: string;
  descricaoVisual?: string;
  referenceAssets?: string[]; // e.g. ["/assets/fachada/render1.png"]
}

/**
 * Resolves the first image asset from the referenceAssets list,
 * uploads it to Fal storage, and returns its hosted URL.
 * Returns undefined (without throwing) if no usable asset is found.
 */
async function resolveReferenceImageUrl(
  referenceAssets: string[]
): Promise<string | undefined> {
  const firstImage = referenceAssets.find(isImagePath);
  if (!firstImage) return undefined;

  // Paths are relative URLs like /assets/fachada/render1.png
  // Strip the leading "/" and prepend the public directory
  const relativePath = firstImage.startsWith("/") ? firstImage.slice(1) : firstImage;
  const absolutePath = path.join(process.cwd(), "public", relativePath);

  try {
    // Verify the file exists before attempting upload
    readFileSync(absolutePath); // throws if missing
    const url = await uploadToFalStorage(absolutePath);
    return url;
  } catch {
    // Asset not found or upload failed — continue without a reference image
    return undefined;
  }
}

export async function POST(request: Request) {
  const body: RequestBody = await request.json();
  const {
    scriptId,
    platform,
    script,
    imagePrompt,
    title,
    descricaoVisual,
    referenceAssets,
  } = body;

  // Build a rich prompt that gives Fal AI the context of real estate marketing creatives
  const basePrompt = descricaoVisual
    ? `${imagePrompt}. Visual style: ${descricaoVisual}`
    : imagePrompt;

  // Resolve reference image once — used by both image and video branches
  let referenceImageUrl: string | undefined;
  if (referenceAssets && referenceAssets.length > 0) {
    referenceImageUrl = await resolveReferenceImageUrl(referenceAssets);
  }

  // When we have a reference image, tell the model to maintain the property's visual identity
  const enhancedPrompt = referenceImageUrl
    ? `Professional real estate marketing creative for "${title}". Keep the same property, building facade, colors, and visual identity from the reference image. ${basePrompt}. Style: modern social media ad, clean typography overlay space, high-end real estate investment marketing. Brazilian Portuguese text overlay areas.`
    : `Professional real estate marketing creative for "${title}". ${basePrompt}. Style: modern social media ad, clean typography overlay space, high-end real estate investment marketing.`;

  try {
    switch (platform) {
      case "fal-image": {
        const service = new FalImageService();
        const result = await service.generate(enhancedPrompt, referenceImageUrl);

        return NextResponse.json({
          scriptId,
          platform,
          success: result.success,
          fileName: result.fileName,
          imageUrl: result.imageUrl,
          error: result.error,
        });
      }

      case "fal-video": {
        const service = new FalVideoService();
        const videoPrompt = `Create a cinematic professional marketing video for vacation rental investment property "${title}". Animate the building facade and surroundings. Script: "${script}". Visual: ${basePrompt}. Style: smooth camera movement, luxury real estate, aspirational.`;
        const result = await service.generate(videoPrompt, referenceImageUrl);

        return NextResponse.json({
          scriptId,
          platform,
          success: result.success,
          fileName: result.fileName,
          videoUrl: result.videoUrl,
          error: result.error,
        });
      }

      default:
        return NextResponse.json(
          { error: `Plataforma "${platform}" não suportada` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        scriptId,
        platform,
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
