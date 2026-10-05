"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CalendarPlus,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { showBrandToast } from "@/components/ui/BrandToast";
import { useOrganization } from "@/lib/auth/context";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { createClient } from "@/lib/supabase/client";
import { taskService } from "@/lib/services/crm.service";
import {
  extendedPlannedDays,
  isoAddDays,
  isoDiffDays,
  proposedExtensionEnd,
  reminderDueDate,
  renewalReminderKey,
  renewalStage,
} from "@/lib/missions/renewal";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type RenewalMission = {
  id: string;
  title: string;
  status: string;
  end_date: string | null;
  renewal_status?: string | null;
  owner_id?: string | null;
  daily_rate_eur: number | string;
  planned_days?: number | null;
};

async function patchMission(
  id: string,
  body: Record<string, unknown>,
  fr: boolean,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/missions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return true;
    const json = (await res.json().catch(() => ({}))) as {
      message?: string;
      error?: unknown;
    };
    toast.error(
      json.message ??
        (typeof json.error === "string"
          ? json.error
          : fr
            ? "Mise à jour impossible"
            : "Update failed"),
    );
  } catch {
    toast.error(fr ? "Connexion impossible" : "Network error");
  }
  return false;
}

/**
 * À 30 jours de la fin, Centrium demande : renouvellement prévu ?
 * Oui → on prépare la prolongation ; Non → le consultant se libère ;
 * À confirmer → rappel pour le responsable de la mission.
 */
export function RenewalPrompt({
  mission: m,
  lang,
  today,
  canEdit,
  showRates,
  consultantName,
  ownerName,
  onChanged,
  stacked = false,
  className,
}: {
  mission: RenewalMission;
  lang: "fr" | "en";
  today: string;
  canEdit: boolean;
  showRates: boolean;
  consultantName?: string;
  ownerName?: string | null;
  onChanged: () => void;
  /** Panneau étroit (tiroir) : les réponses passent sous la question. */
  stacked?: boolean;
  className?: string;
}) {
  const fr = lang === "fr";
  const { activeOrgId, user } = useOrganization();
  const stage = renewalStage(m, today);
  const [busy, setBusy] = useState<"yes" | "no" | "later" | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);

  const reminder = useCachedQuery<{
    id: string;
    due_date: string | null;
  } | null>(
    `renewal-reminder:${m.id}`,
    async () => {
      const { data } = await createClient()
        .from("tasks")
        .select("id, due_date")
        .eq("entity_type", "mission")
        .eq("entity_id", m.id)
        .eq("status", "todo")
        .eq("dedupe_key", renewalReminderKey(m.id))
        .maybeSingle();
      return (data as { id: string; due_date: string | null } | null) ?? null;
    },
    { enabled: stage === "ask" },
  );

  if (!stage || !m.end_date) return null;
  const end = m.end_date;
  const left = isoDiffDays(today, end);
  const when = `${fr ? "Fin le" : "Ends on"} ${formatDate(end, lang)} · ${left === 0 ? (fr ? "aujourd’hui" : "today") : `J-${left}`}`;

  async function answer(kind: "yes" | "no") {
    setBusy(kind);
    const ok = await patchMission(
      m.id,
      { renewal_status: kind === "yes" ? "confirmed" : "not_renewed" },
      fr,
    );
    setBusy(null);
    if (!ok) return;
    onChanged();
    if (kind === "yes") setExtendOpen(true);
  }

  async function remindLater() {
    if (!activeOrgId) return;
    setBusy("later");
    const due = reminderDueDate(today, end);
    const res = await taskService.createOnce(
      {
        title: fr
          ? `Confirmer le renouvellement · ${m.title}`
          : `Confirm renewal · ${m.title}`,
        description: fr
          ? `La mission se termine le ${formatDate(end, lang)}.`
          : `The mission ends on ${formatDate(end, lang)}.`,
        priority: "high",
        due_date: due,
        assignee_id: m.owner_id ?? user?.id ?? null,
        entity_type: "mission",
        entity_id: m.id,
      },
      activeOrgId,
      renewalReminderKey(m.id),
    );
    setBusy(null);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    void reminder.reload();
    showBrandToast("success", fr ? "Rappel créé" : "Reminder created", {
      description: `${ownerName ?? (fr ? "Vous" : "You")} · ${formatDate(due, lang)}`,
    });
  }

  const tone = stage === "ending" ? "bg-app-sand/70" : "bg-app-peach-light";
  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl px-4 py-3",
          !stacked && "sm:flex-row sm:items-center",
          tone,
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 text-app-terra">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-app-terra-deep">
              {stage === "ask"
                ? fr
                  ? "Renouvellement prévu ?"
                  : "Renewal planned?"
                : stage === "extend"
                  ? fr
                    ? "Renouvellement confirmé : prolongation à préparer"
                    : "Renewal confirmed: extension to prepare"
                  : fr
                    ? `${consultantName ?? "Le consultant"} se libère à la fin de la mission`
                    : `${consultantName ?? "The consultant"} frees up when the mission ends`}
            </p>
            <p className="text-[12.5px] text-app-terra-dark">
              {when}
              {stage === "ask" && reminder.data
                ? ` · ${fr ? "rappel le" : "reminder on"} ${reminder.data.due_date ? formatDate(reminder.data.due_date, lang, "short") : "—"}${ownerName ? ` (${ownerName})` : ""}`
                : ""}
            </p>
          </div>
        </div>
        {canEdit && stage === "ask" && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => void answer("yes")}
              loading={busy === "yes"}
              disabled={!!busy}
            >
              <Check />
              {fr ? "Oui" : "Yes"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void answer("no")}
              loading={busy === "no"}
              disabled={!!busy}
            >
              <X />
              {fr ? "Non" : "No"}
            </Button>
            {!reminder.data && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void remindLater()}
                loading={busy === "later"}
                disabled={!!busy}
              >
                <BellRing />
                {fr ? "À confirmer" : "To confirm"}
              </Button>
            )}
          </div>
        )}
        {canEdit && stage === "extend" && (
          <Button size="sm" onClick={() => setExtendOpen(true)}>
            <CalendarPlus />
            {fr ? "Préparer la prolongation" : "Prepare the extension"}
          </Button>
        )}
        {stage === "ending" && (
          <Button asChild size="sm" variant="secondary">
            <Link href="/staffing?view=soon">
              {fr ? "Trouver sa prochaine mission" : "Find the next mission"}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
      {canEdit && (
        <ExtensionDialog
          open={extendOpen}
          onOpenChange={setExtendOpen}
          mission={m}
          lang={lang}
          showRates={showRates}
          onDone={onChanged}
        />
      )}
    </>
  );
}

