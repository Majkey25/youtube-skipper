# Privacy and use of YouTube Skipper

Updated 5 October 2026. Developer: Matěj Teplý, publishing as Majkey / Majkey25. Contact: [majkeylab@gmail.com](mailto:majkeylab@gmail.com).

## Local processing and SponsorBlock requests

The content script reads the current YouTube video ID and playback position to skip or mark community-reported segments. When skipping is enabled and a category is selected, the background worker sends the first four hexadecimal characters of the video's SHA-256 hash and selected category names to `https://sponsor.ajay.app`. It matches the full video ID against the returned results locally. The prefix reduces disclosure of the exact video; it does not make the connection anonymous.

SponsorBlock and its network providers receive your IP address and normal HTTPS request information. The extension omits credentials from these requests and sends no account identifier, segment submission, vote, or viewing telemetry. See [SponsorBlock's privacy policy](https://gist.github.com/ajayyy/aa9f8ded2b573d4f73a3ffa0ef74f796) and [hash-prefix API documentation](https://wiki.sponsor.ajay.app/w/API_Docs). The developer does not receive these requests and cannot delete records held by SponsorBlock; contact that service for its data practices or requests. SponsorBlock requires a legal guardian's permission for children under 13 to use its service.

Settings, category choices, and theme use `chrome.storage.sync`. When browser-account sync is enabled, your browser provider can store and sync those preferences across devices under its own privacy settings. Video IDs and segment responses are not stored in sync storage. The worker keeps up to 50 response entries, including video IDs, in memory. Cached results are reused for at most ten minutes; entries disappear on eviction or worker termination. There is no developer backend, analytics, advertising SDK, sale of data, or use for profiling. Data is used only to provide the disclosed segment controls.

## Control and deletion

Turn off Enable skipping to stop new segment lookups from open YouTube pages; an already-started request may finish. Disable/remove the extension and reload YouTube pages to stop its scripts. Reset defaults replaces your stored preferences with defaults. Removing the extension removes its local browser-managed settings; use your browser-account sync controls for synced copies and remove the extension on other synced devices where needed. Browser or system backups are separate copies. The developer has no server copy of extension settings or video IDs to delete.

## Cookies and support

The extension sets no cookies and sends no marketing emails. YouTube manages its own account and cookies separately. Opening repository or support links contacts GitHub under [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). Email support receives the address and content you choose to send. Do not post private viewing details publicly. Contact the email above about access to or deletion of support messages, which are kept only as needed to handle the request or meet legal obligations.

## Price, license, and limitations

This release is free, with no purchases, subscriptions, or hidden fees; there is no payment to refund. The [MIT license](LICENSE) covers extension code; [NOTICE.md](NOTICE.md) describes third-party data and attribution. Mandatory consumer rights remain unaffected. This project is independent of YouTube, Google, and SponsorBlock. Community timestamps can be inaccurate; choose Show button or Ignore for categories you do not want automatically skipped. No children's account or age/profile data is requested. Privacy changes will be recorded in this repository.
