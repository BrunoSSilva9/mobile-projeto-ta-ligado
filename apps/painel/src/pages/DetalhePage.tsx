import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  acoesDoOperador,
  erroDaJustificativa,
  JUSTIFICATIVA_MAX,
  previsaoParaIso,
} from '../features/denuncias/acoes';
import { EditorDePrevisao } from '../components/EditorDePrevisao';
import { GaleriaDeFotos } from '../components/GaleriaDeFotos';
import {
  atualizarPrevisao,
  atualizarStatus,
  obterDetalhe,
  type MudancaDeStatus,
} from '../features/denuncias/api';
import { CHAVE_LISTAS, chaveDoDetalhe } from '../features/denuncias/cache';
import { formatarDataHora } from '../features/denuncias/formatacao';
import {
  nomeDoBairro,
  rotuloDoStatus,
  rotuloDoTipo,
  statusEmAberto,
  textoDaNecessidade,
  tituloDoHistorico,
  type DetalheDoPainel,
} from '../features/denuncias/tipos';
import { ErroDeApi } from '../services/http';

const FAIXAS: Record<string, string> = {
  ATE_3: '1 a 3 pessoas',
  DE_4_A_8: '4 a 8 pessoas',
  DE_9_A_20: '9 a 20 pessoas',
  RUA_TODA: 'Rua toda',
};

/** P-03: detalhe e atualização de status (RF-030 a RF-033, RF-036). */
export function DetalhePage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const consulta = useQuery({ queryKey: chaveDoDetalhe(id), queryFn: () => obterDetalhe(id) });

  const mudar = useMutation({
    mutationFn: (mudanca: MudancaDeStatus) => atualizarStatus(id, mudanca),
    onSuccess: (detalhe) => {
      queryClient.setQueryData(chaveDoDetalhe(id), detalhe);
      void queryClient.invalidateQueries({ queryKey: CHAVE_LISTAS });
    },
    onError: (erro) => {
      // Alguém (ou o cidadão) mudou o status antes: mostra a situação atual.
      if (erro instanceof ErroDeApi && erro.codigo === 'TRANSICAO_INVALIDA') {
        void queryClient.invalidateQueries({ queryKey: chaveDoDetalhe(id) });
      }
    },
  });

  const mudarPrevisao = useMutation({
    mutationFn: (previsaoReparo: string | null) => atualizarPrevisao(id, previsaoReparo),
    onSuccess: (detalhe) => {
      queryClient.setQueryData(chaveDoDetalhe(id), detalhe);
      void queryClient.invalidateQueries({ queryKey: CHAVE_LISTAS });
    },
    onError: (erro) => {
      // O status mudou antes (ex.: o cidadão cancelou): mostra a situação atual.
      if (erro instanceof ErroDeApi && erro.codigo === 'TRANSICAO_INVALIDA') {
        void queryClient.invalidateQueries({ queryKey: chaveDoDetalhe(id) });
      }
    },
  });

  const d = consulta.data;

  return (
    <main className="painel">
      <p>
        <Link to="/">← Voltar à lista</Link>
      </p>

      {!d && consulta.isPending ? (
        <p className="estado" role="status">
          Carregando a denúncia…
        </p>
      ) : !d && consulta.error instanceof ErroDeApi && consulta.error.status === 404 ? (
        <p className="estado" role="alert">
          Denúncia não encontrada.
        </p>
      ) : !d ? (
        <div className="estado" role="alert">
          <p>{consulta.error?.message ?? 'Não foi possível carregar a denúncia.'}</p>
          <button
            type="button"
            className="botao botao--primario"
            onClick={() => void consulta.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <Conteudo
          d={d}
          salvando={mudar.isPending}
          erro={mudar.isError ? mudar.error : null}
          onMudar={(m) => {
            mudar.reset();
            mudar.mutate(m);
          }}
          salvandoPrevisao={mudarPrevisao.isPending}
          erroDaPrevisao={mudarPrevisao.isError ? mudarPrevisao.error : null}
          onSalvarPrevisao={(previsao) => {
            mudarPrevisao.reset();
            mudarPrevisao.mutate(previsao);
          }}
        />
      )}
    </main>
  );
}

