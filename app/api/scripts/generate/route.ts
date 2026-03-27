import { NextResponse } from "next/server";
import { geminiText, isConfigured } from "@/lib/services/gemini-service";

export const maxDuration = 300;

interface RequestBody {
  nomeSpot: string;
  localizacao: string;
  pontosObrigatorios: string; // mandatory points that MUST appear
  doseDonts: string;
  lovableData: any; // full data from Lovable import
}

const SEAZONE_CONTEXT = `
## CONTEXTO OBRIGATÓRIO — Seazone e SPOTs

A Seazone é uma empresa de gestão de aluguel por temporada. Conecta proprietários de imóveis a hóspedes, cuidando de toda a operação para gerar renda com praticidade e segurança. Em resumo, a Seazone transforma imóveis em renda sem dor de cabeça para o proprietário.

Além de cuidar de Airbnbs para proprietários, a Seazone PROJETA empreendimentos chamados SPOT — pensados desde o início para aluguel por temporada. Diferente de um imóvel tradicional, um SPOT já nasce otimizado para rentabilidade.

Características dos SPOTs:
- São 47 SPOTs Seazone, cada um com suas particularidades
- Todos localizados em regiões turísticas e posicionados estrategicamente na cidade
- Investimento a preço de custo, na planta
- Imóveis compactos = ticket de compra reduzido
- ROI competitivo no mercado imobiliário
- O SPOT é o produto de investimento; a gestão Seazone vem depois da entrega

O DISCURSO BASE de todo criativo deve girar em torno de:
- Investimento inteligente com rentabilidade real
- Imóvel que gera renda desde o primeiro dia (após entrega)
- Sem dor de cabeça — a Seazone cuida de tudo
- Preço de custo na planta (oportunidade)
- Localização turística estratégica
- Compacto e otimizado = menor investimento, maior retorno

IMPORTANTE: Os roteiros NÃO devem parecer propaganda genérica de imóvel de luxo. O tom é de INVESTIMENTO INTELIGENTE em aluguel por temporada, não de "compre sua casa dos sonhos". O público-alvo é o INVESTIDOR que quer renda passiva, não necessariamente o morador.
`.trim();

export async function POST(request: Request) {
  const body: RequestBody = await request.json();
  const { nomeSpot, localizacao, pontosObrigatorios, doseDonts, lovableData } = body;

  if (!isConfigured()) {
    return NextResponse.json({
      scripts: generateDemoScripts(nomeSpot, localizacao, pontosObrigatorios),
      warning: "Modo demo — configure GOOGLE_GENAI_API_KEY para roteiros reais",
    });
  }

  try {
    const prompt = buildPrompt(nomeSpot, localizacao, pontosObrigatorios, doseDonts, lovableData);

    const result = await geminiText(prompt);

    if (!result) throw new Error("Sem resposta do Gemini");

    const scripts = parseScriptsResponse(result);

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error("Erro ao gerar roteiros:", error);
    return NextResponse.json({
      scripts: generateDemoScripts(nomeSpot, localizacao, pontosObrigatorios),
      warning: "Usando roteiros demo (erro na API: " + (error instanceof Error ? error.message : "desconhecido") + ")",
    });
  }
}

