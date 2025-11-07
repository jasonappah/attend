import { drizzleZeroConfig } from "drizzle-zero";
import * as drizzleSchema from "../db/schema";

export const schema = drizzleZeroConfig(drizzleSchema, {});