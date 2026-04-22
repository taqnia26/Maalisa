import { useState } from "react";
import { useAdminGuests } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { AdminLayout } from "@/components/AdminLayout";
import { formatSAR } from "@/lib/utils";
import { Plus, X } from "lucide-react";

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

export default function AdminGuests() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: guests } = useAdminGuests();
  const [show, setShow] = useState(false);
  const [created, setCreated] = useState<{ email: string; pwd?: string } | null>(null);

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-6">
        <h1 className="font-display text-3xl text-charcoal">{t("admin.guests")}</h1>
        <button onClick={() => setShow(true)} className="btn-gold !py-2 !px-4 !text-xs">
          <Plus className="w-4 h-4" /> {t("admin.addCustomer")}
        </button>
      </div>
      <div className="bg-white border border-cream-deep overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-cream-deep/50 text-xs uppercase tracking-widest text-charcoal/70">
            <tr>
              <th className="text-start p-3">{t("auth.fullName")}</th>
              <th className="text-start p-3">{t("auth.email")}</th>
              <th className="text-start p-3">{t("auth.phone")}</th>
              <th className="text-start p-3">{t("admin.bookingsCount")}</th>
              <th className="text-start p-3">{t("admin.totalSpent")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(guests ?? []).map((g) => (
              <tr key={g.id} className="border-t border-cream-deep">
                <td className="p-3 font-medium">{g.name}</td>
                <td className="p-3 text-charcoal/70">{g.email}</td>
                <td className="p-3 text-charcoal/70">{g.phone ?? "—"}</td>
                <td className="p-3">{g.bookingsCount}</td>
                <td className="p-3 text-gold font-bold">
                  {formatSAR(g.totalSpent)} {t("common.sar")}
                </td>
                <td className="p-3 text-end">
                  <button className="text-xs text-charcoal/60 hover:text-destructive uppercase tracking-widest">
                    {g.blocked ? t("admin.unblock") : t("admin.block")}
                  </button>
                </td>
              </tr>
            ))}
            {(!guests || guests.length === 0) && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-charcoal/50 italic">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {show && (
        <CustomerDialog
          onClose={() => setShow(false)}
          onCreated={(email, pwd) => {
            setShow(false);
            setCreated({ email, pwd });
            qc.invalidateQueries({ queryKey: ["adminGuests"] });
          }}
        />
      )}
      {created && (
        <div className="fixed inset-0 z-[80] bg-charcoal/70 flex items-center justify-center p-5" onClick={() => setCreated(null)}>
          <div className="bg-white p-8 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl text-charcoal mb-3">{t("admin.customerCreated")}</h3>
            <div className="text-sm text-charcoal/70 mb-2">{created.email}</div>
            {created.pwd && (
              <>
                <div className="text-xs text-charcoal/60 uppercase tracking-widest mb-1">{t("admin.tempPassword")}</div>
                <div className="bg-cream-deep p-3 font-mono text-lg text-bronze mb-4">{created.pwd}</div>
              </>
            )}
            <button onClick={() => setCreated(null)} className="btn-gold w-full !py-2">
              {t("common.ok")}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function CustomerDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (email: string, pwd?: string) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: () =>
      api<{ user: { email: string }; generatedPassword?: string }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ ...form, role: "guest", password: form.password || undefined }),
      }),
    onSuccess: (res) => onCreated(res.user.email, res.generatedPassword),
    onError: (e: Error) => setErr(e.message),
  });
  return (
    <div className="fixed inset-0 z-[80] bg-charcoal/70 flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl text-charcoal">{t("admin.addCustomer")}</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            create.mutate();
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
            <label className="label">
              {t("auth.password")} <span className="text-charcoal/40 normal-case">({t("admin.passwordOptional")})</span>
            </label>
            <input
              type="text"
              className="field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
            />
          </div>
          {err && <div className="text-xs text-destructive">{err}</div>}
          <button type="submit" disabled={create.isPending} className="btn-gold w-full !py-2">
            {create.isPending ? t("common.loading") : t("common.save")}
          </button>
        </form>
      </div>
    </div>
  );
}
