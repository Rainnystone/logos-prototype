import { describe, expect, it } from 'vitest';

import {
  renderWorldBase,
  type WorldBaseCastDraft,
} from '@/authoring/sections/worldbase-cast';
import type { WorldBase } from '@/types';

const currentWorldBase: WorldBase = {
  mainCharacters: '现有主文本',
  npcCharacters: '现有配角',
  locationPatch: '现有地点',
};

describe('renderWorldBase', () => {
  it('normalizes the world-base blocks and keeps supporting cast lightweight', () => {
    const draft: WorldBaseCastDraft = {
      mainCharacters: '  世界基础\n\n主角雾间凪  ',
      npcCharacters: ' 竹田启司：稳重的男友\n- 末真和子：敏锐的线索人\n新刻敬：正义感强 ',
      locationPatch: '  2年C班教室  ',
    };

    const output = renderWorldBase(currentWorldBase, draft);

    expect(output.mainCharacters).toBe('世界基础\n\n主角雾间凪');
    expect(output.npcCharacters).toBe(
      '竹田启司：稳重的男友\n末真和子：敏锐的线索人\n新刻敬：正义感强',
    );
    expect(output.locationPatch).toBe('2年C班教室');
  });

  it('keeps ambiguous supporting cast text as a grouped fallback block', () => {
    const output = renderWorldBase(currentWorldBase, {
      mainCharacters: '主文本',
      npcCharacters: '今天的走廊里有几位没有明确姓名的学生',
      locationPatch: '地点',
    });

    expect(output.npcCharacters).toBe('今天的走廊里有几位没有明确姓名的学生');
  });
});
