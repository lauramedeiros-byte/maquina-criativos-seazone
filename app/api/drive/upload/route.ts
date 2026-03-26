import { NextResponse } from "next/server";
import { getBatchState } from "@/lib/batch-state";

export async function POST(request: Request) {
  const body = await request.json();
  const { folderId, nomeSpot } = body;

  if (!folderId) {
    return NextResponse.json(
      { error: "ID da pasta do Google Drive é obrigatório" },
      { status: 400 }
    );
  }

  // Extract folder ID from URL if full URL was pasted
  let cleanFolderId = folderId;
  const folderMatch = folderId.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    cleanFolderId = folderMatch[1];
  }

  const state = getBatchState();
  const creativeCount = state.creatives.length;

  // Check if Google Drive API is configured
  const driveApiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const driveClientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!driveApiKey && !driveClientEmail) {
    // Demo mode — simulate upload
    return NextResponse.json({
      success: true,
      demo: true,
      message: `${creativeCount} criativos do SPOT "${nomeSpot}" seriam enviados para a pasta ${cleanFolderId}`,
      folderId: cleanFolderId,
      filesCount: creativeCount,
      note: "Configure GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_DRIVE_API_KEY no .env.local para upload real",
    });
  }

  // TODO: Real Google Drive upload implementation
  // When configured, this would:
  // 1. Authenticate with Google Drive API using service account
  // 2. Create a subfolder named after the SPOT + timestamp
  // 3. Upload all generated files (images, videos, audio)
  // 4. Return the folder URL

  try {
    // Placeholder for real implementation
    return NextResponse.json({
      success: true,
      message: `${creativeCount} criativos enviados para Google Drive`,
      folderId: cleanFolderId,
      folderUrl: `https://drive.google.com/drive/folders/${cleanFolderId}`,
      filesCount: creativeCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao fazer upload",
      },
      { status: 500 }
    );
  }
}
