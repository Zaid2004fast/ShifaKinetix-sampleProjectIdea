---
name: Prototype build convention
description: The durable boundary used for the first ShifaKinetix prototype.
---

The prototype should make the clinical flow explorable end to end before introducing persistence or external integrations.

**Why:** The project is intended for a defense/demo context where reviewers need to see the safety boundaries, role handoffs, and approval gates without setup friction.

**How to apply:** Preserve explicit distinctions between direct booking, symptom intake, and patient-initiated physio; keep safety and doctor-approval states visible when adding backend persistence or real payment/verification integrations.