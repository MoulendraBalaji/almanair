/** Local copy and print actions for the current source-free Plan Digest. */
import type { MessageKey } from '@/content/messages';
import type { Plan } from '@/domain/plan';
import { useState } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { copyText } from '@/infra/clipboard';

/** Everything the share panel needs to act and report locally. */
export interface ShareController {
  notice: MessageKey | null;
  copyDigest: () => void;
  copySummary: () => void;
  printPlan: () => void;
}

type Translate = (key: MessageKey) => string;

/** Adds human-verifiable citations to the private digest without adding personal data. */
const summaryFor = (plan: Plan, t: Translate): string => {
  const gap = t('digest.separator');
  const sources = plan.sources.map((source) => `${source.title} — ${source.url}`);
  return [t('share.title'), plan.digest, t('learn.sources'), ...sources, t('app.notMedical')].join(`${gap}${gap}`);
};

/** Reports copy success without leaving the device. */
const copyWithNotice = async (text: string, setNotice: (key: MessageKey) => void): Promise<void> => {
  setNotice((await copyText(text)) ? 'share.copied' : 'share.failed');
};

/** Composes bounded, translated text for clipboard and print actions. */
export const useShare = (plan: Plan | null): ShareController => {
  const { t } = useApp();
  const [notice, setNotice] = useState<MessageKey | null>(null);
  return {
    notice,
    copyDigest: (): void => {
      if (plan) void copyWithNotice(plan.digest, setNotice);
    },
    copySummary: (): void => {
      if (plan) void copyWithNotice(summaryFor(plan, t), setNotice);
    },
    printPlan: (): void => {
      window.print();
    },
  };
};
