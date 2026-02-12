import {
  loadData,
  getCategories,
  getGeneratedProductsSnapshot,
  getWeeklyConfigSnapshot,
  getBaseWeeklyConfigSnapshot,
  getCreatorPicksSnapshot,
  getBaseCreatorPicksSnapshot,
  STORAGE_KEYS
} from "../data/index.js";

const API_STATE_URL = "/api/state";

const MAX_WEEKLY_PICKS = 12;
const MAX_CREATOR_PICKS = 12;
const MAX_VISIBLE_CREATORS = 3;

const PRODUCT_FIELDS = [
  "title",
  "brand",
  "price",
  "imageUrl",
  "shortDescription",
  "affiliateUrl",
  "sourcePlatform"
];

const CREATOR_FIELDS = ["name", "role", "bio", "avatar", "picks", "isVisible"];

const state = {
  categories: [],
  baseProducts: [],
  baseById: new Map(),
  sourceWeeklyConfig: null,
  weeklyConfig: null,
  productOverrides: {},
  featuredSelection: new Set(),
  sponsorSelection: "",
  sourceCreators: [],
  baseCreatorById: new Map(),
  creatorOverrides: {},
  creatorSelection: new Set(),
  activeCreatorId: ""
};

const dom = {};

function byId(id) {
  return document.getElementById(id);
}

function readStoredJson(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

async function fetchRemoteState() {
  const fallback = {
    weeklyConfigOverride: null,
    productOverrides: {},
    creatorPicksOverride: []
  };
  try {
    const response = await fetch(API_STATE_URL, { cache: "no-store" });
    if (!response.ok) {
      return fallback;
    }
    const data = await response.json();
    if (!data || typeof data !== "object") {
      return fallback;
    }
    return {
      weeklyConfigOverride: data.weeklyConfigOverride ?? null,
      productOverrides: data.productOverrides && typeof data.productOverrides === "object" ? data.productOverrides : {},
      creatorPicksOverride: Array.isArray(data.creatorPicksOverride) ? data.creatorPicksOverride : []
    };
  } catch {
    return fallback;
  }
}

async function putRemoteState(payload) {
  const response = await fetch(API_STATE_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const detail = text ? ` ${text}` : "";
    throw new Error(`Save failed (${response.status}).${detail}`);
  }
  return response.json().catch(() => ({}));
}

function buildRemotePayload() {
  return {
    weeklyConfigOverride: state.weeklyConfig,
    productOverrides: state.productOverrides || {},
    creatorPicksOverride: getCreatorOverridesArray()
  };
}

async function persistToRemote(statusNode, successMessage) {
  try {
    await putRemoteState(buildRemotePayload());
    setStatus(statusNode, successMessage);
  } catch (error) {
    setStatus(
      statusNode,
      `${error.message || "Save failed."} (Make sure ADMIN_USER/ADMIN_PASS are set in Cloudflare and you are logged into /admin/ via the browser prompt.)`,
      true
    );
  }
}

function uniq(values) {
  return Array.from(new Set(values));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatMoney(value) {
  if (typeof value === "number") {
    return `$${value}`;
  }
  return String(value || "");
}

function setStatus(node, text, isError = false) {
  if (!node) {
    return;
  }
  node.textContent = text;
  node.style.color = isError ? "#b6412d" : "";
}

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return false;
  }
  for (let idx = 0; idx < a.length; idx += 1) {
    if (a[idx] !== b[idx]) {
      return false;
    }
  }
  return true;
}

function parseCreatorOverrides(raw) {
  if (!Array.isArray(raw)) {
    return {};
  }
  return raw
    .filter((item) => item && typeof item === "object" && typeof item.id === "string")
    .reduce((acc, item) => {
      acc[item.id] = { ...item };
      return acc;
    }, {});
}

function getCreatorOverridesArray() {
  const rank = new Map(state.sourceCreators.map((creator, idx) => [creator.id, idx]));
  return Object.values(state.creatorOverrides)
    .filter((item) => item && typeof item === "object" && item.id)
    .sort((a, b) => (rank.get(a.id) || 9999) - (rank.get(b.id) || 9999));
}

function persistCreatorOverrides() {
  writeStoredJson(STORAGE_KEYS.creatorPicksOverride, getCreatorOverridesArray());
}

