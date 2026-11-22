/** Last four golden profiles: electric walk, bus/N95, custom coastal and large household. */
import { baseProfile, type GoldenProfile } from './base';

const defaults = baseProfile();

export const lastProfiles: readonly GoldenProfile[] = [
  {
    id: 'kathmandu-electric-walk',
    retrievalQuery: 'electric cooking ventilation',
    profile: {
      ...baseProfile(),
      locale: 'hi',
      regionId: 'kathmandu',
      household: [{ id: 'older-1', ageBand: 'older', flags: ['older', 'cardiac'] }],
      home: {
        ...defaults.home,
        type: 'house',
        rooms: [{ id: 'room-1', name: 'living', volume: 50 }],
        windowHabit: 'often',
        cookingFuel: 'electric',
        heatingFuel: 'electric',
        tenure: 'own',
      },
      mobility: { modes: ['walk'], schoolRunKm: 0, commuteKm: 0 },
      budgetTier: 'medium',
      minutesPerDay: 45,
      preferences: { ...defaults.preferences, standardId: 'us-epa', diurnalProfileId: 'none' },
    },
  },
  {
    id: 'beijing-bus-n95',
    retrievalQuery: 'bus commute PM25 mask',
    profile: {
      ...baseProfile(),
      regionId: 'beijing',
      household: [{ id: 'adult-1', ageBand: 'adult', flags: ['pregnancy'] }],
      home: {
        ...defaults.home,
        rooms: [{ id: 'room-1', name: 'living', volume: 38 }],
        hasPurifier: true,
        purifierCadr: 60,
        hasMask: true,
        maskClass: 'n95',
        maskWearingShare: 0.5,
      },
      mobility: { modes: ['bus', 'walk'], schoolRunKm: 1, commuteKm: 8 },
      budgetTier: 'low',
      minutesPerDay: 75,
      preferences: { ...defaults.preferences, standardId: 'us-epa' },
    },
  },
  {
    id: 'custom-coastal-high',
    retrievalQuery: 'wildfire smoke windows',
    profile: {
      ...baseProfile(),
      locale: 'es',
      regionId: 'custom',
      customRegion: {
        latitude: 37.7749,
        longitude: -122.4194,
        utcOffsetHours: -8,
        timezone: 'America/Los_Angeles',
        standardId: 'us-epa',
      },
      household: [
        { id: 'adult-1', ageBand: 'adult', flags: [] },
        { id: 'older-1', ageBand: 'older', flags: ['older'] },
      ],
      home: {
        ...defaults.home,
        type: 'house',
        rooms: [
          { id: 'room-1', name: 'living', volume: 70 },
          { id: 'room-2', name: 'bedroom', volume: 50 },
        ],
        windowHabit: 'often',
        cookingFuel: 'biomass',
        heatingFuel: 'biomass',
        tenure: 'own',
      },
      mobility: { modes: ['car'], schoolRunKm: 0, commuteKm: 20 },
      budgetTier: 'high',
      minutesPerDay: 100,
      preferences: { ...defaults.preferences, standardId: 'us-epa', diurnalProfileId: 'all-day' },
    },
  },
  {
    id: 'jaipur-large-free',
    retrievalQuery: 'biomass cooking child health',
    profile: {
      ...baseProfile(),
      locale: 'hi',
      regionId: 'jaipur',
      household: [
        { id: 'adult-1', ageBand: 'adult', flags: [] },
        { id: 'child-1', ageBand: 'child', flags: ['child'] },
        { id: 'child-2', ageBand: 'child', flags: ['child'] },
        { id: 'older-1', ageBand: 'older', flags: ['older', 'respiratory'] },
      ],
      home: {
        ...defaults.home,
        type: 'house',
        rooms: [
          { id: 'room-1', name: 'kitchen', volume: 40 },
          { id: 'room-2', name: 'bedroom', volume: 30 },
        ],
        cookingFuel: 'biomass',
        heatingFuel: 'biomass',
        hasMask: true,
        maskClass: 'cloth',
        maskWearingShare: 0.2,
      },
      mobility: { modes: ['walk'], schoolRunKm: 2, commuteKm: 0 },
      budgetTier: 'free',
      minutesPerDay: 80,
    },
  },
];
