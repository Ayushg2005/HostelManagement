import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import MagneticButton from '../components/MagneticButton';

const RegisterPage = ({ onNavigateToLogin }) => {
  const { register, setError } = useAuth();
  const [selectedRole, setSelectedRole] = useState('STUDENT');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    usn: '',
    phoneNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isStudent = selectedRole === 'STUDENT';
  const isEmailBmsce = /^[a-zA-Z0-9._%+-]+@bmsce\.ac\.in$/i.test(formData.email.trim());

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

    if (!formData.name || !formData.email || !formData.password) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    if (isStudent && !isEmailBmsce) {
      setLocalError('Student registration strictly requires an email ending with @bmsce.ac.in');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      ...formData,
      role: selectedRole,
    });
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
            New Registration
          </div>
          <div className="font-serif text-4xl leading-[1.1] mb-4 tracking-tight">
            Claim your <em>identity.</em>
          </div>
          <div className="text-[0.88rem] text-paper/45 leading-relaxed max-w-[280px]">
            Join the Hostel Management System to book rooms, order from the night canteen, and log leaves.
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 relative z-10 overflow-y-auto">
        <div className="w-full max-w-[460px] form-container my-8">
          
          <div className="font-serif text-3xl tracking-tight mb-2">
            Create an <em>account.</em>
          </div>
          <div className="text-sm text-muted mb-8 leading-relaxed">
            Fill in your details to get started.
          </div>

          {/* Role Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
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
            <div className="mb-5">
              <label className="block text-[0.72rem] font-medium tracking-[0.1em] uppercase text-muted mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Ayush Gupta"
                className="w-full bg-transparent border-b-2 border-border py-2.5 text-[0.95rem] text-ink placeholder-ink/25 outline-none transition-colors focus:border-accent"
              />
            </div>

            <div className="mb-5 relative">
              <label className="block text-[0.72rem] font-medium tracking-[0.1em] uppercase text-muted mb-2 flex justify-between items-end">
                <span>{isStudent ? 'BMSCE Email Address' : 'Email Address'}</span>
                {isStudent && formData.email && (
                  <span className={`text-[0.6rem] normal-case tracking-normal px-2 py-0.5 rounded-full ${
                    isEmailBmsce ? 'bg-green/10 text-green' : 'bg-accent/10 text-accent'
                  }`}>
                    {isEmailBmsce ? 'Valid BMSCE Email' : 'Must end in @bmsce.ac.in'}
                  </span>
                )}
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder={isStudent ? 'yourname.cs22@bmsce.ac.in' : 'warden@bmsce.ac.in'}
                className={`w-full bg-transparent border-b-2 py-2.5 text-[0.95rem] text-ink placeholder-ink/25 outline-none transition-colors ${
                  isStudent && formData.email 
                    ? isEmailBmsce ? 'border-green focus:border-green' : 'border-accent focus:border-accent'
                    : 'border-border focus:border-accent'
                }`}
              />
            </div>

            {isStudent && (
              <div className="mb-5">
                <label className="block text-[0.72rem] font-medium tracking-[0.1em] uppercase text-muted mb-2">
                  USN
                </label>
                <input
                  type="text"
                  name="usn"
                  value={formData.usn}
                  onChange={handleChange}
                  placeholder="e.g. 1BM22CS001"
                  className="w-full bg-transparent border-b-2 border-border py-2.5 text-[0.95rem] text-ink placeholder-ink/25 outline-none transition-colors focus:border-accent uppercase"
                />
              </div>
            )}

            <div className="mb-5">
              <label className="block text-[0.72rem] font-medium tracking-[0.1em] uppercase text-muted mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+91 9876543210"
                className="w-full bg-transparent border-b-2 border-border py-2.5 text-[0.95rem] text-ink placeholder-ink/25 outline-none transition-colors focus:border-accent"
              />
            </div>

            <div className="mb-8">
              <label className="block text-[0.72rem] font-medium tracking-[0.1em] uppercase text-muted mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 6 characters"
                className="w-full bg-transparent border-b-2 border-border py-2.5 text-[0.95rem] text-ink placeholder-ink/25 outline-none transition-colors focus:border-accent"
              />
              {localError && (
                <div className="text-[0.72rem] text-accent mt-2 animate-[fadeIn_0.3s]">
                  {localError}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center">
              <MagneticButton type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Registering...' : 'Create Account →'}
              </MagneticButton>
            </div>
          </form>

          <div className="text-center text-[0.8rem] text-muted mt-8">
            Already have an account?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-ink font-medium border-b border-ink pb-[1px] transition-colors hover:text-accent hover:border-accent"
            >
              Sign In
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
