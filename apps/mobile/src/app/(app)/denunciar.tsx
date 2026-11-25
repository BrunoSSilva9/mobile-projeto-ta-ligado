import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  AccessibilityInfo,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoDeConexao } from '@/components/AvisoDeConexao';
import { Button } from '@/components/Button';
import { CabecalhoDePasso } from '@/components/CabecalhoDePasso';
import { rotuloDoBairro } from '@/components/ListaDeBairrosModal';
import { PassoDetalhes } from '@/components/denuncia/PassoDetalhes';
import { PassoLocal } from '@/components/denuncia/PassoLocal';
import { PassoTipo } from '@/components/denuncia/PassoTipo';
import { useBairros, useCriarDenuncia, useGps } from '@/features/denuncia/hooks';
import {
  anuncioDoPasso,
  CAMPOS_DO_PASSO,
  enderecoCompleto,
  primeiroPassoComErro,
  TOTAL_DE_PASSOS,
  type Passo,
} from '@/features/denuncia/passos';
import { lerRascunho, limparRascunho, salvarRascunho } from '@/features/denuncia/rascunho';
import {
  CAMPOS_DA_DENUNCIA,
  denunciaSchema,
  type DadosDaDenuncia,
} from '@/features/denuncia/schemas';
import { aplicarErroDaApi } from '@/services/erros-de-formulario';
import { ErroDeApi } from '@/services/http';
import { useSessao } from '@/store/session';
import { colors, space } from '@/theme';

const VALORES_INICIAIS: Partial<DadosDaDenuncia> = {
  logradouro: '',
  cep: '',
  pontoReferencia: '',
  descricao: '',
};

/** Fecha a tela (ou vai ao início, se ela foi aberta direto). */
function fechar() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Fazer denúncia (T-05), em **3 passos** numa rota só (design system v2, decisão R-01): 1) o que
 * está acontecendo, 2) onde, 3) detalhes e envio. É o mesmo formulário de antes: schema, rascunho,
 * GPS, tratamento do 409 (denúncia em aberto), erros do servidor e modo offline não mudam; muda só
 * a apresentação. Cada passo valida só os seus campos antes de avançar (RF-007, RF-008, RF-012;
 * RN-002, RN-006, RN-012).
 */
