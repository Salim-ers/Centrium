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
// Fiche de poste — porte exactement le design du repo
// `Fiche-de-poste-QuadCore` (Puppeteer HTML/CSS) vers React-PDF.
//
// Le repo source utilise des couleurs FIXES (charcoal + cuivre + sable).
// Ici on remplace les 2 couleurs identitaires par les couleurs du
// BRANDING utilisateur (cf. /settings/branding) :
//   - branding.primary  → blocs sombres (hero, callout, tech badges)
//   - branding.accent   → accent (ligne verticale, top-border banner,
//                          col-header missions/profil, footer rule)
// Les neutres (sable F3ECE2, taupe 9A8A78, brun-noir 2A2520) restent fixes.
//
// Layout : 1 page A4 portrait. mm originaux convertis en pt (1mm ≈ 2.835pt).
// =========================================================================

// === NEUTRES FIXES (charte nude / éditoriale du template original) ===
const N = {
  white: '#ffffff',
  sand: '#f3ece2',      // lightGray — fond des cellules info + col-body
  taupe: '#9a8a78',     // midGray — texte secondaire footer
  inkText: '#2a2520',   // textDark — texte principal
  accentSoftOnDark: 'rgba(255,255,255,0.65)', // sub-texte sur fond sombre
};

// 1 mm ≈ 2.8346 pt — converti une fois ici pour la lisibilité du code.
const mm = (n: number) => n * 2.8346;