function updateImagePreview(node, imageUrl, altText = "Image preview") {
  if (!node) {
    return;
  }
  const nextUrl = String(imageUrl || "").trim();
  if (!nextUrl) {
    node.removeAttribute("src");
    node.classList.remove("is-visible");
    return;
  }
  node.src = nextUrl;
  node.alt = altText;
  node.classList.add("is-visible");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function getEffectiveProduct(productId) {
  const base = state.baseById.get(productId);
  if (!base) {
    return null;
  }
  const override = state.productOverrides[productId] || {};
  return {
    ...base,
    ...override
  };
}

function normalizeCreatorProfile(profile) {
  const next = {
    ...profile
  };
  next.socials = Array.isArray(next.socials) ? next.socials : [];
  next.picks = Array.isArray(next.picks) ? uniq(next.picks).slice(0, MAX_CREATOR_PICKS) : [];
  next.isVisible = next.isVisible !== false;
  return next;
}

function getEffectiveCreator(creatorId) {
  const base = state.baseCreatorById.get(creatorId);
  if (!base) {
    return null;
  }
  const patch = state.creatorOverrides[creatorId] || {};
  return normalizeCreatorProfile({
    ...base,
    ...patch
  });
}

function getAllEffectiveCreators() {
  return state.sourceCreators
    .map((creator) => getEffectiveCreator(creator.id))
    .filter(Boolean);
}

function cacheDom() {
  dom.weekLabel = byId("admin-week-label");
  dom.featuredSearch = byId("admin-featured-search");
  dom.featuredPicker = byId("admin-featured-picker");
  dom.featuredCount = byId("admin-featured-count");
  dom.saveWeeklyBtn = byId("admin-save-weekly-btn");
  dom.clearWeeklyBtn = byId("admin-clear-weekly-btn");
  dom.weeklyStatus = byId("admin-weekly-status");

  dom.sponsorEnabled = byId("admin-sponsor-enabled");
  dom.sponsorLabel = byId("admin-sponsor-label");
  dom.sponsorTitle = byId("admin-sponsor-title");
  dom.sponsorUrl = byId("admin-sponsor-url");
  dom.sponsorCopy = byId("admin-sponsor-copy");
  dom.sponsorSearch = byId("admin-sponsor-search");
  dom.sponsorPicker = byId("admin-sponsor-picker");
  dom.sponsorCount = byId("admin-sponsor-count");
  dom.saveSponsorBtn = byId("admin-save-sponsor-btn");
  dom.clearSponsorBtn = byId("admin-clear-sponsor-btn");
  dom.sponsorStatus = byId("admin-sponsor-status");

  dom.creatorVisibility = byId("admin-creator-visibility");
  dom.visibleCreatorCount = byId("admin-visible-creator-count");
  dom.creatorSelect = byId("admin-creator-select");
  dom.creatorName = byId("admin-creator-name");
  dom.creatorRole = byId("admin-creator-role");
  dom.creatorBio = byId("admin-creator-bio");
  dom.creatorAvatar = byId("admin-creator-avatar");
  dom.creatorAvatarFile = byId("admin-creator-avatar-file");
  dom.creatorAvatarPreview = byId("admin-creator-avatar-preview");
  dom.creatorSearch = byId("admin-creator-search");
  dom.creatorPicker = byId("admin-creator-picker");
  dom.creatorCount = byId("admin-creator-count");
  dom.saveCreatorBtn = byId("admin-save-creator-btn");
  dom.clearCreatorBtn = byId("admin-clear-creator-btn");
  dom.creatorStatus = byId("admin-creator-status");

  dom.productSelect = byId("admin-product-select");
  dom.productForm = byId("admin-product-form");
  dom.productTitle = byId("admin-product-title");
  dom.productBrand = byId("admin-product-brand");
  dom.productPrice = byId("admin-product-price");
  dom.productImageUrl = byId("admin-product-image-url");
  dom.productImageFile = byId("admin-product-image-file");
  dom.productImagePreview = byId("admin-product-image-preview");
  dom.productSourcePlatform = byId("admin-product-source-platform");
  dom.productAffiliateUrl = byId("admin-product-affiliate-url");
  dom.productDescription = byId("admin-product-description");
  dom.productStatus = byId("admin-product-status");
  dom.resetProductBtn = byId("admin-reset-product-btn");

  dom.exportBtn = byId("admin-export-btn");
  dom.clearAllBtn = byId("admin-clear-all-btn");
}

function updateFeaturedCount() {
  if (!dom.featuredCount) {
    return;
  }
  const selected = state.featuredSelection.size;
  dom.featuredCount.textContent = `${selected}/${MAX_WEEKLY_PICKS} selected`;
  dom.featuredCount.classList.toggle("is-invalid", selected !== MAX_WEEKLY_PICKS);
}

function updateSponsorCount() {
  if (!dom.sponsorCount) {
    return;
  }
  const selected = state.sponsorSelection ? 1 : 0;
  dom.sponsorCount.textContent = `${selected}/1 selected`;
}

function updateCreatorCount() {
  if (!dom.creatorCount) {
    return;
  }
  const selected = state.creatorSelection.size;
  dom.creatorCount.textContent = `${selected}/${MAX_CREATOR_PICKS} selected`;
  dom.creatorCount.classList.toggle("is-invalid", selected > MAX_CREATOR_PICKS || selected === 0);
}

function updateVisibleCreatorCount() {
  if (!dom.visibleCreatorCount) {
    return;
  }
  const visibleCount = getAllEffectiveCreators().filter((creator) => creator.isVisible !== false).length;
  dom.visibleCreatorCount.textContent = `${visibleCount}/${MAX_VISIBLE_CREATORS} visible`;
  dom.visibleCreatorCount.classList.toggle("is-invalid", visibleCount === 0 || visibleCount > MAX_VISIBLE_CREATORS);
}

function renderProductSelect(selectedId) {
  if (!dom.productSelect) {
    return;
  }
  const products = state.baseProducts
    .slice()
    .sort((a, b) => `${a.brand} ${a.title}`.localeCompare(`${b.brand} ${b.title}`));

  dom.productSelect.innerHTML = "";
  products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = `${product.brand} · ${product.title}`;
    dom.productSelect.appendChild(option);
  });

  const firstId = products[0]?.id || "";
  dom.productSelect.value = selectedId || firstId;
  loadProductForm(dom.productSelect.value);
}

