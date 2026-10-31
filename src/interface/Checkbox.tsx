import { Check } from 'lucide-react-native'
import { forwardRef } from 'react'
import type { CheckboxProps, TamaguiElement } from 'tamagui'
import { Checkbox as TamaguiCheckbox } from 'tamagui'

export const Checkbox = forwardRef<TamaguiElement, CheckboxProps>((props, ref) => {
  return (
    <TamaguiCheckbox ref={ref} {...props}>
      <TamaguiCheckbox.Indicator>
        <Check />
      </TamaguiCheckbox.Indicator>
    </TamaguiCheckbox>
  )
})
