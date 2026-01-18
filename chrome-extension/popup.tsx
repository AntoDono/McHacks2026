import { useEffect, useState } from "react"
import Setup from "~components/Setup"
import { getUserData, clearUserData } from "~utils/storage"
import type { UserData } from "~types/user"

import "./styles/globals.css"
import "./styles/popup.css"

interface TryOnSession {
  timestamp: string
  created_at: string
  person_image: string
  main_image: string | null
  garment_count: number
  generated_count: number
}

interface SessionDetail {
  timestamp: string
  created_at: string
  person_image: string
  garments: Array<{
    image: string
    order: number
    sku?: string
    url?: string
    title?: string
    price?: string
  }>
  generated_images: Array<{
    image: string
    is_main: boolean
    view_index: number
  }>
}

function IndexPopup() {
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [sessions, setSessions] = useState<TryOnSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [selectedGarment, setSelectedGarment] = useState<SessionDetail['garments'][0] | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)
  const [selectedImageGallery, setSelectedImageGallery] = useState<string[]>([])

  // Check if user is setup on load
  useEffect(() => {
    loadUserData()
    loadSessions()
  }, [])

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

  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      const API_URL = process.env.PLASMO_PUBLIC_API_URL || `http://localhost:${process.env.PLASMO_PUBLIC_PORT || 8080}`
      const response = await fetch(`${API_URL}/sessions?limit=20`)
      const data = await response.json()
      if (data.success) {
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error("Error loading sessions:", error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadSessionDetail = async (timestamp: string) => {
    setLoadingDetail(true)
    try {
      const API_URL = process.env.PLASMO_PUBLIC_API_URL || `http://localhost:${process.env.PLASMO_PUBLIC_PORT || 8080}`
      const response = await fetch(`${API_URL}/sessions/${timestamp}`)
      const data = await response.json()
      if (data.success) {
        setSelectedSession(data.session)
      }
    } catch (error) {
      console.error("Error loading session detail:", error)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleSessionClick = (session: TryOnSession) => {
    loadSessionDetail(session.timestamp)
  }

  const handleBackToGallery = () => {
    setSelectedSession(null)
  }

  const handleGarmentClick = (garment: SessionDetail['garments'][0]) => {
    setSelectedGarment(garment)
  }

  // Handle opening image modal with context
  const handleImageClick = (imageUrl: string, gallery: string[], index: number) => {
    setSelectedImage(imageUrl)
    setSelectedImageGallery(gallery)
    setSelectedImageIndex(index)
  }

  // Handle arrow key navigation in modal
  useEffect(() => {
    if (!selectedImage) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prevIndex = selectedImageIndex === 0 
          ? selectedImageGallery.length - 1 
          : selectedImageIndex - 1
        setSelectedImageIndex(prevIndex)
        setSelectedImage(selectedImageGallery[prevIndex])
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const nextIndex = selectedImageIndex === selectedImageGallery.length - 1 
          ? 0 
          : selectedImageIndex + 1
        setSelectedImageIndex(nextIndex)
        setSelectedImage(selectedImageGallery[nextIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedImage(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage, selectedImageIndex, selectedImageGallery])

  const handleModalPrev = () => {
    const prevIndex = selectedImageIndex === 0 
      ? selectedImageGallery.length - 1 
      : selectedImageIndex - 1
    setSelectedImageIndex(prevIndex)
    setSelectedImage(selectedImageGallery[prevIndex])
  }

  const handleModalNext = () => {
    const nextIndex = selectedImageIndex === selectedImageGallery.length - 1 
      ? 0 
      : selectedImageIndex + 1
    setSelectedImageIndex(nextIndex)
    setSelectedImage(selectedImageGallery[nextIndex])
  }

  const handleThumbnailClick = (index: number) => {
    setSelectedImageIndex(index)
    setSelectedImage(selectedImageGallery[index])
  }

  const handleCloseGarmentModal = () => {
    setSelectedGarment(null)
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
      <div className="popup-loading">
        <p>Loading...</p>
      </div>
    )
  }

  // Show setup if user hasn't completed it
  if (!userData?.isSetup) {
    return <Setup onSetupComplete={handleSetupComplete} />
  }

  // Show session detail view if a session is selected
  if (selectedSession) {
    return (
      <div className="popup-container">
        <div className="popup-detail-header">
          <button onClick={handleBackToGallery} className="popup-back-button">
            ← Back
          </button>
          <h2 className="popup-detail-title">Fit Details</h2>
        </div>

        <div className="popup-detail-content">
          {loadingDetail ? (
            <div className="popup-gallery-loading">
              <p>Loading details...</p>
            </div>
          ) : (
            <>
              {/* Garments Used */}
              <div className="popup-detail-section">
                <h3 className="popup-detail-section-title">
                  Garments Used ({selectedSession.garments.length})
                </h3>
                <div className="popup-garments-grid">
                  {selectedSession.garments.map((garment, idx) => (
                    <div 
                      key={idx} 
                      className="popup-garment-card"
                      onClick={() => handleGarmentClick(garment)}
                      style={{ cursor: 'pointer' }}
                    >
                      <img
                        src={garment.image}
                        alt={garment.title || `Garment ${idx + 1}`}
                        className="popup-garment-image"
                      />
                      {garment.title && (
                        <div className="popup-garment-title">{garment.title}</div>
                      )}
                      {garment.price && (
                        <div className="popup-garment-price">{garment.price}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Fits */}
              <div className="popup-detail-section">
                <h3 className="popup-detail-section-title">
                  Generated Fits ({selectedSession.generated_images.length})
                </h3>
                <div className="popup-fits-grid">
                  {selectedSession.generated_images.map((fit, idx) => (
                    <div 
                      key={idx} 
                      className="popup-fit-card"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        const fitImages = selectedSession.generated_images.map(f => f.image)
                        handleImageClick(fit.image, fitImages, idx)
                      }}
                    >
                      <img
                        src={fit.image}
                        alt={`Fit ${idx + 1}`}
                        className="popup-fit-image"
                      />
                      {fit.is_main && (
                        <span className="popup-fit-main-badge">Main</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Garment Detail Modal */}
        {selectedGarment && (
          <div className="popup-modal-overlay" onClick={handleCloseGarmentModal}>
            <div className="popup-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="popup-modal-header">
                <h3 className="popup-modal-title">Garment Details</h3>
                <button 
                  className="popup-modal-close"
                  onClick={handleCloseGarmentModal}
                >
                  ✕
                </button>
              </div>
              <div className="popup-modal-body">
                <img
                  src={selectedGarment.image}
                  alt={selectedGarment.title || 'Garment'}
                  className="popup-modal-image"
                />
                <div className="popup-modal-details">
                  {selectedGarment.title && (
                    <div className="popup-modal-detail-row">
                      <span className="popup-modal-label">Title:</span>
                      <span className="popup-modal-value">{selectedGarment.title}</span>
                    </div>
                  )}
                  {selectedGarment.price && (
                    <div className="popup-modal-detail-row">
                      <span className="popup-modal-label">Price:</span>
                      <span className="popup-modal-value">{selectedGarment.price}</span>
                    </div>
                  )}
                  {selectedGarment.sku && (
                    <div className="popup-modal-detail-row">
                      <span className="popup-modal-label">SKU:</span>
                      <span className="popup-modal-value">{selectedGarment.sku}</span>
                    </div>
                  )}
                  {selectedGarment.order !== undefined && (
                    <div className="popup-modal-detail-row">
                      <span className="popup-modal-label">Order:</span>
                      <span className="popup-modal-value">{selectedGarment.order}</span>
                    </div>
                  )}
                  {selectedGarment.url && (
                    <div className="popup-modal-detail-row">
                      <span className="popup-modal-label">Product URL:</span>
                      <a 
                        href={selectedGarment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="popup-modal-link"
                      >
                        View Product →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal - Only shown in detail view */}
        {selectedImage && selectedImageGallery.length > 0 && (
          <div 
            className="popup-image-modal-overlay"
            onClick={() => setSelectedImage(null)}
          >
            <div 
              className="popup-image-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="popup-image-modal-close"
                onClick={() => setSelectedImage(null)}
                aria-label="Close image"
              >
                ×
              </button>
              
              {selectedImageGallery.length > 1 && (
                <>
                  <button
                    className="popup-image-modal-arrow popup-image-modal-prev"
                    onClick={handleModalPrev}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    className="popup-image-modal-arrow popup-image-modal-next"
                    onClick={handleModalNext}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                </>
              )}
              
              <div className="popup-image-modal-image-wrapper">
                <img
                  src={selectedImage}
                  alt={`Image ${selectedImageIndex + 1} of ${selectedImageGallery.length}`}
                  className="popup-image-modal-image"
                />
              </div>
              
              {selectedImageGallery.length > 1 && (
                <div className="popup-image-modal-dots">
                  {selectedImageGallery.map((_, idx) => (
                    <button
                      key={idx}
                      className={`popup-image-modal-dot ${idx === selectedImageIndex ? 'active' : ''}`}
                      onClick={() => handleThumbnailClick(idx)}
                      aria-label={`View image ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Main app view (after setup is complete)
  return (
    <div className="popup-container">
      <h2 className="popup-welcome-header">
        Welcome back!
      </h2>
      
      {/* Main content with photo on left, info on right */}
      <div className="popup-main-card">
        {/* Left: Profile Photo */}
        {userData.photo && (
          <div className="popup-photo-container">
            <img
              src={userData.photo}
              alt="Profile"
              className="popup-profile-photo"
            />
          </div>
        )}
        
        {/* Right: User Info */}
        <div className="popup-user-info">
          <h3 className="popup-user-name">
            {userData.fname} {userData.lname}
          </h3>
          <div className="popup-user-details">
            <div className="popup-detail-row">
              <span className="popup-detail-label">Email:</span>
              <span className="popup-detail-value">{userData.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Previously Tried Fits Gallery */}
      <div className="popup-gallery-section">
        <div className="popup-gallery-header-row">
          <h3 className="popup-gallery-header">
            Previously Tried Fits
          </h3>
          {!loadingSessions && sessions.length > 0 && (
            <span className="popup-gallery-count">{sessions.length}</span>
          )}
        </div>
        
        {loadingSessions ? (
          <div className="popup-gallery-loading">
            <p>Loading your fits...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="popup-gallery-empty">
            <p>No previous fits yet. Start shopping to see your try-ons here!</p>
          </div>
        ) : (
          <div className="popup-gallery-grid">
            {sessions.map((session) => (
              <div 
                key={session.timestamp} 
                className="popup-gallery-item"
                onClick={() => handleSessionClick(session)}
              >
                {session.main_image ? (
                  <img
                    src={session.main_image}
                    alt={`Try-on from ${new Date(session.created_at).toLocaleDateString()}`}
                    className="popup-gallery-image"
                  />
                ) : (
                  <div className="popup-gallery-placeholder">
                    No image
                  </div>
                )}
                <div className="popup-gallery-item-info">
                  <span className="popup-gallery-date">
                    {new Date(session.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  {session.garment_count > 1 && (
                    <span className="popup-gallery-badge">
                      {session.garment_count} items
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleReset}
        className="popup-reset-button btn-primary">
        Reset Data
      </button>
    </div>
  )
}

export default IndexPopup
