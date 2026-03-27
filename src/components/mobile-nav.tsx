"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

interface MobileNavProps {
  tier: string;
  displayName: string;
  currentCount: number;
  limit: number;
  progressPercent: number;
}

export function MobileNav({ tier, displayName, currentCount, limit, progressPercent }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md hover:bg-secondary/50 transition-colors"
        aria-label="Menu"
      >
        {isOpen ? (
          <svg className="h-6 w-6 text-anthracite" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6 text-anthracite" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-border/60 shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
          <nav className="px-4 py-3 space-y-1">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-steel/5 text-steel font-medium"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nouveau Devis
            </Link>
            <Link
              href="/dashboard/projects"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:bg-secondary/50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
              </svg>
              Projets & Devis
            </Link>
            {tier === "pro" && (
              <Link
                href="/dashboard/materials"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:bg-secondary/50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.25 2.25 0 0 1-.75 1.622M4.5 9.878A2.25 2.25 0 0 0 5.25 11.5m13.5-1.622c-.235.083-.487.128-.75.128H5.25c-.263 0-.515-.045-.75-.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122" />
                </svg>
                Matériaux (Pro)
              </Link>
            )}
            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:bg-secondary/50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Paramètres
            </Link>
          </nav>

          {/* Quota Section */}
          <div className="px-4 py-3 bg-secondary/30 border-t border-border/40">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-anthracite uppercase">Forfait</span>
              <span className="text-xs font-medium text-steel">{Math.max(0, limit - currentCount)} restant(s)</span>
            </div>
            <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-destructive' : progressPercent >= 80 ? 'bg-amber-500' : 'bg-steel'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* User + Logout */}
          <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-steel/10 text-steel text-xs font-bold">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-anthracite truncate max-w-[180px]">{displayName}</span>
                <span className="text-xs text-muted-foreground">{tier === 'pro' ? "Plan Pro" : tier === 'artisan' ? "Plan Artisan" : "Plan Gratuit"}</span>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      )}
    </>
  );
}
