---
name: Check Multi-Tenant Compliance
description: Reviews the current file or selection to ensure database queries correctly filter by sucursal_id.
---

# Multi-Tenant Compliance Skill

When this skill is invoked, review the provided code to ensure strict multi-tenant isolation.

1. **Check for `supabase` queries:** Identify any Supabase operations (`select`, `insert`, `update`, `delete`).
2. **Verify `sucursal_id`:** Ensure that `.eq('sucursal_id', sucursalActiva.id)` is appended to the query.
3. **Report:** If the `sucursal_id` filter is missing, output the corrected code snippet. If it is present, simply reply "The code is multi-tenant compliant."
