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
  MessageCircle, Trash2, ChevronLeft, ChevronRight, Plus, X, Tag
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

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('agenda');
  const [isClientMode, setIsClientMode] = useState(false);
  const [resolvedLojaUid, setResolvedLojaUid] = useState(null);
  const [lojaProfile, setLojaProfile] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (e) { console.error(e); }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('error')) {
          alert(`Erro ao ligar Google Agenda: ${params.get('msg') || params.get('error')}`);
          window.history.replaceState({}, '', window.location.pathname);
        }
        if (params.get('success')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        await checkRoute(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleHashChange = () => { if (user) checkRoute(user.uid); };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  const checkRoute = async (uid) => {
    setLoading(true);
    const hash = window.location.hash.replace('#', '');

    if (hash) {
      try {
        const slugSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'slugs', hash.toLowerCase()));
        if (slugSnap.exists()) {
          const targetUid = slugSnap.data().uid;
          setResolvedLojaUid(targetUid);
          await fetchLojaProfile(targetUid);
          setIsClientMode(true);
        } else {
          setIsClientMode(false);
          await fetchLojaProfile(uid);
        }
      } catch (e) { console.error(e); }
    } else {
      setIsClientMode(false);
      setResolvedLojaUid(null);
      await fetchLojaProfile(uid);
    }
    setLoading(false);
  };

  const fetchLojaProfile = async (targetUid) => {
    const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', targetUid));
    if (snap.exists()) setLojaProfile(snap.data());
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
      </div>
    );
  }

  if (isClientMode) {
    return <ClientPortal lojaUid={resolvedLojaUid} profile={lojaProfile} user={user} db={db} appId={APP_ID} />;
  }

  return (
    <div className="max-w-[480px] mx-auto bg-slate-50 min-h-screen pb-20 shadow-xl">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-10 rounded-b-2xl shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{lojaProfile.nome || 'Hutex SaaS'}</h1>
            <p className="text-xs text-slate-400">{lojaProfile.subtitulo || 'Painel de Gestão'}</p>
          </div>
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
            <Scissors className="text-white w-5 h-5" />
          </div>
        </div>
      </header>

      <main className="p-5">
        {view === 'agenda' && <AdminAgenda user={user} db={db} appId={APP_ID} />}
        {view === 'clients' && <AdminClients user={user} db={db} appId={APP_ID} />}
        {view === 'servicos' && (
          <AdminServicos user={user} db={db} appId={APP_ID} profile={lojaProfile} onProfileSaved={setLojaProfile} />
        )}
        {view === 'settings' && (
          <AdminSettings user={user} db={db} appId={APP_ID} profile={lojaProfile} onProfileSaved={setLojaProfile} />
        )}
      </main>

      <nav className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-slate-200 flex justify-around py-3 px-2 z-20">
        <button onClick={() => setView('agenda')} className={`flex flex-col items-center transition-colors ${view === 'agenda' ? 'text-slate-900' : 'text-slate-400'}`}>
          <Calendar className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium uppercase">Agenda</span>
        </button>
        <button onClick={() => setView('clients')} className={`flex flex-col items-center transition-colors ${view === 'clients' ? 'text-slate-900' : 'text-slate-400'}`}>
          <Users className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium uppercase">Clientes</span>
        </button>
        <button onClick={() => setView('servicos')} className={`flex flex-col items-center transition-colors ${view === 'servicos' ? 'text-slate-900' : 'text-slate-400'}`}>
          <Tag className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium uppercase">Serviços</span>
        </button>
        <button onClick={() => setView('settings')} className={`flex flex-col items-center transition-colors ${view === 'settings' ? 'text-slate-900' : 'text-slate-400'}`}>
          <Settings className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium uppercase">Estabelecimento</span>
        </button>
      </nav>
    </div>
  );
}

