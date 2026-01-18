import { useState } from "react"
import { saveUserData } from "~utils/storage"
import { validateForm } from "~utils/fileValidation"
import { useFileUpload } from "~hooks/useFileUpload"
import { preventDefaultAndStop, createStopPropagationHandler } from "~utils/events"
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

  const handleSubmit = async (e: React.FormEvent) => {
    preventDefaultAndStop(e)

    const validationError = validateForm(fname, lname, email, photo)
    if (validationError) {
      setError(validationError)
      return
    }

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
      <h1 className="setup-title">Welcome!</h1>
      <p className="setup-subtitle">Let's get you set up</p>

      <form onSubmit={handleSubmit} className="setup-form">
        {/* Photo Upload Section */}
        <div className="setup-section">
          <h2 className="section-title">Upload a picture of yourself!</h2>
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
                <div className="dropzone-icon">⏳</div>
                <p className="dropzone-text">Processing image...</p>
              </div>
            ) : photo ? (
              <img
                src={photo}
                alt="Your photo"
                className="preview-image"
                onClick={createStopPropagationHandler()}
                onContextMenu={(e) => e.preventDefault()}
              />
            ) : (
              <div className="dropzone-content">
                <div className="dropzone-icon">📸</div>
                <p className="dropzone-text">
                  Drag & drop your photo here
                  <br />
                  or click to browse
                </p>
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

        <button type="submit" className="setup-button">
          Complete Setup
        </button>
      </form>
    </div>
  )
}

export default Setup
