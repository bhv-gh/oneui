// Runtime render/interaction test for ChangeView — verifies it mounts against a
// default journal, shows the active step + wins from closed tasks, and that the
// "practiced" toggle drives updateJournal (the persistence path).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChangeView from './ChangeView';
import { createDefaultJournal } from '../utils/changeJournal';
import { getTodayDateString } from '../utils/dateUtils';

function setup(overrides = {}) {
  const journal = createDefaultJournal();
  const updateJournal = jest.fn();
  const props = {
    journal,
    updateJournal,
    treeData: [
      { id: 't1', text: 'Ship the change tab', isCompleted: true, completionDate: getTodayDateString() },
    ],
    logs: [],
    ...overrides,
  };
  render(<ChangeView {...props} />);
  return { updateJournal, journal };
}

test('renders header, first step, and a closed-task win', () => {
  setup();
  expect(screen.getByRole('heading', { name: 'Change' })).toBeInTheDocument();
  // First program step is Goals.
  expect(screen.getByRole('heading', { name: 'Goals' })).toBeInTheDocument();
  // Wins pulled from the completed task.
  expect(screen.getByText('Ship the change tab')).toBeInTheDocument();
});

test('marking practiced calls updateJournal', () => {
  const { updateJournal } = setup();
  fireEvent.click(screen.getByRole('button', { name: /mark as practiced/i }));
  expect(updateJournal).toHaveBeenCalledTimes(1);
});

test('program rail renders later default steps', () => {
  setup();
  // Active step is Goals, so these titles appear only in the program rail.
  expect(screen.getByText('Program')).toBeInTheDocument();
  expect(screen.getByText('Pomodoro Technique')).toBeInTheDocument();
  expect(screen.getByText('Journaling')).toBeInTheDocument();
});

// Stateful harness so step switching + reflection state behave like the real app.
function StatefulHarness() {
  const [journal, setJournal] = React.useState(createDefaultJournal());
  const updateJournal = (updater) =>
    setJournal(prev => {
      const base = typeof updater === 'function' ? updater(prev) : updater;
      return { ...base, updatedAt: '2026-07-20T00:00:00Z' };
    });
  return <ChangeView journal={journal} updateJournal={updateJournal} treeData={[]} logs={[]} />;
}

test('mood prefill keeps working after switching steps (regression)', () => {
  render(<StatefulHarness />);
  const textarea = screen.getByPlaceholderText('Write your answer here…');

  // Prefill for the active step (Goals)
  fireEvent.click(screen.getByRole('button', { name: /Best/ }));
  expect(textarea.value).toMatch(/Crystal clear on my top goal/);

  // Switch active step to Pomodoro via the program rail
  fireEvent.click(screen.getByText('Pomodoro Technique'));

  // Clicking a mood must now replace the carried-over preset with Pomodoro's,
  // not treat it as custom text (the bug: only the first step worked).
  fireEvent.click(screen.getByRole('button', { name: /Best/ }));
  expect(textarea.value).toMatch(/Strong focus blocks/);
});

test('mood does NOT overwrite text the user actually typed', () => {
  render(<StatefulHarness />);
  const textarea = screen.getByPlaceholderText('Write your answer here…');
  fireEvent.change(textarea, { target: { value: 'my own words' } });
  fireEvent.click(screen.getByRole('button', { name: /Worst/ }));
  expect(textarea.value).toBe('my own words');
});
