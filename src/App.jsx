import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, signOut
} from 'firebase/auth';
import {
  getFirestore, collection, addDoc, onSnapshot, doc, setDoc,
  getDoc, deleteDoc, getDocs
} from 'firebase/firestore';
import {
  Calendar, Users, Settings, Scissors, CheckCircle, Loader2, Copy,
  MessageCircle, Trash2, ChevronLeft, ChevronRight, Plus, X, Tag,
  Clock, Sparkles, Phone, CalendarCheck, User, LogOut, Edit2,
  Briefcase, ArrowLeft, Star, Mail, Lock, Eye, EyeOff, Camera, Image, Link, Search, Smartphone, CreditCard, Zap, Shield
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
const db = getFirestore(app);
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
  const [isClientMode, setIsClientMode] = useState(false);
  const [resolvedLojaUid, setResolvedLojaUid] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [deepLinkApptId, setDeepLinkApptId] = useState(null);

  const fetchProfile = useCallback(async (uid) => {
    const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', uid));
    if (snap.exists()) { setProfile(snap.data()); return snap.data(); }
    setProfile(null); return null;
  }, []);

  useEffect(() => {
    const raw = window.location.hash.replace('#', '').trim();
    const hash = raw.toLowerCase();

    // ── Invite link: /#invite/TOKEN ──────────────────────
    if (hash.startsWith('invite/')) {
      setInviteToken(raw.replace(/^invite\//i, ''));
      setAuthLoading(false);
      return;
    }

    // ── Deep link: /#slug/agendamento/ID ─────────────────
    const apptLinkMatch = raw.match(/^([^/]+)\/agendamento\/([^/]+)$/i);
    if (apptLinkMatch) {
      const slugPart = apptLinkMatch[1].toLowerCase();
      const apptId = apptLinkMatch[2];
      setDeepLinkApptId(apptId);
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
            const p = await fetchProfile(u.uid);
            if (!p) {
              // No admin profile — check if this is a B2C client account on admin URL
              try {
                const clientSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clientAccounts', u.uid));
                if (clientSnap.exists()) {
                  // Client account on admin URL — sign out silently, show login
                  signOut(auth).catch(() => {});
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
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 to-violet-800">
      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <span className="text-white font-black text-2xl tracking-tight mb-2">hute</span>
      <Loader2 className="w-5 h-5 animate-spin text-white/70" />
    </div>
  );

  if (authLoading) return <Loading />;
  if (inviteToken) return <InviteAcceptScreen token={inviteToken} onDone={() => setInviteToken(null)} />;
  if (isClientMode) return <ClientPortal lojaUid={resolvedLojaUid} profile={lojaProfile} deepLinkApptId={deepLinkApptId} />;
  if (!user) return <LoginScreen />;
  if (staffRecord) return <StaffPanel user={user} staffRecord={staffRecord} lojaProfile={lojaProfile} />;
  if (!profile) return <OnboardingScreen user={user} onComplete={p => setProfile(p)} />;
  if (profile.status !== 'active') {
    return <PlansScreen user={user} profile={profile} onActivated={async () => {
      const p = await fetchProfile(user.uid);
      setProfile(p);
    }} />;
  }
  return <AdminPanel user={user} profile={profile} setProfile={setProfile} fetchProfile={fetchProfile} />;
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
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-violet-700 to-violet-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white font-black text-3xl tracking-tight">hute</h1>
          <p className="text-violet-200 text-sm mt-1">Mais que uma agenda, a sua secretária inteligente</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-slate-900 font-black text-xl mb-6">
            {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="o@meu.email"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Palavra-passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}
              {' '}
              <button
                onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
                className="text-violet-600 font-semibold hover:underline"
              >
                {mode === 'login' ? 'Registar' : 'Entrar'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding Screen ─────────────────────────────────────
function OnboardingScreen({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [slug, setSlug] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFim, setHoraFim] = useState('19:00');
  const [intervalo, setIntervalo] = useState(30);
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
        horaInicio,
        horaFim,
        intervalo: Number(intervalo),
        servicos: [],
        profissionals,
        googleCalendarConnected: false,
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
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-white" />
            <span className="text-white font-black text-2xl tracking-tight">hute</span>
          </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Abertura</label>
                  <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Fecho</label>
                  <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Intervalo base entre marcações</label>
                <select value={intervalo} onChange={e => setIntervalo(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                  {[15, 20, 30, 45, 60, 90, 120].map(v => (
                    <option key={v} value={v}>{fmtDuracao(v)}</option>
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

// ── Admin Panel Shell ─────────────────────────────────────
function AdminPanel({ user, profile, setProfile, fetchProfile }) {
  const [view, setView] = useState('agenda');

  const handleLogout = async () => {
    await signOut(auth);
  };

  const navItems = [
    { key: 'agenda',   icon: Calendar,  label: 'Agenda' },
    { key: 'clients',  icon: Users,     label: 'Clientes' },
    { key: 'equipa',   icon: Briefcase, label: 'Equipa' },
    { key: 'servicos', icon: Tag,       label: 'Serviços' },
    { key: 'settings', icon: Settings,  label: 'Config' },
  ];

  return (
    <div className="max-w-[480px] mx-auto bg-slate-50 min-h-screen pb-20 shadow-2xl shadow-slate-200">
      <header className="bg-white border-b border-slate-100 px-5 py-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Hute" className="w-8 h-8 flex-shrink-0" />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-black text-slate-900 text-lg tracking-tight leading-none">hute</span>
                <span className="text-[11px] text-slate-400 font-medium leading-none">{profile.nome || 'Painel de Gestão'}</span>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs font-medium px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="p-5">
        {view === 'agenda'   && <AdminAgenda user={user} lojaId={user.uid} profile={profile} />}
        {view === 'clients'  && <AdminClients user={user} lojaId={user.uid} isAdmin={true} />}
        {view === 'equipa'   && <AdminEquipa user={user} profile={profile} setProfile={setProfile} />}
        {view === 'servicos' && <AdminServicos user={user} profile={profile} setProfile={setProfile} />}
        {view === 'settings' && <AdminSettings user={user} profile={profile} setProfile={setProfile} onLogout={handleLogout} />}
      </main>

      <nav className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-slate-100 flex justify-around py-2 px-1 z-20">
        {navItems.map(({ key, icon: Icon, label }) => {
          const active = view === key;
          return (
            <button key={key} onClick={() => setView(key)}
              className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-all ${active ? 'text-violet-600' : 'text-slate-400'}`}>
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

// ── Admin Agenda ──────────────────────────────────────────
function AdminAgenda({ user, lojaId, filterProfId, profile }) {
  const profissionals = profile?.profissionals || [];
  const defaultProfId = filterProfId || (profissionals[0]?.id ?? null);

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
  const colId = lojaId || user.uid;
  const dateISO = toDateISO(selectedDate);
  const todayISO = toDateISO(new Date());

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
    const usesGoogle = selectedProf?.agendaTipo === 'google';
    if (!usesGoogle) { setGoogleFreeSlots(null); return; }

    setGoogleLoading(true);
    setGoogleFreeSlots(null);
    setGoogleEvents([]);
    const baseParams = { lojaId: colId, data: dateISO, profissionalId: selectedProfId };
    const slotsParams = new URLSearchParams({ ...baseParams, duracao: profile?.intervalo || 60 });
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
  const isDayOff = dayBlocks.some(b => b.type === 'day_off');
  const customHours = dayBlocks.find(b => b.type === 'custom_hours');
  const slotBlocks = dayBlocks.filter(b => b.type === 'slot');

  const effStart = customHours ? customHours.horaInicio : (profile?.horaInicio || '09:00');
  const effEnd   = customHours ? customHours.horaFim    : (profile?.horaFim    || '18:00');
  const intervalo = profile?.intervalo || 60;

  const dayAppts = appointments.filter(a =>
    a.data === dateISO && (!selectedProfId || a.profissionalId === selectedProfId)
  );

  // ── Sequential timeline ──────────────────────────────────
  // Instead of a fixed grid, appointments stack one after the other.
  // Free gaps appear exactly where the previous appointment ended.
  const toMin = s => { const [h,m] = s.split(':').map(Number); return h*60+m; };
  const toStr = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  const nowMin = dateISO === todayISO ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

  // Collect all events (appointments, blocks, Google Calendar) sorted by start time
  const rawEvents = [
    ...dayAppts.map(a => ({ tipo:'appt', hora:a.hora, duracao:Number(a.duracao)||intervalo, appt:a })),
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

  const syncBadge = googleLoading
    ? <span className="text-[10px] text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Sincronizando...</span>
    : googleFreeSlots !== null
      ? <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" />Google Agenda</span>
      : selectedProf
        ? <span className="text-[10px] bg-violet-50 text-violet-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar className="w-3 h-3" />Agenda nativa</span>
        : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Agenda</h2>
          <div className="flex items-center gap-2 mt-0.5">{syncBadge}</div>
        </div>
        <button onClick={() => { setPreHora(''); setShowNewAppt(true); }} title="Nova marcação"
          className="p-2.5 bg-violet-600 rounded-xl text-white hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Professional selector — hidden for staff (filterProfId set) */}
      {!filterProfId && profissionals.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
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
      )}

      {/* Date navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
        <div className="flex items-center justify-between">
          <button onClick={() => { setSelectedDate(d => addDays(d, -1)); setActiveSlot(null); }}
            className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="font-black text-slate-900 capitalize">
              {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
            </p>
            <p className="text-sm text-slate-500">
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

      {/* Sequential Timeline */}
      {!isDayOff && (
        <div className="space-y-1.5">
          {timeline.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10">Sem horários configurados.</p>
          )}
          {timeline.map((item, idx) => {
            const key = `${item.tipo}-${item.hora}-${idx}`;

            // ── Horário perdido ───────────────────────────
            if (item.tipo === 'past') return (
              <div key={key} className="flex items-center rounded-xl border border-dashed border-slate-100 bg-slate-50/50 opacity-40">
                <div className="w-[60px] flex-shrink-0 flex flex-col items-center justify-center py-2.5">
                  <span className="text-[10px] font-semibold text-slate-300">{item.hora}</span>
                </div>
                <p className="flex-1 text-left px-3 text-[11px] text-slate-300 font-medium">Horário perdido</p>
                <span className="text-[10px] text-slate-200 mr-3">{item.endHora}</span>
              </div>
            );

            // ── Livre ─────────────────────────────────────
            if (item.tipo === 'free') {
              const isActive = activeSlot === item.hora;
              return (
                <div key={key}>
                  <button onClick={() => setActiveSlot(isActive ? null : item.hora)}
                    className={`w-full flex items-center rounded-xl border-2 border-dashed transition-all ${
                      isActive ? 'border-violet-400 bg-violet-50' : 'border-slate-100 bg-white/60 hover:border-violet-200 hover:bg-violet-50/40'
                    }`}>
                    <div className="w-[60px] flex-shrink-0 flex flex-col items-center justify-center py-2.5">
                      <span className="text-xs font-semibold text-slate-400">{item.hora}</span>
                    </div>
                    <p className="flex-1 text-left px-3 text-[11px] text-slate-400 font-medium">Disponível</p>
                    {isActive
                      ? <ChevronRight className="w-3.5 h-3.5 text-violet-400 mr-3" />
                      : <span className="text-[10px] text-slate-200 mr-3">{item.endHora}</span>}
                  </button>
                  {isActive && (
                    <div className="flex gap-2 mt-1 mb-0.5">
                      <button onClick={() => openNewAppt(item.hora)}
                        className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors">
                        <Plus className="w-3.5 h-3.5" />Agendar
                      </button>
                      <button onClick={() => openBlock(item.hora)}
                        className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-red-100 transition-colors">
                        <Clock className="w-3.5 h-3.5" />Bloquear
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // ── Agendamento ───────────────────────────────
            if (item.tipo === 'appt') {
              const a = item.appt;
              return (
                <div key={key} className="bg-white rounded-2xl overflow-hidden border border-violet-100 shadow-sm">
                  <div className="flex items-stretch">
                    <div className="w-[60px] flex-shrink-0 flex flex-col items-center justify-center py-3"
                      style={{ backgroundColor: selectedProf?.cor || '#7c3aed' }}>
                      <span className="text-xs font-black text-white leading-tight">{a.hora}</span>
                      {a.duracao && <span className="text-[9px] text-white/60 mt-0.5">{fmtDuracao(a.duracao)}</span>}
                    </div>
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-sm truncate">{a.clienteNome}</p>
                          <p className="text-xs text-slate-500 truncate">{a.servico}</p>
                          {a.profissionalNome && !selectedProfId && (
                            <p className="text-[10px] text-violet-500 mt-0.5">com {a.profissionalNome}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {a.valor && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">R$ {Number(a.valor).toFixed(2)}</span>}
                            {a.clienteWhats && (
                              <a href={`https://wa.me/${a.clienteWhats.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${a.clienteNome}! Lembrete: ${a.servico} às ${a.hora}. Até breve!`)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                                <MessageCircle className="w-3 h-3" />{a.clienteWhats}
                              </a>
                            )}
                          </div>
                        </div>
                        <button onClick={() => cancelar(a)} className="p-1 text-slate-200 hover:text-red-400 transition-colors flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // ── Bloqueio ──────────────────────────────────
            if (item.tipo === 'block') {
              const b = item.block;
              return (
                <div key={key} className="bg-red-50 rounded-xl overflow-hidden border border-red-100 flex items-center">
                  <div className="w-[60px] bg-red-100 flex-shrink-0 flex flex-col items-center justify-center py-3">
                    <span className="text-xs font-black text-red-600">{b.hora}</span>
                    {b.duracao && <span className="text-[9px] text-red-400 mt-0.5">{fmtDuracao(b.duracao)}</span>}
                  </div>
                  <div className="flex-1 px-3 py-2">
                    <p className="text-xs font-bold text-red-700">Bloqueado</p>
                    {b.motivo && <p className="text-[10px] text-red-400">{b.motivo}</p>}
                  </div>
                  <button onClick={() => removeBlock(b.id)} className="p-3 text-red-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            // ── Google Calendar ───────────────────────────
            if (item.tipo === 'google') {
              const e = item.googleEvent;
              return (
                <div key={key} className="bg-blue-50 rounded-2xl overflow-hidden border border-blue-100 shadow-sm">
                  <div className="flex items-stretch">
                    <div className="w-[60px] flex-shrink-0 flex flex-col items-center justify-center py-3 bg-blue-500">
                      <span className="text-xs font-black text-white leading-tight">{item.hora}</span>
                      <Calendar className="w-3 h-3 text-white/60 mt-0.5" />
                    </div>
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <p className="font-bold text-blue-800 text-sm truncate">{e.summary || 'Evento'}</p>
                      <p className="text-xs text-blue-500 mt-0.5">
                        {new Date(e.start).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                        {' – '}
                        {new Date(e.end).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                      </p>
                      <p className="text-[10px] text-blue-400 mt-1">Google Calendar</p>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })}
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
    </div>
  );
}

// ── New Appointment Modal ─────────────────────────────────
function NewAppointmentModal({ lojaId, profile, filterProfId, prefilledHora, prefilledDate, onClose, onSaved }) {
  const [clienteWhats, setClienteWhats] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteNascimento, setClienteNascimento] = useState('');
  const [existingClient, setExistingClient] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProfId, setSelectedProfId] = useState(filterProfId || '');
  const [data, setData] = useState(prefilledDate || new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(prefilledHora || '');
  const [slots, setSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      duracao: selectedService.duracao || profile.intervalo || 60,
      ...(selectedProfId ? { profissionalId: selectedProfId } : {}),
    });
    fetch(`${BACKEND_URL}/getSlots?${params}`)
      .then(r => r.json())
      .then(j => setSlots(j.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedService, selectedProfId, data, lojaId, profile.intervalo]);

  const profOptions = useMemo(() => {
    if (filterProfId) return (profile.profissionals || []).filter(p => p.id === filterProfId);
    if (!selectedService) return profile.profissionals || [];
    const assigned = (profile.profissionals || []).filter(p => (p.servicos || []).includes(selectedService.nome));
    return assigned.length > 0 ? assigned : (profile.profissionals || []);
  }, [selectedService, filterProfId, profile.profissionals]);

  const handleSave = async () => {
    if (!clienteNome.trim() || !selectedService || !data || !hora) return;
    setSaving(true);
    try {
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

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSave = clienteNome.trim() && selectedService && data && hora && !saving;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-[480px] max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-black text-slate-900">Nova Marcação</h2>
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
                  {slots.map(slot => (
                    <button key={slot} type="button" onClick={() => setHora(slot)}
                      className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${hora === slot ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-700 border-slate-100 hover:border-violet-200'}`}>
                      {slot}
                    </button>
                  ))}
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-[480px] shadow-2xl" onClick={e => e.stopPropagation()}>
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Clientes</h2>
          <p className="text-xs text-slate-400">{clients.length} cliente{clients.length !== 1 ? 's' : ''} registado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAddForm(v => !v)}
          className="p-2 bg-violet-600 rounded-xl text-white hover:bg-violet-700 transition-colors">
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
          <div className="space-y-3">
            {recentVisitas.map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{v.servico || 'Marcação'}</p>
                  {v.profissionalNome && <p className="text-xs text-violet-500">com {v.profissionalNome}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{fmtData(v.data)} · {v.hora}</p>
                  {v.valor && <p className="text-xs font-bold text-emerald-600">R$ {Number(v.valor).toFixed(2)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Equipa ──────────────────────────────────────────
function AdminEquipa({ user, profile, setProfile }) {
  const [profissionals, setProfissionals] = useState(profile.profissionals || []);
  const [expandedId, setExpandedId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
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
      client_id: '524847309009-4a5hi7e81jl18s0ihmoadgep9roa3rfk.apps.googleusercontent.com',
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
          <h2 className="text-xl font-black text-slate-900">Equipa</h2>
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
        <button onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-violet-200 text-violet-600 font-semibold rounded-2xl hover:bg-violet-50 transition-colors text-sm">
          <Plus className="w-4 h-4" />
          Adicionar Profissional
        </button>
      )}
    </div>
  );
}

// ── Admin Servicos ────────────────────────────────────────
function AdminServicos({ user, profile, setProfile }) {
  const [servicos, setServicos] = useState(profile.servicos || []);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [duracao, setDuracao] = useState(60);
  const [novaFoto, setNovaFoto] = useState(null);
  const [tipoAviso, setTipoAviso] = useState('nenhum');
  const [diasAviso, setDiasAviso] = useState('');
  const [servicoManutencao, setServicoManutencao] = useState('');
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [editData, setEditData] = useState({});

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
    const novo = {
      nome: nomeVal,
      preco: overrides.preco !== undefined ? overrides.preco : (preco ? Number(preco) : null),
      duracao: overrides.duracao !== undefined ? overrides.duracao : Number(duracao),
      foto: overrides.foto !== undefined ? overrides.foto : (novaFoto || null),
      tipoAviso: overrides.tipoAviso !== undefined ? overrides.tipoAviso : (tipoAviso !== 'nenhum' ? tipoAviso : undefined),
      diasAviso: overrides.diasAviso !== undefined ? overrides.diasAviso : (tipoAviso !== 'nenhum' && diasAviso ? Number(diasAviso) : undefined),
      servicoManutencao: overrides.servicoManutencao !== undefined ? overrides.servicoManutencao : (tipoAviso === 'manutencao' ? servicoManutencao || undefined : undefined),
    };
    // Remove undefined keys
    Object.keys(novo).forEach(k => novo[k] === undefined && delete novo[k]);
    const updated = [...servicos, novo];
    await saveServicos(updated);
    if (!overrides.nome) {
      setNome(''); setPreco(''); setDuracao(60); setNovaFoto(null);
      setTipoAviso('nenhum'); setDiasAviso(''); setServicoManutencao('');
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
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-900">Serviços</h2>
        <p className="text-xs text-slate-400">{servicos.length} serviço{servicos.length !== 1 ? 's' : ''} disponível{servicos.length !== 1 ? 'is' : ''}</p>
      </div>

      <div className="space-y-3 mb-5">
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
                      <input type="number" value={editData.preco || ''} onChange={e => setEditData(p => ({ ...p, preco: e.target.value ? Number(e.target.value) : null }))}
                        placeholder="Preço R$"
                        className="px-3 py-2 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
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
                    {s.preco && <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">R$ {Number(s.preco).toFixed(2)}</span>}
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

      {/* Add form */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Adicionar serviço</h3>
        <div className="flex items-start gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Foto</label>
            <ImageUpload value={novaFoto} onChange={setNovaFoto} aspect="thumb" />
          </div>
          <div className="flex-1 space-y-3">
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do serviço"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={preco} onChange={e => setPreco(e.target.value)} placeholder="Preço (R$)"
                className="px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
              <select value={duracao} onChange={e => setDuracao(e.target.value)}
                className="px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
                {[15, 20, 30, 45, 60, 90, 120, 150, 180].map(v => (
                  <option key={v} value={v}>{fmtDuracao(v)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Aviso de retorno — add */}
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
  );
}

// ── Admin Settings ────────────────────────────────────────
function AdminSettings({ user, profile, setProfile, onLogout }) {
  const [nome, setNome] = useState(profile.nome || '');
  const [subtitulo, setSubtitulo] = useState(profile.subtitulo || '');
  const [slug, setSlug] = useState(profile.slug || '');
  const [whatsappNumber, setWhatsappNumber] = useState(profile.whatsappNumber || '');
  const [horaInicio, setHoraInicio] = useState(profile.horaInicio || '09:00');
  const [horaFim, setHoraFim] = useState(profile.horaFim || '19:00');
  const [intervalo, setIntervalo] = useState(profile.intervalo || 30);
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
      const data = { nome, subtitulo, slug, whatsappNumber: normalizedWhats, horaInicio, horaFim, intervalo: Number(intervalo), coverFoto, logo };
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
      client_id: '524847309009-4a5hi7e81jl18s0ihmoadgep9roa3rfk.apps.googleusercontent.com',
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
      <div>
        <h2 className="text-xl font-black text-slate-900">Configurações</h2>
        <p className="text-xs text-slate-400">Personalize o seu espaço</p>
      </div>

      {/* ── Identidade Visual ── */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Identidade Visual</p>

          {/* Cover photo */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Foto de capa</label>
            <ImageUpload value={coverFoto} onChange={setCoverFoto} aspect="cover" />
          </div>

          {/* Logo + preview */}
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

      {/* ── Informações ── */}
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

      {/* ── WhatsApp Connection ── */}
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
            {/* Mode toggle */}
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
                <p className="text-xs text-slate-400">O número deve ser o mesmo configurado no campo WhatsApp acima.</p>
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

      {/* ── Horário ── */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Horário de funcionamento</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Abertura</label>
            <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Fecho</label>
            <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Intervalo base entre marcações</label>
          <select value={intervalo} onChange={e => setIntervalo(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
            {[15, 20, 30, 45, 60, 90, 120].map(v => (
              <option key={v} value={v}>{fmtDuracao(v)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Save button */}
      <button onClick={saveAll} disabled={saving}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors shadow-lg shadow-violet-200">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
        {saved ? 'Guardado!' : 'Guardar alterações'}
      </button>

      {/* ── Link de reservas ── */}
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

      {/* ── Google Agenda ── */}
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
        ) : (
          <button onClick={startGoogleAuth}
            className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            Ligar Google Agenda
          </button>
        )}
      </div>

      {/* ── Logout ── */}
      <button onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 border border-slate-200 text-slate-400 font-semibold rounded-2xl hover:bg-slate-50 transition-colors text-sm">
        <LogOut className="w-4 h-4" />
        Terminar sessão
      </button>
    </div>
  );
}

// ── Client Portal ─────────────────────────────────────────
function ClientPortal({ lojaUid, profile, deepLinkApptId }) {
  // Booking flow
  const [step, setStep] = useState(deepLinkApptId ? 'apptDetail' : 'service');
  const [deepLinkAppt, setDeepLinkAppt] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProfissional, setSelectedProfissional] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHora, setSelectedHora] = useState('');
  const [slots, setSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [whats, setWhats] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedAppt, setConfirmedAppt] = useState(null);

  // Client auth
  const [clientUser, setClientUser] = useState(null);
  const [clientAccount, setClientAccount] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Account step
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [authMode, setAuthMode] = useState('signup');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Home step
  const [clientAppts, setClientAppts] = useState([]);

  // PWA install
  const [installPrompt, setInstallPrompt] = useState(null);
  const [pwaBlockHidden, setPwaBlockHidden] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone;

  const profissionals = profile.profissionals || [];
  const servicos = profile.servicos || [];

  // Listen to Firebase Auth — returning clients go straight to home
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clientAccounts', u.uid));
          if (snap.exists()) {
            setClientUser(u);
            setClientAccount(snap.data());
            setStep('home');
          } else {
            setClientUser(null);
          }
        } catch { setClientUser(null); }
      } else {
        setClientUser(null);
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // Dynamic PWA manifest — use establishment branding when client visits
  useEffect(() => {
    if (!profile?.nome) return;
    const icons = profile.logo
      ? [{ src: profile.logo, sizes: 'any', type: 'image/png', purpose: 'any' }]
      : [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }];
    const manifest = {
      name: profile.nome,
      short_name: profile.nome,
      description: `Agende com ${profile.nome}`,
      start_url: window.location.href,
      display: 'standalone',
      background_color: '#f8fafc',
      theme_color: '#7c3aed',
      orientation: 'portrait',
      icons,
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.querySelector('link[rel="manifest"]');
    if (link) link.href = blobUrl;
    // iOS uses meta tags instead of manifest for name + icon
    const metaTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (metaTitle) metaTitle.content = profile.nome;
    if (profile.logo) {
      let touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!touchIcon) {
        touchIcon = document.createElement('link');
        touchIcon.rel = 'apple-touch-icon';
        document.head.appendChild(touchIcon);
      }
      touchIcon.href = profile.logo;
    }
    return () => URL.revokeObjectURL(blobUrl);
  }, [profile?.nome, profile?.logo]);

  // Capture PWA install prompt (Android/Desktop) and detect install
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const installed = () => setPwaBlockHidden(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  // Load appointment from deep link
  useEffect(() => {
    if (!deepLinkApptId || !lojaUid) return;
    getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaUid}`, deepLinkApptId))
      .then(snap => {
        if (snap.exists()) setDeepLinkAppt({ id: snap.id, ...snap.data() });
      })
      .catch(console.error);
  }, [deepLinkApptId, lojaUid]);

  // Subscribe to client's appointments on home step
  useEffect(() => {
    if (!clientUser || step !== 'home') return;
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
  }, [clientUser, step, lojaUid, clientAccount]);

  const fetchSlots = useCallback(async (date, servico, profId) => {
    setSlotsLoading(true);
    setSlots(null);
    try {
      const params = new URLSearchParams({
        lojaId: lojaUid,
        data: toDateISO(date),
        duracao: servico?.duracao || profile.intervalo || 60,
        ...(profId ? { profissionalId: profId } : {}),
      });
      const res = await fetch(`${BACKEND_URL}/getSlots?${params}`);
      const json = await res.json();
      let slots = json.slots || [];

      // Filter out past slots when the selected date is today (uses browser local time)
      const isToday = toDateISO(date) === toDateISO(new Date());
      if (isToday) {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        slots = slots.filter(slot => {
          const [h, m] = slot.split(':').map(Number);
          return h * 60 + m > nowMin;
        });
      }

      setSlots(slots);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [lojaUid, profile.intervalo]);

  // Professionals who offer the selected service.
  // If no professional has that service assigned, show ALL professionals.
  const profForService = selectedService
    ? (() => {
        const assigned = profissionals.filter(p => (p.servicos || []).includes(selectedService.nome));
        return assigned.length > 0 ? assigned : profissionals;
      })()
    : profissionals;

  const goToStep = (newStep) => {
    if (newStep === 'datetime') {
      fetchSlots(selectedDate, selectedService, selectedProfissional?.id || null);
    }
    setStep(newStep);
  };

  const selectService = (s) => {
    setSelectedService(s);
    setSelectedProfissional(null);
    setSelectedHora('');
    // Always go to professional step if there are any professionals
    if (profissionals.length > 0) {
      setStep('professional');
    } else {
      fetchSlots(selectedDate, s, null);
      setStep('datetime');
    }
  };

  const selectProfissional = (p) => {
    setSelectedProfissional(p);
    setSelectedHora('');
    fetchSlots(selectedDate, selectedService, p?.id || null);
    setStep('datetime');
  };

  const changeDate = (delta) => {
    const newDate = addDays(selectedDate, delta);
    if (newDate < new Date(new Date().setHours(0,0,0,0))) return;
    setSelectedDate(newDate);
    setSelectedHora('');
    fetchSlots(newDate, selectedService, selectedProfissional?.id || null);
  };

  const handleSubmit = async () => {
    if (!nome.trim() || !whats.trim()) return;
    setSubmitting(true);
    try {
      const dataISO = toDateISO(selectedDate);
      const [h, m] = selectedHora.split(':').map(Number);
      const dtInt = new Date(selectedDate);
      dtInt.setHours(h, m, 0, 0);

      const apptData = {
        clienteNome: nome.trim(),
        clienteWhats: whats.trim(),
        clienteNascimento: nascimento || '',
        servico: selectedService.nome,
        valor: selectedService.preco || null,
        duracao: selectedService.duracao || profile.intervalo || 60,
        profissionalId: selectedProfissional?.id || null,
        profissionalNome: selectedProfissional?.nome || null,
        data: dataISO,
        hora: selectedHora,
        dataHoraInternacional: dtInt.toISOString(),
        createdAt: new Date().toISOString(),
        ...(clientUser ? { clientUid: clientUser.uid } : {}),
      };

      const apptRef = await addDoc(
        collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaUid}`),
        apptData
      );

      const clientKey = whats.trim().replace(/\D/g, '') || nome.trim().toLowerCase().replace(/\s+/g, '_');
      const clientDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${lojaUid}`, clientKey);
      const existingClient = await getDoc(clientDocRef);
      const totalVisitas = existingClient.exists() ? (existingClient.data().totalVisitas || 0) + 1 : 1;
      const primeiraVisita = existingClient.exists() ? (existingClient.data().primeiraVisita || dataISO) : dataISO;
      await setDoc(clientDocRef, {
        nome: nome.trim(), whats: whats.trim(), nascimento: nascimento || '',
        totalVisitas, primeiraVisita, ultimaVisita: dataISO,
      }, { merge: true });

      setConfirmedAppt({ ...apptData, id: apptRef.id });
      setStep(clientUser ? 'home' : 'account');

      fetch(`${BACKEND_URL}/createAppointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId: lojaUid, ...apptData, appointmentId: apptRef.id }),
      }).catch(() => {});
    } catch (err) {
      alert('Erro ao confirmar marcação. Tente novamente.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuth = async () => {
    setAuthError('');
    setAuthSubmitting(true);
    try {
      let cred;
      if (authMode === 'signup') {
        cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      const accountData = {
        nome: nome.trim() || '',
        whats: whats.trim() || '',
        nascimento: nascimento || '',
        email: email.trim(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clientAccounts', cred.user.uid), accountData, { merge: true });
      setClientUser(cred.user);
      setClientAccount(accountData);
      setStep('home');
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Este email já está em uso. Tente entrar.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
        'auth/invalid-email': 'Email inválido.',
        'auth/user-not-found': 'Conta não encontrada.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/invalid-credential': 'Email ou senha incorretos.',
      };
      setAuthError(msgs[err.code] || 'Erro ao autenticar. Tente novamente.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth).catch(() => {});
    setClientUser(null); setClientAccount(null); setClientAppts([]);
    setStep('service');
  };

  const startNewBooking = () => {
    setSelectedService(null); setSelectedProfissional(null);
    setSelectedDate(new Date()); setSelectedHora('');
    setNome(clientAccount?.nome || ''); setWhats(clientAccount?.whats || '');
    setNascimento(clientAccount?.nascimento || ''); setConfirmedAppt(null);
    setStep('service');
  };

  const stepIndex = { service: 0, professional: 1, datetime: 2, form: 3 };
  const totalSteps = profissionals.length > 0 ? 4 : 3;
  const currentIdx = stepIndex[step] ?? 0;

  const canGoBack = ['professional', 'datetime', 'form'].includes(step);
  const handleBack = () => {
    if (step === 'professional') setStep('service');
    else if (step === 'datetime') setStep(profForService.length > 0 ? 'professional' : 'service');
    else if (step === 'form') setStep('datetime');
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  function apptEndTime(a) {
    const [h, m] = (a.hora || '0:0').split(':').map(Number);
    const start = new Date(`${a.data}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
    return new Date(start.getTime() + (Number(a.duracao) || 60) * 60 * 1000);
  }
  const now = new Date();
  const upcomingAppts = clientAppts.filter(a => apptEndTime(a) > now);
  const pastAppts    = clientAppts.filter(a => apptEndTime(a) <= now);

  if (!authChecked) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
    </div>
  );

  const LogoBar = ({ showBack = false, showSignOut = false }) => (
    <div className="flex items-center gap-3 px-5 py-3.5">
      {showBack && (
        <button onClick={handleBack} className="p-1.5 -ml-1 text-violet-600 hover:text-violet-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      {profile.logo
        ? <img src={profile.logo} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
        : <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
      }
      <p className="font-black text-slate-900 flex-1 truncate text-sm">{profile.nome || 'Agendamento'}</p>
      {showSignOut && (
        <button onClick={handleSignOut} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors" title="Sair">
          <LogOut className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">

      {/* ── Sticky header ─────────────────────────────────── */}
      <header className="sticky top-0 z-10">
        {/* Hero banner — always visible when cover or logo exists */}
        {(profile.coverFoto || profile.logo) ? (
          <div className="relative h-36 overflow-hidden">
            {profile.coverFoto
              ? <img src={profile.coverFoto} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-violet-700 to-violet-500" />
            }
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            {/* Back / signout buttons — top row */}
            <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
              {canGoBack
                ? <button onClick={handleBack} className="w-8 h-8 bg-black/30 hover:bg-black/50 rounded-xl flex items-center justify-center text-white transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                : <div />
              }
              {step === 'home' && (
                <button onClick={handleSignOut} className="w-8 h-8 bg-black/30 hover:bg-black/50 rounded-xl flex items-center justify-center text-white transition-colors" title="Sair"><LogOut className="w-4 h-4" /></button>
              )}
            </div>
            {/* Logo + name — bottom */}
            <div className="absolute bottom-4 left-5 flex items-center gap-3">
              {profile.logo
                ? <img src={profile.logo} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-white/80 shadow-lg" />
                : <div className="w-12 h-12 rounded-xl bg-violet-600 border-2 border-white/80 shadow-lg flex items-center justify-center"><Sparkles className="w-6 h-6 text-white" /></div>
              }
              <div>
                <p className="font-black text-white text-lg leading-tight">{profile.nome || 'Agendamento'}</p>
                {profile.subtitulo && <p className="text-white/75 text-xs">{profile.subtitulo}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border-b border-slate-100">
            <LogoBar showBack={canGoBack} showSignOut={step === 'home'} />
          </div>
        )}

        {/* Progress dots — booking steps only */}
        {['service', 'professional', 'datetime', 'form'].includes(step) && (
          <div className="flex gap-1.5 px-5 py-2 bg-white border-b border-slate-100">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= currentIdx ? 'bg-violet-600' : 'bg-slate-200'}`} />
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 p-5 pt-6 pb-8">

        {/* ── SERVICE ───────────────────────────────────────── */}
        {step === 'service' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Qual serviço?</h2>
            <p className="text-sm text-slate-400 mb-5">Escolha o serviço que deseja</p>
            {servicos.length === 0 ? (
              <p className="text-center text-slate-400 py-12 text-sm">Nenhum serviço disponível.</p>
            ) : (
              <div className="space-y-3">
                {servicos.map((s, i) => (
                  <button key={i} onClick={() => selectService(s)}
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
            )}
          </div>
        )}

        {/* ── PROFESSIONAL ──────────────────────────────────── */}
        {step === 'professional' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Com quem?</h2>
            <p className="text-sm text-slate-400 mb-5">{selectedService ? `Para "${selectedService.nome}"` : 'Escolha o profissional'}</p>
            <div className="space-y-3">
              {profForService.map(p => (
                <button key={p.id} onClick={() => selectProfissional(p)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-violet-300 hover:shadow-md transition-all text-left flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0"
                    style={{ backgroundColor: p.cor || '#7c3aed' }}>
                    {(p.nome || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{p.nome}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(p.servicos || []).slice(0, 3).map(s => (
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

        {/* ── DATETIME ──────────────────────────────────────── */}
        {step === 'datetime' && (
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
            {slotsLoading ? (
              <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto mb-2" /><p className="text-sm text-slate-400">A verificar disponibilidade...</p></div>
            ) : slots === null ? null : slots.length === 0 ? (
              <div className="text-center py-10">
                <CalendarCheck className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm font-medium">Sem horários disponíveis neste dia.</p>
                <p className="text-slate-300 text-xs mt-1">Tente outro dia</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {slots.map(slot => (
                    <button key={slot} onClick={() => setSelectedHora(slot)}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${selectedHora === slot ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200' : 'bg-white text-slate-700 border-slate-100 hover:border-violet-200'}`}>
                      {slot}
                    </button>
                  ))}
                </div>
                <button onClick={() => { if (selectedHora) goToStep('form'); }} disabled={!selectedHora}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors">
                  Continuar
                </button>
              </>
            )}
          </div>
        )}

        {/* ── FORM ──────────────────────────────────────────── */}
        {step === 'form' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Confirmar marcação</h2>
            <p className="text-sm text-slate-400 mb-4">Reveja e preencha os seus dados</p>
            <div className="bg-violet-50 rounded-2xl p-4 mb-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-violet-500 font-semibold uppercase tracking-wider">Serviço</span>
                <span className="text-sm font-bold text-violet-900">{selectedService?.nome}</span>
              </div>
              {selectedProfissional && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-violet-500 font-semibold uppercase tracking-wider">Profissional</span>
                  <span className="text-sm font-bold text-violet-900">{selectedProfissional.nome}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-violet-500 font-semibold uppercase tracking-wider">Data</span>
                <span className="text-sm font-bold text-violet-900">{selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-violet-500 font-semibold uppercase tracking-wider">Hora</span>
                <span className="text-sm font-bold text-violet-900">{selectedHora}</span>
              </div>
              {selectedService?.preco && (
                <div className="flex justify-between items-center pt-1 border-t border-violet-100">
                  <span className="text-xs text-violet-500 font-semibold uppercase tracking-wider">Preço</span>
                  <span className="text-base font-black text-violet-900">R$ {Number(selectedService.preco).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nome completo</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="O seu nome"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">WhatsApp</label>
                <input type="tel" value={whats} onChange={e => setWhats(e.target.value)} placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Data de nascimento</label>
                <input type="date" value={nascimento} onChange={e => setNascimento(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
              </div>
            </div>
            <button onClick={handleSubmit} disabled={submitting || !nome.trim() || !whats.trim()}
              className="w-full mt-5 bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Confirmar marcação
            </button>
          </div>
        )}

        {/* ── ACCOUNT — create / sign in ─────────────────────── */}
        {step === 'account' && (
          <div>
            {confirmedAppt && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-emerald-800 text-sm">Marcação confirmada!</p>
                  <p className="text-xs text-emerald-600">{confirmedAppt.servico} · {fmtData(confirmedAppt.data)} às {confirmedAppt.hora}</p>
                </div>
              </div>
            )}
            <h2 className="text-xl font-black text-slate-900 mb-1">
              {authMode === 'signup' ? 'Criar a sua conta' : 'Entrar na sua conta'}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {authMode === 'signup' ? 'Guarde as suas marcações e remarque facilmente' : 'Aceda às suas marcações'}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="o.seu@email.com" autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={authMode === 'signup' ? 'Mínimo 6 caracteres' : 'A sua senha'}
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            {authError && <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{authError}</p>}
            <button onClick={handleAuth} disabled={authSubmitting || !email.trim() || !password}
              className="w-full mt-5 bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {authSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <User className="w-5 h-5" />}
              {authMode === 'signup' ? 'Criar conta' : 'Entrar'}
            </button>
            <div className="mt-4 text-center">
              {authMode === 'signup'
                ? <p className="text-xs text-slate-400">Já tem conta? <button onClick={() => { setAuthMode('signin'); setAuthError(''); }} className="text-violet-600 font-bold hover:underline">Entrar</button></p>
                : <p className="text-xs text-slate-400">Não tem conta? <button onClick={() => { setAuthMode('signup'); setAuthError(''); }} className="text-violet-600 font-bold hover:underline">Criar conta</button></p>
              }
            </div>
            <button onClick={() => setStep('confirmed')} className="w-full mt-3 py-3 text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Pular por agora
            </button>
          </div>
        )}

        {/* ── CONFIRMED (skip from account) ─────────────────── */}
        {step === 'confirmed' && confirmedAppt && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Marcado!</h2>
            <p className="text-slate-400 text-sm mb-6">A sua marcação foi confirmada com sucesso.</p>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-left space-y-3 mb-6">
              <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Serviço</span><span className="text-sm font-bold text-slate-900">{confirmedAppt.servico}</span></div>
              {confirmedAppt.profissionalNome && <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Profissional</span><span className="text-sm font-bold text-slate-900">{confirmedAppt.profissionalNome}</span></div>}
              <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Data</span><span className="text-sm font-bold text-slate-900">{fmtData(confirmedAppt.data)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Hora</span><span className="text-sm font-bold text-slate-900">{confirmedAppt.hora}</span></div>
              {confirmedAppt.valor && <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Preço</span><span className="text-sm font-bold text-violet-600">R$ {Number(confirmedAppt.valor).toFixed(2)}</span></div>}
            </div>
            <button onClick={startNewBooking} className="w-full border border-violet-200 text-violet-600 font-bold py-3.5 rounded-2xl text-sm hover:bg-violet-50 transition-colors">
              Nova marcação
            </button>
          </div>
        )}

        {/* ── APPT DETAIL — deep link view ──────────────────── */}
        {step === 'apptDetail' && (
          <div>
            {!deepLinkAppt ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7c3aed15' }}>
                    <Scissors className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-lg leading-tight">{deepLinkAppt.servico}</p>
                    {deepLinkAppt.profissionalNome && <p className="text-sm text-slate-400">com {deepLinkAppt.profissionalNome}</p>}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3 mb-6">
                  <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cliente</span><span className="text-sm font-bold text-slate-900">{deepLinkAppt.clienteNome}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Data</span><span className="text-sm font-bold text-slate-900">{fmtData(deepLinkAppt.data)}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Hora</span><span className="text-sm font-bold text-slate-900">{deepLinkAppt.hora}</span></div>
                  {deepLinkAppt.valor && <div className="flex justify-between"><span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Preço</span><span className="text-sm font-bold text-violet-600">R$ {Number(deepLinkAppt.valor).toFixed(2)}</span></div>}
                </div>
                {apptEndTime(deepLinkAppt) > new Date() && (
                  <div className="flex gap-3">
                    <button onClick={() => {
                      const svc = (profile.servicos || []).find(s => s.nome === deepLinkAppt.servico) || { nome: deepLinkAppt.servico, duracao: profile.intervalo };
                      const prof = (profile.profissionals || []).find(p => p.id === deepLinkAppt.profissionalId) || null;
                      setSelectedService(svc);
                      setSelectedProfissional(prof);
                      setSelectedDate(new Date());
                      setSelectedHora('');
                      setNome(deepLinkAppt.clienteNome || '');
                      setWhats(deepLinkAppt.clienteWhats || '');
                      setNascimento(deepLinkAppt.clienteNascimento || '');
                      setConfirmedAppt(null);
                      setStep('datetime');
                    }} className="flex-1 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-600 hover:border-violet-200 hover:text-violet-600 transition-all">
                      Remarcar
                    </button>
                    <button onClick={async () => {
                      if (!window.confirm('Cancelar esta marcação?')) return;
                      try {
                        const res = await fetch(`${BACKEND_URL}/cancelAppointment`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            lojaId: lojaUid,
                            appointmentId: deepLinkAppt.id,
                            clienteWhats: deepLinkAppt.clienteWhats || '',
                            nomeCliente: deepLinkAppt.clienteNome || '',
                            servico: deepLinkAppt.servico || '',
                            data: deepLinkAppt.data || '',
                            hora: deepLinkAppt.hora || '',
                            profissionalNome: deepLinkAppt.profissionalNome || '',
                          }),
                        });
                        if (res.ok) {
                          setDeepLinkAppt(null);
                          setStep('service');
                        } else {
                          alert('Erro ao cancelar.');
                        }
                      } catch { alert('Erro ao cancelar.'); }
                    }} className="flex-1 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm font-bold text-red-500 hover:bg-red-100 transition-all">
                      Cancelar
                    </button>
                  </div>
                )}
                <button onClick={() => setStep('service')} className="w-full mt-3 py-3 rounded-2xl border border-slate-100 text-sm font-bold text-slate-400 hover:text-violet-600 hover:border-violet-200 transition-all">
                  Nova marcação
                </button>
              </>
            )}
          </div>
        )}

        {/* ── HOME — client dashboard ────────────────────────── */}
        {step === 'home' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">Olá, {(clientAccount?.nome || '').split(' ')[0] || 'bem-vindo'}!</h2>
            </div>

            {/* Just confirmed banner */}
            {confirmedAppt && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-emerald-800 text-sm">Marcação confirmada!</p>
                  <p className="text-xs text-emerald-600">{confirmedAppt.servico} · {fmtData(confirmedAppt.data)} às {confirmedAppt.hora}</p>
                </div>
              </div>
            )}

            {/* PWA install — only shown if not already installed */}
            {!isInStandaloneMode && !pwaBlockHidden && (
              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  <p className="font-bold text-violet-900 text-sm">Instalar o app</p>
                </div>
                {isIOS ? (
                  <div className="space-y-1.5">
                    <p className="text-xs text-violet-600 font-medium">Adicione ao ecrã inicial em 3 passos:</p>
                    <p className="text-xs text-slate-600">1. Toque em <strong>Partilhar</strong> <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 text-[10px]">⬆</span> na barra do Safari</p>
                    <p className="text-xs text-slate-600">2. Role para baixo e toque em <strong>Adicionar ao ecrã de início</strong></p>
                    <p className="text-xs text-slate-600">3. Toque em <strong>Adicionar</strong> no canto superior direito</p>
                  </div>
                ) : installPrompt ? (
                  <button onClick={async () => {
                    installPrompt.prompt();
                    const { outcome } = await installPrompt.userChoice;
                    setInstallPrompt(null);
                    if (outcome === 'accepted') setPwaBlockHidden(true);
                  }}
                    className="w-full bg-violet-600 text-white font-bold py-2.5 rounded-xl text-xs mt-1 hover:bg-violet-700 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> Adicionar ao ecrã inicial
                  </button>
                ) : null}
              </div>
            )}

            {/* New booking button */}
            <button onClick={startNewBooking}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 mb-6 transition-colors shadow-lg shadow-violet-200">
              <Plus className="w-4 h-4" /> Nova marcação
            </button>

            {/* Upcoming appointments */}
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Próximas marcações</h3>
            {upcomingAppts.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 text-center border border-slate-100 mb-5">
                <CalendarCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhuma marcação futura</p>
              </div>
            ) : (
              <div className="space-y-3 mb-5">
                {upcomingAppts.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7c3aed15' }}>
                        <Scissors className="w-4 h-4 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{a.servico}</p>
                        {a.profissionalNome && <p className="text-xs text-slate-400">com {a.profissionalNome}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full">{fmtData(a.data)}</span>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">{a.hora}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => {
                          const svc = servicos.find(s => s.nome === a.servico) || { nome: a.servico, duracao: profile.intervalo };
                          const prof = profissionals.find(p => p.id === a.profissionalId) || null;
                          setSelectedService(svc);
                          setSelectedProfissional(prof);
                          setSelectedDate(new Date());
                          setSelectedHora('');
                          setNome(a.clienteNome || clientAccount?.nome || '');
                          setWhats(a.clienteWhats || clientAccount?.whats || '');
                          setNascimento(a.clienteNascimento || clientAccount?.nascimento || '');
                          setConfirmedAppt(null);
                          setStep('datetime');
                          fetchSlots(new Date(), svc, prof?.id || null);
                        }}
                        className="flex-1 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 hover:border-violet-200 hover:text-violet-600 transition-all text-center">
                        Remarcar
                      </button>
                      <button onClick={async () => {
                          if (!window.confirm('Cancelar esta marcação?')) return;
                          try {
                            const res = await fetch(`${BACKEND_URL}/cancelAppointment`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                lojaId: lojaUid,
                                appointmentId: a.id,
                                clienteWhats: a.clienteWhats || '',
                                nomeCliente: a.clienteNome || '',
                                servico: a.servico || '',
                                data: a.data || '',
                                hora: a.hora || '',
                                profissionalNome: a.profissionalNome || '',
                              }),
                            });
                            if (!res.ok) alert('Erro ao cancelar.');
                          } catch { alert('Erro ao cancelar.'); }
                        }}
                        className="flex-1 py-2 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-500 hover:bg-red-100 transition-all text-center">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Past appointments */}
            {pastAppts.length > 0 && (
              <>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Histórico</h3>
                <div className="space-y-2">
                  {pastAppts.slice(0, 5).map(a => (
                    <div key={a.id} className="bg-white/70 rounded-xl p-3.5 border border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Scissors className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-600 truncate">{a.servico}</p>
                        <p className="text-xs text-slate-400">{fmtData(a.data)} · {a.hora}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t border-slate-100 bg-white">
        <div className="flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-slate-400 font-semibold">hute</span>
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
