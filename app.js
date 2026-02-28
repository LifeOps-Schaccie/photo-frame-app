// ===== DOM Elements =====
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const fileNameEl = document.getElementById('file-name');
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');
const bgColorInput = document.getElementById('bg-color');
const bgColorHex = document.getElementById('bg-color-hex');
const textColorInput = document.getElementById('text-color');
const textColorHex = document.getElementById('text-color-hex');
const fontSelect = document.getElementById('font-select');
const aspectRatioSelect = document.getElementById('aspect-ratio');
const paddingRange = document.getElementById('padding-range');
const paddingValue = document.getElementById('padding-value');
const exifCameraInput = document.getElementById('exif-camera');
const exifLensInput = document.getElementById('exif-lens');
const exifSettingsInput = document.getElementById('exif-settings');
const exifDateInput = document.getElementById('exif-date');
const exifLocationInput = document.getElementById('exif-location');
const exifDebugEl = document.getElementById('exif-debug');
const authorInput = document.getElementById('author-name');
const exportMaxSize = document.getElementById('export-maxsize');
const exportFormat = document.getElementById('export-format');
const downloadBtn = document.getElementById('download-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const thumbnailStrip = document.getElementById('thumbnail-strip');
const navPrev = document.getElementById('nav-prev');
const navNext = document.getElementById('nav-next');

// ===== State =====
// Each photo entry: { file, image, exifData, camera, lens, settings }
let photos = [];
let currentIndex = -1;

// ===== File Upload =====
dropZone.addEventListener('click', () => fileInput.click());
uploadBtn.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
  if (files.length > 0) {
    handleFiles(files);
  }
});

fileInput.addEventListener('change', (e) => {
  const files = [...e.target.files];
  if (files.length > 0) handleFiles(files);
});

function handleFiles(files) {
  const startIndex = photos.length;

  files.forEach((file, i) => {
    const entry = {
      file,
      image: null,
      exifData: {},
      camera: '',
      lens: '',
      settings: '',
      date: '',
      location: '',
    };
    const idx = startIndex + i;
    photos.push(entry);

    // Read EXIF
    exifr.parse(file, { translateValues: true, mergeOutput: true }).then((tags) => {
      const exif = extractExif(tags || {});
      entry.exifData = exif;
      entry.exifData._allTags = tags || {};
      entry.camera = exif.camera || '';
      entry.lens = exif.lens || '';
      entry.date = exif.date || '';
      // Build settings string
      const parts = [];
      if (exif.focalLength) parts.push(exif.focalLength);
      if (exif.fNumber) parts.push(exif.fNumber);
      if (exif.shutterSpeed) parts.push(exif.shutterSpeed);
      if (exif.iso) parts.push(exif.iso);
      entry.settings = parts.join('  ');
      // Update UI if this is the currently selected photo
      if (currentIndex === idx) {
        loadEntryToPanel(entry);
        redraw();
      }
    }).catch(() => { /* no EXIF */ });

    // Load image
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        entry.image = img;
        renderThumbnails();
        // Auto-select the first uploaded photo
        if (currentIndex < 0 || startIndex === 0) {
          selectPhoto(0);
        }
        // If this is the current photo, redraw
        if (currentIndex === idx) redraw();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Show UI
  dropZone.style.display = 'none';
  canvas.style.display = 'block';
  thumbnailStrip.style.display = 'flex';
  downloadBtn.disabled = false;
  if (photos.length > 1) {
    downloadAllBtn.style.display = 'block';
  }
  updateNavButtons();
  fileNameEl.textContent = `${photos.length} 枚の写真`;
}

// ===== Photo Selection =====
function selectPhoto(index) {
  if (index < 0 || index >= photos.length) return;

  // Save current panel values to current entry before switching
  saveCurrentPanelToEntry();

  currentIndex = index;
  const entry = photos[index];

  // Load entry data into panel
  loadEntryToPanel(entry);

  // Update thumbnail highlight
  renderThumbnailHighlight();
  updateNavButtons();

  redraw();
}

function saveCurrentPanelToEntry() {
  if (currentIndex >= 0 && currentIndex < photos.length) {
    const entry = photos[currentIndex];
    entry.camera = exifCameraInput.value;
    entry.lens = exifLensInput.value;
    entry.settings = exifSettingsInput.value;
    entry.date = exifDateInput.value;
    entry.location = exifLocationInput.value;
  }
}

function loadEntryToPanel(entry) {
  exifCameraInput.value = entry.camera || '';
  exifLensInput.value = entry.lens || '';
  exifSettingsInput.value = entry.settings || '';
  exifDateInput.value = entry.date || '';
  exifLocationInput.value = entry.location || '';

  // Debug tags
  if (entry.exifData && entry.exifData._allTags) {
    const tagEntries = Object.entries(entry.exifData._allTags)
      .filter(([k, v]) => v !== undefined && v !== null && typeof v !== 'object')
      .map(([k, v]) => `<div class="exif-row"><span class="exif-label">${k}</span><span class="exif-value" title="${String(v)}">${String(v).substring(0, 40)}</span></div>`)
      .join('');
    exifDebugEl.innerHTML = `<details style="margin-top:10px;"><summary style="font-size:11px;color:#666;cursor:pointer;">All EXIF Tags</summary><div style="margin-top:6px;">${tagEntries}</div></details>`;
  } else {
    exifDebugEl.innerHTML = '';
  }
}

// ===== Thumbnails =====
function renderThumbnails() {
  thumbnailStrip.innerHTML = '';
  photos.forEach((entry, i) => {
    const div = document.createElement('div');
    div.className = `thumbnail-item${i === currentIndex ? ' active' : ''}`;
    div.addEventListener('click', () => selectPhoto(i));

    if (entry.image) {
      const img = document.createElement('img');
      img.src = entry.image.src;
      div.appendChild(img);
    }

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'thumbnail-delete';
    delBtn.textContent = '\u00d7';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removePhoto(i);
    });
    div.appendChild(delBtn);

    thumbnailStrip.appendChild(div);
  });
}

