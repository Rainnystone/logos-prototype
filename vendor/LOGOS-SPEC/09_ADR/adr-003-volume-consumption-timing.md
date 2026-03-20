# ADR-003: 选项生成消费当前 Beat 声量而非下一轮声量

## 状态

已决定（存在未解决的原文歧义）

## 背景

母文档 §3.1 第三步写道"选项生成器读取段落梯度中定义的下一轮的节声量"，暗示选项应基于下一个 Beat 的声量来生成，因为选项是前瞻性的——它们设定的是下一轮将要发生的事。但母文档其他部分在描述声量时均使用"当前声量"，且 SPEC 状态模型中只建模了 `currentVolume`。

## 决策

当前 Sample 版本中，选项生成统一消费 `currentVolume`（当前 Beat 的声量），而非下一个 Beat 的声量。

## 理由

1. 在 4 Beat Phase 中，当前 Beat 的声量与下一个 Beat 的声量可以从同一条 `volumeSequence` 中同时读取，因此如果后续需要切换为"下一轮声量"，只需修改索引偏移，不需要改变状态模型结构。
2. 当前 `RoundState` 只维护 `currentVolume`，引入 `nextVolume` 会增加状态复杂度，且在 Phase 最后一个 Beat 时"下一轮声量"的定义不明确（可能跨 Phase）。
3. 母文档自身在此点上信号混合，选择更简单的方案有利于 Sample 阶段快速验证。

## 后果

- 如果测试发现选项与下一轮叙事节奏不匹配，可以在 `Phase Gradient` 模块中增加 `nextVolume` 输出，并在 `Option Generator` 的第三步中消费它。
- 当前 `prompt-object-schema.yaml` 中的 `directorNote.volume` 字段含义不变，仍指当前 Beat 声量。
