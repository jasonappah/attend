import type { Logger } from "pino";
import type { Db } from "~/db";
import { randomID } from "~/zero/randomID";
import { room, Concept3DShapeSchema, type Concept3DShape } from "~/db/schema";

const getBatchCategories = async (
  categoryIds: number[],
  mapId: number,
): Promise<Concept3DCategoryWithChildren[]> => {
  const categories = await fetch(
    `https://api.concept3d.com/categories/${categoryIds.join(
      ",",
    )}?map=${mapId}&batch&children&key=${process.env.CONCEPT3D_API_KEY}`,
  ).then((res) => res.json() as Promise<Concept3DCategoryWithChildren[]>);
  return categories;
};
const parseLocationData = (location: Concept3DLocation, logger: Logger) => {
  const roomCodeRegex = /([\w\d]{2,})\s*(\d+\.[\w\d]+)/;
  const match = location.name.trim().match(roomCodeRegex);
  if (!match) {
    logger.warn(`Failed to parse room name: ${location.name}`);
    return;
  }

  const [, buildingCode, roomNumber] = match;

  const [level] = location.level;

  const parsedShape = Concept3DShapeSchema.safeParse(location.shape);

  if (!parsedShape.success) {
    logger.warn(
      `Failed to parse shape for ${location.name}, error: ${parsedShape.error}, shape: ${location.shape}`,
    );
    return;
  }
  const shape = parsedShape.data;

  return {
    buildingCode,
    roomNumber,
    latitude: location.lat,
    longitude: location.lng,
    level,
    concept3dMapId: location.mapId,
    concept3dShape: shape,
    concept3dCategoryId: location.catId,
    concept3dMarkId: location.mrkId,
    concept3dLocationId: location.id,
  };
};
export const UTD_CONCEPT3D_MAP_ID = 1772;
export const syncRoomsFromConcept3dMap = async (
  mapId: number,
  db: Db,
  logger: Logger,
) => {
  const categoryIds = Object.values(
    await fetch(
      `https://api.concept3d.com/categories?childIds&map=${mapId}&children&noPrivates&key=${process.env.CONCEPT3D_API_KEY}`,
    ).then((res) => res.json() as Promise<Record<string, number[]>>),
  ).flat();
  const dedupedCategoryIds = Array.from(new Set(categoryIds));

  const categories = await getBatchCategories(dedupedCategoryIds, mapId);
  
  const buildingRegex = /^.*\(([\w\d]*)\)$/;
  const disallowedBuildingAbbrvs = ["AED", "AST", "ATM", "OSV"];
  const buildingCategories = categories
    .map((c) => ({ category: c, match: c.name.trim().match(buildingRegex) }))
    .filter(
      ({ match }) => match && !disallowedBuildingAbbrvs.includes(match[1]),
    );


  for (const { category } of buildingCategories) {
    const rooms = category.children.locations
      .map((r) => parseLocationData(r, logger))
      .filter((r) => !!r);

    await db
      .insert(room)
      .values(
        rooms.map((r) => ({
          ...r,
          id: randomID(),
          concept3dCategoryName: category.name,
        })),
      )
      .onConflictDoNothing();
  }
};

export type Concept3DLocation = {
  catId: number;
  altitude: number;
  lat: number;
  lng: number;
  mapId: number;
  id: number;
  icon: string;
  level: Array<number>;
  location_open: string;
  mrkId: number;
  name: string;
  reference: string;
  shape: Concept3DShape;
};

export type Concept3DCategoryWithChildren = {
  name: string;
  hidden: number;
  type: string;
  weight: number;
  private: number;
  lat: number;
  lng: number;
  level: number;
  schedule: any;
  floor_level: number;
  labels: string;
  locationDisplay: string;
  onByDefault: number;
  catId: number;
  mapId: number;
  parent: number;
  markerAlt: number;
  mapAlt: number;
  children: {
    locations: Array<Concept3DLocation>;
  };
};
