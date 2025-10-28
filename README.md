# Password Assessment by AI

Web + FastAPI nhỏ để đánh giá mật khẩu:
- ZXCVBN: strength, guesses, pattern
- HIBP k-anonymity: kiểm tra rò rỉ
- AI Risk Agent: phân loại rủi ro & gợi ý
- Dashboard UI (dark, gray + yellow)

## Dev quickstart
```bash
python -m venv .venv
. .venv/Scripts/activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