function buildStyles(primary: string, accent: string) {
  return StyleSheet.create({
    page: {
      backgroundColor: N.white,
      color: N.inkText,
      fontFamily: 'Helvetica',
      paddingTop: mm(10),
      paddingBottom: mm(20), // place pour le footer fixé
      paddingHorizontal: mm(10),
      fontSize: 9.5,
      lineHeight: 1.4,
    },

    // ============ HERO (logo panel + title panel) ============
    hero: {
      flexDirection: 'row',
      height: mm(32),
      marginBottom: mm(6),
    },
    heroLogo: {
      backgroundColor: primary,
      width: mm(32),
      alignItems: 'center',
      justifyContent: 'center',
      padding: mm(4),
    },
    heroLogoImg: {
      maxWidth: '100%',
      maxHeight: mm(22),
      objectFit: 'contain',
    },
    heroBody: {
      backgroundColor: primary,
      flex: 1,
      paddingTop: mm(5.5),
      paddingBottom: mm(5.5),
      paddingHorizontal: mm(9),
      justifyContent: 'center',
    },
    heroTag: {
      fontSize: 7.5,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 3.8,
      color: N.white,
      marginBottom: mm(1.8),
    },
    heroTitle: {
      fontSize: 20,
      fontFamily: 'Helvetica-Bold',
      color: N.white,
      lineHeight: 1.1,
      marginBottom: mm(1.5),
    },
    heroSubtitle: {
      fontSize: 9.5,
      color: N.accentSoftOnDark,
      marginBottom: mm(2.5),
    },
    heroMeta: {
      fontSize: 9.5,
      color: N.accentSoftOnDark,
    },

    // ============ INFO BANNER (4 cells avec top-border accent) ============
    infoBanner: {
      flexDirection: 'row',
      marginBottom: mm(6.5),
    },
    bannerCell: {
      backgroundColor: N.sand,
      flex: 1,
      paddingTop: mm(3.3),
      paddingBottom: mm(3.3),
      paddingHorizontal: mm(5),
      borderTopWidth: mm(1.1),
      borderTopColor: accent,
      borderTopStyle: 'solid',
      marginRight: mm(1.3),
    },
    bannerCellLast: {
      backgroundColor: N.sand,
      flex: 1,
      paddingTop: mm(3.3),
      paddingBottom: mm(3.3),
      paddingHorizontal: mm(5),
      borderTopWidth: mm(1.1),
      borderTopColor: accent,
      borderTopStyle: 'solid',
    },
    bannerLabel: {
      fontSize: 6.5,
      color: accent,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 2,
      marginBottom: mm(1.1),
      textTransform: 'uppercase',
    },
    bannerValue: {
      fontSize: 9.5,
      color: N.inkText,
      fontFamily: 'Helvetica-Bold',
    },

    // ============ SECTION TITLE (accent | num | label) ============
    sectionTitle: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginTop: mm(5.5),
      marginBottom: mm(2.2),
      height: mm(5.5),
    },
    sectionAccent: {
      width: mm(1.3),
      backgroundColor: accent,
    },
    sectionLabel: {
      paddingHorizontal: mm(3.3),
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      color: primary,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionNum: {
      fontSize: 10,
      color: accent,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 1.1,
      marginRight: mm(2.8),
    },

    // ============ 01 CONTEXTE ============
    contexte: {
      fontSize: 9.5,
      lineHeight: 1.5,
      color: N.inkText,
      textAlign: 'justify',
      marginBottom: mm(1),
    },

    // ============ 02 FINALITÉ (callout dark + left border accent) ============
    callout: {
      backgroundColor: primary,
      paddingTop: mm(4),
      paddingBottom: mm(4),
      paddingHorizontal: mm(5.5),
      borderLeftWidth: mm(2.2),
      borderLeftColor: accent,
      borderLeftStyle: 'solid',
    },
    calloutLabel: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 2.4,
      color: N.accentSoftOnDark,
      marginBottom: mm(1.7),
      textTransform: 'uppercase',
    },
    calloutText: {
      fontSize: 9.5,
      color: N.white,
      lineHeight: 1.5,
    },

    // ============ 03 TWO COLUMNS (Missions / Profil) ============
    twoColGrid: {
      flexDirection: 'row',
    },
    col: {
      flex: 1,
      marginRight: mm(1.3),
    },
    colLast: {
      flex: 1,
    },
    colHeader: {
      backgroundColor: accent,
      color: N.white,
      paddingTop: mm(2.8),
      paddingBottom: mm(2.8),
      paddingHorizontal: mm(5),
      fontSize: 8.5,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 2.4,
      textTransform: 'uppercase',
    },
    colBody: {
      backgroundColor: N.sand,
      paddingTop: mm(4),
      paddingBottom: mm(4.5),
      paddingHorizontal: mm(5),
    },

    // ============ BULLETS ============
    bulletItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: mm(0.6),
      paddingBottom: mm(0.6),
    },
    bullet: {
      color: accent,
      fontFamily: 'Helvetica-Bold',
      fontSize: 9,
      marginRight: mm(2),
      lineHeight: 1.3,
    },
    bulletText: {
      flex: 1,
      fontSize: 9,
      color: N.inkText,
      lineHeight: 1.4,
    },

    // ============ 04 TECH BADGES ============
    techRow: {
      flexDirection: 'row',
    },
    techBadge: {
      backgroundColor: primary,
      color: N.white,
      paddingTop: mm(2.8),
      paddingBottom: mm(2.8),
      paddingHorizontal: mm(1.7),
      fontSize: 8.5,
      fontFamily: 'Helvetica-Bold',
      textAlign: 'center',
      flex: 1,
      marginRight: mm(1.3),
    },
    techBadgeLast: {
      backgroundColor: primary,
      color: N.white,
      paddingTop: mm(2.8),
      paddingBottom: mm(2.8),
      paddingHorizontal: mm(1.7),
      fontSize: 8.5,
      fontFamily: 'Helvetica-Bold',
      textAlign: 'center',
      flex: 1,
    },

    // ============ FOOTER ============
    footerWrap: {
      position: 'absolute',
      left: mm(10),
      right: mm(10),
      bottom: mm(8),
    },
    footerRule: {
      height: 0.85,
      backgroundColor: accent,
      marginBottom: mm(2),
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      fontSize: 7,
      color: N.taupe,
    },
    footerLeft: { flex: 1, textAlign: 'left' },
    footerCenter: { flex: 1, textAlign: 'center', color: accent },
    footerRight: { flex: 1, textAlign: 'right' },
    footerBrand: { color: primary, fontFamily: 'Helvetica-Bold' },
    footerMuted: { color: N.taupe },
    footerPageBrand: { color: primary, fontFamily: 'Helvetica-Bold' },
  });
}

type Props = {
  offer: JobOffer;
  brand?: CVBrand;
  logoSrc?: string;
  contactEmail?: string;
  /** Locale d'affichage pour les libellés statiques (FICHE DE POSTE, etc.) */
  locale?: 'fr' | 'en';
};

const SENIORITY_YEARS_MIN: Record<string, string> = {
  junior: '0-2',
  confirmed: '3-5',
  senior: '6-9',
  expert: '10+',
  lead: '8+',
  architect: '10+',
};

function seniorityToExperience(seniority: string | null, isEn: boolean): string {
  if (!seniority) return '—';
  const yrs = SENIORITY_YEARS_MIN[seniority];
  if (!yrs) return '—';
  return isEn ? `${yrs} yrs` : `${yrs} ans`;
}

