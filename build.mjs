// Tiny static-site builder: no runtime dependencies. Composes src/pages with partials into dist/.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const dist = join(root, "dist");
const club = JSON.parse(readFileSync(join(src, "data/club.json"), "utf8"));
const playerData = JSON.parse(readFileSync(join(src, "data/players.json"), "utf8")).teams;
club.squads.forEach((q) => { q.leagueId = new URL(q.teamUrl).searchParams.get("league"); q.players = playerData[q.teamId]; if (!q.players) throw new Error(`no player data for team ${q.teamId}`); });
// SITE_URL and BASE_PATH come from the environment so the same source builds for a domain or a project subpath
// (GitHub Pages: BASE_PATH=/sunrisers-cc). Root-absolute links are prefixed with BASE_PATH.
const BASE_PATH = (process.env.BASE_PATH || "").replace(/\/$/, "");
const SITE_URL = (process.env.SITE_URL || "https://example.invalid").replace(/\/$/, ""); // PLACEHOLDER until the real domain is chosen

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'";

const NAV = [
  ["about", "Team", "about.html"],
  ["teams", "Squads", "teams.html"],
  ["fixtures", "Results", "fixtures.html"],
  ["news", "News", "news.html"],
  ["events", "Events", "events.html"],
  ["gallery", "Gallery", "gallery.html"],
  ["sponsors", "Sponsors", "sponsors.html"],
  ["ground", "Ground", "ground.html"],
  ["contact", "Contact", "contact.html"],
];

