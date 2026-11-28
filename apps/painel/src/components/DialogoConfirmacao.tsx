import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

type Props = {
  titulo: string;
  children: ReactNode;
  rotuloConfirmar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  /** Enquanto a ação roda, os dois botões ficam desativados. */
  ocupado?: boolean;
};

/**
 * Diálogo de confirmação para ações em massa (RF-034, RN-016). Acessibilidade: `alertdialog`
 * modal com título e descrição ligados; o foco entra em "Cancelar" (a opção segura), fica preso
 * dentro do diálogo (Tab e Shift+Tab), `Esc` cancela e, ao fechar, o foco volta para o botão
 * que abriu o diálogo.
 */
export function DialogoConfirmacao({
  titulo,
  children,
  rotuloConfirmar,
  onConfirmar,
  onCancelar,
  ocupado = false,
}: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const quemAbriu = document.activeElement as HTMLElement | null;
    cancelar.current?.focus();
    return () => quemAbriu?.focus?.();
  }, []);

  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && !ocupado) {
      e.stopPropagation();
      onCancelar();
      return;
    }
    if (e.key !== 'Tab') return;
    const focaveis = [
      ...(caixa.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? []),
    ];
    if (focaveis.length === 0) {
      e.preventDefault();
      return;
    }
    const primeiro = focaveis[0]!;
    const ultimo = focaveis[focaveis.length - 1]!;
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  };

  return (
    <div className="dialogo__fundo">
      <div
        ref={caixa}
        className="dialogo"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        aria-describedby="dialogo-descricao"
        onKeyDown={aoTeclar}
      >
        <h2 id="dialogo-titulo">{titulo}</h2>
        <div id="dialogo-descricao">{children}</div>
        <div className="acoes__botoes">
          <button
            ref={cancelar}
            type="button"
            className="botao botao--secundario"
            disabled={ocupado}
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="botao botao--primario"
            disabled={ocupado}
            onClick={onConfirmar}
          >
            {ocupado ? 'Resolvendo…' : rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
