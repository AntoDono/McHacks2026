import { useState, useRef, type DragEvent } from "react"
import { saveUserData } from "~utils/storage"
import type { UserData } from "~types/user"

import "../styles/setup.css"

interface SetupProps {
  onSetupComplete: () => void
}

const Setup = ({ onSetupComplete }: SetupProps) => {
  const [fname, setFname] = useState("")
  const [lname, setLname] = useState("")
  const [email, setEmail] = useState("")
  const [photo, setPhoto] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Convert image file to base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(file)
    })
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

    try {
      const base64 = await convertToBase64(file)
      setPhoto(base64)
      setError("")
      console.log("Image converted to base64, size:", base64.length)
    } catch (err) {
      setError("Failed to process image")
      console.error("Error converting image:", err)
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

  return (
    <div className="setup-container">
      <h1 className="setup-title">Welcome!</h1>
      <p className="setup-subtitle">Let's get you set up</p>

      <form onSubmit={handleSubmit} className="setup-form">
        {/* Photo Upload Section */}
        <div className="setup-section">
          <h2 className="section-title">Upload a picture of yourself!</h2>
          <div
            className={`dropzone ${isDragging ? "dropzone-active" : ""} ${
              photo ? "dropzone-has-image" : ""
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}>
            {photo ? (
              <img src={photo} alt="Your photo" className="preview-image" />
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
