import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Pricing } from "@/components/pricing";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const storeUrl = process.env.LEMON_SQUEEZY_STORE_URL || "https://store.lemonsqueezy.com/buy";
  
  // Paramètre d'identification infaillible pour le Webhook Lemon Squeezy
  const customParams = user?.id ? `?checkout[custom][user_id]=${user.id}` : "";

  const urls = {
    artisanMonthly: `${storeUrl}/${process.env.LEMON_SQUEEZY_LINK_ARTISAN || ""}${customParams}`,
    artisanAnnual: `${storeUrl}/${process.env.LEMON_SQUEEZY_LINK_ARTISAN_ANNUAL || ""}${customParams}`,
    proMonthly: `${storeUrl}/${process.env.LEMON_SQUEEZY_LINK_PRO || ""}${customParams}`,
    proAnnual: `${storeUrl}/${process.env.LEMON_SQUEEZY_LINK_PRO_ANNUAL || ""}${customParams}`
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-white/80 backdrop-blur-lg">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-steel text-white font-bold text-sm">
              BM
            </div>
            <span className="text-xl font-semibold tracking-tight text-anthracite">
              BuildMetrics
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-anthracite transition-colors">
              Fonctionnalités
            </a>
            <a href="#pricing" className="hover:text-anthracite transition-colors">
              Tarifs
            </a>
          </div>
          <Link href="/dashboard">
            <Button
              className="bg-steel hover:bg-steel-dark text-white shadow-sm cursor-pointer"
              size="sm"
            >
              Accéder au Dashboard
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#4A7C9B 1px, transparent 1px), linear-gradient(90deg, #4A7C9B 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute top-20 -left-32 w-96 h-96 bg-steel/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-32 w-96 h-96 bg-steel-light/10 rounded-full blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-steel/20 bg-steel/5 px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-steel-dark mb-6 sm:mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-steel opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-steel" />
            </span>
            Propulsé par l&apos;IA
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-anthracite leading-[1.1] mb-4 sm:mb-6">
            Chiffrez vos plans
            <br />
            architecturaux en{" "}
            <span className="text-steel relative">
              15&nbsp;secondes
              <svg
                className="absolute -bottom-1 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 8C50 2 150 2 298 8"
                  stroke="#4A7C9B"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.3"
                />
              </svg>
            </span>
            <br />
            avec l&apos;IA
          </h1>

          <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed mb-10">
            Uploadez vos plans, sélectionnez les matériaux dominants, et
            obtenez&nbsp;un devis détaillé automatiquement. BuildMetrics
            transforme vos PDF et images en estimations précises.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="bg-steel hover:bg-steel-dark text-white px-8 py-6 text-base shadow-lg shadow-steel/20 hover:shadow-xl hover:shadow-steel/30 transition-all duration-300 cursor-pointer"
              >
                Commencer l&apos;analyse gratuitement
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
              </Button>
            </Link>
            <a href="https://youtu.be/jeMhloRC3Hk?si=Mq4kjAg4R7oTF0j0" target="_blank" rel="noreferrer">
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-6 text-base border-steel/30 text-steel hover:bg-steel/5 cursor-pointer group"
              >
                <svg className="mr-2 h-5 w-5 text-steel group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Voir la démo
              </Button>
            </a>
            <a href="#features">
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-6 text-base border-border text-anthracite hover:bg-secondary cursor-pointer"
              >
                Découvrir les fonctionnalités
              </Button>
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Sans engagement
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Essai gratuit
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Résultats en 15s
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border/60 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-anthracite tracking-tight mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Des outils puissants pour simplifier votre quotidien de professionnel du bâtiment.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-secondary/30 border border-border/40 rounded-xl p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-steel/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-anthracite mb-2">Analyse IA en 15s</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Uploadez un plan PDF ou image, notre IA extrait automatiquement les lots de travaux et estime les coûts.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="bg-secondary/30 border border-border/40 rounded-xl p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-steel/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-anthracite mb-2">Export PDF Pro</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Générez des devis PDF professionnels personnalisés avec votre logo, vos couleurs et vos conditions.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="bg-secondary/30 border border-border/40 rounded-xl p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-steel/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-anthracite mb-2">Gestion Matériaux</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Configurez votre propre base de prix de matériaux pour des estimations ultra-précises adaptées à votre région.
              </p>
            </div>
            {/* Feature 4 */}
            <div className="bg-secondary/30 border border-border/40 rounded-xl p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-steel/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-steel" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </div>
              <h3 className="font-semibold text-anthracite mb-2">Devis 100% Manuel</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Créez des devis à la main sans passer par l'IA. Illimité et inclus dans le plan Pro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing">
        <Pricing urls={urls} isLoggedIn={!!user} />
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-steel text-white font-bold text-xs">
              BM
            </div>
            <span className="text-sm font-medium text-anthracite">
              BuildMetrics
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 BuildMetrics. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
