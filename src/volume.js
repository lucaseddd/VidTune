export function normalizeVolume(value) {
  if (value == null || value === '') return 1;
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.round(Math.max(0, Math.min(1, number)) * 10000) / 10000
    : 1;
}

export function positionToVolume(position) {
  const fraction = Math.max(0, Math.min(100, Number(position) || 0)) / 100;
  return normalizeVolume(fraction * fraction);
}

export function volumeToPosition(volume) {
  return Math.round(Math.sqrt(normalizeVolume(volume)) * 100);
}

export function formatVolume(volume) {
  const percent = normalizeVolume(volume) * 100;
  if (percent === 0) return '0%';
  if (percent < 1) return `${percent.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
  if (percent < 10) return `${percent.toFixed(1).replace(/\.0$/, '')}%`;
  return `${Math.round(percent)}%`;
}
