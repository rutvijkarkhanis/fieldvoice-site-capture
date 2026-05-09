import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { format, isToday, isPast, parseISO } from "date-fns";
import { Activity, ArrowUpRight, CalendarClock, CheckCircle2, Flame, TrendingUp, XCircle } from "lucide-react";

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
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [{ data: leads }, { data: fups }, { data: acts }] = await Promise.all([
        supabase.from("leads").select("id,site_name,status,priority,stage,created_at").order("created_at", { ascending: false }),
        supabase.from("followups").select("id,due_date,status,lead_id,reminder_notes,leads(site_name)").order("due_date"),
        supabase.from("activities").select("id,activity_type,notes,created_at,lead_id,leads(site_name)").order("created_at", { ascending: false }).limit(8),
      ]);
      return { leads: leads ?? [], fups: fups ?? [], acts: acts ?? [] };
    },
  });

  const leads = data?.leads ?? [];
  const fups = data?.fups ?? [];
  const acts = data?.acts ?? [];

  const total = leads.length;
  const newCount = leads.filter((l) => l.status === "New").length;
  const todayDue = fups.filter((f) => f.status === "Pending" && isToday(parseISO(f.due_date))).length;
  const overdue = fups.filter((f) => f.status === "Pending" && isPast(parseISO(f.due_date)) && !isToday(parseISO(f.due_date))).length;
  const converted = leads.filter((l) => l.status === "Converted").length;
  const lost = leads.filter((l) => l.status === "Lost").length;

  const todays = fups.filter((f) => f.status === "Pending" && isToday(parseISO(f.due_date)));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={TrendingUp} label="Total Leads" value={total} accent="bg-primary text-primary-foreground" />
        <Stat icon={Flame} label="New" value={newCount} accent="bg-accent text-accent-foreground" />
        <Stat icon={CalendarClock} label="Today" value={todayDue} accent="bg-secondary text-secondary-foreground" />
        <Stat icon={Activity} label="Overdue" value={overdue} accent="bg-destructive text-destructive-foreground" />
        <Stat icon={CheckCircle2} label="Converted" value={converted} accent="bg-green-600 text-white" />
        <Stat icon={XCircle} label="Lost" value={lost} />
      </div>

      <section>
        <h2 className="display text-sm mb-2 flex items-center justify-between">
          Today's Follow-Ups
          <Link to="/followups" className="text-xs text-primary normal-case tracking-normal flex items-center gap-1">View all <ArrowUpRight className="h-3 w-3" /></Link>
        </h2>
        <Card><CardContent className="p-3 space-y-2">
          {todays.length === 0 && <p className="text-sm text-muted-foreground py-3 text-center">Nothing scheduled today.</p>}
          {todays.map((f: any) => (
            <Link key={f.id} to="/leads/$id" params={{ id: f.lead_id }} className="flex items-center justify-between p-2 rounded border-2 border-border hover:border-primary">
              <div>
                <div className="font-bold">{f.leads?.site_name}</div>
                <div className="text-xs text-muted-foreground">{f.reminder_notes ?? "Follow-up"}</div>
              </div>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          ))}
        </CardContent></Card>
      </section>

      <section>
        <h2 className="display text-sm mb-2">Recent Activity</h2>
        <Card><CardContent className="p-3 space-y-2">
          {acts.length === 0 && <p className="text-sm text-muted-foreground py-3 text-center">No activity yet. Add your first lead.</p>}
          {acts.map((a: any) => (
            <div key={a.id} className="text-sm border-l-4 border-primary pl-3 py-1">
              <div className="font-semibold">{a.leads?.site_name} · <span className="text-muted-foreground font-normal">{a.activity_type}</span></div>
              <div className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, h:mm a")}{a.notes ? ` — ${a.notes}` : ""}</div>
            </div>
          ))}
        </CardContent></Card>
      </section>
    </div>
  );
}
