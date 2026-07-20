// Smoke test: importing ChangeView evaluates its full dependency graph
// (data/changeSteps, utils/changeJournal, hooks/useDebounce, lucide, date-fns),
// catching syntax/import errors without needing a full DOM render.
import ChangeView from './ChangeView';
import { useChangeJournal } from '../hooks/useChangeJournal';

test('ChangeView and useChangeJournal modules load', () => {
  expect(typeof ChangeView).toBe('function');
  expect(typeof useChangeJournal).toBe('function');
});
