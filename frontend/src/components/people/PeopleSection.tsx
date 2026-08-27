import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ScanFace, Users, X } from 'lucide-react';
import { peopleApi, type Person } from '../../lib/api/people';
import { mediaApi } from '../../lib/api/media';
import { ApiError } from '../../lib/apiClient';
import {
  getFaceDetections,
  loadFaceModels,
  type NormalizedBox,
} from '../../lib/faceApi';
import Button from '../ui/Button';


function FaceCropImage({
  src,
  box,
  alt,
}: {
  src: string;
  box: NormalizedBox | null | undefined;
  alt: string;
}) {
  if (
    !box ||
    box.width <= 0 ||
    box.height <= 0 ||
    box.width >= 1 ||
    box.height >= 1
  ) {
    return (
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  }

  const pad = 0.35;
  const paddedWidth = Math.min(1, box.width * (1 + pad * 2));
  const paddedHeight = Math.min(1, box.height * (1 + pad * 2));
  const paddedX = Math.max(0, Math.min(1 - paddedWidth, box.x - (paddedWidth - box.width) / 2));
  const paddedY = Math.max(0, Math.min(1 - paddedHeight, box.y - (paddedHeight - box.height) / 2));

  const backgroundSize = `${100 / paddedWidth}% ${100 / paddedHeight}%`;
  const positionX = paddedWidth >= 1 ? 0 : (paddedX / (1 - paddedWidth)) * 100;
  const positionY = paddedHeight >= 1 ? 0 : (paddedY / (1 - paddedHeight)) * 100;

  return (
    <div
      role="img"
      aria-label={alt}
      className="h-full w-full bg-no-repeat transition-transform duration-300 group-hover:scale-105"
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize,
        backgroundPosition: `${positionX}% ${positionY}%`,
      }}
    />
  );
}

