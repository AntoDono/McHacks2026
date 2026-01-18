import { createPreventClickHandler, createStopPropagationHandler } from "~utils/events"
import Setup from "~components/Setup"
import type { UserData } from "~types/user"

interface OverlayProps {
  showOverlay: boolean
  selectedImages: string[]
  userData: UserData | null
  onClose: () => void
  onSetupComplete: () => void
  onStartVirtualTryOn: () => void
  onImagesChange?: (images: string[]) => void
}

const Overlay = ({
  showOverlay,
  selectedImages,
  userData,
  onClose,
  onSetupComplete,
  onStartVirtualTryOn,
  onImagesChange
}: OverlayProps) => {
  if (!showOverlay) return null

  return (
    <div
      className="try-on-overlay"
      onClick={createPreventClickHandler(onClose)}
      onMouseDown={createStopPropagationHandler()}
    >
      <div
        className="try-on-overlay-content"
        onClick={createPreventClickHandler()}
        onMouseDown={createStopPropagationHandler()}
      >
        <button
          className="try-on-overlay-close"
          onClick={createPreventClickHandler(onClose)}
          onMouseDown={createStopPropagationHandler()}
        >
          ×
        </button>

        {!userData?.isSetup ? (
          <Setup onSetupComplete={onSetupComplete} />
        ) : (
          <div>
            <h2 className="try-on-overlay-title">Virtual Try-On</h2>
            <div className="try-on-overlay-section">
              <h3 className="try-on-overlay-section-title">
                Selected Images ({selectedImages.length})
              </h3>
              {selectedImages.length > 0 ? (
                <>
                  <p style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
                    Click to remove products you don't want to try on
                  </p>
                  <div className="try-on-overlay-images-grid">
                    {selectedImages.map((src, index) => (
                      <div key={index} className="try-on-overlay-image-item">
                        <div className="try-on-overlay-image-wrapper">
                          <img
                            src={src}
                            alt={`Product ${index + 1}`}
                            className="try-on-overlay-image"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                            }}
                          />
                        </div>
                        <button
                          className="try-on-overlay-remove-button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onImagesChange?.(selectedImages.filter((_, i) => i !== index))
                          }}
                          onMouseDown={createStopPropagationHandler()}
                          aria-label="Remove product"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="try-on-overlay-no-images">
                  <p>No images selected. Close this overlay to start over.</p>
                </div>
              )}
            </div>
            <button
              className="try-on-overlay-start-button"
              onClick={createPreventClickHandler(onStartVirtualTryOn)}
              onMouseDown={createStopPropagationHandler()}
            >
              Start Virtual Try-On
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Overlay
