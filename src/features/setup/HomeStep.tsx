'use client';

/** Room sizes, fuel choices and clean-air equipment. */
import { homeSchema, type Profile, type Room } from '@/domain/profile';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { Button } from '@/ui/Button';
import { CheckboxField, NumberField, SelectField, TextField } from '@/ui/Controls';
import { fuelOptions, homeTypeOptions, maskOptions, tenureOptions, windowOptions } from './options';
import { selected } from '@/ui/select';
import styles from './Setup.module.css';

type Home = Profile['home'];
type SetHome = (patch: Partial<Home>) => void;

/** One editable room volume. */
const RoomEditor = ({
  room,
  onUpdate,
  onRemove,
}: Readonly<{
  room: Room;
  onUpdate: (id: string, patch: Partial<Room>) => void;
  onRemove: (id: string) => void;
}>): ReactElement => {
  const { t } = useApp();
  return (
    <li className={styles.item}>
      <TextField id={`room-name-${room.id}`} label={t('setup.roomName')} value={room.name} onChange={(value): void => { onUpdate(room.id, { name: value }); }} />
      <NumberField
        id={`room-volume-${room.id}`}
        label={t('setup.roomVolume')}
        value={room.volume}
        min={0}
        onChange={(value): void => {
          if (value > 0) onUpdate(room.id, { volume: value });
        }}
      />
      <Button variant="quiet" onClick={(): void => { onRemove(room.id); }}>
        {t('app.remove')}
      </Button>
    </li>
  );
};

/** The editable room list and its add action. */
const RoomList = ({
  rooms,
  onUpdate,
  onRemove,
  onAdd,
}: Readonly<{
  rooms: readonly Room[];
  onUpdate: (id: string, patch: Partial<Room>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}>): ReactElement => {
  const { t } = useApp();
  return (
    <>
      <ul className={styles.list}>
        {rooms.map((room) => (
          <RoomEditor key={room.id} room={room} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
      </ul>
      <Button variant="secondary" onClick={onAdd}>
        {t('setup.addRoom')}
      </Button>
    </>
  );
};

/** Structural choices that shape the clean-air model. */
const HomeBasics = ({ home, setHome }: Readonly<{ home: Home; setHome: SetHome }>): ReactElement => {
  const { t, tk } = useApp();
  return (
    <>
      <p className={styles.why}>{t('setup.homeWhy')}</p>
      <SelectField id="home-type" label={t('setup.homeType')} value={home.type} options={homeTypeOptions(tk)} onChange={(value): void => { selected(homeSchema.shape.type, value, (type): void => { setHome({ type }); }); }} />
      <SelectField id="home-windows" label={t('setup.windowHabit')} value={home.windowHabit} options={windowOptions(tk)} onChange={(value): void => { selected(homeSchema.shape.windowHabit, value, (windowHabit): void => { setHome({ windowHabit }); }); }} />
      <SelectField id="home-cooking" label={t('setup.cookingFuel')} value={home.cookingFuel} options={fuelOptions(tk)} onChange={(value): void => { selected(homeSchema.shape.cookingFuel, value, (cookingFuel): void => { setHome({ cookingFuel }); }); }} />
      <SelectField id="home-heating" label={t('setup.heatingFuel')} value={home.heatingFuel} options={fuelOptions(tk)} onChange={(value): void => { selected(homeSchema.shape.heatingFuel, value, (heatingFuel): void => { setHome({ heatingFuel }); }); }} />
    </>
  );
};

/** Optional protective equipment and tenure. */
const HomeSafety = ({ home, setHome }: Readonly<{ home: Home; setHome: SetHome }>): ReactElement => {
  const { t, tk } = useApp();
  return (
    <>
      <CheckboxField id="home-purifier" label={t('setup.purifier')} checked={home.hasPurifier} onChange={(checked): void => { setHome({ hasPurifier: checked }); }} />
      {home.hasPurifier ? <NumberField id="home-cadr" label={t('setup.cadr')} value={home.purifierCadr} min={0} onChange={(value): void => { setHome({ purifierCadr: value }); }} /> : null}
      <CheckboxField id="home-mask" label={t('setup.mask')} checked={home.hasMask} onChange={(checked): void => { setHome({ hasMask: checked }); }} />
      {home.hasMask ? <SelectField id="home-mask-class" label={t('setup.maskClass')} value={home.maskClass} options={maskOptions(tk)} onChange={(value): void => { selected(homeSchema.shape.maskClass, value, (maskClass): void => { setHome({ maskClass }); }); }} /> : null}
      {home.hasMask ? <NumberField id="home-mask-wearing-share" label={t('setup.maskWearingShare')} value={home.maskWearingShare} min={0} onChange={(value): void => { setHome({ maskWearingShare: Math.min(1, Math.max(0, value)) }); }} /> : null}
      <SelectField id="home-tenure" label={t('setup.tenure')} value={home.tenure} options={tenureOptions(tk)} onChange={(value): void => { selected(homeSchema.shape.tenure, value, (tenure): void => { setHome({ tenure }); }); }} />
    </>
  );
};

/** Home form with an explicit room list. */
export const HomeStep = (): ReactElement => {
  const { profile, updateProfile } = useApp();
  const home = profile.home;
  const setHome = (patch: Partial<Home>): void => {
    updateProfile((current) => ({ ...current, home: { ...current.home, ...patch } }));
  };
  const updateRoom = (id: string, patch: Partial<Room>): void => {
    setHome({ rooms: home.rooms.map((room) => (room.id === id ? { ...room, ...patch } : room)) });
  };
  const addRoom = (): void => {
    setHome({ rooms: [...home.rooms, { id: `room-${String(home.rooms.length + 1)}`, name: '', volume: 0 }] });
  };
  const removeRoom = (id: string): void => {
    if (home.rooms.length > 1) setHome({ rooms: home.rooms.filter((room) => room.id !== id) });
  };
  return (
    <div className={styles.grid}>
      <HomeBasics home={home} setHome={setHome} />
      <HomeSafety home={home} setHome={setHome} />
      <RoomList rooms={home.rooms} onUpdate={updateRoom} onRemove={removeRoom} onAdd={addRoom} />
    </div>
  );
};
