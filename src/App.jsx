import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, setPersistence, browserLocalPersistence,
} from 'firebase/auth';
import {
  getFirestore, collection, addDoc, onSnapshot, doc, setDoc,
  getDoc, deleteDoc, getDocs
} from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';
import {
  Calendar, Users, Settings, Scissors, CheckCircle, Loader2, Copy,
  MessageCircle, Trash2, ChevronLeft, ChevronRight, Plus, X, Tag,
  Clock, Sparkles, Phone, CalendarCheck, User, LogOut, Edit2,
  Briefcase, ArrowLeft, Star, Mail, Lock, Eye, EyeOff, Camera, Image, Link, Search, Smartphone, CreditCard, Zap, Shield, Menu,
  BarChart2, TrendingUp, ShoppingBag, Building2, DollarSign, AlertTriangle, Bell
} from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyDOeYP0MbVXKWjWhzcHJ7O0voHgk3spnNI",
  authDomain: "hutex-2026.firebaseapp.com",
  projectId: "hutex-2026",
  storageBucket: "hutex-2026.firebasestorage.app",
  messagingSenderId: "524847309009",
  appId: "1:524847309009:web:3ee21e8b44c7765403e5f0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
const db = getFirestore(app);
let messaging = null;
try { messaging = getMessaging(app); } catch (_) { /* not supported in this env */ }
const FCM_VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY || '';
const APP_ID = 'hutex-saas';
const BACKEND_URL = "/.netlify/functions";
const PROF_COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#db2777','#0891b2','#64748b'];

// ── Cloudinary config ─────────────────────────────────────
const CLOUDINARY_CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD  || 'dwfkovv5z';
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || 'hute_uploads';

async function uploadToCloudinary(file) {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) {
    throw new Error('Configure VITE_CLOUDINARY_CLOUD e VITE_CLOUDINARY_PRESET nas variáveis de ambiente do Netlify.');
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  fd.append('folder', 'hute');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST', body: fd,
  });
  if (!res.ok) throw new Error('Falha no upload da imagem.');
  const data = await res.json();
  return data.secure_url;
}

