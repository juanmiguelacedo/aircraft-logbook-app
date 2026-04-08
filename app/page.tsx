"use client";

import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "easy-aircraft-logbook-v4";
const SESSION_KEY = "easy-aircraft-logbook-session-v1";

const demoUsers = [
  { username: "juanmi", password: "1234", pilotName: "JuanMi" },
  { username: "laura", password: "2222", pilotName: "Laura" },
  { username: "carlos", password: "3333", pilotName: "Carlos" },
];

const emptyAircraft = {
  registration: "",
  insuranceExpiry: "",
  permitExpiry: "",
  nextMaintenanceRemaining: "",
};

const emptyForm = {
  pilot: "",
  date: new Date().toISOString().slice(0, 10),
  originAirport: "",
  destinationAirport: "",
  tachStart: "",
  tachEnd: "",
  landings: "1",
  oilLevelStart: "",
  oilAdded: false,
  oilQty: "",
  fuelAdded: "",
  fuelRemaining: "",
  defect: "",
  remarks: "",
};

function fieldStyle(disabled = false): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    fontSize: 14,
    boxSizing: "border-box",
    background: disabled ? "#f3f4f6" : "white",
  };
}

function cardStyle(): React.CSSProperties {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    background: "white",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };
}

function daysTo(dateStr: string) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function expiryText(days: number | null) {
  if (days === null) return "Not set";
  if (days < 0) return `${Math.abs(days)} day(s) overdue`;
  return `${days} day(s) remaining`;
}

function expiryColor(days: number | null) {
  if (days === null) return "#64748b";
  if (days < 0) return "#b91c1c";
  if (days <= 30) return "#c2410c";
  return "#166534";
}

type Entry = {
  id: number;
  pilot: string;
  date: string;
  originAirport: string;
  destinationAirport: string;
  tachStart: number;
  tachEnd: number;
  flightTime: number;
  landings: number;
  oilLevelStart: number;
  oilAdded: boolean;
  oilQty: number;
  fuelAdded: number;
  fuelRemaining: number;
  defect: string;
  remarks: string;
  createdAt: string;
};

type Aircraft = typeof emptyAircraft;
type Session = { username: string; pilotName: string } | null;

