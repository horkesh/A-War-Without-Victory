import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrigadeRow } from '../components/BrigadeRow';
import { mockOobFormations } from '../__mocks__/oobMock';

const meta: Meta<typeof BrigadeRow> = {
  title: 'AWWV/BrigadeRow',
  component: BrigadeRow,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-80 rounded border border-panel-border bg-panel-bg p-2">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BrigadeRow>;

export const Default: Story = {
  args: { formation: mockOobFormations[0] },
};

export const Reserve: Story = {
  args: { formation: mockOobFormations[1] },
};

export const InCombat: Story = {
  args: { formation: mockOobFormations[2] },
};

export const Compact: Story = {
  args: { formation: mockOobFormations[0], compact: true },
};
