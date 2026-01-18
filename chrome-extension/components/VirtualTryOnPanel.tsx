import { useState, useEffect } from "react"
import type { UserData } from "~types/user"
import { preventDefaultAndStop, createStopPropagationHandler } from "~utils/events"

import "../styles/virtual-try-on-panel.css"

interface VirtualTryOnPanelProps {
  userData: UserData
  productImages: string[]
  onClose: () => void
  onImagesChange?: (images: string[]) => void
}

const VirtualTryOnPanel = ({ userData, productImages, onClose, onImagesChange }: VirtualTryOnPanelProps) => {
  const [images, setImages] = useState<string[]>(productImages)

  useEffect(() => {
    setImages(productImages)
  }, [productImages])

  const handleRemoveImage = (indexToRemove: number) => {
    const newImages = images.filter((_, index) => index !== indexToRemove)
    setImages(newImages)
    onImagesChange?.(newImages)
  }

  const handleCloseClick = (e: React.MouseEvent) => {
    preventDefaultAndStop(e)
    onClose()
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
          <h3 className="virtual-try-on-section-title">Your Photo</h3>
          {userData.photo ? (
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
