#!/usr/bin/env bash
# Makes 96 kbps stereo copies of the letter songs in a separate folder and reports the sizes, to listen to before use.
# Stereo on purpose: the living pictures tell the lead singer from the chorus by how wide the voice sits in stereo.
# The originals are never touched; swapping them in is the owner's own step, after listening.
#
#   tools/compress_media.sh [source folder] [output folder] [kbps]
#   tools/compress_media.sh                      # data/media → data/media-96k at 96 kbps
set -euo pipefail

src=${1:-data/media}
out=${2:-data/media-96k}
kbps=${3:-96}

command -v ffmpeg >/dev/null || { echo "ffmpeg is not installed (https://ffmpeg.org/download.html)." >&2; exit 1; }
[ -d "$src" ] || { echo "No folder $src." >&2; exit 1; }
[ "$(cd "$src" && pwd -P)" != "$(mkdir -p "$out" && cd "$out" && pwd -P)" ] || { echo "The output folder must not be the source folder." >&2; exit 1; }

size() { wc -c < "$1" | tr -d ' '; }
before=0 after=0 n=0
printf '%-32s %10s %10s %6s\n' file before after saved
for f in "$src"/*.mp3; do
  [ -e "$f" ] || { echo "No mp3 files in $src." >&2; exit 1; }
  name=$(basename "$f")
  # audio only (no cover picture), 2 channels, the same sample rate; the tags are kept
  ffmpeg -nostdin -loglevel error -y -i "$f" -map 0:a:0 -c:a libmp3lame -b:a "${kbps}k" -ac 2 -map_metadata 0 -id3v2_version 3 "$out/$name"
  b=$(size "$f") a=$(size "$out/$name")
  before=$((before + b)) after=$((after + a)) n=$((n + 1))
  printf '%-32s %9dK %9dK %5d%%\n' "$name" $((b / 1024)) $((a / 1024)) $(( (b - a) * 100 / b ))
done
printf '%-32s %9dK %9dK %5d%%\n' "all $n files" $((before / 1024)) $((after / 1024)) $(( (before - after) * 100 / before ))
echo "Copies are in $out. Listen to them; to use them, replace the files in $src yourself (keep the same names)."
