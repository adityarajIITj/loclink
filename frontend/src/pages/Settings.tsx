import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Account</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400 text-sm">Email</span>
            <span className="text-white text-sm">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400 text-sm">Account Created</span>
            <span className="text-white text-sm">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400 text-sm">Status</span>
            <span className="text-emerald-400 text-sm font-medium">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
