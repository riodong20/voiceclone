---
title: Voice Clone UI Enhancement Implementation Guide
description: Comprehensive implementation guide for voice cloning UI enhancements including real-time recording progress, tabbed voice management, and per-segment TTS parameter controls
date: 2026-03-15
last_updated: 2026-04-09
category: frontend-issues
tags:
  - voice-cloning
  - ui/ux
  - react
  - typescript
  - fastapi
  - database
status: published
version: 1.1
---
# Voice Clone UI Enhancement Implementation Guide

## Context
This document describes the implementation of a comprehensive voice cloning UI enhancement for the Voice Clone Studio application. The feature delivers a more intuitive and powerful voice management experience with real-time feedback, organized voice collections, and granular TTS parameter controls.

## Guidance

### Frontend Implementation Patterns

#### 1. Real-time Recording Progress (Timestamp-Based Calculation)
Avoid common setInterval drift by using timestamp-based duration calculation:

```typescript
// Recording state
const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
const [recordingDuration, setRecordingDuration] = useState<number>(0);

// Update duration using timestamps to prevent drift
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
```

#### 2. Voice Panel Tab Organization
Implement three-tab interface for better voice management:

```typescript
const [activeTab, setActiveTab] = useState<'clone' | 'library' | 'collected'>('clone');

// Tab navigation
<div className={styles.panelTabs}>
  <button className={`${styles.panelTab} ${activeTab === 'clone' ? styles.active : ''}`} onClick={() => setActiveTab('clone')}>
    Clone
  </button>
  <button className={`${styles.panelTab} ${activeTab === 'collected' ? styles.active : ''}`} onClick={() => setActiveTab('collected')}>
    Collected
  </button>
  <button className={`${styles.panelTab} ${activeTab === 'library' ? styles.active : ''}`} onClick={() => setActiveTab('library')}>
    Library
  </button>
</div>
```

#### 3. Collected Tab (Non-cloned Voices)
Display raw voice samples sorted by date with bulk actions:

```typescript
// Collected tab content
{voices
  .filter(voice => !voice.is_cloned)
  .filter(voice => voiceSearchQuery === '' || voice.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()))
  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  .map((voice) => (
    <div key={voice.id} className={styles.voiceCard}>
      <div className={styles.voiceHeader}>
        <button onClick={() => handleVoicePreview(voice)}>
          {playingVoiceId === voice.id ? '⏸' : '▶'}
        </button>
        <span className={styles.voiceName}>{voice.name}</span>
        <button aria-label="Clone this voice">🧬</button>
        <button aria-label="Delete this voice">🗑️</button>
      </div>
      <div className={styles.voiceMeta}>
        Uploaded {new Date(voice.created_at).toLocaleDateString()} • {voice.role || 'Custom'}
      </div>
    </div>
  ))}
```

#### 4. Library Tab (Cloned Voices)
Show only cloned voices with play/pause functionality and search:

```typescript
// Library tab content with conditional search
{voices.filter(v => v.is_cloned).length > 10 && (
  <div className={styles.searchContainer}>
    <input
      type="text"
      placeholder="Search cloned voices..."
      value={voiceSearchQuery}
      onChange={(e) => setVoiceSearchQuery(e.target.value)}
      className={styles.searchInput}
    />
  </div>
)}

{voices
  .filter(voice => voice.is_cloned)
  .filter(voice => voiceSearchQuery === '' || voice.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()))
  .map((voice) => (
    <div key={voice.id} className={styles.voiceCard}>
      <div className={styles.voiceHeader}>
        <button onClick={() => handleVoicePreview(voice)}>
          {playingVoiceId === voice.id ? '⏸' : '▶'}
        </button>
        <span className={styles.voiceName}>{voice.name}</span>
        <span className={styles.clonedBadge}>Cloned</span>
      </div>
      <div className={styles.voiceMeta}>
        Cloned {voice.cloned_at ? new Date(voice.cloned_at).toLocaleDateString() : 'Recently'}
      </div>
    </div>
  ))}
```

#### 5. TTS Parameter Sliders with Reset
Implement per-segment TTS controls with sensible defaults:

```typescript
// TTS parameter state
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

// Speed slider example
<div className={styles.paramGroup}>
  <div className={styles.paramLabel}>
    <span>Speed: {ttsParams.speed.toFixed(1)}x</span>
    <button onClick={() => resetParam('speed')} aria-label="Reset speed to default">
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
  />
</div>
```

### Backend Implementation Patterns

#### 1. TimelineSegment Model with TTS Parameters
Add per-segment TTS parameter fields to the database model:

