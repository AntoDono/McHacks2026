import { useState } from "react"
import { FaCamera, FaUpload, FaTimes } from "react-icons/fa"
import { saveUserData } from "~utils/storage"
import { validateForm } from "~utils/fileValidation"
import { useFileUpload } from "~hooks/useFileUpload"
import { preventDefaultAndStop } from "~utils/events"
import type { UserData } from "~types/user"

import "../styles/setup.css"

interface SetupProps {
  onSetupComplete: () => void
  onClose?: () => void
  enableCamera?: boolean // Camera doesn't work in popup due to Chrome focus behavior
}

const Setup = ({ onSetupComplete, onClose, enableCamera = true }: SetupProps) => {
  const [fname, setFname] = useState("")
  const [lname, setLname] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    photo,
    isDragging,
    isProcessing,
    error,
    setError,
    fileInputRef,
    videoRef,
    canvasRef,
    showCamera,
    isCameraReady,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileInputChange,
    openFileDialog,
    startCamera,
    capturePhoto,
    stopCamera
  } = useFileUpload()

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    preventDefaultAndStop(e)

    // Prevent double submission
    if (isSubmitting) {
      return
    }

    const validationError = validateForm(fname, lname, email, photo)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const userData: UserData = {
        fname: fname.trim(),
        lname: lname.trim(),
        email: email.trim(),
        photo,
        isSetup: true
      }

      await saveUserData(userData)
      console.log("Setup complete! User data saved.")
      onSetupComplete()
    } catch (err) {
      setError("Failed to save user data" + err)
      console.log("Error saving user data: " + err)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="setup-container">
      <h1 className="setup-title">Setup</h1>
      <p className="setup-subtitle">Upload your photo and enter your information</p>

      <form onSubmit={handleSubmit} className="setup-form">
        {/* Photo Upload Section */}
        <div className="setup-section">
          <h2 className="section-title">Upload your photo</h2>
          
          {/* Show photo preview if photo exists */}
          {photo ? (
            <div
              className="dropzone dropzone-has-image"
              onClick={openFileDialog}
            >
              <div className="preview-container">
                <img
                  src={photo}
                  alt="Your photo"
                  className="preview-image"
                  onContextMenu={(e) => e.preventDefault()}
                />
                <div className="preview-overlay">
                  <p className="preview-change-text">Click to change photo</p>
                </div>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="dropzone dropzone-processing">
              <div className="dropzone-content">
                <div className="dropzone-spinner"></div>
                <p className="dropzone-text">Processing image...</p>
              </div>
            </div>
          ) : (
            /* Show photo options when no photo */
            <div className={`photo-options ${!enableCamera ? 'photo-options-single' : ''}`}>
              <button
                type="button"
                className={`photo-option-button ${!enableCamera ? 'photo-option-button-full' : ''}`}
                onClick={openFileDialog}
              >
                <div className="photo-option-icon">
                  <FaUpload />
                </div>
                <span className="photo-option-text">Select a photo</span>
              </button>
              
              {enableCamera && (
                <button
                  type="button"
                  className="photo-option-button"
                  onClick={startCamera}
                >
                  <div className="photo-option-icon">
                    <FaCamera />
                  </div>
                  <span className="photo-option-text">Take a photo</span>
                </button>
              )}
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: "none" }}
          />
          
          {/* Drag and drop zone (hidden but still functional) */}
          {!photo && !isProcessing && (
            <div
              className={`dropzone-dragarea ${isDragging ? "dropzone-active" : ""}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <p className="dropzone-subtext">Or drag and drop a photo here</p>
            </div>
          )}
        </div>

        {/* User Info Section */}
        <div className="setup-section">
          <input
            type="text"
            placeholder="First Name"
            value={fname}
            onChange={(e) => setFname(e.target.value)}
            className="setup-input"
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lname}
            onChange={(e) => setLname(e.target.value)}
            className="setup-input"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="setup-input"
            required
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button 
          type="submit" 
          className="setup-button"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Complete Setup"}
        </button>
      </form>

      {/* Camera Modal */}
      {showCamera && (
        <div className="camera-modal" onClick={(e) => {
          // Close if clicking on backdrop
          if (e.target === e.currentTarget) {
            stopCamera()
          }
        }}>
          <div className="camera-container">
            <button className="camera-close" onClick={stopCamera} type="button">
              <FaTimes />
            </button>
            {!isCameraReady && (
              <div className="camera-loading">
                <div className="dropzone-spinner"></div>
                <p className="camera-loading-text">Initializing camera...</p>
              </div>
            )}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              muted
              className={`camera-video ${!isCameraReady ? 'camera-video-hidden' : ''}`}
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {isCameraReady && (
              <button 
                className="camera-capture-button" 
                onClick={capturePhoto}
                type="button"
              >
                <FaCamera /> Capture Photo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Setup
