import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';

import { entrarComoOperador } from '../features/auth/api';
import { useSessao } from '../store/sessao';

/** P-01: login do operador (RF-026). Sem cadastro: a conta do operador é criada pela equipe. */
export function LoginPage() {
  const logado = useSessao((s) => s.token !== null);
  const entrar = useSessao((s) => s.entrar);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tentou, setTentou] = useState(false);

  const login = useMutation({ mutationFn: entrarComoOperador, onSuccess: entrar });

  if (logado) return <Navigate to="/" replace />;

  const emailInvalido = tentou && !/^\S+@\S+\.\S+$/.test(email.trim());
  const senhaVazia = tentou && senha === '';

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setTentou(true);
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || senha === '') return;
    login.mutate({ email: email.trim(), senha });
  };

  return (
    <main className="login">
      <form className="login__cartao" onSubmit={enviar} noValidate aria-labelledby="login-titulo">
        <div className="logo" aria-label="Tá Ligado? Painel da Operadora">
          <span className="logo__name">
            Tá Ligado<span className="logo__mark">?</span>
          </span>
          <span className="logo__tagline">Painel da Operadora</span>
        </div>
        <h1 id="login-titulo">Entre no painel</h1>

        <div className="campo">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={emailInvalido}
            aria-describedby={emailInvalido ? 'login-email-erro' : undefined}
          />
          {emailInvalido ? (
            <p id="login-email-erro" className="campo__erro">
              Informe um e-mail válido.
            </p>
          ) : null}
        </div>

        <div className="campo">
          <label htmlFor="login-senha">Senha</label>
          <input
            id="login-senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-invalid={senhaVazia}
            aria-describedby={senhaVazia ? 'login-senha-erro' : undefined}
          />
          {senhaVazia ? (
            <p id="login-senha-erro" className="campo__erro">
              Informe a senha.
            </p>
          ) : null}
        </div>

        {login.isError ? (
          <p role="alert" className="login__erro">
            {login.error.message}
          </p>
        ) : null}

        <button type="submit" className="botao botao--primario" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
