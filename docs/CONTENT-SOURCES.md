# Content sources (Sunrisers, New Jersey, USA)

## REAL (all from CricClubs, read 14 Nov 2026)
- Team name: Sunrisers. Location: New Jersey, USA.
- Three CricClubs team pages, exactly as supplied by the team:
  1. https://cricclubs.com/viewTeam.do?&teamId=907&league=43&clubId=49: Fall T20 Frontier, Cricket League of New Jersey (CLNJ). Team name on CricClubs: "Sunrisers Cricket Club".
  2. https://cricclubs.com/viewTeam.do?&teamId=1974&league=136&clubId=21870: MCL Fall T20 Challenger. Team name on CricClubs: "Novo Sunrisers".
  3. https://cricclubs.com/viewTeam.do?&teamId=1950&league=132&clubId=21870: MCL F40 Div B. Team name on CricClubs: "Novo Sunrisers".
- Results: 31 matches (8, 7, 16), saved in `research/cricclubs-2026-11-14.md` and `src/data/club.json`. Every card links to its absolute CricClubs scorecard. Abandoned and forfeited games are shown as such, never as 0/0.
- Season summaries are computed by `build.mjs` from those matches only (played, won, lost, abandoned or no result, best finish). Forfeit wins are noted, not counted as played.
- Players: 74 roster rows (29, 25, 20) with batting, bowling and fielding tables for each league, saved as HTML in `research/player-stats/` (see `summary.md` there for the source URLs and which players have no stats rows). `tools/import-player-stats.py` turns them into `src/data/players.json` and asserts that the four tables line up row for row. Only values present in the source are shown. A blank cell stays blank; a player with no stats rows shows "No stats recorded this season", never zeros. The CricClubs placeholder word "Null" (unset role) is not shown.
- Squad leaders (top run scorer, top wicket taker, most catches) are computed from those tables, ties list everyone. "Most catches" = fielding catches + wicket-keeper catches; that is our reading of the columns and the page says so.
- Photos: none yet. Each card has a blank frame, by request.

## Decisions on the data
- Squad 1 has TWO different CricClubs profiles named "Deepak Kaintura" (player 256213, All Rounder, 1 match; player 638073, Wicket Keeper, no stats). Both are shown, each with its own profile link, and a note says so. We did not merge them.
- Names are as CricClubs shows them (for example "Siddartha Reddy Y", "Ravikumar Kv", "Andrew V" are CricClubs' own abbreviations in squad 1).
- League page links and points-table positions are not available: the site links to CricClubs for those.

## Not read
cricclubs.com is behind a Cloudflare challenge for automated tools. It was not bypassed. The data above was read in a normal browser session on the box and saved to `research/`. Points tables and league pages were not read.

## PLACEHOLDERS (labelled in the UI)
History, captains and officials beyond the CricClubs flags, ground and address, contact details, fees and practice times, news, events, gallery photos, sponsors. The logo, wordmark and texture are the club's own files in `brand-src/`.

## REMOVED
All Standard Athletic Club CC content. A test fails the build if any of it returns.

## Refreshing
Re-save the CricClubs tables into `research/player-stats/`, run `python3 tools/import-player-stats.py`, update `src/data/club.json` for new matches, then `npm run build`. Update the "14 Nov 2026" date in `club.json`.
