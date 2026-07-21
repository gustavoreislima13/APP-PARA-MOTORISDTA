import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Clock, CreditCard, ChevronRight, CheckCircle2, User as UserIcon, Calendar, History, Car, Trash2, DollarSign, Star } from 'lucide-react';
import { initAuth, googleSignIn, logout, db, handleFirestoreError, OperationType } from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

export default function PassengerApp() {
  const { driverId } = useParams();
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [simulation, setSimulation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);

  const [bookingState, setBookingState] = useState<'idle' | 'processing' | 'success'>('idle');
  const [bookingStage, setBookingStage] = useState<'payment' | 'searching' | 'confirming'>('payment');
  const [bookingType, setBookingType] = useState<'now' | 'later'>('now');

  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');
  const [historySubTab, setHistorySubTab] = useState<'completed' | 'scheduled'>('completed');
  const [passengerRides, setPassengerRides] = useState<any[]>([]);
  const [fetchingRides, setFetchingRides] = useState(false);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [loadingDriverInfo, setLoadingDriverInfo] = useState(false);
  const [passengerPhone, setPassengerPhone] = useState('');

  const locationPresets = [
    { name: 'Aeroporto Congonhas', address: 'Aeroporto de Congonhas (CGH), São Paulo - SP', icon: '✈️' },
    { name: 'Vila Olímpia', address: 'Rua Funchal, Vila Olímpia, São Paulo - SP', icon: '🏢' },
    { name: 'Av. Paulista', address: 'Avenida Paulista, 2000, São Paulo - SP', icon: '🏠' },
    { name: 'Shopping Eldorado', address: 'Shopping Eldorado, Pinheiros, São Paulo - SP', icon: '🛍️' },
    { name: 'Allianz Parque', address: 'Allianz Parque, Pompeia, São Paulo - SP', icon: '🏟️' }
  ];

  // States for adding custom expenses (despesas) to a ride
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('Pedágio');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const handleSaveExpense = async (ride: any) => {
    if (!expenseCategory) {
      alert('Por favor, selecione uma categoria.');
      return;
    }
    if (!expenseAmount) {
      alert('Por favor, preencha o valor da despesa.');
      return;
    }
    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Por favor, insira um valor válido maior que zero.');
      return;
    }

    try {
      const updatedExpenses = [...(ride.expenses || []), {
        id: Date.now().toString(),
        category: expenseCategory,
        description: expenseDescription.trim(),
        amount: amountNum
      }];

      const rideRef = doc(db, 'rides', ride.id);
      await updateDoc(rideRef, { expenses: updatedExpenses });

      // Update local state
      setPassengerRides(prev => prev.map(r => r.id === ride.id ? { ...r, expenses: updatedExpenses } : r));
      
      // Reset form
      setShowExpenseForm(false);
      setSelectedRideId(null);
      setExpenseCategory('Pedágio');
      setExpenseDescription('');
      setExpenseAmount('');
    } catch (err) {
      console.error('Error saving expense:', err);
      handleFirestoreError(err, OperationType.UPDATE, `rides/${ride.id}`);
    }
  };

  const handleDeleteExpense = async (rideId: string, expenseId: string) => {
    if (!window.confirm('Excluir esta despesa?')) return;

    try {
      const ride = passengerRides.find(r => r.id === rideId);
      if (!ride) return;

      const updatedExpenses = (ride.expenses || []).filter((e: any) => e.id !== expenseId);

      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, { expenses: updatedExpenses });

      // Update local state
      setPassengerRides(prev => prev.map(r => r.id === rideId ? { ...r, expenses: updatedExpenses } : r));
    } catch (err) {
      console.error('Error deleting expense:', err);
      handleFirestoreError(err, OperationType.UPDATE, `rides/${rideId}`);
    }
  };

  const get30DaysData = () => {
    const data: { date: string; formattedDate: string; gasto: number; despesas: number; total: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const day = d.getDate();
      const month = d.toLocaleString('pt-BR', { month: 'short' });
      data.push({
        date: dateStr,
        formattedDate: `${day} ${month}`,
        gasto: 0,
        despesas: 0,
        total: 0
      });
    }

    // Populate data from passengerRides
    passengerRides.forEach(ride => {
      let rideDateStr = ride.scheduledDate; // "YYYY-MM-DD"
      if (!rideDateStr && ride.createdAt) {
        rideDateStr = ride.createdAt.split('T')[0];
      }
      if (!rideDateStr) return;

      const dayData = data.find(item => item.date === rideDateStr);
      if (dayData) {
        const price = Number(ride.price || 0);
        let despesasSum = 0;
        if (ride.expenses && Array.isArray(ride.expenses)) {
          despesasSum = ride.expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);
        }
        dayData.gasto += price;
        dayData.despesas += despesasSum;
        dayData.total += (price + despesasSum);
      }
    });

    return data;
  };

  const getFinancialTotals = () => {
    let totalTarifas = 0;
    let totalDespesas = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    passengerRides.forEach(ride => {
      let rideDate = ride.scheduledDate ? new Date(ride.scheduledDate) : null;
      if (!rideDate && ride.createdAt) {
        rideDate = new Date(ride.createdAt);
      }
      if (!rideDate) return;

      if (rideDate >= thirtyDaysAgo) {
        totalTarifas += Number(ride.price || 0);
        if (ride.expenses && Array.isArray(ride.expenses)) {
          ride.expenses.forEach((exp: any) => {
            totalDespesas += Number(exp.amount || 0);
          });
        }
      }
    });

    return {
      totalTarifas,
      totalDespesas,
      totalGeral: totalTarifas + totalDespesas
    };
  };

  const { totalTarifas, totalDespesas, totalGeral } = getFinancialTotals();

  const fetchPassengerRides = async (email: string) => {
    setFetchingRides(true);
    try {
      const q = query(
        collection(db, 'rides'),
        where('passengerEmail', '==', email)
      );
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort by createdAt descending
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setPassengerRides(list);
    } catch (err) {
      console.error('Error fetching passenger rides:', err);
      handleFirestoreError(err, OperationType.LIST, 'rides');
    } finally {
      setFetchingRides(false);
    }
  };

  const handleCancelPassengerRide = async (rideId: string) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta corrida?')) return;
    try {
      await deleteDoc(doc(db, 'rides', rideId));
      if (user?.email) {
        fetchPassengerRides(user.email);
      }
    } catch (err) {
      console.error('Error deleting ride:', err);
      handleFirestoreError(err, OperationType.DELETE, `rides/${rideId}`);
    }
  };

  const handleCompletePassengerRide = async (rideId: string) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, { status: 'completed' });
      if (user?.email) {
        fetchPassengerRides(user.email);
      }
    } catch (err) {
      console.error('Error completing ride:', err);
      handleFirestoreError(err, OperationType.UPDATE, `rides/${rideId}`);
    }
  };

  const handleRateRide = async (rideId: string, rating: number) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, { rating });
      // Update local state
      setPassengerRides(prev => prev.map(r => r.id === rideId ? { ...r, rating } : r));
    } catch (err) {
      console.error('Error rating ride:', err);
      handleFirestoreError(err, OperationType.UPDATE, `rides/${rideId}`);
    }
  };

  const registerPassenger = async (firebaseUser: FirebaseUser) => {
    try {
      await fetch('/api/passenger/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          phone: firebaseUser.phoneNumber || ''
        })
      });
    } catch (err) {
      console.error('Error auto-registering passenger profile:', err);
    }
  };

  useEffect(() => {
    if (driverId) {
      setLoadingDriverInfo(true);
      fetch(`/api/driver/by-url/${driverId}`)
        .then(async res => {
          if (!res.ok) throw new Error('Driver not found');
          const ct = res.headers.get('content-type');
          if (!ct || !ct.includes('application/json')) {
            throw new Error('Invalid JSON response');
          }
          return res.json();
        })
        .then(data => {
          setDriverInfo(data);
          // Pre-populate passenger phone if they already have one registered
          if (user?.phoneNumber) {
            setPassengerPhone(user.phoneNumber);
          }
        })
        .catch(err => {
          console.error('Error fetching driver details:', err);
        })
        .finally(() => {
          setLoadingDriverInfo(false);
        });
    }
  }, [driverId, user]);

  useEffect(() => {
    initAuth(
      (u) => {
        setUser(u);
        setNeedsAuth(false);
        registerPassenger(u);
        if (u.email) {
          fetchPassengerRides(u.email);
        }
      },
      () => setNeedsAuth(true)
    );
  }, []);

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        registerPassenger(result.user);
      }
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        alert('O login foi cancelado ou o pop-up foi bloqueado pelo navegador. Tente novamente.');
      } else {
        console.error('Login failed:', err);
      }
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, stops: stops.filter(s => s.trim() !== ''), driverId })
      });
      const ct = response.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        const data = await response.json();
        if (data.error) {
          alert(data.error);
        } else {
          setSimulation(data);
        }
      } else {
        alert('Erro ao comunicar com o servidor para simulação.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!simulation) return;
    if (!passengerPhone.trim()) {
      alert('Por favor, digite o seu número de telefone/WhatsApp antes de agendar a corrida.');
      return;
    }
    setLoading(true);
    setBookingState('processing');
    setBookingStage('payment');

    // For 'now' bookings, dynamically compute current date & time
    let finalDate = scheduledDate;
    let finalTime = scheduledTime;
    if (bookingType === 'now') {
      const now = new Date();
      finalDate = now.toISOString().split('T')[0];
      finalTime = now.toTimeString().split(' ')[0].substring(0, 5);
    }

    try {
      // Step 1: Simulated payment step (1200ms)
      await new Promise(resolve => setTimeout(resolve, 1200));
      setBookingStage('searching');

      // Make actual booking API call in parallel
      const responsePromise = fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          passengerName: user?.displayName || 'Passageiro',
          passengerEmail: user?.email || '',
          passengerPhone,
          origin,
          destination,
          stops: stops.filter(s => s.trim() !== ''),
          scheduledDate: finalDate,
          scheduledTime: finalTime,
          distanceKm: simulation.distanceKm,
          timeMins: simulation.timeMins,
          price: simulation.price,
          netProfit: simulation.profitability.netProfit
        })
      });

      // Step 2: Simulated search/dispatch step (1200ms)
      await new Promise(resolve => setTimeout(resolve, 1200));
      setBookingStage('confirming');

      // Step 3: Wait for actual book response
      const response = await responsePromise;
      if (response.ok) {
        try {
          await addDoc(collection(db, 'rides'), {
            driverId,
            passengerName: user?.displayName || 'Passageiro',
            passengerEmail: user?.email || '',
            passengerPhone,
            passengerUid: user?.uid || '',
            origin,
            destination,
            stops: stops.filter(s => s.trim() !== ''),
            scheduledDate: finalDate,
            scheduledTime: finalTime,
            distanceKm: Number(simulation.distanceKm),
            timeMins: Number(simulation.timeMins),
            price: Number(simulation.price),
            netProfit: Number(simulation.profitability.netProfit),
            status: 'scheduled',
            createdAt: new Date().toISOString()
          });
          if (user?.email) {
            fetchPassengerRides(user.email);
          }
        } catch (fbErr) {
          console.error('Error saving booked ride to Firestore:', fbErr);
          handleFirestoreError(fbErr, OperationType.CREATE, 'rides');
        }

        // Step 4: Short delay to complete the confirmation animation (1000ms)
        await new Promise(resolve => setTimeout(resolve, 1000));
        setBookingState('success');
        setBooked(true);
      } else {
        setBookingState('idle');
        alert('Erro ao agendar corrida. Tente novamente.');
      }
    } catch (error) {
      console.error(error);
      setBookingState('idle');
      alert('Erro de conexão ao agendar corrida.');
    } finally {
      setLoading(false);
    }
  };

  if (booked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Confetti-like ambient radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08),transparent_50%)] pointer-events-none" />

        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.15, 1], opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mb-5 shadow-xl shadow-emerald-500/5 relative"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3, delay: 1 }}
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </motion.div>
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-semibold tracking-tight mb-1 text-center text-emerald-400"
        >
          Corrida Confirmada!
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-zinc-400 text-center mb-6 max-w-xs text-xs"
        >
          O motorista João foi notificado e os dados já estão no seu histórico de corridas.
        </motion.p>

        {/* Boarding Pass Receipt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl relative"
        >
          {/* Header of Boarding Pass */}
          <div className="bg-[#1a1a1c] border-b border-zinc-800 p-4 flex justify-between items-center">
            <span className="text-[10px] font-mono tracking-wider text-emerald-400 font-bold">BILHETE DE CORRIDA</span>
            <span className="text-[10px] font-mono text-zinc-500">#DM-{Math.floor(100000 + Math.random() * 900000)}</span>
          </div>

          <div className="p-5 space-y-4">
            {/* Driver Detail Card */}
            <div className="flex items-center gap-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/50">
              {driverInfo?.photo_url ? (
                <img 
                  src={driverInfo.photo_url} 
                  alt={driverInfo.name} 
                  className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-sm">
                  {driverInfo?.name?.charAt(0) || 'M'}
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-semibold text-white">{driverInfo?.name || 'João Motorista'}</p>
                <p className="text-[10px] text-zinc-400">
                  {driverInfo?.vehicle ? `${driverInfo.vehicle.color} • ${driverInfo.vehicle.make} ${driverInfo.vehicle.model}` : 'VW Fox 1.0 Preto'}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-bold text-zinc-300">4.9</span>
              </div>
            </div>

            {driverInfo && (driverInfo.phone || driverInfo.pix_key) && (
              <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/60 space-y-2 text-left text-xs">
                {driverInfo.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Contato Motorista:</span>
                    <span className="text-white font-mono">{driverInfo.phone}</span>
                  </div>
                )}
                {driverInfo.pix_key && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Chave PIX:</span>
                    <span className="text-emerald-400 font-mono select-all bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">{driverInfo.pix_key}</span>
                  </div>
                )}
              </div>
            )}

            {/* Route Detail with dashed connector */}
            <div className="relative pl-5 space-y-3">
              {/* Connector line */}
              <div className="absolute left-1.5 top-2.5 bottom-2.5 w-px border-l border-dashed border-zinc-700" />
              <div className="absolute left-0.5 top-1 w-2 h-2 rounded-full bg-emerald-500" />
              <div className="absolute left-0.5 bottom-1 w-2 h-2 rounded-full bg-red-400" />

              <div className="text-left text-xs">
                <p className="text-zinc-500 text-[9px] uppercase tracking-wider">Origem</p>
                <p className="font-medium text-zinc-300 line-clamp-1">{origin}</p>
              </div>
              <div className="text-left text-xs">
                <p className="text-zinc-500 text-[9px] uppercase tracking-wider">Destino</p>
                <p className="font-medium text-zinc-300 line-clamp-1">{destination}</p>
              </div>
            </div>

            {/* Tear-off dotted border line separator */}
            <div className="relative -mx-5 my-4 h-px border-b border-dashed border-zinc-800">
              <div className="absolute left-[-6px] top-[-6px] w-3 h-3 bg-[#0a0a0a] rounded-full border border-zinc-800 border-l-0 border-t-0" />
              <div className="absolute right-[-6px] top-[-6px] w-3 h-3 bg-[#0a0a0a] rounded-full border border-zinc-800 border-r-0 border-t-0" />
            </div>

            {/* Financial summaries */}
            <div className="flex justify-between items-center text-xs">
              <div className="text-left">
                <p className="text-zinc-500 text-[9px] uppercase tracking-wider">Distância & Tempo</p>
                <p className="font-medium text-zinc-300">{simulation?.distanceKm} km • ~{simulation?.timeMins} min</p>
              </div>
              <div className="text-right">
                <p className="text-zinc-500 text-[9px] uppercase tracking-wider">Preço Final</p>
                <p className="text-lg font-bold text-emerald-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(simulation?.price || 0)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.button 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={() => {
            setBooked(false);
            setBookingState('idle');
            setHistorySubTab('completed');
            setActiveTab('history');
          }}
          className="mt-6 bg-white text-black px-8 py-3.5 rounded-full font-semibold shadow-lg hover:bg-zinc-200 active:scale-95 transition-all text-sm w-full max-w-sm"
        >
          Ir para Minhas Corridas
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-zinc-800">
      <AnimatePresence>
        {bookingState === 'processing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col items-center justify-between p-6 md:p-8"
          >
            {/* Top Indicator */}
            <div className="w-full flex justify-between items-center max-w-md mt-4">
              <span className="text-xs font-mono tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                ● SOLICITAÇÃO ATIVA
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                {bookingStage === 'payment' ? 'Etapa 1/3' : bookingStage === 'searching' ? 'Etapa 2/3' : 'Etapa 3/3'}
              </span>
            </div>

            {/* Central Animation Area */}
            <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center py-6">
              <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                {/* Radar Sonar Waves */}
                <motion.div 
                  animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                  className="absolute w-24 h-24 bg-emerald-500/10 rounded-full"
                />
                <motion.div 
                  animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.7, ease: "easeOut" }}
                  className="absolute w-24 h-24 bg-emerald-500/10 rounded-full"
                />
                
                {/* Map Grid Pattern background */}
                <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-40 rounded-full border border-zinc-800/60" />

                {/* Spinning rings */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                  className="absolute inset-0 border border-dashed border-zinc-800 rounded-full"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                  className="absolute inset-4 border border-dashed border-zinc-800/80 rounded-full"
                />

                {/* Simulated Road Path */}
                <div className="absolute h-1 w-48 bg-zinc-800/80 rounded-full rotate-[15deg]">
                  <motion.div 
                    initial={{ left: 0 }}
                    animate={{ left: "100%" }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="absolute w-4 h-4 bg-emerald-500 rounded-full -top-1.5 shadow-lg shadow-emerald-500/50 flex items-center justify-center"
                  >
                    <Car className="w-2.5 h-2.5 text-black" />
                  </motion.div>
                </div>

                {/* Icon Circle */}
                <div className="w-28 h-28 bg-[#151515] border border-zinc-800 rounded-full flex items-center justify-center z-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent" />
                  <AnimatePresence mode="wait">
                    {bookingStage === 'payment' && (
                      <motion.div 
                        key="payment-icon"
                        initial={{ scale: 0.7, opacity: 0, rotate: -20 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.7, opacity: 0, rotate: 20 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="flex flex-col items-center"
                      >
                        <CreditCard className="w-10 h-10 text-emerald-400" />
                        <span className="text-[10px] font-mono mt-2 text-zinc-500">PAY_SECURE</span>
                      </motion.div>
                    )}
                    {bookingStage === 'searching' && (
                      <motion.div 
                        key="searching-icon"
                        initial={{ scale: 0.7, opacity: 0, y: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.7, opacity: 0, y: -15 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="flex flex-col items-center"
                      >
                        <Car className="w-10 h-10 text-emerald-400 animate-bounce" />
                        <span className="text-[10px] font-mono mt-2 text-emerald-500 animate-pulse">DISPATCH_API</span>
                      </motion.div>
                    )}
                    {bookingStage === 'confirming' && (
                      <motion.div 
                        key="confirming-icon"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="flex flex-col items-center"
                      >
                        <MapPin className="w-10 h-10 text-emerald-400" />
                        <span className="text-[10px] font-mono mt-2 text-zinc-500">SYNC_SUCCESS</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Status & Sub-Text */}
              <div className="h-24 flex items-center justify-center px-4">
                <AnimatePresence mode="wait">
                  {bookingStage === 'payment' && (
                    <motion.div
                      key="payment-text"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.4 }}
                      className="text-center"
                    >
                      <h3 className="text-xl font-medium text-white font-sans tracking-tight">Processando Pagamento</h3>
                      <p className="text-zinc-500 text-sm mt-2 font-sans max-w-xs mx-auto">Sua reserva está sendo garantida com processamento seguro e tarifa imutável.</p>
                    </motion.div>
                  )}
                  {bookingStage === 'searching' && (
                    <motion.div
                      key="searching-text"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.4 }}
                      className="text-center"
                    >
                      <h3 className="text-xl font-medium text-white font-sans tracking-tight">Procurando {driverInfo?.name || 'João Motorista'}</h3>
                      <p className="text-zinc-500 text-sm mt-2 font-sans max-w-xs mx-auto">Notificando o motorista e vinculando seu veículo {driverInfo?.vehicle ? `${driverInfo.vehicle.color} ${driverInfo.vehicle.make} ${driverInfo.vehicle.model}` : 'VW Fox 1.0 Preto'} à corrida.</p>
                    </motion.div>
                  )}
                  {bookingStage === 'confirming' && (
                    <motion.div
                      key="confirming-text"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.4 }}
                      className="text-center"
                    >
                      <h3 className="text-xl font-medium text-white font-sans tracking-tight">Finalizando Agendamento</h3>
                      <p className="text-zinc-500 text-sm mt-2 font-sans max-w-xs mx-auto">Sincronizando os dados no Firestore e enviando os detalhes para sua conta.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom Progress Steps Card */}
            <div className="w-full max-w-md bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 mb-8 backdrop-blur-md">
              <div className="flex flex-col gap-4">
                {/* Step 1 */}
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    bookingStage === 'payment' ? 'bg-emerald-500 text-black animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {bookingStage !== 'payment' ? '✓' : '1'}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-xs font-semibold ${bookingStage === 'payment' ? 'text-white' : 'text-zinc-400'}`}>Garantia de tarifa e pagamento</p>
                    <p className="text-[10px] text-zinc-500">Valor fixado em tempo real</p>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="h-px bg-zinc-800 relative">
                  <div className={`absolute left-0 top-0 bottom-0 h-full bg-emerald-500 transition-all duration-500 ${
                    bookingStage === 'payment' ? 'w-0' : bookingStage === 'searching' ? 'w-1/2' : 'w-full'
                  }`} />
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    bookingStage === 'searching' ? 'bg-emerald-500 text-black animate-pulse' : 
                    bookingStage === 'confirming' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {bookingStage === 'confirming' ? '✓' : '2'}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-xs font-semibold ${bookingStage === 'searching' ? 'text-white animate-pulse' : bookingStage === 'confirming' ? 'text-zinc-400' : 'text-zinc-500'}`}>Notificando motorista parceiro</p>
                    <p className="text-[10px] text-zinc-500">Transmissão de dados ao {driverInfo?.vehicle ? `${driverInfo.vehicle.make} ${driverInfo.vehicle.model}` : 'veículo'}</p>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="h-px bg-zinc-800 relative">
                  <div className={`absolute left-0 top-0 bottom-0 h-full bg-emerald-500 transition-all duration-500 ${
                    bookingStage === 'confirming' ? 'w-full' : 'w-0'
                  }`} />
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    bookingStage === 'confirming' ? 'bg-emerald-500 text-black animate-pulse' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    3
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-xs font-semibold ${bookingStage === 'confirming' ? 'text-white' : 'text-zinc-500'}`}>Geração do bilhete de viagem</p>
                    <p className="text-[10px] text-zinc-500">Sincronização com Firestore</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md mx-auto h-screen flex flex-col bg-[#111] shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <header className="px-6 pt-12 pb-4 bg-[#1a1a1a] border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate('/')} className="text-sm text-zinc-400 hover:text-white transition-colors">
              Voltar
            </button>
            <span className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded text-zinc-400">DriverMetrics Pro</span>
          </div>
          {loadingDriverInfo ? (
            <div className="animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-1/2" />
                <div className="h-3 bg-zinc-800 rounded w-1/3" />
              </div>
            </div>
          ) : driverInfo ? (
            <div className="flex items-center gap-3">
              {driverInfo.photo_url ? (
                <img 
                  src={driverInfo.photo_url} 
                  alt={driverInfo.name} 
                  className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-lg">
                  {driverInfo.name?.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Motorista Particular</p>
                <h1 className="text-lg font-semibold text-white leading-tight">{driverInfo.name}</h1>
                {driverInfo.vehicle && (
                  <p className="text-[10px] text-zinc-400 font-mono">
                    {driverInfo.vehicle.color} • {driverInfo.vehicle.make} {driverInfo.vehicle.model} ({driverInfo.vehicle.year})
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-medium text-white tracking-tight">Reservar Corrida</h1>
              <p className="text-sm text-zinc-500 mt-1">Preço exato, sem surpresas.</p>
            </>
          )}
        </header>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-6">
          {needsAuth ? (
            <div className="text-center py-12">
              <p className="text-sm text-zinc-400 mb-6">Faça login com o Google para agendar sua corrida e enviar os detalhes ao motorista.</p>
              <button onClick={handleLogin} className="w-full bg-white text-black font-medium py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Continuar com Google
              </button>
            </div>
          ) : activeTab === 'book' ? (
            <>
              <form onSubmit={handleSimulate} className="space-y-4 relative">
                <div className="absolute left-6 top-[72px] bottom-[104px] w-px bg-zinc-800" />
                
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <UserIcon className="w-4 h-4" />
                    <span>{user?.displayName}</span>
                  </div>
                  <button type="button" onClick={logout} className="text-xs text-zinc-500 hover:text-white transition-colors">Sair</button>
                </div>

                {/* Mobile Booking Type Selector */}
                <div className="bg-[#1c1c1e] p-1 rounded-xl border border-zinc-800/85 flex gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => setBookingType('now')}
                    className={`flex-1 py-3 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      bookingType === 'now'
                        ? 'bg-white text-black shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                    }`}
                  >
                    <Car className="w-4 h-4 shrink-0" />
                    Pedir Agora
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingType('later')}
                    className={`flex-1 py-3 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      bookingType === 'later'
                        ? 'bg-white text-black shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                    }`}
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    Agendar para Depois
                  </button>
                </div>

                <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 focus-within:border-white transition-colors">
                  <MapPin className="w-5 h-5 text-zinc-500 mr-4 z-10" />
                  <input 
                    type="text" 
                    placeholder="Local de Partida" 
                    value={origin}
                    onChange={e => setOrigin(e.target.value)}
                    className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-600"
                    required
                  />
                </div>

                {stops.map((stop, index) => (
                  <div key={index} className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 focus-within:border-white transition-colors">
                    <div className="w-5 h-5 flex items-center justify-center mr-4 z-10">
                      <div className="w-2 h-2 rounded-full bg-zinc-500"></div>
                    </div>
                    <input 
                      type="text" 
                      placeholder={`Parada ${index + 1}`} 
                      value={stop}
                      onChange={e => {
                        const newStops = [...stops];
                        newStops[index] = e.target.value;
                        setStops(newStops);
                      }}
                      className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-600"
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const newStops = stops.filter((_, i) => i !== index);
                        setStops(newStops);
                      }}
                      className="ml-2 text-zinc-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => setStops([...stops, ''])}
                    className="text-xs text-emerald-500 hover:text-emerald-400 font-medium"
                  >
                    + Adicionar Parada
                  </button>
                </div>

                <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 focus-within:border-white transition-colors">
                  <Navigation className="w-5 h-5 text-emerald-500 mr-4 z-10" />
                  <input 
                    type="text" 
                    placeholder="Para onde vamos?" 
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-600"
                    required
                  />
                </div>

                {/* Mobile Quick Presets */}
                <div className="space-y-2 mt-2">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Destinos Frequentes (Toque para preencher)</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x -mx-1 px-1">
                    {locationPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (!origin) {
                            setOrigin("Av. Paulista, 1000 - Bela Vista, São Paulo - SP");
                          }
                          setDestination(preset.address);
                        }}
                        className="flex items-center gap-1.5 bg-[#1c1c1e] border border-zinc-800/80 rounded-full px-3.5 py-2 text-xs text-zinc-300 hover:text-white hover:border-emerald-500/50 transition-colors shrink-0 snap-align-start active:scale-95"
                      >
                        <span>{preset.icon}</span>
                        <span className="font-medium">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {bookingType === 'later' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 focus-within:border-white transition-colors">
                          <input 
                            type="date" 
                            value={scheduledDate}
                            onChange={e => setScheduledDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-600 text-xs"
                            required={bookingType === 'later'}
                          />
                        </div>
                        <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 focus-within:border-white transition-colors">
                          <input 
                            type="time" 
                            value={scheduledTime}
                            onChange={e => setScheduledTime(e.target.value)}
                            className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-600 text-xs"
                            required={bookingType === 'later'}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  type="submit" 
                  disabled={loading || !origin || !destination}
                  className="w-full bg-white text-black font-medium rounded-xl py-4 mt-6 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
                >
                  {loading ? 'Calculando...' : 'Ver Preço'}
                </button>
              </form>

              {/* Simulation Results */}
              {simulation && !loading && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-4">Resumo da Viagem</h3>
                  
                  <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 mb-6 space-y-4">
                    <div className="flex justify-between items-end pb-4 border-b border-zinc-800">
                      <div>
                        <p className="text-sm text-zinc-500 mb-1">Valor Total</p>
                        <h2 className="text-4xl font-medium text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(simulation.price)}
                        </h2>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-zinc-500 mb-1">Distância</p>
                        <p className="text-lg font-medium text-zinc-300">{simulation.distanceKm} km</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>~{simulation.timeMins} min</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-zinc-700" />
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span>Cartão / PIX</span>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4 space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Seu Telefone / WhatsApp</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="Ex: (11) 99999-9999"
                        value={passengerPhone}
                        onChange={e => setPassengerPhone(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-emerald-500 transition-colors"
                      />
                      <p className="text-[10px] text-zinc-500">Este número será enviado para a agenda de {driverInfo?.name || 'do motorista'} para que ele possa entrar em contato direto.</p>
                    </div>
                  </div>

                  <button 
                    onClick={handleBook}
                    disabled={loading}
                    className="w-full bg-emerald-500 text-black font-medium rounded-xl py-4 flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors"
                  >
                    Agendar e Pagar
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* History Sub Tab - Firestore Loaded Rides */
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest font-mono">Minhas Corridas</h3>
                <button
                  onClick={() => user?.email && fetchPassengerRides(user.email)}
                  className="text-xs text-emerald-500 hover:text-emerald-400 font-mono flex items-center gap-1 bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10 active:scale-95"
                  disabled={fetchingRides}
                >
                  {fetchingRides ? 'Atualizando...' : 'Atualizar'}
                </button>
              </div>

              {/* Mobile Sub-Tab Pill Controller */}
              <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/80 gap-1">
                <button
                  type="button"
                  onClick={() => setHistorySubTab('completed')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    historySubTab === 'completed' 
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/10 font-bold' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Histórico (Realizadas)
                </button>
                <button
                  type="button"
                  onClick={() => setHistorySubTab('scheduled')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    historySubTab === 'scheduled' 
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/10 font-bold' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Agendadas
                </button>
              </div>

              {fetchingRides ? (
                <div className="py-16 text-center text-zinc-500 text-xs font-mono animate-pulse">
                  Carregando dados da sua conta...
                </div>
              ) : (
                <div className="space-y-6">
                  {historySubTab === 'completed' && (
                    <>
                      {/* Financial Summary Stats and Recharts Chart - only under historical tab */}
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest font-mono">Resumo dos Últimos 30 Dias</h4>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-bold">Consolidado</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-2 text-center">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Corridas</p>
                            <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalTarifas)}
                            </p>
                          </div>
                          <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-2 text-center">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Despesas</p>
                            <p className="text-xs font-semibold text-amber-500 mt-0.5">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalDespesas)}
                            </p>
                          </div>
                          <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-2 text-center">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Total Pago</p>
                            <p className="text-xs font-semibold text-white mt-0.5">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalGeral)}
                            </p>
                          </div>
                        </div>

                        {passengerRides.length > 0 && get30DaysData().filter(item => item.gasto > 0 || item.despesas > 0).length > 0 ? (
                          <div className="h-32 w-full pt-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={get30DaysData().filter(item => item.gasto > 0 || item.despesas > 0)}
                                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                <XAxis 
                                  dataKey="formattedDate" 
                                  stroke="#52525b" 
                                  fontSize={8}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <YAxis 
                                  stroke="#52525b" 
                                  fontSize={8}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <Tooltip 
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl text-[10px] space-y-1 shadow-2xl">
                                          <p className="font-semibold text-zinc-400 font-mono">{data.formattedDate}</p>
                                          <p className="text-emerald-400">Corrida: R$ {data.gasto.toFixed(2)}</p>
                                          <p className="text-amber-500">Despesa: R$ {data.despesas.toFixed(2)}</p>
                                          <p className="font-bold text-white border-t border-zinc-800 pt-1 mt-1 font-mono">Total: R$ {data.total.toFixed(2)}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar dataKey="gasto" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="despesas" stackId="a" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-20 flex flex-col items-center justify-center text-center bg-zinc-900/20 border border-dashed border-zinc-800/80 rounded-xl p-4">
                            <p className="text-[10px] text-zinc-500">Nenhum gasto ou despesa nos últimos 30 dias.</p>
                          </div>
                        )}
                      </div>

                      {/* Render Completed/Historical List */}
                      {(() => {
                        const completedRides = passengerRides.filter((ride) => {
                          if (ride.status === 'completed') return true;
                          if (ride.scheduledDate) {
                            const scheduledDateTime = new Date(`${ride.scheduledDate}T${ride.scheduledTime || '23:59:59'}`);
                            return scheduledDateTime < new Date();
                          }
                          return false;
                        });

                        if (completedRides.length === 0) {
                          return (
                            <div className="py-12 text-center bg-[#1a1a1a] border border-zinc-800 rounded-2xl p-6 text-xs text-zinc-500">
                              Nenhuma corrida realizada encontrada no seu histórico.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Viagens Concluídas</h4>
                              <span className="text-[10px] text-zinc-600 font-mono">{completedRides.length} {completedRides.length === 1 ? 'viagem' : 'viagens'}</span>
                            </div>
                            
                            {completedRides.map((ride) => {
                              const extraExpensesTotal = (ride.expenses || []).reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);
                              return (
                                <div key={ride.id} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-4 relative hover:border-zinc-700/60 transition-all text-left">
                                  {/* Top Row - Status, Date */}
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono tracking-wider">CONCLUÍDA</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-zinc-500">
                                      {ride.scheduledDate ? ride.scheduledDate.split('-').reverse().join('/') : '-'} {ride.scheduledTime || ''}
                                    </span>
                                  </div>

                                  {/* Route Layout (Timeline Nodes) */}
                                  <div className="flex items-start gap-3 relative pl-1">
                                    {/* Vertical dashed line */}
                                    <div className="absolute left-[8px] top-2 bottom-2 w-0.5 border-l border-dashed border-zinc-700" />
                                    
                                    <div className="space-y-3 w-full">
                                      <div className="flex items-start gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
                                        <div className="text-left">
                                          <p className="text-[9px] text-zinc-500 uppercase tracking-wide font-medium">Partida</p>
                                          <p className="text-xs text-zinc-300 font-medium truncate max-w-xs">{ride.origin.split(',')[0]}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-start gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 shadow-lg shadow-emerald-500/20" />
                                        <div className="text-left">
                                          <p className="text-[9px] text-emerald-500 uppercase tracking-wide font-medium">Destino</p>
                                          <p className="text-xs text-white font-medium truncate max-w-xs">{ride.destination.split(',')[0]}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Driver Profile Bar */}
                                  <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-2.5">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white uppercase">
                                        {ride.driverName ? ride.driverName[0] : 'J'}
                                      </div>
                                      <div className="text-left">
                                        <p className="text-xs font-semibold text-zinc-300">{ride.driverName || 'João Motorista'}</p>
                                        <p className="text-[10px] text-zinc-500">VW Fox 1.0 Preto • ⭐️ 4.98</p>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700/50">PARTNER</span>
                                  </div>

                                  {/* Interactive rating */}
                                  <div className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded-xl p-2 px-3">
                                    <span className="text-[10px] font-medium text-zinc-400 font-sans">Avalie seu motorista:</span>
                                    <div className="flex gap-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          type="button"
                                          onClick={() => handleRateRide(ride.id, star)}
                                          className="p-0.5 hover:scale-115 active:scale-90 transition-transform cursor-pointer"
                                        >
                                          <Star
                                            className={`w-3.5 h-3.5 transition-colors ${
                                              star <= (ride.rating || 0)
                                                ? 'text-amber-400 fill-amber-400'
                                                : 'text-zinc-600 hover:text-amber-400/70'
                                            }`}
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Price line breakdown */}
                                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 border-t border-zinc-800/40 pt-3">
                                    <div className="flex items-center gap-1.5">
                                      <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                                      <span>Tarifa: <strong className="text-zinc-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ride.price || 0)}</strong></span>
                                    </div>
                                    {extraExpensesTotal > 0 && (
                                      <div className="flex items-center gap-1.5 justify-end">
                                        <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Adicionais: <strong className="text-amber-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(extraExpensesTotal)}</strong></span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Render logged expenses inside this completed ride */}
                                  {ride.expenses && ride.expenses.length > 0 && (
                                    <div className="pl-3 border-l-2 border-emerald-500/30 space-y-1 pt-0.5 text-left bg-zinc-950/20 py-1.5 rounded-r-lg">
                                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Recibo de Extras</p>
                                      {ride.expenses.map((exp: any) => (
                                        <div key={exp.id} className="flex justify-between items-center text-[11px] pr-2">
                                          <span className="text-zinc-400 font-mono">
                                            {exp.category ? <span className="text-emerald-500/90 font-medium">{exp.category}</span> : ''}
                                            {exp.description ? ` (${exp.description})` : ''}
                                          </span>
                                          <span className="font-semibold text-zinc-300">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.amount)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </>
                  )}

                  {historySubTab === 'scheduled' && (
                    /* Render Scheduled/Future List */
                    (() => {
                      const scheduledRides = passengerRides.filter((ride) => {
                        if (ride.status === 'completed') return false;
                        if (ride.scheduledDate) {
                          const scheduledDateTime = new Date(`${ride.scheduledDate}T${ride.scheduledTime || '23:59:59'}`);
                          return scheduledDateTime >= new Date();
                        }
                        return true;
                      });

                      if (scheduledRides.length === 0) {
                        return (
                          <div className="py-16 text-center bg-zinc-900/20 border border-dashed border-zinc-800/80 rounded-2xl p-6 text-xs text-zinc-500">
                            Nenhum agendamento futuro ativo. Encontre um novo destino para programar!
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest font-mono">Próximos Agendamentos</h4>
                            <span className="text-[10px] text-zinc-600 font-mono">{scheduledRides.length} ativo</span>
                          </div>

                          {scheduledRides.map((ride) => {
                            const extraExpensesTotal = (ride.expenses || []).reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);
                            return (
                              <div key={ride.id} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-4 relative hover:border-zinc-700 transition-colors text-left">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded">
                                      Confirmada
                                    </span>
                                    <p className="text-xs text-zinc-500 mt-2 font-mono">Roteiro</p>
                                    <p className="text-sm font-medium text-white text-left mt-0.5">
                                      {ride.origin.split(',')[0]} → {ride.destination.split(',')[0]}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCompletePassengerRide(ride.id)}
                                      className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 rounded text-xs font-semibold flex items-center gap-1 border border-emerald-500/10 px-2.5 py-1.5 transition-all active:scale-95"
                                      title="Marcar como Concluída"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Concluir</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelPassengerRide(ride.id)}
                                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-xl transition-colors active:scale-90"
                                      title="Cancelar Agendamento"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 border-t border-zinc-800/60 pt-3 text-left">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>{ride.scheduledDate ? ride.scheduledDate.split('-').reverse().join('/') : '-'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>{ride.scheduledTime || '-'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>
                                      Tarifa: <span className="font-semibold text-zinc-300">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ride.price || 0)}
                                      </span>
                                    </span>
                                  </div>
                                  {extraExpensesTotal > 0 && (
                                    <div className="flex items-center gap-1.5">
                                      <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                                      <span>
                                        Extras: <span className="font-semibold text-amber-500">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(extraExpensesTotal)}
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Listed Additional Expenses */}
                                {ride.expenses && ride.expenses.length > 0 && (
                                  <div className="pl-3 border-l-2 border-amber-500/50 space-y-1.5 text-left bg-zinc-950/20 py-1.5 rounded-r-lg">
                                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Despesas Registradas</p>
                                    {ride.expenses.map((exp: any) => (
                                      <div key={exp.id} className="flex justify-between items-center text-xs pr-2">
                                        <span className="text-zinc-400 font-mono">
                                          {exp.category ? (
                                            <>
                                              <span className="text-amber-500/90 font-semibold">{exp.category}</span>
                                              {exp.description ? ` (${exp.description})` : ''}
                                            </>
                                          ) : (
                                            exp.description
                                          )}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-amber-500 font-mono">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.amount)}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteExpense(ride.id, exp.id)}
                                            className="text-zinc-600 hover:text-red-400 font-bold px-1 text-sm shrink-0 active:scale-95"
                                            title="Excluir despesa"
                                          >
                                            &times;
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Inline expense addition form */}
                                {selectedRideId === ride.id && showExpenseForm ? (
                                  <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-3 animate-in fade-in duration-200 text-left">
                                    <p className="text-[11px] font-semibold text-white uppercase tracking-wider">Adicionar Despesa Adicional (Pedágio, etc)</p>
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-zinc-400 font-medium">Categoria</label>
                                          <select
                                            value={expenseCategory}
                                            onChange={(e) => setExpenseCategory(e.target.value)}
                                            className="bg-[#1a1a1a] border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500 w-full"
                                          >
                                            <option value="Pedágio">Pedágio</option>
                                            <option value="Gorjeta">Gorjeta</option>
                                            <option value="Estacionamento">Estacionamento</option>
                                            <option value="Outros">Outros</option>
                                          </select>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-zinc-400 font-medium">Valor (R$)</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0,00"
                                            value={expenseAmount}
                                            onChange={(e) => setExpenseAmount(e.target.value)}
                                            className="bg-[#1a1a1a] border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500 w-full"
                                            required
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] text-zinc-400 font-medium">Observação (opcional)</label>
                                        <input
                                          type="text"
                                          placeholder="ex: Ayrton Senna, Excelente serviço"
                                          value={expenseDescription}
                                          onChange={(e) => setExpenseDescription(e.target.value)}
                                          className="bg-[#1a1a1a] border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-amber-500 w-full"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2 text-xs pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowExpenseForm(false);
                                          setSelectedRideId(null);
                                        }}
                                        className="px-3 py-1.5 rounded text-zinc-400 hover:text-white"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveExpense(ride)}
                                        className="bg-amber-500 text-black font-semibold px-3.5 py-1.5 rounded-lg hover:bg-amber-400 transition-colors"
                                      >
                                        Salvar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-start items-center mt-1 border-t border-zinc-800/40 pt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedRideId(ride.id);
                                        setShowExpenseForm(true);
                                        setExpenseCategory('Pedágio');
                                        setExpenseDescription('');
                                        setExpenseAmount('');
                                      }}
                                      className="text-[11px] text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1 active:scale-95"
                                    >
                                      + Adicionar Despesa (pedágio, gorjeta, etc)
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Mobile Bottom Navigation Bar */}
        {!needsAuth && (
          <div className="bg-[#1a1a1a] border-t border-zinc-900 py-3 px-8 flex items-center justify-around z-30 shadow-2xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('book')}
              className={`flex flex-col items-center gap-1 transition-all active:scale-90 duration-200 ${
                activeTab === 'book' ? 'text-emerald-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Car className="w-5 h-5" />
              <span className="text-[10px] tracking-wider font-mono">Nova Corrida</span>
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center gap-1 transition-all active:scale-90 duration-200 relative ${
                activeTab === 'history' ? 'text-emerald-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="text-[10px] tracking-wider font-mono">Minhas Corridas</span>
              {passengerRides.length > 0 && (
                <span className="absolute top-0 right-4 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
