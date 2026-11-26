import { useState } from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Button } from '@/components/Button';
import {
  escolherDaGaleria,
  LIMITE_DE_FOTOS,
  tirarFoto,
  type FotoDoFormulario,
  type ResultadoDaFoto,
} from '@/features/denuncia/fotos';
import { colors, radius, size, space, type } from '@/theme';

type Props = {
  fotos: readonly FotoDoFormulario[];
  onAlterar: (fotos: FotoDoFormulario[]) => void;
};

/**
 * "Fotos (opcional)" no passo 3 (RF-009, RN-013, S-49): "Tirar foto" e "Escolher da galeria" (os
 * dois com texto), miniaturas com "Remover foto N" (botão com texto) e o contador "N de 3 fotos".
 * A permissão da câmera é pedida só ao tocar em "Tirar foto". Com 3 fotos, os botões ficam
 * desativados e o motivo aparece escrito. As fotos já chegam aqui convertidas para JPEG reduzido.
 */
export function SeletorDeFotos({ fotos, onAlterar }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<ResultadoDaFoto | null>(null);
  const cheio = fotos.length >= LIMITE_DE_FOTOS;

  const receber = (resultado: ResultadoDaFoto) => {
    setAviso(resultado);
    if (resultado.estado === 'ok') {
      onAlterar([...fotos, ...resultado.fotos].slice(0, LIMITE_DE_FOTOS));
    }
  };

  const executar = async (acao: () => Promise<ResultadoDaFoto>) => {
    setOcupado(true);
    setAviso(null);
    try {
      receber(await acao());
    } finally {
      setOcupado(false);
    }
  };

  return (
    <View style={styles.bloco}>
      <Text style={[type.label, styles.titulo]}>Fotos (opcional)</Text>
      <Text style={[type.bodySmall, styles.apoio]}>
        Se puder, anexe fotos do problema. Elas ajudam a equipe, e só você e a Equatorial as veem.
      </Text>

      <Text accessibilityLiveRegion="polite" style={[type.label, styles.titulo]}>
        {fotos.length} de {LIMITE_DE_FOTOS} fotos
      </Text>

      {fotos.length > 0 ? (
        <View style={styles.lista}>
          {fotos.map((foto, indice) => (
            <View key={foto.id} style={styles.item}>
              <Image
                source={{ uri: foto.uri }}
                accessibilityLabel={`Foto ${indice + 1} de ${fotos.length}`}
                style={styles.miniatura}
              />
              <Button
                titulo={`Remover foto ${indice + 1}`}
                variante="texto"
                nomeDoIcone="trash-outline"
                onPress={() => onAlterar(fotos.filter((f) => f.id !== foto.id))}
              />
            </View>
          ))}
        </View>
      ) : null}

      <Button
        titulo="Tirar foto"
        variante="secundario"
        nomeDoIcone="camera-outline"
        carregando={ocupado}
        desabilitado={cheio || ocupado}
        onPress={() => void executar(tirarFoto)}
      />
      <Button
        titulo="Escolher da galeria"
        variante="secundario"
        nomeDoIcone="images-outline"
        desabilitado={cheio || ocupado}
        onPress={() => void executar(() => escolherDaGaleria(LIMITE_DE_FOTOS - fotos.length))}
      />

      {cheio ? (
        <Text style={[type.bodySmall, styles.apoio]}>
          Você já escolheu as {LIMITE_DE_FOTOS} fotos. Remova uma para trocar.
        </Text>
      ) : null}

      {aviso?.estado === 'negada' ? (
        <View style={styles.bloco}>
          <Aviso tom="atencao" icone="camera-outline">
            {aviso.podePedirDeNovo
              ? 'Sem a permissão da câmera não dá para tirar a foto. Toque em "Tirar foto" de novo e permita, ou escolha da galeria.'
              : 'A câmera está bloqueada para este aplicativo. Permita o uso da câmera nas configurações do celular, ou escolha da galeria.'}
          </Aviso>
          {!aviso.podePedirDeNovo ? (
            <Button
              titulo="Abrir configurações"
              variante="secundario"
              onPress={() => void Linking.openSettings()}
            />
          ) : null}
        </View>
      ) : null}
      {aviso?.estado === 'erro' ? (
        <Aviso tom="erro">Não foi possível preparar a foto. Tente de novo ou escolha outra.</Aviso>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.s },
  titulo: { color: colors.textPrimary },
  apoio: { color: colors.textSecondary },
  lista: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  item: { alignItems: 'flex-start', gap: space.xs },
  miniatura: {
    width: size.field + 24,
    height: size.field + 24,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.borderDivider,
  },
});
