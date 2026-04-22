import { useState } from "react";
import { Redirect } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { AdminLayout } from "@/components/AdminLayout";
import { Plus, Trash2, X } from "lucide-react";

interface Branch {
  id: number;
  name: string;
  nameAr: string | null;
  address: string | null;
  phone: string | null;
}
interface Staff {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "reception" | "guest";
  blocked: boolean;
  branchId: number | null;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${r.status})`);
  }
  return r.json() as Promise<T>;
}

export default function AdminBranches() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.role !== "admin") return <Redirect to="/admin" />;
  return <AdminBranchesInner />;
}

function AdminBranchesInner() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const branchesQ = useQuery({
    queryKey: ["branches"],
    queryFn: () => api<Branch[]>("/api/admin/branches"),
  });
  const staffQ = useQuery({
    queryKey: ["staff"],
    queryFn: () => api<Staff[]>("/api/admin/users/staff"),
  });
  const [showBranch, setShowBranch] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [createdPwd, setCreatedPwd] = useState<{ email: string; pwd: string } | null>(null);

  const createBranch = useMutation({
    mutationFn: (data: Partial<Branch>) =>
      api<Branch>("/api/admin/branches", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches"] }),
  });
  const delBranch = useMutation({
    mutationFn: (id: number) => api(`/api/admin/branches/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
  const createStaff = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: string; branchId: number | null; phone?: string }) =>
      api<{ user: Staff; generatedPassword?: string }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      if (res.generatedPassword) setCreatedPwd({ email: vars.email, pwd: res.generatedPassword });
    },
  });
  const updateStaff = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<Staff>) =>
      api(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-6">
        <h1 className="font-display text-3xl text-charcoal">{t("admin.branches")}</h1>
        <button onClick={() => setShowBranch(true)} className="btn-gold !py-2 !px-4 !text-xs">
          <Plus className="w-4 h-4" /> {t("admin.addBranch")}
        </button>
      </div>

      <div className="bg-white border border-cream-deep overflow-x-auto mb-10">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-cream-deep/50 text-xs uppercase tracking-widest text-charcoal/70">
            <tr>
              <th className="text-start p-3">{t("admin.branchName")}</th>
              <th className="text-start p-3">{t("admin.address")}</th>
              <th className="text-start p-3">{t("auth.phone")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(branchesQ.data ?? []).map((b) => (
              <tr key={b.id} className="border-t border-cream-deep">
                <td className="p-3 font-medium">
                  {b.name}
                  {b.nameAr && <div className="text-xs text-charcoal/60">{b.nameAr}</div>}
                </td>
                <td className="p-3 text-charcoal/70">{b.address ?? "—"}</td>
                <td className="p-3 text-charcoal/70">{b.phone ?? "—"}</td>
                <td className="p-3 text-end">
                  <button
                    onClick={() => {
                      if (confirm(t("common.confirmDelete"))) delBranch.mutate(b.id);
                    }}
                    className="text-charcoal/60 hover:text-destructive"
                    aria-label="delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {(branchesQ.data ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-charcoal/50 italic">
                  {t("admin.noBranches")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-end justify-between mb-6">
        <h2 className="font-display text-2xl text-charcoal">{t("admin.staff")}</h2>
        <button onClick={() => setShowStaff(true)} className="btn-outline-gold !py-2 !px-4 !text-xs">
          <Plus className="w-4 h-4" /> {t("admin.addStaff")}
        </button>
      </div>

      <div className="bg-white border border-cream-deep overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-cream-deep/50 text-xs uppercase tracking-widest text-charcoal/70">
            <tr>
              <th className="text-start p-3">{t("auth.fullName")}</th>
              <th className="text-start p-3">{t("auth.email")}</th>
              <th className="text-start p-3">{t("admin.role")}</th>
              <th className="text-start p-3">{t("admin.assignedBranch")}</th>
            </tr>
          </thead>
          <tbody>
            {(staffQ.data ?? []).map((s) => (
              <tr key={s.id} className="border-t border-cream-deep">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3 text-charcoal/70">{s.email}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 ${s.role === "admin" ? "bg-gold/20 text-bronze" : "bg-cream-deep text-charcoal/70"}`}>
                    {s.role === "admin" ? t("admin.roleAdmin") : t("admin.roleReception")}
                  </span>
                </td>
                <td className="p-3">
                  <select
                    value={s.branchId ?? ""}
                    onChange={(e) =>
                      updateStaff.mutate({ id: s.id, branchId: e.target.value ? Number(e.target.value) : null })
                    }
                    className="field !py-1 !px-2 !text-xs"
                  >
                    <option value="">—</option>
                    {(branchesQ.data ?? []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {(staffQ.data ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-charcoal/50 italic">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showBranch && (
        <BranchDialog
          onClose={() => setShowBranch(false)}
          onSubmit={async (data) => {
            await createBranch.mutateAsync(data);
            setShowBranch(false);
          }}
        />
      )}
      {showStaff && (
        <StaffDialog
          branches={branchesQ.data ?? []}
          onClose={() => setShowStaff(false)}
          onSubmit={async (data) => {
            await createStaff.mutateAsync(data);
            setShowStaff(false);
          }}
        />
      )}
      {createdPwd && (
        <div
          className="fixed inset-0 z-[80] bg-charcoal/70 flex items-center justify-center p-5"
          onClick={() => setCreatedPwd(null)}
        >
          <div className="bg-white p-8 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl text-charcoal mb-3">{t("admin.tempPassword")}</h3>
            <div className="text-sm text-charcoal/70 mb-2">{createdPwd.email}</div>
            <div className="bg-cream-deep p-3 font-mono text-lg text-bronze mb-4">{createdPwd.pwd}</div>
            <button onClick={() => setCreatedPwd(null)} className="btn-gold w-full !py-2">
              {t("common.ok")}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function BranchDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (d: { name: string; nameAr?: string; address?: string; phone?: string }) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", nameAr: "", address: "", phone: "" });
  return (
    <div className="fixed inset-0 z-[80] bg-charcoal/70 flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl text-charcoal">{t("admin.addBranch")}</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            onSubmit({
              name: form.name.trim(),
              nameAr: form.nameAr.trim() || undefined,
              address: form.address.trim() || undefined,
              phone: form.phone.trim() || undefined,
            });
          }}
        >
          <div>
            <label className="label">{t("admin.branchName")} (EN)</label>
            <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">{t("admin.branchName")} (AR)</label>
            <input className="field" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("admin.address")}</label>
            <input className="field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("auth.phone")}</label>
            <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <button type="submit" className="btn-gold w-full !py-2">
            {t("common.save")}
          </button>
        </form>
      </div>
    </div>
  );
}

function StaffDialog({
  branches,
  onClose,
  onSubmit,
}: {
  branches: Branch[];
  onClose: () => void;
  onSubmit: (d: { name: string; email: string; password: string; role: string; branchId: number | null; phone?: string }) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "reception",
    branchId: "" as string,
    phone: "",
  });
  return (
    <div className="fixed inset-0 z-[80] bg-charcoal/70 flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl text-charcoal">{t("admin.addStaff")}</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
              role: form.role,
              branchId: form.branchId ? Number(form.branchId) : null,
              phone: form.phone.trim() || undefined,
            });
          }}
        >
          <div>
            <label className="label">{t("auth.fullName")}</label>
            <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">{t("auth.email")}</label>
            <input type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">{t("auth.phone")}</label>
            <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("auth.password")}</label>
            <input
              type="text"
              className="field"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">{t("admin.role")}</label>
            <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="reception">{t("admin.roleReception")}</option>
              <option value="admin">{t("admin.roleAdmin")}</option>
            </select>
          </div>
          <div>
            <label className="label">{t("admin.assignedBranch")}</label>
            <select className="field" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-gold w-full !py-2">
            {t("common.save")}
          </button>
        </form>
      </div>
    </div>
  );
}
