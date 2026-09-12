import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { MessageSquare, Send, Trash2, User, Globe } from 'lucide-react';
import { auth, db, signInAnonymously } from '../lib/firebase';
import { CommentItem, UserProfile } from '../types';

interface CommentsProps {
  articleId: string;
  user: UserProfile | null;
  onOpenAuth: () => void;
}

export const Comments: React.FC<CommentsProps> = ({ articleId, user, onOpenAuth }) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Identitas untuk komentar tamu (tanpa login), seperti di sistem lama.
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestSite, setGuestSite] = useState('');
  const [guestError, setGuestError] = useState('');

  // Subscribe to real-time comments for this article
  useEffect(() => {
    if (!articleId) return;

    const q = query(
      collection(db, 'comments'),
      where('articleId', '==', articleId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments: CommentItem[] = [];
      snapshot.forEach((doc) => {
        fetchedComments.push({
          id: doc.id,
          ...doc.data()
        } as CommentItem);
      });

      // Sort client side by createdAt descending
      fetchedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setComments(fetchedComments);
    }, (error) => {
      console.error("Firestore comments snapshot error:", error);
    });

    return () => unsubscribe();
  }, [articleId]);

  /** Komentar dari pembaca yang sudah login Google. */
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        articleId,
        userId: user.uid,
        userName: user.displayName || 'Pengguna SekilasUpdate.com',
        userAvatar: user.photoURL || '',
        text: newComment.trim(),
        createdAt: new Date().toISOString(),
        isGuest: false
      });
      setNewComment('');
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Gagal mengirim komentar. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Komentar tamu — tanpa akun, cukup isi Nama/Email/Situs Web.
   *
   * Sebelum menulis, browser didaftarkan sebagai sesi anonim ke Firebase Auth.
   * Isinya tetap anonim, tapi aturan Firestore jadi bisa menolak permintaan
   * yang sama sekali tidak lewat aplikasi.
   */
  const handleSubmitGuestComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestError('');

    if (!newComment.trim()) return;
    if (!guestName.trim()) {
      setGuestError('Nama wajib diisi.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail.trim())) {
      setGuestError('Format email tidak valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      await addDoc(collection(db, 'comments'), {
        articleId,
        userId: auth.currentUser?.uid || '',
        userName: guestName.trim(),
        userAvatar: '',
        text: newComment.trim(),
        createdAt: new Date().toISOString(),
        isGuest: true,
        guestEmail: guestEmail.trim(),
        guestSite: guestSite.trim()
      });

      setNewComment('');
      setGuestSite('');
    } catch (err) {
      console.error('Error posting guest comment:', err);
      setGuestError('Gagal mengirim komentar. Periksa koneksi lalu coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus komentar ini?')) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  return (
    <section className="mt-10 pt-8 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-6 h-6 text-[#141B34]" />
        <h3 className="text-xl font-bold text-[#141B34] font-display">
          Komentar Pembaca ({comments.length})
        </h3>
      </div>

      {/* Write Comment Box */}
      <div className="bg-slate-50 border border-slate-200 p-4 md:p-5 rounded-xl mb-8 shadow-sm">
        {user ? (
          <form onSubmit={handleSubmitComment} className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-1">
              {user.photoURL ? (
                <img
            loading="lazy"
            decoding="async" src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-[#E30F2A]" />
              )}
              <span>Tulis sebagai <strong>{user.displayName || user.email}</strong></span>
            </div>

            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Silakan tinggalkan komentar dengan sopan dan bijak..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#141B34] focus:ring-1 focus:ring-[#141B34] outline-none bg-white transition-all"
              required
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="bg-[#141B34] hover:bg-[#26325C] text-white px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Mengirim...' : 'Kirim Komentar'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Komentar tamu: tidak perlu akun, cukup Nama/Email/Situs Web. */
          <form onSubmit={handleSubmitGuestComment} className="space-y-3">
            <p className="text-sm font-bold text-gray-800">Tinggalkan Balasan</p>
            <p className="text-[11px] text-gray-500 -mt-2">
              Alamat email tidak akan ditampilkan ke publik. Kolom bertanda * wajib diisi.
            </p>

            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Silakan tinggalkan komentar dengan sopan dan bijak..."
              rows={3}
              required
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-[#141B34] focus:ring-1 focus:ring-[#141B34] outline-none bg-white transition-all"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Nama *"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-[#141B34] outline-none"
              />
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Email *"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-[#141B34] outline-none"
              />
              <input
                type="url"
                value={guestSite}
                onChange={(e) => setGuestSite(e.target.value)}
                placeholder="Situs Web"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-[#141B34] outline-none"
              />
            </div>

            {guestError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {guestError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onOpenAuth}
                className="text-xs text-[#141B34] font-bold hover:underline cursor-pointer inline-flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                Atau masuk dengan Google
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="bg-[#141B34] hover:bg-[#26325C] text-white px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Mengirim...' : 'Kirim Komentar'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Comment List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm italic text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            Belum ada komentar pada berita ini. Jadilah yang pertama memberikan tanggapan!
          </p>
        ) : (
          comments.map((comment) => (
            <div 
              key={comment.id}
              className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex gap-3 items-start justify-between"
            >
              <div className="flex gap-3 items-start">
                {comment.userAvatar ? (
                  <img
            loading="lazy"
            decoding="async" src={comment.userAvatar} alt={comment.userName} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#141B34] text-white flex items-center justify-center font-bold text-xs">
                    {comment.userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {comment.guestSite ? (
                      <a
                        href={comment.guestSite}
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                        className="font-bold text-sm text-[#141B34] hover:underline inline-flex items-center gap-1"
                      >
                        {comment.userName}
                        <Globe className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="font-bold text-sm text-gray-900">{comment.userName}</span>
                    )}
                    {comment.isGuest && (
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        Tamu
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 font-mono">
                      {new Date(comment.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-line leading-relaxed">
                    {comment.text}
                  </p>
                </div>
              </div>

              {user && user.uid === comment.userId && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                  title="Hapus Komentar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
};
