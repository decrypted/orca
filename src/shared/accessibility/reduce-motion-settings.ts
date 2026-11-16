/** 'always' makes every Orca window behave as if the OS asked for reduced motion. */
export type ReduceMotionPreference = 'system' | 'always'

export type ReduceMotionSettings = {
  reduceMotion?: ReduceMotionPreference
}
