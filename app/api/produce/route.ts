import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";
import {
  FalImageService,
  FalVideoService,
  uploadToFalStorage,
} from "@/lib/services/fal-service";
import { PremiumImageService } from "@/lib/services/openrouter-service";
import { geminiText } from "@/lib/services/gemini-service";

export const maxDuration = 300;

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

function isImagePath(assetPath: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(assetPath).toLowerCase());
}

interface RequestBody {
  scriptId: number;
  type: "static" | "narrated" | "avatar";
  platform: "fal-image" | "fal-video" | "openrouter-image";
  script: string;
  copyText?: string;
  imagePrompt: string;
  title: string;
  hook?: string;
  nomeSpot?: string;
  descricaoVisual?: string;
  referenceAssets?: string[]; // e.g. ["/assets/fachada/render1.png"]
  pontosObrigatorios?: string;
}

interface ScoreResult {
  score: number;
  scoreReason: string;
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

/**
 * Scores a creative script using Gemini.
 * Evaluates: mandatory points coverage, hook quality, tone for real estate investment.
 * Returns a score 0-10 and a brief Portuguese reason.
 */
async function scoreCreative(
  script: string,
  hook: string,
  title: string,
  pontosObrigatorios: string
): Promise<ScoreResult> {
  const prompt = `Você é um especialista em marketing de investimento imobiliário. Avalie este roteiro de criativo de 0 a 10.

TÍTULO DO CRIATIVO: ${title}
HOOK (abertura): ${hook}
ROTEIRO COMPLETO:
${script}

${pontosObrigatorios ? `PONTOS OBRIGATÓRIOS que devem aparecer:\n${pontosObrigatorios}` : ""}

Critérios de avaliação:
1. O roteiro menciona pelo menos 1 ponto obrigatório com dado concreto? (peso alto)
2. O hook é chamativo e prende atenção nos primeiros segundos? (peso alto)
3. O tom é adequado para investidor de imóvel para aluguel por temporada (não genérico, não de luxo)? (peso médio)
4. O CTA ou convite à ação está claro? (peso médio)
5. A linguagem é natural, fluida e persuasiva? (peso baixo)

Responda APENAS o JSON abaixo, sem markdown:
{
  "score": 8,
  "scoreReason": "Motivo breve em português (1-2 frases)"
}`;

  try {
    const result = await geminiText(prompt);
    if (!result) return { score: 7, scoreReason: "Avaliação indisponível no momento." };

    let jsonStr = result.trim().replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) jsonStr = match[0];

    const parsed = JSON.parse(jsonStr);
    return {
      score: typeof parsed.score === "number" ? Math.min(10, Math.max(0, parsed.score)) : 7,
      scoreReason: typeof parsed.scoreReason === "string" ? parsed.scoreReason : "Avaliação concluída.",
    };
  } catch {
    return { score: 7, scoreReason: "Não foi possível calcular a pontuação automaticamente." };
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
    pontosObrigatorios,
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

  // When we have a reference image, prompt must reinforce keeping the same building/scene
  const enhancedPrompt = referenceImageUrl
    ? `Keep this exact same building, facade, architecture, and scene. Only add professional marketing overlay elements: subtle gradient at bottom for text space, clean modern typography area. Do not change the building or environment. ${basePrompt}. Real estate social media ad for "${title}".`
    : `Professional real estate marketing creative for "${title}". ${basePrompt}. Style: modern social media ad, clean typography overlay space, high-end real estate investment marketing.`;

  try {
    switch (platform) {
      case "fal-image": {
        const service = new FalImageService();
        const result = await service.generate(enhancedPrompt, referenceImageUrl);

        // Score the creative after image generation using script metadata
        const hookText = body.hook || title;
        const { score, scoreReason } = await scoreCreative(
          script,
          hookText,
          title,
          pontosObrigatorios || ""
        );

        return NextResponse.json({
          scriptId,
          platform,
          success: result.success,
          fileName: result.fileName,
          imageUrl: result.imageUrl,
          error: result.error,
          score,
          scoreReason,
          // Text metadata for frontend overlay
          overlayText: {
            hook: hookText,
            script: body.copyText || (script.length > 140 ? script.substring(0, 137) + "..." : script),
            nomeSpot: body.nomeSpot || title,
            cta: "Fale com a nossa equipe",
          },
        });
      }

      case "fal-video": {
        const service = new FalVideoService();
        const videoPrompt = `Create a cinematic professional marketing video for vacation rental investment property "${title}". Animate the building facade and surroundings. Script: "${script}". Visual: ${basePrompt}. Style: smooth camera movement, luxury real estate, aspirational.`;
        const result = await service.generate(videoPrompt, referenceImageUrl);

        // Score the creative after video generation using script metadata
        const hookText = body.hook || title;
        const { score, scoreReason } = await scoreCreative(
          script,
          hookText,
          title,
          pontosObrigatorios || ""
        );

        return NextResponse.json({
          scriptId,
          platform,
          success: result.success,
          fileName: result.fileName,
          videoUrl: result.videoUrl,
          error: result.error,
          score,
          scoreReason,
        });
      }

      case "openrouter-image": {
        const service = new PremiumImageService();
        const result = await service.generate(enhancedPrompt, referenceImageUrl);

        const hookText = body.hook || title;
        const { score, scoreReason } = await scoreCreative(
          script, hookText, title, pontosObrigatorios || ""
        );

        return NextResponse.json({
          scriptId, platform,
          success: result.success,
          fileName: result.fileName,
          imageUrl: result.imageUrl,
          error: result.error,
          score, scoreReason,
          overlayText: {
            hook: hookText,
            script: body.copyText || (script.length > 140 ? script.substring(0, 137) + "..." : script),
            nomeSpot: body.nomeSpot || title,
            cta: "Fale com a nossa equipe",
          },
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
