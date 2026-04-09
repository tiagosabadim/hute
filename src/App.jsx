import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, setDoc, getDoc, getDocs 
} from 'firebase/firestore';
import { 
  Calendar, Users, Settings, Scissors, Plus, CheckCircle, Smartphone, Copy, Loader2
} from 'lucide-react';

// === CONFIGURAÇÃO FIREBASE ===
// Pode alterar para as suas chaves reais do ficheiro .env no futuro
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

// URL do Backend Netlify Functions (que vamos criar a seguir)
const BACKEND_URL = "/.netlify/functions";

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('agenda');
  const [isClientMode, setIsClientMode] = useState(false);
  const [resolvedLojaUid, setResolvedLojaUid] = useState(null);
  const [lojaProfile, setLojaProfile] = useState({});
  const [loading, setLoading] = useState(true);

  // === INICIALIZAÇÃO ===
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
    const handleHashChange = () => { if(user) checkRoute(user.uid); };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  const checkRoute = async (uid) => {
    setLoading(true);
    const hash = window.location.hash.replace('#', '');
    
    if (hash) {
      try {
        const slugRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'slugs', hash.toLowerCase());
        const slugSnap = await getDoc(slugRef);
        
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
    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'profiles', targetUid);
    const snap = await getDoc(docRef);
    if (snap.exists()) setLojaProfile(snap.data());
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-slate-800" /></div>;
  }

  // === RENDERIZAÇÃO MODO CLIENTE ===
  if (isClientMode) {
    return <ClientPortal lojaUid={resolvedLojaUid} profile={lojaProfile} user={user} db={db} appId={APP_ID} />;
  }

  // === RENDERIZAÇÃO MODO ADMIN ===
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
        {view === 'settings' && <AdminSettings user={user} db={db} appId={APP_ID} profile={lojaProfile} />}
      </main>

      <nav className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-slate-200 flex justify-around py-3 px-2 z-20">
        <button onClick={() => setView('agenda')} className={`flex flex-col items-center transition-colors ${view === 'agenda' ? 'text-slate-900' : 'text-slate-400'}`}>
          <Calendar className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium uppercase">Agenda</span>
        </button>
        <button onClick={() => setView('clients')} className={`flex flex-col items-center transition-colors ${view === 'clients' ? 'text-slate-900' : 'text-slate-400'}`}>
          <Users className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium uppercase">Clientes</span>
        </button>
        <button onClick={() => setView('settings')} className={`flex flex-col items-center transition-colors ${view === 'settings' ? 'text-slate-900' : 'text-slate-400'}`}>
          <Settings className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium uppercase">Estabelecimento</span>
        </button>
      </nav>
    </div>
  );
}

// === COMPONENTES SECUNDÁRIOS ===

