import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Clock, Gamepad2, Trophy, TrendingUp, Calendar, Activity, Flame } from 'lucide-react';
import type { LibraryStats } from '@/types';
import { formatPlaytime, toMediaSrc } from '@/lib/utils';

interface WeekData { weekOffset: number; label: string; minutes: number; }
interface MonthlyStats { gamesThisMonth: number; hoursThisMonth: number; sessionsThisMonth: number; }

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
    return (
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-2 hover:border-white/20 transition-colors">
            <div className="flex items-center gap-2 text-text-muted text-xs font-semibold uppercase tracking-wider">
                {icon}{label}
            </div>
            <div className={`text-3xl font-bold ${accent || 'text-text-primary'}`}>{value}</div>
            {sub && <div className="text-xs text-text-muted">{sub}</div>}
        </div>
    );
}

function HorizBar({ label, value, max, rank }: { label: string; value: number; max: number; rank: number }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    const colors = ['from-amber-400 to-amber-500', 'from-gray-300 to-gray-400', 'from-amber-600 to-amber-700'];
    const barColor = rank < 3 ? colors[rank] : 'from-accent to-accent-hover';
    return (
        <div className="flex items-center gap-3 group">
            <span className="w-5 text-xs text-text-muted text-right shrink-0 font-bold">{rank + 1}</span>
            <span className="w-36 text-xs text-text-secondary truncate text-right shrink-0">{label}</span>
            <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-linear-to-r ${barColor} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-14 text-xs text-text-muted text-right shrink-0 font-medium">{formatPlaytime(value)}</span>
        </div>
    );
}

