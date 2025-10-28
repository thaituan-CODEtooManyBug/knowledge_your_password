# main.py  — Password Analyzer API (VI localization)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import hashlib, requests, math, logging
from zxcvbn import zxcvbn

app = FastAPI(title="Bộ phân tích mật khẩu (VI)")

log = logging.getLogger("uvicorn.error")

# Cho phép FE chạy ở 127.0.0.1:5500 (Live Server) — chỉnh origin khi deploy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# VIET LOCALIZATION MAPPINGS
# ---------------------------
risk_map = {
    "High": "Cao",
    "Medium": "Trung bình",
    "Low": "Thấp",
}

vector_map = {
    "dictionary": "Dựa từ điển",
    "spatial": "Theo bàn phím",
    "repeat": "Lặp ký tự",
    "date": "Ngày tháng / năm sinh",
}

# Gợi ý/ cảnh báo phổ biến từ zxcvbn → VI
suggestion_map = {
    "Add another word or two. Uncommon words are better.": "Thêm một hoặc hai từ nữa. Ưu tiên các từ khó đoán.",
    "Avoid dates and years that are associated with you.": "Tránh dùng ngày/tháng/năm gắn với bạn (sinh nhật, ngày kỷ niệm…).",
    "Straight rows of keys are easy to guess.": "Chuỗi phím liền nhau trên bàn phím rất dễ bị đoán.",
    "Short keyboard patterns are easy to guess.": "Mẫu phím ngắn rất dễ bị đoán.",
    "Predictable substitutions like '@' instead of 'a' don’t help much.": "Thay thế quen thuộc như '@' thay cho 'a' không giúp tăng độ mạnh đáng kể.",
    "Add more random characters.": "Thêm ký tự ngẫu nhiên để tăng độ mạnh.",
    "This is similar to a commonly used password.": "Mật khẩu này giống với mật khẩu phổ biến.",
    "Avoid repeated words and characters.": "Tránh lặp lại từ và ký tự.",
    "Capitalization doesn't help very much.": "Viết hoa không giúp tăng độ mạnh đáng kể.",
    "Common names and surnames are easy to guess.": "Tên và họ phổ biến rất dễ bị đoán.",
    # Có thể bổ sung dần nếu gặp thông điệp mới
    "This is a top-10 common password.": "Đây là một trong TOP 10 mật khẩu phổ biến nhất.",
    "Dates are often easy to guess.": "Ngày tháng thường rất dễ bị đoán.",
    "All-uppercase is almost as easy to guess as all-lowercase.": "Viết hoa toàn bộ gần như dễ đoán như viết thường toàn bộ.",
    "This is a very common password.": "Đây là một mật khẩu rất phổ biến.",
}

# (Tuỳ chọn) serve file HTML nếu để cạnh main.py
# @app.get("/")
# def home():
#     return FileResponse("index.html")

@app.get("/health")
def health():
    return {"ok": True}

# HIBP
HIBP_API = "https://api.pwnedpasswords.com/range/{}"
HIBP_HEADERS = {"User-Agent": "PasswordAnalyzer/1.0 (local dev)"}

class PasswordRequest(BaseModel):
    password: str

