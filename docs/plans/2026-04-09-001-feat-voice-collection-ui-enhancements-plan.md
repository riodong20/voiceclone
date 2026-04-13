---
title: feat: Enhance voice collection and TTS parameter UI
type: feat
status: active
date: 2026-04-09
---

# Enhance Voice Collection and TTS Parameter UI

## Overview

This plan implements UI improvements for the voice cloning workflow: adding recording progress indicators, displaying collected voice samples, showing cloned voices, and adding TTS parameter controls (pitch/speed) for voice synthesis.

## Problem Frame

Current voice cloning UI lacks:
1. Progress indication during audio recording
2. A dedicated section to view collected (uploaded/recorded but not yet cloned) voice samples
3. Proper presentation of available cloned voices
4. Controls to adjust TTS parameters (pitch, speed, volume) when synthesizing speech from subtitles

## Requirements Trace

- R1. Add real-time recording progress indicator in the voice clone panel
- R2. Add a section to display collected (non-cloned) voice samples
- R3. Ensure cloned voices are properly presented and accessible
- R4. Add TTS parameter controls (pitch, speed, volume) when assigning voices to timeline segments

## Scope Boundaries

- This plan requires minimal backend API changes to support TTS parameter storage per segment
- This plan does not add new cloning functionality, only improves UI for existing features
- This plan does not change the core timeline editing functionality

## Context & Research

### Relevant Code and Patterns

- Frontend components: `frontend/src/components/TimelineView/TimelineView.tsx` - contains VoicePanel, SegmentCard, and recording logic
- Types: `frontend/src/types/index.ts` - already defines TTSConfig with speed/pitch/volume fields
- API: `frontend/src/services/api.ts` - voiceApi.synthesize already accepts speed/pitch/volume parameters
- Existing patterns: VoicePanel already has tab navigation, can add new tabs/sections following existing structure

### Institutional Learnings

- Use existing UI components and CSS patterns from `TimelineView.module.css` to maintain consistency
- Follow existing state management patterns using React hooks
- All API calls already have proper error handling patterns to follow

## Key Technical Decisions

1. **Recording Progress**: Add a real-time duration counter and visual progress indicator in the record button area when recording is active
2. **Collected Voices**: Add a third tab "Collected" in the VoicePanel to show uploaded/recorded but not yet cloned voice samples (filters voices where is_cloned: false, using the existing boolean property on VoiceProfile)
3. **Cloned Voices**: Keep existing "Library" tab for fully cloned voices (is_cloned: true) to maintain backward compatibility
4. **TTS Parameters**: Add parameter sliders (pitch: -12 to 12 in 1-step increments, speed: 0.5 to 2.0 in 0.1-step increments, volume: 0 to 100 in 5-step increments) in the segment voice picker dropdown, with reset-to-default button for each parameter. Parameters apply only when a voice is selected (no real-time preview). Parameters persist with the segment in the backend.
5. **State Management**: Store TTS parameters per-segment using local state in SegmentCard, pass parameters to synthesis API

## Open Questions

### Resolved During Planning

- Q: Where to put collected voices? A: Add new "Collected" tab in VoicePanel
- Q: Where to put TTS parameters? A: Add to the voice picker dropdown when assigning a voice to a segment
- Q: What ranges to use for parameters? A: Follow API defaults: pitch [-12, 12], speed [0.5, 2.0], volume [0, 100]
- Q: TTS preview behavior? A: Parameters apply only when a voice is selected (no real-time preview)
- Q: TTS parameter persistence? A: Persist with segment in backend, include reset-to-default functionality
- Q: Feature prioritization? A: All features are must-have for first release

### Interaction State Specifications (Resolved)

#### Recording States
- **Permission denied**: Show error toast with message "Please allow microphone access to record audio"
- **Recording failed**: Show error toast with message "Recording failed. Please try again."
- **Recording interrupted**: Automatically save the partial recording and show toast "Recording interrupted. Partial audio saved."
- Recording counter format: MM:SS (e.g., 00:15 for 15 seconds)

#### Collected Voices Tab
- Available actions for collected voice cards: Preview (play button), Clone (action button), Delete (context menu)
- Sort order: Newest first (by created_at timestamp)
- Post-cloning behavior: Voice remains in Collected tab, duplicate copy appears in Library tab with "Cloned" badge, show success toast "Voice cloned successfully"

#### Cloned Voices (Library Tab)
- Available actions for cloned voice cards: Preview (play button), Delete (context menu), Rename (context menu)
- Scaling: For >10 voices, show simple search bar to filter by name
- Preview interaction: Show loading spinner when audio is loading, disable play button during playback, show error toast if playback fails

#### Accessibility Requirements
- All interactive elements (tabs, buttons, sliders) are keyboard accessible (tab navigation, enter/space to activate)
- Dynamic elements (recording indicator, duration counter) have appropriate ARIA labels
- All text meets WCAG 2.1 AA contrast requirements
- Touch targets are minimum 44x44px for mobile devices

### Deferred to Implementation

- Exact UI styling for progress indicator and parameter sliders will follow existing design patterns, using standard browser form controls styled to match the current UI aesthetic

## Implementation Units

- [ ] **Unit 1: Add recording progress indicator**

**Goal:** Add real-time recording progress UI to show users recording duration

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `frontend/src/components/TimelineView/TimelineView.tsx` (VoicePanel component)
- Modify: `frontend/src/components/TimelineView/TimelineView.module.css`

**Approach:**
- Add `recordingStartTime` state to track when recording begins
- Add `recordingDuration` state that updates every second by calculating the difference between current time and recordingStartTime (avoids counter drift)
- Use `useEffect` with `setInterval(1000ms)` to update the duration while recording is active, clearing the interval when recording stops or component unmounts
- Display the formatted duration counter next to the record button when recording is active
- Add visual pulsing effect to indicate active recording

