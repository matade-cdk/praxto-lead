import { useEffect, useState } from 'react';
import { logEvent } from 'firebase/analytics';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { analytics } from './firebase.js';
import { db } from './firebase.js';

const MAX_MESSAGE_LENGTH = 500;
const initialForm = {
  name: '',
  business: '',
  email: '',
  phone: '',
  service: '',
  message: ''
};
const services = [
  ['web-development', 'Web Development'],
  ['mobile-app-development', 'Mobile App Development'],
  ['ui-ux-design', 'UI / UX Design'],
  ['branding', 'Branding & Identity'],
  ['digital-marketing', 'Digital Marketing'],
  ['seo', 'SEO & Performance'],
  ['ecommerce', 'E-commerce Solutions'],
  ['custom-software', 'Custom Software'],
  ['other', 'Other / Not sure yet']
];

function validate(form) {
  return {
    name: !form.name.trim(),
    business: !form.business.trim(),
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()),
    phone: !/^[6-9]\d{9}$/.test(form.phone.trim()),
    service: !form.service,
    message: form.message.trim().length < 10
  };
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('praxto-theme') || 'light');
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('praxto-theme', theme);
  }, [theme]);

  function updateField(event) {
    const { name, value } = event.target;
    const nextValue = name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setForm((current) => ({ ...current, [name]: nextValue }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: false }));
  }

  function handleBlur(event) {
    const field = event.target.name;
    const nextErrors = validate(form);
    setErrors((current) => ({ ...current, [field]: nextErrors[field] }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    const firstInvalid = Object.keys(initialForm).find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    setStatus('');
    try {
      await addDoc(collection(db, 'leads'), {
        ...form,
        status: 'new',
        createdAt: serverTimestamp()
      });
      if (analytics) logEvent(analytics, 'generate_lead', { service: form.service });
      setForm(initialForm);
      setStatus('Thanks! Your enquiry has been submitted.');
    } catch {
      setStatus('We could not submit your enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <img className="page-logo" src="/asset/logo.jpg" alt="Praxto" />
        <button
          className="theme-toggle"
          type="button"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'dark'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? 'Sun' : 'Moon'}
        </button>
      </header>

      <section className="card">
        <aside className="panel">
          <div>
            <p className="eyebrow">Prax<span>to</span> studio</p>
            <h1>Tell us what you are building.</h1>
            <p>Share a few details about your project and someone from Praxto will follow up within one business day.</p>
            <ul className="panel-list">
              <li>Web & product design</li>
              <li>Mobile & software development</li>
              <li>Brand & digital marketing</li>
              <li>SEO & performance</li>
            </ul>
          </div>
          <div className="dot-row" aria-hidden="true">
            {['#E4483A', '#F2A93B', '#F5D949', '#4CAF6D', '#2D9CDB', '#8B5CF6'].map((color) => <span key={color} style={{ background: color }} />)}
          </div>
        </aside>

        <div className="form-side">
          <h2>Start an enquiry</h2>
          <p className="lede">Tell us about your project and our team will get back to you.</p>
          <form onSubmit={handleSubmit} noValidate>
            <div className="field-row">
              <Field label="Name" name="name" value={form.name} placeholder="Rahul Sharma" error={errors.name} onChange={updateField} onBlur={handleBlur} message="Enter your name." />
              <Field label="Business name" name="business" value={form.business} placeholder="Sharma Enterprises" error={errors.business} onChange={updateField} onBlur={handleBlur} message="Enter your business name." />
            </div>
            <div className="field-row">
              <Field label="Email" name="email" type="email" value={form.email} placeholder="rahul@gmail.com" error={errors.email} onChange={updateField} onBlur={handleBlur} message="Enter a valid email address." />
              <Field label={<>Phone <span className="field-hint">Indian mobile</span></>} name="phone" type="tel" value={form.phone} placeholder="9876543210" error={errors.phone} onChange={updateField} onBlur={handleBlur} prefix="+91" hint="10-digit mobile number" message="Enter a valid 10-digit Indian mobile number." />
            </div>
            <Field label="Service required" name="service" value={form.service} error={errors.service} onChange={updateField} onBlur={handleBlur} message="Select a service." select>
              <option value="" disabled>Select a service</option>
              {services.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Field>
            <Field label="Message" name="message" value={form.message} error={errors.message} onChange={updateField} onBlur={handleBlur} message="Please describe your project (at least 10 characters)." textarea counter />
            <button className="submit-btn" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit enquiry'}</button>
            {status && <p className={`status ${status.startsWith('Thanks') ? 'success' : 'failure'}`} role="status">{status}</p>}
          </form>
        </div>
      </section>
    </main>
  );
}

function Field({ label, name, value, type = 'text', placeholder, error, onChange, onBlur, message, prefix, hint, select, textarea, counter, children }) {
  const inputProps = { id: name, name, value, onChange, onBlur, placeholder, 'aria-invalid': error || undefined, 'aria-describedby': `${name}-error` };
  return (
    <div className={`field ${error ? 'is-invalid' : ''}`}>
      <div className="field-label-row"><label htmlFor={name}>{label}</label>{counter && <span className="char-count">{value.length} / {MAX_MESSAGE_LENGTH}</span>}</div>
      {select ? <select {...inputProps}>{children}</select> : textarea ? <textarea {...inputProps} rows="5" maxLength={MAX_MESSAGE_LENGTH} /> : <div className={prefix ? 'phone-wrap' : undefined}>{prefix && <span className="phone-prefix">{prefix}</span>}<input {...inputProps} type={type} maxLength={name === 'phone' ? 10 : undefined} /></div>}
      {hint && <span className="field-hint-text">{hint}</span>}
      {error && <span className="error-msg" id={`${name}-error`} role="alert">{message}</span>}
    </div>
  );
}

export default App;
