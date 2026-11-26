import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { AvisoDeConexao } from '@/components/AvisoDeConexao';
import { Button } from '@/components/Button';
import { CabecalhoDeTela } from '@/components/CabecalhoDeTela';
import { Cartao } from '@/components/Cartao';
import { TextField } from '@/components/TextField';
import { aplicarErroDaApi, useAtualizarPerfil } from '@/features/auth/hooks';
import { perfilSchema, type DadosDoPerfil } from '@/features/auth/schemas';
import { useSessao } from '@/store/session';
import { colors, space, type } from '@/theme';

const CAMPOS = ['nome', 'telefone'] as const;

/**
 * Editar meus dados (T-08, RF-005): nome e telefone. O **e-mail é somente leitura** (decisão S-22),
 * mostrado em texto, com o motivo. Telefone vazio apaga o telefone. Erros do servidor vão para o
 * campo certo; sem internet, a mensagem fica acima do botão e o que foi digitado continua na tela.
 */
export default function EditarPerfilScreen() {
  const usuario = useSessao((s) => s.usuario);
  const salvar = useAtualizarPerfil();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const { control, handleSubmit, setError, formState } = useForm<DadosDoPerfil>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { nome: usuario?.nome ?? '', telefone: usuario?.telefone ?? '' },
    mode: 'onTouched',
  });
  const { errors } = formState;

  const enviar = handleSubmit((dados) => {
    setErroGeral(null);
    salvar.mutate(dados, {
      onSuccess: () => {
        AccessibilityInfo.announceForAccessibility('Dados salvos.');
        if (router.canGoBack()) router.back();
        else router.replace('/perfil');
      },
      onError: (erro) => setErroGeral(aplicarErroDaApi(erro, setError, CAMPOS)),
    });
  });

  return (
    <SafeAreaView style={styles.tela} edges={['top', 'bottom']}>
      <CabecalhoDeTela titulo="Editar meus dados" />
      <KeyboardAvoidingView
        style={styles.fluxo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <AvisoDeConexao escrita />

          <Controller
            control={control}
            name="nome"
            render={({ field }) => (
              <TextField
                rotulo="Nome completo"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                erro={errors.nome?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="telefone"
            render={({ field }) => (
              <TextField
                rotulo="Telefone de contato (opcional)"
                placeholder="(94) 90000-0000"
                ajuda="Permite que a operadora ligue para você sobre a denúncia. Deixe em branco para apagar."
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                erro={errors.telefone?.message}
              />
            )}
          />

          <Cartao>
            <View accessible accessibilityLabel={`E-mail: ${usuario?.email ?? ''}`}>
              <Text style={[type.label, styles.apoio]}>E-mail</Text>
              <Text style={[type.body, styles.valor]}>{usuario?.email}</Text>
            </View>
            <Text style={[type.bodySmall, styles.apoio]}>
              O e-mail não pode ser alterado por aqui.
            </Text>
          </Cartao>

          {erroGeral ? <Aviso tom="erro">{erroGeral}</Aviso> : null}

          <Button
            testID="botao-salvar-perfil"
            titulo="Salvar"
            carregando={salvar.isPending}
            onPress={() => void enviar()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  fluxo: { flex: 1 },
  conteudo: { padding: space.l, gap: space.l, paddingBottom: space.xxl },
  apoio: { color: colors.textSecondary },
  valor: { color: colors.textPrimary },
});
