import { User } from 'lucide-react-native'
import {
  Button,
  Input as TextInput,
  Label,
  Text,
  View,
  XGroup,
  XStack,
  YStack,
  withStaticProperties,
} from 'tamagui'

// This unused example uses Tamagui 3 primitives instead of `.styleable`.
export const InputContainerFrame = YStack
export const InputIconFrame = View
export const InputLabel = Label
export const InputInfo = Text

const InputBox = XStack
const InputSection = View
const InputIcon = View

export const Input = withStaticProperties(InputContainerFrame, {
  Box: InputBox,
  Area: TextInput,
  Section: InputSection,
  Button,
  Icon: InputIcon,
  Info: InputInfo,
  Label: InputLabel,
  XGroup,
})

export const InputNew = () => (
  <Input width={400} gap="2">
    <Input.Box items="center" borderWidth={1} borderColor="borderColor" rounded="3">
      <Input.Section p="2">
        <Input.Icon>
          <User />
        </Input.Icon>
      </Input.Section>
      <Input.Area flex={1} />
      <Input.Button>
        <User />
      </Input.Button>
    </Input.Box>
  </Input>
)
