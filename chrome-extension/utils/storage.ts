import { DEFAULT_USER_DATA, STORAGE_KEYS, type UserData } from "~types/user"

/**
 * Save user data to Chrome local storage
 */
export const saveUserData = async (userData: UserData): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.USER_DATA]: userData }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving user data:", chrome.runtime.lastError)
        reject(chrome.runtime.lastError)
      } else {
        console.log("User data saved successfully:", userData)
        resolve()
      }
    })
  })
}

/**
 * Get user data from Chrome local storage
 * Returns default data if not found
 */
export const getUserData = async (): Promise<UserData> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEYS.USER_DATA], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error retrieving user data:", chrome.runtime.lastError)
        reject(chrome.runtime.lastError)
      } else {
        const userData = result[STORAGE_KEYS.USER_DATA] as UserData | undefined
        resolve(userData || DEFAULT_USER_DATA)
      }
    })
  })
}

/**
 * Update specific fields in user data
 */
export const updateUserData = async (
  updates: Partial<UserData>
): Promise<void> => {
  const currentData = await getUserData()
  const updatedData = { ...currentData, ...updates }
  return saveUserData(updatedData)
}

/**
 * Clear user data (reset to defaults)
 */
export const clearUserData = async (): Promise<void> => {
  return saveUserData(DEFAULT_USER_DATA)
}

/**
 * Check if user has completed setup
 */
export const isUserSetup = async (): Promise<boolean> => {
  const userData = await getUserData()
  return userData.isSetup
}
