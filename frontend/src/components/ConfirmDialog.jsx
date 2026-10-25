import React from 'react';

const ConfirmDialog = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Delete',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel} role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="confirm-dialog-title" className="modal-title" style={{ fontSize: '1.2rem' }}>
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="close-btn"
            id="btn-close-confirm-dialog"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          {message}
        </p>

        <div className="modal-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn btn-secondary"
            id="btn-confirm-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn btn-${confirmVariant}`}
            id="btn-confirm-proceed"
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
