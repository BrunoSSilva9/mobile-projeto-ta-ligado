import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Button } from '@/components/Button';
import { Cartao } from '@/components/Cartao';
import { SeloDeSituacao } from '@/components/SeloDeSituacao';
import { TextField } from '@/components/TextField';
import { TITULOS_DOS_PASSOS } from '@/features/denuncia/passos';
import { LIMITE_DA_DESCRICAO, type DadosDaDenuncia } from '@/features/denuncia/schemas';
import { situacaoDoTipo } from '@/features/situacao';
import { colors, space, type } from '@/theme';

type Props = {
  control: Control<DadosDaDenuncia>;
  errors: FieldErrors<DadosDaDenuncia>;
  /** Para o resumo do que será enviado. */
  tipo: DadosDaDenuncia['tipo'] | undefined;
  logradouro: string;
  bairroNome: string | null;
  /** `null` = sem aviso; `''` = já há denúncia em aberto, sem saber qual; senão, o id dela. */
  denunciaEmAberto: string | null;
  onVerDenunciaEmAberto: () => void;
  erroGeral: string | null;
};

/**
 * Passo 3 · "Quer contar mais alguma coisa?": descrição e ponto de referência (opcionais), o
 * **resumo** do que será enviado e, no rodapé, "Enviar denúncia". É aqui que aparecem o aviso de
 * denúncia em aberto (409), os erros gerais do envio e o aviso de falta de conexão.
 * Fotos, pessoas no local e necessidade especial entram neste passo na Fase 2.
 */
export function PassoDetalhes({
  control,
  errors,
  tipo,
  logradouro,
  bairroNome,
  denunciaEmAberto,
  onVerDenunciaEmAberto,
  erroGeral,
}: Props) {
  return (
    <View style={styles.bloco}>
      <Text accessibilityRole="header" style={[type.title1, styles.titulo]}>
        {TITULOS_DOS_PASSOS[3]}
      </Text>

      <Controller
        control={control}
        name="descricao"
        render={({ field }) => (
          <TextField
            rotulo="Descreva o que aconteceu (opcional)"
            placeholder="Ex.: sem energia desde as 14h, toda a rua"
            multiline
            maxLength={LIMITE_DA_DESCRICAO}
            ajuda={`${field.value.length}/${LIMITE_DA_DESCRICAO} caracteres`}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erro={errors.descricao?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="pontoReferencia"
        render={({ field }) => (
          <TextField
            rotulo="Ponto de referência (opcional)"
            placeholder="Ex.: perto da padaria"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erro={errors.pontoReferencia?.message}
          />
        )}
      />

      <Cartao>
        <Text accessibilityRole="header" style={[type.label, styles.apoio]}>
          O que será enviado
        </Text>
        {tipo ? <SeloDeSituacao situacao={situacaoDoTipo(tipo)} /> : null}
        <Text style={[type.title3, { color: colors.textPrimary }]}>{logradouro}</Text>
        {bairroNome ? (
          <Text style={[type.bodySmall, styles.apoio]}>{`${bairroNome}, Marabá`}</Text>
        ) : null}
      </Cartao>

      <Aviso tom="info" icone="shield-checkmark-outline" anunciar={false}>
        Envie só avisos verdadeiros: denúncias falsas atrapalham o atendimento de quem precisa.
      </Aviso>

      {denunciaEmAberto !== null ? (
        <View style={styles.aviso409}>
          <Aviso tom="atencao">
            Você já tem uma denúncia em aberto. Acompanhe-a antes de registrar outra.
          </Aviso>
          <Button
            titulo={denunciaEmAberto ? 'Ver minha denúncia' : 'Ver minhas denúncias'}
            variante="secundario"
            onPress={onVerDenunciaEmAberto}
          />
        </View>
      ) : null}

      {erroGeral ? <Aviso tom="erro">{erroGeral}</Aviso> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.l },
  titulo: { color: colors.textPrimary },
  apoio: { color: colors.textSecondary },
  aviso409: { gap: space.s },
});
