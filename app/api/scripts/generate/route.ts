import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;

interface RequestBody {
  nomeSpot: string;
  localizacao: string;
  pontosFortes: string[];
  lovableContent: string;
  videoReferencia: string;
  descricaoVisual: string;
  estiloReferencia: string;
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
  const { nomeSpot, localizacao, pontosFortes, lovableContent, videoReferencia, descricaoVisual, estiloReferencia } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      scripts: generateDemoScripts(nomeSpot, localizacao, pontosFortes),
    });
  }

  try {
    const client = new Anthropic({ apiKey });

    const prompt = buildPrompt(nomeSpot, localizacao, pontosFortes, lovableContent, videoReferencia, descricaoVisual, estiloReferencia);

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const scripts = parseScriptsResponse(content.text);

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error("Erro ao gerar roteiros:", error);
    return NextResponse.json({
      scripts: generateDemoScripts(nomeSpot, localizacao, pontosFortes),
      warning: "Usando roteiros de demonstração (erro na API)",
    });
  }
}

function buildPrompt(
  nomeSpot: string,
  localizacao: string,
  pontosFortes: string[],
  lovableContent: string,
  videoReferencia: string,
  descricaoVisual: string,
  estiloReferencia: string
): string {
  return `Você é um copywriter especialista em marketing de investimento imobiliário para aluguel por temporada. Gere 45 roteiros de criativos para o SPOT "${nomeSpot}"${localizacao ? `, localizado em ${localizacao}` : ""}.

${SEAZONE_CONTEXT}

## Particularidades deste SPOT — "${nomeSpot}":
**Localização:** ${localizacao || "A definir"}
**Pontos fortes específicos:**
${pontosFortes.map((p, i) => `${i + 1}. ${p}`).join("\n")}

${lovableContent ? `## Diretrizes (Do's and Don'ts) deste empreendimento:\n${lovableContent}\n` : ""}
${videoReferencia ? `## Referência de vídeo:\nO estilo/tom deve seguir a referência: ${videoReferencia}\n` : ""}
${descricaoVisual ? `## Descrição visual do estilo:\nAs imagens e vídeos devem seguir esta estética: ${descricaoVisual}\nIncorpore essa estética nos imagePrompts gerados.\n` : ""}
${estiloReferencia ? `## Estilo e referências de roteiros anteriores:\n${estiloReferencia}\n` : ""}

## Distribuição dos 45 criativos:

### 15 ESTÁTICOS (imagens com texto para feed/stories)
- Copy curta e impactante (máx 2 frases)
- Hook visual forte que prende scroll
- Cada criativo explora um ângulo diferente (rentabilidade, localização, preço, lifestyle do hóspede, gestão Seazone, etc.)
- Prompt de imagem descritivo para IA geradora (em inglês)
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
    "title": "título curto do criativo",
    "script": "texto do criativo/roteiro completo",
    "imagePrompt": "prompt em inglês para gerar imagem com IA",
    "hook": "frase de gancho/abertura"
  },
  ...mais 44 objetos
]

IDs de 1 a 45. Tipos: 1-15 = "static", 16-30 = "narrated", 31-45 = "avatar".
Cada roteiro DEVE SER ÚNICO — explore diferentes ângulos, objeções, benefícios e emoções.
NUNCA repita a mesma estrutura de frase ou abordagem entre roteiros do mesmo tipo.`;
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

function generateDemoScripts(nomeSpot: string, localizacao: string, pontosFortes: string[]) {
  const scripts = [];
  const loc = localizacao || "região turística";

  const pontos = pontosFortes.length > 0 ? pontosFortes : [
    "A 300m da praia, região com alta demanda turística",
    "Preço de custo na planta — oportunidade de entrada",
    "Imóvel compacto e otimizado para máxima rentabilidade",
    "Gestão completa Seazone após entrega",
    "ROI projetado acima da média do mercado",
  ];

  const staticAngles = [
    { title: "Rentabilidade", hook: "Seu imóvel pode render mais que a poupança.", script: `${nomeSpot}: investimento a preço de custo em ${loc}. Seu imóvel trabalhando por você 365 dias por ano.` },
    { title: "Preço de Custo", hook: "Preço de custo. Sem intermediário.", script: `Investir no ${nomeSpot} é comprar direto na planta, a preço de custo. Menos investimento, mais retorno.` },
    { title: "Localização", hook: `${loc}: onde turista não para de chegar.`, script: `O ${nomeSpot} está em ${loc} — uma das regiões com maior demanda de aluguel por temporada do Brasil.` },
    { title: "Gestão Seazone", hook: "Renda sem dor de cabeça.", script: `Compre o ${nomeSpot}. A Seazone cuida do resto — hóspedes, limpeza, manutenção, tudo. Você só recebe.` },
    { title: "Compacto e Inteligente", hook: "Menor ticket. Maior retorno.", script: `Imóvel compacto = investimento menor. No ${nomeSpot}, cada metro quadrado foi pensado para maximizar ocupação e rentabilidade.` },
    { title: "Otimizado para Airbnb", hook: "Projetado para ser Airbnb desde o dia 1.", script: `Diferente de qualquer imóvel, o ${nomeSpot} nasceu para aluguel por temporada. Cada detalhe pensado para o hóspede.` },
    { title: "Investimento Inteligente", hook: "Enquanto você dorme, seu SPOT rende.", script: `${nomeSpot}: o investimento inteligente em ${loc}. Renda passiva real, sem complicação.` },
    { title: "Alta Ocupação", hook: "Região com ocupação acima de 70%.", script: `${loc} é destino o ano inteiro. O ${nomeSpot} aproveita cada temporada para gerar renda para você.` },
    { title: "Escassez", hook: "Últimas unidades a preço de lançamento.", script: `O ${nomeSpot} está em fase de lançamento. Preço de custo é agora — depois, só valoriza.` },
    { title: "Sem Burocracia", hook: "Investir em imóvel nunca foi tão simples.", script: `SPOT ${nomeSpot} + gestão Seazone = renda passiva sem burocracia. Simples assim.` },
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
    const ponto = pontos[i % pontos.length];
    scripts.push({
      id: i + 1,
      type: "static",
      title: `Estático — ${angle.title}`,
      script: angle.script,
      imagePrompt: `Modern compact vacation rental apartment, ${nomeSpot}, ${loc}, ${ponto.toLowerCase()}, clean minimal design, investment property, aerial view of tourist region, professional real estate photography, 4K`,
      hook: angle.hook,
    });
  }

  // 15 narrated
  for (let i = 0; i < 15; i++) {
    const angle = narratedAngles[i % narratedAngles.length];
    const ponto = pontos[i % pontos.length];
    scripts.push({
      id: 16 + i,
      type: "narrated",
      title: `Narrado — ${angle.title}`,
      script: angle.script,
      imagePrompt: `Cinematic drone shot, vacation rental property, ${nomeSpot}, ${loc}, ${ponto.toLowerCase()}, tourist destination, golden hour, lifestyle`,
      hook: angle.hook,
    });
  }

  // 15 avatar
  for (let i = 0; i < 15; i++) {
    const angle = avatarAngles[i % avatarAngles.length];
    scripts.push({
      id: 31 + i,
      type: "avatar",
      title: `Apresentadora — ${angle.title}`,
      script: angle.script,
      imagePrompt: `Clean modern background for presenter, vacation rental property showcase, ${nomeSpot}, ${loc}, professional`,
      hook: angle.hook,
    });
  }

  return scripts;
}
