"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProjectById, saveQuoteToProject } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Printer, Save, Download, Loader2 } from "lucide-react";
import * as xlsx from "xlsx";

interface LotItem {
  id: string;
  designation: string;
  quantite: number;
  unite: string;
  prix_unitaire_ht: number;
}

export default function EditProjectPage(props: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [lots, setLots] = useState<LotItem[]>([]);
  const [tva, setTva] = useState<number>(20);
  const [clientName, setClientName] = useState("");
  const [city, setCity] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isManual, setIsManual] = useState(false);

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await Promise.resolve(props.params);
      const id = resolvedParams.id;
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userProfile } = await supabase.from("users").select("*").eq("id", user.id).single();
        setProfile(userProfile);
      }
      
      const res = await getProjectById(id);
      if (res.data) {
        setProject(res.data);
        const parsedLots = typeof res.data.results === 'string' ? JSON.parse(res.data.results || "[]") : res.data.results;
        setLots(parsedLots || []);
        setTva(typeof res.data.tva === 'number' ? res.data.tva : parseFloat(res.data.tva || '20'));
        setClientName(res.data.client_name || "");
        setCity(res.data.city || "");
        setProjectName(res.data.project_name || "");
        setIsManual(res.data.file_url === "manual");
      }
      setLoading(false);
    }
    loadData();
  }, [props.params]);

  const handleQuantityChange = (id: string, newQuantity: number) => {
    setLots(lots.map(lot => lot.id === id ? { ...lot, quantite: newQuantity } : lot));
  };

  const handlePriceChange = (id: string, newPrice: number) => {
    setLots(lots.map(lot => lot.id === id ? { ...lot, prix_unitaire_ht: newPrice } : lot));
  };

  const handleDeleteLine = (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette ligne du devis ?")) {
      setLots(lots.filter(lot => lot.id !== id));
    }
  };

  const handleAddLine = () => {
    const newLot = {
      id: crypto.randomUUID(),
      designation: "Nouvelle ligne de travaux...",
      quantite: 1,
      unite: "U",
      prix_unitaire_ht: 0
    };
    setLots([...lots, newLot]);
  };

  const handleSave = async () => {
    setSaving(true);
    const resolvedParams = await Promise.resolve(props.params);
    const res = await saveQuoteToProject(
      resolvedParams.id, 
      lots, 
      tva,
      { client_name: clientName, city, project_name: projectName }
    );
    setSaving(false);
    if (res && res.error) {
      alert("Erreur lors de la sauvegarde : " + res.error);
    } else {
      alert("Devis mis à jour avec succès !");
    }
  };

  const handleExportExcel = () => {
    if (!lots.length) return;
    const worksheetData = lots.map((lot) => ({
      Désignation: lot.designation,
      Quantité: lot.quantite,
      Unité: lot.unite,
      "PU HT": lot.prix_unitaire_ht,
      "Montant HT": lot.quantite * lot.prix_unitaire_ht,
    }));
    
    // Add Totals
    const totalHt = lots.reduce((acc, lot) => acc + lot.quantite * lot.prix_unitaire_ht, 0);
    const montantTva = totalHt * (tva / 100);
    const totalTtc = totalHt + montantTva;
    
    worksheetData.push({ Désignation: "", Quantité: 0, Unité: "", "PU HT": 0, "Montant HT": 0 });
    worksheetData.push({ Désignation: "Total HT", Quantité: 0, Unité: "", "PU HT": 0, "Montant HT": totalHt });
    worksheetData.push({ Désignation: `TVA (${tva}%)`, Quantité: 0, Unité: "", "PU HT": 0, "Montant HT": montantTva });
    worksheetData.push({ Désignation: "Total TTC", Quantité: 0, Unité: "", "PU HT": 0, "Montant HT": totalTtc });

    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Devis");
    xlsx.writeFile(workbook, `Devis-${project?.project_name || "BuildMetrics"}.xlsx`);
  };

  if (loading) {
    return <div className="h-full w-full flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary size-10" /></div>;
  }

  if (!project) {
    return <div className="p-10 text-center text-muted-foreground">Devis introuvable.</div>;
  }

  const totalHtRaw = lots.reduce((acc, lot) => acc + (lot.quantite || 0) * (lot.prix_unitaire_ht || 0), 0);
  
  // Math Rounding strict (2 décimales)
  const totalHt = Math.round(totalHtRaw * 100) / 100;
  const montantTva = Math.round((totalHt * (tva / 100)) * 100) / 100;
  const totalTtc = Math.round((totalHt + montantTva) * 100) / 100;

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

    const year = new Date(project.created_at).getFullYear();
    const idFragment = project.id.slice(0, 4);
    const safeClientName = clientName ? slugify(clientName) : "Client";
    const dynamicTitle = `Devis_${year}_${idFragment}_${safeClientName}`;
    
    // Use dynamic title to format the downloaded PDF default filename
    document.title = dynamicTitle;
    window.history.replaceState({}, '', '/devis');
    
    window.print();
    
    // Restore original state
    document.title = originalTitle;
    window.history.replaceState({}, '', originalPath);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
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
            <p className="text-white/80 text-sm">N° DEV-{new Date(project.created_at).getFullYear()}-{project.id.slice(0,4)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/90 text-sm font-medium">{new Date(project.created_at).toLocaleDateString("fr-FR")}</p>
            <p className="text-white/60 text-xs mt-1">Valide 30 jours</p>
          </div>
        </div>

        {/* Cards Emetteur / Destinataire */}
        <div className="grid grid-cols-2 gap-8 mt-8 px-8">
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl">
            <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Émetteur</p>
            <h2 className="text-xl font-bold mb-2" style={{ color: profile?.brand_hex_color || '#1e293b' }}>
              {profile?.company_name || profile?.last_name || "Architecte / Artisan"}
            </h2>
            <div className="text-sm text-slate-600 space-y-1">
              {profile?.first_name || profile?.last_name ? <p>{profile.first_name} {profile.last_name}</p> : null}
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
                  const montant = Math.round((lot.quantite || 0) * (lot.prix_unitaire_ht || 0) * 100) / 100;
                  return (
                    <tr key={lot.id} className="odd:bg-white even:bg-slate-50 border-b last:border-0" style={{ pageBreakInside: 'avoid', borderColor: profile?.brand_hex_color ? `${profile.brand_hex_color}20` : '#f1f5f9' }}>
                      <td className="px-6 py-4 font-medium text-slate-800">{lot.designation}</td>
                      <td className="px-6 py-4 text-slate-600">{Number(lot.quantite).toFixed(2)}</td>
                      <td className="px-6 py-4 text-slate-500">{lot.unite}</td>
                      <td className="px-6 py-4 text-slate-600 text-right">{Number(lot.prix_unitaire_ht).toFixed(2)} €</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-800">
                        {montant.toFixed(2)} €
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
                <span className="font-bold text-slate-800">{totalHt.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">TVA ({Number(tva).toFixed(2)}%):</span>
                <span className="font-semibold text-slate-600">{montantTva.toFixed(2)} €</span>
              </div>
            </div>
            <div className="text-white p-6 flex justify-between items-center shadow-inner" style={{ backgroundColor: profile?.brand_hex_color || '#1e293b' }}>
              <span className="font-bold text-sm tracking-widest uppercase text-white/90">Total TTC:</span>
              <span className="font-bold text-xl text-white">{totalTtc.toFixed(2)} €</span>
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

      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" onClick={() => router.push("/dashboard/projects")} className="pl-0 text-muted-foreground hover:text-foreground self-start">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Retour aux projets
        </Button>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button onClick={handleSave} variant="outline" className="gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </Button>
          {profile?.plan_tier === 'pro' && (
            <Button onClick={handleExportExcel} variant="outline" className="gap-2 bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
              <Download className="w-4 h-4" />
              Excel
            </Button>
          )}
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            PDF Pro
          </Button>
        </div>
      </div>

      <div className="mb-4 sm:mb-6 bg-white border border-border/40 rounded-xl p-4 sm:p-6 shadow-sm print:hidden">
        <h1 className="text-lg sm:text-2xl font-bold text-anthracite mb-1 sm:mb-2">{projectName || "Devis sans nom"}</h1>
        <p className="text-sm text-muted-foreground">Client: {clientName || "Non spécifié"} • Lieu: {city || "Non spécifié"}</p>
      </div>

      {/* Editable Client Info Card */}
      <div className="mb-4 sm:mb-6 bg-white border border-border/40 rounded-xl p-4 sm:p-6 shadow-sm print:hidden">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <h2 className="text-base font-semibold text-anthracite">Informations Client</h2>
            <span className="text-xs bg-steel/10 text-steel px-2 py-0.5 rounded-full font-medium ml-auto">Modifiable</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-client" className="text-xs text-muted-foreground">Nom du client</Label>
              <Input 
                id="edit-client" 
                value={clientName} 
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Cabinet Dupont"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-city" className="text-xs text-muted-foreground">Ville</Label>
              <Input 
                id="edit-city" 
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Paris"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-project" className="text-xs text-muted-foreground">Nom du projet</Label>
              <Input 
                id="edit-project" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: Rénovation immeuble"
                className="h-9"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Ces informations seront sauvegardées et utilisées dans l'export PDF/Excel.
          </p>
        </div>

      <div className="bg-white border border-border/40 shadow-sm rounded-xl overflow-hidden print:hidden">
        {/* Desktop Table — hidden on mobile */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="px-4 py-3 font-medium">Désignation</th>
                <th className="px-4 py-3 font-medium w-32">Quantité</th>
                <th className="px-4 py-3 font-medium w-24">Unité</th>
                <th className="px-4 py-3 font-medium w-32">PU HT (€)</th>
                <th className="px-4 py-3 font-medium w-32 text-right">Montant HT</th>
                <th className="px-4 py-3 font-medium w-12 text-center print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {lots.map((lot) => {
                const montant = (lot.quantite || 0) * (lot.prix_unitaire_ht || 0);
                return (
                  <tr key={lot.id} className="group hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-anthracite">
                      <Input
                        value={lot.designation}
                        onChange={(e) => setLots(lots.map(l => l.id === lot.id ? { ...l, designation: e.target.value } : l))}
                        className="h-8 shadow-none border-transparent focus-visible:border-primary/30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={lot.quantite}
                        onChange={(e) => handleQuantityChange(lot.id, parseFloat(e.target.value) || 0)}
                        className="h-8 shadow-none border-border/50 focus-visible:border-primary/30"
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lot.unite}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={lot.prix_unitaire_ht}
                        onChange={(e) => handlePriceChange(lot.id, parseFloat(e.target.value) || 0)}
                        className="h-8 shadow-none border-border/50 focus-visible:border-primary/30"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-steel">
                      {(Math.round(montant * 100)/100).toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-center print:hidden">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteLine(lot.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout — visible only on small screens */}
        <div className="sm:hidden divide-y divide-border/30">
          {lots.map((lot, index) => {
            const montant = (lot.quantite || 0) * (lot.prix_unitaire_ht || 0);
            return (
              <div key={lot.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground shrink-0 pt-2">#{index + 1}</span>
                  <div className="flex-1">
                    <textarea
                      value={lot.designation}
                      onChange={(e) => setLots(lots.map(l => l.id === lot.id ? { ...l, designation: e.target.value } : l))}
                      rows={2}
                      className="w-full text-sm font-medium text-anthracite bg-secondary/30 border border-border/40 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-steel/30 focus:border-steel/40"
                      placeholder="Désignation..."
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteLine(lot.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Qté</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={lot.quantite}
                      onChange={(e) => handleQuantityChange(lot.id, parseFloat(e.target.value) || 0)}
                      className="h-10 text-sm shadow-none border-border/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Unité</label>
                    <div className="h-10 flex items-center text-sm text-muted-foreground bg-secondary/20 border border-border/30 rounded-md px-3">
                      {lot.unite}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">PU HT €</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={lot.prix_unitaire_ht}
                      onChange={(e) => handlePriceChange(lot.id, parseFloat(e.target.value) || 0)}
                      className="h-10 text-sm shadow-none border-border/50"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className="text-sm font-bold text-steel tabular-nums">
                    = {(Math.round(montant * 100)/100).toFixed(2)} €
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border/40 bg-secondary/10 print:hidden">
          <Button onClick={handleAddLine} variant="outline" className="w-full border-dashed border-2 text-steel hover:bg-steel/5 h-10 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ajouter une ligne
          </Button>
        </div>

        {/* Totals Section */}
        <div className="bg-secondary/30 p-4 sm:p-6 border-t border-border/60">
          <div className="flex flex-col sm:flex-row justify-end gap-6">
            <div className="w-full sm:w-72 bg-white rounded-xl overflow-hidden border border-border/40 shadow-sm">
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Sous-total HT</span>
                  <span className="font-semibold text-anthracite">{totalHt.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">TVA 
                    <Input 
                      type="number" 
                      value={tva} 
                      onChange={(e) => setTva(parseFloat(e.target.value) || 0)} 
                      className="w-16 h-7 text-xs px-2 py-1 bg-white border-border/50 text-center" 
                    />%
                  </span>
                  <span className="font-medium text-steel">{montantTva.toFixed(2)} €</span>
                </div>
              </div>
              <div className="bg-anthracite text-white p-4 flex justify-between items-center">
                <span className="font-bold">Total TTC</span>
                <span className="font-bold text-lg">{totalTtc.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
