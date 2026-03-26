import { Briefing, BriefingInfo } from "./types";

// Briefings embedded for serverless compatibility (no fs access on Vercel)
const briefings: Record<string, Briefing> = {
  "novo-campeche-briefing": {
    projectName: "Novo Campeche - SPOT II",
    client: "Novo Campeche",
    duration: 30,
    style: "Professional",
    script:
      "Bem-vindo ao Novo Campeche SPOT II. Onde a inovação encontra a tradição.",
    imagePrompt:
      "Modern beach resort, luxury, sunset, professional photography",
    voiceConfig: { language: "pt-BR", gender: "female" },
    colors: { primary: "#1F4E78", secondary: "#2E75B6", accent: "#FFFFFF" },
  },
};

export function listBriefings(): BriefingInfo[] {
  return Object.entries(briefings).map(([id, b]) => ({
    id,
    name: b.projectName,
    file: `${id}.json`,
  }));
}

export function getBriefing(id: string): Briefing | null {
  // Accept both "novo-campeche-briefing" and "novo-campeche-briefing.json"
  const cleanId = id.replace(".json", "");
  return briefings[cleanId] || null;
}

export function addBriefing(id: string, briefing: Briefing) {
  briefings[id] = briefing;
}