/** Labels statiques bilingues — tout le texte fixe du gabarit. */
function getLabels(isEn: boolean) {
  return isEn
    ? {
        kicker: 'JOB POSTING',
        bannerLocation: 'LOCATION',
        bannerRemote: 'REMOTE',
        bannerStart: 'START',
        bannerExperience: 'EXPERIENCE',
        remoteOnSite: 'On-site',
        remotePerWeek: (d: number) => `${d} d/wk`,
        startAsap: 'ASAP',
        defaultContract: 'Mission',
        defaultGenre: 'M/F',
        hybridSuffix: '(hybrid)',
        durationMonths: (m: number) => `${m} months`,
        sec01: 'Context',
        sec02: 'Mission purpose',
        sec02Label: 'MISSION PURPOSE',
        sec03Both: 'Main missions & profile',
        sec03MissionsOnly: 'Main missions',
        sec03ProfileOnly: 'Profile required',
        sec03ColMissions: 'Missions',
        sec03ColProfile: 'Profile required',
        sec04: 'Tech environment',
        sec05: 'Working conditions',
        pageOf: (a: number, b: number) => `Page ${a} / ${b}`,
      }
    : {
        kicker: 'FICHE DE POSTE',
        bannerLocation: 'LOCALISATION',
        bannerRemote: 'TÉLÉTRAVAIL',
        bannerStart: 'DÉMARRAGE',
        bannerExperience: 'EXPÉRIENCE',
        remoteOnSite: 'Sur site',
        remotePerWeek: (d: number) => `${d}j / sem.`,
        startAsap: 'ASAP',
        defaultContract: 'Mission',
        defaultGenre: 'F/H',
        hybridSuffix: '(hybride)',
        durationMonths: (m: number) => `${m} mois`,
        sec01: 'Contexte',
        sec02: 'Finalité du poste',
        sec02Label: 'FINALITÉ DE LA MISSION',
        sec03Both: 'Missions principales & Profil',
        sec03MissionsOnly: 'Missions principales',
        sec03ProfileOnly: 'Profil recherché',
        sec03ColMissions: 'Missions',
        sec03ColProfile: 'Profil recherché',
        sec04: 'Environnement technique',
        sec05: "Conditions d'exercice",
        pageOf: (a: number, b: number) => `Page ${a} / ${b}`,
      };
}

