import { type Href, type LinkProps as OneLinkProps, useLinkTo } from 'one'
import { Text } from 'tamagui'

export type LinkProps = OneLinkProps<Href>

export const Link = ({ href, replace, asChild, ...props }: LinkProps) => {
  const linkProps = useLinkTo({ href: href as string, replace })

  return (
    <Text
      tag="a"
      // always except-style
      asChild={asChild ? 'except-style' : false}
      className="t_Link"
      cursor="pointer"
      color="inherit"
      fontSize="inherit"
      lineHeight="inherit"
      {...props}
      {...linkProps}
    />
  )
}
