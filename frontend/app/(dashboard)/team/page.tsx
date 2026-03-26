'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, type AuthUser } from '@/lib/auth';
import { getAuthApiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface TeamResponse {
  users: TeamMember[];
  teamInviteToken: string;
  inviteUrl: string;
}

export default function TeamPage(): JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [teamData, setTeamData] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace('/login');
      return;
    }
    if (stored.role !== 'BUYER') {
      router.replace('/dashboard');
      return;
    }
    setUser(stored);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    
    getAuthApiClient()
      .get<TeamResponse>('/workspaces/my/team')
      .then((res) => {
        setTeamData(res.data);
      })
      .catch(() => {
        setError('Не вдалося завантажити дані команди');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const copyInviteLink = () => {
    if (!teamData?.inviteUrl) return;
    navigator.clipboard.writeText(teamData.inviteUrl)
      .then(() => toast.success('Посилання скопійовано!'))
      .catch(() => toast.error('Не вдалося скопіювати посилання'));
  };

  if (!user) return <div />;

  return (
    <main className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Команда</h1>
        <p className="mt-1 text-muted-foreground">
          Керуйте учасниками вашого робочого простору.
        </p>

        {loading && (
          <div className="mt-6 flex justify-center py-12">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && teamData && (
          <div className="mt-6 space-y-6">
            {/* Invite Section */}
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Запросити колегу</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Надішліть це посилання своїм колегам, щоб вони могли приєднатися до вашого робочого простору.
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={teamData.inviteUrl}
                  className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Копіювати
                </button>
              </div>
            </div>

            {/* Team Members List */}
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <h2 className="border-b border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground">
                Учасники команди ({teamData.users.length})
              </h2>
              <ul className="divide-y divide-border">
                {teamData.users.map((member) => (
                  <li key={member.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {member.name} {member.id === user.id && <span className="ml-1 text-xs text-muted-foreground">(Ви)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {member.role === 'BUYER' ? 'Закупник' : member.role}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