```python
# backend/app/models/timeline.py
class TimelineSegment(Base):
    __tablename__ = "timeline_segments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("timeline_projects.id"), nullable=False)
    text = Column(String, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    audio_path = Column(String, nullable=True)
    
    # Voice assignment
    voice_id = Column(String, ForeignKey("voice_profiles.id"), nullable=True)
    
    # Per-segment TTS parameters
    tts_speed = Column(Float, default=1.0, nullable=True)
    tts_pitch = Column(Float, default=0.0, nullable=True)
    tts_volume = Column(Float, default=80.0, nullable=True)

    # Relationships
    project = relationship("TimelineProject", back_populates="segments")
    voice = relationship("VoiceProfile", back_populates="segments")
```

#### 2. Updated API Endpoint for Voice Assignment
Modify the assign voice endpoint to accept TTS parameters:

```python
# backend/app/api/timeline.py
@router.post("/segment/{segment_id}/voice")
async def assign_voice_to_segment(
    segment_id: str,
    voice_id: str = Body(...),
    speed: Optional[float] = Body(1.0),
    pitch: Optional[float] = Body(0.0),
    volume: Optional[float] = Body(80.0),
    db: Session = Depends(get_db)
):
    segment = db.query(TimelineSegment).filter(TimelineSegment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    voice = db.query(VoiceProfile).filter(VoiceProfile.id == voice_id).first()
    if not voice or not voice.is_cloned:
        raise HTTPException(status_code=400, detail="Invalid or uncloned voice")
    
    segment.voice_id = voice_id
    segment.tts_speed = speed
    segment.tts_pitch = pitch
    segment.tts_volume = volume
    db.commit()
    
    return {"status": "success"}
```

#### 3. Synthesis Endpoint with Segment Parameters
Use per-segment parameters during synthesis:

```python
# backend/app/api/tts.py
@router.post("/synthesize")
async def synthesize_text(
    request: TTSRequest,
    db: Session = Depends(get_db)
):
    # Get voice if specified
    voice = None
    if request.voice_id:
        voice = db.query(VoiceProfile).filter(VoiceProfile.id == request.voice_id).first()
        if not voice or not voice.is_cloned:
            raise HTTPException(status_code=400, detail="Invalid or uncloned voice")
    
    # Use segment-specific parameters or defaults
    speed = request.speed or 1.0
    pitch = request.pitch or 0.0
    volume = request.volume or 80
    
    # Call Qwen API with parameters
    audio_result = await qwen_client.synthesize(
        text=request.text,
        voice_id=voice.qwen_voice_id if voice else None,
        speed=speed,
        pitch=pitch,
        volume=volume,
        emotion=request.emotion
    )
    
    return audio_result
```

### Type Definitions
Update TypeScript types to support new fields:

```typescript
// frontend/src/types/index.ts
export interface TimelineSegment {
  id: string;
  text: string;
  start_time: number;
  end_time: number;
  audio_url?: string;
  voice_id?: string;
  voice?: VoiceProfile;
  tts_speed?: number;
  tts_pitch?: number;
  tts_volume?: number;
}
```

## Why This Matters

### User Experience Improvements
1. **Reduced Confusion**: Separating collected samples from cloned voices eliminates ambiguity about which voices are ready for use
2. **Faster Workflow**: Real-time recording feedback and organized collections reduce time spent managing voice assets
3. **Greater Control**: Per-segment TTS parameters allow precise voice tuning without affecting global settings
4. **Scalability**: Conditional search for >10 voices ensures the interface remains performant as users build larger voice libraries

### Technical Benefits
1. **No Drift Timing**: Timestamp-based recording calculation is far more accurate than accumulated interval counts
2. **Type Safety**: Full TypeScript support across all new features prevents runtime errors
3. **Backward Compatibility**: Default values for new fields ensure existing projects continue to work without migration
4. **Extensible Architecture**: Per-segment parameter design supports future parameter additions without schema overhauls

## When to Apply

### Use This Pattern When:
- Building recording interfaces where accurate duration display is critical
- Implementing tab-based content organization for collections with distinct states
- Adding adjustable parameters that need per-instance rather than global configuration
- Designing interfaces that will scale to hundreds of items requiring search/filter functionality
- Working with APIs that support granular request parameters

### Avoid This Pattern When:
- Building simple interfaces with fewer than 10 total items (search is unnecessary overhead)
- Timing precision is not critical (simple counter-based intervals are sufficient)
- Parameters should always apply globally across all instances

## Examples

### Full Voice Assignment Flow
```typescript
// Complete voice assignment handler with parameters
const handleAssignVoice = async (
  segmentId: string, 
  voiceId: string, 
  params?: { speed: number; pitch: number; volume: number }
) => {
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

// Usage in voice picker
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
```

### Conditional Search Rendering
```typescript
// Only show search when there are enough items to warrant it
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
```

## Migration Notes
1. **Database Migration**: Add the three new TTS parameter fields to the `timeline_segments` table with default values
2. **API Versioning**: No breaking changes - existing API clients will continue to work with default parameter values
3. **Frontend State**: Existing segment state will gracefully fall back to default values when new fields are not present
