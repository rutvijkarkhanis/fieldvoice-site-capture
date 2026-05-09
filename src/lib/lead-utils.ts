export function leadScore(l: any): number {
  let s = 0;
  if (l.priority === "Hot") s += 50;
  else if (l.priority === "Warm") s += 25;
  if (l.contact_phone) s += 10;
  if (l.estimated_budget) s += Math.min(20, Number(l.estimated_budget) / 1_000_000);
  if (l.stage) s += 10;
  const days = (Date.now() - new Date(l.updated_at ?? l.created_at).getTime()) / 86_400_000;
  s += Math.max(0, 20 - days);
  if (l.status === "Converted") s += 30;
  if (l.status === "Lost" || l.status === "Dormant") s -= 20;
  return Math.round(s);
}

export function exportLeadsCSV(rows: any[]) {
  const cols = [
    "site_name","contact_name","contact_phone","company_name","architect_name","contractor_name",
    "site_address","landmark","latitude","longitude","project_type","stage","status","priority",
    "estimated_budget","project_size_sqft","num_floors","expected_completion","notes","created_at","updated_at",
  ];
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}