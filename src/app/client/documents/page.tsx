import { SharedDocumentsList } from '@/components/portal/SharedDocumentsList';

export default function ClientDocumentsPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">Documents</h1>
        <p className="text-[13.5px] text-muted-foreground">Documents partagés par votre prestataire (propositions, bons de commande, documents de mission…).</p>
      </header>
      <SharedDocumentsList endpoint="/api/client/documents" cacheKey="client-shared-docs" />
    </div>
  );
}