function loadProductForm(productId) {
  const product = getEffectiveProduct(productId);
  if (!product) {
    return;
  }
  dom.productTitle.value = product.title || "";
  dom.productBrand.value = product.brand || "";
  dom.productPrice.value = String(product.price ?? "");
  dom.productImageUrl.value = product.imageUrl || "";
  dom.productSourcePlatform.value = product.sourcePlatform || "";
  dom.productAffiliateUrl.value = product.affiliateUrl || "";
  dom.productDescription.value = product.shortDescription || "";
  updateImagePreview(dom.productImagePreview, product.imageUrl, `${product.title} preview`);
}

function getGroupedProducts(query = "") {
  return state.categories
    .map((category) => {
      const items = state.baseProducts
        .filter((product) => product.category === category.id)
        .map((product) => getEffectiveProduct(product.id))
        .filter(Boolean)
        .filter((product) => {
          if (!query) {
            return true;
          }
          return (
            product.title.toLowerCase().includes(query) ||
            product.brand.toLowerCase().includes(query)
          );
        });
      return {
        category,
        items
      };
    })
    .filter((group) => group.items.length);
}

function buildPickerGroup(categoryLabel, items, renderItem) {
  const group = document.createElement("section");
  group.className = "admin-picker-group";
  group.innerHTML = `<h3>${categoryLabel} (${items.length})</h3>`;

  const list = document.createElement("div");
  list.className = "admin-picker-list";

  items.forEach((item) => {
    list.appendChild(renderItem(item));
  });

  group.appendChild(list);
  return group;
}

function renderWeeklyPicker() {
  if (!dom.featuredPicker) {
    return;
  }
  const query = (dom.featuredSearch?.value || "").trim().toLowerCase();
  dom.featuredPicker.innerHTML = "";

  getGroupedProducts(query).forEach(({ category, items }) => {
    dom.featuredPicker.appendChild(
      buildPickerGroup(category.label, items, (product) => {
        const label = document.createElement("label");
        label.className = "admin-picker-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = state.featuredSelection.has(product.id);
        checkbox.disabled = !checkbox.checked && state.featuredSelection.size >= MAX_WEEKLY_PICKS;
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            if (state.featuredSelection.size >= MAX_WEEKLY_PICKS) {
              checkbox.checked = false;
              setStatus(dom.weeklyStatus, `Weekly must contain exactly ${MAX_WEEKLY_PICKS} picks.`, true);
              return;
            }
            state.featuredSelection.add(product.id);
          } else {
            state.featuredSelection.delete(product.id);
          }
          updateFeaturedCount();
          setStatus(dom.weeklyStatus, "");
          renderWeeklyPicker();
        });

        const copy = document.createElement("span");
        copy.innerHTML = `
          <strong>${product.title}</strong>
          <span class="admin-picker-meta">${product.brand} · ${formatMoney(product.price)} · ${product.id}</span>
        `;

        label.appendChild(checkbox);
        label.appendChild(copy);
        return label;
      })
    );
  });

  updateFeaturedCount();
}

