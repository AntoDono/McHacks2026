import type { PlasmoCSConfig, PlasmoGetRootContainer } from "plasmo"
import { useEffect, useState } from "react"
import { getUserData } from "~utils/storage"
import type { UserData } from "~types/user"
import UserInfo from "~components/UserInfo"
import Setup from "~components/Setup"

import "./styles/content.css"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

export const getRootContainer: PlasmoGetRootContainer = () => {
  // Create a dedicated container for our overlay
  const container = document.createElement("div")
  container.id = "plasmo-image-preview-root"
  container.style.cssText = "all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 999998; pointer-events: none;"
  document.body.appendChild(container)
  return container
}

const ImageClickOverlay = () => {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showUserInfo, setShowUserInfo] = useState(true)
  const [showSetup, setShowSetup] = useState(true)

  // Load user data on mount
  useEffect(() => {
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
    loadUserData()
  }, [])


  const handleSetupComplete = async () => {
    // Reload user data after setup
    try {
      const data = await getUserData()
      setUserData(data)
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  const handleCloseUserInfo = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setShowUserInfo(false)
  }

  const handleCloseSetup = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setShowSetup(false)
  }

  if (isLoading) {
    return null
  }

  return (
    <>
      {/* Right side: UserInfo if setup, Setup if not */}
      {userData?.isSetup && showUserInfo ? (
        <UserInfo userData={userData} onClose={handleCloseUserInfo} />
      ) : !userData?.isSetup && showSetup ? (
        <Setup onSetupComplete={handleSetupComplete} onClose={handleCloseSetup} />
      ) : null}
    </>
  )
}

export default ImageClickOverlay
