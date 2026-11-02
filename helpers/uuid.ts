// New records use time-ordered ids. The uuid package's v7 is RFC 9562
// UUID v7: a 48-bit unix-millisecond timestamp followed by random bits, so a
// table stays in creation order and inserts land at the end of the btree.
// Re-export it so every call site and the biome rule name one function.
export { v7 as uuidv7 } from 'uuid'
