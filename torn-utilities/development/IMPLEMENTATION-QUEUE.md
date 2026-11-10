# Implementation queue

## Approved agreement 1.3 — queued, explicitly not implemented

The user approved [this exact agreement draft](../agreements/drafts/1.3-approved-not-active.md) in this conversation and explicitly instructed that it not yet be implemented. Do not edit the active agreement manifest, serve this text as current, trigger renewed acceptance, or deploy agreement changes until the user authorizes implementation.

SHA-256 of approved draft: `ca2902b5cb38dd69ebdcd2c6cd8b0e7aa816796ccd339e81668df31a199e9d25`.

Current active checked-in agreement remains 1.2 / number 3. The draft proposes 1.3 / number 4; check availability before eventual publication. Approval of the draft does not fill its private-support-contact placeholder or establish deployed retention/logging controls or the external YATA terms URL. Preserve the approval; resolve these publication details during implementation without treating the entire draft as unapproved again.

Required eventual work: finish the private contact/external terms details; verify operational claims; render the disclosure table at every key-entry surface; verify opt-in and key/data behavior; test renewed acceptance; then publish to DEV only when authorized. Never publish merely by updating the active manifest as a bookkeeping step.

## Completed next issue — TU client API request management (.83)

Implemented a shared TU client request budget across keys, persistent suspension of invalid/disabled keys, explicit user verification to restore a suspended key, and structured limit errors. Cover Manager and bundled-module API transports without modifying Torn website gameplay requests. Account-wide traffic from unrelated applications and server-side verification requires separate coordination; do not claim this client budget controls it.

Validation: full DEV regression suite and targeted API governor tests passed. See [scope and limitations](../all-in-one/docs/API-REQUEST-GOVERNOR.md). This client safeguard does not control unrelated applications or replace server-side/IP-level management.

## Remaining audit work (not started in this change)

Credential-storage isolation and operational key/log protection; current Torn scripting-rule/approval verification and the inherited Chat Archiver questions; backend-wide request/retention/access verification. Agreement UI/publication work stays queued under the explicit hold above.