export default function DenunciarScreen() {
  const usuarioId = useSessao((s) => s.usuario?.id);
  const bairros = useBairros();
  const criar = useCriarDenuncia();
  const gps = useGps();

  const [passo, setPasso] = useState<Passo>(1);
  const [corrigindo, setCorrigindo] = useState(false);
  // Se o usuário começou a editar os campos, eles ficam abertos (não fecham ao completar o endereço).
  const [abertoPorFalta, setAbertoPorFalta] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [denunciaEmAberto, setDenunciaEmAberto] = useState<string | null>(null);
  const [rascunhoLido, setRascunhoLido] = useState(false);

  const { control, handleSubmit, setError, setValue, getValues, reset, trigger, formState } =
    useForm<DadosDaDenuncia>({
      resolver: zodResolver(denunciaSchema),
      defaultValues: VALORES_INICIAIS,
      mode: 'onTouched',
    });
  const { errors } = formState;
  const valores = useWatch({ control });

  /** Troca de passo e avisa o leitor de tela ("Passo 2 de 3: Onde está faltando energia?"). */
  const irParaPasso = useCallback((novo: Passo) => {
    setPasso(novo);
    AccessibilityInfo.announceForAccessibility(anuncioDoPasso(novo));
  }, []);

  /** Leva o usuário ao passo do campo com erro; no passo 2, já abre os campos para corrigir. */
  const irParaOPassoComErro = useCallback(
    (campos: readonly string[]) => {
      const destino = primeiroPassoComErro(campos);
      if (!destino) return;
      if (destino === 2) setCorrigindo(true);
      irParaPasso(destino);
    },
    [irParaPasso],
  );

  // 1) Restaura o rascunho (sem internet, nada digitado se perde). A tela abre no passo 1.
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

  // O botão "voltar" do Android volta um passo; no passo 1, o sistema fecha a tela.
  useEffect(() => {
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      if (passo === 1) return false;
      irParaPasso((passo - 1) as Passo);
      return true;
    });
    return () => assinatura.remove();
  }, [passo, irParaPasso]);

  const voltarUmPasso = () => {
    if (passo === 1) fechar();
    else irParaPasso((passo - 1) as Passo);
  };

  /** Valida só os campos do passo atual; se estiver tudo certo, avança. */
  const continuar = async () => {
    const valido = await trigger([...CAMPOS_DO_PASSO[passo]]);
    if (valido) {
      irParaPasso((passo + 1) as Passo);
    } else if (passo === 2) {
      setCorrigindo(true); // mostra os campos com os erros
    }
  };

  const enviar = handleSubmit(
    (dados) => {
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
            // Erro de um campo de outro passo: leva o usuário até ele.
            if (erro instanceof ErroDeApi && erro.detalhes?.length) {
              irParaOPassoComErro(erro.detalhes.flatMap((d) => (d.campo ? [d.campo] : [])));
            }
          },
        },
      );
    },
    (invalidos) => irParaOPassoComErro(Object.keys(invalidos)),
  );

  const verDenunciaEmAberto = () => {
    if (denunciaEmAberto) {
      router.replace({ pathname: '/denuncia/[id]', params: { id: denunciaEmAberto } });
    } else {
      router.replace('/ocorrencias');
    }
  };

  const sugerido = gps.bairroSugerido;
  const doBairro = bairros.data?.find((b) => b.id === valores.bairroId);
  const bairroNome = doBairro
    ? rotuloDoBairro(doBairro)
    : sugerido && sugerido.id === valores.bairroId
      ? rotuloDoBairro(sugerido)
      : null;
  const logradouro = valores.logradouro ?? '';
  const temEndereco = enderecoCompleto(valores) && bairroNome !== null;
  // Sem endereço pronto (sem GPS, ou o GPS não achou a rua) os campos já vêm abertos.
  const faltaEndereco = !temEndereco && gps.estado !== 'buscando';
  const camposAbertos = corrigindo || abertoPorFalta || faltaEndereco;
  const aguardandoGps = !temEndereco && gps.estado === 'buscando';

  return (
    <SafeAreaView style={styles.tela} edges={['top', 'bottom']}>
      <View style={styles.cabecalho}>
        <CabecalhoDePasso passo={passo} total={TOTAL_DE_PASSOS} onVoltar={voltarUmPasso} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <AvisoDeConexao escrita />

          {passo === 1 ? <PassoTipo control={control} erro={errors.tipo?.message} /> : null}

          {passo === 2 ? (
            <PassoLocal
              control={control}
              errors={errors}
              gps={gps}
              bairros={bairros}
              logradouro={logradouro}
              bairroNome={bairroNome}
              camposAbertos={camposAbertos}
              onEditar={() => setAbertoPorFalta(true)}
            />
          ) : null}

          {passo === 3 ? (
            <PassoDetalhes
              control={control}
              errors={errors}
              tipo={valores.tipo}
              logradouro={logradouro}
              bairroNome={bairroNome}
              denunciaEmAberto={denunciaEmAberto}
              onVerDenunciaEmAberto={verDenunciaEmAberto}
              erroGeral={erroGeral}
            />
          ) : null}
        </ScrollView>

        <View style={styles.rodape}>
          {passo === 1 ? (
            <Button
              titulo={valores.tipo ? 'Continuar' : 'Escolha uma opção para continuar'}
              desabilitado={!valores.tipo}
              onPress={() => void continuar()}
            />
          ) : null}

          {passo === 2 ? (
            camposAbertos || aguardandoGps ? (
              <Button
                titulo="Continuar"
                desabilitado={aguardandoGps}
                onPress={() => void continuar()}
              />
            ) : (
              <>
                <Button titulo="Sim, está certo" onPress={() => void continuar()} />
                <Button
                  titulo="Não, quero corrigir"
                  variante="secundario"
                  onPress={() => setCorrigindo(true)}
                />
              </>
            )
          ) : null}

          {passo === 3 ? (
            <Button
              testID="botao-enviar-denuncia"
              titulo="Enviar denúncia"
              carregando={criar.isPending}
              nomeDoIcone="send"
              onPress={() => void enviar()}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  flex: { flex: 1 },
  cabecalho: { paddingHorizontal: space.l, paddingTop: space.xs, paddingBottom: space.s },
  conteudo: { padding: space.l, gap: space.l, paddingBottom: space.xl },
  /** Rodapé fixo: o botão principal está sempre ao alcance do polegar. */
  rodape: {
    gap: space.s,
    padding: space.l,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
});
