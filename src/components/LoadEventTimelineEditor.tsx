import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatTime, toDatetimeLocalValue } from '@/lib/utils';
import type { Database } from '@/lib/database.types';
import {
  EVENT_TYPES,
  normalizeLoadEvent,
  normalizeLoadEvents,
  type LoadEvent,
  type LoadEventRowInput,
  type LoadEventType,
} from '@/types/load-events';

type DbLoadEventInsert = Database['public']['Tables']['load_events']['Insert'];

const EVENT_LABELS: Record<LoadEventType, string> = {
  arrived: 'Arrived',
  checked_in: 'Checked In',
  moved: 'Moved Location',
  loading_started: 'Loading Started',
  departed: 'Departed',
};

function toDbInsertForEditor(params: {
  load_id: string;
  event_type: LoadEventType;
  timestamp: string;
  source: 'system' | 'user';
}): DbLoadEventInsert {
  return {
    load_id: params.load_id,
    event_type: params.event_type,
    timestamp: params.timestamp,
    source: params.source,
    note: null,
    gps_lat: null,
    gps_long: null,
  };
}

function sortByTimestamp(list: LoadEvent[]): LoadEvent[] {
  return [...list].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

interface SortableEventItemProps {
  event: LoadEvent;
  onEditTimestamp: (id: string, iso: string) => void;
  onDelete: (id: string) => void;
  onSourceToggle: (id: string, source: 'system' | 'user') => void;
}

function SortableEventItem({ event, onEditTimestamp, onDelete, onSourceToggle }: SortableEventItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isUserEdited = event.source === 'user';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-white p-3 shadow-sm transition hover:shadow mb-2 ${
        isUserEdited ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab p-1 text-gray-400 hover:text-gray-600"
          title="Drag to reorder"
        >
          ⋮⋮
        </div>

        <div className="w-36 font-medium text-gray-800">{EVENT_LABELS[event.event_type]}</div>

        <div className="min-w-0 flex-1">
          <input
            type="datetime-local"
            value={toDatetimeLocalValue(event.timestamp)}
            onChange={(e) => onEditTimestamp(event.id, new Date(e.target.value).toISOString())}
            className="w-full max-w-[220px] rounded border px-2 py-1 text-sm"
          />
          <span className="ml-2 text-xs text-gray-400">{formatTime(event.timestamp)}</span>
        </div>

        <div className="text-xs">
          {isUserEdited ? (
            <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">
              <span>User</span>
              <button
                type="button"
                onClick={() => onSourceToggle(event.id, 'system')}
                className="ml-1 text-blue-600 hover:text-blue-800"
                title="Revert to system"
              >
                ↺
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
              <span>System</span>
              <button
                type="button"
                onClick={() => onSourceToggle(event.id, 'user')}
                className="ml-1 text-gray-500 hover:text-blue-600"
                title="Mark as user-edited"
              >
                ✏️
              </button>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDelete(event.id)}
          className="p-1 text-red-500 hover:text-red-700"
          title="Delete event"
        >
          🗑️
        </button>

        {event.gps_lat != null && event.gps_long != null && (
          <span className="text-xs text-green-600" title="GPS available">
            📍
          </span>
        )}
      </div>
      {event.note ? <div className="ml-8 mt-1 text-xs text-gray-500">Note: {event.note}</div> : null}
    </div>
  );
}

export function LoadEventTimelineEditor({ loadId }: { loadId: string }) {
  const [events, setEvents] = useState<LoadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEventType, setNewEventType] = useState<LoadEventType>('arrived');
  const [newEventTimestamp, setNewEventTimestamp] = useState(() =>
    toDatetimeLocalValue(new Date().toISOString())
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showFixTimeline, setShowFixTimeline] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('load_events')
      .select('*')
      .eq('load_id', loadId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error(error);
      setEvents([]);
    } else {
      setEvents(normalizeLoadEvents((data ?? []) as LoadEventRowInput[]));
    }
    setLoading(false);
  }, [loadId]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const handleEditTimestamp = async (eventId: string, newTimestamp: string) => {
    const originalEvent = events.find((e) => e.id === eventId);
    if (!originalEvent) return;

    const editedAt = new Date().toISOString();
    const updatedEvents = events.map((e) =>
      e.id === eventId
        ? { ...e, timestamp: newTimestamp, source: 'user' as const, edited_at: editedAt }
        : e
    );
    setEvents(sortByTimestamp(updatedEvents));

    const { error } = await supabase
      .from('load_events')
      .update({
        timestamp: newTimestamp,
        source: 'user',
        edited_at: editedAt,
        original_timestamp:
          originalEvent.source === 'system'
            ? originalEvent.timestamp
            : (originalEvent.original_timestamp ?? null),
      })
      .eq('id', eventId);

    if (error) {
      console.error(error);
      void fetchEvents();
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!globalThis.confirm('Delete this event?')) return;
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    const { error } = await supabase.from('load_events').delete().eq('id', eventId);
    if (error) {
      console.error(error);
      void fetchEvents();
    }
  };

  const handleSourceToggle = async (eventId: string, newSource: 'system' | 'user') => {
    const original = events.find((e) => e.id === eventId);
    if (!original) return;

    const editedAt = new Date().toISOString();
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        if (newSource === 'user') {
          return { ...e, source: 'user', edited_at: editedAt };
        }
        return { ...e, source: 'system' };
      })
    );

    if (newSource === 'user') {
      const { error } = await supabase
        .from('load_events')
        .update({
          source: 'user',
          edited_at: editedAt,
          original_timestamp:
            original.source === 'system' ? original.timestamp : (original.original_timestamp ?? null),
        })
        .eq('id', eventId);
      if (error) {
        console.error(error);
        void fetchEvents();
      }
      return;
    }

    const { error } = await supabase.from('load_events').update({ source: 'system' }).eq('id', eventId);
    if (error) {
      console.error(error);
      void fetchEvents();
    }
  };

  const handleAddEvent = async () => {
    setValidationError(null);
    setShowFixTimeline(false);
    const timestamp = new Date(newEventTimestamp).toISOString();
    const payload = toDbInsertForEditor({
      load_id: loadId,
      event_type: newEventType,
      timestamp,
      source: 'user',
    });

    const { data, error } = await supabase.from('load_events').insert(payload).select().single();

    if (error) {
      console.error(error);
      if (error.message.toLowerCase().includes('timeline order violation')) {
        setValidationError(error.message);
        setShowFixTimeline(true);
      } else {
        window.alert('Failed to add event');
      }
      return;
    }

    const row = normalizeLoadEvent(data as LoadEventRowInput);
    setEvents((prev) => sortByTimestamp([...prev, row]));
  };

  const handleFixTimeline = async () => {
    const timestamp = new Date(newEventTimestamp).toISOString();
    const reason = `Dispatcher override from Timeline Editor (${newEventType})`;
    const { data, error } = await supabase.rpc('insert_load_event_override', {
      p_load_id: loadId,
      p_event_type: newEventType,
      p_timestamp: timestamp,
      p_override_reason: reason,
    });

    if (error) {
      window.alert('Override failed');
      console.error(error);
      return;
    }

    const insertedId = data as string;
    const { data: insertedRow, error: fetchError } = await supabase
      .from('load_events')
      .select('*')
      .eq('id', insertedId)
      .single();

    if (fetchError || !insertedRow) {
      console.error(fetchError);
      void fetchEvents();
      return;
    }

    const row = normalizeLoadEvent(insertedRow as LoadEventRowInput);
    setEvents((prev) => sortByTimestamp([...prev, row]));
    setValidationError(null);
    setShowFixTimeline(false);
  };

  const handleDragEnd = async (dragEvent: DragEndEvent) => {
    const { active, over } = dragEvent;
    if (!over || active.id === over.id) return;

    const oldIndex = events.findIndex((e) => e.id === active.id);
    const newIndex = events.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const eventA = events[oldIndex];
    const eventB = events[newIndex];
    const tempTimestamp = eventA.timestamp;
    const editedAt = new Date().toISOString();

    const updatedEvents = events.map((e, i) => {
      if (i === oldIndex) {
        return { ...e, timestamp: eventB.timestamp, source: 'user' as const, edited_at: editedAt };
      }
      if (i === newIndex) {
        return { ...e, timestamp: tempTimestamp, source: 'user' as const, edited_at: editedAt };
      }
      return e;
    });
    setEvents(sortByTimestamp(updatedEvents));

    setSaving(true);
    const [resA, resB] = await Promise.all([
      supabase
        .from('load_events')
        .update({
          timestamp: eventB.timestamp,
          source: 'user',
          edited_at: editedAt,
          original_timestamp:
            eventA.source === 'system' ? eventA.timestamp : (eventA.original_timestamp ?? null),
        })
        .eq('id', eventA.id),
      supabase
        .from('load_events')
        .update({
          timestamp: tempTimestamp,
          source: 'user',
          edited_at: editedAt,
          original_timestamp:
            eventB.source === 'system' ? eventB.timestamp : (eventB.original_timestamp ?? null),
        })
        .eq('id', eventB.id),
    ]);

    if (resA.error || resB.error) {
      console.error('Reorder failed', resA.error, resB.error);
      void fetchEvents();
    }
    setSaving(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (loading) {
    return <div className="animate-pulse p-4">Loading timeline...</div>;
  }

  return (
    <div className="rounded-lg border bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Event Timeline Editor</h3>
        <div className="text-xs text-gray-500">Drag ⋮⋮ to reorder (swaps timestamps)</div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={events.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {events.map((event) => (
              <SortableEventItem
                key={event.id}
                event={event}
                onEditTimestamp={handleEditTimestamp}
                onDelete={handleDelete}
                onSourceToggle={handleSourceToggle}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-0.5 block text-xs text-gray-500">Event Type</label>
            <select
              value={newEventType}
              onChange={(e) => setNewEventType(e.target.value as LoadEventType)}
              className="rounded border px-2 py-1"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVENT_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-xs text-gray-500">Timestamp</label>
            <input
              type="datetime-local"
              value={newEventTimestamp}
              onChange={(e) => setNewEventTimestamp(e.target.value)}
              className="rounded border px-2 py-1"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleAddEvent()}
            className="rounded bg-blue-600 px-4 py-1 text-white hover:bg-blue-700"
          >
            + Add Event
          </button>
          {showFixTimeline && (
            <button
              type="button"
              onClick={() => void handleFixTimeline()}
              className="rounded bg-amber-600 px-4 py-1 text-white hover:bg-amber-700"
            >
              Fix Timeline (Override)
            </button>
          )}
        </div>
        {validationError ? (
          <p className="mt-2 text-xs text-amber-700">
            {validationError}. Use Fix Timeline only when you need a manual correction. This action is audited.
          </p>
        ) : null}
      </div>

      {saving ? <div className="mt-2 text-xs text-gray-400">Saving reorder...</div> : null}
    </div>
  );
}
