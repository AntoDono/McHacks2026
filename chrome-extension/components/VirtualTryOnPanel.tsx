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
  onImagesChange?: (images: string[]) => void
}

const VirtualTryOnPanel = ({ userData, productImages, tryOnResultImages = [], isLoading, onClose, onImagesChange }: VirtualTryOnPanelProps) => {
  const [images, setImages] = useState<string[]>(productImages)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    setImages(productImages)
  }, [productImages])

  // Reset to first image when new results come in
  useEffect(() => {
    setCurrentImageIndex(0)
  }, [tryOnResultImages])

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
    setCurrentImageIndex((prev) => 
      prev === 0 ? tryOnResultImages.length - 1 : prev - 1
    )
  }

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImageIndex((prev) => 
      prev === tryOnResultImages.length - 1 ? 0 : prev + 1
    )
  }

  const hasMultipleResults = tryOnResultImages.length > 1
  const currentResultImage = tryOnResultImages[currentImageIndex]

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
                <div className="virtual-try-on-carousel-dots">
                  {tryOnResultImages.map((_, index) => (
                    <button
                      key={index}
                      className={`virtual-try-on-carousel-dot ${index === currentImageIndex ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImageIndex(index)
                      }}
                      aria-label={`View ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : userData.photo ? (
            <div className="virtual-try-on-profile-container">
              <img
                src={userData.photo}
                alt="Profile"
                className="virtual-try-on-profile-image"
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
                Click × to remove products you don't want to try on
              </p>
              <div className="virtual-try-on-products-grid">
                {images.map((src, index) => (
                  <div key={index} className="virtual-try-on-product-item">
                    <div className="virtual-try-on-product-image-wrapper">
                      <img
                        src={src}
                        alt={`Product ${index + 1}`}
                        className="virtual-try-on-product-image"
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
      </div>
    </div>
  )
}

export default VirtualTryOnPanel
