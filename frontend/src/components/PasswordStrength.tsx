import React, { useMemo } from 'react';

interface Props {
  password: string;
}

interface StrengthResult {
  score: number;
  label: string;
  color: string;
  checks: { label: string; passed: boolean }[];
}

const analyzePassword = (password: string): StrengthResult => {
  const checks = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'Uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'Number', passed: /[0-9]/.test(password) },
    { label: 'Special character', passed: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter(c => c.passed).length;

  const levels = [
    { label: 'Very Weak', color: 'bg-red-500' },
    { label: 'Weak', color: 'bg-orange-500' },
    { label: 'Fair', color: 'bg-yellow-500' },
    { label: 'Good', color: 'bg-blue-500' },
    { label: 'Strong', color: 'bg-emerald-500' },
  ];

  return { score, ...levels[Math.min(score, 4)], checks };
};

const PasswordStrength: React.FC<Props> = ({ password }) => {
  const result = useMemo(() => analyzePassword(password), [password]);

  if (!password) return null;

  return (
    <div className="mt-3 space-y-2 animate-fade-in">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= result.score ? result.color : 'bg-border'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">Password strength</span>
        <span className={`text-xs font-display font-medium ${
          result.score <= 1 ? 'text-red-400' :
          result.score === 2 ? 'text-orange-400' :
          result.score === 3 ? 'text-yellow-400' :
          result.score === 4 ? 'text-blue-400' : 'text-emerald-400'
        }`}>
          {result.label}
        </span>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-1">
        {result.checks.map(({ label, passed }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
              passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-border text-white/20'
            }`}>
              {passed ? (
                <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-1 h-1 rounded-full bg-current" />
              )}
            </div>
            <span className={`text-xs transition-colors ${passed ? 'text-white/60' : 'text-white/30'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;