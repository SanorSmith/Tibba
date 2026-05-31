'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, User } from 'lucide-react';

/**
 * Reusable patient picker used across the system.
 * Searches by NAME, NATIONAL ID, or MOBILE via /api/tibbna-openehr-patients?search=
 * and returns the patient's UUID on select — so users never type raw UUIDs.
 */
export interface PatientLite {
  id: string;
  full_name?: string;
  full_name_en?: string;
  national_id?: string;
  mobile?: string;
  phone?: string;
}

export default function PatientSearchSelect({
  value,
  onSelect,
  placeholder = 'Search patient by name, national ID, or mobile…',
}: {
  value?: PatientLite | null;
  onSelect: (p: PatientLite | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientLite[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PatientLite | null>(value ?? null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/tibbna-openehr-patients?search=${encodeURIComponent(query.trim())}&limit=10`).then(x => x.json());
        const rows = r.data ?? r.patients ?? (Array.isArray(r) ? r : []);
        setResults(rows.map((p: any) => ({
          id: p.id ?? p.patientid,
          full_name: p.full_name_en || p.full_name_ar || `${p.first_name_en || ''} ${p.last_name_en || ''}`.trim(),
          national_id: p.national_id,
          mobile: p.mobile || p.phone,
        })));
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pick = (p: PatientLite) => {
    setSelected(p);
    onSelect(p);
    setOpen(false);
    setQuery('');
  };

  const clear = () => { setSelected(null); onSelect(null); setQuery(''); setResults([]); };

  if (selected) {
    return (
      <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-emerald-50 border-emerald-200">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-emerald-600" />
          <div>
            <span className="font-medium text-gray-800">{selected.full_name || 'Patient'}</span>
            <span className="text-xs text-gray-500 ml-2">
              {selected.national_id && `ID: ${selected.national_id}`}
              {selected.mobile && ` · ${selected.mobile}`}
            </span>
          </div>
        </div>
        <button type="button" onClick={clear} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      {open && (query.trim().length >= 2) && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-3 text-xs text-gray-400">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-400">No patients found</div>
          ) : (
            results.map(p => (
              <button key={p.id} type="button" onClick={() => pick(p)}
                className="w-full text-left px-3 py-2 hover:bg-emerald-50 border-b last:border-0">
                <div className="text-sm font-medium text-gray-800">{p.full_name || 'Unnamed'}</div>
                <div className="text-xs text-gray-500">
                  {p.national_id && `National ID: ${p.national_id}`}
                  {p.mobile && ` · Mobile: ${p.mobile}`}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