function removePhoto(index) {
  photos.splice(index, 1);

  if (photos.length === 0) {
    // Reset to empty state
    currentIndex = -1;
    dropZone.style.display = 'flex';
    canvas.style.display = 'none';
    thumbnailStrip.style.display = 'none';
    downloadBtn.disabled = true;
    downloadAllBtn.style.display = 'none';
    fileNameEl.textContent = '';
    exifCameraInput.value = '';
    exifLensInput.value = '';
    exifSettingsInput.value = '';
    exifDebugEl.innerHTML = '';
    return;
  }

  // Adjust current index
  if (currentIndex >= photos.length) {
    currentIndex = photos.length - 1;
  } else if (currentIndex === index) {
    // Re-select same index (which is now the next photo)
    currentIndex = Math.min(index, photos.length - 1);
  }

  loadEntryToPanel(photos[currentIndex]);
  renderThumbnails();
  fileNameEl.textContent = `${photos.length} 枚の写真`;
  downloadAllBtn.style.display = photos.length > 1 ? 'block' : 'none';
  redraw();
}

function renderThumbnailHighlight() {
  const items = thumbnailStrip.querySelectorAll('.thumbnail-item');
  items.forEach((item, i) => {
    item.classList.toggle('active', i === currentIndex);
  });
}

