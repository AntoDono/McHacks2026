import { preventDefaultAndStop, createStopPropagationHandler } from "~utils/events"

interface TryOnButtonProps {
  position: { top: number; left: number }
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: (e: React.MouseEvent) => void
}

const TryOnButton = ({ position, onMouseEnter, onMouseLeave, onClick }: TryOnButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    preventDefaultAndStop(e)
    onClick(e)
  }

  return (
    <div
      className="try-on-button-container"
      data-extension-button="true"
      data-analytics-ignore="true"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 999999
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={createStopPropagationHandler()}
    >
      <button
        className="try-on-button"
        data-extension-button="true"
        data-analytics-ignore="true"
        onClick={handleClick}
        onMouseDown={createStopPropagationHandler()}
      >
        Add to Try
      </button>
    </div>
  )
}

export default TryOnButton
