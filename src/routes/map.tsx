import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Map — Cunstruct CRM" }] }),
  component: () => <AppShell title="Map"><MapPage /></AppShell>,
});

function MapPage() {
  const { data = [] } = useQuery({
    queryKey: ["map-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id,site_name,latitude,longitude,site_address,priority,status").not("latitude", "is", null);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Tap a pin to open in Google Maps for navigation.</p>
      {data.length === 0 && <p className="text-center text-muted-foreground py-10 text-sm">No geo-tagged leads yet.</p>}
      <ul className="space-y-2">
        {data.map((l: any) => (
          <li key={l.id}>
            <Card className="border-2"><CardContent className="p-3 flex items-center justify-between gap-2">
              <Link to="/leads/$id" params={{ id: l.id }} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold truncate">{l.site_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{l.site_address ?? `${l.latitude?.toFixed(4)}, ${l.longitude?.toFixed(4)}`}</div>
                  </div>
                </div>
              </Link>
              <Button asChild size="sm" variant="secondary">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${l.latitude},${l.longitude}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent></Card>
          </li>
        ))}
      </ul>
    </div>
  );
}