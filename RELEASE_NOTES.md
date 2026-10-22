# YouTube Skipper v2.0.4

## Changed

- Limit SponsorBlock responses to 1 MiB, 4,096 candidate videos, and 512 matching segments.
- Cap concurrent lookups at 50 and cancel oversized responses before parsing or caching them.
- Pin release actions to reviewed commits and update the vulnerable brace-expansion build dependency.

## Install

Download `youtube-skipper.zip`, extract it, and load the extracted folder through `chrome://extensions` in Developer mode.
