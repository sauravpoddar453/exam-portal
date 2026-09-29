import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Trash2, X, ShieldAlert, CheckSquare } from 'lucide-react';

export default function DeleteExamModal({ exam, isOpen, onClose, onSuccess }) {
  const { token } = useAuth();

  const [loadingCheck, setLoadingCheck] = useState(true);
  const [checkError, setCheckError] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  // Form input for strong confirmation
  const [confirmText, setConfirmText] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (isOpen && exam) {
      setConfirmText('');
      setConfirmCheckbox(false);
      setDeleteError(null);
      checkExamStatus();
    }
  }, [isOpen, exam]);

  const checkExamStatus = async () => {
    if (!exam?._id) return;
    setLoadingCheck(true);
    setCheckError(null);

    try {
      const activeToken = token || localStorage.getItem('token');
      const { ok, data } = await safeFetchJson(`/api/exams/${exam._id}?checkOnly=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (ok && data?.success) {
        setAttemptCount(data.attemptCount || 0);
        setRequiresConfirmation(!!data.requiresConfirmation);
      } else {
        setCheckError(data?.message || 'Could not verify exam status.');
      }
    } catch (err) {
      console.error('[DeleteExamModal] Check error:', err);
      setCheckError(err.message || 'Failed to check exam status.');
    } finally {
      setLoadingCheck(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!exam?._id) return;

    // Validation for attempts confirmation
    if (requiresConfirmation && attemptCount > 0) {
      const isTypedMatch = confirmText.trim() === exam.title.trim();
      if (!isTypedMatch && !confirmCheckbox) {
        alert('Please type the exact exam title or check the confirmation box to proceed.');
        return;
      }
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const activeToken = token || localStorage.getItem('token');
      const { ok, data } = await safeFetchJson(`/api/exams/${exam._id}?force=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (ok && data?.success) {
        onSuccess(data.message || 'Exam deleted successfully.');
        onClose();
      } else {
        setDeleteError(data?.message || 'Failed to delete exam.');
      }
    } catch (err) {
      console.error('[DeleteExamModal] Delete error:', err);
      setDeleteError(err.message || 'Failed to delete exam.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !exam) return null;

  const isTypedMatch = confirmText.trim() === (exam.title || '').trim();
  const isConfirmValid = !requiresConfirmation || attemptCount === 0 || isTypedMatch || confirmCheckbox;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171545] border border-amber-500/20 rounded-2xl max-w-lg w-full p-6 relative shadow-2xl space-y-6 text-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={deleting}
          className="absolute top-4 right-4 text-[#a5a3c9] hover:text-white p-1 rounded-lg hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 border-b border-indigo-900/40 pb-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-amber-400 uppercase">{exam.code || 'EXAM'}</span>
            <h3 className="text-lg font-bold text-white leading-tight">{exam.title}</h3>
          </div>
        </div>

        {/* Loading Spinner */}
        {loadingCheck ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#a5a3c9]">Checking attempt records and live status...</p>
          </div>
        ) : checkError ? (
          /* Error Box */
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Deletion Blocked
            </div>
            <p className="leading-relaxed">{checkError}</p>
          </div>
        ) : requiresConfirmation && attemptCount > 0 ? (
          /* Strong Deletion Warning Modal */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
                Warning: Exam Has Student Attempts
              </div>
              <p className="text-[#a5a3c9] leading-relaxed">
                This exam has <strong className="text-white">{attemptCount} student attempt(s)</strong>. Deleting it will <strong className="text-rose-300">permanently remove all student results and answers</strong> for this exam. This action cannot be undone.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#a5a3c9] mb-1">
                  To confirm deletion, type <span className="text-amber-400 font-bold select-all">"{exam.title}"</span> below:
                </label>
                <input
                  type="text"
                  placeholder={`Type "${exam.title}"`}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-indigo-950 border border-indigo-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="confirmDeleteCheckbox"
                  checked={confirmCheckbox}
                  onChange={(e) => setConfirmCheckbox(e.target.checked)}
                  className="mt-0.5 rounded border-indigo-700 bg-indigo-950 text-amber-400 focus:ring-amber-400"
                />
                <label htmlFor="confirmDeleteCheckbox" className="text-xs text-[#a5a3c9] cursor-pointer">
                  I understand that deleting this exam will permanently erase all <strong className="text-white">{attemptCount} student grade record(s)</strong>.
                </label>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Deletion Confirmation */
          <div className="p-4 rounded-xl bg-indigo-950 border border-indigo-800 text-xs space-y-2">
            <p className="text-slate-200 leading-relaxed font-medium">
              Are you sure you want to delete <strong className="text-amber-400">"{exam.title}"</strong>? This action cannot be undone.
            </p>
            <p className="text-[#a5a3c9] text-[11px]">
              No student attempts have been recorded for this exam yet.
            </p>
          </div>
        )}

        {/* Delete Error Message */}
        {deleteError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{deleteError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="w-1/2 py-2.5 rounded-xl border border-indigo-800 text-[#a5a3c9] hover:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          {!checkError && (
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleting || loadingCheck || !isConfirmValid}
              className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting Exam...' : attemptCount > 0 ? 'Yes, Delete Everything' : 'Delete Exam'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
