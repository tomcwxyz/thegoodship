# Privacy publication and Garmin readiness — review before merge

Drafted 30 October 2026. This is a **publication candidate**, not legal advice or a claim that Event is Garmin-approved.

## Publication checks
- [ ] Confirm that the controller is The Good Ship Ltd and the publicly registered office is acceptable to display on the site (Companies House company 12415213).
- [ ] Check that `tom@good-ship.co.uk` is monitored for privacy requests and withdrawals.
- [ ] Confirm Plausible, Cloudflare D1 newsletter retention, Google Fonts, payment/booking data, and operational suppliers are accurately described.
- [ ] Decide and implement concrete retention and deletion schedules for enquiries, mailing-list entries, sponsor webhook captures and Event athlete records.
- [ ] Audit any request to delete newsletter/sponsor information: today the website offers email contact rather than an in-page unsubscribe or deletion tool.
- [ ] Confirm which products are legally operated by The Good Ship Ltd and add separate notices over time; do not automatically cover separately controlled client projects.
- [ ] Review access controls, privacy-request procedures, processor contracts, international transfer mechanisms, and ICO fee registration position.
- [ ] Seek appropriate UK data protection/legal review for the final public claims.

## Event / Garmin launch gates
- [ ] Obtain Starter access and check the exact current Garmin terms accepted by the company.
- [ ] Register approved redirect URLs and server-to-server push/webhook endpoints; validate signatures/authentication, retries, duplicates, ownership and secure storage.
- [ ] Specify exactly which Garmin data enters Event; prefer Activity + Training first, optional Health separately, no Women's Health access for v1.
- [ ] Perform an Article 6/9 legal-basis and DPIA assessment for sensitive athlete and health data; document explicit-consent purpose and version.
- [ ] Implement recorded, granular explicit consent before accessing or analysing optional special-category health/recovery data; withdrawal must prevent future processing.
- [ ] Do not send Garmin-sourced information to an AI provider until Garmin terms, provider/subprocessor disclosure, consent, withdrawal and data minimisation are verified.
- [ ] Implement athlete export, full account deletion, provider disconnection and historical-import deletion with test coverage; make retention claims match actual behaviour.
- [ ] Verify that current Strava OAuth/heart-rate processing has appropriate notice and consent mechanisms.
- [ ] Review AI Gateway's underlying model provider, retention policy and cross-border transfer arrangements before enabling Garmin AI uses.
- [ ] Keep provenance for Garmin vs Strava and deduplicate activities before any training metrics are aggregated.
- [ ] Link privacy notice from Event sign-in, provider-connect and settings flows, not just from The Good Ship footer.

## Candidate URLs (not live until this branch merges and deployment succeeds)
- https://good-ship.co.uk/privacy/
- https://good-ship.co.uk/privacy/event/

## Sources to re-check
- https://developer.garmin.com/gc-developer-program/overview/
- https://www.garmin.com/en-US/forms/StarterGarminConnectDeveloperAccess/
- https://www8.garmin.com/en-US/GARMINCONNECTDEVELOPERPROGRAMAGREEMENT/GARMINCONNECTDEVELOPERPROGRAMAGREEMENT_EN.pdf
- https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/how-to-write-a-privacy-notice-and-what-goes-in-it/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/
