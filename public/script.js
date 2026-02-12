import {
  loadData,
  getAllProducts,
  getArchivedProductsGroupedByWeek,
  getAudienceForCategory,
  getBrands,
  getCategories,
  getCollections,
  getCreatorPicks,
  getGuides,
  getPacks,
  getProductById,
  getProductBySlug,
  getProductOutboundUrl,
  getProductsByCategory,
  getProductsByIds,
  getWeeklyDisplayLabel,
  getWeeklyMeta,
  getWeeklyProducts
} from "./data/index.js";

const VIEWS = new Set([
  "discover",
  "weekly",
  "archive",
  "categories",
  "packs",
  "global",
  "newsletter",
  "club",
  "concierge",
  "legal",
  "product"
]);

const THEME_STORAGE_KEY = "mprv-theme";

const state = {
  view: "",
  activeCategory: "",
  searchQuery: "",
  activeGlobalProfile: "",
  activeProductId: "",
  activePlacement: "unknown",
  lastBrowseView: "discover"
};

const dom = {};
const sentImpressions = new Set();

document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    console.error(error);
    document.body.innerHTML = `<pre style="padding:16px;color:#8b0000;">Runtime error:\n${error.message}</pre>`;
  });
});

async function init() {
  bindDom();
  initializeTheme();
  await loadData();
  validateData();

  const categories = getCategories();
  state.activeCategory = categories[0]?.id || "";
  state.activeGlobalProfile = getVisibleCreatorPicks()[0]?.id || "";

  buildCategoryMenu(categories);
  buildCategorySelect(categories);
  buildNewsletterSegments(categories);
  updateWeeklyLabels();

  bindGlobalEvents();
  bindFormEvents();
  bindProductEvents();
  bindShareEvents();

  updateCapPanel();
  renderDiscover();
  renderWeekly();
  renderArchive();
  renderCategories();
  renderPacks();
  renderGuides();
  renderCollectionsAndBrands();
  renderGlobalSelects();
  setupCollapsingHeader();
  setupCustomCursor();

  routeFromHash();
  window.addEventListener("hashchange", routeFromHash);
}

function bindDom() {
  dom.siteHeader = document.getElementById("site-header");
  dom.menuToggle = document.getElementById("menu-toggle");
  dom.siteNav = document.getElementById("site-nav");
  dom.weeklyNavBtn = document.getElementById("weekly-nav-btn");
  dom.themeToggle = document.getElementById("theme-toggle");
  dom.cursorRing = document.getElementById("cursor-ring");
  dom.views = Array.from(document.querySelectorAll(".view"));
  dom.navButtons = Array.from(document.querySelectorAll("[data-view]"));
  dom.categoryMenu = document.getElementById("category-menu");
  dom.categorySelect = document.getElementById("category-select");
  dom.searchInput = document.getElementById("search-input");
  dom.categoryGrid = document.getElementById("category-grid");
  dom.categoryCountPill = document.getElementById("category-count-pill");
  dom.categoryLiveCount = document.getElementById("category-live-count");
  dom.searchSuggest = document.getElementById("search-suggest");
  dom.capWeekly = document.getElementById("cap-weekly");
  dom.capEssentials = document.getElementById("cap-essentials");
  dom.capPacks = document.getElementById("cap-packs");
  dom.discoverWeeklyGrid = document.getElementById("discover-weekly-grid");
  dom.discoverWeeklyTitle = document.getElementById("discover-weekly-title");
  dom.discoverPackGrid = document.getElementById("discover-pack-grid");
  dom.discoverGlobalPromo = document.getElementById("discover-global-promo");
  dom.homeClubJoinBtn = document.getElementById("home-club-join-btn");
  dom.heroNewsletterForm = document.getElementById("hero-newsletter-form");
  dom.heroNewsletterEmail = document.getElementById("hero-newsletter-email");
  dom.heroNewsletterStatus = document.getElementById("hero-newsletter-status");
  dom.weeklyTitle = document.getElementById("weekly-title");
  dom.weeklyGrid = document.getElementById("weekly-grid");
  dom.weeklyArchiveWrap = document.getElementById("weekly-archive-wrap");
  dom.sponsorSlot = document.getElementById("sponsor-slot");
  dom.archiveWeekWrap = document.getElementById("archive-week-wrap");
  dom.packGrid = document.getElementById("pack-grid");
  dom.guideGrid = document.getElementById("guide-grid");
  dom.collectionGrid = document.getElementById("collection-grid");
  dom.brandGrid = document.getElementById("brand-grid");
  dom.globalProfileRow = document.getElementById("global-profile-row");
  dom.globalProfileCard = document.getElementById("global-profile-card");
  dom.globalPicksGrid = document.getElementById("global-picks-grid");
  dom.newsletterSegments = document.getElementById("newsletter-segments");
  dom.newsletterForm = document.getElementById("newsletter-form");
  dom.newsletterEmail = document.getElementById("newsletter-email");
  dom.newsletterStatus = document.getElementById("newsletter-status");
  dom.clubStartBtn = document.getElementById("club-start-btn");
  dom.clubCheckoutForm = document.getElementById("club-checkout-form");
  dom.clubStatus = document.getElementById("club-status");
  dom.conciergeForm = document.getElementById("concierge-form");
  dom.conciergeStatus = document.getElementById("concierge-status");
  dom.productBackBtn = document.getElementById("product-back-btn");
  dom.productPageMedia = document.getElementById("product-page-media");
  dom.productBrandLogo = document.getElementById("product-brand-logo");
  dom.productBrandText = document.getElementById("product-brand-text");
  dom.productCategoryPill = document.getElementById("product-category-pill");
  dom.productPageTitle = document.getElementById("product-page-title");
  dom.productPagePrice = document.getElementById("product-page-price");
  dom.productPageDescription = document.getElementById("product-page-description");
  dom.productWhyPicked = document.getElementById("product-why-picked");
  dom.productWhoFor = document.getElementById("product-who-for");
  dom.productWhoNotFor = document.getElementById("product-who-not-for");
  dom.productPageBuyBtn = document.getElementById("product-page-buy-btn");
}