def sha1_upper(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest().upper()

def hibp_check(password: str) -> int | None:
    """Trả số lần xuất hiện; None nếu lookup lỗi (không làm vỡ API)."""
    try:
        sh = sha1_upper(password)
        prefix, suffix = sh[:5], sh[5:]
        r = requests.get(HIBP_API.format(prefix), headers=HIBP_HEADERS, timeout=10)
        if r.status_code != 200:
            log.warning("HIBP status %s", r.status_code)
            return None
        for raw in r.text.splitlines():
            line = raw.strip()
            if not line or ":" not in line:
                continue
            h, c = line.split(":", 1)
            if h == suffix:
                try:
                    return int(c)
                except ValueError:
                    return 0
        return 0
    except Exception as e:
        log.exception("HIBP lookup failed: %s", e)
        return None

def fmt_time(seconds: float) -> str:
    if not math.isfinite(seconds) or seconds <= 0:
        return "∞"
    year, day, hour, minute = 31536000, 86400, 3600, 60
    if seconds >= year:   return f"{seconds/year:.2f} năm"
    if seconds >= day:    return f"{seconds/day:.2f} ngày"
    if seconds >= hour:   return f"{seconds/hour:.2f} giờ"
    if seconds >= minute: return f"{seconds/minute:.2f} phút"
    return f"{seconds:.4f} giây"

@app.post("/api/check")
def check_password(req: PasswordRequest):
    try:
        pw = (req.password or "").strip()
        if not pw:
            raise HTTPException(400, "Vui lòng nhập mật khẩu để kiểm tra")

        # Phân tích bằng zxcvbn
        z = zxcvbn(pw)
        guesses = float(z.get("guesses", max(1.0, 2 ** (len(pw) * 4))))
        mobile_s  = guesses / 1e3     # CPU điện thoại
        desktop_s = guesses / 1e7     # GPU máy tính
        cloud_s   = guesses / 1e10    # Cloud siêu mạnh
        hibp_count = hibp_check(pw)  # None nếu lookup lỗi

        # Điểm & nhãn rủi ro (EN → VI)
        score = int(z.get("score", 0))
        risk_en = "High" if score <= 1 else ("Medium" if score == 2 else "Low")
        risk_vi = risk_map.get(risk_en, "Không xác định")

        # Risk classification logic
        score = z.get("score", 0)
        entropy = z.get("entropy", 0)
        pw_len = len(pw)

        # Default
        risk_level = "Thấp (Tương đối an toàn)"
        attack_vector = "Không xác định"

        # Nếu bị rò rỉ → HIGH risk bất kể điểm
        if hibp_count and hibp_count > 100:
            risk_level = "Rất cao (Đã rò rỉ nhiều lần)"
            attack_vector = "Rò rỉ dữ liệu"
        elif hibp_count and hibp_count > 0:
            risk_level = "Cao (Đã bị rò rỉ)"
            attack_vector = "Rò rỉ dữ liệu"
        # Nếu score kém hoặc đoán được nhanh
        elif score <= 1 or entropy < 30 or pw_len < 6:
            risk_level = "Trung bình (Yếu)"
            attack_vector = "Dễ đoán"
        # Nếu có pattern lặp
        elif any(p * 3 in pw for p in set(pw)):
            risk_level = "Cao (Lặp ký tự)"
            attack_vector = "Lặp ký tự"
        # Nếu quá ngắn
        elif pw_len < 8:
            risk_level = "Trung bình (Ngắn)"
            attack_vector = "Độ dài yếu"

        # Trả về trong JSON

        # Suy luận vector tấn công (EN → VI)
        vectors_en = []
        for m in z.get("sequence", []):
            p = m.get("pattern")
            if p == "dictionary": vectors_en.append("dictionary")
            elif p == "spatial":  vectors_en.append("spatial")
            elif p == "repeat":   vectors_en.append("repeat")
            elif p == "date":     vectors_en.append("date")
        vectors_vi = ", ".join(sorted({vector_map.get(v, v) for v in vectors_en})) or "Không xác định"

        # Việt hoá gợi ý & cảnh báo
        suggestions_en = z.get("feedback", {}).get("suggestions", []) or []
        suggestions_vi = [suggestion_map.get(s, s) for s in suggestions_en]
        warning_en = z.get("feedback", {}).get("warning", "") or ""
        warning_vi = suggestion_map.get(warning_en, warning_en)

        return {
            "score": score,
            "guesses": guesses,
            "pwned": (None if hibp_count is None else hibp_count > 0),
            "pwned_count": hibp_count,
            "crack_time": {
                "mobile":  fmt_time(guesses/1e3),
                "desktop": fmt_time(guesses/1e7),
                "cloud":   fmt_time(guesses/1e10),
            },
             "crack_time_seconds": {            # <— thêm block này
             "mobile":  mobile_s,
             "desktop": desktop_s,
             "cloud":   cloud_s
    },
            "risk_level": risk_vi,          # ← tiếng Việt
            "attack_vector": vectors_vi,       # ← tiếng Việt
            "suggestions": suggestions_vi,     # ← tiếng Việt
            "warning": warning_vi,             # ← tiếng Việt
        }

    except HTTPException:
        raise
    except Exception as e:
        log.exception("API /api/check error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
