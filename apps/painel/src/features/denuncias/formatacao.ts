/** "há 5 min", "há 2 h", "há 3 dias". Futuro ou data inválida: "agora". */
export function tempoDesde(iso: string, agoraMs: number = Date.now()): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const minutos = Math.floor((agoraMs - ms) / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

const DOIS = (n: number) => String(n).padStart(2, '0');

/** "19/11/2026 14:05" no horário de Marabá (UTC−3, sem horário de verão). */
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms - 3 * 60 * 60 * 1000);
  return `${DOIS(d.getUTCDate())}/${DOIS(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${DOIS(d.getUTCHours())}:${DOIS(d.getUTCMinutes())}`;
}
