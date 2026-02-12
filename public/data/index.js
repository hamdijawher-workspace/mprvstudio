import "./models.js";
import { CATEGORY_AUDIENCE, CATEGORY_DEFS } from "./catalog.js";
import { PACKS } from "./packs.js";
import { GUIDES } from "./guides.js";
import { COLLECTIONS } from "./collections.js";
import { CREATOR_PICKS } from "./creatorPicks.js";
import { createProductCatalog } from "./products.js";

export const STORAGE_KEYS = Object.freeze({
  weeklyConfigOverride: "mprv_admin_weekly_config",
  productOverrides: "mprv_admin_product_overrides",
  creatorPicksOverride: "mprv_admin_creator_picks"
});

const REMOTE_KEYS = Object.freeze({
  [STORAGE_KEYS.weeklyConfigOverride]: "weeklyConfigOverride",
  [STORAGE_KEYS.productOverrides]: "productOverrides",
  [STORAGE_KEYS.creatorPicksOverride]: "creatorPicksOverride"
});

let remoteOverridesLoaded = false;
let remoteOverrides = null;

const PRODUCT_OVERRIDE_FIELDS = [
  "title",
  "brand",
  "price",
  "imageUrl",
  "shortDescription",
  "affiliateUrl",
  "sourcePlatform",
  "tags"
];

let loaded = false;
let sourceWeeklyConfig = null;
let weeklyConfig = null;
let sourceCreatorPicks = [];
let creatorPicks = [];
let generatedProducts = [];
let products = [];
let productById = new Map();
let productBySlug = new Map();

function ensureLoaded() {
  if (!loaded) {
    throw new Error("Data layer not loaded. Call loadData() first.");
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

async function loadRemoteOverrides() {
  if (remoteOverridesLoaded) {
    return;
  }
  remoteOverridesLoaded = true;
  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return;
  }
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    if (!data || typeof data !== "object") {
      return;
    }
    remoteOverrides = data;
  } catch {
    // ignore; fall back to localStorage (dev) or base data.
  }
}

