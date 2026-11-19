/** Local playbook, pledge and clean-air-room state built from pure domain APIs. */
import { config } from '@/config';
import type { MessageKey } from '@/content/messages';
import { cubicMetres } from '@/data/parse';
import { communityTypeSchema, type CleanAirRoom, type CommunityType, type PlaybookStep } from '@/domain/community';
import { cleanAirRoom, playbookFor, playbookSourceFor, scaledWeeklyImpact } from '@/domain/community';
import type { Plan } from '@/domain/plan';
import type { PlanSource } from '@/domain/plan/sources';
import type { Profile } from '@/domain/profile';
import { useState } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { selected } from '@/ui/select';

/** The first validated community type is the neutral initial choice. */
const initialType = communityTypeSchema.options[0];
if (!initialType) throw new Error('No community types are configured');

/** Everything the Community screen needs to render and act. */
export interface CommunityController {
  type: CommunityType;
  households: number;
  pledges: number;
  steps: readonly PlaybookStep[];
  scaled: number;
  room: CleanAirRoom;
  source: PlanSource | undefined;
  noticeKey: MessageKey | null;
  chooseType: (value: string) => void;
  setHouseholds: (value: number) => void;
  addPledge: () => void;
  copyLetter: () => void;
  copyShare: () => void;
  printPoster: () => void;
}

/** Named text helpers for building a bounded local letter. */
interface LetterText {
  digest: string;
  steps: readonly PlaybookStep[];
  t: (key: MessageKey) => string;
  tk: (key: string) => string;
}

/** Builds a bounded letter from the plan digest and the selected steps. */
const letterFor = ({ digest, steps, t, tk }: LetterText): string =>
  [t('community.letter'), digest, ...steps.map((step) => `${tk(step.ownerKey)}: ${tk(step.taskKey)}`), t('app.notMedical')].join('\n\n');

/** Builds a short shareable note without names, coordinates or stored answers. */
const shareFor = (digest: string, t: (key: MessageKey) => string): string =>
  [t('community.title'), t('community.task.share'), digest].join('\n\n');

/** Copies text when the clipboard is available and reports success locally. */
const copyText = async (text: string, notify: (key: MessageKey) => void): Promise<void> => {
  const clipboard = navigator.clipboard;
  if (!clipboard) return;
  await clipboard.writeText(text);
  notify('community.copied');
};

/** Owns community selection, pledges, scaling and local sharing actions. */
export const useCommunity = (profile: Profile, plan: Plan | null): CommunityController => {
  const { t, tk } = useApp();
  const [type, setType] = useState<CommunityType>(initialType);
  const [households, setHouseholds] = useState(config.ui.defaultHouseholds);
  const [pledges, setPledges] = useState(0);
  const [noticeKey, setNoticeKey] = useState<MessageKey | null>(null);
  const steps = playbookFor(type);
  const source = playbookSourceFor(type);
  const scaled = plan ? scaledWeeklyImpact(plan.emissions.weeklyDelta, households) : 0;
  const volume = plan?.indoor.room.volume ?? config.math.defaultRoomVolume;
  const room = cleanAirRoom(cubicMetres(volume), cubicMetres(profile.home.purifierCadr));
  const chooseType = (value: string): void => {
    selected(communityTypeSchema, value, setType);
  };
  const addPledge = (): void => {
    setPledges((current) => current + 1);
  };
  const copyLetter = (): void => {
    if (plan) void copyText(letterFor({ digest: plan.digest, steps, t, tk }), setNoticeKey);
  };
  const copyShare = (): void => {
    if (plan) void copyText(shareFor(plan.digest, t), setNoticeKey);
  };
  return {
    type, households, pledges, steps, scaled, room, source, noticeKey,
    chooseType, setHouseholds, addPledge, copyLetter, copyShare,
    printPoster: (): void => { window.print(); },
  };
};
