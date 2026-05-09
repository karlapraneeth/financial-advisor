'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CreditCard, Receipt, ArrowLeftRight, Target, Lightbulb } from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', icon: CreditCard },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/advice', label: 'Advice', icon: Lightbulb },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <span className="text-xl font-bold text-indigo-600">FinAdvisor</span>
          <div className="flex gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
