#!/bin/bash

set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_icon="$root_dir/src/renderer/src/assets/app-icon.svg"
build_dir="$root_dir/build"
resources_dir="$root_dir/resources"
temp_dir="$(mktemp -d)"
iconset_dir="$temp_dir/icon.iconset"
master_icon="$temp_dir/icon-1024.png"

cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

mkdir -p "$build_dir" "$resources_dir" "$iconset_dir"

if ! sips -s format png "$source_icon" --out "$master_icon" >/dev/null 2>&1; then
  qlmanage -t -s 1024 -o "$temp_dir" "$source_icon" >/dev/null
  mv "$temp_dir/$(basename "$source_icon").png" "$master_icon"
fi

sips -z 1024 1024 "$master_icon" --out "$build_dir/icon.png" >/dev/null
cp "$build_dir/icon.png" "$resources_dir/icon.png"

create_icon() {
  local size="$1"
  local output="$2"
  sips -z "$size" "$size" "$master_icon" --out "$iconset_dir/$output" >/dev/null
}

create_icon 16 icon_16x16.png
create_icon 32 icon_16x16@2x.png
create_icon 32 icon_32x32.png
create_icon 64 icon_32x32@2x.png
create_icon 128 icon_128x128.png
create_icon 256 icon_128x128@2x.png
create_icon 256 icon_256x256.png
create_icon 512 icon_256x256@2x.png
create_icon 512 icon_512x512.png
create_icon 1024 icon_512x512@2x.png

iconutil -c icns "$iconset_dir" -o "$build_dir/icon.icns"
