import { useLocalSearchParams } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

/** T-07 (Passo 8): o detalhe real chega com o acompanhamento. */
export default function DetalheDaDenunciaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ScreenPlaceholder
      id="T-07"
      title="Detalhe da denúncia"
      description={`Acompanhamento da denúncia ${id ?? ''} (status, linha do tempo e cancelamento).`}
    />
  );
}
