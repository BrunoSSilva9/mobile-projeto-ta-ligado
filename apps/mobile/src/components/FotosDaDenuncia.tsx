import { Image, StyleSheet, Text, View } from 'react-native';

import { Cartao } from '@/components/Cartao';
import { API_URL } from '@/config/constants';
import { useSessao } from '@/store/session';
import { colors, radius, size, space, type } from '@/theme';

type Props = { fotos: readonly { id: string; url: string }[] };

/**
 * Fotos da denúncia no detalhe (T-07, RF-009). A rota da foto é autenticada (RNF-015), então a
 * imagem é pedida com o token da sessão no cabeçalho. Cada foto tem o texto "Foto N de M".
 */
export function FotosDaDenuncia({ fotos }: Props) {
  const token = useSessao((s) => s.token);
  if (fotos.length === 0) return null;
  const base = API_URL.replace(/\/+$/, '');

  return (
    <Cartao>
      <Text accessibilityRole="header" style={[type.label, styles.rotulo]}>
        {`Fotos (${fotos.length})`}
      </Text>
      <View style={styles.lista}>
        {fotos.map((foto, indice) => (
          <Image
            key={foto.id}
            source={{
              uri: `${base}${foto.url}`,
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }}
            accessibilityLabel={`Foto ${indice + 1} de ${fotos.length}`}
            style={styles.foto}
          />
        ))}
      </View>
    </Cartao>
  );
}

const styles = StyleSheet.create({
  rotulo: { color: colors.textSecondary },
  lista: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  foto: {
    width: size.field * 2,
    height: size.field * 2,
    borderRadius: radius.campo,
    backgroundColor: colors.borderDivider,
  },
});
