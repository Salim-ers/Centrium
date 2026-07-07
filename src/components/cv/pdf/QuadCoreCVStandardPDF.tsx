import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Svg,
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from '@react-pdf/renderer';

import type { CVContent } from '@/types';
import { formatMonthYear } from '@/lib/utils';
import type { CVBrand } from '@/lib/cv/branding';
import { resolveBrand } from '@/lib/cv/branding';

// =========================================================================
// QuadCore CV — Standard (React-PDF)
// Template imprimable A4, vectoriel, textes sélectionnables.
// =========================================================================

// Neutres (indépendants du branding)
const N = {
  neutral900: '#171717',
  neutral800: '#262626',
  neutral700: '#404040',
  neutral500: '#737373',
  neutral400: '#a3a3a3',
  neutral200: '#e5e5e5',
  white: '#ffffff',
};

// On garde les polices Helvetica de base (intégrées dans react-pdf) pour
// éviter un téléchargement réseau à l'export.

function buildStyles(primary: string, accent: string) {
  return StyleSheet.create({
    page: {
      backgroundColor: N.white,
      color: N.neutral900,
      fontFamily: 'Helvetica',
      // Marges réduites pour gagner ~25pt vertical par page → la 1re
      // page accueille désormais le résumé, les compétences ET au moins
      // une partie de la 1re mission.
      paddingTop: 26,
      paddingBottom: 30,
      paddingHorizontal: 32,
      fontSize: 9.5,
      lineHeight: 1.4,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    logo: { width: 72, height: 72, objectFit: 'contain', borderRadius: 6 },
    confidential: {
      fontSize: 7,
      color: N.neutral400,
      letterSpacing: 1.2,
      textAlign: 'right',
      textTransform: 'uppercase',
    },
    confidentialSub: { fontSize: 7, color: N.neutral400, textAlign: 'right' },
    accentWrap: { marginTop: 6, marginBottom: 8 },
    name: {
      fontSize: 22,
      fontFamily: 'Helvetica-Bold',
      color: N.neutral900,
      letterSpacing: -0.6,
      lineHeight: 1.1,
      marginBottom: 2,
    },
    jobTitle: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      color: primary,
      lineHeight: 1.2,
    },
    subTitle: { fontSize: 9, color: N.neutral700, marginTop: 1 },
    infoRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 6,
      fontSize: 8,
    },
    infoItem: { marginRight: 12, color: N.neutral700 },
    infoLabel: { color: N.neutral500, marginRight: 3 },
    sectionWrap: {
      marginTop: 8,
      paddingTop: 6,
      borderTop: `0.6pt solid ${N.neutral200}`,
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
    sectionTitle: {
      fontSize: 8.5,
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 2,
      color: N.neutral900,
      textTransform: 'uppercase',
    },
    sectionRule: { height: 0.6, flexGrow: 1, marginLeft: 8, backgroundColor: primary, opacity: 0.5 },
    summary: {
      marginTop: 4,
      fontSize: 9,
      lineHeight: 1.45,
      color: N.neutral800,
    },
    skillRow: { flexDirection: 'row', marginBottom: 2 },
    skillCat: {
      width: 88,
      fontSize: 7.5,
      color: N.neutral700,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: 'Helvetica-Bold',
    },
    skillItems: { flex: 1, fontSize: 9, color: N.neutral800, lineHeight: 1.35 },
    skillHighlight: { color: primary, fontFamily: 'Helvetica-Bold' },
    skillSep: { color: N.neutral400 },
    experience: { marginTop: 6 },
    expHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    expClient: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: N.neutral900,
      flex: 1,
    },
    expRole: { color: N.neutral500, fontFamily: 'Helvetica' },
    expDates: {
      fontSize: 7,
      color: N.neutral500,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginLeft: 10,
    },
    expContext: {
      fontSize: 8.5,
      color: N.neutral700,
      fontStyle: 'italic',
      marginTop: 1,
    },
    taskItem: {
      flexDirection: 'row',
      marginTop: 1.5,
      fontSize: 8.5,
      color: N.neutral800,
      lineHeight: 1.35,
    },
    bullet: {
      width: 2.5,
      height: 2.5,
      borderRadius: 1.25,
      backgroundColor: accent,
      marginTop: 4,
      marginRight: 5,
    },
    taskText: { flex: 1 },
    expEnv: { marginTop: 3, fontSize: 7.5, color: N.neutral500 },
    expEnvLabel: {
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    eduRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginTop: 2,
      fontSize: 8.5,
    },
    eduYear: {
      width: 30,
      fontFamily: 'Helvetica-Bold',
      color: N.neutral500,
      fontSize: 8.5,
    },
    eduDegree: { fontFamily: 'Helvetica-Bold', color: N.neutral900 },
    eduInstitution: { color: N.neutral500, marginLeft: 4 },
    footer: {
      position: 'absolute',
      left: 32,
      right: 32,
      bottom: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 7,
      color: N.neutral400,
      paddingTop: 4,
      borderTop: `0.5pt solid ${N.neutral200}`,
    },
  });
}