function validateData() {
  const categories = getCategories();
  categories.forEach((category) => {
    const count = getProductsByCategory(category.id).length;
    if (count !== 12) {
      throw new Error(`Category ${category.id} must contain exactly 12 products; found ${count}.`);
    }
  });

  const weekly = getWeeklyProducts();
  if (weekly.length !== 12) {
    throw new Error(`Weekly must contain exactly 12 products; found ${weekly.length}.`);
  }

  const packs = getPacks();
  if (packs.length !== 6) {
    throw new Error(`Packs must contain exactly 6 entries; found ${packs.length}.`);
  }
}

function initializeTheme() {
  let theme = "light";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      theme = stored;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
  } catch (error) {
    theme = "light";
  }
  setTheme(theme);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (dom.themeToggle) {
    const isDark = theme === "dark";
    const nextLabel = isDark ? "Switch to light mode" : "Switch to dark mode";
    dom.themeToggle.setAttribute("aria-label", nextLabel);
    dom.themeToggle.setAttribute("title", nextLabel);
    dom.themeToggle.dataset.tooltip = nextLabel;
    dom.themeToggle.setAttribute("aria-pressed", String(isDark));
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // ignore
  }
}

function bindGlobalEvents() {
  if (dom.menuToggle && dom.siteNav) {
    dom.menuToggle.addEventListener("click", () => {
      dom.siteNav.classList.toggle("is-open");
    });
  }

  if (dom.themeToggle) {
    dom.themeToggle.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      setTheme(next);
    });
  }

  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (!viewButton) {
      return;
    }
    const nextView = viewButton.dataset.view;
    if (!VIEWS.has(nextView)) {
      return;
    }
    event.preventDefault();
    const category = viewButton.dataset.category;
    setView(nextView, { category, updateHash: true });
  });

  if (dom.categorySelect) {
    dom.categorySelect.addEventListener("change", () => {
      state.activeCategory = dom.categorySelect.value;
      state.searchQuery = "";
      if (dom.searchInput) {
        dom.searchInput.value = "";
      }
      renderCategories();
    });
  }

  if (dom.searchInput) {
    dom.searchInput.addEventListener("input", () => {
      state.searchQuery = dom.searchInput.value.trim().toLowerCase();
      renderCategories();
      track("search_usage", {
        category: state.activeCategory,
        query_length: state.searchQuery.length
      });
    });
  }

  if (dom.homeClubJoinBtn) {
    dom.homeClubJoinBtn.addEventListener("click", () => {
      setView("club", { updateHash: true, force: true });
    });
  }
}

function bindFormEvents() {
  if (dom.newsletterSegments) {
    dom.newsletterSegments.addEventListener("change", (event) => {
      const target = event.target;
      if (!target.matches("input[type='checkbox']")) {
        return;
      }
      const selected = getSelectedSegments();
      if (selected.length > 3) {
        target.checked = false;
        if (dom.newsletterStatus) {
          dom.newsletterStatus.textContent = "Choose up to 3 categories.";
        }
        return;
      }
      if (dom.newsletterStatus) {
        dom.newsletterStatus.textContent = "";
      }
    });
  }

  if (dom.newsletterForm) {
    dom.newsletterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const segments = getSelectedSegments();
      if (segments.length < 1 || segments.length > 3) {
        if (dom.newsletterStatus) {
          dom.newsletterStatus.textContent = "Pick 1-3 categories before subscribing.";
        }
        return;
      }

      const email = dom.newsletterEmail.value.trim();
      track("newsletter_signup", {
        email_domain: email.split("@")[1] || "unknown",
        segments
      });
      if (dom.newsletterStatus) {
        dom.newsletterStatus.textContent = "Subscribed. Weekly shortlist starts this Friday.";
      }
      dom.newsletterForm.reset();
    });
  }

  if (dom.heroNewsletterForm) {
    dom.heroNewsletterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = dom.heroNewsletterEmail.value.trim();
      if (!email) {
        return;
      }
      track("newsletter_signup", {
        email_domain: email.split("@")[1] || "unknown",
        segments: ["weekly_shortlist_banner"]
      });
      if (dom.heroNewsletterStatus) {
        dom.heroNewsletterStatus.textContent = "You are in. Check your inbox for confirmation.";
      }
      dom.heroNewsletterForm.reset();
    });
  }

  if (dom.clubStartBtn && dom.clubCheckoutForm) {
    dom.clubStartBtn.addEventListener("click", () => {
      dom.clubCheckoutForm.classList.remove("hidden");
      dom.clubStartBtn.classList.add("hidden");
      track("club_checkout_start", { source: state.view });
    });
  }

  if (dom.clubCheckoutForm) {
    dom.clubCheckoutForm.addEventListener("submit", (event) => {
      event.preventDefault();
      track("club_subscribe_success", { plan: "weekly_2" });
      if (dom.clubStatus) {
        dom.clubStatus.textContent = "Membership active. Discord access is being provisioned.";
      }
      dom.clubCheckoutForm.reset();
    });
  }

  if (dom.conciergeForm) {
    dom.conciergeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const tier = document.getElementById("concierge-tier")?.value || "unknown";
      const geo = document.getElementById("concierge-geo")?.value.trim() || "unknown";

      track("concierge_intake_submit", {
        tier,
        geography: geo
      });
      track("concierge_book_success", {
        tier
      });
      if (dom.conciergeStatus) {
        dom.conciergeStatus.textContent = "Intake received. Booking link sent to your email.";
      }
      dom.conciergeForm.reset();
    });
  }
}

