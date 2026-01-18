import { useState, useRef, type DragEvent } from "react"
import { saveUserData } from "~utils/storage"
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
  const [photo, setPhoto] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Backend API URL - update this to match your Flask server
  const API_URL = process.env.PLASMO_PUBLIC_API_URL || "http://localhost:8080"

  // Convert image file to base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(file)
    })
  }

  // Process image through backend API
  const processImageWithBackend = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("image", file)

    const response = await fetch(`${API_URL}/process-image`, {
      method: "POST",
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to process image")
    }

    const data = await response.json()
    return data.image // Returns base64 image
  }

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB")
      return
    }

    setIsProcessing(true)
    setError("")

    try {
      // Process image through backend
      const processedImage = await processImageWithBackend(file)
      setPhoto(processedImage)
      console.log("Image processed successfully")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to process image"
      setError(errorMessage)
      console.log("Error processing image:", err)
      
      // Fallback: use original image if backend fails
      try {
        const base64 = await convertToBase64(file)
        setPhoto(base64)
      } catch (fallbackErr) {
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Drag and drop handlers
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // File input change handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    if (!fname.trim() || !lname.trim() || !email.trim() || !photo) {
      setError("Please complete all fields and upload a photo")
      return
    }

    // Basic email validation
    if (!email.includes("@")) {
      setError("Please enter a valid email")
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
    e.preventDefault()
    e.stopPropagation()
    if (onClose) {
      onClose()
    }
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
            onClick={() => !isProcessing && !photo && fileInputRef.current?.click()}>
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
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.preventDefault()}
                style={{ pointerEvents: "none" }}
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
