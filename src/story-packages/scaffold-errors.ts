export abstract class StoryPackageScaffoldError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class StoryPackageScaffoldInputError extends StoryPackageScaffoldError {}

export class StoryPackageScaffoldConflictError extends StoryPackageScaffoldError {}

export class StoryPackageScaffoldValidationError extends StoryPackageScaffoldError {}

export class StoryPackageScaffoldWriteError extends StoryPackageScaffoldError {}
