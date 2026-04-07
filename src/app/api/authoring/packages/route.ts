import { NextResponse } from 'next/server';

import { createStoryPackageScaffold } from '@/story-packages/scaffold';
import {
  StoryPackageScaffoldConflictError,
  StoryPackageScaffoldInputError,
  StoryPackageScaffoldValidationError,
  StoryPackageScaffoldWriteError,
} from '@/story-packages/scaffold-errors';
import { StoryPackageCreationRequestSchema } from '@/types/storyline-management';

function mapCreatePackageError(error: unknown): { status: number; message: string } {
  if (error instanceof StoryPackageScaffoldInputError) {
    return {
      status: 400,
      message: 'Invalid story package display name.',
    };
  }

  if (error instanceof StoryPackageScaffoldConflictError) {
    return {
      status: 409,
      message: 'Story package already exists.',
    };
  }

  if (error instanceof StoryPackageScaffoldValidationError) {
    return {
      status: 500,
      message: 'Failed to validate story package scaffold.',
    };
  }

  if (error instanceof StoryPackageScaffoldWriteError) {
    return {
      status: 500,
      message: 'Failed to create story package root.',
    };
  }

  return {
    status: 500,
    message: 'Failed to create story package.',
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = StoryPackageCreationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid package creation payload.',
      },
      { status: 400 },
    );
  }

  try {
    const created = await createStoryPackageScaffold(parsed.data);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const mapped = mapCreatePackageError(error);

    return NextResponse.json(
      {
        error: mapped.message,
      },
      { status: mapped.status },
    );
  }
}