function buildPrompt(
  nomeSpot: string,
  localizacao: string,
  pontosObrigatorios: string,
  doseDonts: string,
  lovableData: any
): string {
  const resumo = lovableData?.resumo || "";

  return `Você é um copywriter especialista em marketing de investimento imobiliário para aluguel por temporada. Gere 45 roteiros de criativos para o SPOT "${nomeSpot}"${localizacao ? `, localizado em ${localizacao}` : ""}.

${SEAZONE_CONTEXT}

## Particularidades deste SPOT — "${nomeSpot}":
**Localização:** ${localizacao || "A definir"}

${resumo ? `## Resumo completo do empreendimento:\n${resumo}\n` : ""}

## PONTOS OBRIGATÓRIOS (CRÍTICO):
${pontosObrigatorios}

Distribua os pontos obrigatórios entre os 45 roteiros. Cada criativo DEVE mencionar pelo menos 1 ponto obrigatório — use os dados reais acima (números, percentuais, valores) para tornar os roteiros concretos e críveis. Não invente dados que não estejam nos pontos obrigatórios.

${doseDonts ? `## Do's and Don'ts deste empreendimento:\n${doseDonts}\n` : ""}

## Distribuição dos 45 criativos:

### 15 ESTÁTICOS (imagens com texto para feed/stories)
- Hook visual forte que prende scroll (máx 8 palavras)
- Corpo de apoio com dado concreto do briefing (máx 2 linhas)
- Prompt de imagem descritivo para IA geradora (em inglês) — APENAS a cena visual
- Alguns devem ter tom de urgência/escassez, outros educativo, outros aspiracional

### 15 NARRADOS (vídeo com voz over)
- Roteiro de 15-30 segundos
- Tom profissional mas acessível — investidor conversa com investidor
- Hook de abertura nos primeiros 3 segundos que PRENDA atenção
- Desenvolvimento com dados/benefícios concretos
- CTA claro ao final
- Variar entre: storytelling, dados/números, comparativo, testemunho fictício, educativo

### 15 APRESENTADORA (vídeo com avatar/apresentadora)
- Roteiro de 15-30 segundos, tom conversacional e carismático
- Como se uma especialista em investimentos estivesse falando diretamente com você
- Deve soar NATURAL, não roteirizado
- Abertura que gera curiosidade + informação relevante + convite à ação
- Variar abordagens: revelação, pergunta provocativa, dado surpreendente, história rápida

## FORMATO DE RESPOSTA (OBRIGATÓRIO):
Responda EXATAMENTE neste formato JSON (sem markdown, sem \`\`\`):
[
  {
    "id": 1,
    "type": "static",
    "title": "título curto",
    "layers": {
      "background": {
        "imagePrompt": "Detailed English prompt for AI image generation. Describe ONLY the visual scene: building facade, aerial view, beach, interior, etc. NO text, NO logos, NO overlays.",
        "style": "photo | render | aerial | lifestyle",
        "useReference": true
      },
      "text": {
        "hook": "Frase de gancho curta e impactante (máx 8 palavras)",
        "body": "Frase de apoio com dado concreto do briefing (máx 2 linhas)",
        "cta": "Fale com a nossa equipe"
      },
      "logos": {
        "seazone": true,
        "empreendimento": true
      }
    },
    "script": "Roteiro interno completo com direcionamentos visuais, tom, etc."
  },
  ...mais 44 objetos
]

IDs de 1 a 45. Tipos: 1-15 = "static", 16-30 = "narrated", 31-45 = "avatar".
Cada roteiro DEVE SER ÚNICO — explore diferentes ângulos, objeções, benefícios e emoções.
NUNCA repita a mesma estrutura de frase ou abordagem entre roteiros do mesmo tipo.

## Instruções de preenchimento das camadas:
- layers.background.imagePrompt: APENAS descreve a cena visual para geração de imagem por IA. DEVE estar em inglês. Deve referenciar as características reais do empreendimento (localização, estilo de fachada, arredores).
- layers.background.style: um de "photo" (fotorrealista), "render" (render arquitetônico 3D), "aerial" (vista de drone), "lifestyle" (pessoas/cena de lifestyle)
- layers.background.useReference: true se a imagem deve usar os assets de referência do empreendimento (fachada, fotos)
- layers.text.hook: o texto BIG e em negrito (máx 8 palavras, impactante, chama atenção)
- layers.text.body: texto de apoio com dados reais do briefing (ROI, preço, renda de aluguel, etc.)
- layers.text.cta: SEMPRE "Fale com a nossa equipe" para estáticos
- layers.logos.seazone: sempre true
- layers.logos.empreendimento: true para imagens estáticas
- script: roteiro interno completo com direções visuais (NÃO aparece para o espectador)

REGRA CRÍTICA DE SEPARAÇÃO DE CAMADAS:
1. layers.background.imagePrompt = APENAS a cena visual (prédio, praia, drone). NUNCA inclua texto, logos, ou overlays.
2. layers.text = APENAS o texto de marketing que o espectador lê. NUNCA inclua descrições visuais aqui.
3. layers.logos = quais logos aparecem (Seazone sempre, empreendimento quando aplicável).
4. script = uso interno, NÃO aparece no criativo final.

EXEMPLOS:
✅ CORRETO - hook: "Seu ROI em Floripa"
✅ CORRETO - body: "16,4% ao ano. Novo Campeche SPOT II."
✅ CORRETO - imagePrompt: "Modern beachfront apartment building with tropical vegetation, Campeche beach Florianopolis, aerial drone view, golden hour, professional real estate photography"
❌ ERRADO - hook: "Visualmente, mostre a fachada do empreendimento com ROI"
❌ ERRADO - imagePrompt: "Image with text showing ROI 16.4% and Seazone logo"

OBRIGATÓRIO: Todo criativo DEVE terminar com um CTA. Para estáticos, layers.text.cta = "Fale com a nossa equipe".`;
}

function parseScriptsResponse(text: string) {
  let jsonStr = text.trim();
  jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

  try {
    const scripts = JSON.parse(jsonStr);
    if (Array.isArray(scripts) && scripts.length > 0) {
      return scripts;
    }
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // Fall through
      }
    }
  }

  throw new Error("Não foi possível interpretar a resposta da IA");
}

