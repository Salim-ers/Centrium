'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FileSignature, Download, FileDown, Loader2 } from 'lucide-react';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { CVRenderer } from '@/components/cv/CVRenderer';
import { generateCVDocx } from '@/lib/cv/export-docx';
import type { CVContent, CVTemplateId } from '@/types';

const SAMPLE_CONTENT: CVContent = {
  header: {
    displayName: 'A. S.',
    jobTitle: 'QA Automation Confirmé',
    subTitle: 'Playwright / TypeScript / SQL — Web & Mobile',
    yearsExperience: 7,
    location: 'Paris',
    mobility: 'IDF, remote 2-3j/semaine',
    availability: 'Disponible dès 01/07/2026',
  },
  summary:
    "QA Automation Confirmé avec 7 ans d'expérience. Expertise Playwright, TypeScript, Postman. Expériences significatives : LVMH – Dior, Agorapulse, FuturMaster. Intervention récente chez LVMH – Dior.",
  skillCategories: [
    {
      name: 'Automatisation',
      items: ['Playwright', 'Cypress', 'Selenium'],
      highlighted: ['Playwright'],
    },
    {
      name: 'Langages',
      items: ['TypeScript', 'Python', 'SQL'],
      highlighted: ['TypeScript', 'SQL'],
    },
    { name: 'Tests / QA', items: ['Postman (API)', 'Gherkin / BDD'], highlighted: ['Postman (API)'] },
    { name: 'CI/CD', items: ['GitHub Actions'] },
    { name: 'Méthodologies', items: ['Agile (Scrum, SAFe)'] },
    { name: 'Plateformes', items: ['Salesforce Commerce Cloud', 'SAP SD'] },
  ],
  experiences: [
    {
      id: '1',
      consultant_id: 'x',
      client_name: 'LVMH – Dior',
      role: 'QA Automation Confirmé Playwright',
      start_date: '2023-01-01',
      end_date: null,
      context:
        "Projet e-Commerce Dior. Migration SFCC headless → SFRA. Refonte des sites marchés internationaux.",
      tasks: [
        "Pilotage des releases côté QA",
        "Rédaction de la stratégie de test transverse",
        "Automatisation des tests E2E critiques (Playwright/TypeScript)",
        "Tests API via Postman et analyse des logs d'erreurs",
        "Collaboration avec équipes internationales",
      ],
      environment: ['Salesforce Commerce Cloud', 'Playwright', 'TypeScript', 'Postman', 'SAP SD'],
      order_index: 1,
      created_at: '',
    },
    {
      id: '2',
      consultant_id: 'x',
      client_name: 'Agorapulse',
      role: 'QA Automatisation',
      start_date: '2022-01-01',
      end_date: '2023-01-01',
      context: "Éditeur SaaS gestion réseaux sociaux. Équipe agile.",
      tasks: [
        "Contribution aux cérémonies scrum",
        "Rédaction des critères d'acceptation en Gherkin",
        "Automatisation des TNR avec Cypress",
        "Mise en place CI/CD via GitHub Actions",
      ],
      environment: ['Jira', 'Postman', 'Cypress', 'GitHub Actions'],
      order_index: 2,
      created_at: '',
    },
  ],
  educations: [
    {
      id: 'e1',
      consultant_id: 'x',
      year: 2020,
      degree: 'Mastère Management et Conseil en SI',
      institution: null,
      created_at: '',
    },
    {
      id: 'e2',
      consultant_id: 'x',
      year: 2018,
      degree: 'Licence Ingénierie du Web',
      institution: null,
      created_at: '',
    },
  ],
  languages: [
    { code: 'fr', level: 'Natif' },
    { code: 'en', level: 'Professionnel' },
  ],
};

const TEMPLATE_DESCRIPTIONS: Record<CVTemplateId, { title: string; body: string }> = {
  standard: {
    title: 'Standard — Profils confirmés (2-7 ans)',
    body: 'Équilibré, toutes sections visibles. Idéal pour la plupart des consultants.',
  },
  dense: {
    title: 'Dense — Profils seniors avec >4 expériences',
    body: "Deux colonnes avec sidebar sombre. Tient sur 2 pages même avec beaucoup d'expériences.",
  },
  executive: {
    title: 'Executive — Directeurs, leads, architectes',
    body: 'Résumé exécutif proéminent, moins de technique, plus de pilotage. Impact visuel maximal.',
  },
};

export default function TemplatesPage() {
  const [template, setTemplate] = useState<CVTemplateId>('standard');
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);

  function exportPDF() {
    setExporting('pdf');
    setTimeout(() => {
      window.print();
      setExporting(null);
    }, 100);
  }

  async function exportDOCX() {
    setExporting('docx');
    try {
      const blob = await generateCVDocx(SAMPLE_CONTENT);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV_QuadCore_${template}_demo.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('DOCX téléchargé');
    } catch (e) {
      console.error(e);
      toast.error('Erreur export DOCX');
    } finally {
      setExporting(null);
    }
  }

  const desc = TEMPLATE_DESCRIPTIONS[template];

  return (
    <AppShell>
      <div className="no-print mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileSignature className="h-7 w-7 text-violet-glow" />
          Templates CV QuadCore
        </h1>
        <p className="text-muted-foreground mt-1">
          Trois variantes propriétaires pour couvrir tous les profils consultants.
        </p>
      </div>

      <div className="no-print">
        <Tabs value={template} onValueChange={(v) => setTemplate(v as CVTemplateId)}>
          <TabsList>
            <TabsTrigger value="standard">QuadCore Standard</TabsTrigger>
            <TabsTrigger value="dense">QuadCore Dense</TabsTrigger>
            <TabsTrigger value="executive">QuadCore Executive</TabsTrigger>
          </TabsList>

          <TabsContent value={template}>
            <div className="mb-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{desc.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{desc.body}</p>
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <Button onClick={exportPDF} disabled={exporting !== null}>
                      {exporting === 'pdf' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Télécharger PDF
                    </Button>
                    <Button variant="outline" onClick={exportDOCX} disabled={exporting !== null}>
                      {exporting === 'docx' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      Télécharger Word (.docx)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="overflow-auto bg-neutral-200 p-6 rounded-xl">
              <CVRenderer content={SAMPLE_CONTENT} templateId={template} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Version imprimable plein écran */}
      <div className="print-only hidden print:block">
        <CVRenderer content={SAMPLE_CONTENT} templateId={template} />
      </div>
    </AppShell>
  );
}
