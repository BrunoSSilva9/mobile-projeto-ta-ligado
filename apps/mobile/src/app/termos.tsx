import { DocumentoLegalView } from '@/components/DocumentoLegalView';
import { TERMOS_DE_USO } from '@/legal/conteudo';

export default function TermosScreen() {
  return <DocumentoLegalView documento={TERMOS_DE_USO} />;
}
