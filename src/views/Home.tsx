import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Smartphone, CheckCircle2, User as UserIcon, LogOut } from 'lucide-react';
import { initAuth, googleSignIn, logout } from '../firebase';
import { User as FirebaseUser } from 'firebase/auth';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [driverUrl, setDriverUrl] = useState<string>('joao'); // Default mock

  useEffect(() => {
    initAuth(
      (u) => {
        setUser(u);
        // Fetch their driver profile to get their custom URL
        fetch(`/api/dashboard/${u.uid}`)
          .then(async res => {
            const ct = res.headers.get('content-type');
            if (res.ok && ct && ct.includes('application/json')) {
              return res.json();
            }
            return null;
          })
          .then(data => {
            if (data?.driver?.custom_url) {
              setDriverUrl(data.driver.custom_url);
            }
          })
          .catch(console.error);
      },
      () => {
        setUser(null);
      }
    );
  }, []);

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) setUser(result.user);
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        // Ignored cancellation
      } else {
        console.error('Login failed:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-zinc-800">
      <div className="max-w-4xl mx-auto px-6 py-24">
        
        <header className="mb-16 text-center relative">
          <div className="absolute top-0 right-0 flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4 bg-[#111] border border-zinc-800 px-4 py-2 rounded-full">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <UserIcon className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <div className="w-px h-4 bg-zinc-800"></div>
                <button onClick={logout} className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors">
                <UserIcon className="w-4 h-4" /> Entrar
              </button>
            )}
          </div>

          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full mb-6 mt-12 md:mt-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Sistema Full-Stack Operacional
          </div>
          <h1 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-4">DriverMetrics Pro</h1>
          <p className="text-zinc-500 text-lg max-w-xl mx-auto">
            Ecossistema completo de mobilidade e gestão. Selecione abaixo qual interface você deseja acessar.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Driver Gateway */}
          <div 
            onClick={() => navigate('/dashboard')}
            className="group cursor-pointer bg-[#111] border border-zinc-800 hover:border-zinc-600 p-8 rounded-2xl transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-black transition-colors">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-medium text-white mb-2">Painel do Motorista</h2>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              Acesse o dashboard financeiro, veja estatísticas de lucro real por KM, agenda de corridas e simulador.
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Web</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> API Node.js</span>
            </div>
          </div>

          {/* Passenger Gateway */}
          <div 
            onClick={() => navigate(`/reservar/${driverUrl}`)}
            className="group cursor-pointer bg-[#111] border border-zinc-800 hover:border-zinc-600 p-8 rounded-2xl transition-all relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
              <Smartphone className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-medium text-white mb-2">Web App Passageiro</h2>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              Simule a interface mobile-first do passageiro. Reserve corridas, calcule a distância e veja o preço exato.
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Mobile UI</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Maps Integration</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
