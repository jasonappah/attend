import { betterAuth } from "better-auth";
import { bearer, jwt } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "~/db";
import { user, session, account, verification, jwks } from "~/db/schema";
import { randomID } from "~/zero/randomID";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      jwks,
    },
  }),

  plugins: [
    jwt({
      jwt: {
        // TODO: this should be shorter, issuing stateless tokens with such a long expiration time is not a good idea
        expirationTime: "3y",
      },

      jwks: {
        // default
        keyPairConfig: { alg: "EdDSA", crv: "Ed25519" },
      },
    }),

    bearer(),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (_) => false
      },
      update: {
        before: async (_) => false
      }
    }
  },
  advanced: {
    generateId() {
      return randomID();
    },
  },
});
