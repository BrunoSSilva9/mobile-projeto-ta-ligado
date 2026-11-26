import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { AvisoDeConexao } from '@/components/AvisoDeConexao';
import { Button } from '@/components/Button';
import { CabecalhoDeTela } from '@/components/CabecalhoDeTela';
import { Cartao } from '@/components/Cartao';
import { Checkbox } from '@/components/Checkbox';
import { TextField } from '@/components/TextField';
import {
  APAGADOS,
  AVISO_DA_EXCLUSAO,
  QUE_FICAM,
  TEXTO_DA_CONFIRMACAO,
} from '@/features/auth/exclusao';
import { useExcluirConta } from '@/features/auth/hooks';
import { ErroDeApi } from '@/services/http';
import { colors, space, type } from '@/theme';

/** Mensagem do campo de senha, ou do aviso geral, a partir do erro da API. */
function mensagensDoErro(erro: unknown): { senha?: string; geral?: string } {
  if (erro instanceof ErroDeApi && erro.codigo === 'SENHA_INCORRETA') {
    return { senha: 'Senha incorreta.' };
  }
  if (erro instanceof ErroDeApi) return { geral: erro.message };
  return { geral: 'Algo deu errado. Tente novamente.' };
}

/**
 * Excluir minha conta (T-08, RF-006, RN-024; decisões S-50, S-51 e S-59). **Tela própria**, nunca
 * direto no Perfil: explica o que é apagado e o que fica, pede a **senha atual** e uma confirmação
 * em caixa, e só então libera o botão "Excluir minha conta" (que é o primário azul: o vermelho
 * fica reservado à situação da energia). Senha errada: mensagem no campo, **sem desconectar**.
 * Sucesso: o app apaga o que era desta conta no aparelho e volta ao login.
 */
export default function ExcluirContaScreen() {
  const excluir = useExcluirConta();
  const [senha, setSenha] = useState('');
  const [entendi, setEntendi] = useState(false);
  const mensagens = excluir.isError ? mensagensDoErro(excluir.error) : {};
  const pronto = entendi && senha !== '';

  return (
    <SafeAreaView style={styles.tela} edges={['top', 'bottom']}>
      <CabecalhoDeTela titulo="Excluir minha conta" />
      <KeyboardAvoidingView
        style={styles.fluxo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <AvisoDeConexao escrita />

          <Aviso tom="erro" icone="warning" comBorda anunciar={false}>
            {AVISO_DA_EXCLUSAO}
          </Aviso>

          <Cartao>
            <Text accessibilityRole="header" style={[type.title3, styles.titulo]}>
              O que será apagado
            </Text>
            {APAGADOS.map((item) => (
              <View key={item} style={styles.linha}>
                <Text style={[type.body, styles.marcador]}>•</Text>
                <Text style={[type.body, styles.texto]}>{item}</Text>
              </View>
            ))}
          </Cartao>

          <Cartao>
            <Text accessibilityRole="header" style={[type.title3, styles.titulo]}>
              O que fica
            </Text>
            <Text style={[type.body, styles.texto]}>{QUE_FICAM}</Text>
          </Cartao>

          <TextField
            rotulo="Sua senha atual"
            senha
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            value={senha}
            onChangeText={(valor) => {
              setSenha(valor);
              if (excluir.isError) excluir.reset(); // volta a deixar tentar sem a mensagem antiga
            }}
            erro={mensagens.senha}
          />

          <Checkbox
            testID="confirmacao-de-exclusao"
            marcado={entendi}
            onAlterar={setEntendi}
            rotuloAcessivel={TEXTO_DA_CONFIRMACAO}
          >
            {TEXTO_DA_CONFIRMACAO}
          </Checkbox>

          {mensagens.geral ? <Aviso tom="erro">{mensagens.geral}</Aviso> : null}

          <Button
            testID="botao-excluir-conta"
            titulo="Excluir minha conta"
            nomeDoIcone="trash-outline"
            carregando={excluir.isPending}
            desabilitado={!pronto}
            onPress={() => excluir.mutate(senha)}
          />
          {!pronto ? (
            <Text style={[type.bodySmall, styles.apoio]}>
              Para excluir, digite a sua senha e marque a caixa acima.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  fluxo: { flex: 1 },
  conteudo: { padding: space.l, gap: space.l, paddingBottom: space.xxl },
  titulo: { color: colors.textPrimary },
  texto: { flex: 1, color: colors.textPrimary },
  apoio: { color: colors.textSecondary },
  marcador: { color: colors.action },
  linha: { flexDirection: 'row', gap: space.s },
});
