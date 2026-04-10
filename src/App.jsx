import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Briefcase, ArrowLeft, Star, Mail, Lock, Eye, EyeOff
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
      if (u && !u.isAnonymous) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('success')) window.history.replaceState({}, '', window.location.pathname);
        if (params.get('error')) {
          alert(`Erro Google Agenda: ${params.get('msg') || params.get('error')}`);
          window.history.replaceState({}, '', window.location.pathname);
        }
        setUser(u);

        // Check if this is a staff (professional) account
        const staffSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'staff', u.uid));
        if (staffSnap.exists()) {
          const sr = staffSnap.data();
          setStaffRecord(sr);
          const lp = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', sr.lojaId));
          if (lp.exists()) setLojaProfile(lp.data());
        } else {
          await fetchProfile(u.uid);
        }
      } else {
        setUser(null); setProfile(null); setStaffRecord(null);
      }
      setAuthLoading(false);
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
  if (isClientMode) return <ClientPortal lojaUid={resolvedLojaUid} profile={lojaProfile} />;
  if (!user) return <LoginScreen />;
  if (staffRecord) return <StaffPanel user={user} staffRecord={staffRecord} lojaProfile={lojaProfile} />;
  if (!profile || !profile.nome) return <OnboardingScreen user={user} onComplete={p => setProfile(p)} />;
  return <AdminPanel user={user} profile={profile} setProfile={setProfile} fetchProfile={fetchProfile} />;
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
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-slate-900 text-lg tracking-tight">hute</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 ml-9">{profile.nome || 'Painel de Gestão'}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs font-medium px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="p-5">
        {view === 'agenda'   && <AdminAgenda user={user} lojaId={user.uid} profile={profile} />}
        {view === 'clients'  && <AdminClients user={user} lojaId={user.uid} />}
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
  const [appointments, setAppointments] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const colId = lojaId || user.uid;

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${colId}`);
    const unsub = onSnapshot(q, (snap) => {
      const today = new Date().toISOString().split('T')[0];
      let appts = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a => a.data >= today);
      if (filterProfId) appts = appts.filter(a => a.profissionalId === filterProfId);
      appts.sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
      setAppointments(appts);
    });
    return () => unsub();
  }, [user, colId, filterProfId]);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', APP_ID, 'public', 'data', `blocks_${colId}`);
    const unsub = onSnapshot(q, (snap) => {
      const today = new Date().toISOString().split('T')[0];
      let blks = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(b => b.date >= today);
      if (filterProfId) blks = blks.filter(b => !b.profissionalId || b.profissionalId === filterProfId);
      setBlocks(blks);
    });
    return () => unsub();
  }, [user, colId, filterProfId]);

  const cancelar = async (id) => {
    if (!window.confirm('Cancelar este agendamento?')) return;
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${colId}`, id))
      .catch(() => alert('Erro ao cancelar.'));
  };

  const removeBlock = async (id) => {
    if (!window.confirm('Remover este bloqueio?')) return;
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', `blocks_${colId}`, id))
      .catch(() => alert('Erro ao remover.'));
  };

  const waLink = (num, nome, data, hora, servico) => {
    const n = num.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá ${nome}! Lembrete: ${servico} em ${fmtData(data)} às ${hora}. Até breve!`);
    return `https://wa.me/${n.startsWith('55') ? n : '55' + n}?text=${msg}`;
  };

  const filteredAppts = filterDate ? appointments.filter(a => a.data === filterDate) : appointments;
  const filteredBlocks = filterDate ? blocks.filter(b => b.date === filterDate) : blocks;

  const grouped = {};
  filteredAppts.forEach(a => {
    if (!grouped[a.data]) grouped[a.data] = { appts: [], blks: [] };
    grouped[a.data].appts.push(a);
  });
  filteredBlocks.forEach(b => {
    if (!grouped[b.date]) grouped[b.date] = { appts: [], blks: [] };
    grouped[b.date].blks.push(b);
  });
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900">Agenda</h2>
          <p className="text-xs text-slate-400">{filteredAppts.length} marcação{filteredAppts.length !== 1 ? 'ões' : ''} próxima{filteredAppts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-white outline-none text-slate-600" />
          <button onClick={() => setShowBlockModal(true)} title="Bloquear horário"
            className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
            <Clock className="w-4 h-4" />
          </button>
          <button onClick={() => setShowNewAppt(true)} title="Nova marcação"
            className="p-2 bg-violet-600 rounded-xl text-white hover:bg-violet-700 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-400 text-sm font-medium">{filterDate ? 'Sem marcações neste dia.' : 'A sua agenda está livre.'}</p>
          {filterDate && <button onClick={() => setFilterDate('')} className="mt-2 text-violet-500 text-xs font-semibold">Ver todas</button>}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => {
            const { appts, blks } = grouped[date];
            const hasDayOff = blks.some(b => b.type === 'day_off');
            return (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-violet-500" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{fmtData(date)}</p>
                  {hasDayOff && <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-semibold">Folga</span>}
                </div>
                <div className="space-y-3">
                  {appts.map(appt => (
                    <div key={appt.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                      <div className="flex items-stretch">
                        <div className="w-16 bg-violet-50 flex flex-col items-center justify-center py-4 flex-shrink-0">
                          <span className="text-sm font-black text-violet-700">{appt.hora}</span>
                          {appt.duracao && <span className="text-[9px] text-violet-400 mt-0.5">{fmtDuracao(appt.duracao)}</span>}
                        </div>
                        <div className="flex-1 p-4 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-slate-900 truncate">{appt.clienteNome}</h4>
                              <p className="text-sm text-slate-500 mt-0.5">{appt.servico || 'Marcação'}</p>
                              {appt.profissionalNome && (
                                <p className="text-xs text-violet-500 mt-0.5">com {appt.profissionalNome}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                {appt.valor && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">R$ {Number(appt.valor).toFixed(2)}</span>}
                                {appt.clienteWhats && <span className="text-xs text-slate-400">{appt.clienteWhats}</span>}
                              </div>
                            </div>
                            <button onClick={() => cancelar(appt.id)} className="p-1.5 text-slate-200 hover:text-red-400 transition-colors ml-2">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {appt.clienteWhats && (
                        <div className="border-t border-slate-50 px-4 py-2.5">
                          <a href={waLink(appt.clienteWhats, appt.clienteNome, appt.data, appt.hora, appt.servico || 'Marcação')}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-emerald-600 font-semibold">
                            <MessageCircle className="w-4 h-4" />
                            Contactar via WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                  {blks.filter(b => b.type === 'slot').map(b => (
                    <div key={b.id} className="bg-red-50 rounded-2xl overflow-hidden border border-red-100 flex items-center">
                      <div className="w-16 bg-red-100 flex flex-col items-center justify-center py-4 flex-shrink-0">
                        <span className="text-sm font-black text-red-600">{b.hora}</span>
                        {b.duracao && <span className="text-[9px] text-red-400 mt-0.5">{fmtDuracao(b.duracao)}</span>}
                      </div>
                      <div className="flex-1 p-4">
                        <p className="font-bold text-red-700 text-sm">Bloqueado</p>
                        {b.motivo && <p className="text-xs text-red-400 mt-0.5">{b.motivo}</p>}
                        {b.profissionalId && (() => { const pr = (profile?.profissionals||[]).find(p=>p.id===b.profissionalId); return pr ? <p className="text-xs text-red-400">· {pr.nome}</p> : null; })()}
                      </div>
                      <button onClick={() => removeBlock(b.id)} className="p-3 text-red-300 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {blks.filter(b => b.type === 'day_off').map(b => (
                    <div key={b.id} className="bg-red-50 rounded-2xl p-4 border border-red-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-red-700 text-sm">Dia de folga / indisponível</p>
                        {b.motivo && <p className="text-xs text-red-400 mt-0.5">{b.motivo}</p>}
                        {b.profissionalId && (() => { const pr = (profile?.profissionals||[]).find(p=>p.id===b.profissionalId); return pr ? <p className="text-xs text-red-400">{pr.nome}</p> : null; })()}
                      </div>
                      <button onClick={() => removeBlock(b.id)} className="p-1.5 text-red-300 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {blks.filter(b => b.type === 'custom_hours').map(b => (
                    <div key={b.id} className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-amber-700 text-sm">Horário especial: {b.horaInicio}–{b.horaFim}</p>
                        {b.motivo && <p className="text-xs text-amber-500 mt-0.5">{b.motivo}</p>}
                      </div>
                      <button onClick={() => removeBlock(b.id)} className="p-1.5 text-amber-300 hover:text-amber-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewAppt && profile && (
        <NewAppointmentModal
          lojaId={colId}
          profile={profile}
          filterProfId={filterProfId}
          onClose={() => setShowNewAppt(false)}
          onSaved={() => setShowNewAppt(false)}
        />
      )}
      {showBlockModal && (
        <BlockModal
          lojaId={colId}
          filterProfId={filterProfId}
          profile={profile}
          onClose={() => setShowBlockModal(false)}
          onSaved={() => setShowBlockModal(false)}
        />
      )}
    </div>
  );
}

// ── New Appointment Modal ─────────────────────────────────
function NewAppointmentModal({ lojaId, profile, filterProfId, onClose, onSaved }) {
  const [clienteWhats, setClienteWhats] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteNascimento, setClienteNascimento] = useState('');
  const [existingClient, setExistingClient] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProfId, setSelectedProfId] = useState(filterProfId || '');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('');
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
    setHora('');
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

      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaId}`), apptData);

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

      // Fire-and-forget Google Calendar sync
      fetch(`${BACKEND_URL}/createAppointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId, ...apptData }),
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
function BlockModal({ lojaId, filterProfId, profile, onClose, onSaved }) {
  const [type, setType] = useState('day_off');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState('');
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
function AdminClients({ user, lojaId, filterProfId }) {
  const [apptMap, setApptMap] = useState({});
  const [directMap, setDirectMap] = useState({});
  const [selectedClient, setSelectedClient] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newWhats, setNewWhats] = useState('');
  const [newNasc, setNewNasc] = useState('');
  const [addSaving, setAddSaving] = useState(false);
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

  // Direct clients collection
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', APP_ID, 'public', 'data', `clients_${colId}`);
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = { key: d.id, visitas: [], ...d.data() }; });
      setDirectMap(map);
    });
    return () => unsub();
  }, [user, colId]);

  const clients = useMemo(() => {
    const merged = { ...directMap };
    Object.values(apptMap).forEach(c => {
      if (merged[c.key]) {
        merged[c.key] = { ...merged[c.key], visitas: c.visitas, ultimaVisita: c.ultimaVisita };
      } else {
        merged[c.key] = c;
      }
    });
    return Object.values(merged).sort((a, b) => (b.ultimaVisita || '').localeCompare(a.ultimaVisita || ''));
  }, [apptMap, directMap]);

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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900">Clientes</h2>
          <p className="text-xs text-slate-400">{clients.length} cliente{clients.length !== 1 ? 's' : ''} registado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAddForm(v => !v)}
          className="p-2 bg-violet-600 rounded-xl text-white hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
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

      {clients.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Ainda sem clientes registados.</p>
          <button onClick={() => setShowAddForm(true)} className="mt-3 text-violet-500 text-xs font-semibold">+ Adicionar cliente</button>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map(c => (
            <button key={c.key} onClick={() => setSelectedClient(c)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 hover:shadow-md transition-shadow text-left">
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
  const [saving, setSaving] = useState(false);

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

  const addServico = async () => {
    if (!nome.trim()) return;
    await saveServicos([...servicos, { nome: nome.trim(), preco: preco ? Number(preco) : null, duracao: Number(duracao) }]);
    setNome(''); setPreco(''); setDuracao(60);
  };

  const removeServico = async (i) => {
    await saveServicos(servicos.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-900">Serviços</h2>
        <p className="text-xs text-slate-400">{servicos.length} serviço{servicos.length !== 1 ? 's' : ''} disponível{servicos.length !== 1 ? 'is' : ''}</p>
      </div>

      <div className="space-y-3 mb-5">
        {servicos.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Scissors className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900">{s.nome}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {s.preco && <span className="text-xs text-emerald-600 font-semibold">R$ {Number(s.preco).toFixed(2)}</span>}
                {s.duracao && <span className="text-xs text-slate-400">{fmtDuracao(s.duracao)}</span>}
              </div>
            </div>
            <button onClick={() => removeServico(i)} className="p-1.5 text-slate-200 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Adicionar serviço</h3>
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
        <button onClick={addServico} disabled={!nome.trim() || saving}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar
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
  const [horaInicio, setHoraInicio] = useState(profile.horaInicio || '09:00');
  const [horaFim, setHoraFim] = useState(profile.horaFim || '19:00');
  const [intervalo, setIntervalo] = useState(profile.intervalo || 30);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = `https://hute.netlify.app/#${profile.slug || ''}`;

  const saveSettings = async () => {
    setSaving(true);
    try {
      const data = { nome, subtitulo, slug, horaInicio, horaFim, intervalo: Number(intervalo) };
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', user.uid), data, { merge: true });
      if (slug !== profile.slug) {
        await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'slugs', slug), { uid: user.uid, nome });
      }
      setProfile(prev => ({ ...prev, ...data }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900">Configurações</h2>
        <p className="text-xs text-slate-400">Dados do estabelecimento</p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Informações</h3>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nome</label>
          <input value={nome} onChange={e => setNome(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Especialidade</label>
          <input value={subtitulo} onChange={e => setSubtitulo(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Slug do link</label>
          <input value={slug} onChange={e => setSlug(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
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
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Intervalo base</label>
          <select value={intervalo} onChange={e => setIntervalo(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white">
            {[15, 20, 30, 45, 60, 90, 120].map(v => (
              <option key={v} value={v}>{fmtDuracao(v)}</option>
            ))}
          </select>
        </div>
        <button onClick={saveSettings} disabled={saving}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
          {saved ? 'Guardado!' : 'Guardar alterações'}
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900 text-sm mb-3">Link de reservas</h3>
        <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
          <p className="text-xs text-slate-600 flex-1 break-all">{link}</p>
          <button onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="p-1.5 text-slate-400 hover:text-violet-600 transition-colors">
            {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900 text-sm mb-1">Google Agenda (estabelecimento)</h3>
        <p className="text-xs text-slate-400 mb-3">Sincronização geral da loja</p>
        {profile.googleCalendarConnected ? (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl text-sm font-semibold">
            <CheckCircle className="w-4 h-4" />
            Google Agenda ligado
          </div>
        ) : (
          <button onClick={startGoogleAuth}
            className="w-full py-3 bg-blue-50 text-blue-600 font-semibold rounded-xl text-sm hover:bg-blue-100 transition-colors">
            Ligar Google Agenda
          </button>
        )}
      </div>

      <button onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 border border-slate-200 text-slate-500 font-semibold rounded-2xl hover:bg-slate-100 transition-colors text-sm">
        <LogOut className="w-4 h-4" />
        Terminar sessão
      </button>
    </div>
  );
}

// ── Client Portal ─────────────────────────────────────────
function ClientPortal({ lojaUid, profile }) {
  const [step, setStep] = useState('service');
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

  const profissionals = profile.profissionals || [];
  const servicos = profile.servicos || [];

  const toDateISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const addDays = (d, n) => { const copy = new Date(d); copy.setDate(copy.getDate() + n); return copy; };

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
      setSlots(json.slots || []);
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
      };

      // Save to Firestore
      const apptRef = await addDoc(
        collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaUid}`),
        apptData
      );

      // Upsert client
      const clientKey = whats.trim().replace(/\D/g, '') || nome.trim().toLowerCase().replace(/\s+/g, '_');
      const clientDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', `clients_${lojaUid}`, clientKey);
      const existingClient = await getDoc(clientDocRef);
      const totalVisitas = existingClient.exists() ? (existingClient.data().totalVisitas || 0) + 1 : 1;
      const primeiraVisita = existingClient.exists() ? (existingClient.data().primeiraVisita || dataISO) : dataISO;
      await setDoc(clientDocRef, {
        nome: nome.trim(),
        whats: whats.trim(),
        nascimento: nascimento || '',
        totalVisitas,
        primeiraVisita,
        ultimaVisita: dataISO,
      }, { merge: true });

      setConfirmedAppt({ ...apptData, id: apptRef.id });
      setStep('confirmed');

      // Fire-and-forget Google Calendar sync
      fetch(`${BACKEND_URL}/createAppointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId: lojaUid, ...apptData }),
      }).catch(() => {});
    } catch (err) {
      alert('Erro ao confirmar marcação. Tente novamente.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = { service: 0, professional: 1, datetime: 2, form: 3, confirmed: 4 };
  const totalSteps = profissionals.length > 0 ? 4 : 3;
  const currentIdx = stepIndex[step] || 0;

  const canGoBack = step !== 'service' && step !== 'confirmed';
  const handleBack = () => {
    if (step === 'professional') setStep('service');
    else if (step === 'datetime') {
      const profs = selectedService ? profissionals.filter(p => (p.servicos || []).includes(selectedService.nome)) : profissionals;
      setStep(profs.length > 0 ? 'professional' : 'service');
    }
    else if (step === 'form') setStep('datetime');
  };

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {canGoBack && (
            <button onClick={handleBack} className="p-1.5 -ml-1 text-violet-600 hover:text-violet-800">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 truncate">{profile.nome || 'Agendamento'}</p>
            {profile.subtitulo && <p className="text-xs text-slate-400 truncate">{profile.subtitulo}</p>}
          </div>
        </div>
        {step !== 'confirmed' && (
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= currentIdx ? 'bg-violet-600' : 'bg-slate-200'}`} />
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 p-5 pb-8">
        {/* STEP: SERVICE */}
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
                    className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-violet-300 hover:shadow-md transition-all text-left flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Scissors className="w-6 h-6 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900">{s.nome}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {s.duracao && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{fmtDuracao(s.duracao)}
                          </span>
                        )}
                      </div>
                    </div>
                    {s.preco && (
                      <span className="text-sm font-black text-violet-600 flex-shrink-0">R$ {Number(s.preco).toFixed(2)}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP: PROFESSIONAL */}
        {step === 'professional' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Com quem?</h2>
            <p className="text-sm text-slate-400 mb-5">
              {selectedService ? `Profissionais para "${selectedService.nome}"` : 'Escolha o profissional'}
            </p>
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

        {/* STEP: DATETIME */}
        {step === 'datetime' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Quando?</h2>
            <p className="text-sm text-slate-400 mb-4">Escolha o dia e horário</p>

            {/* Date navigation */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
              <div className="flex items-center justify-between">
                <button onClick={() => changeDate(-1)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <p className="font-black text-slate-900">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                  <p className="text-sm text-slate-500">{selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
                </div>
                <button onClick={() => changeDate(1)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Slots */}
            {slotsLoading ? (
              <div className="text-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">A verificar disponibilidade...</p>
              </div>
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
                <button onClick={() => { if (selectedHora) goToStep('form'); }}
                  disabled={!selectedHora}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors">
                  Continuar
                </button>
              </>
            )}
          </div>
        )}

        {/* STEP: FORM */}
        {step === 'form' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Confirmar marcação</h2>
            <p className="text-sm text-slate-400 mb-4">Reveja e preencha os seus dados</p>

            {/* Summary */}
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

        {/* STEP: CONFIRMED */}
        {step === 'confirmed' && confirmedAppt && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Marcado!</h2>
            <p className="text-slate-400 text-sm mb-6">A sua marcação foi confirmada com sucesso.</p>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-left space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Serviço</span>
                <span className="text-sm font-bold text-slate-900">{confirmedAppt.servico}</span>
              </div>
              {confirmedAppt.profissionalNome && (
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Profissional</span>
                  <span className="text-sm font-bold text-slate-900">{confirmedAppt.profissionalNome}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Data</span>
                <span className="text-sm font-bold text-slate-900">{fmtData(confirmedAppt.data)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Hora</span>
                <span className="text-sm font-bold text-slate-900">{confirmedAppt.hora}</span>
              </div>
              {confirmedAppt.valor && (
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Preço</span>
                  <span className="text-sm font-bold text-violet-600">R$ {Number(confirmedAppt.valor).toFixed(2)}</span>
                </div>
              )}
            </div>

            <button onClick={() => { setStep('service'); setSelectedService(null); setSelectedProfissional(null); setSelectedHora(''); setNome(''); setWhats(''); setNascimento(''); }}
              className="w-full border border-violet-200 text-violet-600 font-bold py-3.5 rounded-2xl text-sm hover:bg-violet-50 transition-colors">
              Nova marcação
            </button>
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
        {view === 'clients' && <AdminClients user={user} lojaId={staffRecord.lojaId} filterProfId={staffRecord.profissionalId} />}
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