function generateDemoScripts(nomeSpot: string, localizacao: string, pontosObrigatorios: string) {
  const scripts = [];
  const loc = localizacao || "região turística";

  // Parse mandatory points from the string, or use defaults
  const pontosList = pontosObrigatorios
    ? pontosObrigatorios.split(/\n|,/).map((p) => p.trim()).filter(Boolean)
    : [
        "A 300m da praia, região com alta demanda turística",
        "Preço de custo na planta — oportunidade de entrada",
        "Imóvel compacto e otimizado para máxima rentabilidade",
        "Gestão completa Seazone após entrega",
        "ROI projetado acima da média do mercado",
      ];

  const staticAngles = [
    {
      title: "Rentabilidade",
      layers: {
        background: { imagePrompt: `Modern compact vacation rental apartment building, ${loc}, tropical vegetation, professional real estate photography, golden hour, clean facade`, style: "photo", useReference: true },
        text: { hook: `Seu imóvel pode render mais que a poupança.`, body: `${nomeSpot}: investimento a preço de custo em ${loc}.`, cta: "Fale com a nossa equipe" },
        logos: { seazone: true, empreendimento: true },
      },
      script: `${nomeSpot}: investimento a preço de custo em ${loc}. Seu imóvel trabalhando por você 365 dias por ano. Visualmente, imagem do empreendimento com destaque para rentabilidade.`,
    },
    {
      title: "Preço de Custo",
      layers: {
        background: { imagePrompt: `Architectural render of modern apartment building floor plan, clean minimal design, investment property, professional visualization`, style: "render", useReference: true },
        text: { hook: "Preço de custo. Sem intermediário.", body: `Direto na planta, a preço de custo. Menos investimento, mais retorno.`, cta: "Fale com a nossa equipe" },
        logos: { seazone: true, empreendimento: true },
      },
      script: `Investir no ${nomeSpot} é comprar direto na planta, a preço de custo. Menos investimento, mais retorno. Mostrar planta do empreendimento.`,
    },
    {
      title: "Localização",
      layers: {
        background: { imagePrompt: `Aerial drone view of ${loc}, tourist destination, beaches, city, vacation destination, beautiful landscape, golden hour`, style: "aerial", useReference: false },
        text: { hook: `${loc}: onde turista não para de chegar.`, body: `${nomeSpot} em ${loc} — alta demanda de aluguel por temporada.`, cta: "Fale com a nossa equipe" },
        logos: { seazone: true, empreendimento: true },
      },
      script: `O ${nomeSpot} está em ${loc} — uma das regiões com maior demanda de aluguel por temporada do Brasil. Imagem aérea da localização.`,
    },
    {
      title: "Gestão Seazone",
      layers: {
        background: { imagePrompt: `Modern smartphone showing property management app dashboard, clean desk, professional setting, soft lighting, investment lifestyle`, style: "lifestyle", useReference: false },
        text: { hook: "Renda sem dor de cabeça.", body: `Compre o ${nomeSpot}. A Seazone cuida do resto.`, cta: "Fale com a nossa equipe" },
        logos: { seazone: true, empreendimento: true },
      },
      script: `Compre o ${nomeSpot}. A Seazone cuida do resto — hóspedes, limpeza, manutenção, tudo. Você só recebe. Mostrar app de gestão.`,
    },
    {
      title: "Compacto e Inteligente",
      layers: {
        background: { imagePrompt: `Modern compact studio apartment interior, well-designed small space, vacation rental ready, clean aesthetic, natural light, ${loc}`, style: "lifestyle", useReference: true },
        text: { hook: "Menor ticket. Maior retorno.", body: `${nomeSpot}: menor investimento, maior retorno por m².`, cta: "Fale com a nossa equipe" },
        logos: { seazone: true, empreendimento: true },
      },
      script: `Imóvel compacto = investimento menor. No ${nomeSpot}, cada metro quadrado foi pensado para maximizar ocupação e rentabilidade. Planta inteligente.`,
    },
    {
      title: "Otimizado para Airbnb",
      layers: {
        background: { imagePrompt: `Modern vacation rental apartment interior, stylish furniture, Airbnb-ready design, cozy atmosphere, ${loc} style, professional interior photography`, style: "lifestyle", useReference: true },
        text: { hook: "Projetado para ser Airbnb desde o dia 1.", body: `${nomeSpot}: nasceu para aluguel por temporada. Cada detalhe pensado para o hóspede.`, cta: "Fale com a nossa equipe" },
        logos: { seazone: true, empreendimento: true },
      },
      script: `Diferente de qualquer imóvel, o ${nomeSpot} nasceu para aluguel por temporada. Cada detalhe pensado para o hóspede. Interior moderno e funcional.`,
    },
    {
      title: "Investimento Inteligente",
      layers: {
        background: { imagePrompt: `Modern apartment building exterior at dusk, city lights, ${loc}, real estate investment, architectural photography, clean lines`, style: "photo", useReference: true },
        text: { hook: "Enquanto você dorme, seu SPOT rende.", body: `${nomeSpot}: renda passiva real em ${loc}.`, cta: "Fale com a nossa equipe" },
        logos: { seazone: true, empreendimento: true },
      },
      script: `${nomeSpot}: o investimento inteligente em ${loc}. Renda passiva real, sem complicação. Mostrar gráfico de crescimento.`,
    },
    {
      title: "Alta Ocupação",
      layers: {
        background: { imagePrompt: `Busy tourist beach in ${loc}, many visitors, summer season, aerial view, vibrant colors, high season tourism`, style: "aerial", useReference: false },
        text: { hook: "Região com ocupação acima de 70%.", body: `${loc} é destino o ano inteiro. ${nomeSpot} aproveita cada temporada.`, cta: "Fale com a nossa equipe" },
        logos: { seazone: true, empreendimento: true },
      },
      script: `${loc} é destino o ano inteiro. O ${nomeSpot} aproveita cada temporada para gerar renda para você. Imagem da região turística.`,
    },
    {
      title: "Escassez",
      layers: {
        background: { imagePrompt: `Apartment building construction site at sunset, modern architecture, investment opportunity, ${loc}, real estate development`, style: "render", useReference: true },
        text: { hook: "Últimas unidades a preço de lançamento.", body: `${nomeSpot}: preço de custo é agora. Depois, só valoriza.`, cta: "Fale com a nossa equipe" },
        logos: { seazone: true, empreendimento: true },
      },
      script: `O ${nomeSpot} está em fase de lançamento. Preço de custo é agora — depois, só valoriza. Urgência visual com contador.`,
    },
    {
      title: "Sem Burocracia",
      layers: {
        background: { imagePrompt: `Relaxed investor checking phone on terrace, modern building background, ${loc}, lifestyle photography, soft natural light`, style: "lifestyle", useReference: false },
        text: { hook: "Investir em imóvel nunca foi tão simples.", body: `SPOT ${nomeSpot} + gestão Seazone = renda passiva sem burocracia.`, cta: "Fale com a nossa equipe" },
        logos: { seazone: true, empreendimento: true },
      },
      script: `SPOT ${nomeSpot} + gestão Seazone = renda passiva sem burocracia. Simples assim. Ícones de processo simplificado.`,
    },
  ];

  const narratedAngles = [
    { title: "O que é um SPOT", hook: "Você sabe o que é um SPOT Seazone?", script: `Você sabe o que é um SPOT Seazone? É um empreendimento projetado desde o primeiro dia para aluguel por temporada. O ${nomeSpot}, em ${loc}, foi pensado para que cada metro quadrado gere o máximo de retorno. Investimento a preço de custo, na planta, com gestão completa da Seazone após a entrega. Quer saber mais? Link na bio.` },
    { title: "Comparativo Renda", hook: "E se seu dinheiro rendesse mais que o banco?", script: `E se seu dinheiro rendesse mais que a poupança, mais que CDB, mais que muitos fundos? Com o ${nomeSpot}, em ${loc}, você investe a preço de custo em um imóvel que já nasce gerando renda por aluguel de temporada. E a Seazone cuida de toda a operação. Fale com um consultor.` },
    { title: "Localização Estratégica", hook: `Sabe por que ${loc} é ouro?`, script: `Sabe por que ${loc} é uma das regiões mais procuradas por turistas? Alta demanda o ano inteiro. E é exatamente aí que fica o ${nomeSpot}. Um empreendimento compacto, inteligente, projetado para Airbnb. Investimento a preço de custo com retorno real.` },
    { title: "Sem Dor de Cabeça", hook: "Imóvel que dá trabalho? Esquece.", script: `Imóvel que dá trabalho? Com a Seazone, esquece isso. Você investe no ${nomeSpot}, a gente cuida de hóspedes, limpeza, manutenção, precificação — tudo. Você acompanha seus rendimentos pelo app. Simples, transparente e rentável.` },
    { title: "Oportunidade na Planta", hook: "Comprar na planta é a jogada.", script: `Comprar na planta a preço de custo é a jogada mais inteligente no mercado imobiliário. O ${nomeSpot} em ${loc} é exatamente essa oportunidade. Quando o empreendimento ficar pronto, você já está recebendo. Enquanto outros pagam mais caro, você entrou primeiro.` },
  ];

  const avatarAngles = [
    { title: "Convite Direto", hook: `Oi! Deixa eu te contar sobre o ${nomeSpot}.`, script: `Oi! Deixa eu te contar sobre o ${nomeSpot}. É um SPOT Seazone em ${loc}, projetado 100% para aluguel por temporada. Sabe o que isso significa? Que cada detalhe do imóvel foi pensado para atrair hóspedes e gerar renda pra você. E o melhor: a preço de custo, na planta. Me chama que eu explico tudo!` },
    { title: "Pergunta Provocativa", hook: "Deixa eu te fazer uma pergunta.", script: `Deixa eu te fazer uma pergunta: quanto seu dinheiro rendeu no último ano? Agora imagina investir a preço de custo em um imóvel em ${loc} que já nasce pronto pra Airbnb. Isso é o ${nomeSpot}. E a Seazone cuida de toda a operação. Você literalmente investe e recebe. Quer saber mais?` },
    { title: "Dado Surpreendente", hook: "Sabia que aluguel por temporada rende até 3x mais?", script: `Sabia que aluguel por temporada pode render até 3 vezes mais que aluguel tradicional? É por isso que a Seazone criou o ${nomeSpot} em ${loc}. Um imóvel compacto, a preço de custo, totalmente otimizado pra Airbnb. Quando entrega, a gestão é com a gente. Me chama que eu te mostro os números!` },
    { title: "História Rápida", hook: "Vou te contar o que um investidor me disse.", script: `Vou te contar: um investidor me disse que o melhor negócio que ele fez foi entrar no SPOT certo, na hora certa. O ${nomeSpot} em ${loc} é exatamente isso. Planta, preço de custo, região turística, gestão Seazone. Se você está procurando investimento inteligente, precisa conhecer.` },
    { title: "Urgência", hook: "Se você está vendo isso, ainda dá tempo.", script: `Se você está vendo isso, ainda dá tempo de entrar no ${nomeSpot} a preço de custo. Mas não por muito tempo. É um empreendimento em ${loc}, pensado pra aluguel por temporada, com gestão completa da Seazone. Poucas unidades nessa condição. Me chama agora!` },
  ];

  // 15 static
  for (let i = 0; i < 15; i++) {
    const angle = staticAngles[i % staticAngles.length];
    const ponto = pontosList[i % pontosList.length];
    scripts.push({
      id: i + 1,
      type: "static",
      title: `Estático — ${angle.title}`,
      layers: {
        background: {
          imagePrompt: `${angle.layers.background.imagePrompt}, ${ponto.toLowerCase()}`,
          style: angle.layers.background.style,
          useReference: angle.layers.background.useReference,
        },
        text: angle.layers.text,
        logos: angle.layers.logos,
      },
      script: angle.script,
    });
  }

  // 15 narrated
  for (let i = 0; i < 15; i++) {
    const angle = narratedAngles[i % narratedAngles.length];
    const ponto = pontosList[i % pontosList.length];
    scripts.push({
      id: 16 + i,
      type: "narrated",
      title: `Narrado — ${angle.title}`,
      layers: {
        background: {
          imagePrompt: `Cinematic drone shot, vacation rental property, ${nomeSpot}, ${loc}, ${ponto.toLowerCase()}, tourist destination, golden hour, lifestyle`,
          style: "aerial",
          useReference: true,
        },
        text: {
          hook: angle.hook,
          body: angle.script.substring(0, 80) + "...",
          cta: "Fale com a nossa equipe",
        },
        logos: { seazone: true, empreendimento: false },
      },
      script: angle.script,
    });
  }

  // 15 avatar
  for (let i = 0; i < 15; i++) {
    const angle = avatarAngles[i % avatarAngles.length];
    scripts.push({
      id: 31 + i,
      type: "avatar",
      title: `Apresentadora — ${angle.title}`,
      layers: {
        background: {
          imagePrompt: `Clean modern background for presenter, vacation rental property showcase, ${nomeSpot}, ${loc}, professional studio setting`,
          style: "lifestyle",
          useReference: false,
        },
        text: {
          hook: angle.hook,
          body: angle.script.substring(0, 80) + "...",
          cta: "Fale com a nossa equipe",
        },
        logos: { seazone: true, empreendimento: false },
      },
      script: angle.script,
    });
  }

  return scripts;
}
