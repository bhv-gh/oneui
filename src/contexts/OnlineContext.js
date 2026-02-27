import { createContext } from 'react';

const OnlineContext = createContext({ isOnline: true, markUnreachable: () => {}, markReachable: () => {}, checkReachability: async () => true });

export default OnlineContext;
