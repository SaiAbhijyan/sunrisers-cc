#!/bin/bash
# Build for the GitHub Pages project path and push dist/ to the gh-pages branch.
# Usage: tools/deploy-pages.sh   (needs gh authenticated for the repo owner)
set -euo pipefail
cd "$(dirname "$0")/.."
OWNER=SaiAbhijyan; REPO=sunrisers-nj-site
export BASE_PATH=/$REPO SITE_URL=https://${OWNER,,}.github.io/$REPO
node build.mjs
T=$(mktemp -d)
cp -r dist/. "$T"/ && touch "$T/.nojekyll"
cd "$T" && git init -q -b gh-pages && git add -A && git -c user.name="$OWNER" -c user.email="$OWNER@users.noreply.github.com" commit -q -m "Deploy $(date -u +%FT%TZ)"
git push -q -f "https://github.com/$OWNER/$REPO.git" gh-pages
echo "pushed gh-pages"
