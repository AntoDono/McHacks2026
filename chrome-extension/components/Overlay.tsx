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
}

const Overlay = ({
  showOverlay,
  selectedImages,
  userData,
  onClose,
  onSetupComplete,
  onStartVirtualTryOn
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
              onClick={createPreventClickHandler(() => {
                console.log("Start Virtual Try-On clicked!")
                onStartVirtualTryOn()
              })}
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
