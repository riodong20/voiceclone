"""
存储服务抽象层
支持多种存储后端：本地文件系统、华为云OBS、阿里云OSS、腾讯云COS等
"""
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from app.core.config import settings


class StorageService(ABC):
    """存储服务抽象基类"""

    @abstractmethod
    async def save_file(self, file_content: bytes, file_name: str, folder: Optional[str] = None) -> str:
        """
        保存文件
        :param file_content: 文件内容字节
        :param file_name: 文件名
        :param folder: 存储文件夹（可选）
        :return: 文件访问路径或URL
        """
        pass

    @abstractmethod
    async def get_file(self, file_path: str) -> bytes:
        """
        读取文件内容
        :param file_path: 文件路径或URL
        :return: 文件内容字节
        """
        pass

    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        """
        删除文件
        :param file_path: 文件路径或URL
        :return: 是否删除成功
        """
        pass

    @abstractmethod
    def get_file_url(self, file_path: str) -> str:
        """
        获取文件的访问URL
        :param file_path: 文件内部路径
        :return: 可直接访问的URL
        """
        pass


class LocalStorageService(StorageService):
    """本地文件系统存储实现"""

    def __init__(self):
        self.base_dir = settings.voices_dir
        os.makedirs(self.base_dir, exist_ok=True)

    async def save_file(self, file_content: bytes, file_name: str, folder: Optional[str] = None) -> str:
        if folder:
            save_dir = self.base_dir / folder
            os.makedirs(save_dir, exist_ok=True)
            file_path = save_dir / file_name
        else:
            file_path = self.base_dir / file_name

        import aiofiles
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_content)

        return str(file_path)

    async def get_file(self, file_path: str) -> bytes:
        import aiofiles
        async with aiofiles.open(file_path, "rb") as f:
            return await f.read()

    async def delete_file(self, file_path: str) -> bool:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception:
            return False

    def get_file_url(self, file_path: str) -> str:
        """本地文件通过API接口访问"""
        file_name = Path(file_path).name
        file_id = Path(file_name).stem
        return f"/api/clone/audio/{file_id}"


class OBSStorageService(StorageService):
    """
    华为云OBS存储实现（预留接口）
    配置完成后可直接启用
    """

    def __init__(self):
        # OBS配置从settings中读取
        self.obs_endpoint = settings.OBS_ENDPOINT
        self.obs_bucket = settings.OBS_BUCKET
        self.obs_access_key = settings.OBS_ACCESS_KEY
        self.obs_secret_key = settings.OBS_SECRET_KEY
        self.obs_domain = settings.OBS_DOMAIN  # 自定义域名（可选）

        # 初始化OBS客户端（需要安装obs-sdk）
        # from obs import ObsClient
        # self.client = ObsClient(
        #     access_key_id=self.obs_access_key,
        #     secret_access_key=self.obs_secret_key,
        #     server=self.obs_endpoint
        # )

    async def save_file(self, file_content: bytes, file_name: str, folder: Optional[str] = None) -> str:
        """
        上传文件到OBS
        实现参考：
        object_key = f"{folder}/{file_name}" if folder else file_name
        self.client.putObject(self.obs_bucket, object_key, file_content)
        return object_key
        """
        raise NotImplementedError("OBS存储服务尚未实现，请配置OBS参数后启用")

    async def get_file(self, file_path: str) -> bytes:
        """从OBS下载文件"""
        raise NotImplementedError("OBS存储服务尚未实现")

    async def delete_file(self, file_path: str) -> bool:
        """从OBS删除文件"""
        raise NotImplementedError("OBS存储服务尚未实现")

    def get_file_url(self, file_path: str) -> str:
        """获取OBS文件的访问URL"""
        if self.obs_domain:
            return f"{self.obs_domain}/{file_path}"
        return f"https://{self.obs_bucket}.{self.obs_endpoint}/{file_path}"


# 存储服务单例
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """获取存储服务实例"""
    global _storage_service
    if _storage_service is None:
        if settings.STORAGE_TYPE == "obs":
            _storage_service = OBSStorageService()
        else:
            # 默认使用本地存储
            _storage_service = LocalStorageService()
    return _storage_service
