import type { PlasmoCSConfig, PlasmoGetRootContainer } from "plasmo"
import { useEffect, useState, useRef } from "react"

import { isImageInGallery, getGalleryImages } from "~utils/gallery-detection"
import { saveGalleryImages, getUserData } from "~utils/storage"
import type { UserData } from "~types/user"
import Setup from "~components/Setup"
import VirtualTryOnPanel from "~components/VirtualTryOnPanel"

import "./styles/content.css"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

export const getRootContainer: PlasmoGetRootContainer = () => {
  const container = document.createElement("div")
  container.id = "plasmo-image-overlay-root"
  container.style.cssText =
    "all: initial; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 999998; pointer-events: none;"
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
  const [showOverlay, setShowOverlay] = useState(false)
  const [showVirtualTryOnPanel, setShowVirtualTryOnPanel] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await getUserData()
        setUserData(data)
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setIsLoadingUser(false)
      }
    }
    loadUserData()
  }, [])

  // Handle image hover
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
          
          // Show overlay with selected images
          setSelectedImages(galleryImages)
          setShowOverlay(true)
          
          // Hide button
          setHoveredImage(null)
        } else {
          console.warn("No gallery images found - only found the clicked image")
        }
      } catch (error) {
        console.error("Error saving gallery images:", error)
      }
    }
  }

  const handleSetupComplete = async () => {
    try {
      const data = await getUserData()
      setUserData(data)
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Stop propagation to prevent zoom functionality
    e.stopPropagation()
  }

  if (isLoadingUser) {
    return null
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
        <div className="try-on-notification">
          {notificationMessage}
        </div>
      )}

      {/* Overlay Component */}
      {showOverlay && (
        <div
          className="try-on-overlay"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setShowOverlay(false)
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="try-on-overlay-content"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="try-on-overlay-close"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setShowOverlay(false)
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ×
            </button>

            {!userData?.isSetup ? (
              <Setup onSetupComplete={handleSetupComplete} />
            ) : (
              <div>
                <h2 className="try-on-overlay-title">
                  Virtual Try-On
                </h2>
                <div className="try-on-overlay-section">
                  <h3 className="try-on-overlay-section-title">
                    Selected Images ({selectedImages.length})
                  </h3>
                  <div className="try-on-overlay-images-grid">
                    {selectedImages.map((src, index) => (
                      <img
                        key={index}
                        src={src}
                        alt={`Product ${index + 1}`}
                        className="try-on-overlay-image"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  className="try-on-overlay-start-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    console.log("Start Virtual Try-On clicked!")
                    // Close the initial overlay and show the virtual try-on panel
                    setShowOverlay(false)
                    setShowVirtualTryOnPanel(true)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  Start Virtual Try-On
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Virtual Try-On Panel */}
      {showVirtualTryOnPanel && userData?.isSetup && (
        <VirtualTryOnPanel
          userData={userData}
          productImages={selectedImages}
          onClose={() => setShowVirtualTryOnPanel(false)}
        />
      )}
    </>
  )
}

export default ContentScript
