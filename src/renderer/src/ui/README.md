# ui/ — look-preserving primitives

Reusable React shells that replicate the v2 visual language (collapsible header, overlay chrome) so every
panel looks consistent. Styling comes from the design tokens in `app/global.css`.

| File | Role |
|------|------|
| `Panel.tsx` / `Panel.module.css` | Panel shell with header + collapse (the SummonsPanel pattern). |
| `Modal.tsx` / `Modal.module.css` | Modal/overlay shell. |

Smaller shared components (icons) live in [`../shared/components/`](../shared/components/).
