import { useState } from "react"
import "../styles/cart.css"
import type { CartItem } from "~utils/storage"

interface CartProps {
  items: CartItem[]
  onRemoveItem: (index: number) => void
  onTryItOn: () => void
  onClose: () => void
  isLoading?: boolean
}

const Cart = ({ items, onRemoveItem, onTryItOn, onClose, isLoading = false }: CartProps) => {
  const [isMinimized, setIsMinimized] = useState(false)

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
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="cart-footer">
              <button
                className="cart-try-on-btn"
                onClick={onTryItOn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="cart-spinner"></span>
                    Generating...
                  </>
                ) : (
                  `Try it on (${items.length})`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Cart
