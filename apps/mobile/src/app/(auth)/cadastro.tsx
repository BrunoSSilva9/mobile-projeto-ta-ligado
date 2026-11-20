import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
import { colors, size, space, type } from '@/theme';

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
          <Text style={[type.button, { color: colors.action }]}>
            Já tem uma conta? Faça login aqui.
          </Text>
        </Pressable>
      }
    >
      <Controller
        control={control}
        name="nome"
        render={({ field }) => (
          <TextField
            superficie="escura"
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
            superficie="escura"
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
            superficie="escura"
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
            superficie="escura"
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
            superficie="escura"
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
            superficie="escura"
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
        testID="botao-cadastrar"
        titulo="CADASTRAR"
        variante="claro"
        carregando={registrar.isPending}
        desabilitado={!aceitou}
        onPress={() => void enviar()}
        icone={<Ionicons name="arrow-forward" size={18} color={colors.action} />}
      />

      <View style={styles.privacidade}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.surfaceMint} />
        <Text style={[type.caption, styles.privacidadeTexto]}>
          Suas denúncias aparecem para outros cidadãos sem identificação.
        </Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: size.touchMin, alignItems: 'center', justifyContent: 'center' },
  linkNoTexto: {
    color: colors.mint,
    textDecorationLine: 'underline',
    fontFamily: type.button.fontFamily,
  },
  erroGeral: {
    color: colors.status.noPowerBg,
    backgroundColor: 'rgba(186,26,26,0.25)',
    borderRadius: 8,
    padding: space.m,
  },
  privacidade: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  privacidadeTexto: { color: colors.surfaceMint, flex: 1 },
});
