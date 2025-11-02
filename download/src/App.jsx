import React, { useEffect, useState } from 'react';

const brandBlue = '#2563eb';
const btn = { background:brandBlue, color:'#fff', border:'none', borderRadius:10, padding:'8px 12px', cursor:'pointer', fontWeight:600 };

const API = import.meta.env.VITE_API_BASE;

export default function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`${API}/api/files`);
    const data = await res.json();
    setFiles(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div style={{ minHeight:'100dvh', display:'grid', placeItems:'start center', padding:'24px', background:'#fff' }}>
      <div style={{ width:'100%', maxWidth:880 }}>
        <h1 style={{ margin:0, color:brandBlue, fontFamily:'system-ui,sans-serif' }}>PDF Downloads</h1>
        <p style={{ color:'#334155' }}>Anyone can download the uploaded PDFs.</p>

        <div style={{ margin:'12px 0' }}>
          <button onClick={load} style={btn}>Refresh</button>
        </div>

        {loading ? (
          <p style={{ color:'#64748b' }}>Loading…</p>
        ) : files.length === 0 ? (
          <p style={{ color:'#64748b' }}>No files yet.</p>
        ) : (
          <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:10 }}>
            {files.map(f => (
              <li key={f.id} style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:600, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {f.originalName}
                    </div>
                    <div style={{ fontSize:12, color:'#64748b' }}>
                      {(f.size/1024).toFixed(1)} KB • {new Date(f.uploadedAt).toLocaleString()}
                    </div>
                  </div>
                  <a href={`${API}/api/files/${f.id}`} style={{ ...btn, textDecoration:'none' }} download>Download</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
