import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoDeConexao } from '@/components/AvisoDeConexao';
import { AvisoRecolhivel } from '@/components/AvisoRecolhivel';
import { Button } from '@/components/Button';
import { MiniMapa } from '@/components/MiniMapa';
import { OpcoesSegmentadas } from '@/components/OpcoesSegmentadas';
import { SeletorDeBairro } from '@/components/SeletorDeBairro';
import { TextField } from '@/components/TextField';
import { useBairros, useCriarDenuncia, useGps } from '@/features/denuncia/hooks';
import { lerRascunho, limparRascunho, salvarRascunho } from '@/features/denuncia/rascunho';
import {
  CAMPOS_DA_DENUNCIA,
  denunciaSchema,
  LIMITE_DA_DESCRICAO,
  TIPOS_DE_DENUNCIA,
  type DadosDaDenuncia,
} from '@/features/denuncia/schemas';
import { aplicarErroDaApi } from '@/services/erros-de-formulario';
import { ErroDeApi } from '@/services/http';
import { useSessao } from '@/store/session';
import { colors, hitSlopFor, radius, size, space, type } from '@/theme';

const ORIENTACOES = [
  'Registre apenas interrupções verídicas: denúncias falsas atrapalham o atendimento.',
  'Informe o endereço com o máximo de detalhes para a equipe achar o local.',
  'Você pode ter uma denúncia em aberto por vez; acompanhe o andamento pelo app.',
] as const;

const VALORES_INICIAIS: Partial<DadosDaDenuncia> = {
  logradouro: '',
  cep: '',
  pontoReferencia: '',
  descricao: '',
};

