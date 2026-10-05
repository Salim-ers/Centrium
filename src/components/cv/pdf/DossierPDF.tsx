import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { CVContent } from '@/types';
import { formatMonthYear } from '@/lib/utils';
import type { CVBrand } from '@/lib/cv/branding';
import type { DossierTemplateId } from '@/lib/cv/templates';

// =========================================================================
// Dossier de compétences — PDF vectoriel (React-PDF), quatre mises en page
// neutres alignées sur l'aperçu HTML. Une mission n'est jamais coupée entre
// deux pages ; le pied de page (marque, pagination) est sur chaque page.
// Polices intégrées (Helvetica, Times) : aucun téléchargement à l'export.
// =========================================================================

type Props = {
  content: CVContent;
  template: DossierTemplateId;
  brand: CVBrand;
  logoSrc?: string;
  showConfidential?: boolean;
  qrSrc?: string;
};

const N = { ink: '#1a1a1a', body: '#2b2b2b', soft: '#555555', mute: '#7a7a7a', faint: '#a3a3a3', line: '#e3e3e3', white: '#ffffff' };

/** Mélange une couleur avec du blanc (fonds teintés, pas de transparence en PDF). */
export function mixWithWhite(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return '#f5f5f5';
  const ch = (shift: number) => {
    const v = (n >> shift) & 255;
    return Math.round(255 - (255 - v) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

const dates = (start: string, end: string | null) => `${formatMonthYear(start)} – ${formatMonthYear(end)}`;
const footerText = (b: CVBrand) => [b.brandName, b.footerTagline].filter(Boolean).join(' — ');

function infoPairs(c: CVContent) {
  const h = c.header;
  return [
    ['Expérience', `${h.yearsExperience} ans`],
    ['Localisation', h.location],
    ['Mobilité', h.mobility],
    ['Disponibilité', h.availability],
  ].filter((p): p is [string, string] => !!p[1]);
}

function Mark({ b, logoSrc, height, onTint }: { b: CVBrand; logoSrc?: string; height: number; onTint?: boolean }) {
  // eslint-disable-next-line jsx-a11y/alt-text -- Image React-PDF : pas d'attribut alt
  if (logoSrc) return <Image src={logoSrc} style={{ height, maxWidth: 150, objectFit: 'contain' }} />;
  if (!b.brandName) return <View />;
  return <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12, color: onTint ? N.ink : b.primary }}>{b.brandName}</Text>;
}

function Qr({ src, b }: { src: string; b: CVBrand }) {
  return (
    <View style={{ padding: 1.5, borderRadius: 5, backgroundColor: mixWithWhite(b.primary, 0.3) }}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- Image React-PDF : pas d'attribut alt */}
      <Image src={src} style={{ width: 46, height: 46, backgroundColor: N.white, borderRadius: 4 }} />
    </View>
  );
}

function Footer({ b, show, inset }: { b: CVBrand; show: boolean; inset: { left: number; right: number } }) {
  return (
    <View
      fixed
      style={{ position: 'absolute', bottom: 18, left: inset.left, right: inset.right, flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.8, color: N.faint, borderTop: `0.5pt solid ${N.line}`, paddingTop: 5 }}
    >
      <Text>{footerText(b)}</Text>
      <Text render={({ pageNumber, totalPages }) => `${show ? 'Confidentiel · ' : ''}${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function DossierPDF({ content, template, brand, logoSrc, showConfidential = true, qrSrc }: Props) {
  const h = content.header;
  const doc = (page: React.ReactNode) => (
    <Document author={brand.brandName || undefined} title={`Dossier de compétences — ${h.displayName}`} subject={h.jobTitle} creator={brand.brandName || undefined}>
      {page}
    </Document>
  );
  const props = { c: content, b: brand, logoSrc, show: showConfidential, qrSrc };
  if (template === 'minimal') return doc(<Minimal {...props} />);
  if (template === 'executive') return doc(<Executive {...props} />);
  if (template === 'dense') return doc(<Compact {...props} />);
  return doc(<Consulting {...props} />);
}

type V = { c: CVContent; b: CVBrand; logoSrc?: string; show: boolean; qrSrc?: string };

// ── 01 Minimal ─────────────────────────────────────────────────────────────

function Minimal({ c, b, logoSrc, show, qrSrc }: V) {
  const s = StyleSheet.create({
    page: { paddingTop: 40, paddingBottom: 52, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 9.4, color: N.body },
    title: { fontSize: 7.6, letterSpacing: 2, textTransform: 'uppercase', color: N.mute, fontFamily: 'Helvetica-Bold' },
    tick: { width: 12, height: 0.8, backgroundColor: b.accent, marginRight: 7 },
    section: { marginTop: 20 },
  });
  const Title = ({ children }: { children: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }} wrap={false} minPresenceAhead={50}>
      <View style={s.tick} />
      <Text style={s.title}>{children}</Text>
    </View>
  );
  return (
    <Page size="A4" style={s.page} wrap>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Mark b={b} logoSrc={logoSrc} height={24} />
          {qrSrc && <Qr src={qrSrc} b={b} />}
        </View>
        {show && <Text style={{ fontSize: 6.8, letterSpacing: 1.4, color: N.faint, textTransform: 'uppercase' }}>Document confidentiel</Text>}
      </View>
      <View style={{ marginTop: 30 }}>
        <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', color: N.ink, letterSpacing: -0.5 }}>{h(c).displayName}</Text>
        <Text style={{ fontSize: 11.5, color: b.primary, marginTop: 3 }}>{h(c).jobTitle}</Text>
        {h(c).subTitle ? <Text style={{ fontSize: 9.5, color: N.mute, marginTop: 1 }}>{h(c).subTitle}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, fontSize: 8.4 }}>
          {infoPairs(c).map(([k, v]) => (
            <Text key={k} style={{ marginRight: 14, marginBottom: 2 }}>
              <Text style={{ color: N.faint }}>{k.toUpperCase()}  </Text>
              {v}
            </Text>
          ))}
          {c.languages.length > 0 ? (
            <Text>
              <Text style={{ color: N.faint }}>LANGUES  </Text>
              {c.languages.map((l) => `${l.code.toUpperCase()} ${l.level}`).join(' · ')}
            </Text>
          ) : null}
        </View>
      </View>
      {c.summary ? (
        <View style={s.section}>
          <Title>Profil</Title>
          <Text style={{ fontSize: 9.4, lineHeight: 1.6 }}>{c.summary}</Text>
        </View>
      ) : null}
      {c.skillCategories.length > 0 ? (
        <View style={s.section}>
          <Title>Compétences</Title>
          {c.skillCategories.map((cat, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }} wrap={false}>
              <Text style={{ width: 92, fontSize: 7.2, letterSpacing: 1, color: N.mute, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', paddingTop: 1 }}>{cat.name}</Text>
              <Text style={{ flex: 1, fontSize: 9.4, lineHeight: 1.45 }}>{cat.items.join('  ·  ')}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {c.experiences.length > 0 ? (
        <View style={s.section}>
          <Title>Expériences</Title>
          {c.experiences.map((x) => (
            <View key={x.id} style={{ marginBottom: 13 }} wrap={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ flex: 1, fontSize: 10.2 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', color: N.ink }}>{x.role}</Text>
                  <Text style={{ color: N.faint }}>  ·  </Text>
                  <Text style={{ color: b.primary }}>{x.client_name}</Text>
                </Text>
                <Text style={{ fontSize: 7.6, color: N.mute, letterSpacing: 0.6 }}>{dates(x.start_date, x.end_date).toUpperCase()}</Text>
              </View>
              {x.context ? <Text style={{ fontSize: 8.6, lineHeight: 1.4, color: N.mute, marginTop: 2 }}>{x.context}</Text> : null}
              {(x.tasks ?? []).map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', marginTop: 2 }}>
                  <Text style={{ width: 9, color: b.accent }}>–</Text>
                  <Text style={{ flex: 1, fontSize: 9.4, lineHeight: 1.45 }}>{t}</Text>
                </View>
              ))}
              {x.environment?.length ? (
                <Text style={{ fontSize: 7.6, color: N.mute, marginTop: 3 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>ENVIRONNEMENT  </Text>
                  {x.environment.join(' · ')}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {c.educations.length > 0 ? (
        <View style={s.section} wrap={false}>
          <Title>Formation</Title>
          {c.educations.map((e) => (
            <Text key={e.id} style={{ marginBottom: 2 }}>
              <Text style={{ color: N.faint }}>{e.year}   </Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{e.degree}</Text>
              {e.institution ? <Text style={{ color: N.mute }}> — {e.institution}</Text> : null}
            </Text>
          ))}
        </View>
      ) : null}
      <Footer b={b} show={show} inset={{ left: 48, right: 48 }} />
    </Page>
  );
}

const h = (c: CVContent) => c.header;

// ── 02 Consulting ──────────────────────────────────────────────────────────

const SIDE = 186;

function Consulting({ c, b, logoSrc, show, qrSrc }: V) {
  const tintBg = mixWithWhite(b.primary, 0.06);
  const s = StyleSheet.create({
    page: { paddingTop: 38, paddingBottom: 50, paddingLeft: SIDE + 26, paddingRight: 32, fontFamily: 'Helvetica', fontSize: 9, color: N.body },
    asideTitle: { fontSize: 7, letterSpacing: 1.6, fontFamily: 'Helvetica-Bold', color: b.primary, textTransform: 'uppercase', marginBottom: 5, marginTop: 14 },
    title: { fontSize: 8.4, letterSpacing: 1.6, fontFamily: 'Helvetica-Bold', color: b.primary, textTransform: 'uppercase', paddingBottom: 4, borderBottom: `0.6pt solid ${N.line}`, marginBottom: 8 },
  });
  return (
    <Page size="A4" style={s.page} wrap>
      {/* Fond de la colonne sur chaque page ; contenu de la colonne en page 1. */}
      <View fixed style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: SIDE, backgroundColor: tintBg }} />
      <View style={{ position: 'absolute', top: 38, left: 22, width: SIDE - 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Mark b={b} logoSrc={logoSrc} height={24} onTint />
          {qrSrc && <Qr src={qrSrc} b={b} />}
        </View>
        <Text style={{ fontSize: 17, fontFamily: 'Helvetica-Bold', color: N.ink, marginTop: 22, lineHeight: 1.15 }}>{c.header.displayName}</Text>
        <Text style={{ fontSize: 9.6, fontFamily: 'Helvetica-Bold', color: b.primary, marginTop: 4 }}>{c.header.jobTitle}</Text>
        {c.header.subTitle ? <Text style={{ fontSize: 8, color: N.soft, marginTop: 2 }}>{c.header.subTitle}</Text> : null}
        <View style={{ marginTop: 10 }}>
          {infoPairs(c).map(([k, v]) => (
            <View key={k} style={{ marginBottom: 5 }}>
              <Text style={{ fontSize: 6.4, letterSpacing: 1.2, color: N.mute }}>{k.toUpperCase()}</Text>
              <Text style={{ fontSize: 8.4, fontFamily: 'Helvetica-Bold' }}>{v}</Text>
            </View>
          ))}
        </View>
        {c.languages.length > 0 ? (
          <View>
            <Text style={s.asideTitle}>Langues</Text>
            {c.languages.map((l, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', fontSize: 8.2, marginBottom: 1.5 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{l.code.toUpperCase()}</Text>
                <Text style={{ color: N.soft }}>{l.level}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {c.skillCategories.length > 0 ? (
          <View>
            <Text style={s.asideTitle}>Compétences</Text>
            {c.skillCategories.map((cat, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <Text style={{ fontSize: 7.6, fontFamily: 'Helvetica-Bold', color: N.soft, marginBottom: 2 }}>{cat.name}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {cat.items.map((it, j) => (
                    <Text key={j} style={{ fontSize: 7.4, backgroundColor: N.white, borderRadius: 3, paddingHorizontal: 3.5, paddingVertical: 1.2, marginRight: 2.5, marginBottom: 2.5, border: `0.5pt solid ${mixWithWhite(b.accent, 0.45)}` }}>
                      {it}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {c.educations.length > 0 ? (
          <View>
            <Text style={s.asideTitle}>Formation</Text>
            {c.educations.map((e) => (
              <View key={e.id} style={{ marginBottom: 5, fontSize: 7.8 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', color: N.mute }}>{e.year}</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{e.degree}</Text>
                {e.institution ? <Text style={{ color: N.soft }}>{e.institution}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {show && <Text style={{ fontSize: 6.6, letterSpacing: 1.4, color: N.faint, textAlign: 'right', textTransform: 'uppercase', marginBottom: 12 }}>Document confidentiel</Text>}
      {c.summary ? (
        <View>
          <Text style={s.title}>Profil</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.55 }}>{c.summary}</Text>
        </View>
      ) : null}
      {c.experiences.length > 0 ? (
        <View style={{ marginTop: 18 }}>
          <View wrap={false} minPresenceAhead={60}>
            <Text style={s.title}>Expériences</Text>
          </View>
          {c.experiences.map((x) => (
            <View key={x.id} style={{ marginBottom: 12 }} wrap={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ flex: 1, fontSize: 9.8 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', color: N.ink }}>{x.client_name}</Text>
                  <Text style={{ color: N.soft }}> — {x.role}</Text>
                </Text>
                <Text style={{ fontSize: 7.2, fontFamily: 'Helvetica-Bold', color: N.mute }}>{dates(x.start_date, x.end_date).toUpperCase()}</Text>
              </View>
              {x.context ? <Text style={{ fontSize: 8.4, lineHeight: 1.4, color: N.soft, fontFamily: 'Helvetica-Oblique', marginTop: 2 }}>{x.context}</Text> : null}
              {(x.tasks ?? []).map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', marginTop: 2 }}>
                  <View style={{ width: 3.2, height: 3.2, borderRadius: 1.6, backgroundColor: b.accent, marginTop: 4, marginRight: 6 }} />
                  <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.45 }}>{t}</Text>
                </View>
              ))}
              {x.environment?.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                  {x.environment.map((e, i) => (
                    <Text key={i} style={{ fontSize: 7, backgroundColor: mixWithWhite(b.primary, 0.08), borderRadius: 2, paddingHorizontal: 3, paddingVertical: 1, marginRight: 2.5, marginBottom: 2 }}>
                      {e}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      <Footer b={b} show={show} inset={{ left: SIDE + 26, right: 32 }} />
    </Page>
  );
}

// ── 03 Executive ───────────────────────────────────────────────────────────

function Executive({ c, b, logoSrc, show, qrSrc }: V) {
  const s = StyleSheet.create({
    page: { paddingTop: 44, paddingBottom: 54, paddingHorizontal: 56, fontFamily: 'Helvetica', fontSize: 9.2, color: N.body },
    section: { marginTop: 22 },
  });
  const Title = ({ children }: { children: string }) => (
    <View style={{ marginBottom: 9 }} wrap={false} minPresenceAhead={50}>
      <Text style={{ fontFamily: 'Times-Bold', fontSize: 13, color: N.ink }}>{children}</Text>
      <View style={{ width: 20, height: 1.6, backgroundColor: b.accent, marginTop: 4 }} />
    </View>
  );
  return (
    <Page size="A4" style={s.page} wrap>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Mark b={b} logoSrc={logoSrc} height={26} />
          {qrSrc && <Qr src={qrSrc} b={b} />}
        </View>
        {show && <Text style={{ fontSize: 6.8, letterSpacing: 1.4, color: N.faint, textTransform: 'uppercase' }}>Document confidentiel</Text>}
      </View>
      <View style={{ marginTop: 32 }}>
        <Text style={{ fontFamily: 'Times-Roman', fontSize: 27, color: N.ink, lineHeight: 1.1 }}>{c.header.displayName}</Text>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.4, letterSpacing: 2.2, color: b.primary, marginTop: 7, textTransform: 'uppercase' }}>{c.header.jobTitle}</Text>
        {c.header.subTitle ? <Text style={{ fontFamily: 'Times-Italic', fontSize: 10.5, color: N.soft, marginTop: 3 }}>{c.header.subTitle}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, paddingVertical: 6, borderTop: `0.6pt solid ${N.line}`, borderBottom: `0.6pt solid ${N.line}`, fontSize: 8 }}>
          {infoPairs(c).map(([k, v]) => (
            <Text key={k} style={{ marginRight: 16 }}>
              <Text style={{ color: N.faint }}>{k.toUpperCase()}  </Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{v}</Text>
            </Text>
          ))}
          {c.languages.length > 0 ? (
            <Text>
              <Text style={{ color: N.faint }}>LANGUES  </Text>
              {c.languages.map((l) => `${l.code.toUpperCase()} ${l.level}`).join(' · ')}
            </Text>
          ) : null}
        </View>
      </View>
      {c.summary ? (
        <View style={{ marginTop: 20, borderLeft: `1.6pt solid ${b.accent}`, paddingLeft: 12 }}>
          <Text style={{ fontFamily: 'Times-Roman', fontSize: 11, lineHeight: 1.65, color: N.body }}>{c.summary}</Text>
        </View>
      ) : null}
      {c.skillCategories.length > 0 ? (
        <View style={s.section}>
          <Title>Compétences clés</Title>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {c.skillCategories.map((cat, i) => (
              <View key={i} style={{ width: '33.33%', paddingRight: 12, marginBottom: 9 }} wrap={false}>
                <Text style={{ fontFamily: 'Times-Bold', fontSize: 9.6, color: b.primary, marginBottom: 2 }}>{cat.name}</Text>
                {cat.items.map((it, j) => (
                  <Text key={j} style={{ fontSize: 8.4, lineHeight: 1.4, color: N.soft }}>
                    {it}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {c.experiences.length > 0 ? (
        <View style={s.section}>
          <Title>Parcours</Title>
          {c.experiences.map((x) => (
            <View key={x.id} style={{ marginBottom: 15 }} wrap={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Text style={{ flex: 1, fontFamily: 'Times-Bold', fontSize: 12, color: N.ink }}>{x.role}</Text>
                <Text style={{ fontSize: 7.4, letterSpacing: 1, color: N.mute }}>{dates(x.start_date, x.end_date).toUpperCase()}</Text>
              </View>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.8, letterSpacing: 1.6, color: b.primary, marginTop: 2, textTransform: 'uppercase' }}>{x.client_name}</Text>
              {x.context ? <Text style={{ fontFamily: 'Times-Italic', fontSize: 9.4, lineHeight: 1.4, color: N.soft, marginTop: 4 }}>{x.context}</Text> : null}
              {(x.tasks ?? []).map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', marginTop: 2.5 }}>
                  <View style={{ width: 8, height: 0.8, backgroundColor: b.accent, marginTop: 5.5, marginRight: 6 }} />
                  <Text style={{ flex: 1, fontSize: 9.2, lineHeight: 1.45 }}>{t}</Text>
                </View>
              ))}
              {x.environment?.length ? (
                <Text style={{ fontSize: 7.6, color: N.mute, marginTop: 4 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>ENVIRONNEMENT  </Text>
                  {x.environment.join(' · ')}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {c.educations.length > 0 ? (
        <View style={s.section} wrap={false}>
          <Title>Formation</Title>
          {c.educations.map((e) => (
            <Text key={e.id} style={{ marginBottom: 2 }}>
              <Text style={{ color: N.faint }}>{e.year}   </Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{e.degree}</Text>
              {e.institution ? <Text style={{ color: N.mute }}> — {e.institution}</Text> : null}
            </Text>
          ))}
        </View>
      ) : null}
      <Footer b={b} show={show} inset={{ left: 56, right: 56 }} />
    </Page>
  );
}

// ── 04 Compact ─────────────────────────────────────────────────────────────

function Compact({ c, b, logoSrc, show, qrSrc }: V) {
  const s = StyleSheet.create({
    page: { paddingTop: 28, paddingBottom: 44, paddingHorizontal: 34, fontFamily: 'Helvetica', fontSize: 8.4, color: N.body },
    section: { marginTop: 11 },
  });
  const Title = ({ children }: { children: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }} wrap={false} minPresenceAhead={40}>
      <Text style={{ fontSize: 7, letterSpacing: 1.4, fontFamily: 'Helvetica-Bold', color: b.primary, textTransform: 'uppercase', marginRight: 6 }}>{children}</Text>
      <View style={{ flex: 1, height: 0.6, backgroundColor: mixWithWhite(b.primary, 0.3) }} />
    </View>
  );
  return (
    <Page size="A4" style={s.page} wrap>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 7, borderBottom: `1.6pt solid ${b.primary}` }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontFamily: 'Helvetica-Bold', color: N.ink, letterSpacing: -0.4 }}>{c.header.displayName}</Text>
          <Text style={{ fontSize: 9.2, marginTop: 2 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', color: b.primary }}>{c.header.jobTitle}</Text>
            {c.header.subTitle ? <Text style={{ color: N.soft }}>  ·  {c.header.subTitle}</Text> : null}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {qrSrc && <Qr src={qrSrc} b={b} />}
          <Mark b={b} logoSrc={logoSrc} height={22} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: mixWithWhite(b.primary, 0.05), borderRadius: 3 }}>
        {infoPairs(c).map(([k, v]) => (
          <View key={k} style={{ flex: 1 }}>
            <Text style={{ fontSize: 5.8, letterSpacing: 1, color: N.mute }}>{k.toUpperCase()}</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{v}</Text>
          </View>
        ))}
      </View>
      {c.summary ? (
        <View style={s.section}>
          <Title>Profil</Title>
          <Text style={{ fontSize: 8.4, lineHeight: 1.4 }}>{c.summary}</Text>
        </View>
      ) : null}
      {c.skillCategories.length > 0 ? (
        <View style={s.section}>
          <Title>Compétences</Title>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {c.skillCategories.map((cat, i) => (
              <View key={i} style={{ width: '50%', flexDirection: 'row', paddingRight: 10, marginBottom: 2 }} wrap={false}>
                <Text style={{ width: 70, fontSize: 6.6, letterSpacing: 0.6, color: N.mute, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', paddingTop: 1 }}>{cat.name}</Text>
                <Text style={{ flex: 1, fontSize: 8.4, lineHeight: 1.35 }}>{cat.items.join(' · ')}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {c.experiences.length > 0 ? (
        <View style={s.section}>
          <Title>Expériences</Title>
          {c.experiences.map((x) => (
            <View key={x.id} style={{ flexDirection: 'row', marginBottom: 7 }} wrap={false}>
              <Text style={{ width: 66, fontSize: 6.8, fontFamily: 'Helvetica-Bold', color: N.mute, paddingTop: 1 }}>{dates(x.start_date, x.end_date).toUpperCase()}</Text>
              <View style={{ flex: 1, borderLeft: `0.8pt solid ${mixWithWhite(b.accent, 0.5)}`, paddingLeft: 7 }}>
                <Text style={{ fontSize: 8.8 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', color: N.ink }}>{x.client_name}</Text>
                  <Text style={{ color: N.faint }}>  ·  </Text>
                  <Text style={{ color: b.primary }}>{x.role}</Text>
                </Text>
                {x.context ? <Text style={{ fontSize: 7.6, lineHeight: 1.35, color: N.mute, marginTop: 1 }}>{x.context}</Text> : null}
                {(x.tasks ?? []).map((t, i) => (
                  <View key={i} style={{ flexDirection: 'row', marginTop: 1 }}>
                    <Text style={{ width: 7, color: b.accent }}>›</Text>
                    <Text style={{ flex: 1, fontSize: 8.4, lineHeight: 1.35 }}>{t}</Text>
                  </View>
                ))}
                {x.environment?.length ? <Text style={{ fontSize: 6.8, color: N.soft, marginTop: 2 }}>{x.environment.join(' · ')}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {c.educations.length > 0 || c.languages.length > 0 ? (
        <View style={[s.section, { flexDirection: 'row' }]} wrap={false}>
          {c.educations.length > 0 ? (
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Title>Formation</Title>
              {c.educations.map((e) => (
                <Text key={e.id} style={{ marginBottom: 1.5 }}>
                  <Text style={{ color: N.faint }}>{e.year}  </Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>{e.degree}</Text>
                  {e.institution ? <Text style={{ color: N.mute }}> — {e.institution}</Text> : null}
                </Text>
              ))}
            </View>
          ) : null}
          {c.languages.length > 0 ? (
            <View style={{ flex: 1 }}>
              <Title>Langues</Title>
              <Text>{c.languages.map((l) => `${l.code.toUpperCase()} ${l.level}`).join('  ·  ')}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <Footer b={b} show={show} inset={{ left: 34, right: 34 }} />
    </Page>
  );
}
