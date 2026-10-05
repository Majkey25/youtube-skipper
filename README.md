<p align="center">
  <img src="assets/banner.svg" alt="YouTube Skipper banner" width="100%">
</p>

<p align="center">
  <a href="https://github.com/Majkey25/youtube-skipper/releases/latest/download/youtube-skipper.zip"><img src="https://img.shields.io/badge/DOWNLOAD-LATEST_RELEASE-ff1744?style=for-the-badge" alt="Download latest release"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-black?style=flat-square" alt="Manifest V3">
  <img src="https://img.shields.io/badge/Chrome-121%2B-black?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome 121+">
  <img src="https://img.shields.io/github/actions/workflow/status/Majkey25/youtube-skipper/ci.yml?branch=main&style=flat-square&label=build" alt="Build status">
  <img src="https://img.shields.io/github/v/release/Majkey25/youtube-skipper?style=flat-square&color=black" alt="Latest release">
  <img src="https://img.shields.io/github/license/Majkey25/youtube-skipper?style=flat-square&color=black" alt="MIT license">
</p>

<p align="center">A focused Chrome extension that skips sponsors and other community-reported YouTube segments.</p>

<p align="center">
  <img src="assets/preview.svg" alt="YouTube Skipper popup preview" width="760">
</p>

## What it does

- Automatically skips selected SponsorBlock categories.
- Shows a native-like manual skip button for categories you want to review first.
- Adds optional timeline markers and compact skip notices.
- Supports regular YouTube, YouTube Music, and mobile YouTube pages.
- Uses SponsorBlock's privacy-preserving hash-prefix API endpoint.
- Adds no analytics, telemetry, accounts, ad filtering, or unrelated browser access.

## Install

1. Download **[youtube-skipper.zip](https://github.com/Majkey25/youtube-skipper/releases/latest/download/youtube-skipper.zip)** from the latest release.
2. Extract it to a permanent folder.
3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.
6. Refresh open YouTube tabs.

Chrome cannot install an unsigned ZIP directly. Use the GitHub Release asset, not GitHub's automatically generated source archive.

## Segment modes

| Mode | Behavior |
| --- | --- |
| **Auto skip** | Jumps to the end as soon as the segment starts. |
| **Show button** | Displays a neutral YouTube-style skip control. |
| **Ignore** | Leaves the segment untouched. |

Default automatic categories are **Sponsor** and **Self promotion**. Filler defaults to **Ignore** because it can remove content viewers may want to keep.

## Permissions

| Access | Reason |
| --- | --- |
| `storage` | Saves segment modes, marker/notices settings, and theme. |
| `https://sponsor.ajay.app/*` | Fetches crowdsourced segment timestamps. |
| YouTube content-script matches | Runs the skipper only on supported YouTube pages. |

The extension does not request access to every website.

## Privacy

The worker hashes the YouTube video ID and sends only the first four SHA-256 characters in the SponsorBlock request path. It then selects the exact video from the returned prefix group. Segment responses are cached in memory for ten minutes, with a maximum of 50 entries.

The developer receives no browsing history, analytics, or telemetry. SponsorBlock and its network providers receive your IP address, hash prefix, categories, and normal connection information. The hash prefix reduces video disclosure; it does not make requests anonymous. Turn off skipping to stop new lookups. See [privacy, data deletion, and terms of use](PRIVACY.md).

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm test
npm run build
npm run package
```

The unpacked extension is written to `dist/extension/`. Release ZIP files are written to `dist/release/`.

## Attribution

[SponsorBlock](https://github.com/ajayyy/SponsorBlock) provides the crowdsourced segment API. This project is independent and is not affiliated with YouTube, Google, or SponsorBlock.

## License

MIT. See [LICENSE](LICENSE).
