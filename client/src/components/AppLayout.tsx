import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import type { Update } from "@shared/schema";
import { format, parseISO, isToday } from "date-fns";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Sparkles, Menu, X, Settings2 } from "lucide-react";
import { useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: updates } = useQuery<Update[]>({ queryKey: ["/api/updates"] });
  const [location] = useLocation();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPublicView = location.startsWith("/view/");

  // Don't show sidebar on public partner view
  if (isPublicView) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static z-50 top-0 left-0 h-full w-64 
          bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border))]
          flex flex-col transition-transform duration-200 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo area */}
        <div className="px-5 h-14 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))]">
          <Link href="/">
            <span className="text-[14px] font-semibold tracking-tight text-foreground cursor-pointer">
              KMJZ Updates
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav buttons */}
        <div className="px-3 pt-3 pb-1 space-y-0.5">
          <Link href="/new">
            <span
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                location === "/new"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-accent))]"
              }`}
              data-testid="nav-create"
            >
              <Sparkles size={15} />
              New Update
            </span>
          </Link>
          <Link href="/control">
            <span
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                location === "/control"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-accent))]"
              }`}
              data-testid="nav-control"
            >
              <Settings2 size={15} />
              Control Panel
            </span>
          </Link>
        </div>

        {/* Date list */}
        <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
            History
          </p>
          {(!updates || updates.length === 0) && (
            <p className="text-[12px] text-muted-foreground/60 px-3 py-2">
              No updates yet
            </p>
          )}
          <div className="space-y-0.5">
            {updates?.map((u) => {
              const dateObj = parseISO(u.date);
              const today = isToday(dateObj);
              const active = location === `/update/${u.id}`;

              return (
                <Link key={u.id} href={`/update/${u.id}`}>
                  <span
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-colors ${
                      active
                        ? "bg-[hsl(var(--sidebar-accent))] text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-accent))]/50"
                    }`}
                    data-testid={`nav-update-${u.id}`}
                  >
                    <span className="flex items-center gap-2">
                      {today && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--strategic))]" />
                      )}
                      <span>
                        {today ? "Today" : format(dateObj, "EEE, MMM d")}
                      </span>
                    </span>
                    {u.status === "draft" && (
                      <span className="text-[10px] text-muted-foreground/60">
                        draft
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom: theme toggle */}
        <div className="px-3 py-3 border-t border-[hsl(var(--sidebar-border))]">
          <button
            onClick={toggle}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-accent))] transition-colors w-full"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border h-14 flex items-center px-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 text-muted-foreground"
            data-testid="button-mobile-menu"
          >
            <Menu size={20} />
          </button>
          <span className="ml-2 text-[14px] font-semibold tracking-tight">
            KMJZ Updates
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
