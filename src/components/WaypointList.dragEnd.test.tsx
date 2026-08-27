import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaypointList from './WaypointList';
import { useTripStore } from '../store/tripStore';

type DragEndEvent = { active: { id: string }; over: { id: string } | null };

let capturedOnDragEnd: ((event: DragEndEvent) => void) | null = null;

// Real @dnd-kit pointer-drag simulation is notoriously unreliable in jsdom (needs
// real layout/getBoundingClientRect). Since handleDragEnd is unexported app logic
// (not dnd-kit's own reordering mechanics), it's tested here by capturing the
// onDragEnd callback DndContext is given and invoking it directly with fake events.
vi.mock('@dnd-kit/core', () => ({
  DndContext: (props: { children?: ReactNode; onDragEnd?: (e: DragEndEvent) => void }) => {
    capturedOnDragEnd = props.onDragEnd ?? null;
    return props.children ?? null;
  },
  PointerSensor: class {},
  closestCenter: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: (props: { children?: ReactNode }) => props.children ?? null,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: 'vertical',
}));

const initialState = useTripStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTripStore.setState(initialState, true);
  capturedOnDragEnd = null;
});

describe('WaypointList drag-end handling', () => {
  it('reorders the store when dropped over a different item', () => {
    render(<WaypointList />);
    const ids = useTripStore.getState().waypoints.map((w) => w.id);
    capturedOnDragEnd?.({ active: { id: ids[0] }, over: { id: ids[2] } });
    expect(useTripStore.getState().waypoints.map((w) => w.id)).not.toEqual(ids);
  });

  it('does nothing when dropped with no drop target', () => {
    render(<WaypointList />);
    const before = useTripStore.getState().waypoints.map((w) => w.id);
    capturedOnDragEnd?.({ active: { id: before[0] }, over: null });
    expect(useTripStore.getState().waypoints.map((w) => w.id)).toEqual(before);
  });

  it('does nothing when dropped on itself', () => {
    render(<WaypointList />);
    const before = useTripStore.getState().waypoints.map((w) => w.id);
    capturedOnDragEnd?.({ active: { id: before[0] }, over: { id: before[0] } });
    expect(useTripStore.getState().waypoints.map((w) => w.id)).toEqual(before);
  });

  it('does nothing when the active or over id is not a known waypoint', () => {
    render(<WaypointList />);
    const before = useTripStore.getState().waypoints.map((w) => w.id);
    capturedOnDragEnd?.({ active: { id: 'unknown' }, over: { id: before[0] } });
    expect(useTripStore.getState().waypoints.map((w) => w.id)).toEqual(before);
  });
});
