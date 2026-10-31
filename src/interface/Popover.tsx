import { Popover, type PopoverContentProps } from 'tamagui'

export const PopoverContent = ({
  children,
  arrow = true,
  ...props
}: PopoverContentProps & { arrow?: boolean }) => {
  return (
    <Popover.Content
      bg="color2"
      borderWidth={1}
      items="flex-start"
      borderColor="borderColor"
      y="0 enter:-10 exit:-10"
      opacity="1 enter:0 exit:0"
      transition="quickLessBouncy"
      p={0}
      {...props}
    >
      {arrow && <Popover.Arrow borderWidth={1} borderColor="borderColor" bg="color2" size={16} />}

      {children}
    </Popover.Content>
  )
}
