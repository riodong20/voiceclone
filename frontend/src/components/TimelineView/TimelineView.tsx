import { useState, useCallback } from 'react';
import type { TimelineProject, TimelineSegment, VoiceProfile } from '../../types';
import { VideoPlayer } from '../Timeline/VideoPlayer';
import { timelineApi, voiceApi } from '../../services/api';
import styles from './TimelineView.module.css';

interface TimelineViewProps {
  project: TimelineProject;
  voices: VoiceProfile[];
  onProjectUpdate: (project: TimelineProject) => void;
  onVoicesUpdated: () => void;
}

export function TimelineView({ project, voices, onProjectUpdate, onVoicesUpdated }: TimelineViewProps) {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssignVoice = async (segmentId: string, voiceId: string) => {
    setIsAssigning(true);
    try {
      await timelineApi.assignVoiceToSegment(segmentId, voiceId);
      // Refresh project to get updated segments
      const updatedProject = await timelineApi.getProject(project.id);
      onProjectUpdate(updatedProject);
    } catch (error) {
      console.error('Failed to assign voice:', error);
    } finally {
      setIsAssigning(false);
      setSelectedSegmentId(null);
    }
  };

  const handleRemoveVoice = async (segmentId: string) => {
    setIsAssigning(true);
    try {
      await timelineApi.removeVoiceFromSegment(segmentId);
      const updatedProject = await timelineApi.getProject(project.id);
      onProjectUpdate(updatedProject);
    } catch (error) {
      console.error('Failed to remove voice:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className={styles.timelineView}>
      {/* Left Panel - Video Stage */}
      <div className={styles.videoStage}>
        <div className={styles.videoContainer}>
          {project.video_url ? (
            <VideoPlayer url={project.video_url} />
          ) : (
            <div className={styles.videoPlaceholder}>
              <div className={styles.videoPlaceholderIcon}>🎬</div>
              <div className={styles.videoPlaceholderText}>No video uploaded</div>
              <div className={styles.videoPlaceholderHint}>
                Upload a video to start editing
              </div>
            </div>
          )}
        </div>

        <div className={styles.timelineSection}>
          <div className={styles.timelineHeader}>
            <div className={styles.timelineTitle}>Timeline</div>
          </div>

          <div className={styles.segmentTrack}>
            {(project.segments || []).map((segment) => (
              <SegmentCard
                key={segment.id}
                segment={segment}
                voices={voices}
                isSelected={selectedSegmentId === segment.id}
                isAssigning={isAssigning}
                onSelect={() => setSelectedSegmentId(segment.id)}
                onAssignVoice={handleAssignVoice}
                onRemoveVoice={handleRemoveVoice}
              />
            ))}

            {(project.segments || []).length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📝</div>
                <div className={styles.emptyTitle}>No segments yet</div>
                <div className={styles.emptyHint}>
                  Add text segments to create voiceover
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Voice Panel */}
      <VoicePanel voices={voices} onVoicesUpdated={onVoicesUpdated} />
    </div>
  );
}

// Sub-components
interface SegmentCardProps {
  segment: TimelineSegment;
  voices: VoiceProfile[];
  isSelected: boolean;
  isAssigning: boolean;
  onSelect: () => void;
  onAssignVoice: (segmentId: string, voiceId: string) => void;
  onRemoveVoice: (segmentId: string) => void;
}

function SegmentCard({
  segment,
  voices,
  isSelected,
  isAssigning,
  onSelect,
  onAssignVoice,
  onRemoveVoice,
}: SegmentCardProps) {
  const assignedVoice = voices.find((v) => v.id === segment.voice_id);

  return (
    <div
      className={`${styles.segmentCard} ${isSelected ? styles.selected : ''}`}
      onClick={onSelect}
    >
      <div className={styles.segmentContent}>
        <div className={styles.segmentText}>{segment.text}</div>

        <div className={styles.segmentMeta}>
          {segment.start_time.toFixed(1)}s - {segment.end_time.toFixed(1)}s
        </div>

        {assignedVoice ? (
          <div className={styles.voiceBadge} data-testid="voice-badge">
            <span className={styles.voiceIcon}>🎤</span>
            <span className={styles.voiceName} data-testid="assigned-voice-name">{assignedVoice.name}</span>
            <button
              className={styles.removeVoiceButton}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveVoice(segment.id);
              }}
              disabled={isAssigning}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className={styles.assignVoicePlaceholder}>
            <button
              className={styles.assignVoiceButton}
              disabled={isAssigning}
            >
              + Assign Voice
            </button>
          </div>
        )}
      </div>

      {isSelected && !assignedVoice && (
        <div className={styles.voicePicker}>
          <div className={styles.voicePickerTitle}>Select a voice:</div>
          <div className={styles.voiceList}>
            {voices.map((voice) => (
              <button
                key={voice.id}
                className={styles.voiceOption}
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignVoice(segment.id, voice.id);
                }}
                disabled={isAssigning}
              >
                <span className={styles.voiceOptionIcon}>🎤</span>
                <span className={styles.voiceOptionName}>{voice.name}</span>
                {voice.is_cloned && (
                  <span className={styles.voiceOptionBadge}>Cloned</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface VoicePanelProps {
  voices: VoiceProfile[];
  onVoicesUpdated: () => void;
}

function VoicePanel({ voices, onVoicesUpdated }: VoicePanelProps) {
  const [activeTab, setActiveTab] = useState<'clone' | 'library'>('clone');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<BlobPart[]>([]);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        await voiceApi.uploadVoice(formData);
        onVoicesUpdated();
        alert('Voice uploaded successfully! You can now create a clone from it.');
      } catch (error) {
        console.error('Upload failed:', error);
        alert('Failed to upload voice. Please try again.');
      } finally {
        setIsUploading(false);
      }
    } else {
      alert('Please upload an audio file.');
    }
  }, [onVoicesUpdated]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // File input click handler
  const handleFileInputClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  }, [handleFileUpload]);

  // Recording handlers
  const handleRecordToggle = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorder?.stop();
      setIsRecording(false);
      setMediaRecorder(null);

      if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        await handleFileUpload(file);
        setRecordedChunks([]);
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);
        setRecordedChunks([]);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            setRecordedChunks(prev => [...prev, e.data]);
          }
        };

        recorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Recording failed:', error);
        alert('Failed to start recording. Please allow microphone access.');
      }
    }
  }, [isRecording, mediaRecorder, recordedChunks, handleFileUpload]);

  return (
    <div className={styles.voicePanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>🎤 Voices</div>
      </div>

      <div className={styles.panelTabs}>
        <button
          className={`${styles.panelTab} ${activeTab === 'clone' ? styles.active : ''}`}
          onClick={() => setActiveTab('clone')}
        >
          Clone
        </button>
        <button
          className={`${styles.panelTab} ${activeTab === 'library' ? styles.active : ''}`}
          onClick={() => setActiveTab('library')}
        >
          Library
        </button>
      </div>

      <div className={styles.panelContent}>
        {activeTab === 'clone' ? (
          <div className={styles.cloneSection}>
            <div className={styles.sectionLabel}>Create New Voice</div>

            <div
              className={`${styles.uploadZone} ${isDragging ? styles.dragging : ''} ${isUploading ? styles.uploading : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleFileInputClick}
              role="button"
              tabIndex={0}
            >
              <div className={styles.uploadIcon}>
                {isUploading ? '⏳' : isDragging ? '📥' : '📁'}
              </div>
              <div className={styles.uploadText}>
                {isUploading ? 'Uploading...' : isDragging ? 'Drop audio file here' : 'Drop audio file to clone'}
              </div>
              <div className={styles.uploadHint}>
                {isUploading ? 'Please wait...' : 'Click to browse or drag & drop. MP3, WAV, WebM supported.'}
              </div>
            </div>

            <button
              className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`}
              onClick={handleRecordToggle}
              disabled={isUploading}
            >
              <span>{isRecording ? '🔴' : '🎙️'}</span>
              <span>{isRecording ? 'Stop Recording' : 'Record Voice Sample'}</span>
            </button>
          </div>
        ) : (
          <div className={styles.voiceListSection}>
            <div className={styles.sectionLabel}>Your Cloned Voices</div>

            {voices.length > 0 ? (
              <div className={styles.voiceList}>
                {voices.map((voice) => (
                  <div
                    key={voice.id}
                    className={styles.voiceCard}
                  >
                    <div className={styles.voiceHeader}>
                      <button className={styles.voicePlayButton}>▶</button>
                      <span className={styles.voiceName}>{voice.name}</span>
                    </div>
                    <div className={styles.voiceMeta}>
                      {voice.is_cloned ? 'Cloned' : 'Not cloned'} • {voice.role || 'Custom'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🎙️</div>
                <div className={styles.emptyTitle}>No voices yet</div>
                <div className={styles.emptyHint}>
                  Upload or record audio to clone your first voice
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}