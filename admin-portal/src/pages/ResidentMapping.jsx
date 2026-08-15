import { useEffect, useState } from "react";
import {
    getResidentDirectory,
    getSocieties,
    getBlocks,
    getFlats,
    mapResidentToFlat,
} from "../services/residentService";

const COLORS = {
    bg: "#040710",
    surface: "rgba(17, 15, 15, 0.04)",
    border: "rgba(255,255,255,0.09)",
    text: "#575957",
    muted: "#8b96b3",
    accent: "#f5a524",
    accent2: "#22d3ee",
    success: "#34d399",
};

export default function ResidentMapping() {
    const [residents, setResidents] = useState([]);
    const [selectedResident, setSelectedResident] = useState(null);

    const [societies, setSocieties] = useState([]);
    const [blocks, setBlocks] = useState([]);
    const [flats, setFlats] = useState([]);

    const [selectedSociety, setSelectedSociety] = useState("");
    const [selectedBlock, setSelectedBlock] = useState("");
    const [selectedFlat, setSelectedFlat] = useState("");

    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        getResidentDirectory().then((res) => setResidents(res.data));
        getSocieties().then((res) => setSocieties(res.data.results ?? res.data));
    }, []);

    const handleSocietyChange = (id) => {
        setSelectedSociety(id);
        setSelectedBlock("");
        setSelectedFlat("");
        setFlats([]);
        if (id) getBlocks(id).then((res) => setBlocks(res.data.results ?? res.data));
    };

    const handleBlockChange = (id) => {
        setSelectedBlock(id);
        setSelectedFlat("");
        if (id) getFlats(id).then((res) => setFlats(res.data.results ?? res.data));
    };

    const handleSubmit = async () => {
        if (!selectedResident || !selectedFlat) {
            setMessage("Select a resident and a flat first");
            return;
        }
        setSubmitting(true);
        setMessage("");
        try {
            await mapResidentToFlat(selectedResident, selectedFlat);
            setMessage("Resident mapped successfully!");
            const res = await getResidentDirectory();
            setResidents(res.data);
        } catch (err) {
            setMessage(err.response?.data?.error || "Mapping failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <h1 style={styles.heading}>Resident–Flat Mapping</h1>
                <p style={{ color: COLORS.muted, marginBottom: 28 }}>
                    Manually assign a resident to a flat
                </p>

                {message && <div style={styles.message}>{message}</div>}

                <div style={styles.card}>
                    <label style={styles.label}>Select Resident</label>
                    <select
                        style={styles.select}
                        value={selectedResident || ""}
                        onChange={(e) => setSelectedResident(e.target.value)}
                    >
                        <option value="">-- Choose Resident --</option>
                        {residents.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.first_name} {r.last_name} ({r.email})
                                {r.flat_number ? ` — currently: Flat ${r.flat_number}` : " — unmapped"}
                            </option>
                        ))}
                    </select>

                    <label style={styles.label}>Society</label>
                    <select
                        style={styles.select}
                        value={selectedSociety}
                        onChange={(e) => handleSocietyChange(e.target.value)}
                    >
                        <option value="">-- Choose Society --</option>
                        {societies.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>

                    {selectedSociety && (
                        <>
                            <label style={styles.label}>Block / Tower</label>
                            <select
                                style={styles.select}
                                value={selectedBlock}
                                onChange={(e) => handleBlockChange(e.target.value)}
                            >
                                <option value="">-- Choose Block --</option>
                                {blocks.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </>
                    )}

                    {selectedBlock && (
                        <>
                            <label style={styles.label}>Flat</label>
                            <select
                                style={styles.select}
                                value={selectedFlat}
                                onChange={(e) => setSelectedFlat(e.target.value)}
                            >
                                <option value="">-- Choose Flat --</option>
                                {flats.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.flat_number} (Floor {f.floor})
                                    </option>
                                ))}
                            </select>
                        </>
                    )}

                    <button style={styles.button} onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Mapping..." : "Assign Flat"}
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: { minHeight: "100vh", background: COLORS.bg, padding: "36px 24px", fontFamily: "sans-serif" },
    container: { maxWidth: 560, margin: "0 auto" },
    heading: { color: COLORS.text, fontSize: 26, fontWeight: 700, margin: 0 },
    card: {
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: 18, padding: 24, backdropFilter: "blur(18px)",
    },
    label: { display: "block", color: COLORS.muted, fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 6 },
    select: {
        width: "100%", padding: "11px 14px", borderRadius: 10,
        background: "rgba(10, 5, 5, 0.06)", border: `1px solid ${COLORS.border}`,
        color: COLORS.text, fontSize: 14, outline: "none",
    },
    button: {
        width: "100%", marginTop: 26, padding: "13px", borderRadius: 10,
        background: COLORS.accent, color: "#1a1200", border: "none",
        fontWeight: 700, fontSize: 14, cursor: "pointer",
    },
    message: {
        background: "rgba(7, 24, 18, 0.12)", border: "1px solid rgba(52,211,153,0.35)",
        color: COLORS.success, padding: "10px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13,
    },
};