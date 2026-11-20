import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { bairroMaisProximo, distanciaKm } from '../../domain';
import type { Autenticacao } from '../../shared/auth';
import { erros } from '../../shared/errors';
import { analisar } from '../../shared/validacao';
import { obterStatusDeTodosOsBairros } from './status';

type Deps = {
  prisma: PrismaClient;
  autenticacao: Autenticacao;
  /** Relógio injetável (testes), para a previsão futura (RN-009). */
  relogio?: () => Date;
};

const proximoSchema = z.object({
  lat: z.coerce
    .number({ error: 'Latitude inválida.' })
    .min(-90, 'Latitude inválida.')
    .max(90, 'Latitude inválida.'),
  lng: z.coerce
    .number({ error: 'Longitude inválida.' })
    .min(-180, 'Longitude inválida.')
    .max(180, 'Longitude inválida.'),
});

/** Bairro com as coordenadas como número (o Prisma devolve `Decimal`). */
async function listarBairros(prisma: PrismaClient) {
  const bairros = await prisma.bairro.findMany({ orderBy: [{ nome: 'asc' }, { folha: 'asc' }] });
  return bairros.map((b) => ({
    id: b.id,
    nome: b.nome,
    folha: b.folha,
    latitude: b.latitude.toNumber(),
    longitude: b.longitude.toNumber(),
  }));
}

/** Rotas de bairros: lista fixa e bairro mais próximo (RN-021, RN-025). */
export function criarRotasBairros({
  prisma,
  autenticacao,
  relogio = () => new Date(),
}: Deps): Router {
  const router = Router();

  // Lista fixa de bairros e folhas (qualquer usuário logado)
  router.get('/bairros', autenticacao.autenticar, async (_req, res) => {
    res.json({ bairros: await listarBairros(prisma) });
  });

  // RF-019, RF-023: status calculado de cada bairro (RN-007), contagem em aberto e previsão (RN-009)
  router.get(
    '/bairros/status',
    autenticacao.autenticar,
    autenticacao.exigirPapel('CIDADAO'),
    async (_req, res) => {
      const agora = relogio();
      res.json({
        atualizadoEm: agora.toISOString(),
        bairros: await obterStatusDeTodosOsBairros(prisma, agora),
      });
    },
  );

  // RF-016: bairro de centro mais próximo do GPS, até 15 km (RN-025)
  router.get(
    '/bairros/proximo',
    autenticacao.autenticar,
    autenticacao.exigirPapel('CIDADAO'),
    async (req, res) => {
      const { lat, lng } = analisar(proximoSchema, req.query);
      const ponto = { latitude: lat, longitude: lng };
      const achado = bairroMaisProximo(ponto, await listarBairros(prisma));
      if (!achado) throw erros.naoEncontrado('Nenhum bairro encontrado perto da sua localização.');
      res.json({ ...achado, distanciaKm: Math.round(distanciaKm(ponto, achado) * 100) / 100 });
    },
  );

  return router;
}
