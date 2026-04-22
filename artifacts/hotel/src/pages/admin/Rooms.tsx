import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRooms,
  getListRoomsQueryKey,
  listRooms,
} from "@workspace/api-client-react";

type ListRoomsResponseItem = Awaited<ReturnType<typeof listRooms>>[number];
import { useI18n } from "@/lib/i18n";
import { AdminLayout } from "@/components/AdminLayout";
import { formatSAR } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  Star,
  ImageIcon,
  Tag,
  BedDouble,
} from "lucide-react";

type Room = ListRoomsResponseItem & {
  discountPrice?: number | null;
  discountLabel?: string | null;
  discountLabelAr?: string | null;
};

type FormState = {
  name: string;
  nameAr: string;
  type: string;
  description: string;
  descriptionAr: string;
  price: string;
  capacity: string;
  sizeSqm: string;
  bedType: string;
  amenities: string[];
  images: string[];
  status: string;
  discountPrice: string;
  discountLabel: string;
  discountLabelAr: string;
};

const EMPTY: FormState = {
  name: "",
  nameAr: "",
  type: "standard",
  description: "",
  descriptionAr: "",
  price: "",
  capacity: "2",
  sizeSqm: "28",
  bedType: "King",
  amenities: ["wifi", "ac", "tv"],
  images: [],
  status: "available",
  discountPrice: "",
  discountLabel: "",
  discountLabelAr: "",
};

