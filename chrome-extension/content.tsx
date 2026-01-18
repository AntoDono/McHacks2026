import type { PlasmoCSConfig, PlasmoGetRootContainer } from "plasmo"
import { useEffect, useState } from "react"

import { getUserData, getCartItems, addToCart, removeFromCart, saveCartItems, type CartItem } from "~utils/storage"
import type { UserData } from "~types/user"
import VirtualTryOnPanel from "~components/VirtualTryOnPanel"
import TryOnButton from "~components/TryOnButton"
import Setup from "~components/Setup"
import Cart from "~components/Cart"
import { useImageHover } from "~hooks/useImageHover"
import { useButtonPosition } from "~hooks/useButtonPosition"
import { extractProductMetadata } from "~utils/product-detection/attributes"
import { resizeImage, blobToBase64 } from "~utils/imageResize"

import "./styles/content.css"
import "./styles/cart.css"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false,
  css: ["./styles/globals.css"]
}

export const getRootContainer: PlasmoGetRootContainer = () => {
  const container = document.createElement("div")
  container.id = "plasmo-image-overlay-root"
  container.style.cssText =
    "all: initial; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647 !important; pointer-events: none;"
  document.body.appendChild(container)
  return container
}

const BUTTON_LEAVE_DELAY = 150

const ContentScript = () => {
  const [isHoveringButton, setIsHoveringButton] = useState(false)
  const [showVirtualTryOnPanel, setShowVirtualTryOnPanel] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [tryOnResultImages, setTryOnResultImages] = useState<string[]>([])
  const [isLoadingTryOn, setIsLoadingTryOn] = useState(false)
  const [tryOnProgress, setTryOnProgress] = useState({ message: "", progress: 0 })
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const { hoveredImage, setHoveredImage, clearHideTimeout } = useImageHover(isHoveringButton)
  const buttonPosition = useButtonPosition(hoveredImage)

  // Load user data and cart on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [data, items] = await Promise.all([getUserData(), getCartItems()])
        setUserData(data)
        setCartItems(items)
        // Show cart if there are items
        if (items.length > 0) {
          setShowCart(true)
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsLoadingUser(false)
      }
    }
    loadData()
  }, [])

  const handleButtonMouseEnter = () => {
    setIsHoveringButton(true)
    clearHideTimeout()
  }

  const handleButtonMouseLeave = () => {
    setIsHoveringButton(false)
    setTimeout(() => {
      setHoveredImage(null)
    }, BUTTON_LEAVE_DELAY)
  }

  // Helper function to get the actual image URL from an image element
  // Prioritizes the actual src attribute that's currently being displayed
  const getImageUrl = (img: HTMLImageElement): string | null => {
    // First, check the current src attribute (what's actually displayed)
    // This handles cases where lazy-loading has already loaded the image
    if (img.src && img.src !== 'data:,' && !img.src.startsWith('data:,') && !img.src.startsWith('blob:')) {
      // If src is a full URL (not a placeholder), use it
      try {
        const url = new URL(img.src, window.location.href)
        // Only use if it's a valid HTTP/HTTPS URL
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          return img.src
        }
      } catch {
        // If URL parsing fails, continue to check other sources
      }
    }
    
    // Check for lazy-load attributes (for images not yet loaded)
    const lazySrc = img.getAttribute('data-src') || 
                    img.getAttribute('data-lazy-src') || 
                    img.getAttribute('data-original') ||
                    img.getAttribute('data-srcset')?.split(',')[0]?.trim().split(' ')[0]
    
    if (lazySrc && lazySrc !== 'data:,' && !lazySrc.startsWith('data:,') && !lazySrc.startsWith('blob:')) {
      // Resolve relative URLs to absolute
      try {
        return new URL(lazySrc, window.location.href).href
      } catch {
        return lazySrc
      }
    }
    
    // Check srcset for responsive images (get the largest/highest quality)
    if (img.srcset) {
      const srcsetEntries = img.srcset.split(',').map(s => s.trim())
      // Sort by descriptor (get largest width or highest quality)
      const sortedEntries = srcsetEntries
        .map(entry => {
          const parts = entry.split(/\s+/)
          const url = parts[0]
          const descriptor = parts[1] || ''
          return { url, descriptor, width: parseInt(descriptor) || 0 }
        })
        .filter(entry => entry.url && !entry.url.startsWith('data:,') && !entry.url.startsWith('blob:'))
        .sort((a, b) => b.width - a.width)
      
      if (sortedEntries.length > 0) {
        try {
          return new URL(sortedEntries[0].url, window.location.href).href
        } catch {
          return sortedEntries[0].url
        }
      }
    }
    
    // Fallback to src attribute (even if it's a placeholder, might be the best we have)
    if (img.src && !img.src.startsWith('blob:')) {
      try {
        return new URL(img.src, window.location.href).href
      } catch {
        return img.src
      }
    }
    
    return null
  }

  const handleButtonClick = async (e: React.MouseEvent) => {
    if (!hoveredImage) return

    try {
      // Get only the hovered image URL, not the entire gallery
      const imageUrl = getImageUrl(hoveredImage)
      
      if (!imageUrl) {
        console.warn("Could not extract image URL from hovered image")
        return
      }

      // Check if image is already in cart
      if (cartItems.some(item => item.imageUrl === imageUrl)) {
        console.log("Image already in cart")
        return
      }

      console.log("Adding single image to cart:", imageUrl)

      // Extract product metadata from the current page
      const baseMetadata = extractProductMetadata(imageUrl)
      
      // Fetch, resize, and convert to base64 immediately (while we have access)
      let base64Data: string | null = null
      try {
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        
        // Resize the image before converting to base64 (max 1500x1500)
        const resizedBlob = await resizeImage(blob, 500, 500, 0.9)
        
        // Convert resized blob to base64
        base64Data = await blobToBase64(resizedBlob)
        
        console.log(`✓ Resized and encoded image to base64 (${Math.round(base64Data.length / 1024)}KB)`)
      } catch (error) {
        console.error(`Failed to fetch/resize/encode image:`, error)
        // Continue without base64, URL will be fallback
      }
      
      const cartItem: CartItem = {
        imageUrl,
        base64: base64Data,
        url: baseMetadata.url,
        title: baseMetadata.title,
        price: baseMetadata.price,
        sku: baseMetadata.sku,
        brand: baseMetadata.brand
      }
      
      const updatedCart = [...cartItems, cartItem]
      await saveCartItems(updatedCart)
      setCartItems(updatedCart)
      setShowCart(true)
      console.log(`Added 1 item to cart with metadata and base64. Total: ${updatedCart.length}`)
      
      // Update badge
      try {
        chrome.runtime.sendMessage(
          {
            type: "CART_UPDATED",
            count: updatedCart.length
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log("Message failed (this is normal):", chrome.runtime.lastError.message)
            }
          }
        )
      } catch (err) {
        console.log("Could not send message (this is normal)")
      }
      
      setHoveredImage(null)
    } catch (error) {
      console.error("Error adding to cart:", error)
      alert("Failed to add item to cart. Please try again.")
    }
  }

  const handleSetupComplete = async () => {
    try {
      const data = await getUserData()
      setUserData(data)
      // Sidebar will automatically show the product images after setup
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  const handleTryItOn = async () => {
    // Check if user is set up
    if (!userData || !userData.isSetup) {
      // Show setup panel
      setShowVirtualTryOnPanel(true)
      return
    }

    // Check if we have required data
    if (!userData.photo) {
      alert("Please set up your profile photo first")
      return
    }

    if (!cartItems || cartItems.length === 0) {
      alert("Please add at least one product to your cart")
      return
    }

    setIsLoadingTryOn(true)
    setTryOnProgress({ message: "Starting...", progress: 0 })
    setPreviewImage(null) // Clear any previous preview

    try {
      // Get API URL from environment
      const API_URL = process.env.PLASMO_PUBLIC_API_URL || `http://localhost:${process.env.PLASMO_PUBLIC_PORT || 8080}`

      console.log("Starting virtual try-on with SSE...")
      console.log("User photo:", userData.photo.substring(0, 50) + "...")
      console.log(`Cart items: ${cartItems.length} item(s)`, cartItems)

      // Convert base64 photo to Blob
      const photoBase64 = userData.photo.replace(/^data:image\/[a-z]+;base64,/, "")
      const photoBlob = await fetch(`data:image/png;base64,${photoBase64}`).then(res => res.blob())
      const photoFile = new File([photoBlob], "person.png", { type: "image/png" })

      // Create FormData
      const formData = new FormData()
      formData.append("person", photoFile)
      
      // Prepare garment data (already has URL + base64 from cart)
      const garmentsData = []
      const garmentsMetadata = []
      
      // Collect all garment data from cart
      for (let i = 0; i < cartItems.length; i++) {
        const cartItem = cartItems[i]
        console.log(`Sending cart item ${i + 1}/${cartItems.length}:`, {
          url: cartItem.imageUrl,
          hasBase64: !!cartItem.base64,
          base64Size: cartItem.base64 ? `${Math.round(cartItem.base64.length / 1024)}KB` : 'N/A'
        })
        
        // Use stored base64 and URL
        garmentsData.push({
          url: cartItem.imageUrl,
          base64: cartItem.base64 || null
        })
        
        // Add metadata for this garment
        garmentsMetadata.push({
          sku: cartItem.sku,
          url: cartItem.url,
          title: cartItem.title,
          price: cartItem.price,
          brand: cartItem.brand
        })
      }
      
      // Send garment data (URL + base64) as JSON
      formData.append("garments_data", JSON.stringify(garmentsData))
      
      // Add metadata as JSON string
      formData.append("garments_metadata", JSON.stringify(garmentsMetadata))

      // Upload data first, then use SSE for streaming updates
      console.log("Uploading data to SSE endpoint:", `${API_URL}/try-on-stream`)
      const response = await fetch(`${API_URL}/try-on-stream`, {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        throw new Error("Failed to start try-on stream")
      }

      // Read SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        // SSE messages are separated by double newlines
        const messages = buffer.split('\n\n')
        // Keep the last incomplete message in the buffer
        buffer = messages.pop() || ''

        for (const message of messages) {
          const lines = message.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'status') {
                  setTryOnProgress({ message: data.message, progress: data.progress })
                  console.log(`Progress: ${data.progress}% - ${data.message}`)
                } else if (data.type === 'intermediate_result') {
                  // Show progressive preview as each garment is applied
                  console.log(`✓ Garment ${data.garment}/${data.total} applied`)
                  // Fetch the intermediate image
                  const imageUrl = `${API_URL}/processed/${data.filename}`
                  setPreviewImage(imageUrl)
                } else if (data.type === 'complete') {
                  setTryOnProgress({ message: data.message, progress: 100 })
                  console.log("✓ Try-on completed:", data.filename)
                  
                  // Fetch the images from the result endpoint (too large for SSE)
                  try {
                    const resultResponse = await fetch(`${API_URL}/try-on-result/${data.timestamp}`)
                    if (!resultResponse.ok) {
                      throw new Error("Failed to fetch try-on results")
                    }
                    const resultData = await resultResponse.json()
                    
                    // Use images array if available
                    const images = resultData.images || [resultData.image]
                    console.log(`Generated ${images.length} view(s)`)
                    setTryOnResultImages(images)
                    setPreviewImage(null) // Clear preview since we're opening full panel
                    // Open full panel when complete
                    setShowVirtualTryOnPanel(true)
                  } catch (fetchError) {
                    console.error("Error fetching result images:", fetchError)
                    throw new Error("Failed to load result images")
                  }
                } else if (data.type === 'error') {
                  throw new Error(data.message)
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e)
              }
            }
          }
        }
      }

    } catch (error) {
      console.error("Error in virtual try-on:", error)
      alert(`Failed to generate try-on image: ${error instanceof Error ? error.message : "Unknown error"}`)
      setTryOnProgress({ message: "", progress: 0 })
    } finally {
      setIsLoadingTryOn(false)
    }
  }

  const handleRemoveFromCart = async (index: number) => {
    try {
      const updatedCart = await removeFromCart(index)
      setCartItems(updatedCart)
      console.log(`Removed item ${index}. Cart now has ${updatedCart.length} items`)
    } catch (error) {
      console.error("Error removing from cart:", error)
    }
  }

  const handleCloseCart = () => {
    setShowCart(false)
  }

  if (isLoadingUser) {
    return null
  }

  return (
    <>
      {hoveredImage && buttonPosition && (
        <TryOnButton
          position={buttonPosition}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
          onClick={handleButtonClick}
        />
      )}

      {showCart && (
        <>
          {previewImage && isLoadingTryOn && (
            <div className="cart-preview-panel">
              <div className="cart-preview-header">Preview</div>
              <img 
                src={previewImage} 
                alt="Try-on preview" 
                className="cart-preview-panel-image"
              />
            </div>
          )}
          <Cart
            items={cartItems}
            onRemoveItem={handleRemoveFromCart}
            onTryItOn={handleTryItOn}
            onClose={handleCloseCart}
            isLoading={isLoadingTryOn}
            progress={tryOnProgress}
          />
        </>
      )}

      {showVirtualTryOnPanel && (
        <>
          {(!userData || !userData.isSetup) ? (
            <div className="virtual-try-on-panel">
              <div className="virtual-try-on-panel-header">
                <h2 className="virtual-try-on-panel-title">Setup Required</h2>
                <button
                  className="virtual-try-on-panel-close"
                  onClick={() => setShowVirtualTryOnPanel(false)}
                >
                  ×
                </button>
              </div>
              <div className="virtual-try-on-panel-content">
                <Setup
                  onSetupComplete={handleSetupComplete}
                  onClose={() => setShowVirtualTryOnPanel(false)}
                />
              </div>
            </div>
          ) : (
            <VirtualTryOnPanel
              userData={userData}
              productImages={cartItems.map(item => item.imageUrl)}
              tryOnResultImages={tryOnResultImages}
              isLoading={isLoadingTryOn}
              onStartVirtualTryOn={handleTryItOn}
              onClose={() => {
                setShowVirtualTryOnPanel(false)
                setTryOnResultImages([])
                setIsLoadingTryOn(false)
              }}
              onImagesChange={(images) => {
                // Update cart items, preserving metadata and base64 for images that remain
                const updatedCart = images.map(imageUrl => {
                  const existingItem = cartItems.find(item => item.imageUrl === imageUrl)
                  return existingItem || { imageUrl, base64: null }
                })
                setCartItems(updatedCart)
                saveCartItems(updatedCart)
              }}
            />
          )}
        </>
      )}
    </>
  )
}

export default ContentScript
