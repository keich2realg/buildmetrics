"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { syncUserProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Profile fields (signup only)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [siret, setSiret] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const resetForm = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else {
        // Signup with profile metadata
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              company_name: companyName,
              address,
              siret,
            },
          },
        });
        if (error) throw error;

        // Also update the users table via a Secure Server Action bypassing anonymous RLS
        if (data.user) {
          await syncUserProfile({
            id: data.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
            company_name: companyName,
            address: address,
            siret: siret,
          });
        }

        setSuccess(
          "Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription, ou connectez-vous directement."
        );
        setMode("login");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fb] px-4 py-10">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-steel text-white font-bold text-sm">
          BM
        </div>
        <span className="text-2xl font-semibold tracking-tight text-anthracite">
          BuildMetrics
        </span>
      </Link>

      <Card className="w-full max-w-lg border-border/60 shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl text-anthracite">
            {mode === "login" ? "Connexion" : "Créer un compte"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Connectez-vous pour accéder à votre tableau de bord"
              : "Renseignez vos informations pour créer votre profil architecte"}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-steel/30 bg-steel/5 px-4 py-3 text-sm text-steel-dark">
                {success}
              </div>
            )}

            {/* ── Profile fields (signup only) ── */}
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      placeholder="Jean"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      placeholder="Dupont"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
                  <Input
                    id="companyName"
                    placeholder="Cabinet d'architecture Dupont & Associés"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adresse complète</Label>
                  <Input
                    id="address"
                    placeholder="12 rue de Rivoli, 75001 Paris"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siret">
                    SIRET{" "}
                    <span className="text-muted-foreground font-normal">
                      (14 chiffres)
                    </span>
                  </Label>
                  <Input
                    id="siret"
                    placeholder="123 456 789 00012"
                    value={siret}
                    onChange={(e) => setSiret(e.target.value)}
                    required
                    disabled={loading}
                    maxLength={17}
                    pattern="[\d\s]{14,17}"
                    title="Le SIRET doit contenir 14 chiffres"
                  />
                </div>

                <div className="border-t border-border/60 pt-4 mt-2" />
              </>
            )}

            {/* ── Auth fields ── */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@cabinet.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                className="h-11"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-steel hover:bg-steel-dark text-white cursor-pointer"
            >
              {loading ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Chargement…
                </>
              ) : mode === "login" ? (
                "Se connecter"
              ) : (
                "Créer mon compte"
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              {mode === "login" ? (
                <>
                  Pas encore de compte ?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      resetForm();
                    }}
                    className="text-steel font-medium hover:underline cursor-pointer"
                  >
                    Inscrivez-vous
                  </button>
                </>
              ) : (
                <>
                  Déjà un compte ?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      resetForm();
                    }}
                    className="text-steel font-medium hover:underline cursor-pointer"
                  >
                    Connectez-vous
                  </button>
                </>
              )}
            </p>
          </CardFooter>
        </form>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        © 2026 BuildMetrics. Tous droits réservés.
      </p>
    </div>
  );
}
