import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { encerrarSessao } from '@/services/api';
import { useSessao } from '@/store/session';
import { colors, radius, space, type } from '@/theme';

/**
 * T-08 (mínimo na Fase 1, decisão S-37): dados da conta e "Sair" (RF-004).
 * "Minhas denúncias" entra no Passo 8; editar dados e excluir conta, na Fase 2.
 */
export default function PerfilScreen() {
  const usuario = useSessao((s) => s.usuario);

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <View style={styles.cabecalho}>
        <Logo />
      </View>
      <View style={styles.corpo}>
        <Text accessibilityRole="header" style={[type.h1, styles.titulo]}>
          Perfil
        </Text>

        <View style={styles.cartao}>
          <Linha rotulo="Nome" valor={usuario?.nome} />
          <Linha rotulo="E-mail" valor={usuario?.email} />
          <Linha rotulo="Telefone" valor={usuario?.telefone ?? 'Não informado'} />
        </View>

        <Button
          testID="botao-sair"
          titulo="Sair"
          variante="secundario"
          onPress={() => void encerrarSessao()}
        />
      </View>
    </SafeAreaView>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor?: string }) {
  return (
    <View style={styles.linha} accessible accessibilityLabel={`${rotulo}: ${valor ?? ''}`}>
      <Text style={[type.label, styles.rotulo]}>{rotulo}</Text>
      <Text style={[type.body, styles.valor]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  cabecalho: { height: 64, justifyContent: 'center', paddingHorizontal: space.l },
  corpo: { flex: 1, padding: space.l, gap: space.l },
  titulo: { color: colors.textPrimary },
  cartao: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.cardLarge,
    padding: space.l,
    gap: space.m,
  },
  linha: { gap: space.half },
  rotulo: { color: colors.textSecondary },
  valor: { color: colors.textPrimary },
});
