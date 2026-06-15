import React, { useState } from 'react';
import { Lock, User as UserIcon, Key, AlertCircle, Eye, EyeOff, ShieldCheck, HelpCircle } from 'lucide-react';
import { ActiveUser } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: ActiveUser) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // States for password change flow
  const [mustChangePasswordUser, setMustChangePasswordUser] = useState<ActiveUser | null>(null);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Credenciais incorretas.');
        setLoading(false);
        return;
      }

      const loggedUser: ActiveUser = data.user;

      if (loggedUser.mustChangePassword) {
        // Intercept to display direct password reset
        setMustChangePasswordUser(loggedUser);
        setCurrentPasswordInput(password); // Pre-fill current password
        setLoading(false);
      } else {
        // Direct success
        onLoginSuccess(loggedUser);
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor. Tente novamente.');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      setChangeError('Por favor, preencha a nova senha.');
      return;
    }

    if (newPassword.length < 3) {
      setChangeError('A nova senha deve ter no mínimo 3 caracteres.');
      return;
    }

    if (newPassword === currentPasswordInput) {
      setChangeError('A nova senha deve ser diferente da senha atual.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangeError('A confirmação da nova senha não confere.');
      return;
    }

    setChangeError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: mustChangePasswordUser?.username,
          oldPassword: currentPasswordInput,
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setChangeError(data.message || 'Erro ao redefinir a senha.');
        setLoading(false);
        return;
      }

      setChangeSuccess(true);
      setTimeout(() => {
        // Complete the auth flow with updated fields
        if (mustChangePasswordUser) {
          onLoginSuccess({
            ...mustChangePasswordUser,
            mustChangePassword: false
          });
        }
      }, 1500);
    } catch (err) {
      setChangeError('Erro ao conectar ao servidor. Tente novamente.');
      console.error('Change password error:', err);
      setLoading(false);
    }
  };

  if (mustChangePasswordUser) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 selection:bg-emerald-800 selection:text-white" id="password-reset-container">
        <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-amber-50 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-200">
              <Key className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-zinc-950 font-sans">Primeiro Acesso Detectado</h2>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
              Olá, <strong>{mustChangePasswordUser.name}</strong>. Para garantir a segurança de sua conta, altere sua senha temporária agora.
            </p>
          </div>

          {changeSuccess ? (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-150 p-4 text-center mt-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-800">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-emerald-950">Senha alterada com sucesso!</p>
              <p className="text-xs text-emerald-700 mt-0.5">Iniciando o painel de bordo...</p>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {changeError && (
                <div className="bg-rose-50 border border-rose-150 rounded-2xl p-3.5 flex gap-2.5 text-xs text-rose-900">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{changeError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Senha Atual (Temporária)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={currentPasswordInput}
                    disabled // Fixed from login prefill
                    className="w-full text-sm py-2 px-3 pl-9 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-500 outline-none"
                  />
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-1">Nova Senha</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Insira nova senha segura"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full text-sm py-2 px-3 pl-9 bg-zinc-50/50 hover:bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-800 placeholder-zinc-400"
                  />
                  <Key className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-1">Confirme a Nova Senha</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Repita a nova senha criada"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    className="w-full text-sm py-2 px-3 pl-9 bg-zinc-50/50 hover:bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-800 placeholder-zinc-400"
                  />
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-950 hover:bg-emerald-900 cursor-pointer text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 mt-6"
              >
                {loading ? 'Redefinindo...' : 'Atualizar Senha & Acessar'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/60 flex flex-col items-center justify-center p-4 selection:bg-emerald-800 selection:text-white" id="login-container">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
        
        {/* Brand/Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-emerald-950 text-white px-3 py-1.5 rounded-full text-xs font-bold font-sans border border-emerald-900 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Calculadora Manobra</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-150 rounded-2xl p-3.5 flex gap-2.5 text-xs text-rose-900 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-1.5" htmlFor="login-username">Login de Usuário</label>
            <div className="relative">
              <input
                id="login-username"
                type="text"
                placeholder="Insira seu login de militar"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full text-sm py-2 px-3 pl-9 bg-zinc-50/50 hover:bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 placeholder-zinc-400 transition-colors"
                autoComplete="username"
              />
              <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-1.5" htmlFor="login-password">Senha</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Insira sua senha cadastrada"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full text-sm py-2 px-3 lg:pr-10 pl-9 bg-zinc-50/50 hover:bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 placeholder-zinc-400 transition-colors"
                autoComplete="current-password"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none p-1"
                title={showPassword ? "Esconder senha" : "Ver senha"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-950 hover:bg-emerald-900 cursor-pointer text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 mt-6 active:scale-[0.98]"
          >
            {loading ? 'Verificando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
