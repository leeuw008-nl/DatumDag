import json
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API = "https://weblog.oudommen.nl/wp-json/wp/v2/posts"
OUT = Path("oudommen-events.json")

def fetch_page(page: int):
    params = {
        "page": page,
        "per_page": 100,
        "orderby": "date",
        "order": "asc",
        "status": "publish",
        "_fields": "date,link,title",
    }
    url = API + "?" + urlencode(params)
    req = Request(url, headers={"User-Agent": "DatumDag GitHub Actions"})
    with urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))

def main():
    posts = []
    page = 1
    while True:
        try:
            batch = fetch_page(page)
        except Exception as exc:
            print(f"Stop bij pagina {page}: {exc}")
            break
        if not batch:
            break
        for post in batch:
            title = ((post.get("title") or {}).get("rendered") or "").strip()
            date = (post.get("date") or "").strip()
            link = (post.get("link") or "").strip()
            if date:
                posts.append({
                    "date": date,
                    "title": title,
                    "link": link,
                })
        print(f"Pagina {page}: {len(batch)} artikelen")
        if len(batch) < 100:
            break
        page += 1
        time.sleep(0.2)

    posts.sort(key=lambda p: p["date"])
    OUT.write_text(json.dumps(posts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Totaal opgeslagen: {len(posts)} artikelen")

if __name__ == "__main__":
    main()

# Feed is refreshed automatically by GitHub Actions.
