#!/usr/bin/env python3
"""data/*.json -> assets/data.js

Sitede kullanılan kompakt veri dosyasını üretir.
Veriyi güncelledikten sonra: python3 tools/build_data.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return json.load(f)


alan = load("data/yetkinlik_alan.json")
uni = load("data/yetkinlik_universite.json")
meta = load("data/meta.json")


def r2(x):
    return round(float(x), 2)


alan_rows = [[r["alan"], r["alt"], r["uni"], r2(r["kalite"]), r2(r["hacim"])] for r in alan]
uni_rows = [[r["uni"], r["alan"], r["alt"], r2(r["kalite"]), r2(r["hacim"])] for r in uni]

payload = {
    "meta": meta,
    "alan": {"cols": ["alan", "alt", "uni", "kalite", "hacim"], "rows": alan_rows},
    "universite": {"cols": ["uni", "alan", "alt", "kalite", "hacim"], "rows": uni_rows},
}

out_path = os.path.join(ROOT, "assets", "data.js")
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    f.write("window.YETKINLIK=")
    json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

print(f"assets/data.js yazıldı: {len(alan_rows)} alan + {len(uni_rows)} üniversite kaydı")