function bindProductEvents() {
  if (!dom.productBackBtn) {
    return;
  }
  dom.productBackBtn.addEventListener("click", (event) => {
    event.preventDefault();
    const fallback = state.lastBrowseView && state.lastBrowseView !== "product"
      ? state.lastBrowseView
      : "discover";
    const onProductHash = window.location.hash.replace("#", "").startsWith("product/");
    if (onProductHash && window.history.length > 1) {
      window.history.back();
      window.setTimeout(() => {
        if (state.view === "product") {
          setView(fallback, { updateHash: true, force: true });
        }
      }, 0);
      return;
    }
    setView(fallback, { updateHash: true, force: true });
  });
}

function bindShareEvents() {
  Array.from(document.querySelectorAll(".share-btn")).forEach((button) => {
    button.addEventListener("click", async () => {
      const context = button.dataset.shareContext || "unknown";
      const hash = state.view === "product" && state.activeProductId
        ? `product/${state.activeProductId}`
        : state.view;
      const shareUrl = `${window.location.origin}${window.location.pathname}#${hash}`;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        }
        button.textContent = "Copied";
      } catch (error) {
        button.textContent = "Copy failed";
      } finally {
        track("share_click", { context, page: state.view });
        setTimeout(() => {
          button.textContent = "Share";
        }, 1000);
      }
    });
  });
}

function buildCategoryMenu(categories) {
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.view = "categories";
    button.dataset.category = category.id;
    button.textContent = category.label;
    dom.categoryMenu?.appendChild(button);
  });
}

function buildCategorySelect(categories) {
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.label;
    dom.categorySelect?.appendChild(option);
  });
  if (dom.categorySelect) {
    dom.categorySelect.value = state.activeCategory;
  }
}

function buildNewsletterSegments(categories) {
  if (!dom.newsletterSegments) {
    return;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "segment-grid";

  categories.forEach((category) => {
    const label = document.createElement("label");
    label.className = "segment-option";
    label.innerHTML = `
      <input type="checkbox" value="${category.id}">
      <span>${category.label}</span>
    `;
    wrapper.appendChild(label);
  });

  dom.newsletterSegments.appendChild(wrapper);
}

function updateCapPanel() {
  if (dom.capWeekly) {
    dom.capWeekly.textContent = `${getWeeklyProducts().length}/12`;
  }
  if (dom.capEssentials) {
    dom.capEssentials.textContent = `${getAllProducts().length}/108`;
  }
  if (dom.capPacks) {
    dom.capPacks.textContent = `${getPacks().length}/6`;
  }
}

function updateWeeklyLabels() {
  if (dom.weeklyNavBtn) {
    dom.weeklyNavBtn.textContent = "Weekly";
  }
  if (dom.discoverWeeklyTitle) {
    dom.discoverWeeklyTitle.textContent = `${getWeeklyDisplayLabel()} · ${getWeeklyProducts().length} picks`;
  }
}

function renderDiscover() {
  clearNode(dom.discoverWeeklyGrid);
  getWeeklyProducts().forEach((product, index) => {
    dom.discoverWeeklyGrid?.appendChild(createProductCard(product, "discover_weekly", index));
  });

  clearNode(dom.discoverPackGrid);
  getPacks().slice(0, 6).forEach((pack, index) => {
    dom.discoverPackGrid?.appendChild(createPackCard(pack, `discover_pack_${index}`));
  });

  renderCreatorSpotlight();
}

function renderWeekly() {
  const weekly = getWeeklyProducts();
  const weeklyMeta = getWeeklyMeta();
  if (dom.weeklyTitle) {
    dom.weeklyTitle.textContent = `${weeklyMeta.displayLabel} (${weekly.length} picks)`;
  }
  renderSponsorSlot(dom.sponsorSlot, "weekly_sponsor");

  clearNode(dom.weeklyGrid);
  weekly.forEach((product, index) => {
    dom.weeklyGrid?.appendChild(createProductCard(product, "weekly", index));
  });

  clearNode(dom.weeklyArchiveWrap);
  getArchivedProductsGroupedByWeek().slice(0, 2).forEach((group) => {
    const section = document.createElement("section");
    section.className = "archive-week";
    section.innerHTML = `<h4>${group.weekDisplay}</h4>`;
    const grid = document.createElement("div");
    grid.className = "product-grid";
    group.products.slice(0, 6).forEach((product, index) => {
      grid.appendChild(createProductCard(product, "weekly_archive", index));
    });
    section.appendChild(grid);
    dom.weeklyArchiveWrap?.appendChild(section);
  });
}

function renderArchive() {
  if (!dom.archiveWeekWrap) {
    return;
  }
  clearNode(dom.archiveWeekWrap);
  const groups = getArchivedProductsGroupedByWeek();
  groups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "archive-week";
    section.innerHTML = `<h4>${group.weekDisplay} (${group.products.length})</h4>`;
    const grid = document.createElement("div");
    grid.className = "product-grid";
    group.products.forEach((product, index) => {
      grid.appendChild(createProductCard(product, "archive", index));
    });
    section.appendChild(grid);
    dom.archiveWeekWrap.appendChild(section);
  });
}