function Conteudo({
  d,
  salvando,
  erro,
  onMudar,
  salvandoPrevisao,
  erroDaPrevisao,
  onSalvarPrevisao,
}: {
  d: DetalheDoPainel;
  salvando: boolean;
  erro: Error | null;
  onMudar: (mudanca: MudancaDeStatus) => void;
  salvandoPrevisao: boolean;
  erroDaPrevisao: Error | null;
  onSalvarPrevisao: (previsaoReparo: string | null) => void;
}) {
  const acoes = acoesDoOperador(d.status);
  const aberta = statusEmAberto(d.status);

  return (
    <>
      <header className="detalhe__topo">
        <h1>{d.protocolo}</h1>
        <span className={`selo selo--${d.status.toLowerCase()}`}>{rotuloDoStatus(d.status)}</span>
        {d.prioritaria ? <span className="selo selo--prioridade">Prioritária</span> : null}
      </header>

      <div className="detalhe__blocos">
        <section className="card" aria-labelledby="bloco-autor">
          <h2 id="bloco-autor">Autor</h2>
          <dl className="dados">
            {d.autor ? (
              <>
                <dt>Nome</dt>
                <dd>{d.autor.nome}</dd>
                <dt>Telefone</dt>
                <dd>{d.autor.telefone ?? 'Não informado'}</dd>
              </>
            ) : (
              // A conta foi excluída (S-50): a denúncia continua, mas sem nome nem contato.
              <>
                <dt>Conta</dt>
                <dd>Conta excluída</dd>
                <dt>Contato</dt>
                <dd>Sem contato: a pessoa excluiu a conta</dd>
              </>
            )}
          </dl>
        </section>

        <section className="card" aria-labelledby="bloco-local">
          <h2 id="bloco-local">Local</h2>
          <dl className="dados">
            <dt>Logradouro</dt>
            <dd>{d.logradouro}</dd>
            <dt>Bairro</dt>
            <dd>{nomeDoBairro(d.bairro)}</dd>
            {d.cep ? (
              <>
                <dt>CEP</dt>
                <dd>{d.cep}</dd>
              </>
            ) : null}
            {d.pontoReferencia ? (
              <>
                <dt>Ponto de referência</dt>
                <dd>{d.pontoReferencia}</dd>
              </>
            ) : null}
            <dt>Coordenadas</dt>
            <dd>
              {d.latitude !== null && d.longitude !== null
                ? `${d.latitude.toFixed(5)}, ${d.longitude.toFixed(5)}`
                : 'Sem coordenadas (GPS não usado)'}
            </dd>
          </dl>
        </section>

        <section className="card" aria-labelledby="bloco-ocorrencia">
          <h2 id="bloco-ocorrencia">Ocorrência</h2>
          <dl className="dados">
            <dt>Tipo</dt>
            <dd>{rotuloDoTipo(d.tipo)}</dd>
            <dt>Enviada em</dt>
            <dd>{formatarDataHora(d.criadoEm)}</dd>
            {d.descricao ? (
              <>
                <dt>Descrição</dt>
                <dd>{d.descricao}</dd>
              </>
            ) : null}
            {d.faixaPessoas ? (
              <>
                <dt>Pessoas no local</dt>
                <dd>{FAIXAS[d.faixaPessoas] ?? d.faixaPessoas}</dd>
              </>
            ) : null}
            <dt>Necessidade especial</dt>
            <dd>{textoDaNecessidade(d, formatarDataHora)}</dd>
            {aberta && d.previsaoReparo ? (
              <>
                <dt>Previsão de reparo</dt>
                <dd>{formatarDataHora(d.previsaoReparo)}</dd>
              </>
            ) : null}
            {d.status === 'IMPROCEDENTE' && d.justificativa ? (
              <>
                <dt>Justificativa</dt>
                <dd>{d.justificativa}</dd>
              </>
            ) : null}
          </dl>
        </section>

        {d.fotos.length > 0 ? (
          <section className="card" aria-labelledby="bloco-fotos">
            <h2 id="bloco-fotos">Fotos ({d.fotos.length})</h2>
            <GaleriaDeFotos fotos={d.fotos} />
          </section>
        ) : null}

        <section className="card" aria-labelledby="bloco-acoes">
          <h2 id="bloco-acoes">Atualizar status</h2>
          {acoes.length === 0 ? (
            <p className="muted">
              Esta denúncia está {rotuloDoStatus(d.status).toLowerCase()} e não pode mais mudar de
              status.
            </p>
          ) : (
            <Acoes key={d.status} acoes={acoes} salvando={salvando} erro={erro} onMudar={onMudar} />
          )}
        </section>

        {aberta ? (
          <section className="card" aria-labelledby="bloco-previsao">
            <h2 id="bloco-previsao">Previsão de reparo</h2>
            <EditorDePrevisao
              // Recarrega o campo quando a previsão muda (salvou, removeu ou chegou por evento).
              key={d.previsaoReparo ?? 'sem-previsao'}
              previsao={d.previsaoReparo}
              salvando={salvandoPrevisao}
              erro={erroDaPrevisao}
              onSalvar={onSalvarPrevisao}
            />
          </section>
        ) : null}

        <section className="card" aria-labelledby="bloco-historico">
          <h2 id="bloco-historico">Histórico</h2>
          <ol className="historico">
            {d.historico.map((h, indice) => (
              <li key={`${h.evento ?? 'STATUS'}-${h.statusNovo}-${h.criadoEm}-${indice}`}>
                <strong>{tituloDoHistorico(h, formatarDataHora)}</strong>
                <span className="muted">
                  {' '}
                  · {h.por} · {formatarDataHora(h.criadoEm)}
                </span>
                {/* A previsão informada junto com a mudança de status (ex.: "Iniciar atendimento"). */}
                {h.evento !== 'PREVISAO' && h.previsaoReparo ? (
                  <p className="historico__just">
                    Previsão de reparo: {formatarDataHora(h.previsaoReparo)}
                  </p>
                ) : null}
                {h.justificativa ? <p className="historico__just">{h.justificativa}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}

function Acoes({
  acoes,
  salvando,
  erro,
  onMudar,
}: {
  acoes: readonly string[];
  salvando: boolean;
  erro: Error | null;
  onMudar: (mudanca: MudancaDeStatus) => void;
}) {
  const [recusando, setRecusando] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [previsao, setPrevisao] = useState('');
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  const iniciar = () => {
    const iso = previsaoParaIso(previsao);
    if (iso === 'passado') return setErroLocal('A previsão de reparo precisa ser uma data futura.');
    if (iso === 'invalida') return setErroLocal('Informe a previsão como data e hora.');
    setErroLocal(null);
    onMudar({ status: 'EM_ATENDIMENTO', ...(iso ? { previsaoReparo: iso } : {}) });
  };

  const confirmarImprocedencia = (e: FormEvent) => {
    e.preventDefault();
    const problema = erroDaJustificativa(justificativa);
    if (problema) return setErroLocal(problema);
    setErroLocal(null);
    onMudar({ status: 'IMPROCEDENTE', justificativa: justificativa.trim() });
  };

  const mensagem =
    erroLocal ??
    (erro instanceof ErroDeApi && erro.codigo === 'TRANSICAO_INVALIDA'
      ? 'O status mudou enquanto você decidia. A tela foi atualizada: confira a situação atual.'
      : (erro?.message ?? null));

  return (
    <div className="acoes">
      {acoes.includes('EM_ATENDIMENTO') ? (
        <div className="campo">
          <label htmlFor="previsao">Previsão de reparo (opcional)</label>
          <input
            id="previsao"
            type="datetime-local"
            value={previsao}
            onChange={(e) => setPrevisao(e.target.value)}
          />
        </div>
      ) : null}

      {!recusando ? (
        <div className="acoes__botoes">
          {acoes.includes('EM_ATENDIMENTO') ? (
            <button
              type="button"
              className="botao botao--primario"
              disabled={salvando}
              onClick={iniciar}
            >
              Iniciar atendimento
            </button>
          ) : null}
          {acoes.includes('RESOLVIDA') ? (
            <button
              type="button"
              className="botao botao--primario"
              disabled={salvando}
              onClick={() => onMudar({ status: 'RESOLVIDA' })}
            >
              Resolver
            </button>
          ) : null}
          <button
            type="button"
            className="botao botao--perigo"
            disabled={salvando}
            onClick={() => setRecusando(true)}
          >
            Improcedente
          </button>
        </div>
      ) : (
        <form className="acoes__recusa" onSubmit={confirmarImprocedencia} noValidate>
          <div className="campo">
            <label htmlFor="justificativa">Justificativa (obrigatória)</label>
            <textarea
              id="justificativa"
              rows={4}
              maxLength={JUSTIFICATIVA_MAX}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              aria-invalid={erroLocal !== null}
            />
          </div>
          <div className="acoes__botoes">
            <button type="submit" className="botao botao--perigo" disabled={salvando}>
              Confirmar improcedência
            </button>
            <button
              type="button"
              className="botao botao--secundario"
              disabled={salvando}
              onClick={() => {
                setRecusando(false);
                setErroLocal(null);
              }}
            >
              Voltar
            </button>
          </div>
        </form>
      )}

      {salvando ? (
        <p className="muted" role="status">
          Salvando…
        </p>
      ) : null}
      {mensagem ? (
        <p role="alert" className="login__erro">
          {mensagem}
        </p>
      ) : null}
    </div>
  );
}
