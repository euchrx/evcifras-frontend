import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Guitar } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import type { FormEvent } from "react";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register({ name, email, password });
      navigate("/");
    } catch {
      setError("Não foi possível criar sua conta. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <form onSubmit={handleSubmit} className="w-full rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-950/40">
          <Guitar className="h-6 w-6" />
        </div>

        <h1 className="mt-6 text-3xl font-black text-white">Criar conta</h1>
        <p className="mt-2 text-sm text-slate-400">Salve cifras favoritas e organize repertórios.</p>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-300">Nome</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-violet-400"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-300">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-violet-400"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-300">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-violet-400"
              required
              minLength={6}
            />
          </label>
        </div>

        <button
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-white px-5 py-3 font-bold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <p className="mt-5 text-center text-sm text-slate-400">
          Já tem conta?{" "}
          <Link to="/login" className="font-semibold text-violet-300 hover:text-violet-200">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
