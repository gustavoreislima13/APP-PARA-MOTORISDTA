import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, DollarSign, Activity, Route, MapPin, Calculator, LogOut, Settings, Smartphone, Bell, Check, X, Clock } from 'lucide-react';
import { initAuth, googleSignIn, logout } from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'passenger-app' | 'diary' | 'garage'>('overview');
  const [kmGoal, setKmGoal] = useState('3000');
  const [hourlyRate, setHourlyRate] = useState('30');
  const [profitPerKm, setProfitPerKm] = useState('0.50');
  const [averageConsumption, setAverageConsumption] = useState('12.5');
  const [maintenanceReserve, setMaintenanceReserve] = useState('0.15');
  
  // New Config State
  const [netIncomeGoal, setNetIncomeGoal] = useState('5000');
  const [workDays, setWorkDays] = useState('22');
  const [carPayment, setCarPayment] = useState('0');
  const [insurance, setInsurance] = useState('0');
  const [ipva, setIpva] = useState('0');
  const [internet, setInternet] = useState('0');
  const [tires, setTires] = useState('0');
  const [vehicleMake, setVehicleMake] = useState('Geral');
  const [vehicleModel, setVehicleModel] = useState('Carro');

  const [customUrl, setCustomUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Simulator State
  const [simOrigin, setSimOrigin] = useState('');
  const [simDestination, setSimDestination] = useState('');
  const [simDistance, setSimDistance] = useState('');
  const [simTime, setSimTime] = useState('');
  const [simPrice, setSimPrice] = useState<any>(null);
  const [simMode, setSimMode] = useState<'address' | 'manual'>('address');

  const [toast, setToast] = useState<{title: string, message: string} | null>(null);
  const [prevLatestRideId, setPrevLatestRideId] = useState<number | null>(null);

  useEffect(() => {
    if (stats && stats.rides && stats.rides.length > 0) {
      const latestRide = stats.rides[0];
      if (prevLatestRideId !== null && latestRide.id !== prevLatestRideId && latestRide.status === 'scheduled') {
        setToast({
          title: 'Nova Solicitação',
          message: `Nova corrida de ${latestRide.origin} para ${latestRide.destination}!`
        });
        setTimeout(() => setToast(null), 8000);
      }
      setPrevLatestRideId(latestRide.id);
    }
  }, [stats, prevLatestRideId]);

  useEffect(() => {
    initAuth(
      (user) => {
        setUser(user);
        setNeedsAuth(false);
        fetchDashboardStats(user.uid, user.email || '', user.displayName || '');
      },
      () => {
        setNeedsAuth(true);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (user && activeTab === 'overview') {
      fetchDashboardStats(user.uid, user.email || '', user.displayName || '');
      
      const interval = setInterval(() => {
        fetchDashboardStats(user.uid, user.email || '', user.displayName || '');
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user, activeTab]);

  const fetchDashboardStats = (uid: string, email: string = '', name: string = '') => {
    fetch(`/api/dashboard/${uid}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          // New driver, save profile initially
          saveProfile(uid, email || user?.email || '', name || user?.displayName || '');
        } else {
          setStats(data);
          setKmGoal(data.vehicle?.monthly_km_goal?.toString() || '3000');
          setHourlyRate(data.driver?.desired_hourly_rate?.toString() || '30');
          setProfitPerKm(data.driver?.desired_profit_per_km?.toString() || '0.50');
          setAverageConsumption(data.vehicle?.average_consumption_km_l?.toString() || '12.5');
          setMaintenanceReserve(data.vehicle?.maintenance_reserve_per_km?.toString() || '0.15');
          
          setNetIncomeGoal(data.driver?.net_income_goal_monthly?.toString() || '5000');
          setWorkDays(data.driver?.work_days_per_month?.toString() || '22');
          setCarPayment(data.vehicle?.car_payment_monthly?.toString() || '0');
          setInsurance(data.vehicle?.insurance_monthly?.toString() || '0');
          setIpva(data.vehicle?.ipva_yearly?.toString() || '0');
          setInternet(data.vehicle?.internet_monthly?.toString() || '0');
          setTires(data.vehicle?.tires_total?.toString() || '0');
          setVehicleMake(data.vehicle?.make || 'Geral');
          setVehicleModel(data.vehicle?.model || 'Carro');

          setCustomUrl(data.driver?.custom_url || '');
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const saveProfile = async (uid: string, email: string, name: string) => {
    setSavingSettings(true);
    try {
      await fetch('/api/driver/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: uid,
          email,
          name,
          monthly_km_goal: Number(kmGoal),
          desired_hourly_rate: Number(hourlyRate),
          desired_profit_per_km: Number(profitPerKm),
          average_consumption_km_l: Number(averageConsumption),
          maintenance_reserve_per_km: Number(maintenanceReserve),
          net_income_goal_monthly: Number(netIncomeGoal),
          work_days_per_month: Number(workDays),
          car_payment_monthly: Number(carPayment),
          insurance_monthly: Number(insurance),
          ipva_yearly: Number(ipva),
          internet_monthly: Number(internet),
          tires_total: Number(tires),
          vehicle_make: vehicleMake,
          vehicle_model: vehicleModel,
          custom_url: customUrl || uid.slice(0, 8)
        })
      });
      fetchDashboardStats(uid);
      setActiveTab('overview');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        fetchDashboardStats(result.user.uid, result.user.email || '', result.user.displayName || '');
      }
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        alert('O login foi cancelado ou o pop-up foi bloqueado pelo navegador. Tente novamente.');
      } else {
        console.error('Login failed:', err);
      }
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setNeedsAuth(true);
    setUser(null);
    setStats(null);
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stats?.driver?.custom_url) return;
    try {
      const payload: any = { driverId: stats.driver.custom_url };
      if (simMode === 'address') {
        payload.origin = simOrigin;
        payload.destination = simDestination;
      } else {
        payload.origin = 'Origem Manual';
        payload.destination = 'Destino Manual';
        payload.distanceKm = Number(simDistance);
        payload.timeMins = Number(simTime);
      }

      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setSimPrice(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="bg-[#111] border border-zinc-800 p-8 rounded-2xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-medium text-white mb-2">Painel do Motorista</h1>
          <p className="text-zinc-400 text-sm mb-8">Faça login para gerenciar suas corridas e faturamento.</p>
          
          <button onClick={handleLogin} className="w-full bg-white text-black font-medium py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-zinc-200 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-500" />
          <span className="text-zinc-500 font-mono">Carregando métricas...</span>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // --- Calculate Detailed Metrics ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const rides = stats?.rides || [];
  
  let timeOnRoadMins = 0;
  let kmToday = 0;
  let kmWeek = 0;
  let profitToday = 0;
  let revenueWeek = 0;
  let profitMonth = 0;
  let fuelCostToday = 0;
  
  const avgConsumption = Number(averageConsumption) || 12.5;
  // Note: we can use actual distance to calculate fuel cost if not saved
  // fuelCost = (distance / consumption) * 5.50 (assumed fuel price in server)
  const FUEL_PRICE = 5.50;

  rides.forEach((r: any) => {
    if (r.status !== 'completed') return;
    
    const d = new Date(r.createdAt);
    const distance = Number(r.distance_km);
    const time = Number(r.estimated_time_mins);
    const profit = Number(r.net_profit);
    const price = Number(r.price);
    const fuel = (distance / avgConsumption) * FUEL_PRICE;

    if (d >= today) {
      timeOnRoadMins += time;
      kmToday += distance;
      profitToday += profit;
      fuelCostToday += fuel;
    }
    
    if (d >= startOfWeek) {
      kmWeek += distance;
      revenueWeek += price;
    }
    
    if (d >= startOfMonth) {
      profitMonth += profit;
    }
  });

  const hoursOnRoad = Math.floor(timeOnRoadMins / 60);
  const minsOnRoad = Math.round(timeOnRoadMins % 60);
  const timeOnRoadStr = `${hoursOnRoad.toString().padStart(2, '0')}:${minsOnRoad.toString().padStart(2, '0')}:00`;

  const monthlyGoal = Number(netIncomeGoal) || 5000;
  const monthlyProgress = Math.min((profitMonth / monthlyGoal) * 100, 100).toFixed(1);
  const remainingMonth = Math.max(monthlyGoal - profitMonth, 0);

  const weeklyGoal = monthlyGoal / 4; // Approx 4 weeks
  const remainingWeek = Math.max(weeklyGoal - revenueWeek, 0); // User requested weekly goal compared to revenue or profit? Usually profit, but prompt says "Atual: R$ -209" let's just use profitMonth for now or profitWeek. I'll use revenueWeek just for display or profit. Wait, the prompt says "Meta Semanal ... Atual: -209.68". This implies profit.
  let profitWeek = 0;
  rides.forEach((r:any) => { if(r.status === 'completed' && new Date(r.createdAt) >= startOfWeek) profitWeek += Number(r.net_profit); });
  const weeklyProfitRemaining = Math.max(weeklyGoal - profitWeek, 0);

  const dailyGoal = monthlyGoal / (Number(workDays) || 22);
  const remainingDay = Math.max(dailyGoal - profitToday, 0);

  const expensesWeekVars = kmWeek * ((FUEL_PRICE / avgConsumption) + Number(maintenanceReserve));

  const profitPerHour = timeOnRoadMins > 0 ? (profitToday / (timeOnRoadMins / 60)) : 0;
  const profitPerKmToday = kmToday > 0 ? (profitToday / kmToday) : 0;

  // Chart data for past 7 days
  const last7DaysData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    let dayRev = 0;
    
    rides.forEach((r: any) => {
      if (r.status === 'completed') {
        const rd = new Date(r.createdAt);
        if (rd.getDate() === d.getDate() && rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear()) {
          dayRev += Number(r.price);
        }
      }
    });
    last7DaysData.push({ name: dateStr, faturamento: dayRev });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-zinc-800 flex flex-col md:flex-row relative">
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 z-50 bg-[#111] border border-emerald-500/30 p-4 rounded-xl shadow-2xl flex gap-4 items-start max-w-sm"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell className="w-5 h-5 text-emerald-500 animate-pulse" />
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">{toast.title}</h4>
              <p className="text-sm text-zinc-400">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-white transition-colors ml-2">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#111] border-r border-zinc-800 p-6 flex flex-col">
        <div className="mb-8">
          <h2 className="text-xl font-medium text-white tracking-tight">DriverMetrics Pro</h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">{stats?.vehicle?.make} {stats?.vehicle?.model}</p>
        </div>

        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 ${activeTab === 'overview' ? 'bg-zinc-800/50 text-white' : 'text-zinc-400 hover:bg-zinc-900'} px-4 py-2.5 rounded-lg text-sm font-medium transition-colors`}>
            <LayoutDashboard className="w-4 h-4" /> Visão Geral
          </button>
          <button onClick={() => setActiveTab('diary')} className={`w-full flex items-center gap-3 ${activeTab === 'diary' ? 'bg-zinc-800/50 text-white' : 'text-zinc-400 hover:bg-zinc-900'} px-4 py-2.5 rounded-lg text-sm transition-colors`}>
            <Route className="w-4 h-4" /> Diário de Bordo & Rotas
          </button>
          <button onClick={() => setActiveTab('garage')} className={`w-full flex items-center gap-3 ${activeTab === 'garage' ? 'bg-zinc-800/50 text-white' : 'text-zinc-400 hover:bg-zinc-900'} px-4 py-2.5 rounded-lg text-sm transition-colors`}>
            <Calculator className="w-4 h-4" /> Minha Garagem
          </button>
          <button onClick={() => setActiveTab('passenger-app')} className={`w-full flex items-center gap-3 ${activeTab === 'passenger-app' ? 'bg-zinc-800/50 text-white' : 'text-zinc-400 hover:bg-zinc-900'} px-4 py-2.5 rounded-lg text-sm transition-colors`}>
            <Smartphone className="w-4 h-4" /> App Passageiro
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 ${activeTab === 'settings' ? 'bg-zinc-800/50 text-white' : 'text-zinc-400 hover:bg-zinc-900'} px-4 py-2.5 rounded-lg text-sm transition-colors`}>
            <Settings className="w-4 h-4" /> Configurações Gerais
          </button>
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 text-zinc-400 hover:bg-zinc-900 hover:text-white px-4 py-2.5 rounded-lg text-sm transition-colors mt-6">
            <Route className="w-4 h-4" /> Voltar ao Início
          </button>
        </nav>

        <div className="mt-8 pt-6 border-t border-zinc-800">
          <button onClick={handleLogout} className="flex items-center gap-3 text-zinc-400 hover:text-red-400 transition-colors w-full">
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        {activeTab === 'settings' && (
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10">
              <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Configurações</h1>
              <p className="text-zinc-500">Ajuste suas metas e link personalizado.</p>
            </header>

            <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl space-y-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Link Personalizado (URL)</label>
                <div className="flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-lg focus-within:border-white transition-colors overflow-hidden">
                  <span className="px-4 text-zinc-500 border-r border-zinc-800 bg-zinc-900/50">/reservar/</span>
                  <input 
                    type="text" 
                    value={customUrl}
                    onChange={e => setCustomUrl(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-white px-4 py-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Ganho Desejado (R$/Hora)</label>
                  <input 
                    type="number" 
                    value={hourlyRate}
                    onChange={e => setHourlyRate(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Ganho Mín. (R$/KM)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={profitPerKm}
                    onChange={e => setProfitPerKm(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Meta Renda Líquida (Mês)</label>
                  <input 
                    type="number" 
                    value={netIncomeGoal}
                    onChange={e => setNetIncomeGoal(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Dias Trabalhados (Mês)</label>
                  <input 
                    type="number" 
                    value={workDays}
                    onChange={e => setWorkDays(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>
              
              <button 
                onClick={() => saveProfile(user!.uid, user!.email!, user!.displayName!)}
                disabled={savingSettings}
                className="w-full bg-emerald-500 text-black font-medium py-3 rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                {savingSettings ? 'Salvando...' : 'Salvar Configurações Gerais'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'garage' && (
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10">
              <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Minha Garagem</h1>
              <p className="text-zinc-500">Configure seu veículo e depreciação.</p>
            </header>

            <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Marca do Veículo</label>
                  <input 
                    type="text" 
                    value={vehicleMake}
                    onChange={e => setVehicleMake(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Modelo</label>
                  <input 
                    type="text" 
                    value={vehicleModel}
                    onChange={e => setVehicleModel(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Consumo (KM/L)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={averageConsumption}
                    onChange={e => setAverageConsumption(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Meta KM Mensal</label>
                  <input 
                    type="number" 
                    value={kmGoal}
                    onChange={e => setKmGoal(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-800">
                <h3 className="text-white font-medium mb-4">Despesas Fixas & Depreciação</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Parcela do Carro (Mensal)</label>
                    <input 
                      type="number" 
                      value={carPayment}
                      onChange={e => setCarPayment(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Seguro (Mensal)</label>
                    <input 
                      type="number" 
                      value={insurance}
                      onChange={e => setInsurance(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">IPVA (Anual)</label>
                    <input 
                      type="number" 
                      value={ipva}
                      onChange={e => setIpva(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Internet/Celular (Mensal)</label>
                    <input 
                      type="number" 
                      value={internet}
                      onChange={e => setInternet(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Jogo de Pneus (Total Anual)</label>
                    <input 
                      type="number" 
                      value={tires}
                      onChange={e => setTires(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Manutenção (R$/KM)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={maintenanceReserve}
                      onChange={e => setMaintenanceReserve(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => saveProfile(user!.uid, user!.email!, user!.displayName!)}
                disabled={savingSettings}
                className="w-full bg-emerald-500 text-black font-medium py-3 rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50 mt-6"
              >
                {savingSettings ? 'Salvando...' : 'Salvar Veículo'}
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'overview' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
              <div>
                <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Olá, {user?.displayName?.split(' ')[0] || 'Motorista'}</h1>
                <p className="text-emerald-500 font-mono text-sm mb-2">{user?.email}</p>
                <p className="text-zinc-500">Gestão analítica e cálculo exato de custos.</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-zinc-500 mb-1">Seu link para clientes:</p>
                <a href={`/reservar/${stats?.driver?.custom_url}`} target="_blank" rel="noreferrer" className="text-sm text-emerald-500 hover:underline font-mono">
                  {window.location.host}/reservar/{stats?.driver?.custom_url}
                </a>
              </div>
            </header>

            {/* Detailed Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              
              {/* Tempo na Rua */}
              <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl">
                <p className="text-sm text-zinc-500 mb-1">Tempo na Rua</p>
                <h2 className="text-3xl font-medium text-white mb-2">{timeOnRoadStr}</h2>
                <div className="text-xs text-emerald-500 font-mono">Duração diária</div>
              </div>

              {/* Meta Mensal */}
              <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl">
                <p className="text-sm text-zinc-500 mb-1">Meta de Renda Líquida (Mês)</p>
                <h2 className="text-3xl font-medium text-white mb-1">{monthlyProgress}%</h2>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-2">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${monthlyProgress}%` }}></div>
                </div>
                <div className="flex justify-between text-xs font-mono text-zinc-500">
                  <span>Atual: {formatCurrency(profitMonth)}</span>
                  <span>Falta: {formatCurrency(remainingMonth)}</span>
                </div>
              </div>

              {/* Meta Semanal */}
              <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl">
                <p className="text-sm text-zinc-500 mb-1 uppercase tracking-widest text-[10px]">Meta Semanal</p>
                <h2 className="text-2xl font-medium text-white mb-2">{formatCurrency(weeklyGoal)}</h2>
                <div className="flex justify-between text-xs font-mono text-zinc-500">
                  <span>Atual: {formatCurrency(profitWeek)}</span>
                  <span>Falta: {formatCurrency(weeklyProfitRemaining)}</span>
                </div>
              </div>

              {/* Meta Diária */}
              <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl">
                <p className="text-sm text-zinc-500 mb-1 uppercase tracking-widest text-[10px]">Meta Diária</p>
                <h2 className="text-2xl font-medium text-white mb-2">{formatCurrency(dailyGoal)}</h2>
                <div className="flex justify-between text-xs font-mono text-zinc-500">
                  <span>Atual: {formatCurrency(profitToday)}</span>
                  <span>Falta: {formatCurrency(remainingDay)}</span>
                </div>
              </div>

              {/* Faturamento Semana */}
              <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl">
                <p className="text-sm text-zinc-500 mb-1">Faturamento (Semana)</p>
                <h2 className="text-2xl font-medium text-white mb-2">{formatCurrency(revenueWeek)}</h2>
              </div>

              {/* KM Rodados */}
              <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl flex flex-col justify-between">
                <div>
                  <p className="text-sm text-zinc-500 mb-1">KM Rodados</p>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs text-zinc-500">Hoje</span>
                    <span className="text-xl font-medium text-white">{kmToday.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-zinc-500">Na semana</span>
                    <span className="text-xl font-medium text-white">{kmWeek.toFixed(1)} km</span>
                  </div>
                </div>
              </div>

              {/* Lucro Líquido Diário */}
              <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl relative overflow-hidden bg-gradient-to-br from-[#111] to-emerald-900/10">
                <p className="text-sm text-zinc-500 mb-1">Lucro Líquido (Diário)</p>
                <h2 className="text-3xl font-medium text-emerald-400 mb-2">{formatCurrency(profitToday)}</h2>
                <div className="flex justify-between text-xs font-mono text-emerald-500/70">
                  <span>R$/Hora: {formatCurrency(profitPerHour)}</span>
                  <span>R$/KM: {formatCurrency(profitPerKmToday)}</span>
                </div>
              </div>

              {/* Despesas */}
              <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl">
                <p className="text-sm text-zinc-500 mb-1">Despesas (Semana)</p>
                <h2 className="text-2xl font-medium text-red-400 mb-2">{formatCurrency(expensesWeekVars)}</h2>
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Apenas variáveis registradas</div>
                <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-xs text-zinc-500">Combustível (Diário)</span>
                  <span className="text-sm font-medium text-white">{formatCurrency(fuelCostToday)}</span>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-2 flex flex-col gap-8">
                {/* Chart */}
                <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl">
                  <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-6">Faturamento (Últimos 7 dias)</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={last7DaysData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis 
                          dataKey="name" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#71717a', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: '#27272a' }}
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', padding: '12px' }}
                          itemStyle={{ color: '#10b981', fontWeight: 500 }}
                          formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                          labelStyle={{ display: 'none' }}
                        />
                        <Bar 
                          dataKey="faturamento" 
                          fill="#10b981" 
                          radius={[4, 4, 4, 4]}
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Active Solicitations */}
                <div>
                  <h3 className="text-sm font-medium text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Solicitações Ativas
                  </h3>
                  <div className="bg-[#111] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                    {stats?.rides?.filter((r: any) => ['scheduled', 'in_progress'].includes(r.status)).length === 0 ? (
                      <div className="p-8 text-center text-zinc-500 text-sm">Nenhuma solicitação ativa no momento.</div>
                    ) : (
                      <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
                        {stats?.rides?.filter((r: any) => ['scheduled', 'in_progress'].includes(r.status)).map((ride: any) => (
                          <div key={ride.id} className={`p-5 flex flex-col sm:flex-row gap-4 justify-between hover:bg-zinc-900/80 transition-colors ${ride.status === 'in_progress' ? 'border-l-2 border-emerald-500' : ''}`}>
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${ride.status === 'scheduled' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                                <MapPin className={`w-4 h-4 ${ride.status === 'scheduled' ? 'text-amber-500' : 'text-emerald-500'}`} />
                              </div>
                              <div>
                                {ride.scheduled_time && (
                                  <div className="flex items-center gap-2 mb-2 text-xs font-medium text-amber-500 bg-amber-500/10 w-fit px-2 py-1 rounded border border-amber-500/20">
                                    <Clock className="w-3 h-3" />
                                    Agendado para: {new Date(ride.scheduled_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                  </div>
                                )}
                                <div className="flex items-center gap-3 mb-2">
                                  <p className="text-base font-medium text-white flex items-center gap-2">
                                    {ride.passenger_name ? (
                                      <>
                                        <span className="text-white">{ride.passenger_name}</span>
                                        {ride.passenger_email && <span className="text-xs text-zinc-500 font-normal hidden md:inline">({ride.passenger_email})</span>}
                                      </>
                                    ) : (
                                      <span className="text-zinc-400">Passageiro Desconhecido</span>
                                    )}
                                  </p>
                                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${ride.status === 'scheduled' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                                    {ride.status === 'scheduled' ? 'Pendente' : 'Confirmado'}
                                  </span>
                                </div>
                                <div className="space-y-1 mb-3">
                                  <p className="text-sm text-zinc-300">
                                    <span className="text-zinc-500 inline-block w-8">De:</span> {ride.origin}
                                  </p>
                                  {ride.stops && ride.stops.length > 0 && (
                                    <div className="text-sm text-zinc-400 pl-8 border-l border-zinc-800 ml-1 py-1 space-y-1">
                                      {ride.stops.map((stop: string, i: number) => (
                                        <p key={i} className="">
                                          <span className="text-zinc-600">Parada {i + 1}:</span> {stop}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  <p className="text-sm text-zinc-300">
                                    <span className="text-zinc-500 inline-block w-8">Para:</span> {ride.destination}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-400 bg-zinc-900/50 inline-flex px-3 py-1.5 rounded-full border border-zinc-800">
                                  <span>{ride.distance_km} km</span>
                                  <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                  <span>{ride.estimated_time_mins} min</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-zinc-800 pt-4 sm:pt-0 sm:pl-6 gap-3">
                              <div className="text-left sm:text-right">
                                <p className="text-xl font-medium text-white">{formatCurrency(ride.price)}</p>
                                <p className="text-xs text-emerald-500">+{formatCurrency(ride.net_profit)} lucro</p>
                              </div>
                              <div className="flex flex-col gap-2">
                                {ride.status === 'scheduled' && (
                                  <>
                                    <button 
                                      onClick={() => {
                                        fetch(`/api/rides/${ride.id}/accept`, { method: 'POST' })
                                          .then(() => fetchDashboardStats(user?.uid || ''))
                                      }}
                                      className="flex items-center justify-center gap-2 bg-emerald-500 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-400 transition-colors w-full"
                                    >
                                      <Check className="w-4 h-4" /> Aceitar
                                    </button>
                                    <button 
                                      onClick={() => {
                                        fetch(`/api/rides/${ride.id}/cancel`, { method: 'POST' })
                                          .then(() => fetchDashboardStats(user?.uid || ''))
                                      }}
                                      className="flex items-center justify-center gap-2 bg-zinc-800 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 hover:text-white transition-colors w-full"
                                    >
                                      <X className="w-4 h-4" /> Recusar
                                    </button>
                                  </>
                                )}
                                {ride.status === 'in_progress' && (
                                  <>
                                    <button 
                                      onClick={() => {
                                        fetch(`/api/rides/${ride.id}/complete`, { method: 'POST' })
                                          .then(() => fetchDashboardStats(user?.uid || ''))
                                      }}
                                      className="flex items-center justify-center gap-2 bg-emerald-500 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-400 transition-colors w-full"
                                    >
                                      Concluir Viagem
                                    </button>
                                    <button 
                                      onClick={() => {
                                        fetch(`/api/rides/${ride.id}/cancel`, { method: 'POST' })
                                          .then(() => fetchDashboardStats(user?.uid || ''))
                                      }}
                                      className="flex items-center justify-center gap-2 bg-zinc-800 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 hover:text-white transition-colors w-full"
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Simulator Panel */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-6">Simulador de Corrida</h3>
                <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl">
                  <div className="flex gap-2 mb-6">
                    <button 
                      onClick={() => setSimMode('address')}
                      className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${simMode === 'address' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Por Endereço
                    </button>
                    <button 
                      onClick={() => setSimMode('manual')}
                      className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${simMode === 'manual' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Manual
                    </button>
                  </div>

                  <form onSubmit={handleSimulate} className="space-y-4">
                    {simMode === 'address' ? (
                      <>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Origem</label>
                          <input 
                            type="text" 
                            value={simOrigin}
                            onChange={e => setSimOrigin(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-zinc-500 transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Destino</label>
                          <input 
                            type="text" 
                            value={simDestination}
                            onChange={e => setSimDestination(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-zinc-500 transition-colors"
                            required
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Distância Estimada (km)</label>
                          <input 
                            type="number" 
                            value={simDistance}
                            onChange={e => setSimDistance(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-zinc-500 transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Tempo Estimado (min)</label>
                          <input 
                            type="number" 
                            value={simTime}
                            onChange={e => setSimTime(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-zinc-500 transition-colors"
                            required
                          />
                        </div>
                      </>
                    )}
                    <button type="submit" className="w-full bg-white text-black font-medium py-2 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                      <Calculator className="w-4 h-4" /> Simular Custo
                    </button>
                  </form>

                  {simPrice && (
                    <div className="mt-6 pt-6 border-t border-zinc-800 animate-in fade-in">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-zinc-400">Preço Sugerido (Passageiro)</span>
                        <span className="text-lg font-medium text-white">{formatCurrency(simPrice.price)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-zinc-400">Custo Total (Motorista)</span>
                        <span className="text-sm font-medium text-red-400">-{formatCurrency(simPrice.profitability.costs.totalCost)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-800/50 mt-2">
                        <span className="text-sm font-medium text-zinc-300">Lucro Líquido Previsto</span>
                        <span className={`text-lg font-medium ${simPrice.profitability.isProfitable ? 'text-emerald-500' : 'text-red-500'}`}>
                          {formatCurrency(simPrice.profitability.netProfit)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'passenger-app' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
            <header className="mb-6 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Web App Passageiro</h1>
                <p className="text-zinc-500">Configure o seu link e envie para seus clientes.</p>
              </div>
            </header>

            <div className="bg-[#1a1a1a] border border-zinc-800 rounded-lg p-6 mb-8 flex flex-col gap-4">
              <h3 className="text-white font-medium text-lg">Seu link oficial:</h3>
              <p className="text-zinc-400 text-sm">Este é o link do seu aplicativo. Ao acessar, os passageiros poderão inserir a origem e o destino para calcular o valor da corrida automaticamente com base na sua configuração de R$/hora e consumo do veículo.</p>
              <div className="flex items-center justify-between bg-black p-4 rounded-lg border border-zinc-800 mt-2">
                <span className="font-mono text-emerald-500 text-sm break-all">{window.location.origin}/reservar/{stats?.driver?.custom_url || customUrl}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/reservar/${stats?.driver?.custom_url || customUrl}`);
                    alert('Link copiado! Envie para seus clientes pelo WhatsApp.');
                  }}
                  className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors ml-4 shrink-0"
                >
                  Copiar Link
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#111] border border-zinc-800 rounded-xl p-6">
                <h3 className="text-emerald-500 font-medium mb-2">Como funciona?</h3>
                <ul className="text-zinc-400 text-sm space-y-3 list-disc pl-5">
                  <li>Envie o seu link acima para um passageiro.</li>
                  <li>O passageiro acessa pelo celular dele, sem precisar baixar nenhum aplicativo.</li>
                  <li>Ele insere o destino e solicita a viagem.</li>
                  <li>A viagem aparecerá instantaneamente no seu <strong>Painel de Visão Geral</strong>.</li>
                </ul>
              </div>

              <div className="bg-[#111] border border-zinc-800 rounded-xl p-6">
                <h3 className="text-emerald-500 font-medium mb-2">Totalmente integrado</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  O valor que o passageiro visualiza já inclui a sua margem de lucro por hora e o desconto dos custos do seu veículo. Você não precisa calcular nada de cabeça, o sistema faz a conta exata para garantir que a corrida seja lucrativa para você.
                </p>
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500">Dica: Adicione o seu link na bio do Instagram ou como resposta automática no WhatsApp.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diary' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10">
              <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Diário de Bordo & Rotas</h1>
              <p className="text-zinc-500">Acompanhe seu histórico de corridas finalizadas.</p>
            </header>

            <div className="bg-[#111] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
              {stats?.rides?.filter((r: any) => r.status === 'completed').length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">Nenhum registro de viagem finalizada no diário.</div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {stats?.rides?.filter((r: any) => r.status === 'completed').map((ride: any) => (
                    <div key={ride.id} className="p-5 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white mb-1 flex items-center gap-2">
                            {ride.passenger_name || 'Passageiro'}
                            <span className="text-[10px] text-zinc-500 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">
                              {new Date(ride.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </p>
                          <p className="text-xs text-zinc-500 truncate max-w-[200px] sm:max-w-[400px]">
                            {ride.origin} → {ride.destination}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">{formatCurrency(ride.price)}</p>
                        <p className="text-xs text-emerald-500 font-mono">+{formatCurrency(ride.net_profit)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
