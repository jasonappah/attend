import { z } from 'zod'
import { room } from '~/database/schema'
import { syncedDb } from '~/database/syncedDb'
import { uuidv7 } from '~/helpers/uuid'

const locationSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  level: z.array(z.number()).min(1),
  mapId: z.number(),
  catId: z.number(),
  mrkId: z.number(),
  id: z.number(),
  shape: z.unknown().nullable().optional(),
})
const categoriesSchema = z.array(
  z.object({
    name: z.string(),
    children: z.object({ locations: z.array(z.unknown()).default([]) }).optional(),
  })
)

export async function syncRooms(userId: string) {
  const key = process.env.CONCEPT3D_API_KEY
  if (!key) throw new Error('The server is missing its Concept3D API key.')
  const url = (path: string, params: Record<string, string>) => {
    const result = new URL(`https://api.concept3d.com/${path}`)
    for (const [name, value] of Object.entries({ ...params, map: '1772', key }))
      result.searchParams.set(name, value)
    return result
  }
  const get = async (target: URL) => {
    const response = await fetch(target, {
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) throw new Error(`Concept3D returned HTTP ${response.status}.`)
    return response.json()
  }
  const groups = z
    .record(z.string(), z.array(z.number()))
    .parse(await get(url('categories', { childIds: '', children: '', noPrivates: '' })))
  const ids = [...new Set(Object.values(groups).flat())]
  if (!ids.length) throw new Error('Concept3D returned no categories.')
  const categories = categoriesSchema.parse(
    await get(url(`categories/${ids.join(',')}`, { batch: '', children: '' }))
  )
  const now = Date.now()
  const rows = categories.flatMap((category) => {
    const building = /^.*\(([\w\d]*)\)$/.exec(category.name.trim())
    if (!building || ['AED', 'AST', 'ATM', 'OSV'].includes(building[1])) return []
    return (category.children?.locations ?? []).flatMap((item) => {
      const parsed = locationSchema.safeParse(item)
      if (!parsed.success) return []
      const location = parsed.data
      const match = /([\w\d]{2,})\s*(\d+\.[\w\d]+)/.exec(location.name.trim())
      if (!match) return []
      return [
        {
          id: uuidv7(),
          buildingCode: match[1],
          roomNumber: match[2],
          latitude: location.lat,
          longitude: location.lng,
          level: location.level[0],
          concept3dMapId: location.mapId,
          concept3dShape: location.shape == null ? null : JSON.stringify(location.shape),
          concept3dCategoryName: category.name,
          concept3dLocationId: location.id,
          concept3dCategoryId: location.catId,
          concept3dRoomId: location.mrkId,
          createdAt: now,
        },
      ]
    })
  })
  if (!rows.length) throw new Error('Concept3D returned no usable rooms.')

  // Concept3D can return the same room in multiple categories. Deduplicate by
  // (buildingCode, roomNumber) so the bulk insert doesn't violate the unique
  // index on those columns.
  const seen = new Set<string>()
  const uniqueRows = rows.filter((row) => {
    const key = `${row.buildingCode}|${row.roomNumber}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  await syncedDb(userId).transaction(async ({ drizzle }) => {
    // Durable Object SQLite allows at most 100 bound parameters per statement.
    // Each room currently uses 13; seven leaves room for a small schema change.
    for (let i = 0; i < uniqueRows.length; i += 7) {
      await drizzle
        .insert(room)
        .values(uniqueRows.slice(i, i + 7))
        .onConflictDoNothing()
    }
  })
  return { imported: uniqueRows.length }
}
