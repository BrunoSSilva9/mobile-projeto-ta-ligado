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

// Socket.IO: cliente falso e controlável. Os testes pegam os sockets criados com
// `jest.requireMock('socket.io-client').__sockets` e disparam eventos com `__emitir`.
jest.mock('socket.io-client', () => {
  const sockets = [];
  const io = (url, opcoes) => {
    const ouvintes = {};
    const socket = {
      url,
      opcoes,
      connected: false,
      on(evento, fn) {
        (ouvintes[evento] ??= []).push(fn);
        return socket;
      },
      removeAllListeners() {
        for (const k of Object.keys(ouvintes)) delete ouvintes[k];
        return socket;
      },
      disconnect: jest.fn(() => {
        socket.connected = false;
      }),
      __emitir(evento, ...args) {
        (ouvintes[evento] ?? []).forEach((fn) => fn(...args));
      },
    };
    sockets.push(socket);
    return socket;
  };
  return { __esModule: true, io, __sockets: sockets };
});
