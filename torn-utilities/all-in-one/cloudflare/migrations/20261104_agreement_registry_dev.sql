-- Apply ONCE to DEV TU_USERS_DB (tu-users-dev). Do not run against PROD.
-- Existing tu_agreement_events remains unchanged.
CREATE TABLE IF NOT EXISTS tu_agreement_registry (
  agreement_number INTEGER PRIMARY KEY,
  agreement_version TEXT NOT NULL UNIQUE,
  agreement_date TEXT NOT NULL,
  content TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0 CHECK(is_current IN (0,1)),
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS tu_agreement_one_current ON tu_agreement_registry(is_current) WHERE is_current=1;
INSERT OR IGNORE INTO tu_agreement_registry(agreement_number,agreement_version,agreement_date,content,is_current)
VALUES (3,'1.2','2026-11-04','# Torn Utilities Terms and Information Use Agreement

Version: 1.2
Agreement number: 3
Effective date: 2026-11-04

## Terms of Use
Torn Utilities (TU) is independent of Torn City and is provided as-is. Use is optional and subject to Torn rules and applicable law.

## Information Use
TU may process Torn identity, gameplay information, market observations, and user-entered settings. Approved TU features may transmit observations and multiplayer activity to TU services for functionality and analysis.

## API Keys and Storage
TU accepts Torn Public Only or Limited Access API keys for supported features. Use the least-privileged key sufficient for the feature you enable. Limited Access keys may expose additional Torn account or gameplay information to the features you authorize; TU must not request Full Access keys for registration. TU verifies the key''s access level and player identity with Torn. TU uses local storage for settings and agreement cache, and its backend records agreement events against a verified Torn player ID. Do not share API keys or session tokens.

## Third-party Services and Retention
TU may use Torn API, GitHub, and Cloudflare. Shared observations and gameplay records may be retained. A comprehensive retention schedule has not yet been published.

## Prohibited Activities
Unauthorized modification, redistribution, or manipulation of TU scripts; tampering with TU server connections, requests, authentication, or reporting; and automated scraping, bulk extraction, reverse engineering of nonpublic service interfaces, or data mining of TU-hosted information are strictly prohibited. This does not prohibit approved TU features, access to your own information, security research permitted by applicable law, or other rights that cannot lawfully be restricted.

## User Choice
You may decline and review the information page, but TU modules require acceptance. You may stop using TU and remove locally stored information.

## Agreement
By accepting, you consent to the described processing and confirm review of these terms. Acceptance is recorded by the TU backend. A new agreement version requires renewed acceptance.
',0);
-- Publish 1.2 atomically; do not modify prior agreement records.
UPDATE tu_agreement_registry SET is_current=0 WHERE is_current=1;
UPDATE tu_agreement_registry SET is_current=1 WHERE agreement_number=3 AND agreement_version='1.2';
-- Verify: SELECT agreement_number,agreement_version,agreement_date,is_current FROM tu_agreement_registry;
