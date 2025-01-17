import { useState, useEffect } from "react";
import { Button, H1, Paragraph, YStack } from "tamagui";
import { authClient } from "~/better-auth/authClient";
import { Redirect, useLocalSearchParams } from "expo-router";
import { Link } from "~/interface/Link";

export default function HomePage() {
  const s = authClient.useSession();
  const [loggedIn, setLoggedIn] = useState(!!s.data?.user);

  useEffect(() => {
    setLoggedIn(!!s.data?.user);
  }, [s.data]);
  
  const params = useLocalSearchParams<{
    redirect?: string;
    error?: string;
  }>();

  if (params.redirect && loggedIn) {
    return <Redirect href={params.redirect} />;
  }

  return (
    <YStack
      $platform-ios={{ pt: "$10" }}
      f={1}
      p="$4"
      gap="$4"
      ai="flex-start"
      maw={600}
      w="100%"
      als="center"
    >
      <H1>Attend.</H1>

      <Paragraph>A simple app to track your class attendance.</Paragraph>

      {params.redirect && (
        <Paragraph>You need to log in to continue.</Paragraph>
      )}
      {params.error && <Paragraph>{params.error}</Paragraph>}

      {loggedIn ? (
        <Link href="/today">
          <Button>Continue</Button>
        </Link>
      ) : (
        <Button
          onPress={async () => {
            await authClient.signIn.social({
              provider: "google",
              callbackURL: params.redirect,
            });
          }}
        >
          Login with Google
        </Button>
      )}
    </YStack>
  );
}
