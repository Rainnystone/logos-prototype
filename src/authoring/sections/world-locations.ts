import { generateLocationId } from '@/lib/location-id';
import type { Location, WorldBase } from '@/types';

const DESCRIPTION_ONLY_FIELDS = [
  'name',
  'environmentAppearance',
  'atmosphereDescription',
  'humanContextDescription',
] as const;

export interface WorldLocationDraft {
  readonly draftId: string;
  readonly locationId: string;
  readonly name: string;
  readonly description: string;
  readonly environmentAppearance: string;
  readonly atmosphereDescription: string;
  readonly humanContextDescription: string;
}

interface LocationProjectionContent {
  readonly name: string;
  readonly description: string;
  readonly environmentAppearance: string;
  readonly atmosphereDescription: string;
  readonly humanContextDescription: string;
}

function normalizeBlock(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

function normalizeInline(value: string): string {
  return normalizeBlock(value).replace(/\n+/g, ' ');
}

function createLocationDraftId(index: number): string {
  return `location-${index}`;
}

export function normalizeWorldLocationDraft(
  location: WorldLocationDraft,
  index: number,
): WorldLocationDraft {
  const normalizedLocationId = normalizeInline(location.locationId);
  const normalizedDraftId =
    normalizeInline(location.draftId) || normalizedLocationId || createLocationDraftId(index);

  return {
    ...location,
    draftId: normalizedDraftId,
    locationId: normalizedLocationId,
    name: normalizeInline(location.name),
    description: normalizeBlock(location.description),
    environmentAppearance: normalizeBlock(location.environmentAppearance),
    atmosphereDescription: normalizeBlock(location.atmosphereDescription),
    humanContextDescription: normalizeBlock(location.humanContextDescription),
  };
}

function createImportedLocationDraft(description: string): WorldLocationDraft {
  return {
    draftId: createLocationDraftId(1),
    locationId: '',
    name: '',
    description,
    environmentAppearance: '',
    atmosphereDescription: '',
    humanContextDescription: '',
  };
}

function hasDescriptionOnlyShape(location: LocationProjectionContent): boolean {
  if (normalizeBlock(location.description).length === 0) {
    return false;
  }

  return DESCRIPTION_ONLY_FIELDS.every(
    (field) => normalizeBlock(location[field]).length === 0,
  );
}

export function hydrateWorldLocationDrafts(
  worldBase: Pick<WorldBase, 'locations' | 'locationPatch'>,
): WorldLocationDraft[] {
  const structuredLocations = Array.isArray(worldBase.locations) ? worldBase.locations : [];
  if (structuredLocations.length > 0) {
    return structuredLocations.map((location, index) =>
      normalizeWorldLocationDraft(
        {
          draftId: location.locationId,
          locationId: location.locationId,
          name: location.name,
          description: location.description,
          environmentAppearance: location.environmentAppearance,
          atmosphereDescription: location.atmosphereDescription,
          humanContextDescription: location.humanContextDescription,
        },
        index + 1,
      ),
    );
  }

  const normalizedLegacyLocationPatch = normalizeBlock(worldBase.locationPatch);
  if (!normalizedLegacyLocationPatch) {
    return [];
  }

  return [normalizeWorldLocationDraft(createImportedLocationDraft(normalizedLegacyLocationPatch), 1)];
}

export function normalizeWorldLocationDrafts(
  locations: readonly WorldLocationDraft[],
): WorldLocationDraft[] {
  return locations.map((location, index) => normalizeWorldLocationDraft(location, index + 1));
}

export function areWorldLocationDraftCollectionsEqual(
  left: readonly WorldLocationDraft[],
  right: readonly WorldLocationDraft[],
): boolean {
  const normalizedLeft = normalizeWorldLocationDrafts(left);
  const normalizedRight = normalizeWorldLocationDrafts(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((location, index) => {
    const target = normalizedRight[index];

    if (!target) {
      return false;
    }

    return (
      location.locationId === target.locationId &&
      location.name === target.name &&
      location.description === target.description &&
      location.environmentAppearance === target.environmentAppearance &&
      location.atmosphereDescription === target.atmosphereDescription &&
      location.humanContextDescription === target.humanContextDescription
    );
  });
}

export function alignDescriptionOnlyLocationWithPatch(
  locations: readonly WorldLocationDraft[],
  locationPatch: string,
): WorldLocationDraft[] {
  const normalizedLocations = normalizeWorldLocationDrafts(locations);
  const normalizedPatch = normalizeBlock(locationPatch);

  if (normalizedLocations.length !== 1) {
    return normalizedLocations;
  }

  const [location] = normalizedLocations;
  if (!location || !hasDescriptionOnlyShape(location)) {
    return normalizedLocations;
  }

  return [{ ...location, description: normalizedPatch }];
}

export function toPersistedLocations(
  locations: readonly WorldLocationDraft[],
): Location[] {
  return normalizeWorldLocationDrafts(locations).map((location) => ({
    locationId: location.locationId || generateLocationId(),
    name: location.name,
    description: location.description,
    environmentAppearance: location.environmentAppearance,
    atmosphereDescription: location.atmosphereDescription,
    humanContextDescription: location.humanContextDescription,
  }));
}

function renderInlineField(label: string, value: string): string {
  const normalizedValue = normalizeInline(value);

  return normalizedValue.length > 0 ? `${label}: ${normalizedValue}` : `${label}:`;
}

function renderBlockField(label: string, value: string): string {
  const normalizedValue = normalizeBlock(value);

  return normalizedValue.length > 0 ? `${label}:\n${normalizedValue}` : `${label}:`;
}

function renderDeterministicLocationProjection(
  location: LocationProjectionContent,
  index: number,
): string {
  return [
    `### Location ${index + 1}`,
    renderInlineField('Name', location.name),
    renderBlockField('Description', location.description),
    renderBlockField('Environment Appearance', location.environmentAppearance),
    renderBlockField('Atmosphere Description', location.atmosphereDescription),
    renderBlockField('Human Context Description', location.humanContextDescription),
  ].join('\n');
}

export function projectLocationPatchFromLocations(
  locations: readonly Pick<
    Location,
    | 'name'
    | 'description'
    | 'environmentAppearance'
    | 'atmosphereDescription'
    | 'humanContextDescription'
  >[],
  fallbackLocationPatch: string,
): string {
  const normalizedFallback = normalizeBlock(fallbackLocationPatch);
  if (locations.length === 0) {
    return normalizedFallback;
  }

  const normalizedLocations = locations.map((location) => ({
    name: normalizeInline(location.name),
    description: normalizeBlock(location.description),
    environmentAppearance: normalizeBlock(location.environmentAppearance),
    atmosphereDescription: normalizeBlock(location.atmosphereDescription),
    humanContextDescription: normalizeBlock(location.humanContextDescription),
  }));

  if (normalizedLocations.length === 1) {
    const [location] = normalizedLocations;
    if (location && hasDescriptionOnlyShape(location)) {
      return normalizeBlock(location.description);
    }
  }

  return normalizedLocations
    .map((location, index) => renderDeterministicLocationProjection(location, index))
    .join('\n\n');
}
