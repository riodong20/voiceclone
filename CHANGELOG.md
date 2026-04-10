# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0.0] - 2026-04-10

### Added
- ✨ Voice clone upload functionality - support for MP3/WAV/OGG/WebM audio files
- ✨ Voice recording functionality - direct browser recording for voice cloning
- ✨ Timeline view UI enhancements - improved component styling and interaction
- ✨ API input validation - complete Pydantic validation for all API endpoints
- ✨ Test suite - comprehensive backend integration tests for clone and TTS APIs
- ✨ Frontend API service improvements - better error handling and type definitions

### Fixed
- 🐛 Fixed test failures - all 50 backend tests now pass
- 🐛 Fixed mock injection in tests - properly mock TTS service to avoid real API calls
- 🐛 Fixed empty segment validation in batch TTS API
- 🐛 Fixed audio file path retrieval in TTS audio endpoint
- 🐛 Fixed invalid file type validation in upload API test
