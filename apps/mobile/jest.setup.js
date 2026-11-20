/* eslint-disable @typescript-eslint/no-require-imports */
// Mocks globais dos módulos nativos que o Jest não tem.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mapa: componentes simples que repassam as props, para os testes lerem e dispararem eventos.
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = (props) => React.createElement(View, { testID: 'mapa', ...props });
  const Marker = (props) =>
    React.createElement(View, {
      testID: 'pino',
      accessibilityLabel: JSON.stringify(props.coordinate),
      ...props,
    });
  return { __esModule: true, default: MapView, Marker };
});
