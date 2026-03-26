"use client";

import { useState, useEffect } from "react";

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

type Step = "form" | "generating" | "review-analyst" | "review-head" | "production";
type BriefingTab = "apresentadora" | "narrado" | "estaticos";

const TYPE_CONFIG = {
  static: {
    label: "Estático", labelFull: "Imagem Estática",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-800",
  },
  narrated: {
    label: "Narrado", labelFull: "Vídeo Narrado",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
    color: "from-violet-500 to-purple-600", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", badge: "bg-violet-100 text-violet-800",
  },
  avatar: {
    label: "Apresentadora", labelFull: "Vídeo com Apresentadora",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    color: "from-amber-500 to-orange-600", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", badge: "bg-amber-100 text-amber-800",
  },
};

const STEPS_INFO = [
  { key: "form", label: "Briefing", num: 1 },
  { key: "generating", label: "Gerando", num: 2 },
  { key: "review-analyst", label: "Analista", num: 3 },
  { key: "review-head", label: "Head", num: 4 },
  { key: "production", label: "Produção", num: 5 },
];

// ─── Reusable components (outside Home to avoid re-mount) ────────
function FormInput({ label, value, onChange, placeholder, hint, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; type?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent focus:border-transparent outline-none transition" />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function FormTextArea({ label, value, onChange, placeholder, hint, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; rows?: number }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent focus:border-transparent outline-none transition resize-none" />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────
export default function Home() {
  const [step, setStep] = useState<Step>("form");
  const [briefingTab, setBriefingTab] = useState<BriefingTab>("apresentadora");

  // ── General SPOT info
  const [nomeSpot, setNomeSpot] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [pontosFortes, setPontosFortes] = useState<string[]>([""]);
  const [lovableLink, setLovableLink] = useState("");

  // ── Drive links
  const [driveFotos, setDriveFotos] = useState("");
  const [driveVideosMonica, setDriveVideosMonica] = useState("");

  // ── Briefing: Vídeo Apresentadora
  const [apDescricaoGeral, setApDescricaoGeral] = useState("");
  const [apTakes, setApTakes] = useState("");
  const [apTomVoz, setApTomVoz] = useState("");
  const [apCenario, setApCenario] = useState("");
  const [apReferencia, setApReferencia] = useState("");
  const [apDoseDonts, setApDoseDonts] = useState("");

  // ── Briefing: Vídeo Narrado
  const [narDescricaoGeral, setNarDescricaoGeral] = useState("");
  const [narTakes, setNarTakes] = useState("");
  const [narEstiloVisual, setNarEstiloVisual] = useState("");
  const [narTomNarracao, setNarTomNarracao] = useState("");
  const [narReferencia, setNarReferencia] = useState("");
  const [narDoseDonts, setNarDoseDonts] = useState("");

  // ── Briefing: Estáticos
  const [estConteudo, setEstConteudo] = useState("");
  const [estEstiloVisual, setEstEstiloVisual] = useState("");
  const [estCores, setEstCores] = useState("");
  const [estFormatos, setEstFormatos] = useState("");
  const [estReferencia, setEstReferencia] = useState("");
  const [estDoseDonts, setEstDoseDonts] = useState("");

  // ── Import state
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  // ── Scripts & production state
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [warning, setWarning] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "static" | "narrated" | "avatar">("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [driveFolderId, setDriveFolderId] = useState("");
  const [uploadingDrive, setUploadingDrive] = useState(false);
  const [driveUploaded, setDriveUploaded] = useState(false);
  const [productionFilter, setProductionFilter] = useState<"all" | "static" | "narrated" | "avatar">("all");
  const [productionStatus, setProductionStatus] = useState<Record<number, {
    status: "idle" | "producing" | "done" | "error";
    platform?: string; resultUrl?: string; fileName?: string; error?: string;
    overlayText?: { hook: string; script: string; nomeSpot: string };
  }>>({});

  // ── Assets state
  const [assets, setAssets] = useState<Record<string, Array<{name: string; path: string; type: string; folder: string}>>>({});
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [showAssetPanel, setShowAssetPanel] = useState(true);

  // ── Load assets when entering production step
  useEffect(() => {
    if (step === "production") {
      loadAssets();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Helpers
  function addPontoForte() { if (pontosFortes.length < 5) setPontosFortes([...pontosFortes, ""]); }
  function removePontoForte(i: number) { setPontosFortes(pontosFortes.filter((_, idx) => idx !== i)); }
  function updatePontoForte(i: number, v: string) { const u = [...pontosFortes]; u[i] = v; setPontosFortes(u); }

  const allAnalystApproved = scripts.length > 0 && scripts.every((s) => s.approvedAnalyst);
  const allHeadApproved = scripts.length > 0 && scripts.every((s) => s.approvedHead);
  const filteredScripts = typeFilter === "all" ? scripts : scripts.filter((s) => s.type === typeFilter);
  const staticScripts = scripts.filter((s) => s.type === "static");
  const narratedScripts = scripts.filter((s) => s.type === "narrated");
  const avatarScripts = scripts.filter((s) => s.type === "avatar");
  const doneCount = Object.values(productionStatus).filter((s) => s.status === "done").length;
  const producingCount = Object.values(productionStatus).filter((s) => s.status === "producing").length;

  // ── Import from Lovable
  async function handleImportLovable() {
    if (!importUrl.trim()) return alert("Cole o link do Lovable");
    setImporting(true);
    try {
      const res = await fetch("/api/import-lovable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      const result = await res.json();
      if (result.error) { alert(result.error); return; }
      const d = result.data;

      // Auto-fill all fields
      if (d.nomeSpot) setNomeSpot(d.nomeSpot);
      if (d.localizacao) setLocalizacao(d.localizacao);
      if (d.pontosFortes?.length) setPontosFortes(d.pontosFortes.length > 0 ? d.pontosFortes : [""]);
      if (d.driveFotos) setDriveFotos(d.driveFotos);
      if (d.driveVideosMonica) setDriveVideosMonica(d.driveVideosMonica);
      if (d.apresentadora) {
        if (d.apresentadora.descricaoGeral) setApDescricaoGeral(d.apresentadora.descricaoGeral);
        if (d.apresentadora.takes) setApTakes(d.apresentadora.takes);
        if (d.apresentadora.tomVoz) setApTomVoz(d.apresentadora.tomVoz);
        if (d.apresentadora.cenario) setApCenario(d.apresentadora.cenario);
        if (d.apresentadora.referencia) setApReferencia(d.apresentadora.referencia);
        if (d.apresentadora.doseDonts) setApDoseDonts(d.apresentadora.doseDonts);
      }
      if (d.narrado) {
        if (d.narrado.descricaoGeral) setNarDescricaoGeral(d.narrado.descricaoGeral);
        if (d.narrado.takes) setNarTakes(d.narrado.takes);
        if (d.narrado.estiloVisual) setNarEstiloVisual(d.narrado.estiloVisual);
        if (d.narrado.tomNarracao) setNarTomNarracao(d.narrado.tomNarracao);
        if (d.narrado.referencia) setNarReferencia(d.narrado.referencia);
        if (d.narrado.doseDonts) setNarDoseDonts(d.narrado.doseDonts);
      }
      if (d.estaticos) {
        if (d.estaticos.conteudo) setEstConteudo(d.estaticos.conteudo);
        if (d.estaticos.estiloVisual) setEstEstiloVisual(d.estaticos.estiloVisual);
        if (d.estaticos.cores) setEstCores(d.estaticos.cores);
        if (d.estaticos.formatos) setEstFormatos(d.estaticos.formatos);
        if (d.estaticos.referencia) setEstReferencia(d.estaticos.referencia);
        if (d.estaticos.doseDonts) setEstDoseDonts(d.estaticos.doseDonts);
      }

      const filled = [d.nomeSpot, d.localizacao, ...(d.pontosFortes || [])].filter(Boolean).length;
      if (filled > 0) {
        alert(`Importado com sucesso! ${filled} campos preenchidos.${result.warning ? "\n\n" + result.warning : ""}`);
      } else {
        alert(result.warning || "Importação concluída, mas nenhum campo foi preenchido. Sem a API Anthropic, a extração é limitada — preencha manualmente ou adicione ANTHROPIC_API_KEY no .env.local.");
      }
    } catch (err) { alert("Erro ao importar: " + (err instanceof Error ? err.message : "verifique o link")); } finally { setImporting(false); }
  }

  // ── Generate scripts
  async function handleGenerateScripts() {
    if (!nomeSpot.trim()) return alert("Preencha o nome do SPOT");
    if (pontosFortes.every((p) => !p.trim())) return alert("Adicione ao menos 1 ponto forte");

    setStep("generating");
    setWarning("");

    try {
      const res = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeSpot, localizacao,
          pontosFortes: pontosFortes.filter((p) => p.trim()),
          lovableContent: lovableLink,
          videoReferencia: apReferencia || narReferencia,
          descricaoVisual: estEstiloVisual,
          estiloReferencia: [
            apDescricaoGeral && `[APRESENTADORA] ${apDescricaoGeral}`,
            apTakes && `[APRESENTADORA - TAKES] ${apTakes}`,
            apTomVoz && `[APRESENTADORA - TOM] ${apTomVoz}`,
            apCenario && `[APRESENTADORA - CENÁRIO] ${apCenario}`,
            apDoseDonts && `[APRESENTADORA - DO/DONT] ${apDoseDonts}`,
            narDescricaoGeral && `[NARRADO] ${narDescricaoGeral}`,
            narTakes && `[NARRADO - TAKES] ${narTakes}`,
            narEstiloVisual && `[NARRADO - VISUAL] ${narEstiloVisual}`,
            narTomNarracao && `[NARRADO - TOM] ${narTomNarracao}`,
            narDoseDonts && `[NARRADO - DO/DONT] ${narDoseDonts}`,
            estConteudo && `[ESTÁTICO] ${estConteudo}`,
            estEstiloVisual && `[ESTÁTICO - VISUAL] ${estEstiloVisual}`,
            estCores && `[ESTÁTICO - CORES] ${estCores}`,
            estFormatos && `[ESTÁTICO - FORMATOS] ${estFormatos}`,
            estDoseDonts && `[ESTÁTICO - DO/DONT] ${estDoseDonts}`,
            driveFotos && `[DRIVE FOTOS] ${driveFotos}`,
            driveVideosMonica && `[DRIVE VÍDEOS MÔNICA] ${driveVideosMonica}`,
          ].filter(Boolean).join("\n"),
        }),
      });

      const data = await res.json();
      if (data.warning) setWarning(data.warning);

      setScripts((data.scripts || []).map((s: GeneratedScript) => ({
        ...s, approvedAnalyst: false, approvedHead: false,
      })));
      setStep("review-analyst");
    } catch {
      alert("Erro ao gerar roteiros. Tente novamente.");
      setStep("form");
    }
  }

  // ── Approvals
  function toggleApproval(id: number, stage: "analyst" | "head") {
    setScripts((prev) => prev.map((s) => s.id === id ? { ...s, ...(stage === "analyst" ? { approvedAnalyst: !s.approvedAnalyst } : { approvedHead: !s.approvedHead }) } : s));
  }
  function approveAll(stage: "analyst" | "head") {
    const ids = new Set((typeFilter === "all" ? scripts : scripts.filter((s) => s.type === typeFilter)).map((s) => s.id));
    setScripts((prev) => prev.map((s) => ids.has(s.id) ? { ...s, ...(stage === "analyst" ? { approvedAnalyst: true } : { approvedHead: true }) } : s));
  }
  function startEdit(s: GeneratedScript) { setEditingId(s.id); setEditText(s.script); }
  function saveEdit() {
    if (editingId === null) return;
    setScripts((prev) => prev.map((s) => s.id === editingId ? { ...s, script: editText, edited: true } : s));
    setEditingId(null); setEditText("");
  }

  // ── Production
  async function handleProduce(script: GeneratedScript, platform: "fal-image" | "fal-video") {
    setProductionStatus((p) => ({ ...p, [script.id]: { status: "producing", platform } }));
    try {
      const res = await fetch("/api/produce", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId: script.id, type: script.type, platform,
          script: script.script, imagePrompt: script.imagePrompt,
          title: script.title, hook: script.hook,
          nomeSpot: nomeSpot,
          descricaoVisual: estEstiloVisual,
          referenceAssets: selectedAssets,
        }),
      });
      const data = await res.json();
      setProductionStatus((p) => ({ ...p, [script.id]: data.success ? { status: "done", platform, resultUrl: data.videoUrl || data.imageUrl, fileName: data.fileName, overlayText: data.overlayText } : { status: "error", platform, error: data.error } }));
    } catch { setProductionStatus((p) => ({ ...p, [script.id]: { status: "error", platform, error: "Erro de conexão" } })); }
  }

  async function handleProduceAll(type: "static" | "video") {
    const list = type === "static" ? scripts.filter((s) => s.type === "static") : scripts.filter((s) => s.type === "narrated" || s.type === "avatar");
    for (const s of list) { if (productionStatus[s.id]?.status === "done") continue; await handleProduce(s, s.type === "static" ? "fal-image" : "fal-video"); }
  }

  async function handleUploadDrive() {
    if (!driveFolderId.trim()) return alert("Preencha a pasta do Drive");
    setUploadingDrive(true);
    try {
      const res = await fetch("/api/drive/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderId: driveFolderId, nomeSpot }) });
      const data = await res.json();
      if (data.success) setDriveUploaded(true); else alert(data.error || "Erro");
    } catch { alert("Erro de conexão"); } finally { setUploadingDrive(false); }
  }

  // ── Assets
  async function loadAssets() {
    setLoadingAssets(true);
    try {
      const res = await fetch("/api/assets");
      const data = await res.json();
      setAssets(data.folders || {});
    } catch { /* ignore */ }
    setLoadingAssets(false);
  }

  async function handleUploadAssets(files: FileList, folder: string) {
    setUploadingAssets(true);
    try {
      const formData = new FormData();
      formData.append("folder", folder);
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }
      const res = await fetch("/api/assets/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        await loadAssets();
      }
    } catch { /* ignore */ }
    setUploadingAssets(false);
  }

  function toggleAssetSelection(assetPath: string) {
    setSelectedAssets(prev =>
      prev.includes(assetPath)
        ? prev.filter(p => p !== assetPath)
        : [...prev, assetPath]
    );
  }

  // ── Download criativo with text baked in via Canvas
  async function handleDownloadCreative(scriptId: number) {
    const ps = productionStatus[scriptId];
    if (!ps?.resultUrl || !ps.overlayText) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = ps.resultUrl;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });

    const size = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Draw image (cover)
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

    // Gradient overlay
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.35, "rgba(0,0,0,0)");
    grad.addColorStop(0.65, "rgba(0,0,0,0.55)");
    grad.addColorStop(1, "rgba(0,0,0,0.88)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Top accent line
    ctx.fillStyle = "#3B9AE1";
    ctx.fillRect(40, 40, 80, 4);

    // SEAZONE badge
    ctx.fillStyle = "rgba(31,78,120,0.85)";
    ctx.beginPath();
    ctx.roundRect(870, 28, 170, 38, 8);
    ctx.fill();
    ctx.font = "bold 15px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.letterSpacing = "3px";
    ctx.fillText("SEAZONE", 955, 53);
    ctx.letterSpacing = "0px";

    // Hook text
    ctx.textAlign = "left";
    ctx.font = "bold 44px Arial";
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    const hookLines = wrapCanvasText(ctx, ps.overlayText.hook, 1000);
    let y = 640;
    for (const line of hookLines) { ctx.fillText(line, 50, y); y += 54; }

    // Script text
    ctx.font = "400 22px Arial";
    ctx.globalAlpha = 0.9;
    ctx.shadowBlur = 4;
    const scriptLines = wrapCanvasText(ctx, ps.overlayText.script, 1000);
    y += 10;
    for (const line of scriptLines) { ctx.fillText(line, 50, y); y += 32; }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Bottom bar
    ctx.fillStyle = "#1F4E78";
    ctx.fillRect(0, 1040, size, 40);
    ctx.fillStyle = "white";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.letterSpacing = "2px";
    ctx.fillText(ps.overlayText.nomeSpot.toUpperCase(), 540, 1067);

    // Download
    const link = document.createElement("a");
    link.download = ps.fileName || `criativo_${scriptId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // ─── RENDER ────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-seazone-dark via-seazone-primary to-seazone-secondary shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Seazone Criativos</h1>
                <p className="text-xs text-blue-200">Máquina de Criativos com IA</p>
              </div>
            </div>
            {step !== "form" && (
              <button onClick={() => { if (confirm("Voltar ao início?")) { setStep("form"); setScripts([]); } }} className="text-sm text-white/70 hover:text-white transition">Novo briefing</button>
            )}
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {STEPS_INFO.map((s, i) => {
              const isActive = s.key === step;
              const stepIdx = STEPS_INFO.findIndex((x) => x.key === step);
              const isPast = i < stepIdx;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-8 h-0.5 ${isPast ? "bg-seazone-primary" : "bg-gray-200"}`} />}
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isActive ? "bg-seazone-primary text-white shadow-md scale-110" : isPast ? "bg-seazone-primary text-white" : "bg-gray-200 text-gray-500"}`}>
                      {isPast ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : s.num}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? "text-seazone-primary" : isPast ? "text-gray-700" : "text-gray-400"}`}>{s.label}</span>
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
          <div className="max-w-4xl mx-auto">
            {/* Info badge */}
            <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-seazone-light/50 border border-seazone-accent/20">
              <div className="w-8 h-8 rounded-lg bg-seazone-primary/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-seazone-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-xs text-seazone-primary">
                <span className="font-semibold">SPOT Seazone</span> — Preencha os dados gerais e o briefing específico de cada tipo de criativo.
              </p>
            </div>

            {/* ── IMPORTAR DO LOVABLE ── */}
            <div className="bg-gradient-to-r from-seazone-dark to-seazone-primary rounded-2xl shadow-md p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-white">Importar do Lovable</h3>
                  <p className="text-xs text-blue-200">Cole o link do Lovable e a IA preenche tudo automaticamente</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://nomedoempreendimento.lovable.app/"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:ring-2 focus:ring-white/30 outline-none"
                />
                <button
                  onClick={handleImportLovable}
                  disabled={importing || !importUrl.trim()}
                  className="px-5 py-2.5 bg-white text-seazone-primary font-bold text-sm rounded-xl hover:bg-blue-50 transition disabled:opacity-40 whitespace-nowrap"
                >
                  {importing ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      Importando...
                    </span>
                  ) : "Importar"}
                </button>
              </div>
              <p className="text-[10px] text-blue-200/70 mt-2">Ou preencha manualmente abaixo</p>
            </div>

            {/* ── DADOS GERAIS ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Dados Gerais do SPOT</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Nome do SPOT *" value={nomeSpot} onChange={setNomeSpot} placeholder="Ex: Novo Campeche SPOT II" />
                <FormInput label="Localização / Região" value={localizacao} onChange={setLocalizacao} placeholder="Ex: Campeche, Florianópolis" hint="Região turística e posição estratégica" />
              </div>

              {/* Pontos fortes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Diferenciais deste SPOT * (até 5)</label>
                <div className="space-y-2">
                  {pontosFortes.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="w-7 h-10 flex items-center justify-center text-xs font-bold text-seazone-primary bg-seazone-light rounded-full shrink-0">{i + 1}</span>
                      <input value={p} onChange={(e) => updatePontoForte(i, e.target.value)} placeholder={["Rooftop com vista mar", "A 200m da praia", "Ticket a partir de R$280k", "Entrega 2027", "Coworking e lavanderia"][i] || `Diferencial #${i + 1}`} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent outline-none" />
                      {pontosFortes.length > 1 && <button onClick={() => removePontoForte(i)} className="text-gray-400 hover:text-red-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
                    </div>
                  ))}
                </div>
                {pontosFortes.length < 5 && <button onClick={addPontoForte} className="mt-2 text-sm text-seazone-secondary hover:text-seazone-primary font-medium flex items-center gap-1">+ Adicionar</button>}
              </div>

              <FormInput label="Link Lovable (Do's e Don'ts)" value={lovableLink} onChange={setLovableLink} placeholder="https://lovable.dev/projects/..." hint="Diretrizes do que fazer e não fazer nos criativos" type="url" />

              {/* Drive links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                <FormInput label="Drive — Fotos do empreendimento" value={driveFotos} onChange={setDriveFotos} placeholder="Link da pasta com fotos de fachada, áreas comuns..." hint="Fotos que podem ser usadas nos criativos" type="url" />
                <FormInput label="Drive — Vídeos brutos da Mônica" value={driveVideosMonica} onChange={setDriveVideosMonica} placeholder="Link da pasta com vídeos da apresentadora" hint="Vídeos brutos para usar na produção" type="url" />
              </div>
            </div>

            {/* ── BRIEFING POR TIPO ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                {([
                  { key: "apresentadora" as const, label: "Vídeo Apresentadora", icon: TYPE_CONFIG.avatar.icon, color: "amber" },
                  { key: "narrado" as const, label: "Vídeo Narrado", icon: TYPE_CONFIG.narrated.icon, color: "violet" },
                  { key: "estaticos" as const, label: "Estáticos", icon: TYPE_CONFIG.static.icon, color: "emerald" },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setBriefingTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-all border-b-2 ${
                      briefingTab === tab.key
                        ? `border-${tab.color}-500 text-${tab.color}-700 bg-${tab.color}-50/50`
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(" ").pop()}</span>
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* ── Tab: Vídeo Apresentadora ── */}
                {briefingTab === "apresentadora" && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">{TYPE_CONFIG.avatar.icon}</div>
                      <div>
                        <h3 className="font-bold text-gray-800">Briefing — Vídeo com Apresentadora (Mônica)</h3>
                        <p className="text-xs text-gray-500">15 vídeos com avatar/apresentadora falando direto com o espectador</p>
                      </div>
                    </div>

                    <FormTextArea label="Descrição geral do vídeo" value={apDescricaoGeral} onChange={setApDescricaoGeral} rows={3} placeholder="Descreva o conceito geral dos vídeos com apresentadora. Ex: Mônica aparece em cenário clean, fala direto com a câmera de forma carismática, tom de especialista em investimento..." />
                    <FormTextArea label="Descrição dos takes / cenas" value={apTakes} onChange={setApTakes} rows={4} placeholder={"Descreva a sequência de takes/cenas:\n\nTake 1: Mônica aparece sorrindo, faz pergunta provocativa\nTake 2: Corte para imagens do empreendimento\nTake 3: Volta para Mônica com dados de rentabilidade\nTake 4: CTA — convida para saber mais"} hint="Detalhe cada take/cena que o vídeo deve ter" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput label="Tom de voz da apresentadora" value={apTomVoz} onChange={setApTomVoz} placeholder="Ex: Carismático, confiante, como amiga especialista" />
                      <FormInput label="Cenário / Background" value={apCenario} onChange={setApCenario} placeholder="Ex: Fundo clean branco, ou imagem do empreendimento" />
                    </div>
                    <FormInput label="Link de vídeo referência" value={apReferencia} onChange={setApReferencia} placeholder="Link de um vídeo com o estilo que quer replicar" type="url" />
                    <FormTextArea label="Do's e Don'ts específicos" value={apDoseDonts} onChange={setApDoseDonts} rows={3} placeholder={"DO: Frases curtas, tom direto, dados concretos\nDON'T: Não usar termos técnicos demais, não parecer propaganda genérica"} />
                  </div>
                )}

                {/* ── Tab: Vídeo Narrado ── */}
                {briefingTab === "narrado" && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">{TYPE_CONFIG.narrated.icon}</div>
                      <div>
                        <h3 className="font-bold text-gray-800">Briefing — Vídeo Narrado</h3>
                        <p className="text-xs text-gray-500">15 vídeos com voz over + imagens/vídeos de apoio</p>
                      </div>
                    </div>

                    <FormTextArea label="Descrição geral do vídeo" value={narDescricaoGeral} onChange={setNarDescricaoGeral} rows={3} placeholder="Descreva o conceito geral dos vídeos narrados. Ex: Voz feminina profissional, imagens aéreas de drone do empreendimento, cortes dinâmicos, foco em lifestyle e rentabilidade..." />
                    <FormTextArea label="Descrição dos takes / cenas" value={narTakes} onChange={setNarTakes} rows={4} placeholder={"Descreva a sequência de takes/cenas:\n\nTake 1: Imagem aérea da praia com texto de hook\nTake 2: Fachada do empreendimento\nTake 3: Interior do apartamento modelo\nTake 4: Dados de rentabilidade + CTA"} hint="Detalhe cada take/cena que o vídeo deve ter" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput label="Estilo visual" value={narEstiloVisual} onChange={setNarEstiloVisual} placeholder="Ex: Cinematográfico, cores quentes, transições suaves" />
                      <FormInput label="Tom da narração" value={narTomNarracao} onChange={setNarTomNarracao} placeholder="Ex: Voz feminina, profissional, inspiracional" />
                    </div>
                    <FormInput label="Link de vídeo referência" value={narReferencia} onChange={setNarReferencia} placeholder="Link de um vídeo narrado de referência" type="url" />
                    <FormTextArea label="Do's e Don'ts específicos" value={narDoseDonts} onChange={setNarDoseDonts} rows={3} placeholder={"DO: Imagens de alta qualidade, ritmo dinâmico, dados reais\nDON'T: Não usar stock genérico, evitar texto longo em tela"} />
                  </div>
                )}

                {/* ── Tab: Estáticos ── */}
                {briefingTab === "estaticos" && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">{TYPE_CONFIG.static.icon}</div>
                      <div>
                        <h3 className="font-bold text-gray-800">Briefing — Criativos Estáticos</h3>
                        <p className="text-xs text-gray-500">15 imagens para feed e stories</p>
                      </div>
                    </div>

                    <FormTextArea label="O que os criativos devem conter" value={estConteudo} onChange={setEstConteudo} rows={4} placeholder={"Descreva o conteúdo que cada criativo deve ter:\n\n- Frase de impacto (hook)\n- Dado de rentabilidade ou diferencial\n- CTA visual\n- Logo Seazone\n\nVariar entre: carrossel educativo, single image, comparativo, testemunho..."} hint="Descreva os elementos visuais e textuais que cada criativo deve ter" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput label="Estilo visual" value={estEstiloVisual} onChange={setEstEstiloVisual} placeholder="Ex: Minimalista, cores da marca, tipografia moderna" />
                      <FormInput label="Paleta de cores" value={estCores} onChange={setEstCores} placeholder="Ex: Azul marinho #1F4E78, branco, dourado" />
                    </div>
                    <FormInput label="Formatos" value={estFormatos} onChange={setEstFormatos} placeholder="Ex: 1080x1080 (feed), 1080x1920 (stories), 1200x628 (ads)" />
                    <FormInput label="Link de referência visual" value={estReferencia} onChange={setEstReferencia} placeholder="Link de referência de estilo (Pinterest, outro criativo...)" type="url" />
                    <FormTextArea label="Do's e Don'ts específicos" value={estDoseDonts} onChange={setEstDoseDonts} rows={3} placeholder={"DO: Imagens reais do empreendimento, tipografia legível, CTA claro\nDON'T: Não poluir com muito texto, evitar fotos genéricas de banco de imagem"} />
                  </div>
                )}
              </div>
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
        )}

        {/* ═══ STEP 2: GENERATING ═══ */}
        {step === "generating" && (
          <div className="max-w-lg mx-auto text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-seazone-light to-blue-100 flex items-center justify-center float-animation">
              <svg className="w-10 h-10 text-seazone-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Gerando 45 roteiros...</h3>
            <p className="text-gray-500 text-sm mb-6">A IA está criando roteiros para o SPOT &quot;{nomeSpot}&quot; com base nos seus briefings.</p>
            <div className="w-64 mx-auto h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-seazone-primary to-seazone-accent rounded-full shimmer w-2/3" /></div>
          </div>
        )}

        {/* ═══ STEP 3 & 4: REVIEW ═══ */}
        {(step === "review-analyst" || step === "review-head") && (
          <div>
            {warning && <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">{warning}</div>}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{step === "review-analyst" ? "Revisão do Analista" : "Revisão da Head"}</h2>
                  <p className="text-sm text-gray-500">SPOT {nomeSpot} &mdash; {scripts.length} roteiros</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => approveAll(step === "review-analyst" ? "analyst" : "head")} className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition">
                    Aprovar todos{typeFilter !== "all" ? ` (${TYPE_CONFIG[typeFilter].label})` : ""}
                  </button>
                  {step === "review-analyst" && allAnalystApproved && <button onClick={() => setStep("review-head")} className="px-4 py-2 bg-seazone-primary text-white text-sm font-bold rounded-lg">Enviar para Head</button>}
                  {step === "review-head" && allHeadApproved && <button onClick={() => setStep("production")} className="px-4 py-2 bg-seazone-primary text-white text-sm font-bold rounded-lg">Produzir</button>}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {(["static", "narrated", "avatar"] as const).map((type) => {
                  const cfg = TYPE_CONFIG[type]; const ofType = scripts.filter((s) => s.type === type);
                  const approved = step === "review-analyst" ? ofType.filter((s) => s.approvedAnalyst).length : ofType.filter((s) => s.approvedHead).length;
                  return (<div key={type} className={`rounded-lg p-3 ${cfg.bg} border ${cfg.border}`}><div className="flex justify-between mb-1"><span className={`text-xs font-semibold ${cfg.text}`}>{cfg.labelFull}</span><span className={`text-xs font-bold ${cfg.text}`}>{approved}/{ofType.length}</span></div><div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${cfg.color} transition-all`} style={{ width: `${ofType.length > 0 ? (approved / ofType.length) * 100 : 0}%` }} /></div></div>);
                })}
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {([{ key: "all" as const, label: "Todos", count: scripts.length }, { key: "static" as const, label: "Estáticos", count: staticScripts.length }, { key: "narrated" as const, label: "Narrados", count: narratedScripts.length }, { key: "avatar" as const, label: "Apresentadora", count: avatarScripts.length }]).map((f) => (
                <button key={f.key} onClick={() => setTypeFilter(f.key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${typeFilter === f.key ? "bg-seazone-primary text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>{f.label} ({f.count})</button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredScripts.map((script) => {
                const cfg = TYPE_CONFIG[script.type];
                const isApproved = step === "review-analyst" ? script.approvedAnalyst : script.approvedHead;
                const isEditing = editingId === script.id;
                return (
                  <div key={script.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isApproved ? "border-green-200" : "border-gray-100"}`}>
                    <div className={`h-1 bg-gradient-to-r ${cfg.color}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${cfg.badge}`}>{cfg.icon}{cfg.label}</span>
                            <span className="text-xs text-gray-400 font-mono">#{script.id}</span>
                            {script.edited && <span className="text-xs text-blue-500 font-medium">editado</span>}
                          </div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-1">{script.title}</h4>
                          {isEditing ? (
                            <div className="mt-2">
                              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} className="w-full px-3 py-2 border border-seazone-accent rounded-lg text-sm focus:ring-2 focus:ring-seazone-accent outline-none resize-none" />
                              <div className="flex gap-2 mt-2"><button onClick={saveEdit} className="px-3 py-1.5 bg-seazone-primary text-white text-xs rounded-lg">Salvar</button><button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-gray-500 text-xs rounded-lg border">Cancelar</button></div>
                            </div>
                          ) : <p className="text-sm text-gray-600 leading-relaxed">{script.script}</p>}
                          {script.hook && !isEditing && <p className="mt-2 text-xs text-gray-400"><span className="font-medium">Hook:</span> {script.hook}</p>}
                        </div>
                        {!isEditing && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button onClick={() => toggleApproval(script.id, step === "review-analyst" ? "analyst" : "head")} className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${isApproved ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500"}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                            <button onClick={() => startEdit(script)} className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-between items-center">
              <button onClick={() => setStep("form")} className="text-sm text-gray-500 hover:text-gray-700">Voltar ao briefing</button>
              {step === "review-analyst" && allAnalystApproved && <button onClick={() => setStep("review-head")} className="px-6 py-3 bg-gradient-to-r from-seazone-primary to-seazone-secondary text-white font-bold rounded-xl shadow-lg text-sm">Enviar para Head</button>}
              {step === "review-head" && allHeadApproved && <button onClick={() => setStep("production")} className="px-6 py-3 bg-gradient-to-r from-seazone-primary to-seazone-secondary text-white font-bold rounded-xl shadow-lg text-sm">Ir para Produção</button>}
            </div>
          </div>
        )}

        {/* ═══ STEP 5: PRODUCTION ═══ */}
        {step === "production" && (
          <div>
            {/* Header row */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Produção de Criativos</h2>
                <p className="text-sm text-gray-500">SPOT &quot;{nomeSpot}&quot; — {doneCount}/{scripts.length} produzidos{producingCount > 0 && `, ${producingCount} em andamento`}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAssetPanel(!showAssetPanel)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Assets {selectedAssets.length > 0 && <span className="px-1.5 py-0.5 bg-seazone-primary text-white text-[10px] rounded-full">{selectedAssets.length}</span>}
                </button>
                <button onClick={() => handleProduceAll("static")} disabled={producingCount > 0} className="px-4 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-40">Gerar estáticos</button>
                <button onClick={() => handleProduceAll("video")} disabled={producingCount > 0} className="px-4 py-2 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600 disabled:opacity-40">Gerar vídeos</button>
              </div>
            </div>

            {/* Selected assets banner */}
            {selectedAssets.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-seazone-light border border-seazone-accent/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-seazone-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-sm text-seazone-primary font-medium">{selectedAssets.length} asset(s) selecionado(s) como referência — a Fal AI usará como base visual para gerar os criativos</span>
                </div>
                <button onClick={() => setSelectedAssets([])} className="text-xs text-seazone-secondary hover:underline">Limpar</button>
              </div>
            )}

            {/* 2-column layout */}
            <div className={`grid gap-6 ${showAssetPanel ? 'grid-cols-1 lg:grid-cols-[1fr_340px]' : 'grid-cols-1'}`}>
              {/* LEFT: Scripts list */}
              <div>
                {/* Filter tabs */}
                <div className="flex gap-2 mb-4">
                  {([{ key: "all" as const, label: "Todos", count: scripts.length }, { key: "static" as const, label: "Estáticos", count: staticScripts.length }, { key: "narrated" as const, label: "Narrados", count: narratedScripts.length }, { key: "avatar" as const, label: "Apresentadora", count: avatarScripts.length }]).map((f) => (
                    <button key={f.key} onClick={() => setProductionFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${productionFilter === f.key ? "bg-seazone-primary text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>{f.label} ({f.count})</button>
                  ))}
                </div>

                {/* Scripts */}
                <div className="space-y-2">
                  {(productionFilter === "all" ? scripts : scripts.filter((s) => s.type === productionFilter)).map((script) => {
                    const cfg = TYPE_CONFIG[script.type];
                    const ps = productionStatus[script.id] || { status: "idle" };
                    return (
                      <div key={script.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${ps.status === "done" ? "border-green-200" : ps.status === "error" ? "border-red-200" : "border-gray-100"}`}>
                        <div className={`h-1 bg-gradient-to-r ${cfg.color}`} />
                        <div className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${cfg.badge}`}>{cfg.icon}{cfg.label}</span>
                                <span className="text-xs text-gray-400 font-mono">#{script.id}</span>
                                <span className="text-xs font-medium text-gray-700">{script.title}</span>
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-1">{script.script}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {ps.status === "idle" && (script.type === "static" ? (
                                <button onClick={() => handleProduce(script, "fal-image")} className="px-3 py-1.5 bg-emerald-500 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-600 whitespace-nowrap">Gerar Imagem (Fal AI)</button>
                              ) : (
                                <button onClick={() => handleProduce(script, "fal-video")} className="px-3 py-1.5 bg-purple-500 text-white text-[11px] font-semibold rounded-lg hover:bg-purple-600 whitespace-nowrap">Gerar Vídeo (Fal AI)</button>
                              ))}
                              {ps.status === "producing" && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <svg className="w-4 h-4 animate-spin text-seazone-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                  {ps.platform}...
                                </div>
                              )}
                              {ps.status === "done" && (
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-green-100 text-green-700">Pronto</span>
                                  {ps.resultUrl && !ps.resultUrl.startsWith("data:") && (
                                    <a href={ps.resultUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-seazone-secondary hover:underline font-medium">Ver criativo</a>
                                  )}
                                  {ps.resultUrl && ps.overlayText && (
                                    <button onClick={() => handleDownloadCreative(script.id)} className="px-2 py-1 rounded-md text-[10px] font-semibold bg-seazone-primary text-white hover:bg-seazone-secondary transition">Download com texto</button>
                                  )}
                                  {ps.resultUrl && !ps.overlayText && (
                                    <a href={ps.resultUrl} download={ps.fileName || `criativo_${script.id}.png`} className="px-2 py-1 rounded-md text-[10px] font-semibold bg-seazone-primary text-white hover:bg-seazone-secondary transition">Download</a>
                                  )}
                                </div>
                              )}
                              {ps.status === "error" && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-red-500">{ps.error}</span>
                                  <button onClick={() => setProductionStatus((p) => ({ ...p, [script.id]: { status: "idle" } }))} className="text-[10px] text-gray-500 underline">Tentar</button>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Preview da imagem gerada com overlay de texto CSS */}
                          {ps.status === "done" && ps.resultUrl && (
                            <div className="mt-3 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                              {ps.resultUrl.match(/\.(mp4|webm)/) || ps.resultUrl.startsWith("data:video") ? (
                                <video src={ps.resultUrl} controls className="w-full max-h-[500px]" />
                              ) : (
                                <div id={`creative-${script.id}`} className="relative w-full" style={{ maxWidth: 540, margin: "0 auto" }}>
                                  <img src={ps.resultUrl} alt={script.title} className="w-full block" crossOrigin="anonymous" />
                                  {ps.overlayText && (
                                    <>
                                      {/* Gradient overlay */}
                                      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.88) 100%)" }} />
                                      {/* SEAZONE badge */}
                                      <div className="absolute top-3 right-3 px-3 py-1 rounded-md text-[10px] font-bold tracking-widest text-white" style={{ backgroundColor: "rgba(31,78,120,0.85)" }}>SEAZONE</div>
                                      {/* Top accent */}
                                      <div className="absolute top-3 left-4 w-12 h-1 rounded" style={{ backgroundColor: "#3B9AE1" }} />
                                      {/* Hook text */}
                                      <div className="absolute left-4 right-4" style={{ bottom: "28%" }}>
                                        <p className="text-white font-extrabold leading-tight drop-shadow-lg" style={{ fontSize: "clamp(18px, 4vw, 32px)", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{ps.overlayText.hook}</p>
                                      </div>
                                      {/* Script text */}
                                      <div className="absolute left-4 right-4" style={{ bottom: "10%" }}>
                                        <p className="text-white/90 leading-snug drop-shadow" style={{ fontSize: "clamp(10px, 2vw, 16px)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{ps.overlayText.script}</p>
                                      </div>
                                      {/* Bottom bar with SPOT name */}
                                      <div className="absolute bottom-0 left-0 right-0 py-1.5 text-center" style={{ backgroundColor: "#1F4E78" }}>
                                        <span className="text-white text-[10px] font-bold tracking-widest">{ps.overlayText.nomeSpot.toUpperCase()}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: Asset panel */}
              {showAssetPanel && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-fit sticky top-20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 text-sm">Assets de Referência</h3>
                    <label className="px-3 py-1.5 bg-seazone-primary text-white text-[11px] font-semibold rounded-lg hover:bg-seazone-secondary cursor-pointer transition">
                      Upload
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length) handleUploadAssets(e.target.files, "uploads");
                        }}
                      />
                    </label>
                  </div>

                  {loadingAssets ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Carregando assets...</div>
                  ) : Object.keys(assets).length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm mb-2">Nenhum asset encontrado</p>
                      <p className="text-gray-400 text-xs">Faça upload de imagens de referência</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                      {Object.entries(assets).map(([folder, folderAssets]) => (
                        <div key={folder}>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{folder.replace(/-/g, ' ')}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {folderAssets.map((asset) => {
                              const isSelected = selectedAssets.includes(asset.path);
                              return (
                                <button
                                  key={asset.path}
                                  onClick={() => toggleAssetSelection(asset.path)}
                                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${isSelected ? 'border-seazone-primary ring-2 ring-seazone-accent/30' : 'border-transparent hover:border-gray-300'}`}
                                >
                                  {asset.type === "image" ? (
                                    <img src={asset.path} alt={asset.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                      <svg className="w-8 h-8 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-seazone-primary/30 flex items-center justify-center">
                                      <div className="w-6 h-6 rounded-full bg-seazone-primary flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                      </div>
                                    </div>
                                  )}
                                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 truncate">{asset.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadingAssets && <div className="mt-3 text-center text-xs text-seazone-secondary animate-pulse">Fazendo upload...</div>}
                </div>
              )}
            </div>

            {/* Drive upload section */}
            {doneCount > 0 && (
              <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-bold text-gray-800">Salvar no Google Drive</h3>
                    <p className="text-xs text-gray-500">{doneCount} criativos prontos</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={driveFolderId}
                      onChange={(e) => setDriveFolderId(e.target.value)}
                      placeholder="Link ou ID da pasta do Drive"
                      className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-xs focus:ring-2 focus:ring-blue-300 outline-none w-64"
                    />
                    {driveUploaded ? (
                      <span className="text-green-600 font-medium text-sm">Enviado!</span>
                    ) : (
                      <button onClick={handleUploadDrive} disabled={uploadingDrive || !driveFolderId.trim()} className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 text-sm disabled:opacity-40">
                        {uploadingDrive ? "Enviando..." : "Enviar para Drive"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <button onClick={() => setStep("review-head")} className="text-sm text-gray-500 hover:text-gray-700">Voltar para revisão</button>
            </div>
          </div>
        )}

      </main>

      <footer className="border-t border-gray-100 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-xs text-gray-400">Seazone Criativos v2.0 &middot; Powered by IA</p>
        </div>
      </footer>
    </div>
  );
}
