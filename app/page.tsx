"use client";

import { useState, useCallback, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────
interface GeneratedScript {
  id: number;
  type: "static" | "narrated" | "avatar";
  title: string;
  script: string;
  imagePrompt: string;
  hook: string;
  approvedAnalyst?: boolean;
  approvedHead?: boolean;
  edited?: boolean;
}

type Step = "form" | "generating" | "review-analyst" | "review-head" | "production" | "done";

const TYPE_CONFIG = {
  static: {
    label: "Estático",
    labelFull: "Imagem Estática",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
  },
  narrated: {
    label: "Narrado",
    labelFull: "Vídeo Narrado",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-800",
  },
  avatar: {
    label: "Apresentadora",
    labelFull: "Vídeo com Apresentadora",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
};

const STEPS_INFO = [
  { key: "form", label: "Briefing", num: 1 },
  { key: "generating", label: "Gerando", num: 2 },
  { key: "review-analyst", label: "Analista", num: 3 },
  { key: "review-head", label: "Head", num: 4 },
  { key: "production", label: "Produção", num: 5 },
];

// ─── Main Page ───────────────────────────────────────────────────
export default function Home() {
  const [step, setStep] = useState<Step>("form");

  // Form state
  const [nomeSpot, setNomeSpot] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [pontosFortes, setPontosFortes] = useState<string[]>([""]);
  const [lovableLink, setLovableLink] = useState("");
  const [videoReferencia, setVideoReferencia] = useState("");
  const [descricaoVisual, setDescricaoVisual] = useState("");
  const [estiloReferencia, setEstiloReferencia] = useState("");

  // Google Drive
  const [driveFolderId, setDriveFolderId] = useState("");

  // Scripts state
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [generating, setGenerating] = useState(false);
  const [warning, setWarning] = useState("");

  // Production state
  const [producingStatic, setProducingStatic] = useState(false);
  const [producingVideo, setProducingVideo] = useState(false);
  const [staticProgress, setStaticProgress] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [staticDone, setStaticDone] = useState(false);
  const [videoDone, setVideoDone] = useState(false);
  const [uploadingDrive, setUploadingDrive] = useState(false);
  const [driveUploaded, setDriveUploaded] = useState(false);

  // Filter for script review
  const [typeFilter, setTypeFilter] = useState<"all" | "static" | "narrated" | "avatar">("all");

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  // ─── Form helpers ────────────────────────────────
  function addPontoForte() {
    if (pontosFortes.length < 5) setPontosFortes([...pontosFortes, ""]);
  }

  function removePontoForte(idx: number) {
    setPontosFortes(pontosFortes.filter((_, i) => i !== idx));
  }

  function updatePontoForte(idx: number, val: string) {
    const updated = [...pontosFortes];
    updated[idx] = val;
    setPontosFortes(updated);
  }

  // ─── Generate scripts ───────────────────────────
  async function handleGenerateScripts() {
    if (!nomeSpot.trim()) return alert("Preencha o nome do SPOT");
    const validPontos = pontosFortes.filter((p) => p.trim());
    if (validPontos.length === 0) return alert("Adicione ao menos 1 ponto forte");

    setStep("generating");
    setGenerating(true);
    setWarning("");

    try {
      const res = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeSpot,
          localizacao,
          pontosFortes: validPontos,
          lovableContent: lovableLink,
          videoReferencia,
          descricaoVisual,
          estiloReferencia,
        }),
      });

      const data = await res.json();

      if (data.warning) setWarning(data.warning);

      const scriptsWithApproval = (data.scripts || []).map((s: GeneratedScript) => ({
        ...s,
        approvedAnalyst: false,
        approvedHead: false,
      }));

      setScripts(scriptsWithApproval);
      setStep("review-analyst");
    } catch {
      alert("Erro ao gerar roteiros. Tente novamente.");
      setStep("form");
    } finally {
      setGenerating(false);
    }
  }

  // ─── Approval helpers ───────────────────────────
  function toggleApproval(id: number, stage: "analyst" | "head") {
    setScripts((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              ...(stage === "analyst"
                ? { approvedAnalyst: !s.approvedAnalyst }
                : { approvedHead: !s.approvedHead }),
            }
          : s
      )
    );
  }

  function approveAll(stage: "analyst" | "head") {
    const filtered = typeFilter === "all" ? scripts : scripts.filter((s) => s.type === typeFilter);
    const ids = new Set(filtered.map((s) => s.id));
    setScripts((prev) =>
      prev.map((s) =>
        ids.has(s.id)
          ? {
              ...s,
              ...(stage === "analyst" ? { approvedAnalyst: true } : { approvedHead: true }),
            }
          : s
      )
    );
  }

  function startEdit(script: GeneratedScript) {
    setEditingId(script.id);
    setEditText(script.script);
  }

  function saveEdit() {
    if (editingId === null) return;
    setScripts((prev) =>
      prev.map((s) => (s.id === editingId ? { ...s, script: editText, edited: true } : s))
    );
    setEditingId(null);
    setEditText("");
  }

  const allAnalystApproved = scripts.length > 0 && scripts.every((s) => s.approvedAnalyst);
  const allHeadApproved = scripts.length > 0 && scripts.every((s) => s.approvedHead);

  // ─── Production ─────────────────────────────────
  const pollStatus = useCallback((type: "static" | "video") => {
    fetch("/api/batch/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.progress) {
          const pct = data.progress.percentage || 0;
          if (type === "static") setStaticProgress(pct);
          else setVideoProgress(pct);
          if (!data.isRunning && data.progress.completed > 0) {
            if (type === "static") { setProducingStatic(false); setStaticDone(true); }
            else { setProducingVideo(false); setVideoDone(true); }
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!producingStatic && !producingVideo) return;
    const type = producingStatic ? "static" : "video";
    const interval = setInterval(() => pollStatus(type), 1000);
    return () => clearInterval(interval);
  }, [producingStatic, producingVideo, pollStatus]);

  async function handleProduceStatic() {
    setProducingStatic(true);
    setStaticProgress(0);
    setStaticDone(false);
    const approvedStatic = scripts.filter((s) => s.type === "static");
    try {
      await fetch("/api/batch/produce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "static",
          scripts: approvedStatic,
          nomeSpot,
          descricaoVisual,
        }),
      });
    } catch {
      setProducingStatic(false);
    }
  }

  async function handleProduceVideo() {
    setProducingVideo(true);
    setVideoProgress(0);
    setVideoDone(false);
    const approvedVideos = scripts.filter((s) => s.type === "narrated" || s.type === "avatar");
    try {
      await fetch("/api/batch/produce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "video",
          scripts: approvedVideos,
          nomeSpot,
          descricaoVisual,
          videoReferencia,
        }),
      });
    } catch {
      setProducingVideo(false);
    }
  }

  async function handleUploadDrive() {
    if (!driveFolderId.trim()) return alert("Preencha o link/ID da pasta do Google Drive");
    setUploadingDrive(true);
    try {
      const res = await fetch("/api/drive/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: driveFolderId, nomeSpot }),
      });
      const data = await res.json();
      if (data.success) {
        setDriveUploaded(true);
      } else {
        alert(data.error || "Erro ao fazer upload");
      }
    } catch {
      alert("Erro de conexão com o Google Drive");
    } finally {
      setUploadingDrive(false);
    }
  }

  // ─── Filtered scripts ──────────────────────────
  const filteredScripts =
    typeFilter === "all" ? scripts : scripts.filter((s) => s.type === typeFilter);

  const staticScripts = scripts.filter((s) => s.type === "static");
  const narratedScripts = scripts.filter((s) => s.type === "narrated");
  const avatarScripts = scripts.filter((s) => s.type === "avatar");

  // ─── Render ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-seazone-dark via-seazone-primary to-seazone-secondary shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Seazone Criativos</h1>
                <p className="text-xs text-blue-200">Máquina de Criativos com IA</p>
              </div>
            </div>
            {step !== "form" && (
              <button
                onClick={() => {
                  if (confirm("Voltar ao início? Os dados não salvos serão perdidos.")) {
                    setStep("form");
                    setScripts([]);
                  }
                }}
                className="text-sm text-white/70 hover:text-white transition"
              >
                Novo briefing
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {STEPS_INFO.map((s, i) => {
              const isActive = s.key === step || (s.key === "generating" && step === "generating");
              const stepIdx = STEPS_INFO.findIndex((x) => x.key === step);
              const isPast = i < stepIdx;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  {i > 0 && (
                    <div className={`w-8 h-0.5 ${isPast ? "bg-seazone-primary" : "bg-gray-200"}`} />
                  )}
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isActive
                          ? "bg-seazone-primary text-white shadow-md scale-110"
                          : isPast
                          ? "bg-seazone-primary text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isPast ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        s.num
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isActive ? "text-seazone-primary" : isPast ? "text-gray-700" : "text-gray-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ═══ STEP 1: FORM ═══ */}
        {step === "form" && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              {/* Seazone context badge */}
              <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-seazone-light/50 border border-seazone-accent/20">
                <div className="w-8 h-8 rounded-lg bg-seazone-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-seazone-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs text-seazone-primary">
                  <span className="font-semibold">SPOT Seazone</span> — Empreendimento projetado para aluguel por temporada. Os roteiros serão gerados com foco em investimento inteligente e rentabilidade.
                </p>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-1">Novo Briefing de SPOT</h2>
              <p className="text-sm text-gray-500 mb-8">
                Preencha as particularidades deste SPOT para gerar os 45 roteiros de criativos.
              </p>

              {/* Nome do SPOT */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nome do SPOT *
                </label>
                <input
                  type="text"
                  value={nomeSpot}
                  onChange={(e) => setNomeSpot(e.target.value)}
                  placeholder="Ex: Novo Campeche SPOT II, SPOT Jurerê, SPOT Praia Brava..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent focus:border-transparent outline-none transition"
                />
              </div>

              {/* Localização */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Localização / Região
                </label>
                <input
                  type="text"
                  value={localizacao}
                  onChange={(e) => setLocalizacao(e.target.value)}
                  placeholder="Ex: Campeche, Florianópolis — a 300m da praia"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent focus:border-transparent outline-none transition"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Região turística e posição estratégica na cidade
                </p>
              </div>

              {/* Pontos fortes */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Diferenciais deste SPOT * (até 5)
                </label>
                <div className="space-y-2">
                  {pontosFortes.map((ponto, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="w-8 h-10 flex items-center justify-center">
                        <span className="text-xs font-bold text-seazone-primary bg-seazone-light rounded-full w-6 h-6 flex items-center justify-center">
                          {idx + 1}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={ponto}
                        onChange={(e) => updatePontoForte(idx, e.target.value)}
                        placeholder={[
                          "Ex: Rooftop com vista mar e piscina",
                          "Ex: A 200m da praia, região com 80% de ocupação",
                          "Ex: Ticket de entrada a partir de R$280k",
                          "Ex: Entrega prevista para 2027 — valorização na planta",
                          "Ex: Área de coworking e lavanderia compartilhada",
                        ][idx] || `Diferencial #${idx + 1}`}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent focus:border-transparent outline-none transition"
                      />
                      {pontosFortes.length > 1 && (
                        <button
                          onClick={() => removePontoForte(idx)}
                          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 transition"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {pontosFortes.length < 5 && (
                  <button
                    onClick={addPontoForte}
                    className="mt-2 text-sm text-seazone-secondary hover:text-seazone-primary font-medium flex items-center gap-1 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar ponto forte
                  </button>
                )}
              </div>

              {/* Link Lovable */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Link Lovable (Do&apos;s e Don&apos;ts)
                </label>
                <input
                  type="url"
                  value={lovableLink}
                  onChange={(e) => setLovableLink(e.target.value)}
                  placeholder="https://lovable.dev/projects/..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent focus:border-transparent outline-none transition"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Link com as diretrizes do que fazer e não fazer nos criativos deste SPOT
                </p>
              </div>

              {/* Vídeo referência */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Link de Vídeo Referência
                </label>
                <input
                  type="url"
                  value={videoReferencia}
                  onChange={(e) => setVideoReferencia(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... ou link do vídeo"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent focus:border-transparent outline-none transition"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Link do vídeo de referência — a IA vai seguir esse estilo/tom nos roteiros
                </p>
              </div>

              {/* Descrição visual do vídeo referência */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Descrição Visual do Estilo
                </label>
                <textarea
                  value={descricaoVisual}
                  onChange={(e) => setDescricaoVisual(e.target.value)}
                  rows={3}
                  placeholder={"Descreva o estilo visual do vídeo de referência para que a IA de imagens e vídeo replique.\n\nEx: \"Cortes rápidos, cores quentes, foco em lifestyle praiano, imagens aéreas de drone, tipografia moderna minimalista, tons de azul e dourado...\""}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent focus:border-transparent outline-none transition resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  As IAs de imagem/vídeo não assistem vídeos — essa descrição guia o estilo visual na produção
                </p>
              </div>

              {/* Estilo / referências anteriores */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Referências de Estilo / Roteiros Anteriores
                </label>
                <textarea
                  value={estiloReferencia}
                  onChange={(e) => setEstiloReferencia(e.target.value)}
                  rows={5}
                  placeholder={"Cole aqui roteiros de criativos anteriores que funcionaram bem, referências de tom de voz, estilo visual, ou qualquer contexto que ajude a IA a manter o padrão Seazone...\n\nEx: \"Nos últimos criativos, usamos tom direto, frases curtas, foco em números de rentabilidade...\""}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent focus:border-transparent outline-none transition resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleGenerateScripts}
                disabled={!nomeSpot.trim() || pontosFortes.every((p) => !p.trim())}
                className="w-full py-3.5 bg-gradient-to-r from-seazone-primary to-seazone-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                Gerar 45 Roteiros para este SPOT
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: GENERATING ═══ */}
        {step === "generating" && (
          <div className="max-w-lg mx-auto text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-seazone-light to-blue-100 flex items-center justify-center float-animation">
              <svg className="w-10 h-10 text-seazone-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Gerando 45 roteiros...</h3>
            <p className="text-gray-500 text-sm mb-6">
              A IA está criando roteiros únicos para o SPOT &quot;{nomeSpot}&quot; com base nas suas referências.
            </p>
            <div className="w-64 mx-auto h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-seazone-primary to-seazone-accent rounded-full shimmer w-2/3" />
            </div>
            <p className="text-xs text-gray-400 mt-3">Isso pode levar alguns segundos...</p>
          </div>
        )}

        {/* ═══ STEP 3 & 4: REVIEW (analyst / head) ═══ */}
        {(step === "review-analyst" || step === "review-head") && (
          <div>
            {warning && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                {warning}
              </div>
            )}

            {/* Review header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {step === "review-analyst"
                      ? "Revisão do Analista de Product Marketing"
                      : "Revisão da Head de Product Marketing"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    SPOT {nomeSpot} &mdash; {scripts.length} roteiros gerados &mdash;{" "}
                    {step === "review-analyst"
                      ? "Revise, edite se necessário e aprove cada roteiro."
                      : "Revisão final antes da produção."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approveAll(step === "review-analyst" ? "analyst" : "head")}
                    className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition"
                  >
                    Aprovar todos{typeFilter !== "all" ? ` (${TYPE_CONFIG[typeFilter].label})` : ""}
                  </button>

                  {step === "review-analyst" && allAnalystApproved && (
                    <button
                      onClick={() => setStep("review-head")}
                      className="px-4 py-2 bg-seazone-primary text-white text-sm font-bold rounded-lg hover:bg-seazone-dark transition"
                    >
                      Enviar para Head
                    </button>
                  )}

                  {step === "review-head" && allHeadApproved && (
                    <button
                      onClick={() => setStep("production")}
                      className="px-4 py-2 bg-seazone-primary text-white text-sm font-bold rounded-lg hover:bg-seazone-dark transition"
                    >
                      Aprovar e Produzir
                    </button>
                  )}
                </div>
              </div>

              {/* Approval progress */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {(["static", "narrated", "avatar"] as const).map((type) => {
                  const cfg = TYPE_CONFIG[type];
                  const ofType = scripts.filter((s) => s.type === type);
                  const approved =
                    step === "review-analyst"
                      ? ofType.filter((s) => s.approvedAnalyst).length
                      : ofType.filter((s) => s.approvedHead).length;
                  return (
                    <div key={type} className={`rounded-lg p-3 ${cfg.bg} border ${cfg.border}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.labelFull}</span>
                        <span className={`text-xs font-bold ${cfg.text}`}>
                          {approved}/{ofType.length}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${cfg.color} transition-all duration-300`}
                          style={{ width: `${ofType.length > 0 ? (approved / ofType.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Type filter */}
            <div className="flex gap-2 mb-4">
              {(
                [
                  { key: "all" as const, label: "Todos", count: scripts.length },
                  { key: "static" as const, label: "Estáticos", count: staticScripts.length },
                  { key: "narrated" as const, label: "Narrados", count: narratedScripts.length },
                  { key: "avatar" as const, label: "Apresentadora", count: avatarScripts.length },
                ]
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setTypeFilter(f.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    typeFilter === f.key
                      ? "bg-seazone-primary text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Scripts list */}
            <div className="space-y-3">
              {filteredScripts.map((script) => {
                const cfg = TYPE_CONFIG[script.type];
                const isApproved =
                  step === "review-analyst" ? script.approvedAnalyst : script.approvedHead;
                const isEditing = editingId === script.id;

                return (
                  <div
                    key={script.id}
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                      isApproved ? "border-green-200" : "border-gray-100"
                    }`}
                  >
                    <div className={`h-1 bg-gradient-to-r ${cfg.color}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        {/* Left */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${cfg.badge}`}>
                              {cfg.icon}
                              {cfg.label}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">#{script.id}</span>
                            {script.edited && (
                              <span className="text-xs text-blue-500 font-medium">editado</span>
                            )}
                          </div>

                          <h4 className="text-sm font-semibold text-gray-800 mb-1">{script.title}</h4>

                          {isEditing ? (
                            <div className="mt-2">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-seazone-accent rounded-lg text-sm focus:ring-2 focus:ring-seazone-accent outline-none resize-none"
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={saveEdit}
                                  className="px-3 py-1.5 bg-seazone-primary text-white text-xs font-medium rounded-lg"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1.5 text-gray-500 text-xs font-medium rounded-lg border border-gray-200"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 leading-relaxed">{script.script}</p>
                          )}

                          {script.hook && !isEditing && (
                            <p className="mt-2 text-xs text-gray-400">
                              <span className="font-medium">Hook:</span> {script.hook}
                            </p>
                          )}
                        </div>

                        {/* Right — actions */}
                        {!isEditing && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              onClick={() => toggleApproval(script.id, step === "review-analyst" ? "analyst" : "head")}
                              className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${
                                isApproved
                                  ? "bg-green-100 text-green-600"
                                  : "bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500"
                              }`}
                              title={isApproved ? "Aprovado" : "Aprovar"}
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => startEdit(script)}
                              className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition"
                              title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom actions */}
            <div className="mt-8 flex justify-between items-center">
              <button
                onClick={() => setStep("form")}
                className="text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Voltar ao briefing
              </button>

              {step === "review-analyst" && allAnalystApproved && (
                <button
                  onClick={() => setStep("review-head")}
                  className="px-6 py-3 bg-gradient-to-r from-seazone-primary to-seazone-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
                >
                  Enviar para aprovação da Head
                </button>
              )}

              {step === "review-head" && allHeadApproved && (
                <button
                  onClick={() => setStep("production")}
                  className="px-6 py-3 bg-gradient-to-r from-seazone-primary to-seazone-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
                >
                  Tudo aprovado — ir para Produção
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 5: PRODUCTION ═══ */}
        {step === "production" && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Produção de Criativos</h2>
              <p className="text-sm text-gray-500">
                Todos os 45 roteiros aprovados para o SPOT &quot;{nomeSpot}&quot;. Acione a produção.
              </p>
            </div>

            {/* Google Drive config */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Pasta do Google Drive</h3>
                  <p className="text-xs text-gray-500">Onde os criativos finalizados serão salvos</p>
                </div>
              </div>
              <input
                type="text"
                value={driveFolderId}
                onChange={(e) => setDriveFolderId(e.target.value)}
                placeholder="Cole o link da pasta ou o ID — Ex: https://drive.google.com/drive/folders/1ABC... ou 1ABC..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-blue-300 focus:border-transparent outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Static production */}
              <div className={`bg-white rounded-2xl shadow-sm border p-6 ${staticDone ? "border-green-200" : "border-gray-100"}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    {TYPE_CONFIG.static.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Criativos Estáticos</h3>
                    <p className="text-xs text-gray-500">15 imagens — IA de geração de imagem (Flux)</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2">
                  {staticScripts.map((s) => (
                    <div key={s.id} className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                      <span className="font-mono text-gray-400 shrink-0">#{s.id}</span>
                      <span className="line-clamp-1">{s.title}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 mb-3 p-2 bg-gray-50 rounded-lg">
                  Cada roteiro aprovado + imagePrompt + descrição visual serão enviados para a IA de imagens
                </p>

                {staticDone ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-sm font-medium">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    15 estáticos gerados com sucesso!
                  </div>
                ) : producingStatic ? (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Gerando imagens com IA...</span>
                      <span>{staticProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all shimmer"
                        style={{ width: `${staticProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleProduceStatic}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all text-sm"
                  >
                    Gerar 15 Estáticos com IA
                  </button>
                )}
              </div>

              {/* Video production */}
              <div className={`bg-white rounded-2xl shadow-sm border p-6 ${videoDone ? "border-green-200" : "border-gray-100"}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    {TYPE_CONFIG.narrated.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Criativos em Vídeo</h3>
                    <p className="text-xs text-gray-500">15 narrados (ElevenLabs) + 15 apresentadora (D-ID)</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2">
                  {[...narratedScripts, ...avatarScripts].map((s) => {
                    const cfg = TYPE_CONFIG[s.type];
                    return (
                      <div key={s.id} className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.badge} shrink-0`}>
                          {cfg.label}
                        </span>
                        <span className="line-clamp-1">{s.title}</span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-400 mb-3 p-2 bg-gray-50 rounded-lg">
                  Roteiros aprovados enviados para ElevenLabs (voz) + D-ID (avatar) + Flux (imagens de fundo)
                </p>

                {videoDone ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-sm font-medium">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    30 vídeos gerados com sucesso!
                  </div>
                ) : producingVideo ? (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Gerando vídeos com IA...</span>
                      <span>{videoProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all shimmer"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleProduceVideo}
                    className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all text-sm"
                  >
                    Gerar 30 Vídeos com IA
                  </button>
                )}
              </div>
            </div>

            {/* Upload to Drive */}
            {(staticDone || videoDone) && (
              <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-bold text-gray-800">Salvar no Google Drive</h3>
                    <p className="text-xs text-gray-500">
                      {staticDone && videoDone
                        ? "Todos os 45 criativos prontos para upload"
                        : `${staticDone ? "15 estáticos" : "30 vídeos"} prontos — ${!staticDone ? "aguardando estáticos" : "aguardando vídeos"}`}
                    </p>
                  </div>
                  {driveUploaded ? (
                    <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Enviado para o Drive!
                    </div>
                  ) : (
                    <button
                      onClick={handleUploadDrive}
                      disabled={uploadingDrive || !driveFolderId.trim()}
                      className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition text-sm disabled:opacity-40"
                    >
                      {uploadingDrive ? "Enviando..." : "Enviar para Google Drive"}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => setStep("review-head")}
                className="text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Voltar para revisão
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-xs text-gray-400">
            Seazone Criativos v2.0 &middot; Powered by IA
          </p>
        </div>
      </footer>
    </div>
  );
}
