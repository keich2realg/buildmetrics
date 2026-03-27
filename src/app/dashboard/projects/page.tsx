"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProjects, deleteProject } from "./actions";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoading(true);
    const { data } = await getProjects();
    if (data) {
      setProjects(data);
    }
    setIsLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Voulez-vous vraiment supprimer ce devis ?")) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    const res = await deleteProject(id);
    if (res && res.error) {
      alert("Erreur de suppression: " + res.error);
      loadProjects();
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-anthracite tracking-tight mb-1">
            Projets & Devis
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            L&apos;historique complet de vos chiffrages.
          </p>
        </div>
      </div>

      {/* Desktop Table — hidden on mobile */}
      <Card className="border-border/60 shadow-sm overflow-hidden bg-white hidden sm:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead className="font-semibold text-anthracite">Date</TableHead>
                <TableHead className="font-semibold text-anthracite">Projet</TableHead>
                <TableHead className="font-semibold text-anthracite">Client</TableHead>
                <TableHead className="font-semibold text-anthracite text-right">Lignes</TableHead>
                <TableHead className="font-semibold text-anthracite text-right">Montant HT</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <svg className="mx-auto h-8 w-8 animate-spin text-steel opacity-80" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center bg-secondary/10">
                    <svg className="mx-auto h-12 w-12 text-steel/40 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <p className="text-muted-foreground">Aucun devis enregistré pour le moment.</p>
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((proj) => {
                  const rawResults = typeof proj.results === 'string' ? JSON.parse(proj.results || "[]") : proj.results;
                  const hasResults = rawResults && Array.isArray(rawResults);
                  const legacyTotalHT = hasResults ? rawResults.reduce((acc: number, lot: any) => acc + ((lot.quantite || 0) * (lot.prix_unitaire_ht || 0)), 0) : 0;
                  const displayTotal = Number(proj.total_ht || legacyTotalHT);
                  const displayLines = proj.line_count || (hasResults ? rawResults.length : 0);
                                  
                  return (
                    <TableRow key={proj.id} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="text-muted-foreground">
                        {new Date(proj.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="font-semibold text-anthracite py-4">
                        {proj.project_name || "Sans nom"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{proj.client_name || "Non spécifié"}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {displayLines}
                      </TableCell>
                      <TableCell className="text-right font-bold text-steel tabular-nums">
                        {displayTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Link href={`/dashboard/projects/${proj.id}`}>
                            <button className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10 cursor-pointer" title="Ouvrir et modifier le devis">
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                          <button onClick={() => handleDelete(proj.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10 cursor-pointer" title="Supprimer le devis">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Mobile Card Layout — visible only on small screens */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <svg className="h-8 w-8 animate-spin text-steel opacity-80" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center bg-secondary/10 rounded-xl border border-border/40">
            <svg className="mx-auto h-10 w-10 text-steel/40 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="text-muted-foreground text-sm">Aucun devis enregistré.</p>
          </div>
        ) : (
          projects.map((proj) => {
            const rawResults = typeof proj.results === 'string' ? JSON.parse(proj.results || "[]") : proj.results;
            const hasResults = rawResults && Array.isArray(rawResults);
            const legacyTotalHT = hasResults ? rawResults.reduce((acc: number, lot: any) => acc + ((lot.quantite || 0) * (lot.prix_unitaire_ht || 0)), 0) : 0;
            const displayTotal = Number(proj.total_ht || legacyTotalHT);
            const displayLines = proj.line_count || (hasResults ? rawResults.length : 0);

            return (
              <div key={proj.id} className="bg-white rounded-xl border border-border/50 shadow-sm p-4 active:bg-secondary/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-anthracite text-sm truncate">
                      {proj.project_name || "Sans nom"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {proj.client_name || "Non spécifié"} • {new Date(proj.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-steel tabular-nums whitespace-nowrap">
                    {displayTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">{displayLines} ligne{displayLines !== 1 ? 's' : ''}</span>
                  <div className="flex items-center gap-1">
                    <Link href={`/dashboard/projects/${proj.id}`}>
                      <button className="p-2.5 text-steel hover:bg-steel/10 transition-colors rounded-lg cursor-pointer" title="Ouvrir">
                        <Eye className="h-4.5 w-4.5" />
                      </button>
                    </Link>
                    <button onClick={() => handleDelete(proj.id)} className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-lg cursor-pointer" title="Supprimer">
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
