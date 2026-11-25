import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Aviso } from '@/components/Aviso';
import type { DocumentoLegal } from '@/legal/conteudo';
import { colors, space, type } from '@/theme';

/** Mostra um documento legal (Termos de Uso ou Política de Privacidade) com rolagem. */
export function DocumentoLegalView({ documento }: { documento: DocumentoLegal }) {
  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Text accessibilityRole="header" style={[type.title1, styles.titulo]}>
        {documento.titulo}
      </Text>
      <Text style={[type.caption, styles.versao]}>Versão {documento.versao}</Text>

      <Aviso tom="info" anunciar={false}>
        {documento.aviso}
      </Aviso>

      {documento.secoes.map((secao, indice) => (
        <View key={secao.titulo} style={styles.secao}>
          <Text accessibilityRole="header" style={[type.title3, styles.secaoTitulo]}>
            {`${indice + 1}. ${secao.titulo}`}
          </Text>
          {secao.paragrafos?.map((paragrafo) => (
            <Text key={paragrafo} style={[type.body, styles.paragrafo]}>
              {paragrafo}
            </Text>
          ))}
          {secao.itens?.map((item) => (
            <View key={item} style={styles.item}>
              <Text style={[type.body, styles.marcador]}>•</Text>
              <Text style={[type.body, styles.paragrafo, styles.itemTexto]}>{item}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  conteudo: { padding: space.l, gap: space.m, paddingBottom: space.xxl },
  titulo: { color: colors.textPrimary },
  versao: { color: colors.textSecondary },
  secao: { gap: space.s },
  secaoTitulo: { color: colors.textPrimary },
  paragrafo: { color: colors.textSecondary },
  item: { flexDirection: 'row', gap: space.s },
  marcador: { color: colors.action },
  itemTexto: { flex: 1 },
});
