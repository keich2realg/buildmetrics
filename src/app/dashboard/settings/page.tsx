"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserProfile } from "../actions";
import { updateUserProfile } from "./actions";
export const PRESET_COLORS = [
  { name: "Nuit", hex: "#1e293b", ring: "ring-slate-800" },
  { name: "Profond", hex: "#0f172a", ring: "ring-slate-900" },
  { name: "Océan", hex: "#0369a1", ring: "ring-sky-700" },
  { name: "Forêt", hex: "#166534", ring: "ring-green-800" },
];

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [liveColor, setLiveColor] = useState<string>("#1e293b");
  
  const [profile, setProfile] = useState<{
    email?: string;
    plan_tier?: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    address?: string;
    siret?: string;
    brand_hex_color?: string;
    logo_url?: string;
    customer_portal_url?: string;
    billing_interval?: string;
    subscription_ends_at?: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getUserProfile();
        setProfile(data as any);
        if (data && (data as any).brand_hex_color) setLiveColor((data as any).brand_hex_color);
      } catch (err) {
        console.error("Impossible de charger le profil :", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await updateUserProfile(formData);
    
    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      setFeedback({ type: "success", message: "Profil mis à jour avec succès." });
      
      // Mettre à jour l'état local pour refléter les derniers changements instantanément
      setProfile(prev => prev ? {
        ...prev,
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
        company_name: formData.get("company_name") as string,
        address: formData.get("address") as string,
        siret: formData.get("siret") as string,
        brand_hex_color: formData.get("brand_hex_color") as string,
      } : null);
      
      // Cacher le message de succès après 4 secondes
      setTimeout(() => setFeedback(null), 4000);
    }
    
    setIsSaving(false);
  };

  const handleDeleteLogo = async () => {
    if (!confirm("Voulez-vous vraiment supprimer votre logo ?")) return;
    const { deleteUserLogo } = await import("./actions");
    const res = await deleteUserLogo();
    if (res.success) {
      setProfile(prev => prev ? { ...prev, logo_url: "" } : null);
      setFeedback({ type: "success", message: "Logo supprimé avec succès." });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: "error", message: res.error || "Erreur lors de la suppression." });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-steel" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  const currentPlan = profile?.plan_tier === "pro" ? "Plan Pro" : profile?.plan_tier === "artisan" ? "Plan Artisan" : "Plan Découverte (Gratuit)";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      {/* En-tête de la page */}
      <div>
        <h1 className="text-2xl font-bold text-anthracite tracking-tight mb-1">
          Paramètres du compte
        </h1>
        <p className="text-muted-foreground">
          Gérez vos préférences, votre profil professionnel et vos informations de facturation.
        </p>
      </div>

      {feedback && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 ${
          feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-destructive/30 bg-destructive/5 text-destructive"
        }`}>
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
      )}

      {/* Profil Entreprise */}
      <Card className="border-border/60 shadow-sm">
        <form onSubmit={handleSubmit} key={profile ? (profile.brand_hex_color || 'color') + (profile.company_name || 'name') : 'form'}>
          <CardHeader>
            <CardTitle className="text-lg text-anthracite flex items-center gap-2">
              <svg className="h-5 w-5 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
              Profil Entreprise
            </CardTitle>
            <CardDescription>
              Ces informations remplaceront automatiquement l'en-tête de vos devis PDF exportés.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input id="first_name" name="first_name" defaultValue={profile?.first_name || ""} placeholder="Jean" className="bg-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input id="last_name" name="last_name" defaultValue={profile?.last_name || ""} placeholder="Dupont" className="bg-white" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company_name">Nom de l'entreprise / Cabinet</Label>
                <Input id="company_name" name="company_name" defaultValue={profile?.company_name || ""} placeholder="Architectes & Co" className="bg-white" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Adresse professionnelle</Label>
                <Input id="address" name="address" defaultValue={profile?.address || ""} placeholder="12 rue de Rivoli, 75001 Paris" className="bg-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siret">Numéro SIRET</Label>
                <Input id="siret" name="siret" defaultValue={profile?.siret || ""} placeholder="123 456 789 00012" className="bg-white" />
              </div>
              <div className="space-y-2 sm:col-span-2 pt-4 border-t border-border/40 mt-4">
                <Label className="text-base font-semibold text-anthracite block mb-2">Identité Visuelle</Label>
                {profile?.plan_tier === "decouverte" ? (
                  <div className="bg-secondary/30 border border-border/50 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                    <div className="bg-white px-3 py-2 rounded-full shadow-sm mb-3">
                      <span className="text-xl">🔒</span>
                    </div>
                    <h4 className="font-semibold text-anthracite mb-1">Fonctionnalité Premium</h4>
                    <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                      Passez au plan Artisan ou Pro pour appliquer votre logo et couleur de marque sur vos devis PDF.
                    </p>
                    <a href="/#pricing">
                      <Button type="button" variant="outline" size="sm" className="bg-white border-steel text-steel hover:bg-steel hover:text-white transition-colors cursor-pointer">
                        Découvrir les offres
                      </Button>
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label htmlFor="logo">Logo de l'entreprise (PNG/JPG, 2MB max)</Label>
                       <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                         {profile?.logo_url && (
                           <div className="relative group shrink-0">
                             <div className="h-14 w-14 rounded border border-border/60 bg-white flex items-center justify-center overflow-hidden shadow-sm">
                               <img src={profile.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                             </div>
                             <button 
                               type="button" 
                               onClick={handleDeleteLogo}
                               className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                               title="Supprimer le logo"
                             >
                               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                           </div>
                         )}
                         <Input id="logo" name="logo" type="file" accept="image/png, image/jpeg" className="bg-white flex-1 cursor-pointer h-10" />
                       </div>
                     </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="brand_hex_color">Couleur principale de la marque</Label>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-12 rounded overflow-hidden border border-border shrink-0 shadow-sm cursor-pointer hover:border-steel transition-colors">
                            <Input 
                              id="brand_hex_color" 
                              name="brand_hex_color" 
                              type="color" 
                              value={liveColor}
                              onChange={(e) => setLiveColor(e.target.value)}
                              className="absolute -inset-2 h-16 w-16 opacity-0 cursor-pointer" 
                            />
                            <div 
                              className="w-full h-full pointer-events-none" 
                              style={{ backgroundColor: liveColor }}
                            />
                          </div>
                          <span className="text-sm font-mono text-muted-foreground">{liveColor.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="pt-1">
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 block font-semibold">Palettes Recommandées :</Label>
                        <div className="flex items-center gap-3">
                          {PRESET_COLORS.map(color => (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => setLiveColor(color.hex)}
                              className={`w-7 h-7 rounded-full shadow-sm transition-transform hover:scale-110 focus:outline-none ${liveColor === color.hex ? 'ring-2 ring-offset-2 ' + color.ring : 'ring-1 ring-border/50 hover:ring-border'}`}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/40 px-6 py-4 flex justify-end bg-secondary/10">
            <Button type="submit" disabled={isSaving} className="bg-steel hover:bg-steel-dark text-white min-w-[200px] cursor-pointer shadow-sm">
              {isSaving ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enregistrement...
                </>
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Abonnement Lemon Squeezy */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-anthracite flex items-center gap-2">
            <svg className="h-5 w-5 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
            Mon Abonnement
          </CardTitle>
          <CardDescription>
            Consultez votre plan actif ou gérez votre souscription (Changement de plan, annulation, téléchargement des factures).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg bg-secondary/30 border border-border/40">
            <div>
              <p className="text-sm font-medium text-anthracite">Forfait Actuel</p>
              <p className="text-xl font-bold text-steel mt-1 flex items-center gap-2">
                {currentPlan}
                {profile?.plan_tier && profile.plan_tier !== "decouverte" && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">
                    Actif
                  </span>
                )}
              </p>
              {profile?.plan_tier && profile.plan_tier !== "decouverte" && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Facturation : {profile.billing_interval === 'yearly' ? 'Annuelle' : 'Mensuelle'}
                  </p>
                  {profile.subscription_ends_at ? (
                    <p className="text-xs font-medium text-steel">
                      {(() => {
                        const endDate = new Date(profile.subscription_ends_at);
                        const formattedDate = endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                        // If badge says 'Annulé', show access end date; otherwise show renewal date
                        return profile.subscription_ends_at && endDate > new Date()
                          ? `Prochain renouvellement : ${formattedDate}`
                          : `Expiré le ${formattedDate}`;
                      })()}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
            {profile?.plan_tier !== "decouverte" && profile?.customer_portal_url ? (
              <a href={profile.customer_portal_url} target="_blank" rel="noreferrer">
                <Button variant="outline" className="border-steel text-steel hover:bg-steel/10 whitespace-nowrap shadow-sm">
                  Gérer mon abonnement
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </Button>
              </a>
            ) : (
              <a href="/#pricing">
                <Button className="bg-steel hover:bg-steel-dark text-white whitespace-nowrap shadow-sm">
                  Voir les forfaits (S'abonner)
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
