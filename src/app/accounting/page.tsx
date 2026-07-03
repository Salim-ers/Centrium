'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/AppShell';
import { useAppT, useLocale } from '@/lib/i18n/LocaleProvider';
import { useOrganization } from '@/lib/auth/context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader, AppCard } from '@/components/app';
import {
  askAssistant,
  QUICK_PROMPTS,
  type AssistantBlock,
  type AssistantMessage,
} from '@/lib/ai/accounting-assistant';

const TONE_STYLES: Record<string, string> = {
  good: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  warn: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  bad: 'bg-red-500/10 text-red-300 border-red-500/20',
  neutral: 'surface-2 text-muted-foreground border-hairline',
};

export default function AccountingAssistantPage() {
  const t = useAppT();
  const { locale } = useLocale();
  const { branding } = useOrganization();
  const orgBrand = branding?.brandName ?? branding?.name ?? 'Centrium';
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Message d'accueil
    setMessages([
      {
        role: 'assistant',
        content: t.pages.accounting.greeting,
        timestamp: Date.now(),
      },
    ]);
  }, [t.pages.accounting.greeting]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || thinking) return;

    setMessages((m) => [...m, { role: 'user', content: q, timestamp: Date.now() }]);
    setInput('');
    setThinking(true);

    try {
      const result = await askAssistant(q, { locale, orgBrand });
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: result.text, blocks: result.blocks, timestamp: Date.now() },
      ]);
    } catch (e) {
      console.error(e);
      toast.error(t.toasts.error_generic);
    } finally {
      setThinking(false);
    }
  }

  function copyBlock(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success(t.toasts.copied),
      () => toast.error(t.toasts.error_generic),
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow={t.pages.accounting.eyebrow}
        title={
          <>
            {t.pages.accounting.title_a}{' '}
            <span className="qc-italic-accent font-editorial italic">{t.pages.accounting.title_b}</span>
          </>
        }
        description={t.pages.accounting.description}
        actions={
          <Badge variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/20">
            <Sparkles className="h-3 w-3" />
            {t.pages.accounting.ai_mock_badge}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Chat */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
        <AppCard variant="luminous" tone="violet" className="h-[70vh]">
          <div className="flex flex-col h-[70vh]">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-6 py-4 space-y-6"
            >
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} onCopy={copyBlock} />
              ))}
              {thinking && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 text-muted-foreground text-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-qc-gradient">
                    <Bot className="h-4 w-4 text-white" />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-violet-glow animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </span>
                  {t.actions.loading}
                </motion.div>
              )}
            </div>

            <div className="border-t border-hairline p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex gap-2"
              >
                <input
                  className="flex h-10 flex-1 rounded-lg border border-hairline surface-1 px-3 py-2 text-sm focus:border-violet-glow/50 focus:outline-none"
                  placeholder={t.pages.accounting.chat_placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={thinking}
                />
                <Button type="submit" disabled={thinking || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </AppCard>
        </motion.div>

        {/* Quick prompts */}
        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
          className="space-y-3"
        >
          <Card className="qc-premium rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t.pages.accounting.quick_questions}</CardTitle>
              <CardDescription className="text-xs">{t.pages.accounting.one_click_hint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {QUICK_PROMPTS.map((p) => {
                const labelByKey: Record<string, string> = {
                  overview: t.pages.accounting.q_overview,
                  overdue_invoices: t.pages.accounting.q_overdue_invoices,
                  treasury_30: t.pages.accounting.q_treasury_30,
                  cra_to_validate: t.pages.accounting.q_cra_to_validate,
                  cra_not_invoiced: t.pages.accounting.q_cra_not_invoiced,
                  vat_quarter: t.pages.accounting.q_vat_quarter,
                  draft_followup: t.pages.accounting.q_draft_followup,
                  top_clients: t.pages.accounting.q_top_clients,
                  top_consultants: t.pages.accounting.q_top_consultants,
                  dso: t.pages.accounting.q_dso,
                  aging: t.pages.accounting.q_aging,
                  forecast_90: t.pages.accounting.q_forecast_90,
                  win_rate: t.pages.accounting.q_win_rate,
                  pipeline_value: t.pages.accounting.q_pipeline_value,
                };
                // Question envoyée au chat — affichée dans la bulle utilisateur,
                // donc DOIT être dans la locale active (sinon une bulle EN affiche
                // du FR). Le detectIntent comprend les 2 langues, donc on peut
                // localement choisir la formulation la plus naturelle dans chaque
                // langue ; la sémantique est préservée.
                const questionsFr: Record<string, string> = {
                  overview: "Donne-moi une vue d'ensemble comptable",
                  overdue_invoices: 'Quelles factures sont en retard ?',
                  treasury_30: 'Fais-moi une prévi de trésorerie sur 30 jours',
                  cra_to_validate: 'Quels CRA sont à valider ?',
                  cra_not_invoiced: 'Quels CRA validés ne sont pas encore facturés ?',
                  vat_quarter: 'Calcule la TVA du trimestre',
                  draft_followup: 'Rédige un email de relance pour la facture la plus en retard',
                  top_clients: 'Qui sont mes top clients ?',
                  top_consultants: 'Quels sont mes top consultants ?',
                  dso: 'Calcule mon DSO',
                  aging: 'Montre-moi la balance âgée',
                  forecast_90: 'Prévi de CA sur les 90 prochains jours',
                  win_rate: 'Quel est mon taux de gain commercial ?',
                  pipeline_value: 'Quelle est la valeur de mon pipeline ?',
                };
                const questionsEn: Record<string, string> = {
                  overview: 'Give me an accounting overview',
                  overdue_invoices: 'Which invoices are overdue?',
                  treasury_30: 'Cash flow forecast for the next 30 days',
                  cra_to_validate: 'Which timesheets need to be validated?',
                  cra_not_invoiced: 'Which validated timesheets are not yet invoiced?',
                  vat_quarter: 'Compute the quarterly VAT',
                  draft_followup: 'Draft a follow-up email for the most overdue invoice',
                  top_clients: 'Who are my top clients?',
                  top_consultants: 'Who are my top consultants?',
                  dso: 'Compute my DSO',
                  aging: 'Show me the aging report',
                  forecast_90: 'Revenue forecast for the next 90 days',
                  win_rate: 'What is my sales win rate?',
                  pipeline_value: 'What is my pipeline value?',
                };
                const localizedQuestion =
                  (locale === 'en' ? questionsEn : questionsFr)[p.key] ?? p.question;
                return (
                  <Button
                    key={p.key}
                    variant="outline"
                    className="w-full justify-start text-xs h-auto py-2"
                    onClick={() => send(localizedQuestion)}
                    disabled={thinking}
                  >
                    <Sparkles className="h-3 w-3 shrink-0" style={{ color: '#e11d74' }} />
                    <span className="text-left">{labelByKey[p.key] ?? p.label}</span>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="qc-premium rounded-2xl">
            <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">{t.pages.accounting.to_know_title}</p>
              <p>{t.pages.accounting.to_know_body}</p>
            </CardContent>
          </Card>
        </motion.aside>
      </div>
    </AppShell>
  );
}

function MessageBubble({
  message,
  onCopy,
}: {
  message: AssistantMessage;
  onCopy: (text: string) => void;
}) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, x: 12 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex justify-end"
      >
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-violet-glow/20 border border-violet-glow/30 px-4 py-2.5 text-sm">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex gap-3"
    >
      <div className="shrink-0 h-8 w-8 rounded-full bg-qc-gradient flex items-center justify-center">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 max-w-[85%] space-y-3">
        <p className="text-sm leading-relaxed">{message.content}</p>
        {message.blocks && message.blocks.length > 0 && (
          <div className="space-y-2">
            {renderKpiGrid(message.blocks)}
            {message.blocks
              .filter((b) => b.type !== 'kpi')
              .map((b, i) => (
                <AssistantBlockView key={i} block={b} onCopy={onCopy} />
              ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function renderKpiGrid(blocks: AssistantBlock[]) {
  const kpis = blocks.filter((b): b is Extract<AssistantBlock, { type: 'kpi' }> => b.type === 'kpi');
  if (kpis.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {kpis.map((k, i) => (
        <div
          key={i}
          className={`rounded-lg border p-3 ${TONE_STYLES[k.tone ?? 'neutral']}`}
        >
          <div className="text-[9px] uppercase tracking-widest opacity-70">{k.label}</div>
          <div className="text-lg font-bold mt-0.5">{k.value}</div>
        </div>
      ))}
    </div>
  );
}

function AssistantBlockView({
  block,
  onCopy,
}: {
  block: AssistantBlock;
  onCopy: (text: string) => void;
}) {
  if (block.type === 'list') {
    return (
      <div className="rounded-lg border border-hairline surface-1 p-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          {block.title}
        </div>
        <ul className="space-y-1">
          {block.items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover-surface transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate flex items-center gap-2">
                  {it.tone === 'bad' && <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />}
                  {it.tone === 'good' && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                  )}
                  {it.label}
                </div>
                {it.sub && <div className="text-[11px] text-muted-foreground">{it.sub}</div>}
              </div>
              {it.value && <span className="text-sm font-semibold">{it.value}</span>}
              {it.href && (
                <Link
                  href={it.href}
                  className="text-muted-foreground hover:text-violet-glow"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (block.type === 'suggestion') {
    return (
      <div className="rounded-lg border border-violet-glow/20 bg-violet-glow/5 p-3 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-violet-glow shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          {block.text}
          {block.action && (
            <Button size="sm" variant="subtle" className="mt-2" asChild>
              <Link href={block.action.href}>{block.action.label}</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }
  if (block.type === 'draft') {
    return (
      <div className="rounded-lg border border-hairline surface-1 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {block.title}
          </div>
          <Button size="sm" variant="ghost" onClick={() => onCopy(block.body)}>
            <Copy className="h-3 w-3" />
            Copier
          </Button>
        </div>
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans leading-relaxed">
          {block.body}
        </pre>
      </div>
    );
  }
  return null;
}