export function JobOfferPosterPDF({
  offer,
  brand,
  logoSrc,
  contactEmail,
  locale = 'fr',
}: Props) {
  const b = brand ?? resolveBrand(null);
  const isEn = locale === 'en';
  const L = getLabels(isEn);
  const styles = buildStyles(b.primary, b.accent);

  // Email de contact : prop > none. Le caller fournit normalement.
  const email = contactEmail ?? 'contact@centrium-platform.com';

  // === Hero meta (genre · type · lieu · durée) ===
  const remoteLabel =
    offer.remote_days && offer.remote_days > 0
      ? L.remotePerWeek(offer.remote_days)
      : L.remoteOnSite;
  const startLabel = offer.start_date
    ? new Date(offer.start_date).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')
    : L.startAsap;
  const durationLabel = offer.duration_months
    ? L.durationMonths(offer.duration_months)
    : null;
  const contractLabel = offer.contract_kind ?? L.defaultContract;
  const metaParts = [
    L.defaultGenre,
    contractLabel,
    offer.location
      ? offer.remote_days
        ? `${offer.location} ${L.hybridSuffix}`
        : offer.location
      : null,
    durationLabel,
  ].filter(Boolean);

  // === Sections data ===
  const tasks = offer.tasks?.length ? offer.tasks : [];
  // profile_requirements > required_skills (fallback pour les vieux AO)
  const profile = offer.profile_requirements?.length
    ? offer.profile_requirements
    : offer.required_skills?.length
      ? offer.required_skills
      : [];
  const conditions = offer.working_conditions?.length ? offer.working_conditions : [];
  const tech = offer.tech_stack?.length ? offer.tech_stack : offer.required_skills ?? [];

  // === Info banner (4 cellules) ===
  const banner: { label: string; value: string }[] = [
    { label: L.bannerLocation, value: offer.location ?? '—' },
    { label: L.bannerRemote, value: remoteLabel },
    { label: L.bannerStart, value: startLabel },
    { label: L.bannerExperience, value: seniorityToExperience(offer.seniority, isEn) },
  ];

  // === Section 03 dynamic title ===
  const showBoth = tasks.length > 0 && profile.length > 0;
  const sec03Title = showBoth
    ? L.sec03Both
    : tasks.length > 0
      ? L.sec03MissionsOnly
      : L.sec03ProfileOnly;

  return (
    <Document
      author={b.brandName}
      title={`${L.kicker} — ${offer.title}`}
      subject={`${L.kicker} ${offer.title}`}
      creator={`${b.brandName} Platform`}
    >
      <Page size="A4" style={styles.page}>
        {/* ============ HERO ============ */}
        <View style={styles.hero}>
          <View style={styles.heroLogo}>
            {logoSrc ? <Image src={logoSrc} style={styles.heroLogoImg} /> : <View />}
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTag}>{L.kicker}</Text>
            <Text style={styles.heroTitle}>{offer.title}</Text>
            <Text style={styles.heroMeta}>{metaParts.join('  •  ')}</Text>
          </View>
        </View>

        {/* ============ INFO BANNER ============ */}
        <View style={styles.infoBanner}>
          {banner.map((c, i) => (
            <View
              key={c.label}
              style={i === banner.length - 1 ? styles.bannerCellLast : styles.bannerCell}
            >
              <Text style={styles.bannerLabel}>{c.label}</Text>
              <Text style={styles.bannerValue}>{c.value}</Text>
            </View>
          ))}
        </View>

        {/* ============ 01 CONTEXTE ============ */}
        {(offer.context || offer.description) && (
          <>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionAccent} />
              <View style={styles.sectionLabel}>
                <Text style={styles.sectionNum}>01</Text>
                <Text>{L.sec01}</Text>
              </View>
            </View>
            <Text style={styles.contexte}>{offer.context || offer.description}</Text>
          </>
        )}

        {/* ============ 02 FINALITÉ ============ */}
        {offer.mission_purpose && (
          <View wrap={false}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionAccent} />
              <View style={styles.sectionLabel}>
                <Text style={styles.sectionNum}>02</Text>
                <Text>{L.sec02}</Text>
              </View>
            </View>
            <View style={styles.callout}>
              <Text style={styles.calloutLabel}>{L.sec02Label}</Text>
              <Text style={styles.calloutText}>{offer.mission_purpose}</Text>
            </View>
          </View>
        )}

        {/* ============ 03 MISSIONS & PROFIL ============ */}
        {(tasks.length > 0 || profile.length > 0) && (
          <View>
            <View style={styles.sectionTitle} wrap={false} minPresenceAhead={50}>
              <View style={styles.sectionAccent} />
              <View style={styles.sectionLabel}>
                <Text style={styles.sectionNum}>03</Text>
                <Text>{sec03Title}</Text>
              </View>
            </View>
            {showBoth ? (
              <View style={styles.twoColGrid}>
                <View style={styles.col}>
                  <Text style={styles.colHeader}>{L.sec03ColMissions}</Text>
                  <View style={styles.colBody}>
                    {tasks.map((t, i) => (
                      <View key={i} style={styles.bulletItem}>
                        <Text style={styles.bullet}>▪</Text>
                        <Text style={styles.bulletText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.colLast}>
                  <Text style={styles.colHeader}>{L.sec03ColProfile}</Text>
                  <View style={styles.colBody}>
                    {profile.map((p, i) => (
                      <View key={i} style={styles.bulletItem}>
                        <Text style={styles.bullet}>▪</Text>
                        <Text style={styles.bulletText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.colHeader}>
                  {tasks.length > 0 ? L.sec03ColMissions : L.sec03ColProfile}
                </Text>
                <View style={styles.colBody}>
                  {(tasks.length > 0 ? tasks : profile).map((it, i) => (
                    <View key={i} style={styles.bulletItem}>
                      <Text style={styles.bullet}>▪</Text>
                      <Text style={styles.bulletText}>{it}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ============ 04 ENVIRONNEMENT TECHNIQUE ============ */}
        {tech.length > 0 && (
          <View wrap={false}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionAccent} />
              <View style={styles.sectionLabel}>
                <Text style={styles.sectionNum}>04</Text>
                <Text>{L.sec04}</Text>
              </View>
            </View>
            <View style={styles.techRow}>
              {tech.slice(0, 8).map((t, i, arr) => (
                <Text
                  key={t}
                  style={i === arr.length - 1 ? styles.techBadgeLast : styles.techBadge}
                >
                  {t}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* ============ 05 CONDITIONS ============ */}
        {conditions.length > 0 && (
          <View wrap={false}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionAccent} />
              <View style={styles.sectionLabel}>
                <Text style={styles.sectionNum}>05</Text>
                <Text>{L.sec05}</Text>
              </View>
            </View>
            {conditions.map((c, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bullet}>▪</Text>
                <Text style={styles.bulletText}>{c}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ============ FOOTER (brand · email · page) ============ */}
        <View style={styles.footerWrap} fixed>
          <View style={styles.footerRule} />
          <View style={styles.footerRow}>
            <Text style={styles.footerLeft}>
              <Text style={styles.footerBrand}>{b.brandName}</Text>
              <Text style={styles.footerMuted}> — {b.footerTagline}</Text>
            </Text>
            <Text style={styles.footerCenter}>{email}</Text>
            <Text
              style={styles.footerRight}
              render={({ pageNumber, totalPages }) => L.pageOf(pageNumber, totalPages)}
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}
