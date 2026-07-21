import React from 'react';
import { motion } from 'motion/react';
import { 
  User as UserIcon, Star, Car, DollarSign, TrendingUp, Award, Sparkles, 
  Clock, Phone, Mail, Link, Copy, Check, ChevronRight, HelpCircle, AlertCircle,
  TrendingDown, ArrowUpRight, Compass, Shield, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface DriverProfileViewProps {
  stats: any;
  isDarkMode: boolean;
  firestoreRides: any[];
  loadingRatings: boolean;
  setActiveTab: (tab: any) => void;
}

export default function DriverProfileView({
  stats,
  isDarkMode,
  firestoreRides,
  loadingRatings,
  setActiveTab
}: DriverProfileViewProps) {
  const [copied, setCopied] = React.useState(false);

  const copyUrl = () => {
    if (!stats?.driver?.custom_url) return;
    const url = `${window.location.origin}/reservar/${stats.driver.custom_url}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Calculate Monthly stats
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Filter rides from SQLite that are completed and in the current month
  const monthlyRides = (stats?.rides || []).filter((r: any) => {
    if (r.status !== 'completed') return false;
    const d = new Date(r.createdAt || r.scheduled_time || r.updatedAt);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const ridesGross = monthlyRides.reduce((sum: number, r: any) => sum + Number(r.price || 0), 0);
  const ridesNet = monthlyRides.reduce((sum: number, r: any) => sum + Number(r.net_profit || 0), 0);

  // Financial records for current month
  const monthlyFinancials = (stats?.financialRecords || []).filter((fr: any) => {
    const d = new Date(fr.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const extraIncome = monthlyFinancials
    .filter((fr: any) => fr.type === 'income')
    .reduce((sum: number, fr: any) => sum + Number(fr.amount || 0), 0);

  const extraExpenses = monthlyFinancials
    .filter((fr: any) => fr.type === 'expense')
    .reduce((sum: number, fr: any) => sum + Number(fr.amount || 0), 0);

  // Daily logs for current month (fuel, km, hours)
  const monthlyLogs = (stats?.dailyLogs || []).filter((dl: any) => {
    const d = new Date(dl.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const logsEarnings = monthlyLogs.reduce((sum: number, dl: any) => sum + Number(dl.earnings || 0), 0);
  const logsKm = monthlyLogs.reduce((sum: number, dl: any) => sum + Number(dl.km || 0), 0);
  const logsHours = monthlyLogs.reduce((sum: number, dl: any) => sum + Number(dl.hours_worked || 0), 0);

  // Vehicle data
  const vehicle = stats?.vehicle || {};
  const avgConsumption = Number(vehicle.average_consumption_km_l || 12);
  const maintReservePerKm = Number(vehicle.maintenance_reserve_per_km || 0.15);
  
  // Fuel estimate (Brazilian average fuel price estimated at R$ 5,50)
  const fuelPrice = 5.50;
  const fuelCostPerKm = fuelPrice / avgConsumption;
  const fuelExpenseEstimate = logsKm * fuelCostPerKm;
  const maintenanceExpenseEstimate = logsKm * maintReservePerKm;

  // Monthly proportion of fixed vehicle costs
  const carPayment = Number(vehicle.car_payment_monthly || 0);
  const insurance = Number(vehicle.insurance_monthly || 0);
  const ipvaProportion = Number(vehicle.ipva_yearly || 0) / 12;
  const internet = Number(vehicle.internet_monthly || 0);
  const tiresProportion = Number(vehicle.tires_total || 0) / 12;
  const vehicleBaseFixed = Number(vehicle.fixed_monthly_cost || 0);

  // Total vehicle fixed cost for the month
  const totalVehicleFixed = carPayment + insurance + ipvaProportion + internet + tiresProportion + vehicleBaseFixed;

  // Aggregate stats
  const totalGross = ridesGross + extraIncome + logsEarnings;
  const totalExpenses = totalVehicleFixed + extraExpenses + fuelExpenseEstimate + maintenanceExpenseEstimate;
  const totalNet = totalGross - totalExpenses;

  const monthlyGoal = Number(stats?.driver?.net_income_goal_monthly || 5000);
  const goalProgress = monthlyGoal > 0 ? Math.min(100, Math.round((totalNet / monthlyGoal) * 100)) : 0;

  // Portuguese Month Helper
  const getMonthLabel = () => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[currentMonth]} de ${currentYear}`;
  };

  // Recharts Monthly Breakdown Data
  const chartData = [
    { name: 'Fat. Bruto', valor: totalGross, color: '#10b981' },
    { name: 'Despesas', valor: totalExpenses, color: '#ef4444' },
    { name: 'Lucro Líquido', valor: Math.max(0, totalNet), color: '#3b82f6' }
  ];

  // 2. Ratings calculations based on firestoreRides
  const ratedRides = firestoreRides.filter((r: any) => typeof r.rating === 'number' && r.rating > 0);
  const totalRatings = ratedRides.length;

  const averageRating = totalRatings > 0 
    ? (ratedRides.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
    : '5.0';

  // Compute breakdown percentages
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratedRides.forEach((r: any) => {
    const star = Math.round(r.rating) as 5 | 4 | 3 | 2 | 1;
    if (ratingCounts[star] !== undefined) {
      ratingCounts[star]++;
    }
  });

  const getRatingPercent = (star: 5 | 4 | 3 | 2 | 1) => {
    if (totalRatings === 0) return star === 5 ? 100 : 0;
    return Math.round((ratingCounts[star] / totalRatings) * 100);
  };

  // Determine Driver badge/tier
  const getDriverTier = (avg: number, count: number) => {
    if (count >= 10 && avg >= 4.8) return { label: 'Motorista Diamante', icon: Award, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
    if (count >= 5 && avg >= 4.5) return { label: 'Motorista Ouro', icon: Sparkles, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Motorista Pro', icon: Shield, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  const tier = getDriverTier(parseFloat(averageRating), totalRatings);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Perfil */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className={`text-3xl font-medium tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
            Perfil do Motorista
          </h1>
          <p className="text-zinc-500">Verifique estatísticas consolidadas, dados cadastrados do seu carro e reputação.</p>
        </div>

        {/* Tier and custom link */}
        <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${tier.color}`}>
            <tier.icon className="w-4 h-4 shrink-0" />
            <span>{tier.label}</span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border ${isDarkMode ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
            <span className="text-zinc-500">/reservar/</span>
            <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>{stats?.driver?.custom_url || 'geral'}</span>
            <button 
              onClick={copyUrl} 
              className={`ml-2 p-1 rounded hover:bg-zinc-800 transition-colors ${copied ? 'text-emerald-500' : 'text-zinc-500 hover:text-white'}`}
              title="Copiar Link"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid: Info Cadastral + Resumo Geral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Identificação do Motorista (1/3) */}
        <div className={`p-6 rounded-xl border flex flex-col justify-between ${isDarkMode ? 'bg-[#111] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <div>
            <div className="flex items-center gap-4 mb-6">
              {stats?.driver?.photo_url ? (
                <img 
                  src={stats.driver.photo_url} 
                  alt={stats.driver.name} 
                  className="w-16 h-16 rounded-full object-cover border border-zinc-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                  {stats?.driver?.name?.charAt(0) || <UserIcon className="w-8 h-8" />}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg leading-tight">{stats?.driver?.name || 'Carregando...'}</h3>
                <span className="text-xs text-zinc-500 font-mono">ID: #{stats?.driver?.id || '0'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-zinc-500 uppercase leading-none mb-0.5">E-mail de Contato</p>
                  <p className="text-xs truncate font-mono">{stats?.driver?.email || 'Nenhum'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase leading-none mb-0.5">Telefone</p>
                  <p className="text-xs font-mono">{stats?.driver?.phone || 'Não Cadastrado'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-zinc-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase leading-none mb-0.5">Chave Pix</p>
                  <p className="text-xs font-mono truncate max-w-[200px]">{stats?.driver?.pix_key || 'Não cadastrado'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs">
            <span className="text-zinc-500">Deseja editar seus dados?</span>
            <button 
              onClick={() => setActiveTab('settings')}
              className="text-emerald-500 hover:underline flex items-center gap-1 font-medium"
            >
              Configurações <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Visão Geral de Avaliação (1/3) */}
        <div className={`p-6 rounded-xl border flex flex-col justify-between ${isDarkMode ? 'bg-[#111] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <div>
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Reputação & Avaliações</h3>
            
            <div className="flex items-center gap-6 mb-6">
              <div className="text-center">
                <div className="text-5xl font-bold tracking-tight mb-1 text-amber-400">{averageRating}</div>
                <div className="flex justify-center gap-0.5 text-amber-400 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const diff = parseFloat(averageRating) - star;
                    return (
                      <Star 
                        key={star} 
                        className={`w-4 h-4 ${diff >= 0 ? 'fill-amber-400' : diff >= -0.5 ? 'fill-amber-400 opacity-50' : 'text-zinc-700'}`} 
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">{totalRatings} viagens avaliadas</span>
              </div>

              {/* Progress bars distribution */}
              <div className="flex-1 space-y-1 text-xs">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const pct = getRatingPercent(star);
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="w-3 text-right font-mono text-zinc-500">{star}</span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="w-8 text-right text-[10px] font-mono text-zinc-500">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 flex flex-col justify-center items-center">
            {loadingRatings ? (
              <p className="text-xs text-zinc-500 animate-pulse font-mono">Buscando avaliações em tempo real...</p>
            ) : totalRatings === 0 ? (
              <p className="text-xs text-zinc-500 italic text-center">Nenhuma avaliação recebida via Firestore ainda.</p>
            ) : (
              <p className="text-xs text-emerald-500 font-mono text-center">✓ Sincronizado com os dados de feedback dos passageiros</p>
            )}
          </div>
        </div>

        {/* Card 3: Visão de Veículo Rápida (1/3) */}
        <div className={`p-6 rounded-xl border flex flex-col justify-between ${isDarkMode ? 'bg-[#111] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <div>
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Carro de Trabalho</h3>
            
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                <Car className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h4 className="font-semibold text-base leading-snug">{vehicle.make || 'Carro'} {vehicle.model || 'Geral'}</h4>
                <p className="text-xs text-zinc-500 font-mono">Ano {vehicle.year || 'N/A'} • {vehicle.color || 'N/A'}</p>
                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  vehicle.ownership_status === 'rented' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  vehicle.ownership_status === 'financed' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {vehicle.ownership_status === 'rented' ? 'Alugado' :
                   vehicle.ownership_status === 'financed' ? 'Financiado' : 'Próprio/Quitado'}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs font-sans">
              <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                <span className="text-zinc-500">Consumo Médio</span>
                <span className="font-mono font-medium">{avgConsumption} KM/L (Gasolina)</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800/40 pb-2">
                <span className="text-zinc-500">Estimativa Combustível</span>
                <span className="font-mono font-medium text-red-400">{formatCurrency(fuelCostPerKm)} / KM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Meta de KM Mensal</span>
                <span className="font-mono font-medium">{vehicle.monthly_km_goal || 3000} KM</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs">
            <span className="text-zinc-500">Alterar dados do veículo?</span>
            <button 
              onClick={() => setActiveTab('garage')}
              className="text-emerald-500 hover:underline flex items-center gap-1 font-medium"
            >
              Minha Garagem <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* Seção de Métricas de Ganhos Mensais */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Card de Faturamento e Gráfico (2/3) */}
        <div className={`xl:col-span-2 p-6 rounded-xl border flex flex-col justify-between ${isDarkMode ? 'bg-[#111] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Análise Financeira Consolidada</h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">Período de referência: {getMonthLabel()}</p>
              </div>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 border border-emerald-500/20 rounded-full font-semibold font-mono">
                Competência Mensal
              </span>
            </div>

            {/* Sub metrics inside analysis */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-zinc-950/60' : 'bg-zinc-50'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-zinc-500 font-medium uppercase">Fat. Bruto</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                </div>
                <h4 className="text-xl font-bold font-mono text-emerald-500">{formatCurrency(totalGross)}</h4>
                <p className="text-[10px] text-zinc-500 leading-none mt-1">Viagens + Lançamentos extras</p>
              </div>

              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-zinc-950/60' : 'bg-zinc-50'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-zinc-500 font-medium uppercase">Despesas Totais</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                </div>
                <h4 className="text-xl font-bold font-mono text-red-400">{formatCurrency(totalExpenses)}</h4>
                <p className="text-[10px] text-zinc-500 leading-none mt-1">Combustível + Custo Fixo Carro</p>
              </div>

              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-zinc-950/60' : 'bg-zinc-50'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-zinc-500 font-medium uppercase">Renda Líquida</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                </div>
                <h4 className={`text-xl font-bold font-mono ${totalNet >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {formatCurrency(totalNet)}
                </h4>
                <p className="text-[10px] text-zinc-500 leading-none mt-1">Ganhos limpos no seu bolso</p>
              </div>
            </div>

            {/* Recharts BarChart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#222' : '#eee'} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke={isDarkMode ? '#666' : '#999'} 
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke={isDarkMode ? '#666' : '#999'} 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `R$ ${val}`}
                  />
                  <Tooltip 
                    cursor={{ fill: isDarkMode ? '#1f1f1f' : '#f4f4f5' }}
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#111' : '#fff', 
                      borderColor: isDarkMode ? '#333' : '#e4e4e7',
                      color: isDarkMode ? '#fff' : '#000',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Valor']}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 text-xs leading-relaxed ${isDarkMode ? 'bg-zinc-950/60 text-zinc-400' : 'bg-zinc-100 text-zinc-600'}`}>
            <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-500">Como é calculada a despesa? </span>
              Somamos os custos fixos mensais declarados por você na Garagem ({formatCurrency(totalVehicleFixed)}) com estimativas de desgaste combustível baseadas nas suas viagens e diários ({formatCurrency(fuelExpenseEstimate + maintenanceExpenseEstimate)} correspondentes a {logsKm} KMs rodados) mais lançamentos adicionais de despesa ({formatCurrency(extraExpenses)}).
            </div>
          </div>
        </div>

        {/* Card do Progresso de Meta (1/3) */}
        <div className={`p-6 rounded-xl border flex flex-col justify-between ${isDarkMode ? 'bg-[#111] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
          <div>
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-6">Status da Meta</h3>

            <div className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center">
                {/* Visual Circular Gauge with SVG */}
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={isDarkMode ? '#222' : '#eee'}
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#10b981"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 56}
                    strokeDashoffset={2 * Math.PI * 56 * (1 - goalProgress / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-bold font-mono">{goalProgress}%</span>
                  <p className="text-[9px] text-zinc-500 uppercase leading-none mt-0.5">Alcançado</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                  <span>Meta Mensal Declarada</span>
                  <span className="font-mono text-emerald-500">{formatCurrency(monthlyGoal)}</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${goalProgress}%` }}></div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Saldo Atual Líquido:</span>
                <span className="font-semibold font-mono text-emerald-400">{formatCurrency(totalNet)}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Restante para Meta:</span>
                <span className="font-semibold font-mono text-blue-400">
                  {totalNet >= monthlyGoal ? 'Meta Atingida!' : formatCurrency(monthlyGoal - totalNet)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 mt-8 flex flex-col gap-2">
            {totalNet >= monthlyGoal ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-center text-emerald-400 font-semibold flex items-center justify-center gap-2">
                <Award className="w-4 h-4 animate-bounce" /> Parabéns! Meta mensal batida.
              </div>
            ) : (
              <div className="text-xs text-zinc-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Resta pouco mais para atingir o faturamento livre pretendido!</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Seção das Viagens Avaliadas via Firestore */}
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#111] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Viagens Avaliadas</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Feedbacks recentes de seus passageiros registrados no Firestore.</p>
          </div>
          <span className="text-xs font-mono bg-zinc-800 border border-zinc-700/60 px-3 py-1 rounded-full text-zinc-400">
            {totalRatings} Avaliações
          </span>
        </div>

        {ratedRides.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-zinc-800/80 rounded-xl">
            <UserIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Nenhuma viagem avaliada disponível ainda.</p>
            <p className="text-xs text-zinc-500 mt-1">Ao receber corridas no App Passageiro, elas aparecerão listadas aqui com suas estrelas correspondentes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ratedRides.slice(0, 6).map((ride: any) => {
              const d = new Date(ride.createdAt || ride.scheduled_time || now);
              return (
                <div 
                  key={ride.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between hover:border-emerald-500/30 transition-all ${
                    isDarkMode ? 'bg-zinc-950/40 border-zinc-800/60' : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div>
                      <h4 className="font-semibold text-sm">{ride.passengerName || 'Passageiro'}</h4>
                      <p className="text-[10px] text-zinc-500 font-mono">{d.toLocaleDateString('pt-BR')} às {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="flex gap-0.5 text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-3.5 h-3.5 ${star <= (ride.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} 
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 mt-2 text-xs text-zinc-400 font-sans border-t border-zinc-900 pt-2.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="truncate">{ride.origin}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      <span className="truncate">{ride.destination}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
