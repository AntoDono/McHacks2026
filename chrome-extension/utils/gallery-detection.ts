/**
 * Utility functions for detecting product image galleries
 */

const MIN_IMAGE_SIZE = 100
const MIN_GALLERY_IMAGES = 2
const MAX_DEPTH = 5

/**
 * Gallery keywords used to identify product image galleries
 */
const GALLERY_KEYWORDS = [
  'gallery',
  'carousel',
  'slider',
  'product-image',
  'product-images',
  'thumbnail',
  'thumbnails',
  'image-gallery',
  'photo-gallery',
  'product-gallery',
  'swiper',
  'slick'
] as const

/**
 * Filters images by minimum size
 */
const getValidImages = (container: HTMLElement): HTMLImageElement[] => {
  const images = container.querySelectorAll('img')
  return Array.from(images).filter(
    i => i.width >= MIN_IMAGE_SIZE && i.height >= MIN_IMAGE_SIZE
  )
}

/**
 * Checks if a container has gallery keywords in its class or id
 */
const hasGalleryKeyword = (container: HTMLElement): boolean => {
  const className = container.className?.toLowerCase() || ''
  const id = container.id?.toLowerCase() || ''
  return GALLERY_KEYWORDS.some(
    keyword => className.includes(keyword) || id.includes(keyword)
  )
}

/**
 * Checks if images have similar sizes (within 50% variance)
 */
const checkImageSizeVariance = (images: HTMLImageElement[]): boolean => {
  const sizes = images.map(i => i.width * i.height)
  const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length
  return sizes.every(size => size >= avgSize * 0.5 && size <= avgSize * 1.5)
}

/**
 * Checks if a container is a gallery by keywords
 */
const checkGalleryByKeywords = (container: HTMLElement): boolean => {
  if (!hasGalleryKeyword(container)) return false
  const validImages = getValidImages(container)
  return validImages.length >= MIN_GALLERY_IMAGES
}

/**
 * Checks if a container is a gallery by image count and size variance
 */
const checkGalleryByImageCount = (container: HTMLElement): boolean => {
  const validImages = getValidImages(container)
  if (validImages.length < MIN_GALLERY_IMAGES) return false
  return checkImageSizeVariance(validImages)
}

/**
 * Finds the gallery container for an image by traversing up the DOM tree
 */
const findGalleryContainer = (img: HTMLImageElement): HTMLElement | null => {
  let container = img.parentElement
  let depth = 0

  while (container && depth < MAX_DEPTH) {
    if (checkGalleryByKeywords(container) || checkGalleryByImageCount(container)) {
      return container
    }
    container = container.parentElement
    depth++
  }

  return null
}

/**
 * Checks if an image is part of a product gallery
 * @param img - The image element to check
 * @returns true if the image is part of a gallery, false otherwise
 */
export const isImageInGallery = (img: HTMLImageElement): boolean => {
  return findGalleryContainer(img) !== null
}

/**
 * Gets the actual image URL, checking for lazy-loaded images
 * @param img - The image element
 * @returns The actual image URL
 */
const getImageUrl = (img: HTMLImageElement): string | null => {
  // Check for lazy-load attributes first
  const lazySrc = img.getAttribute('data-src') || 
                  img.getAttribute('data-lazy-src') || 
                  img.getAttribute('data-original') ||
                  img.getAttribute('data-srcset')?.split(',')[0]?.trim().split(' ')[0]
  
  if (lazySrc && lazySrc !== 'data:,' && !lazySrc.startsWith('data:,')) {
    return lazySrc
  }
  
  // Check srcset for responsive images
  if (img.srcset) {
    const srcsetUrls = img.srcset.split(',').map(s => s.trim().split(' ')[0])
    const validUrl = srcsetUrls.find(url => url && !url.startsWith('data:,'))
    if (validUrl) return validUrl
  }
  
  // Use src if it's valid
  if (img.src && img.src !== 'data:,' && !img.src.startsWith('data:,')) {
    return img.src
  }
  
  return null
}

/**
 * Gets all images from the gallery that contains the given image
 * @param img - The image element to find the gallery for
 * @returns Array of image URLs from the gallery
 */
export const getGalleryImages = (img: HTMLImageElement): string[] => {
  const container = findGalleryContainer(img)
  
  if (container) {
    const validImages = getValidImages(container)
    const urls = validImages
      .map(i => getImageUrl(i))
      .filter((url): url is string => url !== null && url.length > 0)
    return Array.from(new Set(urls)) // Remove duplicates
  }

  // Fallback: return just the clicked image
  const clickedImageUrl = getImageUrl(img)
  return clickedImageUrl ? [clickedImageUrl] : []
}
