import { useState, useRef, useEffect, type DragEvent } from "react"
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
  const [showCamera, setShowCamera] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    if (!isProcessing) {
      fileInputRef.current?.click()
    }
  }

  const startCamera = async () => {
    setShowCamera(true) // Show modal first
    setIsCameraReady(false) // Reset camera ready state
    setError("")
    
    try {
      console.log("Requesting camera access...")
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false 
      })
      console.log("Camera access granted")
      setStream(mediaStream)
      
      // Wait for video element to be available and set the stream
      const checkVideoReady = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          // Listen for when video can play
          videoRef.current.onloadedmetadata = () => {
            console.log("Video stream ready")
            setIsCameraReady(true)
          }
        } else {
          // Retry if video element not available yet
          setTimeout(checkVideoReady, 50)
        }
      }
      checkVideoReady()
    } catch (err) {
      console.error("Camera error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to access camera. Please allow camera permissions."
      setError(errorMessage)
      setShowCamera(false) // Hide modal on error
    }
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Convert canvas to blob then to file
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError("Failed to capture photo")
        return
      }
      
      const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" })
      stopCamera()
      await handleFileSelect(file)
    }, "image/jpeg", 0.95)
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
    setIsCameraReady(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  return {
    photo,
    setPhoto,
    isDragging,
    isProcessing,
    error,
    setError,
    fileInputRef,
    videoRef,
    canvasRef,
    showCamera,
    isCameraReady,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileInputChange,
    openFileDialog,
    startCamera,
    capturePhoto,
    stopCamera
  }
}
