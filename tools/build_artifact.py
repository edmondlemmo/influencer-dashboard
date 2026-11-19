"""Builds artifact/influencer-performance.html: a claude.ai Artifact copy of src/Index.html
with a fixed snapshot of the data (no Apps Script, no live sheet)."""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "src" / "Index.html").read_text()

# The artifact skeleton supplies doctype, html, head and body.
src = re.sub(r'^<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*', '', src)
src = re.sub(r'<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*<meta name="color-scheme"[^>]*>\s*', '', src)
src = src.replace('<title>Influencer performance</title>', '<title>Influencer Performance</title>', 1)
src = re.sub(r'</head>\s*<body>\s*', '', src, count=1)
src = re.sub(r'\s*</body>\s*</html>\s*$', '\n', src)

def js(v):
    return json.dumps(v, ensure_ascii=True).replace('//', '\\/\\/')

# Snapshot of the Creative Previews tab. Meta preview links carry access tokens, so the
# artifact points to the live dashboard for those; TikTok posts are public.
tt = "https://m.tiktok.com/v/"
creatives = [
    {"platform": "Facebook", "adName": "Matilda Valles - Buy - 01.10 - Boosting - Awareness", "cost": 4062.55},
    {"platform": "Facebook", "adName": "Private Sell - Awareness - Influencers - Boosting -  Kale Roberts", "cost": 3302},
    {"platform": "Facebook", "adName": "Chasing Dain - Buy - 23.10 - Boosting - Awareness", "cost": 2717.25},
    {"platform": "Facebook", "adName": "Harry Mckay - Buy - 29.10 - Boosting - Awareness", "cost": 1666.63},
    {"platform": "Facebook", "adName": "Carly Mcdonagh - Private Sell - 23.10 - Boosting - Awareness", "cost": 1666.58},
    {"platform": "Facebook", "adName": "Video - Sheridan OMalley", "cost": 833.26},
    {"platform": "TikTok", "adName": "If you see me talking to my phone… you know exactly what I’m doing @carsales #ad _Claudia Macdonald - Buy - 09.10 - Boosting - Awareness", "tiktok": tt + "7688930269574728968.html", "cost": 14163.85},
    {"platform": "TikTok", "adName": "Buying a car when you’re not exactly an expert is made so easy, thanks to @carsales !! I've bought my last two cars through carsales and now with our third baby arriving I'm looking at my options for our next family car, maybe an EV!! #ad #carsales #electriccar #familycar #mumcar_Matilda Valles - Buy - 01.10 - Boosting - Awareness", "tiktok": tt + "7691449398261321012.html", "cost": 4061.34},
    {"platform": "TikTok", "adName": "Thinking it might be time for a new car. Searching has been made so much easier with the voice search feature on the carsales app — just say what you're looking for and start scrolling through options @carsales #ad_Riley Rodgers-Falk - Buy - 20.10 - Boosting - Awareness", "tiktok": tt + "7698163624220609810.html", "cost": 1666.3},
    {"platform": "TikTok", "adName": "If you see me talking to my phone… you know exactly what I’m doing @carsales #ad _Claudia Macdonald - Buy - 24.09 - Boosting - Awareness", "tiktok": tt + "7688930269574728968.html", "cost": 1665.27},
    {"platform": "TikTok", "adName": "Your first heartbreak was a guy? Mine was a car. @carsales #carsales #Ad #bubblecar #firstcar #upgrade _Sheridan Omalley - Private Sell - 24.09 - Boosting - Awareness", "tiktok": tt + "7688931240841448725.html", "cost": 832.11},
]
repl = 'creatives: ' + js(creatives) + ',\n      rows: ['
src = re.sub(r'creatives: \[.*?\],\n      rows: \[', lambda m: repl, src, count=1, flags=re.S)
src = src.replace('updated: "19 Nov 2026 (sample copy)"', 'updated: "19 Nov 2026 (snapshot)"', 1)

out = ROOT / "artifact" / "influencer-performance.html"
out.parent.mkdir(exist_ok=True)
out.write_text(src)
print(out, len(src))
