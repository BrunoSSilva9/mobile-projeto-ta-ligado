import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Cartao } from '@/components/Cartao';
import { ListaDeBairrosModal, rotuloDoBairro } from '@/components/ListaDeBairrosModal';
import { formatarDataHora } from '@/features/acompanhamento/formatacao';
import { useBairros } from '@/features/denuncia/hooks';
import { useStatusDosBairros } from '@/features/ocorrencias/hooks';
import { iconeDaSituacao, rotuloDaSituacao, situacaoDoBairro } from '@/features/situacao';
import { useLocalizacaoAtual } from '@/providers/LocalizacaoProvider';
import { colors, radius, space, type } from '@/theme';

/** Frase de apoio sob a situação: quantas denúncias estão em aberto no bairro. */
export function frasesDeApoio(emAberto: number): string {
  if (emAberto === 0) return 'Nenhuma falta de energia avisada';
  return emAberto === 1 ? '1 denúncia em aberto' : `${emAberto} denúncias em aberto`;
}

/**
 * Cartão "Energia no seu bairro agora" (Início): a situação do bairro (RN-007) com ícone grande,
 * o nome da situação na cor dela e uma frase de apoio, e o endereço com **"Trocar"**.
 *
 * O bairro vem da localização do celular (RN-025) ou do que o usuário escolheu em "Trocar" (salvo só
 * no aparelho); com a escolha feita aparece **"Usar minha localização"** para voltar ao GPS. Sem
 * GPS, ou fora de Marabá, o usuário escolhe o bairro à mão. A cor da situação nunca aparece
 * sozinha: sempre com ícone e texto.
 */
export function CartaoEnergiaDoBairro() {
  const local = useLocalizacaoAtual();
  const status = useStatusDosBairros();
  const bairros = useBairros();
  const [escolhendo, setEscolhendo] = useState(false);

  const lista = status.data?.bairros;
  // Uma escolha antiga que não existe mais na lista é ignorada (volta ao GPS).
  const escolhidoValido =
    local.bairroEscolhidoId !== null &&
    !!lista?.some((b) => b.bairroId === local.bairroEscolhidoId);
  const aindaCarregandoEscolha =
    (local.bairroEscolhidoId !== null && !lista && !status.isError) || !local.bairroEscolhidoLido;
  const id = escolhidoValido ? local.bairroEscolhidoId : (local.bairroSugerido?.id ?? null);
  const atual = id !== null ? lista?.find((b) => b.bairroId === id) : undefined;

  const abrirEscolha = () => setEscolhendo(true);

  let corpo;
  if (aindaCarregandoEscolha) {
    corpo = <Mensagem progresso>Carregando…</Mensagem>;
  } else if (!escolhidoValido && local.estado === 'buscando') {
    corpo = <Mensagem progresso>Buscando a sua localização…</Mensagem>;
  } else if (!escolhidoValido && local.estado !== 'ok') {
    corpo = (
      <>
        <Mensagem>
          Não achamos você pela localização do celular. Escolha o seu bairro para ver a energia.
        </Mensagem>
        <View style={styles.acoes}>
          <Button titulo="Escolher bairro" variante="secundario" onPress={abrirEscolha} />
          <Button titulo="Tentar de novo" variante="texto" onPress={local.tentarDeNovo} />
        </View>
      </>
    );
  } else if (!escolhidoValido && !local.bairroSugerido) {
    corpo = (
      <>
        <Mensagem>
          Você parece estar fora de Marabá. Escolha um bairro para ver a energia, ou veja o mapa.
        </Mensagem>
        <Button titulo="Escolher bairro" variante="secundario" onPress={abrirEscolha} />
      </>
    );
  } else if (status.isError && !atual) {
    corpo = (
      <>
        <Mensagem alerta>{status.error.message}</Mensagem>
        <Button
          titulo="Tentar de novo"
          variante="secundario"
          onPress={() => void status.refetch()}
        />
      </>
    );
  } else if (!atual) {
    corpo = (
      <Mensagem progresso>
        {status.fetchStatus === 'paused'
          ? 'Sem conexão e nenhum dado salvo da energia do bairro.'
          : 'Carregando a energia do bairro…'}
      </Mensagem>
    );
  } else {
    const situacao = situacaoDoBairro(atual.status);
    const visual = colors.situacao[situacao];
    const rotulo = rotuloDaSituacao(situacao);
    const frase = frasesDeApoio(atual.emAberto);
    const linha1 = !escolhidoValido && local.endereco ? local.endereco : rotuloDoBairro(atual);
    const linha2 =
      !escolhidoValido && local.endereco ? `${rotuloDoBairro(atual)}, Marabá` : 'Marabá, PA';

    corpo = (
      <>
        <View
          accessible
          accessibilityLabel={`Situação da energia: ${rotulo}. ${frase}`}
          style={styles.situacao}
        >
          <View style={[styles.icone, { backgroundColor: visual.fundo }]}>
            <Ionicons name={iconeDaSituacao(situacao)} size={36} color={visual.texto} />
          </View>
          <View style={styles.textos}>
            <Text style={[type.title2, { color: visual.texto }]}>{rotulo}</Text>
            <Text style={[type.body, { color: colors.textSecondary }]}>{frase}</Text>
          </View>
        </View>
        {atual.previsaoReparo ? (
          <Text style={[type.bodySmall, { color: colors.textSecondary }]}>
            Previsão de reparo: {formatarDataHora(atual.previsaoReparo)}
          </Text>
        ) : null}

        <View style={styles.divisoria} />

        <View style={styles.endereco}>
          <Ionicons name="location-sharp" size={24} color={colors.textSecondary} />
          <View style={styles.textos}>
            <Text style={[type.title3, { color: colors.textPrimary }]}>{linha1}</Text>
            <Text style={[type.bodySmall, { color: colors.textSecondary }]}>{linha2}</Text>
          </View>
          <Button titulo="Trocar" variante="texto" onPress={abrirEscolha} />
        </View>
        {escolhidoValido ? (
          <Button
            titulo="Usar minha localização"
            variante="texto"
            nomeDoIcone="locate"
            onPress={local.usarMinhaLocalizacao}
          />
        ) : null}
      </>
    );
  }

  return (
    <Cartao>
      <Text accessibilityRole="header" style={[type.label, { color: colors.textSecondary }]}>
        Energia no seu bairro agora
      </Text>
      {corpo}
      <ListaDeBairrosModal
        visivel={escolhendo}
        bairros={(bairros.data ?? []).map((b) => ({ id: b.id, nome: b.nome, folha: b.folha }))}
        valor={
          escolhidoValido ? (local.bairroEscolhidoId ?? undefined) : id !== null ? id : undefined
        }
        carregando={bairros.isPending}
        onEscolher={local.escolherBairro}
        onFechar={() => setEscolhendo(false)}
      />
    </Cartao>
  );
}

function Mensagem({
  children,
  progresso = false,
  alerta = false,
}: {
  children: string;
  progresso?: boolean;
  alerta?: boolean;
}) {
  return (
    <Text
      accessibilityRole={alerta ? 'alert' : progresso ? 'progressbar' : undefined}
      style={[type.body, { color: colors.textSecondary }]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  situacao: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  icone: {
    width: 64,
    height: 64,
    borderRadius: radius.pilula,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: space.xs },
  divisoria: { height: 1, backgroundColor: colors.borderDivider, marginVertical: space.xs },
  endereco: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  acoes: { gap: space.s },
});
