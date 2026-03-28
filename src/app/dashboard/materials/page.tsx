"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getMaterials, addMaterial, updateMaterial, deleteMaterial, CustomMaterial } from "./actions";
import { getUserProfile } from "../actions";

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<CustomMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<CustomMaterial | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  async function loadMaterials() {
    setIsLoading(true);
    const profile: any = await getUserProfile();
    if (profile && profile.plan_tier !== 'pro' && !profile.is_beta && profile.email !== 'cheick9892@gmail.com') {
      window.location.href = '/dashboard';
      return;
    }
    const { data } = await getMaterials();
    if (data) setMaterials(data);
    setIsLoading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    if (editingMaterial) {
      await updateMaterial(editingMaterial.id, formData);
    } else {
      await addMaterial(formData);
    }
    
    await loadMaterials();
    setIsSaving(false);
    setIsDialogOpen(false);
    setEditingMaterial(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Voulez-vous vraiment supprimer ce matériau ?")) return;
    await deleteMaterial(id);
    await loadMaterials();
  }

  function openNewDialog() {
    setEditingMaterial(null);
    setIsDialogOpen(true);
  }

  function openEditDialog(material: CustomMaterial) {
    setEditingMaterial(material);
    setIsDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-anthracite tracking-tight mb-1">
            Bibliothèque de Matériaux
          </h1>
          <p className="text-muted-foreground">
            Enregistrez vos propres fournitures. L'IA les utilisera en priorité lors du chiffrage de vos plans.
          </p>
        </div>
        <Button onClick={openNewDialog} className="bg-steel hover:bg-steel-dark text-white shadow-sm cursor-pointer whitespace-nowrap">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nouveau matériau
        </Button>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead className="font-semibold text-anthracite">Désignation</TableHead>
                <TableHead className="font-semibold text-anthracite">Unité</TableHead>
                <TableHead className="font-semibold text-anthracite text-right">Prix HT (€)</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <svg className="mx-auto h-8 w-8 animate-spin text-steel opacity-80" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </TableCell>
                </TableRow>
              ) : materials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center bg-secondary/10">
                    <svg className="mx-auto h-12 w-12 text-steel/40 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
                    </svg>
                    <p className="text-muted-foreground">Aucun matériau personnalisé enregistré.</p>
                  </TableCell>
                </TableRow>
              ) : (
                materials.map((mat) => (
                  <TableRow key={mat.id} className="hover:bg-secondary/30 transition-colors">
                    <TableCell className="font-medium text-anthracite py-4">{mat.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-secondary/60 px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border/50">
                        {mat.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-steel">{mat.default_price.toFixed(2)} €</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEditDialog(mat)} className="p-2 text-muted-foreground hover:text-steel transition-colors rounded-md hover:bg-secondary cursor-pointer">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(mat.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10 cursor-pointer">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-xl text-anthracite">{editingMaterial ? "Modifier le matériau" : "Nouvau matériau"}</DialogTitle>
              <DialogDescription>
                Créez une correspondance stricte que l'IA privilégiera dans ses extractions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-6">
              <div className="space-y-2">
                <Label htmlFor="name">Désignation complète de l'ouvrage</Label>
                <Input id="name" name="name" defaultValue={editingMaterial?.name} placeholder="Ex: Revêtement peinture acrylique satinée" required className="border-border/60" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unité de facturation</Label>
                  <Input id="unit" name="unit" defaultValue={editingMaterial?.unit} placeholder="Ex: m2, Ens, forfait, pce" required className="border-border/60" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_price">Prix unitaire HT (€)</Label>
                  <Input id="default_price" name="default_price" type="number" step="0.01" defaultValue={editingMaterial?.default_price} placeholder="0.00" required className="border-border/60 text-right" />
                </div>
              </div>
            </div>
            <DialogFooter className="bg-secondary/20 -mx-6 -mb-6 px-6 py-4 border-t border-border/40 mt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving} className="cursor-pointer">Annuler</Button>
              <Button type="submit" className="bg-steel hover:bg-steel-dark text-white cursor-pointer" disabled={isSaving}>
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
