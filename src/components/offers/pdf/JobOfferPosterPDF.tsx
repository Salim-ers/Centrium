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
//
// Match exact du design référence :
//   - Header violet sombre INSET (rounded), logo + kicker + titre + meta
//   - Quick row à 4 cellules avec borders magenta haut+bas et dividers
//   - Sections numerotees : pip + titre en MAGENTA (l'accent)
//   - Bloc 02 Finalite : violet plein, texte blanc
//   - Bloc 03 : carte gris violet clair avec 2 colonnes ; headers
//     "MISSIONS" / "PROFIL RECHERCHE" en violet plein
//   - Tech stack 04 : grille de tags violet plein equireparties
//   - Section 05 conditions : puces magenta
//   - CTA bas : violet sombre arrondi
//   - Footer : ligne fine magenta + 3 colonnes brand / email / page N/T
//
// Cible : tenir sur 1 page A4 avec un volume de contenu raisonnable.
// =========================================================================

const N = {
  white: '#ffffff',
  ink: '#0f1119',
  text: '#1f2030',
  muted: '#6b6e80',
  ruler: '#e5e5ec',
  cardBg: '#f6f4f9',
  cellDivider: '#e8e6ee',
};

// Le violet sombre du header / finalité / col headers / tech tags / CTA.
const HEADER_VIOLET = '#3a2466';

