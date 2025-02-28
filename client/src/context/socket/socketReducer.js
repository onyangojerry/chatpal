const socketReducer = (state, action) => {
  switch (action.type) {
    case 'SOCKET_CONNECTED':
      return {
        ...state,
        socket: action.payload,
        connected: true
      };
    case 'SOCKET_DISCONNECTED':
      return {
        ...state,
        socket: null,
        connected: false
      };
    default:
      return state;
  }
};

export default socketReducer;
