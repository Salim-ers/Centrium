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
import { resolvePosterBrand } from '@/lib/cv/branding';
import { buildPosterModel, computeFitPlan, type FitPlan } from '@/lib/offers/poster-model';

// =========================================================================
// Fiche de poste — gabarit A4 (moteur @react-pdf/renderer)
// -------------------------------------------------------------------------
// Identité visuelle CONSERVÉE (bandeau logo + titre, bandeau d'infos, blocs
// numérotés 01→05, callout finalité, deux colonnes missions/profil, badges
// techno, footer). Ce qui change : robustesse.
//
//  · Couleurs identitaires = branding de l'organisation (primary / accent).
//    Fallback NEUTRE (charbon/taupe) si l'org n'a pas configuré ses couleurs.
//  · AUCUNE hauteur fixe : le hero et les titres de section s'étirent
//    naturellement (flex) → plus de superposition titre / métadonnées.
//  · Le titre passe sur 2 lignes max, taille adaptative (cf. FitPlan).
//  · Bandeau d'infos DYNAMIQUE : seules les cellules renseignées sont
//    affichées (3, 4… cellules), jamais de « — ».
//  · Densité pilotée par un plan pré-rendu (poster-model) → tenue 1 page A4
//    sans troncature silencieuse.
// =========================================================================

// Neutres éditoriaux fixes (charte nude du gabarit original).
const N = {
  white: '#ffffff',
  sand: '#f3ece2',
  taupe: '#9a8a78',
  inkText: '#2a2520',
  softOnDark: 'rgba(255,255,255,0.68)',
};

// 1 mm ≈ 2.8346 pt.
const mm = (n: number) => n * 2.8346;

