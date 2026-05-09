import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

const labels: Record<string, string> = {
  site_name: "Site name", contact_name: "Contact", contact_phone: "Phone",
  alternate_phone: "Alt phone", company_name: "Company", architect_name: "Architect",
  contractor_name: "Contractor", site_address: "Address", landmark: "Landmark",
  project_type: "Project type", project_size_sqft: "Size (sqft)", num_floors: "Floors",
  estimated_budget: "Budget", expected_completion: "Expected end", stage: "Stage",
  status: "Status", priority: "Priority", notes: "Notes", assigned_to: "Assigned to",
};

export function EditHistoryList({ leadId }: { leadId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["edit-history", leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lead_edit_history")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  if (data.length === 0) {
    return <Card><CardContent className="p-3 text-sm text-muted-foreground">No edits yet.</CardContent></Card>;
  }

  return (
    <Card><CardContent className="p-3 space-y-2.5">
      {data.map((h: any) => (
        <div key={h.id} className="text-sm border-l-4 border-accent pl-3">
          <div className="font-bold">{labels[h.field_name] ?? h.field_name}</div>
          <div className="text-xs text-muted-foreground">{format(new Date(h.created_at), "MMM d, h:mm a")}</div>
          <div className="text-xs mt-1">
            <span className="line-through text-muted-foreground">{h.old_value || "—"}</span>
            <span className="mx-1.5">→</span>
            <strong>{h.new_value || "—"}</strong>
          </div>
        </div>
      ))}
    </CardContent></Card>
  );
}