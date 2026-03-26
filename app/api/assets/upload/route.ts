import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Allowed file extensions for security
const ALLOWED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".mp4", ".mov", ".webm", ".avi",
]);

// Sanitise a folder name so it cannot escape public/assets/
function sanitiseFolder(folder: string): string {
  return folder
    .replace(/[^a-zA-Z0-9_\-]/g, "-") // only safe chars
    .replace(/^-+|-+$/g, "")           // trim leading/trailing dashes
    .toLowerCase();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const rawFolder = (formData.get("folder") as string | null) ?? "uploads";
    const folder = sanitiseFolder(rawFolder);

    if (!folder) {
      return NextResponse.json(
        { error: "Nome de pasta inválido" },
        { status: 400 }
      );
    }

    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    const destDir = path.join(process.cwd(), "public", "assets", folder);
    await mkdir(destDir, { recursive: true });

    const savedPaths: string[] = [];
    const errors: { name: string; error: string }[] = [];

    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();

      if (!ALLOWED_EXTENSIONS.has(ext)) {
        errors.push({ name: file.name, error: `Extensão não permitida: ${ext}` });
        continue;
      }

      // Use a timestamp prefix to avoid collisions
      const safeName = `${Date.now()}_${path.basename(file.name).replace(/[^a-zA-Z0-9._\-]/g, "_")}`;
      const filePath = path.join(destDir, safeName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      savedPaths.push(`/assets/${folder}/${safeName}`);
    }

    return NextResponse.json({
      success: true,
      folder,
      saved: savedPaths,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro ao fazer upload",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