function renderSponsorPicker() {
  if (!dom.sponsorPicker) {
    return;
  }
  const query = (dom.sponsorSearch?.value || "").trim().toLowerCase();
  dom.sponsorPicker.innerHTML = "";

  getGroupedProducts(query).forEach(({ category, items }) => {
    dom.sponsorPicker.appendChild(
      buildPickerGroup(category.label, items, (product) => {
        const label = document.createElement("label");
        label.className = "admin-picker-item";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "admin-sponsor-product";
        radio.checked = state.sponsorSelection === product.id;
        radio.addEventListener("change", () => {
          state.sponsorSelection = product.id;
          updateSponsorCount();
          setStatus(dom.sponsorStatus, "");
        });

        const copy = document.createElement("span");
        copy.innerHTML = `
          <strong>${product.title}</strong>
          <span class="admin-picker-meta">${product.brand} · ${formatMoney(product.price)} · ${product.id}</span>
        `;

        label.appendChild(radio);
        label.appendChild(copy);
        return label;
      })
    );
  });

  updateSponsorCount();
}

function renderCreatorSelect(selectedId) {
  if (!dom.creatorSelect) {
    return;
  }
  const creators = getAllEffectiveCreators();
  dom.creatorSelect.innerHTML = "";

  creators.forEach((creator) => {
    const option = document.createElement("option");
    option.value = creator.id;
    option.textContent = `${creator.name} · ${creator.role}`;
    dom.creatorSelect.appendChild(option);
  });

  const firstId = creators[0]?.id || "";
  const targetId = selectedId || firstId;
  dom.creatorSelect.value = targetId;
  loadCreatorForm(targetId);
}

function renderCreatorVisibilityList() {
  if (!dom.creatorVisibility) {
    return;
  }
  const creators = getAllEffectiveCreators();
  const visibleCount = creators.filter((creator) => creator.isVisible !== false).length;

  dom.creatorVisibility.innerHTML = "";
  creators.forEach((creator) => {
    const label = document.createElement("label");
    label.className = "admin-picker-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = creator.isVisible !== false;
    checkbox.disabled = !checkbox.checked && visibleCount >= MAX_VISIBLE_CREATORS;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked && getAllEffectiveCreators().filter((item) => item.isVisible !== false).length >= MAX_VISIBLE_CREATORS) {
        checkbox.checked = false;
        setStatus(dom.creatorStatus, `You can show up to ${MAX_VISIBLE_CREATORS} creators.`, true);
        return;
      }
      updateCreatorVisibilityOverride(creator.id, checkbox.checked);
      renderCreatorVisibilityList();
      renderCreatorSelect(state.activeCreatorId || creator.id);
      setStatus(dom.creatorStatus, "Creator visibility updated.");
    });

    const copy = document.createElement("span");
    copy.innerHTML = `
      <strong>${creator.name}</strong>
      <span class="admin-picker-meta">${creator.role} · ${creator.id}</span>
    `;

    label.appendChild(checkbox);
    label.appendChild(copy);
    dom.creatorVisibility.appendChild(label);
  });

  updateVisibleCreatorCount();
}

function loadSponsorForm() {
  const sponsor = state.weeklyConfig?.sponsor || null;
  state.sponsorSelection = sponsor?.productId || "";

  if (dom.sponsorEnabled) {
    dom.sponsorEnabled.value = sponsor ? "yes" : "no";
  }
  if (dom.sponsorLabel) {
    dom.sponsorLabel.value = sponsor?.label || "Sponsored";
  }
  if (dom.sponsorTitle) {
    dom.sponsorTitle.value = sponsor?.title || "";
  }
  if (dom.sponsorUrl) {
    dom.sponsorUrl.value = sponsor?.url || "";
  }
  if (dom.sponsorCopy) {
    dom.sponsorCopy.value = sponsor?.copy || "";
  }

  renderSponsorPicker();
}

