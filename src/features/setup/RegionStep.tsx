'use client';

/** Chooses a named region or a reviewed custom coordinate pair. */
import { config } from '@/config';
import { regions } from '@/data';
import type { Profile } from '@/domain/profile';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Button } from '@/ui/Button';
import { NumberField, SelectField, TextField } from '@/ui/Controls';
import { useApp } from '@/features/app/AppProvider';
import { regionOptions, standardOptions } from './options';
import styles from './Setup.module.css';

type CustomRegion = NonNullable<Profile['customRegion']>;
type SetCustom = (patch: Partial<CustomRegion>) => void;

/** Finds the closest named region using only local arithmetic. */
const nearestRegion = (latitude: number, longitude: number): string | undefined => {
  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const region of regions) {
    const latitudeDelta = region.latitude - latitude;
    const longitudeDelta = region.longitude - longitude;
    const distance = latitudeDelta * latitudeDelta + longitudeDelta * longitudeDelta;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = region.id;
    }
  }
  return best;
};

/** Device geolocation is optional and never leaves the browser. */
const LocateControl = ({ onFound }: Readonly<{ onFound: (regionId: string) => void }>): ReactElement => {
  const { t } = useApp();
  const [notice, setNotice] = useState<string | null>(null);
  const locate = (): void => {
    if (!navigator.geolocation) {
      setNotice(t('setup.locateDenied'));
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const nearest = nearestRegion(position.coords.latitude, position.coords.longitude);
      if (!nearest) {
        setNotice(t('setup.locateDenied'));
        return;
      }
      onFound(nearest);
    }, (): void => { setNotice(t('setup.locateDenied')); });
  };
  return (
    <>
      <Button variant="secondary" onClick={locate}>
        {t('setup.locate')}
      </Button>
      {notice ? <p className={styles.note}>{notice}</p> : null}
    </>
  );
};

/** Reviewed manual coordinates for an unlisted region. */
const CustomFields = ({ custom, setCustom }: Readonly<{ custom: CustomRegion; setCustom: SetCustom }>): ReactElement => {
  const { t, tk } = useApp();
  return (
    <div className={styles.grid}>
      <NumberField id="custom-latitude" label={t('setup.latitude')} value={custom.latitude} min={-config.math.latitudeLimit} onChange={(value): void => { setCustom({ latitude: value }); }} />
      <NumberField id="custom-longitude" label={t('setup.longitude')} value={custom.longitude} min={-config.math.longitudeLimit} onChange={(value): void => { setCustom({ longitude: value }); }} />
      <NumberField id="custom-offset" label={t('setup.utcOffset')} value={custom.utcOffsetHours} min={config.math.minUtcOffsetHours} onChange={(value): void => { setCustom({ utcOffsetHours: value }); }} />
      <TextField id="custom-timezone" label={t('setup.timezone')} value={custom.timezone} onChange={(value): void => { setCustom({ timezone: value }); }} />
      <SelectField id="custom-standard" label={t('settings.standard')} value={custom.standardId} options={standardOptions(tk)} onChange={(value): void => { setCustom({ standardId: value }); }} />
    </div>
  );
};

/** Region selection with optional custom coordinates. */
export const RegionStep = (): ReactElement => {
  const { profile, t, tk, updateProfile } = useApp();
  const fallback = regions[0];
  if (!fallback) return <p>{t('app.error')}</p>;
  const custom: CustomRegion = profile.customRegion ?? {
    latitude: fallback.latitude,
    longitude: fallback.longitude,
    utcOffsetHours: fallback.utcOffsetHours,
    timezone: fallback.timezone,
    standardId: fallback.standardId,
  };
  const setCustom = (patch: Partial<CustomRegion>): void => {
    updateProfile((current) => ({ ...current, customRegion: { ...(current.customRegion ?? custom), ...patch } }));
  };
  return (
    <div className={styles.grid}>
      <p className={styles.why}>{t('setup.regionWhy')}</p>
      <SelectField
        id="setup-region"
        label={t('setup.regionLabel')}
        value={profile.regionId}
        options={regionOptions(tk)}
        onChange={(value): void => { updateProfile((current) => ({ ...current, regionId: value })); }}
      />
      <LocateControl onFound={(regionId): void => { updateProfile((current) => ({ ...current, regionId })); }} />
      {profile.regionId === 'custom' ? <CustomFields custom={custom} setCustom={setCustom} /> : null}
    </div>
  );
};
