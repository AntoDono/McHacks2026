import { useState } from "react"
import { FaCamera } from "react-icons/fa"
import { saveUserData } from "~utils/storage"
import { validateForm } from "~utils/fileValidation"
import { useFileUpload } from "~hooks/useFileUpload"
import { preventDefaultAndStop } from "~utils/events"
import type { UserData } from "~types/user"

import "../styles/setup.css"

interface SetupProps {
  onSetupComplete: () => void
  onClose?: () => void
}

const Setup = ({ onSetupComplete, onClose }: SetupProps) => {
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
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileInputChange,
    openFileDialog
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

  const handleCloseClick = (e: React.MouseEvent) => {
    preventDefaultAndStop(e)
    onClose?.()
  }

  return (
    <div className="setup-container">
      {onClose && (
        <button className="setup-close" onClick={handleCloseClick}>
          ×
        </button>
      )}
      <h1 className="setup-title">Setup</h1>
      <p className="setup-subtitle">Upload your photo and enter your information</p>

      <form onSubmit={handleSubmit} className="setup-form">
        {/* Photo Upload Section */}
        <div className="setup-section">
          <h2 className="section-title">Upload your photo</h2>
          <div
            className={`dropzone ${isDragging ? "dropzone-active" : ""} ${
              photo ? "dropzone-has-image" : ""
            } ${isProcessing ? "dropzone-processing" : ""}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            {isProcessing ? (
              <div className="dropzone-content">
                <div className="dropzone-spinner"></div>
                <p className="dropzone-text">Processing image...</p>
              </div>
            ) : photo ? (
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
            ) : (
              <div className="dropzone-content">
                <div className="dropzone-icon-wrapper">
                  <FaCamera className="dropzone-icon" />
                </div>
                <p className="dropzone-text">Click to upload</p>
                <p className="dropzone-subtext">PNG, JPG up to 10MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: "none" }}
          />
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
    </div>
  )
}

export default Setup
