# rffmpeg

A simple CLI utility for recursive batch video conversion using ffmpeg.  
Walks a directory tree, converts every video file with the ffmpeg flags you provide, and replaces the originals with the converted output.

---

## ⚠️ Warning — originals are deleted

After a successful conversion **the original file is permanently deleted**.  
There is no recycle bin, no undo.

**Before running on your real video library:**

1. Copy a small subset of files into a temporary test directory.
2. Run `rffmpeg` against that directory and verify the results.
3. Only after you are satisfied with the output quality and file names, run it on your actual library.

---

## Usage

```
rffmpeg <directory> [...ffmpeg args] "<output_template>"
```

| Argument | Description |
|---|---|
| `<directory>` | Root directory to scan recursively for video files |
| `[...ffmpeg args]` | Any flags passed directly to ffmpeg (codec, quality, etc.) |
| `"<output_template>"` | Output filename template. Supports `{name}` (basename without extension) and `{ext}` (original extension without dot) |

---

## Examples

Convert to AV1 via NVENC, copy audio, keep original extension:

```
rffmpeg S:\videos -c:v av1_nvenc -cq 30 -preset p5 -c:a copy "{name}_converted.{ext}"
```

Re-encode audio to AAC, output as mp4:

```
rffmpeg /media/videos -c:v libx264 -crf 22 -c:a aac "{name}_x264.mp4"
```

---

## Behavior

- Scans `<directory>` recursively for files matching supported extensions (see below).
- Files are processed in order of modification time (oldest first).
- Files whose name already matches the output template suffix are automatically skipped (to avoid re-converting already converted files).
- If the output file already exists on disk, the source file is also skipped.
- On a successful conversion the original file is deleted and the output file inherits the original's modification timestamp.
- The parent directory's modification timestamp is restored after each operation.
- On ffmpeg error the original file is kept and the script moves on to the next file.

---

## Supported extensions

```
.mkv  .mp4  .avi  .mov  .wmv  .flv  .webm  .m4v  .ts
```

To add more, edit the `VIDEO_EXTENSIONS` constant at the top of the script.

---

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [ffmpeg](https://ffmpeg.org/) available in `PATH`
