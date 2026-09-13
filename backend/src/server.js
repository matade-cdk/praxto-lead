import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { services } from '../../frontend/src/constants.js';
const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5500')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function createFirebaseApp() {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      projectId: process.env.FIREBASE_PROJECT_ID || 'praxto-leads'
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || 'praxto-leads'
  });
}

const firestore = getFirestore(createFirebaseApp());
const firebaseAuth = getAuth();
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '16kb' }));

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.post('/api/leads', async (request, response) => {
  const { name, business, email, phone, service, message } = request.body || {};
  const normalizedLead = {
    name: typeof name === 'string' ? name.trim() : '',
    business: typeof business === 'string' ? business.trim() : '',
    email: typeof email === 'string' ? email.trim().toLowerCase() : '',
    phone: typeof phone === 'string' ? phone.trim() : '',
    service: typeof service === 'string' ? service.trim() : '',
    message: typeof message === 'string' ? message.trim() : ''
  };

  const errors = validateLead(normalizedLead);
  if (errors.length > 0) {
    return response.status(400).json({ error: 'Invalid enquiry', fields: errors });
  }

  try {
    const leadReference = await firestore.collection('leads').add({
      ...normalizedLead,
      status: 'new',
      createdAt: Timestamp.now()
    });

    return response.status(201).json({ id: leadReference.id, message: 'Enquiry submitted' });
  } catch (error) {
    console.error('Failed to save lead:', error.message);
    return response.status(500).json({ error: 'Unable to save enquiry' });
  }
});

app.get('/api/admin/leads', requireAdmin, async (_request, response) => {
  try {
    const snapshot = await firestore.collection('leads').orderBy('createdAt', 'desc').get();
    return response.json(snapshot.docs.map((document) => serializeLead(document)));
  } catch (error) {
    console.error('Failed to list leads:', error.message);
    return response.status(500).json({ error: 'Unable to load leads' });
  }
});

app.post('/api/admin/leads', requireAdmin, async (request, response) => {
  const lead = normalizeLead(request.body || {});
  const errors = validateLead(lead);
  if (errors.length > 0) return response.status(400).json({ error: 'Invalid lead', fields: errors });

  try {
    const reference = await firestore.collection('leads').add({
      ...lead,
      status: request.body.status || 'new',
      createdAt: Timestamp.now()
    });
    return response.status(201).json({ id: reference.id });
  } catch (error) {
    console.error('Failed to create lead:', error.message);
    return response.status(500).json({ error: 'Unable to create lead' });
  }
});

app.patch('/api/admin/leads/:id', requireAdmin, async (request, response) => {
  const lead = normalizeLead(request.body || {});
  const errors = validateLead(lead);
  if (errors.length > 0) return response.status(400).json({ error: 'Invalid lead', fields: errors });

  try {
    const reference = firestore.collection('leads').doc(request.params.id);
    await reference.update({ ...lead, status: request.body.status || 'new', updatedAt: Timestamp.now() });
    return response.json({ id: reference.id });
  } catch (error) {
    console.error('Failed to update lead:', error.message);
    return response.status(500).json({ error: 'Unable to update lead' });
  }
});

app.delete('/api/admin/leads/:id', requireAdmin, async (request, response) => {
  try {
    await firestore.collection('leads').doc(request.params.id).delete();
    return response.status(204).send();
  } catch (error) {
    console.error('Failed to delete lead:', error.message);
    return response.status(500).json({ error: 'Unable to delete lead' });
  }
});

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' });
});

app.listen(port, async () => {
  console.log(`Praxto leads API listening on port ${port}`);
  await ensureAdminUser();
});

function validateLead(lead) {
  const errors = [];
  if (!lead.name) errors.push('name');
  if (!lead.business) errors.push('business');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) errors.push('email');
  if (!/^[6-9]\d{9}$/.test(lead.phone)) errors.push('phone');
  if (!lead.service || !services.some((s) => s[0] === lead.service)) errors.push('service');
  if (lead.message.length < 10 || lead.message.length > 500) errors.push('message');
  return errors;
}

function normalizeLead(body) {
  return {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    business: typeof body.business === 'string' ? body.business.trim() : '',
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
    phone: typeof body.phone === 'string' ? body.phone.trim() : '',
    service: typeof body.service === 'string' ? body.service.trim() : '',
    message: typeof body.message === 'string' ? body.message.trim() : ''
  };
}

function serializeLead(document) {
  const data = document.data();
  return {
    id: document.id,
    ...data,
    createdAt: data.createdAt?.toDate?.().toISOString() || null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() || null
  };
}

async function requireAdmin(request, response, next) {
  const authorization = request.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return response.status(401).json({ error: 'Authentication required' });

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    if (decodedToken.email?.toLowerCase() !== adminEmail) {
      return response.status(403).json({ error: 'Admin access required' });
    }
    return next();
  } catch (error) {
    return response.status(401).json({ error: 'Invalid authentication token' });
  }
}

async function ensureAdminUser() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return;

  try {
    await firebaseAuth.getUserByEmail(adminEmail);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      console.error('Unable to check admin account:', error.message);
      return;
    }
    await firebaseAuth.createUser({ email: adminEmail, password, emailVerified: true });
    console.log(`Created Firebase admin account for ${adminEmail}`);
  }
}