const fmtDate = (iso) => {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

// A squad is named after its league: "Sunrisers: <League name> XI". The colon is deliberate: Hallmark gate 19
// forbids the dash in copy. The CricClubs team name (it differs per organiser) is shown next to it.
const squadTitle = (q) => `${club.name}: ${q.leagueName} XI`;
const squadSlug = (q) => `team-${q.id}`;
const scorecardUrl = (q, m) => `https://cricclubs.com/${q.slug}/viewScorecard.do?matchId=${encodeURIComponent(m.matchId)}&clubId=${encodeURIComponent(q.clubId)}`;
const STAGE_RANK = { Eliminator: 1, "Quarter Final": 2, "Semi Final": 3, Final: 4 };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

// Season summary: computed from the match rows only. Nothing here is typed in by hand.
function summarise(q) {
  const c = (o) => q.matches.filter((m) => m.outcome === o).length;
  const won = c("won"), lost = c("lost"), abandoned = c("abandoned"), forfeitWin = c("forfeit-win"), forfeitLoss = c("forfeit-loss");
  const stages = q.matches.filter((m) => m.stage).sort((x, y) => STAGE_RANK[y.stage] - STAGE_RANK[x.stage] || y.date.localeCompare(x.date));
  const top = stages[0];
  let best = "No knockout match listed";
  if (top) best = `${top.stage}, ${top.outcome === "won" ? "won" : "lost"}`;
  return { listed: q.matches.length, played: won + lost, won, lost, abandoned, forfeitWin, forfeitLoss, best };
}

const allMatches = () =>
  club.squads
    .flatMap((q) => q.matches.map((m) => ({ q, m })))
    .sort((x, y) => y.m.date.localeCompare(x.m.date) || Number(y.m.matchId) - Number(x.m.matchId));

function scorecard({ q, m }) {
  const hasScore = m.outcome === "won" || m.outcome === "lost";
  const win = m.outcome === "won" || m.outcome === "forfeit-win";
  const side = (team, score, overs) =>
    `<span class="score__row${team === q.cc ? " score__row--us" : ""}"><span class="score__team">${esc(team)}</span>${
      hasScore ? `<span class="score__runs">${esc(score)}<small> (${esc(overs)} ov)</small></span>` : ""
    }</span>`;
  return `<li class="score${win ? " score--win" : ""}" data-squad="${esc(q.id)}">
  <a class="score__link" href="${scorecardUrl(q, m)}">
    <span class="score__date">${esc(fmtDate(m.date))}${m.stage ? `<span class="score__stage">${esc(m.stage)}</span>` : ""}<span class="score__squad">${esc(q.leagueName)}</span></span>
    <span class="score__teams">
      ${side(m.team1, m.score1, m.overs1)}
      ${side(m.team2, m.score2, m.overs2)}
    </span>
    <span class="score__result">${esc(m.result)}</span>
  </a>
</li>`;
}

function renderResults(n) {
  const rows = allMatches();
  return `<ol class="scores">\n${(n ? rows.slice(0, n) : rows).map(scorecard).join("\n")}\n</ol>`;
}

// One spot per squad: that squad's most recent match (latest date, then highest matchId).
function renderLatestPerSquad() {
  const rows = club.squads.map((q) => {
    const m = [...q.matches].sort((x, y) => y.date.localeCompare(x.date) || Number(y.matchId) - Number(x.matchId))[0];
    return { q, m };
  });
  return `<ol class="scores">\n${rows.map(scorecard).join("\n")}\n</ol>`;
}

// League selector: a real <select>. Without JS it is hidden and every match shows, grouped by league.
function renderFilter() {
  const total = allMatches().length;
  return `<div class="filterbar js-only"><div class="filter">
  <label class="filter__label" for="league-select">League</label>
  <select class="filter__select" id="league-select" aria-controls="league-results" aria-describedby="filter-status" data-text-all="Showing all {n} matches, grouped by league." data-text-one="Showing {n} matches in {name}.">
    <option value="all">All leagues (${total} matches)</option>
    ${club.squads.map((q) => `<option value="${esc(q.id)}">${esc(q.leagueName)} (${q.matches.length} matches)</option>`).join("\n    ")}
  </select>
</div>
<p class="small dim filterbar__status" id="filter-status" role="status" aria-live="polite">Showing all ${total} matches, grouped by league.</p></div>`;
}

// Squads page selector, same pattern as the results one: native select, hidden without JS (every squad shows).
function renderSquadFilter() {
  return `<div class="filterbar filterbar--squads js-only"><div class="wrap"><div class="filter">
  <label class="filter__label" for="league-select">League</label>
  <select class="filter__select" id="league-select" aria-controls="league-results" aria-describedby="filter-status" data-text-all="Showing all ${club.squads.length} squads, {n} players." data-text-one="Showing the {name} squad, {n} players.">
    <option value="all">All leagues (${club.squads.length} squads)</option>
    ${club.squads.map((q) => `<option value="${esc(q.id)}">${esc(q.leagueName)} (${q.players.length} players)</option>`).join("\n    ")}
  </select>
</div>
<p class="small dim filterbar__status" id="filter-status" role="status" aria-live="polite">Showing all ${club.squads.length} squads, ${club.squads.reduce((a, s) => a + (s.players?.length || 0), 0)} players.</p></div></div>`;
}

// All matches, grouped by league (newest first inside each group). The JS selector shows or hides whole groups.
function renderGrouped() {
  const groups = club.squads.map((q) => {
    const rows = [...q.matches].sort((x, y) => y.date.localeCompare(x.date) || Number(y.matchId) - Number(x.matchId));
    return `<section class="league-group" data-league="${esc(q.id)}" data-total="${q.matches.length}" aria-labelledby="lg-${esc(q.id)}">
  <h3 class="league-group__h" id="lg-${esc(q.id)}"><a class="lh" href="teams.html?league=${esc(q.id)}">${esc(q.leagueName)}<span class="lh__go" aria-hidden="true"></span></a> <span class="league-group__n">${q.matches.length} matches</span></h3>
  <p class="small dim">${esc(q.series)}, ${esc(q.organiser)}. CricClubs team name: ${esc(q.cc)}.</p>
  <ol class="scores">
${rows.map((m) => scorecard({ q, m })).join("\n")}
  </ol>
</section>`;
  });
  return `<div id="league-results">\n${groups.join("\n")}\n</div>`;
}

function renderTeams() {
  return `<ul class="teamlist">\n${club.squads
    .map((q) => {
      const t = summarise(q);
      return `<li class="teamlist__item">
  <a class="teamlist__link" href="teams.html#${squadSlug(q)}">
    <span class="teamlist__name">${esc(q.leagueName)}</span>
    <span class="teamlist__meta">${esc(q.organiser)}. Played ${t.played}, won ${t.won}, lost ${t.lost}.</span>
    <span class="teamlist__go" aria-hidden="true"></span>
  </a>
</li>`;
    })
    .join("\n")}\n</ul>`;
}

function renderStats(q) {
  const t = summarise(q);
  // The number is counted up by motion.js. The animated span is hidden from assistive tech; the real value is always in the text.
  const cell = (k, v) => `<div class="stats__cell"><dt>${k}</dt><dd><span aria-hidden="true" data-count="${esc(v)}">${esc(v)}</span><span class="visually-hidden">${esc(v)}</span></dd></div>`;
  return `<dl class="stats">
  ${cell("Played", t.played)}
  ${cell("Won", t.won)}
  ${cell("Lost", t.lost)}
  ${cell("Abandoned or no result", t.abandoned)}
</dl>
<p class="small">Best finish: <strong>${esc(t.best)}</strong>.${t.forfeitWin ? ` Also ${plural(t.forfeitWin, "win")} by forfeit, not counted as played.` : ""}${t.forfeitLoss ? ` Also ${plural(t.forfeitLoss, "loss")} by forfeit.` : ""} Counted from the ${t.listed} matches listed for this squad.</p>`;
}

const BANDS = ["band--ink2", "band--ink", "band--paper"];
const STAT_SRC = (q, kind) => `https://cricclubs.com/${q.slug}/team${kind}.do?&teamId=${q.teamId}&league=${q.leagueId}&clubId=${q.clubId}`;
const dash = (v) => (v === "--" ? "n/a" : v);
const num = (v) => (v === undefined || v === "" || v === "--" ? null : Number(v));

const FLAG_LABEL = { C: "Captain", VC: "Vice-captain", WK: "Wicket-keeper" };
const BAT_COLS = [["M", "Matches", "M"], ["Inns", "Innings", "Inns"], ["NO", "Not outs", "NO"], ["Runs", "Runs", "Runs"], ["HS", "Highest score", "HS"], ["Avg", "Average", "Avg"], ["SR", "Strike rate", "SR"], ["4s", "Fours", "4s"], ["6s", "Sixes", "6s"], ["50s", "Fifties", "50s"], ["100s", "Hundreds", "100s"]];
const BOWL_COLS = [["O", "Overs", "O"], ["M", "Maidens", "M"], ["R", "Runs conceded", "R"], ["W", "Wickets", "W"], ["Best", "Best bowling", "Best"], ["Econ", "Economy", "Econ"], ["Avg", "Average", "Avg"], ["SR", "Strike rate", "SR"]];
const FIELD_COLS = [["Ct", "Catches", "Ct"], ["WkCt", "Wicket-keeper catches", "WK Ct"], ["RoD", "Direct run outs", "RO direct"], ["RoI", "Indirect run outs", "RO indirect"], ["St", "Stumpings", "St"]];

const catchesOf = (p) => (p.fielding ? (num(p.fielding.Ct) ?? 0) + (num(p.fielding.WkCt) ?? 0) : null);

// Leaders are computed from the player rows only. Ties list every tied player.
function leaders(q) {
  const pick = (value) => {
    const rows = q.players.map((p) => ({ p, v: value(p) })).filter((r) => r.v !== null && r.v > 0);
    if (!rows.length) return null;
    const max = Math.max(...rows.map((r) => r.v));
    return { max, who: rows.filter((r) => r.v === max).map((r) => r.p) };
  };
  return {
    runs: pick((p) => num(p.batting?.Runs)),
    wickets: pick((p) => num(p.bowling?.W)),
    catches: pick(catchesOf),
  };
}

function renderLeaders(q) {
  const L = leaders(q);
  const item = (label, r, unit, extra = () => "") =>
    `<div class="leaders__cell"><dt>${label}</dt><dd>${
      r ? `${r.who.map((p) => `<a href="#p-${esc(q.id)}-${esc(p.id)}">${esc(p.name)}</a>`).join(", ")}<span class="leaders__v"><span class="leaders__n">${r.max}</span> ${unit}${extra(r)}</span>` : "None recorded"
    }</dd></div>`;
  return `<dl class="leaders">
  ${item("Top run scorer", L.runs, "runs")}
  ${item("Top wicket taker", L.wickets, "wickets")}
  ${item("Most catches", L.catches, "catches", (r) => (r.who.length === 1 && r.who[0].fielding ? `<span class="leaders__sub"> (${esc(r.who[0].fielding.Ct ?? 0)} fielding, ${esc(r.who[0].fielding.WkCt ?? 0)} keeper)</span>` : ""))}
</dl>`;
}

function statBlock(title, cols, data) {
  if (!data) return "";
  const cells = cols
    .filter(([k]) => data[k] !== undefined)
    .map(([k, full, short]) => `<div class="pstat__cell"><dt><abbr title="${esc(full)}">${esc(short)}</abbr></dt><dd>${esc(dash(data[k]))}</dd></div>`)
    .join("");
  return `<div class="pstat"><h5 class="pstat__h">${title}</h5><dl class="pstat__grid">${cells}</dl></div>`;
}

function renderPlayer(q, p) {
  const has = p.batting || p.bowling || p.fielding;
  // CricClubs writes the literal word "Null" for an unset field: show nothing rather than that word.
  const set = (v) => (v && v !== "Null" ? v : "");
  const styles = [set(p.batStyle), set(p.bowlStyle)].filter(Boolean);
  const flags = p.flags.filter((f) => FLAG_LABEL[f]).map((f) => `<li class="tag tag--real">${FLAG_LABEL[f]}</li>`).join("");
  const dup = q.players.filter((x) => x.name === p.name).length > 1;
  return `<li class="pcard" id="p-${esc(q.id)}-${esc(p.id)}" data-name="${esc(p.name)}" data-runs="${num(p.batting?.Runs) ?? -1}" data-wkts="${num(p.bowling?.W) ?? -1}" data-catches="${catchesOf(p) ?? -1}">
  <div class="pcard__photo" aria-hidden="true"></div>
  <div class="pcard__head">
    <h4 class="pcard__name">${esc(p.name)}</h4>
    ${set(p.role) ? `<p class="pcard__role">${esc(set(p.role))}</p>` : ""}
    ${flags ? `<ul class="pcard__flags" aria-label="Flags">${flags}</ul>` : ""}
    ${styles.length ? `<p class="pcard__style">${styles.map(esc).join(", ")}</p>` : ""}
    ${dup ? `<p class="pcard__style">CricClubs lists two profiles under this name.</p>` : ""}
    <a class="link-arrow" href="${esc(p.url)}">CricClubs profile<span class="visually-hidden"> for ${esc(p.name)}</span></a>
  </div>
  <div class="pcard__stats">
    ${has ? statBlock("Batting", BAT_COLS, p.batting) + statBlock("Bowling", BOWL_COLS, p.bowling) + statBlock("Fielding", FIELD_COLS, p.fielding) : '<p class="pcard__none">No stats recorded this season</p>'}
  </div>
</li>`;
}

function renderSquadSections() {
  return club.squads
    .map(
      (q, i) => `<section class="band ${BANDS[i % 3]}" id="${squadSlug(q)}" data-squad="${esc(q.id)}" data-league="${esc(q.id)}" data-total="${q.players.length}">
  <div class="wrap">
    <div class="split">
      <div>
        <h2 class="display-l"><a class="lh" href="fixtures.html?league=${esc(q.id)}">${esc(squadTitle(q))}<span class="lh__go" aria-hidden="true"></span></a></h2>
        <p class="lede">${esc(q.series)}, ${esc(q.organiser)}. On CricClubs the team is called “${esc(q.cc)}”.</p>
        <h3 class="stats__h">Season summary</h3>
        ${renderStats(q)}
        <p class="small">Points table position is not shown on the team page, so it is not listed here.</p>
        <p><a class="link-arrow" href="${esc(q.teamUrl)}">Team page and points table on CricClubs</a></p>
        <p><a class="link-arrow" href="fixtures.html?league=${esc(q.id)}">All ${q.matches.length} matches for this squad</a></p>
      </div>
      <div>
        <h3 class="stats__h">Squad leaders</h3>
        ${renderLeaders(q)}
        <p class="small dim">Counted from the batting, bowling and fielding tables below. Catches add fielding and wicket-keeper catches. Ties show every player.</p>
      </div>
    </div>
    <div class="players-head">
      <h3 class="stats__h" id="players-${esc(q.id)}">Players, ${q.players.length} on the CricClubs roster</h3>
      <div class="psort js-only">
        <label class="psort__label" for="sort-${esc(q.id)}">Sort players by</label>
        <select class="filter__select psort__select" id="sort-${esc(q.id)}" data-sort-for="players-list-${esc(q.id)}" aria-controls="players-list-${esc(q.id)}">
          <option value="roster">Roster order</option>
          <option value="name">Name, A to Z</option>
          <option value="runs">Most runs</option>
          <option value="wkts">Most wickets</option>
          <option value="catches">Most catches</option>
        </select>
      </div>
    </div>
    <ul class="players" id="players-list-${esc(q.id)}" aria-labelledby="players-${esc(q.id)}">
      ${q.players.map((p) => renderPlayer(q, p)).join("\n      ")}
    </ul>
    <p class="small dim note">Player details and stats from CricClubs, 14 Nov 2026 (this league only). Photos are not added yet. Source tables:
      <a href="${esc(STAT_SRC(q, "Batting"))}">batting</a>, <a href="${esc(STAT_SRC(q, "Bowling"))}">bowling</a>, <a href="${esc(STAT_SRC(q, "Fielding"))}">fielding</a>. A player with no row in the tables has no stats recorded for the season.</p>
  </div>
</section>`
    )
    .join("\n");
}

// One consistent row per league (they used to be a button for the first and plain links for the rest).
function renderSquadLinks() {
  return `<ul class="leaguelinks">\n${club.squads
    .map((q) => `        <li><a class="leaguelink" href="${esc(q.teamUrl)}"><span class="leaguelink__t">${esc(q.leagueName)} on CricClubs</span><span class="leaguelink__go" aria-hidden="true"></span></a></li>`)
    .join("\n")}\n      </ul>`;
}

const updatedNote = () => `<p class="small dim note">Last updated ${esc(club.updated)} from CricClubs.</p>`;

function parsePage(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("page missing front matter");
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2] };
}

