'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { listDriveFiles, uploadDriveFile, getDriveDownloadUrl, deleteDriveFile, IAgent, DriveFile } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Upload, Download, Trash2, HardDrive, FileText } from 'lucide-react';
import styles from './Dashboard.module.css';

interface AgentDriveProps {
    agent: IAgent | null;
    open: boolean;
    onClose: () => void;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function AgentDrive({ agent, open, onClose }: AgentDriveProps) {
    const { toast } = useToast();
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const loadFiles = useCallback(async () => {
        if (!agent) return;
        setLoading(true);
        try {
            const data = await listDriveFiles(agent.agentId);
            setFiles(data);
        } catch {
            toast('Failed to load drive files', 'error');
        } finally {
            setLoading(false);
        }
    }, [agent, toast]);

    useEffect(() => {
        if (agent && open) loadFiles();
    }, [agent, open, loadFiles]);

    const handleUpload = async (fileList: FileList | null) => {
        if (!agent || !fileList || fileList.length === 0) return;
        setUploading(true);
        try {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                // Preserve folder structure via webkitRelativePath
                const relativePath = (file as any).webkitRelativePath || file.name;
                const uploadName = relativePath || file.name;
                // Create a new File with the relative path as the name
                const namedFile = new File([file], uploadName, { type: file.type });
                await uploadDriveFile(agent.agentId, namedFile);
            }
            toast(`${fileList.length} file(s) uploaded`, 'success');
            loadFiles();
        } catch {
            toast('Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (filename: string) => {
        if (!agent) return;
        try {
            const url = await getDriveDownloadUrl(agent.agentId, filename);
            window.open(url, '_blank');
        } catch {
            toast('Download failed', 'error');
        }
    };

    const handleDelete = async (filename: string) => {
        if (!agent) return;
        try {
            await deleteDriveFile(agent.agentId, filename);
            toast('File deleted', 'success');
            loadFiles();
        } catch {
            toast('Delete failed', 'error');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        handleUpload(e.dataTransfer.files);
    };

    return (
        <Modal open={open} onClose={onClose} title={agent ? `Drive — ${agent.name || agent.agentId}` : 'Drive'}>
            <div className={styles.driveContainer}>
                {/* Drop Zone */}
                <div
                    className={`${styles.driveDropZone} ${dragging ? styles.driveDropZoneActive : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload size={20} />
                    <span>{uploading ? 'Uploading...' : 'Drop files or folders here, or click to upload'}</span>
                    <span className={styles.driveDropHint}>Max 10MB per file • Files are stored in S3</span>
                    <div className={styles.driveUploadButtons} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.driveUploadBtn} onClick={() => fileInputRef.current?.click()}>Files</button>
                        <button className={styles.driveUploadBtn} onClick={() => folderInputRef.current?.click()}>Folder</button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => handleUpload(e.target.files)}
                    />
                    <input
                        ref={(el) => {
                            (folderInputRef as any).current = el;
                            if (el) { el.setAttribute('webkitdirectory', ''); el.setAttribute('directory', ''); }
                        }}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => handleUpload(e.target.files)}
                    />
                </div>

                {/* File List */}
                {loading ? (
                    <div className={styles.emptyDescription} style={{ padding: '2rem' }}>Loading...</div>
                ) : files.length === 0 ? (
                    <div className={styles.driveEmpty}>
                        <HardDrive size={24} />
                        <span>No files yet</span>
                        <span className={styles.driveDropHint}>Upload files for your agent to use at /tmp/drive/</span>
                    </div>
                ) : (
                    <div className={styles.driveFileList}>
                        {files.map((file) => (
                            <div key={file.name} className={styles.driveFileRow}>
                                <div className={styles.driveFileInfo}>
                                    <FileText size={14} />
                                    <span className={styles.driveFileName}>{file.name}</span>
                                    <span className={styles.driveFileMeta}>{formatBytes(file.size)}</span>
                                </div>
                                <div className={styles.driveFileActions}>
                                    <button className={styles.driveIconBtn} onClick={() => handleDownload(file.name)} title="Download">
                                        <Download size={13} />
                                    </button>
                                    <button className={styles.driveIconBtn} onClick={() => handleDelete(file.name)} title="Delete">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}
