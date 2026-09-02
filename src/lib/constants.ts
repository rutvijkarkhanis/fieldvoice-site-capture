export const LEAD_TYPES = ["Architect","Contractor","Owner","Developer","Dealer"] as const;
export const BOQ_STATUSES = ["Not Offered","Offered","Sent","Accepted","Rejected"] as const;

export const STAGES =["Excavation","Foundation","RCC Structure","Brickwork","Plaster","Waterproofing","Electrical Rough-In","Plumbing Rough-In","Flooring","Ceiling","Painting","Interior Fit-Out","Façade Installation","Final Finishing","Handover"] as const;
export const STATUSES = ["New","Qualified","Quotation Sent","Negotiation","Follow-Up","Converted","Lost","Dormant"] as const;
export const PRIORITIES = ["Hot","Warm","Cold"] as const;
export const PROJECT_TYPES = ["Residential","Commercial","Retail","Hospitality","Institutional"] as const;
export const PRODUCTS = ["Cement","White Cement","TMT Bars","Bricks & Blocks","Sand & Aggregates","Waterproofing","Adhesives & Sealants","Tiles","Plumbing","Electrical","Lighting","Fans","Doors","Plywood","Laminates","ACP","WPC","Hardware","Paints","Safety PPE"] as const;

export const priorityClass = (p: string) =>
  p === "Hot" ? "bg-destructive text-destructive-foreground" :
  p === "Warm" ? "bg-primary text-primary-foreground" :
  "bg-muted text-muted-foreground";

export const statusClass = (s: string) =>
  s === "Converted" ? "bg-green-600 text-white" :
  s === "Lost" ? "bg-muted text-muted-foreground" :
  s === "New" ? "bg-accent text-accent-foreground" :
  "bg-secondary text-secondary-foreground";