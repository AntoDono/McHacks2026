import { useEffect, useState } from "react"
import Setup from "~components/Setup"
import { getUserData, clearUserData } from "~utils/storage"
import type { UserData } from "~types/user"

import "./styles/globals.css"
import "./styles/popup.css"

function IndexPopup() {
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<UserData | null>(null)

  // Check if user is setup on load
  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const data = await getUserData()
      setUserData(data)
    } catch (error) {
      console.error("Error loading user data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupComplete = () => {
    // Reload user data after setup
    loadUserData()
  }

  const handleReset = async () => {
    if (
      confirm(
        "Are you sure you want to reset your data? This will clear all your information and require setup again."
      )
    ) {
      try {
        await clearUserData()
        console.log("User data cleared")
        // Reload to show setup screen
        loadUserData()
      } catch (error) {
        console.error("Error clearing user data:", error)
        alert("Failed to reset data. Please try again.")
      }
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="popup-loading">
        <p>Loading...</p>
      </div>
    )
  }

  // Show setup if user hasn't completed it
  if (!userData?.isSetup) {
    return <Setup onSetupComplete={handleSetupComplete} />
  }

  // Main app view (after setup is complete)
  return (
    <div className="popup-container">
      <h2 className="popup-welcome-header">
        Welcome back! 👋
      </h2>
      
      {/* Main content with photo on left, info on right */}
      <div className="popup-main-card">
        {/* Left: Profile Photo */}
        {userData.photo && (
          <div className="popup-photo-container">
            <img
              src={userData.photo}
              alt="Profile"
              className="popup-profile-photo"
            />
          </div>
        )}
        
        {/* Right: User Info */}
        <div className="popup-user-info">
          <h3 className="popup-user-name">
            {userData.fname} {userData.lname}
          </h3>
          <div className="popup-user-details">
            <div className="popup-detail-row">
              <span className="popup-detail-label">Email:</span>
              <span className="popup-detail-value">{userData.email}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleReset}
        className="popup-reset-button">
        Reset Data
      </button>
    </div>
  )
}

export default IndexPopup
