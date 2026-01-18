import type { PlasmoCSConfig, PlasmoGetRootContainer } from "plasmo"
import { useEffect, useState } from "react"

import { getGalleryImages } from "~utils/gallery-detection"
import { saveGalleryImages, getUserData } from "~utils/storage"
import type { UserData } from "~types/user"
import VirtualTryOnPanel from "~components/VirtualTryOnPanel"
import TryOnButton from "~components/TryOnButton"
import Overlay from "~components/Overlay"
import { useImageHover } from "~hooks/useImageHover"
import { useButtonPosition } from "~hooks/useButtonPosition"

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

const BUTTON_LEAVE_DELAY = 150

const ContentScript = () => {
  const [isHoveringButton, setIsHoveringButton] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [showVirtualTryOnPanel, setShowVirtualTryOnPanel] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  const { hoveredImage, setHoveredImage, clearHideTimeout } = useImageHover(isHoveringButton)
  const buttonPosition = useButtonPosition(hoveredImage)

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

  const handleButtonMouseEnter = () => {
    setIsHoveringButton(true)
    clearHideTimeout()
  }

  const handleButtonMouseLeave = () => {
    setIsHoveringButton(false)
    setTimeout(() => {
      setHoveredImage(null)
    }, BUTTON_LEAVE_DELAY)
  }

  const handleButtonClick = async (e: React.MouseEvent) => {
    if (!hoveredImage) return

    try {
      const galleryImages = getGalleryImages(hoveredImage)
      console.log("Found gallery images:", galleryImages.length, galleryImages)

      if (galleryImages.length > 0) {
        await saveGalleryImages(galleryImages)
        console.log("Gallery images saved successfully:", galleryImages.length, "images")

        // Update badge to show new images
        try {
          chrome.runtime.sendMessage(
            {
              type: "GALLERY_IMAGES_UPDATED",
              images: galleryImages,
              count: galleryImages.length
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.log("Message failed (this is normal):", chrome.runtime.lastError.message)
              }
            }
          )
        } catch (err) {
          console.log("Could not send message (this is normal)")
        }

        // Show overlay with selected images
        setSelectedImages(galleryImages)
        setShowOverlay(true)
        setHoveredImage(null)
      } else {
        console.warn("No gallery images found - only found the clicked image")
      }
    } catch (error) {
      console.error("Error saving gallery images:", error)
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

  const handleStartVirtualTryOn = () => {
    setShowOverlay(false)
    setShowVirtualTryOnPanel(true)
  }

  if (isLoadingUser) {
    return null
  }

  return (
    <>
      {hoveredImage && buttonPosition && (
        <TryOnButton
          position={buttonPosition}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
          onClick={handleButtonClick}
        />
      )}

      <Overlay
        showOverlay={showOverlay}
        selectedImages={selectedImages}
        userData={userData}
        onClose={() => setShowOverlay(false)}
        onSetupComplete={handleSetupComplete}
        onStartVirtualTryOn={handleStartVirtualTryOn}
        onImagesChange={(images) => setSelectedImages(images)}
      />

      {showVirtualTryOnPanel && userData?.isSetup && (
        <VirtualTryOnPanel
          userData={userData}
          productImages={selectedImages}
          onClose={() => setShowVirtualTryOnPanel(false)}
          onImagesChange={(images) => setSelectedImages(images)}
        />
      )}
    </>
  )
}

export default ContentScript
