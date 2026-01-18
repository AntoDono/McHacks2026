/**
 * Persistent Gallery Panel Component
 * Displays saved gallery images in a side panel that stays open on the page
 */

import { useEffect, useState } from 'react'
import { getStoredGalleryImages, GALLERY_IMAGES_KEY } from '~utils/storage'
import { createStopPropagationHandler } from '~utils/events'

import '../styles/gallery-panel.css'
import '../styles/content.css'

interface GalleryPanelProps {
  isOpen: boolean
  onClose: () => void
}

const GalleryPanel = ({ isOpen, onClose }: GalleryPanelProps) => {
  const [galleryImages, setGalleryImages] = useState<string[]>([])

  useEffect(() => {
    loadGalleryImages()

    // Listen for storage changes
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[GALLERY_IMAGES_KEY]) {
        loadGalleryImages()
      }
    }

    // Listen for messages from content script
    const handleMessage = (
      message: { type: string; images?: string[] },
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      if (message.type === 'GALLERY_IMAGES_UPDATED' && message.images) {
        setGalleryImages(message.images)
        sendResponse({ success: true })
      }
      return true
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    chrome.runtime.onMessage.addListener(handleMessage)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  const loadGalleryImages = async () => {
    try {
      const images = await getStoredGalleryImages()
      setGalleryImages(images)
    } catch (error) {
      console.error('Error loading gallery images:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="gallery-panel"
      onClick={createStopPropagationHandler()}
      onMouseDown={createStopPropagationHandler()}
    >
        <div className="gallery-panel-header">
          <h3>Product Gallery</h3>
          <button className="gallery-panel-close" onClick={onClose}>
            ×
          </button>
        </div>

        {galleryImages.length > 0 ? (
          <div className="gallery-panel-content">
            <p className="gallery-panel-count">{galleryImages.length} images</p>
            <div className="gallery-panel-grid">
              {galleryImages.map((src, index) => (
                <img
                  key={index}
                  src={src}
                  alt={`Product image ${index + 1}`}
                  className="gallery-panel-image"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="gallery-panel-empty">
            <p>No images saved yet.</p>
            <p className="gallery-panel-hint">
              Click "Try this on" on product images to save them here.
            </p>
          </div>
        )}
    </div>
  )
}

export default GalleryPanel
