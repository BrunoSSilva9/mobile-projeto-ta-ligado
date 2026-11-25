import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Button } from '@/components/Button';
import { Cartao } from '@/components/Cartao';
import { useCancelarDenuncia } from '@/features/acompanhamento/hooks';
import { ErroDeApi } from '@/services/http';
import { space } from '@/theme';

export const PERGUNTA_DE_CANCELAMENTO =
  'Cancelar esta denúncia? A operadora deixa de receber o seu aviso, e isso não pode ser desfeito.';

/** Mensagem de erro do cancelamento, em linguagem simples. */
function mensagemDoErro(erro: unknown): string {
  if (erro instanceof ErroDeApi && erro.status === 422) {
    return 'Não deu para cancelar: a operadora já começou o atendimento desta denúncia.';
  }
  if (erro instanceof Error && erro.message) return erro.message;
  return 'Não foi possível cancelar agora. Tente de novo.';
}

/**
 * "Cancelar denúncia" no detalhe (T-07; RF-015, RN-005, decisão S-55). Só aparece em `RECEBIDA`
 * (quem decide é a tela). O primeiro toque abre uma confirmação na própria tela, com a pergunta e
 * os botões "Sim, cancelar" e "Não, voltar"; só o "Sim" chama a API. O leitor de tela ouve a
 * pergunta ao abrir.
 */
export function CancelarDenuncia({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const cancelar = useCancelarDenuncia(id);

  const abrir = () => {
    cancelar.reset();
    setConfirmando(true);
    AccessibilityInfo.announceForAccessibility(PERGUNTA_DE_CANCELAMENTO);
  };

  if (!confirmando) {
    return (
      <View style={styles.bloco}>
        {cancelar.isError ? <Aviso tom="erro">{mensagemDoErro(cancelar.error)}</Aviso> : null}
        <Button
          testID="botao-cancelar-denuncia"
          titulo="Cancelar denúncia"
          variante="secundario"
          nomeDoIcone="close-circle-outline"
          onPress={abrir}
        />
      </View>
    );
  }

  return (
    <Cartao testID="confirmacao-de-cancelamento" style={styles.bloco}>
      <Aviso tom="atencao" icone="help-circle">
        {PERGUNTA_DE_CANCELAMENTO}
      </Aviso>
      <Button
        titulo="Sim, cancelar"
        carregando={cancelar.isPending}
        onPress={() =>
          cancelar.mutate(undefined, {
            onSuccess: () => {
              setConfirmando(false);
              AccessibilityInfo.announceForAccessibility('Denúncia cancelada.');
            },
            onError: () => setConfirmando(false),
          })
        }
      />
      <Button
        titulo="Não, voltar"
        variante="secundario"
        desabilitado={cancelar.isPending}
        onPress={() => setConfirmando(false)}
      />
    </Cartao>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.s },
});
