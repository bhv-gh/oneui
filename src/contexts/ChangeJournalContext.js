import { createContext } from 'react';

// Provides the Change Journal store (journal, updateJournal, forceSync) to both
// the desktop MainPage and the mobile MobileView, and lets App-level reconnect
// logic force-sync it. Instantiated once in App via useChangeJournal().
const ChangeJournalContext = createContext(null);

export default ChangeJournalContext;
