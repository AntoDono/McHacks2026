import { useEffect, useState } from "react"
import Setup from "~components/Setup"
import { getUserData, clearUserData } from "~utils/storage"
import type { UserData } from "~types/user"

import "./styles/globals.css"

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
      <div style={{ padding: 24, textAlign: "center" }}>
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
    <div
      style={{
        padding: 20,
        width: 380,
        backgroundColor: "#f8f9fa"
      }}>
      <h2 style={{ color: "#1a1a1a", marginTop: 0, marginBottom: 16, fontSize: "22px", fontWeight: "600" }}>
        Welcome back! 👋
      </h2>
      
      {/* Main content with photo on left, info on right */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 20,
          backgroundColor: "white",
          padding: 16,
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)"
        }}>
        {/* Left: Profile Photo */}
        {userData.photo && (
          <div style={{ flexShrink: 0 }}>
            <img
              src={userData.photo}
              alt="Profile"
              style={{
                width: 90,
                height: 90,
                borderRadius: "10px",
                objectFit: "contain",
                border: "2px solid var(--primary)",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                display: "block",
                backgroundColor: "#f5f5f5"
              }}
            />
          </div>
        )}
        
        {/* Right: User Info */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h3 style={{ 
            color: "#1a1a1a", 
            margin: "0 0 12px 0", 
            fontSize: "20px",
            fontWeight: "600"
          }}>
            {userData.fname} {userData.lname}
          </h3>
          <div style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              marginBottom: 6,
              gap: 8
            }}>
              <span style={{ fontWeight: "500", color: "#888", minWidth: 50 }}>Email:</span>
              <span style={{ color: "#333" }}>{userData.email}</span>
            </div>
          </div>
        </div>
      </div>
      
      <button
        onClick={handleReset}
        style={{
          padding: "12px 20px",
          backgroundColor: "white",
          color: "#666",
          border: "2px solid #e0e0e0",
          borderRadius: "10px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "500",
          width: "100%",
          transition: "all 0.2s ease"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = "#fff5f5"
          e.currentTarget.style.borderColor = "#ffb3b3"
          e.currentTarget.style.color = "#d32f2f"
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "white"
          e.currentTarget.style.borderColor = "#e0e0e0"
          e.currentTarget.style.color = "#666"
        }}>
        Reset Data
      </button>
    </div>
  )
}

export default IndexPopup
