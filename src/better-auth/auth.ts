import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, jwt } from "better-auth/plugins";
import { db } from "~/db";
import { account, jwks, session, user, verification } from "~/db/schema";
import { env } from "~/env";
import { randomID } from "~/zero/randomID";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
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
        keyPairConfig: { alg: "EdDSA", crv: "Ed25519" },
      },
    }),

    bearer(),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (_) => false,
      },
      update: {
        before: async (_) => false,
      },
    },
  },
  advanced: {
    generateId() {
      return randomID();
    },
  },
});
