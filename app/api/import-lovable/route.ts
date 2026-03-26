import { NextResponse } from "next/server";
import { geminiText, isConfigured } from "@/lib/services/gemini-service";

export const maxDuration = 120;

export async function POST(request: Request) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "Cole o link do Lovable." }, { status: 400 });
  }

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "GOOGLE_GENAI_API_KEY não configurada. Adicione no .env.local" },
      { status: 400 }
    );
  }

  try {
    // Fetch page content (HTML + JS bundle)
    const pageContent = await fetchLovableContent(url);

    if (!pageContent || pageContent.length < 100) {
      return NextResponse.json(
        { error: "Não consegui ler o conteúdo da página. Verifique o link." },
        { status: 400 }
      );
    }

    // Use Gemini to extract structured data in simplified format
    const prompt = `Analise o conteúdo desta página de briefing de empreendimento imobiliário e extraia os dados principais.

CONTEÚDO DA PÁGINA:
${pageContent.slice(0, 25000)}

Extraia no formato JSON abaixo. Se algum campo não existir, deixe "".
Responda APENAS o JSON, sem markdown:

{
  "nomeSpot": "nome completo do empreendimento/SPOT exatamente como aparece no briefing",
  "localizacao": "bairro e cidade (ex: Campeche, Florianópolis)",
  "pontosFortes": ["ponto forte 1 com dado real", "ponto forte 2 com dado real", "ponto forte 3 com dado real"],
  "doseDonts": "Resuma em 2 blocos: DO: o que os criativos devem fazer/dizer. DON'T: o que evitar.",
  "resumo": "Resumo completo de tudo que foi extraído da página: descrição do empreendimento, diferenciais, dados financeiros (ROI, valor de aluguel, etc.), localização detalhada, público-alvo, estilo visual, diretrizes de criativo e qualquer outra informação relevante."
}

IMPORTANTE para pontosFortes: inclua dados concretos como ROI, valor de aluguel mensal, distância da praia, número de unidades, etc.
IMPORTANTE para resumo: seja completo e detalhado — este campo será usado para gerar 45 roteiros de marketing.`;

    const result = await geminiText(prompt);

    if (!result) {
      return NextResponse.json(
        { error: "Erro ao processar com IA. Tente novamente." },
        { status: 500 }
      );
    }

    // Parse JSON from response
    let jsonStr = result.trim().replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) jsonStr = match[0];

    const data = JSON.parse(jsonStr);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro import:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao importar" },
      { status: 500 }
    );
  }
}

async function fetchLovableContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const html = await res.text();

    // Try to fetch the JS bundle which contains the SPA content
    const jsMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (jsMatch) {
      const baseUrl = new URL(url);
      const jsUrl = `${baseUrl.origin}${jsMatch[1]}`;
      const jsRes = await fetch(jsUrl);
      const jsContent = await jsRes.text();

      // Extract readable Portuguese strings from the bundle
      const strings = extractPortugueseContent(jsContent);
      return strings || html;
    }

    return html;
  } catch {
    return "";
  }
}

function extractPortugueseContent(js: string): string {
  const results: string[] = [];

  // Match quoted strings containing Portuguese characters (accents)
  const patterns = [
    /"([^"]{15,}[àáâãéêíóôõúçÀÁÂÃÉÊÍÓÔÕÚÇ][^"]{3,})"/g,
    /'([^']{15,}[àáâãéêíóôõúçÀÁÂÃÉÊÍÓÔÕÚÇ][^']{3,})'/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(js)) !== null) {
      if (match[1].length > 15 && match[1].length < 3000 && !match[1].includes("\\x")) {
        results.push(match[1]);
      }
    }
  }

  // Also extract strings with common briefing keywords
  const kwPattern = /["']([^"']*(?:empreendimento|SPOT|take|criativo|apresentadora|narrad|estático|fachada|drone|hook|CTA|roteiro|briefing|hóspede|temporada|investimento|rentabilidade|Seazone|Campeche|praia)[^"']{5,})["']/gi;
  let match;
  while ((match = kwPattern.exec(js)) !== null) {
    if (match[1].length > 10 && match[1].length < 3000) {
      results.push(match[1]);
    }
  }

  const unique = Array.from(new Set(results));
  return unique.join("\n\n");
}
