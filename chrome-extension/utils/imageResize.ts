/**
 * Resize an image to fit within max dimensions while maintaining aspect ratio
 * @param blob - The image blob to resize
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @param quality - JPEG quality (0-1), default 0.9
 * @returns Promise<Blob> - Resized image blob
 */
export async function resizeImage(
  blob: Blob,
  maxWidth: number = 500,
  maxHeight: number = 500,
  quality: number = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Calculate new dimensions
      let width = img.width
      let height = img.height

      // Only resize if image is larger than max dimensions
      if (width <= maxWidth && height <= maxHeight) {
        resolve(blob)
        return
      }

      // Calculate scaling factor
      const widthRatio = maxWidth / width
      const heightRatio = maxHeight / height
      const scale = Math.min(widthRatio, heightRatio)

      width = Math.floor(width * scale)
      height = Math.floor(height * scale)

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Use better image smoothing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (resizedBlob) => {
          if (resizedBlob) {
            console.log(
              `Image resized: ${img.width}x${img.height} -> ${width}x${height}, ` +
              `${Math.round(blob.size / 1024)}KB -> ${Math.round(resizedBlob.size / 1024)}KB`
            )
            resolve(resizedBlob)
          } else {
            reject(new Error('Failed to create blob from canvas'))
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Convert a blob to base64 data URL
 * @param blob - The blob to convert
 * @returns Promise<string> - Base64 data URL
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Fetch image from URL, resize it, and convert to base64
 * @param imageUrl - URL of the image to fetch
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @returns Promise<string> - Base64 data URL of resized image
 */
export async function fetchAndResizeImage(
  imageUrl: string,
  maxWidth: number = 1500,
  maxHeight: number = 1500
): Promise<string> {
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const resizedBlob = await resizeImage(blob, maxWidth, maxHeight)
  return blobToBase64(resizedBlob)
}
