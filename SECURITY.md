# Security

Stackprint is intentionally local-only and metadata-only.

Please report vulnerabilities through
[GitHub private vulnerability reporting](https://github.com/mahidalhan/stackprint/security/advisories/new).
Do not include real credentials, private profiles, shell histories, or personal
filesystem contents in a report. Use synthetic fixtures.

Security-sensitive changes must preserve these invariants:

- No scan-time network requests or telemetry.
- No file-content, history, cookie, keychain, password-store, or environment
  value collection.
- No username, hostname, home path, or repository-name output.
- No implicit upload, sharing, or publication.
- Extended discovery remains opt-in and clearly labeled.
