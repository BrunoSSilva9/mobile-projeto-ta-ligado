import { Router } from 'express';

import type { Autenticacao } from '../../shared/auth';
import { erros } from '../../shared/errors';
import { analisar, validarCorpo } from '../../shared/validacao';
import { idValido } from '../denuncias/schemas';
import {
  atualizarPrevisaoSchema,
  atualizarStatusSchema,
  bairroIdSchema,
  filtrosDoPainelSchema,
  resolverBairroSchema,
} from './schemas';
import type { ServicoPainel } from './service';

type Deps = {
  servico: ServicoPainel;
  autenticacao: Autenticacao;
};

/** Rotas do painel da operadora, em `/painel`. Só o papel OPERADOR entra (RN-001, RF-026). */
export function criarRotasPainel({ servico, autenticacao }: Deps): Router {
  const router = Router();

  router.use('/painel', autenticacao.autenticar, autenticacao.exigirPapel('OPERADOR'));

  // RF-028, RF-029, RF-035
  router.get('/painel/denuncias', async (req, res) => {
    res.json(await servico.listar(analisar(filtrosDoPainelSchema, req.query)));
  });

  // RF-030
  router.get('/painel/denuncias/:id', async (req, res) => {
    const id = String(req.params.id);
    if (!idValido(id)) throw erros.naoEncontrado('Denúncia não encontrada.');
    res.json(await servico.detalhe(id));
  });

  // RF-031, RF-032, RF-033, RF-036
  router.patch(
    '/painel/denuncias/:id/status',
    validarCorpo(atualizarStatusSchema),
    async (req, res) => {
      const id = String(req.params.id);
      if (!idValido(id)) throw erros.naoEncontrado('Denúncia não encontrada.');
      res.json(await servico.atualizarStatus({ id: req.usuario!.id }, id, req.body));
    },
  );

  // RF-033, S-60: define, troca ou remove só a previsão de reparo (denúncia em aberto)
  router.patch(
    '/painel/denuncias/:id/previsao',
    validarCorpo(atualizarPrevisaoSchema),
    async (req, res) => {
      const id = String(req.params.id);
      if (!idValido(id)) throw erros.naoEncontrado('Denúncia não encontrada.');
      res.json(await servico.atualizarPrevisao({ id: req.usuario!.id }, id, req.body));
    },
  );

  // RF-034: visão agrupada por bairro (só denúncias em aberto)
  router.get('/painel/bairros', async (_req, res) => {
    res.json(await servico.listarPorBairro());
  });

  // RF-034, RN-016: resolve em lote todas as denúncias em aberto do bairro (exige confirmacao: true)
  router.post(
    '/painel/bairros/:bairroId/resolver',
    validarCorpo(resolverBairroSchema),
    async (req, res) => {
      const bairroId = analisar(bairroIdSchema, req.params.bairroId);
      res.json(await servico.resolverBairro({ id: req.usuario!.id }, bairroId));
    },
  );

  return router;
}
