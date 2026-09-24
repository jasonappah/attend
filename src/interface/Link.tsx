import { type Href, type LinkProps as OneLinkProps, useLinkTo } from 'one'
import { Text } from 'tamagui'

export type LinkProps = OneLinkProps<Href>

export const Link = ({ href, replace, mask, asChild, disabled, ...props }: LinkProps) => {
  const linkProps = useLinkTo({ href: href as string, replace, mask: mask as string | undefined })

  return (
    <Text
      render="a"
      // always except-style
      asChild={asChild ? 'except-style' : false}
      className="t_Link"
      cursor="pointer"
      color="inherit"
      fontSize="unset"
      lineHeight="unset"
      disabled={disabled ?? undefined}
      {...props}
      {...linkProps}
    />
  )
}
