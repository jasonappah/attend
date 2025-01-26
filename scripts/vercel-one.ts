// TODO: keep implementing this based on https://vercel.com/docs/build-output-api/v3/primitives#edge-functions and https://vercel.com/docs/build-output-api/v3/configuration.
//
// thought: the api that one uses for endpoints is closer to the edge runtime api than the regular serverless functions api. i think it would be pretty easy to run the api endpoint in a vercel edge function. although that has other implications like probably not being able to use the normal pg drizzle adapter... to use the api endpoints with vercel serverless functions we'd pronbably need to write some sort of shim thing
// hopefully one beats me to this...

import { readFile } from 'node:fs/promises'
import type { One, RouteInfo } from 'node_modules/one/types/vite/types'
import type { Config, Route } from './vercel-output-types'

const readJSON = async (file: string) => JSON.parse(await readFile(file, 'utf-8'))

async function run() {
  const _buildInfo = (await readJSON(`dist/buildInfo.json`)) as One.BuildInfo
  const packageJson = await readJSON(`node_modules/one/package.json`)
  const oneVersion = packageJson.version

  const _config: Config = {
    version: 3,
    framework: oneVersion,
    cache: ['.tamagui/**', 'node_modules/**'],
  }
}

function _oneRouteToVercelRoute(oneRoute: RouteInfo): Route {
  const vercelRoute: Route = {
    src: oneRoute.namedRegex,
  }

  return vercelRoute
}

run()
