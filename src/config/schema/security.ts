import { z } from 'zod';
import { positive } from './common';

/** Response hardening values consumed by the middleware. */
export const securitySchema = z.object({ hstsMaxAgeSeconds: positive });
