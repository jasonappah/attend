import { Redirect, useParams } from "one";
import { Button, Paragraph, YStack, H1 } from "tamagui";
import { authClient, useAuth } from "~/better-auth/authClient";
import { Link } from "~/interface/Link";

export default function HomePage() {
  const { loggedIn } = useAuth();
  const params = useParams<{
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

      {params.redirect && <Paragraph>You need to log in to continue.</Paragraph>}
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
            });
          }}
        >
          Login with Google
        </Button>
      )}
    </YStack>
  );
}
