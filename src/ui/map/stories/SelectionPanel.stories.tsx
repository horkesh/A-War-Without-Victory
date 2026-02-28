import { useLayoutEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SelectionPanel } from '../components/SelectionPanel';
import { makeMockLoadedGameState } from '../__mocks__/loadedGameState';
import { useGameStore } from '../store/gameStore';

const mockState = makeMockLoadedGameState();

const meta: Meta<typeof SelectionPanel> = {
  title: 'AWWV/SelectionPanel',
  component: SelectionPanel,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story, context) => {
      const name = context.name;
      const selectedOsid =
        name === 'Selected With Data' || name === 'Selected Without Save'
          ? 'op:sarajevo'
          : null;
      const loadedGameState =
        name === 'Hidden No Selection' || name === 'Selected With Data'
          ? mockState
          : null;
      useLayoutEffect(() => {
        useGameStore.setState({ selectedOsid, loadedGameState });
      }, [name]);
      return (
        <div
          className="relative w-full bg-slate-900"
          style={{ minHeight: 420, background: '#0f172a' }}
        >
          <Story />
        </div>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof SelectionPanel>;

export const HiddenNoSelection: Story = {
  render: () => <SelectionPanel />,
};

export const SelectedWithData: Story = {
  render: () => <SelectionPanel />,
};

export const SelectedWithoutSave: Story = {
  render: () => <SelectionPanel />,
};
