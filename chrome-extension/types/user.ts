/**
 * User Data Schema
 * Stored in Chrome local storage
 */
export interface SelectedImage {
  image: string // Base64 encoded image
  sku?: string
  url?: string
  title?: string
  price?: string
  [key: string]: any // Allow other metadata
}

export interface UserData {
  fname: string
  lname: string
  email: string
  photo: string // Base64 encoded image
  isSetup: boolean
  selectedImages?: SelectedImage[]
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