const partial = (n) => readFileSync(join(src, "partials", n + ".html"), "utf8");

function headerHtml(active) {
  const links = NAV.map(
    ([key, label, href]) =>
      `<li><a class="nav__link" href="${href}"${key === active ? ' aria-current="page"' : ""}>${label}</a></li>`
  ).join("\n        ");
  return partial("header").replace("{{navlinks}}", links);
}

function footerHtml() {
  const links = NAV.map(([, label, href]) => `<li><a href="${href}">${label}</a></li>`).join("\n          ");
  return partial("footer").replace("{{footlinks}}", links).replace("{{year}}", String(new Date().getFullYear()));
}

function externalise(html) {
  // Every external link: new tab, noopener noreferrer, and a screen-reader hint. Enforced centrally.
  return html.replace(/<a ([^>]*?)href="(https?:\/\/[^"]+)"([^>]*)>([\s\S]*?)<\/a>/g, (all, a, href, b, inner) => {
    let attrs = `${a}href="${href}"${b}`.replace(/\s(target|rel)="[^"]*"/g, "");
    return `<a ${attrs} target="_blank" rel="noopener noreferrer">${inner}<span class="visually-hidden"> (opens in a new tab)</span></a>`;
  });
}

const IMG = "assets/img/brand";
// The home hero image is the largest paint: preload the exact candidate the browser will pick (avif, by screen width).
const HOME_PRELOAD = [
  `<link rel="preload" as="image" type="image/avif" media="(min-width: 701px)" href="${IMG}/tex-wide-1280.avif" imagesrcset="${IMG}/tex-wide-1280.avif 1280w, ${IMG}/tex-wide.avif 1920w" imagesizes="100vw" fetchpriority="high">`,
  `<link rel="preload" as="image" type="image/avif" media="(max-width: 700px)" href="${IMG}/tex-tall.avif" fetchpriority="high">`,
].join("\n");

