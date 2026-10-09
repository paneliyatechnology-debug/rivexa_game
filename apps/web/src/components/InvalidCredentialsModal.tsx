'use client';

import React from 'react';

interface InvalidCredentialsModalProps {
  isOpen: boolean;
  message?: string;
  onOk?: () => void;
}

export const InvalidCredentialsModal: React.FC<InvalidCredentialsModalProps> = ({
  isOpen,
  message = 'Invalid user login credentials(Error:45)',
  onOk,
}) => {
  if (!isOpen) return null;

  const handleOk = () => {
    if (onOk) {
      onOk();
    } else {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#1a1c23] border border-[#2d303a] rounded-xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Main Body */}
        <div className="p-10 sm:p-14 text-center border-b border-[#292c36]">
          <p className="text-slate-100 text-base sm:text-lg font-serif tracking-wide leading-relaxed">
            {message}
          </p>
        </div>

        {/* Modal Footer / Action Button */}
        <div className="py-4 px-6 bg-[#15171d] flex items-center justify-center">
          <button
            onClick={handleOk}
            className="px-10 py-2.5 bg-[#2b2e38] hover:bg-[#383c4a] text-white font-medium text-sm rounded-md border border-[#3b3f4e] transition shadow-md active:scale-95 focus:outline-none"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvalidCredentialsModal;
