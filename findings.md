# 发现与决策：开源前隐私风险排查

## 决策
- 本次排查聚焦隐私与开源泄露风险，不做功能重构。
- `story-packages/` 中 sample story 的公开小说世界观、虚构人物、原创虚构角色不计入隐私风险。
- 明确敏感内容优先替换为占位符或相对路径；疑似内容记录为人工确认项。

## 发现
| 类别 | 状态 | 结论 |
| --- | --- | --- |
| 凭据/API | clear | 未发现真实 API key、token、private key、bearer token 或 secret/password 明文。命中项为 `.env.example` 空值、测试占位 key、文档示例和公开 provider URL。 |
| 个人信息 | partial | 跟踪文件中未发现邮箱或旧个人 fork 字符串；Git 提交历史仍包含作者姓名与邮箱，需人类决定是否重写历史。 |
| 绝对路径/本机环境 | fixed | 已移除被跟踪的本地工具状态文件，并将归档文档中的本机绝对路径改成相对路径或移除原始私有路径。 |
| 环境文件/日志/生成物 | fixed | 仅保留 `.env.example`，真实 `.env*`、密钥文件和日志未被跟踪；已忽略 `.claude/flow_state.json`、`.claude/settings.local.json`、`.playwright-cli/`、`.playwright-mcp/`、`.superpowers/`、`.reports/`。 |
| 公开文档/归档材料 | fixed | 已移除会误导到历史/错误远端的仓库 URL，保留 canonical `Rainnystone/logos-prototype`。 |
| 二进制素材 | clear | 被跟踪图片未发现可读本机路径、邮箱或密钥字符串；JPEG 仅见普通软件/profile 元数据。 |

## 待人工确认
- 是否接受现有 Git 历史中的作者姓名与邮箱，或在正式开源前重写历史。
