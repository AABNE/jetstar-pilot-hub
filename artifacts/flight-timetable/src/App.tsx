import { Switch, Route, Router as WouterRouter, useLocation, Link } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { CalendarDays, Plane, ClipboardList, Settings2, ShieldCheck, LogOut, Download } from "lucide-react";
import { VJetstarLogo } from "@/components/VJetstarLogo";
import { useEffect } from "react";
import Login from "@/pages/login";
import Timetable from "@/pages/timetable";
import Flights from "@/pages/flights";
import Logs from "@/pages/logs";
import Admin from "@/pages/admin";
import Settings from "@/pages/settings";
import Software from "@/pages/software";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 15_000 } } });

const navItems = [
  { href: "/timetable",  label: "My timetable",     icon: CalendarDays },
  { href: "/flights",    label: "Available routes",  icon: Plane },
  { href: "/logs",       label: "Flight records",    icon: ClipboardList },
  { href: "/software",   label: "Software",          icon: Download },
  { href: "/settings",   label: "Settings",          icon: Settings2 },
];

function JetstarStar({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="currentColor" />
    </svg>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [path, setPath] = useLocation();
  const qc = useQueryClient();
  const logout = useLogout({
    mutation: {
      onSuccess: () => {
        qc.removeQueries({ queryKey: getGetMeQueryKey() });
        qc.setQueryData(getGetMeQueryKey(), null);
        setPath("/login");
      },
    },
  });

  const publicPage = path === "/login";
  useEffect(() => {
    if (!isLoading && !user && !publicPage) setPath("/login");
    if (!isLoading && user && publicPage) setPath("/timetable");
  }, [user, isLoading, publicPage, setPath]);

  if (isLoading) return (
    <div className="min-h-[100dvh] bg-[#f9fafb] p-6">
      <div className="mx-auto mt-[18vh] max-w-lg space-y-4">
        <div className="h-3 w-28 animate-pulse rounded bg-[#fb5713]/30" />
        <div className="h-12 w-3/4 animate-pulse rounded bg-[#f3f4f6]" />
        <div className="h-40 animate-pulse rounded-2xl bg-[#f3f4f6]" />
      </div>
    </div>
  );

  if ((!user && !publicPage) || (user && publicPage)) return null;
  if (!user) return <>{children}</>;

  return (
    <div className="min-h-[100dvh] bg-[#f9fafb] text-[#1a1a1a]">
      <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b border-[#1a1a1a] bg-[#1a1a1a] px-4 md:px-8">
        <Link href="/timetable" className="flex items-center gap-3" data-testid="link-brand-home">
          <VJetstarLogo height={34} light />
          <div className="ml-1 hidden sm:block">
            <div className="font-mono text-[9px] uppercase tracking-[.2em] text-white/40">Virtual ops · MSFS</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/60 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#fb5713]" /> Ops ready
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 font-black uppercase text-white" data-testid="text-user-avatar">
            {user.username.slice(0, 1)}
          </div>
          <div className="hidden min-w-[80px] md:block">
            <div className="text-sm font-bold text-white" data-testid="text-username">{user.username}</div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-white/40">{user.isAdmin ? "Admin" : (user as any).simulatorVersion || "Pilot"}</div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] flex-col md:min-h-[calc(100dvh-64px)] md:flex-row">
        <aside className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-[#e5e7eb] bg-white p-2 md:w-[220px] md:flex-col md:gap-1 md:border-b-0 md:border-r md:p-4">
          <div className="hidden px-3 pb-2 pt-3 font-mono text-[9px] font-bold uppercase tracking-[.24em] text-[#9ca3af] md:block">Flight deck</div>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} data-testid={`link-nav-${href.slice(1)}`}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                path === href ? "bg-[#fb5713] text-white" : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1a1a1a]"
              }`}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {path === href && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-white md:block" />}
            </Link>
          ))}

          {user.isAdmin && (
            <>
              <div className="hidden px-3 pb-1 pt-5 font-mono text-[9px] font-bold uppercase tracking-[.24em] text-[#9ca3af] md:block">Control tower</div>
              <Link href="/admin" data-testid="link-nav-admin"
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                  path === "/admin" ? "bg-[#fb5713] text-white" : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1a1a1a]"
                }`}>
                <ShieldCheck className="h-4 w-4" />Administration
              </Link>
            </>
          )}

          <div className="mt-auto hidden border-t border-[#f3f4f6] pt-4 md:block">
            <button data-testid="button-sign-out" onClick={() => logout.mutate()} disabled={logout.isPending}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#1a1a1a]">
              <LogOut className="h-4 w-4" />
              {logout.isPending ? "Signing out…" : "Sign out"}
            </button>
            <p className="px-3 pt-4 font-mono text-[9px] leading-relaxed text-[#d1d5db]">
              Independent virtual ops. Not affiliated with Jetstar Airways.
            </p>
          </div>
          <button data-testid="button-sign-out-mobile" onClick={() => logout.mutate()}
            className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#6b7280] md:hidden">
            <LogOut className="h-4 w-4" />Sign out
          </button>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-7 md:px-8 md:py-9">
          {children}
          <footer className="mt-16 border-t border-[#f3f4f6] py-4 font-mono text-[9px] uppercase tracking-[.17em] text-[#d1d5db]">
            Virtual operations only · Not affiliated with Jetstar Airways
          </footer>
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/login"    component={Login} />
        <Route path="/timetable" component={Timetable} />
        <Route path="/flights"  component={Flights} />
        <Route path="/logs"     component={Logs} />
        <Route path="/software" component={Software} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin"    component={Admin} />
        <Route path="/"><Timetable /></Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
