import type { Endpoint } from 'one'

export type R2Bucket = {
  get: (key: string) => Promise<{
    arrayBuffer: () => Promise<ArrayBuffer>
  } | null>
}

function cloudflareFilesBucket(): R2Bucket | undefined {
  return (globalThis as { __soot_cf_r2_bucket?: R2Bucket }).__soot_cf_r2_bucket
}

// Export the dependency boundary so tests never need a live Cloudflare bucket.
export async function serveUpdate(request: Request, bucket?: R2Bucket) {
  const pathname = new URL(request.url).pathname
  const match =
    /^\/api\/updates\/([A-Za-z0-9][A-Za-z0-9_-]{0,63})\/(android|ios)\/([A-Za-z0-9][A-Za-z0-9._-]{0,127})\/(manifest\.json|assets\/[A-Za-z0-9_-]{43})$/.exec(
      pathname
    )
  if (!match) return new Response(null, { status: 400 })
  if (!bucket) {
    return new Response(null, { status: 500 })
  }

  const [, variant, platform, runtimeVersion, file] = match
  const key = `updates/${variant}/${platform}/${runtimeVersion}/${file}`

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

export const GET: Endpoint = (request) => serveUpdate(request, cloudflareFilesBucket())
