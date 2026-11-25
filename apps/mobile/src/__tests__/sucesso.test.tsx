import { fireEvent, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';

import SucessoScreen from '@/app/(app)/denuncia/sucesso';
import { renderizarTela, tocar } from '@/testing/ajudas';

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {
    id: 'd1',
    protocolo: 'TL-2026-000001',
    logradouro: 'Rua das Flores, 10',
    bairro: 'Nova Marabá (Folha 28)',
  };
});

describe('T-06 Denúncia enviada (RF-012)', () => {
  it('mostra a confirmação, o texto de apoio e o número da denúncia', async () => {
    await renderizarTela(<SucessoScreen />);

    expect(screen.getByRole('header', { name: 'Denúncia enviada!' })).toBeTruthy();
    expect(
      screen.getByText(
        'A Equatorial já recebeu seu aviso. Vamos te avisar aqui quando a equipe estiver a caminho.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Número da denúncia')).toBeTruthy();
    expect(screen.getByText('TL-2026-000001')).toBeTruthy();
    expect(screen.getByLabelText('Protocolo TL-2026-000001')).toBeTruthy();
  });

  it('mostra o selo "Recebida" (ícone e texto) e o local', async () => {
    await renderizarTela(<SucessoScreen />);

    expect(screen.getByLabelText('Status: Recebida')).toBeTruthy();
    expect(screen.getByText('Rua das Flores, 10, Nova Marabá (Folha 28)')).toBeTruthy();
  });

  it('sem o local na rota, mostra só o número e o selo', async () => {
    mockParams = { id: 'd1', protocolo: 'TL-2026-000001' };
    await renderizarTela(<SucessoScreen />);

    expect(screen.getByText('TL-2026-000001')).toBeTruthy();
    expect(screen.getByLabelText('Status: Recebida')).toBeTruthy();
    expect(screen.queryByText(/Rua das Flores/)).toBeNull();
  });

  it('não usa maiúsculas nem o texto antigo', async () => {
    await renderizarTela(<SucessoScreen />);

    expect(screen.queryByText('PROTOCOLO')).toBeNull();
    expect(screen.queryByText(/A operadora já recebeu/)).toBeNull();
  });

  it('copia o protocolo e confirma', async () => {
    await renderizarTela(<SucessoScreen />);

    await tocar('Copiar protocolo');

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('TL-2026-000001');
    expect(await screen.findByRole('button', { name: 'Protocolo copiado' })).toBeTruthy();
  });

  it('"Acompanhar minha denúncia" abre o detalhe (T-07)', async () => {
    await renderizarTela(<SucessoScreen />);

    await tocar('Acompanhar minha denúncia');

    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/denuncia/[id]', params: { id: 'd1' } });
  });

  it('"Voltar ao início" vai para o início', async () => {
    await renderizarTela(<SucessoScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar ao início' }));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('sem parâmetros (link quebrado), não mostra número nem o botão de acompanhar', async () => {
    mockParams = {};
    await renderizarTela(<SucessoScreen />);

    expect(screen.queryByText('Número da denúncia')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Acompanhar minha denúncia' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeTruthy();
  });
});
