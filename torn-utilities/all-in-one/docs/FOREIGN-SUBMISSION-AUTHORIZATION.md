# Prepared foreign submission authorization

Status: **unpublished source/preview only**. Worker deployment and agreement publication remain held. Normal DEV 0.5.42.84-dev distribution files are unchanged.

## Changes

The checked-in Worker now gates `/api/foreign/observations` and `/api/foreign/feedback` through the existing Item Monitor module authorization. A valid TU session, active account, granted Item Monitor permission (or administrator role) and current existing agreement acceptance are required. Unauthorized requests cannot reach either write handler. This does not publish agreement 1.3 or change the current terms.

Request bodies are read incrementally with limits of 16000 bytes for observations and 8192 for feedback, including chunked requests without Content-Length. Invalid/oversized streamed JSON returns 400; observations with an explicitly oversized Content-Length retain the existing 413 response. Feedback projection JSON contains only country, item ID, capture time, predicted arrival, forecast start and forecast end. Extra caller-provided fields are not stored. The existing item count, number and timestamp validations remain.

A prepared client adapter adds the TU bearer session only to these exact DEV submission routes. Fetch/GM use the integrated transport wrapper; PDA POST now has an equivalent wrapper in the preview. Torn website actions, public API calls, production Worker URLs and stock read routes are unaffected. Reporting opt-in and queue acknowledgments remain unchanged.

## Unpublished client validation

Run `npm run test:foreign-submissions` to generate a preview under `/tmp` and test actual integrated queued reporting with simulated PDA POST, GM and fetch. The preview uses the next DEV version (.85 for this batch) and automatic updates disabled. It is a test artifact, not a release or installation recommendation. No rolling or immutable published release is written.

Normal `node scripts/build-dev.mjs --check` still verifies the original .84 artifacts byte for byte. The preview-only integration must be promoted into a separately versioned client release before rollout. `npm run test:backend-safety` checks successful authorized writes, unauthorized rejection, streamed body cancellation and feedback field minimization in controlled database fixtures. These tests do not establish live Cloudflare/PDA app behavior.

## Coordinated rollout required

Current published .84 clients lack authenticated submission headers. Deploying this Worker source alone would reject their queued submissions. Plan and validate a compatible client-first rollout/version requirement before any separately authorized Worker deployment. Do not introduce an anonymous-write fallback to conceal that incompatibility. No migration of historical observations or newly stored player identities is included.

Authorization does not prevent a permitted account from fabricating data or flooding write handlers. Per-account/IP/global submission rate limits and ambiguous-time filtering are now prepared in the security candidate; independent truth verification, operator controls and retention remain separate operational work. Public stock read endpoints remain public; authentication changes here apply to writes. No claim is made that these routes are already secured in the live deployment.

The consolidated candidate also hardens sessions, upload cooldown/receipts and multiplayer/admin handling; see [current security scope](SECURITY-CANDIDATE.md).
