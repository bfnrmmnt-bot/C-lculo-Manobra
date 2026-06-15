import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, ShieldAlert, ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { ActiveUser } from '../types';

interface UserManagementProps {
  currentUser: ActiveUser;
  onClose: () => void;
}

interface ManagedUser {
  username: string;
  name: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
}

export default function UserManagement({ currentUser, onClose }: UserManagementProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Create user form states
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Falha ao obter lista de usuários.');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError('Não foi possível carregar os usuários cadastrados.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (newUsername.trim().toLowerCase() === 'admin') {
      setFormError('O login "admin" já é utilizado pelo sistema.');
      return;
    }

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          username: newUsername.trim().toLowerCase(),
          password: newPassword.trim(),
          isAdmin: newIsAdmin
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setFormError(data.message || 'Erro ao criar usuário.');
        return;
      }

      setFormSuccess(`Usuário "${newName}" adicionado com sucesso!`);
      
      // Reset form fields
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewIsAdmin(false);

      // Refresh list
      fetchUsers();
    } catch (err) {
      setFormError('Erro ao conectar ao servidor. Tente novamente.');
      console.error(err);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username.toLowerCase() === 'admin') {
      alert('Não é possível excluir o usuário administrador padrão.');
      return;
    }

    if (username.toLowerCase() === currentUser.username.toLowerCase()) {
      alert('Você não pode excluir sua própria conta enquanto estiver conectado.');
      return;
    }

    if (!confirm(`Tem certeza de que deseja excluir permanentemente o acesso do usuário "${username}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${username}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao excluir usuário.');
      }

      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir usuário.');
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xs max-w-5xl mx-auto" id="user-management-panel">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-zinc-150 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer text-zinc-500 hover:text-zinc-800"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-zinc-950 font-sans tracking-tight">Gerenciamento de Usuários</h2>
            <p className="text-xs text-zinc-500">Crie, visualize e remova acessos ao sistema de cálculo.</p>
          </div>
        </div>

        <button
          onClick={fetchUsers}
          className="p-2 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer text-zinc-500 hover:text-emerald-800"
          title="Recarregar Lista"
          disabled={loading}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Create User Form */}
        <div className="lg:col-span-5 bg-zinc-50/50 p-5 rounded-2xl border border-zinc-200">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-emerald-800" />
            Cadastrar Novo Acesso
          </h3>

          <form onSubmit={handleCreateUser} className="space-y-4">
            {formError && (
              <div className="bg-rose-50 border border-rose-150 rounded-xl p-3 flex gap-2 text-xs text-rose-900">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-3 flex gap-2 text-xs text-emerald-950">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-800 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block mb-1">Nome Completo do Militar</label>
              <input
                type="text"
                placeholder="Ex: 2º SG Silva"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full text-xs py-2 px-3 bg-white border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-800 placeholder-zinc-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block mb-1">Login (Nome de Usuário)</label>
              <input
                type="text"
                placeholder="Ex: silva"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                className="w-full text-xs py-2 px-3 bg-white border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-800 placeholder-zinc-400"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Apenas letras e números. Será convertido em minúsculas.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block mb-1">Senha Inicial Temporária</label>
              <input
                type="text"
                placeholder="Defina uma senha temporária"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full text-xs py-2 px-3 bg-white border border-zinc-200 rounded-xl text-zinc-850 focus:outline-none focus:ring-1 focus:ring-emerald-800 placeholder-zinc-400 font-mono"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">O militar precisará alterar no primeiro acesso.</span>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newIsAdmin}
                  onChange={(e) => setNewIsAdmin(e.target.checked)}
                  className="rounded border-zinc-300 text-emerald-800 focus:ring-emerald-800 w-4 h-4"
                />
                <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-zinc-500" />
                  Privilégios de Administrador
                </span>
              </label>
              <span className="text-[10px] text-zinc-450 block ml-6 mt-0.5 font-sans leading-tight">
                Permite que este usuário também acesse este painel de gerenciamento para criar e remover outros usuários.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-3 bg-emerald-950 hover:bg-emerald-900 cursor-pointer text-white text-xs font-bold rounded-xl transition-colors shadow-xs mt-3 text-center"
            >
              Criar Usuário
            </button>
          </form>
        </div>

        {/* Right column: Users List */}
        <div className="lg:col-span-7">
          <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center justify-between">
            <span>Usuários Cadastrados ({users.length})</span>
            {loading && <span className="text-xs text-zinc-400 font-normal">Sincronizando...</span>}
          </h3>

          {error && (
            <div className="bg-rose-50 border border-rose-150 rounded-2xl p-4 flex gap-2.5 text-xs text-rose-900 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Nome / Militar</th>
                    <th className="py-3 px-4">Login</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150 text-xs text-zinc-900">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-400">
                        Nenhum usuário localizado.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.username} className="hover:bg-zinc-50/55 transition-colors">
                        <td className="py-3 px-4 font-semibold">
                          <div className="flex flex-col">
                            <span className="text-zinc-850 font-bold">{u.name}</span>
                            {u.isAdmin && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-1 py-0.2 md:w-max mt-0.5 uppercase">
                                Admin
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-650">{u.username}</td>
                        <td className="py-3 px-4">
                          {u.mustChangePassword ? (
                            <span className="text-[10px] font-bold text-amber-650 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200/50">
                              Senha temporária
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                              Ativo
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {u.username !== "admin" && u.username !== currentUser.username ? (
                            <button
                              onClick={() => handleDeleteUser(u.username)}
                              className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer duration-100"
                              title={`Excluir conta ${u.username}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-400 px-1 px-1 py-0.5">
                              {u.username === "admin" ? "Sistemas" : "Conectado"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
