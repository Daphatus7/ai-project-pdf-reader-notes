# Notebooks Feature

**Date:** 2026-03-18

## Purpose

Add notebook-based organisation to the notes system. Users can group notes into named notebooks. Notes without a notebook appear at the root level of the sidebar.

## Database Changes

Run `migrations/notebooks_2026_03_18.sql` in Supabase SQL Editor before deploying.

- New `notebooks` table: `id`, `user_id`, `name`, `color`, `created_at`, `updated_at`
- `notes` table: new nullable column `notebook_id` (FK → `notebooks.id`, ON DELETE SET NULL)
- RLS policy: users can only access their own notebooks
- Indexes: `idx_notebooks_user_id`, `idx_notes_notebook_id`

**ON DELETE SET NULL**: deleting a notebook uncategorises its notes — notes are never lost.

## API

New endpoints under `/api/v1/notebooks`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notebooks` | List all notebooks for user |
| POST | `/notebooks` | Create notebook |
| PUT | `/notebooks/{id}` | Rename / update colour |
| DELETE | `/notebooks/{id}` | Delete notebook (notes become uncategorised) |

Updated note endpoints:
- `POST /notes` — accepts `notebook_id` (optional)
- `PUT /notes/{id}` — accepts `notebook_id` (explicit `null` = remove from notebook, uses `model_fields_set`)

## Frontend UI

Sidebar layout (top to bottom):
1. Uncategorised notes — displayed directly at root level, no wrapper section
2. Notebook sections — collapsible, each shows its own notes indented

Actions:
- **New Note** button → creates uncategorised note
- **New Notebook** button (BookPlus icon) → creates notebook, inline rename available
- **Note dropdown** → Rename / Move to Notebook (sub-menu) / Export / Delete
- **Notebook header dropdown** → Rename / Delete
- **Notebook header `+`** → creates note assigned to that notebook

## Files Changed

| File | Change |
|------|--------|
| `migrations/notebooks_2026_03_18.sql` | New — SQL migration |
| `src/backend/schemas/note.py` | Added notebook schemas + `notebook_id` to note schemas |
| `src/backend/api/v1/notebooks.py` | New — notebooks CRUD endpoints |
| `src/backend/api/v1/router.py` | Registered notebooks router |
| `src/backend/services/storage/supabase_storage.py` | Added notebook CRUD methods; `notebook_id` in create/update note |
| `src/frontend/api/types/note/note.ts` | Added `Notebook` type; `notebook_id` to `Note` and request types |
| `src/frontend/api/core/config.ts` | Added `notebooks.base` endpoint |
| `src/frontend/api/services/notebooks.service.ts` | New — notebooks API service |
| `src/frontend/components/note/pad/useNotePad.ts` | Added notebooks state; `addNotebook`, `renameNotebook`, `deleteNotebook`, `moveNoteToNotebook` |
| `src/frontend/components/note/pad/note-sidebar.tsx` | Rewritten — grouped layout with notebook sections |
| `src/frontend/components/note/pad/note-pad.tsx` | Passed new notebook props to sidebar |
