import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Clock, CreditCard, ChevronRight, CheckCircle2, User as UserIcon } from 'lucide-react';
import { initAuth, googleSignIn, logout } from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';

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

  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    initAuth(
      (u) => {
        setUser(u);
        setNeedsAuth(false);
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
      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setSimulation(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!simulation) return;
    setLoading(true);
    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          passengerName: user?.displayName || 'Passageiro',
          passengerEmail: user?.email || '',
          origin,
          destination,
          stops: stops.filter(s => s.trim() !== ''),
          scheduledDate,
          scheduledTime,
          distanceKm: simulation.distanceKm,
          timeMins: simulation.timeMins,
          price: simulation.price,
          netProfit: simulation.profitability.netProfit
        })
      });
      if (response.ok) {
        setBooked(true);
      } else {
        alert('Erro ao agendar corrida. Tente novamente.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão ao agendar corrida.');
    } finally {
      setLoading(false);
    }
  };

  if (booked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6">
        <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-6" />
        <h2 className="text-2xl font-medium mb-2">Corrida Agendada!</h2>
        <p className="text-zinc-400 text-center mb-8">O motorista foi notificado por email e chegará em breve.</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-white text-black px-6 py-3 rounded-full font-medium"
        >
          Agendar Nova Corrida
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-zinc-800">
      <div className="max-w-md mx-auto h-screen flex flex-col bg-[#111] shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <header className="px-6 pt-12 pb-6 bg-[#1a1a1a] border-b border-zinc-800">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate('/')} className="text-sm text-zinc-400 hover:text-white transition-colors">
              Voltar
            </button>
            <span className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded text-zinc-400">DriverMetrics Pro</span>
          </div>
          <h1 className="text-2xl font-medium text-white tracking-tight">Reservar Corrida</h1>
          <p className="text-sm text-zinc-500 mt-1">Preço exato, sem surpresas.</p>
        </header>

        {/* Input Form */}
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
          ) : (
            <form onSubmit={handleSimulate} className="space-y-4 relative">
              <div className="absolute left-6 top-[72px] bottom-[104px] w-px bg-zinc-800" />
              
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <UserIcon className="w-4 h-4" />
                  <span>{user?.displayName}</span>
                </div>
                <button type="button" onClick={logout} className="text-xs text-zinc-500 hover:text-white transition-colors">Sair</button>
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

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 focus-within:border-white transition-colors">
                  <input 
                    type="date" 
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-600"
                  />
                </div>
                <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 focus-within:border-white transition-colors">
                  <input 
                    type="time" 
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    className="bg-transparent border-none outline-none text-white w-full placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || !origin || !destination}
                className="w-full bg-white text-black font-medium rounded-xl py-4 mt-6 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
              >
                {loading ? 'Calculando...' : 'Ver Preço'}
              </button>
            </form>
          )}

          {/* Simulation Results */}
          {simulation && !loading && !needsAuth && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-4">Resumo da Viagem</h3>
              
              <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl p-5 mb-6">
                <div className="flex justify-between items-end mb-6">
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

                <div className="flex items-center gap-4 text-sm text-zinc-400 border-t border-zinc-800 pt-4">
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
        </div>
      </div>
    </div>
  );
}
