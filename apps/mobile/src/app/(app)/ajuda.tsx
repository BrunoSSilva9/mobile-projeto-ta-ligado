import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { BotaoLigar } from '@/components/BotaoLigar';
import { Button } from '@/components/Button';
import { CabecalhoDeTela } from '@/components/CabecalhoDeTela';
import { Cartao } from '@/components/Cartao';
import { ComoFunciona } from '@/components/ComoFunciona';
import { CONTATOS } from '@/config/constants';
import { colors, space, type } from '@/theme';

/**
 * Ajuda (rota `/ajuda`, aberta pelo botão "Ajuda" da Início): como o app funciona, o aviso de
 * segurança, os contatos e os textos legais. Uma tela simples, só de leitura.
 */
export default function AjudaScreen() {
  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <CabecalhoDeTela titulo="Ajuda" />

      <ScrollView contentContainerStyle={styles.conteudo}>
        <ComoFunciona />

        <Aviso tom="erro" icone="warning" anunciar={false}>
          {`Fio caído ou risco de choque? Não chegue perto. Ligue para os Bombeiros: ${CONTATOS.bombeirosTelefone}.`}
        </Aviso>

        <Cartao>
          <Text accessibilityRole="header" style={[type.title3, styles.titulo]}>
            Prefere falar com alguém?
          </Text>
          <Text style={[type.body, styles.texto]}>Central: {CONTATOS.centralHorario}</Text>
          <Text style={[type.body, styles.texto]}>Ouvidoria: {CONTATOS.ouvidoriaTelefone}</Text>
          <Text style={[type.body, styles.texto]}>
            Equatorial: {CONTATOS.concessionariaTelefone}
          </Text>
          <BotaoLigar />
        </Cartao>

        <View style={styles.legais}>
          <Text accessibilityRole="header" style={[type.title3, styles.titulo]}>
            Sobre o aplicativo
          </Text>
          <Button
            titulo="Termos de Uso"
            variante="texto"
            nomeDoIcone="document-text-outline"
            onPress={() => router.push('/termos')}
          />
          <Button
            titulo="Política de Privacidade"
            variante="texto"
            nomeDoIcone="shield-checkmark-outline"
            onPress={() => router.push('/privacidade')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  conteudo: { padding: space.l, gap: space.l, paddingBottom: space.xxl },
  titulo: { color: colors.textPrimary },
  texto: { color: colors.textSecondary },
  legais: { gap: space.xs },
});
