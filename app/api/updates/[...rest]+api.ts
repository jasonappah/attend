import type { Endpoint } from 'one'

type R2Bucket = {
  get: (
    key: string,
  ) => Promise<{
    arrayBuffer: () => Promise<ArrayBuffer>
  } | null>
}

function cloudflareFilesBucket(): R2Bucket | undefined {
  return (globalThis as { __soot_cf_r2_bucket?: R2Bucket }).__soot_cf_r2_bucket
}

// One.Updates update server. the native client fetches:
//   GET <updates.url>/<platform>/<runtimeVersion>/manifest.json
//   GET <updates.url>/<platform>/<runtimeVersion>/assets/<hash>
// files are stored in the FILES R2 bucket under the updates/ prefix,
// content-addressed by hash, exactly as `one updates publish` writes them.
export const GET: Endpoint = async (request) => {
  const bucket = cloudflareFilesBucket()
  if (!bucket) {
    return new Response(null, { status: 500 })
  }

  const url = new URL(request.url)
  // pathname is /api/updates/<platform>/<runtimeVersion>/<rest>
  const segments = url.pathname.slice('/api/updates/'.length).split('/')
  const [platform, runtimeVersion, ...rest] = segments

  if (!platform || !runtimeVersion || rest.length === 0) {
    return new Response(null, { status: 400 })
  }

  const key = `updates/${platform}/${runtimeVersion}/${rest.join('/')}`

  try {
    const obj = await bucket.get(key)
    if (!obj) {
      return new Response(null, { status: 404 })
    }

    const body = await obj.arrayBuffer()
    const isManifest = key.endsWith('manifest.json')
    const contentType = isManifest ? 'application/json' : 'application/octet-stream'
    // assets are content-addressed by hash: immutable, cache forever.
    // the manifest is checked for new updates: allow revalidation.
    const cacheControl = isManifest
      ? 'public, max-age=0, must-revalidate'
      : 'public, max-age=31536000, immutable'
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': cacheControl,
      },
    })
  } catch {
    return new Response(null, { status: 500 })
  }
}
