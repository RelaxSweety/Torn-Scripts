# DEV backend authorization review

Status: source patch and regression fixtures prepared; **not deployed**. Client remains 0.5.42.84-dev. No agreement content, version, acceptance requirement, or publication manifest is changed.

## Finding and fix

The outer router checked Tic-Tac-Toe module access, but GameRoom previously accepted a name and playerId from caller JSON. An authorized user could supply another identity, including bypassing the check against joining their own room.

The successful module authorization check now carries a verified identity through an internal context object. The router overwrites internal identity headers before forwarding to Durable Objects. Tic-Tac-Toe reads that identity instead of caller JSON. A room token for subsequent state/move/rematch actions must also correspond to the authenticated player ID stored for that seat. The context is not a new public response field; externally supplied internal headers are overwritten. The subsequent prepared security candidate also binds Arcade/Marble seats to verified identities, rejects self-joins and serializes all multiplayer Durable Object requests.

Existing clients can keep sending name/playerId; those fields no longer establish Tic-Tac-Toe identity. Normal rooms with correct stored IDs remain usable. Rooms with absent, incorrect or previously spoofed stored IDs will fail ownership checks and must be recreated; there is no insecure legacy bypass. Existing room data is not rewritten.

## Validation

Run `npm run test:backend-safety`. New fixtures execute the Worker router and actual GameRoom with in-memory storage and controlled database/publication responses. They check:

- Pending, suspended/revoked accounts, expired/revoked sessions, missing module permission and missing current agreement cannot reach a game object.
- Database failures return a generic failure, not private exception text.
- Ordinary users cannot call administrator read/write routes, and session revocation is scoped to the authenticated owner.
- Forged body identity and internal headers cannot alter room identity or bypass own-room rejection.
- A different authenticated player cannot use the owner's room token; valid owner and guest state access succeeds.
- Administrators still need the current agreement for module access.

The fixtures assert SQL session expiry/revocation constraints and use database doubles; they do not replace real D1/Cloudflare runtime tests or a complete concurrency/security audit. No live exploit, remote data mutation or Worker deployment was performed.

## Remaining scope

Foreign stock observation and travel-feedback write handlers are outside the current protected-module route list and lack an equivalent authorization gate in this snapshot. Review their intentional crowdsourcing policy and compatible client authentication before changing them. Subsequent source changes address other multiplayer seats, guarded/atomic administrator writes and foreign-write abuse limits; operator access and operational retention remain operational gates. See SECURITY-CANDIDATE.md. These source checks do not prove the live deployment has these fixes or establish Torn staff approval.
