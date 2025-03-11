#!/bin/bash

# Process main video
ffmpeg -i input.mp4 \
  -c:v libvpx-vp9 \
  -b:v 1M \
  -pass 1 \
  -an \
  -f webm \
  -y /dev/null

ffmpeg -i input.mp4 \
  -c:v libvpx-vp9 \
  -b:v 1M \
  -pass 2 \
  -deadline best \
  -cpu-used 0 \
  public/assets/hero-video.webm

# Create MP4 fallback
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -crf 23 \
  -preset veryslow \
  -movflags +faststart \
  -filter:v "scale='min(1920,iw)':'min(1080,ih)'" \
  public/assets/hero-video.mp4

# Process mobile version
ffmpeg -i input.mp4 \
  -c:v libvpx-vp9 \
  -b:v 600k \
  -vf "scale=-1:720" \
  -pass 1 \
  -an \
  -f webm \
  -y /dev/null

ffmpeg -i input.mp4 \
  -c:v libvpx-vp9 \
  -b:v 600k \
  -vf "scale=-1:720" \
  -pass 2 \
  public/assets/hero-video-mobile.webm

# Create mobile MP4 fallback
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -crf 25 \
  -preset veryslow \
  -movflags +faststart \
  -vf "scale=-1:720" \
  public/assets/hero-video-mobile.mp4

# Generate WebP poster
ffmpeg -i input.mp4 \
  -vf "select=eq(n\,0)" \
  -q:v 50 \
  public/assets/hero-video-poster.webp 