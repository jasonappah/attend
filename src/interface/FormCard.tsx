import type { MediaQueryKey } from '@tamagui/web'
import { View, styled } from 'tamagui'
import { useMedia } from 'tamagui'

export const FormCard = styled(View, {
  render: 'form',
  flexDirection: 'row',
  maxW: '100%',
  rounded: 30,
  $md: {
    p: '$6',
    shadowColor: '$shadowColor',
    shadowOffset: {
      width: 0,
      height: 9,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12.35,
  },
  // @ts-expect-error valid at runtime, but ThemeMediaKeys resolves to never because keyof Themes is widened to string
  '$theme-dark': {
    borderWidth: 1,
    borderColor: '$borderColor',
  },
  $maxSm: {
    borderWidth: 0,
    rounded: 0,
    px: '$1',
  },
})

export const Hide = ({
  children,
  when = 'maxMd',
}: { children: React.ReactNode; when: MediaQueryKey }) => {
  const hide = useMedia()[when]

  if (hide) {
    return null
  }
  return children
}
