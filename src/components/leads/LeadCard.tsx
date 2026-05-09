import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { priorityClass, statusClass } from "@/lib/constants";
import { leadScore } from "@/lib/lead-utils";
import { Phone, MapPin, MessageCircle, ExternalLink, Pencil, Calendar, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

function LeadCardImpl({
  lead, nextFollowup, selectable, selected, onToggle,
}: {
  lead: any;
  nextFollowup?: { due_date: string } | null;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const phone = lead.contact_phone?.replace(/\D/g, "");
  const wa = phone ? `https://wa.me/${phone.startsWith("91") ? phone : `91${phone}`}` : "#";
  const maps = lead.latitude && lead.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${lead.latitude},${lead.longitude}`
    : null;
  const score = leadScore(lead);

  return (
    <Card className="border-2 hover:border-primary transition-colors">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {selectable && (
            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={!!selected} onCheckedChange={() => onToggle?.()} />
            </div>
          )}
          <Link to="/leads/$id" params={{ id: lead.id }} className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold truncate">{lead.site_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {lead.contact_name || "—"}
                  {lead.contact_phone && (
                    <span className="inline-flex items-center gap-1 ml-2">
                      <Phone className="h-3 w-3" />{lead.contact_phone}
                    </span>
                  )}
                </div>
                {lead.site_address && (
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />{lead.site_address}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge className={priorityClass(lead.priority)}>{lead.priority}</Badge>
                <Badge variant="outline" className={statusClass(lead.status)}>{lead.status}</Badge>
                <span className="text-[10px] font-bold text-muted-foreground">SCORE {score}</span>
              </div>
            </div>
            {lead.stage && (
              <div className="mt-2 text-[10px] uppercase tracking-widest font-bold text-primary">{lead.stage}</div>
            )}
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {nextFollowup ? format(new Date(nextFollowup.due_date), "MMM d") : "No follow-up"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(lead.updated_at ?? lead.created_at), { addSuffix: true })}
              </span>
            </div>
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button asChild size="sm" variant="default" disabled={!phone} className="h-8 px-0">
            <a href={phone ? `tel:${phone}` : "#"} aria-label="Call"><Phone className="h-3.5 w-3.5" /></a>
          </Button>
          <Button asChild size="sm" variant="secondary" disabled={!phone} className="h-8 px-0">
            <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></a>
          </Button>
          <Button asChild size="sm" variant="outline" disabled={!maps} className="h-8 px-0">
            <a href={maps ?? "#"} target="_blank" rel="noreferrer" aria-label="Maps"><ExternalLink className="h-3.5 w-3.5" /></a>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 px-0">
            <Link to="/leads/$id/edit" params={{ id: lead.id }} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const LeadCard = memo(LeadCardImpl, (a, b) =>
  a.lead.id === b.lead.id &&
  a.lead.updated_at === b.lead.updated_at &&
  a.selected === b.selected &&
  a.selectable === b.selectable &&
  (a.nextFollowup?.due_date ?? null) === (b.nextFollowup?.due_date ?? null)
);