function loadCreatorForm(creatorId) {
  const creator = getEffectiveCreator(creatorId);
  if (!creator) {
    return;
  }
  state.activeCreatorId = creator.id;
  state.creatorSelection = new Set((creator.picks || []).slice(0, MAX_CREATOR_PICKS));

  dom.creatorName.value = creator.name || "";
  dom.creatorRole.value = creator.role || "";
  dom.creatorBio.value = creator.bio || "";
  dom.creatorAvatar.value = creator.avatar || "";
  updateImagePreview(dom.creatorAvatarPreview, creator.avatar, `${creator.name} avatar preview`);

  renderCreatorPicker();
  setStatus(dom.creatorStatus, "");
}

function renderCreatorPicker() {
  if (!dom.creatorPicker) {
    return;
  }
  const query = (dom.creatorSearch?.value || "").trim().toLowerCase();
  dom.creatorPicker.innerHTML = "";

  getGroupedProducts(query).forEach(({ category, items }) => {
    dom.creatorPicker.appendChild(
      buildPickerGroup(category.label, items, (product) => {
        const label = document.createElement("label");
        label.className = "admin-picker-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = state.creatorSelection.has(product.id);
        checkbox.disabled = !checkbox.checked && state.creatorSelection.size >= MAX_CREATOR_PICKS;
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            if (state.creatorSelection.size >= MAX_CREATOR_PICKS) {
              checkbox.checked = false;
              setStatus(dom.creatorStatus, `Creators can include up to ${MAX_CREATOR_PICKS} products.`, true);
              return;
            }
            state.creatorSelection.add(product.id);
          } else {
            state.creatorSelection.delete(product.id);
          }
          updateCreatorCount();
          setStatus(dom.creatorStatus, "");
          renderCreatorPicker();
        });

        const copy = document.createElement("span");
        copy.innerHTML = `
          <strong>${product.title}</strong>
          <span class="admin-picker-meta">${product.brand} · ${formatMoney(product.price)} · ${product.id}</span>
        `;

        label.appendChild(checkbox);
        label.appendChild(copy);
        return label;
      })
    );
  });

  updateCreatorCount();
}

function parsePrice(value, fallback) {
  const next = value.trim();
  if (!next) {
    return fallback;
  }
  const asNumber = Number(next);
  if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
    return asNumber;
  }
  return next;
}

function saveProductOverride() {
  const productId = dom.productSelect?.value;
  const base = state.baseById.get(productId);
  if (!base) {
    return;
  }

  const nextValues = {
    title: dom.productTitle.value.trim(),
    brand: dom.productBrand.value.trim(),
    price: parsePrice(dom.productPrice.value, base.price),
    imageUrl: dom.productImageUrl.value.trim(),
    sourcePlatform: dom.productSourcePlatform.value.trim(),
    affiliateUrl: dom.productAffiliateUrl.value.trim(),
    shortDescription: dom.productDescription.value.trim()
  };

  const patch = {};
  PRODUCT_FIELDS.forEach((field) => {
    if (nextValues[field] !== base[field]) {
      patch[field] = nextValues[field];
    }
  });

  if (Object.keys(patch).length) {
    state.productOverrides[productId] = patch;
  } else {
    delete state.productOverrides[productId];
  }

  writeStoredJson(STORAGE_KEYS.productOverrides, state.productOverrides);
  void persistToRemote(dom.productStatus, "Product override saved to production.");
  renderProductSelect(productId);
  renderWeeklyPicker();
  renderSponsorPicker();
  renderCreatorPicker();
}

function resetProductOverride() {
  const productId = dom.productSelect?.value;
  if (!productId) {
    return;
  }
  if (state.productOverrides[productId]) {
    delete state.productOverrides[productId];
    writeStoredJson(STORAGE_KEYS.productOverrides, state.productOverrides);
  }
  loadProductForm(productId);
  void persistToRemote(dom.productStatus, "Product override removed from production.");
  renderWeeklyPicker();
  renderSponsorPicker();
  renderCreatorPicker();
}

