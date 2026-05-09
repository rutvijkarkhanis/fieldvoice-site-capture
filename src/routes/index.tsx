import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, CalendarClock, CheckCircle2, Flame, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Cunstruct CRM" }] }),
  component: Index,
});

function Index() {
  return (
    <AppShell title="Dashboard">
      <Dashboard />
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number | string; accent?: string }) {
  return (
    <Card className="border-2">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{label}</div>
            <div className="display text-3xl mt-1">{value}</div>
          </div>
          <div className={`p-2 rounded ${accent ?? "bg-secondary text-secondary-foreground"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-counts"],
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      const results = await Promise.allSettled([
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "New"),
        supabase
          .from("followups")
          .select("*", { count: "exact", head: true })
          .eq("status", "Pending")
          .gte("due_date", startOfDay)
          .lt("due_date", endOfDay),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "Converted"),
      ]);
      const get = (i: number) => {
        const r = results[i];
        return r.status === "fulfilled" ? r.value.count ?? 0 : 0;
      };
      return { total: get(0), newCount: get(1), todayDue: get(2), converted: get(3) };
    },
  });

  if (error) {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-sm text-muted-foreground">Couldn't load dashboard.</p>
        <Button size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const v = (n?: number) => (isLoading ? "…" : n ?? 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={TrendingUp} label="Total Leads" value={v(data?.total)} accent="bg-primary text-primary-foreground" />
        <Stat icon={Flame} label="New" value={v(data?.newCount)} accent="bg-accent text-accent-foreground" />
        <Stat icon={CalendarClock} label="Today" value={v(data?.todayDue)} accent="bg-secondary text-secondary-foreground" />
        <Stat icon={CheckCircle2} label="Converted" value={v(data?.converted)} accent="bg-green-600 text-white" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button asChild variant="secondary"><Link to="/leads"><ArrowUpRight className="h-4 w-4 mr-1" /> View Leads</Link></Button>
        <Button asChild><Link to="/add">+ Add Lead</Link></Button>
      </div>

      <Card><CardContent className="p-4 text-sm text-muted-foreground">
        Tap <strong>Add</strong> to capture a new site lead with voice, GPS and photos. Follow-ups due today are shown above.
      </CardContent></Card>
    </div>
  );
}
