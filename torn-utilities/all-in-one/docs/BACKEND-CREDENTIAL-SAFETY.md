# DEV Worker credential and error handling

Status: source prepared and tested; **not deployed**. Client DEV remains 0.5.42.84-dev. Active agreement 1.2 and the approved, unpublished 1.3 draft are unchanged.

Registration accepts only the documented 16-character alphanumeric key, supported platform and optional requested access. Request streams are limited to 2048 bytes before JSON parsing, including bodies without Content-Length. Verification still makes at most two read-only Torn API requests with the key in the Authorization header.

Torn quota/IP errors return 429 with Retry-After; service/network/identity failures return 503; rejected keys return 401 and unsupported access returns 403. This prevents temporary verification failures being classified as rejected keys by the client. No automatic retry is added. The existing eight-second verification timeout remains.

Public responses exclude arbitrary exception messages. Root request and scheduled collector failure logs use fixed event codes. Agreement conflicts retain structured excerpts of public agreement text. YATA collection health records use a fixed failure description. Existing registration stores session-token hashes and no raw API key in its database bindings; tests assert these properties with secret canaries.

Run `npm run test:backend-safety`. Fixtures cover valid registration, mismatched identity, unsupported access, Torn errors and HTTP failures, oversized streamed requests, database failures and unexpected route failures. No live Torn actions or Cloudflare deployment are performed.

These checks do not establish Cloudflare platform log configuration, retention, operator access, server-wide rate limiting, or the behavior of the deployed Worker. Review those independently before deployment. The Worker source snapshot is separate from the client build; pushing this source does not deploy it through the checked-in validation workflow.
