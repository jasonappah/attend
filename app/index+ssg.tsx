import { Redirect } from 'one'
import { useAuth } from '~/auth/client/authClient'
import { APP_HOME_HREF } from '~/features/app/routes'

// native-only index route: native starts here (see app/_layout.tsx
// AppRoutes, initialRouteName="index") and resolves its session-aware target
// itself — signed-in to the app home, signed-out to /auth/login — so launch
// costs exactly one replace instead of index -> auth/login -> home.
//
// Redirect only fires while this screen is focused, so a cold deep link
// (index parked as a back-stack entry) keeps its own destination, and the
// auth/home layouts keep their protection for direct entry, sign-out, and
// expiry.
//
// the web landing moved to index.web+ssg.tsx; this file holds the auth hook,
// and the web landing keeps no auth subscription.
export default function NativeIndex() {
  const auth = useAuth()
  // hold for the session restore; the auth layout still owns the spinner
  // surface once a signed-out boot reaches it.
  if (auth.state === 'loading') return null
  return <Redirect href={auth.user ? APP_HOME_HREF : '/auth/login'} />
}
