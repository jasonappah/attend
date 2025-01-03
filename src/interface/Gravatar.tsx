import { Avatar, type AvatarProps } from "./Avatar";

export const Gravatar = ({
  email,
  ...rest
}: { email: string } & Omit<AvatarProps, "image">) => {
  const hash = sha256Hash(email.trim().toLowerCase());
  const url = `https://www.gravatar.com/avatar/${hash}?d=identicon`;
  return <Avatar image={url} {...rest} />;
};

async function sha256Hash(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const resultArray = Array.from(new Uint8Array(digest));
  return resultArray
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