function buildStyles(primary: string, accent: string, plan: FitPlan) {
  // Échelle verticale : on comprime les espacements aux paliers denses,
  // sans toucher aux paddings horizontaux (lisibilité).
  const v = (n: number) => mm(n * plan.scale);

  return StyleSheet.create({
    page: {
      backgroundColor: N.white,
      color: N.inkText,
      fontFamily: 'Helvetica',
      paddingTop: mm(7.5),
      paddingBottom: mm(12), // réservation footer fixe
      paddingHorizontal: mm(9),
      fontSize: plan.fontBase,
      lineHeight: plan.lineHeight,
    },

    // ============ HERO (logo | titre) — hauteur NATURELLE ============
    hero: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginBottom: v(4),
    },
    heroLogo: {
      backgroundColor: primary,
      width: mm(31),
      alignItems: 'center',
      justifyContent: 'center',
      padding: mm(3.5),
    },
    heroLogoImg: {
      maxWidth: '100%',
      maxHeight: mm(17),
      objectFit: 'contain',
    },
    heroBody: {
      backgroundColor: primary,
      flex: 1,
      minWidth: 0,
      paddingVertical: v(4.5),
      paddingHorizontal: mm(7),
      justifyContent: 'center',
    },
    heroTag: {
      fontSize: 7.5,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 3.4,
      color: N.softOnDark,
      marginBottom: v(2),
    },
    heroTitle: {
      fontSize: plan.titleFont,
      fontFamily: 'Helvetica-Bold',
      color: N.white,
      lineHeight: 1.1,
      maxLines: 2,
      textOverflow: 'ellipsis',
      marginBottom: v(1.6),
    },
    heroMeta: {
      fontSize: Math.max(8, plan.fontBase - 0.5),
      color: N.softOnDark,
      maxLines: 2,
      textOverflow: 'ellipsis',
    },

    // ============ INFO BANNER (cellules dynamiques) ============
    infoBanner: {
      flexDirection: 'row',
      marginBottom: v(4),
    },
    bannerCell: {
      backgroundColor: N.sand,
      flex: 1,
      minWidth: 0,
      paddingVertical: v(3.2),
      paddingHorizontal: mm(4.2),
      borderTopWidth: mm(1.1),
      borderTopColor: accent,
      borderTopStyle: 'solid',
    },
    bannerLabel: {
      fontSize: 6.5,
      color: accent,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 1.6,
      marginBottom: v(1),
      textTransform: 'uppercase',
    },
    bannerValue: {
      fontSize: plan.bannerValueFont,
      color: N.inkText,
      fontFamily: 'Helvetica-Bold',
      maxLines: 2,
      textOverflow: 'ellipsis',
    },

    // ============ SECTION TITLE (accent | num | label) — hauteur NATURELLE ==
    sectionTitle: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginTop: v(3.2),
      marginBottom: v(1.5),
    },
    sectionAccent: {
      width: mm(1.3),
      backgroundColor: accent,
    },
    sectionLabel: {
      paddingHorizontal: mm(3),
      paddingVertical: v(0.8),
      fontSize: Math.max(9, plan.fontBase + 0.5),
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: primary,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionNum: {
      fontSize: Math.max(9, plan.fontBase + 0.5),
      color: accent,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 1,
      marginRight: mm(2.6),
    },

    // ============ 01 CONTEXTE ============
    contexte: {
      fontSize: plan.fontBase,
      lineHeight: plan.lineHeight,
      color: N.inkText,
      textAlign: 'justify',
    },

    // ============ 02 FINALITÉ (callout) ============
    callout: {
      backgroundColor: primary,
      paddingVertical: v(3),
      paddingHorizontal: mm(5),
      borderLeftWidth: mm(2),
      borderLeftColor: accent,
      borderLeftStyle: 'solid',
    },
    calloutLabel: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 2.2,
      color: N.softOnDark,
      marginBottom: v(1.5),
      textTransform: 'uppercase',
    },
    calloutText: {
      fontSize: plan.fontBase,
      color: N.white,
      lineHeight: plan.lineHeight,
    },

    // ============ 03 DEUX COLONNES ============
    twoColGrid: {
      flexDirection: 'row',
    },
    col: {
      flex: 1,
      minWidth: 0,
      marginRight: mm(1.3),
    },
    colLast: {
      flex: 1,
      minWidth: 0,
    },
    colHeader: {
      backgroundColor: accent,
      color: N.white,
      paddingVertical: v(2.6),
      paddingHorizontal: mm(5),
      fontSize: Math.max(8, plan.bulletFont - 0.2),
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 2.2,
      textTransform: 'uppercase',
    },
    colBody: {
      backgroundColor: N.sand,
      paddingVertical: v(2.8),
      paddingHorizontal: mm(5),
    },

    // ============ BULLETS ============
    bulletItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: v(0.45),
    },
    bullet: {
      color: accent,
      fontFamily: 'Helvetica-Bold',
      fontSize: plan.bulletFont,
      marginRight: mm(1.8),
      lineHeight: plan.bulletLineHeight,
    },
    bulletText: {
      flex: 1,
      minWidth: 0,
      fontSize: plan.bulletFont,
      color: N.inkText,
      lineHeight: plan.bulletLineHeight,
    },

    // ============ 04 TECH BADGES (wrap dynamique) ============
    techRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    techBadge: {
      backgroundColor: primary,
      color: N.white,
      paddingVertical: v(2.4),
      paddingHorizontal: mm(3),
      fontSize: Math.max(7.5, plan.bulletFont - 0.3),
      fontFamily: 'Helvetica-Bold',
      textAlign: 'center',
      marginRight: mm(1.3),
      marginBottom: mm(1.3),
    },

    // ============ FOOTER ============
    footerWrap: {
      position: 'absolute',
      left: mm(9),
      right: mm(9),
      bottom: mm(7),
    },
    footerRule: {
      height: 0.85,
      backgroundColor: accent,
      marginBottom: mm(1.8),
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
  });
}

type Props = {
  offer: JobOffer;
  brand?: CVBrand;
  logoSrc?: string;
  contactEmail?: string;
  locale?: 'fr' | 'en';
};

