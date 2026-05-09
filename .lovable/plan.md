## Leads Management Module — Implementation Plan

Building a comprehensive Leads Management section on top of the existing MVP. Scope is large, so I'll deliver in one cohesive pass focused on the high-value pieces, with a few pragmatic trade-offs called out at the end.

### 1. Database changes (one migration)

- New table `lead_edit_history` — `lead_id`, `field_name`, `old_value`, `new_value`, `changed_by`, `created_at`. RLS: viewable by authenticated; insert by authenticated (changed_by = auth.uid()).
- Trigger on `leads` UPDATE: for each tracked field that changed, insert a row into `lead_edit_history` (using `auth.uid()`).
- Add `assigned_to uuid` column on `leads` (nullable; defaults to owner_id via trigger on insert) to support reassignment without losing ownership.
- Update RLS on `leads` so sales reps see/edit only leads where `owner_id = auth.uid()` OR `assigned_to = auth.uid()` OR they're admin. Admin policies for delete + reassign already partially exist via `has_role`.

### 2. Enhanced Leads List (`/leads`)

- Mobile: existing card layout, enriched with area, stage, status, priority, next follow-up, last updated, and a quick-action row (Call / WhatsApp / Maps / Edit).
- Desktop (≥md): switch to a dense table view with sortable headers.
- Search bar: site, contact, phone, architect, contractor, address.
- Filter sheet (mobile drawer, desktop popover): stage, status, priority, product, assigned rep (admin only), date-created range.
- Sort dropdown: Recently Updated, Recently Created, Follow-Up Date, Priority.
- Bulk-select checkboxes (admin-only): Reassign, Update Status, Delete, Export CSV of selected.
- Lead-score column: simple computed score (priority weight + recency + has-followup) — shown in list/sort, not stored.

### 3. Lead Detail (`/leads/$id`)

- Already has summary, contacts, products, notes, photos, follow-ups, activity timeline, status select, Call/WhatsApp/Maps.
- Add: Edit History panel (reads `lead_edit_history`), inline "Add Follow-Up", "Add Visit Note", "Upload Photos" actions, and an "Edit Lead" button → `/leads/$id/edit`.

### 4. Edit Lead page (`/leads/$id/edit`)

- Full form covering: site info, contact info, project details, stage, product interests (multi-select chips writing to `lead_products`), notes, next follow-up date.
- Sticky bottom "Save Changes" button.
- `useBlocker` for unsaved-changes warning.
- Autosave drafts to `localStorage` keyed by `draft:lead:<id>`; restore on mount, clear on successful save.
- Duplicate detection on phone/site_name/address: live check against `leads` (excluding current id); shows a non-blocking warning banner with links to potential duplicates.
- Photos section: add new photos (reuse upload helper from `/add`), thumbnail grid with delete.

### 5. Permissions

- Use `has_role(auth.uid(), 'admin')` consistently.
- Client-side: `useIsAdmin()` hook gates bulk actions, reassign, delete, and the assigned-rep filter.
- Server-side: RLS enforces the same.

### 6. Files to create / modify

```
supabase/migrations/<new>.sql          # history table + trigger + assigned_to + RLS update
src/lib/use-role.ts                    # useIsAdmin hook
src/lib/lead-utils.ts                  # leadScore(), filter/sort helpers, CSV export
src/components/leads/LeadCard.tsx      # extracted enriched card
src/components/leads/LeadFilters.tsx   # filter sheet + sort + search
src/components/leads/BulkActionsBar.tsx
src/components/leads/DuplicateWarning.tsx
src/components/leads/EditHistoryList.tsx
src/routes/leads.tsx                   # rewrite: search+filter+sort+bulk+responsive
src/routes/leads.$id.tsx               # add edit-history + quick action buttons
src/routes/leads.$id.edit.tsx          # NEW edit page with autosave + blocker + dup detect
```

### Technical notes

- Keep existing routing flat dot-convention: `leads.$id.edit.tsx`.
- Autosave: debounced 800ms write to `localStorage`, no backend draft table (simpler, meets "if browser closes" requirement).
- Edit history captured at DB layer via trigger so it's always accurate, even from future admin tools.
- CSV export done client-side with a small helper (no new dependency).
- Desktop table uses existing shadcn components; mobile keeps the card flow already in use.

### Out of scope for this pass (call out)

- "Assigned Sales Rep" filter requires a list of users; I'll show profiles where `user_roles.role = 'sales_rep'` (admin sees all reps).
- Lead score is a simple heuristic, not a learned model.
- No real-time collaborative edit conflict resolution (last-write-wins with autosave drafts).

Proceed?