function voltar() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** T-05: registrar denúncia (RF-007, RF-008, RF-012; RN-002, RN-006, RN-012). */
export default function DenunciarScreen() {
  const usuarioId = useSessao((s) => s.usuario?.id);
  const bairros = useBairros();
  const criar = useCriarDenuncia();
  const gps = useGps();

  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [denunciaEmAberto, setDenunciaEmAberto] = useState<string | null>(null);
  const [rascunhoLido, setRascunhoLido] = useState(false);

  const { control, handleSubmit, setError, setValue, getValues, reset, formState } =
    useForm<DadosDaDenuncia>({
      resolver: zodResolver(denunciaSchema),
      defaultValues: VALORES_INICIAIS,
      mode: 'onTouched',
    });
  const { errors } = formState;

  // 1) Restaura o rascunho (sem internet, nada digitado se perde).
  useEffect(() => {
    let ativo = true;
    void (async () => {
      const salvo = usuarioId ? await lerRascunho(usuarioId) : null;
      if (!ativo) return;
      if (salvo) reset({ ...VALORES_INICIAIS, ...salvo });
      setRascunhoLido(true);
    })();
    return () => {
      ativo = false;
    };
  }, [usuarioId, reset]);

  // 2) Guarda o rascunho a cada alteração (só depois de ler o antigo, para não apagá-lo).
  const valores = useWatch({ control });
  useEffect(() => {
    if (rascunhoLido && usuarioId) void salvarRascunho(usuarioId, valores);
  }, [rascunhoLido, usuarioId, valores]);

  // 3) Sugestões do GPS: só preenchem o que o usuário ainda não escreveu/escolheu.
  const sugeridoRef = useRef({ logradouro: false, bairro: false });
  useEffect(() => {
    if (!rascunhoLido) return;
    if (gps.endereco && !sugeridoRef.current.logradouro && getValues('logradouro') === '') {
      sugeridoRef.current.logradouro = true;
      setValue('logradouro', gps.endereco, { shouldDirty: true });
    }
    if (gps.bairroSugerido && !sugeridoRef.current.bairro && !getValues('bairroId')) {
      sugeridoRef.current.bairro = true;
      setValue('bairroId', gps.bairroSugerido.id, { shouldDirty: true });
    }
  }, [rascunhoLido, gps.endereco, gps.bairroSugerido, getValues, setValue]);

  const enviar = handleSubmit((dados) => {
    setErroGeral(null);
    setDenunciaEmAberto(null);
    criar.mutate(
      { dados, coordenadas: gps.coordenadas },
      {
        onSuccess: async (denuncia) => {
          if (usuarioId) await limparRascunho(usuarioId);
          router.replace({
            pathname: '/denuncia/sucesso',
            params: { id: denuncia.id, protocolo: denuncia.protocolo },
          });
        },
        onError: (erro) => {
          if (erro instanceof ErroDeApi && erro.codigo === 'DENUNCIA_EM_ABERTO') {
            const id = erro.dados?.denunciaEmAbertoId;
            setDenunciaEmAberto(typeof id === 'string' ? id : '');
            return;
          }
          setErroGeral(aplicarErroDaApi(erro, setError, CAMPOS_DA_DENUNCIA));
        },
      },
    );
  });

  const verDenunciaEmAberto = () => {
    if (denunciaEmAberto) {
      router.replace({ pathname: '/denuncia/[id]', params: { id: denunciaEmAberto } });
    } else {
      router.replace('/ocorrencias');
    }
  };

  const bairroDaLista = bairros.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.cabecalho}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={hitSlopFor(size.touchMin)}
          onPress={voltar}
          style={styles.voltar}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text accessibilityRole="header" style={[type.title, styles.tituloDaTela]}>
          Fazer denúncia
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <View style={styles.introducao}>
            <Text style={[type.label, styles.selo]}>REGISTRO EM TEMPO REAL</Text>
            <Text accessibilityRole="header" style={[type.h1Large, styles.pergunta]}>
              Onde faltou luz?
            </Text>
            <Text style={[type.body, styles.subtitulo]}>
              Conte o que está acontecendo. A operadora recebe sua denúncia na hora.
            </Text>
          </View>

          <AvisoDeConexao escrita />

          <BlocoDoGps gps={gps} />

          <AvisoRecolhivel titulo="Antes de enviar" itens={ORIENTACOES} />

          <View style={styles.cartao}>
            <Text accessibilityRole="header" style={[type.title, styles.tituloDoCartao]}>
              Descrição da denúncia
            </Text>

            <Controller
              control={control}
              name="tipo"
              render={({ field }) => (
                <OpcoesSegmentadas
                  rotulo="Tipo da ocorrência"
                  opcoes={TIPOS_DE_DENUNCIA}
                  valor={field.value}
                  onAlterar={field.onChange}
                  erro={errors.tipo?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="logradouro"
              render={({ field }) => (
                <TextField
                  superficie="escura"
                  rotulo="Logradouro"
                  placeholder="Rua, avenida ou travessa, com o número"
                  autoComplete="street-address"
                  value={field.value}
                  onChangeText={field.onChange}
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
                  bairros={bairroDaLista}
                  valor={field.value}
                  onAlterar={field.onChange}
                  carregando={bairros.isPending}
                  erro={errors.bairroId?.message}
                />
              )}
            />
            {bairros.isError ? (
              <View style={styles.avisoDeLista}>
                <Text accessibilityRole="alert" style={[type.caption, styles.avisoDeListaTexto]}>
                  Não foi possível carregar a lista de bairros.
                </Text>
                <Button
                  titulo="Recarregar bairros"
                  variante="claro"
                  onPress={() => void bairros.refetch()}
                />
              </View>
            ) : null}

            <Controller
              control={control}
              name="cep"
              render={({ field }) => (
                <TextField
                  superficie="escura"
                  rotulo="CEP (opcional)"
                  placeholder="68500-000"
                  keyboardType="number-pad"
                  autoComplete="postal-code"
                  maxLength={9}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  erro={errors.cep?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="pontoReferencia"
              render={({ field }) => (
                <TextField
                  superficie="escura"
                  rotulo="Ponto de referência (opcional)"
                  placeholder="Ex.: perto da padaria"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  erro={errors.pontoReferencia?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="descricao"
              render={({ field }) => (
                <TextField
                  superficie="escura"
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

            {denunciaEmAberto !== null ? (
              <View style={styles.aviso409}>
                <Text accessibilityRole="alert" style={[type.body, styles.aviso409Texto]}>
                  Você já tem uma denúncia em aberto. Acompanhe-a antes de registrar outra.
                </Text>
                <Button
                  titulo={denunciaEmAberto ? 'Ver minha denúncia' : 'Ver minhas denúncias'}
                  variante="claro"
                  onPress={verDenunciaEmAberto}
                />
              </View>
            ) : null}

            {erroGeral ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={[type.body, styles.erroGeral]}
              >
                {erroGeral}
              </Text>
            ) : null}

            <Button
              testID="botao-enviar-denuncia"
              titulo="ENVIAR DENÚNCIA"
              variante="claro"
              carregando={criar.isPending}
              onPress={() => void enviar()}
              icone={<Ionicons name="send" size={18} color={colors.action} />}
            />
            <Text style={[type.caption, styles.rodape]}>
              Sua ocorrência será mapeada e enviada à operadora assim que você confirmar.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Situação do GPS: buscando, ativo (com mini-mapa) ou desativado (o usuário escolhe o bairro). */
function BlocoDoGps({ gps }: { gps: ReturnType<typeof useGps> }) {
  if (gps.estado === 'buscando') {
    return (
      <Text accessibilityRole="progressbar" style={[type.body, styles.gpsTexto]}>
        Buscando sua localização…
      </Text>
    );
  }

  if (gps.estado === 'ok' && gps.coordenadas) {
    return (
      <View style={styles.gpsBloco}>
        <View style={styles.seloGps}>
          <Ionicons name="locate" size={16} color={colors.action} />
          <Text style={[type.label, { color: colors.action }]}>GPS ATIVO</Text>
        </View>
        <MiniMapa coordenadas={gps.coordenadas} onMover={gps.mover} />
      </View>
    );
  }

  const motivo =
    gps.estado === 'negada'
      ? 'A permissão de localização está desativada.'
      : gps.estado === 'desativada'
        ? 'O GPS do aparelho está desligado.'
        : 'Não foi possível obter sua localização.';

  return (
    <View style={styles.gpsBloco}>
      <Text accessibilityRole="alert" style={[type.subtitle, styles.gpsTitulo]}>
        GPS desativado
      </Text>
      <Text style={[type.body, styles.gpsTexto]}>
        {motivo} Você pode enviar a denúncia mesmo assim: escolha o bairro e informe o logradouro.
      </Text>
      <View style={styles.gpsAcoes}>
        {gps.estado !== 'negada' || gps.podePedirDeNovo ? (
          <Button titulo="Tentar de novo" variante="secundario" onPress={gps.tentarDeNovo} />
        ) : (
          <Button
            titulo="Abrir configurações"
            variante="secundario"
            onPress={() => void Linking.openSettings()}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.bgPage },
  cabecalho: {
    height: size.header,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.s,
    gap: space.s,
  },
  voltar: {
    width: size.touchMin,
    height: size.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloDaTela: { color: colors.textPrimary },
  conteudo: { padding: space.l, gap: space.l, paddingBottom: space.xxl },
  introducao: { gap: space.xs },
  selo: { color: colors.action },
  pergunta: { color: colors.textPrimary },
  subtitulo: { color: colors.textSecondary },
  gpsBloco: { gap: space.s },
  gpsTitulo: { color: colors.status.flickerText },
  gpsTexto: { color: colors.textSecondary },
  gpsAcoes: { alignItems: 'flex-start' },
  seloGps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
  },
  cartao: {
    backgroundColor: colors.brand900,
    borderRadius: radius.cardLarge,
    padding: space.xl,
    gap: space.l,
  },
  tituloDoCartao: { color: colors.white },
  avisoDeLista: { gap: space.s },
  avisoDeListaTexto: { color: colors.status.noPowerBg },
  aviso409: {
    gap: space.s,
    padding: space.m,
    borderRadius: radius.item,
    backgroundColor: 'rgba(206,131,0,0.25)',
  },
  aviso409Texto: { color: colors.white },
  erroGeral: {
    color: colors.status.noPowerBg,
    backgroundColor: 'rgba(186,26,26,0.25)',
    borderRadius: radius.item,
    padding: space.m,
  },
  rodape: { color: colors.surfaceMint, textAlign: 'center' },
});
