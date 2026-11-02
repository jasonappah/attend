import { memo } from 'react'
import { Path, Rect, Svg } from 'react-native-svg'
import type { IconProps } from 'takeout-ui/icons/types'
import { useIconProps } from 'takeout-ui/icons/useIconProps'

export const Mail = memo((props: IconProps) => {
  const { width, height, fill, ...svgProps } = useIconProps(props)

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={fill}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...svgProps}
    >
      <Path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
      <Rect x="2" y="4" width="20" height="16" rx="2" />
    </Svg>
  )
})
