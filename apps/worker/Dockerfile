# MUNAQQIB worker — scrape → match → digest → notify, as a one-shot container.
# Run on any host with a scheduler (Railway/Render/Cloud Run/VPS cron). No GitHub
# Actions required. Build context is the REPO ROOT:
#   docker build -t munaqqib-worker -f apps/worker/Dockerfile .
FROM python:3.12-slim

WORKDIR /app

# Full runtime: scrapers + embeddings + analyzer. For a lean keyword-only image
# (no torch), swap requirements.txt → requirements-dev.txt below.
COPY apps/worker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/worker/ ./

ENV TZ=Asia/Amman PYTHONUNBUFFERED=1

# One-shot daily run; the host scheduler invokes the container on a cron schedule.
CMD ["sh", "scripts/daily.sh"]
