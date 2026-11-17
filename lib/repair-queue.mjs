export const REPAIR_QUEUE_STORAGE_KEY = "briliantai.repair-queue.v1";
const MAX_REPAIR_ITEMS = 50;

function defaultStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function safeItems(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => Boolean(
    item && typeof item === "object"
      && typeof item.id === "string"
      && typeof item.lessonId === "string"
      && typeof item.activityId === "string"
      && typeof item.prompt === "string"
      && typeof item.updatedAt === "string",
  )).slice(-MAX_REPAIR_ITEMS);
}

export function readRepairQueue(storage = defaultStorage()) {
  if (!storage) return [];
  try {
    return safeItems(JSON.parse(storage.getItem(REPAIR_QUEUE_STORAGE_KEY) ?? "[]"))
      .sort((a, b) => Number(b.disputed) - Number(a.disputed) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  } catch {
    return [];
  }
}

export function upsertRepairItem(input, storage = defaultStorage(), now = new Date().toISOString()) {
  if (!storage) return null;
  const id = `${input.lessonId}:${input.activityId}`;
  const items = readRepairQueue(storage);
  const previous = items.find((item) => item.id === id);
  const next = {
    ...input,
    id,
    attempts: (previous?.attempts ?? 0) + 1,
    disputed: previous?.disputed ?? false,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
  try {
    storage.setItem(REPAIR_QUEUE_STORAGE_KEY, JSON.stringify([...items.filter((item) => item.id !== id), next].slice(-MAX_REPAIR_ITEMS)));
    return next;
  } catch {
    return null;
  }
}

export function resolveRepairItem(lessonId, activityId, storage = defaultStorage()) {
  if (!storage) return false;
  const id = `${lessonId}:${activityId}`;
  const items = readRepairQueue(storage);
  if (!items.some((item) => item.id === id)) return false;
  try {
    storage.setItem(REPAIR_QUEUE_STORAGE_KEY, JSON.stringify(items.filter((item) => item.id !== id)));
    return true;
  } catch {
    return false;
  }
}

export function markRepairDisputed(lessonId, activityId, storage = defaultStorage(), now = new Date().toISOString()) {
  if (!storage) return false;
  const id = `${lessonId}:${activityId}`;
  const items = readRepairQueue(storage);
  if (!items.some((item) => item.id === id)) return false;
  try {
    storage.setItem(REPAIR_QUEUE_STORAGE_KEY, JSON.stringify(items.map((item) => item.id === id ? { ...item, disputed: true, updatedAt: now } : item)));
    return true;
  } catch {
    return false;
  }
}
