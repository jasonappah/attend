import { Circle, type CircleProps, Image, styled } from 'tamagui'

const SelectableCircle = styled(Circle, {
  variants: {
    active: {
      true: {
        outlineColor: '#fff',
        outlineWidth: 2,
        outlineStyle: 'solid',
      },
    },
  } as const,
})

export type AvatarProps = CircleProps & { image: string; size?: number; active?: boolean }

export const Avatar = ({
  image,
  size = 32,
  active,
  ...rest
}: AvatarProps) => {
  return (
    <SelectableCircle active={active} size={size} bg="$color5" ov="hidden" {...rest}>
      {image && <Image src={image} width={size} height={size} />}
    </SelectableCircle>
  )
}
