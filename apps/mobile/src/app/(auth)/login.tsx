import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { aplicarErroDaApi, useEntrar } from '@/features/auth/hooks';
import { loginSchema, type DadosDoLogin } from '@/features/auth/schemas';
import { colors, size, space, type } from '@/theme';

const CAMPOS = ['email', 'senha'] as const;

/** T-02: login com e-mail e senha (RF-003). Sem "Esqueci a senha" e sem Google (fora do MVP). */
export default function LoginScreen() {
  const entrar = useEntrar();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const { control, handleSubmit, setError, formState } = useForm<DadosDoLogin>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
    mode: 'onTouched',
  });
  const { errors } = formState;

  const enviar = handleSubmit((dados) => {
    setErroGeral(null);
    entrar.mutate(dados, {
      onError: (erro) => setErroGeral(aplicarErroDaApi(erro, setError, CAMPOS)),
    });
  });

  return (
    <AuthLayout
      ativo="entrar"
      titulo="Que bom ter você de volta! Entre para acompanhar suas denúncias."
      subtitulo="Veja a situação da energia no seu bairro e o andamento do que você registrou."
      tituloDoCartao="Entre na sua conta"
      rodapeDoCartao={
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Não tem conta? Cadastre-se"
          onPress={() => router.replace('/cadastro')}
          style={styles.link}
        >
          <Text style={[type.button, { color: colors.action }]}>
            Não tem conta? Cadastre-se aqui.
          </Text>
        </Pressable>
      }
    >
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            superficie="escura"
            rotulo="E-mail"
            placeholder="exemplo@maraba.com.br"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erro={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="senha"
        render={({ field }) => (
          <TextField
            superficie="escura"
            senha
            rotulo="Senha"
            placeholder="Sua senha"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erro={errors.senha?.message}
          />
        )}
      />

      {erroGeral ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[type.body, styles.erroGeral]}
        >
          {erroGeral}
        </Text>
      ) : null}

      <Button
        testID="botao-entrar"
        titulo="ENTRAR"
        variante="claro"
        carregando={entrar.isPending}
        onPress={() => void enviar()}
        icone={<Ionicons name="arrow-forward" size={18} color={colors.action} />}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: size.touchMin, alignItems: 'center', justifyContent: 'center' },
  erroGeral: {
    color: colors.status.noPowerBg,
    backgroundColor: 'rgba(186,26,26,0.25)',
    borderRadius: 8,
    padding: space.m,
  },
});
