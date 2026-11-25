import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { BotaoLigar } from '@/components/BotaoLigar';
import { CONTATOS, telefoneParaUrl } from '@/config/constants';

const abrir = jest.spyOn(Linking, 'openURL');
const podeAbrir = jest.spyOn(Linking, 'canOpenURL');

beforeEach(() => {
  abrir.mockReset().mockResolvedValue(undefined as never);
  podeAbrir.mockReset().mockResolvedValue(true);
});

describe('telefoneParaUrl', () => {
  it.each([
    ['0000 000 0000', 'tel:00000000000'],
    ['(94) 3322-1111', 'tel:9433221111'],
    ['193', 'tel:193'],
  ])('%s → %s', (numero, url) => {
    expect(telefoneParaUrl(numero)).toBe(url);
  });

  it('o número dos Bombeiros é o real (193); os da Equatorial seguem placeholders (PEN-02)', () => {
    expect(CONTATOS.bombeirosTelefone).toBe('193');
    expect(CONTATOS.concessionariaTelefone).toBe('0000 000 0000');
  });
});

describe('BotaoLigar', () => {
  it('tem o texto "Ligar para a Equatorial" (ícone e texto) e abre o discador com o número', async () => {
    await render(<BotaoLigar />);

    expect(screen.getByText('Ligar para a Equatorial')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para a Equatorial' }));

    await waitFor(() => expect(abrir).toHaveBeenCalledWith('tel:00000000000'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('aceita outro texto e outro número', async () => {
    await render(<BotaoLigar titulo="Ligar para os Bombeiros" numero="193" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para os Bombeiros' }));

    await waitFor(() => expect(abrir).toHaveBeenCalledWith('tel:193'));
  });

  it('aparelho sem suporte a chamadas: não tenta abrir e mostra uma mensagem clara com o número', async () => {
    podeAbrir.mockResolvedValue(false);
    await render(<BotaoLigar />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para a Equatorial' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/Este aparelho não conseguiu abrir o telefone/);
    expect(alerta).toHaveTextContent(/0000 000 0000/);
    expect(abrir).not.toHaveBeenCalled();
  });

  it('erro ao abrir o discador: mostra a mesma mensagem', async () => {
    abrir.mockRejectedValue(new Error('falhou'));
    await render(<BotaoLigar />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para a Equatorial' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/não conseguiu abrir o telefone/);
  });

  it('a mensagem some na próxima tentativa que dá certo', async () => {
    podeAbrir.mockResolvedValueOnce(false);
    await render(<BotaoLigar />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para a Equatorial' }));
    await screen.findByRole('alert');

    await fireEvent.press(screen.getByRole('button', { name: 'Ligar para a Equatorial' }));

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(abrir).toHaveBeenCalledTimes(1);
  });
});
