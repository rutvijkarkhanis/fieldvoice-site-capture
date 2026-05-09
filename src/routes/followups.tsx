import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format, isToday, isPast, parseISO, isFuture } from "date-fns";
import { Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/followups")({
  head: () => ({ meta: [{ title: "Follow-Ups — Cunstruct CRM" }] }),
  component: () => <AppShell title="Follow-Ups"><Followups /></AppShell>,
});

function Followups() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["followups"],
    queryFn: async () => {
      const { data } = await supabase.from("followups").select("*, leads(site_name, contact_name, contact_phone)").order("due_date");
      return data ?? [];
    },
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("followups").update({ status: "Completed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marked done"); qc.invalidateQueries({ queryKey: ["followups"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });

  const pending = items.filter((i: any) => i.status === "Pending");
  const today = pending.filter((i: any) => isToday(parseISO(i.due_date)));
  const upcoming = pending.filter((i: any) => isFuture(parseISO(i.due_date)) && !isToday(parseISO(i.due_date)));
  const overdue = pending.filter((i: any) => isPast(parseISO(i.due_date)) && !isToday(parseISO(i.due_date)));

  const renderList = (list: any[]) => list.length === 0 ? (
    <p className="text-center text-muted-foreground py-10 text-sm">Nothing here.</p>
  ) : (
    <ul className="space-y-2">
      {list.map((i) => (
        <li key={i.id}>
          <Card className="border-2"><CardContent className="p-3 flex items-center justify-between gap-2">
            <Link to="/leads/$id" params={{ id: i.lead_id }} className="min-w-0 flex-1">
              <div className="font-bold truncate">{i.leads?.site_name}</div>
              <div className="text-xs text-muted-foreground">{format(parseISO(i.due_date), "EEE, MMM d")}{i.due_time ? ` · ${i.due_time}` : ""}</div>
              {i.reminder_notes && <div className="text-xs mt-0.5">{i.reminder_notes}</div>}
            </Link>
            <Button size="sm" variant="secondary" onClick={() => complete.mutate(i.id)}><Check className="h-4 w-4" /></Button>
          </CardContent></Card>
        </li>
      ))}
    </ul>
  );

  return (
    <Tabs defaultValue="today">
      <TabsList className="grid grid-cols-3 w-full">
        <TabsTrigger value="today">Today ({today.length})</TabsTrigger>
        <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
        <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="today" className="mt-3">{renderList(today)}</TabsContent>
      <TabsContent value="upcoming" className="mt-3">{renderList(upcoming)}</TabsContent>
      <TabsContent value="overdue" className="mt-3">{renderList(overdue)}</TabsContent>
    </Tabs>
  );
}