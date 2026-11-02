// the feedback contract and its state, with no react native ui in the module
// graph, so a shared screen can import `openFeedback` on every platform the app
// builds for. the overlay itself lives behind `takeout-native/feedback/overlay`
// and is imported once, from the app's native setup file.
export { openFeedback, subscribeToFeedbackActivation } from './activation'
export {
  clearFeedbackConfig,
  configureFeedback,
  isFeedbackEnabled,
  readFeedbackConfig,
  subscribeToFeedbackConfig,
} from './config'
export type * from './contract'
export type {
  FeedbackControllerEvent,
  FeedbackControllerState,
  FeedbackMode,
} from './controller'
export { canSend, feedbackReducer, initialFeedbackState, isCapturing } from './controller'
export { MAX_FEEDBACK_IMAGE_BYTES, MAX_FEEDBACK_REPORT_BODY_BYTES } from './limits'
export { buildFeedbackReport, describeAnnotation } from './report'
export {
  buildStroke,
  isClosedStroke,
  normalizePoint,
  normalizeRect,
  simplifyStroke,
  strokeBounds,
} from './stroke'
