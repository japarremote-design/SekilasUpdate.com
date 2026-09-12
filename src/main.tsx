import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        {/* Alamat baru: judul berita ikut di dalamnya, ID menempel di ujung */}
        <Route path="/berita/:slug" element={<App />} />
        {/* Alamat lama tetap dilayani supaya tautan yang sudah tersebar
            tidak mati; App.tsx mengalihkannya ke alamat baru. */}
        <Route path="/artikel/:id" element={<App />} />
        <Route path="/tag/:tag" element={<App />} />
        <Route path="/halaman/:pageSlug" element={<App />} />
        {/* Ruang Redaksi SekilasUpdate — dashboard internal kru redaksi */}
        <Route path="/redaksi" element={<App newsroom />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
