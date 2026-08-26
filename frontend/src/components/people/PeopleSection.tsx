import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Users, X } from 'lucide-react';
import { peopleApi, type Person } from '../../lib/api/people';
import { ApiError } from '../../lib/apiClient';
import Button from '../ui/Button';

interface PeopleSectionProps {
  roomId: string;
}

function PeopleSection({ roomId }: PeopleSectionProps) {
  const queryClient = useQueryClient();

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const people = peopleQuery.data?.people ?? [];

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
        <div className="mb-5 flex items-center gap-2">
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

        {people.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-900/10 px-5 py-8 text-center">
            <Users size={28} className="mx-auto mb-3 text-ink-400" />

            <p className="text-sm font-medium text-ink-700">
              No people detected yet.
            </p>

            <p className="mt-1 text-xs text-ink-500">
              Upload photos containing people and they'll appear here.
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
                    <img
                      src={person.representativeMedia.publicUrl}
                      alt={person.name || 'Detected person'}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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