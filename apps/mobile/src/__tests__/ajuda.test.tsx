import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import AjudaScreen from '@/app/(app)/ajuda';
import { renderizarTela } from '@/testing/ajudas';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    back: () => mockBack(),
    canGoBack: () => true,
    replace: jest.fn(),
  },
}));

const abrir = jest.spyOn(Linking, 'openURL');
const podeAbrir = jest.spyOn(Linking, 'canOpenURL');

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  abrir.mockReset().mockResolvedValue(undefined as never);
  podeAbrir.mockReset().mockResolvedValue(true);
});

describe('Ajuda (rota /ajuda)', () => {
  it('tem o título "Ajuda" e o "Voltar" com texto', async () => {
    await renderizarTela(<AjudaScreen />);

    expect(screen.getByRole('header', { name: 'Ajuda' })).toBeTruthy();
    expect(screen.getByText('Voltar')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('mostra "Como funciona" com os mesmos 3 passos da Início', async () => {
    await renderizarTela(<AjudaScreen />);

    expect(screen.getByRole('header', { name: 'Como funciona' })).toBeTruthy();
    expect(screen.getByText('Você avisa que a energia caiu.')).toBeTruthy();
    expect(screen.getByText('A Equatorial recebe o aviso na hora.')).toBeTruthy();
    expect(screen.getByText('Você acompanha aqui até a energia voltar.')).toBeTruthy();
  });

  it('mostra o aviso de segurança com o 193, sem ser anunciado como alerta ao abrir', async () => {
    await renderizarTela(<AjudaScreen />);

    expect(screen.getByText(/Fio caído ou risco de choque\?/)).toBeTruthy();
    expect(screen.getByText(/Ligue para os Bombeiros: 193/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra os contatos (exemplos) e o botão "Ligar para a Equatorial"', async () => {
    await renderizarTela(<AjudaScreen />);

    expect(screen.getByText(/Central: Segunda a Sexta/)).toBeTruthy();
    expect(screen.getByText(/Ouvidoria: \(00\) 0000-0000/)).toBeTruthy();
    expect(screen.getByText(/Equatorial: 0000 000 0000/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para a Equatorial' }));
    expect(abrir).toHaveBeenCalledWith('tel:00000000000');
  });

  it('se o aparelho não puder ligar, explica', async () => {
    podeAbrir.mockResolvedValue(false);
    await renderizarTela(<AjudaScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para a Equatorial' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/não conseguiu abrir o telefone/);
  });

  it('tem links, com texto, para os Termos de Uso e a Política de Privacidade', async () => {
    await renderizarTela(<AjudaScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Termos de Uso' }));
    expect(mockPush).toHaveBeenLastCalledWith('/termos');

    await fireEvent.press(screen.getByRole('button', { name: 'Política de Privacidade' }));
    expect(mockPush).toHaveBeenLastCalledWith('/privacidade');
  });
});
