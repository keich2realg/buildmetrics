"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as xlsx from "xlsx";
import { FileDropzone } from "@/components/file-dropzone";
import { MaterialTags } from "@/components/material-tags";
import { ScaleCalibration } from "@/components/scale-calibration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { uploadPlanAndCreateProject } from "./actions";
import { saveQuoteToProject } from "./projects/actions";

const MATERIALS = ["Béton", "Bois", "Métal perforé", "OSB"];

interface LotItem {
  id: string;
  designation: string;
  quantite: number;
  unite: string;
  prix_unitaire_ht: number;
}

interface AnalysisResult {
  lots: Omit<LotItem, "id">[];
  ai_confidence_score: number;
}

interface CalibrationData {
  distance: string;
  unit: string;
  pointA: { x: number; y: number };
  pointB: { x: number; y: number };
}

export default function DashboardPage() {
  // Form fields
  const [clientName, setClientName] = useState("");
  const [city, setCity] = useState("");
  const [projectName, setProjectName] = useState("");
  const [tva, setTva] = useState("20");
  const [notes, setNotes] = useState("");
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);

  // File + materials
  const [files, setFiles] = useState<File[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  // State
  const [profile, setProfile] = useState<{ is_pro: boolean; plan_tier?: string; plan_count: number; is_beta?: boolean; email?: string; first_name?: string; last_name?: string; company_name?: string; address?: string; siret?: string; logo_url?: string; brand_hex_color?: string; } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const router = useRouter();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [quotaModal, setQuotaModal] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { getUserProfile } = await import("./actions");
        const data = await getUserProfile();
        setProfile(data as any);
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setIsLoadingProfile(false);
      }
    }
    loadProfile();
  }, []);

  const isAdmin = profile?.email === "cheick9892@gmail.com";
  const limit = isAdmin || profile?.is_pro ? Infinity : (profile?.is_beta ? 10 : 3);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [lots, setLots] = useState<LotItem[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setFeedback(null);
    setAnalysisResult(null);
    setLots([]);
    // Reset calibration when files change
    if (newFiles.length === 0) setCalibration(null);
  }, []);

  const handleMaterialToggle = useCallback((material: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(material)
        ? prev.filter((m) => m !== material)
        : [...prev, material]
    );
    setFeedback(null);
  }, []);

  const canSubmit = files.length > 0 && selectedMaterials.length > 0 && clientName.trim().length > 0;

  // Build scale string for the API
  const scaleRef = calibration
    ? `Distance visuelle tracée par l'utilisateur = ${calibration.distance} ${calibration.unit}`
    : "Non fournie";

  const handleAnalyze = async () => {
    if (!canSubmit || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);
    setFeedback(null);
    setAnalysisResult(null);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + Math.random() * 10;
      });
    }, 400);

    let createdProjectId = "";

    try {
      // Step 1: Upload to Supabase
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("materials", JSON.stringify(selectedMaterials));
        formData.append("clientName", clientName);
        formData.append("city", city);
        formData.append("projectName", projectName);
        formData.append("tva", tva);
        formData.append("scaleValue", calibration?.distance || "");
        formData.append("scaleUnit", calibration?.unit || "m");
        formData.append("notes", notes);

        const result = await uploadPlanAndCreateProject(formData);
        if (result.error) {
          clearInterval(progressInterval);
          if (result.error === "LIMIT_REACHED") {
            // Afficher le pop-up intelligent au lieu du feedback texte
            const currentTier = profile?.plan_tier || 'decouverte';
            setQuotaModal(currentTier);
            setFeedback(null);
          } else {
            setFeedback({ type: "error", message: result.error });
          }
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }
        if (result.projectId) {
          createdProjectId = result.projectId;
        }
      }

      setUploadProgress(90);

      // Step 2: Call Gemini API for analysis
      const analyzeFormData = new FormData();
      analyzeFormData.append("file", files[0]);
      analyzeFormData.append("clientName", clientName);
      analyzeFormData.append("city", city);
      analyzeFormData.append("projectName", projectName);
      analyzeFormData.append("tva", tva);
      analyzeFormData.append("scaleValue", scaleRef);
      analyzeFormData.append("scaleUnit", calibration?.unit || "m");
      analyzeFormData.append("notes", notes);
      analyzeFormData.append("materials", JSON.stringify(selectedMaterials));

      const res = await fetch("/api/analyze-plan", {
        method: "POST",
        body: analyzeFormData,
      });

      const data = await res.json();
      clearInterval(progressInterval);

      if (!res.ok || data.error) {
        setFeedback({
          type: "error",
          message: data.error || "Erreur lors de l'analyse IA.",
        });
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);
      setAnalysisResult(data.analysis);
      if (createdProjectId) setProjectId(createdProjectId);

      const extractedLots: LotItem[] = (data.analysis.lots || []).map((l: any) => ({
        ...l,
        quantite: parseFloat(String(l.quantite)) || 0,
        prix_unitaire_ht: parseFloat(String(l.prix_unitaire_ht)) || 0,
        id: crypto.randomUUID(),
      }));
      
      setLots(extractedLots);
      
      if (createdProjectId && extractedLots.length > 0) {
        const res = await saveQuoteToProject(createdProjectId, extractedLots);
        if (res && res.error) {
          console.error("Save Quote Error:", res.error);
          setFeedback({
            type: "error",
            message: `Erreur interne: Impossible d'enregistrer le devis dans l'historique (${res.error}). Mettez à jour manuellement.`,
          });
        }
      }
      setFeedback({
        type: "success",
        message: "Analyse terminée avec succès ! Résultats ci-dessous.",
      });

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch {
      clearInterval(progressInterval);
      setFeedback({
        type: "error",
        message: "Une erreur inattendue est survenue. Veuillez réessayer.",
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCreateManual = async () => {
    setIsUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("clientName", clientName);
      formData.append("city", city);
      formData.append("projectName", projectName);
      formData.append("tva", tva);

      const { createManualProject } = await import("./actions");
      const result = await createManualProject(formData);

      if (result.error) {
        if (result.error === "LIMIT_REACHED") {
            setProfile((prev) => (prev ? { ...prev, plan_count: Math.max(prev.plan_count, limit) } : null));
        } else {
            setFeedback({ type: "error", message: result.error });
        }
        setIsUploading(false);
        return;
      }

      if (result.projectId) {
        router.push(`/dashboard/projects/${result.projectId}`);
      }
    } catch (e) {
      setFeedback({ type: "error", message: "Erreur lors de la création manuelle." });
      setIsUploading(false);
    }
  };

  const updateLot = (id: string, field: keyof LotItem, value: string | number) => {
    setLots((prev) =>
      prev.map((lot) =>
        lot.id === id ? { ...lot, [field]: value } : lot
      )
    );
  };

  const totalHt = lots.reduce(
    (sum, lot) => sum + (lot.quantite || 0) * (lot.prix_unitaire_ht || 0),
    0
  );
  const tvaRate = parseFloat(tva) / 100;
  const montantTva = totalHt * tvaRate;
  const totalTtc = totalHt + montantTva;

  const handlePrint = () => {
    const originalTitle = document.title;
    const originalPath = window.location.pathname;
    
    const slugify = (str: string) => {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
    };

    const year = new Date().getFullYear();
    const idFragment = projectId ? projectId.slice(0, 4) : Math.floor(Math.random() * 10000).toString();
    const safeClientName = clientName ? slugify(clientName) : "Client";
    const dynamicTitle = `Devis_${year}_${idFragment}_${safeClientName}`;
    
    // Use dynamic title to format the downloaded PDF default filename
    document.title = dynamicTitle;
    window.history.replaceState({}, '', '/devis');
    
    window.print();
    
    // Restore
    document.title = originalTitle;
    window.history.replaceState({}, '', originalPath);
  };

  const handleExportExcel = () => {
    if (!analysisResult) return;
    
    const wsData = [
      ["Désignation", "Quantité", "Unité", "Prix Unitaire HT", "Montant HT"],
      ...lots.map(lot => [
        lot.designation,
        lot.quantite,
        lot.unite,
        lot.prix_unitaire_ht,
        (lot.quantite || 0) * (lot.prix_unitaire_ht || 0)
      ]),
      [],
      ["", "", "", "Sous-total HT", totalHt],
      ["", "", "", `TVA (${tva}%)`, montantTva],
      ["", "", "", "Total TTC", totalTtc]
    ];

    const ws = xlsx.utils.aoa_to_sheet(wsData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Devis Estimatif");
    
    xlsx.writeFile(wb, "devis-buildmetrics.xlsx");
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Page Header */}
      <div className="mb-8 print:hidden">
        <h1 className="text-2xl font-bold text-anthracite tracking-tight mb-1">
          Nouvelle analyse
        </h1>
        <p className="text-muted-foreground">
          Renseignez les informations du projet, uploadez vos plans et lancez
          l&apos;analyse IA.
        </p>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
            feedback.type === "success"
              ? "border-steel/30 bg-steel/5 text-steel-dark"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            )}
            {feedback.message}
          </div>
        </div>
      )}

      {/* ── Informations Client ── */}
      <Card className="border-border/60 shadow-sm mb-6 print:hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-anthracite flex items-center gap-2">
            <svg className="h-5 w-5 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Informations Client
          </CardTitle>
          <CardDescription>
            Renseignez les coordonnées du client et le nom du projet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nom du client</Label>
              <Input
                id="clientName"
                placeholder="Cabinet Dupont"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                placeholder="Paris"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="projectName">Nom du projet</Label>
              <Input
                id="projectName"
                placeholder="Rénovation immeuble 12 rue de Rivoli"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Paramètres de chiffrage ── */}
      <Card className="border-border/60 shadow-sm mb-6 print:hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-anthracite flex items-center gap-2">
            <svg className="h-5 w-5 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            Paramètres de chiffrage
          </CardTitle>
          <CardDescription>
            Configurez la TVA applicable au projet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="tva">TVA applicable</Label>
            <Select value={tva} onValueChange={(v) => v && setTva(v)}>
              <SelectTrigger id="tva">
                <SelectValue placeholder="Sélectionnez la TVA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5.5">5,5 %</SelectItem>
                <SelectItem value="10">10 %</SelectItem>
                <SelectItem value="20">20 %</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Upload Card ── */}
      <Card className="border-border/60 shadow-sm mb-6 print:hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-anthracite flex items-center gap-2">
            <svg className="h-5 w-5 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            Plans architecturaux
          </CardTitle>
          <CardDescription>
            Glissez-déposez vos fichiers PDF, PNG ou JPG
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingProfile ? (
            <div className="flex justify-center p-8">
              <svg className="h-6 w-6 animate-spin text-steel" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <>
              <FileDropzone onFilesSelected={handleFilesSelected} />

              {/* Visual calibration button — appears after file upload */}
              {files.length > 0 && files[0].type.startsWith("image/") && (
                <div className="flex items-center gap-3 pt-2">
                  <ScaleCalibration
                    file={files[0]}
                    onCalibrate={setCalibration}
                    existingCalibration={calibration}
                  />
                  {calibration && (
                    <span className="text-sm text-muted-foreground">
                      Échelle de référence enregistrée
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Précision IA — Notes only ── */}
      <Card className="border-border/60 shadow-sm mb-6 print:hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-anthracite flex items-center gap-2">
            <svg className="h-5 w-5 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
            Précision IA
          </CardTitle>
          <CardDescription>
            Ajoutez des notes pour améliorer la précision de l&apos;analyse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes additionnelles pour l&apos;IA</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Mur en bois à conserver, sol du salon à remplacer entièrement, refaire l'électricité de la cuisine..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Materials Card ── */}
      <Card className="border-border/60 shadow-sm mb-8 print:hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-anthracite flex items-center gap-2">
            <svg className="h-5 w-5 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
            Matériaux dominants
          </CardTitle>
          <CardDescription>
            Sélectionnez un ou plusieurs matériaux présents dans vos plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaterialTags
            materials={MATERIALS}
            selected={selectedMaterials}
            onToggle={handleMaterialToggle}
          />
        </CardContent>
      </Card>

      {/* ── Submit Button ── */}
      <div className="space-y-3 mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            disabled={!canSubmit || isUploading}
            onClick={handleAnalyze}
            className="relative bg-steel hover:bg-steel-dark text-white px-8 shadow-sm shadow-steel/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer overflow-hidden"
          >
            {isUploading && (
              <div
                className="absolute inset-0 bg-steel-dark/30 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            )}
            <span className="relative z-10 flex items-center">
              {isUploading ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {uploadProgress < 90
                    ? `Upload ${Math.round(uploadProgress)}%`
                    : "Analyse IA en cours…"}
                </>
              ) : (
                <>
                  Lancer l&apos;analyse
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </span>
          </Button>

          {/* Bouton de Création Manuelle Exclusif PRO */}
          {profile?.plan_tier === 'pro' ? (
            <Button
              size="lg"
              variant="outline"
              disabled={isUploading}
              onClick={handleCreateManual}
              className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
            >
              Créer de zéro (Manuellement)
            </Button>
          ) : (
             <Button
              size="lg"
              variant="outline"
              disabled={true}
              className="opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200"
              title="Création manuelle exclue aux plans PRO"
             >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              Créer de zéro (Pro)
             </Button>
          )}
        </div>
        
        <div>
          {!canSubmit && !isUploading && (
            <p className="text-sm text-muted-foreground mt-3">
              {files.length === 0 && selectedMaterials.length === 0
                ? "Uploadez un plan et sélectionnez au moins un matériau"
                : files.length === 0
                ? "Uploadez au moins un plan"
                : "Sélectionnez au moins un matériau"}
            </p>
          )}
        </div>
      </div>

      {/* ── Devis Chiffré Estimatif ── */}
      {analysisResult && (
        <Card className="border-steel/30 shadow-md bg-white animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden mb-10">
          <CardHeader className="pb-4 bg-gradient-to-br from-white to-steel/[0.02] border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-anthracite flex items-center gap-2">
                  <svg className="h-6 w-6 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  Devis Chiffré Estimatif
                </CardTitle>
                <CardDescription className="mt-1.5">
                  {projectName ? `Projet : ${projectName}` : "Extraction IA"}
                  {clientName ? ` • Client : ${clientName}` : ""}
                </CardDescription>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium shrink-0 ${
                  analysisResult.ai_confidence_score >= 80
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : analysisResult.ai_confidence_score >= 50
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
                Confiance IA : {analysisResult.ai_confidence_score}%
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* ── NOUVEAU TEMPLATE PDF PROFESSIONNEL (Print Only) ── */}
            <div className="hidden print:block w-full bg-white text-slate-800 font-sans absolute top-0 left-0" style={{ minHeight: '100vh', zIndex: 9999, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              {/* Header Banner */}
              <div className="flex justify-between items-start text-white p-8" style={{ backgroundColor: profile?.brand_hex_color || '#1e293b' }}>
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    {profile?.logo_url && (
                      <div className="bg-white p-2 rounded shrink-0" style={{ maxWidth: '80px', maxHeight: '80px' }}>
                        <img src={profile.logo_url} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <h1 className="text-4xl font-bold tracking-tight uppercase">DEVIS</h1>
                  </div>
                  <p className="text-white/80 text-sm">N° DEV-{new Date().getFullYear()}-{projectId?.slice(0,4) || Math.floor(Math.random() * 10000)}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/90 text-sm font-medium">{new Date().toLocaleDateString("fr-FR")}</p>
                  <p className="text-white/60 text-xs mt-1">Valide 30 jours</p>
                </div>
              </div>

              {/* Cards Emetteur / Destinataire */}
              <div className="grid grid-cols-2 gap-8 mt-8 px-8">
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Émetteur</p>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">
                    {profile?.company_name || profile?.last_name || "Architecte / Artisan"}
                  </h2>
                  <div className="text-sm text-slate-500 space-y-1">
                    {profile?.address && <p>{profile.address}</p>}
                    <p>{profile?.email}</p>
                    {profile?.siret && <p className="mt-2 text-slate-400">SIRET: {profile.siret}</p>}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl">
                  <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Destinataire</p>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">
                    {clientName || "Non spécifié"}
                  </h2>
                  <div className="text-sm text-slate-500 space-y-1">
                    {city && <p>{city}</p>}
                  </div>
                </div>
              </div>

              {/* Project Card */}
              <div className="border border-slate-100 p-5 rounded-xl mt-8 mx-8">
                <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Projet</p>
                <h3 className="text-base font-semibold text-slate-800">{projectName || "Non nommé"}</h3>
              </div>

              {/* Table */}
              <div className="mt-10 rounded-xl overflow-hidden border mx-8" style={{ borderColor: profile?.brand_hex_color || '#e2e8f0' }}>
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-white" style={{ backgroundColor: profile?.brand_hex_color || '#1e293b' }}>
                    <tr>
                      <th className="px-6 py-4 font-semibold text-white">Désignation</th>
                      <th className="px-6 py-4 font-semibold text-white w-24">Quantité</th>
                      <th className="px-6 py-4 font-semibold text-white w-20">Unité</th>
                      <th className="px-6 py-4 font-semibold text-white w-32 text-right">PU HT</th>
                      <th className="px-6 py-4 font-semibold text-white w-36 text-right">Montant HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lots.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Aucun lot extrait.</td></tr>
                    ) : (
                      lots.map((lot) => {
                        const montant = (lot.quantite || 0) * (lot.prix_unitaire_ht || 0);
                        return (
                          <tr key={lot.id} className="odd:bg-white even:bg-slate-50 border-b last:border-0" style={{ pageBreakInside: 'avoid', borderColor: profile?.brand_hex_color ? `${profile.brand_hex_color}20` : '#f1f5f9' }}>
                            <td className="px-6 py-4 font-medium text-slate-800">{lot.designation}</td>
                            <td className="px-6 py-4 text-slate-600">{Number(lot.quantite).toFixed(2)}</td>
                            <td className="px-6 py-4 text-slate-500">{lot.unite}</td>
                            <td className="px-6 py-4 text-slate-600 text-right">{Number(lot.prix_unitaire_ht).toFixed(2)} €</td>
                            <td className="px-6 py-4 text-right font-semibold text-slate-800">
                              {(Math.round(montant * 100) / 100).toFixed(2)} €
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Box */}
              <div className="mt-8 flex justify-end px-8" style={{ pageBreakInside: 'avoid' }}>
                <div className="w-80 bg-slate-50 rounded-xl overflow-hidden border" style={{ borderColor: profile?.brand_hex_color || '#e2e8f0' }}>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Total HT:</span>
                      <span className="font-bold text-slate-800">{Number(totalHt).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">TVA ({Number(tva).toFixed(2)}%):</span>
                      <span className="font-semibold text-slate-600">{Number(montantTva).toFixed(2)} €</span>
                    </div>
                  </div>
                  <div className="text-white p-6 flex justify-between items-center shadow-inner" style={{ backgroundColor: profile?.brand_hex_color || '#1e293b' }}>
                    <span className="font-bold text-sm tracking-widest uppercase text-white/90">Total TTC:</span>
                    <span className="font-bold text-xl text-white">{Number(totalTtc).toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Conditions Generales */}
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl mt-12 mx-8 text-xs text-slate-500 space-y-2" style={{ pageBreakInside: 'avoid' }}>
                <p className="font-bold text-slate-700 mb-4 text-sm uppercase">Conditions Générales</p>
                <p>- Devis valable 30 jours à compter de la date d'émission.</p>
                <p>- Acompte de 30% à la commande, solde à la livraison.</p>
                <p>- Délais indicatifs sous réserve de conditions météo.</p>
                <p>- Toute modification entraînera un avenant.</p>
                <p>- TVA à taux intermédiaire (Art. 279-0 bis du CGI). Travaux dans logement achevé depuis plus de 2 ans.</p>
                <p>- Assurance décennale: {profile?.siret ? `ABAM ${profile.siret}` : "Non spécifiée"}</p>
              </div>

              {/* Signatures */}
              <div className="flex justify-between mt-16 px-12 pb-12 relative" style={{ pageBreakInside: 'avoid' }}>
                <div className="text-sm">
                  <p className="font-bold text-slate-800 mb-16">Bon pour accord</p>
                  <p className="text-slate-400 border-t border-slate-200 pt-3 w-56">Date et signature du client</p>
                </div>
                <div className="text-sm text-right">
                  <p className="font-bold mb-16" style={{ color: profile?.brand_hex_color || '#1e293b' }}>Pour {profile?.company_name || "l'entreprise"}</p>
                  <p className="text-slate-400 border-t border-slate-200 pt-3 w-56 text-right float-right">Date et signature</p>
                </div>

                {/* Footer Disclaimer (Absolute Bottom of Signature block) */}
                <div className="absolute bottom-[-1.5cm] left-0 right-0 w-full text-center text-xs text-gray-400">
                  Document généré par BuildMetrics - https://buildmetrics.com
                </div>
              </div>
            </div>

            <div className="overflow-x-auto print:hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Désignation</th>
                    <th className="px-4 py-3 font-medium w-28">Quantité</th>
                    <th className="px-4 py-3 font-medium w-20">Unité</th>
                    <th className="px-4 py-3 font-medium w-36">PU HT (€)</th>
                    <th className="px-4 py-3 font-medium w-32 text-right">Montant HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {lots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Aucun lot extrait. Vérifiez les notes et le plan.
                      </td>
                    </tr>
                  ) : (
                    lots.map((lot) => {
                      const montant = (lot.quantite || 0) * (lot.prix_unitaire_ht || 0);
                      return (
                        <tr key={lot.id} className="group hover:bg-secondary/20 transition-colors print:break-inside-avoid">
                          <td className="px-4 py-2.5 text-anthracite font-medium">
                            {lot.designation}
                          </td>
                          <td className="px-4 py-2.5">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={lot.quantite === 0 ? "" : lot.quantite}
                              onChange={(e) => updateLot(lot.id, "quantite", parseFloat(e.target.value) || 0)}
                              className="h-8 w-full bg-white px-2 focus:ring-1 focus:ring-steel/50"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {lot.unite}
                          </td>
                          <td className="px-4 py-2.5">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={lot.prix_unitaire_ht === 0 ? "" : lot.prix_unitaire_ht}
                              onChange={(e) => updateLot(lot.id, "prix_unitaire_ht", parseFloat(e.target.value) || 0)}
                              className="h-8 w-full bg-white px-2 focus:ring-1 focus:ring-steel/50"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-anthracite">
                            {montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="bg-secondary/30 p-4 sm:p-6 border-t border-border/60 print:hidden">
              <div className="flex flex-col sm:flex-row justify-between gap-6">
                <div className="space-y-4 max-w-sm">
                  <div className="bg-white p-4 rounded-lg border border-border/50 shadow-sm">
                    <p className="text-sm text-anthracite font-medium mb-1">Score de Confiance IA</p>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden mb-2 mt-2">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          analysisResult.ai_confidence_score >= 80
                            ? "bg-emerald-500"
                            : analysisResult.ai_confidence_score >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${analysisResult.ai_confidence_score}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ce devis est une <span className="font-semibold text-anthracite">estimation IA</span>. Vérifiez et ajustez les quantités et les prix unitaires avant de l&apos;envoyer au client.
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-64 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Sous-total HT</span>
                    <span className="font-medium text-anthracite">{totalHt.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">TVA ({tva}%)</span>
                    <span className="font-medium text-anthracite">{montantTva.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                  <div className="pt-3 border-t border-border/60 flex justify-between items-center">
                    <span className="font-semibold text-anthracite text-base">Total TTC</span>
                    <span className="font-bold text-steel text-lg">{totalTtc.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border/40 print:hidden">
                <Button 
                  onClick={handleExportExcel}
                  variant="outline"
                  disabled={!profile?.is_pro && !isAdmin}
                  className="border-steel text-steel hover:bg-steel/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {!profile?.is_pro && !isAdmin && <span className="mr-2 opacity-50">🔒</span>}
                  Exporter en Excel
                </Button>
                <Button 
                  onClick={handlePrint}
                  className="bg-anthracite hover:bg-black text-white cursor-pointer shadow-sm"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Exporter en PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Modale Intelligente de Limite de Quotas IA ── */}
      <Dialog open={!!quotaModal} onOpenChange={(v) => !v && setQuotaModal(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-border/50 shadow-2xl">
           <div className="bg-red-50 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 relative z-10 shadow-inner">
               <span className="text-3xl text-red-500">
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               </span>
             </div>
             <DialogTitle className="text-2xl text-anthracite font-bold tracking-tight relative z-10">Limite d'analyse atteinte</DialogTitle>
           </div>
           <div className="p-6 space-y-4 bg-white">
             {quotaModal === "decouverte" && (
               <p className="text-muted-foreground text-center text-base leading-relaxed font-medium">
                 Vous avez épuisé vos 3 devis gratuits de découverte. Pour continuer à générer des estimations automatiquement par Intelligence Artificielle, veuillez choisir une offre premium.
               </p>
             )}
             {quotaModal === "artisan" && (
               <p className="text-muted-foreground text-center text-base leading-relaxed font-medium">
                 Vous avez atteint votre quota mensuel de 15 devis assistés par IA. Passez au plan supérieur pour bénéficier d'une plus large volumétrie (100 devis/mois) ou patientez jusqu'à la réinitialisation de votre cycle.
               </p>
             )}
             {quotaModal === "pro" && (
               <p className="text-muted-foreground text-center text-base leading-relaxed font-medium">
                 Vous avez consommé l'intégralité de vos 100 devis IA mensuels. Bonne nouvelle : vous pouvez continuer à créer des <strong className="text-anthracite">devis 100% manuellement sans aucune limite</strong>, ou patienter jusqu'à la réinitialisation de votre cycle !
               </p>
             )}
             <div className="mt-6 flex flex-col w-full gap-3">
               {(quotaModal === "decouverte" || quotaModal === "artisan") && (
                 <a href="/#pricing" className="w-full inline-block text-white" onClick={() => setQuotaModal(null)}>
                   <Button className="w-full bg-steel hover:bg-steel-dark text-white font-semibold py-6 shadow-md transition-all duration-300">
                     Découvrir les offres supérieures
                   </Button>
                 </a>
               )}
               {quotaModal === "pro" && (
                 <Button onClick={() => { setQuotaModal(null); handleCreateManual(); }} className="w-full bg-steel hover:bg-steel-dark text-white font-semibold py-6 shadow-md transition-all duration-300">
                     Créer un devis manuellement
                 </Button>
               )}
               <Button variant="ghost" onClick={() => setQuotaModal(null)} className="w-full text-muted-foreground">
                 Fermer
               </Button>
             </div>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
