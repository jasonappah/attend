import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer, jwt } from 'better-auth/plugins'
import { db } from '~/db'
import { account, jwks, session, user, verification } from '~/db/schema'
import { env } from '~/env'
import { randomID } from '~/zero/randomID'
import { expo } from "@better-auth/expo";

const disableSignupInProduction = async () => env.NODE_ENV === 'development'

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: ['attend://'],
  database: drizzleAdapter(db, {
    provider: 'pg',
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
        expirationTime: '3y',
      },

      jwks: {
        keyPairConfig: { alg: 'EdDSA', crv: 'Ed25519' },
      },
    }),

    bearer(),
    expo()
  ],
  databaseHooks: {
    user: {
      create: {
        before: disableSignupInProduction,
      },
    },
  },
  advanced: {
    generateId() {
      return randomID()
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
})
