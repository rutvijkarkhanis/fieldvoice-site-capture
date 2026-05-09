import { type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Navigate } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { HardHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-secondary text-secondary-foreground border-b-4 border-primary">
        <div className="hazard-stripes h-1.5" />
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <HardHat className="h-6 w-6 text-primary" />
            <div>
              <div className="display text-lg leading-none">Cunstruct CRM</div>
              {title && <div className="text-xs uppercase tracking-widest text-secondary-foreground/70 mt-0.5">{title}</div>}
            </div>
          </div>
          <Button size="sm" variant="ghost" className="text-secondary-foreground hover:bg-secondary-foreground/10" onClick={() => supabase.auth.signOut()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}