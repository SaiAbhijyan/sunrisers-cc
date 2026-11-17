# Gallery originals

Every team photograph and video Sai sent for the site, metadata stripped, lives here in one place.

- `photos/` — still images, named in the order they appear in the gallery (`01-…`, `02-…`, …). Very large phone stills are stored as JPEGs with the long edge capped at 2560 pixels.
- `videos/` — match clips, same numbering, with no player names in the filenames.

`python3 tools/optimize-gallery.py` reads the photographs here and writes responsive AVIF, WebP and JPEG sizes to `src/assets/img/gallery/`, which the website serves. It only rewrites derivatives for the listed slugs, so video posters in that folder are left alone.

For a new video, strip metadata and moov-front the MP4 without re-encoding if it is already H.264, then make a WebM and a poster frame. Put the clean original in `videos/` and the web files in `src/assets/media/` (poster in `src/assets/img/gallery/`):

```
ffmpeg -i clip.mp4 -map_metadata -1 -c copy -movflags +faststart src/assets/media/NN-slug.mp4
ffmpeg -i src/assets/media/NN-slug.mp4 -map_metadata -1 -c:v libvpx-vp9 -crf 36 -b:v 0 -c:a libopus src/assets/media/NN-slug.webm
ffmpeg -ss 0.4 -i src/assets/media/NN-slug.mp4 -frames:v 1 -q:v 3 src/assets/img/gallery/NN-slug-poster.jpg
```

Copy the metadata-stripped original into `videos/` as well. Do not put player names in the slug, alt text or caption.
