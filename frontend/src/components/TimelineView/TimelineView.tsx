import { useState, useCallback, useEffect } from 'react';
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

  const handleAssignVoice = async (segmentId: string, voiceId: string, params?: { speed: number; pitch: number; volume: number }) => {
    setIsAssigning(true);
    try {
      await timelineApi.assignVoiceToSegment(segmentId, voiceId, params);
      // Refresh project to get updated segments
      const updatedProject = await timelineApi.getProject(project.id);
      onProjectUpdate(updatedProject);
    } catch (error) {
      console.error('Failed to assign voice:', error);
      alert('Failed to assign voice. Please try again.');
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
  onAssignVoice: (segmentId: string, voiceId: string, params?: { speed: number; pitch: number; volume: number }) => void;
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
  const [ttsParams, setTtsParams] = useState({
    speed: segment.tts_speed ?? 1.0,
    pitch: segment.tts_pitch ?? 0,
    volume: segment.tts_volume ?? 80,
  });

  const handleParamChange = (param: keyof typeof ttsParams, value: number) => {
    setTtsParams(prev => ({ ...prev, [param]: value }));
  };

  const resetParam = (param: keyof typeof ttsParams) => {
    const defaults = { speed: 1.0, pitch: 0, volume: 80 };
    setTtsParams(prev => ({ ...prev, [param]: defaults[param] }));
  };

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

          {/* TTS Parameter Controls */}
          <div className={styles.ttsParamsSection}>
            <div className={styles.paramGroup}>
              <div className={styles.paramLabel}>
                <span>Speed: {ttsParams.speed.toFixed(1)}x</span>
                <button
                  className={styles.paramResetButton}
                  onClick={() => resetParam('speed')}
                  aria-label="Reset speed to default"
                >
                  ↺
                </button>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={ttsParams.speed}
                onChange={(e) => handleParamChange('speed', parseFloat(e.target.value))}
                className={styles.paramSlider}
                aria-label="Adjust speech speed"
              />
            </div>

            <div className={styles.paramGroup}>
              <div className={styles.paramLabel}>
                <span>Pitch: {ttsParams.pitch >= 0 ? '+' : ''}{ttsParams.pitch}</span>
                <button
                  className={styles.paramResetButton}
                  onClick={() => resetParam('pitch')}
                  aria-label="Reset pitch to default"
                >
                  ↺
                </button>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={ttsParams.pitch}
                onChange={(e) => handleParamChange('pitch', parseInt(e.target.value))}
                className={styles.paramSlider}
                aria-label="Adjust speech pitch"
              />
            </div>

            <div className={styles.paramGroup}>
              <div className={styles.paramLabel}>
                <span>Volume: {ttsParams.volume}%</span>
                <button
                  className={styles.paramResetButton}
                  onClick={() => resetParam('volume')}
                  aria-label="Reset volume to default"
                >
                  ↺
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={ttsParams.volume}
                onChange={(e) => handleParamChange('volume', parseInt(e.target.value))}
                className={styles.paramSlider}
                aria-label="Adjust speech volume"
              />
            </div>
          </div>

          <div className={styles.voiceList}>
            {voices
              .filter(voice => voice.is_cloned)
              .map((voice) => (
              <button
                key={voice.id}
                className={styles.voiceOption}
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignVoice(segment.id, voice.id, ttsParams);
                }}
                disabled={isAssigning}
              >
                <span className={styles.voiceOptionIcon}>🎤</span>
                <span className={styles.voiceOptionName}>{voice.name}</span>
                <span className={styles.voiceOptionBadge}>Cloned</span>
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
  const [activeTab, setActiveTab] = useState<'clone' | 'library' | 'collected'>('clone');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<BlobPart[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string>('');

  // Handle voice preview playback
  const handleVoicePreview = useCallback((voice: VoiceProfile) => {
    if (playingVoiceId === voice.id) {
      // Stop current playback
      audioElement?.pause();
      setPlayingVoiceId(null);
      setAudioElement(null);
      return;
    }

    // Stop any existing playback
    if (audioElement) {
      audioElement.pause();
    }

    // Create new audio element
    const audio = new Audio(voice.audio_url);
    audio.onended = () => {
      setPlayingVoiceId(null);
      setAudioElement(null);
    };
    audio.onerror = () => {
      console.error('Failed to play voice preview');
      setPlayingVoiceId(null);
      setAudioElement(null);
      alert('Failed to play audio preview. Please try again.');
    };

    audio.play().catch(err => {
      console.error('Playback failed:', err);
      setPlayingVoiceId(null);
      setAudioElement(null);
      alert('Failed to play audio preview. Please check your browser permissions.');
    });

    setAudioElement(audio);
    setPlayingVoiceId(voice.id);
  }, [playingVoiceId, audioElement]);

  // Update recording duration every second while recording
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        setRecordingDuration(Math.floor((now - recordingStartTime) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, recordingStartTime]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (file.type.startsWith('audio/')) {
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
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
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
      setRecordingStartTime(null);

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
        setRecordingStartTime(Date.now());
        setRecordingDuration(0);
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
          onClick={() => {
            setActiveTab('clone');
            setVoiceSearchQuery('');
          }}
        >
          Clone
        </button>
        <button
          className={`${styles.panelTab} ${activeTab === 'collected' ? styles.active : ''}`}
          onClick={() => {
            setActiveTab('collected');
            setVoiceSearchQuery('');
          }}
        >
          Collected
        </button>
        <button
          className={`${styles.panelTab} ${activeTab === 'library' ? styles.active : ''}`}
          onClick={() => {
            setActiveTab('library');
            setVoiceSearchQuery('');
          }}
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

            <div className={styles.recordSection}>
              <button
                className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`}
                onClick={handleRecordToggle}
                disabled={isUploading}
              >
                <span className={`${styles.recordIcon} ${isRecording ? styles.pulsing : ''}`}>
                  {isRecording ? '🔴' : '🎙️'}
                </span>
                <span>{isRecording ? 'Stop Recording' : 'Record Voice Sample'}</span>
              </button>
              {isRecording && (
                <div className={styles.recordingDuration} aria-label={`Recording duration: ${formatDuration(recordingDuration)}`}>
                  {formatDuration(recordingDuration)}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'collected' ? (
          <div className={styles.voiceListSection}>
            <div className={styles.sectionLabel}>Collected Voice Samples</div>

            {voices.filter(v => !v.is_cloned).length > 10 && (
              <div className={styles.searchContainer}>
                <input
                  type="text"
                  placeholder="Search collected voices..."
                  value={voiceSearchQuery}
                  onChange={(e) => setVoiceSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  aria-label="Search collected voices"
                />
              </div>
            )}

            {voices
              .filter(v => !v.is_cloned)
              .filter(v => voiceSearchQuery === '' || v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()))
              .length > 0 ? (
              <div className={styles.voiceList}>
                {voices
                  .filter(voice => !voice.is_cloned)
                  .filter(voice => voiceSearchQuery === '' || voice.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()))
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((voice) => (
                    <div
                      key={voice.id}
                      className={styles.voiceCard}
                    >
                      <div className={styles.voiceHeader}>
                        <button
                          className={styles.voicePlayButton}
                          aria-label={`${playingVoiceId === voice.id ? 'Pause' : 'Play'} ${voice.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVoicePreview(voice);
                          }}
                        >
                          {playingVoiceId === voice.id ? '⏸' : '▶'}
                        </button>
                        <span className={styles.voiceName}>{voice.name}</span>
                        <button className={styles.voiceActionButton} aria-label="Clone this voice">
                          🧬
                        </button>
                        <button className={styles.voiceActionButton} aria-label="Delete this voice">
                          🗑️
                        </button>
                      </div>
                      <div className={styles.voiceMeta}>
                        Uploaded {new Date(voice.created_at).toLocaleDateString()} • {voice.role || 'Custom'}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📁</div>
                <div className={styles.emptyTitle}>No collected samples</div>
                <div className={styles.emptyHint}>
                  Upload or record audio samples in the Clone tab to see them here
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.voiceListSection}>
            <div className={styles.sectionLabel}>Your Cloned Voices</div>

            {voices.filter(v => v.is_cloned).length > 10 && (
              <div className={styles.searchContainer}>
                <input
                  type="text"
                  placeholder="Search cloned voices..."
                  value={voiceSearchQuery}
                  onChange={(e) => setVoiceSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  aria-label="Search cloned voices"
                />
              </div>
            )}

            {voices
              .filter(v => v.is_cloned)
              .filter(v => voiceSearchQuery === '' || v.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()))
              .length > 0 ? (
              <div className={styles.voiceList}>
                {voices
                  .filter(voice => voice.is_cloned)
                  .filter(voice => voiceSearchQuery === '' || voice.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()))
                  .map((voice) => (
                    <div
                      key={voice.id}
                      className={styles.voiceCard}
                    >
                      <div className={styles.voiceHeader}>
                        <button
                          className={styles.voicePlayButton}
                          aria-label={`${playingVoiceId === voice.id ? 'Pause' : 'Play'} ${voice.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVoicePreview(voice);
                          }}
                        >
                          {playingVoiceId === voice.id ? '⏸' : '▶'}
                        </button>
                        <span className={styles.voiceName}>{voice.name}</span>
                        <span className={styles.clonedBadge}>Cloned</span>
                      </div>
                      <div className={styles.voiceMeta}>
                        Cloned {voice.cloned_at ? new Date(voice.cloned_at).toLocaleDateString() : 'Recently'} • {voice.role || 'Custom'}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🎤</div>
                <div className={styles.emptyTitle}>No cloned voices yet</div>
                <div className={styles.emptyHint}>
                  Clone your first voice from the Collected tab to see it here
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}