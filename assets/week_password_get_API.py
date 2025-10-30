# weak_password_get_API.py (rút gọn, chắc chắn chạy)
from fastapi import APIRouter, HTTPException
import requests, json
from collections import Counter, defaultdict
from datetime import datetime, timezone
import random

router = APIRouter()

# === Nguồn GitHub RAW: mirror của chính bạn + SecLists ===
SOURCES = {
    # mirror JSON của bạn (đổi URL đúng repo của bạn)
    # "gh_mirror_json": "https://raw.githubusercontent.com/thaituan-CODEtooManyBug/passwordAssesmentByAI/main/weak100.json",
    # SecLists 10k (plaintext)
    "seclists_10k": "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10k-most-common.txt",
}

TOP_N = 100
TIMEOUT = 10

def fetch_any(url: str):
    """Trả list[str] password từ JSON array hoặc plaintext."""
    r = requests.get(url, timeout=TIMEOUT)
    r.raise_for_status()
    text = r.text.strip()

    # thử JSON trước
    try:
        data = json.loads(text)
        pw_list = []
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    pw = item.get("password") or item.get("Password") or item.get("pass")
                    if pw: pw_list.append(str(pw))
                elif isinstance(item, str):
                    pw_list.append(item)
        return [p.strip() for p in pw_list if p and p.strip()]
    except Exception:
        # không phải JSON → coi như plaintext
        lines = [ln.strip() for ln in text.splitlines() if ln.strip() and not ln.startswith("#")]
        return lines

def aggregate():
    gathered = {}
    used_sources = []

    for name, url in SOURCES.items():
        try:
            pw_list = fetch_any(url)
            if pw_list:
                gathered[name] = pw_list
                used_sources.append(name)
        except Exception as e:
            print("fetch failed:", name, e)

    if not gathered:
        # fallback cứng nếu toàn bộ fetch fail
        items = [{"password":"123456","count":2,"sources":["fallback"],"score":2}]
        return {"generated_at": datetime.now(timezone.utc).isoformat(), "sources":["fallback"], "items":items}

    cnt = Counter()
    src_by_pw = defaultdict(list)
    for src, arr in gathered.items():
        for pw in arr[:2000]:                 # cắt bớt để nhẹ
            pw = pw.strip()
            if not pw: continue
            cnt[pw] += 1                      # mỗi nguồn +1 (weight đơn giản)
            src_by_pw[pw].append(src)

    items = [{"password": pw, "count": int(c), "score": int(c), "sources": src_by_pw[pw]}
             for pw, c in cnt.most_common()]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sources": used_sources,
        "items": items[:TOP_N],      # top 100 phổ biến nhất
        "all_items": items           # toàn bộ danh sách để random
    }

@router.get("/api/weak100")
def api_weak100():
    try:
        return aggregate()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/api/weak100/randomlist")
def api_weak100_randomlist():
    try:
        data = aggregate()
        all_items = data.get("all_items", [])
        if not all_items:
            all_items = data.get("items", [])
        if not all_items:
            raise HTTPException(status_code=404, detail="No password found")
        random_items = random.sample(all_items, min(100, len(all_items)))
        return {
            "generated_at": data.get("generated_at"),
            "sources": data.get("sources"),
            "items": random_items,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))