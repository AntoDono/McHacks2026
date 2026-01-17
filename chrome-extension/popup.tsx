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
        padding: 24,
        minWidth: 350,
        backgroundColor: "white"
      }}>
      <h2 style={{ color: "#000", marginTop: 0 }}>
        Welcome back, {userData.fname}! 👋
      </h2>
      {userData.photo && (
        <img
          src={userData.photo}
          alt="Profile"
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid var(--primary)",
            marginBottom: 16
          }}
        />
      )}
      <div style={{ color: "#333", marginBottom: 20 }}>
        <p>
          <strong>Email:</strong> {userData.email}
        </p>
        <p>
          <strong>Name:</strong> {userData.fname} {userData.lname}
        </p>
      </div>
      <button
        onClick={handleReset}
        style={{
          padding: "10px 20px",
          backgroundColor: "#f5f5f5",
          color: "#666",
          border: "1px solid #ddd",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
          width: "100%",
          transition: "all 0.2s ease"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = "#eee"
          e.currentTarget.style.borderColor = "#ccc"
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "#f5f5f5"
          e.currentTarget.style.borderColor = "#ddd"
        }}>
        Reset Data
      </button>
    </div>
  )
}

export default IndexPopup