// ── ImageUpload component ─────────────────────────────────
function ImageUpload({ value, onChange, aspect = 'cover', label = '' }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (aspect === 'cover') {
    return (
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className="relative w-full h-44 rounded-2xl overflow-hidden cursor-pointer group bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-dashed border-slate-200 hover:border-violet-300 transition-colors"
      >
        {value
          ? <img src={value} alt="Capa" className="w-full h-full object-cover" />
          : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 group-hover:text-violet-500 transition-colors">
              <Camera className="w-8 h-8" />
              <span className="text-xs font-semibold">Adicionar foto de capa</span>
              <span className="text-[10px]">JPG, PNG · recomendado 1200×400px</span>
            </div>
          )
        }
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        {value && !uploading && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/60 text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <Camera className="w-3 h-3" />Alterar
            </div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  if (aspect === 'logo') {
    return (
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className="relative w-20 h-20 rounded-2xl overflow-hidden cursor-pointer group bg-gradient-to-br from-violet-50 to-slate-100 border-2 border-dashed border-slate-200 hover:border-violet-300 transition-colors flex-shrink-0"
      >
        {value
          ? <img src={value} alt="Logo" className="w-full h-full object-cover" />
          : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-violet-500 transition-colors gap-1">
              <Image className="w-6 h-6" />
              <span className="text-[9px] font-semibold text-center leading-tight px-1">Logo</span>
            </div>
          )
        }
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
        {value && !uploading && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  // Square thumbnail (for services)
  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      className="relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer group bg-violet-50 border-2 border-dashed border-slate-200 hover:border-violet-300 transition-colors flex-shrink-0"
    >
      {value
        ? <img src={value} alt="" className="w-full h-full object-cover" />
        : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 group-hover:text-violet-400 transition-colors">
            <Camera className="w-5 h-5" />
          </div>
        )
      }
      {uploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────
function fmtData(iso) { return iso ? iso.split('-').reverse().join('/') : ''; }

function fmtDuracao(min) {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`;
}

function gerarHorarios(inicio, fim, intervalo) {
  const slots = [];
  let [h, m] = inicio.split(':').map(Number);
  const [hf, mf] = fim.split(':').map(Number);
  while (h < hf || (h === hf && m < mf)) {
    slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    m += Number(intervalo);
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
}

function newId() { return Math.random().toString(36).substr(2, 9); }

function toDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }

function profPath(uid, profId) {
  return `artifacts/${APP_ID}/public/data/prof_cals/${uid}_${profId}`;
}

// ── App root ──────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [staffRecord, setStaffRecord] = useState(null); // { lojaId, profissionalId, nome }
  const [lojaProfile, setLojaProfile] = useState({});   // used by staff + client portal
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isClientMode, setIsClientMode] = useState(false);
  const [resolvedLojaUid, setResolvedLojaUid] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [deepLinkApptId, setDeepLinkApptId] = useState(null);
  const [deepLinkToken, setDeepLinkToken] = useState(null);

  const fetchProfile = useCallback(async (uid) => {
    const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', uid));
    if (snap.exists()) { setProfile(snap.data()); return snap.data(); }
    setProfile(null); return null;
  }, []);

  useEffect(() => {
    const raw = window.location.hash.replace('#', '').trim();
    const hash = raw.toLowerCase();

    // ── Master admin panel: /#admin ──────────────────────
    if (hash === 'admin') {
      setIsAdminMode(true);
      setAuthLoading(false);
      return;
    }

    // ── Invite link: /#invite/TOKEN ──────────────────────
    if (hash.startsWith('invite/')) {
      setInviteToken(raw.replace(/^invite\//i, ''));
      setAuthLoading(false);
      return;
    }

    // ── Deep link: /#slug/agendamento/ID?token=TOKEN ─────
    const qIdx = raw.indexOf('?');
    const rawPath = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
    const rawQuery = qIdx >= 0 ? raw.slice(qIdx) : '';
    const hashParams = new URLSearchParams(rawQuery);
    const apptLinkMatch = rawPath.match(/^([^/]+)\/agendamento\/([^/]+)$/i);
    if (apptLinkMatch) {
      const slugPart = apptLinkMatch[1].toLowerCase();
      const apptId = apptLinkMatch[2];
      setDeepLinkApptId(apptId);
      setDeepLinkToken(hashParams.get('token') || null);
      getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'slugs', slugPart))
        .then(snap => {
          if (snap.exists()) {
            const uid = snap.data().uid;
            setResolvedLojaUid(uid);
            getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', uid))
              .then(p => { if (p.exists()) setLojaProfile(p.data()); });
            setIsClientMode(true);
          }
        })
        .catch(console.error)
        .finally(() => setAuthLoading(false));
      return;
    }

    // ── Client portal: /#slug ────────────────────────────
    if (hash) {
      getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'slugs', hash))
        .then(snap => {
          if (snap.exists()) {
            const uid = snap.data().uid;
            setResolvedLojaUid(uid);
            getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', uid))
              .then(p => { if (p.exists()) setLojaProfile(p.data()); });
            setIsClientMode(true);
          }
        })
        .catch(console.error)
        .finally(() => setAuthLoading(false));
      return;
    }

    // ── Admin / Staff auth ───────────────────────────────
    const unsub = onAuthStateChanged(auth, async (u) => {
      // HuteMasterAdmin handles its own auth — skip here
      if (window.location.hash.replace('#', '').trim().toLowerCase() === 'admin') {
        setAuthLoading(false);
        return;
      }
      try {
        if (u && !u.isAnonymous) {
          setAuthLoading(true); // keep loading screen while we verify profile
          const params = new URLSearchParams(window.location.search);
          if (params.get('success')) window.history.replaceState({}, '', window.location.pathname);
          if (params.get('error')) {
            alert(`Erro Google Agenda: ${params.get('msg') || params.get('error')}`);
            window.history.replaceState({}, '', window.location.pathname);
          }
          setUser(u);

          // Handle Stripe return
          if (params.get('stripe_success')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
          if (params.get('stripe_cancel')) {
            window.history.replaceState({}, '', window.location.pathname);
          }

          // Check if this is a staff (professional) account
          const staffSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'staff', u.uid));
          if (staffSnap.exists()) {
            const sr = staffSnap.data();
            setStaffRecord(sr);
            const lp = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', sr.lojaId));
            if (lp.exists()) setLojaProfile(lp.data());
          } else {
            let p = await fetchProfile(u.uid);
            // Backfill createdAt from Firebase Auth if missing (migration for pre-existing profiles)
            if (p && !p.createdAt && u.metadata?.creationTime) {
              const createdAt = new Date(u.metadata.creationTime).toISOString();
              await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', u.uid), { createdAt }, { merge: true });
              p = { ...p, createdAt };
              setProfile(p);
            }
            if (!p) {
              // No admin profile — check if this is a B2C client account on admin URL
              try {
                const clientSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clientAccounts', u.uid));
                if (clientSnap.exists()) {
                  // Client account — don't sign out (would break client portal); just hide admin UI
                  setUser(null); setProfile(null);
                }
              } catch { /* ignore — treat as new admin */ }
            }
          }
        } else {
          setUser(null); setProfile(null); setStaffRecord(null);
        }
      } catch (err) {
        console.error('Auth flow error:', err);
        setUser(null); setProfile(null); setStaffRecord(null);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, [fetchProfile]);

  const Loading = () => (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #6C3CE1 0%, #4F21A8 100%)', display: 'flex', flexDirection: 'column' }}>
      {/* Safe-area spacer roxo */}
      <div style={{ height: 'env(safe-area-inset-top)', flexShrink: 0, background: 'linear-gradient(135deg, #6C3CE1 0%, #4F21A8 100%)' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logosplash.svg" alt="hute" className="w-56 mb-8" />
        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
      </div>
    </div>
  );

  if (authLoading) return <Loading />;
  if (isAdminMode) return <HuteMasterAdmin />;
  if (inviteToken) return <InviteAcceptScreen token={inviteToken} onDone={() => setInviteToken(null)} />;
  if (isClientMode) return <ClientPortal lojaUid={resolvedLojaUid} profile={lojaProfile} deepLinkApptId={deepLinkApptId} deepLinkToken={deepLinkToken} />;
  if (!user) return <LoginScreen />;
  if (staffRecord) return <StaffPanel user={user} staffRecord={staffRecord} lojaProfile={lojaProfile} />;
  if (!profile) return <OnboardingScreen user={user} onComplete={p => setProfile(p)} />;
  const _createdAt = profile.createdAt || user.metadata?.creationTime;
  const _trialByCreation = !profile.plan && _createdAt &&
    (Date.now() - new Date(_createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
  const _trialByERP = profile.status === 'trial' && profile.trialUntil && new Date(profile.trialUntil) > new Date();
  const _trialActive = _trialByCreation || _trialByERP;
  if (profile.status !== 'active' && !_trialActive) {
    return <PlansScreen user={user} profile={profile} onActivated={async () => {
      const p = await fetchProfile(user.uid);
      setProfile(p);
    }} />;
  }
  return <AdminPanel user={user} profile={profile} setProfile={setProfile} fetchProfile={fetchProfile} />;
}

// ── Plan Limits Hook ──────────────────────────────────────
function usePlanLimits(profile) {
  return useMemo(() => {
    const plan = profile?.plan;
    const createdAt = profile?.createdAt;
    const trialByCreation = !plan && createdAt &&
      (Date.now() - new Date(createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
    const trialByERP = profile?.status === 'trial' && profile?.trialUntil && new Date(profile.trialUntil) > new Date();
    const trialActive = trialByCreation || trialByERP;
    const trialDaysLeft = trialActive
      ? trialByERP
        ? Math.ceil((new Date(profile.trialUntil) - Date.now()) / 86400000)
        : Math.ceil((7 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(createdAt).getTime())) / 86400000)
      : 0;
    const effectivePlan = plan || (trialActive ? 'premium' : 'starter');
    return {
      effectivePlan,
      isTrial: !!trialActive,
      trialDaysLeft,
      maxProfissionals: effectivePlan === 'pro' ? Infinity : effectivePlan === 'premium' ? 5 : 1,
      maxAppointmentsPerMonth: effectivePlan === 'starter' ? 100 : Infinity,
      hasGoogleCalendar: effectivePlan === 'premium' || effectivePlan === 'pro',
    };
  }, [profile?.plan, profile?.createdAt, profile?.status, profile?.trialUntil]);
}

// ── Upgrade Modal ─────────────────────────────────────────
function PlansCheckoutCard({ plan, lojaId, Icon }) {
  const [loading, setLoading] = useState(false);
  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/stripeCheckout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId, priceId: plan.priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  };
  const isHighlight = plan.highlight;
  return (
    <div className={`rounded-2xl p-4 ${isHighlight ? 'bg-emerald-50 ring-2 ring-emerald-400' : 'bg-slate-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isHighlight ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            <Icon className={`w-4 h-4 ${isHighlight ? 'text-emerald-600' : 'text-slate-500'}`} />
          </div>
          <div>
            <span className={`font-black text-sm ${isHighlight ? 'text-emerald-700' : 'text-slate-800'}`}>{plan.name}</span>
            {isHighlight && <span className="ml-1.5 text-[9px] bg-emerald-500 text-white font-black px-1.5 py-0.5 rounded-full">POPULAR</span>}
          </div>
        </div>
        <span className={`font-black text-base ${isHighlight ? 'text-emerald-700' : 'text-slate-800'}`}>
          {plan.price}<span className="text-xs font-normal text-slate-400">/mês</span>
        </span>
      </div>
      <ul className="space-y-1 mb-3">
        {plan.features.map(f => (
          <li key={f} className="flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${isHighlight ? 'text-emerald-500' : 'text-slate-300'}`} />{f}
          </li>
        ))}
      </ul>
      <button onClick={handleSubscribe} disabled={loading}
        className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors
          ${isHighlight ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> A processar...</> : <><CreditCard className="w-4 h-4" /> Assinar {plan.name}</>}
      </button>
    </div>
  );
}

function UpgradeModal({ lojaId, title, message, requiredPlan = 'premium', onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const targetPlan = PLANS.find(p => p.key === requiredPlan) || PLANS[1];

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/stripeCheckout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId, priceId: targetPlan.priceId }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      window.location.href = data.url;
    } catch {
      setError('Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Zap className="w-5 h-5 text-violet-600" />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <h3 className="font-black text-slate-900 text-lg mb-1">{title}</h3>
        <p className="text-sm text-slate-500 mb-5">{message}</p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="bg-violet-50 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-black text-violet-700 text-sm">{targetPlan.name}</span>
            <span className="font-black text-violet-700">{targetPlan.price}<span className="text-xs font-normal text-violet-400">/mês</span></span>
          </div>
          <ul className="space-y-1">
            {targetPlan.features.map(f => (
              <li key={f} className="flex items-center gap-1.5 text-xs text-violet-600">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />{f}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={handleUpgrade} disabled={loading}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> A processar...</> : <><CreditCard className="w-4 h-4" /> Fazer upgrade para {targetPlan.name}</>}
        </button>
        <button onClick={onClose} className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600">
          Agora não
        </button>
      </div>
    </div>
  );
}

// ── Plans Screen (Paywall) ────────────────────────────────
const PLANS = [
  {
    key: 'starter',
    priceId: 'price_1TLS3ZDUFQvcxobb6mC46BWC',
    name: 'Starter',
    price: 'R$ 69',
    period: '/mês',
    color: 'violet',
    icon: Zap,
    features: [
      'Agenda online',
      'Chatbot WhatsApp',
      '1 profissional',
      'Portal do cliente',
      'Até 100 agendamentos/mês',
    ],
  },
  {
    key: 'premium',
    priceId: 'price_1TLS2vDUFQvcxobbihForvNM',
    name: 'Premium',
    price: 'R$ 129',
    period: '/mês',
    color: 'emerald',
    icon: Star,
    highlight: true,
    features: [
      'Tudo do Starter',
      'Até 5 profissionais',
      'Google Calendar',
      'Agendamentos ilimitados',
      'Notificações automáticas',
    ],
  },
  {
    key: 'pro',
    priceId: 'price_1TLS2NDUFQvcxobbmuzorKxa',
    name: 'Pro',
    price: 'R$ 199',
    period: '/mês',
    color: 'amber',
    icon: Shield,
    features: [
      'Tudo do Premium',
      'Profissionais ilimitados',
      'Relatórios avançados',
      'Suporte prioritário',
      'White-label',
    ],
  },
];

function PlansScreen({ user, profile, onActivated }) {
  const [loading, setLoading] = useState(null); // priceId being processed
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const pollRef = useRef(null);

  // If returning from Stripe success, poll Firestore until status=active
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_success')) {
      setChecking(true);
      pollRef.current = setInterval(async () => {
        try {
          const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid));
          if (snap.exists() && snap.data().status === 'active') {
            clearInterval(pollRef.current);
            onActivated();
          }
        } catch {}
      }, 2500);
    }
    return () => clearInterval(pollRef.current);
  }, [user.uid, onActivated]);

  const handleSubscribe = async (priceId) => {
    setLoading(priceId);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/stripeCheckout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId: user.uid, priceId }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      window.location.href = data.url;
    } catch (e) {
      setError('Erro ao iniciar checkout. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const handleLogout = () => signOut(auth);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 to-violet-900 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className="text-white font-black text-xl mb-1">Verificando pagamento...</p>
        <p className="text-violet-200 text-sm text-center">Aguarde enquanto confirmamos a sua assinatura.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-violet-700 to-violet-900 p-6 pb-12">
      <div className="max-w-[480px] mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-6">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-white font-black text-3xl tracking-tight">hute</h1>
          <p className="text-violet-200 text-sm mt-2">Escolha o plano ideal para o seu negócio</p>
          {profile?.nome && (
            <p className="text-violet-300 text-xs mt-1">Olá, {profile.nome} 👋</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-4 py-3 rounded-2xl mb-4 text-center">
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="space-y-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isHighlight = plan.highlight;
            const isLoading = loading === plan.priceId;
            return (
              <div key={plan.key}
                className={`rounded-3xl p-5 ${isHighlight ? 'bg-white shadow-2xl shadow-violet-900/30 ring-2 ring-emerald-400' : 'bg-white/10 backdrop-blur-sm'}`}>
                {isHighlight && (
                  <div className="flex justify-center mb-3">
                    <span className="text-[10px] bg-emerald-500 text-white font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      Mais popular
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isHighlight ? 'bg-emerald-50' : 'bg-white/20'}`}>
                      <Icon className={`w-5 h-5 ${isHighlight ? 'text-emerald-600' : 'text-white'}`} />
                    </div>
                    <div>
                      <p className={`font-black text-base ${isHighlight ? 'text-slate-900' : 'text-white'}`}>{plan.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-black text-2xl ${isHighlight ? 'text-slate-900' : 'text-white'}`}>{plan.price}</span>
                    <span className={`text-xs ${isHighlight ? 'text-slate-400' : 'text-violet-200'}`}>{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${isHighlight ? 'text-emerald-500' : 'text-violet-300'}`} />
                      <span className={`text-xs ${isHighlight ? 'text-slate-600' : 'text-violet-100'}`}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={!!loading}
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60
                    ${isHighlight
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-white/20 hover:bg-white/30 text-white'}`}>
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> A processar...</>
                    : <><CreditCard className="w-4 h-4" /> Assinar {plan.name}</>
                  }
                </button>
              </div>
            );
          })}
        </div>

        <button onClick={handleLogout}
          className="w-full mt-6 py-3 text-violet-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5">
          <LogOut className="w-3.5 h-3.5" /> Sair da conta
        </button>
      </div>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────
function LoginScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot' | 'forgotSent'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#6C3CE1');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Este email já está registado.',
        'auth/invalid-email': 'Email inválido.',
        'auth/weak-password': 'A palavra-passe deve ter pelo menos 6 caracteres.',
        'auth/user-not-found': 'Utilizador não encontrado.',
        'auth/wrong-password': 'Palavra-passe incorreta.',
        'auth/invalid-credential': 'Credenciais inválidas. Verifique o email e palavra-passe.',
      };
      setError(msgs[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) { setError('Introduza o seu email primeiro.'); return; }
    setError(''); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMode('forgotSent');
    } catch (err) {
      setError(err.code === 'auth/user-not-found' ? 'Utilizador não encontrado.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #6C3CE1 0%, #4F21A8 100%)', display: 'flex', flexDirection: 'column' }}>
      {/* Safe-area spacer roxo */}
      <div style={{ height: 'env(safe-area-inset-top)', flexShrink: 0, background: '#6C3CE1' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-10">
          <img src="/logosplash.svg" alt="hute" className="w-52 mx-auto mb-3" />
          <p className="text-white/50 text-sm">Mais que uma agenda, a sua secretária inteligente</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {mode === 'forgotSent' ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <h2 className="text-slate-900 font-black text-xl mb-2">Link enviado!</h2>
              <p className="text-slate-400 text-sm mb-1">Verifique o seu email</p>
              <p className="text-slate-700 font-bold text-sm mb-6">{email}</p>
              <button onClick={() => { setMode('login'); setError(''); }} className="text-violet-600 font-semibold text-sm hover:underline">Voltar ao login</button>
            </div>
          ) : mode === 'forgot' ? (
            <>
              <h2 className="text-slate-900 font-black text-xl mb-2">Recuperar senha</h2>
              <p className="text-slate-400 text-sm mb-6">Enviaremos um link de redefinição para o seu email</p>
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="o@meu.email"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3 mb-4">{error}</div>}
              <button onClick={handleForgot} disabled={loading || !email.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mb-4">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Enviar link
              </button>
              <button onClick={() => { setMode('login'); setError(''); }} className="w-full text-slate-400 text-sm hover:text-slate-600 py-1 transition-colors">Voltar ao login</button>
            </>
          ) : (
            <>
              <h2 className="text-slate-900 font-black text-xl mb-6">
                {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="o@meu.email"
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Palavra-passe</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="text-xs text-violet-500 hover:underline">Esqueci minha senha</button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm" />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3">{error}</div>}

                <button type="submit" disabled={loading}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {mode === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-slate-400 text-sm">
                  {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}
                  {' '}
                  <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }} className="text-violet-600 font-semibold hover:underline">
                    {mode === 'login' ? 'Registar' : 'Entrar'}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// ── DiasHorariosEditor ────────────────────────────────────
function DiasHorariosEditor({ dias, onChange }) {
  const NOMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const toggleDia = (dia) => {
    const exists = dias.find(d => d.dia === dia);
    if (exists) {
      onChange(dias.filter(d => d.dia !== dia));
    } else {
      onChange([...dias, { dia, abertura: '09:00', fechamento: '18:00' }].sort((a,b) => a.dia - b.dia));
    }
  };
  const updateHorario = (dia, field, value) => {
    onChange(dias.map(d => d.dia === dia ? { ...d, [field]: value } : d));
  };
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Dias de funcionamento</label>
      {NOMES.map((nome, dia) => {
        const conf = dias.find(d => d.dia === dia);
        return (
          <div key={dia} className={`rounded-xl border transition-colors ${conf ? 'border-violet-200 bg-violet-50' : 'border-slate-100 bg-slate-50'}`}>
            <label className="flex items-center gap-3 p-3 cursor-pointer">
              <input type="checkbox" checked={!!conf} onChange={() => toggleDia(dia)} className="w-4 h-4 accent-violet-600" />
              <span className={`text-sm font-bold ${conf ? 'text-violet-900' : 'text-slate-400'}`}>{nome}</span>
            </label>
            {conf && (
              <div className="flex gap-2 px-3 pb-3">
                <input type="time" value={conf.abertura} onChange={e => updateHorario(dia, 'abertura', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                <span className="text-slate-400 self-center text-sm">–</span>
                <input type="time" value={conf.fechamento} onChange={e => updateHorario(dia, 'fechamento', e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Onboarding Screen ─────────────────────────────────────
function OnboardingScreen({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [slug, setSlug] = useState('');
  const [diasFuncionamento, setDiasFuncionamento] = useState([
    { dia: 1, abertura: '09:00', fechamento: '18:00' },
    { dia: 2, abertura: '09:00', fechamento: '18:00' },
    { dia: 3, abertura: '09:00', fechamento: '18:00' },
    { dia: 4, abertura: '09:00', fechamento: '18:00' },
    { dia: 5, abertura: '09:00', fechamento: '18:00' },
  ]);
  const [intervaloBase, setIntervaloBase] = useState(60);
  const [toleranciaFechamento, setTolerancisFechamento] = useState(0);
  const [profNome, setProfNome] = useState('');
  const [profCor, setProfCor] = useState(PROF_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const slugify = (v) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleComplete = async () => {
    setSaving(true);
    try {
      const profissionals = profNome.trim()
        ? [{ id: newId(), nome: profNome.trim(), cor: profCor, servicos: [], agendaTipo: 'nativa' }]
        : [];
      const profileData = {
        nome: nome.trim(),
        subtitulo: subtitulo.trim(),
        slug: slug.trim() || slugify(nome),
        diasFuncionamento,
        intervaloBase: Number(intervaloBase),
        toleranciaFechamento: Number(toleranciaFechamento),
        // backward compat fields derived from diasFuncionamento
        horaInicio: diasFuncionamento[0]?.abertura || '09:00',
        horaFim: diasFuncionamento[0]?.fechamento || '18:00',
        intervalo: Number(intervaloBase),
        servicos: [],
        profissionals,
        googleCalendarConnected: false,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), profileData, { merge: true });
      // Register slug
      const finalSlug = profileData.slug;
      if (finalSlug) {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'slugs', finalSlug), { uid: user.uid, nome: nome.trim() });
      }
      onComplete(profileData);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { n: 1, title: 'O seu espaço', subtitle: 'Vamos começar com o básico' },
    { n: 2, title: 'Horários', subtitle: 'Quando está aberto?' },
    { n: 3, title: 'Primeira equipa', subtitle: 'Adicione um profissional' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-violet-700 to-violet-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logosplash.svg" alt="hute" className="w-40 mx-auto mb-2" />
          <p className="text-violet-200 text-sm">Configure o seu espaço</p>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map(s => (
            <div key={s.n} className={`transition-all rounded-full ${step === s.n ? 'w-8 h-2 bg-white' : step > s.n ? 'w-2 h-2 bg-white/60' : 'w-2 h-2 bg-white/30'}`} />
          ))}
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-slate-900 font-black text-xl">{steps[step-1].title}</h2>
          <p className="text-slate-400 text-sm mb-6">{steps[step-1].subtitle}</p>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nome do estabelecimento</label>
                <input
                  value={nome}
                  onChange={e => { setNome(e.target.value); setSlug(slugify(e.target.value)); }}
                  placeholder="Ex: Studio da Ana"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Especialidade</label>
                <input
                  value={subtitulo}
                  onChange={e => setSubtitulo(e.target.value)}
                  placeholder="Ex: Cabeleireiro & Estética"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Link de reservas</label>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
                  <span className="pl-3 pr-1 text-slate-300 text-xs">hute.app/#</span>
                  <input
                    value={slug}
                    onChange={e => setSlug(slugify(e.target.value))}
                    placeholder="studio-da-ana"
                    className="flex-1 px-2 py-3 text-slate-800 outline-none text-sm bg-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <DiasHorariosEditor dias={diasFuncionamento} onChange={setDiasFuncionamento} />
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Intervalo base entre marcações</label>
                <select value={intervaloBase} onChange={e => setIntervaloBase(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                  {[[30,'30 min'],[45,'45 min'],[60,'1h'],[90,'1h30'],[120,'2h']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Tolerância após o fecho</label>
                <select value={toleranciaFechamento} onChange={e => setTolerancisFechamento(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                  {[[0,'Fecha em ponto'],[15,'+15 min'],[30,'+30 min'],[45,'+45 min'],[60,'+1h']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nome do profissional</label>
                <input
                  value={profNome}
                  onChange={e => setProfNome(e.target.value)}
                  placeholder="Ex: Ana Silva"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {PROF_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setProfCor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${profCor === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm">
                Anterior
              </button>
            )}
            {step < 3 && (
              <button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !nome.trim()}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-colors text-sm disabled:opacity-40">
                Seguinte
              </button>
            )}
            {step === 3 && (
              <div className="flex-1 flex flex-col gap-2">
                <button onClick={handleComplete} disabled={saving}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Concluir
                </button>
                {!profNome.trim() && (
                  <button onClick={handleComplete} className="text-slate-400 text-xs text-center hover:text-slate-600">
                    Saltar por agora
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chime sound via Web Audio API ────────────────────────
function playChime(type = 'new') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);

    function ping(freq, startTime, duration = 0.9) {
      // fundamental
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(g); g.connect(comp);
      g.gain.setValueAtTime(0, startTime);
      g.gain.linearRampToValueAtTime(1.0, startTime + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime); osc.stop(startTime + duration);

      // inharmonic partial (bell body)
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2.756;
      osc2.connect(g2); g2.connect(comp);
      g2.gain.setValueAtTime(0, startTime);
      g2.gain.linearRampToValueAtTime(0.35, startTime + 0.004);
      g2.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.4);
      osc2.start(startTime); osc2.stop(startTime + duration * 0.4);
    }

    if (type === 'new') {
      ping(1318, ctx.currentTime);        // plim
      ping(1318, ctx.currentTime + 0.22); // plim
    } else {
      ping(880, ctx.currentTime, 0.6);
      ping(659, ctx.currentTime + 0.22, 0.6);
    }
  } catch (_) {}
}

// ── Admin Sidebar (tablet/desktop only) ───────────────────
function AdminSidebar({ view, setView, profile, unreadCount, notifOpen, setNotifOpen,
                        setNotifications, notifications, isTrial, trialDaysLeft,
                        trialUrgent, setShowPlansModal, handleLogout, setMenuSection }) {
  const items = [
    { key: 'agenda',    icon: Calendar,  label: 'Agenda' },
    { key: 'clients',   icon: Users,     label: 'Clientes' },
    { key: 'dashboard', icon: BarChart2, label: 'Dashboard' },
    { key: 'servicos',  icon: Tag,       label: 'Serviços' },
    { key: 'equipa',    icon: Briefcase, label: 'Equipe' },
    { key: 'config',    icon: Settings,  label: 'Configurações' },
  ];
  return (
    <aside className="hidden md:flex flex-col flex-shrink-0 w-sidebar-sm lg:w-sidebar-lg h-screen sticky top-0 overflow-hidden z-30" style={{ background: 'linear-gradient(180deg, #6C3CE1 0%, #4F21A8 100%)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 flex-shrink-0 border-b border-white/10">
        <img src="/favicon.svg" alt="Hute" className="w-8 h-8 flex-shrink-0" style={{ filter: 'brightness(0) invert(1)' }} />
        <span className="hidden lg:block font-black text-white text-base tracking-tight whitespace-nowrap">hute</span>
      </div>
      {/* Establishment name (lg only) */}
      {profile.nome && (
        <div className="hidden lg:block px-4 py-3 border-b border-white/10">
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider truncate">{profile.nome}</p>
          {profile.subtitulo && <p className="text-[10px] text-white/25 truncate mt-0.5">{profile.subtitulo}</p>}
        </div>
      )}
      {/* Trial badge */}
      {isTrial && (
        <button onClick={() => setShowPlansModal(true)}
          className={`mx-2 mt-3 rounded-xl p-2.5 flex items-center gap-2 overflow-hidden transition-colors ${trialUrgent ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-400 hover:bg-amber-500'}`}>
          <Zap className="w-4 h-4 text-white flex-shrink-0" />
          <span className="hidden lg:block text-[11px] font-black text-white whitespace-nowrap truncate">
            {trialDaysLeft > 0 ? `${trialDaysLeft}d de teste` : 'Trial expirado'}
          </span>
        </button>
      )}
      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {items.map(({ key, icon: Icon, label }) => {
          const active = view === key;
          return (
            <button key={key} onClick={() => { setView(key); if (key === 'config') setMenuSection(s => s || 'dados'); }}
              title={label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left overflow-hidden ${active ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block text-sm font-semibold whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </nav>
      {/* Bottom: bell + logout */}
      <div className="px-2 pb-4 space-y-0.5 flex-shrink-0 border-t border-white/10 pt-2">
        <div className="relative">
          <button onClick={() => { setNotifOpen(o => !o); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); }}
            title="Notificações"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:bg-white/10 hover:text-white transition-all overflow-hidden">
            <div className="relative flex-shrink-0">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-black text-white flex items-center justify-center px-0.5 bg-red-500">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="hidden lg:block text-sm font-semibold whitespace-nowrap">Notificações</span>
          </button>
          {notifOpen && (
            <div className="fixed left-16 lg:left-48 bottom-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[200] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-black text-slate-900">Notificações</span>
                {notifications.length > 0 && (
                  <button onClick={() => setNotifications([])} className="text-[10px] text-slate-400 hover:text-red-400 font-semibold">Limpar tudo</button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center"><Bell className="w-6 h-6 text-slate-200 mx-auto mb-2" /><p className="text-xs text-slate-400">Sem notificações</p></div>
                ) : notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b border-slate-50 flex items-start gap-3 ${n.read ? '' : 'bg-violet-50/60'}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === 'cancel' ? 'bg-red-400' : 'bg-violet-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 leading-snug">{n.msg}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{n.time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={handleLogout} title="Terminar sessão"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:bg-red-500/20 hover:text-red-300 transition-all overflow-hidden">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block text-sm font-semibold whitespace-nowrap">Terminar sessão</span>
        </button>
      </div>
    </aside>
  );
}

// ── Admin Panel Shell ─────────────────────────────────────
function AdminPanel({ user, profile, setProfile, fetchProfile }) {
  const [view, setView] = useState('agenda');
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSection, setMenuSection] = useState(null); // null | 'dados' | 'whatsapp' | 'google'
  const [toast, setToast] = useState(null); // { msg, type: 'new'|'cancel' }
  const [notifications, setNotifications] = useState([]); // [{ id, msg, type, time, read }]
  const [notifOpen, setNotifOpen] = useState(false);
  const [fcmReady, setFcmReady] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const { isTrial, trialDaysLeft } = usePlanLimits(profile);
  const trialUrgent = isTrial && trialDaysLeft <= 2;
  const colId = user.uid;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone;

  // ── FCM token registration ────────────────────────────────
  useEffect(() => {
    if (!messaging || !FCM_VAPID_KEY) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    navigator.serviceWorker.register('/firebase-messaging-sw.js').then(reg => {
      return getToken(messaging, { vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: reg });
    }).then(token => {
      if (token) {
        setFcmReady(true);
        setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', colId), { fcmToken: token }, { merge: true });
      }
    }).catch(e => console.error('FCM token error:', e));
  }, [colId]);

  // ── In-app appointment notifications via onSnapshot ───────
  useEffect(() => {
    const q = collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${colId}`);
    let initialized = false;
    const unsub = onSnapshot(q, snap => {
      if (!initialized) { initialized = true; return; }
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const a = change.doc.data();
          playChime('new');
          const msg = `Novo agendamento: ${a.clienteNome || 'Cliente'}${a.servico ? ` — ${a.servico}` : ''}${a.hora ? ` às ${a.hora}` : ''}`;
          setToast({ msg, type: 'new' });
          setNotifications(prev => [{ id: Date.now(), msg, type: 'new', time: new Date(), read: false }, ...prev].slice(0, 50));
          setTimeout(() => setToast(t => t?.msg === msg ? null : t), 6000);
        } else if (change.type === 'removed') {
          const cancelMsg = 'Agendamento cancelado';
          playChime('cancel');
          setToast({ msg: cancelMsg, type: 'cancel' });
          setNotifications(prev => [{ id: Date.now(), msg: cancelMsg, type: 'cancel', time: new Date(), read: false }, ...prev].slice(0, 50));
          setTimeout(() => setToast(null), 4000);
        }
      });
    });
    return () => unsub();
  }, [colId]);

  const requestFCMPermission = async () => {
    if (!messaging || !FCM_VAPID_KEY) return;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getToken(messaging, { vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: reg });
      if (token) {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', colId), { fcmToken: token }, { merge: true });
        setFcmReady(true);
      }
    } catch (e) {
      console.error('FCM permission error:', e);
    }
  };

  const handleLogout = async () => { await signOut(auth); };

  // ── Sync status-bar colour with trial banner ──────────────
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    if (isTrial) {
      meta.setAttribute('content', trialUrgent ? '#ef4444' : '#f59e0b');
    } else {
      meta.setAttribute('content', '#6C3CE1');
    }
    return () => { meta.setAttribute('content', '#6C3CE1'); };
  }, [isTrial, trialUrgent]);

  const [agendaNewApptTrigger, setAgendaNewApptTrigger] = useState(0);

  const navItems = [
    { key: 'agenda',    icon: Calendar,  label: 'Agenda' },
    { key: 'clients',   icon: Users,     label: 'Clientes' },
    { key: 'dashboard', icon: BarChart2, label: 'Dashboard' },
    { key: 'servicos',  icon: Tag,       label: 'Serviços' },
  ];

  return (
    <div className="md:flex md:h-screen md:overflow-hidden">

      {/* ── Sidebar (tablet/desktop) ── */}
      <AdminSidebar
        view={view} setView={setView} profile={profile}
        unreadCount={unreadCount} notifOpen={notifOpen}
        setNotifOpen={setNotifOpen} setNotifications={setNotifications}
        notifications={notifications} isTrial={isTrial}
        trialDaysLeft={trialDaysLeft} trialUrgent={trialUrgent}
        setShowPlansModal={setShowPlansModal} handleLogout={handleLogout}
        setMenuSection={setMenuSection}
      />

      {/* ── Content column ── */}
      <div className="flex-1 md:overflow-y-auto md:h-screen md:flex md:flex-col min-w-0">
      <div className="w-full max-w-[480px] mx-auto bg-slate-50 min-h-screen pb-20 shadow-2xl shadow-slate-200 md:max-w-none md:mx-0 md:pb-0 md:shadow-none md:flex-1">

      {/* ── Sticky top block: trial banner + header (mobile only) ── */}
      <div className="sticky top-0 z-10 md:hidden">

      {/* Safe-area spacer — acompanha a cor do primeiro elemento visível */}
      <div style={{
        height: 'env(safe-area-inset-top)',
        background: isTrial
          ? (trialUrgent ? '#ef4444' : '#f59e0b')
          : 'linear-gradient(135deg, #6C3CE1 0%, #4F21A8 100%)',
      }} />

      {/* ── Trial banner (above header) ── */}
      {isTrial && (
        <div className={`px-4 py-2.5 flex items-center justify-between gap-3 ${trialUrgent ? 'bg-red-500' : 'bg-amber-400'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <Zap className={`w-3.5 h-3.5 flex-shrink-0 ${trialUrgent ? 'text-white' : 'text-amber-900'}`} />
            <p className={`text-xs font-semibold truncate ${trialUrgent ? 'text-white' : 'text-amber-900'}`}>
              {trialDaysLeft > 0
                ? `Período de teste: ${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''} restante${trialDaysLeft !== 1 ? 's' : ''}. Assine para continuar.`
                : 'Período de teste expirado. Assine para continuar usando.'}
            </p>
          </div>
          <button
            onClick={() => setShowPlansModal(true)}
            className={`text-[11px] font-black px-2.5 py-1 rounded-full flex-shrink-0 transition-colors
              ${trialUrgent ? 'bg-white text-red-600 hover:bg-red-50' : 'bg-amber-900/20 text-amber-900 hover:bg-amber-900/30'}`}>
            Ver planos
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <header className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #6C3CE1 0%, #4F21A8 100%)' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Hute" className="w-8 h-8 flex-shrink-0" style={{ filter: 'brightness(0) invert(1)' }} />
            <span className="font-black text-white text-base tracking-tight leading-none">hute</span>
            <span className="text-white/30 text-lg font-thin leading-none">|</span>
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm leading-none">{profile.nome || 'Painel de Gestão'}</span>
              {profile.subtitulo && (
                <span className="text-[11px] text-white/60 font-medium leading-none mt-0.5">{profile.subtitulo}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Bell with unread badge */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(o => !o); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); }}
                className="relative flex items-center justify-center w-9 h-9 rounded-xl text-white hover:bg-white/10 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-black text-white flex items-center justify-center px-1 bg-red-500">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification history panel */}
              {notifOpen && (
                <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="text-sm font-black text-slate-900">Notificações</span>
                    {notifications.length > 0 && (
                      <button onClick={() => setNotifications([])} className="text-[10px] text-slate-400 hover:text-red-400 font-semibold transition-colors">
                        Limpar tudo
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">Sem notificações</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b border-slate-50 flex items-start gap-3 ${n.read ? '' : 'bg-violet-50/60'}`}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === 'cancel' ? 'bg-red-400' : 'bg-violet-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 leading-snug">{n.msg}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {n.time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      </div>{/* end mobile sticky top block */}

      {/* Click-outside to close notif panel */}
      {notifOpen && <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />}

      {/* ── iOS PWA install banner ── */}
      {!fcmReady && isIOS && !isStandalone && (
        <div className="bg-violet-50 border-b border-violet-100 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-3">
            <Bell className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
            <p className="text-xs font-bold text-violet-900">Para receber notificações no iPhone:</p>
          </div>
          <div className="flex items-center justify-between gap-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-violet-100 flex items-center justify-center text-xl">📤</div>
              <span className="text-[10px] text-violet-700 font-semibold text-center leading-tight">Toque em<br/>Compartilhar</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-violet-300 flex-shrink-0" />
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-violet-100 flex items-center justify-center text-xl">➕</div>
              <span className="text-[10px] text-violet-700 font-semibold text-center leading-tight">Adicionar à<br/>Tela de Início</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-violet-300 flex-shrink-0" />
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-violet-100 flex items-center justify-center overflow-hidden p-1.5">
                <img src="/ICON.svg" alt="Hute" className="w-full h-full" />
              </div>
              <span className="text-[10px] text-violet-700 font-semibold text-center leading-tight">Abra pelo<br/>ícone Hute</span>
            </div>
          </div>
        </div>
      )}

      {/* ── FCM permission banner (non-iOS / iOS standalone) ── */}
      {!fcmReady && (!isIOS || isStandalone) && typeof Notification !== 'undefined' && Notification.permission === 'default' && FCM_VAPID_KEY && (
        <div className="bg-violet-50 border-b border-violet-100 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-3.5 h-3.5 flex-shrink-0 text-violet-600" />
            <p className="text-xs font-semibold text-violet-800 truncate">Ative notificações para alertas de novos agendamentos</p>
          </div>
          <button onClick={requestFCMPermission} className="text-[11px] font-black px-2.5 py-1 rounded-full bg-violet-600 text-white hover:bg-violet-700 flex-shrink-0 transition-colors">
            Ativar
          </button>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-32px)] max-w-sm rounded-2xl shadow-lg px-4 py-3 flex items-start gap-3 ${toast.type === 'cancel' ? 'bg-red-500' : 'bg-violet-600'}`}>
          <Bell className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
          <p className="text-sm text-white font-semibold leading-snug flex-1">{toast.msg}</p>
          <button onClick={() => setToast(null)} className="text-white/70 hover:text-white flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Plans modal ── */}
      {showPlansModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center lg:items-center" onClick={() => setShowPlansModal(false)}>
          <div className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto p-6 pb-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-slate-900 text-lg">Escolha um plano</h2>
              <button onClick={() => setShowPlansModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {PLANS.map(plan => {
                const Icon = plan.icon;
                return <PlansCheckoutCard key={plan.key} plan={plan} lojaId={user.uid} Icon={Icon} />;
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="p-5 md:px-8 md:py-6">
        {view === 'agenda'    && <AdminAgenda user={user} lojaId={user.uid} profile={profile} newApptTrigger={agendaNewApptTrigger} />}
        {view === 'clients'   && <AdminClients user={user} lojaId={user.uid} isAdmin={true} />}
        {view === 'dashboard' && <AdminDashboard user={user} profile={profile} />}
        {view === 'equipa'    && <AdminEquipe user={user} profile={profile} setProfile={setProfile} />}
        {view === 'servicos'  && <AdminServicos user={user} profile={profile} setProfile={setProfile} />}
        {view === 'config'    && (
          <div>
            <div className="flex gap-2 mb-6 border-b border-slate-200 pb-4 overflow-x-auto">
              {[
                { key: 'dados',    label: 'Dados do estabelecimento' },
                { key: 'whatsapp', label: 'WhatsApp' },
                { key: 'google',   label: 'Google Agenda' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setMenuSection(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${(menuSection || 'dados') === key ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {label}
                </button>
              ))}
            </div>
            <AdminSettings user={user} profile={profile} setProfile={setProfile} section={menuSection || 'dados'} />
          </div>
        )}
      </main>

      {/* ── Bottom navigation (mobile only) ── */}
      <nav className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-slate-100 flex justify-around py-2 px-1 z-20 md:hidden">
        {navItems.map(({ key, icon: Icon, label }) => {
          const active = view === key && !menuOpen;
          return (
            <button key={key} onClick={() => { setView(key); setMenuOpen(false); }}
              className={`flex flex-col items-center px-2 py-1.5 rounded-xl transition-all ${active ? 'text-violet-600' : 'text-slate-400'}`}>
              <Icon className="w-5 h-5 mb-0.5" />
              <span className={`text-[10px] font-semibold`}>{label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-violet-600 mt-0.5" />}
            </button>
          );
        })}
        <button
          onClick={() => setMenuOpen(true)}
          className={`flex flex-col items-center px-2 py-1.5 rounded-xl transition-all ${menuOpen ? 'text-violet-600' : 'text-slate-400'}`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Mais</span>
          {menuOpen && <div className="w-1 h-1 rounded-full bg-violet-600 mt-0.5" />}
        </button>
      </nav>

      {/* ── Side drawer (mobile only) ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden" onClick={() => { setMenuOpen(false); setMenuSection(null); }}>
          <div className="flex-1 bg-black/50" />
          <div className="w-[88%] max-w-[440px] bg-white h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div style={{ height: 'env(safe-area-inset-top)', background: '#ffffff', flexShrink: 0 }} />
            <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100 flex-shrink-0">
              {menuSection ? (
                <button onClick={() => setMenuSection(null)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-semibold">Voltar</span>
                </button>
              ) : (
                <div className="flex items-center gap-2.5">
                  <img src="/favicon.svg" alt="Hute" className="w-7 h-7" />
                  <span className="font-black text-slate-900 text-base">Menu</span>
                </div>
              )}
              <button onClick={() => { setMenuOpen(false); setMenuSection(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {!menuSection ? (
                <div className="p-4 space-y-2">
                  <button
                    onClick={() => setMenuSection('equipa')}
                    className="w-full flex items-center gap-4 px-4 py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">Equipe</p>
                      <p className="text-xs text-slate-400">Gerencie profissionais</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>

                  <button
                    onClick={() => setMenuSection('dados')}
                    className="w-full flex items-center gap-4 px-4 py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Settings className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">Dados do estabelecimento</p>
                      <p className="text-xs text-slate-400">Nome, logo, horários e link</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>

                  <button
                    onClick={() => setMenuSection('google')}
                    className="w-full flex items-center gap-4 px-4 py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">Google Agenda</p>
                      <p className="text-xs text-slate-400">Sincronize as suas marcações</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>

                  <button
                    onClick={() => setMenuSection('whatsapp')}
                    className="w-full flex items-center gap-4 px-4 py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">Integrar WhatsApp</p>
                      <p className="text-xs text-slate-400">Conecte o WhatsApp do estabelecimento</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-red-400 hover:bg-red-50 rounded-2xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-semibold">Terminar sessão</span>
                    </button>
                  </div>
                </div>
              ) : menuSection === 'equipa' ? (
                <div className="p-5">
                  <AdminEquipe user={user} profile={profile} setProfile={setProfile} />
                </div>
              ) : (
                <div className="p-5">
                  <AdminSettings user={user} profile={profile} setProfile={setProfile} section={menuSection} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}

// ── Admin Agenda ──────────────────────────────────────────
function AdminAgenda({ user, lojaId, filterProfId, profile, newApptTrigger = 0 }) {
  const profissionals = profile?.profissionals || [];
  const defaultProfId = filterProfId || (profissionals.length > 1 ? null : (profissionals[0]?.id ?? null));

  const [selectedProfId, setSelectedProfId] = useState(defaultProfId);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [googleFreeSlots, setGoogleFreeSlots] = useState(null); // null = not google
  const [googleEvents, setGoogleEvents] = useState([]); // actual GCal events for display
  const [googleLoading, setGoogleLoading] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null); // hora string of the tapped free slot
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [preHora, setPreHora] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reagendarAppt, setReagendarAppt] = useState(null);
  const [detailAppt, setDetailAppt] = useState(null);
  const colId = lojaId || user.uid;
  const dateISO = toDateISO(selectedDate);
  const todayISO = toDateISO(new Date());

  // Respond to external "new appointment" trigger from header "+" button
  useEffect(() => {
    if (newApptTrigger > 0) { setPreHora(''); setActiveSlot(null); setShowNewAppt(true); }
  }, [newApptTrigger]);

  // Subscribe to all appointments
  useEffect(() => {
    const q = collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${colId}`);
    const unsub = onSnapshot(q, snap => {
      let appts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (filterProfId) appts = appts.filter(a => a.profissionalId === filterProfId);
      setAppointments(appts);
    });
    return () => unsub();
  }, [colId, filterProfId]);

  // Subscribe to blocks
  useEffect(() => {
    const q = collection(db, 'artifacts', APP_ID, 'public', 'data', `blocks_${colId}`);
    const unsub = onSnapshot(q, snap => {
      let blks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (filterProfId) blks = blks.filter(b => !b.profissionalId || b.profissionalId === filterProfId);
      setBlocks(blks);
    });
    return () => unsub();
  }, [colId, filterProfId]);

  // When professional or date changes, check Google Calendar
  const selectedProf = profissionals.find(p => p.id === selectedProfId) || null;
  useEffect(() => {
    setActiveSlot(null);
    // Always try Google Calendar for any selected professional — agendaTipo not required.
    // The backend checks prof_cals and returns googleSync: false if not connected.
    if (!selectedProfId) { setGoogleFreeSlots(null); setGoogleEvents([]); return; }

    setGoogleLoading(true);
    setGoogleFreeSlots(null);
    setGoogleEvents([]);
    const baseParams = { lojaId: colId, data: dateISO, profissionalId: selectedProfId };
    const slotsParams = new URLSearchParams({ ...baseParams, duracao: profile?.intervaloBase || profile?.intervalo || 60 });
    const eventsParams = new URLSearchParams(baseParams);
    Promise.all([
      fetch(`${BACKEND_URL}/getSlots?${slotsParams}`).then(r => r.json()),
      fetch(`${BACKEND_URL}/getCalendarEvents?${eventsParams}`).then(r => r.json()),
    ])
      .then(([slots, evts]) => {
        setGoogleFreeSlots(slots.googleSync ? (slots.slots || []) : null);
        setGoogleEvents(evts.events || []);
      })
      .catch(() => { setGoogleFreeSlots(null); setGoogleEvents([]); })
      .finally(() => setGoogleLoading(false));
  }, [selectedProfId, dateISO, colId, profile?.intervalo, selectedProf?.agendaTipo]);

  // Build timeline
  const dayBlocks = blocks.filter(b =>
    b.date === dateISO && (!b.profissionalId || b.profissionalId === selectedProfId)
  );
  const _diaDate = dateISO ? (() => { const [y,m,d] = dateISO.split('-').map(Number); return new Date(y,m-1,d).getDay(); })() : new Date().getDay();
  const _diaConf = (profile?.diasFuncionamento || []).find(d => d.dia === _diaDate);
  const _estabFechado = profile?.diasFuncionamento?.length > 0 && !_diaConf;
  const isDayOff = dayBlocks.some(b => b.type === 'day_off') || _estabFechado;
  const customHours = dayBlocks.find(b => b.type === 'custom_hours');
  const slotBlocks = dayBlocks.filter(b => b.type === 'slot');
  const effStart = customHours ? customHours.horaInicio : (_diaConf ? _diaConf.abertura : (profile?.horaInicio || '09:00'));
  const effEnd   = customHours ? customHours.horaFim    : (_diaConf ? _diaConf.fechamento : (profile?.horaFim    || '18:00'));
  const intervalo = profile?.intervaloBase || profile?.intervalo || 60;

  const dayAppts = appointments.filter(a =>
    a.data === dateISO && (!selectedProfId || !a.profissionalId || a.profissionalId === selectedProfId)
  );

  // ── Sequential timeline ──────────────────────────────────
  // Instead of a fixed grid, appointments stack one after the other.
  // Free gaps appear exactly where the previous appointment ended.
  const toMin = s => { const [h,m] = s.split(':').map(Number); return h*60+m; };
  const toStr = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  const nowMin = dateISO === todayISO ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

  // In "Todos" mode group appointments at the same hour into a single timeline item
  const apptGroups = {};
  dayAppts.forEach(a => {
    if (!apptGroups[a.hora]) apptGroups[a.hora] = [];
    apptGroups[a.hora].push(a);
  });

  // Collect all events (appointments, blocks, Google Calendar) sorted by start time
  const rawEvents = !selectedProfId
    ? [
        ...Object.entries(apptGroups).map(([hora, appts]) => ({
          tipo: 'group', hora,
          duracao: Math.max(...appts.map(a => Number(a.duracaoTotal || a.duracao) || intervalo)),
          appts,
        })),
        ...slotBlocks.map(b => ({ tipo:'block', hora:b.hora, duracao:Number(b.duracao)||60, block:b })),
      ].sort((a,b) => a.hora.localeCompare(b.hora))
    : [
        ...dayAppts.map(a => ({ tipo:'appt', hora:a.hora, duracao:Number(a.duracaoTotal || a.duracao)||intervalo, appt:a })),
        ...slotBlocks.map(b => ({ tipo:'block', hora:b.hora, duracao:Number(b.duracao)||60, block:b })),
        ...(googleFreeSlots !== null
          ? googleEvents.filter(e => !e.allDay).map(e => {
              const s = new Date(e.start); const en = new Date(e.end);
              return { tipo:'google', hora:`${String(s.getHours()).padStart(2,'0')}:${String(s.getMinutes()).padStart(2,'0')}`, duracao:(en-s)/60000, googleEvent:e };
            })
          : [])
      ].sort((a,b) => a.hora.localeCompare(b.hora));

  const timeline = [];
  if (!isDayOff) {
    let cursor = toMin(effStart);
    const fimMin = toMin(effEnd);

    const addGap = (gStart, gEnd) => {
      // Generate individual intervalo-sized slots within the free gap.
      // If an appointment ends at a non-grid time (e.g. 10:45), slots restart
      // from there: 10:45, 11:45, 12:45… using intervalo as the step.
      let cur = gStart;
      while (cur + intervalo <= gEnd) {
        const isPast = nowMin >= 0 && cur < nowMin;
        timeline.push({ tipo: isPast ? 'past' : 'free', hora: toStr(cur), endHora: toStr(cur + intervalo) });
        cur += intervalo;
      }
    };

    for (const ev of rawEvents) {
      const evStart = toMin(ev.hora);
      const evEnd = evStart + Math.round(ev.duracao);
      if (evStart < cursor) continue; // already past cursor (overlapping events)
      addGap(cursor, Math.min(evStart, fimMin));
      if (evStart < fimMin) {
        timeline.push({ ...ev, endHora: toStr(Math.min(evEnd, fimMin)) });
        cursor = evEnd;
      }
    }
    addGap(cursor, fimMin);
  }

  const cancelar = async (appt) => {
    if (!window.confirm('Cancelar este agendamento?')) return;
    fetch(`${BACKEND_URL}/cancelAppointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lojaId: colId,
        appointmentId: appt.id,
        clienteWhats: appt.clienteWhats || '',
        nomeCliente: appt.clienteNome || '',
        servico: appt.servico || '',
        data: appt.data || '',
        hora: appt.hora || '',
        profissionalNome: appt.profissionalNome || '',
      }),
    }).catch(() => alert('Erro ao cancelar.'));
  };

  const removeBlock = async (id) => {
    if (!window.confirm('Remover este bloqueio?')) return;
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `blocks_${colId}`, id))
      .catch(() => alert('Erro ao remover.'));
  };

  const openNewAppt = (hora) => { setPreHora(hora); setActiveSlot(null); setShowNewAppt(true); };
  const openBlock   = (hora) => { setPreHora(hora); setActiveSlot(null); setShowBlockModal(true); };

  // ── Desktop week view ────────────────────────────────────
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── Mini-calendar state ───────────────────────────────────
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [hoveredDay, setHoveredDay] = useState(null); // 'YYYY-MM-DD'
  const [searchQuery, setSearchQuery] = useState('');
  const [notas, setNotas] = useState('');
  const [checkItems, setCheckItems] = useState([]); // {id, text, done}
  const [newCheck, setNewCheck] = useState('');

  // Occupancy per day: ratio of booked minutes / working minutes
  const occupancyMap = useMemo(() => {
    const map = {};
    const dayMins = toMin(effEnd) - toMin(effStart);
    if (dayMins <= 0) return map;
    appointments.forEach(a => {
      if (!a.data) return;
      if (!map[a.data]) map[a.data] = 0;
      map[a.data] += Number(a.duracaoTotal || a.duracao) || intervalo;
    });
    Object.keys(map).forEach(d => { map[d] = Math.min(1, map[d] / dayMins); });
    return map;
  }, [appointments, effStart, effEnd, intervalo]);

  const weekStart = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    d.setDate(d.getDate() + diff);
    return d;
  }, [selectedDate]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const syncBadge = googleLoading
    ? <span className="text-[10px] text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Sincronizando...</span>
    : googleFreeSlots !== null
      ? <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" />Google Agenda</span>
      : selectedProf?.agendaTipo === 'google'
        ? <span className="text-[10px] bg-amber-50 text-amber-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar className="w-3 h-3" />Google (reconectar)</span>
        : selectedProf
          ? <span className="text-[10px] bg-violet-50 text-violet-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar className="w-3 h-3" />Agenda nativa</span>
          : null;

  // Prof toggles JSX — shared between mobile and desktop
  const profTogglesJSX = !filterProfId && profissionals.length > 1 ? (
    <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
      <button
        onClick={() => setSelectedProfId(null)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 border transition-all ${
          selectedProfId === null ? 'bg-slate-800 text-white border-transparent shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
        }`}>
        <Users className="w-3 h-3" />
        Todos
      </button>
      {profissionals.map(p => {
        const active = selectedProfId === p.id;
        return (
          <button key={p.id} onClick={() => setSelectedProfId(p.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 border transition-all ${
              active ? 'text-white shadow-sm border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-200'
            }`}
            style={active ? { backgroundColor: p.cor || '#7c3aed' } : {}}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: active ? 'rgba(255,255,255,0.6)' : (p.cor || '#7c3aed') }} />
            {p.nome}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div>
      {/* Mobile-only header + prof toggles */}
      {!isDesktop && (
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-black text-slate-900">Agenda</h2>
              <div className="flex items-center gap-2 mt-0.5">{syncBadge}</div>
            </div>
            <button onClick={() => { setPreHora(''); setShowNewAppt(true); }} title="Nova marcação"
              className="flex-shrink-0 p-2.5 bg-violet-600 rounded-xl text-white hover:bg-violet-700 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {profTogglesJSX}
        </div>
      )}

      {isDesktop ? (
        /* ── Week view (desktop lg+) + Mini-calendar sidebar ── */
        (() => {
          // ── Sidebar data (motivational + feriados) ──────────────
          const cy = calMonth.getFullYear(), cm = calMonth.getMonth();
          const FRASES = [
            'Cada cliente atendido com cuidado é uma história de confiança construída.',
            'Excelência não é um ato, é um hábito. Construa o seu hoje.',
            'O sucesso do seu negócio começa no primeiro sorriso do dia.',
            'Agenda cheia é resultado de um trabalho feito com carinho.',
            'Cada atendimento é uma oportunidade de encantar.',
            'Clientes satisfeitos são a melhor propaganda que existe.',
            'Dedique-se ao que faz e os resultados virão naturalmente.',
            'Um dia de cada vez — e cada dia bem feito.',
            'Qualidade no atendimento gera fidelidade duradoura.',
            'Seu talento transforma a rotina das pessoas. Valorize isso.',
            'Comprometimento diário constrói reputações extraordinárias.',
            'Pequenos gestos de atenção fazem grandes diferenças.',
            'A consistência é o segredo dos melhores profissionais.',
            'Quem cuida bem das pessoas nunca fica sem clientes.',
            'Cada novo agendamento é um voto de confiança em você.',
            'O melhor momento para crescer é agora.',
            'Profissionalismo é a diferença entre bom e inesquecível.',
            'Atendimento de qualidade é o seu maior diferencial.',
            'Inspire seus clientes a voltarem sempre.',
            'O segredo é simples: faça bem-feito, com alegria.',
            'Pessoas que amam o que fazem raramente param de evoluir.',
            'Cuide da sua agenda como cuida dos seus clientes — com atenção.',
            'Cada dia é uma nova chance de superar as próprias expectativas.',
            'Sua dedicação hoje é o seu portfólio de amanhã.',
            'Resultados consistentes nascem de rotinas consistentes.',
            'Seja o profissional que os clientes recomendam sem hesitar.',
            'O cuidado com os detalhes é o que separa o comum do especial.',
            'Sucesso não é sorte — é preparo encontrando oportunidade.',
            'Agenda organizada, mente tranquila, negócio próspero.',
            'Clientes felizes são o melhor indicador de sucesso.',
          ];
          const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
          const frase = FRASES[dayOfYear % FRASES.length];

          const calcEaster = (yr) => {
            const a = yr % 19, b = Math.floor(yr / 100), c = yr % 100;
            const d2 = Math.floor(b / 4), e2 = b % 4, f2 = Math.floor((b + 8) / 25);
            const g2 = Math.floor((b - f2 + 1) / 3), h2 = (19 * a + b - d2 - g2 + 15) % 30;
            const i2 = Math.floor(c / 4), k2 = c % 4, l2 = (32 + 2 * e2 + 2 * i2 - h2 - k2) % 7;
            const m2 = Math.floor((a + 11 * h2 + 22 * l2) / 451);
            const mo = Math.floor((h2 + l2 - 7 * m2 + 114) / 31);
            const dy = ((h2 + l2 - 7 * m2 + 114) % 31) + 1;
            return new Date(yr, mo - 1, dy);
          };
          const addD = (dt, n) => { const r = new Date(dt); r.setDate(r.getDate() + n); return r; };
          const easter = calcEaster(cy);
          const allHolidays = [
            { month: 0, day: 1,  nome: 'Confraternização Universal' },
            { month: 3, day: 21, nome: 'Tiradentes' },
            { month: 4, day: 1,  nome: 'Dia do Trabalho' },
            { month: 8, day: 7,  nome: 'Independência do Brasil' },
            { month: 9, day: 12, nome: 'N. Sra. Aparecida' },
            { month: 10, day: 2, nome: 'Finados' },
            { month: 10, day: 15, nome: 'Proclamação da República' },
            { month: 10, day: 20, nome: 'Consciência Negra' },
            { month: 11, day: 25, nome: 'Natal' },
            { date: addD(easter, -48), nome: 'Carnaval' },
            { date: addD(easter, -47), nome: 'Carnaval (terça)' },
            { date: addD(easter, -2),  nome: 'Sexta-Feira Santa' },
            { date: easter,             nome: 'Páscoa' },
            { date: addD(easter, 60),  nome: 'Corpus Christi' },
          ];
          const feriados = allHolidays
            .filter(h => h.date ? (h.date.getFullYear() === cy && h.date.getMonth() === cm) : h.month === cm)
            .map(h => ({ nome: h.nome, dia: h.date ? h.date.getDate() : h.day, dt: h.date || new Date(cy, h.month, h.day) }))
            .sort((a, b) => a.dia - b.dia);

          // Calendar grid
          const firstDay = new Date(cy, cm, 1).getDay();
          const daysInMonth = new Date(cy, cm + 1, 0).getDate();
          const pad = (firstDay + 6) % 7;
          const cells = [];
          for (let i = 0; i < pad; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          const monthLabel = calMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

          const addCheckItem = () => {
            if (!newCheck.trim()) return;
            setCheckItems(prev => [...prev, { id: Date.now(), text: newCheck.trim(), done: false }]);
            setNewCheck('');
          };

          return (
        <div className="flex flex-col gap-3 h-[calc(100vh-3rem)]">

          {/* ── Row 1: header+toggles (left) | motivational card (right) ── */}
          <div className="flex gap-4 flex-shrink-0 items-stretch">
            {/* Left 70%: title + search + button, then prof toggles */}
            <div className="w-[70%] min-w-0 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <h2 className="text-xl font-black text-slate-900">Agenda</h2>
                  <div className="flex items-center gap-2 mt-0.5">{syncBadge}</div>
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
                  />
                </div>
                <button onClick={() => { setPreHora(''); setShowNewAppt(true); }} title="Nova marcação"
                  className="flex-shrink-0 p-2.5 bg-violet-600 rounded-xl text-white hover:bg-violet-700 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {profTogglesJSX && <div className="flex-shrink-0">{profTogglesJSX}</div>}
            </div>
            {/* Right 30%: motivational card — height auto-matches left via items-stretch */}
            <div className="w-[30%] flex-shrink-0 rounded-2xl px-5 py-4 flex items-center" style={{ background: 'linear-gradient(135deg, #6C3CE1 0%, #4F21A8 100%)' }}>
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-violet-300 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white font-medium leading-snug">{frase}</p>
              </div>
            </div>
          </div>

          {/* ── Row 2: week timeline (left) | calendar+feriados+lembretes (right) ── */}
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Left: scrollable week area */}
            <div className="w-[70%] min-w-0 overflow-y-auto min-h-0">
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 7); setSelectedDate(d); setActiveSlot(null); }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors text-sm font-semibold">
              <ChevronLeft className="w-4 h-4" /> semana anterior
            </button>
            <div className="text-center">
              <span className="font-black text-slate-900 text-sm">
                {weekDays[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}
                {' – '}
                {weekDays[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')}
              </span>
              {(() => {
                const todayInWeek = weekDays.some(d => d.toISOString().split('T')[0] === todayISO);
                return !todayInWeek ? (
                  <button onClick={() => { setSelectedDate(new Date()); setActiveSlot(null); }}
                    className="block w-full mt-1 text-xs text-violet-500 font-semibold hover:text-violet-700 transition-colors">
                    Ir para hoje
                  </button>
                ) : null;
              })()}
            </div>
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 7); setSelectedDate(d); setActiveSlot(null); }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors text-sm font-semibold">
              próxima semana <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {/* 7-column proportional week grid */}
          {(() => {
            const PX = 1.3; // px per minute
            const dayStart = toMin(effStart);
            const dayEnd   = toMin(effEnd);
            const containerH = (dayEnd - dayStart) * PX;
            const ticks = [];
            for (let t = dayStart; t <= dayEnd; t += intervalo) ticks.push(t);

            // Pre-compute day segments + per-day status
            const weekSegs = weekDays.map(day => {
              const dayStr = day.toISOString().split('T')[0];
              const dayOfWeek = day.getDay();

              // Establishment open that day?
              const wDiaConf = (profile?.diasFuncionamento || []).find(d => d.dia === dayOfWeek);
              const wEstabFechado = (profile?.diasFuncionamento?.length > 0) && !wDiaConf;

              // day_off block for this day (establishment or prof-specific)
              const dayOffBlock = blocks.find(b =>
                b.date === dayStr && b.type === 'day_off' &&
                (!b.profissionalId || b.profissionalId === selectedProfId)
              ) || null;
              const isDayOff = !!dayOffBlock || wEstabFechado;
              const isDayPast = dayStr < todayISO;

              // Does selected professional work this day?
              const profNotWorking = !!(selectedProf?.diasTrabalho?.length > 0 &&
                !selectedProf.diasTrabalho.includes(dayOfWeek));

              // Professional's pause (lunch break)
              const rawPausa = selectedProf?.pausa;
              const wPausa = (rawPausa?.inicio && rawPausa?.fim)
                ? { inicio: toMin(rawPausa.inicio), fim: toMin(rawPausa.fim) }
                : null;

              const wdayAppts = appointments.filter(a =>
                a.data === dayStr && (!selectedProfId || !a.profissionalId || a.profissionalId === selectedProfId) &&
                (!searchQuery || (a.clienteNome || '').toLowerCase().includes(searchQuery.toLowerCase()))
              );
              const wRaw = wdayAppts
                .map(a => ({ tipo: 'appt', hora: a.hora, duracao: Number(a.duracaoTotal || a.duracao) || intervalo, appt: a }))
                .sort((a, b) => a.hora.localeCompare(b.hora));
              const segs = [];
              let wCur = dayStart;
              for (const ev of wRaw) {
                const evStart = toMin(ev.hora);
                const evEnd = evStart + ev.duracao;
                if (evStart < wCur) { wCur = Math.max(wCur, evEnd); continue; }
                if (evStart > wCur) segs.push({ tipo: 'free', start: wCur, end: Math.min(evStart, dayEnd) });
                if (evStart < dayEnd) { segs.push({ ...ev, start: evStart, end: Math.min(evEnd, dayEnd) }); wCur = evEnd; }
              }
              if (wCur < dayEnd) segs.push({ tipo: 'free', start: wCur, end: dayEnd });

              // Split free slots around the lunch pause so the overlay shows cleanly
              const segsWithPause = !wPausa ? segs : segs.flatMap(seg => {
                if (seg.tipo !== 'free') return [seg];
                const overlapsPause = seg.start < wPausa.fim && seg.end > wPausa.inicio;
                if (!overlapsPause) return [seg];
                const result = [];
                if (seg.start < wPausa.inicio) result.push({ ...seg, end: wPausa.inicio });
                if (seg.end > wPausa.fim)   result.push({ ...seg, start: wPausa.fim });
                return result;
              });

              return { day, dayStr, segs: segsWithPause, isDayOff, dayOffBlock, profNotWorking, wPausa, wEstabFechado, isDayPast };
            });

            return (
              <div>
                {/* Row 1: ruler placeholder + day headers — fixed, no scroll offset */}
                <div className="flex gap-0 mb-1">
                  <div className="w-10 flex-shrink-0" />
                  <div className="flex-1 grid grid-cols-7 gap-1">
                    {weekSegs.map(({ day, dayStr, isDayOff, profNotWorking, isDayPast }) => {
                      const isToday = dayStr === todayISO;
                      const isSelected = dayStr === selectedDate.toISOString().split('T')[0];
                      const isOff = isDayOff || profNotWorking;
                      return (
                        <div key={dayStr}
                          className={`text-center py-1.5 rounded-xl cursor-pointer transition-colors ${
                            isToday ? 'bg-violet-600 text-white' :
                            isSelected ? 'bg-violet-100 text-violet-700' :
                            isOff ? 'bg-red-100 text-red-500' :
                            isDayPast ? 'bg-slate-200 text-slate-400' :
                            'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          onClick={() => setSelectedDate(day)}>
                          <div className="text-[9px] font-bold uppercase tracking-wider leading-tight">
                            {day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                          </div>
                          <div className="text-base font-black leading-tight">{day.getDate()}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Row 2: time ruler + day timeline columns — ruler aligns with columns */}
                <div className="flex gap-0">
                  {/* Time ruler */}
                  <div className="w-10 flex-shrink-0 relative" style={{ height: containerH }}>
                    {ticks.map(t => (
                      <div key={t} className="absolute right-0 flex items-center" style={{ top: (t - dayStart) * PX - 6 }}>
                        <span className="text-[9px] font-bold text-slate-400 pr-1 leading-none">{toStr(t)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  <div className="flex-1 grid grid-cols-7 gap-1">
                    {weekSegs.map(({ day, dayStr, segs: wSegs, isDayOff, dayOffBlock, profNotWorking, wPausa, wEstabFechado, isDayPast }) => (
                      <div key={dayStr} className="relative border-l border-slate-100" style={{ height: containerH }}>
                        {/* Tick lines */}
                        {ticks.map(t => (
                          <div key={t} className="absolute left-0 right-0 border-t border-slate-100 pointer-events-none" style={{ top: (t - dayStart) * PX }} />
                        ))}

                        {/* Lunch break overlay */}
                        {wPausa && !isDayOff && !profNotWorking && (() => {
                          const pTop = (Math.max(wPausa.inicio, dayStart) - dayStart) * PX;
                          const pH = (Math.min(wPausa.fim, dayEnd) - Math.max(wPausa.inicio, dayStart)) * PX;
                          return pH > 0 ? (
                            <div className="absolute left-0 right-0 flex items-center justify-center overflow-hidden"
                              style={{ top: pTop, height: pH, zIndex: 2, backgroundColor: '#fffbeb', backgroundImage: 'repeating-linear-gradient(135deg, #fde68a33 0px, #fde68a33 4px, transparent 4px, transparent 10px)', borderTop: '1.5px dashed #fbbf24', borderBottom: '1.5px dashed #fbbf24' }}>
                              {pH >= 20 && (
                                <div className="flex flex-col items-center gap-0.5 pointer-events-none select-none">
                                  <span style={{ fontSize: pH >= 36 ? 16 : 11, lineHeight: 1 }}>🍽️</span>
                                  {pH >= 32 && <p className="text-[7px] font-black text-amber-500 leading-none tracking-wide uppercase">Almoço</p>}
                                </div>
                              )}
                            </div>
                          ) : null;
                        })()}

                        {/* Past day overlay — dims column, appointments still clickable */}
                        {isDayPast && !isDayOff && !profNotWorking && (
                          <div className="absolute inset-0 bg-slate-100/60 pointer-events-none" style={{ zIndex: 3 }} />
                        )}

                        {/* Closed / day-off overlay — blocks free slots, shows label + deblock */}
                        {(isDayOff || profNotWorking) && (
                          <>
                            <div className="absolute inset-0 bg-red-50/80" style={{ zIndex: 3 }} />
                            <div className="absolute top-2 left-0 right-0 flex flex-col items-center gap-1" style={{ zIndex: 4 }}>
                              <p className="text-[9px] font-black text-red-500 leading-none">
                                {wEstabFechado ? 'Fechado' : profNotWorking ? 'Folga' : 'Folga'}
                              </p>
                              {dayOffBlock && (
                                <button
                                  onClick={() => removeBlock(dayOffBlock.id)}
                                  className="text-[9px] text-red-400 hover:text-red-600 font-bold underline underline-offset-1 transition-colors">
                                  Desbloquear
                                </button>
                              )}
                            </div>
                          </>
                        )}

                        {/* Segments */}
                        {wSegs.map((seg, si) => {
                          const top = (seg.start - dayStart) * PX + 1;
                          const rawH = (seg.end - seg.start) * PX - 2;

                          if (seg.tipo === 'free') {
                            // Don't render free slots on closed or off days
                            if (isDayOff || profNotWorking) return null;
                            if (wPausa && seg.start >= wPausa.inicio && seg.start < wPausa.fim) return null;
                            const isPast = nowMin >= 0 && seg.end <= nowMin;
                            const isGray = isDayPast || isPast;
                            return (
                              <div key={si} className="absolute left-0 right-0 px-0.5" style={{ top, height: Math.max(12, rawH), zIndex: isDayPast ? 4 : undefined }}>
                                <button
                                  onClick={() => { setSelectedDate(day); setPreHora(toStr(seg.start)); setShowNewAppt(true); }}
                                  className={`w-full h-full rounded border border-dashed transition-all ${isGray ? 'border-slate-300 bg-slate-100/60 hover:bg-slate-200/60' : 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/60'}`}
                                />
                              </div>
                            );
                          }

                          const a = seg.appt;
                          const prof = profissionals.find(p => p.id === a.profissionalId);
                          const cor = selectedProf?.cor || prof?.cor || '#7c3aed';
                          const h = Math.max(28, rawH);
                          const isApptPast = isDayPast || (nowMin >= 0 && seg.end <= nowMin);
                          return (
                            <div key={si} className="absolute left-0 right-0 px-0.5" style={{ top, height: h, zIndex: 5, filter: isApptPast ? 'grayscale(1)' : undefined, opacity: isApptPast ? 0.6 : 1 }}>
                              <div
                                className="h-full rounded cursor-pointer hover:brightness-95 transition-all overflow-hidden"
                                style={{ backgroundColor: cor + '25', borderLeft: `3px solid ${cor}` }}
                                onClick={() => setDetailAppt(a)}>
                                <div className="px-1 py-0.5">
                                  <p className="text-[11px] font-black leading-tight truncate" style={{ color: cor }}>{a.hora}</p>
                                  <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">{a.clienteNome}</p>
                                  {rawH > 40 && <p className="text-[10px] text-slate-500 leading-tight truncate">{a.servico}</p>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
            </div>{/* end scrollable week area */}
            {/* Right sidebar: calendar + feriados + lembretes */}
            <div className="w-[30%] flex-shrink-0 flex flex-col gap-3 min-h-0">

              {/* Mini calendar — fixed height, compact */}
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col">
                {/* Month nav */}
                <div className="flex items-center justify-between mb-1 flex-shrink-0">
                  <button onClick={() => setCalMonth(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => { const n = new Date(); n.setDate(1); setCalMonth(n); }}
                    className="text-sm font-black text-slate-700 capitalize hover:text-violet-600 transition-colors">
                    {monthLabel}
                  </button>
                  <button onClick={() => setCalMonth(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 flex-shrink-0">
                  {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((d, i) => (
                    <div key={i} className="text-center text-[9px] font-bold text-slate-400 py-0.5">{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 content-start gap-y-0 mt-0.5">
                  {cells.map((day, ci) => {
                    if (!day) return <div key={ci} />;
                    const ds = `${cy}-${String(cm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = ds === todayISO;
                    const isSel = ds === dateISO;
                    const occ = occupancyMap[ds] || 0;
                    const pct = Math.round(occ * 100);
                    const dotColor = occ === 0 ? null : occ < 0.5 ? '#22c55e' : occ < 0.85 ? '#f59e0b' : '#ef4444';
                    const isFeriado = feriados.some(f => f.dia === day);
                    return (
                      <div key={ci} className="relative flex flex-col items-center">
                        <button
                          onClick={() => setSelectedDate(new Date(cy, cm, day))}
                          onMouseEnter={() => setHoveredDay(ds)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all relative ${
                            isSel ? 'bg-violet-600 text-white shadow-sm' :
                            isToday ? 'bg-violet-100 text-violet-700' :
                            isFeriado ? 'bg-red-50 text-red-500' :
                            'text-slate-700 hover:bg-slate-100'
                          }`}>
                          {day}
                          {dotColor && !isSel && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: dotColor }} />
                          )}
                        </button>
                        {hoveredDay === ds && (pct > 0 || isFeriado) && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 pointer-events-none">
                            <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-xl">
                              {isFeriado ? feriados.find(f => f.dia === day)?.nome : `${pct}% agendado`}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-center gap-3 flex-shrink-0">
                  {[['#22c55e','< 50%'],['#f59e0b','50–85%'],['#ef4444','> 85%']].map(([c, l]) => (
                    <div key={l} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                      <span className="text-[9px] text-slate-400 font-medium">{l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feriados do mês */}
              <div className="flex-shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 p-3">
                <h4 className="font-black text-slate-700 text-xs mb-2">Feriados · {calMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h4>
                {feriados.length === 0 ? (
                  <p className="text-xs text-slate-400">Sem feriados nacionais este mês.</p>
                ) : (
                  <div className="space-y-1">
                    {feriados.map((f, fi) => (
                      <div key={fi} className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-red-500 flex-shrink-0 w-9">{String(f.dia).padStart(2,'0')}/{String(cm+1).padStart(2,'0')}</span>
                        <span className="text-[11px] text-slate-700 font-medium leading-tight">{f.nome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lembretes — checklist + notas livres, morre com a sessão */}
              <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex flex-col" style={{ minHeight: '16rem' }}>
                <h4 className="font-black text-slate-700 text-xs mb-2 flex-shrink-0">Lembretes</h4>
                {/* Add new checklist item */}
                <div className="flex gap-1.5 mb-2 flex-shrink-0">
                  <input
                    type="text"
                    value={newCheck}
                    onChange={e => setNewCheck(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCheckItem()}
                    placeholder="Nova tarefa..."
                    className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-violet-400 text-slate-700 placeholder-slate-300"
                  />
                  <button onClick={addCheckItem}
                    className="p-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex-shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Checklist items */}
                {checkItems.length > 0 && (
                  <div className="space-y-1 mb-2 flex-shrink-0 max-h-[8rem] overflow-y-auto">
                    {checkItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => setCheckItems(prev => prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i))}
                          className="w-3.5 h-3.5 accent-violet-600 flex-shrink-0 cursor-pointer"
                        />
                        <span className={`flex-1 text-xs leading-tight ${item.done ? 'line-through text-slate-300' : 'text-slate-700'}`}>{item.text}</span>
                        <button onClick={() => setCheckItems(prev => prev.filter(i => i.id !== item.id))}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all flex-shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Free text notes */}
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Notas livres..."
                  className="flex-1 resize-none text-xs text-slate-700 outline-none placeholder-slate-300 leading-relaxed w-full border-t border-slate-100 pt-2"
                  style={{ minHeight: '4rem' }}
                />
              </div>

            </div>
          </div>{/* end row 2 */}
        </div>/* end outer flex-col */
          );
        })()
      ) : (
        /* ── Day view (mobile / tablet) ── */
        <div>
      {/* Date navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
        <div className="flex items-center justify-between">
          <button onClick={() => { setSelectedDate(d => addDays(d, -1)); setActiveSlot(null); }}
            className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className={`font-black capitalize ${dateISO < todayISO ? 'text-slate-400' : 'text-slate-900'}`}>
              {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
            </p>
            <p className={`text-sm ${dateISO < todayISO ? 'text-slate-300' : 'text-slate-500'}`}>
              {selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={() => { setSelectedDate(d => addDays(d, 1)); setActiveSlot(null); }}
            className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {dateISO !== todayISO && (
          <button onClick={() => { setSelectedDate(new Date()); setActiveSlot(null); }}
            className="w-full mt-2 text-xs text-violet-500 font-semibold hover:text-violet-700 transition-colors">
            Ir para hoje
          </button>
        )}
      </div>

      {/* Custom hours badge */}
      {customHours && !isDayOff && (
        <div className="bg-amber-50 rounded-xl px-3 py-2 border border-amber-100 flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-amber-700">Horário especial hoje: {customHours.horaInicio}–{customHours.horaFim}</p>
          <button onClick={() => removeBlock(customHours.id)} className="p-1 text-amber-400 hover:text-amber-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Day off */}
      {isDayOff && (() => {
        const b = dayBlocks.find(x => x.type === 'day_off');
        return (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center mb-4">
            <p className="font-black text-red-700 text-base">Dia de folga</p>
            {b?.motivo && <p className="text-xs text-red-400 mt-1">{b.motivo}</p>}
            <button onClick={() => removeBlock(b.id)} className="mt-3 text-xs text-red-400 hover:text-red-600 font-semibold">Remover bloqueio</button>
          </div>
        );
      })()}

      {/* Proportional Timeline */}
      {!isDayOff && (() => {
        // 1.3px per minute → 60min slot ≈ 78px, legible and proportional
        const PX = 1.3;
        const dayStart = toMin(effStart);
        const dayEnd   = toMin(effEnd);
        const MIN_FREE_H = intervalo * PX; // free gap at least one full slot tall

        // Build time-ordered segments: free gaps + events
        const segs = [];
        let cur = dayStart;
        for (const ev of rawEvents) {
          const evStart = toMin(ev.hora);
          const evEnd   = evStart + Math.round(Number(ev.duracao) || intervalo);
          if (evStart < cur) { cur = Math.max(cur, evEnd); continue; }
          if (evStart > cur && cur < dayEnd) segs.push({ tipo: 'free', start: cur, end: Math.min(evStart, dayEnd) });
          if (evStart < dayEnd) { segs.push({ ...ev, start: evStart, end: Math.min(evEnd, dayEnd) }); cur = evEnd; }
        }
        if (cur < dayEnd) segs.push({ tipo: 'free', start: cur, end: dayEnd });

        // Grid ticks every intervalo
        const ticks = [];
        for (let t = dayStart; t <= dayEnd; t += intervalo) ticks.push(t);

        const containerH = (dayEnd - dayStart) * PX;

        return (
          <div className="relative" style={{ height: containerH }}>
            {/* Hour ticks (left rail + horizontal grid lines) */}
            {ticks.map(t => {
              const top = (t - dayStart) * PX;
              return (
                <div key={t} className="absolute left-0 right-0 flex items-start pointer-events-none" style={{ top }}>
                  <span className="w-12 flex-shrink-0 text-[10px] font-bold text-slate-400 leading-none pr-2 text-right select-none">{toStr(t)}</span>
                  <div className="flex-1 border-t border-slate-100" />
                </div>
              );
            })}

            {/* Segments */}
            <div className="absolute left-12 right-0 top-0">
              {segs.map((seg, i) => {
                const top    = (seg.start - dayStart) * PX + 2;
                const rawH   = (seg.end - seg.start) * PX - 4;
                const segDur = seg.end - seg.start;

                // ── Livre / Passado ───────────────────────
                if (seg.tipo === 'free') {
                  const isPast = dateISO < todayISO || (nowMin >= 0 && seg.end <= nowMin);
                  const h = rawH;
                  const isActive = activeSlot === toStr(seg.start);
                  if (isPast) return (
                    <div key={i} className="absolute left-0 right-0 px-1.5" style={{ top, height: h, zIndex: 1 }}>
                      <button
                        onClick={() => setActiveSlot(isActive ? null : toStr(seg.start))}
                        className={`w-full h-full rounded-xl border-2 border-dashed transition-all flex flex-col justify-center px-3 gap-1 ${isActive ? 'border-slate-400 bg-slate-200' : 'border-slate-300 bg-slate-100 hover:border-slate-400 hover:bg-slate-150'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                          <span className="text-xs font-bold text-slate-400">
                            {toStr(seg.start)}–{toStr(seg.end)}
                            {segDur >= 60 && <span className="font-normal text-slate-300 ml-1">({fmtDuracao(segDur)})</span>}
                          </span>
                        </div>
                        {isActive && (
                          <div className="flex gap-2 mt-1">
                            <button onClick={e => { e.stopPropagation(); openNewAppt(toStr(seg.start)); setActiveSlot(null); }}
                              className="flex-1 py-1.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 transition-colors">
                              <Plus className="w-3 h-3" />Agendar
                            </button>
                            <button onClick={e => { e.stopPropagation(); openBlock(toStr(seg.start)); setActiveSlot(null); }}
                              className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 border border-slate-200 transition-colors">
                              <Clock className="w-3 h-3" />Bloquear
                            </button>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                  return (
                    <div key={i} className="absolute left-0 right-0 px-1.5" style={{ top, height: h, zIndex: 1 }}>
                      <button
                        onClick={() => setActiveSlot(isActive ? null : toStr(seg.start))}
                        className={`w-full h-full rounded-xl border-2 border-dashed transition-all flex flex-col justify-center px-3 gap-1 ${isActive ? 'border-violet-400 bg-violet-50' : 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400 hover:bg-emerald-50'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                          <span className="text-xs font-bold text-emerald-700">
                            {toStr(seg.start)}–{toStr(seg.end)}
                            {segDur >= 60 && <span className="font-normal text-emerald-500 ml-1">({fmtDuracao(segDur)})</span>}
                          </span>
                        </div>
                        {isActive && (
                          <div className="flex gap-2 mt-1">
                            <button onClick={e => { e.stopPropagation(); openNewAppt(toStr(seg.start)); setActiveSlot(null); }}
                              className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 transition-colors">
                              <Plus className="w-3 h-3" />Agendar
                            </button>
                            <button onClick={e => { e.stopPropagation(); openBlock(toStr(seg.start)); setActiveSlot(null); }}
                              className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 border border-red-100 transition-colors">
                              <Clock className="w-3 h-3" />Bloquear
                            </button>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                }

                const h = rawH;

                // ── Bloqueio ──────────────────────────────
                if (seg.tipo === 'block') {
                  const b = seg.block;
                  return (
                    <div key={i} className="absolute left-0 right-0 px-1.5" style={{ top, height: h, zIndex: 2 }}>
                      <div className="h-full rounded-xl bg-red-50 border border-red-200 border-l-4 border-l-red-400 flex items-center px-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-red-700 leading-tight">Bloqueado</p>
                          {b.motivo && <p className="text-[10px] text-red-400 truncate">{b.motivo}</p>}
                        </div>
                        <button onClick={() => removeBlock(b.id)} className="p-1 text-red-300 hover:text-red-500 transition-colors flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                // ── Google Calendar ───────────────────────
                if (seg.tipo === 'google') {
                  const ev = seg.googleEvent;
                  return (
                    <div key={i} className="absolute left-0 right-0 px-1.5" style={{ top, height: h, zIndex: 2 }}>
                      <div className="h-full rounded-xl bg-blue-50 border border-blue-200 border-l-4 border-l-blue-500 flex items-center px-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-blue-800 truncate">{ev?.summary || 'Evento'}</p>
                          <p className="text-[10px] text-blue-500">{toStr(seg.start)}–{toStr(seg.end)} · Google</p>
                        </div>
                        <Calendar className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      </div>
                    </div>
                  );
                }

                // ── Grupo (modo Todos) ────────────────────
                if (seg.tipo === 'group') {
                  const isGroupPast = dateISO < todayISO || (nowMin >= 0 && seg.end <= nowMin);
                  return (
                    <div key={i} className="absolute left-0 right-0 px-1.5" style={{ top, height: h, zIndex: 2, filter: isGroupPast ? 'grayscale(1)' : undefined, opacity: isGroupPast ? 0.6 : 1 }}>
                      <div className="h-full flex flex-col gap-0.5">
                        {seg.appts.map((a, ai) => {
                          const prof = profissionals.find(p => p.id === a.profissionalId);
                          const cor = prof?.cor || '#7c3aed';
                          const apptH = Math.max(44, (Number(a.duracaoTotal || a.duracao) || intervalo) * PX);
                          return (
                            <div key={a.id || ai}
                              className="rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden flex"
                              style={{ height: apptH, borderLeft: `4px solid ${cor}`, backgroundColor: cor + '15' }}
                              onClick={() => setDetailAppt(a)}>
                              <div className="flex-1 px-3 py-1.5 min-w-0">
                                <p className="text-[10px] font-black leading-tight" style={{ color: cor }}>{a.hora} · {fmtDuracao(a.duracaoTotal || a.duracao)}</p>
                                <p className="font-bold text-slate-900 text-xs truncate">{a.clienteNome}</p>
                                <p className="text-[10px] text-slate-500 truncate">{a.servico}</p>
                              </div>
                              {a.clienteWhats && (
                                <a href={`https://wa.me/${a.clienteWhats.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${a.clienteNome}!`)}`}
                                  target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                  className="flex items-center px-2 flex-shrink-0 text-emerald-500 hover:text-emerald-700 transition-colors">
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ── Agendamento ───────────────────────────
                if (seg.tipo === 'appt') {
                  const a = seg.appt;
                  const apptProf = profissionals.find(p => p.id === a.profissionalId);
                  const cor = selectedProf?.cor || apptProf?.cor || '#7c3aed';
                  const totalVal = (Number(a.valor||0) + (a.extras||[]).reduce((s,e)=>s+Number(e.precoDesconto||e.preco||0),0));
                  const isApptPast = dateISO < todayISO || (nowMin >= 0 && seg.end <= nowMin);
                  return (
                    <div key={i} className="absolute left-0 right-0 px-1.5" style={{ top, height: h, zIndex: 2, filter: isApptPast ? 'grayscale(1)' : undefined, opacity: isApptPast ? 0.6 : 1 }}>
                      <div className="h-full rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden flex"
                        style={{ borderLeft: `4px solid ${cor}`, backgroundColor: cor + '12' }}
                        onClick={() => setDetailAppt(a)}>
                        <div className="flex-1 px-3 py-2 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-black" style={{ color: cor }}>{a.hora}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ backgroundColor: cor }}>{fmtDuracao(a.duracaoTotal || a.duracao)}</span>
                          </div>
                          <p className="font-black text-slate-900 text-sm leading-tight truncate">{a.clienteNome}</p>
                          <p className="text-xs text-slate-500 truncate">{a.servico}</p>
                          {h > 70 && a.extras?.filter(e => e.tipo === 'servico').map((e, ei) => (
                            <p key={ei} className="text-[10px] font-semibold truncate" style={{ color: cor }}>+ {e.nome}</p>
                          ))}
                          {h > 90 && (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {totalVal > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">R$ {totalVal.toFixed(2)}</span>}
                              {a.pagamento && <span className="text-[10px] text-slate-400 capitalize">{a.pagamento}</span>}
                            </div>
                          )}
                        </div>
                        {a.clienteWhats && (
                          <a href={`https://wa.me/${a.clienteWhats.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${a.clienteNome}! Lembrete: ${a.servico} às ${a.hora}. Até breve!`)}`}
                            target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="flex items-center px-3 flex-shrink-0 text-emerald-500 hover:text-emerald-700 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        );
      })()}
        </div>
      )}

      {showNewAppt && profile && (
        <NewAppointmentModal
          lojaId={colId} profile={profile}
          filterProfId={filterProfId || selectedProfId}
          prefilledHora={preHora} prefilledDate={dateISO}
          onClose={() => { setShowNewAppt(false); setPreHora(''); }}
          onSaved={() => { setShowNewAppt(false); setPreHora(''); }}
        />
      )}
      {showBlockModal && (
        <BlockModal
          lojaId={colId} profile={profile}
          filterProfId={filterProfId || selectedProfId}
          prefilledHora={preHora} prefilledDate={dateISO}
          onClose={() => { setShowBlockModal(false); setPreHora(''); }}
          onSaved={() => { setShowBlockModal(false); setPreHora(''); }}
        />
      )}
      {reagendarAppt && profile && (
        <NewAppointmentModal
          lojaId={colId} profile={profile}
          filterProfId={filterProfId}
          prefilledHora={''} prefilledDate={dateISO}
          prefilledNome={reagendarAppt.clienteNome}
          prefilledWhats={reagendarAppt.clienteWhats}
          prefilledServico={reagendarAppt.servico}
          prefilledProfId={reagendarAppt.profissionalId || filterProfId || selectedProfId || ''}
          replacingApptId={reagendarAppt.id}
          replacingAppt={reagendarAppt}
          onClose={() => setReagendarAppt(null)}
          onSaved={() => setReagendarAppt(null)}
        />
      )}
      {detailAppt && (
        <AppointmentDetailModal
          appt={detailAppt}
          lojaId={colId}
          profile={profile}
          profissionals={profissionals}
          onClose={() => setDetailAppt(null)}
          onReagendar={a => { setDetailAppt(null); setReagendarAppt(a); }}
          onCancelar={a => { setDetailAppt(null); cancelar(a); }}
        />
      )}
    </div>
  );
}

// ── Appointment Detail Modal ──────────────────────────────
function AppointmentDetailModal({ appt, lojaId, profile, profissionals, onClose, onReagendar, onCancelar }) {
  const intervalo = Number(profile.intervaloBase || profile.intervalo) || 60;

  // Editable state
  const [services, setServices] = useState(() => {
    const main = { nome: appt.servico, preco: appt.valor || 0, duracao: appt.duracao || intervalo, isMain: true };
    const extras = (appt.extras || []).filter(e => e.tipo === 'servico').map(e => ({ nome: e.nome, preco: e.precoDesconto || e.preco || 0, duracao: e.duracao || intervalo }));
    return [main, ...extras];
  });
  const [addingSvc, setAddingSvc] = useState(false);
  const [pagamento, setPagamento] = useState(appt.pagamento || '');
  const [desconto, setDesconto] = useState(appt.desconto != null ? String(appt.desconto) : '');
  const [observacao, setObservacao] = useState(appt.observacao || '');
  const [saving, setSaving] = useState(false);

  const prof = profissionals.find(p => p.id === appt.profissionalId);
  const cor = prof?.cor || '#7c3aed';

  const totalDuracao = services.reduce((s, sv) => s + (Number(sv.duracao) || intervalo), 0);
  const totalValor = services.reduce((s, sv) => s + (Number(sv.preco) || 0), 0);
  const descontoAmt = totalValor * (Number(desconto) / 100) || 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const [main, ...extraServices] = services;
      const newExtras = [
        ...extraServices.map(s => ({ tipo: 'servico', nome: s.nome, preco: s.preco || 0, duracao: s.duracao || intervalo })),
        ...(appt.extras || []).filter(e => e.tipo === 'produto'),
      ];
      const entry = { acao: 'Editado', at: new Date().toISOString() };
      await setDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`, appt.id),
        {
          servico: main.nome,
          valor: main.preco || null,
          duracao: main.duracao || intervalo,
          duracaoTotal: totalDuracao,
          extras: newExtras,
          pagamento: pagamento || null,
          desconto: desconto !== '' ? Number(desconto) : null,
          observacao: observacao || null,
          historico: [...(appt.historico || []), entry],
        },
        { merge: true }
      );
      onClose();
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeService = (idx) => {
    if (idx === 0 && services.length === 1) return; // can't remove only service
    setServices(prev => prev.filter((_, i) => i !== idx));
  };

  const allServicos = profile.servicos || [];
  const addableServicos = allServicos.filter(s => !services.some(sv => sv.nome === s.nome));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center lg:items-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-[480px] max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-5 py-4 z-10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{ backgroundColor: cor }}>
                {(prof?.nome || appt.profissionalNome || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm leading-tight">{appt.clienteNome}</p>
                <p className="text-xs text-slate-400">{appt.hora} · {appt.data?.split('-').reverse().join('/')} · {fmtDuracao(totalDuracao)}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {appt.clienteWhats && (
            <a href={`https://wa.me/${appt.clienteWhats.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${appt.clienteNome}!`)}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-emerald-600 flex items-center gap-1 font-semibold mt-1">
              <MessageCircle className="w-3 h-3" />{appt.clienteWhats}
            </a>
          )}
        </div>

        <div className="p-5 space-y-5 pb-8">
          {/* Services */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Serviços</label>
            <div className="space-y-2">
              {services.map((sv, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-violet-50 rounded-xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-violet-900 truncate">{sv.nome}</p>
                    <p className="text-[10px] text-violet-500">{fmtDuracao(sv.duracao)}{sv.preco > 0 ? ` · R$ ${Number(sv.preco).toFixed(2)}` : ''}</p>
                  </div>
                  {(idx > 0 || services.length > 1) && (
                    <button onClick={() => removeService(idx)} className="p-1 text-red-400 hover:text-red-600 flex-shrink-0 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {addingSvc ? (
                <div className="space-y-1">
                  {addableServicos.map(s => (
                    <button key={s.nome} onClick={() => { setServices(prev => [...prev, { nome: s.nome, preco: s.preco || 0, duracao: Number(s.duracao) || intervalo }]); setAddingSvc(false); }}
                      className="w-full text-left px-3 py-2 bg-white rounded-xl border border-slate-200 text-sm hover:border-violet-400 transition-colors">
                      <span className="font-semibold text-slate-800">{s.nome}</span>
                      {s.duracao && <span className="text-xs text-slate-400 ml-2">{fmtDuracao(s.duracao)}</span>}
                    </button>
                  ))}
                  <button onClick={() => setAddingSvc(false)} className="w-full text-xs text-slate-400 py-1 hover:text-slate-600">Cancelar</button>
                </div>
              ) : addableServicos.length > 0 && (
                <button onClick={() => setAddingSvc(true)}
                  className="w-full py-2 border border-dashed border-violet-200 rounded-xl text-xs text-violet-500 font-semibold hover:border-violet-400 hover:bg-violet-50 transition-colors flex items-center justify-center gap-1">
                  <Plus className="w-3.5 h-3.5" />Adicionar serviço
                </button>
              )}
            </div>
          </div>

          {/* Totals */}
          {(totalValor > 0 || desconto) && (
            <div className="bg-slate-50 rounded-2xl p-3 space-y-1">
              {totalValor > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-bold text-slate-800">R$ {totalValor.toFixed(2)}</span></div>}
              {descontoAmt > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Desconto ({desconto}%)</span><span className="font-bold text-red-500">-R$ {descontoAmt.toFixed(2)}</span></div>}
              {(totalValor > 0 && descontoAmt > 0) && <div className="flex justify-between text-sm border-t border-slate-200 pt-1"><span className="font-bold text-slate-700">Total</span><span className="font-black text-emerald-700">R$ {(totalValor - descontoAmt).toFixed(2)}</span></div>}
            </div>
          )}

          {/* Payment + Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Pagamento</label>
              <select value={pagamento} onChange={e => setPagamento(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                <option value="">Não informado</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="débito">Cartão Débito</option>
                <option value="crédito">Cartão Crédito</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Desconto %</label>
              <input type="number" min="0" max="100" value={desconto} onChange={e => setDesconto(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          {/* Observation */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Observação</label>
            <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3}
              placeholder="Notas do atendimento, preferências do cliente..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>

          {/* History */}
          {(appt.historico || []).length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Histórico</label>
              <div className="space-y-1.5">
                {[...appt.historico].reverse().map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                    <span className="flex-1">{h.acao}</span>
                    <span className="text-slate-300">{new Date(h.at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button onClick={() => onCancelar(appt)}
              className="flex-1 py-3 bg-red-50 text-red-500 font-bold rounded-xl text-sm hover:bg-red-100 transition-colors border border-red-100">
              Cancelar
            </button>
            <button onClick={() => onReagendar(appt)}
              className="flex-1 py-3 bg-violet-50 text-violet-600 font-bold rounded-xl text-sm hover:bg-violet-100 transition-colors border border-violet-100">
              Reagendar
            </button>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Guardar alterações
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Appointment Modal ─────────────────────────────────
function NewAppointmentModal({ lojaId, profile, filterProfId, prefilledHora, prefilledDate, onClose, onSaved,
  prefilledNome = '', prefilledWhats = '', prefilledServico = null, prefilledProfId = null,
  replacingApptId = null, replacingAppt = null }) {
  const [clienteWhats, setClienteWhats] = useState(prefilledWhats || '');
  const [clienteNome, setClienteNome] = useState(prefilledNome || '');
  const [clienteNascimento, setClienteNascimento] = useState('');
  const [existingClient, setExistingClient] = useState(null);
  const [selectedService, setSelectedService] = useState(() => {
    if (prefilledServico && profile.servicos) {
      return (profile.servicos).find(s => s.nome === prefilledServico) || null;
    }
    return null;
  });
  // Auto-assign sole professional so profissionalId is never null when only one exists
  const _autoProf = !filterProfId && !prefilledProfId && (profile.profissionals || []).length === 1
    ? profile.profissionals[0].id : null;
  const [selectedProfId, setSelectedProfId] = useState(prefilledProfId || filterProfId || _autoProf || '');
  const [data, setData] = useState(prefilledDate || new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(prefilledHora || '');
  const [slots, setSlots] = useState(null);
  const [extendedSlots, setExtendedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apptLimitReached, setApptLimitReached] = useState(false);

  // Client search by phone
  useEffect(() => {
    const phone = clienteWhats.replace(/\D/g, '');
    if (phone.length < 8) { setExistingClient(null); return; }
    getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${lojaId}`, phone))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setExistingClient(d);
          setClienteNome(prev => prev || d.nome || '');
          setClienteNascimento(prev => prev || d.nascimento || '');
        } else {
          setExistingClient(null);
        }
      });
  }, [clienteWhats, lojaId]);

  // Fetch slots when service / prof / date changes
  useEffect(() => {
    if (!selectedService || !data) return;
    setSlotsLoading(true);
    setSlots(null);
    setHora(h => (prefilledHora && h === prefilledHora) ? prefilledHora : '');
    const params = new URLSearchParams({
      lojaId,
      data,
      duracao: selectedService.duracao || profile.intervaloBase || profile.intervalo || 60,
      ...(selectedProfId ? { profissionalId: selectedProfId } : {}),
    });
    fetch(`${BACKEND_URL}/getSlots?${params}`)
      .then(r => r.json())
      .then(j => { setSlots(j.slots || []); setExtendedSlots(j.extendedSlots || []); })
      .catch(() => { setSlots([]); setExtendedSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [selectedService, selectedProfId, data, lojaId, profile.intervaloBase, profile.intervalo]);

  const profOptions = useMemo(() => {
    if (filterProfId) return (profile.profissionals || []).filter(p => p.id === filterProfId);
    if (!selectedService) return profile.profissionals || [];
    const assigned = (profile.profissionals || []).filter(p => (p.servicos || []).includes(selectedService.nome));
    return assigned.length > 0 ? assigned : (profile.profissionals || []);
  }, [selectedService, filterProfId, profile.profissionals]);

  const apptLimits = usePlanLimits(profile);

  const handleSave = async () => {
    if (!clienteNome.trim() || !selectedService || !data || !hora) return;
    setSaving(true);
    try {
      // Check monthly appointment limit for Starter plan
      if (apptLimits.maxAppointmentsPerMonth < Infinity) {
        const currentMonth = data.slice(0, 7); // YYYY-MM
        const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`));
        const monthCount = snap.docs.filter(d => (d.data().data || '').startsWith(currentMonth)).length;
        if (monthCount >= apptLimits.maxAppointmentsPerMonth) {
          setApptLimitReached(true);
          return;
        }
      }
      const selectedProf = (profile.profissionals || []).find(p => p.id === selectedProfId) || null;
      const [h, m] = hora.split(':').map(Number);
      const dtDate = new Date(`${data}T00:00:00`);
      dtDate.setHours(h, m, 0, 0);

      const apptData = {
        clienteNome: clienteNome.trim(),
        clienteWhats: clienteWhats.trim(),
        clienteNascimento: clienteNascimento || '',
        servico: selectedService.nome,
        valor: selectedService.preco || null,
        duracao: selectedService.duracao || profile.intervalo || 60,
        profissionalId: selectedProfId || null,
        profissionalNome: selectedProf?.nome || null,
        data,
        hora,
        dataHoraInternacional: dtDate.toISOString(),
        createdAt: new Date().toISOString(),
        criadoPorAdmin: true,
      };

      const apptRef = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`), apptData);

      // Upsert client (dedup by phone)
      const phone = clienteWhats.trim().replace(/\D/g, '');
      const clientKey = phone || clienteNome.trim().toLowerCase().replace(/\s+/g, '_');
      if (clientKey) {
        const clientRef = doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${lojaId}`, clientKey);
        const existing = await getDoc(clientRef);
        await setDoc(clientRef, {
          nome: clienteNome.trim(),
          whats: clienteWhats.trim(),
          nascimento: clienteNascimento || '',
          totalVisitas: existing.exists() ? (existing.data().totalVisitas || 0) + 1 : 1,
          ultimaVisita: data,
          primeiraVisita: existing.exists() ? (existing.data().primeiraVisita || data) : data,
        }, { merge: true });
      }

      // Fire-and-forget Google Calendar sync + n8n webhook
      fetch(`${BACKEND_URL}/createAppointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId, ...apptData, appointmentId: apptRef.id }),
      }).catch(() => {});

      // If reagendando, silently cancel the old appointment
      if (replacingApptId && replacingAppt) {
        fetch(`${BACKEND_URL}/cancelAppointment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lojaId,
            appointmentId: replacingApptId,
            clienteWhats: replacingAppt.clienteWhats || '',
            nomeCliente: replacingAppt.clienteNome || '',
            servico: replacingAppt.servico || '',
            data: replacingAppt.data || '',
            hora: replacingAppt.hora || '',
            profissionalNome: replacingAppt.profissionalNome || '',
          }),
        }).catch(() => {});
      }

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSave = clienteNome.trim() && selectedService && data && hora && !saving;

  if (apptLimitReached) {
    return (
      <UpgradeModal
        lojaId={lojaId}
        title="Limite de agendamentos atingido"
        message="O seu plano Starter permite 100 agendamentos por mês. Faça upgrade para Premium ou Pro para agendamentos ilimitados."
        requiredPlan="premium"
        onClose={() => { setApptLimitReached(false); setSaving(false); onClose(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center lg:items-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-[480px] max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-black text-slate-900">{replacingApptId ? 'Reagendar Marcação' : 'Nova Marcação'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 pb-8">
          {/* Client search */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">WhatsApp do cliente</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input type="tel" value={clienteWhats} onChange={e => setClienteWhats(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
            </div>
            {existingClient && (
              <div className="mt-1.5 px-3 py-2 bg-emerald-50 rounded-xl flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-emerald-700 font-semibold">Cliente encontrado: {existingClient.nome}</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nome do cliente</label>
            <input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome completo"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nascimento (opcional)</label>
            <input type="date" value={clienteNascimento} onChange={e => setClienteNascimento(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>

          {/* Service */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Serviço</label>
            <select value={selectedService?.nome || ''} onChange={e => {
              const s = (profile.servicos || []).find(sv => sv.nome === e.target.value) || null;
              setSelectedService(s);
            }}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
              <option value="">Selecione o serviço...</option>
              {(profile.servicos || []).map(s => (
                <option key={s.nome} value={s.nome}>{s.nome}{s.preco ? ` — R$ ${Number(s.preco).toFixed(2)}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Professional */}
          {!filterProfId && profOptions.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Profissional</label>
              <select value={selectedProfId} onChange={e => { setSelectedProfId(e.target.value); setHora(''); }}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                <option value="">Qualquer profissional</option>
                {profOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Data</label>
            <input type="date" value={data} onChange={e => { setData(e.target.value); setHora(''); }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>

          {/* Slots */}
          {selectedService && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Horário</label>
              {slotsLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />A verificar disponibilidade...
                </div>
              ) : slots !== null && slots.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">Sem horários disponíveis. Pode inserir manualmente abaixo.</p>
              ) : slots && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {slots.map(slot => {
                    const isExt = extendedSlots.includes(slot);
                    return (
                      <button key={slot} type="button" onClick={() => setHora(slot)}
                        className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all relative ${hora === slot ? 'bg-violet-600 text-white border-violet-600' : isExt ? 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400' : 'bg-white text-slate-700 border-slate-100 hover:border-violet-200'}`}>
                        {slot}
                        {isExt && hora !== slot && <span className="absolute -top-1.5 -right-1 text-[8px] bg-amber-400 text-white px-1 rounded-full font-black leading-4">+</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="time" value={hora} onChange={e => setHora(e.target.value)} placeholder="Ou insira manualmente"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
              </div>
            </div>
          )}

          <button onClick={handleSave} disabled={!canSave}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Confirmar Marcação
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Block Modal ───────────────────────────────────────────
function BlockModal({ lojaId, filterProfId, profile, prefilledHora, prefilledDate, onClose, onSaved }) {
  const [type, setType] = useState(prefilledHora ? 'slot' : 'day_off');
  const [date, setDate] = useState(prefilledDate || new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(prefilledHora || '');
  const [duracao, setDuracao] = useState(60);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [profissionalId, setProfissionalId] = useState(filterProfId || '');
  const [saving, setSaving] = useState(false);

  const canSave = date && !saving &&
    (type === 'day_off' || (type === 'slot' && hora) || (type === 'custom_hours' && horaInicio && horaFim));

  const handleSave = async () => {
    setSaving(true);
    try {
      const blockData = {
        type,
        date,
        profissionalId: profissionalId || null,
        motivo: motivo.trim() || null,
        createdAt: new Date().toISOString(),
        ...(type === 'slot' ? { hora, duracao: Number(duracao) } : {}),
        ...(type === 'custom_hours' ? { horaInicio, horaFim } : {}),
      };
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', `blocks_${lojaId}`), blockData);
      // Fire-and-forget sync to Google Calendar
      fetch(`${BACKEND_URL}/createBlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId, ...blockData }),
      }).catch(() => {});
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = [
    { key: 'day_off', label: 'Dia de folga' },
    { key: 'slot', label: 'Bloquear horário' },
    { key: 'custom_hours', label: 'Horário especial' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center lg:items-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-[480px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-black text-slate-900">Bloquear / Folga</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 pb-8">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map(t => (
                <button key={t.key} onClick={() => setType(t.key)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-colors text-center leading-tight ${type === t.key ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>

          {!filterProfId && (profile?.profissionals || []).length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Profissional (opcional — vazio = todos)</label>
              <select value={profissionalId} onChange={e => setProfissionalId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                <option value="">Todos os profissionais</option>
                {(profile.profissionals || []).map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          )}

          {type === 'slot' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Hora</label>
                <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Duração</label>
                <select value={duracao} onChange={e => setDuracao(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                  {[30, 60, 90, 120, 180, 240].map(v => (
                    <option key={v} value={v}>{fmtDuracao(v)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === 'custom_hours' && (
            <>
              <p className="text-xs text-slate-400">Neste dia, o horário de trabalho será diferente do normal.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Início</label>
                  <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Fim</label>
                  <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Motivo (opcional)</label>
            <input value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Férias, consulta, evento..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>

          <button onClick={handleSave} disabled={!canSave}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Confirmar bloqueio
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin Clients ─────────────────────────────────────────
function AdminClients({ user, lojaId, filterProfId, isAdmin }) {
  const [apptMap, setApptMap] = useState({});
  const [directMap, setDirectMap] = useState({});
  const [deletedKeys, setDeletedKeys] = useState(new Set());
  const [selectedClient, setSelectedClient] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newWhats, setNewWhats] = useState('');
  const [newNasc, setNewNasc] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const colId = lojaId || user.uid;

  // Appointments-derived clients
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${colId}`);
    const unsub = onSnapshot(q, (snap) => {
      let appts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (filterProfId) appts = appts.filter(a => a.profissionalId === filterProfId);
      const map = {};
      appts.forEach(a => {
        const key = (a.clienteWhats || '').replace(/\D/g, '') || (a.clienteNome || '').toLowerCase().replace(/\s+/g, '_');
        if (!key) return;
        if (!map[key]) {
          map[key] = { key, nome: a.clienteNome, whats: a.clienteWhats, nascimento: a.clienteNascimento || '', visitas: [], ultimaVisita: a.data };
        } else {
          if (a.data > map[key].ultimaVisita) map[key].ultimaVisita = a.data;
        }
        map[key].visitas.push(a);
      });
      setApptMap(map);
    });
    return () => unsub();
  }, [user, colId, filterProfId]);

  // Direct clients collection — track deleted flag
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', APP_ID, 'public', 'data', `clients_${colId}`);
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      const deleted = new Set();
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.deleted) { deleted.add(d.id); return; }
        map[d.id] = { key: d.id, visitas: [], ...data };
      });
      setDirectMap(map);
      setDeletedKeys(deleted);
    });
    return () => unsub();
  }, [user, colId]);

  const clients = useMemo(() => {
    const merged = { ...directMap };
    Object.values(apptMap).forEach(c => {
      if (deletedKeys.has(c.key)) return;
      if (merged[c.key]) {
        merged[c.key] = { ...merged[c.key], visitas: c.visitas, ultimaVisita: c.ultimaVisita };
      } else {
        merged[c.key] = c;
      }
    });
    return Object.values(merged);
  }, [apptMap, directMap, deletedKeys]);

  const displayedClients = useMemo(() => {
    let list = clients;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.nome || '').toLowerCase().includes(q) ||
        (c.whats || '').includes(q)
      );
    }
    if (sortBy === 'alpha')   return [...list].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));
    if (sortBy === 'oldest')  return [...list].sort((a, b) => (a.ultimaVisita || '').localeCompare(b.ultimaVisita || ''));
    return [...list].sort((a, b) => (b.ultimaVisita || '').localeCompare(a.ultimaVisita || ''));
  }, [clients, search, sortBy]);

  const handleDeleteClient = async (c, e) => {
    e.stopPropagation();
    if (!window.confirm(`Excluir ${c.nome}? Esta ação não pode ser desfeita.`)) return;
    // Soft-delete: write deleted:true so apptMap-derived clients also disappear
    await setDoc(
      doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${colId}`, c.key),
      { deleted: true },
      { merge: true }
    );
  };

  const handleAddClient = async () => {
    if (!newNome.trim()) return;
    setAddSaving(true);
    try {
      const phone = newWhats.replace(/\D/g, '');
      const key = phone || newNome.trim().toLowerCase().replace(/\s+/g, '_');
      await setDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${colId}`, key),
        { nome: newNome.trim(), whats: newWhats.trim(), nascimento: newNasc || '', totalVisitas: 0, ultimaVisita: '', primeiraVisita: '' },
        { merge: true }
      );
      setNewNome(''); setNewWhats(''); setNewNasc('');
      setShowAddForm(false);
    } finally {
      setAddSaving(false);
    }
  };

  if (selectedClient) {
    return <ClientDetail user={user} lojaId={colId} clientData={selectedClient} onBack={() => setSelectedClient(null)} />;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Clientes</h2>
          <p className="text-xs text-slate-400">{clients.length} cliente{clients.length !== 1 ? 's' : ''} registado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAddForm(v => !v)}
          className="p-2.5 bg-violet-600 rounded-xl text-white hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search + filters */}
      <div className="mb-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou WhatsApp"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
        </div>
        <div className="flex gap-2">
          {[['recent','Mais recentes'],['oldest','Mais antigos'],['alpha','A–Z']].map(([val, label]) => (
            <button key={val} onClick={() => setSortBy(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sortBy === val ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-violet-300'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-violet-100 mb-4 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Novo cliente</h3>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">WhatsApp</label>
            <input type="tel" value={newWhats} onChange={e => setNewWhats(e.target.value)} placeholder="(11) 99999-9999"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
            <p className="text-[10px] text-slate-400 mt-1">Usado para identificar e evitar duplicados.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nome</label>
            <input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Nome completo"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nascimento (opcional)</label>
            <input type="date" value={newNasc} onChange={e => setNewNasc(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddClient} disabled={!newNome.trim() || addSaving}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-colors">
              {addSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Guardar cliente
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-3 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {displayedClients.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-400 text-sm font-medium">{search ? 'Nenhum cliente encontrado.' : 'Ainda sem clientes registados.'}</p>
          {!search && <button onClick={() => setShowAddForm(true)} className="mt-3 text-violet-500 text-xs font-semibold">+ Adicionar cliente</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {displayedClients.map(c => (
            <div key={c.key} className="bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center hover:shadow-md transition-shadow">
              <button onClick={() => setSelectedClient(c)} className="flex items-center gap-3 flex-1 min-w-0 p-4 text-left">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ backgroundColor: '#7c3aed' }}>
                  {(c.nome || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{c.nome}</p>
                  <p className="text-xs text-slate-400 truncate">{c.whats}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-violet-600">{(c.visitas||[]).length} visita{(c.visitas||[]).length !== 1 ? 's' : ''}</p>
                  {c.ultimaVisita && <p className="text-[10px] text-slate-400">última: {fmtData(c.ultimaVisita)}</p>}
                </div>
              </button>
              {isAdmin && (
                <button onClick={(e) => handleDeleteClient(c, e)} className="p-3 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 pr-4">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientDetail({ user, lojaId, clientData, onBack }) {
  const [nome, setNome] = useState(clientData.nome || '');
  const [whats, setWhats] = useState(clientData.whats || '');
  const [nascimento, setNascimento] = useState(clientData.nascimento || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const clientKey = (whats || '').replace(/\D/g, '') || nome.toLowerCase().replace(/\s+/g, '_');
      await setDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${lojaId || user.uid}`, clientKey),
        { nome, whats, nascimento, ultimaVisita: clientData.ultimaVisita || '', totalVisitas: clientData.visitas.length },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const waLink = () => {
    const n = (whats || '').replace(/\D/g, '');
    return `https://wa.me/${n.startsWith('55') ? n : '55' + n}`;
  };

  const recentVisitas = [...clientData.visitas].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-violet-600 font-semibold text-sm mb-5 hover:text-violet-800">
        <ArrowLeft className="w-4 h-4" />
        Clientes
      </button>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-2xl flex-shrink-0"
            style={{ backgroundColor: '#7c3aed' }}>
            {(nome || '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-black text-slate-900 text-lg">{clientData.nome}</p>
            <p className="text-xs text-slate-400">{clientData.visitas.length} visita{clientData.visitas.length !== 1 ? 's' : ''} · última em {fmtData(clientData.ultimaVisita)}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">WhatsApp</label>
            <input value={whats} onChange={e => setWhats(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Data de Nascimento</label>
            <input type="date" value={nascimento} onChange={e => setNascimento(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
            {saved ? 'Guardado!' : 'Guardar'}
          </button>
          {whats && (
            <a href={waLink()} target="_blank" rel="noopener noreferrer"
              className="px-4 py-3 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-2 font-semibold text-sm hover:bg-emerald-100 transition-colors">
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {recentVisitas.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4 text-sm">Últimas visitas</h3>
          <div className="space-y-1">
            {recentVisitas.map((v, i) => {
              const isOpen = selectedVisit === i;
              const extraSvcs = (v.extras || []).filter(e => e.tipo === 'servico');
              const totalValor = (Number(v.valor) || 0) + extraSvcs.reduce((s, e) => s + (Number(e.preco) || 0), 0);
              const descontoAmt = totalValor * ((Number(v.desconto) || 0) / 100);
              return (
                <div key={i} className="border-b border-slate-50 last:border-0">
                  <button
                    onClick={() => setSelectedVisit(isOpen ? null : i)}
                    className="w-full flex items-center justify-between py-2.5 text-left hover:bg-slate-50 rounded-xl px-2 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{v.servico || 'Marcação'}</p>
                      {v.profissionalNome && <p className="text-xs text-violet-500">com {v.profissionalNome}</p>}
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className="text-xs text-slate-500">{fmtData(v.data)} · {v.hora}</p>
                        {v.valor && <p className="text-xs font-bold text-emerald-600">R$ {Number(v.valor).toFixed(2)}</p>}
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mx-2 mb-3 p-4 bg-slate-50 rounded-2xl space-y-3">
                      {/* Extra services */}
                      {extraSvcs.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Serviços</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-700">
                              <span>{v.servico}</span>
                              {v.valor > 0 && <span className="font-semibold">R$ {Number(v.valor).toFixed(2)}</span>}
                            </div>
                            {extraSvcs.map((e, ei) => (
                              <div key={ei} className="flex justify-between text-xs text-slate-700">
                                <span>{e.nome}</span>
                                {e.preco > 0 && <span className="font-semibold">R$ {Number(e.preco).toFixed(2)}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Totals */}
                      {(totalValor > 0 || v.desconto) && (
                        <div className="bg-white rounded-xl p-2.5 space-y-1">
                          {totalValor > 0 && <div className="flex justify-between text-xs"><span className="text-slate-500">Subtotal</span><span className="font-bold">R$ {totalValor.toFixed(2)}</span></div>}
                          {descontoAmt > 0 && <div className="flex justify-between text-xs"><span className="text-slate-500">Desconto ({v.desconto}%)</span><span className="font-bold text-red-500">-R$ {descontoAmt.toFixed(2)}</span></div>}
                          {descontoAmt > 0 && totalValor > 0 && <div className="flex justify-between text-xs border-t border-slate-100 pt-1"><span className="font-bold text-slate-700">Total</span><span className="font-black text-emerald-700">R$ {(totalValor - descontoAmt).toFixed(2)}</span></div>}
                        </div>
                      )}
                      {/* Payment + Discount */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {v.pagamento && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pagamento</p>
                            <p className="font-semibold text-slate-700 capitalize">{v.pagamento}</p>
                          </div>
                        )}
                        {v.desconto != null && v.desconto !== '' && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Desconto</p>
                            <p className="font-semibold text-slate-700">{v.desconto}%</p>
                          </div>
                        )}
                      </div>
                      {/* Observation */}
                      {v.observacao && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Observação</p>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap">{v.observacao}</p>
                        </div>
                      )}
                      {/* History */}
                      {(v.historico || []).length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Histórico</p>
                          <div className="space-y-1">
                            {[...v.historico].reverse().map((h, hi) => (
                              <div key={hi} className="flex items-center gap-2 text-[10px] text-slate-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                                <span className="flex-1">{h.acao}</span>
                                <span className="text-slate-300">{new Date(h.at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Equipe ──────────────────────────────────────────
function AdminEquipe({ user, profile, setProfile }) {
  const limits = usePlanLimits(profile);
  const [profissionals, setProfissionals] = useState(profile.profissionals || []);
  const [expandedId, setExpandedId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [newProf, setNewProf] = useState({ nome: '', cor: PROF_COLORS[0], servicos: [], agendaTipo: 'nativa' });
  const [calStatus, setCalStatus] = useState({}); // profId -> { connected: bool }
  const [inviteLinks, setInviteLinks] = useState({}); // profId -> invite URL
  const [generatingInvite, setGeneratingInvite] = useState({}); // profId -> bool
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Check Google Calendar connection status for each professional
    const checkCals = async () => {
      const status = {};
      for (const p of profissionals) {
        try {
          const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'prof_cals', `${user.uid}_${p.id}`));
          status[p.id] = { connected: snap.exists() && snap.data().googleCalendarConnected === true };
        } catch {
          status[p.id] = { connected: false };
        }
      }
      setCalStatus(status);
    };
    if (profissionals.length > 0) checkCals();
  }, [profissionals, user.uid]);

  // Handle success/error params from Google OAuth per prof
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') && params.get('profId')) {
      const profId = params.get('profId');
      setCalStatus(prev => ({ ...prev, [profId]: { connected: true } }));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const saveProfissionals = async (list) => {
    setSaving(true);
    try {
      const updated = { ...profile, profissionals: list };
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), { profissionals: list }, { merge: true });
      setProfissionals(list);
      setProfile(updated);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p) => {
    setExpandedId(p.id);
    setEditData({ ...p });
  };

  const saveEdit = async () => {
    const updated = profissionals.map(p => p.id === editData.id ? { ...editData } : p);
    await saveProfissionals(updated);
    setExpandedId(null);
  };

  const deleteProf = async (id) => {
    if (!window.confirm('Remover este profissional?')) return;
    await saveProfissionals(profissionals.filter(p => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const addProf = async () => {
    if (!newProf.nome.trim()) return;
    if (profissionals.length >= limits.maxProfissionals) {
      setShowAddForm(false);
      setShowUpgradeModal(true);
      return;
    }
    const prof = { ...newProf, id: newId(), nome: newProf.nome.trim() };
    await saveProfissionals([...profissionals, prof]);
    setNewProf({ nome: '', cor: PROF_COLORS[0], servicos: [], agendaTipo: 'nativa' });
    setShowAddForm(false);
  };

  const generateInvite = async (p) => {
    setGeneratingInvite(prev => ({ ...prev, [p.id]: true }));
    try {
      const token = Math.random().toString(36).substr(2, 12) + Math.random().toString(36).substr(2, 12);
      await setDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'invites', token),
        { lojaId: user.uid, profissionalId: p.id, profNome: p.nome, createdAt: new Date().toISOString(), used: false }
      );
      const link = `${window.location.origin}/#invite/${token}`;
      setInviteLinks(prev => ({ ...prev, [p.id]: link }));
    } finally {
      setGeneratingInvite(prev => ({ ...prev, [p.id]: false }));
    }
  };

  const startGoogleAuth = (profId) => {
    const state = `${user.uid}|${profId}`;
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      redirect_uri: 'https://hute.netlify.app/.netlify/functions/googleAuthCallback',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const toggleEditServico = (nome) => {
    const list = editData.servicos || [];
    setEditData(prev => ({
      ...prev,
      servicos: list.includes(nome) ? list.filter(s => s !== nome) : [...list, nome]
    }));
  };

  const toggleNewServico = (nome) => {
    const list = newProf.servicos || [];
    setNewProf(prev => ({
      ...prev,
      servicos: list.includes(nome) ? list.filter(s => s !== nome) : [...list, nome]
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900">Equipe</h2>
          <p className="text-xs text-slate-400">{profissionals.length} profissional{profissionals.length !== 1 ? 'is' : ''}</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {profissionals.map(p => {
          const isExpanded = expandedId === p.id;
          const googleConnected = calStatus[p.id]?.connected;

          return (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => isExpanded ? setExpandedId(null) : startEdit(p)}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ backgroundColor: p.cor || '#7c3aed' }}>
                  {(p.nome || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900">{p.nome}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${googleConnected ? 'bg-emerald-50 text-emerald-600' : p.agendaTipo === 'google' ? 'bg-amber-50 text-amber-600' : 'bg-violet-50 text-violet-600'}`}>
                      {googleConnected ? 'Google ✓' : p.agendaTipo === 'google' ? 'Google (desligado)' : 'Nativa'}
                    </span>
                    {(p.servicos || []).length === 0
                      ? <span className="text-[10px] text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">Sem serviços</span>
                      : (p.servicos || []).slice(0, 3).map(s => (
                          <span key={s} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
                        ))
                    }
                    {(p.servicos || []).length > 3 && <span className="text-[10px] text-slate-400">+{p.servicos.length - 3}</span>}
                  </div>
                </div>
                <Edit2 className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 p-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nome</label>
                    <input value={editData.nome || ''} onChange={e => setEditData(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Cor</label>
                    <div className="flex gap-2 flex-wrap">
                      {PROF_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setEditData(prev => ({ ...prev, cor: c }))}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${editData.cor === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>

                  <div className={`rounded-2xl p-3 border ${(editData.servicos || []).length === 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                      Serviços deste profissional
                    </label>
                    {(profile.servicos || []).length === 0 ? (
                      <p className="text-xs text-slate-400">Adicione serviços primeiro na aba <strong>Serviços</strong>.</p>
                    ) : (
                      <div className="space-y-2">
                        {profile.servicos.map(s => (
                          <label key={s.nome} className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox"
                              checked={(editData.servicos || []).includes(s.nome)}
                              onChange={() => toggleEditServico(s.nome)}
                              className="w-4 h-4 accent-violet-600" />
                            <div className="flex-1">
                              <span className="text-sm text-slate-700 font-medium">{s.nome}</span>
                              {s.preco && <span className="text-xs text-slate-400 ml-2">R$ {Number(s.preco).toFixed(2)}</span>}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    {(editData.servicos || []).length === 0 && (profile.servicos || []).length > 0 && (
                      <p className="text-[11px] text-amber-600 mt-2">⚠ Selecione pelo menos um serviço para este profissional aparecer na agenda dos clientes.</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Tipo de agenda</label>
                    <div className="flex gap-2">
                      {['nativa', 'google'].map(tipo => (
                        <button key={tipo} type="button"
                          onClick={() => setEditData(prev => ({ ...prev, agendaTipo: tipo }))}
                          className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${editData.agendaTipo === tipo ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          {tipo === 'nativa' ? 'Agenda Nativa' : 'Google Agenda'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Dias de trabalho ── */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-3">Dias de trabalho</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((nome, dia) => {
                        const active = !(editData.diasTrabalho?.length > 0) || editData.diasTrabalho.includes(dia);
                        return (
                          <button key={dia} type="button" onClick={() => {
                            const current = editData.diasTrabalho?.length > 0 ? editData.diasTrabalho : [0,1,2,3,4,5,6];
                            const next = current.includes(dia) ? current.filter(d => d !== dia) : [...current, dia].sort();
                            setEditData(prev => ({ ...prev, diasTrabalho: next }));
                          }} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${active ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                            {nome}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">Sem seleção = todos os dias do estabelecimento</p>
                  </div>

                  {/* ── Pausa / Almoço ── */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pausa / Almoço</label>
                      <button type="button" onClick={() => setEditData(prev => ({
                        ...prev,
                        pausa: prev.pausa ? null : { inicio: '12:00', fim: '13:00' }
                      }))} className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${editData.pausa ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-500'}`}>
                        {editData.pausa ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                    {editData.pausa && (
                      <div className="flex gap-2 items-center">
                        <input type="time" value={editData.pausa.inicio} onChange={e => setEditData(prev => ({ ...prev, pausa: { ...prev.pausa, inicio: e.target.value } }))}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                        <span className="text-slate-400 text-sm">–</span>
                        <input type="time" value={editData.pausa.fim} onChange={e => setEditData(prev => ({ ...prev, pausa: { ...prev.pausa, fim: e.target.value } }))}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                      </div>
                    )}
                  </div>

                  {/* ── Horário personalizado ── */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Horário personalizado</label>
                      <button type="button" onClick={() => setEditData(prev => ({
                        ...prev,
                        horarioProprio: prev.horarioProprio ? null : { abertura: '09:00', fechamento: '18:00' }
                      }))} className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${editData.horarioProprio ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-500'}`}>
                        {editData.horarioProprio ? 'Ativo' : 'Segue o estab.'}
                      </button>
                    </div>
                    {editData.horarioProprio && (
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <p className="text-[10px] text-slate-400 mb-1">Entrada</p>
                          <input type="time" value={editData.horarioProprio.abertura} onChange={e => setEditData(prev => ({ ...prev, horarioProprio: { ...prev.horarioProprio, abertura: e.target.value } }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] text-slate-400 mb-1">Saída</p>
                          <input type="time" value={editData.horarioProprio.fechamento} onChange={e => setEditData(prev => ({ ...prev, horarioProprio: { ...prev.horarioProprio, fechamento: e.target.value } }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {editData.agendaTipo === 'google' && (
                    <div>
                      {googleConnected ? (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl text-sm font-semibold">
                          <CheckCircle className="w-4 h-4" />
                          Google Agenda ligado
                        </div>
                      ) : (
                        <button onClick={() => startGoogleAuth(p.id)}
                          className="w-full py-3 bg-blue-50 text-blue-600 font-semibold rounded-xl text-sm hover:bg-blue-100 transition-colors">
                          Ligar Google Agenda
                        </button>
                      )}
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Acesso Staff</label>
                    {inviteLinks[p.id] ? (
                      <div>
                        <p className="text-[11px] text-slate-500 mb-1.5">Partilhe este link com o profissional:</p>
                        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2">
                          <p className="text-[11px] text-slate-700 flex-1 break-all">{inviteLinks[p.id]}</p>
                          <button onClick={() => { navigator.clipboard.writeText(inviteLinks[p.id]); }}
                            className="p-1 text-slate-400 hover:text-violet-600 transition-colors flex-shrink-0">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button onClick={() => generateInvite(p)} disabled={generatingInvite[p.id]}
                          className="mt-2 text-[11px] text-violet-500 hover:underline">
                          Gerar novo link
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => generateInvite(p)} disabled={generatingInvite[p.id]}
                        className="w-full py-2.5 border border-dashed border-violet-200 text-violet-600 font-semibold rounded-xl text-xs hover:bg-violet-50 transition-colors flex items-center justify-center gap-2">
                        {generatingInvite[p.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Gerar Link de Convite
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={saveEdit} disabled={saving}
                      className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Guardar
                    </button>
                    <button onClick={() => deleteProf(p.id)}
                      className="px-4 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAddForm ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
          <h3 className="font-bold text-slate-900">Novo profissional</h3>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nome</label>
            <input value={newProf.nome} onChange={e => setNewProf(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Ex: Maria Costa"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {PROF_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewProf(prev => ({ ...prev, cor: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${newProf.cor === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className={`rounded-2xl p-3 border ${(newProf.servicos || []).length === 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Serviços deste profissional
            </label>
            {(profile.servicos || []).length === 0 ? (
              <p className="text-xs text-slate-400">Adicione serviços primeiro na aba <strong>Serviços</strong>.</p>
            ) : (
              <div className="space-y-2">
                {profile.servicos.map(s => (
                  <label key={s.nome} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox"
                      checked={(newProf.servicos || []).includes(s.nome)}
                      onChange={() => toggleNewServico(s.nome)}
                      className="w-4 h-4 accent-violet-600" />
                    <div className="flex-1">
                      <span className="text-sm text-slate-700 font-medium">{s.nome}</span>
                      {s.preco && <span className="text-xs text-slate-400 ml-2">R$ {Number(s.preco).toFixed(2)}</span>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Tipo de agenda</label>
            <div className="flex gap-2">
              {['nativa', 'google'].map(tipo => (
                <button key={tipo} type="button"
                  onClick={() => setNewProf(prev => ({ ...prev, agendaTipo: tipo }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${newProf.agendaTipo === tipo ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  {tipo === 'nativa' ? 'Agenda Nativa' : 'Google Agenda'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addProf} disabled={!newProf.nome.trim() || saving}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40">
              Adicionar
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-3 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => profissionals.length >= limits.maxProfissionals ? setShowUpgradeModal(true) : setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-violet-200 text-violet-600 font-semibold rounded-2xl hover:bg-violet-50 transition-colors text-sm">
          <Plus className="w-4 h-4" />
          Adicionar Profissional
          {profissionals.length >= limits.maxProfissionals && (
            <span className="text-[10px] bg-violet-100 text-violet-600 font-black px-1.5 py-0.5 rounded-full ml-1">
              {limits.effectivePlan === 'starter' ? 'Premium' : 'Pro'}
            </span>
          )}
        </button>
      )}

      {showUpgradeModal && (
        <UpgradeModal
          lojaId={user.uid}
          title="Limite de profissionais atingido"
          message={`O seu plano ${limits.effectivePlan === 'starter' ? 'Starter permite 1 profissional. Faça upgrade para Premium para ter até 5.' : 'Premium permite 5 profissionais. Faça upgrade para Pro para ter profissionais ilimitados.'}`}
          requiredPlan={limits.effectivePlan === 'starter' ? 'premium' : 'pro'}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}

// ── Admin Servicos ────────────────────────────────────────
function AdminServicos({ user, profile, setProfile }) {
  const [servicos, setServicos] = useState(profile.servicos || []);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [sobOrcamento, setSobOrcamento] = useState(false);
  const [duracao, setDuracao] = useState(60);
  const [novaFoto, setNovaFoto] = useState(null);
  const [tipoAviso, setTipoAviso] = useState('nenhum');
  const [diasAviso, setDiasAviso] = useState('');
  const [servicoManutencao, setServicoManutencao] = useState('');
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  const saveServicos = async (list) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), { servicos: list }, { merge: true });
      setServicos(list);
      setProfile(prev => ({ ...prev, servicos: list }));
    } finally {
      setSaving(false);
    }
  };

  const addServico = async (overrides = {}) => {
    const nomeVal = (overrides.nome || nome).trim();
    if (!nomeVal) return;
    const isSobOrc = overrides.sobOrcamento !== undefined ? overrides.sobOrcamento : sobOrcamento;
    const novo = {
      nome: nomeVal,
      preco: isSobOrc ? null : (overrides.preco !== undefined ? overrides.preco : (preco ? Number(preco) : null)),
      sobOrcamento: isSobOrc || undefined,
      duracao: overrides.duracao !== undefined ? overrides.duracao : Number(duracao),
      foto: overrides.foto !== undefined ? overrides.foto : (novaFoto || null),
      tipoAviso: overrides.tipoAviso !== undefined ? overrides.tipoAviso : (tipoAviso !== 'nenhum' ? tipoAviso : undefined),
      diasAviso: overrides.diasAviso !== undefined ? overrides.diasAviso : (tipoAviso !== 'nenhum' && diasAviso ? Number(diasAviso) : undefined),
      servicoManutencao: overrides.servicoManutencao !== undefined ? overrides.servicoManutencao : (tipoAviso === 'manutencao' ? servicoManutencao || undefined : undefined),
    };
    // Remove undefined/false keys
    Object.keys(novo).forEach(k => (novo[k] === undefined || novo[k] === false) && delete novo[k]);
    const updated = [...servicos, novo];
    await saveServicos(updated);
    if (!overrides.nome) {
      setNome(''); setPreco(''); setSobOrcamento(false); setDuracao(60); setNovaFoto(null);
      setTipoAviso('nenhum'); setDiasAviso(''); setServicoManutencao('');
      setShowAddDrawer(false);
    }
    return novo;
  };

  const criarServicoManutencaoRapido = async () => {
    const nomeManut = `Manutenção${nome.trim() ? ` de ${nome.trim()}` : ''}`;
    await saveServicos([...servicos, { nome: nomeManut, preco: null, duracao: 30, foto: null }]);
    setServicoManutencao(nomeManut);
  };

  const removeServico = async (i) => {
    if (!window.confirm('Remover este serviço?')) return;
    await saveServicos(servicos.filter((_, idx) => idx !== i));
  };

  const startEdit = (i) => {
    setEditIdx(i);
    setEditData({ tipoAviso: 'nenhum', diasAviso: '', servicoManutencao: '', ...servicos[i] });
  };

  const saveEdit = async () => {
    const d = { ...editData };
    if (d.tipoAviso === 'nenhum' || !d.tipoAviso) {
      delete d.tipoAviso; delete d.diasAviso; delete d.servicoManutencao;
    } else if (d.tipoAviso === 'reagendamento') {
      delete d.servicoManutencao;
      if (d.diasAviso) d.diasAviso = Number(d.diasAviso);
    } else {
      if (d.diasAviso) d.diasAviso = Number(d.diasAviso);
    }
    const updated = servicos.map((s, i) => i === editIdx ? d : s);
    await saveServicos(updated);
    setEditIdx(null);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900">Serviços</h2>
          <p className="text-xs text-slate-400">{servicos.length} serviço{servicos.length !== 1 ? 's' : ''} disponível{servicos.length !== 1 ? 'is' : ''}</p>
        </div>
        <button onClick={() => setShowAddDrawer(true)}
          className="p-2.5 bg-violet-600 rounded-xl text-white hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 mb-5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {servicos.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {editIdx === i ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <ImageUpload value={editData.foto || null} onChange={v => setEditData(p => ({ ...p, foto: v }))} aspect="thumb" />
                  <div className="flex-1 space-y-2">
                    <input value={editData.nome || ''} onChange={e => setEditData(p => ({ ...p, nome: e.target.value }))}
                      placeholder="Nome do serviço"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      {editData.sobOrcamento ? (
                        <button onClick={() => setEditData(p => ({ ...p, sobOrcamento: false }))}
                          className="px-3 py-2 border border-amber-300 bg-amber-50 rounded-xl text-amber-700 text-xs font-bold text-left">
                          Sob Orçamento ✕
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <input type="number" value={editData.preco || ''} onChange={e => setEditData(p => ({ ...p, preco: e.target.value ? Number(e.target.value) : null }))}
                            placeholder="Preço R$"
                            className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                          <button onClick={() => setEditData(p => ({ ...p, sobOrcamento: true, preco: null }))}
                            title="Sob Orçamento"
                            className="px-2 py-2 border border-slate-200 rounded-xl text-slate-400 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-colors text-xs font-bold">
                            S/O
                          </button>
                        </div>
                      )}
                      <select value={editData.duracao || 60} onChange={e => setEditData(p => ({ ...p, duracao: Number(e.target.value) }))}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                        {[15, 20, 30, 45, 60, 90, 120, 150, 180].map(v => (
                          <option key={v} value={v}>{fmtDuracao(v)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                {/* Aviso de retorno — edit */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Aviso de retorno</label>
                  <select value={editData.tipoAviso || 'nenhum'} onChange={e => setEditData(p => ({ ...p, tipoAviso: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                    <option value="nenhum">Nenhum</option>
                    <option value="reagendamento">Reagendamento</option>
                    <option value="manutencao">Manutenção</option>
                  </select>
                  {(editData.tipoAviso && editData.tipoAviso !== 'nenhum') && (
                    <input type="number" value={editData.diasAviso || ''} onChange={e => setEditData(p => ({ ...p, diasAviso: e.target.value }))}
                      placeholder="Intervalo em dias (ex: 15)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                  )}
                  {editData.tipoAviso === 'manutencao' && (
                    <div className="space-y-1.5">
                      <select value={editData.servicoManutencao || ''} onChange={e => setEditData(p => ({ ...p, servicoManutencao: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                        <option value="">Selecionar serviço de manutenção</option>
                        {servicos.filter((_, idx) => idx !== editIdx).map(s => (
                          <option key={s.nome} value={s.nome}>{s.nome}</option>
                        ))}
                      </select>
                      {!editData.servicoManutencao && (
                        <button onClick={async () => {
                          const nomeManut = `Manutenção${editData.nome ? ` de ${editData.nome}` : ''}`;
                          await saveServicos([...servicos, { nome: nomeManut, preco: null, duracao: 30, foto: null }]);
                          setEditData(p => ({ ...p, servicoManutencao: nomeManut }));
                        }} className="w-full py-2 border border-dashed border-violet-300 text-violet-600 rounded-xl text-xs font-bold hover:bg-violet-50 transition-colors flex items-center justify-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" /> Criar serviço de manutenção
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* Serviços complementares */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Serviços complementares</label>
                  {servicos.filter((_, idx) => idx !== editIdx).length === 0
                    ? <p className="text-xs text-slate-300 italic">Adicione mais serviços para configurar complementares</p>
                    : servicos.filter((_, idx) => idx !== editIdx).map(s => {
                        const current = (editData.crossSell || []).find(c => c.servicoNome === s.nome);
                        return (
                          <div key={s.nome} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                            <input type="checkbox" checked={!!current}
                              onChange={e => {
                                const prev = editData.crossSell || [];
                                setEditData(p => ({
                                  ...p,
                                  crossSell: e.target.checked
                                    ? [...prev, { servicoNome: s.nome, desconto: 10 }]
                                    : prev.filter(c => c.servicoNome !== s.nome),
                                }));
                              }}
                              className="accent-violet-600 w-4 h-4 flex-shrink-0" />
                            <span className="text-sm flex-1 text-slate-700">{s.nome}</span>
                            {current && (
                              <div className="flex items-center gap-1">
                                <input type="number" min="0" max="100" value={current.desconto}
                                  onChange={e => setEditData(p => ({
                                    ...p,
                                    crossSell: p.crossSell.map(c => c.servicoNome === s.nome ? { ...c, desconto: Number(e.target.value) } : c),
                                  }))}
                                  className="w-14 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center" />
                                <span className="text-xs text-slate-400">% off</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                  }
                </div>

                {/* Produtos para oferecer */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Produtos para oferecer</label>
                  {(editData.upsell || []).map((produto, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <input value={produto.nome}
                        onChange={e => setEditData(p => ({ ...p, upsell: p.upsell.map((u, i) => i === j ? { ...u, nome: e.target.value } : u) }))}
                        placeholder="Ex: Pomada Modeladora"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                      <input type="number" min="0" value={produto.preco || ''}
                        onChange={e => setEditData(p => ({ ...p, upsell: p.upsell.map((u, i) => i === j ? { ...u, preco: Number(e.target.value) } : u) }))}
                        placeholder="R$"
                        className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                      <button onClick={() => setEditData(p => ({ ...p, upsell: (p.upsell || []).filter((_, i) => i !== j) }))}
                        className="p-1.5 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setEditData(p => ({ ...p, upsell: [...(p.upsell || []), { nome: '', preco: 0 }] }))}
                    className="w-full py-2 border border-dashed border-emerald-300 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Adicionar produto
                  </button>
                </div>

                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={saving}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Guardar
                  </button>
                  <button onClick={() => setEditIdx(null)}
                    className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm hover:bg-slate-50">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4">
                {s.foto
                  ? <img src={s.foto} alt={s.nome} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-sm" />
                  : (
                    <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Scissors className="w-6 h-6 text-violet-500" />
                    </div>
                  )
                }
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{s.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {s.sobOrcamento
                      ? <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full">Sob Orçamento</span>
                      : s.preco ? <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">R$ {Number(s.preco).toFixed(2)}</span> : null
                    }
                    {s.duracao && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{fmtDuracao(s.duracao)}
                      </span>
                    )}
                    {s.tipoAviso && s.tipoAviso !== 'nenhum' && s.diasAviso && (
                      <span className="text-xs text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded-full">
                        {s.tipoAviso === 'reagendamento' ? 'Reagend.' : 'Manut.'} · {s.diasAviso}d
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(i)} className="p-2 text-slate-300 hover:text-violet-500 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => removeServico(i)} className="p-2 text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add drawer */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddDrawer(false)} />
          <div className="relative bg-white rounded-t-3xl lg:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto lg:max-w-lg lg:w-full lg:max-h-[85vh]">
            {/* Handle */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-1" />
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">Novo serviço</h3>
              <button onClick={() => setShowAddDrawer(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-start gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Foto</label>
                <ImageUpload value={novaFoto} onChange={setNovaFoto} aspect="thumb" />
              </div>
              <div className="flex-1 space-y-3">
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do serviço"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  {sobOrcamento ? (
                    <button onClick={() => setSobOrcamento(false)}
                      className="px-4 py-3 border border-amber-300 bg-amber-50 rounded-xl text-amber-700 text-sm font-bold text-left">
                      Sob Orçamento ✕
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <input type="number" value={preco} onChange={e => setPreco(e.target.value)} placeholder="Preço (R$)"
                        className="flex-1 min-w-0 px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                      <button onClick={() => { setSobOrcamento(true); setPreco(''); }}
                        title="Sob Orçamento"
                        className="px-3 py-3 border border-slate-200 rounded-xl text-slate-400 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-colors text-xs font-bold">
                        S/O
                      </button>
                    </div>
                  )}
                  <select value={duracao} onChange={e => setDuracao(e.target.value)}
                    className="px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                    {[15, 20, 30, 45, 60, 90, 120, 150, 180].map(v => (
                      <option key={v} value={v}>{fmtDuracao(v)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {/* Aviso de retorno */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Aviso de retorno</label>
              <select value={tipoAviso} onChange={e => { setTipoAviso(e.target.value); setDiasAviso(''); setServicoManutencao(''); }}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                <option value="nenhum">Nenhum</option>
                <option value="reagendamento">Reagendamento</option>
                <option value="manutencao">Manutenção</option>
              </select>
              {tipoAviso !== 'nenhum' && (
                <input type="number" value={diasAviso} onChange={e => setDiasAviso(e.target.value)}
                  placeholder="Intervalo em dias (ex: 15)"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
              )}
              {tipoAviso === 'manutencao' && (
                <div className="space-y-1.5">
                  <select value={servicoManutencao} onChange={e => setServicoManutencao(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                    <option value="">Selecionar serviço de manutenção</option>
                    {servicos.map(s => (
                      <option key={s.nome} value={s.nome}>{s.nome}</option>
                    ))}
                  </select>
                  {!servicoManutencao && (
                    <button onClick={criarServicoManutencaoRapido} className="w-full py-2.5 border border-dashed border-violet-300 text-violet-600 rounded-xl text-xs font-bold hover:bg-violet-50 transition-colors flex items-center justify-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Criar serviço de manutenção
                    </button>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => addServico()} disabled={!nome.trim() || saving}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar serviço
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Settings ────────────────────────────────────────
function AdminSettings({ user, profile, setProfile, section }) {
  const settingsLimits = usePlanLimits(profile);
  const [nome, setNome] = useState(profile.nome || '');
  const [subtitulo, setSubtitulo] = useState(profile.subtitulo || '');
  const [slug, setSlug] = useState(profile.slug || '');
  const [whatsappNumber, setWhatsappNumber] = useState(profile.whatsappNumber || '');
  const [diasFuncionamento, setDiasFuncionamento] = useState(
    profile.diasFuncionamento && profile.diasFuncionamento.length > 0
      ? profile.diasFuncionamento
      : [1,2,3,4,5].map(dia => ({ dia, abertura: profile.horaInicio || '09:00', fechamento: profile.horaFim || '18:00' }))
  );
  const [intervaloBase, setIntervaloBase] = useState(profile.intervaloBase || profile.intervalo || 60);
  const [toleranciaFechamento, setTolerancisFechamento] = useState(profile.toleranciaFechamento || 0);
  const [coverFoto, setCoverFoto] = useState(profile.coverFoto || null);
  const [logo, setLogo] = useState(profile.logo || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── WhatsApp Connection ──────────────────────────────────────────────────────
  const [waStatus, setWaStatus] = useState(null); // null | 'open' | 'connecting' | 'close'
  const [waQrCode, setWaQrCode] = useState(null);
  const [waPairingCode, setWaPairingCode] = useState(null);
  const [waConnectMode, setWaConnectMode] = useState('qr'); // 'qr' | 'code'
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState(null);
  const waPollRef = useRef(null);

  const checkWaStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/whatsappConnect?action=status&lojaId=${user.uid}`);
      const data = await res.json();
      setWaStatus(data.state);
      if (data.state === 'open') {
        clearInterval(waPollRef.current);
        setWaQrCode(null);
        setWaPairingCode(null);
      }
    } catch {}
  }, [user.uid]);

  useEffect(() => {
    if (profile.evolutionInstanceName) checkWaStatus();
    return () => clearInterval(waPollRef.current);
  }, [profile.evolutionInstanceName, checkWaStatus]);

  const startPolling = useCallback(() => {
    clearInterval(waPollRef.current);
    waPollRef.current = setInterval(checkWaStatus, 4000);
  }, [checkWaStatus]);

  const handleConnectWA = async () => {
    setWaLoading(true);
    setWaQrCode(null);
    setWaPairingCode(null);
    setWaError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/whatsappConnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', lojaId: user.uid }),
      });
      const data = await res.json();
      if (data.error) { setWaError(data.error); return; }
      if (data.qrcode) setWaQrCode(data.qrcode);
      setWaStatus('connecting');
      startPolling();
    } catch (e) {
      setWaError('Erro ao conectar. Tente novamente.');
    } finally {
      setWaLoading(false);
    }
  };

  const handleRefreshQr = async () => {
    setWaLoading(true);
    setWaError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/whatsappConnect?action=qrcode&lojaId=${user.uid}`);
      const data = await res.json();
      if (data.qrcode) setWaQrCode(data.qrcode);
    } finally {
      setWaLoading(false);
    }
  };

  const handlePairingCode = async () => {
    const number = (whatsappNumber || profile.whatsappNumber || '').replace(/\D/g, '');
    if (!number) {
      setWaError('Preencha o campo "WhatsApp do estabelecimento" antes de usar esta opção.');
      return;
    }
    setWaLoading(true);
    setWaQrCode(null);
    setWaPairingCode(null);
    setWaError(null);
    try {
      // Ensure instance exists first
      await fetch(`${BACKEND_URL}/whatsappConnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', lojaId: user.uid }),
      });
      const res = await fetch(`${BACKEND_URL}/whatsappConnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pairingCode', lojaId: user.uid, number }),
      });
      const data = await res.json();
      if (data.error) { setWaError(data.error); return; }
      if (data.code) {
        setWaPairingCode(data.code);
        setWaStatus('connecting');
        startPolling();
      }
    } catch (e) {
      setWaError('Erro ao obter código. Tente novamente.');
    } finally {
      setWaLoading(false);
    }
  };

  const link = `https://hute.netlify.app/#${profile.slug || ''}`;

  const saveAll = async () => {
    setSaving(true);
    try {
      const normalizedWhats = whatsappNumber.replace(/\D/g, '');
      const data = {
        nome, subtitulo, slug, whatsappNumber: normalizedWhats, coverFoto, logo,
        diasFuncionamento,
        intervaloBase: Number(intervaloBase),
        toleranciaFechamento: Number(toleranciaFechamento),
        // backward compat
        horaInicio: diasFuncionamento[0]?.abertura || '09:00',
        horaFim: diasFuncionamento[0]?.fechamento || '18:00',
        intervalo: Number(intervaloBase),
      };
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), data, { merge: true });
      if (slug !== profile.slug) {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'slugs', slug), { uid: user.uid, nome });
      }
      if (normalizedWhats && normalizedWhats !== (profile.whatsappNumber || '').replace(/\D/g, '')) {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'whatsappNumbers', normalizedWhats), { lojaId: user.uid });
      }
      setProfile(prev => ({ ...prev, ...data }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const startGoogleAuth = () => {
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      redirect_uri: 'https://hute.netlify.app/.netlify/functions/googleAuthCallback',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
      state: user.uid,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  return (
    <div className="space-y-5 pb-4">

      {/* ── Dados do estabelecimento ── */}
      {section === 'dados' && (
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
          {/* Left column: Identidade Visual + Informações */}
          <div className="space-y-5">
            {/* Identidade Visual */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
              <div className="px-5 pt-5 pb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Identidade Visual</p>

                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Foto de capa</label>
                  <ImageUpload value={coverFoto} onChange={setCoverFoto} aspect="cover" />
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Logótipo</label>
                    <ImageUpload value={logo} onChange={setLogo} aspect="logo" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-1">Pré-visualização no portal do cliente:</p>
                    <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                      <div className="relative h-20 bg-gradient-to-br from-violet-700 to-violet-900">
                        {coverFoto && <img src={coverFoto} alt="" className="w-full h-full object-cover absolute inset-0" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-2 left-3 flex items-center gap-2">
                          {logo
                            ? <img src={logo} alt="" className="w-8 h-8 rounded-lg object-cover border-2 border-white/80 shadow" />
                            : <div className="w-8 h-8 rounded-lg bg-white/20 border-2 border-white/60 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
                          }
                          <div>
                            <p className="font-black text-white text-xs leading-tight">{nome || 'Nome do espaço'}</p>
                            {subtitulo && <p className="text-white/70 text-[10px] leading-tight">{subtitulo}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informações</p>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nome do estabelecimento</label>
                <input value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Studio da Ana"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Especialidade</label>
                <input value={subtitulo} onChange={e => setSubtitulo(e.target.value)}
                  placeholder="Ex: Cabeleireiro & Estética"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Link do portal (slug)</label>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
                  <span className="pl-3 pr-1 text-slate-400 text-xs whitespace-nowrap">hute.app/#</span>
                  <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="studio-da-ana"
                    className="flex-1 px-2 py-3 text-slate-800 outline-none text-sm bg-transparent" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">WhatsApp do estabelecimento</label>
                <input type="tel" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                <p className="text-[10px] text-slate-400 mt-1">Usado pelo chatbot para identificar seu estabelecimento.</p>
              </div>
            </div>
          </div>

          {/* Right column: Horário + Save + Link */}
          <div className="space-y-5 mt-5 lg:mt-0">
            {/* Horário */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Horário de funcionamento</p>
              <DiasHorariosEditor dias={diasFuncionamento} onChange={setDiasFuncionamento} />
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Intervalo base entre marcações</label>
                <select value={intervaloBase} onChange={e => setIntervaloBase(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                  {[[30,'30 min'],[45,'45 min'],[60,'1h'],[90,'1h30'],[120,'2h']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Tolerância após o fecho</label>
                <select value={toleranciaFechamento} onChange={e => setTolerancisFechamento(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                  {[[0,'Fecha em ponto'],[15,'+15 min'],[30,'+30 min'],[45,'+45 min'],[60,'+1h']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save */}
            <button onClick={saveAll} disabled={saving}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors shadow-lg shadow-violet-200">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
              {saved ? 'Guardado!' : 'Guardar alterações'}
            </button>

            {/* Link de reservas */}
            <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-3xl p-5 shadow-lg shadow-violet-200">
              <div className="flex items-center gap-2 mb-3">
                <Link className="w-4 h-4 text-violet-200" />
                <p className="text-xs font-bold text-violet-200 uppercase tracking-widest">Link de reservas</p>
              </div>
              <p className="text-white/90 text-sm font-semibold break-all mb-3">{link}</p>
              <button
                onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Integrar WhatsApp ── */}
      {section === 'whatsapp' && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-slate-900 text-sm">WhatsApp</p>
              <p className="text-xs text-slate-400 mt-0.5">Conecte o número do seu estabelecimento</p>
            </div>
            {waStatus === 'open' && (
              <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Conectado
              </span>
            )}
            {waStatus === 'connecting' && (
              <span className="text-[10px] bg-amber-50 text-amber-600 font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Aguardando
              </span>
            )}
          </div>

          {waError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2 rounded-xl">
              {waError}
            </div>
          )}

          {waStatus === 'open' ? (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl text-sm font-semibold">
              <CheckCircle className="w-4 h-4" />
              WhatsApp conectado e pronto para uso
            </div>
          ) : waQrCode ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 text-center">Escaneie com o WhatsApp do estabelecimento</p>
              <div className="flex justify-center">
                <img src={waQrCode} alt="QR Code WhatsApp" className="w-48 h-48 rounded-xl border border-slate-200" />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Aguardando leitura do QR Code...
              </div>
              <button onClick={handleRefreshQr} disabled={waLoading}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 underline disabled:opacity-50">
                QR expirou? Clique para gerar novo
              </button>
            </div>
          ) : waPairingCode ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo → Vincular por número de telefone → Digite o código abaixo
              </p>
              <div className="flex justify-center">
                <span className="font-mono text-3xl font-black tracking-[0.25em] text-slate-800 bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl select-all">
                  {waPairingCode}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Aguardando vinculação...
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-semibold">
                <button
                  onClick={() => { setWaConnectMode('qr'); setWaError(null); }}
                  className={`flex-1 py-2 transition-colors ${waConnectMode === 'qr' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  QR Code
                </button>
                <button
                  onClick={() => { setWaConnectMode('code'); setWaError(null); }}
                  className={`flex-1 py-2 transition-colors ${waConnectMode === 'code' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  Código de telefone
                </button>
              </div>

              {waConnectMode === 'qr' ? (
                <button onClick={handleConnectWA} disabled={waLoading}
                  className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {waLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando instância...</>
                    : profile.evolutionInstanceName
                      ? <><Smartphone className="w-4 h-4" /> Reconectar WhatsApp</>
                      : <><Smartphone className="w-4 h-4" /> Conectar WhatsApp</>
                  }
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">Configure o número em <strong>Dados do estabelecimento</strong> antes de usar esta opção.</p>
                  <button onClick={handlePairingCode} disabled={waLoading}
                    className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                    {waLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando código...</>
                      : <><Smartphone className="w-4 h-4" /> Gerar código de vinculação</>
                    }
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Google Agenda ── */}
      {section === 'google' && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-bold text-slate-900 text-sm">Google Agenda</p>
              <p className="text-xs text-slate-400 mt-0.5">Sincronização geral do estabelecimento</p>
            </div>
            {profile.googleCalendarConnected && (
              <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-full">Ligado ✓</span>
            )}
          </div>
          {profile.googleCalendarConnected ? (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl text-sm font-semibold">
              <CheckCircle className="w-4 h-4" />
              Sincronização ativa — marcações vão para o Google Agenda
            </div>
          ) : settingsLimits.hasGoogleCalendar ? (
            <button onClick={startGoogleAuth}
              className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              Ligar Google Agenda
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3 rounded-xl">
              <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold">
                <Calendar className="w-4 h-4" />
                Ligar Google Agenda
              </div>
              <span className="text-[10px] bg-violet-100 text-violet-600 font-black px-2 py-1 rounded-full whitespace-nowrap">Premium</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────
const DC = {
  primary: "#6C3CE1", primaryLight: "#8B5CF6", primaryFaded: "rgba(108,60,225,0.08)",
  accent: "#10B981", accentFaded: "rgba(16,185,129,0.08)",
  coral: "#F97066", coralFaded: "rgba(249,112,102,0.08)",
  amber: "#F59E0B", amberFaded: "rgba(245,158,11,0.08)",
  blue: "#3B82F6", blueFaded: "rgba(59,130,246,0.08)",
  bg: "#FAFAF8", card: "#FFFFFF", border: "#F0EDE6",
  textPrimary: "#1A1A18", textSecondary: "#6B6B68", textTertiary: "#9C9C98",
};
const SVC_COLORS = [DC.primary, DC.accent, DC.amber, DC.coral, DC.blue];
const MONTHS_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function getPeriodRange(period, customFrom, customTo) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'hoje') return { start: today, end: new Date(today.getTime() + 86400000), days: 1 };
  if (period === 'custom') {
    const parse = s => { if (!s || s.length < 8) return null; const [d,m,y] = s.split('/'); return new Date(y, m-1, d); };
    const s = parse(customFrom) || new Date(today.getTime() - 30*86400000);
    const rawE = parse(customTo);
    const e = rawE ? new Date(rawE.getTime() + 86400000) : new Date(today.getTime() + 86400000);
    return { start: s, end: e, days: Math.max(1, Math.round((e - s) / 86400000)) };
  }
  const days = period === 'sem' ? 7 : period === 'tri' ? 90 : 30;
  return { start: new Date(today.getTime() - days*86400000), end: new Date(today.getTime() + 86400000), days };
}

function getPeriodLabel(period, customFrom, customTo) {
  const now = new Date();
  if (period === 'hoje') return `Hoje, ${now.getDate()} ${MONTHS_PT[now.getMonth()]} ${now.getFullYear()}`;
  if (period === 'sem') return 'Últimos 7 dias';
  if (period === 'mes') return 'Últimos 30 dias';
  if (period === 'tri') return 'Últimos 90 dias';
  if (period === 'custom' && customFrom && customTo) {
    const fmt = s => { const [d,m] = s.split('/'); return `${parseInt(d)} ${MONTHS_PT[parseInt(m)-1]}`; };
    return `${fmt(customFrom)} – ${fmt(customTo)} ${customTo.split('/')[2]}`;
  }
  return 'Período personalizado';
}

const DFilterChip = ({ label, onRemove }) => (
  <span style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(108,60,225,0.1)', color:DC.primary, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600 }}>
    {label}
    <button onClick={e=>{e.stopPropagation();onRemove();}} style={{ background:'none', border:'none', cursor:'pointer', color:DC.primary, fontSize:15, lineHeight:1, padding:'0 0 0 2px' }}>×</button>
  </span>
);

const DMetricCard = ({ label, value, sub, trend, icon, color, onClick, active, expanded, sparkData, sparkKey }) => (
  <div onClick={onClick} style={{
    background: active ? color + "12" : DC.card,
    border: `1.5px solid ${active ? color : DC.border}`,
    borderRadius: 16, padding: "16px 18px",
    cursor: "pointer",
    transition: "all 0.25s ease", flex: "1 1 0", minWidth: 140,
    transform: active ? "scale(1.01)" : "scale(1)",
  }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: DC.textTertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>{label}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: DC.textPrimary, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 12, color: DC.textSecondary, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
      {trend !== undefined && trend !== null && (
        <span style={{ background: trend >= 0 ? DC.accentFaded : DC.coralFaded, color: trend >= 0 ? "#059669" : "#DC2626", fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 6 }}>
          {trend >= 0 ? "+" : ""}{trend}%
        </span>
      )}
      {sub}
    </div>
    {expanded && sparkData?.length > 0 && (
      <div style={{ marginTop: 12, height: 44 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={`mg_${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35}/>
                <stop offset="100%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey={sparkKey} stroke={color} strokeWidth={1.5} fill={`url(#mg_${label})`} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const DSectionTitle = ({ children, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
    <h3 style={{ fontSize: 15, fontWeight: 600, color: DC.textPrimary, margin: 0, letterSpacing: -0.3 }}>{children}</h3>
    {right}
  </div>
);

const DChartCard = ({ children, style }) => (
  <div style={{ background: DC.card, border: `1px solid ${DC.border}`, borderRadius: 16, padding: 20, ...style }}>{children}</div>
);

const DFilterPill = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{ background: active ? DC.primary : "transparent", color: active ? "#fff" : DC.textSecondary, border: `1px solid ${active ? DC.primary : DC.border}`, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}>{label}</button>
);


const DTooltip = ({ active, payload, label, prefix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1A1A18", borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
      <div style={{ color: "#9C9C98", fontSize: 11, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: p.color, marginRight: 6 }}>●</span>
          {prefix}{typeof p.value === "number" && prefix === "R$ " ? p.value.toLocaleString("pt-BR") : p.value}
        </div>
      ))}
    </div>
  );
};

function AdminDashboard({ user, profile }) {
  const [appointments, setAppointments] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("mes");
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [filterProf, setFilterProf] = useState(null);
  const [filterServico, setFilterServico] = useState(null);
  const [filterHora, setFilterHora] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${user.uid}`),
      snap => { setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
    );
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'artifacts', APP_ID, 'public', 'data', `cancellations_${user.uid}`),
      snap => setCancellations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [user.uid]);

  const filteredAppts = useMemo(() => {
    const { start, end } = getPeriodRange(period, customFrom, customTo);
    return appointments.filter(a => {
      if (!a.data) return false;
      const d = new Date(a.data + 'T00:00:00');
      if (d < start || d >= end) return false;
      if (filterProf && a.profissionalNome !== filterProf) return false;
      if (filterServico && a.servico !== filterServico) return false;
      if (filterHora && `${(a.hora||'').split(':')[0]}:00` !== filterHora) return false;
      return true;
    });
  }, [appointments, period, customFrom, customTo, filterProf, filterServico, filterHora]);

  const dash = useMemo(() => {
    const now = new Date();
    const { start: pStart, end: pEnd, days } = getPeriodRange(period, customFrom, customTo);

    // Daily buckets
    const numDays = Math.min(days, 90);
    const allDaily = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(pEnd.getTime() - (i + 1) * 86400000);
      const iso = toDateISO(d);
      const dayA = filteredAppts.filter(a => a.data === iso);
      const [, mo, dy] = iso.split('-');
      allDaily.push({ label: `${dy}/${mo}`, iso, agendamentos: dayA.length, receita: dayA.reduce((s, a) => s + (Number(a.valor)||0), 0) });
    }
    // Reduce bars to max 30 for readability
    const step = Math.ceil(numDays / 30);
    const daily = step <= 1 ? allDaily : allDaily.filter((_, i) => i % step === 0 || i === allDaily.length - 1);

    // Weekly
    const wCount = Math.min(4, Math.ceil(numDays / 7));
    const weekly = [];
    for (let w = wCount - 1; w >= 0; w--) {
      const wEnd2 = new Date(pEnd.getTime() - w * 7 * 86400000);
      const wStart2 = new Date(wEnd2.getTime() - 7 * 86400000);
      const wA = filteredAppts.filter(a => { if (!a.data) return false; const d = new Date(a.data+'T00:00:00'); return d >= wStart2 && d < wEnd2; });
      weekly.push({ sem: `Sem ${wCount - w}`, receita: wA.reduce((s, a) => s + (Number(a.valor)||0), 0) });
    }

    // Services
    const svcC = {}, svcR = {};
    filteredAppts.forEach(a => { if (!a.servico) return; svcC[a.servico]=(svcC[a.servico]||0)+1; svcR[a.servico]=(svcR[a.servico]||0)+(Number(a.valor)||0); });
    const servicos = Object.entries(svcC).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([nome,qtd],i)=>({ nome, qtd, receita: Math.round(svcR[nome]||0), cor: SVC_COLORS[i] }));

    // Profissionais
    const profC = {}, profR = {};
    filteredAppts.forEach(a => { const n=a.profissionalNome; if(!n) return; profC[n]=(profC[n]||0)+1; profR[n]=(profR[n]||0)+(Number(a.valor)||0); });
    const profissionaisData = Object.entries(profC).map(([nome,agendamentos])=>({ nome, agendamentos, receita: Math.round(profR[nome]||0) })).sort((a,b)=>b.agendamentos-a.agendamentos);

    // Horarios
    const horaC = {};
    filteredAppts.forEach(a => { if(!a.hora) return; const h=`${a.hora.split(':')[0]}:00`; horaC[h]=(horaC[h]||0)+1; });
    const horarios = Object.entries(horaC).sort((a,b)=>a[0].localeCompare(b[0])).map(([hora,qtd])=>({ hora, qtd }));

    // Upsell
    const withExtras = filteredAppts.filter(a=>a.extras?.length>0);
    const extrasReceita = withExtras.reduce((s,a)=>s+(a.extras||[]).reduce((es,e)=>es+(Number(e.preco)||0),0),0);
    const comboC = {};
    withExtras.forEach(a=>(a.extras||[]).forEach(e=>{ comboC[e.nome]=(comboC[e.nome]||0)+1; }));
    const topCombo = Object.entries(comboC).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
    const upsell = { ofertas: filteredAppts.length, aceitos: withExtras.length, taxa: filteredAppts.length>0?parseFloat(((withExtras.length/filteredAppts.length)*100).toFixed(1)):0, receitaExtra: Math.round(extrasReceita), topCombo };

    // ── Cancellations & Absenteeism (last 6 months) ──────────
    const absMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth(), y = d.getFullYear();
      const label = `${MONTHS_PT[m]}/${String(y).slice(2)}`;
      const monthAppts = appointments.filter(a => { if (!a.data) return false; const [ay,am]=a.data.split('-').map(Number); return am-1===m&&ay===y; });
      const monthCancels = cancellations.filter(c => {
        if (!c.cancelledAt && !c.data) return false;
        const ref = c.cancelledAt || (c.data + 'T00:00:00');
        const cd = new Date(ref); return cd.getMonth()===m&&cd.getFullYear()===y;
      });
      const monthReagend = monthAppts.filter(a => a.reagendamento === true).length;
      const monthViaAviso = monthAppts.filter(a => a.origemAviso === 'manutencao' || a.origemAviso === 'reagendamento').length;
      const total = monthAppts.length + monthCancels.length;
      const taxa = total > 0 ? parseFloat(((monthCancels.length / total) * 100).toFixed(1)) : 0;
      absMonths.push({ label, agendados: monthAppts.length, cancelados: monthCancels.length, reagendados: monthReagend, viaAviso: monthViaAviso, total, taxa });
    }
    const totalCancels = cancellations.filter(c => {
      const ref = c.cancelledAt || (c.data ? c.data + 'T00:00:00' : null);
      if (!ref) return false;
      const cd = new Date(ref);
      const { start, end } = getPeriodRange(period, customFrom, customTo);
      return cd >= start && cd < end;
    }).length;
    const totalReagend = filteredAppts.filter(a => a.reagendamento === true).length;
    const totalViaAviso = filteredAppts.filter(a => a.origemAviso === 'manutencao' || a.origemAviso === 'reagendamento').length;
    const totalViaManut = filteredAppts.filter(a => a.origemAviso === 'manutencao').length;
    const totalViaReagendAviso = filteredAppts.filter(a => a.origemAviso === 'reagendamento').length;
    const taxaGeral = (filteredAppts.length + totalCancels) > 0
      ? parseFloat(((totalCancels / (filteredAppts.length + totalCancels)) * 100).toFixed(1))
      : 0;

    // Month trends (always unfiltered for meaningful comparison)
    const curM=now.getMonth(), curY=now.getFullYear();
    const prevM=curM===0?11:curM-1, prevY=curM===0?curY-1:curY;
    const inM=(data,m,y)=>{ if(!data) return false; const [dy,dm]=data.split('-').map(Number); return dm-1===m&&dy===y; };
    const thisMA=appointments.filter(a=>inM(a.data,curM,curY));
    const prevMA=appointments.filter(a=>inM(a.data,prevM,prevY));
    const totalTrend=prevMA.length>0?Math.round(((thisMA.length-prevMA.length)/prevMA.length)*100):null;
    const receitaThis=thisMA.reduce((s,a)=>s+(Number(a.valor)||0),0);
    const receitaPrev=prevMA.reduce((s,a)=>s+(Number(a.valor)||0),0);
    const receitaTrend=receitaPrev>0?Math.round(((receitaThis-receitaPrev)/receitaPrev)*100):null;
    const uClThis=new Set(thisMA.map(a=>a.clienteWhats).filter(Boolean));
    const uClPrev=new Set(prevMA.map(a=>a.clienteWhats).filter(Boolean));
    const recorrentes=[...uClThis].filter(c=>uClPrev.has(c)).length;
    const retencao={ clientesNovos: uClThis.size-recorrentes, clientesRecorrentes: recorrentes };

    const totalPeriod=filteredAppts.length;
    const receitaPeriod=filteredAppts.reduce((s,a)=>s+(Number(a.valor)||0),0);
    const todayISO=toDateISO(now);
    const todayAppts=appointments.filter(a=>a.data===todayISO).sort((a,b)=>a.hora>b.hora?1:-1);

    // 30-day sparkline for metric card expansion
    const spark30=[];
    for(let i=29;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); const iso=toDateISO(d); const dayA=filteredAppts.filter(a=>a.data===iso); const [,mo,dy]=iso.split('-'); spark30.push({ label:`${dy}/${mo}`, agendamentos:dayA.length, receita:dayA.reduce((s,a)=>s+(Number(a.valor)||0),0), extras:dayA.filter(a=>a.extras?.length>0).length }); }

    return { daily, weekly, servicos, profissionaisData, horarios, upsell, retencao, totalTrend, receitaTrend, totalPeriod, receitaPeriod, todayAppts, spark30, absMonths, totalCancels, taxaGeral, totalReagend, totalViaAviso, totalViaManut, totalViaReagendAviso };
  }, [filteredAppts, appointments, cancellations, period, customFrom, customTo]);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>;

  const { daily, weekly, servicos, profissionaisData, horarios, upsell, retencao, totalTrend, receitaTrend, totalPeriod, receitaPeriod, todayAppts, spark30, absMonths, totalCancels, taxaGeral, totalReagend, totalViaAviso, totalViaManut, totalViaReagendAviso } = dash;
  const maxReceita = Math.max(...profissionaisData.map(p=>p.receita), 1);
  const hasFilters = filterProf || filterServico || filterHora;
  const periodLabel = getPeriodLabel(period, customFrom, customTo);

  return (
    <div style={{ fontFamily:"'DM Sans','SF Pro Display',-apple-system,sans-serif", background:DC.bg, minHeight:"100vh", padding:"0 0 40px", margin:"-20px -20px 0" }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, ${DC.primary} 0%, #4F21A8 100%)`, padding:"24px 20px 16px", borderRadius:"0 0 24px 24px", color:"#fff" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:26, fontWeight:800, letterSpacing:-0.5 }}>Dashboard</div>
            {periodLabel && <div style={{ fontSize:11, opacity:0.75, marginTop:2 }}>{periodLabel}</div>}
          </div>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:"flex-end", flexShrink:0 }}>
            {[["hoje","Hoje"],["sem","7d"],["mes","30d"],["tri","90d"],["custom","Custom"]].map(([p,label])=>(
              <button key={p} onClick={()=>{ setPeriod(p); setShowCustomPicker(p==='custom'); }}
                style={{ background:period===p?"rgba(255,255,255,0.25)":"transparent", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:500, cursor:"pointer", transition:"all 0.2s" }}>{label}</button>
            ))}
          </div>
        </div>
        {/* Custom date inputs */}
        {period==='custom' && showCustomPicker && (
          <div style={{ marginTop:12, background:"rgba(255,255,255,0.1)", borderRadius:12, padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:10, opacity:0.8, marginBottom:4 }}>De</div>
              <input type="text" placeholder="dd/mm/aaaa" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}
                style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.35)", borderRadius:8, padding:"6px 10px", fontSize:12, color:"#fff", width:100, outline:"none" }}/>
            </div>
            <div>
              <div style={{ fontSize:10, opacity:0.8, marginBottom:4 }}>Até</div>
              <input type="text" placeholder="dd/mm/aaaa" value={customTo} onChange={e=>setCustomTo(e.target.value)}
                style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.35)", borderRadius:8, padding:"6px 10px", fontSize:12, color:"#fff", width:100, outline:"none" }}/>
            </div>
            <button onClick={()=>setShowCustomPicker(false)}
              style={{ background:"#fff", color:DC.primary, border:"none", borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:700, cursor:"pointer" }}>Aplicar</button>
          </div>
        )}
        <div style={{ marginTop:12, height:40 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily.slice(-14)}>
              <defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity={0.3}/><stop offset="100%" stopColor="#fff" stopOpacity={0}/></linearGradient></defs>
              <Area type="monotone" dataKey="agendamentos" stroke="#fff" strokeWidth={2} fill="url(#sparkGrad)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active filter bar */}
      {hasFilters && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, padding:"10px 16px", background:DC.card, borderBottom:`1px solid ${DC.border}`, alignItems:"center" }}>
          <span style={{ fontSize:11, color:DC.textTertiary, fontWeight:600, marginRight:2 }}>Filtrando:</span>
          {filterProf && <DFilterChip label={filterProf} onRemove={()=>setFilterProf(null)}/>}
          {filterServico && <DFilterChip label={filterServico} onRemove={()=>setFilterServico(null)}/>}
          {filterHora && <DFilterChip label={`${filterHora}h`} onRemove={()=>setFilterHora(null)}/>}
          <button onClick={()=>{setFilterProf(null);setFilterServico(null);setFilterHora(null);}}
            style={{ fontSize:11, color:DC.coral, fontWeight:600, background:"none", border:"none", cursor:"pointer", marginLeft:4 }}>Limpar tudo</button>
        </div>
      )}

      <div style={{ padding:"16px 16px 0" }}>
        {/* Metric cards — 2×2 on mobile/tablet, 4-col row on desktop */}
        <div className="grid grid-cols-2 gap-2.5 mb-5 lg:grid-cols-4">
          <DMetricCard icon="📅" label="Marcações" value={totalPeriod} sub="vs mês anterior" trend={totalTrend} color={DC.primary}
            onClick={()=>setExpandedMetric(expandedMetric==="agend"?null:"agend")} active={expandedMetric==="agend"} expanded={expandedMetric==="agend"} sparkData={spark30} sparkKey="agendamentos"/>
          <DMetricCard icon="💰" label="Receita" value={`R$ ${receitaPeriod.toLocaleString("pt-BR")}`} sub="vs mês anterior" trend={receitaTrend} color={DC.accent}
            onClick={()=>setExpandedMetric(expandedMetric==="receita"?null:"receita")} active={expandedMetric==="receita"} expanded={expandedMetric==="receita"} sparkData={spark30} sparkKey="receita"/>
          <DMetricCard icon="📦" label="Extras vendidos" value={upsell.aceitos} sub={`+R$ ${upsell.receitaExtra}`} color={DC.amber}
            onClick={()=>setExpandedMetric(expandedMetric==="extras"?null:"extras")} active={expandedMetric==="extras"} expanded={expandedMetric==="extras"} sparkData={spark30} sparkKey="extras"/>
          <DMetricCard icon="🔄" label="Taxa extras" value={`${upsell.taxa}%`} sub="de aceitação" color={DC.coral}
            onClick={()=>setExpandedMetric(expandedMetric==="upsell"?null:"upsell")} active={expandedMetric==="upsell"} expanded={expandedMetric==="upsell"} sparkData={spark30} sparkKey="extras"/>
        </div>

        {/* Charts — 1 col on mobile/tablet, 2-col grid on desktop */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-4">

        {/* Today */}
        {todayAppts.length>0 && (
          <DChartCard style={{ marginBottom:16 }}>
            <DSectionTitle>Agenda de hoje</DSectionTitle>
            {todayAppts.map(a=>(
              <div key={a.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:`1px solid ${DC.border}` }}>
                <span style={{ fontSize:13, fontWeight:700, color:DC.primary, width:40, flexShrink:0 }}>{a.hora}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:DC.textPrimary, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.clienteNome}</div>
                  <div style={{ fontSize:11, color:DC.textTertiary }}>{a.servico}</div>
                </div>
                {a.valor>0 && <span style={{ fontSize:13, fontWeight:700, color:DC.accent, flexShrink:0 }}>R$ {Number(a.valor).toFixed(0)}</span>}
              </div>
            ))}
          </DChartCard>
        )}

        {/* Daily movement */}
        <DChartCard style={{ marginBottom:16 }}>
          <DSectionTitle right={<span style={{ color:DC.primary, fontSize:11, display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8, height:8, borderRadius:4, background:DC.primary, display:"inline-block" }}/>Agendamentos</span>}>Movimento diário</DSectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={daily} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={DC.border} vertical={false}/>
              <XAxis dataKey="label" tick={{ fontSize:10, fill:DC.textTertiary }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:DC.textTertiary }} axisLine={false} tickLine={false} width={24} allowDecimals={false}/>
              <Tooltip content={<DTooltip/>}/>
              <Bar dataKey="agendamentos" fill={DC.primary} radius={[4,4,0,0]} maxBarSize={16}/>
            </BarChart>
          </ResponsiveContainer>
        </DChartCard>

        {/* Weekly revenue */}
        {weekly.length>1 && (
          <DChartCard style={{ marginBottom:16 }}>
            <DSectionTitle>Receita semanal</DSectionTitle>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke={DC.border} vertical={false}/>
                <XAxis dataKey="sem" tick={{ fontSize:11, fill:DC.textTertiary }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fill:DC.textTertiary }} axisLine={false} tickLine={false} width={40}/>
                <Tooltip content={<DTooltip prefix="R$ "/>}/>
                <Bar dataKey="receita" fill={DC.accent} radius={[6,6,0,0]} maxBarSize={28}/>
              </BarChart>
            </ResponsiveContainer>
          </DChartCard>
        )}

        {/* Services — clickable */}
        {servicos.length>0 && (
          <DChartCard style={{ marginBottom:16 }}>
            <DSectionTitle right={filterServico?<DFilterChip label={filterServico} onRemove={()=>setFilterServico(null)}/>:null}>Serviços mais agendados</DSectionTitle>
            <div style={{ display:"flex", gap:16 }}>
              <div style={{ width:120, height:120, flexShrink:0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={servicos} dataKey="qtd" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} strokeWidth={0}
                      onClick={entry=>setFilterServico(filterServico===entry.nome?null:entry.nome)}>
                      {servicos.map((s,i)=>(
                        <Cell key={i} fill={s.cor} fillOpacity={filterServico&&filterServico!==s.nome?0.3:1} cursor="pointer"/>
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", gap:4 }}>
                {servicos.map((s,i)=>(
                  <div key={i} onClick={()=>setFilterServico(filterServico===s.nome?null:s.nome)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", padding:"3px 6px", borderRadius:8, background:filterServico===s.nome?s.cor+"18":"transparent", transition:"background 0.2s", opacity:filterServico&&filterServico!==s.nome?0.45:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ width:8, height:8, borderRadius:4, background:s.cor, flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:DC.textPrimary }}>{s.nome}</span>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:12, fontWeight:700, color:DC.textPrimary }}>{s.qtd}</span>
                      {s.receita>0 && <span style={{ fontSize:11, color:DC.textTertiary }}>R${s.receita}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DChartCard>
        )}

        {/* Profissionais — clickable rows */}
        {profissionaisData.length>0 && (
          <DChartCard style={{ marginBottom:16 }}>
            <DSectionTitle>Equipe <span style={{ fontSize:11, color:DC.textTertiary, fontWeight:400 }}>— toque para filtrar</span></DSectionTitle>
            {profissionaisData.map((p,i)=>(
              <div key={i} onClick={()=>setFilterProf(filterProf===p.nome?null:p.nome)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 8px", borderBottom:`1px solid ${DC.border}`, cursor:"pointer", borderRadius:10, background:filterProf===p.nome?DC.primaryFaded:"transparent", transition:"all 0.2s", opacity:filterProf&&filterProf!==p.nome?0.45:1 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:filterProf===p.nome?`linear-gradient(135deg,${DC.primary},${DC.primaryLight})`:`linear-gradient(135deg,#CBD5E1,#94A3B8)`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14, flexShrink:0, transition:"background 0.2s" }}>{p.nome[0]}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:filterProf===p.nome?DC.primary:DC.textPrimary, transition:"color 0.2s" }}>{p.nome}</div>
                  <div style={{ display:"flex", gap:12, marginTop:4 }}>
                    <span style={{ fontSize:11, color:DC.textTertiary }}>{p.agendamentos} agend.</span>
                    {p.receita>0 && <span style={{ fontSize:11, color:"#059669" }}>R$ {p.receita}</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:15, fontWeight:700, color:DC.accent }}>R$ {p.receita}</div>
                  <div style={{ width:60, height:4, borderRadius:2, background:DC.border, marginTop:4 }}>
                    <div style={{ width:`${maxReceita>0?Math.round((p.receita/maxReceita)*100):0}%`, height:"100%", borderRadius:2, background:DC.accent, transition:"width 0.3s ease" }}/>
                  </div>
                </div>
              </div>
            ))}
          </DChartCard>
        )}

        {/* Peak hours — clickable bars */}
        {horarios.length>0 && (
          <DChartCard style={{ marginBottom:16 }}>
            <DSectionTitle right={filterHora?<DFilterChip label={`${filterHora}h`} onRemove={()=>setFilterHora(null)}/>:<span style={{ fontSize:11, color:DC.textTertiary }}>toque para filtrar</span>}>Horários mais procurados</DSectionTitle>
            <ResponsiveContainer width="100%" height={Math.max(100, horarios.length*28)}>
              <BarChart data={horarios} layout="vertical" barSize={12}>
                <XAxis type="number" tick={{ fontSize:10, fill:DC.textTertiary }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <YAxis type="category" dataKey="hora" tick={{ fontSize:11, fill:DC.textSecondary }} axisLine={false} tickLine={false} width={40}/>
                <Tooltip content={<DTooltip/>}/>
                <Bar dataKey="qtd" radius={[0,6,6,0]} onClick={data=>setFilterHora(filterHora===data.hora?null:data.hora)}>
                  {horarios.map((h,i)=>(
                    <Cell key={i} fill={filterHora===h.hora?DC.primary:DC.blue} fillOpacity={filterHora&&filterHora!==h.hora?0.35:1} cursor="pointer"/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </DChartCard>
        )}

        {/* Intelligence */}
        <DChartCard style={{ marginBottom:16 }}>
          <DSectionTitle>Inteligência</DSectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ background:DC.accentFaded, borderRadius:12, padding:14 }}><div style={{ fontSize:22, fontWeight:700, color:"#059669" }}>{retencao.clientesRecorrentes}</div><div style={{ fontSize:11, color:"#047857", marginTop:2 }}>Clientes recorrentes</div></div>
            <div style={{ background:DC.blueFaded, borderRadius:12, padding:14 }}><div style={{ fontSize:22, fontWeight:700, color:DC.blue }}>{retencao.clientesNovos}</div><div style={{ fontSize:11, color:"#1D4ED8", marginTop:2 }}>Novos este mês</div></div>
            <div style={{ background:DC.amberFaded, borderRadius:12, padding:14 }}><div style={{ fontSize:22, fontWeight:700, color:"#B45309" }}>{upsell.aceitos}</div><div style={{ fontSize:11, color:"#92400E", marginTop:2 }}>Extras aceitos</div></div>
            <div style={{ background:DC.primaryFaded, borderRadius:12, padding:14 }}><div style={{ fontSize:16, fontWeight:700, color:DC.primary, lineHeight:1.3 }}>{upsell.topCombo}</div><div style={{ fontSize:11, color:"#4338CA", marginTop:2 }}>Extra mais vendido</div></div>
          </div>
        </DChartCard>

        {/* Upsell donut */}
        {upsell.ofertas>0 && (
          <DChartCard>
            <DSectionTitle>Performance de extras</DSectionTitle>
            <div style={{ display:"flex", alignItems:"center", gap:20 }}>
              <div style={{ position:"relative", width:80, height:80, flexShrink:0 }}>
                <svg viewBox="0 0 36 36" width="80" height="80" style={{ transform:"rotate(-90deg)" }}>
                  <circle cx="18" cy="18" r="14" fill="none" stroke={DC.border} strokeWidth="3"/>
                  <circle cx="18" cy="18" r="14" fill="none" stroke={DC.amber} strokeWidth="3" strokeDasharray={`${upsell.taxa*0.88} ${88-upsell.taxa*0.88}`} strokeLinecap="round"/>
                </svg>
                <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontSize:14, fontWeight:700, color:DC.textPrimary }}>{upsell.taxa}%</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:DC.textSecondary, marginBottom:8 }}><span style={{ fontWeight:700, color:DC.textPrimary }}>{upsell.aceitos}</span> de {upsell.ofertas} agendamentos com extras</div>
                {upsell.receitaExtra>0 && <div style={{ background:DC.accentFaded, borderRadius:8, padding:"8px 12px", fontSize:13, color:"#059669", fontWeight:600 }}>+R$ {upsell.receitaExtra} receita extra</div>}
              </div>
            </div>
          </DChartCard>
        )}

        {/* Cancelamentos & Absenteísmo */}
        <DChartCard>
          <DSectionTitle>Cancelamentos & Absenteísmo</DSectionTitle>
          {/* Summary cards row 1 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div style={{ background:"#FEF2F2", borderRadius:12, padding:14 }}>
              <div style={{ fontSize:22, fontWeight:700, color:"#DC2626" }}>{totalCancels}</div>
              <div style={{ fontSize:11, color:"#991B1B", marginTop:2 }}>Cancelamentos no período</div>
            </div>
            <div style={{ background: taxaGeral >= 20 ? "#FEF2F2" : taxaGeral >= 10 ? "#FFFBEB" : "#F0FDF4", borderRadius:12, padding:14 }}>
              <div style={{ fontSize:22, fontWeight:700, color: taxaGeral >= 20 ? "#DC2626" : taxaGeral >= 10 ? "#D97706" : "#16A34A" }}>{taxaGeral}%</div>
              <div style={{ fontSize:11, color: taxaGeral >= 20 ? "#991B1B" : taxaGeral >= 10 ? "#92400E" : "#15803D", marginTop:2 }}>Taxa de absenteísmo</div>
            </div>
          </div>
          {/* Summary cards row 2: reagendamentos + avisos */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
            <div style={{ background:DC.primaryFaded, borderRadius:12, padding:12 }}>
              <div style={{ fontSize:20, fontWeight:700, color:DC.primary }}>{totalReagend}</div>
              <div style={{ fontSize:10, color:"#4338CA", marginTop:2, lineHeight:1.3 }}>Reagendamentos</div>
            </div>
            <div style={{ background:"#FFF7ED", borderRadius:12, padding:12 }}>
              <div style={{ fontSize:20, fontWeight:700, color:"#C2410C" }}>{totalViaManut}</div>
              <div style={{ fontSize:10, color:"#9A3412", marginTop:2, lineHeight:1.3 }}>Via aviso manutenção</div>
            </div>
            <div style={{ background:"#F0FDF4", borderRadius:12, padding:12 }}>
              <div style={{ fontSize:20, fontWeight:700, color:"#16A34A" }}>{totalViaReagendAviso}</div>
              <div style={{ fontSize:10, color:"#15803D", marginTop:2, lineHeight:1.3 }}>Via aviso reagend.</div>
            </div>
          </div>
          {/* Bar chart: agendados vs cancelados vs reagendados per month */}
          <div style={{ fontSize:11, fontWeight:600, color:DC.textTertiary, marginBottom:8, letterSpacing:0.5, textTransform:"uppercase" }}>Últimos 6 meses</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={absMonths} barGap={2} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="3 3" stroke={DC.border} vertical={false}/>
              <XAxis dataKey="label" tick={{ fontSize:10, fill:DC.textTertiary }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:DC.textTertiary }} axisLine={false} tickLine={false} allowDecimals={false} width={24}/>
              <Tooltip
                contentStyle={{ background:DC.card, border:`1px solid ${DC.border}`, borderRadius:10, fontSize:12 }}
                formatter={(val, name) => [val, name === 'agendados' ? 'Realizados' : name === 'cancelados' ? 'Cancelados' : name === 'reagendados' ? 'Reagendados' : 'Via aviso']}
              />
              <Bar dataKey="agendados" name="agendados" fill={DC.primary} radius={[4,4,0,0]} maxBarSize={14}/>
              <Bar dataKey="cancelados" name="cancelados" fill="#EF4444" radius={[4,4,0,0]} maxBarSize={14}/>
              <Bar dataKey="reagendados" name="reagendados" fill="#8B5CF6" radius={[4,4,0,0]} maxBarSize={14}/>
              <Bar dataKey="viaAviso" name="viaAviso" fill="#F97316" radius={[4,4,0,0]} maxBarSize={14}/>
            </BarChart>
          </ResponsiveContainer>
          {/* Line chart: taxa % per month */}
          <div style={{ fontSize:11, fontWeight:600, color:DC.textTertiary, marginTop:16, marginBottom:8, letterSpacing:0.5, textTransform:"uppercase" }}>Taxa de absenteísmo (%)</div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={absMonths}>
              <CartesianGrid strokeDasharray="3 3" stroke={DC.border} vertical={false}/>
              <XAxis dataKey="label" tick={{ fontSize:10, fill:DC.textTertiary }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:DC.textTertiary }} axisLine={false} tickLine={false} unit="%" width={30} domain={[0, 100]}/>
              <Tooltip
                contentStyle={{ background:DC.card, border:`1px solid ${DC.border}`, borderRadius:10, fontSize:12 }}
                formatter={(val) => [`${val}%`, 'Absenteísmo']}
              />
              <Line type="monotone" dataKey="taxa" stroke="#EF4444" strokeWidth={2} dot={{ r:3, fill:"#EF4444" }} activeDot={{ r:5 }}/>
            </LineChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap", justifyContent:"center" }}>
            {[
              { color: DC.primary, label: 'Realizados' },
              { color: '#EF4444', label: 'Cancelados' },
              { color: '#8B5CF6', label: 'Reagendados' },
              { color: '#F97316', label: 'Via aviso automático' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:DC.textSecondary }}>
                <div style={{ width:10, height:10, borderRadius:3, background:color }}/>
                {label}
              </div>
            ))}
          </div>
          {totalViaAviso === 0 && (
            <div style={{ marginTop:12, padding:"10px 14px", background:DC.bg, borderRadius:10, fontSize:11, color:DC.textTertiary, lineHeight:1.5 }}>
              💡 <strong>Avisos automáticos:</strong> Para rastrear agendamentos gerados por avisos de manutenção/reagendamento, configure o n8n para incluir <code style={{ background:"#e2e8f0", borderRadius:4, padding:"1px 4px" }}>origemAviso: "manutencao"</code> ou <code style={{ background:"#e2e8f0", borderRadius:4, padding:"1px 4px" }}>origemAviso: "reagendamento"</code> ao acionar o chatbot.
            </div>
          )}
        </DChartCard>

        {appointments.length===0 && (
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
            <p style={{ color:DC.textSecondary, fontSize:14, fontWeight:500 }}>Sem dados ainda</p>
            <p style={{ color:DC.textTertiary, fontSize:12, marginTop:4 }}>As métricas aparecerão assim que tiver marcações</p>
          </div>
        )}
        </div>{/* end charts 2-col grid */}
      </div>
    </div>
  );
}

// ── Hute Master Admin (ERP) ──────────────────────────────
const MASTER_ADMINS = ['tiagoappdesign@gmail.com'];
const PLAN_PRICES = { starter: 97, premium: 197, pro: 397 };

function HuteMasterAdmin() {
  const [adminUser, setAdminUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [profiles, setProfiles] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [detailProfile, setDetailProfile] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingTrial, setEditingTrial] = useState(null);
  const [trialDays, setTrialDays] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && MASTER_ADMINS.includes(u.email?.toLowerCase())) {
        setAdminUser(u);
        setAuthError('');
      } else {
        setAdminUser(null);
        if (u) { setAuthError('Acesso negado. Email não autorizado.'); signOut(auth).catch(() => {}); }
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!adminUser) return;
    setDataLoading(true);
    getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'))
      .then(snap => setProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .finally(() => setDataLoading(false));
  }, [adminUser]);

  const refreshProfiles = () => {
    getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'profiles'))
      .then(snap => setProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      if (!MASTER_ADMINS.includes(cred.user.email?.toLowerCase())) {
        await signOut(auth);
        setAuthError('Acesso negado. Email não autorizado.');
      }
    } catch { setAuthError('Email ou senha incorretos.'); }
    finally { setAuthLoading(false); }
  };

  const handleToggleStatus = async (p) => {
    setActionLoading(p.id + '_status');
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', p.id), { status: newStatus }, { merge: true });
    setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, status: newStatus } : x));
    setActionLoading(null);
  };

  const handleChangePlan = async (p, plan) => {
    setActionLoading(p.id + '_plan');
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', p.id), { plan }, { merge: true });
    setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, plan } : x));
    setEditingPlan(null);
    setActionLoading(null);
  };

  const handleSetTrial = async (p) => {
    if (!trialDays || isNaN(Number(trialDays))) return;
    setActionLoading(p.id + '_trial');
    const trialUntil = new Date();
    trialUntil.setDate(trialUntil.getDate() + Number(trialDays));
    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', p.id),
      { status: 'trial', trialUntil: trialUntil.toISOString() }, { merge: true });
    setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, status: 'trial', trialUntil: trialUntil.toISOString() } : x));
    setEditingTrial(null); setTrialDays(''); setActionLoading(null);
  };

  const handleDelete = async (p) => {
    if (!confirm(`Excluir "${p.nome}"? Esta ação é irreversível.`)) return;
    setActionLoading(p.id + '_delete');
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', p.id));
    setProfiles(prev => prev.filter(x => x.id !== p.id));
    setActionLoading(null);
  };

  const totalLojas = profiles.length;
  const ativas = profiles.filter(p => p.status === 'active').length;
  const emTrial = profiles.filter(p => p.status === 'trial').length;
  const mrr = profiles.filter(p => p.status === 'active' && p.plan)
    .reduce((sum, p) => sum + (PLAN_PRICES[p.plan] || 0), 0);

  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months.push({ month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), count: 0 });
    }
    profiles.forEach(p => {
      if (!p.createdAt) return;
      const label = new Date(p.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const m = months.find(x => x.month === label);
      if (m) m.count++;
    });
    return months;
  }, [profiles]);

  const planData = useMemo(() => {
    const map = { Starter: 0, Premium: 0, Pro: 0 };
    profiles.filter(p => p.status === 'active' && p.plan).forEach(p => {
      const key = p.plan.charAt(0).toUpperCase() + p.plan.slice(1);
      if (map[key] !== undefined) map[key] += PLAN_PRICES[p.plan] || 0;
    });
    return Object.entries(map).map(([name, receita]) => ({ name, receita }));
  }, [profiles]);

  const recentSignups = useMemo(() =>
    [...profiles].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5)
  , [profiles]);

  const filteredProfiles = useMemo(() => profiles.filter(p => {
    const matchSearch = !search || (p.nome || '').toLowerCase().includes(search.toLowerCase());
    const matchPlan = !filterPlan || p.plan === filterPlan;
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  }), [profiles, search, filterPlan, filterStatus]);

  const StatusBadge = ({ status }) => {
    const cfg = { active: ['bg-emerald-500/20 text-emerald-400', 'Ativo'], inactive: ['bg-red-500/20 text-red-400', 'Inativo'], trial: ['bg-amber-500/20 text-amber-400', 'Trial'] };
    const [cls, label] = cfg[status] || ['bg-slate-700 text-slate-400', status || '—'];
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{label}</span>;
  };

  const PlanBadge = ({ plan }) => {
    const cfg = { starter: 'bg-indigo-500/20 text-indigo-400', premium: 'bg-violet-500/20 text-violet-400', pro: 'bg-purple-500/20 text-purple-400' };
    return plan
      ? <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg[plan] || 'bg-slate-700 text-slate-400'}`}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
      : <span className="text-slate-600 text-[11px]">—</span>;
  };

  if (!authChecked) return (
    <div className="min-h-screen bg-[#0c0f1a] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
    </div>
  );

  if (!adminUser) return (
    <div className="min-h-screen bg-[#0c0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
          <span className="text-white font-black text-xl tracking-tight">hute</span>
          <span className="text-slate-500 text-xs ml-1 bg-slate-800 px-2 py-0.5 rounded-full">admin</span>
        </div>
        <div className="bg-[#1a2035] border border-[#252d45] rounded-2xl p-6">
          <h1 className="text-white font-bold text-lg mb-1">Acesso restrito</h1>
          <p className="text-slate-400 text-sm mb-6">Apenas administradores Hute</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@hute.app" autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 bg-[#0c0f1a] border border-[#252d45] rounded-xl text-slate-100 placeholder-slate-600 outline-none focus:border-violet-500 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type={showPwd ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-3 bg-[#0c0f1a] border border-[#252d45] rounded-xl text-slate-100 placeholder-slate-600 outline-none focus:border-violet-500 text-sm" />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {authError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{authError}</p>}
            <button type="submit" disabled={authLoading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {authLoading && <Loader2 className="w-4 h-4 animate-spin" />} Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'estabelecimentos', label: 'Estabelecimentos', icon: Building2 },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#111827] flex">
      {/* ── Sidebar ── */}
      <aside className="w-56 bg-[#0c0f1a] flex flex-col flex-shrink-0 border-r border-[#1e2538]">
        <div className="p-5 border-b border-[#1e2538]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-black text-sm tracking-tight">hute</span>
              <span className="text-violet-400 text-[10px] font-bold bg-violet-500/20 px-1.5 py-0.5 rounded">ERP</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2035]'}`}>
              <Icon className="w-4 h-4 flex-shrink-0" />{label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[#1e2538]">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0"><User className="w-3.5 h-3.5 text-violet-400" /></div>
            <span className="text-xs text-slate-400 truncate flex-1">{adminUser.email}</span>
          </div>
          <button onClick={() => signOut(auth).catch(() => {})}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-300 hover:bg-[#1a2035] rounded-xl text-xs transition-colors">
            <LogOut className="w-3.5 h-3.5" />Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0 overflow-auto">

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div className="p-8">
            <h1 className="text-white font-black text-2xl mb-1">Dashboard</h1>
            <p className="text-slate-500 text-sm mb-8">Visão geral do Hute</p>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total de lojas', value: totalLojas, icon: Building2, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                { label: 'Lojas ativas', value: ativas, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR')}`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { label: 'Em trial', value: emTrial, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-[#1a2035] border border-[#252d45] rounded-2xl p-5">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon style={{ width: 18, height: 18 }} className={color} />
                  </div>
                  <p className="text-2xl font-black text-white mb-1">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1a2035] border border-[#252d45] rounded-2xl p-5">
                <h2 className="text-white font-bold text-sm mb-4">Novos estabelecimentos / mês</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#0c0f1a', border: '1px solid #252d45', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" stroke="#7c3aed" fill="url(#adminGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-[#1a2035] border border-[#252d45] rounded-2xl p-5">
                <h2 className="text-white font-bold text-sm mb-4">Receita por plano (MRR)</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={planData}>
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0c0f1a', border: '1px solid #252d45', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} formatter={v => `R$ ${v}`} />
                    <Bar dataKey="receita" radius={[6, 6, 0, 0]}>
                      {planData.map((_, i) => <Cell key={i} fill={['#6366f1', '#8b5cf6', '#a855f7'][i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-[#1a2035] border border-[#252d45] rounded-2xl p-5">
              <h2 className="text-white font-bold text-sm mb-4">Últimos cadastros</h2>
              <div className="space-y-1">
                {recentSignups.map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-[#252d45] last:border-0">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                      {p.logo ? <img src={p.logo} alt="" className="w-8 h-8 rounded-xl object-cover" /> : <Sparkles className="w-4 h-4 text-violet-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{p.nome || '—'}</p>
                      <p className="text-xs text-slate-500">/{p.slug || '—'}</p>
                    </div>
                    <PlanBadge plan={p.plan} />
                    <span className="text-xs text-slate-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                ))}
                {recentSignups.length === 0 && !dataLoading && <p className="text-slate-600 text-sm text-center py-6">Nenhum cadastro encontrado</p>}
                {dataLoading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>}
              </div>
            </div>
          </div>
        )}

        {/* ESTABELECIMENTOS */}
        {tab === 'estabelecimentos' && (
          <div className="p-8">
            <h1 className="text-white font-black text-2xl mb-1">Estabelecimentos</h1>
            <p className="text-slate-500 text-sm mb-6">{filteredProfiles.length} de {profiles.length} lojas</p>
            <div className="flex gap-3 mb-5 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome..."
                  className="pl-10 pr-4 py-2.5 bg-[#1a2035] border border-[#252d45] rounded-xl text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500 text-sm w-64" />
              </div>
              <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
                className="px-3 py-2.5 bg-[#1a2035] border border-[#252d45] rounded-xl text-slate-300 outline-none focus:border-violet-500 text-sm">
                <option value="">Todos os planos</option>
                <option value="starter">Starter</option>
                <option value="premium">Premium</option>
                <option value="pro">Pro</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 bg-[#1a2035] border border-[#252d45] rounded-xl text-slate-300 outline-none focus:border-violet-500 text-sm">
                <option value="">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="trial">Trial</option>
              </select>
              <button onClick={refreshProfiles} className="px-4 py-2.5 bg-[#1a2035] border border-[#252d45] rounded-xl text-slate-400 hover:text-slate-200 text-sm transition-colors">↻ Atualizar</button>
            </div>
            <div className="bg-[#1a2035] border border-[#252d45] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#252d45]">
                    {['Nome', 'Slug', 'Plano', 'Status', 'WhatsApp', 'Cadastro', 'Ações'].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataLoading ? (
                    <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin text-violet-400 mx-auto" /></td></tr>
                  ) : filteredProfiles.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-600 text-sm">Nenhum estabelecimento encontrado</td></tr>
                  ) : filteredProfiles.map(p => (
                    <tr key={p.id} className="border-b border-[#1e2538] hover:bg-[#1e2538]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.logo ? <img src={p.logo} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                            : <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0"><Sparkles className="w-3.5 h-3.5 text-violet-400" /></div>}
                          <span className="text-sm text-slate-200 font-medium truncate max-w-[140px]">{p.nome || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">/{p.slug || '—'}</td>
                      <td className="px-4 py-3">
                        {editingPlan === p.id ? (
                          <div className="flex items-center gap-1">
                            {['starter', 'premium', 'pro'].map(pl => (
                              <button key={pl} onClick={() => handleChangePlan(p, pl)}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-violet-600 text-white hover:bg-violet-700 transition-colors">{pl}</button>
                            ))}
                            <button onClick={() => setEditingPlan(null)} className="text-slate-500 hover:text-slate-300 ml-1"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : <PlanBadge plan={p.plan} />}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${p.whatsappConnected || p.evolutionConnected ? 'text-emerald-400' : 'text-slate-600'}`}>
                          {p.whatsappConnected || p.evolutionConnected ? '● Conectado' : '○ Desconectado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '—'}
                        {p.status === 'trial' && p.trialUntil && (
                          <div className="text-amber-500/70">até {new Date(p.trialUntil).toLocaleDateString('pt-BR')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => setDetailProfile(p)} title="Ver detalhes"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"><Search className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingPlan(p.id)} title="Mudar plano"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"><Tag className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setEditingTrial(p.id); setTrialDays(''); }} title="Dar trial"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"><Clock className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleToggleStatus(p)} title={p.status === 'active' ? 'Desativar' : 'Ativar'} disabled={actionLoading === p.id + '_status'}
                            className={`p-1.5 rounded-lg transition-colors ${p.status === 'active' ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`}>
                            {actionLoading === p.id + '_status' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => handleDelete(p)} title="Excluir" disabled={actionLoading === p.id + '_delete'}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            {actionLoading === p.id + '_delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {editingTrial === p.id && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <input type="number" value={trialDays} onChange={e => setTrialDays(e.target.value)} placeholder="dias"
                              className="w-14 px-2 py-1 bg-[#0c0f1a] border border-[#252d45] rounded-lg text-slate-200 text-xs outline-none focus:border-amber-500" />
                            <button onClick={() => handleSetTrial(p)} className="px-2 py-1 bg-amber-500 rounded-lg text-[10px] font-bold text-white hover:bg-amber-600 transition-colors">
                              {actionLoading === p.id + '_trial' ? '...' : 'OK'}
                            </button>
                            <button onClick={() => setEditingTrial(null)} className="text-slate-600 hover:text-slate-400"><X className="w-3 h-3" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FINANCEIRO */}
        {tab === 'financeiro' && (
          <div className="p-8">
            <h1 className="text-white font-black text-2xl mb-1">Financeiro</h1>
            <p className="text-slate-500 text-sm mb-8">Assinaturas e receita recorrente</p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR')}`, sub: `${ativas} assinaturas ativas`, color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: TrendingUp },
                { label: 'Inativos', value: profiles.filter(p => p.status === 'inactive').length, sub: 'Assinaturas canceladas', color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle },
                { label: 'Sem plano', value: profiles.filter(p => !p.plan && p.status !== 'trial').length, sub: 'Ainda não assinaram', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Clock },
              ].map(({ label, value, sub, color, bg, icon: Icon }) => (
                <div key={label} className="bg-[#1a2035] border border-[#252d45] rounded-2xl p-5">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon style={{ width: 18, height: 18 }} className={color} />
                  </div>
                  <p className={`text-2xl font-black mb-1 ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                  <p className="text-[11px] text-slate-600">{sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#1a2035] border border-[#252d45] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#252d45] flex items-center justify-between">
                <h2 className="text-white font-bold text-sm">Assinaturas por loja</h2>
                <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer"
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  Ver no Stripe <ChevronRight className="w-3 h-3" />
                </a>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#252d45]">
                    {['Loja', 'Plano', 'Status', 'MRR', 'Stripe Customer', 'Cadastro'].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...profiles].sort((a, b) => ({ active: 0, trial: 1, inactive: 2 }[a.status] ?? 3) - ({ active: 0, trial: 1, inactive: 2 }[b.status] ?? 3))
                    .map(p => (
                      <tr key={p.id} className="border-b border-[#1e2538] hover:bg-[#1e2538]/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-200 font-medium">{p.nome || '—'}</td>
                        <td className="px-4 py-3"><PlanBadge plan={p.plan} /></td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-200">
                          {p.status === 'active' && p.plan ? `R$ ${PLAN_PRICES[p.plan] || 0}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {p.stripeCustomerId
                            ? <a href={`https://dashboard.stripe.com/customers/${p.stripeCustomerId}`} target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">{p.stripeCustomerId.slice(0, 18)}…</a>
                            : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONFIGURAÇÕES */}
        {tab === 'configuracoes' && (
          <div className="p-8 max-w-2xl">
            <h1 className="text-white font-black text-2xl mb-1">Configurações</h1>
            <p className="text-slate-500 text-sm mb-8">Administradores e planos</p>
            <div className="bg-[#1a2035] border border-[#252d45] rounded-2xl p-5 mb-5">
              <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-violet-400" /> Administradores master</h2>
              <div className="space-y-2">
                {MASTER_ADMINS.map(email => (
                  <div key={email} className="flex items-center justify-between py-2.5 px-3 bg-[#0c0f1a] rounded-xl border border-[#252d45]">
                    <span className="text-sm text-slate-200">{email}</span>
                    <span className="text-[10px] text-violet-400 bg-violet-500/20 px-2 py-0.5 rounded-full font-semibold">Super Admin</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-3">Para adicionar admins, edite MASTER_ADMINS no código.</p>
            </div>
            <div className="bg-[#1a2035] border border-[#252d45] rounded-2xl p-5">
              <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-amber-400" /> Planos e preços</h2>
              <div className="space-y-2">
                {Object.entries(PLAN_PRICES).map(([plan, price]) => (
                  <div key={plan} className="flex items-center justify-between py-2.5 px-3 bg-[#0c0f1a] rounded-xl border border-[#252d45]">
                    <PlanBadge plan={plan} />
                    <span className="text-sm font-bold text-slate-200">R$ {price}/mês</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Detail Modal ── */}
      {detailProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDetailProfile(null)}>
          <div className="bg-[#1a2035] border border-[#252d45] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#252d45]">
              <h2 className="text-white font-bold">{detailProfile.nome || '—'}</h2>
              <button onClick={() => setDetailProfile(null)} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-0">
              {[
                ['ID', detailProfile.id],
                ['Slug', `/${detailProfile.slug || '—'}`],
                ['Email', detailProfile.email || '—'],
                ['WhatsApp', detailProfile.whats || '—'],
                ['Plano', detailProfile.plan || '—'],
                ['Status', detailProfile.status || '—'],
                ['Stripe Customer', detailProfile.stripeCustomerId || '—'],
                ['Stripe Sub', detailProfile.stripeSubscriptionId || '—'],
                ['Serviços', `${(detailProfile.servicos || []).length} serviços`],
                ['Profissionais', `${(detailProfile.profissionals || []).length} profissionais`],
                ['Criado em', detailProfile.createdAt ? new Date(detailProfile.createdAt).toLocaleString('pt-BR') : '—'],
                ['Trial até', detailProfile.trialUntil ? new Date(detailProfile.trialUntil).toLocaleDateString('pt-BR') : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-3 py-2.5 border-b border-[#252d45] last:border-0">
                  <span className="text-xs text-slate-500 w-32 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-slate-200 break-all">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HeroBanner (extracted outside ClientPortal to prevent re-mount on re-render) ──
function HeroBanner({ profile, onSignOut, showBack = false, onBack = null, showSignOut = false }) {
  return (
    <header className="sticky top-0 z-10" style={{ backgroundColor: '#000000' }}>
      {/* Safe-area spacer: height para empurrar o banner para baixo do status bar */}
      <div style={{ height: 'env(safe-area-inset-top)' }} />
      {/* Banner: cover photo or purple gradient fallback */}
      <div className="relative overflow-hidden" style={{ height: '40vh', minHeight: '200px', maxHeight: '300px' }}>
        {profile.coverFoto
          ? <img src={profile.coverFoto} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #6C3CE1 0%, #4F21A8 100%)' }} />
        }

        {/* Top mask — status bar always legível */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />

        {/* Bottom mask — destaca nome */}
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/85 to-transparent pointer-events-none" />

        {/* Top bar: back / signout — respeitando safe-area-inset-top */}
        <div className="absolute left-4 right-4 flex items-center justify-between" style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}>
          {showBack
            ? <button onClick={onBack} className="w-8 h-8 bg-black/30 hover:bg-black/50 rounded-xl flex items-center justify-center text-white transition-colors"><ArrowLeft className="w-4 h-4" /></button>
            : <div />
          }
          {showSignOut
            ? <button onClick={onSignOut} className="w-8 h-8 bg-black/30 hover:bg-black/50 rounded-xl flex items-center justify-center text-white transition-colors"><LogOut className="w-4 h-4" /></button>
            : <div />
          }
        </div>

        {/* Bottom content: logo + nome + tipo + @slug + "by hute" */}
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
          <div className="flex items-end gap-3 min-w-0">
            {/* Logo — quadrada com cantos arredondados */}
            {profile.logo
              ? <img src={profile.logo} alt="" className="w-28 h-28 rounded-2xl object-cover border-2 border-white/80 shadow-xl flex-shrink-0" />
              : <div className="w-28 h-28 rounded-2xl border-2 border-white/80 shadow-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6C3CE1 0%, #4F21A8 100%)' }}><Sparkles className="w-12 h-12 text-white" /></div>
            }
            <div className="mb-1 min-w-0">
              <p className="font-black text-white text-[2.1rem] leading-tight drop-shadow">{profile.nome || 'Agendamento'}</p>
              {profile.subtitulo && <p className="text-white/80 text-[1.3rem] leading-tight mt-0.5">{profile.subtitulo}</p>}
              {profile.slug && <p className="text-white/55 text-sm font-medium mt-0.5">@{profile.slug}</p>}
            </div>
          </div>
          <p className="text-white/40 text-[10px] font-medium mb-0.5 flex-shrink-0">by hute</p>
        </div>
      </div>
    </header>
  );
}

// ── First available booking date ─────────────────────────
// Returns today if still before closing, otherwise next working day.
function firstAvailableDate(profile) {
  const toMin = s => { const [h, m] = (s || '00:00').split(':').map(Number); return h * 60 + m; };
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const diasFunc = profile?.diasFuncionamento || [];

  let d = new Date(); d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const dow = d.getDay();
    let isWorkingDay, closingMin;
    if (diasFunc.length > 0) {
      const conf = diasFunc.find(dc => dc.dia === dow);
      isWorkingDay = !!conf;
      closingMin = conf ? toMin(conf.fechamento) : 0;
    } else {
      isWorkingDay = dow >= 1 && dow <= 5; // Mon–Fri fallback
      closingMin = toMin(profile?.horaFim || '18:00');
    }
    if (isWorkingDay && (i > 0 || nowMin < closingMin)) return d;
    const next = new Date(d); next.setDate(next.getDate() + 1); d = next;
  }
  return d;
}

// ── Client Sidebar (tablet/desktop only) ──────────────────
function ClientSidebar({ tab, setTab, profile, onSignOut, clientUser }) {
  const items = [
    { key: 'agenda',    icon: CalendarCheck, label: 'Agenda' },
    { key: 'historico', icon: Clock,         label: 'Histórico' },
    { key: 'conta',     icon: User,          label: 'Conta' },
  ];
  return (
    <aside className="hidden md:flex flex-col flex-shrink-0 w-sidebar-sm lg:w-sidebar-lg h-screen sticky top-0 overflow-hidden z-30" style={{ background: 'linear-gradient(180deg, #6C3CE1 0%, #4F21A8 100%)' }}>
      {/* Establishment branding */}
      <div className="flex items-center gap-3 px-4 py-5 flex-shrink-0 border-b border-white/10">
        {profile.logo
          ? <img src={profile.logo} alt={profile.nome} className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-white/20" />
          : <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6C3CE1 0%, #4F21A8 100%)' }}><Sparkles className="w-4 h-4 text-white" /></div>
        }
        <div className="hidden lg:block min-w-0">
          <p className="font-black text-white text-sm leading-tight truncate">{profile.nome || 'Agendamento'}</p>
          {profile.subtitulo && <p className="text-white/50 text-[11px] leading-tight truncate">{profile.subtitulo}</p>}
        </div>
      </div>
      {/* Nav tabs (only when logged in) */}
      {clientUser && (
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {items.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)} title={label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left overflow-hidden ${tab === key ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block text-sm font-semibold whitespace-nowrap">{label}</span>
            </button>
          ))}
        </nav>
      )}
      {/* Sign out */}
      {clientUser && (
        <div className="px-2 pb-4 flex-shrink-0 border-t border-white/10 pt-2">
          <button onClick={onSignOut} title="Sair"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:bg-red-500/20 hover:text-red-300 transition-all overflow-hidden">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm font-semibold whitespace-nowrap">Sair da conta</span>
          </button>
        </div>
      )}
    </aside>
  );
}

// ── Client Portal ─────────────────────────────────────────
function ClientPortal({ lojaUid, profile, deepLinkApptId, deepLinkToken }) {
  // ── Auth state ───────────────────────────────────────────
  const [clientUser, setClientUser] = useState(null);
  const [clientAccount, setClientAccount] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // authMode: 'login' | 'signup' | 'forgot' | 'forgotSent' | 'whatsask'
  const [authMode, setAuthMode] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginNome, setLoginNome] = useState('');
  const [loginWhats, setLoginWhats] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showAuth, setShowAuth] = useState(false);

  // Pending action — set before showing login gate, executed after login
  const [pendingAction, setPendingAction] = useState(null);
  // {type:'booking'} | {type:'remarcar'} | {type:'cancelar', appt}

  // ── Navigation ───────────────────────────────────────────
  const [tab, setTab] = useState('agenda');

  // ── Token deep-link ──────────────────────────────────────
  const [tokenAppt, setTokenAppt] = useState(null);
  const [tokenValid, setTokenValid] = useState(null);

  // ── Client appointments ──────────────────────────────────
  const [clientAppts, setClientAppts] = useState([]);

  // ── Booking ──────────────────────────────────────────────
  const [bookingMode, setBookingMode] = useState(false);
  const [bookingStep, setBookingStep] = useState('service');
  const [selectedServices, setSelectedServices] = useState([]); // ordered; [0]=primary
  const selectedService = selectedServices[0] || null;
  const [selectedProfissional, setSelectedProfissional] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => firstAvailableDate(profile));
  const [selectedHora, setSelectedHora] = useState('');
  const [slots, setSlots] = useState(null);
  const [extendedSlots, setExtendedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedAppt, setConfirmedAppt] = useState(null);

  // For remarcar from token view
  const [remarcarNome, setRemarcarNome] = useState('');
  const [remarcarWhats, setRemarcarWhats] = useState('');
  const [remarcarOldId, setRemarcarOldId] = useState(null);

  // ── Histórico ────────────────────────────────────────────
  const [histFilter, setHistFilter] = useState('todos');

  // ── Conta ────────────────────────────────────────────────
  const [editingWhats, setEditingWhats] = useState(false);
  const [whatsEdit, setWhatsEdit] = useState('');
  const [savingWhats, setSavingWhats] = useState(false);
  const [cancelingId, setCancelingId] = useState(null);
  const [cancelConfirmAppt, setCancelConfirmAppt] = useState(null); // appt pending inline confirmation
  const [cancelledAppt, setCancelledAppt] = useState(null); // just-cancelled appt for success state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileNome, setProfileNome] = useState('');
  const [profileNascDia, setProfileNascDia] = useState('');
  const [profileNascMes, setProfileNascMes] = useState('');
  const [profileFoto, setProfileFoto] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Upsell slot availability ─────────────────────────────
  // null = not yet checked; {} / map = checked (may be empty)
  const [upsellAvailability, setUpsellAvailability] = useState(null);

  // ── PWA ──────────────────────────────────────────────────
  const [installPrompt, setInstallPrompt] = useState(null);
  const [pwaHidden, setPwaHidden] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone;

  const profissionals = profile.profissionals || [];
  const servicos = profile.servicos || [];

  // ── Status-bar preta (black-translucent) para loja ───────
  useEffect(() => {
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const statusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (themeMeta) themeMeta.setAttribute('content', '#000000');
    if (statusMeta) statusMeta.setAttribute('content', 'black-translucent');
    return () => {
      if (themeMeta) themeMeta.setAttribute('content', '#6C3CE1');
      if (statusMeta) statusMeta.setAttribute('content', 'black-translucent');
    };
  }, []);

  // ── Token validation ─────────────────────────────────────
  useEffect(() => {
    if (!deepLinkApptId || !deepLinkToken || !lojaUid) return;
    getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaUid}`, deepLinkApptId))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.accessToken === deepLinkToken) {
            setTokenAppt({ id: snap.id, ...data });
            setTokenValid(true);
          } else {
            setTokenValid(false);
          }
        } else {
          setTokenValid(false);
        }
      })
      .catch(() => setTokenValid(false));
  }, [deepLinkApptId, deepLinkToken, lojaUid]);

  // ── Execute pending action after login ───────────────────
  useEffect(() => {
    if (!clientUser || !pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    if (action.type === 'booking') handleConfirmBooking(false);
    else if (action.type === 'remarcar') handleConfirmBooking(true);
    else if (action.type === 'cancelar') {
      const appt = action.appt;
      fetch(`${BACKEND_URL}/cancelAppointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lojaId: lojaUid,
          appointmentId: appt.id,
          clienteWhats: appt.clienteWhats || '',
          nomeCliente: appt.clienteNome || '',
          servico: appt.servico || '',
          data: appt.data || '',
          hora: appt.hora || '',
          profissionalNome: appt.profissionalNome || '',
        }),
      }).catch(() => {});
      setTokenAppt(prev => ({ ...prev, _cancelled: true }));
    }
  }, [clientUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upsell availability check ────────────────────────────
  useEffect(() => {
    if (bookingStep !== 'upsell' || !selectedService || !selectedHora) return;

    setUpsellAvailability(null);

    const crossSells = selectedService.crossSell || [];
    if (crossSells.length === 0) { setUpsellAvailability({}); return; }

    const _toMin = s => { const [hh, mm] = s.split(':').map(Number); return hh * 60 + mm; };
    const _toStr = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

    const mainDur = Number(selectedService.duracao || profile.intervalo || 60);
    const afterMin = _toMin(selectedHora) + mainDur;
    const horaFimMin = _toMin(profile.horaFim || '18:00');
    const horaInicioMin = _toMin(profile.horaInicio || '09:00');

    Promise.all(
      crossSells.map(async (cs) => {
        const svc = (profile.servicos || []).find(s => s.nome === cs.servicoNome);
        if (!svc) return { nome: cs.servicoNome, available: false };
        const csMin = Number(svc.duracao || profile.intervalo || 60);

        // 1. Must fit in working hours
        if (afterMin + csMin > horaFimMin) return { nome: cs.servicoNome, available: false };

        try {
          const params = new URLSearchParams({
            lojaId: lojaUid,
            data: toDateISO(selectedDate),
            duracao: csMin,
            ...(selectedProfissional?.id ? { profissionalId: selectedProfissional.id } : {}),
          });
          const res = await fetch(`${BACKEND_URL}/getSlots?${params}`);
          const json = await res.json();
          const slots = json.slots || [];

          // 2. Build expected grid and find missing (= busy) intervals
          // The slot engine starts at horaInicio and jumps by csMin.
          // A missing grid point means a busy interval at that position.
          const expected = [];
          for (let t = horaInicioMin; t + csMin <= horaFimMin; t += csMin) expected.push(t);
          const missing = expected.filter(t => !slots.includes(_toStr(t)));

          // 3. Check if [afterMin, afterMin+csMin] overlaps any busy interval
          const blocked = missing.some(t => t < afterMin + csMin && t + csMin > afterMin);

          return { nome: cs.servicoNome, available: !blocked };
        } catch {
          return { nome: cs.servicoNome, available: false };
        }
      })
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.nome] = r.available; });
      setUpsellAvailability(map);
    });
  }, [bookingStep]); // eslint-disable-line react-hooks/exhaustive-deps


  // ── onAuthStateChanged ───────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clientAccounts', u.uid));
          if (snap.exists()) {
            const acct = snap.data();
            setClientUser(u);
            setClientAccount(acct);
            // Ask for WhatsApp only if missing AND no pending action
            if (!acct.whats && !pendingAction) setAuthMode('whatsask');
          } else {
            const acct = {
              nome: u.displayName || '',
              email: u.email || '',
              whats: '',
              foto: u.photoURL || '',
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clientAccounts', u.uid), acct, { merge: true });
            setClientUser(u);
            setClientAccount(acct);
            if (!pendingAction) setAuthMode('whatsask');
          }
        } catch {
          // Firestore error — keep user authenticated, just skip account data
          setClientUser(u);
        }
      } else {
        setClientUser(null);
        setClientAccount(null);
        setAuthMode('login');
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Appointments subscription ────────────────────────────
  useEffect(() => {
    if (!clientUser || !lojaUid) return;
    const q = collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaUid}`);
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const phone = (clientAccount?.whats || '').replace(/\D/g, '');
      const filtered = all.filter(a =>
        a.clientUid === clientUser.uid ||
        (phone && (a.clienteWhats || '').replace(/\D/g, '') === phone)
      );
      filtered.sort((a, b) => (a.data + a.hora) > (b.data + b.hora) ? 1 : -1);
      setClientAppts(filtered);
    });
    return () => unsub();
  }, [clientUser, lojaUid, clientAccount]);

  // ── Dynamic PWA manifest — roda cedo, atualiza quando profile carrega ──
  useEffect(() => {
    const slug = profile?.slug || lojaUid;
    const nome = profile?.nome || slug;
    const startUrl = `${window.location.origin}/#${slug}`;
    const logoSrc = profile?.logo || null;
    const icons = logoSrc
      ? [
          { src: logoSrc, sizes: 'any', type: 'image/png', purpose: 'any' },
          { src: logoSrc, sizes: 'any', type: 'image/png', purpose: 'maskable' },
        ]
      : [{ src: '/ICON.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }];
    const manifest = {
      name: nome,
      short_name: nome,
      description: `Agende com ${nome}`,
      start_url: startUrl,
      scope: `${window.location.origin}/`,
      display: 'standalone',
      background_color: '#000000',
      theme_color: '#000000',
      orientation: 'portrait',
      icons,
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.querySelector('link[rel="manifest"]');
    const prevHref = link?.href;
    if (link) link.href = blobUrl;
    // iOS homescreen title + icon
    const metaTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (metaTitle) metaTitle.content = nome;
    document.title = nome;
    let touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!touchIcon) { touchIcon = document.createElement('link'); touchIcon.rel = 'apple-touch-icon'; document.head.appendChild(touchIcon); }
    touchIcon.href = logoSrc || '/ICON.svg';
    return () => {
      URL.revokeObjectURL(blobUrl);
      if (link && prevHref) link.href = prevHref;
      document.title = 'Hute - Sua secretária inteligente';
      if (metaTitle) metaTitle.content = 'Hute';
    };
  }, [profile?.nome, profile?.logo, profile?.slug, lojaUid]);

  // ── PWA install prompt ───────────────────────────────────
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const installed = () => setPwaHidden(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  // ── Auth handlers ────────────────────────────────────────
  const handleEmailAuth = async (e) => {
    e?.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        if (!loginNome.trim()) { setAuthError('Insira o seu nome.'); return; }
        if (!loginEmail.trim()) { setAuthError('Insira o seu email.'); return; }
        if (loginPassword.length < 6) { setAuthError('A senha deve ter pelo menos 6 caracteres.'); return; }
        const cred = await createUserWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
        const acct = {
          nome: loginNome.trim(),
          email: loginEmail.trim(),
          whats: loginWhats.trim(),
          foto: '',
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clientAccounts', cred.user.uid), acct, { merge: true });
        // onAuthStateChanged will fire and set clientUser/clientAccount
      } else {
        if (!loginEmail.trim() || !loginPassword) { setAuthError('Preencha email e senha.'); return; }
        await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      }
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Este email já está em uso.',
        'auth/invalid-email': 'Email inválido.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
        'auth/user-not-found': 'Conta não encontrada.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/invalid-credential': 'Email ou senha incorretos.',
      };
      setAuthError(msgs[err.code] || 'Erro ao autenticar. Tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError('Erro ao entrar com Google. Tente novamente.');
      }
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) { setAuthError('Insira o email acima primeiro.'); return; }
    setAuthError('');
    setAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, loginEmail.trim());
      setAuthMode('forgotSent');
    } catch (err) {
      setAuthError('Erro ao enviar. Verifique o email.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveWhats = async () => {
    if (!loginWhats.trim() || !clientUser) return;
    setSavingWhats(true);
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clientAccounts', clientUser.uid), { whats: loginWhats.trim() }, { merge: true });
      setClientAccount(prev => ({ ...prev, whats: loginWhats.trim() }));
      setAuthMode('login');
    } catch { /* ignore */ } finally {
      setSavingWhats(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth).catch(() => {});
    setClientUser(null);
    setClientAccount(null);
    setClientAppts([]);
    setAuthMode('login');
    setTab('agenda');
    setBookingMode(false);
    setPendingAction(null);
  };

  // ── Booking helpers ──────────────────────────────────────
  const fetchSlots = useCallback(async (date, duracaoTotal, profId) => {
    setSlotsLoading(true);
    setSlots(null);
    setExtendedSlots([]);
    try {
      const params = new URLSearchParams({
        lojaId: lojaUid,
        data: toDateISO(date),
        duracao: duracaoTotal || profile.intervaloBase || profile.intervalo || 60,
        ...(profId ? { profissionalId: profId } : {}),
      });
      const res = await fetch(`${BACKEND_URL}/getSlots?${params}`);
      const json = await res.json();
      let slotList = json.slots || [];
      let extList = json.extendedSlots || [];
      const isToday = toDateISO(date) === toDateISO(new Date());
      if (isToday) {
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        slotList = slotList.filter(slot => { const [h, m] = slot.split(':').map(Number); return h * 60 + m > nowMin; });
        extList = extList.filter(slot => { const [h, m] = slot.split(':').map(Number); return h * 60 + m > nowMin; });
      }
      setSlots(slotList);
      setExtendedSlots(extList);
    } catch {
      setSlots([]);
      setExtendedSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [lojaUid, profile.intervaloBase, profile.intervalo]);

  // All professionals shown at professional step (prof is chosen before services)
  const profForService = profissionals;

  // Services available for the selected professional
  const servicosForProf = selectedProfissional
    ? (() => {
        const assigned = (profile.servicos || []).filter(s => (selectedProfissional.servicos || []).includes(s.nome));
        return assigned.length > 0 ? assigned : (profile.servicos || []);
      })()
    : (profile.servicos || []);

  const selectedNames = new Set(selectedServices.map(s => s.nome));
  const availableCrossSells = (selectedService?.crossSell || []).filter(cs => !selectedNames.has(cs.servicoNome));
  const serviceHasExtras = !!(availableCrossSells.length || selectedService?.upsell?.length);

  const _slotFallback = Number(profile.intervaloBase || profile.intervalo) || 60;
  const totalBookingDuration = selectedServices.reduce((sum, s) => sum + (Number(s.duracao) || _slotFallback), 0) || _slotFallback;

  const startBooking = (presetService = null) => {
    const initDate = firstAvailableDate(profile);
    setSelectedServices(presetService ? [presetService] : []);
    setSelectedProfissional(null);
    setSelectedDate(initDate);
    setSelectedHora('');
    setSlots(null);
    setSelectedExtras([]);
    setConfirmedAppt(null);
    // New order: professional → service → datetime
    if (profissionals.length > 0) {
      setBookingStep('professional');
    } else {
      // No professionals: go straight to service (or datetime if preset)
      if (presetService) {
        fetchSlots(initDate, Number(presetService.duracao) || _slotFallback, null);
        setBookingStep('datetime');
      } else {
        setBookingStep('service');
      }
    }
    setBookingMode(true);
  };

  const handleToggleService = (s) => {
    setSelectedServices(prev => {
      const exists = prev.some(p => p.nome === s.nome);
      if (exists) return prev.filter(p => p.nome !== s.nome);
      return [...prev, s];
    });
    setSelectedHora('');
  };

  const handleContinueService = () => {
    if (selectedServices.length === 0) return;
    setSelectedHora('');
    // Professional already chosen — go straight to datetime
    fetchSlots(selectedDate, totalBookingDuration, selectedProfissional?.id || null);
    setBookingStep('datetime');
  };

  const handleSelectProf = (p) => {
    setSelectedProfissional(p);
    setSelectedHora('');
    setSelectedServices([]); // reset service selection when prof changes
    setBookingStep('service');
  };

  const changeDate = (delta) => {
    const newDate = addDays(selectedDate, delta);
    if (newDate < firstAvailableDate(profile)) return;
    setSelectedDate(newDate);
    setSelectedHora('');
    fetchSlots(newDate, totalBookingDuration, selectedProfissional?.id || null);
  };

  const bookingBack = () => {
    if (bookingStep === 'professional') setBookingMode(false);
    else if (bookingStep === 'service') setBookingStep(profissionals.length > 0 ? 'professional' : 'service'); // service is first step when no profs
    else if (bookingStep === 'datetime') setBookingStep('service');
    else if (bookingStep === 'upsell') setBookingStep('datetime');
    else if (bookingStep === 'confirm') setBookingStep(serviceHasExtras ? 'upsell' : 'datetime');
    else setBookingMode(false);
  };

  const handleConfirmBooking = async (isRemarcar = false) => {
    setSubmitting(true);
    try {
      const dataISO = toDateISO(selectedDate);
      const [h, m] = selectedHora.split(':').map(Number);
      const dtInt = new Date(selectedDate);
      dtInt.setHours(h, m, 0, 0);

      const clientNome = isRemarcar ? remarcarNome.trim() : (clientAccount?.nome || '');
      const clientWhats = isRemarcar ? remarcarWhats.trim() : (clientAccount?.whats || '');

      const accessToken = crypto.randomUUID();
      const intervaloFallback = Number(profile.intervaloBase || profile.intervalo) || 60;
      const mainDuracao = Number(selectedService.duracao) || intervaloFallback;
      const addSvcDuracao = selectedServices.slice(1).reduce((sum, s) => sum + (Number(s.duracao) || intervaloFallback), 0);
      const extrasDuracao = selectedExtras
        .filter(e => e.tipo === 'servico')
        .reduce((sum, e) => sum + (Number(e.duracao) || intervaloFallback), 0);
      const duracaoTotal = mainDuracao + addSvcDuracao + extrasDuracao;

      // Additional services picked at booking time become extras (tipo=servico, no discount)
      const addSvcExtras = selectedServices.slice(1).map(s => ({
        tipo: 'servico', nome: s.nome, preco: s.preco || 0,
        duracao: Number(s.duracao) || intervaloFallback,
      }));
      const allExtras = [...addSvcExtras, ...selectedExtras];

      const apptData = {
        clienteNome: clientNome,
        clienteWhats: clientWhats,
        clienteNascimento: '',
        servico: selectedService.nome,
        valor: selectedService.preco || null,
        duracao: mainDuracao,
        duracaoTotal,
        profissionalId: selectedProfissional?.id || null,
        profissionalNome: selectedProfissional?.nome || null,
        data: dataISO,
        hora: selectedHora,
        dataHoraInternacional: dtInt.toISOString(),
        createdAt: new Date().toISOString(),
        accessToken,
        ...(allExtras.length > 0 ? { extras: allExtras } : {}),
        ...(clientUser ? { clientUid: clientUser.uid } : {}),
      };

      const apptRef = await addDoc(
        collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaUid}`),
        apptData
      );

      const clientKey = clientWhats.replace(/\D/g, '') || clientNome.toLowerCase().replace(/\s+/g, '_');
      if (clientKey) {
        const clientDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${lojaUid}`, clientKey);
        const existingClient = await getDoc(clientDocRef);
        const totalVisitas = existingClient.exists() ? (existingClient.data().totalVisitas || 0) + 1 : 1;
        const primeiraVisita = existingClient.exists() ? (existingClient.data().primeiraVisita || dataISO) : dataISO;
        await setDoc(clientDocRef, {
          nome: clientNome, whats: clientWhats,
          totalVisitas, primeiraVisita, ultimaVisita: dataISO,
        }, { merge: true });
      }

      fetch(`${BACKEND_URL}/createAppointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId: lojaUid, ...apptData, appointmentId: apptRef.id }),
      }).catch(() => {});

      if (isRemarcar && remarcarOldId) {
        fetch(`${BACKEND_URL}/cancelAppointment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lojaId: lojaUid, appointmentId: remarcarOldId,
            clienteWhats: clientWhats, nomeCliente: clientNome,
            servico: selectedService.nome, data: dataISO, hora: selectedHora,
            profissionalNome: selectedProfissional?.nome || '',
          }),
        }).catch(() => {});
      }

      setBookingStep('success');
      setTimeout(() => {
        setBookingMode(false);
        setConfirmedAppt({ ...apptData, id: apptRef.id });
        setTab('agenda');
        setRemarcarOldId(null);
      }, 2500);
    } catch (err) {
      alert('Erro ao confirmar marcação. Tente novamente.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelAppt = async (appt) => {
    setCancelingId(appt.id);
    setCancelConfirmAppt(null);
    try {
      await fetch(`${BACKEND_URL}/cancelAppointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lojaId: lojaUid, appointmentId: appt.id,
          clienteWhats: appt.clienteWhats || '', nomeCliente: appt.clienteNome || '',
          servico: appt.servico || '', data: appt.data || '',
          hora: appt.hora || '', profissionalNome: appt.profissionalNome || '',
        }),
      });
      setCancelledAppt(appt);
    } catch { /* ignore */ }
    finally { setCancelingId(null); }
  };

  // ── Helpers ──────────────────────────────────────────────
  function apptEndTime(a) {
    const [h2, m2] = (a.hora || '0:0').split(':').map(Number);
    const start = new Date(`${a.data}T${String(h2).padStart(2,'0')}:${String(m2).padStart(2,'0')}:00`);
    return new Date(start.getTime() + (Number(a.duracao) || 60) * 60 * 1000);
  }
  const now = new Date();
  const upcomingAppts = clientAppts.filter(a => apptEndTime(a) > now);
  const pastAppts = clientAppts.filter(a => apptEndTime(a) <= now);
  const filteredAppts = histFilter === 'futuros' ? upcomingAppts : histFilter === 'passados' ? pastAppts : clientAppts;
  const initials = (name) => (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // ── Loading ──────────────────────────────────────────────
  if (!authChecked && !deepLinkApptId) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  // ── Hero banner ──────────────────────────────────────────
  // ── Auth screen (called as function, NOT as JSX component, to avoid re-mount on each render) ──
  const renderAuthScreen = (isPendingGate = false) => (
    <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
      <HeroBanner profile={profile} onSignOut={handleSignOut} showBack={isPendingGate || bookingMode || showAuth} onBack={() => {
        if (isPendingGate) { setPendingAction(null); }
        else if (showAuth) { setShowAuth(false); setAuthMode('login'); setAuthError(''); }
        else setBookingMode(false);
      }} />
      <div className="flex-1 p-5 pt-6 pb-8 overflow-y-auto">

        {isPendingGate && (
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="font-bold text-violet-900 text-sm">Entre para confirmar</p>
              <p className="text-xs text-violet-600">A sua seleção foi guardada. Entre para concluir.</p>
            </div>
          </div>
        )}

        {authMode === 'forgotSent' ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Link enviado!</h2>
            <p className="text-sm text-slate-400 mb-1">Verifique o seu email</p>
            <p className="text-sm font-bold text-slate-700 mb-6">{loginEmail}</p>
            <button onClick={() => setAuthMode('login')} className="text-sm text-violet-600 hover:underline">Voltar ao login</button>
          </div>
        ) : authMode === 'whatsask' ? (
          <div>
            <div className="w-14 h-14 bg-emerald-50 rounded-3xl flex items-center justify-center mb-5">
              <MessageCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Qual o seu WhatsApp?</h2>
            <p className="text-sm text-slate-400 mb-6">Para receber confirmações e lembretes das suas marcações</p>
            <div className="flex gap-2 mb-4">
              <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex-shrink-0">+55</div>
              <input type="tel" value={loginWhats} onChange={e => setLoginWhats(e.target.value)}
                placeholder="(11) 99999-9999" autoComplete="tel"
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
            </div>
            <button onClick={handleSaveWhats} disabled={savingWhats || !loginWhats.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2 mb-3">
              {savingWhats ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Guardar
            </button>
            <button onClick={() => setAuthMode('login')} className="w-full text-sm text-slate-400 hover:text-slate-600 py-2 transition-colors">
              Pular por agora
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">
              {authMode === 'signup' ? 'Criar conta' : authMode === 'forgot' ? 'Recuperar senha' : 'Entrar'}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {authMode === 'signup' ? 'Crie a sua conta para gerir os seus agendamentos'
                : authMode === 'forgot' ? 'Enviaremos um link de redefinição para o seu email'
                : 'Entre para gerir os seus agendamentos'}
            </p>

            {authMode === 'forgot' ? (
              <div>
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      placeholder="o.seu@email.com"
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                  </div>
                </div>
                {authError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">{authError}</p>}
                <button onClick={handleForgotPassword} disabled={authLoading || !loginEmail.trim()}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2 mb-4">
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                  Enviar link de redefinição
                </button>
                <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="w-full text-sm text-slate-400 hover:text-slate-600 py-2 text-center transition-colors">
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nome</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input type="text" value={loginNome} onChange={e => setLoginNome(e.target.value)}
                        placeholder="O seu nome completo" autoComplete="name"
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                      placeholder="o.seu@email.com" autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Senha</label>
                    {authMode === 'login' && (
                      <button type="button" onClick={() => { setAuthMode('forgot'); setAuthError(''); }}
                        className="text-xs text-violet-500 hover:text-violet-700 font-medium">
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                      className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {authMode === 'signup' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input type="tel" value={loginWhats} onChange={e => setLoginWhats(e.target.value)}
                        placeholder="(11) 99999-9999" autoComplete="tel"
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                    </div>
                  </div>
                )}

                {authError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{authError}</p>}

                <button type="submit" disabled={authLoading}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {authMode === 'signup' ? 'Criar conta' : 'Entrar'}
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium">ou</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <button type="button" onClick={handleGoogleLogin} disabled={authLoading}
                  className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-3 rounded-2xl text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                  </svg>
                  Entrar com Google
                </button>

                <p className="text-center text-sm text-slate-400">
                  {authMode === 'signup' ? 'Já tem conta? ' : 'Não tem conta? '}
                  <button type="button" onClick={() => { setAuthMode(m => m === 'signup' ? 'login' : 'signup'); setAuthError(''); }}
                    className="text-violet-600 font-semibold hover:underline">
                    {authMode === 'signup' ? 'Entrar' : 'Criar conta'}
                  </button>
                </p>
              </form>
            )}
          </div>
        )}
      </div>
      <div className="text-center py-4 border-t border-slate-100 bg-white">
        <div className="flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-slate-400 font-semibold">hute</span>
        </div>
      </div>
    </div>
  );

  // ── Booking steps renderer ───────────────────────────────
  function BookingStepsRender(isRemarcar = false) {
    return (
      <>
        {['professional', 'service', 'datetime', 'upsell', 'confirm'].includes(bookingStep) && (
          <div className="flex gap-1.5 mb-6">
            {['professional', 'service', 'datetime', 'confirm'].map((s, i) => {
              const order = { professional: 0, service: 1, datetime: 2, upsell: 2, confirm: 3 };
              const cur = order[bookingStep] ?? 0;
              return <div key={s} className={`h-1 flex-1 rounded-full transition-all ${i <= cur ? 'bg-violet-600' : 'bg-slate-200'}`} />;
            })}
          </div>
        )}

        {bookingStep === 'service' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Qual serviço?</h2>
            <p className="text-sm text-slate-400 mb-3">Escolha um ou mais serviços</p>
            {selectedProfissional && (
              <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0" style={{ backgroundColor: selectedProfissional.cor || '#7c3aed' }}>
                  {(selectedProfissional.nome || '?')[0].toUpperCase()}
                </div>
                <span className="text-sm font-bold text-violet-900 flex-1">{selectedProfissional.nome}</span>
                <button onClick={() => setBookingStep('professional')} className="text-[10px] text-violet-500 hover:text-violet-700 font-semibold">Trocar</button>
              </div>
            )}
            {servicosForProf.length === 0
              ? <p className="text-center text-slate-400 py-12 text-sm">Nenhum serviço disponível.</p>
              : <>
                  <div className="space-y-3 pb-28">
                    {servicosForProf.map((s, i) => {
                      const isSelected = selectedServices.some(p => p.nome === s.nome);
                      return (
                        <button key={i} onClick={() => handleToggleService(s)}
                          className={`w-full rounded-2xl overflow-hidden shadow-sm border-2 transition-all text-left flex ${isSelected ? 'border-violet-500 bg-violet-50' : 'border-slate-100 bg-white hover:border-violet-200 hover:shadow-md'}`}>
                          {s.foto
                            ? <img src={s.foto} alt={s.nome} className="w-20 h-20 object-cover flex-shrink-0" />
                            : <div className={`w-20 h-20 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-violet-600' : 'bg-gradient-to-br from-violet-100 to-violet-50'}`}><Scissors className={`w-7 h-7 ${isSelected ? 'text-white' : 'text-violet-400'}`} /></div>
                          }
                          <div className="flex-1 min-w-0 px-4 py-3">
                            <p className={`font-bold ${isSelected ? 'text-violet-900' : 'text-slate-900'}`}>{s.nome}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {s.duracao && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDuracao(s.duracao)}</span>}
                              {s.sobOrcamento
                                ? <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Sob Orçamento</span>
                                : s.preco ? <span className={`text-sm font-black ${isSelected ? 'text-violet-600' : 'text-violet-600'}`}>R$ {Number(s.preco).toFixed(2)}</span> : null
                              }
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 self-center flex-shrink-0 transition-colors ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-slate-300'}`}>
                            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t border-slate-100 p-4 z-10 shadow-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{selectedServices.length} serviço{selectedServices.length > 1 ? 's' : ''} selecionado{selectedServices.length > 1 ? 's' : ''}</p>
                          <p className="text-sm font-black text-slate-900">
                            {selectedServices.map(s => s.nome).join(' + ')}
                          </p>
                        </div>
                        <div className="text-right">
                          {(() => {
                            const total = selectedServices.reduce((s, sv) => s + (Number(sv.preco) || 0), 0);
                            const dur = selectedServices.reduce((s, sv) => s + (Number(sv.duracao) || 0), 0);
                            return <>
                              {total > 0 && <p className="text-sm font-black text-violet-700">R$ {total.toFixed(2)}</p>}
                              {dur > 0 && <p className="text-xs text-slate-400">{fmtDuracao(dur)}</p>}
                            </>;
                          })()}
                        </div>
                      </div>
                      <button onClick={handleContinueService}
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2">
                        <ChevronRight className="w-4 h-4" />Continuar
                      </button>
                    </div>
                  )}
                </>
            }
          </div>
        )}

        {bookingStep === 'professional' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Com quem?</h2>
            <p className="text-sm text-slate-400 mb-5">Escolha o profissional</p>
            <div className="space-y-3">
              {profissionals.map(p => (
                <button key={p.id} onClick={() => handleSelectProf(p)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-violet-300 hover:shadow-md transition-all text-left flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0" style={{ backgroundColor: p.cor || '#7c3aed' }}>
                    {(p.nome || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{p.nome}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(p.servicos || []).slice(0, 4).map(s => (
                        <span key={s} className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {bookingStep === 'datetime' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Quando?</h2>
            <p className="text-sm text-slate-400 mb-4">Escolha o dia e horário</p>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
              <div className="flex items-center justify-between">
                <button onClick={() => changeDate(-1)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <div className="text-center">
                  <p className="font-black text-slate-900">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                  <p className="text-sm text-slate-500">{selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
                </div>
                <button onClick={() => changeDate(1)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
            {slotsLoading
              ? <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto mb-2" /><p className="text-sm text-slate-400">A verificar disponibilidade...</p></div>
              : slots === null ? null
              : slots.length === 0
                ? <div className="text-center py-10"><CalendarCheck className="w-10 h-10 text-slate-200 mx-auto mb-2" /><p className="text-slate-400 text-sm font-medium">Sem horários neste dia.</p><p className="text-slate-300 text-xs mt-1">Tente outro dia</p></div>
                : <>
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {slots.map(slot => {
                        const isExt = extendedSlots.includes(slot);
                        return (
                          <button key={slot} onClick={() => setSelectedHora(slot)}
                            className={`py-3 rounded-xl text-sm font-bold border-2 transition-all relative ${selectedHora === slot ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200' : isExt ? 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400' : 'bg-white text-slate-700 border-slate-100 hover:border-violet-200'}`}>
                            {slot}
                            {isExt && selectedHora !== slot && <span className="absolute -top-1.5 -right-1 text-[8px] bg-amber-400 text-white px-1 rounded-full font-black leading-4">+</span>}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => { if (!selectedHora) return; setBookingStep(serviceHasExtras ? 'upsell' : 'confirm'); }}
                      disabled={!selectedHora}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors">
                      Continuar
                    </button>
                  </>
            }
          </div>
        )}

        {bookingStep === 'upsell' && (() => {
          const allCrossSells = availableCrossSells; // already filtered — excludes services already selected

          return (
            <div>
              {/* Selected service recap */}
              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Scissors className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-violet-500 uppercase tracking-wider mb-0.5">Já agendado</p>
                  <p className="font-black text-violet-900 text-sm truncate">{selectedService?.nome}</p>
                  <p className="text-xs text-violet-600">{selectedHora} · {selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-violet-500 flex-shrink-0" />
              </div>

              <h2 className="text-xl font-black text-slate-900 mb-1">Aproveite a visita!</h2>
              <p className="text-sm text-slate-400 mb-4">Agende mais um serviço com desconto exclusivo</p>

              <div className="space-y-3 mb-5">
                {allCrossSells.map(cs => {
                    const svc = servicos.find(s => s.nome === cs.servicoNome);
                    if (!svc) return null;
                    const isAvailable = upsellAvailability === null ? null : (upsellAvailability[cs.servicoNome] === true);
                    const precoOrig = svc.preco ? Number(svc.preco) : null;
                    const precoDesc = precoOrig ? Math.round(precoOrig * (1 - cs.desconto / 100) * 100) / 100 : null;
                    const added = selectedExtras.some(e => e.tipo === 'servico' && e.nome === svc.nome);
                    return (
                      <div key={cs.servicoNome} className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-all ${added ? 'border-emerald-400' : 'border-slate-100 hover:border-violet-200'}`}>
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 flex items-center gap-2">
                          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">🎉 {cs.desconto}% de desconto · só hoje</span>
                          {isAvailable === null && <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" />A verificar...</span>}
                          {isAvailable === false && <span className="text-[10px] text-amber-600 font-semibold ml-auto">⚠ Sujeito a disponibilidade</span>}
                        </div>
                        <div className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0"><Scissors className="w-5 h-5 text-violet-600" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm">{svc.nome}</p>
                            {svc.duracao && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{fmtDuracao(svc.duracao)}</p>}
                            {precoDesc !== null && (
                              <div className="flex items-center gap-2 mt-1">
                                {precoOrig && <span className="text-xs text-slate-400 line-through">R$ {precoOrig.toFixed(2)}</span>}
                                <span className="text-base font-black text-emerald-600">R$ {precoDesc.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                          <button onClick={() => setSelectedExtras(prev => added
                            ? prev.filter(e => !(e.tipo === 'servico' && e.nome === svc.nome))
                            : [...prev, { tipo: 'servico', nome: svc.nome, preco: precoDesc ?? precoOrig ?? 0, duracao: Number(svc.duracao) || Number(profile.intervaloBase || profile.intervalo) || 60, ...(isAvailable === false ? { sujeito: true } : {}) }])}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex-shrink-0 flex items-center gap-1.5 ${added ? 'bg-emerald-500 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'}`}>
                            {added ? <><CheckCircle className="w-3.5 h-3.5" />Adicionado</> : 'Adicionar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(selectedService?.upsell || []).map((produto, i) => {
                    const added = selectedExtras.some(e => e.tipo === 'produto' && e.nome === produto.nome);
                    return (
                      <div key={i} className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${added ? 'border-emerald-400' : 'border-slate-100 hover:border-amber-200'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-5 h-5 text-amber-600" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm">{produto.nome}</p>
                            {produto.descricao && <p className="text-xs text-slate-400 mt-0.5">{produto.descricao}</p>}
                            {produto.preco > 0 && <p className="text-base font-black text-violet-700 mt-0.5">R$ {Number(produto.preco).toFixed(2)}</p>}
                          </div>
                          <button onClick={() => setSelectedExtras(prev => added
                            ? prev.filter(e => !(e.tipo === 'produto' && e.nome === produto.nome))
                            : [...prev, { tipo: 'produto', nome: produto.nome, preco: produto.preco || 0 }])}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex-shrink-0 ${added ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                            {added ? 'Adicionado' : 'Quero'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              <button onClick={() => setBookingStep('confirm')}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm transition-colors">
                {selectedExtras.length > 0 ? `Confirmar (+${selectedExtras.length} extra${selectedExtras.length > 1 ? 's' : ''})` : 'Continuar'}
              </button>
              <button onClick={() => { setSelectedExtras([]); setBookingStep('confirm'); }} className="w-full mt-2 py-3 text-slate-400 text-sm hover:text-slate-600 transition-colors">
                Não, obrigado
              </button>
            </div>
          );
        })()}

        {bookingStep === 'confirm' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Confirmar marcação</h2>
            <p className="text-sm text-slate-400 mb-4">Reveja os detalhes antes de confirmar</p>
            <div className="bg-violet-50 rounded-2xl p-4 mb-4 space-y-2">
              <div>
                <span className="text-xs text-violet-500 font-semibold uppercase tracking-wider">Serviço{selectedServices.length > 1 ? 's' : ''}</span>
                {selectedServices.map((s, i) => (
                  <div key={i} className="flex justify-between items-center mt-1">
                    <span className="text-sm font-bold text-violet-900">{s.nome}</span>
                    {s.preco ? <span className="text-xs font-bold text-violet-700">R$ {Number(s.preco).toFixed(2)}</span> : s.sobOrcamento ? <span className="text-xs font-bold text-amber-600">Sob Orçamento</span> : null}
                  </div>
                ))}
              </div>
              {selectedProfissional && <div className="flex justify-between items-center">
                <span className="text-xs text-violet-500 font-semibold uppercase tracking-wider">Profissional</span>
                <span className="text-sm font-bold text-violet-900">{selectedProfissional.nome}</span>
              </div>}
              <div className="flex justify-between items-center">
                <span className="text-xs text-violet-500 font-semibold uppercase tracking-wider">Data</span>
                <span className="text-sm font-bold text-violet-900">{selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-violet-500 font-semibold uppercase tracking-wider">Hora</span>
                <span className="text-sm font-bold text-violet-900">{selectedHora}</span>
              </div>
              {selectedExtras.length > 0 && <div className="pt-1 border-t border-violet-100 space-y-1">
                <span className="text-xs text-violet-500 font-semibold uppercase tracking-wider">Extras</span>
                {selectedExtras.map((e, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-xs text-violet-700">{e.nome}</span>
                    {e.preco > 0 && <span className="text-xs font-bold text-violet-900">+R$ {Number(e.preco).toFixed(2)}</span>}
                  </div>
                ))}
              </div>}
              {(() => {
                const totalServicos = selectedServices.reduce((s, sv) => s + (Number(sv.preco) || 0), 0);
                const totalExtras = selectedExtras.reduce((s, e) => s + (Number(e.preco) || 0), 0);
                const total = totalServicos + totalExtras;
                const dur = selectedServices.reduce((s, sv) => s + (Number(sv.duracao) || 0), 0)
                          + selectedExtras.reduce((s, e) => s + (Number(e.duracao) || 0), 0);
                return (total > 0 || dur > 0) ? (
                  <div className="flex justify-between items-center pt-2 border-t border-violet-200 mt-1">
                    {dur > 0 && <span className="text-xs text-violet-500">{fmtDuracao(dur)}</span>}
                    {total > 0 && (
                      <div className="flex items-baseline gap-1 ml-auto">
                        <span className="text-xs font-semibold text-violet-500 uppercase tracking-wider">Total</span>
                        <span className="text-lg font-black text-violet-900">R$ {total.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
            {/* Client info — logged in shows account, remarcar shows editable fields */}
            {clientUser && !isRemarcar ? (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 mb-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Os seus dados</p>
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-700">{clientAccount?.nome || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-500">{clientAccount?.whats || '—'}</span>
                </div>
              </div>
            ) : isRemarcar ? (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 mb-5 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Os seus dados</p>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Nome</label>
                  <input value={remarcarNome} onChange={e => setRemarcarNome(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">WhatsApp</label>
                  <input type="tel" value={remarcarWhats} onChange={e => setRemarcarWhats(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
                </div>
              </div>
            ) : null}
            <button onClick={() => {
              if (!clientUser) {
                setPendingAction({ type: isRemarcar ? 'remarcar' : 'booking' });
              } else {
                handleConfirmBooking(isRemarcar);
              }
            }} disabled={submitting || (isRemarcar && (!remarcarNome.trim() || !remarcarWhats.trim()))}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {clientUser ? 'Confirmar marcação' : 'Entrar para confirmar'}
            </button>
          </div>
        )}
      </>
    );
  }

  // ── TOKEN VIEW ───────────────────────────────────────────
  if (deepLinkApptId && deepLinkToken) {
    if (tokenValid === null) {
      return (
        <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
          <HeroBanner profile={profile} onSignOut={handleSignOut} />
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
        </div>
      );
    }
    if (!tokenValid) {
      return (
        <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
          <HeroBanner profile={profile} onSignOut={handleSignOut} />
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-4"><X className="w-8 h-8 text-red-400" /></div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Link inválido</h2>
            <p className="text-sm text-slate-400">Este link de agendamento não é válido ou expirou.</p>
          </div>
          <div className="text-center py-4 border-t border-slate-100 bg-white">
            <div className="flex items-center justify-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-violet-400" /><span className="text-xs text-slate-400 font-semibold">hute</span></div>
          </div>
        </div>
      );
    }

    // Login gate for token actions
    if (pendingAction && !clientUser) return renderAuthScreen(true);

    // Booking mode from token (remarcar)
    if (bookingMode) {
      return (
        <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
          <HeroBanner profile={profile} onSignOut={handleSignOut} showBack onBack={() => { if (bookingStep === 'service') setBookingMode(false); else bookingBack(); }} />
          <div className="flex-1 p-5 pt-6 pb-8 overflow-y-auto">
            {bookingStep === 'success'
              ? <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                  <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mb-5 animate-bounce"><CheckCircle className="w-12 h-12 text-emerald-500" /></div>
                  <h2 className="text-3xl font-black text-slate-900 mb-2">Marcado!</h2>
                  <p className="text-slate-400 text-sm">A sua marcação foi confirmada com sucesso.</p>
                </div>
              : BookingStepsRender(true)
            }
          </div>
        </div>
      );
    }

    // Token detail view
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
        <HeroBanner profile={profile} onSignOut={handleSignOut} />
        <div className="flex-1 p-5 pt-6 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center flex-shrink-0"><Scissors className="w-5 h-5 text-violet-600" /></div>
            <div>
              <p className="font-black text-slate-900 text-lg leading-tight">{tokenAppt.servico}</p>
              {tokenAppt.profissionalNome && <p className="text-sm text-slate-400">com {tokenAppt.profissionalNome}</p>}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3 mb-6">
            <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cliente</span><span className="text-sm font-bold text-slate-900">{tokenAppt.clienteNome}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Data</span><span className="text-sm font-bold text-slate-900">{fmtData(tokenAppt.data)}</span></div>
            <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Hora</span><span className="text-sm font-bold text-slate-900">{tokenAppt.hora}</span></div>
            {tokenAppt.valor && <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Preço</span><span className="text-sm font-bold text-violet-600">R$ {Number(tokenAppt.valor).toFixed(2)}</span></div>}
          </div>
          {!tokenAppt._cancelled && apptEndTime(tokenAppt) > now && (
            cancelConfirmAppt?.id === tokenAppt.id ? (
              <div className="bg-white rounded-2xl p-5 border border-slate-100 text-center">
                <p className="font-bold text-slate-800 mb-1">Cancelar esta marcação?</p>
                <p className="text-xs text-slate-400 mb-4">{tokenAppt.servico} · {fmtData(tokenAppt.data)} às {tokenAppt.hora}</p>
                <div className="flex gap-3">
                  <button onClick={() => setCancelConfirmAppt(null)} className="flex-1 py-3 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Não</button>
                  <button onClick={() => {
                    setCancelConfirmAppt(null);
                    if (!clientUser) {
                      setPendingAction({ type: 'cancelar', appt: tokenAppt });
                    } else {
                      fetch(`${BACKEND_URL}/cancelAppointment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          lojaId: lojaUid, appointmentId: tokenAppt.id,
                          clienteWhats: tokenAppt.clienteWhats || '', nomeCliente: tokenAppt.clienteNome || '',
                          servico: tokenAppt.servico || '', data: tokenAppt.data || '',
                          hora: tokenAppt.hora || '', profissionalNome: tokenAppt.profissionalNome || '',
                        }),
                      }).catch(() => {});
                      setTokenAppt(prev => ({ ...prev, _cancelled: true }));
                    }
                  }} className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
                    Sim, cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => {
                  const svc = (profile.servicos || []).find(s => s.nome === tokenAppt.servico) || { nome: tokenAppt.servico, duracao: profile.intervalo };
                  setSelectedServices([svc]);
                  setSelectedProfissional((profile.profissionals || []).find(p => p.id === tokenAppt.profissionalId) || null);
                  setSelectedDate(firstAvailableDate(profile));
                  setSelectedHora('');
                  setSelectedExtras([]);
                  setRemarcarNome(tokenAppt.clienteNome || '');
                  setRemarcarWhats(tokenAppt.clienteWhats || '');
                  setRemarcarOldId(tokenAppt.id);
                  setBookingStep(profissionals.length > 0 ? 'professional' : 'datetime');
                  if (profissionals.length === 0) fetchSlots(new Date(), svc, null);
                  setBookingMode(true);
                }} className="flex-1 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-600 hover:border-violet-200 hover:text-violet-600 transition-all">
                  Remarcar
                </button>
                <button onClick={() => setCancelConfirmAppt(tokenAppt)}
                  className="flex-1 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm font-bold text-red-500 hover:bg-red-100 transition-all">
                  Cancelar
                </button>
              </div>
            )
          )}
          {tokenAppt._cancelled && (
            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 mb-3">Marcação cancelada.</p>
              <button onClick={() => {
                const svc = (profile.servicos || []).find(s => s.nome === tokenAppt.servico) || { nome: tokenAppt.servico, duracao: profile.intervalo };
                setRemarcarOldId(null);
                setBookingMode(false);
                startBooking(svc);
              }} className="w-full py-3 rounded-2xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors">
                Agendar novo horário
              </button>
            </div>
          )}
        </div>
        <div className="text-center py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-violet-400" /><span className="text-xs text-slate-400 font-semibold">hute</span></div>
        </div>
      </div>
    );
  }

  // ── LOGIN GATE (pending action) ──────────────────────────
  if (pendingAction && !clientUser) return renderAuthScreen(true);

  // ── AUTH SCREEN (clicked "Entrar" from service list) ────
  if (!clientUser && showAuth) return renderAuthScreen(false);

  // ── BOOKING MODE (not logged in — full flow before confirm) ─
  if (bookingMode && !clientUser) {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
        <HeroBanner profile={profile} onSignOut={handleSignOut} showBack onBack={() => { if (bookingStep === 'service') setBookingMode(false); else bookingBack(); }} />
        <div className="flex-1 p-5 pt-6 pb-8 overflow-y-auto">
          {bookingStep === 'success'
            ? <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mb-5 animate-bounce"><CheckCircle className="w-12 h-12 text-emerald-500" /></div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Marcado!</h2>
                <p className="text-slate-400 text-sm">A sua marcação foi confirmada com sucesso.</p>
              </div>
            : BookingStepsRender(false)
          }
        </div>
        <div className="text-center py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-violet-400" /><span className="text-xs text-slate-400 font-semibold">hute</span></div>
        </div>
      </div>
    );
  }

  // ── NOT LOGGED IN — service list ─────────────────────────
  if (!clientUser) {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
        <HeroBanner profile={profile} onSignOut={handleSignOut} />
        <div className="flex-1 p-5 pt-6 pb-8">
          {servicos.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <Scissors className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm font-medium">Nenhum serviço disponível</p>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <p className="text-xl font-black text-slate-900 mb-1">Agende o seu serviço</p>
                <p className="text-sm text-slate-400">Escolha um serviço para começar</p>
              </div>
              <div className="space-y-3">
                {servicos.map((s, i) => (
                  <button key={i} onClick={() => startBooking(s)}
                    className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:border-violet-300 hover:shadow-md transition-all text-left flex">
                    {s.foto
                      ? <img src={s.foto} alt={s.nome} className="w-20 h-20 object-cover flex-shrink-0" />
                      : <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center flex-shrink-0"><Scissors className="w-7 h-7 text-violet-400" /></div>
                    }
                    <div className="flex-1 min-w-0 px-4 py-3">
                      <p className="font-bold text-slate-900">{s.nome}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {s.duracao && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDuracao(s.duracao)}</span>}
                        {s.preco && <span className="text-sm font-black text-violet-600">R$ {Number(s.preco).toFixed(2)}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 mr-4 self-center flex-shrink-0" />
                  </button>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-400 mb-3">Já tem conta?</p>
                <button onClick={() => { setAuthMode('login'); setShowAuth(true); }}
                  className="px-6 py-2.5 bg-white border-2 border-violet-200 text-violet-600 font-bold rounded-xl text-sm hover:bg-violet-50 transition-colors">
                  Entrar
                </button>
              </div>
            </>
          )}
        </div>
        <div className="text-center py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-violet-400" /><span className="text-xs text-slate-400 font-semibold">hute</span></div>
        </div>
      </div>
    );
  }

  // ── WHATSAPP ASK (Google login, no whats) ────────────────
  if (clientUser && authMode === 'whatsask') {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
        <HeroBanner profile={profile} onSignOut={handleSignOut} />
        <div className="flex-1 p-5 pt-8 flex flex-col">
          <div className="w-14 h-14 bg-emerald-50 rounded-3xl flex items-center justify-center mb-5">
            <MessageCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-1">Qual o seu WhatsApp?</h2>
          <p className="text-sm text-slate-400 mb-6">Para receber confirmações e lembretes das suas marcações</p>
          <div className="flex gap-2 mb-4">
            <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex-shrink-0">+55</div>
            <input type="tel" value={loginWhats} onChange={e => setLoginWhats(e.target.value)}
              placeholder="(11) 99999-9999" autoComplete="tel"
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
          </div>
          <button onClick={handleSaveWhats} disabled={savingWhats || !loginWhats.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2 mb-3">
            {savingWhats ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Guardar
          </button>
          <button onClick={() => setAuthMode('login')} className="text-sm text-slate-400 hover:text-slate-600 text-center py-2 transition-colors">
            Pular por agora
          </button>
        </div>
        <div className="text-center py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-violet-400" /><span className="text-xs text-slate-400 font-semibold">hute</span></div>
        </div>
      </div>
    );
  }

  // ── BOOKING MODE (logged in) ─────────────────────────────
  if (bookingMode) {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
        <HeroBanner profile={profile} onSignOut={handleSignOut} showBack onBack={() => { if (bookingStep === 'service') setBookingMode(false); else bookingBack(); }} />
        <div className="flex-1 p-5 pt-6 pb-8 overflow-y-auto">
          {bookingStep === 'success'
            ? <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mb-5 animate-bounce"><CheckCircle className="w-12 h-12 text-emerald-500" /></div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Marcado!</h2>
                <p className="text-slate-400 text-sm">A sua marcação foi confirmada com sucesso.</p>
              </div>
            : BookingStepsRender(false)
          }
        </div>
      </div>
    );
  }

  // ── MAIN LOGGED-IN VIEW (tabs) ───────────────────────────
  return (
    <div className="md:flex md:h-screen md:overflow-hidden">
      <ClientSidebar tab={tab} setTab={setTab} profile={profile} onSignOut={handleSignOut} clientUser={clientUser} />
      <div className="flex-1 md:overflow-y-auto md:h-screen">
      <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col md:max-w-none md:min-h-0">

      {/* HeroBanner: mobile only */}
      <div className="md:hidden">
        <HeroBanner profile={profile} onSignOut={handleSignOut} showSignOut />
      </div>

      {confirmedAppt && (
        <div className="mx-5 mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-emerald-800 text-sm">Marcação confirmada!</p>
            <p className="text-xs text-emerald-600 truncate">{confirmedAppt.servico} · {fmtData(confirmedAppt.data)} às {confirmedAppt.hora}</p>
          </div>
          <button onClick={() => setConfirmedAppt(null)} className="text-emerald-400 hover:text-emerald-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex-1 p-5 pt-5 pb-32 overflow-y-auto md:pb-8 md:px-8">

        {/* ── AGENDA TAB ──────────────────────────────────── */}
        {tab === 'agenda' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-5">Olá, {(clientAccount?.nome || '').split(' ')[0] || 'bem-vindo'}!</h2>

            {!isStandalone && !pwaHidden && (
              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  <p className="font-bold text-violet-900 text-sm">Instalar o app</p>
                  <button onClick={() => setPwaHidden(true)} className="ml-auto text-violet-300 hover:text-violet-500"><X className="w-3.5 h-3.5" /></button>
                </div>
                {isIOS ? (
                  <div className="space-y-1">
                    <p className="text-xs text-violet-600 font-medium">Adicione ao ecrã inicial:</p>
                    <p className="text-xs text-slate-600">1. Toque em <strong>Partilhar</strong> <span className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">&#8679;</span> no Safari</p>
                    <p className="text-xs text-slate-600">2. Toque em <strong>Adicionar ao ecrã de início</strong></p>
                  </div>
                ) : installPrompt ? (
                  <button onClick={async () => {
                    installPrompt.prompt();
                    const { outcome } = await installPrompt.userChoice;
                    setInstallPrompt(null);
                    if (outcome === 'accepted') setPwaHidden(true);
                  }} className="w-full bg-violet-600 text-white font-bold py-2.5 rounded-xl text-xs mt-1 hover:bg-violet-700 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> Adicionar ao ecrã inicial
                  </button>
                ) : null}
              </div>
            )}

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Próximas marcações</h3>
            {upcomingAppts.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 text-center border border-slate-100 mb-5">
                <CalendarCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhum agendamento marcado</p>
                <p className="text-xs text-slate-300 mt-1">Use o botão abaixo para agendar</p>
              </div>
            ) : (
              <div className="space-y-3 mb-5">
                {upcomingAppts.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    {cancelledAppt?.id === a.id ? (
                      <div className="text-center py-2">
                        <p className="text-sm font-bold text-slate-500 mb-3">Marcação cancelada.</p>
                        <button onClick={() => {
                          setCancelledAppt(null);
                          const svc = servicos.find(s => s.nome === a.servico) || { nome: a.servico, duracao: profile.intervalo };
                          setRemarcarOldId(null);
                          startBooking(svc);
                        }} className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors">
                          Agendar novo horário
                        </button>
                      </div>
                    ) : cancelConfirmAppt?.id === a.id ? (
                      <div className="text-center py-1">
                        <p className="text-sm font-bold text-slate-700 mb-1">Cancelar marcação?</p>
                          <p className="text-xs text-slate-400 mb-1">{a.servico}{a.extras?.length > 0 ? ` + ${a.extras.map(e=>e.nome).join(', ')}` : ''} · {fmtData(a.data)} às {a.hora}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setCancelConfirmAppt(null)} className="flex-1 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors">Não</button>
                          <button onClick={() => cancelAppt(a)} disabled={cancelingId === a.id} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
                            {cancelingId === a.id ? '...' : 'Sim, cancelar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                            <Scissors className="w-5 h-5 text-violet-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{a.servico}</p>
                            {a.extras?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 mb-0.5">
                                {a.extras.map((e, ei) => (
                                  <span key={ei} className="inline-flex items-center gap-0.5 bg-violet-50 text-violet-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-violet-100">
                                    + {e.nome}{(e.precoDesconto || e.preco) ? ` · R$ ${Number(e.precoDesconto || e.preco).toFixed(2)}` : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-slate-400">{fmtData(a.data)} às {a.hora}{a.profissionalNome ? ` · ${a.profissionalNome}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => {
                            const svc = servicos.find(s => s.nome === a.servico) || { nome: a.servico, duracao: profile.intervalo };
                            setRemarcarOldId(a.id);
                            startBooking(svc);
                          }} className="flex-1 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 hover:border-violet-200 hover:text-violet-600 transition-all text-center">
                            Remarcar
                          </button>
                          <button onClick={() => setCancelConfirmAppt(a)}
                            className="flex-1 py-2 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-500 hover:bg-red-100 transition-all text-center">
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => startBooking()}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Agendar novo serviço
            </button>
          </div>
        )}

        {/* ── HISTÓRICO TAB ───────────────────────────────── */}
        {tab === 'historico' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-4">Histórico</h2>
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {[['todos', 'Todos'], ['futuros', 'Futuros'], ['passados', 'Passados']].map(([v, l]) => (
                <button key={v} onClick={() => setHistFilter(v)}
                  className={`px-4 py-2 rounded-full text-xs font-bold border-2 whitespace-nowrap transition-all ${histFilter === v ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-500 border-slate-200 hover:border-violet-200'}`}>
                  {l}
                </button>
              ))}
            </div>
            {filteredAppts.length === 0 ? (
              <div className="text-center py-12">
                <CalendarCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Nenhuma marcação encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppts.map(a => {
                  const isPast = apptEndTime(a) <= now;
                  return (
                    <div key={a.id} className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${isPast ? 'border-slate-100 opacity-70' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-slate-50' : 'bg-violet-50'}`}>
                          <Scissors className={`w-5 h-5 ${isPast ? 'text-slate-300' : 'text-violet-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">{a.servico}</p>
                          {a.extras?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 mb-0.5">
                              {a.extras.map((e, ei) => (
                                <span key={ei} className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${isPast ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-violet-50 text-violet-600 border-violet-100'}`}>
                                  + {e.nome}{(e.precoDesconto || e.preco) ? ` · R$ ${Number(e.precoDesconto || e.preco).toFixed(2)}` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-slate-400">{fmtData(a.data)} às {a.hora}{a.profissionalNome ? ` · ${a.profissionalNome}` : ''}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${isPast ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}>
                          {isPast ? 'Concluído' : 'Ativo'}
                        </span>
                      </div>
                      {!isPast ? (
                        cancelConfirmAppt?.id === a.id ? (
                          <div className="mt-3 text-center">
                            <p className="text-xs text-slate-500 mb-2">Confirmar cancelamento?</p>
                            <div className="flex gap-2">
                              <button onClick={() => setCancelConfirmAppt(null)} className="flex-1 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors">Não</button>
                              <button onClick={() => cancelAppt(a)} disabled={cancelingId === a.id} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
                                {cancelingId === a.id ? '...' : 'Sim, cancelar'}
                              </button>
                            </div>
                          </div>
                        ) : cancelledAppt?.id === a.id ? (
                          <div className="mt-3 text-center">
                            <p className="text-xs text-slate-500 mb-2">Marcação cancelada.</p>
                            <button onClick={() => {
                              setCancelledAppt(null);
                              const svc = servicos.find(s => s.nome === a.servico) || { nome: a.servico, duracao: profile.intervalo };
                              setRemarcarOldId(null);
                              startBooking(svc);
                            }} className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors">
                              Agendar novo horário
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => {
                              const svc = servicos.find(s => s.nome === a.servico) || { nome: a.servico, duracao: profile.intervalo };
                              setRemarcarOldId(a.id);
                              startBooking(svc);
                            }} className="flex-1 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 hover:border-violet-200 hover:text-violet-600 transition-all text-center">
                              Remarcar
                            </button>
                            <button onClick={() => setCancelConfirmAppt(a)}
                              className="flex-1 py-2 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-500 hover:bg-red-100 transition-all text-center">
                              Cancelar
                            </button>
                          </div>
                        )
                      ) : (
                        <button onClick={() => {
                          const svc = servicos.find(s => s.nome === a.servico) || { nome: a.servico, duracao: profile.intervalo };
                          setRemarcarOldId(null);
                          startBooking(svc);
                        }} className="w-full mt-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 hover:border-violet-200 hover:text-violet-600 transition-all text-center">
                          Agendar novamente
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CONTA TAB ───────────────────────────────────── */}
        {tab === 'conta' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-5">Meu Perfil</h2>

            {/* ── Profile card ── */}
            {editingProfile ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Editar perfil</p>

                {/* Photo */}
                <div className="flex flex-col items-center mb-5">
                  <label className="cursor-pointer relative group">
                    {profileFoto ? (
                      <img src={profileFoto} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-violet-100 flex items-center justify-center">
                        <span className="font-black text-violet-600 text-2xl">{initials(profileNome || clientAccount?.nome)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const canvas = document.createElement('canvas');
                      const img = new window.Image();
                      img.onload = () => {
                        const size = 240;
                        const scale = Math.min(size / img.width, size / img.height, 1);
                        canvas.width = Math.round(img.width * scale);
                        canvas.height = Math.round(img.height * scale);
                        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                        setProfileFoto(canvas.toDataURL('image/jpeg', 0.82));
                        URL.revokeObjectURL(img.src);
                      };
                      img.src = URL.createObjectURL(file);
                    }} />
                  </label>
                  <p className="text-xs text-slate-400 mt-2">Toque para alterar a foto</p>
                </div>

                {/* Nome */}
                <div className="mb-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nome *</label>
                  <input type="text" value={profileNome} onChange={e => setProfileNome(e.target.value)} placeholder="O seu nome"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                </div>

                {/* Birthdate */}
                <div className="mb-5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Aniversário (dia e mês)</label>
                  <div className="flex gap-2">
                    <select value={profileNascDia} onChange={e => setProfileNascDia(e.target.value)}
                      className="flex-1 px-3 py-3 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                      <option value="">Dia</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
                      ))}
                    </select>
                    <select value={profileNascMes} onChange={e => setProfileNascMes(e.target.value)}
                      className="flex-1 px-3 py-3 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                      <option value="">Mês</option>
                      {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((mes, i) => (
                        <option key={i} value={String(i + 1).padStart(2, '0')}>{mes}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={async () => {
                    if (!profileNome.trim()) return;
                    setSavingProfile(true);
                    const update = { nome: profileNome.trim(), nascDia: profileNascDia, nascMes: profileNascMes };
                    if (profileFoto) update.foto = profileFoto;
                    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clientAccounts', clientUser.uid), update, { merge: true });
                    setClientAccount(prev => ({ ...prev, ...update }));
                    setSavingProfile(false);
                    setEditingProfile(false);
                  }} disabled={savingProfile || !profileNome.trim()}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Guardar
                  </button>
                  <button onClick={() => setEditingProfile(false)}
                    className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:border-slate-300 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4">
                <div className="flex items-center gap-4 mb-4">
                  {clientAccount?.foto ? (
                    <img src={clientAccount.foto} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
                  ) : clientUser?.photoURL ? (
                    <img src={clientUser.photoURL} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <span className="font-black text-violet-600 text-2xl">{initials(clientAccount?.nome)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-base truncate">{clientAccount?.nome || '—'}</p>
                    <p className="text-xs text-slate-400 truncate">{clientAccount?.email || clientUser?.email || '—'}</p>
                    {clientAccount?.nascDia && clientAccount?.nascMes && (
                      <p className="text-xs text-violet-500 font-medium mt-0.5">
                        🎂 {clientAccount.nascDia}/{clientAccount.nascMes}
                      </p>
                    )}
                  </div>
                  <button onClick={() => {
                    setProfileNome(clientAccount?.nome || '');
                    setProfileNascDia(clientAccount?.nascDia || '');
                    setProfileNascMes(clientAccount?.nascMes || '');
                    setProfileFoto(clientAccount?.foto || '');
                    setEditingProfile(true);
                  }} className="p-2 rounded-xl bg-slate-50 hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-0 border-t border-slate-50 pt-3">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">WhatsApp</span>
                    </div>
                    {editingWhats ? (
                      <div className="flex items-center gap-2">
                        <input type="tel" value={whatsEdit} onChange={e => setWhatsEdit(e.target.value)}
                          className="w-32 px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500" />
                        <button onClick={async () => {
                          if (!whatsEdit.trim()) return;
                          setSavingWhats(true);
                          await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clientAccounts', clientUser.uid), { whats: whatsEdit.trim() }, { merge: true });
                          setClientAccount(prev => ({ ...prev, whats: whatsEdit.trim() }));
                          setEditingWhats(false);
                          setSavingWhats(false);
                        }} disabled={savingWhats} className="text-xs font-bold text-violet-600">
                          {savingWhats ? '...' : 'OK'}
                        </button>
                        <button onClick={() => setEditingWhats(false)} className="text-xs text-slate-400">×</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">{clientAccount?.whats || '—'}</span>
                        <button onClick={() => { setWhatsEdit(clientAccount?.whats || ''); setEditingWhats(true); }} className="text-xs text-violet-500 font-medium">Editar</button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">Marcações</span>
                    </div>
                    <span className="text-sm font-bold text-slate-700">{clientAppts.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">Membro desde</span>
                    </div>
                    <span className="text-sm font-bold text-slate-700">
                      {clientAccount?.createdAt ? new Date(clientAccount.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleSignOut}
              className="w-full py-3.5 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold text-sm hover:border-red-200 hover:text-red-500 transition-all flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />
              Sair da conta
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom navigation (mobile only) ───────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-100 md:hidden" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="flex">
          {[
            { key: 'agenda', label: 'Agenda', Icon: CalendarCheck },
            { key: 'historico', label: 'Histórico', Icon: Clock },
            { key: 'conta', label: 'Conta', Icon: User },
          ].map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-[11px] font-bold transition-colors ${tab === key ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
      </div>
      </div>
    </div>
  );
}

// ── Invite Accept Screen ──────────────────────────────────
function InviteAcceptScreen({ token, onDone }) {
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'invites', token))
      .then(snap => {
        if (!snap.exists()) { setError('Link de convite inválido ou expirado.'); }
        else if (snap.data().used) { setError('Este link de convite já foi utilizado.'); }
        else { setInviteData(snap.data()); }
      })
      .catch(() => setError('Erro ao carregar convite.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setSubmitting(true);
    try {
      let userCred;
      if (mode === 'create') {
        userCred = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password);
      }
      await setDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'staff', userCred.user.uid),
        { lojaId: inviteData.lojaId, profissionalId: inviteData.profissionalId, nome: inviteData.profNome, role: 'professional' }
      );
      await setDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'invites', token),
        { used: true },
        { merge: true }
      );
      window.location.hash = '';
      onDone();
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Este email já está registado. Tente fazer login.',
        'auth/invalid-email': 'Email inválido.',
        'auth/weak-password': 'A palavra-passe deve ter pelo menos 6 caracteres.',
        'auth/user-not-found': 'Utilizador não encontrado.',
        'auth/wrong-password': 'Palavra-passe incorreta.',
        'auth/invalid-credential': 'Credenciais inválidas.',
      };
      setAuthError(msgs[err.code] || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 to-violet-800">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="font-black text-slate-900 text-xl mb-2">Link inválido</h2>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-violet-700 to-violet-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white font-black text-3xl tracking-tight">hute</h1>
          <p className="text-violet-200 text-sm mt-1">Convite de acesso</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="bg-violet-50 rounded-2xl p-4 mb-6 text-center">
            <p className="text-xs text-violet-500 font-semibold uppercase tracking-wider mb-1">Você foi convidado como</p>
            <p className="font-black text-violet-900 text-lg">{inviteData?.profNome}</p>
          </div>

          <h2 className="text-slate-900 font-black text-lg mb-1">
            {mode === 'create' ? 'Criar a sua conta' : 'Entrar na sua conta'}
          </h2>
          <p className="text-slate-400 text-xs mb-5">Aceda à sua agenda pessoal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="o@meu.email"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Palavra-passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3">{authError}</div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === 'create' ? 'Criar conta e entrar' : 'Entrar'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-slate-400 text-sm">
              {mode === 'create' ? 'Já tem conta?' : 'Ainda não tem conta?'}
              {' '}
              <button onClick={() => { setMode(m => m === 'create' ? 'login' : 'create'); setAuthError(''); }}
                className="text-violet-600 font-semibold hover:underline">
                {mode === 'create' ? 'Entrar' : 'Criar conta'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Staff Panel ───────────────────────────────────────────
function StaffPanel({ user, staffRecord, lojaProfile }) {
  const [view, setView] = useState('agenda');

  const handleLogout = async () => { await signOut(auth); };

  const navItems = [
    { key: 'agenda',  icon: Calendar, label: 'Agenda' },
    { key: 'clients', icon: Users,    label: 'Clientes' },
  ];

  return (
    <div className="max-w-[480px] mx-auto bg-slate-50 min-h-screen pb-20 shadow-2xl shadow-slate-200">
      <header className="bg-white border-b border-slate-100 px-5 py-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-slate-900 text-lg tracking-tight">hute</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 ml-9">
              {staffRecord.nome} · {lojaProfile.nome || 'Staff'}
            </p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs font-medium px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="p-5">
        {view === 'agenda'  && <AdminAgenda user={user} lojaId={staffRecord.lojaId} filterProfId={staffRecord.profissionalId} profile={lojaProfile} />}
        {view === 'clients' && <AdminClients user={user} lojaId={staffRecord.lojaId} filterProfId={staffRecord.profissionalId} isAdmin={false} />}
      </main>

      <nav className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-slate-100 flex justify-around py-2 px-1 z-20">
        {navItems.map(({ key, icon: Icon, label }) => {
          const active = view === key;
          return (
            <button key={key} onClick={() => setView(key)}
              className={`flex flex-col items-center px-6 py-1.5 rounded-xl transition-all ${active ? 'text-violet-600' : 'text-slate-400'}`}>
              <Icon className={`w-5 h-5 mb-0.5 ${active ? 'text-violet-600' : ''}`} />
              <span className={`text-[10px] font-semibold ${active ? 'text-violet-600' : ''}`}>{label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-violet-600 mt-0.5" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
