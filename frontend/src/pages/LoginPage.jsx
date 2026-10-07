import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, UserCheck, Utensils } from 'lucide-react';
import gsap from 'gsap';
import MagneticButton from '../components/MagneticButton';

const LoginPage = ({ onNavigateToRegister }) => {
  const { login, setError } = useAuth();
  const [selectedRole, setSelectedRole] = useState('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    // Fix GSAP in React 18 Strict Mode by using fromTo
    gsap.fromTo('.lp-logo', { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.1 });
    gsap.fromTo('.lp-mid', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.3 });
    gsap.fromTo('.form-container', { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.2 });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setError(null);

    if (!email || !password) {
      setLocalError('Username and password required.');
      return;
    }

    if (selectedRole === 'STUDENT' && !email.toLowerCase().endsWith('@bmsce.ac.in')) {
      setLocalError('Student login requires a BMSCE college email ending in @bmsce.ac.in');
      return;
    }

    if (selectedRole === 'COOK' && email.toLowerCase() !== 'canteen@bmsce.ac.in') {
      setLocalError('Only canteen@bmsce.ac.in is authorized to login as Cook.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setLocalError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper text-ink font-sans overflow-hidden">
      {/* LEFT PANEL */}
      <div className="md:w-[420px] shrink-0 bg-ink text-paper p-12 relative flex flex-col justify-between hidden md:flex overflow-hidden">
        {/* Glows behind */}
        <div className="absolute w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(200,67,42,0.12)_0%,transparent_70%)] -bottom-24 -right-24 pointer-events-none"></div>
        <div className="absolute w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(42,107,76,0.08)_0%,transparent_70%)] -top-12 -left-12 pointer-events-none"></div>
        
        <div className="lp-logo font-serif text-3xl tracking-tight relative z-10">
          Hostel<em className="italic text-accent">Portal</em>
        </div>

        <div className="lp-mid relative z-10">
          <div className="font-mono text-[0.65rem] tracking-[0.2em] text-accent uppercase mb-4">
            BMS College of Engineering
          </div>
          <div className="font-serif text-4xl leading-[1.1] mb-4 tracking-tight">
            Welcome <em>back.</em>
          </div>
          <div className="text-[0.88rem] text-paper/45 leading-relaxed max-w-[280px]">
            Enter your credentials to return to your personalized dashboard.
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10">
        <div className="w-full max-w-[460px] form-container">
          
          <div className="font-serif text-3xl tracking-tight mb-2">
            Enter the <em>portal.</em>
          </div>
          <div className="text-sm text-muted mb-10 leading-relaxed">
            We missed you.
          </div>

          {/* Role Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              type="button"
              onClick={() => setSelectedRole('STUDENT')}
              className={`px-4 py-2 border rounded-full text-xs transition-all font-sans ${
                selectedRole === 'STUDENT'
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-transparent text-muted border-border hover:border-ink/25 hover:text-ink'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('ADMIN')}
              className={`px-4 py-2 border rounded-full text-xs transition-all font-sans ${
                selectedRole === 'ADMIN'
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-transparent text-muted border-border hover:border-ink/25 hover:text-ink'
              }`}
            >
              Warden
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('COOK')}
              className={`px-4 py-2 border rounded-full text-xs transition-all font-sans ${
                selectedRole === 'COOK'
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-transparent text-muted border-border hover:border-ink/25 hover:text-ink'
              }`}
            >
              Cook
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-[0.72rem] font-medium tracking-[0.1em] uppercase text-muted mb-2">
                {selectedRole === 'STUDENT' ? 'BMSCE Email (@bmsce.ac.in)' : 'Account Email'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={selectedRole === 'STUDENT' ? 'student.name@bmsce.ac.in' : 'admin@bmsce.ac.in'}
                className="w-full bg-transparent border-b-2 border-border py-3 text-[0.95rem] text-ink placeholder-ink/25 outline-none transition-colors focus:border-accent"
              />
            </div>

            <div className="mb-8">
              <label className="block text-[0.72rem] font-medium tracking-[0.1em] uppercase text-muted mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="your secret"
                className="w-full bg-transparent border-b-2 border-border py-3 text-[0.95rem] text-ink placeholder-ink/25 outline-none transition-colors focus:border-accent"
              />
              {localError && (
                <div className="text-[0.72rem] text-accent mt-2 animate-[fadeIn_0.3s]">
                  {localError}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center">
              <MagneticButton type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Authenticating...' : 'Sign In →'}
              </MagneticButton>
            </div>
          </form>

          <div className="text-center text-[0.8rem] text-muted mt-8">
            Don't have an account?{' '}
            <button
              onClick={onNavigateToRegister}
              className="text-ink font-medium border-b border-ink pb-[1px] transition-colors hover:text-accent hover:border-accent"
            >
              Create one
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
