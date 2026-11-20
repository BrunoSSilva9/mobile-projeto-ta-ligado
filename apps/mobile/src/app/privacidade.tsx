import { DocumentoLegalView } from '@/components/DocumentoLegalView';
import { POLITICA_DE_PRIVACIDADE } from '@/legal/conteudo';

export default function PrivacidadeScreen() {
  return <DocumentoLegalView documento={POLITICA_DE_PRIVACIDADE} />;
}
