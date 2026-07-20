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
