// sourced from https://vercel.com/docs/build-output-api/v3/configuration#routes

export type Config = {
  version: 3
  routes?: Route[]
  images?: ImagesConfig
  wildcard?: WildcardConfig
  overrides?: OverrideConfig
  cache?: Cache
  crons?: CronsConfig
  framework?: Framework
}

export type Route = Source | Handler

type Source = {
  src: string
  dest?: string
  headers?: Record<string, string>
  methods?: string[]
  continue?: boolean
  caseSensitive?: boolean
  check?: boolean
  status?: number
  has?: Array<HostHasField | HeaderHasField | CookieHasField | QueryHasField>
  missing?: Array<HostHasField | HeaderHasField | CookieHasField | QueryHasField>
  locale?: Locale
  middlewareRawSrc?: string[]
  middlewarePath?: string
}
type Locale = {
  redirect?: Record<string, string>
  cookie?: string
}
type HostHasField = {
  type: 'host'
  value: string
}
type HeaderHasField = {
  type: 'header'
  key: string
  value?: string
}
type CookieHasField = {
  type: 'cookie'
  key: string
  value?: string
}
type QueryHasField = {
  type: 'query'
  key: string
  value?: string
}
type HandleValue =
  | 'rewrite'
  | 'filesystem' // check matches after the filesystem misses
  | 'resource'
  | 'miss' // check matches after every filesystem miss
  | 'hit'
  | 'error' //  check matches after error (500, 404, etc.)

type Handler = {
  handle: HandleValue
  src?: string
  dest?: string
  status?: number
}

type ImageFormat = 'image/avif' | 'image/webp'

type RemotePattern = {
  protocol?: 'http' | 'https'
  hostname: string
  port?: string
  pathname?: string
  search?: string
}

type LocalPattern = {
  pathname?: string
  search?: string
}

type ImagesConfig = {
  sizes: number[]
  domains: string[]
  remotePatterns?: RemotePattern[]
  localPatterns?: LocalPattern[]
  qualities?: number[]
  minimumCacheTTL?: number // seconds
  formats?: ImageFormat[]
  dangerouslyAllowSVG?: boolean
  contentSecurityPolicy?: string
  contentDispositionType?: string
}

type WildCard = {
  domain: string
  value: string
}

type WildcardConfig = Array<WildCard>

type Override = {
  path?: string
  contentType?: string
}

type OverrideConfig = Record<string, Override>

type Cache = string[]

type Framework = {
  version: string
}

type Cron = {
  path: string
  schedule: string
}

type CronsConfig = Cron[]
