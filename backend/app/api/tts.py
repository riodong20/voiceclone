import logging
import os
import uuid
from typing import List, Optional

import aiofiles
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.services.qwen_tts_service import get_tts_service

logger = logging.getLogger(__name__)

router = APIRouter()


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000, description="合成文本，长度1-1000字符")
    speed: float = Field(1.0, ge=0.5, le=2.0, description="语速，范围0.5-2.0")
    volume: float = Field(80, ge=0, le=100, description="音量，范围0-100")
    pitch: int = Field(0, ge=-12, le=12, description="音调，范围-12到12")
    emotion: str = Field("neutral", description="情感类型")
    voice_id: Optional[str] = Field(None, description="克隆声音ID，可选")

    @validator("text")
    def text_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Text cannot be empty or whitespace")
        return v


class SegmentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000, description="片段文本，长度1-1000字符")
    start_time: float = Field(..., ge=0, description="开始时间，大于等于0")
    end_time: float = Field(..., ge=0, description="结束时间，大于等于0")

    @validator("text")
    def text_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Text cannot be empty or whitespace")
        return v

    @validator("end_time")
    def end_time_greater_than_start(cls, v, values):
        if "start_time" in values and v <= values["start_time"]:
            raise ValueError("End time must be greater than start time")
        return v


class BatchTTSRequest(BaseModel):
    segments: List[SegmentRequest] = Field(..., min_length=1, description="语音片段列表，至少1个片段")
    speed: float = Field(1.0, ge=0.5, le=2.0, description="语速，范围0.5-2.0")
    volume: float = Field(80, ge=0, le=100, description="音量，范围0-100")
    pitch: int = Field(0, ge=-12, le=12, description="音调，范围-12到12")
    emotion: str = Field("neutral", description="情感类型")


@router.post("/synthesize")
async def synthesize_speech(request: TTSRequest, db: Session = Depends(get_db)):
    """
    合成语音 - 使用千问 TTS API

    为什么需要检查 voice_id：
    - 如果传入了 voice_id（克隆的声音），需要使用声音克隆模型
    - 如果没有传入，则使用标准 TTS 模型和默认声音
    """
    audio_id = str(uuid.uuid4())
    audio_path = settings.voices_dir / f"tts_{audio_id}.wav"

    # 使用声音 ID (如果有) 或默认
    voice_id = request.voice_id or "xiaoyun"

    try:
        tts_service = await get_tts_service()

        # 判断是否使用克隆声音（克隆的 voice_id 通常不是预定义的标准声音）
        standard_voices = ["xiaoyun", "xiaoyuan", "ruoxi", "xiaogang", "yunjian"]
        is_cloned_voice = voice_id not in standard_voices

        if is_cloned_voice:
            # 使用克隆声音进行合成
            logger.info(f"Using cloned voice ID: {voice_id}")
            audio_data = await tts_service.clone_voice(
                voice_id=voice_id,
                text=request.text,
                speed=request.speed,
                volume=request.volume,
                pitch=request.pitch,
                format="wav",
                sample_rate=16000,
            )
        else:
            # 使用标准 TTS 声音
            logger.info(f"Using standard voice: {voice_id}")
            audio_data = await tts_service.synthesize_speech(
                text=request.text,
                voice_id=voice_id,
                speed=request.speed,
                volume=request.volume,
                pitch=request.pitch,
                format="wav",
                sample_rate=16000,
            )

        # 保存音频文件
        async with aiofiles.open(audio_path, "wb") as f:
            await f.write(audio_data)

        return {
            "audio_id": audio_id,
            "audio_url": f"/api/tts/audio/{audio_id}",
            "text": request.text,
            "params": {
                "speed": request.speed,
                "volume": request.volume,
                "pitch": request.pitch,
                "emotion": request.emotion,
                "voice_id": voice_id,
                "is_cloned_voice": is_cloned_voice,
            },
        }

    except Exception as e:
        # 如果 API 调用失败，返回错误
        logger.error(f"TTS synthesis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")


@router.post("/batch")
async def batch_synthesize(request: BatchTTSRequest, db: Session = Depends(get_db)):
    """批量合成语音 (用于时间轴)"""
    results = []

    try:
        tts_service = await get_tts_service()

        for segment in request.segments:
            audio_id = str(uuid.uuid4())
            audio_path = settings.voices_dir / f"tts_{audio_id}.wav"

            # 调用千问 TTS API
            audio_data = await tts_service.synthesize_speech(
                text=segment.text,
                voice_id="xiaoyun",  # 批量合成使用默认声音
                speed=request.speed,
                volume=request.volume,
                pitch=request.pitch,
                format="wav",
                sample_rate=16000,
            )

            # 保存音频文件
            async with aiofiles.open(audio_path, "wb") as f:
                await f.write(audio_data)

            results.append(
                {
                    "audio_id": audio_id,
                    "audio_url": f"/api/tts/audio/{audio_id}",
                    "text": segment.text,
                    "start_time": segment.start_time,
                    "end_time": segment.end_time,
                }
            )

        return {"segments": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch TTS synthesis failed: {str(e)}")


@router.get("/audio/{audio_id}")
async def get_tts_audio(audio_id: str):
    """获取 TTS 生成的音频"""
    audio_path = settings.voices_dir / f"tts_{audio_id}.wav"

    from fastapi.responses import FileResponse

    if os.path.exists(audio_path):
        return FileResponse(audio_path, media_type="audio/wav")
    else:
        raise HTTPException(status_code=404, detail="Audio not found")


@router.get("/voices")
def list_available_voices():
    """获取可用的声音列表"""
    return {
        "voices": [
            {"id": "xiaoyun", "name": "云溪", "gender": "female"},
            {"id": "xiaoyuan", "name": "晓晓", "gender": "female"},
            {"id": "ruoxi", "name": "若曦", "gender": "female"},
            {"id": "xiaogang", "name": "小刚", "gender": "male"},
            {"id": "yunjian", "name": "云健", "gender": "male"},
        ]
    }
