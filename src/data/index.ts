import { z } from 'zod';
import factorsRaw from './factors.json';
import standardsRaw from './standards.json';
import regionsRaw from './regions.json';
import diurnalRaw from './diurnal-profiles.json';
import guidanceRaw from './guidance.json';
import solarRaw from './solar-vectors.json';
import solarConstantsRaw from './solar-constants.json';
import tiersRaw from './local-tiers.json';
import playbooksRaw from './community-playbooks.json';
import actionsRaw from './generated/actions.json';
import knowledgeRaw from './generated/knowledge-index.json';
import { actionSchema, knowledgeIndexSchema, localTierSchema, playbookSchema } from './catalogue-schema';
import { diurnalProfileSchema, factorSchema, guidanceSchema, regionSchema, solarVectorSchema, standardSchema } from './schema';

/** Validated emission, exposure and indoor-air factors. */
export const factors = z.array(factorSchema).parse(factorsRaw);
/** Validated AQI scales. */
export const standards = z.array(standardSchema).parse(standardsRaw);
/** Validated selectable regions. */
export const regions = z.array(regionSchema).parse(regionsRaw);
/** Validated diurnal shapes. */
export const diurnalProfiles = z.array(diurnalProfileSchema).parse(diurnalRaw);
/** Validated official guidance pointers. */
export const guidance = z.array(guidanceSchema).parse(guidanceRaw);
/** Validated solar regression vectors. */
export const solarVectors = z.array(solarVectorSchema).parse(solarRaw);
/** Validated constants of the NOAA solar position algorithm. */
export const solarConstants = z.array(factorSchema).parse(solarConstantsRaw);
/** Validated local-pollutant tiers. */
export const localTiers = z.array(localTierSchema).parse(tiersRaw);
/** Validated community playbooks. */
export const playbooks = z.array(playbookSchema).parse(playbooksRaw);
/** Validated action catalogue. */
export const actions = z.array(actionSchema).parse(actionsRaw);
/** Validated retrieval index. */
export const knowledgeIndex = knowledgeIndexSchema.parse(knowledgeRaw);

/** Finds a factor by id; a missing id is a programmer error caught by tests. */
export const factorById = (id: string): (typeof factors)[number] => {
  const found = factors.find((factor) => factor.id === id);
  if (!found) throw new Error(`Unknown factor: ${id}`);
  return found;
};

/** Finds a named solar constant; a missing id fails fast at development time. */
export const solarConstant = (id: string): number => {
  const found = solarConstants.find((constant) => constant.id === id);
  if (found?.value === undefined) throw new Error(`Unknown solar constant: ${id}`);
  return found.value;
};

/** Finds a standard by id. */
export const standardById = (id: string): (typeof standards)[number] => {
  const found = standards.find((standard) => standard.id === id);
  if (!found) throw new Error(`Unknown standard: ${id}`);
  return found;
};
