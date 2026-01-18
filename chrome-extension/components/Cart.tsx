import { useState, useEffect } from "react"
import "../styles/cart.css"
import type { CartItem } from "~utils/storage"

interface CartProps {
  items: CartItem[]
  onRemoveItem: (index: number) => void
  onTryItOn: () => void
  onClose: () => void
  isLoading?: boolean
  progress?: { message: string; progress: number }
}

interface Recommendation {
  garment: {
    image: string
    sku?: string
    url?: string
    title?: string
    price?: string
    metadata?: any
    session_timestamp: string
  }
  similarity: number
}

const Cart = ({ items, onRemoveItem, onTryItOn, onClose, isLoading = false, progress }: CartProps) => {
  const [isMinimized, setIsMinimized] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(true)

  // Calculate total price from cart items
  const calculateTotal = () => {
    let total = 0
    let count = 0
    
    items.forEach(item => {
      if (item.price) {
        // Remove currency symbols and commas, parse as float
        const priceStr = item.price.replace(/[$,]/g, '')
        const price = parseFloat(priceStr)
        if (!isNaN(price)) {
          total += price
          count++
        }
      }
    })
    
    return { total, count }
  }

  const { total, count } = calculateTotal()

  // Fetch recommendations when cart items change
  useEffect(() => {
    const fetchRecommendations = async () => {
      console.log('Fetching recommendations for items:', items)
      if (items.length === 0) {
        setRecommendations([])
        return
      }

      setLoadingRecommendations(true)
      try {
        const API_URL = process.env.PLASMO_PUBLIC_API_URL || `http://localhost:${process.env.PLASMO_PUBLIC_PORT || 8080}`
        const response = await fetch(`${API_URL}/recommendations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cart_items: items.map(item => ({
              imageData: item.base64 || null,
              url: item.imageUrl || null
            })),
            limit: 3,
            min_similarity: 0.25
          })
        })


        if (response.ok) {
          const data = await response.json()
          console.log('Data:', data)
          if (data.success) {
            // Filter out items that are already in cart
            const cartUrls = items.map(i => i.imageUrl)
            const filtered = data.recommendations.filter(
              (rec: Recommendation) => 
                // Exclude exact matches (100% similarity = same item)
                rec.similarity < 0.99 &&
                // Exclude items already in cart
                !cartUrls.includes(rec.garment.image) && 
                !cartUrls.includes(rec.garment.url || '')
            )
            setRecommendations(filtered)
          }
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error)
      } finally {
        setLoadingRecommendations(false)
      }
    }

    fetchRecommendations()
  }, [items])

  return (
    <div className={`cart-panel ${isMinimized ? 'minimized' : ''}`}>
      <div className="cart-header">
        <div className="cart-title-section">
          <h3 className="cart-title">Try-On Cart</h3>
          <span className="cart-count">{items.length}</span>
        </div>
        <div className="cart-actions">
          <button
            className="cart-minimize-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? "▲" : "▼"}
          </button>
          <button
            className="cart-close-btn"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="cart-items">
            {items.length === 0 ? (
              <div className="cart-empty">
                <p>No items in cart</p>
                <p className="cart-empty-hint">Click "Add to Try" on product images to add them here</p>
              </div>
            ) : (
              items.map((item, index) => (
                <div key={`${item.imageUrl}-${index}`} className="cart-item">
                  <img
                    src={item.imageUrl}
                    alt={item.title || `Garment ${index + 1}`}
                    className="cart-item-image"
                  />
                  <button
                    className="cart-item-remove"
                    onClick={() => onRemoveItem(index)}
                    title="Remove"
                  >
                    ×
                  </button>
                  <div className="cart-item-number">{index + 1}</div>
                  {item.price && (
                    <div className="cart-item-price">{item.price}</div>
                  )}
                </div>
              ))
            )}
          </div>

          {items.length > 0 && count > 0 && (
            <div className="cart-total">
              <span className="cart-total-label">Total ({count} {count === 1 ? 'item' : 'items'}):</span>
              <span className="cart-total-amount">${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          {items.length > 0 && (
            <div className="cart-recommendations">
              <div className="cart-recommendations-header">
                <h4 className="cart-recommendations-title">
                  You might also like
                </h4>
                <button
                  className="cart-recommendations-toggle"
                  onClick={() => setShowRecommendations(!showRecommendations)}
                >
                  {showRecommendations ? '−' : '+'}
                </button>
              </div>
              
              {showRecommendations && (
                <div className="cart-recommendations-content">
                  {loadingRecommendations ? (
                    <div className="cart-recommendations-loading">
                      <span className="cart-spinner"></span>
                      Finding similar items...
                    </div>
                  ) : recommendations.length > 0 ? (
                    <div className="cart-recommendations-grid">
                      {recommendations.map((rec, index) => (
                        <div 
                          key={`${rec.garment.session_timestamp}-${index}`} 
                          className="cart-recommendation-item"
                        >
                          <img
                            src={rec.garment.image}
                            alt={rec.garment.title || 'Recommended item'}
                            className="cart-recommendation-image"
                          />
                          <div className="cart-recommendation-similarity">
                            {Math.round(rec.similarity * 100)}% match
                          </div>
                          {rec.garment.url && (
                            <a 
                              href={rec.garment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cart-recommendation-link"
                              title="View item"
                            >
                              🔗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="cart-recommendations-empty">
                      No recommendations found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {items.length > 0 && (
            <div className="cart-footer">
              {isLoading && progress && progress.progress > 0 ? (
                <div className="cart-progress-container">
                  <div className="cart-progress-message">{progress.message}</div>
                  <div className="cart-progress-bar-bg">
                    <div 
                      className="cart-progress-bar-fill" 
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  <div className="cart-progress-percent">{progress.progress}%</div>
                </div>
              ) : (
                <button
                  className="cart-try-on-btn"
                  onClick={onTryItOn}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="cart-spinner"></span>
                      Starting...
                    </>
                  ) : (
                    `Try it on (${items.length})`
                  )}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Cart
