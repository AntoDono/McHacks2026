import { useEffect, useState, useRef } from "react"
import { isImageInGallery } from "~utils/gallery-detection"

const MIN_IMAGE_SIZE = 100
const HIDE_DELAY = 100

/**
 * Hook for detecting when user hovers over gallery images
 */
export const useImageHover = (isHoveringButton: boolean) => {
  const [hoveredImage, setHoveredImage] = useState<HTMLImageElement | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      // Find the actual IMG element, even if hovering over a container
      let target = e.target as HTMLElement
      
      // If not directly on an IMG, check if we're inside an image container
      if (target.tagName !== "IMG") {
        // Look for the nearest IMG element in the parent chain
        const imgElement = target.closest("img") || target.querySelector("img")
        if (!imgElement) return
        target = imgElement as HTMLElement
      }

      clearHideTimeout()

      const img = target as HTMLImageElement
      
      // Check actual rendered dimensions (not just width/height attributes)
      const rect = img.getBoundingClientRect()
      const actualWidth = rect.width
      const actualHeight = rect.height
      
      if (actualWidth >= MIN_IMAGE_SIZE && actualHeight >= MIN_IMAGE_SIZE && isImageInGallery(img)) {
        setHoveredImage(img)
      }
    }

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "IMG" && !isHoveringButton) {
        hideTimeoutRef.current = setTimeout(() => {
          if (!isHoveringButton) {
            setHoveredImage(null)
          }
        }, HIDE_DELAY)
      }
    }

    document.addEventListener("mouseover", handleMouseOver, true)
    document.addEventListener("mouseout", handleMouseOut, true)

    return () => {
      document.removeEventListener("mouseover", handleMouseOver, true)
      document.removeEventListener("mouseout", handleMouseOut, true)
      clearHideTimeout()
    }
  }, [isHoveringButton])

  return { hoveredImage, setHoveredImage, clearHideTimeout }
}
