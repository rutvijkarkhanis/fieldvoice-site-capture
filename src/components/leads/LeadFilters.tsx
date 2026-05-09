import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { STAGES, STATUSES, PRIORITIES, PRODUCTS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export type LeadFilterState = {
  stage: string;
  status: string;
  priority: string;
  product: string;
  assignedTo: string;
  createdFrom: string;
  createdTo: string;
};

export const emptyFilters: LeadFilterState = {
  stage: "", status: "", priority: "", product: "", assignedTo: "", createdFrom: "", createdTo: "",
};

export type SortKey = "updated" | "created" | "followup" | "priority" | "score";

export function LeadFilters({
  filters, onFiltersChange, sort, onSortChange, isAdmin, reps,
}: {
  filters: LeadFilterState;
  onFiltersChange: (f: LeadFilterState) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  isAdmin: boolean;
  reps: { id: string; full_name: string | null }[];
}) {
  const activeCount = Object.values(filters).filter(Boolean).length;
  const set = <K extends keyof LeadFilterState>(k: K, v: LeadFilterState[K]) =>
    onFiltersChange({ ...filters, [k]: v });

  return (
    <div className="flex gap-2">
      <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
        <SelectTrigger className="w-[170px] h-10"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="updated">Recently Updated</SelectItem>
          <SelectItem value="created">Recently Created</SelectItem>
          <SelectItem value="followup">Follow-Up Date</SelectItem>
          <SelectItem value="priority">Priority</SelectItem>
          <SelectItem value="score">Lead Score</SelectItem>
        </SelectContent>
      </Select>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-1.5 h-10">
            <Filter className="h-4 w-4" /> Filters
            {activeCount > 0 && <Badge className="ml-1 h-5 px-1.5">{activeCount}</Badge>}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Filter leads</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4 px-1">
            <Field label="Stage">
              <Select value={filters.stage || "_all"} onValueChange={(v) => set("stage", v === "_all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All</SelectItem>
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={filters.status || "_all"} onValueChange={(v) => set("status", v === "_all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={filters.priority || "_all"} onValueChange={(v) => set("priority", v === "_all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All</SelectItem>
                  {PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Product Interest">
              <Select value={filters.product || "_all"} onValueChange={(v) => set("product", v === "_all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All</SelectItem>
                  {PRODUCTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {isAdmin && (
              <Field label="Assigned Rep">
                <Select value={filters.assignedTo || "_all"} onValueChange={(v) => set("assignedTo", v === "_all" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All</SelectItem>
                    {reps.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name || r.id.slice(0, 8)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Created from">
                <Input type="date" value={filters.createdFrom} onChange={(e) => set("createdFrom", e.target.value)} />
              </Field>
              <Field label="Created to">
                <Input type="date" value={filters.createdTo} onChange={(e) => set("createdTo", e.target.value)} />
              </Field>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => onFiltersChange(emptyFilters)} className="gap-1">
              <X className="h-4 w-4" /> Clear all
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}