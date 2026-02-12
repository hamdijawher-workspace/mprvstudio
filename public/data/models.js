/**
 * @typedef {"LIVE" | "ARCHIVED"} ProductStatus
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {string} brand
 * @property {string} category
 * @property {number|string} price
 * @property {string} imageUrl
 * @property {string} shortDescription
 * @property {string} affiliateUrl
 * @property {string} sourcePlatform
 * @property {string[]} tags
 * @property {string} weekLabel
 * @property {boolean} isFeaturedThisWeek
 * @property {ProductStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} archivedAt
 */

/**
 * @typedef {Object} Pack
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {string} description
 * @property {number} minPrice
 * @property {number} maxPrice
 * @property {string} mindsetTag
 * @property {string[]} products
 */

/**
 * @typedef {Object} Guide
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {string} body
 * @property {string[]} products
 */

/**
 * @typedef {Object} Collection
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {string} description
 * @property {string[]} products
 */

export {};
