import { useEffect, useState } from "react"

const BUTTON_OFFSET = 8

/**
 * Hook for managing button position relative to hovered image
 * Positions button at the top-left corner of the actual image element
 */
export const useButtonPosition = (hoveredImage: HTMLImageElement | null) => {
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!hoveredImage) {
      setButtonPosition(null)
      return
    }

    const updatePosition = () => {
      // Get the actual image's bounding rect (not any container)
      // getBoundingClientRect() gives us the position relative to the viewport
      const rect = hoveredImage.getBoundingClientRect()
      
      // Position at the top-left corner of the actual image
      // Since button uses position: fixed, we use viewport coordinates directly
      // rect.top and rect.left are already relative to the viewport
      setButtonPosition({
        top: Math.max(0, rect.top + BUTTON_OFFSET), // Ensure it's not negative
        left: Math.max(0, rect.left + BUTTON_OFFSET) // Ensure it's not negative
      })
    }

    // Initial position
    updatePosition()

    // Update on scroll (use capture phase to catch all scroll events)
    const handleScroll = () => updatePosition()
    const handleResize = () => updatePosition()
    
    // Listen to scroll on window and all scrollable containers
    window.addEventListener("scroll", handleScroll, true)
    window.addEventListener("resize", handleResize)
    
    // Also listen for scroll on the image's parent containers
    let parent: HTMLElement | null = hoveredImage.parentElement
    while (parent) {
      parent.addEventListener("scroll", handleScroll, true)
      parent = parent.parentElement
    }

    return () => {
      window.removeEventListener("scroll", handleScroll, true)
      window.removeEventListener("resize", handleResize)
      
      // Clean up parent listeners
      let parent: HTMLElement | null = hoveredImage.parentElement
      while (parent) {
        parent.removeEventListener("scroll", handleScroll, true)
        parent = parent.parentElement
      }
    }
  }, [hoveredImage])

  return buttonPosition
}
