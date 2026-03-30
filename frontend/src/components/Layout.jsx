import React from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

const Layout = ({ children, showBottomNav = true }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 overflow-x-hidden">
      <Sidebar />
      
      <main className={`transition-all duration-300 lg:pl-64 ${showBottomNav ? 'pb-20' : 'pb-0'}`}>
        <div className="p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {showBottomNav && <BottomNav />}
    </div>
  );
};

export default Layout;
