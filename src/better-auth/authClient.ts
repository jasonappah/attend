import { currentPlatform } from "@tamagui/constants";
import { env } from "~/env";

import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { MMKV, Mode } from "react-native-mmkv";

export const storage = new MMKV({
  id: "attend",
  mode: Mode.MULTI_PROCESS,
});

const MMKVStore = {
  getItem: (key: string) => {
    const value = storage.getString(key);
    if (value === undefined) {
      return null;
    }
    return value;
  },
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
};

export const authClient = createAuthClient({
  baseURL: env.ONE_SERVER_URL,
  plugins: [
    expoClient({
      scheme: "attend",
      storagePrefix: "attend",

      storage: currentPlatform !== "web" ? SecureStore : MMKVStore,
    }),
  ],
});
