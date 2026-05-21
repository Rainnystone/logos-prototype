# 进度日志：开源前隐私风险排查

## 2026-05-21
- 已读取仓库级规则、coding guide、documentation governance、根目录三件套与 codemap。
- 已确认工作区初始状态干净。
- 已启动本次隐私风险排查工作流，并写入完成标准、范围和阶段。
- 已扫描常见凭据格式、私钥块、secret/password 字段、邮箱、本机路径、旧个人 fork 字符串、环境文件、日志与密钥文件。
- 已删除被 Git 跟踪的 `.playwright-cli/`、`.superpowers/brainstorm/` 与 `.claude/flow_state.json` 本地工具状态文件。
- 已删除被 Git 跟踪的 `.reports/codemap-diff.txt` 本地生成报告。
- 已删除未跟踪的本地 `.claude/settings.local.json`、`.playwright-cli/`、`.playwright-mcp/` 与 `.superpowers/` 运行产物，避免直接打包工作区时泄露本机路径。
- 已更新 `.gitignore`，防止本地 agent/browser 工具产物、Claude 本地状态和 reports 目录再次进入版本库。
- 已将 archive 中指向本机仓库的绝对路径批量改为相对路径，并移除一处私有文档原始路径。
- 已纠正仓库远端判断：canonical repo 应为 `Rainnystone/logos-prototype`，不是历史镜像/错误远端。
- 已将本地 `origin` remote 改回 `https://github.com/Rainnystone/logos-prototype.git`。
- 已移除本地额外历史镜像 remote，避免后续 agent 或命令误选目标仓库。
- 已关闭误发到错误远端的 draft PR，并将远端仓库歧义修复合并进本次隐私清理范围。
- 最终复扫通过：当前实际存在的跟踪文件中未再发现本机绝对路径、旧个人 fork 标识、邮箱、真实密钥格式、私钥块或 secret/password 明文。
- `npm test` 通过：91 个测试文件、813 个测试通过。
- `npm run build` 通过：构建成功；输出包含已有 lint warning 与本机父目录多 lockfile root 推断 warning，未阻断构建。
- 遇到的错误：第一次批量替换 Markdown 路径时未使用 NUL 分隔，含空格文件名被 `xargs` 拆开；随后改用 `git ls-files -z | xargs -0` 成功补跑。第一次 URL/secret 辅助扫描的 shell 引号不匹配；随后改用简化正则补跑成功。最终复扫初次直接读取 `git ls-files` 时包含已删除但未提交的文件，`rg` 报缺文件；随后过滤为当前实际存在的文件后复扫成功。
- 剩余人工决策：Git 历史作者信息包含姓名与邮箱，若要完整历史开源，需要决定是否重写历史。
