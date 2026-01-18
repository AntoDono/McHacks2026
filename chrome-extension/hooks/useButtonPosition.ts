import { useEffect, useState } from "react"

const BUTTON_OFFSET = 8

/**
 * Hook for managing button position relative to hovered image
 */
export const useButtonPosition = (hoveredImage: HTMLImageElement | null) => {
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!hoveredImage) {
      setButtonPosition(null)
      return
    }

    const updatePosition = () => {
      const rect = hoveredImage.getBoundingClientRect()
      setButtonPosition({
        top: rect.top + BUTTON_OFFSET,
        left: rect.left + BUTTON_OFFSET
      })
    }

    updatePosition()

    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)

    return () => {
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [hoveredImage])

  return buttonPosition
}
