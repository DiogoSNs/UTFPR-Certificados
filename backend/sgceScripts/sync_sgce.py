import argparse
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date

import pymongo
import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from unidecode import unidecode
from urllib3.util.retry import Retry

URL_LISTA = "https://apl.utfpr.edu.br/extensao/certificados/listaPublica"
URL_SEARCH = "https://apl.utfpr.edu.br/extensao/certificados/listaCertificadosPublicos/"
REQUEST_TIMEOUT = 25


def create_session() -> requests.Session:
    session = requests.Session()
    retries = Retry(
        total=4,
        backoff_factor=1.0,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"],
    )
    adapter = HTTPAdapter(max_retries=retries, pool_connections=10, pool_maxsize=10)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(
        {"User-Agent": "UTFPR-Certificados-Sync/2.0 (+https://github.com)"}
    )
    return session


def init_db():
    mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
    client = pymongo.MongoClient(mongo_uri)
    db = client["certs"]

    # Ensure indexes for fast search across all campuses and years
    db["events"].create_index("code")
    db["events"].create_index([("code", 1), ("year", 1), ("campus.code", 1)])
    db["events"].create_index("name_search")
    db["events"].create_index([("year", pymongo.DESCENDING)])
    db["events"].create_index("campus.code")

    db["owners"].create_index("name")
    db["owners"].create_index("certs.code")

    return db


def normalize_name(raw_name: str) -> str:
    name = unidecode(raw_name.upper())
    name = name.strip("*.- '\" \xa0\t\r\n")
    name = re.sub(r"\s+", " ", name)
    return name


