import { API_URL, APP, CONTATOS } from '@/config/constants';

describe('constantes e placeholders (PEN-02)', () => {
  it('os telefones continuam como placeholders até haver números oficiais', () => {
    expect(CONTATOS.ouvidoriaTelefone).toBe('(00) 0000-0000');
    expect(CONTATOS.concessionariaTelefone).toBe('0000 000 0000');
  });

  it('o produto se chama "Tá Ligado?" e atende Marabá-PA', () => {
    expect(APP.nome).toBe('Tá Ligado?');
    expect(APP.cidade).toBe('Marabá');
    expect(APP.uf).toBe('PA');
  });

  it('a URL da API tem valor padrão para desenvolvimento', () => {
    expect(API_URL).toMatch(/^https?:\/\//);
  });
});