export default function AircraftLogbookApp() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft>(emptyAircraft);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<Session>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const parsedSession = JSON.parse(savedSession);
        if (parsedSession?.pilotName) {
          setSession(parsedSession);
          setForm((prev) => ({ ...prev, pilot: parsedSession.pilotName }));
        }
      }
    } catch {}

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.entries)) setEntries(parsed.entries);
        if (parsed.aircraft) setAircraft({ ...emptyAircraft, ...parsed.aircraft });
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, aircraft }));
  }, [entries, aircraft]);

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setForm((prev) => ({ ...prev, pilot: session.pilotName }));
    } else {
      localStorage.removeItem(SESSION_KEY);
      setForm((prev) => ({ ...prev, pilot: "" }));
    }
  }, [session]);

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) =>
      [entry.pilot, entry.date, entry.originAirport, entry.destinationAirport, entry.defect, entry.remarks]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [entries, query]);

  const totals = useMemo(() => {
    const flightHours = entries.reduce((acc, entry) => acc + Number(entry.flightTime || 0), 0);
    const openDefects = entries.filter((entry) => entry.defect && entry.defect.trim()).length;
    const latestTach = entries.length ? entries[0].tachEnd : "—";
    const remainingMaintenance =
      aircraft.nextMaintenanceRemaining === ""
        ? null
        : Number(aircraft.nextMaintenanceRemaining) - flightHours;
    return { flightHours, openDefects, latestTach, remainingMaintenance };
  }, [entries, aircraft.nextMaintenanceRemaining]);

  const tachDifference = useMemo(() => {
    if (form.tachStart === "" || form.tachEnd === "") return "";
    const start = Number(form.tachStart);
    const end = Number(form.tachEnd);
    if (Number.isNaN(start) || Number.isNaN(end)) return "";
    return (end - start).toFixed(1);
  }, [form.tachStart, form.tachEnd]);

  const insuranceDays = daysTo(aircraft.insuranceExpiry);
  const permitDays = daysTo(aircraft.permitExpiry);

  function updateField(name: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateAircraft(name: string, value: string) {
    setAircraft((prev) => ({ ...prev, [name]: value }));
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const user = demoUsers.find(
      (u) => u.username === loginForm.username.trim().toLowerCase() && u.password === loginForm.password
    );
    if (!user) {
      setMessage("Invalid username or password.");
      return;
    }
    setSession({ username: user.username, pilotName: user.pilotName });
    setLoginForm({ username: "", password: "" });
    setMessage(`Logged in as ${user.pilotName}. Pilot name is locked.`);
  }

  function handleLogout() {
    setSession(null);
    setMessage("Logged out.");
  }

  function validate() {
    if (!session?.pilotName) return "Login required.";
    if (!form.date) return "Date is required.";
    if (!form.originAirport.trim()) return "Origin airport is required.";
    if (!form.destinationAirport.trim()) return "Destination airport is required.";
    if (form.tachStart === "" || form.tachEnd === "") return "Tach start and end are required.";
    if (tachDifference === "" || Number(tachDifference) < 0) return "Invalid tach values.";
    if (form.oilLevelStart === "") return "Oil level at start is required.";
    if (Number(form.oilLevelStart) < 1 || Number(form.oilLevelStart) > 7) {
      return "Oil level at start must be between 1 and 7.";
    }
    if (form.oilAdded && (form.oilQty === "" || Number(form.oilQty) <= 0)) {
      return "Oil added must be greater than zero ml.";
    }
    return "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validate();
    if (error) {
      setMessage(error);
      return;
    }

    const entry: Entry = {
      id: Date.now(),
      pilot: session!.pilotName,
      date: form.date,
      originAirport: form.originAirport.trim().toUpperCase(),
      destinationAirport: form.destinationAirport.trim().toUpperCase(),
      tachStart: Number(form.tachStart),
      tachEnd: Number(form.tachEnd),
      flightTime: Number(tachDifference),
      landings: Number(form.landings || 0),
      oilLevelStart: Number(form.oilLevelStart),
      oilAdded: form.oilAdded,
      oilQty: form.oilAdded ? Number(form.oilQty) : 0,
      fuelAdded: form.fuelAdded === "" ? 0 : Number(form.fuelAdded),
      fuelRemaining: form.fuelRemaining === "" ? 0 : Number(form.fuelRemaining),
      defect: form.defect.trim(),
      remarks: form.remarks.trim(),
      createdAt: new Date().toISOString(),
    };

    setEntries((prev) => [entry, ...prev]);
    setForm({
      ...emptyForm,
      pilot: session!.pilotName,
      date: new Date().toISOString().slice(0, 10),
      tachStart: form.tachEnd,
    });
    setMessage("Entry saved.");
  }

  function deleteEntry(id: number) {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setMessage("Entry deleted.");
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24, fontFamily: "Arial, sans-serif" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ ...cardStyle(), background: "#0f172a", color: "white", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="48" height="48" viewBox="0 0 100 100" aria-label="C120 style aircraft logo">
                <circle cx="50" cy="50" r="46" fill="#1c1917" stroke="#a16207" strokeWidth="4" />
                <g fill="#f5f5dc">
                  <rect x="15" y="35" width="70" height="10" rx="5" />
                  <rect x="25" y="45" width="45" height="8" rx="4" />
                  <polygon points="70,45 85,40 85,55 70,53" />
                  <circle cx="45" cy="60" r="4" />
                  <circle cx="60" cy="60" r="4" />
                  <circle cx="75" cy="58" r="2.5" />
                  <circle cx="25" cy="49" r="2.5" />
                </g>
              </svg>
              <div style={{ fontSize: 28, fontWeight: 700 }}>EASY AIRCRAFT LOGBOOK</div>
            </div>
            <div style={{ marginTop: 8, color: "#cbd5e1", fontSize: 14 }}>
              Personal login required. Once logged in, the pilot name cannot be changed.
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Login</div>
            <div style={{ color: "#64748b", marginBottom: 16 }}>
              Demo users: juanmi / 1234, laura / 2222, carlos / 3333
            </div>
            <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
              <input
                style={fieldStyle()}
                placeholder="Username"
                value={loginForm.username}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
              />
              <input
                style={fieldStyle()}
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              />
              <button
                type="submit"
                style={{ ...fieldStyle(), background: "#2563eb", color: "white", border: "none", cursor: "pointer", fontWeight: 700 }}
              >
                Log In
              </button>
            </form>
            {message && <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 600 }}>{message}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 20, fontFamily: "Arial, sans-serif", color: "#0f172a" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ ...cardStyle(), background: "#0f172a", color: "white", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="48" height="48" viewBox="0 0 100 100" aria-label="C120 style aircraft logo">
                <circle cx="50" cy="50" r="46" fill="#1c1917" stroke="#a16207" strokeWidth="4" />
                <g fill="#f5f5dc">
                  <rect x="15" y="35" width="70" height="10" rx="5" />
                  <rect x="25" y="45" width="45" height="8" rx="4" />
                  <polygon points="70,45 85,40 85,55 70,53" />
                  <circle cx="45" cy="60" r="4" />
                  <circle cx="60" cy="60" r="4" />
                  <circle cx="75" cy="58" r="2.5" />
                  <circle cx="25" cy="49" r="2.5" />
                </g>
              </svg>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>EASY AIRCRAFT LOGBOOK</div>
                <div style={{ marginTop: 6, color: "#cbd5e1", fontSize: 14 }}>Logged in as {session.pilotName}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #334155", background: "#111827", color: "white", cursor: "pointer", fontWeight: 700 }}
            >
              Log Out
            </button>
          </div>
        </div>

        <div style={{ ...cardStyle(), marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Aircraft Setup</div>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>Insurance, permit and remaining tach to next maintenance.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Registration</label>
              <input style={fieldStyle()} value={aircraft.registration} onChange={(e) => updateAircraft("registration", e.target.value.toUpperCase())} placeholder="EC-XXX" />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Insurance Expiry</label>
              <input style={fieldStyle()} type="date" value={aircraft.insuranceExpiry} onChange={(e) => updateAircraft("insuranceExpiry", e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Permit Expiry</label>
              <input style={fieldStyle()} type="date" value={aircraft.permitExpiry} onChange={(e) => updateAircraft("permitExpiry", e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Remaining Tach to Next Maintenance (h)</label>
              <input style={fieldStyle()} type="number" step="0.1" value={aircraft.nextMaintenanceRemaining} onChange={(e) => updateAircraft("nextMaintenanceRemaining", e.target.value)} placeholder="25.0" />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={cardStyle()}><div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Latest Tach</div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{totals.latestTach}</div></div>
          <div style={cardStyle()}><div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Flight Hours</div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{totals.flightHours.toFixed(1)}</div></div>
          <div style={cardStyle()}><div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Reported Defects</div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{totals.openDefects}</div></div>
          <div style={cardStyle()}><div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Maintenance Remaining</div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{totals.remainingMaintenance === null ? "Not set" : `${totals.remainingMaintenance.toFixed(1)} h`}</div></div>
          <div style={cardStyle()}><div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Insurance</div><div style={{ fontSize: 16, fontWeight: 700, marginTop: 8, color: expiryColor(insuranceDays) }}>{expiryText(insuranceDays)}</div></div>
          <div style={cardStyle()}><div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" }}>Permit</div><div style={{ fontSize: 16, fontWeight: 700, marginTop: 8, color: expiryColor(permitDays) }}>{expiryText(permitDays)}</div></div>
        </div>

        <div style={{ ...cardStyle(), marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>New Entry</div>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>Pilot is locked to the logged user. Tach difference is calculated automatically.</div>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Pilot</label>
                <input style={fieldStyle(true)} value={session.pilotName} readOnly disabled />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Date</label>
                <input style={fieldStyle()} type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Origin Airport</label>
                <input style={fieldStyle()} value={form.originAirport} onChange={(e) => updateField("originAirport", e.target.value.toUpperCase())} placeholder="LEMD" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Destination Airport</label>
                <input style={fieldStyle()} value={form.destinationAirport} onChange={(e) => updateField("destinationAirport", e.target.value.toUpperCase())} placeholder="LETO" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Tach Start</label>
                <input style={fieldStyle()} type="number" step="0.1" value={form.tachStart} onChange={(e) => updateField("tachStart", e.target.value)} placeholder="1254.3" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Tach End</label>
                <input style={fieldStyle()} type="number" step="0.1" value={form.tachEnd} onChange={(e) => updateField("tachEnd", e.target.value)} placeholder="1255.8" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Tach Difference (h)</label>
                <input style={fieldStyle(true)} value={tachDifference} readOnly disabled placeholder="Auto" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Landings</label>
                <input style={fieldStyle()} type="number" step="1" value={form.landings} onChange={(e) => updateField("landings", e.target.value)} />
              </div>
            </div>

            <div style={{ ...cardStyle(), padding: 14, background: "#f8fafc" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignItems: "end" }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Oil Level at Start (1-7)</label>
                  <input style={fieldStyle()} type="number" min="1" max="7" step="1" value={form.oilLevelStart} onChange={(e) => updateField("oilLevelStart", e.target.value)} placeholder="5" />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, marginBottom: 10 }}>
                    <input type="checkbox" checked={form.oilAdded} onChange={(e) => updateField("oilAdded", e.target.checked)} />
                    Oil Added
                  </label>
                  <input style={fieldStyle(!form.oilAdded)} disabled={!form.oilAdded} type="number" step="50" value={form.oilQty} onChange={(e) => updateField("oilQty", e.target.value)} placeholder="Oil Added (ml)" />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Fuel Added (L)</label>
                <input style={fieldStyle()} type="number" step="1" value={form.fuelAdded} onChange={(e) => updateField("fuelAdded", e.target.value)} placeholder="32" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Fuel Remaining (L)</label>
                <input style={fieldStyle()} type="number" step="1" value={form.fuelRemaining} onChange={(e) => updateField("fuelRemaining", e.target.value)} placeholder="48" />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Defect / Snag</label>
              <textarea style={{ ...fieldStyle(), minHeight: 90, resize: "vertical" }} value={form.defect} onChange={(e) => updateField("defect", e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>Pilot Remarks</label>
              <textarea style={{ ...fieldStyle(), minHeight: 90, resize: "vertical" }} value={form.remarks} onChange={(e) => updateField("remarks", e.target.value)} placeholder="Optional" />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button type="submit" style={{ padding: "12px 18px", borderRadius: 12, border: "none", background: "#2563eb", color: "white", fontWeight: 700, cursor: "pointer" }}>
                Save Entry
              </button>
              {message && (
                <div style={{ color: message.includes("required") || message.includes("Invalid") || message.includes("must") ? "#b91c1c" : "#166534", fontWeight: 600 }}>
                  {message}
                </div>
              )}
            </div>
          </form>
        </div>

        <div style={{ ...cardStyle(), marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>History</div>
          <input style={{ ...fieldStyle(), marginBottom: 14 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by pilot, date, airport, defect or remarks" />
          {filteredEntries.length === 0 ? (
            <div style={{ color: "#64748b" }}>No entries yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filteredEntries.map((entry) => (
                <div key={entry.id} style={{ ...cardStyle(), background: "#fcfcfd" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{entry.pilot}</div>
                      <div style={{ color: "#64748b", marginTop: 4 }}>{entry.date}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteEntry(entry.id)}
                      style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c", fontWeight: 700, cursor: "pointer", height: 42 }}
                    >
                      Delete
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 14 }}>
                    <div><strong>Route:</strong> {entry.originAirport} → {entry.destinationAirport}</div>
                    <div><strong>Tach:</strong> {entry.tachStart} → {entry.tachEnd}</div>
                    <div><strong>Tach Difference:</strong> {entry.flightTime} h</div>
                    <div><strong>Landings:</strong> {entry.landings}</div>
                    <div><strong>Fuel:</strong> +{entry.fuelAdded} L / {entry.fuelRemaining} L remaining</div>
                    <div><strong>Oil Start:</strong> {entry.oilLevelStart} / 7</div>
                    <div><strong>Oil Added:</strong> {entry.oilAdded ? `${entry.oilQty} ml` : "No"}</div>
                  </div>
                  {entry.defect && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa" }}>
                      <strong>Defect / Snag:</strong> {entry.defect}
                    </div>
                  )}
                  {entry.remarks && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                      <strong>Pilot Remarks:</strong> {entry.remarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}