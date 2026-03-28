"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import { enrollInBeta } from "@/app/dashboard/actions";

export function LifecycleModals() {
  const [modal, setModal] = useState<"welcome" | "upgraded" | "cancelled" | "expiry" | "beta_welcome" | "beta_goodbye" | null>(null);
  const [mounted, setMounted] = useState(false);
  const [tier, setTier] = useState<string>("decouverte");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    let cleanupFunc: () => void = () => {};
    
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const userId = session.user.id;
      
      // Fetch initial DB state
      const { data: user } = await supabase.from('users').select('plan_tier, subscription_status, is_beta').eq('id', userId).single();
      const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      
      const currentTier = user?.plan_tier || 'decouverte';
      const projectCount = count || 0;
      setTier(currentTier);

      const savedTier = localStorage.getItem("bm_tier");
      const hasSeenWelcome = localStorage.getItem("bm_welcome");

      // Check Startup conditions
      if (!savedTier) {
        // Fresh browser session
        if (user?.is_beta && !localStorage.getItem("bm_beta_welcome")) {
          setModal("beta_welcome");
          localStorage.setItem("bm_beta_welcome", "true");
        } else if (currentTier === "pro" || currentTier === "artisan") {
          // Check if this is a trial (post-beta graduation)
          if (user?.subscription_status === 'trial' && !localStorage.getItem("bm_beta_goodbye")) {
            setModal("beta_goodbye");
            localStorage.setItem("bm_beta_goodbye", "true");
          } else {
            setModal("upgraded");
          }
        } else if (projectCount === 0 && !hasSeenWelcome) {
          setModal("welcome");
        }
        localStorage.setItem("bm_welcome", "true");
      } else if (savedTier !== currentTier) {
        const isUpgrade = 
          (savedTier === "decouverte" && (currentTier === "pro" || currentTier === "artisan")) ||
          (savedTier === "artisan" && currentTier === "pro");
          
        const isDowngrade = 
          (savedTier === "pro" && (currentTier === "decouverte" || currentTier === "artisan")) ||
          (savedTier === "artisan" && currentTier === "decouverte");

        if (isUpgrade) {
          setModal("upgraded");
        } else if (isDowngrade) {
          setModal("cancelled");
        }
      }
      
      localStorage.setItem("bm_tier", currentTier);

      // Subscription Expiry 5-Day Check (Only for Paid tiers)
      if (currentTier === "pro" || currentTier === "artisan") {
        const { data: fourthProject } = await supabase
          .from('projects')
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .range(3, 3)
          .maybeSingle();

        let anchorDay = new Date().getDate();
        if (fourthProject) {
          anchorDay = new Date(fourthProject.created_at).getDate();
        }

        const now = new Date();
        let cycleStartMonth = now.getMonth();
        let cycleStartYear = now.getFullYear();

        if (now.getDate() < anchorDay) {
          cycleStartMonth -= 1;
          if (cycleStartMonth < 0) {
            cycleStartMonth = 11;
            cycleStartYear -= 1;
          }
        }

        const daysInMonth = new Date(cycleStartYear, cycleStartMonth + 1, 0).getDate();
        const validAnchorDay = Math.min(anchorDay, daysInMonth);
        
        // Exact renewal date is StartMonth + 1
        const renewalDate = new Date(cycleStartYear, cycleStartMonth + 1, validAnchorDay);
        
        const FIFTH_DAY_MS = 5 * 24 * 60 * 60 * 1000;
        const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
        
        const timeUntilRenewal = renewalDate.getTime() - now.getTime();
        
        if (timeUntilRenewal > 0 && timeUntilRenewal <= FIFTH_DAY_MS && modal === null) {
          const lastShown = localStorage.getItem("bm_expiry_last_shown");
          if (!lastShown || (now.getTime() - parseInt(lastShown)) >= FIVE_HOURS_MS) {
            setModal("expiry");
          }
        }
      }

      // WebSockets Subscription (Real-time plan change listening)
      const channel = supabase.channel('user_tier_changes_' + userId)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${userId}`
          },
          (payload) => {
            const newTier = payload.new.plan_tier;
            const newSubStatus = payload.new.subscription_status;
            const oldTier = localStorage.getItem("bm_tier") || payload.old?.plan_tier || 'decouverte';
            const oldSubStatus = localStorage.getItem("bm_sub_status") || payload.old?.subscription_status || 'active';
            
            // Detect cancellation via subscription_status change
            if (newSubStatus === 'cancelled' && oldSubStatus !== 'cancelled') {
              setModal("cancelled");
              localStorage.setItem("bm_sub_status", newSubStatus);
            }

            if (newTier !== oldTier) {
              setTier(newTier);
              const isUpgrade = 
                (oldTier === "decouverte" && (newTier === "pro" || newTier === "artisan")) ||
                (oldTier === "artisan" && newTier === "pro");
              const isDowngrade = 
                (oldTier === "pro" && (newTier === "decouverte" || newTier === "artisan")) ||
                (oldTier === "artisan" && newTier === "decouverte");

              if (isUpgrade) {
                setModal("upgraded");
              } else if (isDowngrade) {
                setModal("cancelled");
              }
              localStorage.setItem("bm_tier", newTier);
            }

            // Also update sub status
            if (newSubStatus) localStorage.setItem("bm_sub_status", newSubStatus);
          }
        )
        .subscribe();
        
      cleanupFunc = () => {
        supabase.removeChannel(channel);
      };
    };
    
    init();

    return () => {
      cleanupFunc();
    };
  }, []);

  // ── Beta Enrollment from Query Param ──
  useEffect(() => {
    if (!mounted) return;
    
    const checkBetaJoin = async () => {
      if (searchParams.get("beta") === "join") {
        const result = await enrollInBeta();
        if (result.success) {
          setModal("beta_welcome");
          localStorage.setItem("bm_beta_welcome", "true");
          // Clean URL
          const newPath = window.location.pathname;
          router.replace(newPath);
        }
      }
    };
    
    checkBetaJoin();
  }, [mounted, searchParams, router]);

  if (!mounted || !modal) return null;

  return (
    <>
      <Dialog open={modal === "welcome"} onOpenChange={(v) => !v && setModal(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-steel p-6 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <DialogTitle className="text-2xl text-white font-bold tracking-tight">Bienvenue sur BuildMetrics !</DialogTitle>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-anthracite-light text-center text-base leading-relaxed">
              Ravi de vous accueillir ! Profitez de <strong className="text-steel font-bold">3 analyses IA gratuites</strong> offertes — sans carte bancaire, sans engagement.
            </p>
            <p className="text-anthracite-light text-center text-sm">
              Uploadez votre premier plan (PDF, PNG ou JPG) et laissez l'IA générer votre devis détaillé en quelques secondes.
            </p>
            <div className="flex flex-col gap-3 mt-6 w-full">
              <Button onClick={() => setModal(null)} className="w-full bg-steel hover:bg-steel-dark text-white font-semibold py-6 text-lg shadow-md transition-all duration-300">
                Lancer mon premier chiffrage
              </Button>
              <Link href="/#pricing" onClick={() => setModal(null)} className="w-full text-center text-sm text-muted-foreground hover:text-steel transition-colors underline-offset-4 hover:underline">
                Découvrir les offres abonnés
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "upgraded"} onOpenChange={(v) => !v && setModal(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-emerald-600 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500 to-emerald-400 opacity-50"></div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 relative z-10 backdrop-blur-sm shadow-inner">
              <span className="text-3xl">🚀</span>
            </div>
            <DialogTitle className="text-2xl text-white font-bold tracking-tight relative z-10">Félicitations {tier === 'pro' ? 'Pro' : 'Artisan'} !</DialogTitle>
          </div>
          <div className="p-6 space-y-4 relative z-10 bg-white">
            <p className="text-anthracite text-center text-base leading-relaxed font-medium">
              Votre abonnement <strong>{tier === 'pro' ? 'Pro' : 'Artisan'}</strong> est désormais actif !
            </p>
            <p className="text-anthracite-light text-center text-sm leading-relaxed">
              Vous avez accès à toutes les fonctionnalités avancées. Vos 3 analyses gratuites initiales sont conservées en bonus.
              {tier === 'pro' && " En tant que Pro, vous pouvez également créer des devis 100% manuels, en illimité."}
            </p>
            <div className="mt-6 w-full">
              <Button onClick={() => setModal(null)} className="w-full bg-anthracite hover:bg-black text-white font-semibold py-6 text-lg shadow-xl shadow-emerald-600/20 transition-all duration-300">
                Explorer mon espace
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "cancelled"} onOpenChange={(v) => !v && setModal(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-lg">
          <div className="bg-slate-100 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-200/80 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">😔</span>
            </div>
            <DialogTitle className="text-xl text-anthracite font-bold tracking-tight">Abonnement suspendu</DialogTitle>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-anthracite text-center text-base">
              Votre demande d'annulation a été enregistrée.
            </p>
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              Votre accès reste actif jusqu'à la fin de votre période d'abonnement en cours. Après cette date, vous serez basculé sur le Plan Découverte. Vous pouvez réactiver à tout moment.
            </p>
            <div className="flex flex-col gap-3 mt-6 w-full">
              <Button onClick={() => setModal(null)} variant="outline" className="w-full font-medium py-6 text-base text-anthracite border-border hover:bg-slate-50 transition-all">
                Continuer à utiliser mon espace
              </Button>
              <Link href="/#pricing" onClick={() => setModal(null)} className="w-full flex justify-center">
                <Button className="w-full flex shrink-0 items-center justify-center bg-steel text-white hover:bg-steel-dark font-medium py-6 text-base transition-all duration-300 rounded-lg">
                  Réactiver mon abonnement
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "expiry"} onOpenChange={(v) => {
        if (!v) {
          setModal(null);
          localStorage.setItem("bm_expiry_last_shown", Date.now().toString());
        }
      }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-border/50 shadow-2xl">
          <div className="bg-amber-50 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-amber-100/80 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <span className="text-3xl">⏳</span>
            </div>
            <DialogTitle className="text-xl text-amber-900 font-bold tracking-tight">Votre forfait se renouvelle bientôt !</DialogTitle>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-anthracite text-center text-sm leading-relaxed">
              Votre cycle <strong>{tier === 'pro' ? 'Pro' : 'Artisan'}</strong> se renouvelle dans moins de <strong>5 jours</strong>. Vos crédits d'analyse IA restants seront réinitialisés à ce moment-là.
            </p>
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              Pensez à utiliser vos derniers crédits avant le renouvellement pour en profiter au maximum !
            </p>
            <div className="flex flex-col gap-3 mt-4">
              <Button onClick={() => {
                setModal(null);
                localStorage.setItem("bm_expiry_last_shown", Date.now().toString());
              }} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-md transition-all duration-300">
                Compris, merci
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "beta_welcome"} onOpenChange={(v) => !v && setModal(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-purple-600 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-700 to-purple-400 opacity-50"></div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 relative z-10">
              <span className="text-3xl">🧪</span>
            </div>
            <DialogTitle className="text-2xl text-white font-bold tracking-tight relative z-10">Bienvenue Bêta-testeur !</DialogTitle>
          </div>
          <div className="p-6 space-y-4 bg-white">
            <p className="text-anthracite text-center text-base leading-relaxed">
              Merci de participer à la bêta de <strong>BuildMetrics</strong> ! Vous disposez de <strong className="text-purple-700">5 crédits</strong> pour tester toutes les fonctionnalités Pro.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✨ Chaque analyse IA ou devis manuel consomme 1 crédit</p>
              <p>🚀 Une fois vos 5 crédits utilisés, vous recevrez <strong className="text-anthracite">1 mois d’accès Pro gratuit</strong></p>
            </div>
            <div className="mt-6 w-full">
              <Button onClick={() => setModal(null)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-6 text-lg shadow-md transition-all duration-300">
                Commencer mes tests
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "beta_goodbye"} onOpenChange={(v) => !v && setModal(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-br from-steel to-steel-dark p-6 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🎁</span>
            </div>
            <DialogTitle className="text-2xl text-white font-bold tracking-tight">Merci pour vos retours !</DialogTitle>
          </div>
          <div className="p-6 space-y-4 bg-white">
            <p className="text-anthracite text-center text-base leading-relaxed">
              Vos <strong>5 crédits bêta</strong> ont été utilisés. En guise de remerciement, vous bénéficiez d’un <strong className="text-steel">mois d’accès Pro gratuit</strong> !
            </p>
            <p className="text-muted-foreground text-center text-sm leading-relaxed">
              Profitez de toutes les fonctionnalités sans limite pendant 30 jours. À la fin de cette période, abonnez-vous pour conserver votre accès.
            </p>
            <div className="flex flex-col gap-3 mt-6 w-full">
              <Button onClick={() => setModal(null)} className="w-full bg-steel hover:bg-steel-dark text-white font-semibold py-6 text-lg shadow-md transition-all duration-300">
                Explorer mon accès Pro
              </Button>
              <Link href="/#pricing" onClick={() => setModal(null)} className="w-full text-center text-sm text-muted-foreground hover:text-steel transition-colors underline-offset-4 hover:underline">
                Voir les forfaits d’abonnement
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
