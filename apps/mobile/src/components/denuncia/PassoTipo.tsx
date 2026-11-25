import { Controller, type Control } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { CartaoDeEscolha } from '@/components/CartaoDeEscolha';
import { CONTATOS } from '@/config/constants';
import type { DadosDaDenuncia } from '@/features/denuncia/schemas';
import { TITULOS_DOS_PASSOS } from '@/features/denuncia/passos';
import { colors, space, type } from '@/theme';

type Props = { control: Control<DadosDaDenuncia>; erro?: string };

/**
 * Passo 1 · "O que está acontecendo?": dois cartões grandes de escolha (rádio) e o aviso de
 * segurança. O botão "Continuar" fica no rodapé fixo da tela.
 */
export function PassoTipo({ control, erro }: Props) {
  return (
    <View style={styles.bloco}>
      <Text accessibilityRole="header" style={[type.title1, styles.titulo]}>
        {TITULOS_DOS_PASSOS[1]}
      </Text>
      <Text style={[type.body, styles.apoio]}>Toque na opção que combina com a sua casa.</Text>

      <Controller
        control={control}
        name="tipo"
        render={({ field }) => (
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={TITULOS_DOS_PASSOS[1]}
            style={styles.opcoes}
          >
            <CartaoDeEscolha
              titulo="Estou sem energia"
              descricao="A luz acabou de vez. Nada liga."
              icone="flash-off"
              fundoDoIcone={colors.situacao.semEnergia.fundo}
              corDoIcone={colors.situacao.semEnergia.texto}
              selecionado={field.value === 'SEM_ENERGIA'}
              onPress={() => field.onChange('SEM_ENERGIA')}
            />
            <CartaoDeEscolha
              titulo="A energia está oscilando"
              descricao="A luz pisca, fica fraca ou cai e volta."
              icone="pulse"
              fundoDoIcone={colors.situacao.oscilando.fundo}
              corDoIcone={colors.situacao.oscilando.texto}
              selecionado={field.value === 'OSCILACAO'}
              onPress={() => field.onChange('OSCILACAO')}
            />
          </View>
        )}
      />
      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

      <Aviso tom="erro" icone="warning" anunciar={false}>
        {`Fio caído ou risco de choque? Não chegue perto. Ligue para os Bombeiros: ${CONTATOS.bombeirosTelefone}.`}
      </Aviso>
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.m },
  titulo: { color: colors.textPrimary },
  apoio: { color: colors.textSecondary },
  opcoes: { gap: space.m },
});