function buildStyles(_primary: string, accent: string) {
  return StyleSheet.create({
    page: {
      backgroundColor: N.white,
      color: N.text,
      fontFamily: 'Helvetica',
      paddingTop: 24,
      paddingBottom: 36,
      paddingHorizontal: 28,
      fontSize: 9,
      lineHeight: 1.4,
    },

    // === HEADER ===
    headerBox: {
      backgroundColor: HEADER_VIOLET,
      borderRadius: 8,
      paddingHorizontal: 22,
      paddingTop: 18,
      paddingBottom: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    logo: { width: 56, height: 56, objectFit: 'contain', borderRadius: 6 },
    headerTextWrap: { flex: 1 },
    headerKicker: {
      fontSize: 8,
      letterSpacing: 3,
      color: '#cdc4ff',
      fontFamily: 'Helvetica-Bold',
      marginBottom: 4,
    },
    headerTitle: {
      fontSize: 22,
      color: N.white,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: -0.4,
    },
    headerMeta: {
      fontSize: 9.5,
      color: '#cdc4ff',
      marginTop: 4,
    },

    // === QUICK ROW ===
    quickRow: {
      flexDirection: 'row',
      borderTop: `0.6pt solid ${accent}`,
      borderBottom: `0.6pt solid ${accent}`,
      marginTop: 14,
      paddingTop: 8,
      paddingBottom: 8,
    },
    quickCell: {
      flex: 1,
      borderRight: `0.5pt solid ${N.cellDivider}`,
      paddingHorizontal: 10,
    },
    quickCellLast: {
      flex: 1,
      paddingHorizontal: 10,
    },
    quickLabel: {
      fontSize: 7,
      letterSpacing: 1.6,
      color: N.muted,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    quickValue: {
      fontSize: 10,
      color: N.ink,
      fontFamily: 'Helvetica-Bold',
    },

    // === SECTION ===
    section: {
      paddingTop: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    sectionPip: {
      width: 4,
      height: 14,
      backgroundColor: accent,
      marginRight: 4,
    },
    sectionNum: {
      fontSize: 9,
      color: accent,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 1,
    },
    sectionTitle: {
      fontSize: 9,
      color: accent,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 2.4,
      textTransform: 'uppercase',
    },
    sectionBody: {
      fontSize: 9,
      color: N.text,
      lineHeight: 1.5,
    },

    // === FINALITÉ BOX (02) ===
    purposeBox: {
      backgroundColor: HEADER_VIOLET,
      borderRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    purposeLabel: {
      fontSize: 7,
      color: '#cdc4ff',
      letterSpacing: 2,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      marginBottom: 5,
    },
    purposeText: {
      fontSize: 9.5,
      color: N.white,
      lineHeight: 1.5,
    },

    // === SECTION 03 (Missions & Profil) ===
    sectionCard: {
      backgroundColor: N.cardBg,
      borderRadius: 4,
      padding: 0,
      overflow: 'hidden',
    },
    twoCol: { flexDirection: 'row' },
    col: { flex: 1 },
    colHeader: {
      fontSize: 7.5,
      color: N.white,
      backgroundColor: HEADER_VIOLET,
      paddingHorizontal: 10,
      paddingVertical: 5,
      letterSpacing: 1.6,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
    },
    colBody: {
      paddingTop: 6,
      paddingHorizontal: 12,
      paddingBottom: 8,
    },

    // === BULLETS ===
    bulletItem: {
      flexDirection: 'row',
      gap: 5,
      paddingTop: 2,
    },
    bulletDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: accent,
      marginTop: 5,
    },
    bulletText: {
      flex: 1,
      fontSize: 9,
      color: N.text,
      lineHeight: 1.45,
    },

    // === TECH STACK (04) ===
    techRow: {
      flexDirection: 'row',
      gap: 4,
    },
    techTag: {
      flex: 1,
      backgroundColor: HEADER_VIOLET,
      color: N.white,
      paddingVertical: 6,
      borderRadius: 3,
      fontSize: 8.5,
      fontFamily: 'Helvetica-Bold',
      textAlign: 'center',
    },

    // === CTA (Intéressé) ===
    cta: {
      marginTop: 14,
      backgroundColor: HEADER_VIOLET,
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 6,
      alignItems: 'center',
    },
    ctaTitle: {
      fontSize: 11,
      color: N.white,
      letterSpacing: 3,
      fontFamily: 'Helvetica-Bold',
    },
    ctaContact: {
      marginTop: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    ctaEmail: {
      fontSize: 11,
      color: accent,
      fontFamily: 'Helvetica-Bold',
    },
    ctaSep: { fontSize: 10, color: '#9b88ff' },
    ctaSite: { fontSize: 10.5, color: '#cdc4ff' },
    ctaTagline: {
      marginTop: 6,
      fontSize: 8,
      color: '#9b88ff',
      letterSpacing: 5,
    },

    // === FOOTER ===
    footerWrap: {
      position: 'absolute',
      left: 28,
      right: 28,
      bottom: 16,
    },
    footerRule: {
      height: 0.6,
      backgroundColor: accent,
      marginBottom: 8,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 7.5,
      color: N.muted,
    },
    footerBrand: { fontFamily: 'Helvetica-Bold', color: HEADER_VIOLET },
    footerEmail: { color: accent, fontFamily: 'Helvetica-Bold' },
  });
}

type Props = {
  offer: JobOffer;
  brand?: CVBrand;
  logoSrc?: string;
  contactEmail?: string;
  contactWebsite?: string;
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

  // Quick cells (4 colonnes : Localisation / Télétravail / Démarrage / Expérience)
  const quickCells: { label: string; value: string }[] = [
    { label: 'Localisation', value: offer.location ?? '—' },
    { label: 'Télétravail', value: remoteLabel },
    { label: 'Démarrage', value: startLabel },
    { label: 'Expérience', value: senorityToExperience(offer.seniority) },
  ];

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

        {/* ============ QUICK ROW ============ */}
        <View style={styles.quickRow}>
          {quickCells.map((c, i) => (
            <View
              key={c.label}
              style={i === quickCells.length - 1 ? styles.quickCellLast : styles.quickCell}
            >
              <Text style={styles.quickLabel}>{c.label}</Text>
              <Text style={styles.quickValue}>{c.value}</Text>
            </View>
          ))}
        </View>

        {/* ============ 01 CONTEXTE ============ */}
        {(offer.context || offer.description) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionPip} />
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
              <View style={styles.sectionPip} />
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
        {(tasks.length > 0 || profile.length > 0) && (() => {
          const showBoth = tasks.length > 0 && profile.length > 0;
          const titleText = showBoth
            ? 'Missions principales & profil'
            : tasks.length > 0
              ? 'Missions principales'
              : 'Profil recherché';
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader} wrap={false} minPresenceAhead={50}>
                <View style={styles.sectionPip} />
                <Text style={styles.sectionNum}>03</Text>
                <Text style={styles.sectionTitle}>{titleText}</Text>
              </View>
              <View style={styles.sectionCard}>
                {showBoth ? (
                  <View style={styles.twoCol}>
                    <View style={styles.col}>
                      <Text style={styles.colHeader}>Missions</Text>
                      <View style={styles.colBody}>
                        {tasks.map((t, i) => (
                          <View key={i} style={styles.bulletItem}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>{t}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.colHeader}>Profil recherché</Text>
                      <View style={styles.colBody}>
                        {profile.map((p, i) => (
                          <View key={i} style={styles.bulletItem}>
                            <View style={styles.bulletDot} />
                            <Text style={styles.bulletText}>{p}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.colHeader}>
                      {tasks.length > 0 ? 'Missions' : 'Profil recherché'}
                    </Text>
                    <View style={styles.colBody}>
                      {(tasks.length > 0 ? tasks : profile).map((t, i) => (
                        <View key={i} style={styles.bulletItem}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.bulletText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* ============ 04 ENVIRONNEMENT TECHNIQUE ============ */}
        {tech.length > 0 && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionPip} />
              <Text style={styles.sectionNum}>04</Text>
              <Text style={styles.sectionTitle}>Environnement technique</Text>
            </View>
            <View style={styles.techRow}>
              {tech.slice(0, 8).map((t) => (
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
              <View style={styles.sectionPip} />
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
        <View style={styles.cta} wrap={false}>
          <Text style={styles.ctaTitle}>INTÉRESSÉ(E) PAR CETTE MISSION ?</Text>
          <View style={styles.ctaContact}>
            <Text style={styles.ctaEmail}>✉ {contactEmail}</Text>
            <Text style={styles.ctaSep}>•</Text>
            <Text style={styles.ctaSite}>{contactWebsite}</Text>
          </View>
          <Text style={styles.ctaTagline}>{tagline}</Text>
        </View>

        {/* ============ FOOTER ============ */}
        <View style={styles.footerWrap} fixed>
          <View style={styles.footerRule} />
          <View style={styles.footerRow}>
            <Text style={styles.footerBrand}>
              {b.brandName} <Text style={{ color: N.muted, fontFamily: 'Helvetica' }}>— {b.footerTagline}</Text>
            </Text>
            <Text style={styles.footerEmail}>{contactEmail}</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} / ${totalPages}`
              }
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}
