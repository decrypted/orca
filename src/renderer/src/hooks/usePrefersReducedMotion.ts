import { useEffect, useSyncExternalStore } from 'react'
import type { ReduceMotionPreference } from '../../../shared/accessibility/reduce-motion-settings'
import { readMediaQuery, useMediaQuery } from './use-media-query'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

let reduceMotionAlways = false
const reduceMotionSubscribers = new Set<() => void>()

function subscribeToReduceMotionSetting(onChange: () => void): () => void {
  reduceMotionSubscribers.add(onChange)
  return () => reduceMotionSubscribers.delete(onChange)
}

function readReduceMotionAlways(): boolean {
  return reduceMotionAlways
}

export function readPrefersReducedMotion(): boolean {
  return reduceMotionAlways || readMediaQuery(REDUCED_MOTION_QUERY)
}

// Why: a scripted scroll's explicit `behavior` is not affected by CSS or the OS setting.
export function motionSafeScrollBehavior(behavior: ScrollBehavior = 'smooth'): ScrollBehavior {
  return behavior === 'smooth' && readPrefersReducedMotion() ? 'auto' : behavior
}

export function usePrefersReducedMotion(): boolean {
  const always = useSyncExternalStore(
    subscribeToReduceMotionSetting,
    readReduceMotionAlways,
    readReduceMotionAlways
  )
  return useMediaQuery(REDUCED_MOTION_QUERY) || always
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
    for (const onChange of reduceMotionSubscribers) {
      onChange()
    }
  }, [always])
}