const ROOM_TYPES = ["standard", "deluxe", "suite"];
const ROOM_STATUSES = ["available", "occupied", "maintenance"];
const KNOWN_AMENITIES = [
  "wifi", "ac", "tv", "minibar", "safe", "room-service",
  "parking", "pool", "gym", "breakfast", "spa", "balcony",
  "kitchenette", "workspace", "laundry",
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(txt) as { error?: string };
      if (j.error) msg = j.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export default function AdminRooms() {
  const { t, language } = useI18n();
  const { data: rooms } = useListRooms();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Room | "new" | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: getListRoomsQueryKey() });

  async function onDelete(r: Room) {
    if (!window.confirm(t("admin.deleteConfirm"))) return;
    try {
      await api(`/api/admin/rooms/${r.id}`, { method: "DELETE" });
      toast({ title: t("admin.deleted") });
      refresh();
    } catch (e) {
      toast({ title: t("common.error"), description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="font-display text-3xl text-charcoal">{t("admin.rooms")}</h1>
        <button
          onClick={() => setEditing("new")}
          className="btn-gold !py-2 !px-4 !text-xs flex items-center gap-2"
          data-testid="btn-add-room"
        >
          <Plus className="w-4 h-4" /> {t("admin.addRoom")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(rooms as Room[] | undefined)?.map((r) => {
          const cover = r.images[0] ?? "";
          const onOffer = r.discountPrice != null && r.discountPrice < r.price;
          return (
            <div key={r.id} className="bg-white border border-cream-deep overflow-hidden flex flex-col">
              <div className="relative h-40 bg-charcoal">
                {cover ? (
                  <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-charcoal/40">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
                <span className="absolute top-2 ltr:left-2 rtl:right-2 badge bg-charcoal/80 text-gold border-gold">
                  {t(`type.${r.type}`)}
                </span>
                {onOffer && (
                  <span className="absolute top-2 ltr:right-2 rtl:left-2 badge bg-gold text-charcoal border-gold font-bold">
                    {(language === "ar" ? r.discountLabelAr : r.discountLabel) || t("rooms.offer")}
                  </span>
                )}
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="text-xs text-charcoal/60">#{r.id}</div>
                <div className="font-display text-lg text-charcoal leading-tight">
                  {language === "ar" ? r.nameAr : r.name}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gold font-bold">
                    {onOffer ? (
                      <>
                        <span className="text-xs text-charcoal/50 line-through me-1">{formatSAR(r.price)}</span>
                        {formatSAR(r.discountPrice ?? 0)}
                      </>
                    ) : (
                      formatSAR(r.price)
                    )}{" "}
                    <span className="text-xs text-charcoal/60 font-normal">{t("common.sar")}</span>
                  </div>
                  <span className={`badge ${r.status === "available" ? "badge-confirmed" : r.status === "maintenance" ? "badge-pending" : "badge-cancelled"}`}>
                    {t(`status.${r.status}`)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-charcoal/60">
                  <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{r.bedType}</span>
                  <span>•</span>
                  <span>{r.capacity} {t("rooms.guests")}</span>
                  <span>•</span>
                  <span>{r.sizeSqm} m²</span>
                </div>
                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-cream-deep">
                  <button
                    onClick={() => setEditing(r)}
                    className="btn-outline-gold !py-1.5 !px-3 !text-xs flex-1 flex items-center justify-center gap-1"
                    data-testid={`btn-edit-room-${r.id}`}
                  >
                    <Pencil className="w-3 h-3" /> {t("admin.editRoom")}
                  </button>
                  <button
                    onClick={() => onDelete(r)}
                    className="!py-1.5 !px-3 !text-xs border border-destructive/40 text-destructive hover:bg-destructive/10 flex items-center justify-center gap-1"
                    data-testid={`btn-delete-room-${r.id}`}
                    title={t("admin.deleteRoom")}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <RoomEditor
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </AdminLayout>
  );
}

function toForm(r: Room | null): FormState {
  if (!r) return { ...EMPTY };
  return {
    name: r.name,
    nameAr: r.nameAr,
    type: r.type,
    description: r.description,
    descriptionAr: r.descriptionAr,
    price: String(r.price),
    capacity: String(r.capacity),
    sizeSqm: String(r.sizeSqm),
    bedType: r.bedType,
    amenities: r.amenities ?? [],
    images: r.images ?? [],
    status: r.status,
    discountPrice: r.discountPrice == null ? "" : String(r.discountPrice),
    discountLabel: r.discountLabel ?? "",
    discountLabelAr: r.discountLabelAr ?? "",
  };
}

function RoomEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Room | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, language } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newAmenity, setNewAmenity] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files).slice(0, 10);
    if (arr.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of arr) fd.append("files", f);
      const res = await fetch("/api/admin/upload", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);
      const json = (await res.json()) as { urls: string[] };
      setForm((f) => ({ ...f, images: [...f.images, ...json.urls] }));
    } catch (e) {
      toast({ title: t("common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSave() {
    if (!form.name || !form.nameAr || !form.description || !form.descriptionAr || !form.price) {
      toast({ title: t("common.required"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name,
        nameAr: form.nameAr,
        type: form.type,
        description: form.description,
        descriptionAr: form.descriptionAr,
        price: Number(form.price),
        capacity: Number(form.capacity),
        sizeSqm: Number(form.sizeSqm),
        bedType: form.bedType,
        amenities: form.amenities,
        images: form.images,
        status: form.status,
        discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        discountLabel: form.discountLabel || null,
        discountLabelAr: form.discountLabelAr || null,
      };
      if (initial) {
        await api(`/api/admin/rooms/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        toast({ title: t("admin.updated") });
      } else {
        await api(`/api/admin/rooms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        toast({ title: t("admin.created") });
      }
      onSaved();
    } catch (e) {
      toast({ title: t("common.error"), description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function reorderImage(from: number, to: number) {
    if (from === to) return;
    setForm((f) => {
      const next = [...f.images];
      const [moved] = next.splice(from, 1);
      if (moved !== undefined) next.splice(to, 0, moved);
      return { ...f, images: next };
    });
  }

  const onOffer = useMemo(() => {
    const dp = Number(form.discountPrice);
    const p = Number(form.price);
    return form.discountPrice && Number.isFinite(dp) && Number.isFinite(p) && dp < p;
  }, [form.discountPrice, form.price]);

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto" data-testid="room-editor">
      <div className="bg-white w-full max-w-4xl shadow-2xl border border-cream-deep">
        <div className="flex items-center justify-between p-5 border-b border-cream-deep sticky top-0 bg-white z-10">
          <h2 className="font-display text-2xl text-charcoal">
            {initial ? t("admin.editRoom") : t("admin.newRoom")}
          </h2>
          <button onClick={onClose} className="text-charcoal/60 hover:text-charcoal" aria-label="close" data-testid="btn-close-editor">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
          {/* Basics */}
          <Section title={t("admin.basics")}>
            <Field label={t("admin.fldNameAr")}>
              <input className="field" value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} dir="rtl" data-testid="fld-nameAr" />
            </Field>
            <Field label={t("admin.fldName")}>
              <input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} dir="ltr" data-testid="fld-name" />
            </Field>
            <Field label={t("admin.fldDescAr")}>
              <textarea className="field min-h-20" value={form.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} dir="rtl" />
            </Field>
            <Field label={t("admin.fldDesc")}>
              <textarea className="field min-h-20" value={form.description} onChange={(e) => set("description", e.target.value)} dir="ltr" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("admin.fldType")}>
                <select className="field" value={form.type} onChange={(e) => set("type", e.target.value)}>
                  {ROOM_TYPES.map((tp) => <option key={tp} value={tp}>{t(`type.${tp}`)}</option>)}
                </select>
              </Field>
              <Field label={t("admin.fldStatus")}>
                <select className="field" value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {ROOM_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                </select>
              </Field>
              <Field label={t("admin.fldBedType")}>
                <input className="field" value={form.bedType} onChange={(e) => set("bedType", e.target.value)} />
              </Field>
              <Field label={t("admin.fldCapacity")}>
                <input type="number" lang="en-US" dir="ltr" min={1} max={12} className="field" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
              </Field>
              <Field label={t("admin.fldSize")}>
                <input type="number" lang="en-US" dir="ltr" min={5} max={500} className="field" value={form.sizeSqm} onChange={(e) => set("sizeSqm", e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Pricing & Offer */}
          <Section title={t("admin.pricing")}>
            <Field label={`${t("admin.fldPrice")} (${t("common.sar")})`}>
              <input type="number" lang="en-US" dir="ltr" min={0} step="0.01" className="field" value={form.price} onChange={(e) => set("price", e.target.value)} data-testid="fld-price" />
            </Field>
            <div className="border-s-4 border-gold/60 ps-4 py-2 bg-cream/40 rounded">
              <div className="text-xs uppercase tracking-widest text-bronze flex items-center gap-2 mb-3">
                <Tag className="w-3.5 h-3.5" /> {t("rooms.offer")}
              </div>
              <Field label={`${t("admin.fldDiscountPrice")} (${t("common.sar")})`}>
                <input type="number" lang="en-US" dir="ltr" min={0} step="0.01" placeholder={t("admin.discountHint")} className="field" value={form.discountPrice} onChange={(e) => set("discountPrice", e.target.value)} data-testid="fld-discount-price" />
              </Field>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Field label={t("admin.fldDiscountLabelAr")}>
                  <input className="field" value={form.discountLabelAr} onChange={(e) => set("discountLabelAr", e.target.value)} placeholder="عرض الموسم" dir="rtl" />
                </Field>
                <Field label={t("admin.fldDiscountLabel")}>
                  <input className="field" value={form.discountLabel} onChange={(e) => set("discountLabel", e.target.value)} placeholder="Season Offer" dir="ltr" />
                </Field>
              </div>
              {onOffer && (
                <div className="mt-2 text-xs text-bronze">
                  {t("rooms.was")}: <span className="line-through">{formatSAR(Number(form.price))}</span> →{" "}
                  <span className="font-bold text-gold">{formatSAR(Number(form.discountPrice))} {t("common.sar")}</span>
                </div>
              )}
            </div>
          </Section>

          {/* Media */}
          <Section title={t("admin.media")} className="lg:col-span-2">
            <div
              className="border-2 border-dashed border-cream-deep p-4 rounded text-center"
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) void uploadFiles(e.target.files); }}
                data-testid="fld-image-upload"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-outline-gold !py-2 !px-4 !text-xs inline-flex items-center gap-2"
                data-testid="btn-upload-images"
              >
                <Upload className="w-4 h-4" />
                {uploading ? t("admin.uploading") : t("admin.uploadImages")}
              </button>
              <div className="text-xs text-charcoal/60 mt-2">{t("admin.dragHint")}</div>
            </div>
            {form.images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-3">
                {form.images.map((url, i) => (
                  <div
                    key={url + i}
                    className="relative group aspect-square bg-charcoal/5 border border-cream-deep cursor-grab"
                    draggable
                    onDragStart={() => { dragIndex.current = i; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragIndex.current != null) reorderImage(dragIndex.current, i); dragIndex.current = null; }}
                  >
                    <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-1 ltr:left-1 rtl:right-1 badge bg-gold text-charcoal border-gold !text-[10px] !px-1.5 !py-0.5">
                        <Star className="w-3 h-3 inline" /> {t("admin.cover")}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-charcoal/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      {i !== 0 && (
                        <button
                          type="button"
                          onClick={() => reorderImage(i, 0)}
                          className="p-1 bg-gold text-charcoal rounded"
                          title={t("admin.makeCover")}
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                        className="p-1 bg-destructive text-white rounded"
                        title={t("admin.removeImage")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Amenities */}
          <Section title={t("admin.amenitiesSection")} className="lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              {form.amenities.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 px-3 py-1 bg-cream-deep/60 text-charcoal text-xs rounded">
                  {a}
                  <button
                    type="button"
                    onClick={() => set("amenities", form.amenities.filter((x) => x !== a))}
                    className="text-charcoal/50 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {KNOWN_AMENITIES.filter((a) => !form.amenities.includes(a)).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => set("amenities", [...form.amenities, a])}
                  className="px-2 py-1 text-xs border border-cream-deep text-charcoal/70 hover:border-gold hover:text-gold"
                >
                  + {a}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <input
                className="field flex-1"
                placeholder={t("admin.amenityAdd")}
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newAmenity.trim()) {
                    e.preventDefault();
                    if (!form.amenities.includes(newAmenity.trim())) {
                      set("amenities", [...form.amenities, newAmenity.trim()]);
                    }
                    setNewAmenity("");
                  }
                }}
                dir={language === "ar" ? "rtl" : "ltr"}
              />
            </div>
          </Section>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-cream-deep bg-cream/40">
          <button onClick={onClose} className="btn-outline-gold !py-2 !px-4 !text-xs">{t("admin.cancel")}</button>
          <button onClick={onSave} disabled={saving} className="btn-gold !py-2 !px-5 !text-xs" data-testid="btn-save-room">
            {saving ? t("admin.saving") : t("admin.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="font-display text-lg text-charcoal border-b border-cream-deep pb-1">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
