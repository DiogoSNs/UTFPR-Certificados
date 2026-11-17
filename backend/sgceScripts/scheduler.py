import os
import time
from datetime import datetime, timedelta

from sync_sgce import sync

SYNC_HOUR = int(os.environ.get("SYNC_HOUR", "3"))
RUN_ON_START = os.environ.get("RUN_ON_START", "false").lower() == "true"


def seconds_until_next_run(target_hour: int) -> float:
    now = datetime.now()
    next_run = now.replace(hour=target_hour, minute=0, second=0, microsecond=0)
    if next_run <= now:
        next_run += timedelta(days=1)
    return (next_run - now).total_seconds()


def run_safe():
    print(f"[{datetime.now().isoformat()}] Starting scheduled recent sync...", flush=True)
    try:
        sync(mode="recent")
    except Exception as exc:
        print(f"[{datetime.now().isoformat()}] Scheduled sync failed: {exc}", flush=True)


def main():
    print(
        f"Scheduler started (daily sync at {SYNC_HOUR:02d}:00, run_on_start={RUN_ON_START})",
        flush=True,
    )
    if RUN_ON_START:
        run_safe()

    while True:
        wait_seconds = seconds_until_next_run(SYNC_HOUR)
        next_dt = datetime.now() + timedelta(seconds=wait_seconds)
        print(
            f"Next automatic sync scheduled for {next_dt.strftime('%Y-%m-%d %H:%M:%S')}",
            flush=True,
        )
        time.sleep(wait_seconds)
        run_safe()


if __name__ == "__main__":
    main()
