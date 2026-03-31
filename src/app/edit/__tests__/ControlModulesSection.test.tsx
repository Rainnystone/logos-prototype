import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { storyPackageFixture } from '@/app/__tests__/fixtures';
import { ControlModulesSection } from '@/app/edit/sections/ControlModulesSection';
import { createControlModulesDraft } from '@/authoring/sections/control-modules';

describe('ControlModulesSection', () => {
  it('renders the localized module stack, editor, router profile, and audit controls', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onReset = vi.fn();
    const onChange = vi.fn();
    const draft = createControlModulesDraft(storyPackageFixture);
    const localizedDraft = {
      ...draft,
      routerProfiles: [
        {
          routerName: '',
          routerSemanticCore: '',
          verbLexicon: [],
        },
      ],
      auditQuestionSet: {
        ...draft.auditQuestionSet,
        globalQuestions: [
          {
            ...draft.auditQuestionSet.globalQuestions[0]!,
            id: '',
            question: '',
          },
        ],
        controlQuestions: [],
      },
    };

    render(
      <ControlModulesSection
        packageName="sample-scene"
        phaseIds={storyPackageFixture.phasePlans.map((phase) => phase.phaseId)}
        value={localizedDraft}
        onChange={onChange}
        onSubmit={onSubmit}
        onReset={onReset}
      />,
    );

    expect(screen.getByRole('heading', { name: '控制模块' })).toBeInTheDocument();
    expect(screen.getByText('控制栈')).toBeInTheDocument();
    expect(screen.getByText('模块层')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '控制栈' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '模块编辑' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '光锥收束' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导演提示补充' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Beat Volume 定义' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Router 配置组' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '审计问题组' })).toBeInTheDocument();
    expect(screen.getByText('第 3 层')).toBeInTheDocument();
    expect(screen.getAllByText('第 4 层')).toHaveLength(3);
    expect(screen.getByText('并行层')).toBeInTheDocument();
    expect(screen.getAllByText('替换型')).toHaveLength(2);
    expect(screen.getByRole('textbox', { name: '边界说明' })).toBeInTheDocument();
    expect(screen.getByText('边界说明')).toBeInTheDocument();
    expect(screen.getByText('收束说明')).toBeInTheDocument();
    expect(screen.getByText('Phase 收束说明')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存本页' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重置本页' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '导演提示补充' }));
    expect(screen.getByRole('textbox', { name: 'Beat 限制补充' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '选项限制补充' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Beat Volume 定义' }));

    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Med')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getAllByText('Volume 定义')).toHaveLength(3);
    expect(screen.getAllByText('Beat 限制')).toHaveLength(3);
    expect(screen.getAllByText('选项格式')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Router 配置组' }));

    expect(screen.getByRole('button', { name: '新增 Router' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Router 名 1' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '语义核心 1' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '动词词库 1' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '审计问题组' }));

    expect(screen.getByRole('button', { name: '全局问题' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '控制问题' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增问题' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '审计问题列表' })).toBeInTheDocument();
    expect(screen.getAllByText(/未命名问题/)).toHaveLength(4);
    expect(screen.getByText('问题')).toBeInTheDocument();
    expect(screen.getByText('理由')).toBeInTheDocument();
    expect(screen.getByText('期望为真')).toBeInTheDocument();
    expect(screen.getByText('阻断')).toBeInTheDocument();
    expect(screen.getByText('选择策略')).toBeInTheDocument();
    expect(screen.getByText('默认项与 Phase 覆盖')).toBeInTheDocument();
    expect(screen.getByText('默认问题')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '控制问题' }));
    expect(screen.getByText('当前分组还没有问题。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新增问题' }));
    expect(onChange).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '保存本页' }));
    await user.click(screen.getByRole('button', { name: '重置本页' }));

    expect(onSubmit).toHaveBeenCalledWith('auditor-question-set');
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('lets the operator clear every default audit selection', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onReset = vi.fn();
    const onChange = vi.fn();
    const draft = createControlModulesDraft(storyPackageFixture);
    const defaultQuestionIds = [
      ...draft.auditQuestionSet.globalQuestions,
      ...draft.auditQuestionSet.controlQuestions,
      ...Object.values(draft.auditQuestionSet.phaseSpecificQuestions ?? {}).flat(),
    ].map((question) => question.id);
    const localizedDraft = {
      ...draft,
      auditQuestionSet: {
        ...draft.auditQuestionSet,
        selectionPolicy: {
          ...draft.auditQuestionSet.selectionPolicy,
          default: defaultQuestionIds,
        },
      },
    };

    function Harness() {
      const [value, setValue] = useState(localizedDraft);

      return (
        <ControlModulesSection
          packageName="sample-scene"
          phaseIds={storyPackageFixture.phasePlans.map((phase) => phase.phaseId)}
          value={value}
          onChange={(nextValue) => {
            setValue(nextValue);
            onChange(nextValue);
          }}
          onSubmit={onSubmit}
          onReset={onReset}
        />
      );
    }

    render(<Harness />);

    await user.click(screen.getByRole('button', { name: '审计问题组' }));

    const defaultSelectionSection = screen.getByText('默认问题').closest('div');
    expect(defaultSelectionSection).not.toBeNull();

    const defaultSelectionCheckboxes = within(defaultSelectionSection as HTMLElement).getAllByRole(
      'checkbox',
    );

    expect(defaultSelectionCheckboxes).toHaveLength(defaultQuestionIds.length);

    for (const checkbox of defaultSelectionCheckboxes) {
      await user.click(checkbox);
    }

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        auditQuestionSet: expect.objectContaining({
          selectionPolicy: expect.objectContaining({
            default: [],
          }),
        }),
      }),
    );

    await user.click(screen.getByRole('button', { name: '保存本页' }));
    expect(onSubmit).toHaveBeenCalledWith('auditor-question-set');
  });

  it('shows the localized saving label while a save is in progress', () => {
    const draft = createControlModulesDraft(storyPackageFixture);

    render(
      <ControlModulesSection
        packageName="sample-scene"
        phaseIds={storyPackageFixture.phasePlans.map((phase) => phase.phaseId)}
        value={draft}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onReset={vi.fn()}
        isSaving
      />,
    );

    expect(screen.getByRole('button', { name: '保存中...' })).toBeDisabled();
  });
});