function renderSponsorSlot(target, placement) {
  if (!target) {
    return;
  }
  const weeklyMeta = getWeeklyMeta();
  const sponsor = weeklyMeta.sponsor;
  if (!sponsor) {
    clearNode(target);
    return;
  }
  const sponsorProduct = getProductById(sponsor.productId) || getWeeklyProducts()[0] || null;
  const sponsorPrice = sponsorProduct ? formatMoney(sponsorProduct.price) : "";

  target.innerHTML = `
    <div class="sponsor-shell">
      <div class="sponsor-copy">
        <p class="sponsor-kicker">${sponsor.label} · Feature of the week</p>
        <h3>${sponsor.title}</h3>
        <p>${sponsor.copy}</p>
        <div class="sponsor-actions">
          <button class="cta cta-soft" data-sponsor-view type="button">View Sponsor</button>
          ${sponsorProduct ? `<button class="cta" data-sponsor-buy type="button">Buy ${sponsorPrice} ↗</button>` : ""}
        </div>
      </div>
      <div class="sponsor-product-card">
        <img src="${sponsorProduct ? sponsorProduct.imageUrl : "https://picsum.photos/seed/mprv-sponsor/420/320"}" alt="${sponsorProduct ? sponsorProduct.title : sponsor.title}" loading="lazy">
        <div>
          <p class="sponsor-product-label">${sponsorProduct ? sponsorProduct.brand : "Featured"}</p>
          <strong>${sponsorProduct ? sponsorProduct.title : sponsor.title}</strong>
          ${sponsorProduct ? `<p>${sponsorProduct.sourcePlatform} · direct buy</p>` : ""}
        </div>
      </div>
    </div>
  `;
  const sponsorImage = target.querySelector(".sponsor-product-card img");
  attachImageFallback(sponsorImage, sponsorProduct ? sponsorProduct.title : sponsor.title, "#cfcfcf");

  track("sponsor_impression", { week: weeklyMeta.weekLabel, placement });

  target.querySelector("[data-sponsor-view]")?.addEventListener("click", () => {
    track("sponsor_click", { week: weeklyMeta.weekLabel, placement, action: "view" });
    openExternal(sponsor.url, {
      source: placement,
      sponsor: sponsor.title
    });
  });

  target.querySelector("[data-sponsor-buy]")?.addEventListener("click", () => {
    if (!sponsorProduct) {
      return;
    }
    openAffiliate(sponsorProduct, {
      source: `${placement}_buy_direct`,
      placement,
      retailer: sponsorProduct.sourcePlatform
    });
  });
}

function renderCreatorSpotlight() {
  if (!dom.discoverGlobalPromo) {
    return;
  }
  const profile = getVisibleCreatorPicks()[0];
  if (!profile) {
    clearNode(dom.discoverGlobalPromo);
    return;
  }
  const firstPick = getProductById(profile.picks[0]);
  dom.discoverGlobalPromo.innerHTML = `
    <p class="sponsor-kicker">Creators spotlight</p>
    <h3>See what ${profile.name} cannot live without</h3>
    <p>${profile.role}. Up to 12 picks curated around one clear taste profile.</p>
    <div class="sponsor-actions">
      <button class="cta cta-soft" type="button" id="discover-global-promo-btn">Open Creators</button>
      ${firstPick ? `<span class="creator-spotlight-meta">Now featuring: ${firstPick.title}</span>` : ""}
    </div>
  `;
  document.getElementById("discover-global-promo-btn")?.addEventListener("click", () => {
    setView("global", { updateHash: true, force: true });
    track("creator_spotlight_click", { profile_id: profile.id });
  });
}