function saveWeeklyOverride() {
  const selectedIds = Array.from(state.featuredSelection);
  if (selectedIds.length !== MAX_WEEKLY_PICKS) {
    setStatus(dom.weeklyStatus, `Weekly must contain exactly ${MAX_WEEKLY_PICKS} picks.`, true);
    return;
  }

  const weekLabel = dom.weekLabel.value || state.weeklyConfig.currentWeekLabel;
  const archiveByWeek = deepClone(state.weeklyConfig.archiveByWeek || {});
  const previousWeek = state.weeklyConfig.currentWeekLabel;
  const previousFeatured = state.weeklyConfig.featuredProductIds || [];
  const movedToArchive = previousFeatured.filter((id) => !state.featuredSelection.has(id));

  if (previousWeek && movedToArchive.length) {
    archiveByWeek[previousWeek] = uniq([...(archiveByWeek[previousWeek] || []), ...movedToArchive]);
  }

  Object.keys(archiveByWeek).forEach((week) => {
    archiveByWeek[week] = uniq((archiveByWeek[week] || []).filter((id) => !state.featuredSelection.has(id)));
    if (!archiveByWeek[week].length) {
      delete archiveByWeek[week];
    }
  });

  const orderRank = new Map(state.baseProducts.map((product, index) => [product.id, index]));
  selectedIds.sort((a, b) => (orderRank.get(a) || 9999) - (orderRank.get(b) || 9999));

  const nextConfig = {
    ...state.weeklyConfig,
    currentWeekLabel: weekLabel,
    featuredProductIds: selectedIds,
    archiveByWeek
  };

  writeStoredJson(STORAGE_KEYS.weeklyConfigOverride, nextConfig);
  state.weeklyConfig = nextConfig;
  void persistToRemote(dom.weeklyStatus, "Weekly picks saved to production.");
}

function clearWeeklyOverride() {
  window.localStorage.removeItem(STORAGE_KEYS.weeklyConfigOverride);
  state.weeklyConfig = deepClone(state.sourceWeeklyConfig);
  state.featuredSelection = new Set(state.weeklyConfig.featuredProductIds || []);
  dom.weekLabel.value = state.weeklyConfig.currentWeekLabel || "";
  loadSponsorForm();
  renderWeeklyPicker();
  void persistToRemote(dom.weeklyStatus, "Weekly override cleared in production.");
  window.setTimeout(() => window.location.reload(), 450);
}

function saveSponsorOverride() {
  const sponsorEnabled = dom.sponsorEnabled?.value !== "no";
  const sponsorProduct = state.sponsorSelection ? getEffectiveProduct(state.sponsorSelection) : null;

  if (sponsorEnabled && !sponsorProduct) {
    setStatus(dom.sponsorStatus, "Pick exactly one product for sponsor placement.", true);
    return;
  }

  const sponsor = sponsorEnabled
    ? {
        label: dom.sponsorLabel.value.trim() || "Sponsored",
        title: dom.sponsorTitle.value.trim() || sponsorProduct.title,
        copy: dom.sponsorCopy.value.trim() || `Featured partner placement for ${sponsorProduct.brand}.`,
        url: dom.sponsorUrl.value.trim() || sponsorProduct.affiliateUrl,
        productId: sponsorProduct.id
      }
    : null;

  const nextConfig = {
    ...state.weeklyConfig,
    sponsor
  };

  writeStoredJson(STORAGE_KEYS.weeklyConfigOverride, nextConfig);
  state.weeklyConfig = nextConfig;
  void persistToRemote(dom.sponsorStatus, sponsor ? "Sponsor saved to production." : "Sponsor disabled in production.");
  updateSponsorCount();
}

function clearSponsorOverride() {
  state.sponsorSelection = "";
  const nextConfig = {
    ...state.weeklyConfig,
    sponsor: null
  };
  writeStoredJson(STORAGE_KEYS.weeklyConfigOverride, nextConfig);
  state.weeklyConfig = nextConfig;
  if (dom.sponsorEnabled) {
    dom.sponsorEnabled.value = "no";
  }
  if (dom.sponsorLabel) {
    dom.sponsorLabel.value = "Sponsored";
  }
  if (dom.sponsorTitle) {
    dom.sponsorTitle.value = "";
  }
  if (dom.sponsorUrl) {
    dom.sponsorUrl.value = "";
  }
  if (dom.sponsorCopy) {
    dom.sponsorCopy.value = "";
  }
  renderSponsorPicker();
  void persistToRemote(dom.sponsorStatus, "Sponsor cleared in production.");
}

