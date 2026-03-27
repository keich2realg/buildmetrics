import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { MobileNav } from "@/components/mobile-nav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch full profile for quota tracking
  const { data: profile } = await supabase
    .from("users")
    .select("is_pro, plan_count, is_beta, email, plan_tier, company_name, first_name, last_name, billing_interval, subscription_status, subscription_ends_at")
    .eq("id", user?.id)
    .single();

  const displayName = profile?.company_name || 
    (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : null) || 
    user?.email || 
    "Utilisateur";

  const initials = profile?.company_name
    ? profile.company_name.slice(0, 2).toUpperCase()
    : profile?.first_name
    ? profile.first_name.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "??";

  const tier = profile?.plan_tier || 'decouverte';
  let currentCount = profile?.plan_count || 0;
  
  const isAdmin = profile?.email === "cheick9892@gmail.com";
  let limit = 3;
  
  const billingInterval = profile?.billing_interval || 'monthly';
  const annualMultiplier = billingInterval === 'yearly' ? 12 : 1;

  // ── Auto-enroll new users as beta before deadline ──
  const BETA_DEADLINE = new Date('2026-04-16T23:59:59');
  if (!profile?.is_beta && tier === 'decouverte' && !profile?.subscription_status && new Date() < BETA_DEADLINE) {
    const { count: totalProjects } = await supabase.from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id);
    if ((totalProjects || 0) === 0) {
      await supabase.from('users').update({ is_beta: true }).eq('id', user?.id);
      // Reflect in current session
      if (profile) (profile as any).is_beta = true;
    }
  }

  // ── Trial Pro expiration check ──
  // If user is on trial Pro and the trial has expired, downgrade to decouverte
  if (profile?.subscription_status === 'trial' && profile?.subscription_ends_at) {
    const trialEnd = new Date(profile.subscription_ends_at);
    if (new Date() > trialEnd) {
      await supabase.from('users').update({ plan_tier: 'decouverte', subscription_status: 'expired', is_beta: false }).eq('id', user?.id);
      // Force reload with decouverte
    }
  }

  // ── Beta plan: 5 total credits (IA + manual), no free carry-over ──
  if (profile?.is_beta) {
    limit = 5;
    // Count ALL projects (including manual) for beta
    const { count: betaTotal } = await supabase.from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .neq('file_url', 'deleted');
    currentCount = betaTotal || 0;
  } else if (tier === 'pro') {
    limit = 100 * annualMultiplier;
  } else if (tier === 'artisan') {
    limit = 15 * annualMultiplier;
  }

  if ((tier === 'pro' || tier === 'artisan') && !profile?.is_beta) {
    let monthlyLimit = (tier === 'pro' ? 100 : 15) * annualMultiplier;
    
    let anchorDay = 1;
    const { data: fourthProject } = await supabase
      .from('projects')
      .select('created_at')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: true })
      .range(3, 3)
      .maybeSingle();

    if (fourthProject) {
      anchorDay = new Date(fourthProject.created_at).getDate();
    } else {
      anchorDay = new Date().getDate();
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
    const cycleStartDate = new Date(cycleStartYear, cycleStartMonth, validAnchorDay).toISOString();

    const { count: cycleCount } = await supabase.from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .neq('file_url', 'manual')
        .neq('file_url', 'deleted')
        .gte('created_at', cycleStartDate);
        
    const { count: lifetimeCount } = await supabase.from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .neq('file_url', 'manual')
        .neq('file_url', 'deleted');
    
    const currCycle = cycleCount || 0;
    const lifetime = lifetimeCount || 0;
    const projectsBeforeCycle = Math.max(0, lifetime - currCycle);
    const unusedFree = Math.max(0, 3 - projectsBeforeCycle);
    
    limit = monthlyLimit + unusedFree;
    currentCount = currCycle;
  } else {
    // Calcul exact pour le Plan Découverte (total cumulé)
    const { count } = await supabase.from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .neq('file_url', 'manual')
        .neq('file_url', 'deleted');
    if (count !== null) currentCount = count;
  }

  const progressPercent = Math.min((currentCount / limit) * 100, 100);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fb]">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-border/60 z-20 print:hidden">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-6 py-5 border-b border-border/40 transition-all duration-300 ease-out hover:bg-secondary/40 hover:pl-7 active:scale-[0.98]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-steel text-white font-bold text-xs shadow-sm transition-transform duration-300 group-hover:scale-110 flex-shrink-0">
            BM
          </div>
          <span className="text-xl font-bold tracking-tight text-anthracite">
            BuildMetrics
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-steel/5 text-steel font-medium transition-all duration-300 ease-out hover:translate-x-1 hover:bg-steel/10 active:scale-[0.98]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouveau Devis
          </Link>
          <Link href="/dashboard/projects" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground transition-all duration-300 ease-out hover:translate-x-1 hover:bg-secondary/50 hover:text-anthracite active:scale-[0.98]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
            </svg>
            Projets & Devis
          </Link>
          {tier === 'pro' ? (
            <Link href="/dashboard/materials" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground transition-all duration-300 ease-out hover:translate-x-1 hover:bg-secondary/50 hover:text-anthracite active:scale-[0.98]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.25 2.25 0 0 1-.75 1.622M4.5 9.878A2.25 2.25 0 0 0 5.25 11.5m13.5-1.622c-.235.083-.487.128-.75.128H5.25c-.263 0-.515-.045-.75-.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122" />
              </svg>
              Matériaux (Pro)
            </Link>
          ) : null}
        </nav>

        {/* Quota & Support Section */}
        <div className="p-4 bg-secondary/30 border-t border-border/40">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-anthracite tracking-wide uppercase">Votre Forfait</span>
              <span className="text-xs font-medium text-steel">
                {Math.max(0, limit - currentCount)} restant(s)
              </span>
            </div>
            <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-destructive' : progressPercent >= 80 ? 'bg-amber-500' : 'bg-steel'}`} 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
              {profile?.is_beta 
                ? "Bêta : Plafond mensuel de devis." 
                : limit === 100 
                  ? "Vous profitez des analyses Pro (100 max)." 
                  : "Passez en Pro pour débloquer de plus grands volumes."}
            </p>
          </div>

          <div className="py-3 border-t border-border/40 mb-2">
             <span className="text-xs text-muted-foreground block mb-1">Support Client</span>
             <a href="mailto:buildmetrics.ent@gmail.com" className="text-xs font-medium text-steel hover:underline flex items-center gap-1.5">
               <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
               </svg>
               buildmetrics.ent@gmail.com
             </a>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-3 p-2 rounded-md transition-all duration-300 ease-out hover:bg-secondary/80 hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus:outline-none cursor-pointer border border-transparent bg-white group">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-steel/10 text-steel text-xs font-bold transition-transform duration-300 group-hover:bg-steel group-hover:text-white">
                {initials}
              </div>
              <div className="flex flex-col items-start overflow-hidden w-full">
                <span className="truncate w-full text-left text-sm font-semibold text-anthracite group-hover:text-steel transition-colors">{displayName}</span>
                <span className="text-xs text-muted-foreground">{profile?.is_beta ? "Plan Bêta" : profile?.subscription_status === 'trial' ? "Plan Pro (Essai)" : tier === 'pro' ? "Plan Pro" : tier === 'artisan' ? "Plan Artisan" : "Plan Gratuit"}</span>
              </div>
              <svg className="h-4 w-4 text-muted-foreground shrink-0 ml-auto group-hover:text-steel transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
              </svg>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-2">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal text-xs text-muted-foreground uppercase tracking-wider">
                  Mon Compte
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <Link href="/dashboard/settings" className="w-full flex items-center">
                  <svg className="mr-2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="p-1">
                <LogoutButton />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="sticky top-0 z-50 p-3 md:hidden flex justify-between items-center bg-white/95 backdrop-blur-lg border-b border-border/60 print:hidden">
            <a href="/" className="flex items-center gap-2 text-anthracite">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-steel text-white font-bold text-xs shadow-sm">BM</div>
              <span className="font-bold text-lg">BuildMetrics</span>
            </a>
            <MobileNav tier={tier} displayName={displayName} currentCount={currentCount} limit={limit} progressPercent={progressPercent} />
        </div>
        {children}
      </main>
    </div>
  );
}