type Props = {
  content: CVContent;
  logoSrc?: string;
  showConfidential?: boolean;
  brand?: CVBrand;
  /** Data URL du QR code à afficher à côté du logo. */
  qrSrc?: string;
};

export function QuadCoreCVStandardPDF({
  content,
  logoSrc,
  showConfidential = true,
  brand,
  qrSrc,
}: Props) {
  const b = brand ?? resolveBrand(null);
  const styles = buildStyles(b.primary, b.accent);
  const { header, skillCategories, experiences, educations, languages, summary } =
    content;

  return (
    <Document
      author={b.brandName}
      title={`CV — ${header.displayName}`}
      subject={`CV ${header.jobTitle}`}
      creator={`${b.brandName} Platform`}
    >
      <Page size="A4" style={styles.page} wrap>
        {/* ============ HEADER ============ */}
        <View style={styles.headerRow} fixed>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            {logoSrc ? (
              <Image src={logoSrc} style={styles.logo} />
            ) : (
              <View />
            )}
            {qrSrc && (
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    backgroundColor: b.primary,
                    padding: 2,
                    borderRadius: 6,
                  }}
                >
                  <Image
                    src={qrSrc}
                    style={{
                      width: 52,
                      height: 52,
                      backgroundColor: '#ffffff',
                      borderRadius: 4,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 6,
                    color: b.primary,
                    letterSpacing: 1.4,
                    marginTop: 2,
                    fontFamily: 'Helvetica-Bold',
                  }}
                >
                  vCARD
                </Text>
              </View>
            )}
          </View>
          {showConfidential && (
            <View>
              <Text style={styles.confidential}>Document confidentiel</Text>
              <Text style={styles.confidentialSub}>Ne pas diffuser sans accord</Text>
            </View>
          )}
        </View>
        <View style={styles.accentWrap} fixed>
          <Svg height={2.4} width={515}>
            <Defs>
              <LinearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={b.primary} stopOpacity={1} />
                <Stop offset="0.55" stopColor={b.accent} stopOpacity={1} />
                <Stop offset="1" stopColor={b.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={515} height={2.4} fill="url(#accent)" />
          </Svg>
        </View>

        {/* ============ IDENTITY ============ */}
        <View>
          <Text style={styles.name}>{header.displayName}</Text>
          <Text style={styles.jobTitle}>{header.jobTitle}</Text>
          {header.subTitle ? (
            <Text style={styles.subTitle}>{header.subTitle}</Text>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoItem}>
              <Text style={styles.infoLabel}>Expérience :</Text>
              {header.yearsExperience} ans
            </Text>
            {header.location ? (
              <Text style={styles.infoItem}>
                <Text style={styles.infoLabel}>Localisation :</Text>
                {header.location}
              </Text>
            ) : null}
            {header.mobility ? (
              <Text style={styles.infoItem}>
                <Text style={styles.infoLabel}>Mobilité :</Text>
                {header.mobility}
              </Text>
            ) : null}
            {header.availability ? (
              <Text style={styles.infoItem}>
                <Text style={styles.infoLabel}>Disponibilité :</Text>
                {header.availability}
              </Text>
            ) : null}
            {languages.length > 0 ? (
              <Text style={styles.infoItem}>
                <Text style={styles.infoLabel}>Langues :</Text>
                {languages
                  .map((l) => `${l.code.toUpperCase()} (${l.level})`)
                  .join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ============ SUMMARY ============ */}
        {summary ? (
          <View style={styles.sectionWrap} wrap={false}>
            <SectionTitle>Résumé exécutif</SectionTitle>
            <Text style={styles.summary}>{summary}</Text>
          </View>
        ) : null}

        {/* ============ SKILLS ============ */}
        {skillCategories.length > 0 ? (
          <View style={styles.sectionWrap}>
            <SectionTitle>Compétences techniques</SectionTitle>
            <View style={{ marginTop: 6 }}>
              {skillCategories.map((cat) => (
                <View key={cat.name} style={styles.skillRow} wrap={false}>
                  <Text style={styles.skillCat}>{cat.name}</Text>
                  <Text style={styles.skillItems}>
                    {cat.items.map((item, i) => (
                      <Text key={item}>
                        <Text>{item}</Text>
                        {i < cat.items.length - 1 ? (
                          <Text style={styles.skillSep}> · </Text>
                        ) : null}
                      </Text>
                    ))}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ============ EXPERIENCES ============ */}
        {/* Chaque expérience reste indivisible (wrap={false}) — sur
            instruction explicite : pas de mission coupée entre 2
            pages. Compensation : densité réduite sur la page (cf.
            buildStyles) pour qu'un maximum de missions tiennent en
            page 1. Si la 1re mission est trop longue pour la place
            restante, elle bascule en page 2 et page 1 finit avec un
            peu de blanc en bas. Le titre de section reste protégé
            par minPresenceAhead pour ne pas pendre seul. */}
        {experiences.length > 0 ? (
          <View style={styles.sectionWrap}>
            <View wrap={false} minPresenceAhead={60}>
              <SectionTitle>Expériences professionnelles</SectionTitle>
            </View>
            {experiences.map((exp) => (
              <View
                key={exp.id}
                style={styles.experience}
                wrap={false}
                minPresenceAhead={40}
              >
                <View style={styles.expHeaderRow}>
                  <Text style={styles.expClient}>
                    {exp.client_name}
                    <Text style={styles.expRole}> — {exp.role}</Text>
                  </Text>
                  <Text style={styles.expDates}>
                    {formatMonthYear(exp.start_date)} — {formatMonthYear(exp.end_date)}
                  </Text>
                </View>
                {exp.context ? (
                  <Text style={styles.expContext}>{exp.context}</Text>
                ) : null}
                {(exp.tasks ?? []).map((task, i) => (
                  <View key={i} style={styles.taskItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.taskText}>{task}</Text>
                  </View>
                ))}
                {exp.environment && exp.environment.length > 0 ? (
                  <Text style={styles.expEnv}>
                    <Text style={styles.expEnvLabel}>Environnement : </Text>
                    {exp.environment.join(' · ')}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* ============ EDUCATION ============ */}
        {educations.length > 0 ? (
          <View style={styles.sectionWrap} wrap={false}>
            <SectionTitle>Formation</SectionTitle>
            {educations.map((edu) => (
              <View key={edu.id} style={styles.eduRow}>
                <Text style={styles.eduYear}>{edu.year}</Text>
                <Text style={styles.eduDegree}>{edu.degree}</Text>
                {edu.institution ? (
                  <Text style={styles.eduInstitution}>— {edu.institution}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* ============ FOOTER (sur chaque page) ============ */}
        <View style={styles.footer} fixed>
          <Text>{b.brandName} — {b.footerTagline}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{children}</Text>
        <View style={styles.sectionRule} />
      </View>
    );
  }
}
