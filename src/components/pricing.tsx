"use client";

import { useState } from "react";
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

export function Pricing({ urls, isLoggedIn }: { urls?: any, isLoggedIn?: boolean }) {
  const [isAnnual, setIsAnnual] = useState(false);

  const pricingPlans = [
    {
      name: "Gratuit",
      subtitle: "Découverte / Bêta",
      priceMonthly: 0,
      priceAnnualLabel: "0",
      features: [
        "3 devis offerts à vie",
        "Export PDF standard",
        "Prix des matériaux estimés par l'IA",
        "Support par email",
      ],
      cta: "Créer un compte",
      popular: false,
      theme: "gris"
    },
    {
      name: "Artisan",
      subtitle: "Le plan pour les indépendants",
      priceMonthly: 49,
      priceAnnualLabel: "40,83",
      savings: "98",
      features: [
        "15 devis par mois (180/an en annuel)",
        "Export PDF standard personnalisé (Logo + Couleur)",
        "Prix des matériaux estimés par l'IA",
        "Support prioritaire",
      ],
      cta: "Passer à Artisan",
      popular: false,
      theme: "noir"
    },
    {
      name: "Pro",
      subtitle: "Le plan pour les PME",
      priceMonthly: 149,
      priceAnnualLabel: "124,17",
      savings: "298",
      features: [
        "100 devis par mois (1 200/an en annuel)",
        "Création de devis 100% manuelle",
        "Export PDF standard personnalisé (Logo + Couleur)",
        "Export Excel des données",
        "Gérer votre propre base de prix des matériaux",
        "Support dédié",
      ],
      cta: "Démarrer avec Pro",
      popular: true,
      theme: "vert"
    },
  ];

  return (
    <section id="pricing" className="bg-secondary/50 border-t border-border/60">
      <div className="mx-auto max-w-5xl px-6 py-24">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-anthracite tracking-tight mb-4">
            Grille Tarifaire BuildMetrics
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Choisissez le plan adapté à votre activité. Évoluez à tout moment.
          </p>
          
          {/* Toggle Annuel/Mensuel */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${!isAnnual ? "text-anthracite" : "text-muted-foreground"}`}>
              Paiement mensuel
            </span>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-steel focus:ring-offset-2 ${
                isAnnual ? "bg-steel" : "bg-gray-200"
              }`}
              role="switch"
              aria-checked={isAnnual}
              onClick={() => setIsAnnual(!isAnnual)}
            >
              <span className="sr-only">Utiliser le paiement annuel</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isAnnual ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? "text-anthracite" : "text-muted-foreground"}`}>
              Paiement annuel <span className="text-emerald-600 font-bold ml-1 text-xs bg-emerald-100/50 px-2 py-0.5 rounded-full">-20%</span>
            </span>
          </div>
        </div>

        {/* Grille Tarifaire */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start pt-6">
          {pricingPlans.map((plan) => {
            // Configuration de style basée sur le theme
            let borderStyle = "border-border hover:border-steel/30";
            let buttonStyle = "bg-anthracite hover:bg-anthracite-light text-white";
            let ctaUrl = "/dashboard";
            let ringStyle = "";

            if (plan.theme === "gris") {
              borderStyle = "border-slate-200 bg-slate-50";
              buttonStyle = "bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-100 shadow-none";
            } else if (plan.theme === "noir") {
              borderStyle = "border-anthracite border-2 ring-1 ring-emerald-500/20"; // Noir avec bordure verte
              buttonStyle = "bg-anthracite hover:bg-anthracite/90 text-white";
              ctaUrl = isAnnual 
                ? (urls?.artisanAnnual || "/#pricing")
                : (urls?.artisanMonthly || "/#pricing");
            } else if (plan.theme === "vert") {
              borderStyle = "border-steel border-2 shadow-xl ring-2 ring-steel/20 scale-105 z-10 bg-white";
              buttonStyle = "bg-steel hover:bg-steel-dark text-white";
              ctaUrl = isAnnual 
                ? (urls?.proAnnual || "/#pricing")
                : (urls?.proMonthly || "/#pricing");
            }

            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col transition-all duration-300 ${borderStyle}`}
              >
                {plan.popular && (
                  <div className="absolute top-4 right-4 z-20">
                    <span className="inline-flex items-center rounded-full bg-steel/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-steel border border-steel/20 shadow-none">
                      Populaire
                    </span>
                  </div>
                )}
                
                <CardHeader className="pb-4 pt-8">
                  <CardTitle className={`text-2xl font-bold ${plan.theme === "gris" ? "text-slate-600" : plan.theme === "vert" ? "text-steel" : "text-anthracite"}`}>
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground font-medium mt-1">
                    {plan.subtitle}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 pb-6">
                  {/* Pricing Display */}
                  <div className="mb-2 min-h-[80px]">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-extrabold text-anthracite tracking-tight">
                        {isAnnual ? plan.priceAnnualLabel : plan.priceMonthly} €
                      </span>
                      <span className="text-muted-foreground ml-1.5 font-medium">/ mois</span>
                    </div>
                    {isAnnual && plan.savings && (
                      <div className="mt-2 text-sm text-emerald-600 font-semibold flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        Économisez {plan.savings} € / an
                        <span className="text-muted-foreground font-normal text-xs ml-1">(Facturé annuellement)</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full h-px border-t border-border/50 my-6"></div>

                  {/* Feature Checklist */}
                  <ul className="space-y-4">
                    {plan.features.map((feature, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-3 text-sm ${plan.theme === "gris" ? "text-slate-600" : "text-anthracite/90"} font-medium`}
                      >
                        <div className={`mt-0.5 rounded-full p-0.5 shrink-0 ${plan.theme === "gris" ? "bg-slate-200 text-slate-500" : plan.theme === "vert" ? "bg-steel/10 text-steel" : "bg-anthracite/5 text-anthracite"}`}>
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={3}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m4.5 12.75 6 6 9-13.5"
                            />
                          </svg>
                        </div>
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="pt-2 pb-8">
                  {!isLoggedIn ? (
                    <Link href="/login" className="w-full">
                      <Button className={`w-full cursor-pointer py-6 font-semibold shadow-md ${buttonStyle}`}>
                        {plan.cta}
                      </Button>
                    </Link>
                  ) : plan.theme === "gris" ? (
                    <Link href="/dashboard" className="w-full">
                      <Button className={`w-full cursor-pointer py-6 font-semibold ${buttonStyle}`}>
                        Accéder
                      </Button>
                    </Link>
                  ) : (
                    <a href={ctaUrl} className="w-full" target="_blank" rel="noreferrer">
                      <Button className={`w-full cursor-pointer py-6 font-semibold text-base shadow-md ${buttonStyle}`}>
                        {plan.cta}
                      </Button>
                    </a>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
