import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, TrendingUp, DollarSign, Activity, Route, MapPin, 
  Calculator, LogOut, Settings, Smartphone, Bell, Check, X, Clock, 
  Edit2, Trash2, Plus, Calendar, Sun, Moon, Sparkles, MessageSquare, 
  HelpCircle, ShieldAlert, Award, Star, List, HelpCircle as HelpIcon, Play, AlertCircle, ChevronRight,
  User as UserIcon, Phone
} from 'lucide-react';
import { initAuth, googleSignIn, logout, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import DriverProfileView from '../components/DriverProfileView';
import { User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CommunityView, JourneyView, Recharts30DaySummary, SmartPlannerView, TaximeterView, FuturePredictionView 
} from '../components/ExtraDashboardViews';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'passenger-app' | 'diary' | 'garage' | 'more' | 'transactions' | 'profile'>('overview');
  const [selectedMoreOption, setSelectedMoreOption] = useState<string>('all_features');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Firestore ratings states
  const [firestoreRides, setFirestoreRides] = useState<any[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  
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
  const [driverPhone, setDriverPhone] = useState('');
  const [driverPixKey, setDriverPixKey] = useState('');
  const [driverPhotoUrl, setDriverPhotoUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Financial Transactions State
  const [finDescription, setFinDescription] = useState('');
  const [finAmount, setFinAmount] = useState('');
  const [finType, setFinType] = useState<'income' | 'expense'>('expense');
  const [finCategory, setFinCategory] = useState('Pedágio');
  const [finDate, setFinDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingFin, setSavingFin] = useState(false);

  // Feedback form state
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Daily Log State
  const [diarySubTab, setDiarySubTab] = useState<'manual' | 'automatic'>('manual');
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [logDate, setLogDate] = useState('');
  const [logEarnings, setLogEarnings] = useState('');
  const [logKm, setLogKm] = useState('');
  const [logHours, setLogHours] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  const handleOpenAddLog = () => {
    setEditingLogId(null);
    setLogDate(new Date().toISOString().split('T')[0]);
    setLogEarnings('');
    setLogKm('');
    setLogHours('');
    setLogNotes('');
    setShowLogModal(true);
  };

  const handleOpenEditLog = (log: any) => {
    setEditingLogId(log.id);
    setLogDate(log.date);
    setLogEarnings(log.earnings.toString());
    setLogKm(log.km.toString());
    setLogHours(log.hours_worked.toString());
    setLogNotes(log.notes || '');
    setShowLogModal(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingLog(true);
    try {
      if (editingLogId) {
        // Edit log
        await fetch(`/api/daily-logs/${editingLogId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: logDate,
            earnings: Number(logEarnings || 0),
            km: Number(logKm || 0),
            hours_worked: Number(logHours || 0),
            notes: logNotes
          })
        });
      } else {
        // Add log
        await fetch('/api/daily-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebase_uid: user.uid,
            date: logDate,
            earnings: Number(logEarnings || 0),
            km: Number(logKm || 0),
            hours_worked: Number(logHours || 0),
            notes: logNotes
          })
        });
      }
      fetchDashboardStats(user.uid);
      setShowLogModal(false);
    } catch (err) {
      console.error('Error saving daily log:', err);
    } finally {
      setSavingLog(false);
    }
  };

  const handleDeleteLog = async (id: number) => {
    if (!user || !window.confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      await fetch(`/api/daily-logs/${id}`, {
        method: 'DELETE'
      });
      fetchDashboardStats(user.uid);
    } catch (err) {
      console.error('Error deleting daily log:', err);
    }
  };

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
    if (user && (activeTab === 'overview' || activeTab === 'profile')) {
      fetchDashboardStats(user.uid, user.email || '', user.displayName || '');
      
      const interval = setInterval(() => {
        fetchDashboardStats(user.uid, user.email || '', user.displayName || '');
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user, activeTab]);

  // Fetch Firestore rides for driver rating computation
  useEffect(() => {
    if (user && stats?.driver?.custom_url) {
      setLoadingRatings(true);
      const ridesRef = collection(db, 'rides');
      const q = query(ridesRef, where('driverId', '==', stats.driver.custom_url));
      getDocs(q)
        .then((snapshot) => {
          const list: any[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          setFirestoreRides(list);
        })
        .catch((err) => {
          console.error('Error fetching ratings from Firestore:', err);
        })
        .finally(() => {
          setLoadingRatings(false);
        });
    }
  }, [user, stats?.driver?.custom_url, activeTab]);

  const fetchDashboardStats = (uid: string, email: string = '', name: string = '') => {
    fetch(`/api/dashboard/${uid}`)
      .then(async res => {
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          return res.json();
        }
        return { error: 'Invalid response from server' };
      })
      .then(data => {
        if (!data || data.error) {
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
          setDriverPhone(data.driver?.phone || '');
          setDriverPixKey(data.driver?.pix_key || '');
          setDriverPhotoUrl(data.driver?.photo_url || '');
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
          custom_url: customUrl || uid.slice(0, 8),
          phone: driverPhone,
          pix_key: driverPixKey,
          photo_url: driverPhotoUrl
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
      const ct = response.headers.get('content-type');
      if (ct && ct.includes('application/json')) {
        const data = await response.json();
        if (data.error) {
          alert(data.error);
        } else {
          setSimPrice(data);
        }
      } else {
        alert('Erro de comunicação com o servidor ao simular a corrida.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveFinancialRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingFin(true);
    try {
      const response = await fetch('/api/financial-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user.uid,
          type: finType,
          category: finCategory,
          amount: Number(finAmount),
          description: finDescription,
          date: finDate
        })
      });
      if (response.ok) {
        setFinDescription('');
        setFinAmount('');
        setFinCategory('Pedágio');
        fetchDashboardStats(user.uid, user.email || '', user.displayName || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFin(false);
    }
  };

  const handleDeleteFinancialRecord = async (id: number) => {
    if (!window.confirm('Deseja excluir este registro financeiro?')) return;
    try {
      const response = await fetch(`/api/financial-records/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        if (user) {
          fetchDashboardStats(user.uid, user.email || '', user.displayName || '');
        }
      }
    } catch (err) {
      console.error(err);
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
  let maxFaturamento = 0;
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
    if (dayRev > maxFaturamento) maxFaturamento = dayRev;
    last7DaysData.push({ name: dateStr.substring(0, 3), faturamento: dayRev });
  }

  return (
    <div className={`min-h-screen font-sans selection:bg-zinc-800 flex flex-col md:flex-row relative transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0a0a] text-zinc-300' : 'bg-zinc-50 text-zinc-800'}`}>
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
      
      {/* Mobile Top Header */}
      <header className={`md:hidden p-4 border-b flex items-center justify-between sticky top-0 z-30 backdrop-blur-md ${isDarkMode ? 'bg-[#0a0a0a]/90 border-zinc-800 text-white' : 'bg-zinc-50/90 border-zinc-200 text-zinc-900'}`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold tracking-tight text-sm">DriverMetrics Pro</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-amber-400' : 'text-zinc-600'}`}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => { setActiveTab('more'); setSelectedMoreOption('subscription'); }}
            className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold"
          >
            PRO
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop Only) */}
      <aside className={`hidden md:flex w-64 p-6 flex-col border-r transition-colors duration-300 shrink-0 ${isDarkMode ? 'bg-[#111] border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-800'}`}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-medium tracking-tight ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>DriverMetrics Pro</h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">{stats?.vehicle?.make || 'Carro'} {stats?.vehicle?.model || 'Geral'}</p>
          </div>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-amber-400' : 'hover:bg-zinc-100 text-zinc-600'}`}
            title={isDarkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Premium Badge */}
        <div 
          onClick={() => { setActiveTab('more'); setSelectedMoreOption('subscription'); }}
          className={`mb-6 p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer hover:scale-[1.02] transition-all duration-300 ${
            isPremium 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-400'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
          <div className="text-left">
            <p className="text-xs font-semibold leading-none">{isPremium ? 'Membro Premium' : 'Ativar Premium'}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 leading-none">{isPremium ? 'Acesso Ilimitado' : 'Liberar AI e Eventos'}</p>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1 font-sans">
          <button onClick={() => { setActiveTab('overview'); }} className={`w-full flex items-center gap-3 ${activeTab === 'overview' ? (isDarkMode ? 'bg-zinc-800/50 text-white' : 'bg-zinc-100 text-zinc-900') : 'text-zinc-400 hover:bg-zinc-900/40'} px-4 py-2 rounded-lg text-sm font-medium transition-all`}>
            <LayoutDashboard className="w-4 h-4" /> Visão Geral
          </button>
          <button onClick={() => { setActiveTab('profile'); }} className={`w-full flex items-center gap-3 ${activeTab === 'profile' ? (isDarkMode ? 'bg-zinc-800/50 text-white' : 'bg-zinc-100 text-zinc-900') : 'text-zinc-400 hover:bg-zinc-900/40'} px-4 py-2 rounded-lg text-sm font-medium transition-all`}>
            <UserIcon className="w-4 h-4" /> Meu Perfil
          </button>
          <button onClick={() => { setActiveTab('diary'); }} className={`w-full flex items-center gap-3 ${activeTab === 'diary' ? (isDarkMode ? 'bg-zinc-800/50 text-white' : 'bg-zinc-100 text-zinc-900') : 'text-zinc-400 hover:bg-zinc-900/40'} px-4 py-2 rounded-lg text-sm font-medium transition-all`}>
            <Route className="w-4 h-4" /> Diário de Bordo & Rotas
          </button>
          <button onClick={() => { setActiveTab('transactions'); }} className={`w-full flex items-center gap-3 ${activeTab === 'transactions' ? (isDarkMode ? 'bg-zinc-800/50 text-white' : 'bg-zinc-100 text-zinc-900') : 'text-zinc-400 hover:bg-zinc-900/40'} px-4 py-2 rounded-lg text-sm font-medium transition-all`}>
            <DollarSign className="w-4 h-4" /> Lançar Despesas/Ganhos
          </button>
          <button onClick={() => { setActiveTab('garage'); }} className={`w-full flex items-center gap-3 ${activeTab === 'garage' ? (isDarkMode ? 'bg-zinc-800/50 text-white' : 'bg-zinc-100 text-zinc-900') : 'text-zinc-400 hover:bg-zinc-900/40'} px-4 py-2 rounded-lg text-sm font-medium transition-all`}>
            <Calculator className="w-4 h-4" /> Minha Garagem
          </button>
          <button onClick={() => { setActiveTab('passenger-app'); }} className={`w-full flex items-center gap-3 ${activeTab === 'passenger-app' ? (isDarkMode ? 'bg-zinc-800/50 text-white' : 'bg-zinc-100 text-zinc-900') : 'text-zinc-400 hover:bg-zinc-900/40'} px-4 py-2 rounded-lg text-sm font-medium transition-all`}>
            <Smartphone className="w-4 h-4" /> App Passageiro
          </button>
          <button onClick={() => { setActiveTab('more'); setSelectedMoreOption('all_features'); }} className={`w-full flex items-center justify-between ${activeTab === 'more' ? (isDarkMode ? 'bg-zinc-800/50 text-white' : 'bg-zinc-100 text-zinc-900') : 'text-zinc-400 hover:bg-zinc-900/40'} px-4 py-2 rounded-lg text-sm font-medium transition-all`}>
            <span className="flex items-center gap-3">
              <List className="w-4 h-4" /> Mais Opções
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Menu</span>
          </button>
          <button onClick={() => { setActiveTab('settings'); }} className={`w-full flex items-center gap-3 ${activeTab === 'settings' ? (isDarkMode ? 'bg-zinc-800/50 text-white' : 'bg-zinc-100 text-zinc-900') : 'text-zinc-400 hover:bg-zinc-900/40'} px-4 py-2 rounded-lg text-sm font-medium transition-all`}>
            <Settings className="w-4 h-4" /> Configurações Gerais
          </button>
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 text-zinc-400 hover:bg-zinc-900/40 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all mt-4">
            <Route className="w-4 h-4" /> Voltar ao Início
          </button>
        </nav>

        <div className="mt-6 pt-4 border-t border-zinc-800/40">
          <button onClick={handleLogout} className="flex items-center gap-3 text-zinc-500 hover:text-red-400 transition-colors w-full">
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sticky Bottom Bar */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md py-2 px-1 flex items-center justify-around safe-bottom ${isDarkMode ? 'bg-[#0f0f0f]/95 border-zinc-800/80 text-zinc-400' : 'bg-white/95 border-zinc-200 text-zinc-600'}`}>
        <button 
          onClick={() => { setActiveTab('overview'); }} 
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg transition-all ${activeTab === 'overview' ? 'text-emerald-500 font-semibold' : 'text-zinc-500'}`}
        >
          <LayoutDashboard className="w-4.5 h-4.5" />
          <span className="text-[9px]">Geral</span>
        </button>
        <button 
          onClick={() => { setActiveTab('diary'); }} 
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg transition-all ${activeTab === 'diary' ? 'text-emerald-500 font-semibold' : 'text-zinc-500'}`}
        >
          <Route className="w-4.5 h-4.5" />
          <span className="text-[9px]">Diário</span>
        </button>
        <button 
          onClick={() => { setActiveTab('transactions'); }} 
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg transition-all ${activeTab === 'transactions' ? 'text-emerald-500 font-semibold' : 'text-zinc-500'}`}
        >
          <DollarSign className="w-4.5 h-4.5" />
          <span className="text-[9px]">Lançar</span>
        </button>
        <button 
          onClick={() => { setActiveTab('passenger-app'); }} 
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg transition-all ${activeTab === 'passenger-app' ? 'text-emerald-500 font-semibold' : 'text-zinc-500'}`}
        >
          <Smartphone className="w-4.5 h-4.5" />
          <span className="text-[9px]">Passageiro</span>
        </button>
        <button 
          onClick={() => { setActiveTab('more'); setSelectedMoreOption('all_features'); }} 
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg transition-all ${activeTab === 'more' ? 'text-emerald-500 font-semibold' : 'text-zinc-500'}`}
        >
          <List className="w-4.5 h-4.5" />
          <span className="text-[9px]">Mais</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className={`flex-1 p-6 md:p-12 pb-24 md:pb-12 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-zinc-50'}`}>
        {activeTab === 'profile' && (
          <DriverProfileView
            stats={stats}
            isDarkMode={isDarkMode}
            firestoreRides={firestoreRides}
            loadingRatings={loadingRatings}
            setActiveTab={setActiveTab}
          />
        )}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Telefone do Motorista</label>
                  <input 
                    type="text" 
                    placeholder="Ex: (11) 99999-9999"
                    value={driverPhone}
                    onChange={e => setDriverPhone(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Chave Pix</label>
                  <input 
                    type="text" 
                    placeholder="Ex: pix@motorista.com ou celular"
                    value={driverPixKey}
                    onChange={e => setDriverPixKey(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">URL da Foto de Perfil</label>
                <input 
                  type="text" 
                  placeholder="https://exemplo.com/suafoto.jpg"
                  value={driverPhotoUrl}
                  onChange={e => setDriverPhotoUrl(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-lg px-4 py-3 text-white outline-none focus:border-white transition-colors"
                />
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
                  <div className="h-[250px] w-full flex items-end justify-between gap-2 pt-6">
                    {last7DaysData.map((day, i) => {
                      const heightPercent = maxFaturamento > 0 ? (day.faturamento / maxFaturamento) * 100 : 0;
                      return (
                        <div key={i} className="flex flex-col items-center flex-1 group">
                          <div className="w-full flex justify-center h-[200px] items-end pb-2 relative">
                            {/* Tooltip on hover */}
                            <div className="absolute -top-8 bg-zinc-800 text-white text-xs font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                              {formatCurrency(day.faturamento)}
                            </div>
                            <div 
                              className="w-full max-w-[32px] bg-emerald-500 rounded-t-sm transition-all duration-500 hover:bg-emerald-400"
                              style={{ height: `${Math.max(heightPercent, 2)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-zinc-500 uppercase">{day.name}</span>
                        </div>
                      );
                    })}
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
                                  <p className="text-base font-medium text-white flex flex-wrap items-center gap-2">
                                    {ride.passenger_name ? (
                                      <>
                                        <span className="text-white">{ride.passenger_name}</span>
                                        {ride.passenger_email && <span className="text-xs text-zinc-500 font-normal">({ride.passenger_email})</span>}
                                        {ride.passenger_phone && (
                                          <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {ride.passenger_phone}
                                          </span>
                                        )}
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
                                          .catch(err => console.error(err));
                                      }}
                                      className="flex items-center justify-center gap-2 bg-emerald-500 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-400 transition-colors w-full"
                                    >
                                      <Check className="w-4 h-4" /> Aceitar
                                    </button>
                                    <button 
                                      onClick={() => {
                                        fetch(`/api/rides/${ride.id}/cancel`, { method: 'POST' })
                                          .then(() => fetchDashboardStats(user?.uid || ''))
                                          .catch(err => console.error(err));
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
                                          .catch(err => console.error(err));
                                      }}
                                      className="flex items-center justify-center gap-2 bg-emerald-500 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-400 transition-colors w-full"
                                    >
                                      Concluir Viagem
                                    </button>
                                    <button 
                                      onClick={() => {
                                        fetch(`/api/rides/${ride.id}/cancel`, { method: 'POST' })
                                          .then(() => fetchDashboardStats(user?.uid || ''))
                                          .catch(err => console.error(err));
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
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Diário de Bordo & Rotas</h1>
                <p className="text-zinc-500">Gerencie seus ganhos diários manuais e corridas concluídas.</p>
              </div>
              <button
                onClick={handleOpenAddLog}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors self-start sm:self-auto shadow-lg shadow-emerald-950/20"
              >
                <Plus className="w-4 h-4" />
                Registrar Ganhos do Dia
              </button>
            </header>

            {/* Sub Tabs */}
            <div className="flex border-b border-zinc-800 mb-6 gap-6">
              <button
                onClick={() => setDiarySubTab('manual')}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  diarySubTab === 'manual' ? 'text-emerald-500' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Ganhos Manuais (Diário)
                {diarySubTab === 'manual' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                )}
              </button>
              <button
                onClick={() => setDiarySubTab('automatic')}
                className={`pb-3 text-sm font-medium transition-colors relative ${
                  diarySubTab === 'automatic' ? 'text-emerald-500' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Corridas do Passageiro (Sistema)
                {diarySubTab === 'automatic' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                )}
              </button>
            </div>

            {diarySubTab === 'manual' && (
              <div className="space-y-6">
                {/* Manual Stats Summary Cards */}
                {(() => {
                  const logs = stats?.dailyLogs || [];
                  const totalGanhos = logs.reduce((sum: number, l: any) => sum + Number(l.earnings), 0);
                  const totalKm = logs.reduce((sum: number, l: any) => sum + Number(l.km), 0);
                  const totalHoras = logs.reduce((sum: number, l: any) => sum + Number(l.hours_worked), 0);
                  const realProfitPerKm = totalKm > 0 ? totalGanhos / totalKm : 0;
                  const realProfitPerHour = totalHoras > 0 ? totalGanhos / totalHoras : 0;

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-[#111] border border-zinc-800 p-4 rounded-xl">
                        <p className="text-xs text-zinc-500 mb-1">Ganhos Totais</p>
                        <h3 className="text-lg font-semibold text-white">{formatCurrency(totalGanhos)}</h3>
                      </div>
                      <div className="bg-[#111] border border-zinc-800 p-4 rounded-xl">
                        <p className="text-xs text-zinc-500 mb-1">Distância Total</p>
                        <h3 className="text-lg font-semibold text-zinc-300">{totalKm.toFixed(1)} km</h3>
                      </div>
                      <div className="bg-[#111] border border-zinc-800 p-4 rounded-xl">
                        <p className="text-xs text-zinc-500 mb-1">Horas Trabalhadas</p>
                        <h3 className="text-lg font-semibold text-zinc-300">{totalHoras.toFixed(1)} h</h3>
                      </div>
                      <div className="bg-[#111] border border-zinc-800 p-4 rounded-xl">
                        <p className="text-xs text-zinc-500 mb-1">Média por KM</p>
                        <h3 className="text-lg font-semibold text-emerald-400">{formatCurrency(realProfitPerKm)}/km</h3>
                      </div>
                      <div className="bg-[#111] border border-zinc-800 p-4 rounded-xl">
                        <p className="text-xs text-zinc-500 mb-1">Média por Hora</p>
                        <h3 className="text-lg font-semibold text-emerald-400">{formatCurrency(realProfitPerHour)}/h</h3>
                      </div>
                    </div>
                  );
                })()}

                {/* Manual Logs Table/List */}
                <div className="bg-[#111] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                  {!stats?.dailyLogs || stats.dailyLogs.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-sm">
                      Nenhum registro manual adicionado. Clique no botão acima para adicionar seu primeiro dia trabalhado!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-[#161616] text-xs font-mono text-zinc-500 uppercase">
                            <th className="p-4 font-medium">Data</th>
                            <th className="p-4 font-medium">Ganhos (R$)</th>
                            <th className="p-4 font-medium">KM Rodados</th>
                            <th className="p-4 font-medium">Horas</th>
                            <th className="p-4 font-medium">Média KM / Hora</th>
                            <th className="p-4 font-medium">Observações</th>
                            <th className="p-4 font-medium text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-sm text-zinc-300">
                          {stats.dailyLogs.map((log: any) => {
                            const dateParts = log.date.split('-');
                            const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : log.date;
                            const kmEarning = log.km > 0 ? Number(log.earnings) / Number(log.km) : 0;
                            const hrEarning = log.hours_worked > 0 ? Number(log.earnings) / Number(log.hours_worked) : 0;

                            return (
                              <tr key={log.id} className="hover:bg-zinc-900/40 transition-colors">
                                <td className="p-4 font-mono font-medium text-white">{formattedDate}</td>
                                <td className="p-4 font-semibold text-emerald-400">{formatCurrency(log.earnings)}</td>
                                <td className="p-4">{log.km} km</td>
                                <td className="p-4">{log.hours_worked} h</td>
                                <td className="p-4 text-xs font-mono text-zinc-400">
                                  <div>{formatCurrency(kmEarning)}/km</div>
                                  <div>{formatCurrency(hrEarning)}/h</div>
                                </td>
                                <td className="p-4 text-zinc-500 truncate max-w-[150px]" title={log.notes || ''}>
                                  {log.notes || '-'}
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleOpenEditLog(log)}
                                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLog(log.id)}
                                      className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/20 rounded transition-colors"
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {diarySubTab === 'automatic' && (
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
            )}

            {/* Modal for adding/editing manual logs */}
            <AnimatePresence>
              {showLogModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                  >
                    <header className="p-6 border-b border-zinc-800 flex items-center justify-between">
                      <h2 className="text-xl font-medium text-white">
                        {editingLogId ? 'Editar Registro' : 'Registrar Ganhos do Dia'}
                      </h2>
                      <button
                        onClick={() => setShowLogModal(false)}
                        className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </header>

                    <form onSubmit={handleSaveLog} className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-mono uppercase text-zinc-500 mb-1.5">Data</label>
                        <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 focus-within:border-emerald-500 transition-colors">
                          <Calendar className="w-4 h-4 text-zinc-500 mr-3" />
                          <input
                            type="date"
                            value={logDate}
                            onChange={(e) => setLogDate(e.target.value)}
                            required
                            className="bg-transparent border-none outline-none text-white w-full text-sm [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-mono uppercase text-zinc-500 mb-1.5">Ganhos (R$)</label>
                          <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 focus-within:border-emerald-500 transition-colors">
                            <span className="text-zinc-500 text-sm mr-1">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0,00"
                              value={logEarnings}
                              onChange={(e) => setLogEarnings(e.target.value)}
                              required
                              className="bg-transparent border-none outline-none text-white w-full text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-mono uppercase text-zinc-500 mb-1.5">KM Rodados</label>
                          <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 focus-within:border-emerald-500 transition-colors">
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={logKm}
                              onChange={(e) => setLogKm(e.target.value)}
                              required
                              className="bg-transparent border-none outline-none text-white w-full text-sm"
                            />
                            <span className="text-zinc-500 text-sm ml-1">km</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase text-zinc-500 mb-1.5">Horas Trabalhadas</label>
                        <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 focus-within:border-emerald-500 transition-colors">
                          <Clock className="w-4 h-4 text-zinc-500 mr-3" />
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={logHours}
                            onChange={(e) => setLogHours(e.target.value)}
                            required
                            className="bg-transparent border-none outline-none text-white w-full text-sm"
                          />
                          <span className="text-zinc-500 text-sm ml-1">h</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase text-zinc-500 mb-1.5">Observações (Opcional)</label>
                        <textarea
                          placeholder="Ex: Uber + 99, dia de chuva, etc."
                          value={logNotes}
                          onChange={(e) => setLogNotes(e.target.value)}
                          rows={3}
                          className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors resize-none"
                        />
                      </div>

                      <footer className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800 mt-6">
                        <button
                          type="button"
                          onClick={() => setShowLogModal(false)}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={savingLog}
                          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {savingLog ? 'Salvando...' : 'Salvar Registro'}
                        </button>
                      </footer>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* --- TRANSACTIONS / LANÇAMENTOS FINANCEIROS TAB --- */}
        {activeTab === 'transactions' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-6">
              <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Lançamentos Financeiros</h1>
              <p className="text-zinc-500">Registre e controle suas despesas e receitas adicionais (Ex: Pedágios, Gorjetas, Estacionamentos).</p>
            </header>

            {/* Recharts 30-Day Summary Component at the top */}
            <Recharts30DaySummary 
              rides={stats?.rides || []} 
              financialRecords={stats?.financialRecords || []} 
              costPerKm={Number(profitPerKm) || 0.5} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Col */}
              <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 h-fit space-y-4">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-500" />
                  Novo Lançamento
                </h3>
                <form onSubmit={handleSaveFinancialRecord} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">Tipo de Lançamento</label>
                    <div className="grid grid-cols-2 gap-2 bg-[#1a1a1a] p-1 rounded-xl border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => { setFinType('expense'); setFinCategory('Pedágio'); }}
                        className={`py-2 rounded-lg text-xs font-semibold transition-all ${finType === 'expense' ? 'bg-red-500 text-white shadow' : 'text-zinc-500 hover:text-white'}`}
                      >
                        Despesa (-)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFinType('income'); setFinCategory('Gorjeta'); }}
                        className={`py-2 rounded-lg text-xs font-semibold transition-all ${finType === 'income' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-500 hover:text-white'}`}
                      >
                        Receita (+)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">Categoria</label>
                    <select
                      value={finCategory}
                      onChange={(e) => setFinCategory(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
                    >
                      {finType === 'expense' ? (
                        <>
                          <option value="Pedágio">Pedágio</option>
                          <option value="Estacionamento">Estacionamento</option>
                          <option value="Combustível">Combustível</option>
                          <option value="Manutenção">Manutenção</option>
                          <option value="Outros">Outros</option>
                        </>
                      ) : (
                        <>
                          <option value="Gorjeta">Gorjeta (Gorjeta Particular)</option>
                          <option value="Corrida Particular">Corrida Particular</option>
                          <option value="Outros">Outros</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">Valor (R$)</label>
                    <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 focus-within:border-emerald-500 transition-colors">
                      <span className="text-zinc-500 text-sm mr-1">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={finAmount}
                        onChange={(e) => setFinAmount(e.target.value)}
                        required
                        className="bg-transparent border-none outline-none text-white w-full text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">Data</label>
                    <input
                      type="date"
                      value={finDate}
                      onChange={(e) => setFinDate(e.target.value)}
                      required
                      className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-500 mb-1">Descrição / Notas</label>
                    <input
                      type="text"
                      placeholder="Ex: Pedágio da Imigrantes Km 32"
                      value={finDescription}
                      onChange={(e) => setFinDescription(e.target.value)}
                      required
                      className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingFin || !finAmount}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl text-sm transition-colors"
                  >
                    {savingFin ? 'Gravando...' : 'Salvar Lançamento'}
                  </button>
                </form>
              </div>

              {/* List Col */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500">Histórico de Lançamentos adicionais</h3>
                <div className="bg-[#111] border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/60 max-h-[500px] overflow-y-auto">
                  {(stats?.financialRecords || []).length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-sm">Nenhum lançamento adicional registrado.</div>
                  ) : (
                    (stats.financialRecords || []).map((record: any) => (
                      <div key={record.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono ${record.type === 'expense' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {record.type === 'expense' ? '-' : '+'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{record.description}</span>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800/80">
                                {record.category}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(record.date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-semibold font-mono ${record.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {record.type === 'expense' ? '-' : '+'}{formatCurrency(record.amount)}
                          </span>
                          <button
                            onClick={() => handleDeleteFinancialRecord(record.id)}
                            className="p-1 text-zinc-600 hover:text-red-400 rounded transition-colors"
                            title="Deletar Lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MORE / MENU EXPANDIDO & SUBSCRIPTION TAB --- */}
        {activeTab === 'more' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Nav Back button */}
            {selectedMoreOption !== 'all_features' && (
              <button 
                onClick={() => setSelectedMoreOption('all_features')}
                className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-emerald-500 hover:text-emerald-400 transition-colors mb-2"
              >
                &larr; Voltar para o Menu Completo
              </button>
            )}

            {/* --- MENU COMPLETO INDEX (IMAGE 1 STYLE) --- */}
            {selectedMoreOption === 'all_features' && (
              <div className="space-y-8">
                <header className="mb-2">
                  <h1 className="text-3xl font-medium text-white tracking-tight">Menu DriverMetrics Pro</h1>
                  <p className="text-zinc-500">Acesse recursos operacionais avançados e ferramentas estratégicas com inteligência artificial.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                  {/* Category 1: Operações */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 border-b border-zinc-800/60 pb-2 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-zinc-500" /> Operações diárias
                    </h3>
                    <div className="space-y-2.5">
                      <div 
                        onClick={() => setActiveTab('garage')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">Veículos (Garagem)</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Gerencie custos fixos, IPVA e pneus</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div 
                        onClick={() => setActiveTab('profile')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">Perfil do Motorista</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Estatísticas, avaliações e dados do carro</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div 
                        onClick={() => setActiveTab('transactions')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">Lançamentos Financeiros</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Organize suas receitas e despesas</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div 
                        onClick={() => setActiveTab('diary')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">KM Real / Diário de bordo</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Log manual ou corridas automáticas</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div 
                        onClick={() => setActiveTab('settings')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">Metas de Lucro Líquido</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Ajuste seu faturamento ideal por hora</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                    </div>
                  </div>

                  {/* Category 2: Estratégias Avançadas */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-emerald-400 border-b border-emerald-500/10 pb-2 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Inteligência Estratégica
                    </h3>
                    <div className="space-y-2.5">
                      <div 
                        onClick={() => setSelectedMoreOption('community')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                            Comunidade <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase">Ativo</span>
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">Dicas e bate-papo entre motoristas</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div 
                        onClick={() => setSelectedMoreOption('events')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                            Eventos da Cidade {!isPremium && <Award className="w-3.5 h-3.5 text-amber-500" />}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">Alta demanda perto de shows e jogos</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div 
                        onClick={() => setSelectedMoreOption('regions')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                            Regiões de Alta Demanda {!isPremium && <Award className="w-3.5 h-3.5 text-amber-500" />}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">Zonas quentes com tarifas multiplicadas</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div 
                        onClick={() => setSelectedMoreOption('journeys')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">Controle de Jornadas (Turno)</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Inicie/encerre turno com cronômetro real</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div 
                        onClick={() => setSelectedMoreOption('planner')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">Smart Planner (Estratégia)</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Organizador de agenda e rotas semanais</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div 
                        onClick={() => setSelectedMoreOption('taximeter')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">Taxímetro Digital Dinâmico</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Simulador de tarifa particular ativa</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                      <div 
                        onClick={() => setSelectedMoreOption('prediction')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                            Futuro Inteligente (AI Predictions) {!isPremium && <Award className="w-3.5 h-3.5 text-amber-500" />}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">Previsões diárias inteligentes por algoritmo</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                    </div>
                  </div>

                  {/* Category 3: Conta, Ajuda e Suporte */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 border-b border-zinc-800/60 pb-2 flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-500" /> Suporte & Conta
                    </h3>
                    <div className="space-y-2.5">
                      <div 
                        onClick={() => setSelectedMoreOption('subscription')} 
                        className="bg-gradient-to-br from-amber-950/20 to-[#111] border border-amber-500/20 p-4 rounded-xl cursor-pointer hover:border-amber-500/40 transition-all"
                      >
                        <p className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                          Assinatura Premium <Award className="w-4 h-4" />
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">Liberar todas as ferramentas de previsão AI</p>
                      </div>
                      <div 
                        onClick={() => setSelectedMoreOption('help')} 
                        className="flex justify-between items-center bg-[#111] border border-zinc-800/80 p-4 rounded-xl cursor-pointer hover:border-zinc-700 transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">Central de Ajuda & Tutoriais</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Reportar problemas, FAQs e guias de uso</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- COMUNIDADE ACTIVE VIEW --- */}
            {selectedMoreOption === 'community' && (
              <CommunityView 
                user={user} 
                posts={stats?.communityPosts || []} 
                onRefresh={() => fetchDashboardStats(user?.uid || '', user?.email || '', user?.displayName || '')} 
              />
            )}

            {/* --- CITY EVENTS VIEW WITH LOCK FOR NON-PREMIUM --- */}
            {selectedMoreOption === 'events' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-medium text-white flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-emerald-500" />
                    Eventos de Alta Demanda na Cidade
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">Veja shows, jogos e feiras corporativas para se posicionar com antecedência.</p>
                </div>

                {!isPremium ? (
                  <div className="relative border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent rounded-2xl p-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-400">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h4 className="text-base font-semibold text-white">Recurso Exclusivo Premium</h4>
                      <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                        Tenha acesso ao calendário em tempo real integrado dos maiores eventos corporativos, shows e eventos esportivos de São Paulo e região.
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedMoreOption('subscription')}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors inline-flex items-center gap-2 shadow-lg shadow-amber-950/20"
                    >
                      Ver Planos de Assinatura
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(stats?.cityEvents || []).map((ev: any) => (
                      <div key={ev.id} className="bg-[#111] border border-zinc-800 p-5 rounded-xl space-y-3 hover:border-zinc-700 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase font-semibold">
                              {ev.category || 'Música'}
                            </span>
                            <h4 className="text-sm font-semibold text-white mt-1.5">{ev.title}</h4>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-xs text-zinc-500 font-mono">
                          <p>📅 {new Date(ev.date).toLocaleDateString('pt-BR')} às {ev.time_start}</p>
                          <p>📍 {ev.venue}</p>
                          <p>👥 Público estimado: <span className="text-white font-semibold">{ev.expected_attendance?.toLocaleString()} pessoas</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --- DEMAND REGIONS WITH LOCK FOR NON-PREMIUM --- */}
            {selectedMoreOption === 'regions' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-medium text-white flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-emerald-500" />
                    Regiões de Alta Demanda e Multiplicadores
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">Rotas quentes e bairros estratégicos para maximizar seu ganho por km rodado.</p>
                </div>

                {!isPremium ? (
                  <div className="relative border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent rounded-2xl p-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-400">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h4 className="text-base font-semibold text-white">Recurso Exclusivo Premium</h4>
                      <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                        Visualize em tempo real as coordenadas e dados históricos das zonas que mais pagam por quilômetro rodado em dias úteis e finais de semana.
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedMoreOption('subscription')}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors inline-flex items-center gap-2 shadow-lg shadow-amber-950/20"
                    >
                      Ver Planos de Assinatura
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(stats?.demandRegions || []).map((reg: any) => (
                      <div key={reg.id} className="bg-[#111] border border-zinc-800 p-5 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white">{reg.region_name}</h4>
                          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                            {reg.multiplier_estimate?.toFixed(1)}x Dinâmico
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">Recomendação: {reg.best_hours_span || '07:00 - 10:00'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --- JORNADAS WORK SHIFT --- */}
            {selectedMoreOption === 'journeys' && (
              <JourneyView 
                user={user} 
                journeys={stats?.journeys || []} 
                onRefresh={() => fetchDashboardStats(user?.uid || '', user?.email || '', user?.displayName || '')} 
                costPerKm={Number(profitPerKm) || 0.5} 
              />
            )}

            {/* --- SMART PLANNER --- */}
            {selectedMoreOption === 'planner' && (
              <SmartPlannerView 
                user={user} 
                planners={stats?.smartPlanners || []} 
                onRefresh={() => fetchDashboardStats(user?.uid || '', user?.email || '', user?.displayName || '')} 
              />
            )}

            {/* --- TAXIMETER Simulator --- */}
            {selectedMoreOption === 'taximeter' && (
              <TaximeterView 
                user={user} 
                onSaveRecord={(p, pr) => {
                  fetchDashboardStats(user?.uid || '', user?.email || '', user?.displayName || '');
                  setActiveTab('overview');
                }} 
                costPerKm={Number(profitPerKm) || 0.5} 
              />
            )}

            {/* --- FUTURE PREDICTIONS (AI) WITH LOCK FOR NON-PREMIUM --- */}
            {selectedMoreOption === 'prediction' && (
              <div className="space-y-6">
                {!isPremium ? (
                  <div className="relative border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent rounded-2xl p-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-400">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h4 className="text-base font-semibold text-white">Previsão por Inteligência Artificial (AI Tomorrow)</h4>
                      <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                        Utilize nosso motor de predição integrado para receber sugestões personalizadas de metas diárias, faturamento e regiões com base nas suas metas financeiras.
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedMoreOption('subscription')}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors inline-flex items-center gap-2 shadow-lg shadow-amber-950/20"
                    >
                      Conhecer Plano Premium
                    </button>
                  </div>
                ) : (
                  <FuturePredictionView 
                    user={user} 
                    netIncomeGoal={Number(netIncomeGoal) || 5000} 
                  />
                )}
              </div>
            )}

            {/* --- SUBSCRIPTION / ASSINATURA MANAGEMENT VIEW --- */}
            {selectedMoreOption === 'subscription' && (
              <div className="space-y-8 animate-in fade-in">
                <header>
                  <h2 className="text-2xl font-medium text-white flex items-center gap-2">
                    <Award className="w-6 h-6 text-amber-500" />
                    Plano Premium DriverMetrics
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">Multiplique seus lucros líquidos utilizando previsões por AI e dados em tempo real.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Premium Benefit List Card */}
                  <div className="bg-[#111] border border-zinc-800 p-6 rounded-2xl space-y-6">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Recursos Inclusos</h3>
                    <ul className="space-y-4 text-sm text-zinc-300">
                      <li className="flex items-start gap-2.5">
                        <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>Previsões AI diárias de metas de faturamento e horas de pico</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>Calendário estratégico unificado de shows, esportes e congressos</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>Mapa e multiplicador em tempo real de regiões de alta demanda</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>Exportação ilimitada de relatórios financeiros mensais em PDF/CSV</span>
                      </li>
                    </ul>
                  </div>

                  {/* Payment Simulator Box */}
                  <div className="bg-zinc-900/50 border border-amber-500/20 p-6 rounded-2xl flex flex-col justify-between space-y-6">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-bold">PROMOÇÃO</span>
                      <h4 className="text-2xl font-bold text-white mt-3 font-mono">R$ 19,90 <span className="text-xs text-zinc-500 font-normal">/ mês</span></h4>
                      <p className="text-xs text-zinc-500 mt-2">Cancele quando quiser diretamente pela plataforma.</p>
                    </div>

                    <div className="space-y-3">
                      {isPremium ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-center text-xs font-semibold">
                          👑 Assinatura Ativa & Liberada! Aproveite todos os recursos.
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setCheckingPayment(true);
                            setTimeout(() => {
                              setIsPremium(true);
                              setCheckingPayment(false);
                            }, 1000);
                          }}
                          disabled={checkingPayment}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold py-3 rounded-xl text-sm transition-all text-center flex items-center justify-center gap-2"
                        >
                          {checkingPayment ? 'Processando Liberação...' : 'Simular Ativação (Grátis)'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- HELP / FAQs AND FEEDBACK FORM --- */}
            {selectedMoreOption === 'help' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-medium text-white">Central de Ajuda & Suporte</h2>
                  <p className="text-xs text-zinc-500 mt-1">Dúvidas comuns, tutoriais de uso e formulário de contato.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* FAQs */}
                  <div className="bg-[#111] border border-zinc-800 p-6 rounded-2xl space-y-4">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                      <HelpIcon className="w-4 h-4 text-emerald-500" /> Perguntas Frequentes
                    </h3>
                    <div className="space-y-4 text-xs text-zinc-300">
                      <div>
                        <h4 className="font-semibold text-white">Como é calculada a meta de R$/Hora?</h4>
                        <p className="text-zinc-500 mt-1">Dividimos sua meta mensal de renda líquida pelos seus dias de trabalho e horas ativas, somando as despesas mensais fixas (IPVA, manutenção, etc.).</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">Como lançar despesas de pedágios?</h4>
                        <p className="text-zinc-500 mt-1">Acesse a aba "Lançar Despesas/Ganhos" na barra lateral esquerda, insira o valor e selecione a categoria "Pedágio".</p>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Form */}
                  <div className="bg-[#111] border border-zinc-800 p-6 rounded-2xl h-fit space-y-4">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-500" /> Enviar Feedback / Reportar Erro
                    </h3>
                    {feedbackSent ? (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl text-center">
                        Obrigado! Seu relatório foi enviado com sucesso para a equipe de desenvolvimento.
                      </div>
                    ) : (
                      <form 
                        onSubmit={(e) => { e.preventDefault(); setFeedbackSent(true); }}
                        className="space-y-3"
                      >
                        <textarea
                          placeholder="Sugestões ou problemas encontrados no aplicativo..."
                          rows={3}
                          value={feedbackText}
                          onChange={e => setFeedbackText(e.target.value)}
                          required
                          className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors resize-none"
                        />
                        <button
                          type="submit"
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
                        >
                          Enviar Relatório
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
