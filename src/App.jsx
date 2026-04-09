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
      if (currentUser) await checkRoute(currentUser.uid);
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
          <Settings className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium uppercase">Sistema</span>
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

function AdminSettings({ user, db, appId, profile }) {
  const [nome, setNome] = useState(profile.nome || '');
  const [subtitulo, setSubtitulo] = useState(profile.subtitulo || '');
  const [slug, setSlug] = useState(profile.slug || '');

  const saveProfile = async (e) => {
    e.preventDefault();
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), { nome, subtitulo, slug: cleanSlug }, { merge: true });
      if (cleanSlug) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'slugs', cleanSlug), { uid: user.uid, nome });
      alert('Perfil Guardado!');
      setSlug(cleanSlug);
    } catch (e) { alert('Erro ao guardar.'); }
  };

  const loginGoogle = () => {
    window.location.href = `${BACKEND_URL}/googleAuthCallback?login=true&uid=${user.uid}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4">A Sua Marca</h3>
        <form onSubmit={saveProfile} className="space-y-3">
          <input className="w-full p-3 bg-slate-50 rounded-lg outline-none border border-slate-200" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Nome do Salão" required />
          <input className="w-full p-3 bg-slate-50 rounded-lg outline-none border border-slate-200" value={subtitulo} onChange={e=>setSubtitulo(e.target.value)} placeholder="Especialidade" />
          <div className="flex">
            <span className="p-3 bg-slate-100 text-slate-400 rounded-l-lg border border-slate-200 border-r-0">/#</span>
            <input className="w-full p-3 bg-slate-50 rounded-r-lg outline-none border border-slate-200 border-l-0" value={slug} onChange={e=>setSlug(e.target.value)} placeholder="seusalao" required />
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white p-3 rounded-lg font-semibold">Atualizar Perfil</button>
        </form>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100">
        <h3 className="font-bold text-slate-800 mb-1">Google Agenda</h3>
        <p className="text-xs text-slate-500 mb-4">Sincronização em tempo real.</p>
        {profile.googleCalendarConnected ? (
           <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-center font-semibold"><CheckCircle className="w-5 h-5 mr-2" /> Agenda Ativa</div>
        ) : (
          <button onClick={loginGoogle} className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold flex justify-center items-center"><Calendar className="w-5 h-5 mr-2" /> Ligar Google</button>
        )}
      </div>
      
      <div className="bg-emerald-50 p-5 rounded-2xl shadow-sm border border-emerald-100">
         <h3 className="font-bold text-emerald-900 mb-1">Link para Clientes</h3>
         <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/#${slug}`); alert('Copiado!'); }} className="w-full bg-emerald-600 text-white p-3 rounded-lg font-semibold mt-2 flex justify-center items-center"><Copy className="w-5 h-5 mr-2"/> Copiar Link</button>
      </div>
    </div>
  );
}

function ClientPortal({ lojaUid, profile, user, db, appId }) {
  const [nome, setNome] = useState('');
  const [whats, setWhats] = useState('');
  const [hora, setHora] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmado, setConfirmado] = useState(null); // { hora, dataIso, calendarUrl }
  const dataIso = new Date().toISOString().split('T')[0];

  const buildGoogleCalendarUrl = (nomeCliente, nomeServico, dataStr, horaStr) => {
    const inicio = new Date(`${dataStr}T${horaStr}:00`);
    const fim = new Date(inicio.getTime() + 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${nomeServico} - ${profile.nome || 'Salão'}`,
      dates: `${fmt(inicio)}/${fmt(fim)}`,
      details: `Marcação para ${nomeCliente}\nWhatsApp: ${whats}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
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
      dataStr: dataIso,
      horaStr: hora,
      dataHoraInternacional: new Date(`${dataIso}T${hora}:00`).toISOString(),
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', `appointments_${lojaUid}`), {
         ...payload, createdAt: new Date().toISOString(), origem: 'portal_cliente'
      });

      await fetch(`${BACKEND_URL}/createAppointment`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });

      setConfirmado({
        hora,
        dataIso,
        calendarUrl: buildGoogleCalendarUrl(nome, "Marcação", dataIso, hora),
      });
    } catch (e) {
      console.error(e);
      alert("Erro ao processar agendamento.");
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

          <a
            href={confirmado.calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center mb-3"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Adicionar ao Google Agenda
          </a>

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

            <h3 className="font-bold text-slate-800 mb-3 mt-4 text-sm">Escolha a Hora (Hoje, {dataIso.split('-').reverse().join('/')})</h3>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"].map(h => (
                <button type="button" key={h} onClick={() => setHora(h)} className={`py-2 rounded-lg border font-medium text-sm transition-colors ${hora === h ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>{h}</button>
              ))}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-md shadow-slate-900/20">{loading ? 'A processar...' : 'Confirmar Marcação'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}