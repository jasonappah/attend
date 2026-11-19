// Proxies SQL to the production ZeroSqlDO /exec path so CDC drains into the
// Lime Sync change feed. Bound only while `wrangler dev --remote` is running.

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ ok: true, target: 'attend/ZeroSqlDO/singleton' })
    }
    if (request.method !== 'POST' || url.pathname !== '/exec') {
      return new Response('not found', { status: 404 })
    }

    const token = env.PROD_DO_OPS_TOKEN
    if (token) {
      const supplied = request.headers.get('x-prod-do-token')
      if (supplied !== token) return Response.json({ error: 'forbidden' }, { status: 403 })
    }

    const stub = env.ZERO_SQL_DO.get(env.ZERO_SQL_DO.idFromName('singleton'))
    return stub.fetch(
      new Request('https://zero-sql-do/exec', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: await request.text(),
      })
    )
  },
}
