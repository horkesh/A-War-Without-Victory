import { useLayoutEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BottomStatusStrip } from '../components/BottomStatusStrip';
import { makeMockLoadedGameState } from '../__mocks__/loadedGameState';
import { useGameStore } from '../store/gameStore';

const mockState = makeMockLoadedGameState();

const meta: Meta<typeof BottomStatusStrip> = {
  title: 'AWWV/BottomStatusStrip',
  component: BottomStatusStrip,
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
      const loadedGameState = name === 'Selected With Data' ? mockState : null;
      useLayoutEffect(() => {
        useGameStore.setState({ selectedOsid, loadedGameState });
      }, [name]);
      return (
        <div
          className="relative w-full bg-slate-900"
          style={{ minHeight: 120, background: '#0f172a' }}
        >
          <Story />
        </div>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof BottomStatusStrip>;

export const NoSelection: Story = {
  render: () => <BottomStatusStrip />,
};

export const SelectedWithData: Story = {
  render: () => <BottomStatusStrip />,
};

export const SelectedWithoutSave: Story = {
  render: () => <BottomStatusStrip />,
};
