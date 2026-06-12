#!/usr/bin/env sh
# Daily Phase-0 run — invoked by the host scheduler at 04:30 UTC (07:30 Asia/Amman).
# Each stage is idempotent and degrades to a no-op when its services are unset.
set -eu

python -m pipeline.run digest      # scrape → normalize → dedupe → match → email
python -m pipeline.run deadlines   # Telegram deadline alerts
python -m pipeline.run sweep       # close past tenders + expire lapsed subscriptions
