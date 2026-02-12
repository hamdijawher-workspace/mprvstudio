import {
  BRAND_POOLS,
  CATEGORY_DEFS,
  CATEGORY_IMAGE_QUERIES,
  CATEGORY_SEEDS,
  PRICE_BANDS
} from "./catalog.js";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function calculatePrice(min, max, index) {
  const ratio = index / 11;
  const raw = min + (max - min) * ratio;
  if (raw < 20) {
    return Math.round(raw);
  }
  return Math.round(raw / 5) * 5;
}

function getImageSeed(value) {
  let seed = 0;
  for (let i = 0; i < value.length; i += 1) {
    seed += value.charCodeAt(i) * (i + 1);
  }
  return (seed % 997) + 1;
}

function buildImageUrl(id, query) {
  const seedRaw = `${id}-${query}-${getImageSeed(`${id}-${query}`)}`;
  const seed = seedRaw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `https://picsum.photos/seed/${seed}/900/620`;
}

function buildAffiliateMeta(product) {
  const encoded = encodeURIComponent(product.title);
  if (product.category === "phone-apps") {
    return {
      sourcePlatform: "App Store",
      affiliateUrl: "https://apps.apple.com/us/genre/ios/id36"
    };
  }
  if (product.category === "watches") {
    return {
      sourcePlatform: "Jomashop",
      affiliateUrl: `https://www.jomashop.com/search?q=${encoded}`
    };
  }
  if (product.category === "clothes") {
    return {
      sourcePlatform: "Mr Porter",
      affiliateUrl: `https://www.mrporter.com/en-us/shop/search/${encoded}`
    };
  }
  return {
    sourcePlatform: "Amazon",
    affiliateUrl: `https://www.amazon.com/s?k=${encoded}`
  };
}

function findWeekForProduct(productId, archiveByWeek) {
  const weeks = Object.keys(archiveByWeek || {});
  for (let i = 0; i < weeks.length; i += 1) {
    const week = weeks[i];
    if ((archiveByWeek[week] || []).includes(productId)) {
      return week;
    }
  }
  return "UNSCHEDULED";
}

/**
 * Build Product[] from catalog seeds + weekly configuration.
 * This is the canonical products source for the frontend directory.
 */
export function createProductCatalog(weeklyConfig) {
  const featuredSet = new Set(weeklyConfig.featuredProductIds || []);
  const hardArchivedSet = new Set(weeklyConfig.hardArchivedProductIds || []);
  const generated = [];
  let ordinal = 0;

  CATEGORY_DEFS.forEach((category) => {
    const seeds = CATEGORY_SEEDS[category.id] || [];
    const brandPool = BRAND_POOLS[category.id] || ["MPRV"];
    const [min, max] = PRICE_BANDS[category.id] || [10, 120];

    seeds.forEach((title, index) => {
      ordinal += 1;
      const id = `${category.id}-${String(index + 1).padStart(2, "0")}`;
      const brand = brandPool[index % brandPool.length];
      const price = calculatePrice(min, max, index);
      const query = CATEGORY_IMAGE_QUERIES[category.id] || "product,lifestyle,minimal";
      const slug = `${slugify(title)}-${id}`;
      const createdAtDate = new Date(Date.UTC(2025, 0, 1 + ordinal));
      const updatedAtDate = new Date(`${weeklyConfig.currentWeekLabel}T00:00:00.000Z`);
      const isFeaturedThisWeek = featuredSet.has(id);
      const weekLabel = isFeaturedThisWeek
        ? weeklyConfig.currentWeekLabel
        : findWeekForProduct(id, weeklyConfig.archiveByWeek);
      const status = hardArchivedSet.has(id) ? "ARCHIVED" : "LIVE";
      const affiliate = buildAffiliateMeta({ title, category: category.id });

      generated.push({
        id,
        title,
        slug,
        brand,
        category: category.id,
        price,
        imageUrl: buildImageUrl(id, `${query},${title}`),
        shortDescription: `${title} is selected for the ${category.label.toLowerCase()} shortlist based on utility, build quality, and repeat-use value.`,
        affiliateUrl: affiliate.affiliateUrl,
        sourcePlatform: affiliate.sourcePlatform,
        tags: [category.id, brand.toLowerCase(), "mprv", "curated"],
        weekLabel,
        isFeaturedThisWeek,
        status,
        createdAt: createdAtDate.toISOString(),
        updatedAt: updatedAtDate.toISOString(),
        archivedAt: status === "ARCHIVED" ? updatedAtDate.toISOString() : null
      });
    });
  });

  return generated;
}
