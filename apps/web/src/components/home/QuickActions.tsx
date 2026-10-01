'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { GameHubIcon } from '@/components/gamehub/GameHubIcon';
import { ArrowRight } from 'lucide-react';

const QUICK_ACTIONS = [
  {
    label: 'Daily Check-In',
    subLabel: 'Get Daily Rewards',
    href: '/checkin',
    icon: 'trophy' as const,
    gradient: 'from-[#2A1800] via-[#3D2200] to-[#0B1735]',
    border: 'border-[#FFC928]/45',
    iconColor: '#FFC928',
    glow: 'shadow-[#FFC928]/20',
  },
  {
    label: 'Task Reward',
    subLabel: 'Complete & Earn',
    href: '/tasks',
    icon: 'star' as const,
    gradient: 'from-[#062016] via-[#0A3322] to-[#0B1735]',
    border: 'border-[#00E5A0]/45',
    iconColor: '#00E5A0',
    glow: 'shadow-[#00E5A0]/20',
  },
  {
    label: 'Invite Friends',
    subLabel: 'Get Commission',
    href: '/invite',
    icon: 'user' as const,
    gradient: 'from-[#1A0A38] via-[#2A1058] to-[#0B1735]',
    border: 'border-[#873BFF]/45',
    iconColor: '#873BFF',
    glow: 'shadow-[#873BFF]/20',
  },
  {
    label: 'Recharge',
    subLabel: 'Add Money',
    href: '/deposit',
    icon: 'wallet' as const,
    gradient: 'from-[#30082A] via-[#4A1040] to-[#0B1735]',
    border: 'border-[#FF3FA4]/45',
    iconColor: '#FF3FA4',
    glow: 'shadow-[#FF3FA4]/20',
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {QUICK_ACTIONS.map((action, i) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.4, ease: 'easeOut' }}
        >
          <Link
            href={action.href}
            className={`relative flex flex-col items-center text-center gap-2 p-3 sm:p-4 rounded-[20px] bg-gradient-to-br ${action.gradient} border ${action.border} shadow-lg ${action.glow} hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-300 group overflow-hidden`}
          >
            {/* Ambient glow */}
            <div
              className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-30 pointer-events-none"
              style={{ backgroundColor: action.iconColor }}
            />

            {/* Icon from asset pack */}
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: `${action.iconColor}18`,
                borderColor: `${action.iconColor}40`,
              }}
            >
              <GameHubIcon
                name={action.icon}
                size={22}
                isActive
                activeColor={action.iconColor}
                glow
              />
            </div>

            {/* Label */}
            <div>
              <p className="text-[10px] sm:text-xs font-black text-white leading-tight">{action.label}</p>
              <p className="text-[9px] text-[#7285AE] hidden sm:block mt-0.5">{action.subLabel}</p>
            </div>

            {/* Arrow on hover */}
            <ArrowRight
              className="absolute bottom-2 right-2 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: action.iconColor }}
            />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
