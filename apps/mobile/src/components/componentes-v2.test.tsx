import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Aviso } from '@/components/Aviso';
import { Button, coresDoBotao } from '@/components/Button';
import { CabecalhoDePasso } from '@/components/CabecalhoDePasso';
import { CabecalhoDeTela } from '@/components/CabecalhoDeTela';
import { Cartao } from '@/components/Cartao';
import { ALTURA_DO_CARTAO_DE_ESCOLHA, CartaoDeEscolha } from '@/components/CartaoDeEscolha';
import { FilterChip } from '@/components/FilterChip';
import { Logo } from '@/components/Logo';
import { SeloDeSituacao } from '@/components/SeloDeSituacao';
import { StatusBadge } from '@/components/StatusBadge';
import { TextField } from '@/components/TextField';
import { colors, contrastRatio, size } from '@/theme';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockPodeVoltar = true;
jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    replace: (...a: unknown[]) => mockReplace(...a),
    canGoBack: () => mockPodeVoltar,
  },
}));

beforeEach(() => {
  mockBack.mockClear();
  mockReplace.mockClear();
  mockPodeVoltar = true;
});

/** Estilo final de um elemento, resolvendo a função do `Pressable` (com ou sem toque). */
function estiloDe(
  elemento: { props: Record<string, unknown> },
  pressionado = false,
): Record<string, unknown> {
  const bruto = elemento.props.style;
  const resolvido =
    typeof bruto === 'function'
      ? (bruto as (e: { pressed: boolean }) => unknown)({ pressed: pressionado })
      : bruto;
  return StyleSheet.flatten(resolvido as StyleProp<ViewStyle>) as Record<string, unknown>;
}

