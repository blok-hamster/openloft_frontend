import { useCallback, useState } from 'react';
import type { MemoryRecord } from '@/lib/api';
import { forgetMemoryRecord } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import ConfirmDestructiveAction from '@/components/dashboard/ConfirmDestructiveAction';
import { memoryErrorMessage } from './memoryFormat';

interface MemoryForgetDialogProps {
  record: MemoryRecord | null;
  open: boolean;
  onClose: () => void;
  /** Fired after the engine has accepted the invalidation, so callers can
   *  reload the window that held the record. */
  onForgotten: () => void;
}

/**
 * Forget, behind the shared type-to-confirm destructive modal.
 *
 * The copy has to be exact, because the verb is misleading in most systems:
 * forgetting a record here is temporal invalidation. The engine stops
 * retrieving it from this turn onward and keeps the entry, so the archive
 * history is preserved and the fact stays visible as superseded rather than
 * disappearing. Nothing is removed, and a right-to-erasure request is a
 * different flow, not this one.
 */
export default function MemoryForgetDialog({
  record,
  open,
  onClose,
  onForgotten,
}: MemoryForgetDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  const confirm = useCallback(async () => {
    if (!record) return;
    setLoading(true);
    try {
      const result = await forgetMemoryRecord(record.id);
      const count = typeof result?.forgotten === 'number' ? result.forgotten : 1;
      toast(
        count === 1
          ? `${record.entity_name} invalidated from this turn onward`
          : `${count} records for ${record.entity_name} invalidated from this turn onward`,
        'success',
      );
      onForgotten();
      close();
    } catch (err) {
      toast(memoryErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [record, toast, onForgotten, close]);

  if (!record) return null;

  return (
    <ConfirmDestructiveAction
      open={open}
      onClose={close}
      onConfirm={confirm}
      title={`Forget ${record.entity_name}`}
      confirmText="FORGET"
      loading={loading}
      description={
        <>
          <p>
            Forgetting is temporal invalidation, not removal. The record stops being retrieved from
            this turn onward, and the engine keeps the entry in its log — the archive history stays
            intact, so this fact remains visible here as superseded rather than gone.
          </p>
          <p>
            A request to have a record erased outright is a separate flow, not this one.
          </p>
        </>
      }
    />
  );
}
