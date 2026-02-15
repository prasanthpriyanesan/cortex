import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../../services/api';

interface AuthPageProps {
  onLoginSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await authAPI.login(username, password);
        localStorage.setItem('access_token', response.data.access_token);
        onLoginSuccess();
      } else {
        await authAPI.register(username, email, password);
        // Auto-login after registration
        const response = await authAPI.login(username, password);
        localStorage.setItem('access_token', response.data.access_token);
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || (isLogin ? 'Invalid credentials' : 'Registration failed')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[128px]" />
      </div>

      {/* Floating Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-2xl shadow-primary/30"
          >
            <TrendingUp className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight">
            Cor<span className="gradient-text">tex</span>
          </h1>
          <p className="text-slate-400 mt-2">
            {isLogin ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
          </p>
        </div>

        {/* Card */}
        <div className="card">
          {/* Toggle */}
          <div className="flex mb-6 p-1 bg-slate-800/50 rounded-xl">
            {['Login', 'Register'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setIsLogin(tab === 'Login');
                  setError('');
                }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  (tab === 'Login') === isLogin
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field pl-11"
                required
              />
            </div>

            {/* Email (Register only) */}
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative"
                >
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-11"
                    required={!isLogin}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-11 pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Real-time stock monitoring &amp; intelligent alerts
        </p>
      </motion.div>
    </div>
  );
};