interface PeopleSectionProps {
  roomId: string;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = 'anonymous';

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Could not load image: ${url}`));

    image.src = url;
  });
}

function PeopleSection({ roomId }: PeopleSectionProps) {
  const queryClient = useQueryClient();

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const peopleQuery = useQuery({
    queryKey: ['people', roomId],
    queryFn: () => peopleApi.list(roomId),
  });

  const personMediaQuery = useQuery({
    queryKey: ['person-media', selectedPerson?._id],
    queryFn: () => peopleApi.media(selectedPerson!._id),
    enabled: Boolean(selectedPerson),
  });

  const renameMutation = useMutation({
    mutationFn: (newName: string) =>
      peopleApi.rename(selectedPerson!._id, newName),

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['people', roomId],
      });

      queryClient.invalidateQueries({
        queryKey: ['person-media', selectedPerson?._id],
      });

      setSelectedPerson(data.person);
      setName(data.person.name ?? '');
      setError(null);
    },

    onError: (err) => {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not rename this person.'
      );
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      setScanProgress(0);
      setScanStatus('Loading face detection models…');

      await loadFaceModels();

      const response = await mediaApi.list(roomId);

      const images = response.media.filter(
        (media) => media.mediaType === 'image'
      );

      if (images.length === 0) {
        return {
          scanned: 0,
          faces: 0,
        };
      }

      let totalFaces = 0;

      for (let index = 0; index < images.length; index += 1) {
        const media = images[index];

        setScanStatus(
          `Scanning photo ${index + 1} of ${images.length}…`
        );

        try {
          const image = await loadImage(media.publicUrl);

          const detections = await getFaceDetections(image);
          console.log(
  `[FACE SCAN] ${media.originalName}: ${detections.length} face(s) detected`
);

          if (detections.length > 0) {
            await mediaApi.saveFaces(
              media._id,
              detections.map((detection) => ({
                descriptor: Array.from(detection.descriptor),
                box: detection.box,
              }))
            );

            totalFaces += detections.length;
          }
        } catch (scanError) {
          console.error(
            `Face scan failed for ${media.originalName}:`,
            scanError
          );
        }

        setScanProgress(
          Math.round(((index + 1) / images.length) * 100)
        );
      }

      return {
        scanned: images.length,
        faces: totalFaces,
      };
    },

    onSuccess: (result) => {
      setScanStatus(
        `Finished scanning ${result.scanned} photos. Detected ${result.faces} faces.`
      );

      queryClient.invalidateQueries({
        queryKey: ['people', roomId],
      });

      setTimeout(() => {
        setScanStatus(null);
        setScanProgress(0);
      }, 5000);
    },

    onError: (err) => {
      setScanStatus(null);
      setScanProgress(0);

      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not scan the existing photos.'
      );
    },
  });

  const people = (peopleQuery.data?.people ?? []).filter(
  (person) => person.memoryCount > 0
);

  const openPerson = (person: Person) => {
    setSelectedPerson(person);
    setName(person.name ?? '');
    setError(null);
  };

  const closePerson = () => {
    setSelectedPerson(null);
    setName('');
    setError(null);
  };

  const handleRename = () => {
    const trimmedName = name.trim();

    if (!trimmedName || !selectedPerson) {
      return;
    }

    renameMutation.mutate(trimmedName);
  };

  const handleScan = () => {
    if (scanMutation.isPending) {
      return;
    }

    scanMutation.mutate();
  };

  if (peopleQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-8 text-center text-ink-600">
        <Loader2 className="mx-auto mb-2 animate-spin" size={22} />
        Loading people…
      </div>
    );
  }

  if (peopleQuery.isError) {
    return (
      <div className="rounded-2xl border border-ink-900/10 bg-white/50 px-6 py-8 text-center text-coral-700">
        Couldn't load people for this room.
      </div>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-ink-900/10 bg-white/50 p-5">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-coral-600" />

            <div>
              <h2 className="font-display text-lg font-bold text-ink-900">
                People
              </h2>

              <p className="text-sm text-ink-500">
                People detected across your memories
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={
              scanMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ScanFace size={16} />
              )
            }
            onClick={handleScan}
            disabled={scanMutation.isPending}
          >
            {scanMutation.isPending
              ? `Scanning ${scanProgress}%`
              : 'Scan existing photos'}
          </Button>
        </div>

        {scanMutation.isPending && (
          <div className="mb-5 rounded-xl bg-coral-500/10 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm text-coral-700">
                {scanStatus}
              </p>

              <span className="text-xs font-semibold text-coral-700">
                {scanProgress}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-coral-500/10">
              <div
                className="h-full rounded-full bg-coral-500 transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {!scanMutation.isPending && scanStatus && (
          <p className="mb-5 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            {scanStatus}
          </p>
        )}

        {error && (
          <p
            className="mb-5 rounded-xl bg-coral-500/10 px-4 py-3 text-sm text-coral-700"
            role="alert"
          >
            {error}
          </p>
        )}

        {people.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-900/10 px-5 py-8 text-center">
            <Users size={28} className="mx-auto mb-3 text-ink-400" />

            <p className="text-sm font-medium text-ink-700">
              No people detected yet.
            </p>

            <p className="mt-1 text-xs text-ink-500">
              Click "Scan existing photos" to scan all memories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {people.map((person) => (
              <button
                key={person._id}
                type="button"
                onClick={() => openPerson(person)}
                className="group overflow-hidden rounded-2xl border border-ink-900/10 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-glass"
              >
                <div className="aspect-square overflow-hidden bg-ink-900/5">
                  {person.representativeMedia?.publicUrl ? (
                    <FaceCropImage
                      src={person.representativeMedia.publicUrl}
                      box={person.representativeFaceBox}
                      alt={person.name || 'Detected person'}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Users size={32} className="text-ink-300" />
                    </div>
                  )}
                </div>

                <div className="px-3 py-3">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {person.name || 'Unknown person'}
                  </p>

                  <p className="mt-0.5 text-xs text-ink-500">
                    {person.memoryCount}{' '}
                    {person.memoryCount === 1 ? 'memory' : 'memories'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedPerson && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-ink-900">
                  {selectedPerson.name || 'Unknown person'}
                </h2>

                <p className="mt-1 text-sm text-ink-500">
                  Photos containing this person
                </p>
              </div>

              <button
                type="button"
                onClick={closePerson}
                className="rounded-lg p-2 text-ink-500 hover:bg-ink-900/5 hover:text-ink-900"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 flex flex-col gap-2 sm:flex-row">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Give this person a name"
                className="flex-1 rounded-xl border border-ink-900/10 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20"
              />

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={
                  !name.trim() || renameMutation.isPending
                }
                onClick={handleRename}
              >
                {renameMutation.isPending ? 'Saving…' : 'Save name'}
              </Button>
            </div>

            {error && (
              <p
                className="mb-4 rounded-xl bg-coral-500/10 px-4 py-2.5 text-sm text-coral-700"
                role="alert"
              >
                {error}
              </p>
            )}

            {personMediaQuery.isLoading ? (
              <div className="py-10 text-center text-ink-500">
                <Loader2
                  size={22}
                  className="mx-auto mb-2 animate-spin"
                />
                Loading photos…
              </div>
            ) : personMediaQuery.isError ? (
              <p className="py-10 text-center text-coral-700">
                Couldn't load this person's photos.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {(personMediaQuery.data?.media ?? []).map((media) => (
                  <a
                    key={media._id}
                    href={media.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="aspect-square overflow-hidden rounded-xl bg-ink-900/5"
                  >
                    {media.mediaType === 'image' ? (
                      <img
                        src={media.publicUrl}
                        alt={media.originalName}
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                      />
                    ) : (
                      <video
                        src={media.publicUrl}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default PeopleSection;