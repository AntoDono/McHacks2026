import type { UserData } from "~types/user"

import "../styles/virtual-try-on-panel.css"

interface VirtualTryOnPanelProps {
  userData: UserData
  productImages: string[]
  onClose: () => void
}

const VirtualTryOnPanel = ({ userData, productImages, onClose }: VirtualTryOnPanelProps) => {
  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClose()
  }

  return (
    <div
      className="virtual-try-on-panel"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
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
              Product Images ({productImages.length})
            </h3>
            {productImages.length > 0 ? (
              <div className="virtual-try-on-products-grid">
                {productImages.map((src, index) => (
                  <div key={index} className="virtual-try-on-product-item">
                    <img
                      src={src}
                      alt={`Product ${index + 1}`}
                      className="virtual-try-on-product-image"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="virtual-try-on-no-products">
                <p>No product images available</p>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}

export default VirtualTryOnPanel