describe('Button (design system v2)', () => {
  it('primário: azul cheio com texto branco, 56 dp e largura total', async () => {
    await render(<Button titulo="Fazer denúncia" onPress={jest.fn()} />);
    const botao = screen.getByRole('button', { name: 'Fazer denúncia' });
    const estilo = estiloDe(botao);

    expect(estilo.backgroundColor).toBe(colors.action);
    expect(estilo.minHeight).toBeGreaterThanOrEqual(56);
    expect(estilo.alignSelf).toBe('stretch');
    expect(StyleSheet.flatten(screen.getByText('Fazer denúncia').props.style).color).toBe(
      colors.onAction,
    );
  });

  it('cores por estado: pressionado escurece o primário e tinge o secundário e o de texto', () => {
    expect(coresDoBotao('primario', false, false).fundo).toBe(colors.action);
    expect(coresDoBotao('primario', true, false).fundo).toBe(colors.actionPressed);
    expect(coresDoBotao('secundario', true, false)).toMatchObject({
      fundo: colors.actionSoft,
      texto: colors.actionPressed,
    });
    expect(coresDoBotao('texto', true, false).texto).toBe(colors.actionPressed);
  });

  it('as cores de cada estado têm contraste de texto (>= 4,5:1)', () => {
    for (const variante of ['primario', 'secundario'] as const) {
      for (const [pressionado, inativo] of [
        [false, false],
        [true, false],
        [false, true],
      ] as const) {
        const cor = coresDoBotao(variante, pressionado, inativo);
        expect(contrastRatio(cor.texto, cor.fundo)).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(
      contrastRatio(coresDoBotao('texto', false, false).texto, colors.bgPage),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('secundário: fundo branco com borda azul de 2 e 56 dp', async () => {
    await render(<Button titulo="Não, quero corrigir" variante="secundario" onPress={jest.fn()} />);
    const estilo = estiloDe(screen.getByRole('button'));

    expect(estilo.backgroundColor).toBe(colors.surface);
    expect(estilo.borderColor).toBe(colors.action);
    expect(estilo.borderWidth).toBe(2);
    expect(estilo.minHeight).toBeGreaterThanOrEqual(56);
  });

  it('de texto: sem fundo, azul, negrito e sublinhado, com alvo de 48 dp', async () => {
    await render(<Button titulo="Trocar" variante="texto" onPress={jest.fn()} />);
    const estiloDoTexto = StyleSheet.flatten(screen.getByText('Trocar').props.style);

    expect(estiloDoTexto.textDecorationLine).toBe('underline');
    expect(estiloDoTexto.color).toBe(colors.action);
    expect(estiloDoTexto.fontFamily).toMatch(/700Bold/);
    expect(estiloDe(screen.getByRole('button')).minHeight).toBeGreaterThanOrEqual(size.touchMin);
  });

  it('desativado: fundo e texto cinzas legíveis, sem opacidade e sem disparar o toque', async () => {
    const onPress = jest.fn();
    await render(<Button titulo="Continuar" onPress={onPress} desabilitado />);
    const botao = screen.getByRole('button');
    const estilo = estiloDe(botao);

    await fireEvent.press(botao);

    expect(onPress).not.toHaveBeenCalled();
    expect(estilo.backgroundColor).toBe(colors.disabledBg);
    expect(estilo).not.toHaveProperty('opacity');
    expect(StyleSheet.flatten(screen.getByText('Continuar').props.style).color).toBe(
      colors.disabledText,
    );
  });

  it('mostra o texto junto do ícone (nenhum botão é só ícone)', async () => {
    await render(<Button titulo="Fazer denúncia" nomeDoIcone="flash-off" onPress={jest.fn()} />);

    expect(screen.getByText('Fazer denúncia')).toBeTruthy();
  });
});

describe('TextField (design system v2)', () => {
  it('rótulo visível acima, campo de 56 dp com borda de 2 e canto de 8', async () => {
    await render(<TextField rotulo="Logradouro" value="" onChangeText={jest.fn()} />);
    const campo = screen.getByLabelText('Logradouro').parent!;
    const estilo = StyleSheet.flatten(campo.props.style);

    expect(screen.getByText('Logradouro')).toBeTruthy();
    expect(estilo.minHeight).toBeGreaterThanOrEqual(56);
    expect(estilo.borderWidth).toBe(2);
    expect(estilo.borderColor).toBe(colors.borderField);
    expect(estilo.borderRadius).toBe(8);
  });

  it('com erro: borda vermelha e uma frase em alerta (ícone + texto, não só a cor)', async () => {
    await render(
      <TextField
        rotulo="CEP"
        value="12"
        onChangeText={jest.fn()}
        erro="Informe o CEP no formato 68500-000."
      />,
    );
    const campo = screen.getByLabelText('CEP').parent!;

    expect(StyleSheet.flatten(campo.props.style).borderColor).toBe(colors.danger);
    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('Informe o CEP no formato 68500-000.');
    expect(StyleSheet.flatten(alerta.props.style).color).toBe(colors.danger);
  });

  it('senha: o botão mostra o texto "Mostrar" / "Ocultar" (não é só ícone)', async () => {
    await render(<TextField rotulo="Senha" value="x" onChangeText={jest.fn()} senha />);

    expect(screen.getByText('Mostrar')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByText('Ocultar')).toBeTruthy();
  });

  it('o texto digitado tem o corpo de 18 (legível)', async () => {
    await render(<TextField rotulo="Nome" value="Maria" onChangeText={jest.fn()} />);

    expect(StyleSheet.flatten(screen.getByLabelText('Nome').props.style).fontSize).toBe(18);
  });
});

describe('StatusBadge (andamento da denúncia)', () => {
  it.each([
    ['RECEBIDA', 'Recebida'],
    ['EM_ATENDIMENTO', 'Em atendimento'],
    ['RESOLVIDA', 'Resolvida'],
    ['IMPROCEDENTE', 'Improcedente'],
    ['CANCELADA', 'Cancelada'],
  ])(
    '%s aparece como "%s", em caixa normal e com rótulo para o leitor de tela',
    async (status, rotulo) => {
      await render(<StatusBadge status={status} />);

      expect(screen.getByText(rotulo)).toBeTruthy();
      expect(screen.getByLabelText(`Status: ${rotulo}`)).toBeTruthy();
      expect(screen.queryByText(rotulo.toUpperCase())).toBeNull();
    },
  );

  it('usa as cores do andamento', async () => {
    await render(<StatusBadge status="EM_ATENDIMENTO" />);

    expect(StyleSheet.flatten(screen.getByText('Em atendimento').props.style).color).toBe(
      colors.andamento.EM_ATENDIMENTO.texto,
    );
  });

  it('um status desconhecido aparece como veio, no visual neutro', async () => {
    await render(<StatusBadge status="OUTRO" />);

    expect(screen.getByText('OUTRO')).toBeTruthy();
  });
});

describe('SeloDeSituacao (a cor nunca aparece sozinha)', () => {
  it.each([
    ['semEnergia', 'Sem energia'],
    ['oscilando', 'Oscilando'],
    ['normal', 'Normal'],
  ] as const)(
    '%s mostra o texto "%s" e é lido como situação da energia',
    async (situacao, rotulo) => {
      await render(<SeloDeSituacao situacao={situacao} />);

      expect(screen.getByText(rotulo)).toBeTruthy();
      expect(screen.getByLabelText(`Situação da energia: ${rotulo}`)).toBeTruthy();
    },
  );

  it('usa o texto e o fundo da situação (contraste verificado no tema)', async () => {
    await render(<SeloDeSituacao situacao="oscilando" />);

    expect(StyleSheet.flatten(screen.getByText('Oscilando').props.style).color).toBe(
      colors.situacao.oscilando.texto,
    );
    expect(
      StyleSheet.flatten(screen.getByLabelText('Situação da energia: Oscilando').props.style)
        .backgroundColor,
    ).toBe(colors.situacao.oscilando.fundo);
  });

  it('o tamanho grande usa o texto maior', async () => {
    await render(<SeloDeSituacao situacao="normal" tamanho="grande" />);

    expect(StyleSheet.flatten(screen.getByText('Normal').props.style).fontSize).toBe(20);
  });
});

describe('FilterChip', () => {
  it('mostra a contagem e informa o estado ao leitor de tela', async () => {
    const onPress = jest.fn();
    await render(
      <FilterChip rotulo="Sem energia" total={9} selecionado={false} onPress={onPress} />,
    );
    const chip = screen.getByRole('radio', { name: 'Sem energia (9)' });

    expect(chip.props.accessibilityState).toMatchObject({ selected: false });
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('selecionado: azul cheio com texto branco; não selecionado: branco com borda', async () => {
    const { rerender } = await render(
      <FilterChip rotulo="Todos" selecionado={false} onPress={jest.fn()} />,
    );
    let estilo = estiloDe(screen.getByRole('radio'));
    expect(estilo.backgroundColor).toBe(colors.surface);
    expect(estilo.borderColor).toBe(colors.borderField);

    await rerender(<FilterChip rotulo="Todos" selecionado onPress={jest.fn()} />);
    estilo = estiloDe(screen.getByRole('radio'));
    expect(estilo.backgroundColor).toBe(colors.action);
    expect(StyleSheet.flatten(screen.getByText('Todos').props.style).color).toBe(colors.onAction);
    expect(screen.getByRole('radio').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('tem pelo menos 48 dp de altura (D-02)', async () => {
    await render(<FilterChip rotulo="Todos" selecionado onPress={jest.fn()} />);

    expect(estiloDe(screen.getByRole('radio')).minHeight).toBeGreaterThanOrEqual(size.touchMin);
  });
});

describe('Logo', () => {
  it('mostra o nome e é lido como "Tá Ligado?", sem subtítulo em maiúsculas', async () => {
    await render(<Logo />);

    expect(screen.getByText('Tá Ligado?')).toBeTruthy();
    expect(screen.getByLabelText('Tá Ligado?')).toBeTruthy();
    expect(screen.queryByText(/MARABÁ/)).toBeNull();
  });
});

describe('Cartao', () => {
  it('é branco, sem sombra, com canto de 16', async () => {
    await render(
      <Cartao testID="c">
        <Text>conteúdo</Text>
      </Cartao>,
    );
    const estilo = StyleSheet.flatten(screen.getByTestId('c').props.style);

    expect(estilo.backgroundColor).toBe(colors.surface);
    expect(estilo.borderRadius).toBe(16);
    expect(estilo).not.toHaveProperty('shadowOpacity');
    expect(estilo).not.toHaveProperty('elevation');
  });

  it('destaque: borda azul de 2', async () => {
    await render(
      <Cartao testID="c" destaque>
        <Text>conteúdo</Text>
      </Cartao>,
    );
    const estilo = StyleSheet.flatten(screen.getByTestId('c').props.style);

    expect(estilo.borderWidth).toBe(2);
    expect(estilo.borderColor).toBe(colors.action);
  });
});

describe('Aviso', () => {
  it('erro: texto em alerta com as cores de "sem energia"', async () => {
    await render(<Aviso tom="erro">Não deu certo. Tente de novo.</Aviso>);
    const alerta = screen.getByRole('alert');

    expect(alerta).toHaveTextContent('Não deu certo. Tente de novo.');
    expect(StyleSheet.flatten(alerta.props.style).color).toBe(colors.situacao.semEnergia.texto);
  });

  it('atenção usa as cores de "oscilando" e informação, as do azul', async () => {
    const { rerender } = await render(<Aviso tom="atencao">Cuidado.</Aviso>);
    expect(StyleSheet.flatten(screen.getByText('Cuidado.').props.style).color).toBe(
      colors.situacao.oscilando.texto,
    );

    await rerender(<Aviso tom="info">Saiba mais.</Aviso>);
    expect(StyleSheet.flatten(screen.getByText('Saiba mais.').props.style).color).toBe(
      colors.actionPressed,
    );
  });

  it('com `anunciar={false}` não vira alerta do leitor de tela', async () => {
    await render(
      <Aviso tom="info" anunciar={false}>
        Já estava na tela.
      </Aviso>,
    );

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Já estava na tela.')).toBeTruthy();
  });
});

describe('CartaoDeEscolha', () => {
  const montar = (selecionado: boolean, onPress = jest.fn()) =>
    render(
      <CartaoDeEscolha
        titulo="Estou sem energia"
        descricao="A luz acabou de vez. Nada liga."
        icone="flash-off"
        selecionado={selecionado}
        onPress={onPress}
      />,
    );

  it('é um rádio com o título e a descrição lidos juntos', async () => {
    await montar(false);

    const radio = screen.getByRole('radio', {
      name: 'Estou sem energia. A luz acabou de vez. Nada liga.',
    });
    expect(radio.props.accessibilityState).toMatchObject({ checked: false });
  });

  it('tem pelo menos 104 dp de altura', async () => {
    await montar(false);

    expect(ALTURA_DO_CARTAO_DE_ESCOLHA).toBe(104);
    expect(estiloDe(screen.getByRole('radio')).minHeight).toBeGreaterThanOrEqual(104);
  });

  it('selecionado: borda azul de 3 e fundo `actionSoft`; não selecionado: borda de 2', async () => {
    const { rerender } = await montar(false);
    expect(estiloDe(screen.getByRole('radio')).borderWidth).toBe(2);

    await rerender(
      <CartaoDeEscolha
        titulo="Estou sem energia"
        descricao="A luz acabou de vez. Nada liga."
        icone="flash-off"
        selecionado
        onPress={jest.fn()}
      />,
    );
    const estilo = estiloDe(screen.getByRole('radio'));
    expect(estilo.borderWidth).toBe(3);
    expect(estilo.borderColor).toBe(colors.action);
    expect(estilo.backgroundColor).toBe(colors.actionSoft);
    expect(screen.getByRole('radio').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('chama onPress ao tocar', async () => {
    const onPress = jest.fn();
    await montar(false, onPress);

    await fireEvent.press(screen.getByRole('radio'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('CabecalhoDePasso', () => {
  it('mostra "Passo X de 3", o "Voltar" com texto e a barra com o valor para o leitor de tela', async () => {
    const onVoltar = jest.fn();
    await render(<CabecalhoDePasso passo={2} onVoltar={onVoltar} />);

    expect(screen.getAllByText('Passo 2 de 3').length).toBeGreaterThan(0);
    const barra = screen.getByRole('progressbar');
    expect(barra.props.accessibilityValue).toMatchObject({ min: 1, max: 3, now: 2 });
    expect(screen.getByText('Voltar')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(onVoltar).toHaveBeenCalledTimes(1);
  });

  it.each([1, 2, 3])('no passo %i, preenche %i segmento(s) da barra', async (passo) => {
    await render(<CabecalhoDePasso passo={passo} onVoltar={jest.fn()} />);

    const cheios = [1, 2, 3].filter(
      (n) =>
        StyleSheet.flatten(screen.getByTestId(`segmento-${n}`).props.style).backgroundColor ===
        colors.action,
    );
    expect(cheios).toHaveLength(passo);
  });

  it('o botão Voltar tem pelo menos 48 dp', async () => {
    await render(<CabecalhoDePasso passo={1} onVoltar={jest.fn()} />);

    expect(
      estiloDe(screen.getByRole('button', { name: 'Voltar' })).minHeight,
    ).toBeGreaterThanOrEqual(size.touchMin);
  });
});

describe('CabecalhoDeTela', () => {
  it('o "Voltar" tem ícone e texto, 48 dp, e volta', async () => {
    await render(<CabecalhoDeTela titulo="Minhas denúncias" />);

    expect(screen.getByText('Voltar')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Minhas denúncias' })).toBeTruthy();
    const botao = screen.getByRole('button', { name: 'Voltar' });
    expect(estiloDe(botao).minHeight).toBeGreaterThanOrEqual(size.touchMin);

    await fireEvent.press(botao);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('sem para onde voltar, vai ao início', async () => {
    mockPodeVoltar = false;
    await render(<CabecalhoDeTela titulo="Detalhe" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
