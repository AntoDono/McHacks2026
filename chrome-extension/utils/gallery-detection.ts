/**
 * Utility functions for detecting product image galleries
 */

const MIN_IMAGE_SIZE = 100
const MIN_GALLERY_IMAGES = 2

/**
 * Checks if an image is part of a product gallery
 * @param img - The image element to check
 * @returns true if the image is part of a gallery, false otherwise
 */
export const isImageInGallery = (img: HTMLImageElement): boolean => {
  let container = img.parentElement
  let depth = 0
  const maxDepth = 5

  const galleryKeywords = [
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
  ]

  while (container && depth < maxDepth) {
    const className = container.className?.toLowerCase() || ''
    const id = container.id?.toLowerCase() || ''

    const hasGalleryKeyword = galleryKeywords.some(
      keyword => className.includes(keyword) || id.includes(keyword)
    )

    if (hasGalleryKeyword) {
      const images = container.querySelectorAll('img')
      const validImages = Array.from(images).filter(
        i => i.width >= MIN_IMAGE_SIZE && i.height >= MIN_IMAGE_SIZE
      )

      if (validImages.length >= MIN_GALLERY_IMAGES) {
        return true
      }
    }

    // Check if container has multiple images (potential gallery)
    const images = container.querySelectorAll('img')
    const validImages = Array.from(images).filter(
      i => i.width >= MIN_IMAGE_SIZE && i.height >= MIN_IMAGE_SIZE
    )

    if (validImages.length >= MIN_GALLERY_IMAGES) {
      // Additional check: images should be similar in size (within 50% variance)
      const sizes = validImages.map(i => i.width * i.height)
      const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length
      const variance = sizes.every(size =>
        size >= avgSize * 0.5 && size <= avgSize * 1.5
      )

      if (variance) {
        return true
      }
    }

    container = container.parentElement
    depth++
  }

  return false
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
  let container = img.parentElement
  let depth = 0
  const maxDepth = 5

  const galleryKeywords = [
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
  ]

  while (container && depth < maxDepth) {
    const className = container.className?.toLowerCase() || ''
    const id = container.id?.toLowerCase() || ''

    const hasGalleryKeyword = galleryKeywords.some(
      keyword => className.includes(keyword) || id.includes(keyword)
    )

    if (hasGalleryKeyword) {
      const images = container.querySelectorAll('img')
      const validImages = Array.from(images).filter(
        i => i.width >= MIN_IMAGE_SIZE && i.height >= MIN_IMAGE_SIZE
      )

      if (validImages.length >= MIN_GALLERY_IMAGES) {
        const urls = validImages
          .map(i => getImageUrl(i))
          .filter((url): url is string => url !== null && url.length > 0)
        return Array.from(new Set(urls)) // Remove duplicates
      }
    }

    // Check if container has multiple images (potential gallery)
    const images = container.querySelectorAll('img')
    const validImages = Array.from(images).filter(
      i => i.width >= MIN_IMAGE_SIZE && i.height >= MIN_IMAGE_SIZE
    )

    if (validImages.length >= MIN_GALLERY_IMAGES) {
      const sizes = validImages.map(i => i.width * i.height)
      const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length
      const variance = sizes.every(size =>
        size >= avgSize * 0.5 && size <= avgSize * 1.5
      )

      if (variance) {
        const urls = validImages
          .map(i => getImageUrl(i))
          .filter((url): url is string => url !== null && url.length > 0)
        return Array.from(new Set(urls)) // Remove duplicates
      }
    }

    container = container.parentElement
    depth++
  }

  // Fallback: return just the clicked image
  const clickedImageUrl = getImageUrl(img)
  return clickedImageUrl ? [clickedImageUrl] : []
}