function AdminAgenda({ user, db, appId }) {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    if(!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', `appointments_${user.uid}`);
    const unsub = onSnapshot(q, (snap) => {
      const appts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const today = new Date().toISOString().split('T')[0];
      setAppointments(appts.filter(a => a.data >= today).sort((a,b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora)));
    });
    return () => unsub();
  }, [user, db, appId]);

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Próximas Marcações</h2>
      {appointments.length === 0 ? (
        <div className="text-center text-slate-400 py-10">A sua agenda está livre.</div>
      ) : (
        <div className="space-y-3">
          {appointments.map(appt => (
            <div key={appt.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-bold mb-1">{appt.data.split('-').reverse().join('/')} às {appt.hora}</p>
                <h4 className="font-semibold text-slate-800">{appt.clienteNome}</h4>
                <p className="text-sm text-slate-500">{appt.servico}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminClients() {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Base de Clientes</h2>
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Gestão de clientes sincronizada com as marcações.</p>
      </div>
    </div>
  );
}

function gerarHorarios(inicio, fim, intervalo) {
  const slots = [];
  let [h, m] = inicio.split(':').map(Number);
  const [hf, mf] = fim.split(':').map(Number);
  while (h < hf || (h === hf && m < mf)) {
    slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    m += intervalo;
    if (m >= 60) { h += Math.floor(m/60); m = m % 60; }
  }
  return slots;
}

function AdminSettings({ user, db, appId, profile }) {
  const [nome, setNome] = useState(profile.nome || '');
  const [subtitulo, setSubtitulo] = useState(profile.subtitulo || '');
  const [slug, setSlug] = useState(profile.slug || '');
  const [horaInicio, setHoraInicio] = useState(profile.horaInicio || '09:00');
  const [horaFim, setHoraFim] = useState(profile.horaFim || '18:00');
  const [intervalo, setIntervalo] = useState(profile.intervalo || 60);

  const saveProfile = async (e) => {
    e.preventDefault();
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), { nome, subtitulo, slug: cleanSlug, horaInicio, horaFim, intervalo: Number(intervalo) }, { merge: true });
      if (cleanSlug) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'slugs', cleanSlug), { uid: user.uid, nome });
      alert('Perfil Guardado!');
      setSlug(cleanSlug);
    } catch (e) { alert('Erro ao guardar.'); }
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

      {/* Google Calendar — elemento principal da aba */}
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
              <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" /> Integração ativa — agendamentos sincronizados
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
          <input className="w-full p-3 bg-slate-50 rounded-lg outline-none border border-slate-200" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Nome do Salão" required />
          <input className="w-full p-3 bg-slate-50 rounded-lg outline-none border border-slate-200" value={subtitulo} onChange={e=>setSubtitulo(e.target.value)} placeholder="Especialidade" />
          <div className="flex">
            <span className="p-3 bg-slate-100 text-slate-400 rounded-l-lg border border-slate-200 border-r-0">/#</span>
            <input className="w-full p-3 bg-slate-50 rounded-r-lg outline-none border border-slate-200 border-l-0" value={slug} onChange={e=>setSlug(e.target.value)} placeholder="seusalao" required />
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Horário de Funcionamento</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400">Abertura</label>
                <input type="time" className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none text-sm" value={horaInicio} onChange={e=>setHoraInicio(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Fecho</label>
                <input type="time" className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none text-sm" value={horaFim} onChange={e=>setHoraFim(e.target.value)} />
              </div>
            </div>
            <div className="mt-2">
              <label className="text-xs text-slate-400">Duração de cada serviço</label>
              <select className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none text-sm mt-1" value={intervalo} onChange={e=>setIntervalo(e.target.value)}>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1h30</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white p-3 rounded-lg font-semibold">Guardar</button>
        </form>
      </div>

      {/* Link de partilha */}
      <div className="bg-emerald-50 p-5 rounded-2xl shadow-sm border border-emerald-100">
        <h3 className="font-bold text-emerald-900 mb-1">Link para Clientes</h3>
        <p className="text-xs text-emerald-700 mb-3">Partilhe este link para receber marcações online.</p>
        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/#${slug}`); alert('Copiado!'); }} className="w-full bg-emerald-600 text-white p-3 rounded-lg font-semibold flex justify-center items-center">
          <Copy className="w-5 h-5 mr-2"/> Copiar Link
        </button>
      </div>

    </div>
  );
}

