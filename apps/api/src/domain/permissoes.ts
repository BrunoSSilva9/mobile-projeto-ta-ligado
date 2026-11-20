import type { Papel, StatusDenuncia, TipoDenuncia } from './tipos';

export type UsuarioAutenticado = {
  id: string;
  papel: Papel;
};

/** O usuário tem um dos papéis permitidos? (RBAC, RN-001) */
export function temPapel(usuario: UsuarioAutenticado, ...permitidos: Papel[]): boolean {
  return permitidos.includes(usuario.papel);
}

/**
 * Quem pode abrir o detalhe completo de uma denúncia (RN-014):
 * o operador (qualquer uma) e o cidadão somente a própria. Denúncia anonimizada (sem autor)
 * não pertence a nenhum cidadão.
 */
export function podeVerDenuncia(
  usuario: UsuarioAutenticado,
  denuncia: { autorId: string | null },
): boolean {
  if (usuario.papel === 'OPERADOR') return true;
  return denuncia.autorId !== null && denuncia.autorId === usuario.id;
}

/** Arredonda a coordenada para 3 casas decimais (~110 m), usada na visão pública (RN-014, S-28). */
export function arredondarCoordenada(valor: number): number {
  return Number(valor.toFixed(3));
}

/** Campos que o domínio precisa para montar a ocorrência pública. Outros campos são ignorados. */
export type DenunciaParaProjecao = {
  id: string;
  tipo: TipoDenuncia;
  status: StatusDenuncia;
  bairro: { id: number; nome: string; folha: string | null };
  logradouro: string;
  descricao: string | null;
  latitude: number | null;
  longitude: number | null;
  criadoEm: Date;
};

export type OcorrenciaPublica = {
  id: string;
  tipo: TipoDenuncia;
  status: StatusDenuncia;
  bairro: string;
  folha: string | null;
  logradouro: string;
  descricao: string | null;
  latitude: number | null;
  longitude: number | null;
  criadoEm: string;
};

/**
 * Projeção **anonimizada** de uma denúncia para os demais cidadãos (RN-014).
 *
 * Usa uma lista explícita de campos (nada de `...denuncia`), para que autor, telefone, protocolo,
 * fotos, pessoas no local, necessidade especial e coordenadas exatas nunca vazem por engano.
 */
export function projetarOcorrenciaPublica(denuncia: DenunciaParaProjecao): OcorrenciaPublica {
  return {
    id: denuncia.id,
    tipo: denuncia.tipo,
    status: denuncia.status,
    bairro: denuncia.bairro.nome,
    folha: denuncia.bairro.folha,
    logradouro: denuncia.logradouro,
    descricao: denuncia.descricao,
    latitude: denuncia.latitude === null ? null : arredondarCoordenada(denuncia.latitude),
    longitude: denuncia.longitude === null ? null : arredondarCoordenada(denuncia.longitude),
    criadoEm: denuncia.criadoEm.toISOString(),
  };
}
