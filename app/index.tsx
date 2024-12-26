import { useState } from 'react'
import { Button, H1, H3, Input, isWeb, Paragraph, SizableText, XStack, YStack, Text } from 'tamagui'
import { authClient, useAuth } from '~/better-auth/authClient'
import { Avatar } from '~/interface/Avatar'
import { isTauri } from '~/tauri/constants'
import { trpc } from '~/trpc/client'
import { randomID } from '~/zero/randomID'
import { mutate, useQuery } from '~/zero/zero'

export default function HomePage() {
  const [messages] = useQuery((q) => q.message.orderBy('createdAt', 'desc'))
  const { user, jwtToken, session } = useAuth()
  const [text, setText] = useState('')
  const existingUser = useQuery((q) => q.user)[0][0]
  const greeting = trpc.greet.useQuery('World')
  const health = trpc.health.useQuery()

  return (
    <YStack
      $platform-ios={{ pt: '$10' }}
      f={1}
      p="$4"
      gap="$4"
      ai="flex-start"
      maw={600}
      w="100%"
      als="center"
    >
      <H1>Welcome</H1>
      
      <Text>{JSON.stringify(greeting.data)}</Text>
      <Text>{JSON.stringify(health.data)}</Text>

      {user ? (
        <XStack ai="center" gap="$4">
          <Avatar image={user.image || ''} />
          <SizableText>{user.name}</SizableText>

          <Button onPress={() => authClient.signOut()}>Logout</Button>

          {isWeb && !isTauri && jwtToken && (
            <a href={`one-zero://finish-auth?token=${session?.token}`}>
              <Button>Login in Tauri</Button>
            </a>
          )}
        </XStack>
      ) : (
        <Button
          onPress={() => {
            authClient.signIn.social({
              provider: 'github',
            })
          }}
        >
          Login with Github
        </Button>
      )}

      <YStack w="100%" gap="$4" p="$4" bc="$color2" bw={1} br="$4">
        <Input onChangeText={setText} />

        <Button
          onPress={async () => {
            const existing = user?.id || existingUser?.id
            let userId = existing || randomID()

            if (!existing) {
              // for now just insert some random user!
              await mutate.user.insert({
                id: userId,
                email: '',
                image: '',
                username: 'firstuser',
                name: 'First User',
                state: {},
                updatedAt: new Date().getTime(),
                createdAt: new Date().getTime(),
              })
            }

            mutate.message.insert({
              id: randomID(),
              senderId: userId,
              content: text,
              createdAt: new Date().getTime(),
            })
          }}
        >
          Post
        </Button>
      </YStack>

      <H3>Messages</H3>

      {messages.map((message) => {
        return (
          <YStack key={message.id}>
            <Paragraph>{message.content}</Paragraph>
          </YStack>
        )
      })}
    </YStack>
  )
}
