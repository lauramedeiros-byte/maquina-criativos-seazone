import sharp from "sharp";

interface OverlayOptions {
  imageUrl: string;
  title: string;
  hook: string;
  script: string;
  nomeSpot: string;
}

export async function overlayTextOnImage(options: OverlayOptions): Promise<string> {
  const { imageUrl, title, hook, script, nomeSpot } = options;

  // Download the image from Fal AI
  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  // Resize to 1080x1080
  const base = sharp(buffer).resize(1080, 1080, { fit: "cover" });

  // Truncate script to first ~120 chars for the overlay
  const shortScript = script.length > 120 ? script.substring(0, 117) + "..." : script;

  // Escape XML entities
  function escXml(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const svg = `
    <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(0,0,0,0)" />
          <stop offset="40%" stop-color="rgba(0,0,0,0)" />
          <stop offset="70%" stop-color="rgba(0,0,0,0.6)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.85)" />
        </linearGradient>
      </defs>

      <!-- Dark gradient overlay -->
      <rect width="1080" height="1080" fill="url(#grad)" />

      <!-- Accent bar at bottom -->
      <rect x="0" y="1040" width="1080" height="40" fill="#1F4E78" />

      <!-- Top accent line -->
      <rect x="40" y="40" width="80" height="4" fill="#3B9AE1" rx="2" />

      <!-- SEAZONE badge top-right -->
      <rect x="880" y="30" width="160" height="36" rx="8" fill="rgba(31,78,120,0.8)" />
      <text x="960" y="55" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="2">SEAZONE</text>

      <!-- Hook text (large, bold) -->
      <foreignObject x="40" y="580" width="1000" height="200">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, Helvetica, sans-serif; font-size: 42px; font-weight: 800; color: white; line-height: 1.15; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">
          ${escXml(hook || title)}
        </div>
      </foreignObject>

      <!-- Script/body text -->
      <foreignObject x="40" y="790" width="1000" height="180">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 400; color: rgba(255,255,255,0.9); line-height: 1.4; text-shadow: 0 1px 4px rgba(0,0,0,0.5);">
          ${escXml(shortScript)}
        </div>
      </foreignObject>

      <!-- SPOT name at bottom bar -->
      <text x="540" y="1067" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="1">${escXml(nomeSpot.toUpperCase())}</text>
    </svg>
  `;

  const svgBuffer = Buffer.from(svg);

  const composited = await base
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();

  const base64 = composited.toString("base64");
  return `data:image/png;base64,${base64}`;
}
