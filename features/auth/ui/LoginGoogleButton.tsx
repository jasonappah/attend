import { useState } from 'react'
import { Paragraph } from 'tamagui'
import { signInGoogle } from '~/features/auth/signInGoogle'
import { Button } from '~/interface/buttons/Button'

export function LoginGoogleButton() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <>
    <Button size="lg" width="100%" disabled={busy} onPress={() => void (async () => {
      setBusy(true); setError('')
      try { await signInGoogle() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Google sign-in failed') }
      finally { setBusy(false) }
    })()}>{busy ? 'Connecting…' : 'Continue with Google'}</Button>
    {error ? <Paragraph color="red-900">{error}</Paragraph> : null}
  </>
}
