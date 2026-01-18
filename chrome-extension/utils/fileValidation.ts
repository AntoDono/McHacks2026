/**
 * File validation utilities
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Validates a file for upload
 * @param file - The file to validate
 * @returns Error message if invalid, null if valid
 */
export const validateFile = (file: File): string | null => {
  if (!file.type.startsWith("image/")) {
    return "Please upload an image file"
  }

  if (file.size > MAX_FILE_SIZE) {
    return "Image must be smaller than 5MB"
  }

  return null
}

/**
 * Validates form data
 * @param fname - First name
 * @param lname - Last name
 * @param email - Email address
 * @param photo - Photo (base64 string)
 * @returns Error message if invalid, null if valid
 */
export const validateForm = (
  fname: string,
  lname: string,
  email: string,
  photo: string
): string | null => {
  if (!fname.trim() || !lname.trim() || !email.trim() || !photo) {
    return "Please complete all fields and upload a photo"
  }

  if (!email.includes("@")) {
    return "Please enter a valid email"
  }

  return null
}
