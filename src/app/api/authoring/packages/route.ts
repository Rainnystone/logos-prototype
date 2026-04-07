import { NextResponse } from 'next/server';

import { createStoryPackageScaffold } from '@/story-packages/scaffold';
import { StoryPackageCreationRequestSchema } from '@/types/storyline-management';

function mapCreatePackageError(error: unknown): { status: number; message: string } {
  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (
      normalizedMessage.includes('reserved') ||
      normalizedMessage.includes('slug') ||
      normalizedMessage.includes('display name is required')
    ) {
      return {
        status: 400,
        message: error.message,
      };
    }

    if (normalizedMessage.includes('already exists')) {
      return {
        status: 409,
        message: error.message,
      };
    }

    if (
      normalizedMessage.includes('validation failed') ||
      normalizedMessage.includes('consistency violation')
    ) {
      return {
        status: 500,
        message: 'Failed to validate story package scaffold.',
      };
    }

    if (
      normalizedMessage.includes('could not create package root') ||
      normalizedMessage.includes('write') ||
      normalizedMessage.includes('rename') ||
      normalizedMessage.includes('access')
    ) {
      return {
        status: 500,
        message: 'Failed to create story package root.',
      };
    }
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
