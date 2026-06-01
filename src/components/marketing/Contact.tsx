'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Mail, MapPin, Send, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LandingDict } from '@/lib/i18n/landing';

// Endpoint Formspree centralisé → forwarde à contact@centrium-platform.com
// (le même que /api/quote-requests).
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xqenvzve';

export function Contact({ t }: { t: LandingDict }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus('sending');
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setStatus('sent');
        form.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="contact" className="qc-section-divider relative py-12">
      <div className="relative max-w-5xl mx-auto px-6">
        <div className="grid lg:grid-cols-5 gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <div className="text-xs font-semibold tracking-widest text-violet-300 mb-3">
              {t.contact.kicker}
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              {t.contact.title}
            </h2>
            <p className="mt-4 text-white/60 leading-relaxed">{t.contact.subtitle}</p>

            <div className="mt-8 space-y-3">
              <a
                href="mailto:contact@centrium-platform.com"
                className="flex items-center gap-3 text-sm text-white/80 hover:text-white transition"
              >
                <div className="h-9 w-9 rounded-lg bg-violet-brand/15 border border-violet-brand/30 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-violet-300" />
                </div>
                contact@centrium-platform.com
              </a>
              <div className="flex items-center gap-3 text-sm text-white/60">
                <div className="h-9 w-9 rounded-lg bg-magenta/15 border border-magenta/30 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-magenta" />
                </div>
                Paris
              </div>
            </div>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.15 }}
            onSubmit={onSubmit}
            className="lg:col-span-3 rounded-xl border border-hairline bg-card/60 backdrop-blur p-6 md:p-8 space-y-4"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">{t.contact.form.name}</Label>
                <Input id="contact-name" name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">{t.contact.form.email}</Label>
                <Input id="contact-email" name="email" type="email" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-company">{t.contact.form.company}</Label>
              <Input id="contact-company" name="company" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-message">{t.contact.form.message}</Label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={5}
                className="flex w-full rounded-md border border-hairline bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-brand/40 focus:border-violet-brand/50 transition resize-none"
              />
            </div>

            <input type="hidden" name="_subject" value="Nouveau contact Centrium (landing)" />

            <div className="flex items-center justify-between gap-3 pt-2">
              {status === 'sent' ? (
                <div className="text-sm text-emerald-300 inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  {t.contact.form.success}
                </div>
              ) : status === 'error' ? (
                <div className="text-sm text-red-400">{t.contact.form.error}</div>
              ) : (
                <span />
              )}
              <Button
                type="submit"
                disabled={status === 'sending'}
                className="bg-qc-gradient hover:opacity-90 shadow-glow-magenta"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.contact.form.sending}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t.contact.form.submit}
                  </>
                )}
              </Button>
            </div>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
