export const MIN_SPEED = 0.1;
export const MAX_SPEED = 16;
export const SPEED_STEP = 0.1;
export const SPEED_PRESETS = Object.freeze([0.5, 1, 1.5, 2, 3, 4]);

export function normalizeSpeed(value) {
  if (value == null || value === '') return 1;
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.round(Math.min(MAX_SPEED, Math.max(MIN_SPEED, number)) * 100) / 100;
}

export function adjustSpeed(current, direction) {
  return normalizeSpeed(Math.round((normalizeSpeed(current) + SPEED_STEP * direction) * 100) / 100);
}

export function formatSpeed(value) {
  return `${normalizeSpeed(value).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`;
}
