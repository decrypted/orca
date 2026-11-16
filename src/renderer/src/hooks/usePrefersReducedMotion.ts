import { useLayoutEffect, useSyncExternalStore } from 'react'
import type { ReduceMotionPreference } from '../../../shared/accessibility/reduce-motion-settings'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

// Why shared: one per chat row would otherwise each hold a MediaQueryList and listener.
let watchedMatchMedia: typeof window.matchMedia | null = null
let unwatchOsReducedMotion: (() => void) | null = null
let osReduced = false
let reduceMotionAlways = false
const reduceMotionSubscribers = new Set<() => void>()

function notifyReduceMotionSubscribers(): void {
  for (const onChange of reduceMotionSubscribers) {
    onChange()
  }
}

function watchOsReducedMotion(): void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return
  }
  // Why: a replaced window.matchMedia (e.g. a test stub) must not keep answering from the old list.
  if (window.matchMedia === watchedMatchMedia) {
    return
  }
  unwatchOsReducedMotion?.()
  watchedMatchMedia = window.matchMedia
  const media = window.matchMedia(REDUCED_MOTION_QUERY)
  osReduced = media.matches
  const onChange = (event: MediaQueryListEvent): void => {
    osReduced = event.matches
    notifyReduceMotionSubscribers()
  }
  media.addEventListener('change', onChange)
  unwatchOsReducedMotion = () => media.removeEventListener('change', onChange)
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

  useLayoutEffect(() => {
    if (!always) {
      return
    }
    const root = document.documentElement
    root.dataset.reduceMotion = ''
    reduceMotionAlways = true
    notifyReduceMotionSubscribers()
    return () => {
      delete root.dataset.reduceMotion
      reduceMotionAlways = false
      notifyReduceMotionSubscribers()
    }
  }, [always])
}
