import { Router, type RequestHandler } from 'express';

import type { Autenticacao } from '../../shared/auth';
import { erros } from '../../shared/errors';
import { analisar, validarCorpo } from '../../shared/validacao';
import { criarDenunciaSchema, idValido, minhasDenunciasSchema } from './schemas';
import type { ServicoDenuncias } from './service';

type Deps = {
  servico: ServicoDenuncias;
  autenticacao: Autenticacao;
};

/** Rotas de denúncias do cidadão (docs/10-api.md). Os operadores usam as rotas de `/painel`. */
export function criarRotasDenuncias({ servico, autenticacao }: Deps): Router {
  const router = Router();
  const soCidadao: RequestHandler[] = [
    autenticacao.autenticar,
    autenticacao.exigirPapel('CIDADAO'),
  ];

  // RF-007, RF-011, RF-012
  router.post('/denuncias', ...soCidadao, validarCorpo(criarDenunciaSchema), async (req, res) => {
    const { id, nome, telefone } = req.usuario!;
    res.status(201).json(await servico.criar({ id, nome, telefone }, req.body));
  });

  // RF-013 (definida antes de `/denuncias/:id` para "minhas" não ser lido como um id)
  router.get('/denuncias/minhas', ...soCidadao, async (req, res) => {
    const consulta = analisar(minhasDenunciasSchema, req.query);
    res.json(await servico.minhas(req.usuario!.id, consulta));
  });

  // RF-014, RF-036
  router.get('/denuncias/:id', ...soCidadao, async (req, res) => {
    const id = String(req.params.id);
    if (!idValido(id)) throw erros.naoEncontrado('Denúncia não encontrada.');
    res.json(await servico.detalhe(req.usuario!, id));
  });

  // RF-015, RN-005: o autor cancela enquanto a denúncia está RECEBIDA.
  router.post('/denuncias/:id/cancelar', ...soCidadao, async (req, res) => {
    const id = String(req.params.id);
    if (!idValido(id)) throw erros.naoEncontrado('Denúncia não encontrada.');
    res.json(await servico.cancelar(req.usuario!, id));
  });

  return router;
}
