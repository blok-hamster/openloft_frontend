'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAgentMemory, updateAgentFile, IAgent, MemoryFile } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import styles from './Dashboard.module.css';

interface MemoryEditorProps {
    agent: IAgent | null;
    open: boolean;
    onClose: () => void;
}

export default function MemoryEditor({ agent, open, onClose }: MemoryEditorProps) {
    const { toast } = useToast();
    const [files, setFiles] = useState<MemoryFile[]>([]);
    const [activeFile, setActiveFile] = useState(0);
    const [editedContents, setEditedContents] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (agent && open) {
            setLoading(true);
            setDirty(new Set());
            setEditedContents({});
            fetchAgentMemory(agent.agentId)
                .then((data) => {
                    setFiles(data);
                    setActiveFile(0);
                    const initial: Record<string, string> = {};
                    data.forEach(f => { initial[f.filename] = f.content; });
                    setEditedContents(initial);
                })
                .catch(() => toast('Failed to load memory', 'error'))
                .finally(() => setLoading(false));
        }
    }, [agent, open, toast]);

    const currentFile = files?.[activeFile] ?? null;

    const handleContentChange = useCallback((value: string) => {
        if (!currentFile) return;
        setEditedContents(prev => ({ ...prev, [currentFile.filename]: value }));
        setDirty(prev => new Set(prev).add(currentFile.filename));
    }, [currentFile]);

    const handleSave = useCallback(async () => {
        if (!agent || !currentFile) return;
        setSaving(true);
        try {
            const content = editedContents[currentFile.filename] ?? currentFile.content;
            await updateAgentFile(agent.agentId, currentFile.filename, content);
            setDirty(prev => {
                const next = new Set(prev);
                next.delete(currentFile.filename);
                return next;
            });
            toast(`${currentFile.filename} saved`, 'success');
        } catch {
            toast('Failed to save file', 'error');
        } finally {
            setSaving(false);
        }
    }, [agent, currentFile, editedContents, toast]);

    const handleSaveAll = useCallback(async () => {
        if (!agent) return;
        setSaving(true);
        try {
            for (const filename of dirty) {
                const content = editedContents[filename] ?? '';
                await updateAgentFile(agent.agentId, filename, content);
            }
            setDirty(new Set());
            toast('All changes saved', 'success');
        } catch {
            toast('Failed to save files', 'error');
        } finally {
            setSaving(false);
        }
    }, [agent, dirty, editedContents, toast]);

    // Cmd+S to save current file
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        if (open) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, handleSave]);

    const displayContent = currentFile
        ? (editedContents[currentFile.filename] ?? currentFile.content)
        : '';

    return (
        <Modal open={open} onClose={onClose} title={agent ? `Workspace — ${agent.name || agent.agentId}` : 'Memory Editor'}>
            <div className={styles.memoryEditor}>
                {loading ? (
                    <div className={styles.emptyDescription} style={{ padding: '2rem' }}>Loading...</div>
                ) : files.length === 0 ? (
                    <div className={styles.emptyDescription} style={{ padding: '2rem' }}>
                        No workspace files found. Chat with the agent to generate its memory.
                    </div>
                ) : (
                    <>
                        {/* File Tabs */}
                        <div className={styles.memoryTabs}>
                            {files.map((file, index) => (
                                <button
                                    key={file.filename}
                                    className={`${styles.memoryTab} ${index === activeFile ? styles.memoryTabActive : ''}`}
                                    onClick={() => setActiveFile(index)}
                                >
                                    {file.filename.replace('.md', '')}
                                    {dirty.has(file.filename) && <span className={styles.memoryTabDot} />}
                                </button>
                            ))}
                        </div>

                        {/* Editor */}
                        <textarea
                            className={styles.memoryTextarea}
                            value={displayContent}
                            onChange={(e) => handleContentChange(e.target.value)}
                        />
                    </>
                )}
                <div className={styles.memoryActions}>
                    <span className={styles.memorySaveHint}>
                        {dirty.size > 0 ? `${dirty.size} unsaved` : '⌘S to save'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {dirty.size > 1 && (
                            <Button variant="ghost" size="sm" loading={saving} onClick={handleSaveAll}>
                                Save All
                            </Button>
                        )}
                        <Button variant="primary" size="sm" loading={saving} onClick={handleSave} disabled={!currentFile}>
                            Save
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
