import type { UserData } from "~types/user"

import "../styles/content.css"

interface UserInfoProps {
  userData: UserData
  onClose: () => void
}

const UserInfo = ({ userData, onClose }: UserInfoProps) => {
  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClose()
  }

  return (
    <div className="user-info-container">
      <button className="user-info-close" onClick={handleCloseClick}>
        ×
      </button>
      {userData.photo && (
        <img src={userData.photo} alt="Profile" className="user-info-image" />
      )}
      <div className="user-info-info">
        <h3 className="user-info-name">
          {userData.fname} {userData.lname}
        </h3>
        <p className="user-info-email">{userData.email}</p>
      </div>
    </div>
  )
}

export default UserInfo
