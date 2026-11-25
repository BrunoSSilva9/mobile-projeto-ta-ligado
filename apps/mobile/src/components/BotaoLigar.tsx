import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Button } from '@/components/Button';
import { CONTATOS, telefoneParaUrl } from '@/config/constants';
import { space } from '@/theme';

type Props = {
  titulo?: string;
  /** Número a ligar. Padrão: o da Equatorial (placeholder em `constants.ts`, PEN-02). */
  numero?: string;
  variante?: 'primario' | 'secundario';
};

/**
 * Botão que abre o discador (`tel:`). Se o aparelho não puder ligar (tablet sem chip, simulador,
 * erro ao abrir), mostra uma mensagem clara com o número para anotar, em vez de não fazer nada.
 */
export function BotaoLigar({
  titulo = 'Ligar para a Equatorial',
  numero = CONTATOS.concessionariaTelefone,
  variante = 'secundario',
}: Props) {
  const [falhou, setFalhou] = useState(false);

  const ligar = async () => {
    setFalhou(false);
    const url = telefoneParaUrl(numero);
    try {
      if (!(await Linking.canOpenURL(url))) throw new Error('sem suporte a chamadas');
      await Linking.openURL(url);
    } catch {
      setFalhou(true);
    }
  };

  return (
    <View style={styles.bloco}>
      <Button titulo={titulo} variante={variante} nomeDoIcone="call" onPress={() => void ligar()} />
      {falhou ? (
        <Aviso tom="atencao" icone="call-outline">
          {`Este aparelho não conseguiu abrir o telefone. Anote o número e ligue de outro aparelho: ${numero}.`}
        </Aviso>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ bloco: { gap: space.s } });
