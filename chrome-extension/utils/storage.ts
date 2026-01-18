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
 * Storage key for cart items
 */
export const CART_ITEMS_KEY = 'cart_items'

/**
 * Save cart items to Chrome local storage
 */
export const saveCartItems = async (items: string[]): Promise<void> => {
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
export const getCartItems = async (): Promise<string[]> => {
  try {
    const result = await storageGet<string[]>([CART_ITEMS_KEY])
    const items = result[CART_ITEMS_KEY] as string[] | undefined
    return items || []
  } catch (error) {
    console.error("Error retrieving cart items:", error)
    throw error
  }
}

/**
 * Add item to cart
 */
export const addToCart = async (imageUrl: string): Promise<string[]> => {
  const currentItems = await getCartItems()
  // Avoid duplicates
  if (!currentItems.includes(imageUrl)) {
    const updatedItems = [...currentItems, imageUrl]
    await saveCartItems(updatedItems)
    return updatedItems
  }
  return currentItems
}

/**
 * Remove item from cart by index
 */
export const removeFromCart = async (index: number): Promise<string[]> => {
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
