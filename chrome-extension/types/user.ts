/**
 * User Data Schema
 * Stored in Chrome local storage
 */
export interface UserData {
  fname: string
  lname: string
  email: string
  photo: string // Base64 encoded image
  isSetup: boolean
}

/**
 * Default user data state
 */
export const DEFAULT_USER_DATA: UserData = {
  fname: "",
  lname: "",
  email: "",
  photo: "",
  isSetup: false
}

/**
 * Storage keys for Chrome storage
 */
export const STORAGE_KEYS = {
  USER_DATA: "userData"
} as const
