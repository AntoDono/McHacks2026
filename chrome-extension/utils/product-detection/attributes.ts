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

  // Try to find title - prioritize meta tags as they're usually cleaner
  const titleSelectors = [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'h1[class*="product"]',
    'h1[class*="title"]',
    '[class*="product-title"]',
    '[class*="productTitle"]',
    '[itemprop="name"]',
    'h1' // Fallback to any h1
  ]

  for (const selector of titleSelectors) {
    const element = document.querySelector(selector)
    if (element) {
      let title = selector.includes('meta')
        ? element.getAttribute('content')
        : element.textContent?.trim()
      
      // Validate title:
      // - Must be between 1-200 characters (reasonable product name length)
      // - Should not contain excessive newlines or special chars
      // - Should not look like full page content
      if (title && 
          title.length > 0 && 
          title.length <= 200 &&
          !title.includes('\n\n') && // No paragraph breaks
          (title.match(/\n/g) || []).length < 3) { // Max 2 line breaks
        
        // Clean up: remove extra whitespace and newlines
        title = title.replace(/\s+/g, ' ').trim()
        
        // Additional validation: reject if it looks like page content
        const suspiciousPatterns = [
          /size guide/i,
          /add to bag/i,
          /add to cart/i,
          /select size/i,
          /% off.*% off/i, // Multiple discount mentions
          /reviews \(\d+\)/i
        ]
        
        const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(title))
        
        if (!isSuspicious) {
          metadata.title = title
          break
        }
      }
    }
  }
  
  // Fallback to document title if no good title found
  if (!metadata.title && document.title) {
    let title = document.title.split('|')[0].split('-')[0].trim()
    if (title.length > 0 && title.length <= 200) {
      metadata.title = title
    }
  }

  // Try to find price
  const priceSelectors = [
    'meta[property="og:price:amount"]',
    '[itemprop="price"]',
    '[data-price]',
    'span[class*="currentPrice"]',
    'span[class*="sale-price"]',
    'span[class*="Price"]:not([class*="original"]):not([class*="was"])',
    '[class*="price"]:not([class*="original"]):not([class*="was"])'
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
        // Clean up price
        price = price.replace(/\s+/g, ' ').trim()
        
        // Extract just the first price if multiple are present (e.g., "$189.99$270")
        const priceMatch = price.match(/[$€£¥]?[\d,]+\.?\d*/);
        if (priceMatch) {
          price = priceMatch[0]
        }
        
        // Validate: must be reasonable length (3-15 chars like "$9.99" to "$12,999.99")
        if (price.length >= 1 && price.length <= 15 && !price.includes('%')) {
          metadata.price = price
          break
        }
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
    'meta[property="og:brand"]',
    'meta[itemprop="brand"]',
    '[itemprop="brand"] [itemprop="name"]',
    '[itemprop="brand"]'
  ]

  for (const selector of brandSelectors) {
    const element = document.querySelector(selector)
    if (element) {
      let brand = selector.includes('meta')
        ? element.getAttribute('content')
        : element.textContent?.trim()
      
      // Validate brand name:
      // - Must be between 1-100 characters
      // - Must not contain CSS/HTML patterns (curly braces, angle brackets, etc.)
      // - Must not contain excessive special characters
      if (brand && 
          brand.length > 0 && 
          brand.length <= 100 &&
          !brand.includes('{') &&
          !brand.includes('}') &&
          !brand.includes('<') &&
          !brand.includes('>') &&
          !brand.includes('function') &&
          !brand.includes('px') &&
          !brand.includes('margin') &&
          !brand.includes('display')) {
        // Clean up extra whitespace
        brand = brand.replace(/\s+/g, ' ').trim()
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