function WeeklyChart({ data }: { data: WeekData[] }) {
    const maxMinutes = Math.max(...data.map(w => w.minutes), 1);
    return (
        <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-5">
                <Activity className="w-5 h-5 text-accent" />
                Hours per Week
            </h2>
            <div className="flex items-end gap-1.5 h-40">
                {data.map((week, i) => {
                    const height = maxMinutes > 0 ? Math.max((week.minutes / maxMinutes) * 100, week.minutes > 0 ? 4 : 0) : 0;
                    const hours = (week.minutes / 60).toFixed(1);
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                            <span className="text-[9px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                                {hours}h
                            </span>
                            <div className="w-full flex items-end" style={{ height: '120px' }}>
                                <div
                                    className={`w-full rounded-t-md transition-all duration-500 ${week.minutes > 0
                                        ? 'bg-linear-to-t from-accent to-accent-hover hover:from-accent-hover hover:to-blue-400'
                                        : 'bg-white/5'
                                        }`}
                                    style={{ height: `${Math.max(height, 2)}%` }}
                                />
                            </div>
                            <span className="text-[9px] text-text-muted truncate w-full text-center">
                                {week.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function StatsPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<LibraryStats | null>(null);
    const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            window.electron.getStats(),
            window.electron.getWeeklyPlaytime(),
            window.electron.getMonthlyStats(),
        ])
            .then(([s, w, m]: [LibraryStats, WeekData[], MonthlyStats]) => {
                setStats(s);
                setWeeklyData(w);
                setMonthlyStats(m);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="animate-fade-in flex flex-col gap-6">
                <div className="skeleton h-10 w-48 rounded-xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const playedPct = stats.totalGames > 0 ? Math.round((stats.playedCount / stats.totalGames) * 100) : 0;
    const maxPlaytime = stats.topByPlaytime[0]?.playtime_minutes ?? 1;

    return (
        <div className="animate-fade-in flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <BarChart2 className="w-7 h-7 text-accent" />
                <h1 className="text-3xl font-bold text-text-primary">Statistics</h1>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard
                    icon={<Gamepad2 className="w-3.5 h-3.5" />}
                    label="Total Games"
                    value={String(stats.totalGames)}
                    sub={`${stats.playedCount} played (${playedPct}%)`}
                />
                <StatCard
                    icon={<Clock className="w-3.5 h-3.5" />}
                    label="Total Playtime"
                    value={formatPlaytime(stats.totalPlaytime)}
                    sub={`across ${stats.playedCount} games`}
                />
                <StatCard
                    icon={<Trophy className="w-3.5 h-3.5" />}
                    label="Most Played"
                    value={stats.mostPlayed ? formatPlaytime(stats.mostPlayed.playtime_minutes) : '—'}
                    sub={stats.mostPlayed?.title ?? 'No games played yet'}
                />
                <StatCard
                    icon={<TrendingUp className="w-3.5 h-3.5" />}
                    label="Completion"
                    value={`${playedPct}%`}
                    sub={`${stats.totalGames - stats.playedCount} unplayed`}
                />
                {monthlyStats && (
                    <>
                        <StatCard
                            icon={<Flame className="w-3.5 h-3.5" />}
                            label="This Month"
                            value={`${monthlyStats.gamesThisMonth}`}
                            sub={`games • ${monthlyStats.sessionsThisMonth} sessions`}
                            accent="text-orange-400"
                        />
                        <StatCard
                            icon={<Calendar className="w-3.5 h-3.5" />}
                            label="Monthly Hours"
                            value={formatPlaytime(monthlyStats.hoursThisMonth)}
                            sub="this month"
                            accent="text-green-400"
                        />
                    </>
                )}
            </div>

            {/* Weekly chart */}
            {weeklyData.length > 0 && <WeeklyChart data={weeklyData} />}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Top 10 by playtime */}
                <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-accent" />
                        Top Games by Playtime
                    </h2>
                    {stats.topByPlaytime.length === 0 ? (
                        <p className="text-text-muted text-sm">Play some games to see stats!</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {stats.topByPlaytime.map((g, i) => (
                                <HorizBar
                                    key={g.id}
                                    label={g.title}
                                    value={g.playtime_minutes}
                                    max={maxPlaytime}
                                    rank={i}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Recently played */}
                <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-accent" />
                        Recently Played
                    </h2>
                    {stats.recentGames.length === 0 ? (
                        <p className="text-text-muted text-sm">No games played yet.</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {stats.recentGames.map(g => {
                                const coverSrc = toMediaSrc(g.cover_url);
                                return (
                                    <button
                                        key={g.id}
                                        onClick={() => navigate(`/game/${g.id}`)}
                                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left group"
                                    >
                                        {coverSrc ? (
                                            <img src={coverSrc} alt={g.title} className="w-9 h-12 object-cover rounded-lg shrink-0" />
                                        ) : (
                                            <div className="w-9 h-12 rounded-lg bg-white/5 shrink-0 flex items-center justify-center">
                                                <Gamepad2 className="w-4 h-4 text-text-muted" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">{g.title}</p>
                                            <p className="text-xs text-text-muted">{g.last_played ? new Date(g.last_played).toLocaleDateString() : ''}</p>
                                        </div>
                                        <span className="text-xs text-text-muted">{formatPlaytime(g.playtime_minutes)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Library Overview Ring */}
            <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Library Overview</h2>
                <div className="flex items-center gap-8">
                    <div className="relative w-28 h-28 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.4" />
                            <circle
                                cx="18" cy="18" r="15.9" fill="none"
                                stroke="url(#arcGrad)"
                                strokeWidth="3.4"
                                strokeLinecap="round"
                                strokeDasharray={`${playedPct} 100`}
                                strokeDashoffset="0"
                            />
                            <defs>
                                <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#60a5fa" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-xl font-bold text-text-primary">{playedPct}%</span>
                            <span className="text-[10px] text-text-muted">Played</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-accent block" />
                            <span className="text-sm text-text-secondary">{stats.playedCount} games played</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-white/10 block" />
                            <span className="text-sm text-text-secondary">{stats.totalGames - stats.playedCount} unplayed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-accent-hover/60 block" />
                            <span className="text-sm text-text-secondary">{stats.totalGames} total games</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Sessions */}
            {stats.recentSessions.length > 0 && (
                <div className="glass-panel rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-accent" />
                        Recent Sessions
                    </h2>
                    <div className="grid gap-2">
                        {stats.recentSessions.map(session => (
                            <div key={session.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/2 hover:bg-white/5 transition-colors">
                                {session.cover_url ? (
                                    <img src={toMediaSrc(session.cover_url) ?? undefined} alt="" className="w-8 h-10 object-cover rounded shrink-0" />
                                ) : (
                                    <div className="w-8 h-10 rounded bg-white/5 shrink-0 flex items-center justify-center">
                                        <Gamepad2 className="w-3.5 h-3.5 text-text-muted" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-text-primary truncate">{session.game_title}</p>
                                    <p className="text-xs text-text-muted">
                                        {new Date(session.started_at).toLocaleString()}
                                    </p>
                                </div>
                                <span className="text-xs font-medium text-accent">
                                    {session.duration_minutes > 0 ? formatPlaytime(session.duration_minutes) : 'In progress'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
