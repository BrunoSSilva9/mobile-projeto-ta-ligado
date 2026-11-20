import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { contarEmAberto, useMinhasDenuncias } from '@/features/acompanhamento/hooks';
import { encerrarSessao } from '@/services/api';
import { useSessao } from '@/store/session';
import { colors, radius, size, space, type } from '@/theme';

/**
 * T-08 (mínimo na Fase 1, decisão S-37): dados da conta, "Minhas denúncias" e "Sair" (RF-004).
 * Editar dados e excluir conta ficam para a Fase 2.
 */
export default function PerfilScreen() {
  const usuario = useSessao((s) => s.usuario);
  const minhas = useMinhasDenuncias();
  const abertas = minhas.data ? contarEmAberto(minhas.data.itens) : null;

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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            abertas ? `Minhas denúncias, ${abertas} em aberto` : 'Minhas denúncias'
          }
          onPress={() => router.push('/minhas-denuncias')}
          style={styles.item}
        >
          <Ionicons name="document-text-outline" size={22} color={colors.action} />
          <Text style={[type.subtitle, styles.itemTexto]}>Minhas denúncias</Text>
          {abertas ? <Text style={[type.label, styles.contador]}>{abertas} EM ABERTO</Text> : null}
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>

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
  item: {
    minHeight: size.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    backgroundColor: colors.bgCard,
    borderRadius: radius.card,
    paddingHorizontal: space.l,
  },
  itemTexto: { flex: 1, color: colors.textPrimary },
  contador: { color: colors.action },
});
