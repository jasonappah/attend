import pino from 'pino'
import pretty from 'pino-pretty'
import { env } from '~/env'

export const logger = pino(env.NODE_ENV === 'production' ? undefined : pretty())
