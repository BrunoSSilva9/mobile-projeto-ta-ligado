import { Ionicons } from '@expo/vector-icons';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Button } from '@/components/Button';
import { Cartao } from '@/components/Cartao';
import { MiniMapa } from '@/components/MiniMapa';
import { SeletorDeBairro } from '@/components/SeletorDeBairro';
import { TextField } from '@/components/TextField';
import type { useBairros, Gps } from '@/features/denuncia/hooks';
import { TITULOS_DOS_PASSOS } from '@/features/denuncia/passos';
import type { DadosDaDenuncia } from '@/features/denuncia/schemas';
import { colors, space, type } from '@/theme';

type Props = {
  control: Control<DadosDaDenuncia>;
  errors: FieldErrors<DadosDaDenuncia>;
  gps: Gps;
  bairros: ReturnType<typeof useBairros>;
  /** Logradouro e bairro que valem agora (do GPS, do rascunho ou digitados). */
  logradouro: string;
  bairroNome: string | null;
  /** Os campos de bairro, logradouro e CEP estão abertos para o usuário corrigir? */
  camposAbertos: boolean;
  /** O usuário mexeu num dos campos (a tela os mantém abertos). */
  onEditar: () => void;
};

/** Motivo pelo qual o GPS não achou o usuário, em frase curta. */
function motivoDoGps(estado: Gps['estado']): string {
  if (estado === 'negada') return 'A localização do celular está desativada para este aplicativo.';
  if (estado === 'desativada') return 'O GPS do celular está desligado.';
  return 'Não foi possível achar a sua localização.';
}

/**
 * Passo 2 · "Onde está faltando energia?": o local achado pelo celular (mini-mapa com pino) e o
 * endereço para o usuário **confirmar** ("Sim, está certo", no rodapé) ou **corrigir** (abre os
 * campos de bairro, logradouro e CEP). Sem GPS, os campos já vêm abertos e a denúncia segue sem
 * coordenadas (RN-012).
 */
export function PassoLocal({
  control,
  errors,
  gps,
  bairros,
  logradouro,
  bairroNome,
  camposAbertos,
  onEditar,
}: Props) {
  const achouPeloGps = gps.estado === 'ok' && gps.coordenadas !== null;
  const temEndereco = logradouro.trim().length >= 3 && bairroNome !== null;

  return (
    <View style={styles.bloco}>
      <Text accessibilityRole="header" style={[type.title1, styles.titulo]}>
        {TITULOS_DOS_PASSOS[2]}
      </Text>

      <Cartao>
        {achouPeloGps && gps.coordenadas ? (
          <>
            <MiniMapa coordenadas={gps.coordenadas} onMover={gps.mover} />
            <View style={styles.linha}>
              <Ionicons name="locate" size={20} color={colors.action} />
              <Text style={[type.label, { color: colors.action }]}>
                Achamos pela localização do celular
              </Text>
            </View>
          </>
        ) : gps.estado === 'buscando' ? (
          <Text accessibilityRole="progressbar" style={[type.body, styles.apoio]}>
            Buscando a sua localização…
          </Text>
        ) : (
          <>
            <Aviso tom="atencao" icone="locate-outline">
              {`${motivoDoGps(gps.estado)} Você pode enviar a denúncia mesmo assim: preencha o endereço.`}
            </Aviso>
            {gps.estado !== 'negada' || gps.podePedirDeNovo ? (
              <Button titulo="Tentar de novo" variante="secundario" onPress={gps.tentarDeNovo} />
            ) : (
              <Button
                titulo="Abrir configurações"
                variante="secundario"
                onPress={() => void Linking.openSettings()}
              />
            )}
          </>
        )}

        {temEndereco ? (
          <View style={styles.endereco}>
            <Text style={[type.title3, { color: colors.textPrimary }]}>{logradouro}</Text>
            <Text style={[type.bodySmall, styles.apoio]}>{`${bairroNome}, Marabá`}</Text>
          </View>
        ) : null}

        {temEndereco && !camposAbertos ? (
          <Text style={[type.label, { color: colors.textPrimary }]}>Este endereço está certo?</Text>
        ) : null}
      </Cartao>

      {camposAbertos ? (
        <View style={styles.campos}>
          <Controller
            control={control}
            name="logradouro"
            render={({ field }) => (
              <TextField
                rotulo="Logradouro"
                placeholder="Rua, avenida ou travessa, com o número"
                autoComplete="street-address"
                value={field.value}
                onChangeText={(v) => {
                  onEditar();
                  field.onChange(v);
                }}
                onBlur={field.onBlur}
                erro={errors.logradouro?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="bairroId"
            render={({ field }) => (
              <SeletorDeBairro
                rotulo="Bairro"
                bairros={bairros.data ?? []}
                valor={field.value}
                onAlterar={(id) => {
                  onEditar();
                  field.onChange(id);
                }}
                carregando={bairros.isPending}
                erro={errors.bairroId?.message}
              />
            )}
          />
          {bairros.isError ? (
            <View style={styles.avisoDeLista}>
              <Aviso tom="erro">Não foi possível carregar a lista de bairros.</Aviso>
              <Button
                titulo="Recarregar bairros"
                variante="texto"
                onPress={() => void bairros.refetch()}
              />
            </View>
          ) : null}

          <Controller
            control={control}
            name="cep"
            render={({ field }) => (
              <TextField
                rotulo="CEP (opcional)"
                placeholder="68500-000"
                keyboardType="number-pad"
                autoComplete="postal-code"
                maxLength={9}
                value={field.value}
                onChangeText={(v) => {
                  onEditar();
                  field.onChange(v);
                }}
                onBlur={field.onBlur}
                erro={errors.cep?.message}
              />
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.m },
  titulo: { color: colors.textPrimary },
  apoio: { color: colors.textSecondary },
  linha: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  endereco: { gap: space.xs },
  campos: { gap: space.l },
  avisoDeLista: { gap: space.xs },
});