function renderCategories() {
  if (dom.categorySelect) {
    dom.categorySelect.value = state.activeCategory;
  }
  const categories = getCategories();
  const activeCategory = categories.find((item) => item.id === state.activeCategory) || categories[0];
  const inCategory = getProductsByCategory(activeCategory.id);
  const filtered = inCategory.filter((item) => {
    if (!state.searchQuery) {
      return true;
    }
    return (
      item.title.toLowerCase().includes(state.searchQuery) ||
      item.brand.toLowerCase().includes(state.searchQuery) ||
      item.shortDescription.toLowerCase().includes(state.searchQuery)
    );
  });

  if (dom.categoryCountPill) {
    dom.categoryCountPill.textContent = `${filtered.length} Essentials in ${activeCategory.label}.`;
  }
  if (dom.categoryLiveCount) {
    dom.categoryLiveCount.textContent = `${getAllProducts().length} Essentials live · ${getCategories().length} categories`;
  }

  renderSearchSuggestions(state.searchQuery);

  clearNode(dom.categoryGrid);
  filtered.forEach((product, index) => {
    dom.categoryGrid?.appendChild(createProductCard(product, "categories", index));
  });
}

function renderSearchSuggestions(query) {
  if (!dom.searchSuggest) {
    return;
  }
  clearNode(dom.searchSuggest);
  const normalized = (query || "").trim().toLowerCase();
  if (!normalized) {
    dom.searchSuggest.classList.remove("is-active");
    return;
  }

  const matches = [];

  getCategories()
    .filter((category) => category.label.toLowerCase().includes(normalized))
    .slice(0, 3)
    .forEach((category) => {
      matches.push({
        type: "Category",
        label: category.label,
        action: () => {
          state.activeCategory = category.id;
          state.searchQuery = "";
          if (dom.searchInput) {
            dom.searchInput.value = "";
          }
          renderCategories();
          track("search_suggestion_click", { type: "category", value: category.id });
        }
      });
    });

  getPacks()
    .filter((pack) => pack.title.toLowerCase().includes(normalized))
    .slice(0, 3)
    .forEach((pack) => {
      matches.push({
        type: "Pack",
        label: `${pack.title} · $${pack.minPrice}-$${pack.maxPrice}`,
        action: () => {
          setView("packs", { updateHash: true, force: true });
          track("search_suggestion_click", { type: "pack", value: pack.id });
        }
      });
    });

  getGuides()
    .filter((guide) => guide.title.toLowerCase().includes(normalized))
    .slice(0, 3)
    .forEach((guide) => {
      matches.push({
        type: "Guide",
        label: guide.title,
        action: () => {
          const first = getProductById(guide.products[0]);
          if (first) {
            state.activeCategory = first.category;
          }
          state.searchQuery = "";
          if (dom.searchInput) {
            dom.searchInput.value = "";
          }
          setView("categories", { updateHash: true, force: true });
          renderCategories();
          track("search_suggestion_click", { type: "guide", value: guide.id });
        }
      });
    });

  getAllProducts()
    .filter(
      (product) =>
        product.title.toLowerCase().includes(normalized) ||
        product.brand.toLowerCase().includes(normalized)
    )
    .slice(0, 3)
    .forEach((product) => {
      matches.push({
        type: "Product",
        label: `${product.title} · ${product.brand}`,
        action: () => {
          openProductPage(product, "search_suggestion");
          track("search_suggestion_click", { type: "product", value: product.id });
        }
      });
    });

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "search-suggest-empty";
    empty.textContent = "No matches in categories, packs, guides, or products.";
    dom.searchSuggest.appendChild(empty);
    dom.searchSuggest.classList.add("is-active");
    return;
  }

  matches.slice(0, 8).forEach((match) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-suggest-item";
    button.innerHTML = `<span class="search-suggest-type">${match.type}</span><span>${match.label}</span>`;
    button.addEventListener("click", match.action);
    dom.searchSuggest.appendChild(button);
  });
  dom.searchSuggest.classList.add("is-active");
}

function renderPacks() {
  clearNode(dom.packGrid);
  getPacks().forEach((pack, index) => {
    dom.packGrid?.appendChild(createPackCard(pack, `pack_${index}`));
  });
}

function renderGuides() {
  clearNode(dom.guideGrid);
  const list = document.createElement("ul");
  list.className = "guide-list";
  getGuides().forEach((guide) => {
    const item = document.createElement("li");
    item.className = "guide-item";
    item.innerHTML = `
      <a class="guide-link" href="#" data-guide-id="${guide.id}">
        <span class="guide-link-title">${guide.title}</span>
        <span class="guide-link-summary">${guide.body}</span>
        <span class="guide-link-arrow">View products →</span>
      </a>
    `;
    const link = item.querySelector("a");
    link?.addEventListener("click", (event) => {
      event.preventDefault();
      setView("categories", { updateHash: true, force: true });
      const firstProduct = getProductById(guide.products[0]);
      if (firstProduct) {
        state.activeCategory = firstProduct.category;
        renderCategories();
      }
    });
    list.appendChild(item);
  });
  dom.guideGrid?.appendChild(list);
}

