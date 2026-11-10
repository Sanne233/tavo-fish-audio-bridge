# Tavo Fish Audio Bridge

把 Tavo 的 OpenAI 兼容 TTS 请求转换成 Fish Audio 的 `/v1/tts` 请求。

## Vercel 环境变量

| 名称 | 必填 | 说明 |
| --- | --- | --- |
| `FISH_AUDIO_API_KEY` | 是 | Fish Audio 开发者 API Key |
| `TAVO_PROXY_TOKEN` | 是 | 自己设置的长随机密码；填入 Tavo 的 API Key 栏 |
| `FISH_REFERENCE_ID` | 建议 | 默认 Fish Audio 音色 ID |
| `FISH_MODEL` | 否 | 默认 `s2.1-pro-free` |

## Tavo 配置

- 类型：自定义 OpenAI 协议 TTS
- Base URL：`https://<你的域名>/v1`
- API Key：与 `TAVO_PROXY_TOKEN` 一致
- 模型：`s2.1-pro-free`
- Voice：Fish Audio `reference_id`；如果 Tavo 不允许填写自定义 Voice，则使用环境变量 `FISH_REFERENCE_ID`

实际语音请求地址为 `POST /v1/audio/speech`。

## 安全说明

- 不要把 Fish Audio Key 写进仓库或 Tavo。
- 不要公开 `TAVO_PROXY_TOKEN`；它相当于这个转换器的密码。
- 转换器只接受允许的 Fish Audio 模型和音频格式。

## 部署

主分支已连接 Vercel；提交更新后会自动触发生产部署。