function readStoredJson(key) {
  const remoteKey = REMOTE_KEYS[key];
  if (remoteKey && remoteOverrides && typeof remoteOverrides === "object") {
    const value = remoteOverrides[remoteKey];
    if (value && typeof value === "object") {
      return value;
    }
    if (Array.isArray(value)) {
      return value;
    }
    if (value === null) {
      return null;
    }
  }

  const storage = getStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function normalizeWeeklyConfig(config) {
  const normalized = {
    ...config
  };
  normalized.featuredProductIds = Array.isArray(normalized.featuredProductIds)
    ? Array.from(new Set(normalized.featuredProductIds))
    : [];
  normalized.archiveByWeek = normalized.archiveByWeek && typeof normalized.archiveByWeek === "object"
    ? normalized.archiveByWeek
    : {};
  normalized.hardArchivedProductIds = Array.isArray(normalized.hardArchivedProductIds)
    ? Array.from(new Set(normalized.hardArchivedProductIds))
    : [];
  return normalized;
}

function applyWeeklyOverride(baseConfig) {
  const override = readStoredJson(STORAGE_KEYS.weeklyConfigOverride);
  if (!override) {
    return normalizeWeeklyConfig(baseConfig);
  }
  return normalizeWeeklyConfig({
    ...baseConfig,
    ...override
  });
}

function applyProductOverrides(baseProducts) {
  const overrides = readStoredJson(STORAGE_KEYS.productOverrides);
  if (!overrides || typeof overrides !== "object") {
    return baseProducts;
  }
  return baseProducts.map((product) => {
    const override = overrides[product.id];
    if (!override || typeof override !== "object") {
      return product;
    }
    const next = {
      ...product
    };
    PRODUCT_OVERRIDE_FIELDS.forEach((field) => {
      if (override[field] === undefined || override[field] === null) {
        return;
      }
      next[field] = override[field];
    });
    next.updatedAt = new Date().toISOString();
    return next;
  });
}

function normalizeCreatorProfile(profile) {
  const next = {
    ...profile
  };
  next.socials = Array.isArray(next.socials) ? next.socials : [];
  next.picks = Array.isArray(next.picks) ? Array.from(new Set(next.picks)).slice(0, 12) : [];
  next.isVisible = next.isVisible !== false;
  return next;
}

function applyCreatorPicksOverride(baseProfiles) {
  const override = readStoredJson(STORAGE_KEYS.creatorPicksOverride);
  if (!Array.isArray(override)) {
    return baseProfiles.map(normalizeCreatorProfile);
  }
  const byId = new Map(
    override
      .map((item) => (item && typeof item === "object" ? item : null))
      .filter(Boolean)
      .map((item) => [item.id, item])
  );
  return baseProfiles.map((profile) => {
    const patch = byId.get(profile.id);
    if (!patch) {
      return normalizeCreatorProfile(profile);
    }
    return normalizeCreatorProfile({
      ...profile,
      ...patch
    });
  });
}

function formatWeekDateRange(weekLabel) {
  const start = new Date(`${weekLabel}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return weekLabel;
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const month = start.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return `${month} ${start.getDate()}-${end.getDate()}`;
}

/**
 * Load products/packs/guides/collections into memory once.
 * Call this before rendering the UI.
 */
export async function loadData() {
  if (loaded) {
    return;
  }

  // Try to load shared production overrides first (falls back gracefully).
  await loadRemoteOverrides();

  const weeklyUrl = new URL("./weekly-config.json", import.meta.url);
  const response = await fetch(weeklyUrl);
  if (!response.ok) {
    throw new Error(`Failed to load weekly config: ${response.status}`);
  }
  sourceWeeklyConfig = normalizeWeeklyConfig(await response.json());
  weeklyConfig = applyWeeklyOverride(sourceWeeklyConfig);
  sourceCreatorPicks = CREATOR_PICKS.map(normalizeCreatorProfile);
  creatorPicks = applyCreatorPicksOverride(sourceCreatorPicks);
  generatedProducts = createProductCatalog(weeklyConfig);
  products = applyProductOverrides(generatedProducts);
  productById = new Map(products.map((item) => [item.id, item]));
  productBySlug = new Map(products.map((item) => [item.slug, item]));
  loaded = true;
}

export function getWeeklyConfigSnapshot() {
  ensureLoaded();
  return deepClone(weeklyConfig);
}

export function getBaseWeeklyConfigSnapshot() {
  ensureLoaded();
  return deepClone(sourceWeeklyConfig);
}

export function getGeneratedProductsSnapshot() {
  ensureLoaded();
  return deepClone(generatedProducts);
}

export function getCreatorPicksSnapshot() {
  ensureLoaded();
  return deepClone(creatorPicks);
}

export function getBaseCreatorPicksSnapshot() {
  ensureLoaded();
  return deepClone(sourceCreatorPicks);
}

export function getCategories() {
  ensureLoaded();
  return CATEGORY_DEFS.slice();
}

export function getAllProducts() {
  ensureLoaded();
  return products.slice();
}

export function getLiveProducts() {
  ensureLoaded();
  return products.filter((item) => item.status === "LIVE");
}

export function getWeeklyProducts() {
  ensureLoaded();
  const rank = new Map((weeklyConfig.featuredProductIds || []).map((id, idx) => [id, idx]));
  return products
    .filter((item) => item.status === "LIVE" && item.isFeaturedThisWeek)
    .sort((a, b) => (rank.get(a.id) || 999) - (rank.get(b.id) || 999));
}

export function getArchivedProducts() {
  ensureLoaded();
  return products.filter((item) => item.status === "LIVE" && !item.isFeaturedThisWeek);
}

export function getArchivedProductsGroupedByWeek() {
  ensureLoaded();
  const grouped = new Map();
  getArchivedProducts().forEach((product) => {
    const key = product.weekLabel || "UNSCHEDULED";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(product);
  });

  return Array.from(grouped.entries())
    .map(([weekLabel, items]) => ({
      weekLabel,
      weekDisplay: weekLabel === "UNSCHEDULED" ? "Unscheduled" : formatWeekDateRange(weekLabel),
      products: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }))
    .sort((a, b) => {
      if (a.weekLabel === "UNSCHEDULED") {
        return 1;
      }
      if (b.weekLabel === "UNSCHEDULED") {
        return -1;
      }
      return b.weekLabel.localeCompare(a.weekLabel);
    });
}

export function getWeeklyDisplayLabel() {
  ensureLoaded();
  return `WEEKLY · ${formatWeekDateRange(weeklyConfig.currentWeekLabel)}`;
}

export function getWeeklyMeta() {
  ensureLoaded();
  return {
    weekLabel: weeklyConfig.currentWeekLabel,
    displayLabel: getWeeklyDisplayLabel(),
    sponsor: weeklyConfig.sponsor || null
  };
}

export function getProductById(id) {
  ensureLoaded();
  return productById.get(id) || null;
}

export function getProductBySlug(slug) {
  ensureLoaded();
  return productBySlug.get(slug) || null;
}

export function getProductsByIds(ids) {
  ensureLoaded();
  return ids.map((id) => getProductById(id)).filter(Boolean);
}

export function getProductsByCategory(categoryId) {
  ensureLoaded();
  return getLiveProducts().filter((item) => item.category === categoryId);
}

export function getPacks() {
  ensureLoaded();
  return PACKS.slice();
}

export function getGuides() {
  ensureLoaded();
  return GUIDES.slice();
}

export function getCollections() {
  ensureLoaded();
  return COLLECTIONS.slice();
}

export function getCreatorPicks() {
  ensureLoaded();
  return creatorPicks.slice();
}

export function getBrands() {
  ensureLoaded();
  return Array.from(new Set(getLiveProducts().map((item) => item.brand))).sort();
}

export function getAudienceForCategory(categoryId) {
  ensureLoaded();
  return CATEGORY_AUDIENCE[categoryId] || {
    whoFor: "People who want fewer, better picks.",
    whoNotFor: "Anyone needing highly specialized edge-case options."
  };
}

export function getProductOutboundUrl(slug) {
  return `/out/?slug=${encodeURIComponent(slug)}`;
}
