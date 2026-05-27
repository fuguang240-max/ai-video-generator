"""
LLM 自动生成视频 prompt 模块。

两步 Pipeline：
    Step 1: qwen-vl-max 看图，输出图片的事实性描述
    Step 2: qwen-max 结合用户的一句话意图，把描述改写成专业的视频生成 prompt

依赖：
    pip install openai

环境变量：
    DASHSCOPE_API_KEY  和可灵共用同一个 key
"""

import os
from openai import OpenAI

_client = OpenAI(
    api_key=os.environ.get("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

# 视觉模型：看图描述
VL_MODEL = "qwen-vl-max-latest"
# 文本模型：改写 prompt
TEXT_MODEL = "qwen-max-latest"


def describe_image(image_url: str) -> str:
    """Step 1: 让 VL 模型客观描述图片内容（主体、场景、风格、光影）。"""
    resp = _client.chat.completions.create(
        model=VL_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_url}},
                    {
                        "type": "text",
                        "text": (
                            "请用 100 字以内客观描述这张图：包括主体、场景、"
                            "整体氛围、色调、光影、镜头视角。不要主观评价，只描述事实。"
                        ),
                    },
                ],
            }
        ],
    )
    description = resp.choices[0].message.content.strip()
    print(f"[视觉理解] {description}")
    return description


def craft_video_prompt(image_description: str, user_intent: str) -> str:
    """Step 2: 结合用户意图，生成专业的视频生成 prompt。"""
    system = (
        "你是专业的 AI 视频导演。根据图片内容和用户意图，"
        "生成一段适合可灵视频模型的中文 prompt。要求：\n"
        "1. 包含主体动作（如：缓缓抬头、轻轻摆动）\n"
        "2. 包含镜头运动（如：缓慢推近、左移、环绕）\n"
        "3. 包含氛围细节（如：风吹动头发、阳光透过缝隙）\n"
        "4. 控制在 80 字以内，简洁有画面感\n"
        "5. 只输出 prompt 本身，不要解释、不要前缀"
    )
    user = f"图片内容：{image_description}\n\n用户意图：{user_intent}"

    resp = _client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    prompt = resp.choices[0].message.content.strip()
    print(f"[生成 Prompt] {prompt}")
    return prompt


def generate_prompt(image_url: str, user_intent: str) -> str:
    """端到端：图片 URL + 用户一句话 -> 专业视频 prompt。"""
    description = describe_image(image_url)
    return craft_video_prompt(description, user_intent)


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        print('用法: python prompt_generator.py <图片URL> "<用户意图>"')
        sys.exit(1)

    print(generate_prompt(sys.argv[1], sys.argv[2]))
