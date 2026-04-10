import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore, collection, addDoc, onSnapshot, doc, setDoc, getDoc, deleteDoc
} from 'firebase/firestore';
import {
  Calendar, Users, Settings, Scissors, CheckCircle, Loader2, Copy,
  MessageCircle, Trash2, ChevronLeft, ChevronRight, Plus, X, Tag,
  Clock, Sparkles, Phone, CalendarCheck
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

// ── helpers ──────────────────────────────────────────────
function fmtData(iso) {
  if (!iso) return '';
  return iso.split('-').reverse().join('/');
}

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

// ── App ──────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('agenda');
  const [isClientMode, setIsClientMode] = useState(false);
  const [resolvedLojaUid, setResolvedLojaUid] = useState(null);
  const [lojaProfile, setLojaProfile] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('error')) {
          alert(`Erro Google Agenda: ${params.get('msg') || params.get('error')}`);
          window.history.replaceState({}, '', window.location.pathname);
        }
        if (params.get('success')) window.history.replaceState({}, '', window.location.pathname);
        await checkRoute(u.uid);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const onChange = () => { if (user) checkRoute(user.uid); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, [user]);

  const checkRoute = async (uid) => {
    setLoading(true);
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      try {
        const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'slugs', hash.toLowerCase()));
        if (snap.exists()) {
          const tid = snap.data().uid;
          setResolvedLojaUid(tid);
          await fetchProfile(tid);
          setIsClientMode(true);
        } else {
          setIsClientMode(false);
          await fetchProfile(uid);
        }
      } catch (e) { console.error(e); }
    } else {
      setIsClientMode(false);
      setResolvedLojaUid(null);
      await fetchProfile(uid);
    }
    setLoading(false);
  };

  const fetchProfile = async (uid) => {
    const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', uid));
    if (snap.exists()) setLojaProfile(snap.data());
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-slate-50">
        <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-violet-200">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
      </div>
    );
  }

  if (isClientMode) {
    return <ClientPortal lojaUid={resolvedLojaUid} profile={lojaProfile} db={db} appId={APP_ID} />;
  }

  const navItems = [
    { key: 'agenda',    icon: Calendar, label: 'Agenda' },
    { key: 'clients',   icon: Users,    label: 'Clientes' },
    { key: 'servicos',  icon: Tag,      label: 'Serviços' },
    { key: 'settings',  icon: Settings, label: 'Config' },
  ];

  return (
    <div className="max-w-[480px] mx-auto bg-slate-50 min-h-screen pb-20 shadow-2xl shadow-slate-200">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 py-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-slate-900 text-lg tracking-tight">hute</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 ml-9">{lojaProfile.nome || 'Painel de Gestão'}</p>
          </div>
          <div className="w-9 h-9 bg-violet-50 rounded-full flex items-center justify-center">
            <Scissors className="w-4 h-4 text-violet-600" />
          </div>
        </div>
      </header>

      <main className="p-5">
        {view === 'agenda'   && <AdminAgenda user={user} db={db} appId={APP_ID} />}
        {view === 'clients'  && <AdminClients user={user} db={db} appId={APP_ID} />}
        {view === 'servicos' && <AdminServicos user={user} db={db} appId={APP_ID} profile={lojaProfile} onProfileSaved={setLojaProfile} />}
        {view === 'settings' && <AdminSettings user={user} db={db} appId={APP_ID} profile={lojaProfile} onProfileSaved={setLojaProfile} />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-slate-100 flex justify-around py-2 px-1 z-20">
        {navItems.map(({ key, icon: Icon, label }) => {
          const active = view === key;
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-all ${active ? 'text-violet-600' : 'text-slate-400'}`}
            >
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
function AdminAgenda({ user, db, appId }) {
  const [appointments, setAppointments] = useState([]);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', `appointments_${user.uid}`);
    const unsub = onSnapshot(q, (snap) => {
      const today = new Date().toISOString().split('T')[0];
      const appts = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(a => a.data >= today)
        .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
      setAppointments(appts);
    });
    return () => unsub();
  }, [user]);

  const cancelar = async (id) => {
    if (!window.confirm('Cancelar este agendamento?')) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', `appointments_${user.uid}`, id))
      .catch(() => alert('Erro ao cancelar.'));
  };

  const waLink = (num, nome, data, hora, servico) => {
    const n = num.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá ${nome}! Lembrete: ${servico} em ${fmtData(data)} às ${hora}. Até breve!`);
    return `https://wa.me/${n.startsWith('55') ? n : '55' + n}?text=${msg}`;
  };

  const filtered = filterDate ? appointments.filter(a => a.data === filterDate) : appointments;
  const grouped = filtered.reduce((acc, a) => {
    (acc[a.data] = acc[a.data] || []).push(a);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900">Agenda</h2>
          <p className="text-xs text-slate-400">{filtered.length} marcação{filtered.length !== 1 ? 'ões' : ''} próxima{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="text-xs p-2 border border-slate-200 rounded-xl bg-white outline-none text-slate-600"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-400 text-sm font-medium">
            {filterDate ? 'Sem marcações neste dia.' : 'A sua agenda está livre.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([data, appts]) => (
            <div key={data}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{fmtData(data)}</p>
              </div>
              <div className="space-y-3">
                {appts.map(appt => (
                  <div key={appt.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                    <div className="flex items-stretch">
                      {/* Hora lateral */}
                      <div className="w-16 bg-violet-50 flex flex-col items-center justify-center py-4 flex-shrink-0">
                        <span className="text-sm font-black text-violet-700">{appt.hora}</span>
                        {appt.duracao && <span className="text-[9px] text-violet-400 mt-0.5">{fmtDuracao(appt.duracao)}</span>}
                      </div>
                      {/* Info */}
                      <div className="flex-1 p-4 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-900 truncate">{appt.clienteNome}</h4>
                            <p className="text-sm text-slate-500 mt-0.5">{appt.servico || 'Marcação'}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {appt.valor && (
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  R$ {Number(appt.valor).toFixed(2)}
                                </span>
                              )}
                              {appt.clienteWhats && (
                                <span className="text-xs text-slate-400">{appt.clienteWhats}</span>
                              )}
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
                        <a
                          href={waLink(appt.clienteWhats, appt.clienteNome, appt.data, appt.hora, appt.servico || 'Marcação')}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-emerald-600 font-semibold"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Contactar via WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin Clients ─────────────────────────────────────────
function AdminClients({ user, db, appId }) {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', `appointments_${user.uid}`);
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        const a = d.data();
        const key = a.clienteWhats || a.clienteNome;
        if (!key) return;
        if (!map[key]) map[key] = { nome: a.clienteNome, whats: a.clienteWhats, count: 0, ultimo: a.data };
        map[key].count++;
        if (a.data > map[key].ultimo) map[key].ultimo = a.data;
      });
      setClients(Object.values(map).sort((a, b) => b.count - a.count));
    });
    return () => unsub();
  }, [user]);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-900">Clientes</h2>
        <p className="text-xs text-slate-400">{clients.length} cliente{clients.length !== 1 ? 's' : ''} registado{clients.length !== 1 ? 's' : ''}</p>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Ainda sem clientes registados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((c, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-black text-violet-600">{c.nome?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{c.nome}</p>
                <p className="text-xs text-slate-400">{c.whats || '—'} · {c.count} marcação{c.count !== 1 ? 'ões' : ''}</p>
              </div>
              {c.whats && (
                <a
                  href={`https://wa.me/${c.whats.replace(/\D/g, '').replace(/^(?!55)/, '55')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin Serviços ────────────────────────────────────────
function AdminServicos({ user, db, appId, profile, onProfileSaved }) {
  const [servicos, setServicos] = useState(profile.servicos || []);
  const [novoNome, setNovoNome] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [novaDuracao, setNovaDuracao] = useState(60);
  const [saving, setSaving] = useState(false);

  const add = () => {
    if (!novoNome.trim()) return;
    setServicos(p => [...p, { nome: novoNome.trim(), preco: novoPreco.trim(), duracao: Number(novaDuracao) }]);
    setNovoNome(''); setNovoPreco(''); setNovaDuracao(60);
  };

  const remove = (i) => setServicos(p => p.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), { servicos }, { merge: true });
      onProfileSaved(p => ({ ...p, servicos }));
      alert('Serviços guardados!');
    } catch { alert('Erro ao guardar.'); }
    setSaving(false);
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-900">Serviços</h2>
        <p className="text-xs text-slate-400">Defina os serviços, preços e duração</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
        {servicos.length === 0 ? (
          <div className="text-center py-10">
            <Tag className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Nenhum serviço cadastrado.<br />O cliente verá "Marcação" por padrão.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {servicos.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Scissors className="w-4 h-4 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{s.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {s.preco && <span className="text-xs font-bold text-emerald-600">R$ {s.preco}</span>}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{fmtDuracao(s.duracao || 60)}
                    </span>
                  </div>
                </div>
                <button onClick={() => remove(i)} className="p-1.5 text-slate-200 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adicionar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3 mb-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adicionar serviço</p>
        <input
          className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none text-sm placeholder-slate-400 focus:border-violet-300"
          value={novoNome}
          onChange={e => setNovoNome(e.target.value)}
          placeholder="Nome (ex: Corte, Escova, Coloração)"
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <div className="flex gap-2">
          <input
            className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none text-sm placeholder-slate-400 focus:border-violet-300"
            value={novoPreco}
            onChange={e => setNovoPreco(e.target.value)}
            placeholder="Preço R$"
            type="number" min="0"
          />
          <select
            className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none text-sm text-slate-600 focus:border-violet-300"
            value={novaDuracao}
            onChange={e => setNovaDuracao(e.target.value)}
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>1 hora</option>
            <option value={90}>1h30</option>
            <option value={120}>2 horas</option>
            <option value={150}>2h30</option>
            <option value={180}>3 horas</option>
          </select>
          <button onClick={add} className="w-12 bg-violet-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-violet-700 transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-violet-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-violet-100 hover:bg-violet-700 transition-colors disabled:opacity-50"
      >
        {saving ? 'A guardar...' : 'Guardar Serviços'}
      </button>
    </div>
  );
}

// ── Admin Settings ────────────────────────────────────────
function AdminSettings({ user, db, appId, profile, onProfileSaved }) {
  const [nome, setNome] = useState(profile.nome || '');
  const [subtitulo, setSubtitulo] = useState(profile.subtitulo || '');
  const [slug, setSlug] = useState(profile.slug || '');
  const [horaInicio, setHoraInicio] = useState(profile.horaInicio || '09:00');
  const [horaFim, setHoraFim] = useState(profile.horaFim || '18:00');
  const [intervalo, setIntervalo] = useState(profile.intervalo || 60);
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    try {
      const data = { nome, subtitulo, slug: cleanSlug, horaInicio, horaFim, intervalo: Number(intervalo) };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), data, { merge: true });
      if (cleanSlug) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'slugs', cleanSlug), { uid: user.uid, nome });
      onProfileSaved(p => ({ ...p, ...data }));
      setSlug(cleanSlug);
      alert('Perfil guardado!');
    } catch { alert('Erro ao guardar.'); }
    setSaving(false);
  };

  const loginGoogle = () => {
    const params = new URLSearchParams({
      client_id: '524847309009-4a5hi7e81jl18s0ihmoadgep9roa3rfk.apps.googleusercontent.com',
      redirect_uri: 'https://hute.netlify.app/.netlify/functions/googleAuthCallback',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state: user.uid,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const desligarGoogle = async () => {
    if (!window.confirm('Desligar o Google Agenda?')) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), { googleCalendarConnected: false }, { merge: true })
      .catch(() => alert('Erro ao desligar.'));
  };

  const input = "w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none text-sm placeholder-slate-400 focus:border-violet-300";

  return (
    <div className="space-y-5">
      <div className="mb-1">
        <h2 className="text-xl font-black text-slate-900">Estabelecimento</h2>
        <p className="text-xs text-slate-400">Configurações do seu perfil</p>
      </div>

      {/* Google Calendar */}
      <div className={`rounded-2xl border p-5 ${profile.googleCalendarConnected ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profile.googleCalendarConnected ? 'bg-emerald-500' : 'bg-slate-100'}`}>
              <Calendar className={`w-4 h-4 ${profile.googleCalendarConnected ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <span className="font-bold text-slate-900 text-sm">Google Agenda</span>
          </div>
          {profile.googleCalendarConnected && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full uppercase tracking-wide">Ativo</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {profile.googleCalendarConnected
            ? 'Agendamentos sincronizados automaticamente com o seu Google Agenda.'
            : 'Ligue para sincronizar marcações com o seu Google Agenda e mostrar apenas horários livres.'}
        </p>
        {profile.googleCalendarConnected ? (
          <>
            <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl text-sm flex items-center font-semibold mb-2">
              <CheckCircle className="w-4 h-4 mr-2" /> Integração ativa
            </div>
            <button onClick={desligarGoogle} className="w-full text-red-400 text-sm py-2 font-medium">Desligar integração</button>
          </>
        ) : (
          <button onClick={loginGoogle} className="w-full bg-slate-900 text-white p-3 rounded-xl font-semibold text-sm flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors">
            <Calendar className="w-4 h-4" /> Ligar Google Agenda
          </button>
        )}
      </div>

      {/* Dados */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Dados do Estabelecimento</p>
        <form onSubmit={save} className="space-y-3">
          <input className={input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do Salão" required />
          <input className={input} value={subtitulo} onChange={e => setSubtitulo(e.target.value)} placeholder="Especialidade (ex: Cabeleireiro)" />
          <div className="flex">
            <span className="px-3 py-3 bg-slate-100 text-slate-400 text-sm rounded-l-xl border border-slate-200 border-r-0">/#</span>
            <input className="flex-1 p-3 bg-slate-50 rounded-r-xl border border-slate-200 outline-none text-sm focus:border-violet-300" value={slug} onChange={e => setSlug(e.target.value)} placeholder="seusalao" required />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Horário de Funcionamento</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Abertura</label>
                <input type="time" className={input} value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Fecho</label>
                <input type="time" className={input} value={horaFim} onChange={e => setHoraFim(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Intervalo base entre slots</label>
              <select className={input} value={intervalo} onChange={e => setIntervalo(e.target.value)}>
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1h30</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-violet-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-violet-100 hover:bg-violet-700 transition-colors disabled:opacity-50">
            {saving ? 'A guardar...' : 'Guardar'}
          </button>
        </form>
      </div>

      {/* Link */}
      {slug && (
        <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-5 text-white">
          <p className="font-bold mb-0.5">Link para Clientes</p>
          <p className="text-xs text-violet-200 mb-4 font-mono break-all">{window.location.origin}/#<strong>{slug}</strong></p>
          <button
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/#${slug}`); alert('Copiado!'); }}
            className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-xl font-semibold flex justify-center items-center gap-2 transition-colors"
          >
            <Copy className="w-4 h-4" /> Copiar Link
          </button>
        </div>
      )}
    </div>
  );
}

// ── Client Portal ─────────────────────────────────────────
function ClientPortal({ lojaUid, profile, db, appId }) {
  const [nome, setNome] = useState('');
  const [whats, setWhats] = useState('');
  const [hora, setHora] = useState('');
  const [servico, setServico] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmado, setConfirmado] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState(null);

  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
  const dataIso = selectedDate.toISOString().split('T')[0];
  const servicos = profile.servicos || [];
  const servicoAtivo = servicos.find(s => s.nome === servico) || servicos[0] || null;
  const duracaoAtiva = servicoAtivo?.duracao || profile.intervalo || 60;

  const fetchSlots = (date, dur) => {
    if (!lojaUid) return;
    const iso = date.toISOString().split('T')[0];
    setLoadingSlots(true); setHora('');
    fetch(`${BACKEND_URL}/getSlots?lojaId=${lojaUid}&data=${iso}&duracao=${dur || duracaoAtiva}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots || []))
      .catch(() => setSlots(gerarHorarios(profile.horaInicio || '09:00', profile.horaFim || '18:00', profile.intervalo || 60)))
      .finally(() => setLoadingSlots(false));
  };

  useEffect(() => { if (lojaUid) fetchSlots(selectedDate, duracaoAtiva); }, [lojaUid, dataIso, duracaoAtiva]);

  const prevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); if (d >= todayDate) setSelectedDate(d); };
  const nextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); };

  const book = async (e) => {
    e.preventDefault();
    if (!hora) { alert('Escolha uma hora!'); return; }
    setLoading(true);
    const payload = {
      lojaId: lojaUid, clienteNome: nome, clienteWhats: whats,
      servico: servicoAtivo?.nome || 'Marcação',
      valor: servicoAtivo?.preco || '',
      duracao: duracaoAtiva,
      data: dataIso, hora,
      dataHoraInternacional: new Date(`${dataIso}T${hora}:00`).toISOString(),
    };
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', `appointments_${lojaUid}`), {
        ...payload, createdAt: new Date().toISOString(), origem: 'portal_cliente'
      });
      setConfirmado({ hora, dataIso, servico: payload.servico, valor: payload.valor });
      setSlots(p => (p || []).filter(s => s !== hora));
      fetch(`${BACKEND_URL}/createAppointment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .catch(console.error);
    } catch (err) { console.error(err); alert('Erro ao guardar. Tente novamente.'); }
    setLoading(false);
  };

  // ── Confirmação ──
  if (confirmado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-50 flex items-center justify-center px-5 max-w-[480px] mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-100 p-8 text-center w-full border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1">Confirmado!</h2>
          <p className="text-violet-600 font-bold mb-4">{confirmado.servico}</p>
          <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CalendarCheck className="w-4 h-4 text-slate-400" />
              <span>{fmtData(confirmado.dataIso)} às {confirmado.hora}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Scissors className="w-4 h-4 text-slate-400" />
              <span>{profile.nome}</span>
            </div>
            {confirmado.valor && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold">
                <span>R$ {Number(confirmado.valor).toFixed(2)}</span>
              </div>
            )}
          </div>
          <p className="text-slate-400 text-xs mb-6">O salão foi notificado. Aguarde a confirmação!</p>
          <button
            onClick={() => { setConfirmado(null); setNome(''); setWhats(''); setHora(''); setServico(''); }}
            className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold hover:bg-violet-700 transition-colors"
          >
            Nova marcação
          </button>
        </div>
      </div>
    );
  }

  // ── Formulário ──
  return (
    <div className="min-h-screen bg-slate-50 max-w-[480px] mx-auto">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white px-6 pt-14 pb-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 30% 50%, #7c3aed 0%, transparent 60%), radial-gradient(circle at 80% 20%, #4f46e5 0%, transparent 50%)'}} />
        <div className="relative z-10">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Scissors className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black">{profile.nome || 'Carregando...'}</h1>
          {profile.subtitulo && <p className="text-sm text-slate-300 mt-1">{profile.subtitulo}</p>}
          <div className="flex items-center justify-center gap-1 mt-3">
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span className="text-[11px] text-violet-300 font-medium">powered by hute</span>
          </div>
        </div>
      </div>

      {/* Card principal */}
      <div className="px-4 -mt-10 relative z-10 pb-10">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <form onSubmit={book} className="p-5 space-y-5">

            {/* Dados pessoais */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seus dados</p>
              <div className="relative">
                <Users className="absolute left-3 top-3.5 w-4 h-4 text-slate-300" />
                <input
                  className="w-full pl-9 pr-3 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none text-sm placeholder-slate-400 focus:border-violet-300"
                  value={nome} onChange={e => setNome(e.target.value)} required placeholder="Nome completo"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-300" />
                <input
                  className="w-full pl-9 pr-3 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none text-sm placeholder-slate-400 focus:border-violet-300"
                  value={whats} onChange={e => setWhats(e.target.value)} required placeholder="WhatsApp (ex: 11999999999)" type="tel"
                />
              </div>
            </div>

            {/* Serviços */}
            {servicos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Serviço</p>
                <div className="space-y-2">
                  {servicos.map((s, i) => {
                    const ativo = (servico || servicos[0]?.nome) === s.nome;
                    return (
                      <button
                        key={i} type="button" onClick={() => setServico(s.nome)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
                          ativo ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-100' : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Scissors className={`w-4 h-4 ${ativo ? 'text-violet-200' : 'text-slate-300'}`} />
                          <span>{s.nome}</span>
                          <span className={`text-xs ${ativo ? 'text-violet-200' : 'text-slate-400'}`}>{fmtDuracao(s.duracao)}</span>
                        </div>
                        {s.preco && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ativo ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                            R$ {s.preco}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data</p>
              <div className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-200 p-1">
                <button type="button" onClick={prevDay} disabled={dataIso === new Date().toISOString().split('T')[0]}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 disabled:opacity-30 hover:bg-slate-100 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <span className="font-bold text-slate-900 text-sm">{fmtData(dataIso)}</span>
                  <p className="text-[10px] text-slate-400">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                </div>
                <button type="button" onClick={nextDay}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horários */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Horário disponível</p>
              {loadingSlots ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                </div>
              ) : (slots || []).length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                  <Clock className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Sem disponibilidade neste dia.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(slots || []).map(h => (
                    <button
                      key={h} type="button" onClick={() => setHora(h)}
                      className={`py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                        hora === h
                          ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-100'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-violet-200'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit" disabled={loading || !hora}
              className="w-full bg-violet-600 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-violet-200 hover:bg-violet-700 transition-colors disabled:opacity-40"
            >
              {loading ? 'A processar...' : 'Confirmar Marcação'}
            </button>
          </form>
        </div>

        {/* Rodapé branding */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <div className="w-4 h-4 bg-violet-600 rounded flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="text-xs text-slate-400">hute · sua secretária inteligente</span>
        </div>
      </div>
    </div>
  );
}
