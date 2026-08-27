import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTripStore } from '../store/tripStore';
import type { Waypoint } from '../types';

function SortableWaypoint({ waypoint, index }: { waypoint: Waypoint; index: number }) {
  const removeWaypoint = useTripStore((s) => s.removeWaypoint);
  const updateWaypoint = useTripStore((s) => s.updateWaypoint);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: waypoint.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="waypoint-item">
      <span className="waypoint-drag-handle" {...attributes} {...listeners}>
        ⠿
      </span>
      <span className="waypoint-index">{index + 1}</span>
      <div className="waypoint-body">
        <div className="waypoint-name">{waypoint.name}</div>
        <div className="waypoint-address">{waypoint.address}</div>
        <input
          type="text"
          placeholder="Notes (e.g. planned overnight, fuel stop)"
          value={waypoint.notes}
          onChange={(e) => updateWaypoint(waypoint.id, { notes: e.target.value })}
          className="waypoint-notes-input"
        />
      </div>
      <button
        type="button"
        onClick={() => removeWaypoint(waypoint.id)}
        className="waypoint-remove-btn"
        aria-label={`Remove ${waypoint.name}`}
      >
        ✕
      </button>
    </li>
  );
}

export default function WaypointList() {
  const waypoints = useTripStore((s) => s.waypoints);
  const reorderWaypoints = useTripStore((s) => s.reorderWaypoints);
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = waypoints.findIndex((w) => w.id === active.id);
    const toIndex = waypoints.findIndex((w) => w.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;

    reorderWaypoints(fromIndex, toIndex);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={waypoints.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        <ul className="waypoint-list">
          {waypoints.map((wp, i) => (
            <SortableWaypoint key={wp.id} waypoint={wp} index={i} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
