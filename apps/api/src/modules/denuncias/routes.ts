import { Router, type RequestHandler } from 'express';
import multer from 'multer';

import { LIMITE_DE_FOTOS, TAMANHO_MAXIMO_DA_FOTO } from '../../domain';

import type { Autenticacao } from '../../shared/auth';
import { erros } from '../../shared/errors';
import { analisar, validarCorpo } from '../../shared/validacao';
import {
  criarDenunciaSchema,
  idValido,
  minhasDenunciasSchema,
  normalizarCamposDoMultipart,
} from './schemas';
import type { ServicoDenuncias } from './service';

type Deps = {
  servico: ServicoDenuncias;
  autenticacao: Autenticacao;
};

/**
 * Recebe o `multipart/form-data` do envio com fotos (decisão S-58): arquivos **em memória** (nada
 * vai para o disco antes de validar), no campo `fotos`, com os limites de RN-013. Pede um arquivo a
 * mais que o limite para a 4ª foto cair na regra de domínio (`LIMITE_FOTOS`); a 5ª já é barrada aqui.
 */
const receberArquivos = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: LIMITE_DE_FOTOS + 1,
    fileSize: TAMANHO_MAXIMO_DA_FOTO,
    fields: 30,
    fieldSize: 16 * 1024,
    parts: 40,
  },
}).array('fotos');

/** Só mexe na requisição quando ela é `multipart`; o JSON segue como sempre foi. */
const receberFotos: RequestHandler = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    next();
    return;
  }
  receberArquivos(req, res, (erro?: unknown) => {
    if (!erro) {
      req.body = normalizarCamposDoMultipart(req.body);
      next();
      return;
    }
    if (erro instanceof multer.MulterError) {
      if (erro.code === 'LIMIT_FILE_COUNT') {
        next(erros.limiteFotos(`Envie no máximo ${LIMITE_DE_FOTOS} fotos.`));
        return;
      }
      if (erro.code === 'LIMIT_FILE_SIZE') {
        next(erros.arquivoInvalido(413, 'Cada foto pode ter no máximo 5 MB.'));
        return;
      }
      next(erros.validacao([{ campo: 'fotos', mensagem: 'Envie as fotos no campo "fotos".' }]));
      return;
    }
    next(erro);
  });
};

/** Rotas de denúncias do cidadão (docs/10-api.md). Os operadores usam as rotas de `/painel`. */
export function criarRotasDenuncias({ servico, autenticacao }: Deps): Router {
  const router = Router();
  const soCidadao: RequestHandler[] = [
    autenticacao.autenticar,
    autenticacao.exigirPapel('CIDADAO'),
  ];

  // RF-007, RF-011, RF-012
  router.post(
    '/denuncias',
    ...soCidadao,
    receberFotos,
    validarCorpo(criarDenunciaSchema),
    async (req, res) => {
      const { id, nome, telefone } = req.usuario!;
      const arquivos = (req.files as Express.Multer.File[] | undefined) ?? [];
      const fotos = arquivos.map((a) => ({ bytes: a.buffer, tamanhoBytes: a.size }));
      res.status(201).json(await servico.criar({ id, nome, telefone }, req.body, fotos));
    },
  );

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

  // RNF-015, RN-014: a foto só sai por aqui, para o autor e para o operador (qualquer outro: 404).
  router.get('/denuncias/:id/fotos/:fotoId', autenticacao.autenticar, async (req, res) => {
    const id = String(req.params.id);
    const fotoId = String(req.params.fotoId);
    if (!idValido(id) || !idValido(fotoId)) throw erros.naoEncontrado('Foto não encontrada.');
    const { bytes, mimeType } = await servico.foto(req.usuario!, id, fotoId);
    res
      .status(200)
      .set({
        'Content-Type': mimeType,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(bytes);
  });

  return router;
}
