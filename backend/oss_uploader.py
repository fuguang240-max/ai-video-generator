"""
阿里云 OSS 上传模块。上传本地图片，返回公网可访问的 URL。

依赖：
    pip install oss2

环境变量：
    OSS_ACCESS_KEY_ID      RAM 用户的 AccessKey ID
    OSS_ACCESS_KEY_SECRET  RAM 用户的 AccessKey Secret
    OSS_BUCKET             Bucket 名（如 kling-mvp-xxx）
    OSS_ENDPOINT           Endpoint，北京地域是 oss-cn-beijing.aliyuncs.com

Bucket 必须配置为「公共读」，否则可灵 API 无法访问图片。
"""

import os
import uuid
from pathlib import Path

import oss2


def _get_bucket() -> oss2.Bucket:
    """从环境变量初始化 OSS Bucket 客户端。"""
    access_key_id = os.environ["OSS_ACCESS_KEY_ID"]
    access_key_secret = os.environ["OSS_ACCESS_KEY_SECRET"]
    bucket_name = os.environ["OSS_BUCKET"]
    endpoint = os.environ.get("OSS_ENDPOINT", "oss-cn-beijing.aliyuncs.com")

    auth = oss2.Auth(access_key_id, access_key_secret)
    return oss2.Bucket(auth, f"https://{endpoint}", bucket_name)


def upload_image(local_path: str) -> str:
    """
    上传本地图片到 OSS，返回公网 URL。

    Args:
        local_path: 本地图片路径，如 "./test.jpg"

    Returns:
        公网可访问的 URL，如 "https://your-bucket.oss-cn-beijing.aliyuncs.com/uploads/xxx.jpg"
    """
    path = Path(local_path)
    if not path.exists():
        raise FileNotFoundError(f"文件不存在: {local_path}")

    # 用 uuid 作为对象名前缀，避免重名覆盖
    object_name = f"uploads/{uuid.uuid4().hex}{path.suffix}"

    bucket = _get_bucket()
    bucket.put_object_from_file(object_name, local_path)

    # 拼接公网 URL（Bucket 必须是公共读）
    bucket_name = os.environ["OSS_BUCKET"]
    endpoint = os.environ.get("OSS_ENDPOINT", "oss-cn-beijing.aliyuncs.com")
    url = f"https://{bucket_name}.{endpoint}/{object_name}"
    print(f"[OSS 上传] {local_path} -> {url}")
    return url


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        print("用法: python oss_uploader.py <本地图片路径>")
        sys.exit(1)

    print(upload_image(sys.argv[1]))