export function JobOfferPosterPDF({
  offer,
  brand,
  logoSrc,
  contactEmail,
  locale = 'fr',
}: Props) {
  const b = brand ?? resolvePosterBrand(null);
  const plan = computeFitPlan(offer);
  const model = buildPosterModel(offer, locale, plan.caps);
  const L = model.L;
  const styles = buildStyles(b.primary, b.accent, plan);

  const email = contactEmail ?? null;

  return (
    <Document
      author={b.brandName}
      title={`${L.kicker} — ${model.title}`}
      subject={`${L.kicker} ${model.title}`}
      creator={`${b.brandName} Platform`}
    >
      <Page size="A4" style={styles.page}>
        {/* ============ HERO : documentLabel → title → metadata (colonne) ============ */}
        <View style={styles.hero}>
          <View style={styles.heroLogo}>
            {logoSrc ? <Image src={logoSrc} style={styles.heroLogoImg} /> : <View />}
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTag}>{model.documentLabel}</Text>
            <Text style={styles.heroTitle}>{model.title}</Text>
            {model.metaLine ? <Text style={styles.heroMeta}>{model.metaLine}</Text> : null}
          </View>
        </View>

        {/* ============ INFO BANNER (dynamique) ============ */}
        {model.banner.length > 0 && (
          <View style={styles.infoBanner}>
            {model.banner.map((c, i) => (
              <View
                key={c.label}
                style={[
                  styles.bannerCell,
                  i < model.banner.length - 1 ? { marginRight: mm(1.3) } : {},
                ]}
              >
                <Text style={styles.bannerLabel}>{c.label}</Text>
                <Text style={styles.bannerValue}>{c.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ============ 01 CONTEXTE ============ */}
        {model.contextText ? (
          <View wrap={false}>
            <SectionTitle styles={styles} num="01" label={L.sec01} />
            <Text style={styles.contexte}>{model.contextText}</Text>
          </View>
        ) : null}

        {/* ============ 02 FINALITÉ ============ */}
        {model.purposeText ? (
          <View wrap={false}>
            <SectionTitle styles={styles} num="02" label={L.sec02} />
            <View style={styles.callout}>
              <Text style={styles.calloutLabel}>{L.sec02Label}</Text>
              <Text style={styles.calloutText}>{model.purposeText}</Text>
            </View>
          </View>
        ) : null}

        {/* ============ 03 MISSIONS & PROFIL ============ */}
        {(model.missions.length > 0 || model.profile.length > 0) && (
          <View>
            <View wrap={false} minPresenceAhead={40}>
              <SectionTitle styles={styles} num="03" label={model.sec03Title} />
            </View>
            {model.showBoth ? (
              <View style={styles.twoColGrid}>
                <View style={styles.col}>
                  <Text style={styles.colHeader}>{L.sec03ColMissions}</Text>
                  <View style={styles.colBody}>
                    {model.missions.map((t, i) => (
                      <Bullet key={i} styles={styles} text={t} />
                    ))}
                  </View>
                </View>
                <View style={styles.colLast}>
                  <Text style={styles.colHeader}>{L.sec03ColProfile}</Text>
                  <View style={styles.colBody}>
                    {model.profile.map((p, i) => (
                      <Bullet key={i} styles={styles} text={p} />
                    ))}
                  </View>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.colHeader}>
                  {model.missions.length > 0 ? L.sec03ColMissions : L.sec03ColProfile}
                </Text>
                <View style={styles.colBody}>
                  {(model.missions.length > 0 ? model.missions : model.profile).map((it, i) => (
                    <Bullet key={i} styles={styles} text={it} />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ============ 04 ENVIRONNEMENT TECHNIQUE ============ */}
        {model.tech.length > 0 && (
          <View wrap={false}>
            <SectionTitle styles={styles} num="04" label={L.sec04} />
            <View style={styles.techRow}>
              {model.tech.map((t, i) => (
                <Text key={`${t}-${i}`} style={styles.techBadge}>
                  {t}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* ============ 05 CONDITIONS ============ */}
        {model.conditions.length > 0 && (
          <View wrap={false}>
            <SectionTitle styles={styles} num="05" label={L.sec05} />
            {model.conditions.map((c, i) => (
              <Bullet key={i} styles={styles} text={c} />
            ))}
          </View>
        )}

        {/* ============ FOOTER (marque · email · page) ============ */}
        <View style={styles.footerWrap} fixed>
          <View style={styles.footerRule} />
          <View style={styles.footerRow}>
            <Text style={styles.footerLeft}>
              <Text style={styles.footerBrand}>{b.brandName}</Text>
              <Text style={styles.footerMuted}> — {b.footerTagline}</Text>
            </Text>
            {email ? <Text style={styles.footerCenter}>{email}</Text> : <Text style={styles.footerCenter} />}
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

// === Sous-composants privés ===

type Styles = ReturnType<typeof buildStyles>;

function SectionTitle({ styles, num, label }: { styles: Styles; num: string; label: string }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionAccent} />
      <View style={styles.sectionLabel}>
        <Text style={styles.sectionNum}>{num}</Text>
        <Text>{label}</Text>
      </View>
    </View>
  );
}

function Bullet({ styles, text }: { styles: Styles; text: string }) {
  return (
    <View style={styles.bulletItem}>
      <Text style={styles.bullet}>▪</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}
