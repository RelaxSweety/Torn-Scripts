# TU Manager production compatibility audit — 2026-10-23

## Status: BLOCKED — do not promote

- Production Manager: 0.4.42 on main.
- Development Manager: 0.4.65-dev on dev/agreement-lifecycle-integration.
- Development authentication endpoint is hardcoded in the DEV Manager.
- Development diagnostic controls must not be shipped.
- Production backend main lacks the new src/auth.js implementation.
- Backend main and dev/tu-user-auth have diverged. Do not merge DEV wholesale.
- Production authentication D1 bindings, migrations and agreement availability have not been independently validated.

## Release gates

1. Prepare and test a production authentication backend with production-specific database bindings, migrations and agreement ledger.
2. Confirm production endpoint behavior, session revocation and agreement reacceptance.
3. Parameterize Manager authentication endpoint and local session storage by build target; do not reuse DEV sessions in production.
4. Strip diagnostic controls and test utilities from the production Manager candidate while preserving normal user settings.
5. Run production diagnostic guard and JavaScript syntax checks on the built candidate.
6. Compare candidate to main, regression-test PDA on a separate install, and document rollback.
7. Promote only after explicit release approval.

The production candidate builder intentionally fails until backend endpoint and update URL separation is completed. It must not be used to publish the raw DEV Manager.