// ===================== ADMIN AGENDA =====================

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
  }, [user, db, appId]);

  const cancelAppointment = async (id) => {
    if (!window.confirm('Cancelar este agendamento?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', `appointments_${user.uid}`, id));
    } catch (e) { alert('Erro ao cancelar.'); }
  };

  const whatsappLink = (numero, nome, data, hora, servico) => {
    const num = numero.replace(/\D/g, '');
    const dataFmt = data ? data.split('-').reverse().join('/') : '';
    const msg = encodeURIComponent(`Olá ${nome}! Lembrete do seu agendamento: ${servico} no dia ${dataFmt} às ${hora}. Até breve!`);
    return `https://wa.me/${num.startsWith('55') ? num : '55' + num}?text=${msg}`;
  };

  const filtered = filterDate
    ? appointments.filter(a => a.data === filterDate)
    : appointments;

  // Group by date
  const grouped = filtered.reduce((acc, a) => {
    if (!acc[a.data]) acc[a.data] = [];
    acc[a.data].push(a);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Próximas Marcações</h2>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="text-xs p-1.5 border border-slate-200 rounded-lg bg-white outline-none"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-10">
          {filterDate ? 'Sem marcações neste dia.' : 'A sua agenda está livre.'}
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([data, appts]) => (
            <div key={data}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                {data.split('-').reverse().join('/')}
              </p>
              <div className="space-y-3">
                {appts.map(appt => (
                  <div key={appt.id} className="bg-white rounded-xl shadow-sm border-l-4 border-slate-800 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-400">{appt.hora}</span>
                            {appt.valor && (
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                R$ {Number(appt.valor).toFixed(2)}
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-slate-800 truncate">{appt.clienteNome}</h4>
                          <p className="text-sm text-slate-500 mt-0.5">{appt.servico || 'Marcação'}</p>
                          {appt.clienteWhats && (
                            <p className="text-xs text-slate-400 mt-1">{appt.clienteWhats}</p>
                          )}
                        </div>
                        <button
                          onClick={() => cancelAppointment(appt.id)}
                          className="ml-2 p-1.5 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {appt.clienteWhats && (
                      <div className="border-t border-slate-50 px-4 py-2">
                        <a
                          href={whatsappLink(appt.clienteWhats, appt.clienteNome, appt.data, appt.hora, appt.servico || 'Marcação')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-green-600 font-medium"
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

// ===================== ADMIN CLIENTS =====================

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
        if (!map[key]) {
          map[key] = { nome: a.clienteNome, whats: a.clienteWhats, count: 0, ultimo: a.data };
        }
        map[key].count++;
        if (a.data > map[key].ultimo) map[key].ultimo = a.data;
      });
      setClients(Object.values(map).sort((a, b) => b.count - a.count));
    });
    return () => unsub();
  }, [user, db, appId]);

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Base de Clientes</h2>
      {clients.length === 0 ? (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Ainda sem clientes registados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((c, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">{c.nome}</p>
                <p className="text-xs text-slate-400">{c.whats || 'Sem WhatsApp'}</p>
                <p className="text-xs text-slate-400">{c.count} marcação{c.count !== 1 ? 'ões' : ''}</p>
              </div>
              {c.whats && (
                <a
                  href={`https://wa.me/${c.whats.replace(/\D/g, '').replace(/^(?!55)/, '55')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-green-50 text-green-600 rounded-lg"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== ADMIN SETTINGS =====================

function gerarHorarios(inicio, fim, intervalo) {
  const slots = [];
  let [h, m] = inicio.split(':').map(Number);
  const [hf, mf] = fim.split(':').map(Number);
  while (h < hf || (h === hf && m < mf)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += Number(intervalo);
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
}

function AdminServicos({ user, db, appId, profile, onProfileSaved }) {
  const [servicos, setServicos] = useState(profile.servicos || []);
  const [novoServico, setNovoServico] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [saving, setSaving] = useState(false);

  const addServico = () => {
    if (!novoServico.trim()) return;
    setServicos(prev => [...prev, { nome: novoServico.trim(), preco: novoPreco.trim() }]);
    setNovoServico('');
    setNovoPreco('');
  };

  const removeServico = (idx) => {
    setServicos(prev => prev.filter((_, i) => i !== idx));
  };

  const saveServicos = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), { servicos }, { merge: true });
      onProfileSaved(prev => ({ ...prev, servicos }));
      alert('Serviços guardados!');
    } catch (e) { alert('Erro ao guardar.'); }
    setSaving(false);
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Serviços & Preços</h2>
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="space-y-2">
          {servicos.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">
              Nenhum serviço cadastrado.<br />O cliente verá "Marcação" por padrão.
            </p>
          )}
          {servicos.map((s, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-3">
              <div>
                <span className="text-sm font-medium text-slate-800">{s.nome}</span>
                {s.preco && <span className="text-xs text-green-600 ml-2 font-semibold">R$ {s.preco}</span>}
              </div>
              <button onClick={() => removeServico(i)} className="text-slate-300 hover:text-red-400 transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Adicionar serviço</p>
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 p-2.5 bg-slate-50 rounded-lg border border-slate-200 outline-none text-sm"
              value={novoServico}
              onChange={e => setNovoServico(e.target.value)}
              placeholder="Nome do serviço"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addServico())}
            />
            <input
              className="w-28 p-2.5 bg-slate-50 rounded-lg border border-slate-200 outline-none text-sm"
              value={novoPreco}
              onChange={e => setNovoPreco(e.target.value)}
              placeholder="Preço R$"
              type="number"
              min="0"
            />
            <button onClick={addServico} className="bg-slate-800 text-white px-3 rounded-lg flex-shrink-0">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={saveServicos}
            disabled={saving}
            className="w-full bg-slate-900 text-white p-3 rounded-lg font-semibold disabled:opacity-60"
          >
            {saving ? 'A guardar...' : 'Guardar Serviços'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminSettings({ user, db, appId, profile, onProfileSaved }) {
  const [nome, setNome] = useState(profile.nome || '');
  const [subtitulo, setSubtitulo] = useState(profile.subtitulo || '');
  const [slug, setSlug] = useState(profile.slug || '');
  const [horaInicio, setHoraInicio] = useState(profile.horaInicio || '09:00');
  const [horaFim, setHoraFim] = useState(profile.horaFim || '18:00');
  const [intervalo, setIntervalo] = useState(profile.intervalo || 60);
  const [saving, setSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    try {
      const data = { nome, subtitulo, slug: cleanSlug, horaInicio, horaFim, intervalo: Number(intervalo) };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), data, { merge: true });
      if (cleanSlug) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'slugs', cleanSlug), { uid: user.uid, nome });
      }
      onProfileSaved(prev => ({ ...prev, ...data }));
      setSlug(cleanSlug);
      alert('Perfil guardado!');
    } catch (e) { alert('Erro ao guardar.'); }
    setSaving(false);
  };

  const loginGoogle = () => {
    const GOOGLE_CLIENT_ID = '524847309009-4a5hi7e81jl18s0ihmoadgep9roa3rfk.apps.googleusercontent.com';
    const redirectUri = 'https://hute.netlify.app/.netlify/functions/googleAuthCallback';
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state: user.uid,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const desligarGoogle = async () => {
    if (!window.confirm('Desligar o Google Agenda?')) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), { googleCalendarConnected: false }, { merge: true });
      alert('Google Agenda desligado.');
    } catch (e) { alert('Erro ao desligar.'); }
  };

  return (
    <div className="space-y-6">

      {/* Google Calendar */}
      <div className={`p-5 rounded-2xl shadow-sm border ${profile.googleCalendarConnected ? 'bg-green-50 border-green-200' : 'bg-white border-blue-100'}`}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-800">Google Agenda</h3>
          {profile.googleCalendarConnected && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-green-600 bg-green-100 px-2 py-1 rounded-full">Ativo</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {profile.googleCalendarConnected
            ? 'Os agendamentos dos clientes são sincronizados automaticamente.'
            : 'Ligue para sincronizar agendamentos automaticamente na sua agenda.'}
        </p>
        {profile.googleCalendarConnected ? (
          <div className="space-y-2">
            <div className="bg-green-100 text-green-800 p-3 rounded-lg text-sm flex items-center font-semibold">
              <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" /> Integração ativa
            </div>
            <button onClick={desligarGoogle} className="w-full text-red-500 text-sm py-2 font-medium">
              Desligar integração
            </button>
          </div>
        ) : (
          <button onClick={loginGoogle} className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold flex justify-center items-center">
            <Calendar className="w-5 h-5 mr-2" /> Ligar Google Agenda
          </button>
        )}
      </div>

      {/* Dados do estabelecimento */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4">Dados do Estabelecimento</h3>
        <form onSubmit={saveProfile} className="space-y-3">
          <input className="w-full p-3 bg-slate-50 rounded-lg outline-none border border-slate-200" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do Salão" required />
          <input className="w-full p-3 bg-slate-50 rounded-lg outline-none border border-slate-200" value={subtitulo} onChange={e => setSubtitulo(e.target.value)} placeholder="Especialidade" />
          <div className="flex">
            <span className="p-3 bg-slate-100 text-slate-400 rounded-l-lg border border-slate-200 border-r-0">/#</span>
            <input className="w-full p-3 bg-slate-50 rounded-r-lg outline-none border border-slate-200 border-l-0" value={slug} onChange={e => setSlug(e.target.value)} placeholder="seusalao" required />
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Horário de Funcionamento</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400">Abertura</label>
                <input type="time" className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none text-sm" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Fecho</label>
                <input type="time" className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none text-sm" value={horaFim} onChange={e => setHoraFim(e.target.value)} />
              </div>
            </div>
            <div className="mt-2">
              <label className="text-xs text-slate-400">Duração de cada serviço</label>
              <select className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none text-sm mt-1" value={intervalo} onChange={e => setIntervalo(e.target.value)}>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1h30</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-slate-900 text-white p-3 rounded-lg font-semibold disabled:opacity-60">
            {saving ? 'A guardar...' : 'Guardar'}
          </button>
        </form>
      </div>

      {/* Link de partilha */}
      {slug && (
        <div className="bg-emerald-50 p-5 rounded-2xl shadow-sm border border-emerald-100">
          <h3 className="font-bold text-emerald-900 mb-1">Link para Clientes</h3>
          <p className="text-xs text-emerald-700 mb-1 font-mono">{window.location.origin}/#<strong>{slug}</strong></p>
          <button
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/#${slug}`); alert('Copiado!'); }}
            className="w-full bg-emerald-600 text-white p-3 rounded-lg font-semibold flex justify-center items-center mt-2"
          >
            <Copy className="w-5 h-5 mr-2" /> Copiar Link
          </button>
        </div>
      )}
    </div>
  );
}

// ===================== CLIENT PORTAL =====================

function ClientPortal({ lojaUid, profile, user, db, appId }) {
  const [nome, setNome] = useState('');
  const [whats, setWhats] = useState('');
  const [hora, setHora] = useState('');
  const [servico, setServico] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmado, setConfirmado] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slotsDisponiveis, setSlotsDisponiveis] = useState(null);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const dataIso = selectedDate.toISOString().split('T')[0];
  const servicos = profile.servicos || [];

  const fetchSlots = (date) => {
    if (!lojaUid) return;
    const iso = date.toISOString().split('T')[0];
    setLoadingSlots(true);
    setHora('');
    fetch(`${BACKEND_URL}/getSlots?lojaId=${lojaUid}&data=${iso}`)
      .then(r => r.json())
      .then(d => setSlotsDisponiveis(d.slots || []))
      .catch(() => setSlotsDisponiveis(
        gerarHorarios(profile.horaInicio || '09:00', profile.horaFim || '18:00', profile.intervalo || 60)
      ))
      .finally(() => setLoadingSlots(false));
  };

  useEffect(() => {
    fetchSlots(selectedDate);
  }, [lojaUid]);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    if (d >= todayDate) { setSelectedDate(d); fetchSlots(d); }
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
    fetchSlots(d);
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!hora) { alert('Escolha uma hora!'); return; }
    setLoading(true);

    const servicoSelecionado = servico || (servicos.length > 0 ? servicos[0].nome : 'Marcação');
    const servicoObj = servicos.find(s => s.nome === servicoSelecionado);
    const valor = servicoObj?.preco || '';

    const payload = {
      lojaId: lojaUid,
      clienteNome: nome,
      clienteWhats: whats,
      servico: servicoSelecionado,
      valor,
      data: dataIso,
      hora,
      dataHoraInternacional: new Date(`${dataIso}T${hora}:00`).toISOString(),
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', `appointments_${lojaUid}`), {
        ...payload, createdAt: new Date().toISOString(), origem: 'portal_cliente'
      });

      setConfirmado({ hora, dataIso, servico: servicoSelecionado });

      // Remove booked slot from UI immediately
      setSlotsDisponiveis(prev => (prev || []).filter(s => s !== hora));

      // Sync Google Calendar in background
      fetch(`${BACKEND_URL}/createAppointment`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      }).catch(err => console.error('Google sync falhou:', err));

    } catch (err) {
      console.error(err);
      alert('Erro ao guardar agendamento. Tente novamente.');
    }
    setLoading(false);
  };

  if (confirmado) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-5 max-w-[480px] mx-auto shadow-xl">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Marcação Confirmada!</h2>
          <p className="text-slate-600 font-medium mb-1">{confirmado.servico}</p>
          <p className="text-slate-500 text-sm mb-1">{confirmado.dataIso.split('-').reverse().join('/')} às {confirmado.hora}</p>
          <p className="text-slate-500 text-sm mb-6">{profile.nome}</p>
          <p className="text-slate-400 text-xs mb-6">O salão foi notificado. Aguarde a confirmação!</p>
          <button
            onClick={() => { setConfirmado(null); setNome(''); setWhats(''); setHora(''); setServico(''); }}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold"
          >
            Fazer nova marcação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 max-w-[480px] mx-auto shadow-xl">
      {/* Header */}
      <div className="bg-slate-900 text-white p-8 pt-12 pb-16 rounded-b-[40px] text-center shadow-lg">
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <Scissors className="text-white w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold">{profile.nome || 'A carregar...'}</h1>
        <p className="text-sm text-slate-300 mt-1">{profile.subtitulo}</p>
      </div>

      {/* Booking form */}
      <div className="px-5 -mt-10 relative z-10 pb-10">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
          <form onSubmit={handleBooking} className="space-y-3">
            <input
              className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 outline-none"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              placeholder="Seu Nome Completo"
            />
            <input
              className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 outline-none"
              value={whats}
              onChange={e => setWhats(e.target.value)}
              required
              placeholder="WhatsApp (ex: 11999999999)"
              type="tel"
            />

            {/* Serviço */}
            {servicos.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Serviço</label>
                <div className="grid grid-cols-1 gap-2">
                  {servicos.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setServico(s.nome)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-sm font-medium transition-colors ${
                        (servico || servicos[0]?.nome) === s.nome
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      <span>{s.nome}</span>
                      {s.preco && <span className={`text-xs font-bold ${(servico || servicos[0]?.nome) === s.nome ? 'text-slate-300' : 'text-green-600'}`}>R$ {s.preco}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date navigation */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Data</label>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevDay}
                  disabled={dataIso === new Date().toISOString().split('T')[0]}
                  className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-slate-800 text-sm">{dataIso.split('-').reverse().join('/')}</span>
                <button
                  type="button"
                  onClick={nextDay}
                  className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Time slots */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Horário</label>
              {loadingSlots ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(slotsDisponiveis || []).length === 0 ? (
                    <p className="col-span-3 text-center text-slate-400 text-sm py-4">Sem disponibilidade para este dia.</p>
                  ) : (
                    (slotsDisponiveis || []).map(h => (
                      <button
                        type="button"
                        key={h}
                        onClick={() => setHora(h)}
                        className={`py-2 rounded-lg border font-medium text-sm transition-colors ${
                          hora === h
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {h}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !hora}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-md shadow-slate-900/20 disabled:opacity-50"
            >
              {loading ? 'A processar...' : 'Confirmar Marcação'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
