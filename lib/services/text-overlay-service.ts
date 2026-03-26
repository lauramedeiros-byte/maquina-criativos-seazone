import sharp from "sharp";

interface OverlayOptions {
  imageUrl: string;
  title: string;
  hook: string;
  script: string;
  nomeSpot: string;
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wraps text into lines that fit within maxWidth at the given fontSize.
 * Approximate: assumes ~0.55 * fontSize per character width (for Arial).
 */
function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  const charWidth = fontSize * 0.52;
  const maxChars = Math.floor(maxWidth / charWidth);
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Generates SVG <text> elements with <tspan> for each line.
 */
function svgTextBlock(
  lines: string[],
  x: number,
  startY: number,
  fontSize: number,
  lineHeight: number,
  opts: { fontWeight?: string; fill?: string; opacity?: number } = {}
): string {
  const { fontWeight = "normal", fill = "white", opacity = 1 } = opts;
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${startY + i * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" opacity="${opacity}">${escXml(line)}</text>`
    )
    .join("\n      ");
}

export async function overlayTextOnImage(options: OverlayOptions): Promise<string> {
  const { imageUrl, title, hook, script, nomeSpot } = options;

  // Download the image from Fal AI
  const response = await fetch(imageUrl);
  const arrayBuf = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  // Resize to 1080x1080
  const base = sharp(buffer).resize(1080, 1080, { fit: "cover" });

  // Prepare text content
  const hookText = hook || title;
  const shortScript =
    script.length > 140 ? script.substring(0, 137) + "..." : script;

  // Wrap text lines
  const hookLines = wrapText(hookText, 44, 1000);
  const scriptLines = wrapText(shortScript, 22, 1000);

  // Calculate vertical positions
  const hookStartY = 640;
  const hookLineHeight = 54;
  const scriptStartY = hookStartY + hookLines.length * hookLineHeight + 20;
  const scriptLineHeight = 32;

  // Build SVG overlay (NO foreignObject — pure SVG text only)
  const svg = `<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000000" stop-opacity="0" />
          <stop offset="35%" stop-color="#000000" stop-opacity="0" />
          <stop offset="65%" stop-color="#000000" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.88" />
        </linearGradient>
      </defs>

      <!-- Dark gradient overlay for text readability -->
      <rect width="1080" height="1080" fill="url(#grad)" />

      <!-- Bottom accent bar -->
      <rect x="0" y="1040" width="1080" height="40" fill="#1F4E78" />

      <!-- Top-left accent line -->
      <rect x="40" y="40" width="80" height="4" fill="#3B9AE1" rx="2" />

      <!-- SEAZONE badge top-right -->
      <rect x="870" y="28" width="170" height="38" rx="8" fill="#1F4E78" opacity="0.85" />
      <text x="955" y="53" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="3">SEAZONE</text>

      <!-- Hook text (large, bold, white) -->
      ${svgTextBlock(hookLines, 50, hookStartY, 44, hookLineHeight, { fontWeight: "bold" })}

      <!-- Script body text (smaller, semi-transparent) -->
      ${svgTextBlock(scriptLines, 50, scriptStartY, 22, scriptLineHeight, { opacity: 0.9 })}

      <!-- SPOT name centered in bottom bar -->
      <text x="540" y="1067" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="2">${escXml((nomeSpot || "").toUpperCase())}</text>
    </svg>`;

  const svgBuffer = Buffer.from(svg);

  const composited = await base
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();

  const base64 = composited.toString("base64");
  return `data:image/png;base64,${base64}`;
}
