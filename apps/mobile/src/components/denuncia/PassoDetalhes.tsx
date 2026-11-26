import { Controller, useWatch, type Control, type FieldErrors } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Button } from '@/components/Button';
import { Cartao } from '@/components/Cartao';
import { CartaoDeEscolha } from '@/components/CartaoDeEscolha';
import { Checkbox } from '@/components/Checkbox';
import { FilterChip } from '@/components/FilterChip';
import { SeletorDeFotos } from '@/components/denuncia/SeletorDeFotos';
import { SeloDeSituacao } from '@/components/SeloDeSituacao';
import { TextField } from '@/components/TextField';
import type { FotoDoFormulario } from '@/features/denuncia/fotos';
import { TITULOS_DOS_PASSOS } from '@/features/denuncia/passos';
import {
  FAIXAS_DE_PESSOAS,
  LIMITE_DA_DESCRICAO,
  necessidadeAoEnviar,
  PERGUNTA_DA_NECESSIDADE,
  rotuloDaFaixa,
  TEXTO_DO_CONSENTIMENTO,
  type DadosDaDenuncia,
} from '@/features/denuncia/schemas';
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
  /** Fotos já escolhidas (JPEG reduzido). Não vão para o rascunho (S-56). */
  fotos: readonly FotoDoFormulario[];
  onAlterarFotos: (fotos: FotoDoFormulario[]) => void;
};

/** Frase do resumo para a necessidade especial (o que vai, ou não vai, para a Equatorial). */
const TEXTO_DO_RESUMO = {
  sim: 'Necessidade especial: sim (com a sua autorização)',
  nao: 'Necessidade especial: não',
  'sem-autorizacao': 'Necessidade especial: não será enviada (falta a sua autorização)',
} as const;

/**
 * Passo 3 · "Quer contar mais alguma coisa?": pessoas no local e necessidade especial (S-46, S-48),
 * descrição e ponto de referência (todos opcionais), o **resumo** do que será enviado e, no
 * rodapé, "Enviar denúncia". O "Sim" da necessidade especial abre um consentimento específico,
 * separado dos Termos (LGPD, art. 11, I); sem ele, a resposta não é enviada. É aqui também que
 * aparecem o aviso de denúncia em aberto (409) e os erros gerais do envio. Fotos entram na F2-3.
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
  fotos,
  onAlterarFotos,
}: Props) {
  const [faixaPessoas, necessidadeEspecial, consentimentoNecessidade] = useWatch({
    control,
    name: ['faixaPessoas', 'necessidadeEspecial', 'consentimentoNecessidade'],
  });
  const necessidade = necessidadeAoEnviar({ necessidadeEspecial, consentimentoNecessidade });

  return (
    <View style={styles.bloco}>
      <Text accessibilityRole="header" style={[type.title1, styles.titulo]}>
        {TITULOS_DOS_PASSOS[3]}
      </Text>

      <Controller
        control={control}
        name="faixaPessoas"
        render={({ field }) => (
          <View style={styles.grupo}>
            <Text style={[type.label, styles.titulo]}>
              Quantas pessoas estão no local? (opcional)
            </Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Quantas pessoas estão no local? (opcional)"
              style={styles.chips}
            >
              {FAIXAS_DE_PESSOAS.map((f) => (
                <FilterChip
                  key={f.valor}
                  rotulo={f.rotulo}
                  selecionado={field.value === f.valor}
                  // Tocar de novo na mesma faixa desmarca (o campo é opcional).
                  onPress={() => field.onChange(field.value === f.valor ? undefined : f.valor)}
                />
              ))}
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="necessidadeEspecial"
        render={({ field }) => (
          <View style={styles.grupo}>
            <Text style={[type.label, styles.titulo]}>{PERGUNTA_DA_NECESSIDADE}</Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={PERGUNTA_DA_NECESSIDADE}
              style={styles.grupo}
            >
              <CartaoDeEscolha
                titulo="Sim"
                descricao="A Equatorial dá prioridade ao atendimento."
                icone="medkit-outline"
                fundoDoIcone={colors.actionSoft}
                corDoIcone={colors.action}
                selecionado={field.value === true}
                onPress={() => field.onChange(true)}
              />
              <CartaoDeEscolha
                titulo="Não"
                descricao="Ninguém no local depende de energia para a saúde."
                icone="close-circle-outline"
                fundoDoIcone={colors.actionSoft}
                corDoIcone={colors.action}
                selecionado={field.value === false}
                onPress={() => field.onChange(false)}
              />
            </View>
          </View>
        )}
      />

      {necessidadeEspecial === true ? (
        <Controller
          control={control}
          name="consentimentoNecessidade"
          render={({ field }) => (
            <Cartao destaque style={styles.grupo}>
              <Aviso tom="info" icone="shield-checkmark-outline" anunciar={false}>
                Essa informação é sobre saúde. Ela só vai para a Equatorial se você autorizar.
              </Aviso>
              <Checkbox
                testID="consentimento-necessidade"
                marcado={field.value === true}
                onAlterar={field.onChange}
                rotuloAcessivel={TEXTO_DO_CONSENTIMENTO}
                erro={errors.consentimentoNecessidade?.message}
              >
                {TEXTO_DO_CONSENTIMENTO}
              </Checkbox>
              {field.value !== true ? (
                <Text style={[type.bodySmall, styles.apoio]}>
                  Sem a sua autorização, a resposta não é enviada e a denúncia segue sem prioridade.
                </Text>
              ) : null}
            </Cartao>
          )}
        />
      ) : null}

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

      <SeletorDeFotos fotos={fotos} onAlterar={onAlterarFotos} />

      <Cartao>
        <Text accessibilityRole="header" style={[type.label, styles.apoio]}>
          O que será enviado
        </Text>
        {tipo ? <SeloDeSituacao situacao={situacaoDoTipo(tipo)} /> : null}
        <Text style={[type.title3, { color: colors.textPrimary }]}>{logradouro}</Text>
        {bairroNome ? (
          <Text style={[type.bodySmall, styles.apoio]}>{`${bairroNome}, Marabá`}</Text>
        ) : null}
        {faixaPessoas ? (
          <Text style={[type.bodySmall, styles.texto]}>
            {`Pessoas no local: ${rotuloDaFaixa(faixaPessoas)}`}
          </Text>
        ) : null}
        {necessidade ? (
          <Text style={[type.bodySmall, styles.texto]}>{TEXTO_DO_RESUMO[necessidade]}</Text>
        ) : null}
        {fotos.length > 0 ? (
          <Text style={[type.bodySmall, styles.texto]}>
            {`Fotos: ${fotos.length} ${fotos.length === 1 ? 'anexada' : 'anexadas'}`}
          </Text>
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
  grupo: { gap: space.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  titulo: { color: colors.textPrimary },
  texto: { color: colors.textPrimary },
  apoio: { color: colors.textSecondary },
  aviso409: { gap: space.s },
});
