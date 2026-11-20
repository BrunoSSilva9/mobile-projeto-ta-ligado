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
  mockParams = { id: 'd1', protocolo: 'TL-2026-000001' };
});

describe('T-06 Denúncia enviada (RF-012)', () => {
  it('mostra a confirmação e o protocolo', async () => {
    await renderizarTela(<SucessoScreen />);

    expect(screen.getByText('Denúncia enviada!')).toBeTruthy();
    expect(screen.getByText('TL-2026-000001')).toBeTruthy();
    expect(screen.getByLabelText('Protocolo TL-2026-000001')).toBeTruthy();
  });

  it('copia o protocolo e confirma', async () => {
    await renderizarTela(<SucessoScreen />);

    await tocar('Copiar protocolo');

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('TL-2026-000001');
    expect(await screen.findByRole('button', { name: 'Protocolo copiado' })).toBeTruthy();
  });

  it('"Acompanhar denúncia" abre o detalhe (T-07)', async () => {
    await renderizarTela(<SucessoScreen />);

    await tocar('Acompanhar denúncia');

    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/denuncia/[id]', params: { id: 'd1' } });
  });

  it('"Voltar ao início" vai para o início', async () => {
    await renderizarTela(<SucessoScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar ao início' }));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('sem parâmetros (link quebrado), não mostra protocolo nem o botão de acompanhar', async () => {
    mockParams = {};
    await renderizarTela(<SucessoScreen />);

    expect(screen.queryByText('PROTOCOLO')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Acompanhar denúncia' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeTruthy();
  });
});
