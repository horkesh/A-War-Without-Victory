import type { Meta, StoryObj } from '@storybook/react-vite';
import { CorpsCard } from '../components/CorpsCard';
import { mockOobFormations, mockCorpsNames } from '../__mocks__/oobMock';

const rsNorth = mockOobFormations.filter((f) => f.corps_id === 'rs_corps_north');
const rbihSarajevo = mockOobFormations.filter((f) => f.corps_id === 'rbih_corps_sarajevo');

const meta: Meta<typeof CorpsCard> = {
  title: 'AWWV/CorpsCard',
  component: CorpsCard,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-96 rounded border border-panel-border bg-slate-900 p-2">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CorpsCard>;

export const WithBrigades: Story = {
  args: {
    corpsId: 'rs_corps_north',
    corpsName: mockCorpsNames['rs_corps_north'],
    brigades: rsNorth,
    faction: 'RS',
  },
};

export const WithFrontAssignment: Story = {
  args: {
    corpsId: 'rbih_corps_sarajevo',
    corpsName: mockCorpsNames['rbih_corps_sarajevo'],
    brigades: rbihSarajevo,
    frontAssignment: 'Sarajevo sector',
    faction: 'RBiH',
  },
};

export const FallbackName: Story = {
  args: {
    corpsId: 'unknown_corps',
    brigades: [mockOobFormations[0]],
    faction: 'RS',
  },
};
