import type { PlasmoCSConfig, PlasmoGetRootContainer } from "plasmo"
import { useEffect, useState } from "react"

import { getGalleryImages } from "~utils/gallery-detection"
import { saveGalleryImages, getUserData } from "~utils/storage"
import type { UserData } from "~types/user"
import VirtualTryOnPanel from "~components/VirtualTryOnPanel"
import TryOnButton from "~components/TryOnButton"
import Overlay from "~components/Overlay"
import Setup from "~components/Setup"
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
    "all: initial; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647 !important; pointer-events: none;"
  document.body.appendChild(container)
  return container
}

const BUTTON_LEAVE_DELAY = 150

const ContentScript = () => {
  const [isHoveringButton, setIsHoveringButton] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [showVirtualTryOnPanel, setShowVirtualTryOnPanel] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [tryOnResultImages, setTryOnResultImages] = useState<string[]>([])
  const [isLoadingTryOn, setIsLoadingTryOn] = useState(false)

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

        // Store selected images
        setSelectedImages(galleryImages)
        
        // Check if user is set up
        if (!userData?.isSetup) {
          // Show setup only
          setShowSetup(true)
        } else {
          // Show gallery overlay
          setShowOverlay(true)
        }
        
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
      // After setup is complete, show the gallery overlay
      setShowSetup(false)
      setShowOverlay(true)
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  const handleStartVirtualTryOn = async () => {
    // Check if we have required data
    if (!userData?.photo) {
      alert("Please set up your profile photo first")
      return
    }

    if (!selectedImages || selectedImages.length === 0) {
      alert("Please select at least one product image")
      return
    }

    setShowOverlay(false)
    setShowVirtualTryOnPanel(true)
    setIsLoadingTryOn(true)

    try {
      // Get API URL from environment
      const API_URL = process.env.PLASMO_PUBLIC_API_URL || `http://localhost:${process.env.PLASMO_PUBLIC_PORT || 8080}`

      console.log("Starting virtual try-on...")
      console.log("User photo:", userData.photo.substring(0, 50) + "...")
      console.log("Product image:", selectedImages[0])

      // Convert base64 photo to Blob
      const photoBase64 = userData.photo.replace(/^data:image\/[a-z]+;base64,/, "")
      const photoBlob = await fetch(`data:image/png;base64,${photoBase64}`).then(res => res.blob())
      const photoFile = new File([photoBlob], "person.png", { type: "image/png" })

      // Get first product image
      const productImageUrl = selectedImages[0]
      
      // Fetch product image and convert to File
      const productResponse = await fetch(productImageUrl)
      const productBlob = await productResponse.blob()
      const productFile = new File([productBlob], "garment.jpg", { type: productBlob.type || "image/jpeg" })

      // Create FormData
      const formData = new FormData()
      formData.append("person", photoFile)
      formData.append("garment", productFile)

      // Call try-on API
      console.log("Calling try-on API:", `${API_URL}/try-on`)
      const response = await fetch(`${API_URL}/try-on`, {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate try-on image")
      }

      const data = await response.json()
      console.log("Try-on result:", data)

      // Display the result images
      if (data.success && (data.images || data.image)) {
        console.log("✓ Try-on images generated successfully:", data.filename)
        // Use images array if available, otherwise fallback to single image
        const images = data.images || [data.image]
        console.log(`Generated ${images.length} view(s)`)
        setTryOnResultImages(images)
      }

    } catch (error) {
      console.error("Error in virtual try-on:", error)
      alert(`Failed to generate try-on image: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoadingTryOn(false)
    }
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

      {showSetup && !userData?.isSetup && (
        <div
          className="try-on-overlay"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowSetup(false)
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="try-on-overlay-content"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Setup
              onSetupComplete={handleSetupComplete}
              onClose={() => setShowSetup(false)}
            />
          </div>
        </div>
      )}

      <Overlay
        showOverlay={showOverlay}
        selectedImages={selectedImages}
        userData={userData}
        onClose={() => setShowOverlay(false)}
        onStartVirtualTryOn={handleStartVirtualTryOn}
        onImagesChange={(images) => setSelectedImages(images)}
      />

      {showVirtualTryOnPanel && userData?.isSetup && (
        <VirtualTryOnPanel
          userData={userData}
          productImages={selectedImages}
          tryOnResultImages={tryOnResultImages}
          isLoading={isLoadingTryOn}
          onClose={() => {
            setShowVirtualTryOnPanel(false)
            setTryOnResultImages([])
            setIsLoadingTryOn(false)
          }}
          onImagesChange={(images) => setSelectedImages(images)}
        />
      )}
    </>
  )
}

export default ContentScript
