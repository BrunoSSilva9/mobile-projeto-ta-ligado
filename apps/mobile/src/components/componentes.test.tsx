import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { EmptyState, ErrorState, LoadingState } from '@/components/Estados';
import { TextField } from '@/components/TextField';
import { TopAuthBar } from '@/components/TopAuthBar';
import { size } from '@/theme';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...argumentos: unknown[]) => mockReplace(...argumentos), push: jest.fn() },
}));

beforeEach(() => mockReplace.mockClear());

/** Estilo final de um elemento: resolve a função do `Pressable` e junta os estilos. */
function estiloDe(elemento: { props: Record<string, unknown> }): Record<string, unknown> {
  const bruto = elemento.props.style;
  const resolvido =
    typeof bruto === 'function'
      ? (bruto as (e: { pressed: boolean }) => unknown)({ pressed: false })
      : bruto;
  return StyleSheet.flatten(resolvido as StyleProp<ViewStyle>) as Record<string, unknown>;
}

describe('Button', () => {
  it('mostra o título e chama onPress', async () => {
    const onPress = jest.fn();
    await render(<Button titulo="Enviar" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('tem altura mínima de 48 dp (D-02)', async () => {
    await render(<Button titulo="Enviar" onPress={jest.fn()} />);

    expect(estiloDe(screen.getByRole('button')).minHeight).toBeGreaterThanOrEqual(size.touchMin);
  });

  it('desabilitado: não dispara onPress e informa o estado ao leitor de tela', async () => {
    const onPress = jest.fn();
    await render(<Button titulo="Enviar" onPress={onPress} desabilitado />);
    const botao = screen.getByRole('button');

    await fireEvent.press(botao);

    expect(onPress).not.toHaveBeenCalled();
    expect(botao.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('carregando: não dispara onPress, mostra o indicador e marca "ocupado"', async () => {
    const onPress = jest.fn();
    await render(<Button titulo="Enviar" onPress={onPress} carregando />);
    const botao = screen.getByRole('button');

    await fireEvent.press(botao);

    expect(onPress).not.toHaveBeenCalled();
    expect(botao.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    expect(screen.queryByText('Enviar')).toBeNull();
  });

  it('usa um rótulo acessível diferente do título quando informado', async () => {
    await render(<Button titulo="OK" accessibilityLabel="Confirmar o envio" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Confirmar o envio' })).toBeTruthy();
  });
});

describe('TextField', () => {
  it('mostra o rótulo e entrega o texto digitado', async () => {
    const onChangeText = jest.fn();
    await render(<TextField rotulo="Nome completo" value="" onChangeText={onChangeText} />);

    expect(screen.getByText('Nome completo')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Nome completo'), 'Maria');

    expect(onChangeText).toHaveBeenCalledWith('Maria');
  });

  it('o erro aparece como alerta, em texto (não só na cor)', async () => {
    await render(
      <TextField
        rotulo="E-mail"
        value="x"
        onChangeText={jest.fn()}
        erro="Informe um e-mail válido."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Informe um e-mail válido.');
  });

  it('a ajuda só aparece quando não há erro', async () => {
    const { rerender } = await render(
      <TextField rotulo="Telefone" value="" onChangeText={jest.fn()} ajuda="Com DDD" />,
    );
    expect(screen.getByText('Com DDD')).toBeTruthy();

    await rerender(
      <TextField
        rotulo="Telefone"
        value=""
        onChangeText={jest.fn()}
        ajuda="Com DDD"
        erro="Telefone inválido."
      />,
    );
    expect(screen.queryByText('Com DDD')).toBeNull();
    expect(screen.getByText('Telefone inválido.')).toBeTruthy();
  });

  it('campo de senha: começa oculto e o botão mostra/oculta com rótulo acessível', async () => {
    await render(<TextField rotulo="Senha" value="segredo" onChangeText={jest.fn()} senha />);
    const campo = screen.getByLabelText('Senha');
    expect(campo.props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
  });

  it('campo comum não tem botão de mostrar senha', async () => {
    await render(<TextField rotulo="Nome" value="" onChangeText={jest.fn()} />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Checkbox', () => {
  it('alterna o valor ao tocar e informa o estado ao leitor de tela', async () => {
    const onAlterar = jest.fn();
    const { rerender } = await render(
      <Checkbox marcado={false} onAlterar={onAlterar} rotuloAcessivel="Aceito os termos">
        Aceito
      </Checkbox>,
    );
    const caixa = screen.getByRole('checkbox', { name: 'Aceito os termos' });
    expect(caixa.props.accessibilityState).toMatchObject({ checked: false });

    await fireEvent.press(caixa);
    expect(onAlterar).toHaveBeenLastCalledWith(true);

    await rerender(
      <Checkbox marcado onAlterar={onAlterar} rotuloAcessivel="Aceito os termos">
        Aceito
      </Checkbox>,
    );
    expect(screen.getByRole('checkbox').props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onAlterar).toHaveBeenLastCalledWith(false);
  });

  it('a linha toda tem altura mínima de 48 dp (D-02)', async () => {
    await render(
      <Checkbox marcado={false} onAlterar={jest.fn()} rotuloAcessivel="x">
        x
      </Checkbox>,
    );

    expect(estiloDe(screen.getByRole('checkbox')).minHeight).toBeGreaterThanOrEqual(size.touchMin);
  });

  it('aceita links no rótulo, que respondem sem marcar a caixa', async () => {
    const onAlterar = jest.fn();
    const aoTocarNoLink = jest.fn();
    await render(
      <Checkbox marcado={false} onAlterar={onAlterar} rotuloAcessivel="Aceito">
        Aceito os <Text onPress={aoTocarNoLink}>Termos</Text>
      </Checkbox>,
    );

    await fireEvent.press(screen.getByText('Termos'));

    expect(aoTocarNoLink).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro como alerta', async () => {
    await render(
      <Checkbox marcado={false} onAlterar={jest.fn()} rotuloAcessivel="x" erro="É preciso aceitar.">
        x
      </Checkbox>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('É preciso aceitar.');
  });
});

describe('TopAuthBar', () => {
  it('Cadastrar leva a /cadastro e Entrar leva a /login', async () => {
    await render(<TopAuthBar ativo="entrar" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Cadastrar' }));
    expect(mockReplace).toHaveBeenLastCalledWith('/cadastro');

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(mockReplace).toHaveBeenLastCalledWith('/login');
  });

  it('marca o modo ativo como selecionado (leitor de tela)', async () => {
    await render(<TopAuthBar ativo="cadastrar" />);

    expect(
      screen.getByRole('button', { name: 'Cadastrar' }).props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
    expect(screen.getByRole('button', { name: 'Entrar' }).props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('os botões têm 36 dp visíveis e área de toque de pelo menos 48 dp (hitSlop)', async () => {
    await render(<TopAuthBar ativo="entrar" />);
    const botao = screen.getByRole('button', { name: 'Entrar' });
    const altura = estiloDe(botao).height as number;
    const hitSlop = botao.props.hitSlop as { top: number; bottom: number };

    expect(altura + hitSlop.top + hitSlop.bottom).toBeGreaterThanOrEqual(size.touchMin);
  });
});

describe('estados de tela (RNF-006)', () => {
  it('LoadingState anuncia que está carregando', async () => {
    await render(<LoadingState mensagem="Buscando denúncias…" />);

    expect(screen.getByText('Buscando denúncias…')).toBeTruthy();
    expect(screen.getByLabelText('Buscando denúncias…')).toBeTruthy();
  });

  it('EmptyState mostra o título, a descrição e a ação', async () => {
    const onAcao = jest.fn();
    await render(
      <EmptyState
        titulo="Você ainda não fez denúncias"
        descricao="Registre a primeira."
        acao="Fazer denúncia"
        onAcao={onAcao}
      />,
    );

    expect(screen.getByText('Você ainda não fez denúncias')).toBeTruthy();
    expect(screen.getByText('Registre a primeira.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Fazer denúncia' }));
    expect(onAcao).toHaveBeenCalledTimes(1);
  });

  it('ErrorState mostra a mensagem como alerta e oferece "Tentar novamente"', async () => {
    const onTentar = jest.fn();
    await render(<ErrorState mensagem="Sem conexão." onTentarDeNovo={onTentar} />);

    expect(screen.getByRole('alert')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onTentar).toHaveBeenCalledTimes(1);
  });

  it('ErrorState sem ação não mostra botão', async () => {
    await render(<ErrorState mensagem="Algo deu errado." />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
