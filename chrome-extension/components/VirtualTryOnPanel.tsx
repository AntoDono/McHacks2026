import { useState, useEffect } from "react"
import type { UserData } from "~types/user"
import { preventDefaultAndStop, createStopPropagationHandler } from "~utils/events"

import "../styles/virtual-try-on-panel.css"

interface VirtualTryOnPanelProps {
  userData: UserData
  productImages: string[]
  tryOnResultImages?: string[]
  isLoading?: boolean
  onClose: () => void
  onStartVirtualTryOn?: () => void
  onImagesChange?: (images: string[]) => void
}

const VirtualTryOnPanel = ({ userData, productImages, tryOnResultImages = [], isLoading, onClose, onStartVirtualTryOn, onImagesChange }: VirtualTryOnPanelProps) => {
  const [images, setImages] = useState<string[]>(productImages)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)
  const [selectedImageGallery, setSelectedImageGallery] = useState<string[]>([])
  const [isAutoPlaying, setIsAutoPlaying] = useState(true) // Auto-play enabled by default
  const [autoPlayInterval] = useState(500) // 2 seconds between images

  useEffect(() => {
    setImages(productImages)
  }, [productImages])

  // Reset to first image and start auto-play when new results come in
  useEffect(() => {
    setCurrentImageIndex(0)
    setIsAutoPlaying(true)
  }, [tryOnResultImages])

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || tryOnResultImages.length <= 1) return

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => 
        prev === tryOnResultImages.length - 1 ? 0 : prev + 1
      )
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [isAutoPlaying, tryOnResultImages.length, autoPlayInterval])

  const handleRemoveImage = (indexToRemove: number) => {
    const newImages = images.filter((_, index) => index !== indexToRemove)
    setImages(newImages)
    onImagesChange?.(newImages)
  }

  const handleCloseClick = (e: React.MouseEvent) => {
    preventDefaultAndStop(e)
    onClose()
  }

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsAutoPlaying(false) // Pause auto-play when user manually navigates
    setCurrentImageIndex((prev) => 
      prev === 0 ? tryOnResultImages.length - 1 : prev - 1
    )
  }

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsAutoPlaying(false) // Pause auto-play when user manually navigates
    setCurrentImageIndex((prev) => 
      prev === tryOnResultImages.length - 1 ? 0 : prev + 1
    )
  }

  const toggleAutoPlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsAutoPlaying((prev) => !prev)
  }

  const hasMultipleResults = tryOnResultImages.length > 1
  const currentResultImage = tryOnResultImages[currentImageIndex]

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

  return (
    <div
      className="virtual-try-on-panel"
      onClick={createStopPropagationHandler()}
      onMouseDown={createStopPropagationHandler()}
    >
      <div className="virtual-try-on-panel-header">
        <h2 className="virtual-try-on-panel-title">Virtual Try-On</h2>
        <button className="virtual-try-on-panel-close" onClick={handleCloseClick}>
          ×
        </button>
      </div>

      <div className="virtual-try-on-panel-content">
        {/* Profile Photo Section */}
        <div className="virtual-try-on-profile-section">
          <h3 className="virtual-try-on-section-title">
            {tryOnResultImages.length > 0 ? "Try-On Result" : "Your Photo"}
          </h3>
          {isLoading ? (
            <div className="virtual-try-on-profile-container">
              <div className="virtual-try-on-spinner">
                <div className="spinner"></div>
                <p style={{ fontSize: "14px", color: "#666", marginTop: "16px", textAlign: "center" }}>
                  Generating your virtual try-on...
                </p>
              </div>
            </div>
          ) : tryOnResultImages.length > 0 ? (
            <div className="virtual-try-on-carousel">
              {hasMultipleResults && (
                <button 
                  className="virtual-try-on-carousel-arrow virtual-try-on-carousel-prev"
                  onClick={handlePrevImage}
                  aria-label="Previous view"
                >
                  ‹
                </button>
              )}
              
              <div className="virtual-try-on-profile-container">
                <img
                  src={currentResultImage}
                  alt={`Virtual Try-On Result - View ${currentImageIndex + 1}`}
                  className="virtual-try-on-profile-image"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleImageClick(currentResultImage, tryOnResultImages, currentImageIndex)}
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              </div>
              
              {hasMultipleResults && (
                <button 
                  className="virtual-try-on-carousel-arrow virtual-try-on-carousel-next"
                  onClick={handleNextImage}
                  aria-label="Next view"
                >
                  ›
                </button>
              )}
              
              {hasMultipleResults && (
                <div className="virtual-try-on-carousel-controls">
                  <button
                    className="virtual-try-on-autoplay-button"
                    onClick={toggleAutoPlay}
                    aria-label={isAutoPlaying ? "Pause slideshow" : "Play slideshow"}
                    title={isAutoPlaying ? "Pause slideshow" : "Play slideshow"}
                  >
                    {isAutoPlaying ? "⏸" : "▶"}
                  </button>
                  <div className="virtual-try-on-carousel-dots">
                    {tryOnResultImages.map((_, index) => (
                      <button
                        key={index}
                        className={`virtual-try-on-carousel-dot ${index === currentImageIndex ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsAutoPlaying(false) // Pause when user clicks a dot
                          setCurrentImageIndex(index)
                        }}
                        aria-label={`View ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : userData.photo ? (
            <div className="virtual-try-on-profile-container">
              <img
                src={userData.photo}
                alt="Profile"
                className="virtual-try-on-profile-image"
                style={{ cursor: 'pointer' }}
                onClick={() => handleImageClick(userData.photo!, [userData.photo!], 0)}
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
            </div>
          ) : (
            <div className="virtual-try-on-no-photo">
              <p>No profile photo available</p>
            </div>
          )}
        </div>

        {/* Product Images Section */}
        <div className="virtual-try-on-products-section">
          <h3 className="virtual-try-on-section-title">
            Product Images ({images.length})
          </h3>
          {images.length > 0 ? (
            <>
              <p style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
                Make sure to only include one image per product category (e.g. shoes, tops, bottoms, etc.). The image should be of the entire product and should not include any other objects or people.
              </p>
              <div className="virtual-try-on-products-grid">
                {images.map((src, index) => (
                  <div key={index} className="virtual-try-on-product-item">
                    <div className="virtual-try-on-product-image-wrapper">
                      <img
                        src={src}
                        alt={`Product ${index + 1}`}
                        className="virtual-try-on-product-image"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleImageClick(src, images, index)}
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </div>
                    <button
                      className="virtual-try-on-remove-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveImage(index)
                      }}
                      onMouseDown={createStopPropagationHandler()}
                      aria-label="Remove product"
                      title="Remove this product"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="virtual-try-on-no-products">
              <p>No product images available</p>
              <p style={{ fontSize: "14px", marginTop: "8px" }}>
                All products have been removed. Close this panel to start over.
              </p>
            </div>
          )}
        </div>

        {/* Start Try-On Button */}
        {images.length > 0 && !isLoading && tryOnResultImages.length === 0 && onStartVirtualTryOn && (
          <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #e0e0e0" }}>
            <button
              className="virtual-try-on-start-button"
              onClick={(e) => {
                e.stopPropagation()
                onStartVirtualTryOn()
              }}
              onMouseDown={createStopPropagationHandler()}
            >
              Start Virtual Try-On
            </button>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && selectedImageGallery.length > 0 && (
        <div 
          className="virtual-try-on-image-modal-overlay"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="virtual-try-on-image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="virtual-try-on-image-modal-close"
              onClick={() => setSelectedImage(null)}
              aria-label="Close image"
            >
              ×
            </button>
            
            {selectedImageGallery.length > 1 && (
              <>
                <button
                  className="virtual-try-on-image-modal-arrow virtual-try-on-image-modal-prev"
                  onClick={handleModalPrev}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  className="virtual-try-on-image-modal-arrow virtual-try-on-image-modal-next"
                  onClick={handleModalNext}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}
            
            <div className="virtual-try-on-image-modal-image-wrapper">
              <img
                src={selectedImage}
                alt={`Image ${selectedImageIndex + 1} of ${selectedImageGallery.length}`}
                className="virtual-try-on-image-modal-image"
              />
            </div>
            
            {selectedImageGallery.length > 1 && (
              <div className="virtual-try-on-image-modal-dots">
                {selectedImageGallery.map((_, idx) => (
                  <button
                    key={idx}
                    className={`virtual-try-on-image-modal-dot ${idx === selectedImageIndex ? 'active' : ''}`}
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

export default VirtualTryOnPanel
