import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class TimelineProject(Base):
    __tablename__ = "timeline_projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    video_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    segments = relationship(
        "TimelineSegment", back_populates="project", cascade="all, delete-orphan"
    )


class TimelineSegment(Base):
    __tablename__ = "timeline_segments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("timeline_projects.id"), nullable=False)
    text = Column(String, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    audio_path = Column(String, nullable=True)

    # NEW: Voice assignment for this segment
    voice_id = Column(String, ForeignKey("voice_profiles.id"), nullable=True)

    # TTS parameters for this segment
    tts_speed = Column(Float, default=1.0, nullable=True)
    tts_pitch = Column(Float, default=0.0, nullable=True)
    tts_volume = Column(Float, default=80.0, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("TimelineProject", back_populates="segments")
    voice = relationship("VoiceProfile", back_populates="segments")
