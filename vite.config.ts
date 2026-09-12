import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          /*
           * Pisahkan pustaka pihak ketiga jadi berkas sendiri.
           *
           * Dua manfaatnya:
           * 1. Terlihat jelas mana yang sebenarnya berat — sebelum ini semua
           *    menyatu jadi satu angka 1 MB tanpa bisa ditelusuri.
           * 2. Firebase dan React jarang berubah. Dipisah, keduanya tetap
           *    tersimpan di cache browser pembaca walau kode situs
           *    diperbarui — jadi kunjungan berikutnya jauh lebih ringan.
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) return 'firebase-firestore';
            if (id.includes('@firebase/auth') || id.includes('firebase/auth')) return 'firebase-auth';
            if (id.includes('firebase') || id.includes('@firebase')) return 'firebase-core';
            // @remix-run/router & history adalah isi perut react-router —
            // disatukan supaya tidak tercecer ke chunk 'vendor' tanpa nama.
            if (
              id.includes('react-dom') || id.includes('/react/') ||
              id.includes('react-router') || id.includes('@remix-run') ||
              id.includes('/history/') || id.includes('scheduler')
            ) return 'react-vendor';
            if (id.includes('lucide-react')) return 'icons';
            return 'vendor';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