function renderCollectionsAndBrands() {
  clearNode(dom.collectionGrid);
  getCollections().slice(0, 3).forEach((collection) => {
    const card = document.createElement("article");
    card.className = "guide-card";
    const preview = getProductsByIds(collection.products)
      .map((item) => item.title)
      .join(", ");
    card.innerHTML = `
      <h3>${collection.title}</h3>
      <p>${collection.description}</p>
      <small>${preview}</small>
      <div class="modal-actions">
        <button class="cta cta-soft" type="button">Open Collection</button>
      </div>
    `;
    card.querySelector("button")?.addEventListener("click", () => {
      const first = getProductById(collection.products[0]);
      if (!first) {
        return;
      }
      setView("categories", { updateHash: true });
      state.activeCategory = first.category;
      state.searchQuery = "";
      if (dom.searchInput) {
        dom.searchInput.value = "";
      }
      renderCategories();
    });
    dom.collectionGrid?.appendChild(card);
  });

  clearNode(dom.brandGrid);
  getBrands().forEach((brand) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-chip";
    button.textContent = brand;
    button.addEventListener("click", () => {
      setView("categories", { updateHash: true });
      const firstMatch = getAllProducts().find((product) => product.brand === brand);
      if (firstMatch) {
        state.activeCategory = firstMatch.category;
      }
      state.searchQuery = brand.toLowerCase();
      if (dom.searchInput) {
        dom.searchInput.value = brand;
      }
      renderCategories();
      track("brand_filter_click", { brand });
    });
    dom.brandGrid?.appendChild(button);
  });
}

function renderGlobalSelects() {
  clearNode(dom.globalProfileRow);
  const profiles = getVisibleCreatorPicks();
  if (!profiles.length) {
    if (dom.globalProfileCard) {
      dom.globalProfileCard.innerHTML = `
        <h3>No creator profiles are visible right now.</h3>
        <p class="muted small no-margin">Enable at least one profile in Admin → Creators.</p>
      `;
    }
    clearNode(dom.globalPicksGrid);
    return;
  }

  if (!profiles.some((profile) => profile.id === state.activeGlobalProfile)) {
    state.activeGlobalProfile = profiles[0].id;
  }

  profiles.forEach((profile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `profile-chip ${state.activeGlobalProfile === profile.id ? "is-active" : ""}`;
    button.textContent = `${profile.name} · ${profile.role}`;
    button.addEventListener("click", () => {
      state.activeGlobalProfile = profile.id;
      renderGlobalSelects();
      track("global_select_view", { profile_id: profile.id });
    });
    dom.globalProfileRow?.appendChild(button);
  });

  const active = profiles.find((profile) => profile.id === state.activeGlobalProfile);
  if (!active) {
    return;
  }

  const socialLinks = (active.socials || [])
    .map(
      (item) =>
        `<a class="global-social-link" href="${item.url}" target="_blank" rel="noopener">${item.label}</a>`
    )
    .join("");

  if (dom.globalProfileCard) {
    dom.globalProfileCard.innerHTML = `
      <div class="global-profile-head">
        <img class="global-avatar" src="${active.avatar}" alt="${active.name}" loading="lazy">
        <div>
          <h3>${active.name}</h3>
          <p class="muted small no-margin">${active.role}</p>
        </div>
      </div>
      <p class="global-bio">${active.bio}</p>
      <p class="muted small no-margin">Showing ${Math.min(active.picks.length, 12)} of max 12 picks.</p>
      <div class="global-socials">${socialLinks}</div>
    `;
  }

  clearNode(dom.globalPicksGrid);
  active.picks.slice(0, 12).forEach((id, index) => {
    const product = getProductById(id);
    if (!product) {
      return;
    }
    dom.globalPicksGrid?.appendChild(
      createProductCard(product, "global_select", index, () => {
        track("global_select_list_click", {
          profile_id: active.id,
          product_id: product.id
        });
      })
    );
  });
}

function getVisibleCreatorPicks() {
  return getCreatorPicks().filter((profile) => profile.isVisible !== false);
}

function createPackCard(pack, placement) {
  const card = document.createElement("article");
  card.className = "pack-card product-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  const itemNames = getProductsByIds(pack.products).map((item) => item.title);
  const firstItem = getProductById(pack.products[0]);
  const image = firstItem ? firstItem.imageUrl : "https://picsum.photos/seed/pack-fallback/900/620";
  card.innerHTML = `
    <img class="card-photo" src="${image}" alt="${pack.title}" loading="lazy">
    <div class="card-overlay">
      <div class="card-top">
        <span class="brand-logo">P</span>
        <span class="pill">${pack.products.length} items</span>
      </div>
      <div class="card-content">
        <p class="card-brand">Pack<span class="card-dot"></span><span class="card-recency">${pack.mindsetTag}</span></p>
        <p class="card-name">${pack.title} · $${pack.minPrice}-$${pack.maxPrice}</p>
        <div class="card-tags">
          <span class="pill">View pack</span>
          <span class="pill">Essentials only</span>
        </div>
      </div>
      <div class="card-bottom">
        <div>
          <p class="card-price">${pack.products.length} items</p>
          <p class="card-subline">View pack → Buy as set / Pick items individually.</p>
        </div>
      </div>
    </div>
  `;

  const openPackPreview = () => {
    const firstProduct = getProductById(pack.products[0]);
    if (firstProduct) {
      openProductPage(firstProduct, placement);
    }
  };

  const overlay = card.querySelector(".card-overlay");
  const photo = card.querySelector(".card-photo");
  attachImageFallback(photo, pack.title, "#cdcdcd");

  card.addEventListener("click", openPackPreview);
  overlay?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openPackPreview();
  });
  photo?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openPackPreview();
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPackPreview();
    }
  });

  attachCardTilt(card);
  return card;
}

