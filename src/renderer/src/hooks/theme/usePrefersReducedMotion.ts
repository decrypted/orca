import { useEffect, useSyncExternalStore } from 'react'
import type { ReduceMotionPreference } from '../../../../shared/accessibility/reduce-motion-settings'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

// Why shared: one per chat row would otherwise each hold a MediaQueryList and listener.
let reducedMotionMedia: MediaQueryList | null = null
let osReduced = false
let reduceMotionAlways = false
const reduceMotionSubscribers = new Set<() => void>()

function notifyReduceMotionSubscribers(): void {
  for (const onChange of reduceMotionSubscribers) {
    onChange()
  }
}

function watchOsReducedMotion(): void {
  if (
    reducedMotionMedia ||
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return
  }
  reducedMotionMedia = window.matchMedia(REDUCED_MOTION_QUERY)
  osReduced = reducedMotionMedia.matches
  reducedMotionMedia.addEventListener('change', (event) => {
    osReduced = event.matches
    notifyReduceMotionSubscribers()
  })
}

function subscribeToReducedMotion(onChange: () => void): () => void {
  watchOsReducedMotion()
  reduceMotionSubscribers.add(onChange)
  return () => reduceMotionSubscribers.delete(onChange)
}

export function readPrefersReducedMotion(): boolean {
  watchOsReducedMotion()
  return reduceMotionAlways || osReduced
}

// Why: a scripted scroll's explicit `behavior` is not affected by CSS or the OS setting.
export function motionSafeScrollBehavior(behavior: ScrollBehavior = 'smooth'): ScrollBehavior {
  return behavior === 'smooth' && readPrefersReducedMotion() ? 'auto' : behavior
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    readPrefersReducedMotion,
    readPrefersReducedMotion
  )
}

/** Applies the Reduce motion setting to this window: main.css motion variants and the readers above. */
export function useReduceMotionSetting(preference: ReduceMotionPreference | undefined): void {
  const always = preference === 'always'

  useEffect(() => {
    const root = document.documentElement
    if (always) {
      root.dataset.reduceMotion = ''
    } else {
      delete root.dataset.reduceMotion
    }
    reduceMotionAlways = always
    notifyReduceMotionSubscribers()
  }, [always])
}
