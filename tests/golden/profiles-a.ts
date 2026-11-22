/** First four golden profiles: India, family biomass, affluent purifier and shared kerosene. */
import { baseProfile, type GoldenProfile } from './base';

const defaults = baseProfile();

export const firstProfiles: readonly GoldenProfile[] = [
  {
    id: 'delhi-default',
    retrievalQuery: 'winter smog ventilation',
    profile: baseProfile(),
  },
  {
    id: 'mumbai-family-biomass',
    retrievalQuery: 'cooking smoke mask',
    profile: {
      ...baseProfile(),
      locale: 'hi',
      regionId: 'mumbai',
      household: [
        { id: 'adult-1', ageBand: 'adult', flags: [] },
        { id: 'child-1', ageBand: 'child', flags: ['child'] },
        { id: 'older-1', ageBand: 'older', flags: ['older'] },
      ],
      home: {
        ...defaults.home,
        rooms: [
          { id: 'room-1', name: 'living', volume: 45 },
          { id: 'room-2', name: 'bedroom', volume: 30 },
        ],
        windowHabit: 'rarely',
        cookingFuel: 'biomass',
        heatingFuel: 'kerosene',
        hasMask: true,
        maskClass: 'cloth',
        maskWearingShare: 0.3,
      },
      mobility: { modes: ['bus', 'walk'], schoolRunKm: 3, commuteKm: 6 },
      budgetTier: 'low',
      minutesPerDay: 90,
      preferences: {
        ...defaults.preferences,
        theme: 'dark',
        textSize: 'large',
        contrast: true,
        reducedMotion: true,
        diurnalProfileId: 'all-day',
      },
    },
  },
  {
    id: 'lahore-affluent-purifier',
    retrievalQuery: 'N95 filtration purifier',
    profile: {
      ...baseProfile(),
      regionId: 'lahore',
      household: [
        { id: 'adult-1', ageBand: 'adult', flags: ['respiratory'] },
        { id: 'adult-2', ageBand: 'adult', flags: [] },
      ],
      home: {
        ...defaults.home,
        type: 'house',
        rooms: [
          { id: 'room-1', name: 'living', volume: 60 },
          { id: 'room-2', name: 'bedroom', volume: 40 },
          { id: 'room-3', name: 'study', volume: 35 },
        ],
        windowHabit: 'often',
        cookingFuel: 'gas',
        heatingFuel: 'gas',
        hasPurifier: true,
        purifierCadr: 120,
        hasMask: true,
        maskClass: 'n95',
        maskWearingShare: 1,
        tenure: 'own',
      },
      mobility: { modes: ['car'], schoolRunKm: 2, commuteKm: 14 },
      budgetTier: 'high',
      minutesPerDay: 120,
      preferences: { ...defaults.preferences, standardId: 'us-epa' },
    },
  },
  {
    id: 'dhaka-shared-kerosene',
    retrievalQuery: 'kerosene indoor air',
    profile: {
      ...baseProfile(),
      locale: 'es',
      regionId: 'dhaka',
      household: [
        { id: 'child-1', ageBand: 'child', flags: ['child'] },
        { id: 'adult-1', ageBand: 'adult', flags: [] },
      ],
      home: {
        ...defaults.home,
        type: 'shared',
        rooms: [{ id: 'room-1', name: 'shared', volume: 25 }],
        windowHabit: 'rarely',
        cookingFuel: 'kerosene',
        heatingFuel: 'biomass',
      },
      mobility: { modes: ['bicycle'], schoolRunKm: 5, commuteKm: 4 },
      budgetTier: 'medium',
      minutesPerDay: 60,
      preferences: { ...defaults.preferences, standardId: 'us-epa', theme: 'light', diurnalProfileId: 'night' },
    },
  },
];