function render(file) {
  const { meta, body } = parsePage(readFileSync(join(src, "pages", file), "utf8"));
  const name = file.replace(/\.html$/, "");
  const is404 = name === "404";
  const isHome = name === "index";
  const canonical = is404 ? "" : `<link rel="canonical" href="${SITE_URL}/${isHome ? "" : file}">`;
  const title = isHome ? meta.title : `${meta.title} | ${club.name} (NJ, USA)`;
  let html = partial("layout")
    .replace("{{csp}}", esc(CSP))
    .replace(/\{\{title\}\}/g, esc(title))
    .replace(/\{\{description\}\}/g, esc(meta.description))
    .replace("{{canonical}}", canonical)
    .replace("{{ogimage}}", `${SITE_URL}/assets/img/brand/og-image.jpg`)
    .replace("{{headextra}}", isHome ? HOME_PRELOAD : "")
    .replace("{{robots}}", is404 ? '<meta name="robots" content="noindex">' : "")
    .replace("{{bodyclass}}", esc(meta.class || ""))
    .replace("{{header}}", headerHtml(meta.nav || ""))
    .replace("{{footer}}", footerHtml())
    .replace("{{content}}", body);
  html = html
    .replace(/\{\{results:(\d+)\}\}/g, (_, n) => renderResults(+n))
    .replace("{{latestpersquad}}", renderLatestPerSquad())
    .replace("{{allresults}}", renderGrouped())
    .replace("{{filter}}", renderFilter())
    .replace(/\{\{updated\}\}/g, updatedNote())
    .replace("{{teams}}", renderTeams())
    .replace("{{squadlinks}}", renderSquadLinks())
    .replace("{{squadsections}}", renderSquadSections())
    .replace("{{squadfilter}}", renderSquadFilter())
    .replace("{{wordmark}}", () => {
      const svg = readFileSync(join(src, "assets/img/brand/wordmark.svg"), "utf8").trim();
      const [w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).slice(1);
      return svg.replace("<svg ", `<svg width="${w}" height="${h}" aria-hidden="true" focusable="false" `);
    })
    .replace("{{form}}", partial("form"));
  const left = html.match(/\{\{[^}]+\}\}/g);
  if (left) throw new Error(`${file}: unresolved tokens ${left.join(", ")}`);
  if (is404) {
    html = html.replace(/(href|src)="(?!https?:|#|\/|data:)/g, '$1="/');
    html = html.replace(/srcset="[^"]*"/g, (m) => m.replace(/(srcset="|, )(?=assets\/)/g, "$1/")); // the 404 page is served from any depth
  }
  html = html.replace(/(?<=[A-Za-z])'(?=[A-Za-z])/g, "\u2019"); // typographic apostrophes
  return externalise(html);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
const pages = readdirSync(join(src, "pages")).filter((f) => f.endsWith(".html"));
const rebase = (html) =>
  BASE_PATH
    ? html
        .replace(/(href|src|action)="\/(?!\/)/g, `$1="${BASE_PATH}/`)
        .replace(/srcset="[^"]*"/g, (m) => m.replace(/(srcset="|, )\/(?!\/)/g, `$1${BASE_PATH}/`))
        .replace(/(imagesrcset)="[^"]*"/g, (m) => m.replace(/(imagesrcset="|, )\/(?!\/)/g, `$1${BASE_PATH}/`))
    : html;
for (const f of pages) writeFileSync(join(dist, f), rebase(render(f)));

mkdirSync(join(dist, "css"), { recursive: true });
const css = ["tokens.css", "site.css", "motion.css"].map((f) => readFileSync(join(src, "css", f), "utf8")).join("\n");
writeFileSync(join(dist, "css/site.css"), css);
cpSync(join(src, "js"), join(dist, "js"), { recursive: true });
cpSync(join(src, "assets"), join(dist, "assets"), { recursive: true });

const indexable = pages.filter((f) => f !== "404.html");
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable
    .map((f) => `  <url><loc>${SITE_URL}/${f === "index.html" ? "" : f}</loc></url>`)
    .join("\n")}\n</urlset>\n`
);
writeFileSync(
  join(dist, "site.webmanifest"),
  JSON.stringify({
    name: "Sunrisers Cricket Club, New Jersey USA", short_name: "Sunrisers", start_url: "./index.html", scope: "./", display: "standalone",
    background_color: "#0f0705", theme_color: "#0f0705",
    icons: [{ src: "assets/img/brand/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "assets/img/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }],
  }, null, 2) + "\n"
);
writeFileSync(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

const headers = `/*
  Content-Security-Policy: ${CSP}; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=63072000; includeSubDomains
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;
writeFileSync(join(dist, "_headers"), headers);
console.log(`built ${pages.length} pages into dist/ with zero warnings`);
