/**
 * Gera `foto-com-gps.jpg`, a foto de exemplo dos testes de remoção de metadados (S-57).
 * Rode `npx tsx tests/fixtures/gerar-foto-com-gps.ts` (em `apps/api`) se precisar refazê-la.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { jpegComGps } from './construir-foto';

writeFileSync(join(__dirname, 'foto-com-gps.jpg'), jpegComGps());
console.log('foto-com-gps.jpg gerada');