function createProductCard(product, placement, index, onClickExtra) {
  const category = getCategories().find((item) => item.id === product.category);
  const card = document.createElement("article");
  card.className = "product-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.style.setProperty("--tone", category?.tone || "#d9d9d9");
  card.style.animationDelay = `${Math.min(index, 6) * 40}ms`;
  card.innerHTML = `
    <img class="card-photo" src="${product.imageUrl}" alt="${product.title}" loading="lazy">
    <div class="card-overlay">
      <div class="card-top">
        <span class="brand-logo">${getBrandInitial(product.brand)}</span>
        <span class="pill card-pill-float">${category?.label || product.category}</span>
      </div>
      <div class="card-content">
        <p class="card-brand">${product.brand}<span class="card-dot"></span><span class="card-recency">${getRecencyLabel(product.createdAt)}</span></p>
        <p class="card-name">${product.title}</p>
      </div>
      <div class="card-bottom">
        <div>
          <p class="card-price">${formatMoney(product.price)}</p>
          <p class="card-subline">Handpicked choices <span aria-hidden="true">↗</span></p>
        </div>
      </div>
    </div>
  `;

  registerImpression(product.id, placement);

  const openPreview = () => {
    track("product_card_click", {
      product_id: product.id,
      placement
    });
    if (typeof onClickExtra === "function") {
      onClickExtra();
    }
    openProductPage(product, placement);
  };

  const overlay = card.querySelector(".card-overlay");
  const photo = card.querySelector(".card-photo");
  attachImageFallback(photo, product.title, category?.tone || "#cdcdcd");

  card.addEventListener("click", openPreview);
  overlay?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openPreview();
  });
  photo?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openPreview();
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPreview();
    }
  });

  attachCardTilt(card);
  return card;
}

function openProductPage(product, placement) {
  state.activeProductId = product.id;
  state.activePlacement = placement;
  renderProductPage();
  setView("product", { updateHash: true, force: true });
}

function renderProductPage() {
  const product = getProductById(state.activeProductId);
  if (
    !product ||
    !dom.productPageMedia ||
    !dom.productBrandLogo ||
    !dom.productBrandText ||
    !dom.productCategoryPill ||
    !dom.productPageTitle ||
    !dom.productPagePrice ||
    !dom.productPageDescription ||
    !dom.productWhyPicked ||
    !dom.productWhoFor ||
    !dom.productWhoNotFor ||
    !dom.productPageBuyBtn
  ) {
    return;
  }

  const category = getCategories().find((item) => item.id === product.category);
  const audience = getAudienceForCategory(product.category);

  dom.productPageMedia.style.setProperty("--tone", category?.tone || "#d9d9d9");
  dom.productPageMedia.style.backgroundImage = `linear-gradient(145deg, rgba(255,255,255,0.25), rgba(0,0,0,0.06)), url('${product.imageUrl}')`;
  dom.productPageMedia.style.backgroundSize = "cover";
  dom.productPageMedia.style.backgroundPosition = "center";
  dom.productBrandLogo.textContent = getBrandInitial(product.brand);
  dom.productBrandText.textContent = product.brand;
  dom.productCategoryPill.textContent = category?.label || product.category;
  dom.productPageTitle.textContent = product.title;
  dom.productPagePrice.textContent = formatMoney(product.price);
  dom.productPageDescription.textContent = product.shortDescription;
  dom.productWhyPicked.textContent = `${product.title} won this slot because it balances utility, build quality, and repeat-use value without unnecessary bloat.`;
  dom.productWhoFor.textContent = audience.whoFor;
  dom.productWhoNotFor.textContent = audience.whoNotFor;

  dom.productPageBuyBtn.textContent = "Buy It ↗";

  dom.productPageBuyBtn.onclick = () => {
    openAffiliate(product, {
      source: "product_page_buy",
      placement: state.activePlacement,
      retailer: product.sourcePlatform
    });
  };

  track("where_to_buy_open", {
    product_id: product.id
  });
  track("product_view", {
    product_id: product.id,
    placement: state.activePlacement
  });
}

function openAffiliate(product, payload) {
  const outUrl = getProductOutboundUrl(product.slug);
  openExternal(outUrl, {
    ...payload,
    product_id: product.id,
    product_slug: product.slug,
    target_affiliate: product.affiliateUrl,
    source_platform: product.sourcePlatform
  });
}

function routeFromHash() {
  const fromHash = window.location.hash.replace("#", "").trim();
  if (!fromHash) {
    setView("discover", { updateHash: false, force: true });
    return;
  }

  if (fromHash.startsWith("product/")) {
    const ref = fromHash.slice("product/".length);
    const byId = getProductById(ref);
    const bySlug = byId ? null : getProductBySlug(ref);
    const product = byId || bySlug;
    if (product) {
      state.activeProductId = product.id;
      state.activePlacement = "direct_route";
      renderProductPage();
      setView("product", { updateHash: false, force: true });
      return;
    }
  }

  const targetView = VIEWS.has(fromHash) ? fromHash : "discover";
  setView(targetView, { updateHash: false, force: true });
}

