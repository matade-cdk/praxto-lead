import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';

const emptyLead = { name: '', business: '', email: '', phone: '', service: '', message: '', status: 'new' };
import { services as serviceOptions, getServiceLabel, formatTimestamp } from '../constants.js';

function AdminApp() {
  const [user, setUser] = useState(undefined);
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('');
  const [leads, setLeads] = useState([]);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (user) loadLeads();
  }, [user]);

  async function loadLeads() {
    try {
      const snapshot = await getDocs(query(collection(db, 'leads'), orderBy('createdAt', 'desc')));
      setLeads(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
    } catch (error) {
      setStatus('Unable to load leads. Check your Firebase permissions.');
    }
  }

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword('');
    } catch {
      setStatus('Login failed. Check the admin email and password.');
    } finally {
      setBusy(false);
    }
  }

  async function saveLead(event) {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const leadData = { ...editing, updatedAt: serverTimestamp() };
      delete leadData.id;
      if (editing.id) {
        await updateDoc(doc(db, 'leads', editing.id), leadData);
      } else {
        await addDoc(collection(db, 'leads'), { ...leadData, createdAt: serverTimestamp() });
      }
      setEditing(null);
      await loadLeads();
    } catch (error) {
      setStatus('Unable to save lead. Check your Firebase permissions.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteLead(id) {
    if (!window.confirm('Delete this lead permanently?')) return;
    try {
      await deleteDoc(doc(db, 'leads', id));
      await loadLeads();
    } catch (error) {
      setStatus('Unable to delete lead. Check your Firebase permissions.');
    }
  }

  if (user === undefined) return <main className="admin-shell"><p>Checking access...</p></main>;
  if (!user) return <Login email={email} password={password} setEmail={setEmail} setPassword={setPassword} onSubmit={login} busy={busy} status={status} />;

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><p className="eyebrow">Praxto / admin</p><h1>Lead desk</h1><p className="admin-subtitle">Manage every enquiry from one place.</p></div>
        <button className="secondary-button" onClick={() => signOut(auth)}>Sign out</button>
      </header>
      <div className="admin-toolbar"><strong>{leads.length} enquiries</strong><button className="primary-button" onClick={() => setEditing({ ...emptyLead })}>New lead</button></div>
      {status && <p className="admin-status">{status}</p>}
      {editing && <LeadEditor lead={editing} setLead={setEditing} onSubmit={saveLead} onCancel={() => setEditing(null)} busy={busy} />}
      <section className="lead-list">
        {leads.length === 0 ? <p className="empty-state">No enquiries yet.</p> : leads.map((lead) => (
          <article className="lead-row" key={lead.id}>
            <div className="lead-details">
              <div className="lead-header">
                <span className="lead-name">
                  {lead.name}
                  {lead.business && <span className="lead-business">({lead.business})</span>}
                </span>
                <span className={`badge badge-${lead.status}`}>{lead.status}</span>
              </div>
              <div className="lead-meta">
                <span className="meta-item">📧 {lead.email}</span>
                {lead.phone && <span className="meta-item">📞 {lead.phone}</span>}
                <span className="meta-item">💼 {getServiceLabel(lead.service)}</span>
                <span className="meta-item">🕒 {formatTimestamp(lead.createdAt)}</span>
              </div>
            </div>
            <div className="row-actions">
              <button className="secondary-button" onClick={() => setEditing({ ...lead })}>Edit</button>
              <button className="danger-button" onClick={() => deleteLead(lead.id)}>Delete</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Login({ email, password, setEmail, setPassword, onSubmit, busy, status }) {
  return <main className="admin-login"><form className="login-card" onSubmit={onSubmit}><p className="eyebrow">Praxto / private</p><h1>Admin access</h1><p>Sign in to manage submitted enquiries.</p><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label><button className="primary-button" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>{status && <p className="admin-status">{status}</p>}</form></main>;
}

function LeadEditor({ lead, setLead, onSubmit, onCancel, busy }) {
  const update = (event) => setLead({ ...lead, [event.target.name]: event.target.value });
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') onCancel(); }}>
      <form className="editor" onSubmit={onSubmit}>
        <div className="editor-heading">
          <h2>{lead.id ? 'Edit lead' : 'Create lead'}</h2>
          <button type="button" className="secondary-button" onClick={onCancel}>Close</button>
        </div>
        <div className="editor-grid">
          {[['name', 'Name'], ['business', 'Business'], ['email', 'Email'], ['phone', 'Phone']].map(([name, label]) => <label key={name}>{label}<input name={name} value={lead[name] || ''} onChange={update} required /></label>)}
          <label>Service<select name="service" value={lead.service || ''} onChange={update} required><option value="" disabled>Select a service</option>{serviceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Status<select name="status" value={lead.status || 'new'} onChange={update}><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="closed">Closed</option></select></label>
        </div>
        <label>Message<textarea name="message" value={lead.message || ''} onChange={update} rows="5" required /></label>
        <button className="primary-button" disabled={busy}>{busy ? 'Saving...' : 'Save lead'}</button>
      </form>
    </div>
  );
}

export default AdminApp;
