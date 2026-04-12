// components/admin/AdminNavbar.tsx
'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Home, Menu, X, Settings, LogOut, 
  User, Building, BarChart3, FileText,
  ChevronDown, ChefHat, Package, Download, Monitor
} from 'lucide-react';

interface BrandColors {
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
}

interface AdminNavbarProps {
  brandColors?: BrandColors;
}

export default function AdminNavbar({ brandColors }: AdminNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  const currentBrandColors = brandColors || {
    primary_color: '#003842',
    secondary_color: '#42b8ac',
    logo_url: null
  };

  const navLinks = [
    { href: '/admin', label: 'Dashboard', icon: <Home size={20} /> },
    { href: '/admin/ingredients', label: 'Ingredients', icon: <Package size={20} /> },
    { href: '/admin/menu-builder', label: 'Menu Builder', icon: <ChefHat size={20} /> },
    { href: '/admin/downloads', label: 'Downloads', icon: <Download size={20} /> },
    { href: '/admin/analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
    { href: '/admin/sites', label: 'Sites', icon: <Building size={20} /> },
    { href: '/admin/devices', label: 'Devices', icon: <Monitor size={20} /> },
    { href: '/admin/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  const handleLogout = async () => {
    try {
      const supabase = supabaseRef.current;
      // Clear server cookie
      await fetch('/api/signout', { method: 'POST' }).catch(() => {})
      await supabase.auth.signOut();
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if signout fails
      window.location.href = '/auth/signin';
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="flex items-center">
              <img
                src="/Logo-AllyJen.svg"
                alt="AllyJen Logo"
                className="h-10 w-auto object-contain mr-3"
                style={{ maxWidth: '160px' }}
              />
              {currentBrandColors.logo_url && (
                <img 
                  src={currentBrandColors.logo_url} 
                  alt="Business Logo" 
                  className="h-8 w-8 mr-2 object-contain"
                />
              )}
              <h1 className="text-xl font-bold text-gray-900 ml-1">
                Ally Admin
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-10 md:flex md:items-center md:space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    pathname === link.href
                      ? 'text-white'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                  style={{
                    color: pathname === link.href ? 'white' : currentBrandColors.primary_color,
                    backgroundColor: pathname === link.href ? currentBrandColors.primary_color : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (pathname !== link.href) {
                      e.currentTarget.style.backgroundColor = currentBrandColors.primary_color + '20';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (pathname !== link.href) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side - Kiosk link & Profile */}
          <div className="flex items-center space-x-4">
            <Link
              href="/kiosk/oakberry-dublin"
              className="px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 transition-opacity hidden md:block"
              style={{ 
                backgroundColor: currentBrandColors.primary_color
              }}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Kiosk
            </Link>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User size={18} />
                </div>
                <ChevronDown size={16} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border">
                  <div className="px-4 py-2 border-b">
                    <p className="text-sm font-medium text-gray-900">Admin User</p>
                    <p className="text-xs text-gray-500">owner@example.com</p>
                  </div>
                  <Link
                    href="/admin/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User size={16} className="mr-2" />
                    Profile
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <Settings size={16} className="mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-500 hover:text-gray-700"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                  pathname === link.href
                    ? 'text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
                style={{
                  color: pathname === link.href ? 'white' : currentBrandColors.primary_color,
                  backgroundColor: pathname === link.href ? currentBrandColors.primary_color : 'transparent'
                }}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.icon}
                <span className="ml-3">{link.label}</span>
              </Link>
            ))}
            <Link
              href="/kiosk/oakberry-dublin"
              className="flex items-center px-3 py-2 rounded-md text-base font-medium text-white mt-4"
              style={{ 
                backgroundColor: currentBrandColors.primary_color
              }}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="ml-3">View Kiosk</span>
            </Link>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                setTimeout(() => {
                  window.location.href = '/auth/signin';
                }, 300);
              }}
              className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-gray-100 mt-4"
            >
              <LogOut size={20} className="mr-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}