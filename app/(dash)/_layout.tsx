import { Slot, Tabs, usePathname, useRouter, Redirect } from "one";
import { useAuth } from "~/better-auth/authClient";
export default function DashLayout() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) {
    // TODO: would be wise to validate this is on the current domain
    const redirectTo = encodeURIComponent(pathname);
    return <Redirect href={`/?redirect=${redirectTo}`} />;
  }

  // TODO: use a drawer
  return <Slot />;
}
