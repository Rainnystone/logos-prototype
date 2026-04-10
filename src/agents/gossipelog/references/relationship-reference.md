# Gossipelog Relationship Reference

You are producing relationship memory updates for LOGOS gossipelog.

## Semantic Scope

- Gossipelog records **主观定向关系**: `A -> B` means A's view of B, not a symmetric pair.
- `A -> B` and `B -> A` are different edges and can diverge.
- 允许单向建边: one direction can be created even when the reverse direction has no edge.
- Hero rule: `hero` can appear as target, but **hero 不能作为持久化 source**.

## Memory Model (`schemaVersion: 2`)

Each directed edge stores:

- `sourceRoleId`
- `targetRoleId`
- `currentRelation`
- `history` (full trajectory, non-empty)

`currentRelation` / `history[]` entry fields:

- `phaseId` (`string | null`)
- `beatIndex` (`number | null`)
- `roundId` (`string`)
- `functionalRole` (`string | null`) - functionalRole 可为空
- `mindsetTags` (`string[]`) - mindsetTags 可为空数组
- `summary` (`string`)
- `triggerEvent` (`string`)
- `reasoning` (`string`)
- `causalAction` (`string`)

## Functional Role and Mindset Guidance

Functional role examples (not exhaustive): `主要对手`, `次要对手`, `利益盟友`, `情感锚点`, `亲密对手`, `可利用工具`, `影子映射`, `受保护者`, `监控目标`, `不可解之谜`.

Mindset tag examples (not exhaustive): `钦佩`, `信任`, `迷恋`, `感激`, `依赖`, `憎恨`, `提防`, `鄙夷`, `嫉妒`, `畏惧`, `厌恶`, `愧疚`, `疏离`, `矛盾`.

Both lists are guidance only; labels are **允许扩展** and are not a closed whitelist.

## From Beat to memoryUpdates

Input beat excerpt:

> 侍卫长在酒馆里盯着神秘吟游诗人，手一直按在剑柄上；当对方唱到旧战场时，侍卫长神情短暂松动，但仍未放下戒备。

Expected extraction intent:

- `Guard -> Bard` can be updated even if `Bard -> Guard` is absent.
- `functionalRole` could be `监控目标`.
- `mindsetTags` could be `["提防", "好奇"]`.

Expected payload example:

```json
{
  "involvedRoleIds": ["chr_guard01", "chr_bard01"],
  "invocationNoOp": false,
  "memoryUpdates": [
    {
      "sourceRoleId": "chr_guard01",
      "targetRoleId": "chr_bard01",
      "shouldCreateEdge": true,
      "nextCurrentRelation": {
        "phaseId": "phase-01-prologue",
        "beatIndex": 2,
        "roundId": "round-0002",
        "functionalRole": "监控目标",
        "mindsetTags": ["提防", "好奇"],
        "summary": "把吟游诗人视为潜在威胁，同时被其信息价值吸引。",
        "triggerEvent": "对方在酒馆高调出现并触发旧战场记忆",
        "reasoning": "出现时机可疑，但言行又可能带来关键线索",
        "causalAction": "继续监视并以试探性对话获取情报"
      }
    }
  ]
}
```

## Output Discipline

- JSON only.
- Top-level keys must be exactly: `involvedRoleIds`, `invocationNoOp`, `memoryUpdates`.
- If `invocationNoOp` is `true`, `memoryUpdates` must be an empty array.
- If `invocationNoOp` is `false`, `memoryUpdates` must contain at least one update.
- Do not emit legacy `edgeUpdates` fields.
