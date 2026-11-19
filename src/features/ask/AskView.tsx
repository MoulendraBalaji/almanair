'use client';

/** Consented chat with a deterministic local guide answer as the default. */
import { config } from '@/config';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { SafeText } from '@/ui/SafeText';
import { SourceList } from '@/ui/SourceList';
import { Textarea } from '@/ui/Textarea';
import type { AnswerDraft } from './answer';
import { useAsk } from './useAsk';
import styles from './Ask.module.css';

/** Explicit opt-in before any question can leave the device. */
const ConsentGate = ({ onChoose }: Readonly<{ onChoose: (allow: boolean) => void }>): ReactElement => {
  const { t } = useApp();
  return (
    <Panel title={t('ask.consentTitle')} tone="caution">
      <p>{t('ask.consent')}</p>
      <div className={styles.buttons}>
        <Button onClick={(): void => { onChoose(true); }}>{t('ask.allow')}</Button>
        <Button variant="secondary" onClick={(): void => { onChoose(false); }}>{t('ask.localOnly')}</Button>
      </div>
    </Panel>
  );
};

/** Example questions drawn from the message catalogue. */
const Suggestions = ({ onSelect }: Readonly<{ onSelect: (question: string) => void }>): ReactElement => {
  const { t, tk } = useApp();
  const questions = Array.from(
    { length: config.ui.suggestedQuestions },
    (_unused, index) => tk(`ask.suggestion${String(index + 1)}`),
  );
  return (
    <div className={styles.suggestions}>
      <p>{t('ask.suggested')}</p>
      <div className={styles.buttons}>
        {questions.map((question) => (
          <Button key={question} variant="quiet" onClick={(): void => { onSelect(question); }}>
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
};

/** Question input, suggested prompts and the Plan Digest disclosure. */
const QuestionForm = ({
  question,
  digest,
  busy,
  onQuestion,
  onAsk,
}: Readonly<{
  question: string;
  digest: string;
  busy: boolean;
  onQuestion: (value: string) => void;
  onAsk: (value: string) => void;
}>): ReactElement => {
  const { t } = useApp();
  return (
    <>
      <form onSubmit={(event): void => { event.preventDefault(); onAsk(question); }}>
        <Textarea
          id="ask-question"
          label={t('ask.subtitle')}
          value={question}
          placeholder={t('ask.placeholder')}
          maxLength={config.chat.maxQuestionChars}
          onChange={onQuestion}
        />
        <div className={styles.buttons}>
          <Button type="submit" disabled={busy}>{busy ? t('ask.thinking') : t('ask.send')}</Button>
        </div>
      </form>
      <Suggestions onSelect={onAsk} />
      <details className={styles.digest}>
        <summary>{t('ask.basedOn')}</summary>
        <SafeText text={digest} />
      </details>
    </>
  );
};

/** Answer text, provenance notice and verified citations. */
const Answer = ({ draft }: Readonly<{ draft: AnswerDraft }>): ReactElement => {
  const { t } = useApp();
  return (
    <Panel title={t('ask.subtitle')}>
      <p className={styles.notice}>{t(draft.noticeKey)}</p>
      {draft.paragraphs.map((paragraph, index) => <SafeText key={index} text={paragraph} />)}
      <SourceList sources={draft.sources} title={t('app.source')} />
    </Panel>
  );
};

/** Composes the consent gate, question form, digest and answer. */
export const AskView = (): ReactElement => {
  const { plan, profile, t } = useApp();
  const { gateOpen, question, draft, busy, choose, setQuestion, ask } = useAsk(plan, profile.preferences.chatConsent);
  if (!plan) return <p>{t('app.empty')}</p>;
  return (
    <div className={styles.view}>
      <Panel title={t('ask.title')}>
        <p>{t('ask.subtitle')}</p>
        {gateOpen ? <ConsentGate onChoose={choose} /> : null}
        <QuestionForm
          question={question}
          digest={plan.digest}
          busy={busy}
          onQuestion={setQuestion}
          onAsk={ask}
        />
      </Panel>
      {draft ? <Answer draft={draft} /> : null}
    </div>
  );
};
