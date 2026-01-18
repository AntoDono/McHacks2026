/**
 * Product metadata detection utilities
 * Extracts product information from the current page
 */

export interface ProductMetadata {
  url?: string
  title?: string
  price?: string
  sku?: string
  brand?: string
  imageUrl: string
}

/**
 * Extract product metadata from the current page
 * Works with common e-commerce platforms
 */
export function extractProductMetadata(imageUrl: string): ProductMetadata {
  const metadata: ProductMetadata = {
    imageUrl: imageUrl,
    url: window.location.href
  }

  // Try to find title
  const titleSelectors = [
    'h1[class*="product"]',
    'h1[class*="title"]',
    '[class*="product-title"]',
    '[class*="productTitle"]',
    '[itemprop="name"]',
    'meta[property="og:title"]',
    'meta[name="twitter:title"]'
  ]

  for (const selector of titleSelectors) {
    const element = document.querySelector(selector)
    if (element) {
      const title = selector.includes('meta')
        ? element.getAttribute('content')
        : element.textContent?.trim()
      
      if (title && title.length > 0) {
        metadata.title = title
        break
      }
    }
  }

  // Try to find price
  const priceSelectors = [
    '[class*="price"]',
    '[itemprop="price"]',
    '[data-price]',
    'meta[property="og:price:amount"]',
    'span[class*="Price"]',
    'div[class*="price"]'
  ]

  for (const selector of priceSelectors) {
    const element = document.querySelector(selector)
    if (element) {
      let price = selector.includes('meta')
        ? element.getAttribute('content')
        : selector.includes('data-price')
          ? element.getAttribute('data-price')
          : element.textContent?.trim()
      
      if (price && price.length > 0 && price.match(/[\d.,]/)) {
        // Clean up price - keep numbers, currency symbols, and decimal points
        price = price.replace(/\s+/g, ' ').trim()
        metadata.price = price
        break
      }
    }
  }

  // Try to find SKU
  const skuSelectors = [
    '[itemprop="sku"]',
    '[class*="sku"]',
    '[data-sku]',
    'meta[itemprop="sku"]'
  ]

  for (const selector of skuSelectors) {
    const element = document.querySelector(selector)
    if (element) {
      const sku = selector.includes('meta') || selector.includes('data-')
        ? element.getAttribute(selector.includes('data-') ? 'data-sku' : 'content')
        : element.textContent?.trim()
      
      if (sku && sku.length > 0) {
        metadata.sku = sku
        break
      }
    }
  }

  // Try to find brand
  const brandSelectors = [
    '[itemprop="brand"]',
    '[class*="brand"]',
    'meta[property="og:brand"]',
    'meta[itemprop="brand"]'
  ]

  for (const selector of brandSelectors) {
    const element = document.querySelector(selector)
    if (element) {
      const brand = selector.includes('meta')
        ? element.getAttribute('content')
        : element.textContent?.trim()
      
      if (brand && brand.length > 0) {
        metadata.brand = brand
        break
      }
    }
  }

  console.log('Extracted product metadata:', metadata)
  return metadata
}

/**
 * Get all product metadata for a list of image URLs
 */
export function extractProductMetadataForImages(imageUrls: string[]): ProductMetadata[] {
  // For now, all images on the same page will have the same metadata (except imageUrl)
  // In the future, this could be enhanced to detect individual product info
  return imageUrls.map(imageUrl => extractProductMetadata(imageUrl))
}
