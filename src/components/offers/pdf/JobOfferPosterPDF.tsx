import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

import type { JobOffer } from '@/types';
import type { CVBrand } from '@/lib/cv/branding';
import { resolveBrand } from '@/lib/cv/branding';

// =========================================================================
// Fiche de poste — React-PDF
// Direction artistique : header violet sombre type plaquette commerciale,
// sections numérotées avec puce violette, tags en bandeau plein violet,
// bloc "Intéressé(e)" final en CTA contrasté.
// =========================================================================

const N = {
  white: '#ffffff',
  ink: '#0f1119',
  ink2: '#171727',
  text: '#1f2030',
  muted: '#6b6e80',
  ruler: '#e5e5ec',
  light: '#f6f4ff',
};

function buildStyles(primary: string, accent: string) {
  return StyleSheet.create({
    page: {
      backgroundColor: N.white,
      color: N.text,
      fontFamily: 'Helvetica',
      paddingTop: 0,
      paddingBottom: 36,
      paddingHorizontal: 0,
      fontSize: 9.5,
      lineHeight: 1.45,
    },
    headerBox: {
      backgroundColor: '#2a1f55',
      paddingHorizontal: 36,
      paddingTop: 24,
      paddingBottom: 24,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
    },
    logo: { width: 56, height: 56, objectFit: 'contain', borderRadius: 6 },
    headerTextWrap: { flex: 1 },
    headerKicker: {
      fontSize: 7.5,
      letterSpacing: 3,
      color: '#cdc4ff',
      fontFamily: 'Helvetica-Bold',
      marginBottom: 6,
    },
    headerTitle: {
      fontSize: 22,
      color: N.white,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: -0.4,
    },
    headerMeta: {
      fontSize: 10,
      color: '#cdc4ff',
      marginTop: 4,
    },
    quickRow: {
      flexDirection: 'row',
      paddingHorizontal: 36,
      borderBottom: `0.6pt solid ${primary}`,
      paddingTop: 12,
      paddingBottom: 12,
    },
    quickCell: { flex: 1 },
    quickLabel: {
      fontSize: 7,
      letterSpacing: 1.4,
      color: N.muted,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    quickValue: {
      fontSize: 10.5,
      color: N.ink,
      fontFamily: 'Helvetica-Bold',
    },
    section: {
      paddingHorizontal: 36,
      paddingTop: 14,
      paddingBottom: 4,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    sectionNum: {
      fontSize: 8,
      color: N.white,
      backgroundColor: primary,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 2,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 0.5,
    },
    sectionTitle: {
      fontSize: 11,
      color: N.ink,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    sectionBody: {
      fontSize: 9.5,
      color: N.text,
      lineHeight: 1.55,
    },
    purposeBox: {
      borderLeft: `3pt solid ${accent}`,
      backgroundColor: '#fff5fa',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopRightRadius: 4,
      borderBottomRightRadius: 4,
    },
    purposeLabel: {
      fontSize: 7,
      color: accent,
      letterSpacing: 1.6,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    purposeText: { fontSize: 10, color: N.ink, lineHeight: 1.5 },
    twoCol: { flexDirection: 'row', gap: 18 },
    col: { flex: 1 },
    colHeader: {
      fontSize: 7.5,
      color: N.white,
      backgroundColor: primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      letterSpacing: 1.4,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
    },
    bulletItem: {
      flexDirection: 'row',
      gap: 5,
      paddingTop: 4,
    },
    bulletDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: accent,
      marginTop: 5,
    },
    bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.45 },
    techRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    techTag: {
      backgroundColor: primary,
      color: N.white,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 3,
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
    },
    cta: {
      marginTop: 24,
      marginHorizontal: 36,
      backgroundColor: '#2a1f55',
      paddingHorizontal: 24,
      paddingVertical: 18,
      borderRadius: 4,
      alignItems: 'center',
    },
    ctaTitle: {
      fontSize: 11,
      color: N.white,
      letterSpacing: 3,
      fontFamily: 'Helvetica-Bold',
    },
    ctaContact: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    ctaEmail: {
      fontSize: 12,
      color: N.white,
      fontFamily: 'Helvetica-Bold',
    },
    ctaSep: { fontSize: 12, color: '#9b88ff' },
    ctaSite: { fontSize: 11, color: '#cdc4ff' },
    ctaTagline: {
      marginTop: 8,
      fontSize: 8,
      color: '#9b88ff',
      letterSpacing: 6,
    },
    footer: {
      position: 'absolute',
      left: 36,
      right: 36,
      bottom: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 6,
      borderTop: `0.5pt solid ${N.ruler}`,
      fontSize: 7,
      color: N.muted,
    },
  });
}

type Props = {
  offer: JobOffer;
  brand?: CVBrand;
  logoSrc?: string;
  /** Email visible dans le CTA. Par défaut : contact@quad-core.fr. */
  contactEmail?: string;
  /** Site visible dans le CTA. */
  contactWebsite?: string;
  /** Tagline du footer CTA (ex: "Réactif. Fiable. Proche."). */
  tagline?: string;
};

const SENIORITY_YEARS_MIN: Record<string, string> = {
  junior: '0-2',
  confirmed: '3-5',
  senior: '6-9',
  expert: '10+',
  lead: '8+',
  architect: '10+',
};

function senorityToExperience(seniority: string | null): string {
  if (!seniority) return '—';
  const yrs = SENIORITY_YEARS_MIN[seniority];
  return yrs ? `${yrs} ans` : '—';
}

export function JobOfferPosterPDF({
  offer,
  brand,
  logoSrc,
  contactEmail = 'contact@quad-core.fr',
  contactWebsite = 'quad-core.fr',
  tagline = 'Réactif. Fiable. Proche.',
}: Props) {
  const b = brand ?? resolveBrand(null);
  const styles = buildStyles(b.primary, b.accent);

  const remoteLabel =
    offer.remote_days && offer.remote_days > 0
      ? `${offer.remote_days}j / sem.`
      : 'Sur site';
  const startLabel = offer.start_date
    ? new Date(offer.start_date).toLocaleDateString('fr-FR')
    : 'ASAP';
  const durationLabel = offer.duration_months
    ? `${offer.duration_months} mois`
    : null;
  const contractLabel = offer.contract_kind ?? 'Mission';

  const metaParts = [
    'F/H',
    contractLabel,
    offer.location
      ? offer.remote_days
        ? `${offer.location} (hybride)`
        : offer.location
      : null,
    durationLabel,
  ].filter(Boolean);

  const tasks = offer.tasks?.length ? offer.tasks : [];
  const profile = offer.required_skills?.length ? offer.required_skills : [];
  const conditions = offer.working_conditions?.length
    ? offer.working_conditions
    : [];
  const tech = offer.tech_stack?.length ? offer.tech_stack : offer.required_skills;

  return (
    <Document
      author={b.brandName}
      title={`Fiche de poste — ${offer.title}`}
      subject={`Fiche de poste ${offer.title}`}
      creator={`${b.brandName} Platform`}
    >
      <Page size="A4" style={styles.page}>
        {/* ============ HEADER ============ */}
        <View style={styles.headerBox}>
          {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : <View />}
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerKicker}>FICHE DE POSTE</Text>
            <Text style={styles.headerTitle}>{offer.title}</Text>
            <Text style={styles.headerMeta}>{metaParts.join(' • ')}</Text>
          </View>
        </View>

        {/* ============ QUICK INFO ============ */}
        <View style={styles.quickRow}>
          <View style={styles.quickCell}>
            <Text style={styles.quickLabel}>Localisation</Text>
            <Text style={styles.quickValue}>{offer.location ?? '—'}</Text>
          </View>
          <View style={styles.quickCell}>
            <Text style={styles.quickLabel}>Télétravail</Text>
            <Text style={styles.quickValue}>{remoteLabel}</Text>
          </View>
          <View style={styles.quickCell}>
            <Text style={styles.quickLabel}>Démarrage</Text>
            <Text style={styles.quickValue}>{startLabel}</Text>
          </View>
          <View style={styles.quickCell}>
            <Text style={styles.quickLabel}>Expérience</Text>
            <Text style={styles.quickValue}>{senorityToExperience(offer.seniority)}</Text>
          </View>
        </View>

        {/* ============ 01 CONTEXTE ============ */}
        {(offer.context || offer.description) && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNum}>01</Text>
              <Text style={styles.sectionTitle}>Contexte</Text>
            </View>
            <Text style={styles.sectionBody}>
              {offer.context || offer.description}
            </Text>
          </View>
        )}

        {/* ============ 02 FINALITÉ ============ */}
        {offer.mission_purpose && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNum}>02</Text>
              <Text style={styles.sectionTitle}>Finalité du poste</Text>
            </View>
            <View style={styles.purposeBox}>
              <Text style={styles.purposeLabel}>Finalité de la mission</Text>
              <Text style={styles.purposeText}>{offer.mission_purpose}</Text>
            </View>
          </View>
        )}

        {/* ============ 03 MISSIONS & PROFIL ============ */}
        {(tasks.length > 0 || profile.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNum}>03</Text>
              <Text style={styles.sectionTitle}>Missions principales & profil</Text>
            </View>
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.colHeader}>Missions</Text>
                {tasks.length === 0 && (
                  <Text style={[styles.bulletText, { paddingTop: 6, color: N.muted, fontStyle: 'italic' }]}>
                    Non renseigné
                  </Text>
                )}
                {tasks.map((t, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{t}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.col}>
                <Text style={styles.colHeader}>Profil recherché</Text>
                {profile.length === 0 && (
                  <Text style={[styles.bulletText, { paddingTop: 6, color: N.muted, fontStyle: 'italic' }]}>
                    Non renseigné
                  </Text>
                )}
                {profile.map((p, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ============ 04 ENVIRONNEMENT TECHNIQUE ============ */}
        {tech.length > 0 && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNum}>04</Text>
              <Text style={styles.sectionTitle}>Environnement technique</Text>
            </View>
            <View style={styles.techRow}>
              {tech.map((t) => (
                <Text key={t} style={styles.techTag}>
                  {t}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* ============ 05 CONDITIONS ============ */}
        {conditions.length > 0 && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNum}>05</Text>
              <Text style={styles.sectionTitle}>Conditions d&apos;exercice</Text>
            </View>
            {conditions.map((c, i) => (
              <View key={i} style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{c}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ============ CTA ============ */}
        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>INTÉRESSÉ(E) PAR CETTE MISSION ?</Text>
          <View style={styles.ctaContact}>
            <Text style={styles.ctaEmail}>✉ {contactEmail}</Text>
            <Text style={styles.ctaSep}>•</Text>
            <Text style={styles.ctaSite}>{contactWebsite}</Text>
          </View>
          <Text style={styles.ctaTagline}>{tagline}</Text>
        </View>

        {/* ============ FOOTER ============ */}
        <View style={styles.footer} fixed>
          <Text>
            {b.brandName} — {b.footerTagline}
          </Text>
          <Text>{contactEmail}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
