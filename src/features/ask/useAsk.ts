/** Local state and behaviour for one consented question. */
import type { Plan } from '@/domain/plan';
import { useState } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { requestAnswer, type AnswerDraft } from './answer';

/** Everything the Ask screen needs to render and submit. */
export interface AskController {
  gateOpen: boolean;
  question: string;
  draft: AnswerDraft | null;
  busy: boolean;
  choose: (allow: boolean) => void;
  setQuestion: (value: string) => void;
  ask: (value: string) => void;
}

/** Owns consent, the question, the answer and the pending state. */
export const useAsk = (plan: Plan | null, initialConsent: boolean): AskController => {
  const { updateProfile } = useApp();
  const [consent, setConsent] = useState(initialConsent);
  const [gateOpen, setGateOpen] = useState(!initialConsent);
  const [question, setQuestion] = useState('');
  const [draft, setDraft] = useState<AnswerDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const choose = (allow: boolean): void => {
    setConsent(allow);
    setGateOpen(false);
    updateProfile((current) => ({ ...current, preferences: { ...current.preferences, chatConsent: allow } }));
  };
  const submit = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (trimmed === '' || !plan) return;
    setQuestion(trimmed);
    setBusy(true);
    try {
      setDraft(await requestAnswer(trimmed, plan, consent));
    } finally {
      setBusy(false);
    }
  };
  return {
    gateOpen,
    question,
    draft,
    busy,
    choose,
    setQuestion,
    ask: (value): void => { void submit(value); },
  };
};
