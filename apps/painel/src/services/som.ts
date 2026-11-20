/** Alerta sonoro da nova denúncia, gerado pelo navegador (sem arquivo de áudio). */

/**
 * Cria o `AudioContext`. Os navegadores só permitem áudio depois de um gesto do usuário, então isto
 * deve ser chamado de dentro do clique em "Ativar som" (decisão S-19).
 */
export function criarContextoDeAudio(): AudioContext | null {
  const Construtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Construtor) return null;
  try {
    return new Construtor();
  } catch {
    return null;
  }
}

/** Dois toques curtos ("ding-dong"). Nunca lança: o alerta visual continua valendo. */
export function tocarAlerta(contexto: AudioContext): void {
  try {
    if (contexto.state === 'suspended') void contexto.resume();
    const inicio = contexto.currentTime;
    [
      { frequencia: 880, atraso: 0 },
      { frequencia: 660, atraso: 0.22 },
    ].forEach(({ frequencia, atraso }) => {
      const oscilador = contexto.createOscillator();
      const ganho = contexto.createGain();
      oscilador.type = 'sine';
      oscilador.frequency.value = frequencia;
      ganho.gain.setValueAtTime(0.0001, inicio + atraso);
      ganho.gain.exponentialRampToValueAtTime(0.25, inicio + atraso + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + atraso + 0.2);
      oscilador.connect(ganho).connect(contexto.destination);
      oscilador.start(inicio + atraso);
      oscilador.stop(inicio + atraso + 0.22);
    });
  } catch {
    // Sem som: o alerta visual e a região aria-live continuam.
  }
}
