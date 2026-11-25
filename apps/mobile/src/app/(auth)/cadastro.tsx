import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { TextField } from '@/components/TextField';
import { aplicarErroDaApi, useRegistrar } from '@/features/auth/hooks';
import {
  cadastroSchema,
  VALORES_INICIAIS_DO_CADASTRO,
  type DadosDoCadastro,
} from '@/features/auth/schemas';
import { colors, size, type } from '@/theme';

const CAMPOS = ['nome', 'email', 'telefone', 'senha', 'confirmarSenha', 'aceiteTermos'] as const;

/** T-01: cadastro de cidadão (RF-001, RF-002). Sem CPF e sem data de nascimento (minimização). */
export default function CadastroScreen() {
  const registrar = useRegistrar();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const { control, handleSubmit, setError, formState } = useForm<DadosDoCadastro>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: VALORES_INICIAIS_DO_CADASTRO,
    mode: 'onTouched',
  });
  const aceitou = useWatch({ control, name: 'aceiteTermos' });
  const { errors } = formState;

  const enviar = handleSubmit((dados) => {
    setErroGeral(null);
    registrar.mutate(dados, {
      onError: (erro) => setErroGeral(aplicarErroDaApi(erro, setError, CAMPOS)),
    });
  });

  return (
    <AuthLayout
      ativo="cadastrar"
      titulo="É rápido e fácil! Registre-se para começar a fazer suas denúncias."
      subtitulo="Junte-se ao Tá Ligado? e ajude a manter nossa cidade iluminada!"
      tituloDoCartao="Crie sua conta cidadã"
      rodapeDoCartao={
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Já tem uma conta? Faça login"
          onPress={() => router.replace('/login')}
          style={styles.link}
        >
          <Text style={[type.button, styles.textoDoLink]}>Já tem uma conta? Faça login aqui.</Text>
        </Pressable>
      }
    >
      <Controller
        control={control}
        name="nome"
        render={({ field }) => (
          <TextField
            rotulo="Nome completo"
            placeholder="Digite seu nome completo"
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
        name="email"
        render={({ field }) => (
          <TextField
            rotulo="Seu melhor e-mail"
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
        name="telefone"
        render={({ field }) => (
          <TextField
            rotulo="Telefone de contato (opcional)"
            placeholder="(94) 90000-0000"
            ajuda="Permite que a operadora ligue para você sobre a denúncia."
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
      <Controller
        control={control}
        name="senha"
        render={({ field }) => (
          <TextField
            senha
            rotulo="Senha"
            placeholder="Pelo menos 8 caracteres"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erro={errors.senha?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmarSenha"
        render={({ field }) => (
          <TextField
            senha
            rotulo="Confirmar senha"
            placeholder="Repita a senha"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            erro={errors.confirmarSenha?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="aceiteTermos"
        render={({ field }) => (
          <Checkbox
            marcado={field.value}
            onAlterar={field.onChange}
            rotuloAcessivel="Eu concordo com os Termos de Uso e a Política de Privacidade"
            erro={errors.aceiteTermos?.message}
          >
            Eu concordo com os{' '}
            <Text style={styles.linkNoTexto} onPress={() => router.push('/termos')}>
              Termos de Uso
            </Text>{' '}
            e a{' '}
            <Text style={styles.linkNoTexto} onPress={() => router.push('/privacidade')}>
              Política de Privacidade
            </Text>
            , inclusive o compartilhamento da denúncia com a Equatorial Pará.
          </Checkbox>
        )}
      />

      {erroGeral ? <Aviso tom="erro">{erroGeral}</Aviso> : null}

      <Button
        testID="botao-cadastrar"
        titulo="Cadastrar"
        accessibilityLabel="Cadastrar e criar conta"
        carregando={registrar.isPending}
        desabilitado={!aceitou}
        onPress={() => void enviar()}
        nomeDoIcone="arrow-forward"
      />

      <Aviso tom="info" icone="shield-checkmark-outline" anunciar={false}>
        Suas denúncias aparecem para outros cidadãos sem identificação.
      </Aviso>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: size.touchMin, alignItems: 'center', justifyContent: 'center' },
  textoDoLink: { color: colors.action, textDecorationLine: 'underline' },
  linkNoTexto: {
    color: colors.action,
    textDecorationLine: 'underline',
    fontFamily: type.button.fontFamily,
  },
});
