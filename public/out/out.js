import { loadData, getProductBySlug } from "../data/index.js";

function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("slug");
  if (fromQuery) {
    return fromQuery;
  }
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const outIndex = pathParts.indexOf("out");
  if (outIndex >= 0 && pathParts[outIndex + 1]) {
    return decodeURIComponent(pathParts[outIndex + 1]);
  }
  return "";
}

function setStatus(message) {
  const status = document.getElementById("out-status");
  if (status) {
    status.textContent = message;
  }
}

async function runRedirect() {
  const slug = getSlugFromUrl();
  if (!slug) {
    setStatus("Missing product slug. Use /out/?slug=product-slug.");
    return;
  }

  try {
    await loadData();
    const product = getProductBySlug(slug);
    if (!product) {
      setStatus(`Product not found for slug: ${slug}`);
      return;
    }
    console.log("[outbound_click]", {
      slug: product.slug,
      productId: product.id,
      affiliateUrl: product.affiliateUrl,
      sourcePlatform: product.sourcePlatform,
      timestamp: new Date().toISOString()
    });
    setStatus(`Redirecting to ${product.sourcePlatform}...`);
    window.location.replace(product.affiliateUrl);
  } catch (error) {
    setStatus(`Could not resolve redirect: ${error.message}`);
  }
}

runRedirect();
