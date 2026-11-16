#!/usr/bin/env python3
"""Strip metadata from the team photographs and write responsive AVIF/WebP/JPEG sizes."""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/assets/img/gallery"
SRC = ROOT / "media/gallery/photos"
WIDTHS = (480, 800, 1280, 1920)

# Source files (already copied to a work dir or passed via PHOTOS)
PHOTOS = [
    {
        "slug": "01-orange-kit-celebration",
        "alt": "Sunrisers players in orange kit celebrating on the field, lifting a gold trophy.",
    },
    {
        "slug": "02-whites-lifting-trophy",
        "alt": "Sunrisers players in white kit lifting a large gold trophy on the grass.",
    },
    {
        "slug": "03-whites-seated-trophies",
        "alt": "Sunrisers team in white kit posed on the grass with a gold trophy and smaller trophies in front.",
    },
    {
        "slug": "04-orange-kit-kneeling-trophy",
        "alt": "Sunrisers players in orange kit kneeling and standing around a gold trophy.",
    },
    {
        "slug": "05-orange-kit-peace-signs",
        "alt": "Sunrisers players in orange kit posing with peace signs on a path at dusk.",
    },
    {
        "slug": "06-whites-team-lineup",
        "alt": "Sunrisers team in white kit lined up on the grass on a sunny day.",
    },
    {
        "slug": "07-orange-team-trophy-dusk",
        "alt": "Sunrisers players in orange kit posing with a gold trophy at dusk.",
    },
    {
        "slug": "08-trophy-handshake",
        "alt": "A Sunrisers player in orange kit shaking hands and receiving a gold trophy.",
    },
    {
        "slug": "09-orange-kit-kneeling-trophy-alt",
        "alt": "Sunrisers players in orange kit kneeling and standing around a gold trophy, a second view of the same celebration.",
    },
    {
        "slug": "10-whites-batters-walking-off",
        "alt": "Two Sunrisers batters in white kit walking off the field with their bats, shaking hands.",
    },
    {
        "slug": "11-team-social-patio",
        "alt": "Sunrisers players gathered for a social evening on a lit patio.",
    },
    {
        "slug": "12-team-selfie-toast",
        "alt": "Sunrisers players together at night, raising cups in a group toast.",
    },
]


def save_variants(im: Image.Image, slug: str, widths: list[int]) -> list[int]:
    written = []
    for w in widths:
        if w > im.width:
            continue
        h = max(1, round(im.height * (w / im.width)))
        resized = im if w == im.width else im.resize((w, h), Image.Resampling.LANCZOS)
        stem = OUT / f"{slug}-{w}"
        resized.save(stem.with_suffix(".avif"), format="AVIF", quality=52, speed=4)
        resized.save(stem.with_suffix(".webp"), format="WEBP", quality=78, method=6)
        resized.save(stem.with_suffix(".jpg"), format="JPEG", quality=82, optimize=True, progressive=True, subsampling="4:2:0")
        written.append(w)
    return written


def main() -> None:
    src_dir = SRC
    OUT.mkdir(parents=True, exist_ok=True)
    # clear previous derivatives only (keep directory)
    for p in OUT.glob("*"):
        if p.is_file():
            p.unlink()

    print("slug\twidth\theight\torig_bytes\tsizes")
    for photo in PHOTOS:
        src = src_dir / photo.get("src", photo["slug"] + ".jpg")
        im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        orig_path = OUT / f"{photo['slug']}.jpg"
        # Re-encode a clean original (no EXIF/ICC/XMP) at high quality, same pixel size.
        im.save(orig_path, format="JPEG", quality=92, optimize=True, progressive=True, subsampling="4:2:0")
        # If re-encode grew the file and the source already had no metadata, keep the source bytes
        # after a Pillow-confirmed EXIF strip via a copy when source has no info keys of concern.
        src_bytes = src.read_bytes()
        src_im = Image.open(src)
        if not src_im.getexif() and orig_path.stat().st_size > len(src_bytes):
            shutil.copyfile(src, orig_path)
        widths = [w for w in WIDTHS if w < im.width] + [im.width]
        # de-dupe while preserving order
        seen = set()
        widths = [w for w in widths if not (w in seen or seen.add(w))]
        written = save_variants(im, photo["slug"], widths)
        print(f"{photo['slug']}\t{im.width}\t{im.height}\t{orig_path.stat().st_size}\t{written}")


if __name__ == "__main__":
    main()
