import type { LinkProps as ExpoLinkProps } from "expo-router";
import { useHrefAttrs } from "expo-router/build/link/useLinkHooks";
import { Text } from "tamagui";

export type LinkProps = ExpoLinkProps;

export const Link = ({ href, replace, asChild, ...props }: LinkProps) => {
  const linkProps = useHrefAttrs({ href: href as string, replace });

  return (
    // @ts-expect-error
    <Text
      tag="a"
      // always except-style
      asChild={asChild ? "except-style" : false}
      className="t_Link"
      cursor="pointer"
      color="inherit"
      fontSize="inherit"
      lineHeight="inherit"
      {...props}
      {...linkProps}
    />
  );
};