function updateCreatorVisibilityOverride(creatorId, isVisible) {
  const base = state.baseCreatorById.get(creatorId);
  if (!base) {
    return;
  }
  const next = {
    ...(state.creatorOverrides[creatorId] || { id: creatorId })
  };

  if (isVisible !== (base.isVisible !== false)) {
    next.isVisible = isVisible;
  } else {
    delete next.isVisible;
  }

  const managedKeys = Object.keys(next).filter((key) => key !== "id");
  if (!managedKeys.length) {
    delete state.creatorOverrides[creatorId];
  } else {
    state.creatorOverrides[creatorId] = next;
  }

  persistCreatorOverrides();
}

function saveCreatorOverride() {
  const creatorId = dom.creatorSelect?.value;
  const base = state.baseCreatorById.get(creatorId);
  if (!base) {
    return;
  }

  const orderRank = new Map(state.baseProducts.map((product, idx) => [product.id, idx]));
  const picks = Array.from(state.creatorSelection)
    .slice(0, MAX_CREATOR_PICKS)
    .sort((a, b) => (orderRank.get(a) || 9999) - (orderRank.get(b) || 9999));

  const effectiveCreator = getEffectiveCreator(creatorId);
  const nextValues = {
    name: dom.creatorName.value.trim(),
    role: dom.creatorRole.value.trim(),
    bio: dom.creatorBio.value.trim(),
    avatar: dom.creatorAvatar.value.trim(),
    picks,
    isVisible: effectiveCreator?.isVisible !== false
  };

  const previous = state.creatorOverrides[creatorId] || { id: creatorId };
  const nextPatch = { id: creatorId };

  Object.keys(previous).forEach((key) => {
    if (key !== "id" && !CREATOR_FIELDS.includes(key)) {
      nextPatch[key] = previous[key];
    }
  });

  CREATOR_FIELDS.forEach((field) => {
    const baseValue = field === "isVisible" ? base.isVisible !== false : base[field];
    const nextValue = nextValues[field];
    const hasChanged = Array.isArray(nextValue)
      ? !arraysEqual(nextValue, Array.isArray(baseValue) ? baseValue : [])
      : nextValue !== baseValue;

    if (hasChanged) {
      nextPatch[field] = nextValue;
    }
  });

  const managedKeys = Object.keys(nextPatch).filter((key) => key !== "id");
  if (!managedKeys.length) {
    delete state.creatorOverrides[creatorId];
  } else {
    state.creatorOverrides[creatorId] = nextPatch;
  }

  persistCreatorOverrides();
  renderCreatorVisibilityList();
  renderCreatorSelect(creatorId);
  void persistToRemote(dom.creatorStatus, "Creator settings saved to production.");
}

function clearCreatorOverride() {
  const creatorId = dom.creatorSelect?.value;
  if (!creatorId) {
    return;
  }
  if (state.creatorOverrides[creatorId]) {
    delete state.creatorOverrides[creatorId];
    persistCreatorOverrides();
  }
  renderCreatorVisibilityList();
  renderCreatorSelect(creatorId);
  void persistToRemote(dom.creatorStatus, "Creator override removed from production.");
}

async function handleImageUpload(fileInput, textInput, previewNode, statusNode, label) {
  const file = fileInput?.files?.[0];
  if (!file) {
    return;
  }
  if (!file.type || !file.type.startsWith("image/")) {
    setStatus(statusNode, "Please upload an image file.", true);
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    textInput.value = dataUrl;
    updateImagePreview(previewNode, dataUrl, label);
    setStatus(statusNode, "Image uploaded from file.");
  } catch (error) {
    setStatus(statusNode, error.message || "Image upload failed.", true);
  }
}

function exportOverrides() {
  const payload = {
    exportedAt: new Date().toISOString(),
    weeklyConfigOverride: readStoredJson(STORAGE_KEYS.weeklyConfigOverride, null),
    productOverrides: readStoredJson(STORAGE_KEYS.productOverrides, {}),
    creatorPicksOverride: readStoredJson(STORAGE_KEYS.creatorPicksOverride, [])
  };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mprv-admin-overrides.json";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function clearAllOverrides() {
  window.localStorage.removeItem(STORAGE_KEYS.weeklyConfigOverride);
  window.localStorage.removeItem(STORAGE_KEYS.productOverrides);
  window.localStorage.removeItem(STORAGE_KEYS.creatorPicksOverride);

  state.productOverrides = {};
  state.creatorOverrides = {};
  state.weeklyConfig = deepClone(state.sourceWeeklyConfig);
  state.featuredSelection = new Set(state.weeklyConfig.featuredProductIds || []);

  void persistToRemote(dom.weeklyStatus, "All overrides cleared in production. Reloading admin.");
  window.setTimeout(() => window.location.reload(), 450);
}

