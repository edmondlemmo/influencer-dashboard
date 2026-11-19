# Influencer dashboard

Apps Script web app that turns the "Always On - Influencer Campaign Activity" sheet into a simple report:
home screen, Performance by influencer, Influencer Buy performance, Influencer Sell performance.

- `src/Code.gs` reads the `SupermetricsBlend_Influencer` tab (the source of truth), leaves out anything named Mid Year and any Business Area "Test" rows, and rolls daily rows up to one row per ad set ("burst"). The ad set budget repeats on every daily row, so it is taken once per burst.
- A burst that should be running (start before today, end today or later) but has had no spend for more than a day is flagged "Possible errors".
- "Spend pacing" (every view and every influencer page) for bursts running today. Expected spend = budget x days elapsed (to the last day of data) / scheduled days. Within 10% of expected is "On track"; under is "Behind", over is "Ahead".
- Each influencer has their own page (click a card, a table row or a bar name): platforms and a Live / Ended / Possible errors pill next to the name, then pacing (Buy, if live), headline numbers, timeline and each burst. Influencer lists show live first, then most recently ended.
- Influencer pages show creatives from the `Creative Previews` tab: Meta (Facebook feed + Instagram preview iframes) and TikTok (embedded from the Post URL). The influencer's name is searched for anywhere in the ad name cell, ignoring case, spaces and punctuation, because TikTok ad names start with the caption (e.g. "...#ad_Riley Rodgers-Falk - Buy - 20.10 ..."). If two names match, the longest wins.
- `src/Index.html` is the page (Campaign Builder look and feel). Opened locally, it shows a built-in sample copy of the data.
- No `//` comments or bare URLs in the page script: Apps Script strips them.

## Deployment

- Script project: https://script.google.com/d/1BfWTSego0oI7-1Xt93tlOkEgubW-feeZWfAtlvJsONPHtjpvDffV1ZWa/edit (standalone, not bound to the sheet)
- Web app: https://script.google.com/a/macros/carsales.com.au/s/AKfycbzkl1OgU1ki5-_Oix-1FPfjXUaqw6d3A4h0uGx78z0k3Bogy_GN3yqkdisHTNEXL6L3/exec
- Runs as the owner, open to anyone at carsales. Viewers don't need access to the sheet.

To ship a change and keep the same link (Node and clasp are in `~/.local/node/bin`):

```bash
clasp push
clasp deploy -i AKfycbzkl1OgU1ki5-_Oix-1FPfjXUaqw6d3A4h0uGx78z0k3Bogy_GN3yqkdisHTNEXL6L3 -d "What changed"
```

## Artifact copy

`python3 tools/build_artifact.py` builds `artifact/influencer-performance.html` from `src/Index.html` with a fixed data snapshot, for the claude.ai artifact at https://claude.ai/artifact/8yVhVGdVbYM63kG7pPEZds. It does not update itself. Artifacts can't embed other sites, so creatives there are links (TikTok opens the post; Meta points to the live dashboard because its preview links carry access tokens). Make lasting changes in `src/`, then push and redeploy.

## Greeting names

The home page says "Good Morning / Afternoon / Evening" on the viewer's clock. To add first names, fill in `CONTACTS` in `src/Code.gs` (`'first.last@carsales.com.au': 'First',`), then push and redeploy. The app reads the viewer's email with `Session.getActiveUser()`, which needs the `userinfo.email` scope in `appsscript.json`.

## Who can open it

Only the people in `CONTACTS` (`src/Code.gs`). Everyone else gets a "You don't have access" page, and `getData()` refuses them too. To give someone access, add their email and first name to `CONTACTS`, then push and redeploy.
