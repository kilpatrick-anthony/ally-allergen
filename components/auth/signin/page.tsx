// app/auth/signin/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Mail, Lock, Eye, EyeOff, 
  AlertCircle, Building, Key 
} from 'lucide-react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  
  const router = useRouter();

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log('🔐 DEVELOPMENT MODE: Bypassing actual Supabase sign in');
    
    // DEVELOPMENT MODE: Just redirect without actual authentication
    setTimeout(() => {
      console.log('🔐 Redirecting to /admin (development mode)');
      window.location.href = '/admin';
    }, 1000);
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log('🔐 DEVELOPMENT MODE: Bypassing magic link sign in');
    
    // DEVELOPMENT MODE: Simulate sending magic link
    setTimeout(() => {
      setMagicLinkSent(true);
      setLoading(false);
      console.log('🔐 Magic link "sent" to:', email);
    }, 1000);
  };

  const handleBackToSignIn = () => {
    setMagicLinkSent(false);
    setEmail('');
    console.log('🔐 Back to sign in form');
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email! (Dev Mode)</h1>
          <p className="text-gray-600 mb-6">
            In development mode, we're simulating sending a magic link to <strong>{email}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-6 p-3 bg-gray-50 rounded-lg">
            ⚠️ Development Mode: Auth is bypassed. Click below to go to admin.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/admin'}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              Go to Admin (Dev Mode)
            </button>
            <button
              onClick={handleBackToSignIn}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-600 rounded-xl">
              <Building className="h-8 w-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-gray-900">AllyJen</h1>
              <p className="text-gray-600">AllyJen Solutions LTD, Republic of Ireland</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Sign In to Your Account</h2>
          <p className="text-gray-600 mt-2">
            Access your allergen guides and analytics
          </p>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ⚠️ Development Mode: Auth is bypassed. Any credentials will work.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {!showMagicLink ? (
            // Email/Password Form
            <form onSubmit={handleEmailPasswordSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address (Dev: Any email works)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="owner@business.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Password (Dev: Any password works)
                    </label>
                    <button
                      type="button"
                      onClick={() => console.log('Forgot password clicked (dev mode)')}
                      className="text-sm text-green-600 hover:text-green-700"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Any password works in dev mode"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                    defaultChecked
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                    Remember me
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Redirecting (Dev Mode)...
                  </>
                ) : (
                  'Sign In (Dev Mode)'
                )}
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* Magic Link Option */}
              <button
                type="button"
                onClick={() => setShowMagicLink(true)}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Key className="h-5 w-5" />
                Sign in with magic link
              </button>

              {/* Sign Up Link */}
              <div className="text-center">
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => console.log('Sign up clicked (dev mode)')}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Contact support to create account
                  </button>
                </p>
              </div>
            </form>
          ) : (
            // Magic Link Form
            <form onSubmit={handleMagicLinkSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Magic Link Sign In (Dev)</h3>
                <p className="text-gray-600 mt-2">
                  Development mode: Simulating magic link
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="owner@business.com"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Simulating Link Send...
                  </>
                ) : (
                  'Send Magic Link (Dev)'
                )}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setShowMagicLink(false)}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Back to password sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}