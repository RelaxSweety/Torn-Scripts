# Credential storage isolation — DEV .84

## Implemented scope

Known userscript managers with verified synchronous GM_getValue/GM_setValue support (and no detected PDA bridge) now use a single userscript-private credential record. The active login key, saved-key ring, selected War Organizer key, legacy additional keys and login-clear marker are read/written through that record. The record is not encrypted; isolation means raw saved keys are no longer stored in Torn-origin credential fields.

Legacy migration copies and verifies the complete private record before removing origin credential copies. Saved-key metadata from the canonical ring is preserved; legacy extra-key role labels remain unverified. Conflicting legacy login/role keys are retained as additional saved entries instead of silently replacing an existing private selection. Encoded legacy GM login values are normalized. The legacy GM login field is cleared only after the private copy is verified. A private write/readback failure leaves the original data intact and blocks use rather than silently saving new credentials in origin storage.

The Settings API Keys page reports which mode is active. Private saved-key inputs contain no raw key until an actual trusted Show press; Hide removes the value again. A synthetic page click cannot reveal a saved private key. The agreement key input is not prepopulated with a private selected key; acceptance uses the selected value from its closure when the user has not typed a replacement. These are runtime storage/security changes, not implementation of the queued agreement 1.3.

Only actual login-key/clear-marker changes send a nonsensitive cross-tab revision signal. Metadata updates do not repeatedly force other tabs to reauthenticate. Existing saved-key selection, account-owner checks and targeted removal remain in place. Credentials remain excluded from TU backups; the new private record is not part of origin/module backup enumeration.

## Explicit limits

- PDA or unsupported/unverified storage environments continue to use unencrypted Torn-origin storage and disclose this in API Keys. Do not describe this fallback as isolated storage.
- Revealing a key, or typing/pasting one into a page input, makes that value available to page scripts while present in that input. Storage isolation is not a complete defense against a compromised page, browser, extension or userscript manager.
- Userscript-manager export/sync/backups depend on that manager's settings. TU does not claim those copies are encrypted or deleted automatically.
- Existing TU session tokens in sessionStorage and callable Manager data APIs are separate exposure surfaces. This change does not isolate every token or eliminate every same-origin data-access concern.
- Keys are still sent over HTTPS to Torn for enabled API reads and to TU's backend for registration verification as previously disclosed. Backend log redaction, operator access and deployed retention remain unverified operational tasks.
- Full cross-tab atomic credential editing is not provided by synchronous GM record writes. Avoid editing the saved-key list simultaneously in multiple tabs. Login change notifications do not contain the key itself.

## Agreement hold

The exact approved agreement draft remains retained and inactive. Before eventual agreement implementation, its storage section will need a reviewed amendment describing the new private mode and explicit PDA fallback. Do not silently alter the approved draft or publish it merely to document this code change. The active manifest remains agreement 1.2 / number 3.

## Verification

Tests cover verified migration, multiple/legacy keys, role metadata, private reload/removal, no origin credential copies, no raw masked DOM values, trusted reveal/hide, additions after migration, write failure safety, login-only cross-tab revision signals and PDA fallback. Manager integration tests also confirm that private-storage failure shows an alert and does not fall back to legacy-key API reads.
