# YouTube Skipper v2.0.3

## Changed

- Share an in-flight SponsorBlock lookup when requests use the same video and category key.
- Bound pending reuse to 50 entries and clear it after success, failure, or the existing request timeout.
- Ten matched fixed-delay lab runs reduced ten simultaneous duplicate requests to one. Median completion remained 92.4 ms; this saves requests rather than claiming faster server responses.

## Install

Download `youtube-skipper.zip`, extract it, and load the extracted folder through `chrome://extensions` in Developer mode.
