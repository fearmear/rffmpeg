#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ─── Constants ───────────────────────────────────────────────────────────────

const VIDEO_EXTENSIONS = new Set([
  '.mkv',
  '.mp4',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.webm',
  '.m4v',
  '.ts',
]);

// ─── Arguments ───────────────────────────────────────────────────────────────
// Usage: rffmpeg <dir> [...ffmpeg args] "<output_template>"
// Example: rffmpeg S:\videos -c:v av1_nvenc -cq 30 -preset p5 -c:a copy "{name}_converted.{ext}"

const [, , dir = '.', ...rest] = process.argv;

if (rest.length === 0) {
  console.error('Usage: rffmpeg <dir> [...ffmpeg args] "<output_template>"');
  console.error('Example: rffmpeg S:\\videos -c:v av1_nvenc -cq 30 "{name}_converted.{ext}"');
  process.exit(1);
}

const outputTemplate = rest.at(-1);
const ffmpegArgs = rest.slice(0, -1);

// ─── Вспомогательные функции ─────────────────────────────────────────────────

function getVideoFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getVideoFiles(fullPath));
    } else if (VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

function getMtime(filePath) {
  return fs.statSync(filePath).mtime;
}

function setMtime(filePath, date) {
  fs.utimesSync(filePath, date, date);
}

function resolveOutputName(template, name, ext) {
  return template.replace(/\{name\}/g, name).replace(/\{ext\}/g, ext.replace(/^\./, ''));
}

function getOutputSuffix(template) {
  const match = template.match(/\{name\}(.+?)\{ext\}/i);
  return match ? match[1].replace(/\.$/, '') : null;
}

// ─── Основная логика ─────────────────────────────────────────────────────────

const files = getVideoFiles(dir).sort((a, b) => getMtime(a) - getMtime(b));

const outputSuffix = getOutputSuffix(outputTemplate);

for (const file of files) {
  const ext = path.extname(file);
  const name = path.basename(file, ext);
  const fileDir = path.dirname(file);

  const outputName = resolveOutputName(outputTemplate, name, ext);
  const outputFile = path.join(fileDir, outputName);

  // Пропускаем файлы, которые сами являются результатом конвертации
  if (outputSuffix && name.endsWith(outputSuffix)) continue;

  if (fs.existsSync(outputFile)) {
    console.log(`Found incomplete output for ${file} → ${outputName}, removing...`);
    fs.unlinkSync(outputFile);
  }

  const fileMtime = getMtime(file);
  const dirMtime = getMtime(fileDir);

  console.log(`Converting: ${file} → ${outputName}`);

  const result = spawnSync('ffmpeg', ['-i', file, ...ffmpegArgs, outputFile], { stdio: 'inherit' });

  if (result.status !== 0) {
    console.error(`Error converting ${file}, skipping deletion.`);
    setMtime(fileDir, dirMtime);
    continue;
  }

  setMtime(outputFile, fileMtime);
  fs.unlinkSync(file);
  setMtime(fileDir, dirMtime);

  console.log(`Done: ${outputFile}`);
}

console.log('All done.');
