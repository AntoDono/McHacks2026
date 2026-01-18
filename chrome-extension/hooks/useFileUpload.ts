import { useState, useRef, type DragEvent } from "react"
import { validateFile } from "~utils/fileValidation"

const API_URL = process.env.PLASMO_PUBLIC_API_URL || `http://localhost:${process.env.PLASMO_PUBLIC_PORT || 8080}`

/**
 * Converts image file to base64
 */
const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

/**
 * Processes image through backend API
 */
const processImageWithBackend = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append("image", file)

  const response = await fetch(`${API_URL}/process-image`, {
    method: "POST",
    body: formData
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to process image")
  }

  const data = await response.json()
  return data.image // Returns base64 image
}

/**
 * Hook for handling file upload with drag and drop
 */
export const useFileUpload = () => {
  const [photo, setPhoto] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsProcessing(true)
    setError("")

    try {
      // Process image through backend
      const processedImage = await processImageWithBackend(file)
      setPhoto(processedImage)
      console.log("Image processed successfully")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to process image"
      setError(errorMessage)
      console.log("Error processing image:", err)

      // Fallback: use original image if backend fails
      try {
        const base64 = await convertToBase64(file)
        setPhoto(base64)
      } catch (fallbackErr) {
        // Silent fail on fallback
      }
    } finally {
      setIsProcessing(false)
    }
  }

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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const openFileDialog = () => {
    if (!isProcessing && !photo) {
      fileInputRef.current?.click()
    }
  }

  return {
    photo,
    setPhoto,
    isDragging,
    isProcessing,
    error,
    setError,
    fileInputRef,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileInputChange,
    openFileDialog
  }
}
