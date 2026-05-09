import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

export function DuplicateWarning({
  excludeId, phone, siteName, address,
}: { excludeId?: string; phone?: string; siteName?: string; address?: string }) {
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const filters: string[] = [];
      if (phone && phone.length >= 6) filters.push(`contact_phone.eq.${phone}`);
      if (siteName && siteName.trim().length >= 3) filters.push(`site_name.ilike.%${siteName.trim()}%`);
      if (address && address.trim().length >= 6) filters.push(`site_address.ilike.%${address.trim()}%`);
      if (filters.length === 0) { setMatches([]); return; }
      let q = supabase.from("leads").select("id,site_name,contact_phone,site_address").or(filters.join(","));
      if (excludeId) q = q.neq("id", excludeId);
      const { data } = await q.limit(5);
      if (!cancelled) setMatches(data ?? []);
    };
    const t = setTimeout(run, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [excludeId, phone, siteName, address]);

  if (matches.length === 0) return null;

  return (
    <div className="rounded-md border-2 border-accent bg-accent/30 p-3 text-sm">
      <div className="flex items-center gap-2 font-bold">
        <AlertTriangle className="h-4 w-4" /> Possible duplicate{matches.length > 1 ? "s" : ""}
      </div>
      <ul className="mt-1.5 space-y-1">
        {matches.map((m) => (
          <li key={m.id}>
            <Link to="/leads/$id" params={{ id: m.id }} className="underline">
              {m.site_name}
            </Link>
            {m.contact_phone && <span className="text-muted-foreground"> · {m.contact_phone}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}