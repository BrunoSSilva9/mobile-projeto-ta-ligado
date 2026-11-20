const DOIS = (n: number) => String(n).padStart(2, '0');

/** Marabá usa o horário de Belém (UTC−3, sem horário de verão). */
const DESLOCAMENTO_MS = -3 * 60 * 60 * 1000;

/**
 * "19/11/2026 às 14:05", sempre no horário de Marabá, qualquer que seja o fuso do aparelho.
 * Feito à mão (sem `Intl`) para o texto ser igual em todos os aparelhos e nos testes.
 */
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms + DESLOCAMENTO_MS);
  return `${DOIS(d.getUTCDate())}/${DOIS(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} às ${DOIS(d.getUTCHours())}:${DOIS(d.getUTCMinutes())}`;
}

/** "19/11/2026" no horário de Marabá. */
export function formatarData(iso: string | null | undefined): string {
  return formatarDataHora(iso).split(' às ')[0] ?? '';
}

/** "Há 5 min", "Há 2 h", "Há 3 dias"; no futuro ou com data inválida, "Agora". */
export function tempoDesde(iso: string | null | undefined, agoraMs: number = Date.now()): string {
  const ms = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(ms)) return '';
  const minutos = Math.floor((agoraMs - ms) / 60_000);
  if (minutos < 1) return 'Agora';
  if (minutos < 60) return `Há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}