function setView(nextView, options = {}) {
  const { category, updateHash = false, force = false } = options;
  if (!VIEWS.has(nextView)) {
    return;
  }

  if (category && getCategories().some((item) => item.id === category)) {
    state.activeCategory = category;
    state.searchQuery = "";
    if (dom.searchInput) {
      dom.searchInput.value = "";
    }
  }

  const unchanged = state.view === nextView && !category && !force;
  if (unchanged) {
    return;
  }

  if (nextView === "product" && state.view && state.view !== "product") {
    state.lastBrowseView = state.view;
  }
  if (state.view && state.view !== "product" && nextView !== "product") {
    state.lastBrowseView = nextView;
  }

  state.view = nextView;

  dom.views.forEach((viewNode) => {
    viewNode.classList.toggle("is-active", viewNode.dataset.view === nextView);
  });

  dom.navButtons.forEach((button) => {
    if (button.classList.contains("nav-btn")) {
      button.classList.toggle("is-active", button.dataset.view === nextView);
    }
  });

  if (nextView === "categories") {
    renderCategories();
  }
  if (nextView === "global") {
    renderGlobalSelects();
    track("global_select_view", { profile_id: state.activeGlobalProfile });
  }
  if (nextView === "archive") {
    renderArchive();
  }

  if (updateHash) {
    const targetHash = nextView === "product" && state.activeProductId
      ? `#product/${state.activeProductId}`
      : `#${nextView}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }

  dom.siteNav?.classList.remove("is-open");
  Array.from(document.querySelectorAll(".nav-dropdown")).forEach((dropdown) => {
    dropdown.open = false;
  });
  track("page_view", { page: nextView });
}

function setupCollapsingHeader() {
  if (!dom.siteHeader) {
    return;
  }
  const onScroll = () => {
    dom.siteHeader.classList.toggle("is-collapsed", window.scrollY > 64);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function setupCustomCursor() {
  if (!dom.cursorRing || !window.matchMedia("(pointer: fine)").matches) {
    return;
  }
  document.documentElement.classList.add("cursor-on");
  const ring = dom.cursorRing;

  const move = (event) => {
    ring.classList.remove("is-hidden");
    ring.style.left = `${event.clientX}px`;
    ring.style.top = `${event.clientY}px`;
    const interactive = event.target.closest("a,button,input,select,textarea,summary,[role='button']");
    ring.classList.toggle("is-active", Boolean(interactive));
  };

  document.addEventListener("mousemove", move);
  document.addEventListener("mouseleave", () => {
    ring.classList.add("is-hidden");
  });
}

function attachCardTilt(card) {
  if (!window.matchMedia("(pointer: fine)").matches) {
    return;
  }
  card.addEventListener("mousemove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const ry = (x - 0.5) * 5;
    const rx = (0.5 - y) * 4;
    card.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    card.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
  });
  card.addEventListener("mouseleave", () => {
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  });
}

function getBrandInitial(brand) {
  return (brand || "M").trim().charAt(0).toUpperCase();
}

function getRecencyLabel(createdAt) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return "recent";
  }
  const diffMs = Date.now() - created.getTime();
  const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return `${days} days ago`;
}

function getFallbackImageData(label, tone = "#d8d8d8") {
  const safeLabel = String(label || "MPRV Pick")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${tone}" />
          <stop offset="100%" stop-color="#b7b7b7" />
        </linearGradient>
      </defs>
      <rect width="900" height="620" fill="url(#bg)" />
      <rect x="48" y="48" width="804" height="524" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2" />
      <text x="450" y="300" font-size="44" fill="rgba(0,0,0,0.62)" text-anchor="middle" font-family="Arial, sans-serif">${safeLabel}</text>
      <text x="450" y="340" font-size="18" fill="rgba(0,0,0,0.45)" text-anchor="middle" font-family="Arial, sans-serif">Image unavailable - placeholder shown</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function attachImageFallback(img, label, tone) {
  if (!img) {
    return;
  }
  img.addEventListener("error", () => {
    if (img.dataset.fallbackApplied === "1") {
      return;
    }
    img.dataset.fallbackApplied = "1";
    img.src = getFallbackImageData(label, tone);
  });
}

function getSelectedSegments() {
  if (!dom.newsletterSegments) {
    return [];
  }
  return Array.from(dom.newsletterSegments.querySelectorAll("input[type='checkbox']:checked")).map((input) => input.value);
}

function openExternal(url, payload) {
  track("outbound_click", payload);
  window.open(url, "_blank", "noopener,noreferrer");
}

function registerImpression(productId, placement) {
  const key = `${placement}:${productId}`;
  if (sentImpressions.has(key)) {
    return;
  }
  sentImpressions.add(key);
  track("product_impression", {
    product_id: productId,
    placement
  });
}

function clearNode(node) {
  if (node) {
    node.textContent = "";
  }
}

function formatMoney(amount) {
  const numeric = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(numeric)) {
    return String(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(numeric);
}

function track(eventName, properties = {}) {
  if (window.posthog && typeof window.posthog.capture === "function") {
    window.posthog.capture(eventName, properties);
  }
  console.log("[track]", eventName, properties);
}
