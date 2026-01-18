import type { PlasmoCSConfig, PlasmoGetRootContainer } from "plasmo"
import { useEffect, useState, useRef } from "react"

import { isImageInGallery, getGalleryImages } from "~utils/gallery-detection"
import { saveGalleryImages } from "~utils/storage"
import GalleryPanel from "~components/GalleryPanel"

import "./styles/content.css"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

export const getRootContainer: PlasmoGetRootContainer = () => {
  const container = document.createElement("div")
  container.id = "plasmo-image-overlay-root"
  container.style.cssText =
    "all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 999998; pointer-events: none;"
  document.body.appendChild(container)
  return container
}

const MIN_IMAGE_SIZE = 100
const BUTTON_OFFSET = 8
const HIDE_DELAY = 100
const BUTTON_LEAVE_DELAY = 150

const ContentScript = () => {
  const [hoveredImage, setHoveredImage] = useState<HTMLImageElement | null>(null)
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number } | null>(null)
  const [isHoveringButton, setIsHoveringButton] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName !== "IMG") return

      clearHideTimeout()

      const img = target as HTMLImageElement
      if (img.width >= MIN_IMAGE_SIZE && img.height >= MIN_IMAGE_SIZE && isImageInGallery(img)) {
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

  const handleButtonMouseEnter = () => {
    setIsHoveringButton(true)
    clearHideTimeout()
  }

  const handleButtonMouseLeave = () => {
    setIsHoveringButton(false)
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredImage(null)
    }, BUTTON_LEAVE_DELAY)
  }

  const handleButtonClick = async (e: React.MouseEvent) => {
    // Stop propagation to prevent zoom, but analytics may still try to track
    // This is expected - the error is from the website's analytics, not our extension
    e.preventDefault()
    e.stopPropagation()
    
    if (hoveredImage) {
      try {
        const galleryImages = getGalleryImages(hoveredImage)
        console.log("Found gallery images:", galleryImages.length, galleryImages)
        
        if (galleryImages.length > 0) {
          await saveGalleryImages(galleryImages)
          console.log("Gallery images saved successfully:", galleryImages.length, "images")
          
          // Update badge to show new images
          try {
            chrome.runtime.sendMessage({ 
              type: 'GALLERY_IMAGES_UPDATED', 
              images: galleryImages,
              count: galleryImages.length
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.log("Message failed (this is normal):", chrome.runtime.lastError.message)
              }
            })
          } catch (err) {
            console.log("Could not send message (this is normal)")
          }
          
          // Show notification and open panel
          setNotificationMessage(`✓ ${galleryImages.length} images saved!`)
          setShowNotification(true)
          setIsPanelOpen(true) // Automatically open the panel
          
          // Hide notification after 3 seconds
          setTimeout(() => {
            setShowNotification(false)
          }, 3000)
          
          // Hide button after a brief delay
          setTimeout(() => {
            setHoveredImage(null)
          }, 500)
        } else {
          console.warn("No gallery images found - only found the clicked image")
        }
      } catch (error) {
        console.error("Error saving gallery images:", error)
      }
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Stop propagation to prevent zoom functionality
    e.stopPropagation()
  }

  return (
    <>
      {hoveredImage && buttonPosition && (
        <div
          className="try-on-button-container"
          data-extension-button="true"
          data-analytics-ignore="true"
          style={{
            position: "fixed",
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
            zIndex: 999999
          }}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
          onMouseDown={handleMouseDown}
        >
          <button
            className="try-on-button"
            data-extension-button="true"
            data-analytics-ignore="true"
            onClick={handleButtonClick}
            onMouseDown={handleMouseDown}
          >
            Try this on
          </button>
        </div>
      )}

      {showNotification && (
        <div
          className="try-on-notification"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            color: "white",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            zIndex: 999999,
            maxWidth: "300px",
            fontSize: "14px",
            animation: "slideUp 0.3s ease-out"
          }}
        >
          {notificationMessage}
        </div>
      )}

      {/* Toggle button to open panel */}
      {!isPanelOpen && (
        <button
          className="gallery-panel-toggle"
          onClick={() => setIsPanelOpen(true)}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: "20px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            zIndex: 999996,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.9)"
            e.currentTarget.style.transform = "scale(1.1)"
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.8)"
            e.currentTarget.style.transform = "scale(1)"
          }}
          title="Open Gallery Panel"
        >
          🖼️
        </button>
      )}

      <GalleryPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </>
  )
}

export default ContentScript
