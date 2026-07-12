import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  title = 'Confirm Delete',
  message = 'Are you sure you want to delete this record? This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      width={420}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={loading}>
            {loading ? 'Please wait...' : confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{message}</p>
    </Modal>
  );
}
