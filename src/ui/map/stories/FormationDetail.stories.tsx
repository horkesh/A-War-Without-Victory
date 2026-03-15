import { useLayoutEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormationDetail } from '../components/FormationDetail';
import { makeMockLoadedGameState } from '../__mocks__/loadedGameState';
import { useGameStore } from '../store/gameStore';

const mockState = makeMockLoadedGameState();
const formationId = mockState.formations[0]?.id ?? 'rbih_brig_1';

const meta: Meta<typeof FormationDetail> = {
  title: 'AWWV/FormationDetail',
  component: FormationDetail,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story, context) => {
      const name = context.name;
      const selectedFormationId = name === 'Hidden' ? null : formationId;
      useLayoutEffect(() => {
        useGameStore.setState({
          selectedFormationId,
          loadedGameState: name === 'Hidden' ? null : mockState,
        });
      }, [name]);
      return (
        <div className="relative w-full bg-slate-900" style={{ minHeight: 420, background: '#0f172a' }}>
          <Story />
        </div>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof FormationDetail>;

export const WithData: Story = {
  render: () => <FormationDetail railSlot="primary" />,
};

export const Hidden: Story = {
  render: () => <FormationDetail railSlot="primary" />,
};
