import React from 'react';
import { X, Star, Heart, Printer, Package, CreditCard, ArrowRight } from 'lucide-react';

export default function UpsellModal({ childName, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-night-950/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-night-900 rounded-3xl overflow-hidden shadow-2xl border border-dream-500/30 animate-scale-in">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative h-48 bg-gradient-to-br from-dream-500 to-purple-600 flex items-center justify-center overflow-hidden">
           <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
           </div>
           <div className="relative flex items-center gap-6">
              <div className="w-32 h-32 bg-white rounded-xl shadow-2xl rotate-[-6deg] flex-shrink-0 flex items-center justify-center p-2">
                 <div className="w-full h-full bg-dream-50 rounded-lg border-2 border-dream-200 flex items-center justify-center">
                    <Heart className="w-12 h-12 text-dream-500 fill-dream-500/20" />
                 </div>
              </div>
              <div className="text-white">
                 <h3 className="text-2xl font-black mb-1">Premium Hardback</h3>
                 <p className="text-dream-100 text-sm font-medium">Limited Edition Print</p>
              </div>
           </div>
        </div>

        <div className="p-8 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              A story too special to stay on a screen.
            </h2>
            <p className="text-gray-500 dark:text-white/60 leading-relaxed">
              Turn {childName}'s adventure into a premium, high-quality hardback book they can hold in their hands forever.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col items-center gap-2">
                <Printer className="w-5 h-5 text-dream-500" />
                <span className="text-[10px] font-bold text-gray-400 dark:text-white/20 uppercase tracking-widest">300 DPI Print</span>
             </div>
             <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col items-center gap-2">
                <Package className="w-5 h-5 text-dream-500" />
                <span className="text-[10px] font-bold text-gray-400 dark:text-white/20 uppercase tracking-widest">Free Shipping</span>
             </div>
          </div>

          <div className="pt-4 space-y-4">
            <button className="btn-primary w-full py-4 text-lg font-black flex items-center justify-center gap-3 group shadow-gold hover:scale-[1.02]">
              Order Hardback — $34.99 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[10px] text-gray-400 dark:text-white/30 font-medium">
               8x8 Square Format • Premium Satin Paper • archival Inks
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
