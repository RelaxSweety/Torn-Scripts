# Option A — Cloudflare DEV auth worker patch (NOT DEPLOYED)

Source reference: user-provided Cloudflare dashboard bundle, 2026-11-04. Target worker: `tu-multiplayer-server-dev`. This is a **patch specification**, not the complete deployable worker. Do not apply to PROD.

## Verified bindings
- `TU_USERS_DB` → `tu-users-dev` (D1)
- `FOREIGN_DB` → `tu-foreign-stock-dev` (D1)
- `GAME` → `tu-multiplayer-server-dev_GameRoom` (Durable Object)
- `ARCADE` → `tu-multiplayer-server-dev_ArcadeRoom` (Durable Object)
- `MARBLES` → `tu-multiplayer-server-dev_MarbleRoom` (Durable Object)

## Minimal changes to bundled `src/auth.js`

1. In `tornIdentity(key)`, replace:
```js
if (access !== "Public Only") return null;
```
with:
```js
if (access !== "Public Only" && access !== "Limited Access") return null;
const accessLevel = access === "Public Only" ? "public" : "limited";
```

2. Replace:
```js
return { id, username: profile.name };
```
with:
```js
return { id, username: profile.name, accessLevel };
```

3. In `POST /api/auth/register`, immediately after `if (!identity) return respond(...)`, add:
```js
if (body.requested_access !== undefined && body.requested_access !== identity.accessLevel)
  return respond({ error: "Requested access does not match verified Torn API key" }, 400);
```

4. Extend the successful registration response, preserving its existing fields, with:
```js
verified: true,
accessLevel: identity.accessLevel,
playerId: identity.id,
```

**Do not change the published agreement content without increasing its version and re-acceptance handling.** Agreement v1.1 still says Public Only; enabling Limited Access should be coordinated with a versioned terms update before public rollout.

## Preservation and rollback
Before deploying, save/export the exact current deployed DEV worker source and deployment ID. The pasted bundle has not been independently matched to the active deployment. Restore that deployment if DEV auth or module access regresses.

## Validation gates
- JavaScript syntax check on locally modified bundle: passed.
- Diff review: only `tornIdentity` and registration response/validation changed.
- Live Torn API verification: NOT RUN.
- Cloudflare D1/auth/session/agreement integration tests: NOT RUN.
- Actual worker deployment: NOT DONE.
- PROD changes: NONE.

## Known follow-up
The existing TU Manager UI still demands a Public Only key; enabling Limited Access at the worker does not automatically update Manager's key selection UI. The existing published agreement also states Public Only. These need coordinated DEV changes and a versioned agreement decision.
