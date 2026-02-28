import { useLayoutEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopToolbar } from '../components/TopToolbar';
import { makeMockLoadedGameState } from '../__mocks__/loadedGameState';
import { useGameStore } from '../store/gameStore';

const meta: Meta<typeof TopToolbar> = {
  title: 'AWWV/TopToolbar',
  component: TopToolbar,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof TopToolbar>;

function TopToolbarStoryHarness(props: { withSave: boolean }) {
  useLayoutEffect(() => {
    useGameStore.setState({
      selectedOsid: props.withSave ? 'op:sarajevo' : null,
      loadedGameState: props.withSave ? makeMockLoadedGameState() : null,
    });
  }, [props.withSave]);

  return (
    <div className="relative h-24 w-full bg-slate-900">
      <TopToolbar />
    </div>
  );
}

export const EmptyState: Story = {
  render: () => <TopToolbarStoryHarness withSave={false} />,
};

export const LoadedState: Story = {
  render: () => <TopToolbarStoryHarness withSave={true} />,
};
