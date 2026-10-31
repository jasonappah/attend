import type { MediaQueryKey } from '@tamagui/web'
import { View, styled } from 'tamagui'
import { useMedia } from 'tamagui'

export const FormCard = styled(View, {
  render: 'form',
  flexDirection: 'row',
  maxW: '100%',
  rounded: '30px max-sm:0',
  p: 'md:6',
  px: 'max-sm:1',
  borderWidth: 'dark:1 max-sm:0',
  borderColor: 'borderColor',
})

export const Hide = ({
  children,
  when = 'max-md',
}: { children: React.ReactNode; when: MediaQueryKey }) => {
  const hide = useMedia()[when]

  if (hide) {
    return null
  }
  return children
}
