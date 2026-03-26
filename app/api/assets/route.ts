import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".avi"]);

function getAssetType(filename: string): "image" | "video" | null {
  const ext = path.extname(filename).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  return null;
}

interface Asset {
  name: string;
  path: string;
  type: "image" | "video";
  folder: string;
}

interface GroupedAssets {
  [folder: string]: Asset[];
}

export async function GET() {
  try {
    const assetsDir = path.join(process.cwd(), "public", "assets");

    if (!fs.existsSync(assetsDir)) {
      return NextResponse.json({ folders: {} });
    }

    const grouped: GroupedAssets = {};

    const folders = fs
      .readdirSync(assetsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const folder of folders) {
      const folderPath = path.join(assetsDir, folder);
      const files = fs.readdirSync(folderPath, { withFileTypes: true });

      const assets: Asset[] = [];

      for (const file of files) {
        if (!file.isFile()) continue;

        const type = getAssetType(file.name);
        if (!type) continue;

        assets.push({
          name: file.name,
          path: `/assets/${folder}/${file.name}`,
          type,
          folder,
        });
      }

      // Always include the folder key, even if empty
      grouped[folder] = assets;
    }

    return NextResponse.json({ folders: grouped });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro ao listar assets",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
