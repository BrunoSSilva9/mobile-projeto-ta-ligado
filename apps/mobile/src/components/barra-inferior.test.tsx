import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import {
  ALTURA_DA_BARRA,
  ESTILO_DA_BARRA,
  ESTILO_DO_TEXTO_DA_BARRA,
  IconeDaAba,
  ItemDenunciarDaBarra,
} from '@/components/BarraInferior';
import { colors, contrastRatio, size } from '@/theme';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

beforeEach(() => mockPush.mockClear());

describe('barra inferior: aparência (design system v2)', () => {
  it('fundo branco sólido com borda superior e sem sombra', () => {
    expect(ESTILO_DA_BARRA.backgroundColor).toBe(colors.surface);
    expect(ESTILO_DA_BARRA.borderTopColor).toBe(colors.borderSubtle);
    expect(ESTILO_DA_BARRA.borderTopWidth).toBe(1);
    expect(ESTILO_DA_BARRA.elevation).toBe(0);
  });

  it('o texto dos itens é 14, negrito (o menor texto do app)', () => {
    expect(ESTILO_DO_TEXTO_DA_BARRA.fontSize).toBe(14);
    expect(ESTILO_DO_TEXTO_DA_BARRA.fontFamily).toMatch(/700Bold/);
  });

  it('a barra é alta o bastante para a pílula de 32 + texto + respiros, e cresce com a fonte', () => {
    expect(ALTURA_DA_BARRA).toBeGreaterThanOrEqual(32 + ESTILO_DO_TEXTO_DA_BARRA.lineHeight + 16);
  });

  it('contraste: aba ativa, aba inativa e "Denunciar" (>= 4,5:1)', () => {
    expect(contrastRatio(colors.actionPressed, colors.actionTabPill)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.textSecondary, colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.action, colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.onAction, colors.action)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('IconeDaAba', () => {
  const pilula = async (focado: boolean) => {
    await render(<IconeDaAba ativo="home" inativo="home-outline" focado={focado} cor="#000000" />);
    return StyleSheet.flatten(screen.getByTestId('pilula-da-aba').props.style) as Record<
      string,
      unknown
    >;
  };

  it('ativa: ícone numa pílula de 56 × 32 com o fundo `actionTabPill`', async () => {
    const estilo = await pilula(true);

    expect(estilo.width).toBe(56);
    expect(estilo.height).toBe(32);
    expect(estilo.backgroundColor).toBe(colors.actionTabPill);
  });

  it('inativa: mesma medida, sem fundo (o ícone fica na cor de apoio)', async () => {
    const estilo = await pilula(false);

    expect(estilo.width).toBe(56);
    expect(estilo.height).toBe(32);
    expect(estilo).not.toHaveProperty('backgroundColor');
  });
});

describe('ItemDenunciarDaBarra', () => {
  it('é um item normal com o texto "Denunciar" em azul e a pílula azul cheia de 56 × 32', async () => {
    await render(<ItemDenunciarDaBarra />);

    const texto = StyleSheet.flatten(screen.getByText('Denunciar').props.style);
    expect(texto.color).toBe(colors.action);
    expect(texto.fontSize).toBe(14);
    expect(screen.getByRole('button', { name: 'Denunciar' })).toBeTruthy();
  });

  it('abre o formulário de denúncia ao tocar', async () => {
    await render(<ItemDenunciarDaBarra />);

    await fireEvent.press(screen.getByRole('button', { name: 'Denunciar' }));

    expect(mockPush).toHaveBeenCalledWith('/denunciar');
  });

  it('o alvo de toque tem pelo menos 48 dp', async () => {
    await render(<ItemDenunciarDaBarra />);
    const estilo = StyleSheet.flatten(
      (screen.getByRole('button', { name: 'Denunciar' }).props.style as never) ?? {},
    ) as Record<string, number>;

    expect(estilo.minHeight).toBeGreaterThanOrEqual(size.touchMin);
    expect(estilo.minWidth).toBeGreaterThanOrEqual(size.touchMin);
  });

  it('diz o que faz para o leitor de tela', async () => {
    await render(<ItemDenunciarDaBarra />);

    expect(screen.getByRole('button', { name: 'Denunciar' }).props.accessibilityHint).toMatch(
      /formulário/,
    );
  });
});
