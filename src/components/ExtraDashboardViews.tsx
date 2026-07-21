import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, MapPin, Calendar, Play, Square, DollarSign, 
  Activity, TrendingUp, Compass, Shield, Zap, Clock, 
  Sparkles, Calculator, ChevronRight, Plus, Trash2, Heart 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line 
} from 'recharts';

// Format currency helper
const formatBRL = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// --- 1. COMUNIDADE (Community Feed) ---
interface CommunityProps {
  user: any;
  posts: any[];
  onRefresh: () => void;
}
export function CommunityView({ user, posts, onRefresh }: CommunityProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;
    setLoading(true);
    try {
      const response = await fetch('/api/community-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user.uid,
          content
        })
      });
      if (response.ok) {
        setContent('');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      const response = await fetch(`/api/community-posts/${postId}/like`, {
        method: 'POST'
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-500" />
          Compartilhar com a Comunidade
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Dica de posto barato? Trânsito intenso? Compartilhe com os colegas..."
            rows={3}
            className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl p-4 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-colors resize-none"
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 border border-zinc-800/50 rounded-xl">
            Nenhuma publicação ainda. Seja o primeiro a compartilhar!
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-[#111] border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    {post.author_name ? post.author_name.slice(0, 2).toUpperCase() : 'MT'}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{post.author_name}</h4>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {new Date(post.createdAt || Date.now()).toLocaleDateString('pt-BR')} às {new Date(post.createdAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-zinc-300 mb-4 whitespace-pre-wrap">{post.content}</p>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <button 
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-1.5 hover:text-red-400 transition-colors"
                >
                  <Heart className="w-4 h-4 text-zinc-600 hover:text-red-400" />
                  <span>{post.likes}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


// --- 2. JORNADAS DE TRABALHO (Journeys / Shifts) ---
interface JourneyProps {
  user: any;
  journeys: any[];
  onRefresh: () => void;
  costPerKm: number;
}
export function JourneyView({ user, journeys, onRefresh, costPerKm }: JourneyProps) {
  const [activeJourney, setActiveJourney] = useState<any>(null);
  const [timeStr, setTimeStr] = useState('00:00:00');
  const [showEndModal, setShowEndModal] = useState(false);
  const [earnings, setEarnings] = useState('');
  const [kmDriven, setKmDriven] = useState('');

  // Find active journey on mount or when journeys change
  useEffect(() => {
    const active = journeys.find(j => j.status === 'active');
    setActiveJourney(active);
  }, [journeys]);

  // Handle active journey timer
  useEffect(() => {
    if (!activeJourney) return;
    const interval = setInterval(() => {
      const start = new Date(`${activeJourney.date}T${activeJourney.start_time}`);
      const diffMs = Date.now() - start.getTime();
      if (diffMs > 0) {
        const secs = Math.floor(diffMs / 1000) % 60;
        const mins = Math.floor(diffMs / (1000 * 60)) % 60;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        setTimeStr([
          hours.toString().padStart(2, '0'),
          mins.toString().padStart(2, '0'),
          secs.toString().padStart(2, '0')
        ].join(':'));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeJourney]);

  const handleStart = async () => {
    if (!user) return;
    const now = new Date();
    const start_time = now.toTimeString().split(' ')[0];
    const date = now.toISOString().split('T')[0];

    try {
      const response = await fetch('/api/journeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user.uid,
          date,
          start_time
        })
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJourney) return;
    const now = new Date();
    const end_time = now.toTimeString().split(' ')[0];

    // Calculate hours worked
    const start = new Date(`${activeJourney.date}T${activeJourney.start_time}`);
    const durationHours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);

    try {
      const response = await fetch(`/api/journeys/${activeJourney.id}/end`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          end_time,
          earnings: Number(earnings),
          km_driven: Number(kmDriven),
          hours_worked: Number(durationHours.toFixed(2))
        })
      });
      if (response.ok) {
        // Also automatically create a daily log for simplicity!
        await fetch('/api/daily-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebase_uid: user.uid,
            date: activeJourney.date,
            earnings: Number(earnings),
            km: Number(kmDriven),
            hours_worked: Number(durationHours.toFixed(2)),
            notes: `Jornada finalizada: ${activeJourney.start_time} - ${end_time}`
          })
        });

        setEarnings('');
        setKmDriven('');
        setShowEndModal(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Control Panel */}
      <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6">
        {activeJourney ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-emerald-500 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                  <Activity className="w-4 h-4" /> Jornada de Trabalho Ativa
                </span>
                <p className="text-xs text-zinc-500 mt-1 font-mono">Iniciada às {activeJourney.start_time}</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-mono font-medium text-white">{timeStr}</span>
              </div>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
              <div>
                <h4 className="text-sm font-medium text-white">Pronto para encerrar?</h4>
                <p className="text-xs text-zinc-500 mt-0.5">Insira seus ganhos e km rodados para calcular lucro líquido real.</p>
              </div>
              <button
                onClick={() => setShowEndModal(true)}
                className="bg-red-500 hover:bg-red-400 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2 shrink-0 shadow-lg shadow-red-950/20"
              >
                <Square className="w-4 h-4" /> Finalizar Jornada
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Inicie sua Jornada de Trabalho</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">Monitore seu tempo real em trânsito e calcule faturamento por hora automaticamente.</p>
            </div>
            <button
              onClick={handleStart}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 rounded-xl text-sm transition-colors inline-flex items-center gap-2 shadow-lg shadow-emerald-950/20"
            >
              <Play className="w-4 h-4" /> Iniciar Turno de Hoje
            </button>
          </div>
        )}
      </div>

      {/* History List */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4">Histórico de Jornadas</h3>
        <div className="bg-[#111] border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
          {journeys.filter(j => j.status === 'completed').length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Nenhuma jornada anterior registrada no banco.</div>
          ) : (
            journeys.filter(j => j.status === 'completed').map((journey) => {
              const netProfit = journey.earnings - (journey.km_driven * costPerKm);
              return (
                <div key={journey.id} className="p-5 hover:bg-zinc-900/30 transition-colors flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">
                        {new Date(journey.date).toLocaleDateString('pt-BR', { weekday: 'long' })}, {new Date(journey.date).toLocaleDateString('pt-BR')}
                      </p>
                      <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">
                        {journey.hours_worked} h
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Horário: {journey.start_time} - {journey.end_time} • {journey.km_driven} km rodados
                    </p>
                  </div>
                  <div className="text-right flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                    <div>
                      <p className="text-sm font-semibold text-emerald-400">{formatBRL(journey.earnings)}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 font-mono">Lucro Líquido: <span className={netProfit > 0 ? 'text-emerald-500' : 'text-red-400'}>{formatBRL(netProfit)}</span></p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* End Shift Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <header className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Finalizar Turno</h2>
              <button onClick={() => setShowEndModal(false)} className="text-zinc-500 hover:text-white"><XIcon /></button>
            </header>
            <form onSubmit={handleEndSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-500 mb-1.5">Ganhos Brutos (R$)</label>
                <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3">
                  <span className="text-zinc-500 text-sm mr-1">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={earnings}
                    onChange={(e) => setEarnings(e.target.value)}
                    required
                    className="bg-transparent border-none outline-none text-white w-full text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-500 mb-1.5">Distância Percorrida (KM)</label>
                <div className="relative flex items-center bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={kmDriven}
                    onChange={(e) => setKmDriven(e.target.value)}
                    required
                    className="bg-transparent border-none outline-none text-white w-full text-sm"
                  />
                  <span className="text-zinc-500 text-sm ml-1">km</span>
                </div>
              </div>
              <footer className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowEndModal(false)}
                  className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-red-500 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
                >
                  Confirmar e Salvar
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


// --- 3. RECHARTS 30-DAY SUMMARY CHART (Corridas & Despesas) ---
interface RechartsProps {
  rides: any[];
  financialRecords: any[];
  costPerKm: number;
}
export function Recharts30DaySummary({ rides, financialRecords, costPerKm }: RechartsProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Generate past 30 days of daily stats
    const list: any[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      // Calculate total earnings for passenger rides on this day
      let dayPassengerEarnings = 0;
      rides.forEach((r: any) => {
        if (r.status === 'completed') {
          const rd = new Date(r.createdAt);
          if (rd.getDate() === d.getDate() && rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear()) {
            dayPassengerEarnings += Number(r.price);
          }
        }
      });

      // Calculate other expenses/revenues on this day
      let otherExpenses = 0;
      let otherRevenues = 0;
      financialRecords.forEach((f: any) => {
        const fd = new Date(f.date);
        if (fd.getDate() === d.getDate() && fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear()) {
          if (f.type === 'expense') {
            otherExpenses += Number(f.amount);
          } else {
            otherRevenues += Number(f.amount);
          }
        }
      });

      list.push({
        name: dayLabel,
        Ganhos: dayPassengerEarnings + otherRevenues,
        Despesas: otherExpenses
      });
    }
    setChartData(list);
  }, [rides, financialRecords]);

  const totalGanhos = chartData.reduce((sum, item) => sum + item.Ganhos, 0);
  const totalDespesas = chartData.reduce((sum, item) => sum + item.Despesas, 0);

  return (
    <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Balanço Financeiro (Últimos 30 dias)
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Gráfico de desempenho integrando corridas do aplicativo e despesas adicionais.</p>
        </div>
        <div className="flex gap-4 text-xs font-mono">
          <div className="bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800">
            <span className="text-zinc-500 block">Total Faturado</span>
            <span className="text-emerald-400 font-semibold text-sm">{formatBRL(totalGanhos)}</span>
          </div>
          <div className="bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800">
            <span className="text-zinc-500 block">Total Despesas</span>
            <span className="text-red-400 font-semibold text-sm">{formatBRL(totalDespesas)}</span>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-80 w-full font-mono text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="name" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
              labelStyle={{ fontWeight: 'bold', color: '#10b981' }}
            />
            <Legend />
            <Bar dataKey="Ganhos" fill="#10b981" radius={[4, 4, 0, 0]} name="Ganhos (R$)" />
            <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas (R$)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


// --- 4. SMART PLANNER (Suggestions & Agenda Planner) ---
interface PlannerProps {
  user: any;
  planners: any[];
  onRefresh: () => void;
}
export function SmartPlannerView({ user, planners, onRefresh }: PlannerProps) {
  const [day, setDay] = useState('Segunda-feira');
  const [shift, setShift] = useState('morning');
  const [action, setAction] = useState('');
  const [rev, setRev] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action.trim() || !user) return;
    setLoading(true);
    try {
      const response = await fetch('/api/smart-planners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user.uid,
          day_of_week: day,
          shift,
          recommended_action: action,
          expected_revenue: Number(rev || 100)
        })
      });
      if (response.ok) {
        setAction('');
        setRev('');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/smart-planners/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-500" />
          Planejar Rota Inteligente
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Dia da Semana</label>
            <select 
              value={day} 
              onChange={e => setDay(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors text-sm"
            >
              <option value="Segunda-feira">Segunda-feira</option>
              <option value="Terça-feira">Terça-feira</option>
              <option value="Quarta-feira">Quarta-feira</option>
              <option value="Quinta-feira">Quinta-feira</option>
              <option value="Sexta-feira">Sexta-feira</option>
              <option value="Sábado">Sábado</option>
              <option value="Domingo">Domingo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Turno</label>
            <select 
              value={shift} 
              onChange={e => setShift(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors text-sm"
            >
              <option value="morning">Manhã (06h - 12h)</option>
              <option value="afternoon">Tarde (12h - 18h)</option>
              <option value="night">Noite / Madrugada (18h - 06h)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-zinc-500 mb-1">Estratégia do Período</label>
            <input
              type="text"
              placeholder="Ex: Focar nas saídas de hotéis em Alphaville sentido Congonhas..."
              value={action}
              onChange={e => setAction(e.target.value)}
              required
              className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Ganhos Estimados (R$)</label>
            <input
              type="number"
              placeholder="150"
              value={rev}
              onChange={e => setRev(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !action.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Adicionar ao Plano'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {planners.map((p) => (
          <div key={p.id} className="bg-[#111] border border-zinc-800 rounded-xl p-5 flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400 font-mono">{p.day_of_week}</span>
                <span className="text-[10px] text-zinc-500 uppercase font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  {p.shift === 'morning' ? 'Manhã' : p.shift === 'afternoon' ? 'Tarde' : 'Noite'}
                </span>
              </div>
              <p className="text-sm text-white mt-2 font-medium">{p.recommended_action}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-2 shrink-0">
              <span className="text-sm font-semibold text-white font-mono">{formatBRL(p.expected_revenue)}</span>
              <button 
                onClick={() => handleDelete(p.id)}
                className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-950/20 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// --- 5. TAXÍMETRO (Digital Real-Time Taximeter Simulation) ---
interface TaximeterProps {
  user: any;
  onSaveRecord: (price: number, profit: number) => void;
  costPerKm: number;
}
export function TaximeterView({ user, onSaveRecord, costPerKm }: TaximeterProps) {
  const [running, setRunning] = useState(false);
  const [timer, setTimer] = useState(0);
  const [distance, setDistance] = useState(0);
  const [rateType, setRateType] = useState('standard'); // standard, premium, dynamic

  // Rates Configuration
  const rates: any = {
    standard: { name: 'Bandeira 1', base: 5.50, perKm: 3.20, perMin: 0.45 },
    premium: { name: 'Bandeira 2 (Noturno)', base: 6.80, perKm: 3.90, perMin: 0.55 },
    dynamic: { name: 'Tarifa Dinâmica (1.5x)', base: 8.25, perKm: 4.80, perMin: 0.68 }
  };

  const selectedRate = rates[rateType];

  // Calculation formulas
  const currentPrice = selectedRate.base + (distance * selectedRate.perKm) + ((timer / 60) * selectedRate.perMin);
  const currentCosts = distance * costPerKm;
  const currentProfit = currentPrice - currentCosts;

  // Running simulator trigger
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
      // Simulate real-time progress: add 0.04 km every second
      setDistance(prev => prev + 0.04);
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const handleStartStop = () => {
    if (running) {
      // Stopping
      setRunning(false);
    } else {
      // Starting
      setTimer(0);
      setDistance(0);
      setRunning(true);
    }
  };

  const handleFinalize = async () => {
    setRunning(false);
    if (!user) return;
    try {
      const response = await fetch('/api/simulator-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: user.uid,
          origin: 'Corrida do Taxímetro',
          destination: 'Calculadora Digital',
          distance_km: Number(distance.toFixed(2)),
          duration_mins: Number((timer / 60).toFixed(1)),
          calculated_price: Number(currentPrice.toFixed(2)),
          net_profit: Number(currentProfit.toFixed(2))
        })
      });
      if (response.ok) {
        onSaveRecord(currentPrice, currentProfit);
        setTimer(0);
        setDistance(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-500" />
            Taxímetro Digital Ativo
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Calcule corridas particulares em tempo real com tarifas pré-definidas.</p>
        </div>
        <select
          value={rateType}
          onChange={e => setRateType(e.target.value)}
          disabled={running}
          className="bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-mono"
        >
          <option value="standard">Bandeira 1 (Urbano)</option>
          <option value="premium">Bandeira 2 (Noite/FDS)</option>
          <option value="dynamic">Dinâmica (Alta demanda)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-black border border-zinc-800/80 p-6 rounded-2xl text-center">
        <div>
          <span className="text-xs text-zinc-500 block uppercase font-mono mb-1">Preço Atual</span>
          <span className="text-4xl font-mono font-bold text-emerald-400">{formatBRL(currentPrice)}</span>
        </div>
        <div>
          <span className="text-xs text-zinc-500 block uppercase font-mono mb-1">Distância</span>
          <span className="text-3xl font-mono font-medium text-white">{distance.toFixed(2)} KM</span>
        </div>
        <div>
          <span className="text-xs text-zinc-500 block uppercase font-mono mb-1">Tempo de Corrida</span>
          <span className="text-3xl font-mono font-medium text-white">{formatTime(timer)}</span>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleStartStop}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
            running ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-emerald-500 text-black hover:bg-emerald-400'
          }`}
        >
          {running ? 'Pausar Taxímetro' : 'Iniciar Viagem'}
        </button>
        {(timer > 0 || distance > 0) && (
          <button
            onClick={handleFinalize}
            className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-red-400 px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            Finalizar e Salvar
          </button>
        )}
      </div>

      {/* Rate details banner */}
      <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/60 text-xs text-zinc-500 space-y-1.5 font-mono">
        <p>Configuração Ativa: <span className="text-zinc-300 font-semibold">{selectedRate.name}</span></p>
        <p>Tarifa Base: {formatBRL(selectedRate.base)} • R$ {selectedRate.perKm.toFixed(2)}/km • R$ {selectedRate.perMin.toFixed(2)}/min</p>
        <p>Depreciação Veículo Estimada: <span className="text-red-400">{formatBRL(currentCosts)}</span> • Lucro Líquido Previsto: <span className="text-emerald-400">{formatBRL(currentProfit)}</span></p>
      </div>
    </div>
  );
}


// --- 6. FUTURO INTELIGENTE (AI Tomorrow Prediction) ---
interface PredictProps {
  user: any;
  netIncomeGoal: number;
}
export function FuturePredictionView({ user, netIncomeGoal }: PredictProps) {
  const [date, setDate] = useState('');
  const [predict, setPredict] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate smart AI predictions based on goal and weekday patterns
    setTimeout(() => {
      const parsedDate = new Date(date + 'T12:00:00');
      const dayOfWeek = parsedDate.getDay(); // 0 = Sunday, etc.
      
      let score = 70; // standard weekday
      let text = 'Demanda estável corporativa. Concentre-se nas janelas de 07h-10h e 17h-20h.';
      let estEarnings = (netIncomeGoal / 22) * 1.05;

      if (dayOfWeek === 0) { // Sunday
        score = 50;
        text = 'Domingo com demanda residencial menor. Foco em saídas de shoppings e aeroportos à tarde.';
        estEarnings = (netIncomeGoal / 22) * 0.75;
      } else if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday, Saturday
        score = 95;
        text = 'Alta tarifa dinâmica esperada devido a eventos de fim de semana e vida noturna!';
        estEarnings = (netIncomeGoal / 22) * 1.45;
      } else if (dayOfWeek === 4) { // Thursday
        score = 85;
        text = 'Quinta-feira com fluxo corporativo forte de happy hour. Alta conversão de chamadas.';
        estEarnings = (netIncomeGoal / 22) * 1.20;
      }

      setPredict({
        score,
        earnings: estEarnings,
        advice: text,
        dinamica: score > 80 ? 'Elevada (1.4x - 2.1x)' : 'Normal/Estável (1.0x - 1.3x)'
      });
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 space-y-6 animate-in fade-in">
      <div>
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500 animate-bounce" />
          Previsão de Ganhos Futura (AI)
        </h3>
        <p className="text-xs text-zinc-500 mt-1">Nossa inteligência analisa dados históricos regionais para sugerir sua escala ideal de amanhã.</p>
      </div>

      <form onSubmit={handlePredict} className="flex gap-3">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="flex-1 bg-[#1a1a1a] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors [color-scheme:dark]"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Analisando...' : 'Prever'}
        </button>
      </form>

      {predict && (
        <div className="p-5 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-4 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs text-zinc-500 block font-mono">Ganhos Previstos</span>
              <span className="text-2xl font-bold text-white font-mono">{formatBRL(predict.earnings)}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-500 block font-mono">Índice de Demanda</span>
              <span className={`text-sm font-semibold font-mono ${predict.score > 80 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                {predict.score}% ({predict.score > 80 ? 'Excelente' : 'Bom'})
              </span>
            </div>
          </div>
          <div className="pt-3 border-t border-zinc-800 text-xs text-zinc-400 font-mono space-y-1.5">
            <p>Tarifa Dinâmica Esperada: <span className="text-emerald-400 font-semibold">{predict.dinamica}</span></p>
            <p className="text-zinc-300 italic">"Recomendação do Sistema: {predict.advice}"</p>
          </div>
        </div>
      )}
    </div>
  );
}


// Simple XIcon mock for modals
function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
