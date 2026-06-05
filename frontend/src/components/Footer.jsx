import { useState } from 'react';
import PolicyModal from './PolicyModal';

export default function Footer() {
  const [activePolicy, setActivePolicy] = useState(null);

  const policyData = {
    privacy: { type: 'privacy', title: 'Privacy Policy', content: "Your privacy is important..." },
    terms: { type: 'terms', title: 'Terms of Service', content: "By accessing WorkSphere..." },
    escrow: { type: 'escrow', title: 'Escrow Guidelines', content: "Our escrow system guarantees safety..." }
  };

  return (
    <>
      <footer className="py-16 bg-white text-slate-500 text-center border-t border-slate-100 relative z-10 w-full mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="text-2xl font-black text-slate-900 tracking-tight">WorkSphere</div>
          <p className="text-sm font-medium text-slate-400">&copy; {new Date().getFullYear()} WorkSphere. Built with cryptographic verification.</p>
          <div className="flex justify-center gap-8 text-sm font-bold text-slate-400 pt-4">
            <button onClick={() => setActivePolicy(policyData.privacy)} className="hover:text-blue-600 transition-colors">Privacy</button>
            <button onClick={() => setActivePolicy(policyData.terms)} className="hover:text-blue-600 transition-colors">Terms</button>
            <button onClick={() => setActivePolicy(policyData.escrow)} className="hover:text-blue-600 transition-colors">Escrow</button>
          </div>
        </div>
      </footer>
      
      <PolicyModal 
        isOpen={!!activePolicy} 
        onClose={() => setActivePolicy(null)} 
        policy={activePolicy} 
      />
    </>
  );
}
