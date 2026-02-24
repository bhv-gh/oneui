import { createContext } from 'react';

const OnlineContext = createContext({ isOnline: true, markUnreachable: () => {}, markReachable: () => {} });

export default OnlineContext;