def discover_campuses_and_years(session: requests.Session):
    resp = session.get(URL_LISTA, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    campuses = []
    campus_select = soup.find("select", attrs={"name": "txtCampus"})
    if campus_select:
        for opt in campus_select.find_all("option"):
            val = (opt.get("value") or "").strip()
            if val:
                campuses.append({"code": val, "name": opt.get_text(strip=True)})

    years = []
    year_select = soup.find("select", attrs={"name": "txtAno"})
    if year_select:
        for opt in year_select.find_all("option"):
            val = (opt.get("value") or "").strip()
            if val:
                years.append(val)

    return campuses, years


def fetch_events_for_campus_year(
    session: requests.Session, campus: dict, year: str
) -> list[dict]:
    resp = session.post(
        URL_LISTA,
        data={"txtCampus": campus["code"], "txtAno": year},
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    event_select = soup.find("select", attrs={"name": "txtEvento"})
    if not event_select:
        return []

    events = []
    for opt in event_select.find_all("option"):
        val = (opt.get("value") or "").strip()
        if not val:
            continue
        event_name = opt.get_text(strip=True)
        events.append(
            {
                "name": event_name,
                "name_search": unidecode(event_name.upper()),
                "code": val,
                "year": year,
                "campus": {"code": campus["code"], "name": campus["name"]},
                "qty_certs": 0,
                "certs": [],
            }
        )
    return events


def fetch_event_certs(session: requests.Session, event: dict) -> tuple[dict, dict]:
    offset = 0
    certs = []
    owners_map: dict[str, list[dict]] = {}

    while True:
        resp = session.post(
            f"{URL_SEARCH}{offset}",
            data={"txtEvento": event["code"]},
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        table = soup.find(id="data_table")
        if not table:
            break

        rows = table.find_all("tr", id=True)
        if not rows:
            break

        for row in rows:
            try:
                cols = row.find_all("td")
                if len(cols) < 3 or not cols[2].a:
                    continue

                owner_name = normalize_name(cols[0].get_text())
                if not owner_name:
                    continue

                href = cols[2].a.get("href", "")
                if "validar/" not in href:
                    continue
                cert_code = href.split("validar/")[1].strip()

                certs.append({"code": cert_code, "owner": owner_name})
                owners_map.setdefault(owner_name, []).append(
                    {
                        "code": cert_code,
                        "year": event["year"],
                        "event_code": event["code"],
                        "event_name": event["name"],
                        "campus": event["campus"]["name"],
                    }
                )
            except Exception as exc:
                print(f"  [warn] failed parsing row in event {event['code']}: {exc}")

        if len(rows) < 15:
            break
        offset += 15

    event["certs"] = certs
    event["qty_certs"] = len(certs)
    return event, owners_map


def save_event_and_owners(db, event: dict, owners_map: dict[str, list[dict]]):
    db["events"].update_one(
        {
            "code": event["code"],
            "year": event["year"],
            "campus.code": event["campus"]["code"],
        },
        {"$set": event},
        upsert=True,
    )

    if not owners_map:
        return

    owner_names = list(owners_map.keys())
    existing_docs = db["owners"].find(
        {"name": {"$in": owner_names}}, {"name": 1, "certs.code": 1}
    )
    existing_codes = {
        doc["name"]: {c["code"] for c in doc.get("certs", []) if "code" in c}
        for doc in existing_docs
    }

    ops = []
    for owner_name, cert_list in owners_map.items():
        known = existing_codes.get(owner_name, set())
        new_certs = [c for c in cert_list if c["code"] not in known]
        if not new_certs:
            continue
        ops.append(
            pymongo.UpdateOne(
                {"name": owner_name},
                {
                    "$setOnInsert": {"name": owner_name},
                    "$push": {"certs": {"$each": new_certs}},
                },
                upsert=True,
            )
        )

    if ops:
        db["owners"].bulk_write(ops, ordered=False)


def sync(
    mode: str = "recent",
    campus_filter: str | None = None,
    year_filter: str | None = None,
    workers: int = 3,
    skip_existing: bool = True,
):
    db = init_db()
    session = create_session()

    campuses, all_years = discover_campuses_and_years(session)
    if campus_filter:
        campuses = [c for c in campuses if c["code"] == campus_filter]

    current_year = date.today().year
    if year_filter:
        years = [y for y in all_years if y == year_filter]
    elif mode == "recent":
        recent_set = {str(current_year), str(current_year - 1)}
        years = [y for y in all_years if y in recent_set]
    else:
        years = all_years

    print(
        f"Starting sync (mode={mode}): {len(campuses)} campus(es), {len(years)} year(s): {years}",
        flush=True,
    )

    total_events_saved = 0
    for campus in campuses:
        for year in years:
            try:
                events = fetch_events_for_campus_year(session, campus, year)
            except Exception as exc:
                print(
                    f"[error] Failed listing events for {campus['name']} ({year}): {exc}",
                    flush=True,
                )
                continue

            if not events:
                continue

            # Skip already-populated historical events when resuming a full sync
            to_fetch = []
            if skip_existing and int(year) < current_year - 1:
                existing_codes = {
                    doc["code"]
                    for doc in db["events"].find(
                        {
                            "code": {"$in": [e["code"] for e in events]},
                            "qty_certs": {"$gt": 0},
                        },
                        {"code": 1},
                    )
                }
                to_fetch = [e for e in events if e["code"] not in existing_codes]
            else:
                to_fetch = events

            if not to_fetch:
                print(
                    f"[{campus['name']} | {year}] {len(events)} events already synced, skipping.",
                    flush=True,
                )
                continue

            print(
                f"[{campus['name']} | {year}] Fetching {len(to_fetch)}/{len(events)} events...",
                flush=True,
            )

            with ThreadPoolExecutor(max_workers=workers) as executor:
                futures = {
                    executor.submit(fetch_event_certs, session, ev): ev
                    for ev in to_fetch
                }
                for fut in as_completed(futures):
                    ev = futures[fut]
                    try:
                        updated_ev, owners_map = fut.result()
                        save_event_and_owners(db, updated_ev, owners_map)
                        total_events_saved += 1
                    except Exception as exc:
                        print(
                            f"  [error] Event {ev['code']} ({ev['name']}): {exc}",
                            flush=True,
                        )

            time.sleep(0.2)

    print(f"Sync finished. Events processed/updated: {total_events_saved}", flush=True)
    try:
        stats = db.command("dbstats")
        storage_mb = stats.get("storageSize", 0) / (1024 * 1024)
        print(f"Database storageSize: {storage_mb:.2f} MB", flush=True)
        if storage_mb > 440:
            print(
                "[WARN] Database storageSize is approaching MongoDB Atlas M0 512 MB limit!",
                flush=True,
            )
    except Exception as exc:
        print(f"[warn] Could not read dbstats: {exc}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync UTFPR SGCE certificates")
    parser.add_argument(
        "--mode",
        choices=["recent", "full"],
        default="recent",
        help="'recent' syncs current and previous year; 'full' syncs all years",
    )
    parser.add_argument("--campus", help="Filter by campus code (e.g. 13)")
    parser.add_argument("--year", help="Filter by year (e.g. 2025)")
    parser.add_argument("--workers", type=int, default=3, help="Concurrent workers")
    parser.add_argument(
        "--no-skip",
        action="store_true",
        help="Re-fetch historical events even if already in DB",
    )
    args = parser.parse_args()

    sync(
        mode=args.mode,
        campus_filter=args.campus,
        year_filter=args.year,
        workers=args.workers,
        skip_existing=not args.no_skip,
    )
