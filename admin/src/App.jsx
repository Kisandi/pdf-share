import React, { useState } from 'react';

const brandBlue = '#2563eb';
const input = { border:'1px solid #cbd5e1', padding:'10px 12px', borderRadius:10, outline:'none', minWidth:260 };
const btn = { background:brandBlue, color:'#fff', border:'none', borderRadius:10, padding:'10px 14px', cursor:'pointer', fontWeight:600 };

const API = import.meta.env.VITE_API_BASE;

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('ADMIN_TOKEN') || '');
  const [logged, setLogged] = useState(!!localStorage.getItem('ADMIN_TOKEN'));
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  function login(e) {
    e.preventDefault();
    localStorage.setItem('ADMIN_TOKEN', token);
    setLogged(true);
    setMsg('Admin mode enabled.');
  }
  function logout() {
    localStorage.removeItem('ADMIN_TOKEN');
    setLogged(false);
    setMsg('Admin mode disabled.');
  }
  async function upload() {
    if (!file) return;
    setBusy(true); setMsg('');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API}/api/upload`, {
      method:'POST',
      headers:{ Authorization:`Bearer ${localStorage.getItem('ADMIN_TOKEN') || ''}` },
      body: form
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      setMsg(err.error || 'Upload failed');
    } else {
      setMsg('Uploaded!');
      setFile(null);
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight:'100dvh', display:'grid', placeItems:'start center', padding:'24px', background:'#fff' }}>
      <div style={{ width:'100%', maxWidth:720 }}>
        <h1 style={{ margin:0, color:brandBlue, fontFamily:'system-ui,sans-serif' }}>PDF Admin</h1>
        <p style={{ color:'#334155' }}>Upload PDFs (white + blue, minimal).</p>

        {!logged ? (
          <form onSubmit={login} style={{ display:'flex', gap:8, flexWrap:'wrap', border:'1px solid #dbeafe', padding:16, borderRadius:12 }}>
            <input type="password" placeholder="Admin password" value={token} onChange={e=>setToken(e.target.value)} style={input} />
            <button type="submit" style={btn}>Enable Admin</button>
            <p style={{ margin:0, color:'#64748b', fontSize:12 }}>This must match the server’s ADMIN_SECRET.</p>
          </form>
        ) : (
          <div style={{ border:'1px solid #dbeafe', padding:16, borderRadius:12, display:'grid', gap:10 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <input type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0] || null)} style={input} />
              <button disabled={busy || !file} onClick={upload} style={btn}>{busy ? 'Uploading…' : 'Upload PDF'}</button>
              <button onClick={logout} style={{ ...btn, background:'#e2e8f0', color:'#111827' }}>Disable Admin</button>
            </div>
            {msg && <p style={{ margin:0, color:'#0f766e' }}>{msg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