// ===== EXIF Extraction =====
function extractExif(tags) {
  const data = {};

  const make = tags.Make;
  const model = tags.Model;
  if (make || model) {
    let cameraName = '';
    if (make && model) {
      cameraName = model.startsWith(make) ? model : `${make} ${model}`;
    } else {
      cameraName = make || model;
    }
    data.camera = cameraName.trim();
  }

  const lens = tags.LensModel || tags.Lens || tags.LensInfo;
  if (lens) {
    data.lens = String(lens).trim();
  }

  const focalLength = tags.FocalLength;
  if (focalLength) data.focalLength = `${focalLength}mm`;

  const fNumber = tags.FNumber;
  if (fNumber) data.fNumber = `f/${fNumber}`;

  const exposureTime = tags.ExposureTime;
  if (exposureTime) {
    if (exposureTime < 1) {
      data.shutterSpeed = `1/${Math.round(1 / exposureTime)}s`;
    } else {
      data.shutterSpeed = `${exposureTime}s`;
    }
  }

  const iso = tags.ISO || tags.ISOSpeedRatings;
  if (iso) data.iso = `ISO ${iso}`;

  // Date
  const dateStr = tags.DateTimeOriginal || tags.DateTime;
  if (dateStr) {
    if (dateStr instanceof Date) {
      data.date = dateStr.toISOString().split('T')[0];
    } else {
      // Format "YYYY:MM:DD HH:MM:SS" -> "YYYY-MM-DD"
      const match = String(dateStr).match(/(\d{4})[:\/\-](\d{2})[:\/\-](\d{2})/);
      if (match) data.date = `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  return data;
}

// ===== Info Lines Configuration =====
// Reads checkbox (show) and radio (bold) state from the DOM
function getDisplayConfig() {
  const boldValue = document.querySelector('input[name="bold-line"]:checked')?.value || '';
  const keys = ['cameraLens', 'settings', 'date', 'author', 'location'];
  const config = {};
  for (const key of keys) {
    const showEl = document.getElementById(`show-${key}`);
    config[key] = {
      show: showEl ? showEl.checked : true,
      bold: boldValue === key,
    };
  }
  return config;
}

// Build lines from the panel inputs (for preview canvas)
function getInfoLinesFromPanel() {
  const cfg = getDisplayConfig();
  const lines = [];

  if (cfg.cameraLens.show) {
    const parts = [];
    const cam = exifCameraInput.value.trim();
    const lens = exifLensInput.value.trim();
    if (cam) parts.push(cam);
    if (lens) parts.push(lens);
    if (parts.length) lines.push({ text: parts.join(' / '), bold: cfg.cameraLens.bold });
  }

  if (cfg.settings.show) {
    const t = exifSettingsInput.value.trim();
    if (t) lines.push({ text: t, bold: cfg.settings.bold });
  }

  if (cfg.date.show) {
    const t = exifDateInput.value.trim();
    if (t) lines.push({ text: t, bold: cfg.date.bold });
  }

  if (cfg.author.show) {
    const t = authorInput.value.trim();
    if (t) lines.push({ text: t, bold: cfg.author.bold });
  }

  if (cfg.location.show) {
    const t = exifLocationInput.value.trim();
    if (t) lines.push({ text: t, bold: cfg.location.bold });
  }

  // Bold line always first
  lines.sort((a, b) => (b.bold ? 1 : 0) - (a.bold ? 1 : 0));
  return lines;
}

// Build lines from a stored entry (for batch download offscreen canvas)
function getInfoLinesFromEntry(entry) {
  const cfg = getDisplayConfig();
  const lines = [];

  if (cfg.cameraLens.show) {
    const parts = [];
    if (entry.camera) parts.push(entry.camera);
    if (entry.lens) parts.push(entry.lens);
    if (parts.length) lines.push({ text: parts.join(' / '), bold: cfg.cameraLens.bold });
  }

  if (cfg.settings.show && entry.settings) {
    lines.push({ text: entry.settings, bold: cfg.settings.bold });
  }

  if (cfg.date.show && entry.date) {
    lines.push({ text: entry.date, bold: cfg.date.bold });
  }

  if (cfg.author.show) {
    const t = authorInput.value.trim();
    if (t) lines.push({ text: t, bold: cfg.author.bold });
  }

  if (cfg.location.show && entry.location) {
    lines.push({ text: entry.location, bold: cfg.location.bold });
  }

  // Bold line always first
  lines.sort((a, b) => (b.bold ? 1 : 0) - (a.bold ? 1 : 0));
  return lines;
}
// ===== Aspect Ratio =====
function getAspectRatio(image) {
  const value = aspectRatioSelect.value;
  if (value === 'auto') {
    // Auto-detect: landscape → 5:4, portrait → 4:5
    if (image) {
      const isLandscape = image.naturalWidth >= image.naturalHeight;
      return isLandscape ? 5 / 4 : 4 / 5;
    }
    return 4 / 5; // default
  }
  const [w, h] = value.split(':').map(Number);
  return w / h;
}

// ===== Canvas Drawing =====
function redraw() {
  if (currentIndex < 0 || !photos[currentIndex] || !photos[currentIndex].image) return;

  const entry = photos[currentIndex];
  const loadedImage = entry.image;

  const padding = parseFloat(paddingRange.value) / 100;
  const bgColor = bgColorInput.value;
  const textColor = textColorInput.value;
  const fontFamily = fontSelect.value;
  const aspectRatio = getAspectRatio(loadedImage);

  const imgW = loadedImage.naturalWidth;
  const imgH = loadedImage.naturalHeight;

  const textAreaRatio = 0.15;
  const availRatioW = 1 - 2 * padding;
  const availRatioH = 1 - 2 * padding - textAreaRatio;

  let canvasW, canvasH;

  canvasW = imgW / availRatioW;
  canvasH = canvasW / aspectRatio;

  const availH = canvasH * availRatioH;
  if (imgH > availH) {
    canvasH = imgH / availRatioH;
    canvasW = canvasH * aspectRatio;
  }

  const paddingPxW = canvasW * padding;
  const paddingPxH = canvasH * padding;

  const fitAvailW = canvasW - 2 * paddingPxW;
  const fitAvailH = canvasH - 2 * paddingPxH - canvasH * textAreaRatio;
  const scale = Math.min(fitAvailW / imgW, fitAvailH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;

  const drawX = (canvasW - drawW) / 2;
  const drawY = paddingPxH;

  canvas.width = Math.round(canvasW);
  canvas.height = Math.round(canvasH);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.drawImage(loadedImage, drawX, drawY, drawW, drawH);

  // ===== Draw text below photo =====
  const textStartY = drawY + drawH + paddingPxH * 0.5;
  const boldFontSize = Math.round(canvasH * 0.020);
  const normalFontSize = Math.round(canvasH * 0.016);

  ctx.fillStyle = textColor;
  ctx.textBaseline = 'top';

  let currentY = textStartY;
  const lineHeightBold = boldFontSize * 1.7;
  const lineHeightNormal = normalFontSize * 1.7;
  const centerX = canvasW / 2;

  const lines = getInfoLinesFromPanel();
  for (const line of lines) {
    if (!line.text) continue;
    const fontSize = line.bold ? boldFontSize : normalFontSize;
    const weight = line.bold ? 600 : 400;
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText(line.text, centerX, currentY);
    currentY += line.bold ? lineHeightBold : lineHeightNormal;
  }

  ctx.textAlign = 'left';
}

// ===== Render a specific entry to an offscreen canvas =====
function renderEntryToCanvas(entry) {
  const offCanvas = document.createElement('canvas');
  const offCtx = offCanvas.getContext('2d');

  const loadedImage = entry.image;
  if (!loadedImage) return null;

  const padding = parseFloat(paddingRange.value) / 100;
  const bgColor = bgColorInput.value;
  const textColor = textColorInput.value;
  const fontFamily = fontSelect.value;
  const aspectRatio = getAspectRatio(loadedImage);

  const imgW = loadedImage.naturalWidth;
  const imgH = loadedImage.naturalHeight;

  const textAreaRatio = 0.15;
  const availRatioW = 1 - 2 * padding;
  const availRatioH = 1 - 2 * padding - textAreaRatio;

  let canvasW = imgW / availRatioW;
  let canvasH = canvasW / aspectRatio;

  const availH = canvasH * availRatioH;
  if (imgH > availH) {
    canvasH = imgH / availRatioH;
    canvasW = canvasH * aspectRatio;
  }

  const paddingPxW = canvasW * padding;
  const paddingPxH = canvasH * padding;

  const fitAvailW = canvasW - 2 * paddingPxW;
  const fitAvailH = canvasH - 2 * paddingPxH - canvasH * textAreaRatio;
  const scale = Math.min(fitAvailW / imgW, fitAvailH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;

  const drawX = (canvasW - drawW) / 2;
  const drawY = paddingPxH;

  offCanvas.width = Math.round(canvasW);
  offCanvas.height = Math.round(canvasH);

  offCtx.fillStyle = bgColor;
  offCtx.fillRect(0, 0, canvasW, canvasH);
  offCtx.drawImage(loadedImage, drawX, drawY, drawW, drawH);

  const textStartY = drawY + drawH + paddingPxH * 0.5;
  const boldFontSize = Math.round(canvasH * 0.020);
  const normalFontSize = Math.round(canvasH * 0.016);

  offCtx.fillStyle = textColor;
  offCtx.textBaseline = 'top';

  let currentY = textStartY;
  const lineHeightBold = boldFontSize * 1.7;
  const lineHeightNormal = normalFontSize * 1.7;
  const centerX = canvasW / 2;

  const lines = getInfoLinesFromEntry(entry);
  for (const line of lines) {
    if (!line.text) continue;
    const fontSize = line.bold ? boldFontSize : normalFontSize;
    const weight = line.bold ? 600 : 400;
    offCtx.font = `${weight} ${fontSize}px ${fontFamily}`;
    offCtx.textAlign = 'center';
    offCtx.fillText(line.text, centerX, currentY);
    currentY += line.bold ? lineHeightBold : lineHeightNormal;
  }

  return offCanvas;
}

// ===== Preset Swatches =====
document.querySelectorAll('.preset-swatch').forEach((btn) => {
  btn.addEventListener('click', () => {
    const bg = btn.dataset.bg;
    const text = btn.dataset.text;
    bgColorInput.value = bg;
    bgColorHex.textContent = bg;
    textColorInput.value = text;
    textColorHex.textContent = text;
    // Update active state
    document.querySelectorAll('.preset-swatch').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    redraw();
  });
});

// ===== Settings Event Listeners =====
bgColorInput.addEventListener('input', () => {
  bgColorHex.textContent = bgColorInput.value;
  // Deactivate preset highlight when manually picking
  document.querySelectorAll('.preset-swatch').forEach((b) => b.classList.remove('active'));
  redraw();
});

textColorInput.addEventListener('input', () => {
  textColorHex.textContent = textColorInput.value;
  document.querySelectorAll('.preset-swatch').forEach((b) => b.classList.remove('active'));
  redraw();
});

fontSelect.addEventListener('change', redraw);
aspectRatioSelect.addEventListener('change', redraw);

paddingRange.addEventListener('input', () => {
  paddingValue.textContent = `${paddingRange.value}%`;
  redraw();
});

// Per-field input listeners
const fieldBindings = [
  { el: exifCameraInput, key: 'camera' },
  { el: exifLensInput, key: 'lens' },
  { el: exifSettingsInput, key: 'settings' },
  { el: exifDateInput, key: 'date' },
  { el: authorInput, key: null }, // author is global, not per-photo
  { el: exifLocationInput, key: 'location' },
];
fieldBindings.forEach(({ el, key }) => {
  el.addEventListener('input', () => {
    if (key && currentIndex >= 0) photos[currentIndex][key] = el.value;
    redraw();
  });
});

// Checkbox and radio listeners
document.querySelectorAll('.info-show').forEach((cb) => cb.addEventListener('change', redraw));
document.querySelectorAll('.info-bold').forEach((rb) => rb.addEventListener('change', redraw));

document.getElementById('location-apply-all').addEventListener('click', () => {
  const loc = exifLocationInput.value;
  photos.forEach((entry) => { entry.location = loc; });
});

// ===== Scale Canvas for Export =====
function scaleCanvasForExport(sourceCanvas) {
  const maxSize = parseInt(exportMaxSize.value, 10);
  if (!maxSize || maxSize <= 0) return sourceCanvas; // 0 = original

  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;
  const maxEdge = Math.max(sw, sh);
  if (maxEdge <= maxSize) return sourceCanvas; // already within limit

  const ratio = maxSize / maxEdge;
  const newW = Math.round(sw * ratio);
  const newH = Math.round(sh * ratio);

  const scaled = document.createElement('canvas');
  scaled.width = newW;
  scaled.height = newH;
  const sCtx = scaled.getContext('2d');
  sCtx.drawImage(sourceCanvas, 0, 0, newW, newH);
  return scaled;
}

// ===== Download Current =====
downloadBtn.addEventListener('click', () => {
  if (currentIndex < 0 || !photos[currentIndex]) return;

  saveCurrentPanelToEntry();

  const format = exportFormat.value;
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpeg' ? 0.9 : undefined;
  const ext = format === 'jpeg' ? '.jpg' : '.png';

  const exportCanvas = scaleCanvasForExport(canvas);
  const link = document.createElement('a');
  const baseName = photos[currentIndex].file.name.replace(/\.[^.]+$/, '');
  link.download = `${baseName}_framed${ext}`;
  link.href = exportCanvas.toDataURL(mimeType, quality);
  link.click();
});

// ===== Download All =====
downloadAllBtn.addEventListener('click', async () => {
  saveCurrentPanelToEntry();

  const format = exportFormat.value;
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpeg' ? 0.9 : undefined;
  const ext = format === 'jpeg' ? '.jpg' : '.png';

  for (let i = 0; i < photos.length; i++) {
    const entry = photos[i];
    if (!entry.image) continue;

    const offCanvas = renderEntryToCanvas(entry);
    if (!offCanvas) continue;

    const exportCanvas = scaleCanvasForExport(offCanvas);
    const link = document.createElement('a');
    const baseName = entry.file.name.replace(/\.[^.]+$/, '');
    link.download = `${baseName}_framed${ext}`;
    link.href = exportCanvas.toDataURL(mimeType, quality);
    link.click();

    // Small delay to avoid browser blocking multiple downloads
    await new Promise((r) => setTimeout(r, 300));
  }
});

// ===== Navigation =====
function updateNavButtons() {
  const show = photos.length > 1;
  navPrev.style.display = show ? 'block' : 'none';
  navNext.style.display = show ? 'block' : 'none';
}

navPrev.addEventListener('click', () => {
  if (photos.length > 1) {
    const prev = (currentIndex - 1 + photos.length) % photos.length;
    selectPhoto(prev);
  }
});

navNext.addEventListener('click', () => {
  if (photos.length > 1) {
    const next = (currentIndex + 1) % photos.length;
    selectPhoto(next);
  }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  // Skip if user is typing in an input field
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (photos.length <= 1) return;

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const prev = (currentIndex - 1 + photos.length) % photos.length;
    selectPhoto(prev);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    const next = (currentIndex + 1) % photos.length;
    selectPhoto(next);
  }
});