**Patterns to follow:**
- Use existing CSS class patterns from the module
- Follow existing state management using React useState/useEffect

**Test scenarios:**
- Happy path: When recording starts, duration counter increments from 0
- Happy path: When recording stops, counter resets to 0
- Error path: If recording fails, counter resets properly

**Verification:**
- Recording shows live duration count when active
- Visual indicator clearly shows recording is in progress

- [ ] **Unit 2: Add Collected Voices tab**

**Goal:** Add a new tab to display uploaded/recorded voice samples that are not yet cloned

**Requirements:** R2

**Dependencies:** None

**Files:**
- Modify: `frontend/src/components/TimelineView/TimelineView.tsx` (VoicePanel component)
- Modify: `frontend/src/services/api.ts` (add listCollected method to voiceApi, following the same pattern as listCloned, filtering for is_cloned: false)

**Approach:**
- Add third tab "Collected" to VoicePanel tabs
- Filter voices where is_cloned is false for this tab
- Add voiceApi.listCollected() helper method to filter non-cloned voices
- Display collected samples with option to clone them (follow existing voice card pattern)

**Patterns to follow:**
- Use existing tab UI pattern from VoicePanel
- Reuse existing VoiceCard component structure
- Follow existing API helper pattern

**Test scenarios:**
- Happy path: Collected tab shows only non-cloned voice samples
- Happy path: Uploaded/recorded voices appear in Collected tab after successful upload
- Edge case: Empty state shows when no collected voices exist

**Verification:**
- Collected tab exists and displays non-cloned voices
- Uploaded/recorded samples appear in Collected tab automatically

- [ ] **Unit 3: Improve cloned voices presentation**

**Goal:** Ensure cloned voices are properly displayed and accessible

**Requirements:** R3

**Dependencies:** None

**Files:**
- Modify: `frontend/src/components/TimelineView/TimelineView.tsx` (VoicePanel and SegmentCard components)

**Approach:**
- Keep "Library" tab for fully cloned voices (is_cloned: true)
- Add "Cloned" badge to voice cards in Library tab
- Ensure cloned voices appear in the segment voice picker dropdown
- Add play button functionality to preview voices before assigning

**Patterns to follow:**
- Follow existing voice list and card patterns
- Reuse existing voice picker component structure

**Test scenarios:**
- Happy path: Library tab shows only cloned voices
- Happy path: Cloned voices appear in the voice picker when assigning to segments
- Edge case: Empty state shows when no cloned voices exist

**Verification:**
- Cloned voices are visible in both Library tab and segment voice picker
- Voice preview functionality works correctly

- [ ] **Unit 4: Add TTS parameter controls**

**Goal:** Add pitch, speed, and volume controls when assigning voices to segments

**Requirements:** R4

**Dependencies:** None

**Files:**
- Modify: `frontend/src/components/TimelineView/TimelineView.tsx` (SegmentCard component)
- Modify: `frontend/src/services/api.ts` (add missing assignVoiceToSegment/removeVoiceFromSegment methods, update to accept TTS parameters)
- Modify: `frontend/src/types/index.ts` (add optional TTS parameter fields to TimelineSegment interface: tts_speed, tts_pitch, tts_volume)
- Backend: Update `TimelineSegment` model to add TTS parameter columns
- Backend: Update `/segment/{segment_id}/voice` endpoint to accept and store TTS parameters
- Backend: Update project synthesis endpoint to use per-segment TTS parameters

**Approach:**
- Add missing `assignVoiceToSegment` and `removeVoiceFromSegment` methods to `timelineApi` in api.ts
- Add local state in SegmentCard for TTS parameters with default values (pitch: 0, speed: 1.0, volume: 80) and valid range constraints
- Add slider controls with appropriate step increments:
  - Pitch: -12 to 12, 1-step increments
  - Speed: 0.5 to 2.0, 0.1-step increments
  - Volume: 0 to 100, 5-step increments
- Add individual reset-to-default buttons for each parameter
- Parameters apply only when a voice is selected (no real-time preview during slider adjustment)
- Pass parameters to the assignVoiceToSegment API when assigning a voice
- Add optional TTS parameter fields to TimelineSegment interface (tts_speed, tts_pitch, tts_volume) and backend model to store parameters with the segment data
- Update project synthesis endpoint to use per-segment TTS parameters when generating audio

**Patterns to follow:**
- Use existing form control patterns
- Follow existing API call patterns for segment updates

**Test scenarios:**
- Happy path: Parameter sliders appear when selecting a voice for a segment
- Happy path: Adjusting sliders changes the parameter values
- Happy path: Parameters are passed correctly to the synthesis API
- Edge case: Parameter values stay within valid ranges

**Verification:**
- TTS parameter controls are visible in the voice picker
- Adjusting parameters affects the synthesized speech output
- Parameters are persisted with the segment

## System-Wide Impact

- **State lifecycle risks:** TTS parameters are stored per-segment, ensure they are properly persisted when the project is saved
- **API surface parity:** No breaking changes to existing APIs, only adding optional parameters
- **Unchanged invariants:** All existing functionality (recording, upload, cloning, timeline editing) remains unchanged

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Parameter values may not be properly passed to API | Add type safety and validation for parameter values before API call |
| Recording counter may drift over time | Calculate duration by comparing current time with recording start timestamp, instead of incrementing a counter |
| New tabs may break existing layout | Test responsiveness after adding new tab |

## Documentation / Operational Notes

- No documentation updates needed for users, features are self-explanatory in the UI
- Backward compatible: existing projects and voices continue to work without changes
