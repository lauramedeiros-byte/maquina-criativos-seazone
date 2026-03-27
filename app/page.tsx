"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────
interface SceneLayer {
  duration: string;
  visual: string;
  text_on_screen: string;
  narration: string;
  useReference: boolean;
  referenceType: string;
}

interface GeneratedScript {
  id: number;
  type: "static" | "narrated" | "avatar";
  title: string;
  layers?: {
    background?: { imagePrompt: string; style: string; useReference: boolean };
    scenes?: SceneLayer[];
    videoPrompt?: string;
    style?: string;
    text: { hook: string; body: string; cta: string };
    logos: { seazone: boolean; empreendimento: boolean };
  };
  // Legacy fields (backward compat)
  copyText?: string;
  script: string;
  imagePrompt: string;
  hook: string;
  edited?: boolean;
}

type Step = "briefing" | "importing" | "scripts" | "production";

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
  { key: "briefing", label: "Briefing", num: 1 },
  { key: "importing", label: "Importando", num: 2 },
  { key: "scripts", label: "Roteiros", num: 3 },
  { key: "production", label: "Produção", num: 4 },
];

// ─── Reusable components ─────────────────────────────────────────
function FormInput({ label, value, onChange, placeholder, hint, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; type?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent focus:border-transparent outline-none transition"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function FormTextArea({ label, value, onChange, placeholder, hint, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; rows?: number;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent focus:border-transparent outline-none transition resize-none"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
export default function Home() {
  const [step, setStep] = useState<Step>("briefing");
  const [importingMessage, setImportingMessage] = useState("Importando briefing do Lovable...");

  // ── Briefing state
  const [nomeSpot, setNomeSpot] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [lovableUrl, setLovableUrl] = useState("");
  const [pontosObrigatorios, setPontosObrigatorios] = useState("");
  const [doseDonts, setDoseDonts] = useState("");
  // ── Video briefing state
  const [videoDuration, setVideoDuration] = useState("15");
  const [videoTom, setVideoTom] = useState("");
  const [videoReferenceNotes, setVideoReferenceNotes] = useState("");
  const [presentadoraNome, setPresentadoraNome] = useState("Mônica");
  const [presentadoraEstilo, setPresentadoraEstilo] = useState("");
  const [logoEmpreendimento, setLogoEmpreendimento] = useState<string>("");
  const [lovableData, setLovableData] = useState<Record<string, unknown> | null>(null);
  const [lovableImported, setLovableImported] = useState(false);

  // ── Logo & reference assets previews
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [referenceAssetPreviews, setReferenceAssetPreviews] = useState<Array<{ name: string; url: string }>>([]);
  const [referenceAssetFiles, setReferenceAssetFiles] = useState<File[]>([]);

  // ── Scripts state
  const [scripts, setScripts] = useState<GeneratedScript[]>([]);
  const [warning, setWarning] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "static" | "narrated" | "avatar">("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  // ── Production state
  const [productionFilter, setProductionFilter] = useState<"all" | "static" | "narrated" | "avatar">("all");
  const [productionStatus, setProductionStatus] = useState<Record<number, {
    status: "idle" | "producing" | "done" | "error";
    platform?: string; resultUrl?: string; fileName?: string; error?: string;
    overlayText?: { hook: string; script: string; nomeSpot: string; cta?: string };
    score?: number;
  }>>({});
  const [driveFolderId, setDriveFolderId] = useState("");
  const [uploadingDrive, setUploadingDrive] = useState(false);
  const [driveUploaded, setDriveUploaded] = useState(false);

  // ── Assets state
  const [assets, setAssets] = useState<Record<string, Array<{ name: string; path: string; type: string; folder: string }>>>({});
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

  // ── Derived
  const filteredScripts = typeFilter === "all" ? scripts : scripts.filter((s) => s.type === typeFilter);
  const staticScripts = scripts.filter((s) => s.type === "static");
  const narratedScripts = scripts.filter((s) => s.type === "narrated");
  const avatarScripts = scripts.filter((s) => s.type === "avatar");
  const doneCount = Object.values(productionStatus).filter((s) => s.status === "done").length;
  const producingCount = Object.values(productionStatus).filter((s) => s.status === "producing").length;

  // ── Import from Lovable
  async function handleImportLovable() {
    if (!lovableUrl.trim()) return alert("Cole o link do Lovable");
    setImportingMessage("Importando briefing do Lovable...");
    setStep("importing");
    try {
      const res = await fetch("/api/import-lovable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: lovableUrl }),
      });
      const result = await res.json();
      if (result.error) {
        alert(result.error);
        setStep("briefing");
        return;
      }
      const d = result.data;
      if (d.nomeSpot) setNomeSpot(d.nomeSpot);
      if (d.localizacao) setLocalizacao(d.localizacao);
      if (d.pontosObrigatorios) setPontosObrigatorios(d.pontosObrigatorios);
      if (d.doseDonts) setDoseDonts(d.doseDonts);
      setLovableData(d);
      setLovableImported(true);
    } catch (err) {
      alert("Erro ao importar: " + (err instanceof Error ? err.message : "verifique o link"));
    }
    setStep("briefing");
  }

  // ── Handle logo upload
  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    setLogoEmpreendimento(url);
  }

  // ── Handle reference assets upload
  function handleReferenceAssetsUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const previews = files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    setReferenceAssetPreviews((prev) => [...prev, ...previews]);
    setReferenceAssetFiles((prev) => [...prev, ...files]);
  }

  function removeReferenceAsset(idx: number) {
    setReferenceAssetPreviews((prev) => prev.filter((_, i) => i !== idx));
    setReferenceAssetFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Generate scripts
  async function handleGenerateScripts() {
    if (!nomeSpot.trim()) return alert("Preencha o nome do SPOT");
    setImportingMessage("Gerando roteiros com IA...");
    setStep("importing");
    setWarning("");

    // Upload reference assets to server before generating
    if (referenceAssetFiles.length > 0) {
      const formData = new FormData();
      formData.append("folder", "referencias");
      for (const file of referenceAssetFiles) {
        formData.append("files", file);
      }
      try {
        const uploadRes = await fetch("/api/assets/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.saved) {
          // Auto-select these assets for production
          setSelectedAssets(prev => [...prev, ...uploadData.saved]);
        }
      } catch { /* continue anyway */ }
    }

    try {
      const res = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeSpot,
          localizacao,
          pontosObrigatorios,
          doseDonts,
          lovableData,
          // Video briefing
          videoBriefing: {
            duration: videoDuration,
            tom: videoTom,
            referenceNotes: videoReferenceNotes,
            presentadora: {
              nome: presentadoraNome,
              estilo: presentadoraEstilo,
            },
          },
        }),
      });
      const data = await res.json();
      if (data.warning) setWarning(data.warning);
      setScripts((data.scripts || []).map((s: GeneratedScript) => ({ ...s })));
      setStep("scripts");
    } catch {
      alert("Erro ao gerar roteiros. Tente novamente.");
      setStep("briefing");
    }
  }

  // ── Script editing
  function startEdit(s: GeneratedScript) { setEditingId(s.id); setEditText(s.script); }
  function saveEdit() {
    if (editingId === null) return;
    setScripts((prev) => prev.map((s) => s.id === editingId ? { ...s, script: editText, edited: true } : s));
    setEditingId(null); setEditText("");
  }

  // ── Production
  async function handleProduce(script: GeneratedScript, platform: "fal-image" | "fal-video" | "openrouter-image") {
    setProductionStatus((p) => ({ ...p, [script.id]: { status: "producing", platform } }));
    try {
      const res = await fetch("/api/produce", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId: script.id, type: script.type, platform,
          script: script.script,
          imagePrompt: script.layers?.background?.imagePrompt || script.layers?.videoPrompt || script.imagePrompt,
          title: script.title,
          hook: script.layers?.text.hook || script.hook,
          copyText: script.layers ? `${script.layers.text.hook}\n${script.layers.text.body}` : script.copyText,
          nomeSpot,
          referenceAssets: (script.layers?.background?.useReference !== false && script.layers?.scenes?.[0]?.useReference !== false) ? selectedAssets : [],
          pontosObrigatorios,
          logoEmpreendimento,
          scenes: script.layers?.scenes,
        }),
      });
      const data = await res.json();
      setProductionStatus((p) => ({
        ...p,
        [script.id]: data.success
          ? { status: "done", platform, resultUrl: data.videoUrl || data.imageUrl, fileName: data.fileName, overlayText: data.overlayText, score: data.score }
          : { status: "error", platform, error: data.error },
      }));
    } catch {
      setProductionStatus((p) => ({ ...p, [script.id]: { status: "error", platform, error: "Erro de conexão" } }));
    }
  }

  async function handleProduceAll(type: "static" | "video", forcePlatform?: string) {
    const list = type === "static" ? scripts.filter((s) => s.type === "static") : scripts.filter((s) => s.type === "narrated" || s.type === "avatar");
    for (const s of list) {
      if (productionStatus[s.id]?.status === "done") continue;
      const platform = forcePlatform || (s.type === "static" ? "fal-image" : "fal-video");
      await handleProduce(s, platform as any);
    }
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
      const folders = data.folders || {};
      setAssets(folders);

      // Auto-select all image assets if none selected yet
      setSelectedAssets(prev => {
        if (prev.length > 0) return prev;
        const allImages: string[] = [];
        Object.values(folders).forEach((folderAssets: any) => {
          (folderAssets as Array<{ name: string; path: string; type: string; folder: string }>).forEach(
            (a) => { if (a.type === "image") allImages.push(a.path); }
          );
        });
        return allImages.length > 0 ? allImages : prev;
      });
    } catch { /* ignore */ }
    setLoadingAssets(false);
  }

  async function handleUploadAssets(files: FileList, folder: string) {
    setUploadingAssets(true);
    try {
      const formData = new FormData();
      formData.append("folder", folder);
      for (const file of Array.from(files)) formData.append("files", file);
      const res = await fetch("/api/assets/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) await loadAssets();
    } catch { /* ignore */ }
    setUploadingAssets(false);
  }

  function toggleAssetSelection(assetPath: string) {
    setSelectedAssets((prev) =>
      prev.includes(assetPath) ? prev.filter((p) => p !== assetPath) : [...prev, assetPath]
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

    // Property logo (top left) — if available
    if (logoEmpreendimento) {
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = logoEmpreendimento;
        await new Promise((resolve, reject) => { logoImg.onload = resolve; logoImg.onerror = reject; });
        // Draw logo maintaining aspect ratio, max height 60px
        const logoH = 60;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        ctx.drawImage(logoImg, 40, 30, logoW, logoH);
      } catch { /* logo failed to load, skip */ }
    }

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

    // CTA button
    if (ps.overlayText?.cta) {
      const ctaText = ps.overlayText.cta;
      ctx.font = "bold 20px Arial";
      const ctaWidth = ctx.measureText(ctaText).width + 40;
      ctx.fillStyle = "#3B9AE1";
      ctx.beginPath();
      ctx.roundRect(50, y + 15, ctaWidth, 40, 8);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.textAlign = "left";
      ctx.fillText(ctaText, 70, y + 42);
    }

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
            {step !== "briefing" && (
              <button
                onClick={() => { if (confirm("Voltar ao início? O progresso será perdido.")) { setStep("briefing"); setScripts([]); setProductionStatus({}); } }}
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
              const isActive = s.key === step;
              const stepIdx = STEPS_INFO.findIndex((x) => x.key === step);
              const isPast = i < stepIdx;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-8 h-0.5 ${isPast ? "bg-seazone-primary" : "bg-gray-200"}`} />}
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isActive ? "bg-seazone-primary text-white shadow-md scale-110" : isPast ? "bg-seazone-primary text-white" : "bg-gray-200 text-gray-500"}`}>
                      {isPast ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      ) : s.num}
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

        {/* ═══ STEP 1: BRIEFING ═══ */}
        {step === "briefing" && (
          <div className="max-w-3xl mx-auto">

            {/* ── HERO CARD: Link do Lovable ── */}
            <div className="bg-gradient-to-r from-seazone-dark to-seazone-primary rounded-2xl shadow-md p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Link do Lovable</h3>
                  <p className="text-xs text-blue-200">A IA lê o briefing completo e preenche os campos automaticamente</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={lovableUrl}
                  onChange={(e) => setLovableUrl(e.target.value)}
                  placeholder="https://nomedoempreendimento.lovable.app/"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:ring-2 focus:ring-white/30 outline-none"
                />
                <button
                  onClick={handleImportLovable}
                  disabled={!lovableUrl.trim()}
                  className="px-5 py-2.5 bg-white text-seazone-primary font-bold text-sm rounded-xl hover:bg-blue-50 transition disabled:opacity-40 whitespace-nowrap"
                >
                  Importar
                </button>
              </div>
              {lovableImported && (
                <div className="mt-3 flex items-center gap-2 text-emerald-300 text-xs font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Briefing importado com sucesso! Revise e ajuste os campos abaixo.
                </div>
              )}
              {!lovableImported && (
                <p className="text-[10px] text-blue-200/70 mt-2">Ou preencha os campos manualmente abaixo</p>
              )}
            </div>

            {/* ── DADOS DO SPOT ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-seazone-light flex items-center justify-center">
                  <svg className="w-4 h-4 text-seazone-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                Dados do SPOT
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Nome do SPOT *"
                  value={nomeSpot}
                  onChange={setNomeSpot}
                  placeholder="Ex: Novo Campeche SPOT II"
                />
                <FormInput
                  label="Localização"
                  value={localizacao}
                  onChange={setLocalizacao}
                  placeholder="Ex: Campeche, Florianópolis"
                />
              </div>
            </div>

            {/* ── PONTOS OBRIGATÓRIOS ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                Pontos Obrigatórios
              </h2>
              <p className="text-xs text-gray-500 mb-4">O que DEVE aparecer em todos os criativos — dados concretos que a IA vai incluir nos roteiros.</p>
              <FormTextArea
                label=""
                value={pontosObrigatorios}
                onChange={setPontosObrigatorios}
                rows={5}
                placeholder={"Liste os pontos que DEVEM aparecer em todos os criativos:\n- ROI projetado: 16.4%\n- Rendimento: R$5.500/mês\n- Localização premium\n- Fachada premiada"}
              />
            </div>

            {/* ── DO'S E DON'TS ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                {"Do's e Don'ts"}
              </h2>
              <p className="text-xs text-gray-500 mb-4">Diretrizes criativas — o que fazer e o que evitar nos criativos.</p>
              <FormTextArea
                label=""
                value={doseDonts}
                onChange={setDoseDonts}
                rows={4}
                placeholder={"DO: Tom direto, dados concretos, frases curtas, imagens reais do empreendimento\nDON'T: Não usar termos técnicos demais, não usar stock genérico, evitar texto longo em tela"}
              />
            </div>

            {/* ── BRIEFING DE VÍDEO ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                Briefing de Vídeo
              </h2>
              <p className="text-xs text-gray-500 mb-4">Configurações para os vídeos narrados e com apresentadora. Suba vídeos de referência nos Assets acima.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duração alvo</label>
                  <select
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-seazone-accent focus:border-transparent outline-none"
                  >
                    <option value="15">15 segundos (Reels/Stories)</option>
                    <option value="30">30 segundos (Feed/Ads)</option>
                    <option value="60">60 segundos (YouTube/Landing)</option>
                  </select>
                </div>
                <FormInput
                  label="Tom dos vídeos"
                  value={videoTom}
                  onChange={setVideoTom}
                  placeholder="Ex: Profissional mas acessível, investidor conversa com investidor"
                  hint="Como deve soar a narração e o tom geral"
                />
              </div>

              <FormTextArea
                label="Referência de estilo"
                value={videoReferenceNotes}
                onChange={setVideoReferenceNotes}
                rows={3}
                placeholder={"Descreva o estilo dos vídeos de referência que você subiu:\nEx: Drone vindo do mar, revela a fachada, corta para dados em tela, encerra com CTA.\nOu: Apresentadora fala direto com a câmera, imagens do empreendimento intercaladas."}
                hint="Descreva como são os vídeos de referência para a IA replicar o estilo"
              />

              <div className="mt-2 p-3 rounded-xl bg-violet-50/50 border border-violet-100">
                <h3 className="text-sm font-semibold text-violet-800 mb-2">Apresentadora</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Nome da apresentadora"
                    value={presentadoraNome}
                    onChange={setPresentadoraNome}
                    placeholder="Ex: Mônica"
                  />
                  <FormInput
                    label="Estilo da apresentadora"
                    value={presentadoraEstilo}
                    onChange={setPresentadoraEstilo}
                    placeholder="Ex: Carismática, como amiga especialista em investimentos"
                    hint="Tom e personalidade"
                  />
                </div>
              </div>
            </div>

            {/* ── LOGO DO EMPREENDIMENTO ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-seazone-light flex items-center justify-center">
                  <svg className="w-4 h-4 text-seazone-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                </div>
                Logo do Empreendimento
              </h2>
              <p className="text-xs text-gray-500 mb-4">Upload do logo para usar nos criativos.</p>
              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 font-medium mb-1">Logo carregado</p>
                    <label className="text-xs text-seazone-secondary hover:underline cursor-pointer">
                      Trocar logo
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:border-seazone-accent hover:bg-seazone-light/30 transition">
                  <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  <span className="text-sm text-gray-500">Clique para fazer upload do logo</span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG, SVG</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              )}
            </div>

            {/* ── ASSETS DE REFERÊNCIA ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
              <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                Assets de Referência
              </h2>
              <p className="text-xs text-gray-500 mb-4">Renders da fachada, fotos do empreendimento, imagens de referência visual.</p>

              {referenceAssetPreviews.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
                  {referenceAssetPreviews.map((asset, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeReferenceAsset(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 truncate">{asset.name}</span>
                    </div>
                  ))}
                  <label className="aspect-square rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-seazone-accent hover:bg-seazone-light/20 transition">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleReferenceAssetsUpload} />
                  </label>
                </div>
              )}

              {referenceAssetPreviews.length === 0 && (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:border-seazone-accent hover:bg-seazone-light/30 transition">
                  <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  <span className="text-sm text-gray-500">Clique para adicionar imagens de referência</span>
                  <span className="text-xs text-gray-400 mt-1">Renders de fachada, fotos, moodboard — múltiplos arquivos</span>
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleReferenceAssetsUpload} />
                </label>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleGenerateScripts}
              disabled={!nomeSpot.trim()}
              className="w-full py-4 bg-gradient-to-r from-seazone-primary to-seazone-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-base"
            >
              Gerar Roteiros com IA
            </button>
          </div>
        )}

        {/* ═══ STEP 2: IMPORTING ═══ */}
        {step === "importing" && (
          <div className="max-w-lg mx-auto text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-seazone-light to-blue-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-seazone-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{importingMessage}</h3>
            <p className="text-gray-500 text-sm mb-6">
              {importingMessage.includes("Gerando")
                ? `Criando roteiros personalizados para o SPOT "${nomeSpot}".`
                : "Aguarde enquanto lemos e processamos o briefing completo."}
            </p>
            <div className="w-64 mx-auto h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-seazone-primary to-seazone-accent rounded-full shimmer w-2/3" />
            </div>
          </div>
        )}

        {/* ═══ STEP 3: SCRIPTS ═══ */}
        {step === "scripts" && (
          <div className="max-w-4xl mx-auto">
            {warning && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">{warning}</div>
            )}

            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Roteiros Gerados</h2>
                  <p className="text-sm text-gray-500">SPOT {nomeSpot} &mdash; {scripts.length} roteiros</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(["static", "narrated", "avatar"] as const).map((type) => {
                    const cfg = TYPE_CONFIG[type];
                    const count = scripts.filter((s) => s.type === type).length;
                    return (
                      <div key={type} className={`rounded-lg px-3 py-2 ${cfg.bg} border ${cfg.border}`}>
                        <p className={`text-lg font-bold ${cfg.text}`}>{count}</p>
                        <p className={`text-[10px] font-medium ${cfg.text}`}>{cfg.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {([
                { key: "all" as const, label: "Todos", count: scripts.length },
                { key: "static" as const, label: "Estáticos", count: staticScripts.length },
                { key: "narrated" as const, label: "Narrados", count: narratedScripts.length },
                { key: "avatar" as const, label: "Apresentadora", count: avatarScripts.length },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setTypeFilter(f.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${typeFilter === f.key ? "bg-seazone-primary text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Script cards */}
            <div className="space-y-3">
              {filteredScripts.map((script) => {
                const cfg = TYPE_CONFIG[script.type];
                const isEditing = editingId === script.id;
                return (
                  <div key={script.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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
                          {script.hook && !isEditing && (
                            <p className="text-xs text-seazone-secondary font-medium mb-1">
                              <span className="text-gray-400 font-normal">Hook: </span>{script.hook || script.layers?.text.hook}
                            </p>
                          )}
                          {script.layers && !isEditing && (
                            <div className="mt-2">
                              <div className="flex gap-2 flex-wrap">
                                {script.layers.background && (
                                  <span className="px-2 py-0.5 rounded text-[9px] bg-blue-50 text-blue-700">
                                    BG: {script.layers.background.style} {script.layers.background.useReference ? "+ ref" : ""}
                                  </span>
                                )}
                                {script.layers.style && (
                                  <span className="px-2 py-0.5 rounded text-[9px] bg-purple-50 text-purple-700">
                                    Estilo: {script.layers.style}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded text-[9px] bg-amber-50 text-amber-700">
                                  Hook: {script.layers.text.hook}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[9px] bg-green-50 text-green-700">
                                  CTA: {script.layers.text.cta}
                                </span>
                              </div>
                              {script.layers.scenes && (
                                <div className="mt-2 space-y-1">
                                  {script.layers.scenes.map((scene, i) => (
                                    <div key={i} className="flex gap-2 text-[9px]">
                                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono shrink-0">{scene.duration}</span>
                                      <span className="text-gray-500 truncate">{scene.visual.slice(0, 60)}...</span>
                                      {scene.useReference && <span className="px-1 py-0.5 rounded bg-purple-50 text-purple-600 shrink-0">ref: {scene.referenceType}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {isEditing ? (
                            <div className="mt-2">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={5}
                                className="w-full px-3 py-2 border border-seazone-accent rounded-lg text-sm focus:ring-2 focus:ring-seazone-accent outline-none resize-none"
                              />
                              <div className="flex gap-2 mt-2">
                                <button onClick={saveEdit} className="px-3 py-1.5 bg-seazone-primary text-white text-xs rounded-lg">Salvar</button>
                                <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-gray-500 text-xs rounded-lg border">Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 leading-relaxed">{script.script}</p>
                          )}
                        </div>
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(script)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer action */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep("briefing")}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Voltar ao briefing
              </button>
              <button
                onClick={() => setStep("production")}
                disabled={scripts.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-seazone-primary to-seazone-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 text-sm"
              >
                Aprovar e Produzir →
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: PRODUCTION ═══ */}
        {step === "production" && (
          <div>
            {/* Header row */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Produção de Criativos</h2>
                <p className="text-sm text-gray-500">SPOT &quot;{nomeSpot}&quot; &mdash; {doneCount}/{scripts.length} produzidos{producingCount > 0 && `, ${producingCount} em andamento`}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowAssetPanel(!showAssetPanel)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Assets {selectedAssets.length > 0 && <span className="px-1.5 py-0.5 bg-seazone-primary text-white text-[10px] rounded-full">{selectedAssets.length}</span>}
                </button>
                <button
                  onClick={() => handleProduceAll("static")}
                  disabled={producingCount > 0}
                  className="px-4 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-40"
                >
                  Gerar estáticos
                </button>
                <button onClick={() => handleProduceAll("static", "openrouter-image")} disabled={producingCount > 0} className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40">Estáticos (Pro)</button>
                <button
                  onClick={() => handleProduceAll("video")}
                  disabled={producingCount > 0}
                  className="px-4 py-2 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600 disabled:opacity-40"
                >
                  Gerar vídeos
                </button>
              </div>
            </div>

            {/* Selected assets banner */}
            {selectedAssets.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-seazone-light border border-seazone-accent/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-seazone-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-sm text-seazone-primary font-medium">{selectedAssets.length} asset(s) selecionado(s) como referência visual</span>
                </div>
                <button onClick={() => setSelectedAssets([])} className="text-xs text-seazone-secondary hover:underline">Limpar</button>
              </div>
            )}

            {/* 2-column layout */}
            <div className={`grid gap-6 ${showAssetPanel ? "grid-cols-1 lg:grid-cols-[1fr_340px]" : "grid-cols-1"}`}>

              {/* LEFT: Scripts list */}
              <div>
                {/* Filter tabs */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {([
                    { key: "all" as const, label: "Todos", count: scripts.length },
                    { key: "static" as const, label: "Estáticos", count: staticScripts.length },
                    { key: "narrated" as const, label: "Narrados", count: narratedScripts.length },
                    { key: "avatar" as const, label: "Apresentadora", count: avatarScripts.length },
                  ]).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setProductionFilter(f.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${productionFilter === f.key ? "bg-seazone-primary text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                    >
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>

                {/* Script production cards */}
                <div className="space-y-2">
                  {(productionFilter === "all" ? scripts : scripts.filter((s) => s.type === productionFilter)).map((script) => {
                    const cfg = TYPE_CONFIG[script.type];
                    const ps = productionStatus[script.id] || { status: "idle" };
                    const score = ps.status === "done" ? ps.score : undefined;
                    const scoreLow = score !== undefined && score < 6;
                    return (
                      <div
                        key={script.id}
                        className={`bg-white rounded-xl border shadow-sm overflow-hidden ${ps.status === "done" ? (scoreLow ? "border-red-200" : "border-green-200") : ps.status === "error" ? "border-red-200" : "border-gray-100"}`}
                      >
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
                              {/* Score badge */}
                              {ps.status === "done" && score !== undefined && (
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${scoreLow ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                  Score {score}/10
                                </span>
                              )}

                              {ps.status === "idle" && script.type === "static" && (
                                <div className="flex gap-1.5">
                                  <button onClick={() => handleProduce(script, "fal-image")} className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-semibold rounded-lg hover:bg-emerald-600 whitespace-nowrap">Fal AI</button>
                                  <button onClick={() => handleProduce(script, "openrouter-image")} className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap">FLUX Pro</button>
                                </div>
                              )}
                              {ps.status === "idle" && script.type !== "static" && (
                                <button onClick={() => handleProduce(script, "fal-video")} className="px-3 py-1.5 bg-purple-500 text-white text-[11px] font-semibold rounded-lg hover:bg-purple-600 whitespace-nowrap">Gerar Vídeo</button>
                              )}

                              {ps.status === "producing" && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <svg className="w-4 h-4 animate-spin text-seazone-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                  <span>Gerando{script.type === "static" ? " (~30s)" : " (~2min)"}...</span>
                                </div>
                              )}

                              {ps.status === "done" && (
                                <div className="flex items-center gap-2">
                                  {!scoreLow && <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-green-100 text-green-700">Pronto</span>}
                                  {scoreLow && (
                                    <button
                                      onClick={() => handleProduce(script, script.type === "static" ? "fal-image" : "fal-video")}
                                      className="px-2 py-1 rounded-md text-[10px] font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
                                    >
                                      Refazer
                                    </button>
                                  )}
                                  {ps.resultUrl && !ps.resultUrl.startsWith("data:") && (
                                    <a href={ps.resultUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-seazone-secondary hover:underline font-medium">Ver</a>
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
                                  <button onClick={() => setProductionStatus((p) => ({ ...p, [script.id]: { status: "idle" } }))} className="text-[10px] text-gray-500 underline">Tentar novamente</button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Preview with CSS text overlay */}
                          {ps.status === "done" && ps.resultUrl && (
                            <div className="mt-3 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                              {ps.resultUrl.match(/\.(mp4|webm)/) || ps.resultUrl.startsWith("data:video") ? (
                                <video src={ps.resultUrl} controls className="w-full max-h-[500px]" />
                              ) : (
                                <div id={`creative-${script.id}`} className="relative w-full" style={{ maxWidth: 540, margin: "0 auto" }}>
                                  <img src={ps.resultUrl} alt={script.title} className="w-full block" crossOrigin="anonymous" />
                                  {ps.overlayText && (
                                    <>
                                      {/* LAYER 1: Gradient for text readability */}
                                      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.88) 100%)" }} />

                                      {/* LAYER 3: Logos */}
                                      {/* Seazone badge - always top right */}
                                      <div className="absolute top-3 right-3 px-3 py-1 rounded-md text-[10px] font-bold tracking-widest text-white" style={{ backgroundColor: "rgba(31,78,120,0.85)" }}>SEAZONE</div>
                                      {/* Empreendimento logo - top left */}
                                      {logoEmpreendimento && (
                                        <div className="absolute top-3 left-3">
                                          <img src={logoEmpreendimento} alt="Logo" className="h-8 w-auto object-contain drop-shadow-lg" />
                                        </div>
                                      )}
                                      {/* Top accent */}
                                      <div className="absolute top-14 left-4 w-12 h-1 rounded" style={{ backgroundColor: "#3B9AE1" }} />

                                      {/* LAYER 2: Marketing Text */}
                                      {/* Hook */}
                                      <div className="absolute left-4 right-4" style={{ bottom: "28%" }}>
                                        <p className="text-white font-extrabold leading-tight drop-shadow-lg" style={{ fontSize: "clamp(18px, 4vw, 32px)", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
                                          {ps.overlayText.hook}
                                        </p>
                                      </div>
                                      {/* Body */}
                                      <div className="absolute left-4 right-4" style={{ bottom: "18%" }}>
                                        <p className="text-white/90 leading-snug drop-shadow" style={{ fontSize: "clamp(10px, 2vw, 16px)", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                                          {ps.overlayText.script}
                                        </p>
                                      </div>
                                      {/* CTA button */}
                                      {ps.overlayText.cta && (
                                        <div className="absolute left-4 right-4" style={{ bottom: "8%" }}>
                                          <div className="inline-block px-5 py-2 rounded-lg text-white font-bold" style={{ backgroundColor: "#3B9AE1", fontSize: "clamp(10px, 1.8vw, 14px)" }}>
                                            {ps.overlayText.cta}
                                          </div>
                                        </div>
                                      )}
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
                        onChange={(e) => { if (e.target.files?.length) handleUploadAssets(e.target.files, "uploads"); }}
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
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{folder.replace(/-/g, " ")}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {folderAssets.map((asset) => {
                              const isSelected = selectedAssets.includes(asset.path);
                              return (
                                <button
                                  key={asset.path}
                                  onClick={() => toggleAssetSelection(asset.path)}
                                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${isSelected ? "border-seazone-primary ring-2 ring-seazone-accent/30" : "border-transparent hover:border-gray-300"}`}
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
                      <button
                        onClick={handleUploadDrive}
                        disabled={uploadingDrive || !driveFolderId.trim()}
                        className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 text-sm disabled:opacity-40"
                      >
                        {uploadingDrive ? "Enviando..." : "Enviar para Drive"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <button onClick={() => setStep("scripts")} className="text-sm text-gray-500 hover:text-gray-700">Voltar para roteiros</button>
            </div>
          </div>
        )}

      </main>

      <footer className="border-t border-gray-100 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-xs text-gray-400">Seazone Criativos v3.0 &middot; Powered by IA</p>
        </div>
      </footer>
    </div>
  );
}
