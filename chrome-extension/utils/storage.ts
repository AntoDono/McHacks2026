import { DEFAULT_USER_DATA, STORAGE_KEYS, type UserData } from "~types/user"

/**
 * Generic helper to get data from Chrome storage
 */
const storageGet = <T>(keys: string[]): Promise<Record<string, T>> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve(result as Record<string, T>)
      }
    })
  })
}

/**
 * Generic helper to set data in Chrome storage
 */
const storageSet = (items: Record<string, any>): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Save user data to Chrome local storage
 */
export const saveUserData = async (userData: UserData): Promise<void> => {
  try {
    await storageSet({ [STORAGE_KEYS.USER_DATA]: userData })
    console.log("User data saved successfully:", userData)
  } catch (error) {
    console.error("Error saving user data:", error)
    throw error
  }
}

/**
 * Get user data from Chrome local storage
 * Returns default data if not found
 */
export const getUserData = async (): Promise<UserData> => {
  try {
    const result = await storageGet<UserData>([STORAGE_KEYS.USER_DATA])
    const userData = result[STORAGE_KEYS.USER_DATA] as UserData | undefined
    return userData || DEFAULT_USER_DATA
  } catch (error) {
    console.error("Error retrieving user data:", error)
    throw error
  }
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

/**
 * Storage key for gallery images
 */
export const GALLERY_IMAGES_KEY = 'gallery_images'

/**
 * Save gallery images to Chrome local storage
 */
export const saveGalleryImages = async (images: string[]): Promise<void> => {
  try {
    await storageSet({ [GALLERY_IMAGES_KEY]: images })
  } catch (error) {
    console.error("Error saving gallery images:", error)
    throw error
  }
}

/**
 * Get gallery images from Chrome local storage
 */
export const getStoredGalleryImages = async (): Promise<string[]> => {
  try {
    const result = await storageGet<string[]>([GALLERY_IMAGES_KEY])
    const images = result[GALLERY_IMAGES_KEY] as string[] | undefined
    return images || []
  } catch (error) {
    console.error("Error retrieving gallery images:", error)
    throw error
  }
}

/**
 * Clear gallery images from storage
 */
export const clearGalleryImages = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove([GALLERY_IMAGES_KEY], () => {
      if (chrome.runtime.lastError) {
        console.error("Error clearing gallery images:", chrome.runtime.lastError)
        reject(chrome.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Cart item with metadata
 */
export interface CartItem {
  imageUrl: string
  base64?: string | null  // Base64 encoded image data
  url?: string
  title?: string
  price?: string
  sku?: string
  brand?: string
}

/**
 * Storage key for cart items
 */
export const CART_ITEMS_KEY = 'cart_items'

/**
 * Save cart items to Chrome local storage
 */
export const saveCartItems = async (items: CartItem[]): Promise<void> => {
  try {
    await storageSet({ [CART_ITEMS_KEY]: items })
    console.log(`Cart saved: ${items.length} items`)
  } catch (error) {
    console.error("Error saving cart items:", error)
    throw error
  }
}

/**
 * Get cart items from Chrome local storage
 */
export const getCartItems = async (): Promise<CartItem[]> => {
  try {
    const result = await storageGet<CartItem[]>([CART_ITEMS_KEY])
    const items = result[CART_ITEMS_KEY] as CartItem[] | undefined
    
    // Handle legacy format (string arrays) by converting to new format
    if (items && items.length > 0 && typeof items[0] === 'string') {
      const legacyItems = items as unknown as string[]
      const convertedItems: CartItem[] = legacyItems.map(url => ({ 
        imageUrl: url,
        base64: null
      }))
      await saveCartItems(convertedItems)
      return convertedItems
    }
    
    // Handle old format without base64 field
    if (items && items.length > 0 && !items[0].hasOwnProperty('base64')) {
      const oldItems = items.map(item => ({
        ...item,
        base64: null
      }))
      await saveCartItems(oldItems)
      return oldItems
    }
    
    return items || []
  } catch (error) {
    console.error("Error retrieving cart items:", error)
    throw error
  }
}

/**
 * Add item to cart
 */
export const addToCart = async (item: CartItem): Promise<CartItem[]> => {
  const currentItems = await getCartItems()
  // Avoid duplicates based on image URL
  if (!currentItems.some(i => i.imageUrl === item.imageUrl)) {
    const updatedItems = [...currentItems, item]
    await saveCartItems(updatedItems)
    return updatedItems
  }
  return currentItems
}

/**
 * Remove item from cart by index
 */
export const removeFromCart = async (index: number): Promise<CartItem[]> => {
  const currentItems = await getCartItems()
  const updatedItems = currentItems.filter((_, i) => i !== index)
  await saveCartItems(updatedItems)
  return updatedItems
}

/**
 * Clear cart items from storage
 */
export const clearCart = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove([CART_ITEMS_KEY], () => {
      if (chrome.runtime.lastError) {
        console.error("Error clearing cart:", chrome.runtime.lastError)
        reject(chrome.runtime.lastError)
      } else {
        console.log("Cart cleared")
        resolve()
      }
    })
  })
}
