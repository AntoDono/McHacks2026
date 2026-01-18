/**
 * Event handler utilities for common event patterns
 */

/**
 * Stops event propagation
 */
export const stopEventPropagation = (e: React.MouseEvent | React.DragEvent) => {
  e.stopPropagation()
}

/**
 * Prevents default behavior and stops propagation
 */
export const preventDefaultAndStop = (e: React.MouseEvent | React.DragEvent | React.FormEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

/**
 * Creates a click handler that prevents default and stops propagation
 */
export const createPreventClickHandler = (callback?: () => void) => {
  return (e: React.MouseEvent) => {
    preventDefaultAndStop(e)
    callback?.()
  }
}

/**
 * Creates a mouse down handler that stops propagation
 */
export const createStopPropagationHandler = (callback?: () => void) => {
  return (e: React.MouseEvent) => {
    stopEventPropagation(e)
    callback?.()
  }
}
