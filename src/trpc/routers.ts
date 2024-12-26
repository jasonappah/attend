import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { authedProcedure, publicProcedure, router } from './index';
import * as v from 'valibot';

export const appRouter = router({
  identify: authedProcedure.query(async ({ ctx }) => {
    return ctx.session.user;
  }),
  greet: publicProcedure.input(v.parser(v.string())).query(async ({ input }) => {
    return {
      greeting: `Hello ${input}!`,
    };
  }),
  health: publicProcedure.query(async () => {
    return {
      status: 'ok',
    };
  }),
});

export type AppRouter = typeof appRouter;

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
