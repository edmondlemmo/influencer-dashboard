/**
 * Influencer performance web app.
 * Reads the SupermetricsBlend_Influencer tab of the
 * Always On - Influencer Campaign Activity sheet (the source of truth) and serves Index.html.
 * Anything with "Mid Year" in its campaign, ad set or type, and any Business Area "Test" rows, are left out for now.
 */
var SHEET_ID = '1dO-MGw1VsoHTxsPoi0g4eoomZoS5Y79Q7hXCzytb3Mo';
var SOURCE_TAB = 'SupermetricsBlend_Influencer';
var EXCLUDE = /mid\s*year/i;

function doGet() {
  if (!isAllowed()) return noAccessPage();
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Influencer performance')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Called from the page. Returns one row per burst: an ad set on one platform,
 * with its own schedule and budget. The budget repeats on every daily row, so it is
 * taken once per ad set, not added up.
 */
function getData() {
  if (!isAllowed()) throw new Error('You don\'t have access to this dashboard.');
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var tz = ss.getSpreadsheetTimeZone();
  var values = ss.getSheetByName(SOURCE_TAB).getDataRange().getValues();
  var head = values[0].map(function (h) { return String(h).trim(); });
  var c = function (name) {
    var i = head.indexOf(name);
    if (i < 0) throw new Error('Column "' + name + '" is missing from ' + SOURCE_TAB);
    return i;
  };
  var col = {
    date: c('Date'), source: c('Data source'), campaign: c('Campaign name'), adset: c('Ad set name'),
    budget: c('Ad group budget'), start: c('Schedule start time'), end: c('Schedule end time'),
    cost: c('Cost'), impr: c('Impressions'), clicks: c('Clicks'),
    area: c('Business Area'), name: c('Influencer Name'), type: c('Type')
  };

  var names = {};
  var bursts = {};
  var order = [];
  var dataThrough = '';
  for (var i = 1; i < values.length; i++) {
    var v = values[i];
    var raw = String(v[col.name] || '').trim();
    if (!raw) continue;
    if (EXCLUDE.test(String(v[col.campaign]) + ' ' + String(v[col.adset]) + ' ' + String(v[col.type]))) continue;
    // Test campaigns (Business Area "Test") are left out too.
    if (/^test$/i.test(String(v[col.area]).trim())) continue;

    // Same person spelled two ways (e.g. OMalley / Omalley) shows as one influencer.
    var key = raw.toLowerCase().replace(/[^a-z]/g, '');
    if (!names[key]) names[key] = raw;

    var date = toIso(v[col.date], tz);
    if (date > dataThrough) dataThrough = date;
    var platform = String(v[col.source] || '').replace(/\s*Ads$/i, '').trim();
    var id = platform + '|' + String(v[col.adset]);
    var b = bursts[id];
    if (!b) {
      b = bursts[id] = {
        area: String(v[col.area] || '').trim(), name: names[key], platform: platform,
        start: toIso(v[col.start], tz), end: toIso(v[col.end], tz),
        spend: 0, budget: 0, impr: 0, clicks: 0, lastSpend: ''
      };
      order.push(id);
    }
    var cost = num(v[col.cost]);
    b.spend += cost;
    b.impr += num(v[col.impr]);
    b.clicks += num(v[col.clicks]);
    b.budget = Math.max(b.budget, num(v[col.budget]));
    if (cost > 0 && date > b.lastSpend) b.lastSpend = date;
  }

  return {
    updated: Utilities.formatDate(new Date(), tz, 'd MMM yyyy, h:mm a'),
    dataThrough: dataThrough,
    rows: order.map(function (id) { return bursts[id]; }),
    creatives: getCreatives(ss),
    viewer: viewerFirstName()
  };
}

/**
 * First names for the home page greeting ("Good Morning, Edmond"), keyed by work email (lower case).
 * Add one line per person:  'first.last@carsales.com.au': 'First',
 */
var CONTACTS = {
  'edmond.lemmo@carsales.com.au': 'Edmond',
  'yasmin.chagas@carsales.com.au': 'Yasmin',
  'jess.brott@carsales.com.au': 'Jess',
  'madison.keogh@carsales.com.au': 'Madison',
  'abby.whitfield@carsales.com.au': 'Abby'
};

/** Only people in CONTACTS can open the dashboard. */
function viewerEmail() {
  try {
    return String(Session.getActiveUser().getEmail() || '').toLowerCase().trim();
  } catch (e) {
    return '';
  }
}
function isAllowed() {
  var email = viewerEmail();
  return !!(email && CONTACTS[email]);
}
function noAccessPage() {
  var email = viewerEmail();
  var html = '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;600&display=swap" rel="stylesheet">' +
    '<div style="min-height:100vh;margin:-8px;display:grid;place-items:center;background:linear-gradient(180deg,#0068D6,#002C66);font-family:Manrope,-apple-system,Segoe UI,Arial,sans-serif;color:#fff;text-align:center;padding:24px">' +
    '<div><h1 style="font-weight:300;font-size:40px;margin:0 0 12px">You don\'t have access</h1>' +
    '<p style="font-size:17px;color:rgba(255,255,255,0.78);margin:0">This dashboard is shared with the influencer team only' + (email ? ' and ' + email + ' isn\'t on the list' : '') + '.<br>Ask Edmond Lemmo to add you.</p></div></div>';
  return HtmlService.createHtmlOutput(html).setTitle('Influencer performance')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** The viewer's first name: from CONTACTS, otherwise '' (the greeting then has no name). */
function viewerFirstName() {
  try {
    var email = String(Session.getActiveUser().getEmail() || '').toLowerCase().trim();
    return email && CONTACTS[email] ? CONTACTS[email] : '';
  } catch (e) {
    return '';
  }
}

var CREATIVE_TAB = 'Creative Previews';

/**
 * Reads the Creative Previews tab. It holds two tables side by side:
 * Meta (Ad name, Ad preview URL: Instagram, Ad preview URL: mobile feed, Cost)
 * and TikTok (Ad name, Post URL, Cost). TikTok ad names start with the post caption,
 * so the page searches the whole cell for the influencer's name.
 */
function getCreatives(ss) {
  try {
    var sh = ss.getSheetByName(CREATIVE_TAB);
    if (!sh) return [];
    var values = sh.getDataRange().getDisplayValues();
    var head = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
    var ig = head.indexOf('ad preview url: instagram');
    var fb = head.indexOf('ad preview url: mobile feed');
    var post = head.indexOf('post url');
    var nameLeftOf = function (col) {
      for (var i = col - 1; i >= 0; i--) if (head[i] === 'ad name') return i;
      return -1;
    };
    var costRightOf = function (col) {
      for (var i = col + 1; i < head.length; i++) { if (head[i] === 'cost') return i; if (head[i] === '') return -1; }
      return -1;
    };
    var metaName = nameLeftOf(Math.max(ig, fb)), metaCost = costRightOf(Math.max(ig, fb));
    var tikName = post >= 0 ? nameLeftOf(post) : -1, tikCost = post >= 0 ? costRightOf(post) : -1;
    var out = [];
    for (var r = 1; r < values.length; r++) {
      var v = values[r];
      if (metaName >= 0 && v[metaName]) {
        out.push({ platform: 'Facebook', adName: v[metaName], facebook: fb >= 0 ? v[fb] : '', instagram: ig >= 0 ? v[ig] : '', cost: metaCost >= 0 ? num(v[metaCost]) : 0 });
      }
      if (tikName >= 0 && v[tikName] && v[post]) {
        out.push({ platform: 'TikTok', adName: v[tikName], tiktok: v[post], cost: tikCost >= 0 ? num(v[tikCost]) : 0 });
      }
    }
    return out;
  } catch (e) {
    return [];
  }
}

function num(v) {
  if (typeof v === 'number') return v;
  var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

/** Accepts a Date, "2026-10-23", or "23-Oct" and returns "2026-10-23". */
function toIso(v, tz) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  var s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3})/);
  if (!m) return '';
  var months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  var mi = months.indexOf(m[2].toLowerCase());
  if (mi < 0) return '';
  var now = new Date();
  var d = new Date(now.getFullYear(), mi, Number(m[1]));
  // No year in the cell: if it lands more than ~6 months ahead, it was last year.
  if (d - now > 183 * 864e5) d.setFullYear(d.getFullYear() - 1);
  return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
}
