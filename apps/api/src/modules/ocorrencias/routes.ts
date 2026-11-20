import { Router } from 'express';

import type { Autenticacao } from '../../shared/auth';
import { analisar } from '../../shared/validacao';
import { consultaDeOcorrenciasSchema } from './schemas';
import type { ServicoOcorrencias } from './service';

type Deps = { servico: ServicoOcorrencias; autenticacao: Autenticacao };

/** Lista pública anonimizada de ocorrências, só para cidadãos (RF-019 a RF-021, RN-014). */
export function criarRotasOcorrencias({ servico, autenticacao }: Deps): Router {
  const router = Router();

  router.get(
    '/ocorrencias',
    autenticacao.autenticar,
    autenticacao.exigirPapel('CIDADAO'),
    async (req, res) => {
      res.json(await servico.listar(analisar(consultaDeOcorrenciasSchema, req.query)));
    },
  );

  return router;
}
