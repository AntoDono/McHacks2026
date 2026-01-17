import type { PlasmoCSConfig, PlasmoGetRootContainer } from "plasmo"
import { useEffect, useState } from "react"

import "./styles/content.css"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

export const getRootContainer: PlasmoGetRootContainer = () => {
  // Create a dedicated container for our overlay
  const container = document.createElement("div")
  container.id = "plasmo-image-preview-root"
  container.style.cssText = "all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 999998; pointer-events: none;"
  document.body.appendChild(container)
  return container
}

const ImageClickOverlay = () => {
  const [currentImage, setCurrentImage] = useState<string | null>(null)

  useEffect(() => {
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Check if the clicked element is an image
      if (target.tagName === "IMG") {
        e.preventDefault()
        e.stopPropagation()
        
        const img = target as HTMLImageElement
        setCurrentImage(img.src)
        console.log("Image clicked:", img.src)
      }
    }

    // Add click listener to the document
    document.addEventListener("click", handleImageClick, true)

    return () => {
      document.removeEventListener("click", handleImageClick, true)
    }
  }, [])

  const closePreview = () => {
    setCurrentImage(null)
  }

  // Always render container, but make it hidden when no image
  return (
    <>
      {currentImage && (
        <div className="image-preview-container" onClick={closePreview}>
          <img src={currentImage} alt="Preview" className="image-preview-img" />
          <div className="image-preview-text">Click to close</div>
        </div>
      )}
    </>
  )
}

export default ImageClickOverlay
