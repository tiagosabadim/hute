// ── Client Portal ─────────────────────────────────────────
function ClientPortal({ lojaUid, profile, deepLinkApptId, deepLinkToken }) {
  // ── Auth state ───────────────────────────────────────────
  const [clientUser, setClientUser] = useState(null);
  const [clientAccount, setClientAccount] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // loginStep: 'options' | 'phone' | 'phonecode' | 'email' | 'emailsent' | 'emailconfirm' | 'whatsask'
  const [loginStep, setLoginStep] = useState('options');
  const [phoneInput, setPhoneInput] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [whatsAsk, setWhatsAsk] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const recaptchaRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  // ── Navigation ───────────────────────────────────────────
  // tab: 'agenda' | 'historico' | 'conta'
  const [tab, setTab] = useState('agenda');

  // ── Token deep-link ──────────────────────────────────────
  const [tokenAppt, setTokenAppt] = useState(null);
  const [tokenValid, setTokenValid] = useState(null); // null=loading, true, false

  // ── Client appointments ──────────────────────────────────
  const [clientAppts, setClientAppts] = useState([]);

  // ── Booking ──────────────────────────────────────────────
  const [bookingMode, setBookingMode] = useState(false);
  // bookingStep: 'service' | 'professional' | 'datetime' | 'upsell' | 'confirm' | 'success'
  const [bookingStep, setBookingStep] = useState('service');
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProfissional, setSelectedProfissional] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHora, setSelectedHora] = useState('');
  const [slots, setSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedAppt, setConfirmedAppt] = useState(null);

  // For token-view rebook (anonymous): editable name + whats
  const [remarcarNome, setRemarcarNome] = useState('');
  const [remarcarWhats, setRemarcarWhats] = useState('');
  const [remarcarOldId, setRemarcarOldId] = useState(null);

  // ── Historico ────────────────────────────────────────────
  // histFilter: 'todos' | 'futuros' | 'passados'
  const [histFilter, setHistFilter] = useState('todos');

  // ── Conta ────────────────────────────────────────────────
  const [editingWhats, setEditingWhats] = useState(false);
  const [whatsEdit, setWhatsEdit] = useState('');
  const [savingWhats, setSavingWhats] = useState(false);
  const [cancelingId, setCancelingId] = useState(null);

  // ── PWA ──────────────────────────────────────────────────
  const [installPrompt, setInstallPrompt] = useState(null);
  const [pwaHidden, setPwaHidden] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone;

  const profissionals = profile.profissionals || [];
  const servicos = profile.servicos || [];

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

  // ── Email link completion on mount ───────────────────────
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const savedEmail = localStorage.getItem('huteEmailForSignIn');
      if (savedEmail) {
        setAuthLoading(true);
        signInWithEmailLink(auth, savedEmail, window.location.href)
          .then(() => {
            localStorage.removeItem('huteEmailForSignIn');
            window.history.replaceState({}, '', '#' + (profile.slug || ''));
          })
          .catch(err => {
            console.error('Email link sign-in error:', err);
            setAuthError('Erro ao confirmar email. Tente novamente.');
          })
          .finally(() => setAuthLoading(false));
      } else {
        setLoginStep('emailconfirm');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            if (!acct.whats) {
              setLoginStep('whatsask');
            } else {
              setLoginStep('options');
            }
          } else {
            // New account — create bare record
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
            setLoginStep('whatsask');
          }
        } catch {
          setClientUser(null);
          setClientAccount(null);
        }
      } else {
        setClientUser(null);
        setClientAccount(null);
        setLoginStep('options');
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

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

  // ── Dynamic PWA manifest ─────────────────────────────────
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
      theme_color: '#6C3CE1',
      orientation: 'portrait',
      icons,
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.querySelector('link[rel="manifest"]');
    if (link) link.href = blobUrl;
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
  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError('Erro ao entrar com Google. Tente novamente.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendSMS = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const digits = phoneInput.replace(/\D/g, '');
      const e164 = digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaRef.current, { size: 'invisible' });
      const result = await signInWithPhoneNumber(auth, e164, recaptchaVerifierRef.current);
      setConfirmationResult(result);
      setLoginStep('phonecode');
    } catch (err) {
      console.error('SMS error:', err);
      setAuthError('Erro ao enviar SMS. Verifique o número e tente novamente.');
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifySMS = async () => {
    if (!confirmationResult) return;
    setAuthError('');
    setAuthLoading(true);
    try {
      await confirmationResult.confirm(smsCode);
    } catch (err) {
      console.error('SMS verify error:', err);
      setAuthError('Código inválido. Tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendEmailLink = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await sendSignInLinkToEmail(auth, emailInput.trim(), {
        url: window.location.href,
        handleCodeInApp: true,
      });
      localStorage.setItem('huteEmailForSignIn', emailInput.trim());
      setLoginStep('emailsent');
    } catch (err) {
      console.error('Email link error:', err);
      setAuthError('Erro ao enviar link. Verifique o email e tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailConfirm = async () => {
    if (!emailInput.trim()) { setAuthError('Digite o seu email para confirmar.'); return; }
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInWithEmailLink(auth, emailInput.trim(), window.location.href);
      localStorage.removeItem('huteEmailForSignIn');
      window.history.replaceState({}, '', '#' + (profile.slug || ''));
    } catch (err) {
      console.error('Email confirm error:', err);
      setAuthError('Erro ao confirmar. Verifique o email e tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveWhats = async () => {
    if (!whatsAsk.trim() || !clientUser) return;
    setSavingWhats(true);
    try {
      await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'clientAccounts', clientUser.uid), { whats: whatsAsk.trim() }, { merge: true });
      setClientAccount(prev => ({ ...prev, whats: whatsAsk.trim() }));
      setLoginStep('options');
    } catch (err) {
      console.error('Save whats error:', err);
    } finally {
      setSavingWhats(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth).catch(() => {});
    setClientUser(null);
    setClientAccount(null);
    setClientAppts([]);
    setLoginStep('options');
    setTab('agenda');
    setBookingMode(false);
  };

  // ── Booking helpers ──────────────────────────────────────
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
      let slotList = json.slots || [];
      const isToday = toDateISO(date) === toDateISO(new Date());
      if (isToday) {
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        slotList = slotList.filter(slot => {
          const [h, m] = slot.split(':').map(Number);
          return h * 60 + m > nowMin;
        });
      }
      setSlots(slotList);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [lojaUid, profile.intervalo]);

  const profForService = selectedService
    ? (() => {
        const assigned = profissionals.filter(p => (p.servicos || []).includes(selectedService.nome));
        return assigned.length > 0 ? assigned : profissionals;
      })()
    : profissionals;

  const serviceHasExtras = !!(selectedService?.crossSell?.length || selectedService?.upsell?.length);

  const startBooking = (presetService = null) => {
    setSelectedService(presetService);
    setSelectedProfissional(null);
    setSelectedDate(new Date());
    setSelectedHora('');
    setSlots(null);
    setSelectedExtras([]);
    setConfirmedAppt(null);
    setBookingStep(presetService ? (profissionals.length > 0 ? 'professional' : 'datetime') : 'service');
    if (presetService && profissionals.length === 0) {
      fetchSlots(new Date(), presetService, null);
    }
    setBookingMode(true);
  };

  const handleSelectService = (s) => {
    setSelectedService(s);
    setSelectedProfissional(null);
    setSelectedHora('');
    if (profissionals.length > 0) {
      setBookingStep('professional');
    } else {
      fetchSlots(selectedDate, s, null);
      setBookingStep('datetime');
    }
  };

  const handleSelectProf = (p) => {
    setSelectedProfissional(p);
    setSelectedHora('');
    fetchSlots(selectedDate, selectedService, p?.id || null);
    setBookingStep('datetime');
  };

  const changeDate = (delta) => {
    const newDate = addDays(selectedDate, delta);
    if (newDate < new Date(new Date().setHours(0, 0, 0, 0))) return;
    setSelectedDate(newDate);
    setSelectedHora('');
    fetchSlots(newDate, selectedService, selectedProfissional?.id || null);
  };

  const bookingBack = () => {
    if (bookingStep === 'professional') setBookingStep('service');
    else if (bookingStep === 'datetime') setBookingStep(profForService.length > 0 ? 'professional' : 'service');
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
      const apptData = {
        clienteNome: clientNome,
        clienteWhats: clientWhats,
        clienteNascimento: '',
        servico: selectedService.nome,
        valor: selectedService.preco || null,
        duracao: selectedService.duracao || profile.intervalo || 60,
        profissionalId: selectedProfissional?.id || null,
        profissionalNome: selectedProfissional?.nome || null,
        data: dataISO,
        hora: selectedHora,
        dataHoraInternacional: dtInt.toISOString(),
        createdAt: new Date().toISOString(),
        accessToken,
        ...(selectedExtras.length > 0 ? { extras: selectedExtras } : {}),
        ...(clientUser ? { clientUid: clientUser.uid } : {}),
      };

      const apptRef = await addDoc(
        collection(db, 'artifacts', APP_ID, 'public', 'data', `appointments_${lojaUid}`),
        apptData
      );

      // Update client record
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

      // Fire-and-forget webhook
      fetch(`${BACKEND_URL}/createAppointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lojaId: lojaUid, ...apptData, appointmentId: apptRef.id }),
      }).catch(() => {});

      // Cancel old appointment if remarcar from token view
      if (isRemarcar && remarcarOldId) {
        fetch(`${BACKEND_URL}/cancelAppointment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lojaId: lojaUid,
            appointmentId: remarcarOldId,
            clienteWhats: clientWhats,
            nomeCliente: clientNome,
            servico: selectedService.nome,
            data: dataISO,
            hora: selectedHora,
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
    if (!window.confirm('Cancelar esta marcação?')) return;
    setCancelingId(appt.id);
    try {
      await fetch(`${BACKEND_URL}/cancelAppointment`, {
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
      });
    } catch {
      alert('Erro ao cancelar.');
    } finally {
      setCancelingId(null);
    }
  };

  // ── Helpers ──────────────────────────────────────────────
  function apptEndTime(a) {
    const [h2, m2] = (a.hora || '0:0').split(':').map(Number);
    const start = new Date(`${a.data}T${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}:00`);
    return new Date(start.getTime() + (Number(a.duracao) || 60) * 60 * 1000);
  }
  const now = new Date();
  const upcomingAppts = clientAppts.filter(a => apptEndTime(a) > now);
  const pastAppts = clientAppts.filter(a => apptEndTime(a) <= now);

  const filteredAppts = histFilter === 'futuros' ? upcomingAppts
    : histFilter === 'passados' ? pastAppts
    : clientAppts;

  const initials = (name) => (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // ── Invisible recaptcha div (must be in DOM) ─────────────
  const RecaptchaDiv = () => <div ref={recaptchaRef} className="hidden" />;

  // ── Loading ──────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  // ── Logo / header bar ────────────────────────────────────
  const HeroBanner = ({ showBack = false, onBack = null }) => (
    <header className="sticky top-0 z-10">
      {(profile.coverFoto || profile.logo) ? (
        <div className="relative h-36 overflow-hidden">
          {profile.coverFoto
            ? <img src={profile.coverFoto} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-violet-700 to-violet-500" />
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
            {showBack
              ? <button onClick={onBack} className="w-8 h-8 bg-black/30 hover:bg-black/50 rounded-xl flex items-center justify-center text-white transition-colors"><ArrowLeft className="w-4 h-4" /></button>
              : <div />
            }
          </div>
          <div className="absolute bottom-4 left-5 flex items-center gap-3">
            {profile.logo
              ? <img src={profile.logo} alt="" className="w-11 h-11 rounded-xl object-cover border-2 border-white/80 shadow-lg" />
              : <div className="w-11 h-11 rounded-xl bg-violet-600 border-2 border-white/80 shadow-lg flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
            }
            <div>
              <p className="font-black text-white text-base leading-tight">{profile.nome || 'Agendamento'}</p>
              {profile.subtitulo && <p className="text-white/75 text-xs">{profile.subtitulo}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-slate-100">
          <div className="flex items-center gap-3 px-5 py-3.5">
            {showBack && (
              <button onClick={onBack} className="p-1.5 -ml-1 text-violet-600 hover:text-violet-800">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            {profile.logo
              ? <img src={profile.logo} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
              : <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
            }
            <p className="font-black text-slate-900 flex-1 truncate text-sm">{profile.nome || 'Agendamento'}</p>
          </div>
        </div>
      )}
    </header>
  );

  // ── TOKEN VIEW ───────────────────────────────────────────
  if (deepLinkApptId && deepLinkToken) {
    if (tokenValid === null) {
      return (
        <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
          <HeroBanner />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
          <RecaptchaDiv />
        </div>
      );
    }
    if (tokenValid === false) {
      return (
        <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
          <HeroBanner />
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Link inválido</h2>
            <p className="text-sm text-slate-400">Este link de agendamento não é válido ou expirou.</p>
          </div>
          <div className="text-center py-4 border-t border-slate-100 bg-white">
            <div className="flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs text-slate-400 font-semibold">hute</span>
            </div>
          </div>
          <RecaptchaDiv />
        </div>
      );
    }

    // Valid token — booking mode for remarcar
    if (bookingMode) {
      const isLastStep = bookingStep === 'confirm';
      return (
        <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
          <HeroBanner showBack onBack={() => {
            if (bookingStep === 'service') setBookingMode(false);
            else bookingBack();
          }} />
          <div className="flex-1 p-5 pt-6 pb-8 overflow-y-auto">
            {bookingStep === 'success' ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mb-5 animate-bounce">
                  <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Marcado!</h2>
                <p className="text-slate-400 text-sm">A sua marcação foi confirmada com sucesso.</p>
              </div>
            ) : BookingStepsRender(true)}
          </div>
          <RecaptchaDiv />
        </div>
      );
    }

    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
        <HeroBanner />
        <div className="flex-1 p-5 pt-6 pb-8">
          {/* Appt detail card */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-violet-50">
              <Scissors className="w-5 h-5 text-violet-600" />
            </div>
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
          {apptEndTime(tokenAppt) > now && (
            <div className="flex gap-3">
              <button onClick={() => {
                const svc = (profile.servicos || []).find(s => s.nome === tokenAppt.servico) || { nome: tokenAppt.servico, duracao: profile.intervalo };
                setSelectedService(svc);
                setSelectedProfissional((profile.profissionals || []).find(p => p.id === tokenAppt.profissionalId) || null);
                setSelectedDate(new Date());
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
              <button onClick={async () => {
                if (!window.confirm('Cancelar esta marcação?')) return;
                try {
                  await fetch(`${BACKEND_URL}/cancelAppointment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      lojaId: lojaUid,
                      appointmentId: tokenAppt.id,
                      clienteWhats: tokenAppt.clienteWhats || '',
                      nomeCliente: tokenAppt.clienteNome || '',
                      servico: tokenAppt.servico || '',
                      data: tokenAppt.data || '',
                      hora: tokenAppt.hora || '',
                      profissionalNome: tokenAppt.profissionalNome || '',
                    }),
                  });
                  setTokenAppt(prev => ({ ...prev, _cancelled: true }));
                } catch { alert('Erro ao cancelar.'); }
              }} className="flex-1 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm font-bold text-red-500 hover:bg-red-100 transition-all">
                Cancelar
              </button>
            </div>
          )}
          {tokenAppt._cancelled && (
            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
              <p className="text-sm text-slate-500 font-semibold">Marcação cancelada.</p>
            </div>
          )}
        </div>
        <div className="text-center py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-slate-400 font-semibold">hute</span>
          </div>
        </div>
        <RecaptchaDiv />
      </div>
    );
  }

  // ── Helper: render booking steps ─────────────────────────
  function BookingStepsRender(isRemarcar = false) {
    return (
      <>
        {/* Progress bar */}
        {['service', 'professional', 'datetime', 'upsell', 'confirm'].includes(bookingStep) && (
          <div className="flex gap-1.5 mb-6">
            {['service', 'professional', 'datetime', 'confirm'].map((s, i) => {
              const order = { service: 0, professional: 1, datetime: 2, upsell: 2, confirm: 3 };
              const cur = order[bookingStep] ?? 0;
              return (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all ${i <= cur ? 'bg-violet-600' : 'bg-slate-200'}`} />
              );
            })}
          </div>
        )}

        {/* SERVICE */}
        {bookingStep === 'service' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Qual serviço?</h2>
            <p className="text-sm text-slate-400 mb-5">Escolha o serviço que deseja</p>
            {servicos.length === 0
              ? <p className="text-center text-slate-400 py-12 text-sm">Nenhum serviço disponível.</p>
              : (
                <div className="space-y-3">
                  {servicos.map((s, i) => (
                    <button key={i} onClick={() => handleSelectService(s)}
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

        {/* PROFESSIONAL */}
        {bookingStep === 'professional' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Com quem?</h2>
            <p className="text-sm text-slate-400 mb-5">{selectedService ? `Para "${selectedService.nome}"` : 'Escolha o profissional'}</p>
            <div className="space-y-3">
              {profForService.map(p => (
                <button key={p.id} onClick={() => handleSelectProf(p)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-violet-300 hover:shadow-md transition-all text-left flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0" style={{ backgroundColor: p.cor || '#7c3aed' }}>
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

        {/* DATETIME */}
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
                ? <div className="text-center py-10"><CalendarCheck className="w-10 h-10 text-slate-200 mx-auto mb-2" /><p className="text-slate-400 text-sm font-medium">Sem horários disponíveis neste dia.</p><p className="text-slate-300 text-xs mt-1">Tente outro dia</p></div>
                : (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {slots.map(slot => (
                        <button key={slot} onClick={() => setSelectedHora(slot)}
                          className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${selectedHora === slot ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200' : 'bg-white text-slate-700 border-slate-100 hover:border-violet-200'}`}>
                          {slot}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => {
                      if (!selectedHora) return;
                      setBookingStep(serviceHasExtras ? 'upsell' : 'confirm');
                    }} disabled={!selectedHora}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors">
                      Continuar
                    </button>
                  </>
                )
            }
          </div>
        )}

        {/* UPSELL */}
        {bookingStep === 'upsell' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Aproveite!</h2>
            <p className="text-sm text-slate-400 mb-4">Adicione ao seu serviço com desconto</p>
            <div className="space-y-3 mb-5">
              {(selectedService?.crossSell || []).map(cs => {
                const svc = servicos.find(s => s.nome === cs.servicoNome);
                if (!svc) return null;
                const precoOriginal = svc.preco ? Number(svc.preco) : null;
                const precoDesconto = precoOriginal ? Math.round(precoOriginal * (1 - cs.desconto / 100) * 100) / 100 : null;
                const added = selectedExtras.some(e => e.tipo === 'servico' && e.nome === svc.nome);
                return (
                  <div key={cs.servicoNome} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0"><Scissors className="w-4 h-4 text-violet-600" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{svc.nome}</p>
                        {precoDesconto && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400 line-through">R$ {precoOriginal.toFixed(2)}</span>
                            <span className="text-sm font-black text-emerald-600">R$ {precoDesconto.toFixed(2)}</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">{cs.desconto}% off</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => setSelectedExtras(prev => added ? prev.filter(e => !(e.tipo === 'servico' && e.nome === svc.nome)) : [...prev, { tipo: 'servico', nome: svc.nome, preco: precoDesconto || precoOriginal || 0 }])}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex-shrink-0 ${added ? 'bg-emerald-500 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>
                        {added ? '+ Adicionado' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {(selectedService?.upsell || []).map((produto, i) => {
                const added = selectedExtras.some(e => e.tipo === 'produto' && e.nome === produto.nome);
                return (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-4 h-4 text-amber-600" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{produto.nome}</p>
                        {produto.preco > 0 && <p className="text-sm font-black text-violet-700 mt-0.5">R$ {Number(produto.preco).toFixed(2)}</p>}
                      </div>
                      <button onClick={() => setSelectedExtras(prev => added ? prev.filter(e => !(e.tipo === 'produto' && e.nome === produto.nome)) : [...prev, { tipo: 'produto', nome: produto.nome, preco: produto.preco || 0 }])}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex-shrink-0 ${added ? 'bg-emerald-500 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>
                        {added ? '+ Adicionado' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setBookingStep('confirm')}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm transition-colors">
              Continuar {selectedExtras.length > 0 ? `(+${selectedExtras.length})` : ''}
            </button>
            <button onClick={() => { setSelectedExtras([]); setBookingStep('confirm'); }}
              className="w-full mt-2 py-3 text-slate-400 text-sm hover:text-slate-600 transition-colors">
              Não, obrigado
            </button>
          </div>
        )}

        {/* CONFIRM */}
        {bookingStep === 'confirm' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Confirmar marcação</h2>
            <p className="text-sm text-slate-400 mb-4">Reveja os detalhes antes de confirmar</p>
            <div className="bg-violet-50 rounded-2xl p-4 mb-4 space-y-2">
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
              {selectedExtras.length > 0 && (
                <div className="pt-1 border-t border-violet-100 space-y-1">
                  <span className="text-xs text-violet-500 font-semibold uppercase tracking-wider">Extras</span>
                  {selectedExtras.map((e, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-xs text-violet-700">{e.nome}</span>
                      {e.preco > 0 && <span className="text-xs font-bold text-violet-900">+R$ {Number(e.preco).toFixed(2)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Client info */}
            {isRemarcar ? (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 mb-5 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Os seus dados</p>
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
            ) : (
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
            )}
            <button onClick={() => handleConfirmBooking(isRemarcar)}
              disabled={submitting || (isRemarcar && (!remarcarNome.trim() || !remarcarWhats.trim()))}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Confirmar marcação
            </button>
          </div>
        )}
      </>
    );
  }

  // ── BOOKING MODE (logged-in) ─────────────────────────────
  if (bookingMode) {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
        <HeroBanner showBack onBack={() => {
          if (bookingStep === 'service') setBookingMode(false);
          else bookingBack();
        }} />
        <div className="flex-1 p-5 pt-6 pb-8 overflow-y-auto">
          {bookingStep === 'success' ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mb-5 animate-bounce">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Marcado!</h2>
              <p className="text-slate-400 text-sm">A sua marcação foi confirmada com sucesso.</p>
            </div>
          ) : BookingStepsRender(false)}
        </div>
        <RecaptchaDiv />
      </div>
    );
  }

  // ── LOGIN / AUTH SCREENS ─────────────────────────────────
  if (!clientUser) {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
        <HeroBanner />
        <div className="flex-1 p-5 pt-8 pb-8">

          {/* whatsask — not reachable if no user, but guard */}

          {loginStep === 'emailsent' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-violet-500" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Verifique o seu email</h2>
              <p className="text-sm text-slate-400 mb-2">Enviámos um link de acesso para</p>
              <p className="font-bold text-slate-700 mb-6">{emailInput}</p>
              <p className="text-xs text-slate-400">Clique no link do email para entrar. Pode fechar esta aba.</p>
              <button onClick={() => setLoginStep('options')} className="mt-6 text-xs text-violet-600 hover:underline">Voltar</button>
            </div>
          )}

          {loginStep === 'emailconfirm' && (
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-1">Confirmar email</h2>
              <p className="text-sm text-slate-400 mb-5">Digite o email que usou para receber o link</p>
              <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
                placeholder="o.seu@email.com"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white mb-3" />
              {authError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">{authError}</p>}
              <button onClick={handleEmailConfirm} disabled={authLoading || !emailInput.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Confirmar
              </button>
            </div>
          )}

          {loginStep === 'email' && (
            <div>
              <button onClick={() => { setLoginStep('options'); setAuthError(''); }} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <h2 className="text-xl font-black text-slate-900 mb-1">Entrar por email</h2>
              <p className="text-sm text-slate-400 mb-5">Vamos enviar um link de acesso direto para o seu email</p>
              <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
                placeholder="o.seu@email.com" autoComplete="email"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white mb-3" />
              {authError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">{authError}</p>}
              <button onClick={handleSendEmailLink} disabled={authLoading || !emailInput.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                Enviar link de acesso
              </button>
            </div>
          )}

          {loginStep === 'phone' && (
            <div>
              <button onClick={() => { setLoginStep('options'); setAuthError(''); }} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <h2 className="text-xl font-black text-slate-900 mb-1">Entrar por SMS</h2>
              <p className="text-sm text-slate-400 mb-5">Vamos enviar um código de verificação</p>
              <div className="flex gap-2 mb-3">
                <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex-shrink-0">+55</div>
                <input type="tel" value={phoneInput} onChange={e => setPhoneInput(e.target.value)}
                  placeholder="(11) 99999-9999" autoComplete="tel"
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
              </div>
              {authError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">{authError}</p>}
              <button onClick={handleSendSMS} disabled={authLoading || !phoneInput.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5" />}
                Enviar código SMS
              </button>
            </div>
          )}

          {loginStep === 'phonecode' && (
            <div>
              <button onClick={() => { setLoginStep('phone'); setAuthError(''); setSmsCode(''); }} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <h2 className="text-xl font-black text-slate-900 mb-1">Código SMS</h2>
              <p className="text-sm text-slate-400 mb-5">Digite o código de 6 dígitos enviado para <strong>{phoneInput}</strong></p>
              <input type="number" value={smsCode} onChange={e => setSmsCode(e.target.value)}
                placeholder="000000" maxLength={6}
                className="w-full px-4 py-4 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-2xl font-black text-center tracking-[0.5em] bg-white mb-3" />
              {authError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">{authError}</p>}
              <button onClick={handleVerifySMS} disabled={authLoading || smsCode.length < 4}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Verificar
              </button>
            </div>
          )}

          {loginStep === 'options' && (
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">Bem-vindo!</h2>
              <p className="text-sm text-slate-400 mb-8">Entre na sua conta para gerir as suas marcações</p>

              {/* Google */}
              <button onClick={handleGoogleLogin} disabled={authLoading}
                className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-3 mb-4 shadow-sm disabled:opacity-50">
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                </svg>
                Continuar com Google
              </button>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setLoginStep('phone'); setAuthError(''); }}
                  className="bg-white border-2 border-slate-200 hover:border-violet-300 text-slate-700 font-bold py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm">
                  <Phone className="w-4 h-4 text-violet-500" />
                  Telemóvel
                </button>
                <button onClick={() => { setLoginStep('email'); setAuthError(''); }}
                  className="bg-white border-2 border-slate-200 hover:border-violet-300 text-slate-700 font-bold py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm">
                  <Mail className="w-4 h-4 text-violet-500" />
                  Email
                </button>
              </div>

              <p className="text-center text-xs text-slate-300 mt-8">Ao entrar, aceita os nossos termos de utilização.</p>
            </div>
          )}
        </div>
        <div className="text-center py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-slate-400 font-semibold">hute</span>
          </div>
        </div>
        <RecaptchaDiv />
      </div>
    );
  }

  // ── WHATSAPP ASK ─────────────────────────────────────────
  if (loginStep === 'whatsask') {
    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
        <HeroBanner />
        <div className="flex-1 p-5 pt-8 flex flex-col">
          <div className="w-14 h-14 bg-emerald-50 rounded-3xl flex items-center justify-center mb-5">
            <MessageCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-1">Qual o seu WhatsApp?</h2>
          <p className="text-sm text-slate-400 mb-6">Para receber confirmações e lembretes das suas marcações</p>
          <div className="flex gap-2 mb-4">
            <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex-shrink-0">+55</div>
            <input type="tel" value={whatsAsk} onChange={e => setWhatsAsk(e.target.value)}
              placeholder="(11) 99999-9999" autoComplete="tel"
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 outline-none focus:ring-2 focus:ring-violet-500 text-sm bg-white" />
          </div>
          <button onClick={handleSaveWhats} disabled={savingWhats || !whatsAsk.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2 mb-3">
            {savingWhats ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Guardar
          </button>
          <button onClick={() => setLoginStep('options')} className="text-sm text-slate-400 hover:text-slate-600 text-center py-2 transition-colors">
            Pular por agora
          </button>
        </div>
        <div className="text-center py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-slate-400 font-semibold">hute</span>
          </div>
        </div>
        <RecaptchaDiv />
      </div>
    );
  }

  // ── MAIN LOGGED-IN VIEW ──────────────────────────────────
  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 flex flex-col">
      <HeroBanner />

      {/* Confirmed banner */}
      {confirmedAppt && (
        <div className="mx-5 mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-emerald-800 text-sm">Marcação confirmada!</p>
            <p className="text-xs text-emerald-600 truncate">{confirmedAppt.servico} · {fmtData(confirmedAppt.data)} às {confirmedAppt.hora}</p>
          </div>
          <button onClick={() => setConfirmedAppt(null)} className="text-emerald-400 hover:text-emerald-600 flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex-1 p-5 pt-5 pb-32 overflow-y-auto">

        {/* ── AGENDA TAB ──────────────────────────────────── */}
        {tab === 'agenda' && (
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-5">Olá, {(clientAccount?.nome || '').split(' ')[0] || 'bem-vindo'}!</h2>

            {/* PWA install */}
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
                    <p className="text-xs text-slate-600">1. Toque em <strong>Partilhar</strong> <span className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">⬆</span> no Safari</p>
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

            {/* Upcoming */}
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Próximas marcações</h3>
            {upcomingAppts.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 text-center border border-slate-100 mb-5">
                <CalendarCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhuma marcação futura</p>
                <p className="text-xs text-slate-300 mt-1">Use o botão abaixo para agendar</p>
              </div>
            ) : (
              <div className="space-y-3 mb-5">
                {upcomingAppts.map(a => (
                  <div key={a.id} className="bg-white ro