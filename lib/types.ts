export interface Briefing {
  projectName: string;
  client: string;
  duration: number;
  style: string;
  script: string;
  imagePrompt: string;
  voiceConfig: {
    language: string;
    gender: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface EmpreendimentoForm {
  nome: string;
  pontosFortes: string[];
  lovableLink: string;
  estiloReferencia: string;
}

export interface GeneratedScript {
  id: number;
  type: "static" | "narrated" | "avatar";
  title: string;
  script: string;
  imagePrompt: string;
  hook: string;
}

export interface Creative {
  creativeId: string;
  type: "static" | "narrated" | "avatar";
  status: "completed" | "error";
  title?: string;
  images?: string[];
  voiceover?: string;
  avatar?: string;
  script?: string;
  imagePrompt?: string;
  hook?: string;
  briefing?: string;
  duration?: string;
  message?: string;
  [key: string]: unknown;
}

export interface BatchState {
  isRunning: boolean;
  totalCreatives: number;
  completedCreatives: number;
  currentProject: string;
  distribution: {
    static: number;
    narrated: number;
    avatar: number;
  };
  creatives: Creative[];
  startTime: number | null;
  errors: string[];
}

export interface BriefingInfo {
  id: string;
  name: string;
  file: string;
}
