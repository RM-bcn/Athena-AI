import { useCallback, useEffect, useState } from 'react';
import type { TransportEntry } from './types';

const STORAGE_KEY = 'athena_transport_entries';

function loadEntries(): TransportEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed as TransportEntry[];
  } catch {
    return [];
  }
}

function persistEntries(entries: TransportEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save transport entries', e);
  }
}

export interface UseTransportEntries {
  transportEntries: TransportEntry[];
  addTransportEntry: (entry: Omit<TransportEntry, 'id'>) => TransportEntry;
  updateTransportEntry: (entry: TransportEntry) => void;
  deleteTransportEntry: (id: string) => void;
  /** Bulk replace (used when loading from the Google Sheets database). */
  setTransportEntries: (entries: TransportEntry[]) => void;
}

export function useTransportEntries(): UseTransportEntries {
  const [transportEntries, setTransportEntriesState] = useState<TransportEntry[]>(() => loadEntries());

  // Keep localStorage in sync after every change (mirrors the accommodation
  // storage pattern in App.tsx which writes athena_* keys per update).
  useEffect(() => {
    persistEntries(transportEntries);
  }, [transportEntries]);

  const addTransportEntry = useCallback((entry: Omit<TransportEntry, 'id'>): TransportEntry => {
    const newEntry: TransportEntry = {
      ...entry,
      id: `transport-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    setTransportEntriesState((prev) => {
      const next = [...prev, newEntry];
      persistEntries(next);
      return next;
    });
    return newEntry;
  }, []);

  const updateTransportEntry = useCallback((entry: TransportEntry) => {
    setTransportEntriesState((prev) => {
      const next = prev.map((e) => (e.id === entry.id ? entry : e));
      persistEntries(next);
      return next;
    });
  }, []);

  const deleteTransportEntry = useCallback((id: string) => {
    setTransportEntriesState((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persistEntries(next);
      return next;
    });
  }, []);

  const setTransportEntries = useCallback((entries: TransportEntry[]) => {
    setTransportEntriesState(entries);
    persistEntries(entries);
  }, []);

  return { transportEntries, addTransportEntry, updateTransportEntry, deleteTransportEntry, setTransportEntries };
}
