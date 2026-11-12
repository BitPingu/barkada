import { useEffect, useRef, useState } from 'react'

function useScaledStage<T extends HTMLElement>(
  referenceWidth = 960,
  referenceHeight = 540,
) {
  // Reference the container that determines the available scaling space.
  const containerRef = useRef<T | null>(null)

  // Scale the reference layout to fit the available space.
  const [scale, setScale] = useState(1)

  // Recalculate the scale whenever the available container changes.
  useEffect(() => {
    const container = containerRef.current

    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (!entry) return

      const { width, height } = entry.contentRect

      // Skip scaling if the container has no available space.
      if (width <= 0 || height <= 0) return

      // Maintain the reference aspect ratio while fitting the container.
      const nextScale = Math.min(
        width / referenceWidth,
        height / referenceHeight,
      )

      setScale(nextScale)
    })

    observer.observe(container)

    return () => observer.disconnect()
  }, [referenceWidth, referenceHeight])

  return { containerRef, scale }
}

export default useScaledStage
