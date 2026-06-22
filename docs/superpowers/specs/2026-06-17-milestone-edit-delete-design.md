# Milestone Edit & Delete

## Summary

Add the ability to edit and delete milestones. Both actions are accessible from the existing detail modal that opens when a user taps a milestone card. The modal gains three states: view, edit, and delete-confirm.

## User flow

1. User taps a milestone card → detail modal opens in **view** state (unchanged)
2. **Edit:** User taps Edit → modal switches to **edit** state with pre-filled editable fields (title, date, photo, notes). User edits and taps Save → Supabase update → modal closes → timeline refreshes. Tapping Cancel returns to view state.
3. **Delete:** User taps Delete → modal switches to **delete-confirm** state showing a red confirmation box. User taps the red Delete button → Supabase delete → modal closes → timeline refreshes. Tapping Cancel returns to view state.

## Modal states

| State | Trigger | Content |
|---|---|---|
| `view` | tap card | title, date, photo, notes, Edit + Delete outline buttons |
| `edit` | tap Edit | editable fields (title, date, ImageUpload, notes), Save + Cancel buttons |
| `delete-confirm` | tap Delete | milestone title/date, red confirmation box ("Delete this milestone? / This can't be undone."), Cancel + red Delete buttons |

## Component changes

### `MilestoneTimeline.tsx`

Add `mode` state: `"view" | "edit" | "delete-confirm"`. When `selected` is set, default to `"view"`. Closing the modal resets both `selected` and `mode`.

**View state additions:** Two outline buttons at the bottom of the modal — Edit (purple border) and Delete (red border).

**Edit state:** Replace modal body with a form containing:
- Title input (pre-filled)
- Date input (pre-filled)
- `ImageUpload` component — shows existing photo preview if `photo_url` exists; user can tap to replace. If no new file is selected, the existing `photo_url` is preserved on save.
- Notes textarea (pre-filled)
- Cancel + Save buttons

On Save:
1. If a new photo file is selected, upload to `dobby-photos` bucket at `{puppy_id}/milestones/{id}.{ext}` using `upsert: true` (overwrites old file at same path using the milestone's existing `id`).
2. Call `supabase.from("milestones").update({...}).eq("id", selected.id)`.
3. Close modal, call `router.refresh()`, show `toast.success(t("toastUpdated"))`.

**Delete-confirm state:** Show a `bg-[#fff5f5]` box with the confirmation message and two buttons (Cancel returns to view, Delete proceeds).

On Delete:
1. Call `supabase.from("milestones").delete().eq("id", selected.id)`.
2. Close modal, call `router.refresh()`, show `toast.success(t("toastDeleted"))`.

## Translations

Add to both `messages/en.json` and `messages/pt.json` under the `milestones` namespace:

```json
"editTitle": "Edit Milestone",
"deleteConfirmTitle": "Delete this milestone?",
"deleteConfirmMessage": "This can't be undone.",
"deleteButton": "Delete",
"cancelButton": "Cancel",
"saveChangesButton": "Save changes",
"toastUpdated": "Milestone updated!",
"toastDeleted": "Milestone deleted."
```

Note: The existing `saveButton` key ("Save milestone") belongs to the add form and stays unchanged. The edit form uses a new `saveChangesButton` key ("Save changes").

## Implementation pattern

- Client-side Supabase calls (same pattern as `new/page.tsx`) — no new server actions needed.
- `useRouter` from `next/navigation` for `router.refresh()`.
- Loading state during save/delete: disable buttons + show a spinner or opacity.
- Error handling: inline error message above the action buttons if the Supabase call fails.

## Out of scope

- Editing milestones from the dashboard `MilestoneCards` component (read-only view, no actions).
- Bulk delete.
- Photo deletion without replacement (user must pick a new photo to change it; existing photo stays if nothing is selected).
