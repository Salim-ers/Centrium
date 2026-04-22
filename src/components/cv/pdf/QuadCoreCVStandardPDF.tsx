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

// =========================================================================
// QuadCore CV — Standard (React-PDF)
// Template imprimable A4, vectoriel, textes sélectionnables.
// =========================================================================

// Couleurs QuadCore
const C = {
  violet: '#6d28d9',
  magenta: '#e11d74',
  black: '#111111',
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

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    color: C.neutral900,
    fontFamily: 'Helvetica',
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 10,
    lineHeight: 1.45,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logo: { width: 64, height: 64, objectFit: 'contain', borderRadius: 6 },
  confidential: {
    fontSize: 7,
    color: C.neutral400,
    letterSpacing: 1.2,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  confidentialSub: { fontSize: 7, color: C.neutral400, textAlign: 'right' },
  accentWrap: {
    marginTop: 10,
    marginBottom: 14,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: C.neutral900,
    letterSpacing: -0.6,
    lineHeight: 1.15,
    marginBottom: 3,
  },
  jobTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.violet,
    lineHeight: 1.25,
  },
  subTitle: { fontSize: 9.5, color: C.neutral700, marginTop: 1 },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    fontSize: 8.5,
  },
  infoItem: { marginRight: 14, color: C.neutral700 },
  infoLabel: { color: C.neutral500, marginRight: 3 },
  sectionWrap: {
    marginTop: 14,
    paddingTop: 10,
    borderTop: `0.6pt solid ${C.neutral200}`,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    color: C.neutral900,
    textTransform: 'uppercase',
  },
  sectionRule: { height: 0.6, flexGrow: 1, marginLeft: 8, backgroundColor: C.violet, opacity: 0.5 },
  summary: {
    marginTop: 7,
    fontSize: 9.5,
    lineHeight: 1.55,
    color: C.neutral800,
  },
  skillRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  skillCat: {
    width: 95,
    fontSize: 8,
    color: C.neutral700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Helvetica-Bold',
  },
  skillItems: {
    flex: 1,
    fontSize: 9.5,
    color: C.neutral800,
  },
  skillHighlight: { color: C.violet, fontFamily: 'Helvetica-Bold' },
  skillSep: { color: C.neutral400 },
  experience: { marginTop: 8 },
  expHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expClient: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: C.neutral900,
    flex: 1,
  },
  expRole: { color: C.neutral500, fontFamily: 'Helvetica' },
  expDates: {
    fontSize: 7.5,
    color: C.neutral500,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 10,
  },
  expContext: {
    fontSize: 8.5,
    color: C.neutral700,
    fontStyle: 'italic',
    marginTop: 2,
  },
  taskItem: {
    flexDirection: 'row',
    marginTop: 2,
    fontSize: 9,
    color: C.neutral800,
    lineHeight: 1.45,
  },
  bullet: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.magenta,
    marginTop: 4,
    marginRight: 5,
  },
  taskText: { flex: 1 },
  expEnv: {
    marginTop: 4,
    fontSize: 8,
    color: C.neutral500,
  },
  expEnvLabel: {
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  eduRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 3,
    fontSize: 9,
  },
  eduYear: {
    width: 32,
    fontFamily: 'Helvetica-Bold',
    color: C.neutral500,
    fontSize: 9,
  },
  eduDegree: { fontFamily: 'Helvetica-Bold', color: C.neutral900 },
  eduInstitution: { color: C.neutral500, marginLeft: 4 },
  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: C.neutral400,
    paddingTop: 6,
    borderTop: `0.5pt solid ${C.neutral200}`,
  },
});

type Props = {
  content: CVContent;
  logoSrc?: string;
  showConfidential?: boolean;
};

export function QuadCoreCVStandardPDF({
  content,
  logoSrc,
  showConfidential = true,
}: Props) {
  const { header, skillCategories, experiences, educations, languages, summary } =
    content;

  return (
    <Document
      author="QuadCore"
      title={`CV — ${header.displayName}`}
      subject={`CV ${header.jobTitle}`}
      creator="QuadCore Platform"
    >
      <Page size="A4" style={styles.page} wrap>
        {/* ============ HEADER ============ */}
        <View style={styles.headerRow} fixed>
          {logoSrc ? (
            <Image src={logoSrc} style={styles.logo} />
          ) : (
            <View />
          )}
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
                <Stop offset="0" stopColor={C.violet} stopOpacity={1} />
                <Stop offset="0.55" stopColor={C.magenta} stopOpacity={1} />
                <Stop offset="1" stopColor={C.magenta} stopOpacity={0} />
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
                    {cat.items.map((item, i) => {
                      const isHighlighted = cat.highlighted?.includes(item);
                      return (
                        <Text key={item}>
                          <Text
                            style={isHighlighted ? styles.skillHighlight : undefined}
                          >
                            {item}
                          </Text>
                          {i < cat.items.length - 1 ? (
                            <Text style={styles.skillSep}> · </Text>
                          ) : null}
                        </Text>
                      );
                    })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ============ EXPERIENCES ============ */}
        {experiences.length > 0 ? (
          <View style={styles.sectionWrap}>
            <SectionTitle>Expériences professionnelles</SectionTitle>
            {experiences.map((exp) => (
              <View key={exp.id} style={styles.experience} wrap={false} minPresenceAhead={60}>
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
          <Text>QuadCore — IT Services &amp; Consulting</Text>
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}