/** Prolongation : nouvelle fin (et TJM) ; le renouvellement suivant repasse à qualifier. */
function ExtensionDialog({
  open,
  onOpenChange,
  mission: m,
  lang,
  showRates,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission: RenewalMission;
  lang: "fr" | "en";
  showRates: boolean;
  onDone: () => void;
}) {
  const fr = lang === "fr";
  const oldEnd = m.end_date ?? "";
  const [end, setEnd] = useState<string | null>(
    oldEnd ? proposedExtensionEnd(oldEnd) : null,
  );
  const [rate, setRate] = useState(String(Number(m.daily_rate_eur) || ""));
  const [saving, setSaving] = useState(false);
  // Valeurs proposées recalculées à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    setEnd(oldEnd ? proposedExtensionEnd(oldEnd) : null);
    setRate(String(Number(m.daily_rate_eur) || ""));
  }, [open, oldEnd, m.daily_rate_eur]);
  const valid = !!end && end > oldEnd;

  async function submit() {
    if (!valid || !end) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      end_date: end,
      renewal_status: "unknown",
    };
    const nextRate = Number(rate);
    if (showRates && rate && nextRate !== Number(m.daily_rate_eur))
      body.daily_rate_eur = nextRate;
    const planned = extendedPlannedDays(m.planned_days ?? null, oldEnd, end);
    if (planned != null) body.planned_days = planned;
    const ok = await patchMission(m.id, body, fr);
    setSaving(false);
    if (!ok) return;
    onOpenChange(false);
    onDone();
    showBrandToast("success", fr ? "Mission prolongée" : "Mission extended", {
      description: fr
        ? `Nouvelle fin : ${formatDate(end, lang)}`
        : `New end date: ${formatDate(end, lang)}`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {fr ? "Préparer la prolongation" : "Prepare the extension"}
          </DialogTitle>
          <DialogDescription>
            {fr
              ? `Fin actuelle : ${formatDate(oldEnd, lang)}.`
              : `Current end: ${formatDate(oldEnd, lang)}.`}{" "}
            {fr
              ? "Le renouvellement suivant repassera « à qualifier »."
              : "The next renewal goes back to “to qualify”."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={fr ? "Nouvelle date de fin" : "New end date"}
            htmlFor="ext-end"
            required
          >
            <DatePicker
              id="ext-end"
              value={end}
              onChange={setEnd}
              min={oldEnd ? isoAddDays(oldEnd, 1) : undefined}
              clearable={false}
            />
          </Field>
          {showRates && (
            <Field
              label={fr ? "TJM (€ HT)" : "Day rate (€ excl. VAT)"}
              htmlFor="ext-rate"
            >
              <Input
                id="ext-rate"
                type="number"
                inputMode="decimal"
                min={0}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </Field>
          )}
        </div>
        {m.planned_days != null && end && valid && (
          <p className="text-xs text-muted-foreground">
            {fr
              ? `Jours prévus : ${m.planned_days} → ${extendedPlannedDays(m.planned_days ?? null, oldEnd, end)}`
              : `Planned days: ${m.planned_days} → ${extendedPlannedDays(m.planned_days ?? null, oldEnd, end)}`}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {fr ? "Plus tard" : "Later"}
          </Button>
          <Button
            onClick={() => void submit()}
            loading={saving}
            disabled={!valid}
          >
            {fr ? "Prolonger la mission" : "Extend the mission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