function bindEvents() {
  dom.featuredSearch?.addEventListener("input", renderWeeklyPicker);
  dom.saveWeeklyBtn?.addEventListener("click", saveWeeklyOverride);
  dom.clearWeeklyBtn?.addEventListener("click", clearWeeklyOverride);

  dom.sponsorSearch?.addEventListener("input", renderSponsorPicker);
  dom.saveSponsorBtn?.addEventListener("click", saveSponsorOverride);
  dom.clearSponsorBtn?.addEventListener("click", clearSponsorOverride);

  dom.creatorSelect?.addEventListener("change", () => {
    loadCreatorForm(dom.creatorSelect.value);
  });
  dom.creatorSearch?.addEventListener("input", renderCreatorPicker);
  dom.saveCreatorBtn?.addEventListener("click", saveCreatorOverride);
  dom.clearCreatorBtn?.addEventListener("click", clearCreatorOverride);
  dom.creatorAvatar?.addEventListener("input", () => {
    updateImagePreview(dom.creatorAvatarPreview, dom.creatorAvatar.value.trim(), "Creator avatar preview");
  });
  dom.creatorAvatarFile?.addEventListener("change", async () => {
    await handleImageUpload(dom.creatorAvatarFile, dom.creatorAvatar, dom.creatorAvatarPreview, dom.creatorStatus, "Creator avatar preview");
  });

  dom.productSelect?.addEventListener("change", () => {
    loadProductForm(dom.productSelect.value);
    setStatus(dom.productStatus, "");
  });

  dom.productImageUrl?.addEventListener("input", () => {
    updateImagePreview(dom.productImagePreview, dom.productImageUrl.value.trim(), "Product image preview");
  });
  dom.productImageFile?.addEventListener("change", async () => {
    await handleImageUpload(dom.productImageFile, dom.productImageUrl, dom.productImagePreview, dom.productStatus, "Product image preview");
  });

  dom.productForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProductOverride();
  });

  dom.resetProductBtn?.addEventListener("click", resetProductOverride);
  dom.exportBtn?.addEventListener("click", exportOverrides);
  dom.clearAllBtn?.addEventListener("click", clearAllOverrides);
}

async function initialize() {
  cacheDom();
  bindEvents();

  await loadData();

  // Prefer shared production state for the editor (falls back to local storage).
  const remote = await fetchRemoteState();

  state.categories = getCategories();
  state.baseProducts = getGeneratedProductsSnapshot();
  state.baseById = new Map(state.baseProducts.map((product) => [product.id, product]));

  state.sourceWeeklyConfig = getBaseWeeklyConfigSnapshot();
  state.weeklyConfig = getWeeklyConfigSnapshot();
  state.productOverrides = remote.productOverrides || readStoredJson(STORAGE_KEYS.productOverrides, {}) || {};
  state.featuredSelection = new Set(state.weeklyConfig.featuredProductIds || []);

  const baseCreators = getBaseCreatorPicksSnapshot();
  const effectiveCreators = getCreatorPicksSnapshot();
  state.sourceCreators = baseCreators.length ? baseCreators : effectiveCreators;
  state.baseCreatorById = new Map(state.sourceCreators.map((creator) => [creator.id, normalizeCreatorProfile(creator)]));
  state.creatorOverrides = parseCreatorOverrides(remote.creatorPicksOverride || readStoredJson(STORAGE_KEYS.creatorPicksOverride, []));

  if (dom.weekLabel) {
    dom.weekLabel.value = state.weeklyConfig.currentWeekLabel || "";
  }

  renderWeeklyPicker();
  loadSponsorForm();
  renderCreatorVisibilityList();
  renderCreatorSelect();
  renderProductSelect();
}

initialize().catch((error) => {
  console.error(error);
  setStatus(dom.weeklyStatus, `Failed to load admin: ${error.message}`, true);
});
