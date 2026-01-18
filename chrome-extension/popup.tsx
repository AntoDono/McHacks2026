import { useEffect, useState } from "react"
import Setup from "~components/Setup"
import { getUserData, clearUserData, getStoredGalleryImages, GALLERY_IMAGES_KEY } from "~utils/storage"
import type { UserData } from "~types/user"

import "./styles/globals.css"

function IndexPopup() {
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [galleryImages, setGalleryImages] = useState<string[]>([])

  // Check if user is setup on load
  useEffect(() => {
    loadUserData()
    loadGalleryImages()
    
    // Listen for storage changes to update gallery images
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      try {
        if (areaName === 'local' && changes[GALLERY_IMAGES_KEY]) {
          console.log("Storage changed, reloading gallery images")
          loadGalleryImages()
        }
      } catch (error) {
        console.error("Error handling storage change:", error)
      }
    }
    
    // Listen for messages from content script
    const handleMessage = (
      message: { type: string; images?: string[] },
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      try {
        if (message.type === 'GALLERY_IMAGES_UPDATED' && message.images) {
          setGalleryImages(message.images)
          sendResponse({ success: true })
        }
      } catch (error) {
        console.error("Error handling message:", error)
        sendResponse({ success: false, error: String(error) })
      }
      return true // Keep message channel open for async response
    }
    
    chrome.storage.onChanged.addListener(handleStorageChange)
    chrome.runtime.onMessage.addListener(handleMessage)
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  const loadGalleryImages = async () => {
    try {
      const images = await getStoredGalleryImages()
      console.log("Loaded gallery images:", images)
      setGalleryImages(images)
    } catch (error) {
      console.error("Error loading gallery images:", error)
    }
  }

  const loadUserData = async () => {
    try {
      const data = await getUserData()
      setUserData(data)
    } catch (error) {
      console.error("Error loading user data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupComplete = () => {
    // Reload user data after setup
    loadUserData()
  }

  const handleReset = async () => {
    if (
      confirm(
        "Are you sure you want to reset your data? This will clear all your information and require setup again."
      )
    ) {
      try {
        await clearUserData()
        console.log("User data cleared")
        // Reload to show setup screen
        loadUserData()
      } catch (error) {
        console.error("Error clearing user data:", error)
        alert("Failed to reset data. Please try again.")
      }
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    )
  }

  // Show setup if user hasn't completed it
  if (!userData?.isSetup) {
    return <Setup onSetupComplete={handleSetupComplete} />
  }

  // Main app view (after setup is complete)
  return (
    <div
      style={{
        padding: 24,
        minWidth: 350,
        backgroundColor: "white"
      }}>
      <h2 style={{ color: "#000", marginTop: 0 }}>
        Welcome back, {userData.fname}! 👋
      </h2>
      {userData.photo && (
        <img
          src={userData.photo}
          alt="Profile"
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid var(--primary)",
            marginBottom: 16
          }}
        />
      )}
      <div style={{ color: "#333", marginBottom: 20 }}>
        <p>
          <strong>Email:</strong> {userData.email}
        </p>
        <p>
          <strong>Name:</strong> {userData.fname} {userData.lname}
        </p>
      </div>

      {galleryImages.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: "#000", marginBottom: 12, fontSize: "16px" }}>
            Product Gallery ({galleryImages.length} images)
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "8px",
              maxHeight: "400px",
              overflowY: "auto"
            }}
          >
            {galleryImages.map((src, index) => (
              <img
                key={index}
                src={src}
                alt={`Product image ${index + 1}`}
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: "4px",
                  objectFit: "cover",
                  cursor: "pointer",
                  border: "1px solid #ddd"
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleReset}
        style={{
          padding: "10px 20px",
          backgroundColor: "#f5f5f5",
          color: "#666",
          border: "1px solid #ddd",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
          width: "100%",
          transition: "all 0.2s ease"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = "#eee"
          e.currentTarget.style.borderColor = "#ccc"
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "#f5f5f5"
          e.currentTarget.style.borderColor = "#ddd"
        }}>
        Reset Data
      </button>
    </div>
  )
}

export default IndexPopup
