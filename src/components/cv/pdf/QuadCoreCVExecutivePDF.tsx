import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

import type { CVContent } from '@/types';
import { formatMonthYear } from '@/lib/utils';
import type { CVBrand } from '@/lib/cv/branding';
import { resolveBrand } from '@/lib/cv/branding';

// =========================================================================
// QuadCore CV — Executive (React-PDF)
// Variante "cabinet de conseil" : grandes respirations, typographie aérée,
// accent violet sobre, idéal pour profils lead / architectes.
// =========================================================================

const N = {
  neutral900: '#0b0b0f',
  neutral800: '#262626',
  neutral700: '#404040',
  neutral500: '#737373',
  neutral400: '#a3a3a3',
  neutral200: '#e5e5e5',
  white: '#ffffff',
};

function buildStyles(primary: string, _accent: string) {
  return StyleSheet.create({
  page: {
    backgroundColor: N.white,
    color: N.neutral900,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
    paddingTop: 44,
    paddingBottom: 44,
    paddingHorizontal: 54,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: { width: 90, height: 28, objectFit: 'contain' },
  confidential: {
    fontSize: 7,
    color: N.neutral400,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'right',
  },
  name: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: N.neutral900,
    marginTop: 24,
    letterSpacing: -0.7,
  },
  jobTitle: {
    fontSize: 13,
    color: primary,
    marginTop: 2,
    fontFamily: 'Helvetica-Bold',
  },
  subTitle: { fontSize: 10, color: N.neutral700, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    fontSize: 9,
    color: N.neutral700,
  },
  metaItem: { marginRight: 16 },
  metaLabel: { color: N.neutral500, marginRight: 3 },
  accent: {
    height: 2,
    width: 56,
    backgroundColor: primary,
    marginTop: 18,
  },
  sectionWrap: { marginTop: 18 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: N.neutral900,
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 8,
  },
  summary: { fontSize: 10.5, color: N.neutral800, lineHeight: 1.6 },
  skillRow: { flexDirection: 'row', marginBottom: 4 },
  skillCat: {
    width: 110,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: N.neutral700,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  skillItems: { flex: 1, fontSize: 10, color: N.neutral800 },
  skillHighlight: { color: primary, fontFamily: 'Helvetica-Bold' },
  skillSep: { color: N.neutral400 },
  experience: { marginTop: 12 },
  expHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expClient: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: N.neutral900,
    flex: 1,
  },
  expRole: { color: N.neutral500, fontFamily: 'Helvetica' },
  expDates: {
    fontSize: 8,
    color: N.neutral500,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginLeft: 12,
  },
  expContext: {
    fontSize: 9.5,
    color: N.neutral700,
    fontStyle: 'italic',
    marginTop: 3,
  },
  taskItem: {
    flexDirection: 'row',
    marginTop: 3,
    fontSize: 9.5,
    color: N.neutral800,
    lineHeight: 1.55,
  },
  bullet: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: primary,
    marginTop: 5,
    marginRight: 6,
  },
  taskText: { flex: 1 },
  expEnv: { marginTop: 5, fontSize: 8.5, color: N.neutral500 },
  expEnvLabel: {
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  eduRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    fontSize: 10,
  },
  eduYear: { width: 40, fontFamily: 'Helvetica-Bold', color: N.neutral500 },
  eduDegree: { fontFamily: 'Helvetica-Bold', color: N.neutral900 },
  eduInstitution: { color: N.neutral500, marginLeft: 5 },
  footer: {
    position: 'absolute',
    left: 54,
    right: 54,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: N.neutral400,
    paddingTop: 8,
    borderTop: `0.6pt solid ${N.neutral200}`,
  },
  });
}

type Props = {
  content: CVContent;
  logoSrc?: string;
  showConfidential?: boolean;
  brand?: CVBrand;
};

export function QuadCoreCVExecutivePDF({
  content,
  logoSrc,
  showConfidential = true,
  brand,
}: Props) {
  const b = brand ?? resolveBrand(null);
  const styles = buildStyles(b.primary, b.accent);
  const { header, skillCategories, experiences, educations, languages, summary } =
    content;

  return (
    <Document
      author={b.brandName}
      title={`CV — ${header.displayName}`}
      creator={`${b.brandName} Platform`}
    >
      <Page size="A4" style={styles.page} wrap>
        {/* ============ HEADER ============ */}
        <View style={styles.headerRow} fixed>
          {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : <View />}
          {showConfidential ? (
            <Text style={styles.confidential}>Document confidentiel</Text>
          ) : null}
        </View>

        {/* ============ IDENTITY ============ */}
        <Text style={styles.name}>{header.displayName}</Text>
        <Text style={styles.jobTitle}>{header.jobTitle}</Text>
        {header.subTitle ? (
          <Text style={styles.subTitle}>{header.subTitle}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Expérience :</Text>
            {header.yearsExperience} ans
          </Text>
          {header.location ? (
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Localisation :</Text>
              {header.location}
            </Text>
          ) : null}
          {header.mobility ? (
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Mobilité :</Text>
              {header.mobility}
            </Text>
          ) : null}
          {header.availability ? (
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Disponibilité :</Text>
              {header.availability}
            </Text>
          ) : null}
          {languages.length > 0 ? (
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Langues :</Text>
              {languages
                .map((l) => `${l.code.toUpperCase()} (${l.level})`)
                .join(' · ')}
            </Text>
          ) : null}
        </View>
        <View style={styles.accent} />

        {/* ============ SUMMARY ============ */}
        {summary ? (
          <View style={styles.sectionWrap} wrap={false}>
            <Text style={styles.sectionTitle}>Résumé exécutif</Text>
            <Text style={styles.summary}>{summary}</Text>
          </View>
        ) : null}

        {/* ============ SKILLS ============ */}
        {skillCategories.length > 0 ? (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Compétences</Text>
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
        ) : null}

        {/* ============ EXPERIENCES ============ */}
        {experiences.length > 0 ? (
          <View style={styles.sectionWrap}>
            <View wrap={false} minPresenceAhead={50}>
              <Text style={styles.sectionTitle}>Expériences professionnelles</Text>
            </View>
            {experiences.map((exp) => (
              <View
                key={exp.id}
                style={styles.experience}
              >
                <View style={styles.expHeaderRow} wrap={false} minPresenceAhead={36}>
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
            <Text style={styles.sectionTitle}>Formation</Text>
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
}
