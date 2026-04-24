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
// QuadCore CV — Dense (React-PDF)
// Variante compacte : typographie réduite, marges serrées, idéal pour profils
// seniors avec 8+ missions sur 2 pages max.
// =========================================================================

const N = {
  neutral900: '#171717',
  neutral800: '#262626',
  neutral700: '#404040',
  neutral500: '#737373',
  neutral400: '#a3a3a3',
  neutral200: '#e5e5e5',
  darkHeader: '#0f1119',
  white: '#ffffff',
};

function buildStyles(primary: string, accent: string) {
  return StyleSheet.create({
  page: {
    backgroundColor: N.white,
    color: N.neutral900,
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    lineHeight: 1.4,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: N.darkHeader,
    paddingHorizontal: 36,
    paddingVertical: 22,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    color: N.white,
    marginBottom: 10,
  },
  logo: { width: 70, height: 22, objectFit: 'contain' },
  confidential: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'right',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: N.white,
    letterSpacing: -0.5,
  },
  jobTitle: {
    fontSize: 11,
    color: accent,
    marginTop: 2,
    fontFamily: 'Helvetica-Bold',
  },
  subTitle: { fontSize: 8.5, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    color: 'rgba(255,255,255,0.85)',
  },
  metaItem: { marginRight: 14, fontSize: 7.5 },
  metaLabel: { color: 'rgba(255,255,255,0.55)', marginRight: 3 },
  body: { paddingHorizontal: 36, paddingTop: 14 },
  sectionWrap: {
    marginTop: 10,
    paddingTop: 7,
    borderTop: `0.5pt solid ${N.neutral200}`,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 5,
  },
  summary: { fontSize: 8.5, color: N.neutral800, lineHeight: 1.5 },
  skillRow: { flexDirection: 'row', marginBottom: 2 },
  skillCat: {
    width: 80,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: N.neutral700,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  skillItems: { flex: 1, fontSize: 8.5, color: N.neutral800 },
  skillHighlight: { color: primary, fontFamily: 'Helvetica-Bold' },
  skillSep: { color: N.neutral400 },
  experience: { marginTop: 6 },
  expHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expClient: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: N.neutral900,
    flex: 1,
  },
  expRole: { color: N.neutral500, fontFamily: 'Helvetica' },
  expDates: {
    fontSize: 7,
    color: N.neutral500,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 8,
  },
  expContext: { fontSize: 8, color: N.neutral700, fontStyle: 'italic', marginTop: 1 },
  taskItem: {
    flexDirection: 'row',
    marginTop: 1.5,
    fontSize: 8.2,
    color: N.neutral800,
    lineHeight: 1.4,
  },
  bullet: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: accent,
    marginTop: 4,
    marginRight: 4,
  },
  taskText: { flex: 1 },
  expEnv: { marginTop: 3, fontSize: 7.5, color: N.neutral500 },
  expEnvLabel: {
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  eduRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
    fontSize: 8.2,
  },
  eduYear: { width: 28, fontFamily: 'Helvetica-Bold', color: N.neutral500 },
  eduDegree: { fontFamily: 'Helvetica-Bold', color: N.neutral900 },
  eduInstitution: { color: N.neutral500, marginLeft: 3 },
  footer: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6.5,
    color: N.neutral400,
    paddingTop: 5,
    borderTop: `0.5pt solid ${N.neutral200}`,
  },
  });
}

type Props = {
  content: CVContent;
  logoSrc?: string;
  showConfidential?: boolean;
  brand?: CVBrand;
};

export function QuadCoreCVDensePDF({
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
        {/* ============ HEADER BANDEAU ============ */}
        <View style={styles.header} fixed>
          <View style={styles.headerTopRow}>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : <View />}
            {showConfidential ? (
              <Text style={styles.confidential}>Document confidentiel</Text>
            ) : null}
          </View>
          <Text style={styles.name}>{header.displayName}</Text>
          <Text style={styles.jobTitle}>{header.jobTitle}</Text>
          {header.subTitle ? (
            <Text style={styles.subTitle}>{header.subTitle}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>
              <Text style={styles.metaLabel}>Exp :</Text>
              {header.yearsExperience} ans
            </Text>
            {header.location ? (
              <Text style={styles.metaItem}>
                <Text style={styles.metaLabel}>Loc :</Text>
                {header.location}
              </Text>
            ) : null}
            {header.availability ? (
              <Text style={styles.metaItem}>
                <Text style={styles.metaLabel}>Dispo :</Text>
                {header.availability}
              </Text>
            ) : null}
            {languages.length > 0 ? (
              <Text style={styles.metaItem}>
                <Text style={styles.metaLabel}>Langues :</Text>
                {languages.map((l) => `${l.code.toUpperCase()}`).join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ============ BODY ============ */}
        <View style={styles.body}>
          {summary ? (
            <View style={styles.sectionWrap} wrap={false}>
              <Text style={styles.sectionTitle}>Résumé</Text>
              <Text style={styles.summary}>{summary}</Text>
            </View>
          ) : null}

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

          {experiences.length > 0 ? (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>Expériences</Text>
              {experiences.map((exp) => (
                <View
                  key={exp.id}
                  style={styles.experience}
                  wrap={false}
                  minPresenceAhead={50}
                >
                  <View style={styles.expHeaderRow}>
                    <Text style={styles.expClient}>
                      {exp.client_name}
                      <Text style={styles.expRole}> — {exp.role}</Text>
                    </Text>
                    <Text style={styles.expDates}>
                      {formatMonthYear(exp.start_date)} —{' '}
                      {formatMonthYear(exp.end_date)}
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
                      <Text style={styles.expEnvLabel}>Env : </Text>
                      {exp.environment.join(' · ')}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

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
        </View>

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
