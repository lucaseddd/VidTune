export function normalizeVolume(value) {
  if (value == null || value === '') return 1;
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.round(Math.max(0, Math.min(3, number)) * 10000) / 10000
    : 1;
}

export function positionToVolume(position) {
  const point = Math.max(0, Math.min(200, Number(position) || 0));
  return point <= 100
    ? normalizeVolume((point / 100) ** 2)
    : normalizeVolume(1 + (point - 100) / 50);
}

export function volumeToPosition(volume) {
  const normalized = normalizeVolume(volume);
  return normalized <= 1
    ? Math.round(Math.sqrt(normalized) * 100)
    : Math.round(100 + (normalized - 1) * 50);
}

export function formatVolume(volume) {
  const percent = normalizeVolume(volume) * 100;
  if (percent === 0) return '0%';
  if (percent < 1) return `${percent.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
  if (percent < 10) return `${percent.toFixed(1).replace(/\.0$/, '')}%`;
  return `${Math.round(percent)}%`;
}
