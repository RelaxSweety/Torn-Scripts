# DEV .119 — temporary access approval, key messages and reservation windows

TU **0.5.42.119-dev**, War Organizer **0.3.30-dev**. Item Monitor remains
1.12.57-dev. No production or agreement changes.

The owner authorized temporary approval of all regular DEV users until an admin
approval workflow is developed. `TU_AUTO_APPROVE_USERS=true` on the DEV Worker
makes new verified registrations active regular users and upgrades existing
pending regular sessions. Existing pending regular accounts are also approved
by the operator at rollout. No admin role is assigned. Explicit suspensions,
revocations and per-module denials remain enforced. Known TU modules are
available to active users when no explicit module decision exists; arbitrary
module IDs are not authorized. Agreement acceptance, verified key ownership,
faction membership and native War leadership/delegation checks remain required.
Disabling this DEV flag restores pending-registration/default-deny behavior for
future registrations without downgrading already approved users.

Module denial responses now identify TU approval/session/agreement or explicit
module restrictions. They do not imply that Torn suspended a key. The client
previously set a persistent generic key-rejection flag on any registration
401/403, including TU account/access failures. It now pauses only after a known
Torn key-error code. Old generic `TU_VERIFICATION_REJECTED` flags are ignored;
real Torn error flags remain blocked until successful explicit key verification.
The message clearly describes a **TU local pause**, includes the Torn error
number, and does not claim TU suspended a Torn account. Saved-key rechecking is
now labeled **Verify key**. This does not reactivate a key paused/restricted by
Torn or its owner, and no real user keys are requested or tested for this release.

The reservation window before hospital release now supports **00:01–10:00**.
War Settings has quick presets and separate editable Minutes/Seconds fields.
The shared value remains integer seconds (1–600); zero, fractions, invalid
seconds/minutes and totals over ten minutes are rejected. The server enforces
the same limits and existing stale-setting/admin checks. Attack Forfeit Time is
unchanged (None or up to 60 seconds); this change affects the reservation window.

Validation: build/full regression suite; targeted backend authorization/race and
credential tests; real local SQLite automatic-approval tests; governor legacy
flag/real-error behavior; War UI conversion/presets; server range boundaries.
Complete generated-bundle Chromium checks cover desktop, portrait and landscape,
including saving 02:30 and 10:00 and read-only member settings.
[Evidence](evidence/war-coordination-119/validation.json).
All automated identities, credentials and transport responses are synthetic.
No real user keys or gameplay requests are used. Approved account metadata is
checked separately on DEV; private user records are not included in this public
release evidence. Production remains unchanged.