function ClientPortal({ lojaUid, profile, user, db, appId }) {
  const [nome, setNome] = useState('');
  const [whats, setWhats] = useState('');
  const [hora, setHora] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmado, setConfirmado] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slotsDisponiveis, setSlotsDisponiveis] = useState(null);

  const dataIso = selectedDate.toISOString().split('T')[0];
  const today = new Date(); today.setHours(0,0,0,0);

  // Busca slots disponíveis sempre que a data muda
  useEffect(() => {
    if (!lojaUid) return;
    setLoadingSlots(true);
    setHora('');
    fetch(`${BACKEND_URL}/getSlots?lojaId=${lojaUid}&data=${dataIso}`)
      .then(r => r.json())
      .then(d => setSlotsDisponiveis(d.slots || []))
      .catch(() => setSlotsDisponiveis(gerarHorarios(profile.horaInicio || '09:00', profile.horaFim || '18:00', profile.intervalo || 60)))
      .finally(() => setLoadingSlots(false));
  }, [dataIso, lojaUid]);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    if (d >= today) setSelectedDate(d);
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if(!hora) return alert("Escolha uma hora!");
    setLoading(true);

    const payload = {
      lojaId: lojaUid,
      clienteNome: nome,
      clienteWhats: whats,
      servico: "Marcação",
      data: dataIso,
      hora: hora,
      dataHoraInternacional: new Date(`${dataIso}T${hora}:00`).toISOString(),
    };

    try {
      // 1. Guarda na Firestore (campos corretos: data, hora)
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', `appointments_${lojaUid}`), {
        ...payload, createdAt: new Date().toISOString(), origem: 'portal_cliente'
      });

      // 2. Mostra confirmação imediatamente
      setConfirmado({ hora, dataIso });

      // 3. Sincroniza Google Calendar em background (não bloqueia UI)
      fetch(`${BACKEND_URL}/createAppointment`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      }).catch(err => console.error('Google sync falhou:', err));

    } catch (e) {
      console.error(e);
      alert("Erro ao guardar agendamento. Tente novamente.");
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
          <p className="text-slate-500 text-sm mb-1">{confirmado.dataIso.split('-').reverse().join('/')} às {confirmado.hora}</p>
          <p className="text-slate-500 text-sm mb-6">{profile.nome}</p>
          <p className="text-slate-400 text-xs mb-6">O salão foi notificado e o agendamento foi registado.</p>

          <button
            onClick={() => { setConfirmado(null); setNome(''); setWhats(''); setHora(''); }}
            className="w-full text-slate-500 text-sm py-2"
          >
            Fazer nova marcação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-10 max-w-[480px] mx-auto shadow-xl">
      <div className="bg-slate-900 text-white p-8 pt-12 pb-16 rounded-b-[40px] text-center shadow-lg">
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"><Scissors className="text-white w-10 h-10" /></div>
        <h1 className="text-2xl font-bold">{profile.nome || 'A carregar...'}</h1>
        <p className="text-sm text-slate-300 mt-1">{profile.subtitulo}</p>
      </div>
      <div className="px-5 -mt-10 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
          <form onSubmit={handleBooking}>
            <input className="w-full p-3 bg-slate-50 rounded-lg mb-3 border border-slate-200 outline-none" value={nome} onChange={e=>setNome(e.target.value)} required placeholder="Seu Nome Completo" />
            <input className="w-full p-3 bg-slate-50 rounded-lg mb-4 border border-slate-200 outline-none" value={whats} onChange={e=>setWhats(e.target.value)} required placeholder="WhatsApp" type="tel" />

            <div className="flex items-center justify-between mb-3 mt-4">
              <button type="button" onClick={prevDay} disabled={dataIso === new Date().toISOString().split('T')[0]} className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30">‹</button>
              <h3 className="font-bold text-slate-800 text-sm">{dataIso.split('-').reverse().join('/')}</h3>
              <button type="button" onClick={nextDay} className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500">›</button>
            </div>
            {loadingSlots ? (
              <div className="flex justify-center py-6 mb-6"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : (
              <div className="grid grid-cols-3 gap-2 mb-6">
                {(slotsDisponiveis || []).length === 0 ? (
                  <p className="col-span-3 text-center text-slate-400 text-sm py-4">Sem disponibilidade para este dia.</p>
                ) : (slotsDisponiveis || []).map(h => (
                  <button type="button" key={h} onClick={() => setHora(h)} className={`py-2 rounded-lg border font-medium text-sm transition-colors ${hora === h ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>{h}</button>
                ))}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-md shadow-slate-900/20">{loading ? 'A processar...' : 'Confirmar Marcação'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}