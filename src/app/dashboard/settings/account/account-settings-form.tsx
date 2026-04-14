"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount, updateProfile } from "@/lib/auth-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";

interface AccountSettingsFormProps {
  profile: {
    displayName: string;
    email: string;
    role: string;
    teamRoles: string[];
  };
}

export function AccountSettingsForm({ profile }: AccountSettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [teamRoles, setTeamRoles] = useState<string[]>(profile.teamRoles ?? []);
  const [accountLoading, setAccountLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const maxRoles = 4;
  const maxRolesReached = teamRoles.length >= maxRoles;

  const ROLE_OPTIONS = [
    { value: "driver", label: "Driver" },
    { value: "coach", label: "Coach" },
    { value: "programmer", label: "Programmer" },
    { value: "scout", label: "Scout" },
    { value: "data", label: "Data / Analytics" },
    { value: "mechanical", label: "Mechanical" },
    { value: "electrical", label: "Electrical" },
    { value: "cad", label: "CAD / Design" },
    { value: "pit", label: "Pit Crew" },
    { value: "mentor", label: "Mentor" },
    { value: "other", label: "Other" },
  ];

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAccountLoading(true);

    const formData = new FormData();
    formData.set("displayName", displayName);
    teamRoles.forEach((role) => formData.append("teamRoles", role));

    const result = await updateProfile(formData);
    if (result?.error) {
      toast(result.error, "error");
    } else {
      toast("Profile updated.", "success");
      router.refresh();
    }
    setAccountLoading(false);
  }

  function handleDeleteConfirm() {
    startDelete(async () => {
      const result = await deleteAccount();
      if (result?.error) {
        toast(result.error, "error");
        return;
      }
      router.replace("/login");
      router.refresh();
    });
  }

  const normalizeRoles = (roles: string[]) =>
    roles.map((role) => role.trim()).filter(Boolean).sort().join("|");

  const hasChanges =
    displayName.trim() !== profile.displayName.trim() ||
    normalizeRoles(teamRoles) !== normalizeRoles(profile.teamRoles ?? []);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-widest text-gray-400">Display Name</p>
          <p className="mt-1 text-lg font-semibold text-white">{profile.displayName}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-widest text-gray-400">Account Role</p>
          <p className="mt-1 text-lg font-semibold capitalize text-white">{profile.role}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-widest text-gray-400">Team Roles</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {teamRoles.length}/{maxRoles}
          </p>
        </div>
      </div>

      <div className="rounded-2xl dashboard-panel dashboard-card p-6">
        <h3 className="text-lg font-semibold text-white">Profile Settings</h3>
        <p className="mt-1 text-sm text-gray-300">
          Manage your display name and role preferences.
        </p>

        <form onSubmit={handleAccountSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-300">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={accountLoading}
                className="mt-1 block w-full px-3 py-2 text-sm text-white shadow-sm dashboard-input disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <div className="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                {profile.email}
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-300">Team Roles</p>
            <p className="mt-1 text-xs text-gray-400">
              Pick up to {maxRoles} roles. {teamRoles.length}/{maxRoles} selected.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ROLE_OPTIONS.map((roleOption) => {
                const checked = teamRoles.includes(roleOption.value);
                const disabled = !checked && maxRolesReached;
                return (
                  <label
                    key={roleOption.value}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                      disabled
                        ? "border-white/10 bg-white/5 text-gray-500"
                        : checked
                          ? "border-teal-500/45 bg-teal-500/10 text-teal-100 shadow-[0_0_18px_-14px_rgba(45,212,191,0.9)]"
                          : "border-white/10 bg-white/[0.02] text-gray-200 hover:border-cyan-300/35 hover:bg-cyan-300/10"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="teamRoles"
                      value={roleOption.value}
                      checked={checked}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...teamRoles, roleOption.value]
                          : teamRoles.filter((role) => role !== roleOption.value);
                        setTeamRoles(next);
                      }}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-500"
                    />
                    {roleOption.label}
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={accountLoading || !hasChanges}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-400 disabled:opacity-50"
          >
            {accountLoading ? "Saving..." : "Save profile"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl dashboard-panel dashboard-card p-6">
        <h3 className="text-lg font-semibold text-white">Security</h3>
        <p className="mt-1 text-sm text-gray-300">
          Authentication for this account runs through email magic links.
        </p>
        <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300">
          If you lose access to your email, ask a team captain to help update team access.
        </p>
      </div>

      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
        <h3 className="text-lg font-semibold text-red-200">Danger Zone</h3>
        <p className="mt-1 text-sm text-red-700 dark:text-red-100/95">
          Deleting your account is permanent. You will lose access to your
          profile. Team data stays with your organization.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={isDeleting}
            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-400 hover:bg-red-500/10 disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete account"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete your account?"
        description="This permanently deletes your account and cannot be undone."
        confirmLabel={isDeleting ? "Deleting..." : "Delete account"}
        cancelLabel="Cancel"
        tone="danger"
        confirmDisabled={isDeleting}
        onConfirm={() => {
          setDeleteOpen(false);
          handleDeleteConfirm();
        }}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
