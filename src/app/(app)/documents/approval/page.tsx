"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, Check, CheckCircle2, ChevronRight, FileText, Folder, Image as ImageIcon, Loader2, RefreshCw, Search, Store, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { fetchShopImages } from "@/lib/api/document-image-service";
import { fetchShopsSummary } from "@/lib/dashboard/shop-repository";
import { cn } from "@/lib/utils";
import type { DocumentImage } from "@/types/document-image";
import { extractShopName, type DocDetails } from "@/types/shop";

type KeyedImage = { image: DocumentImage; key: string };
type FolderGroup = [string, KeyedImage[]];

function group(entries: KeyedImage[], name: (entry: KeyedImage) => string): FolderGroup[] {
  const result = new Map<string, KeyedImage[]>();
  for (const entry of entries) {
    const key = name(entry);
    result.set(key, [...(result.get(key) ?? []), entry]);
  }
  return [...result.entries()].sort(([a], [b]) => a.localeCompare(b, "th"));
}

export default function DocumentApprovalPage() {
  const [shopId, setShopId] = useState("");
  const [search, setSearch] = useState("");
  const shopsQuery = useQuery({
    queryKey: ["documents", "approval", "shops"],
    queryFn: () => fetchShopsSummary(),
  });
  const shops = useMemo(() => (shopsQuery.data ?? []).filter((shop) => shop.shopid), [shopsQuery.data]);
  const visibleShops = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("th");
    return term ? shops.filter((shop) => `${shop.shopid} ${extractShopName(shop, shop.shopid!)}`.toLocaleLowerCase("th").includes(term)) : shops;
  }, [search, shops]);
  const selectedShop = shops.find((shop) => shop.shopid === shopId);

  return <div className="space-y-6">
    <PageHeader title="ตรวจสอบเอกสาร" description="เลือกสาขาเพื่อตรวจสอบและอนุมัติไฟล์เอกสารที่อัปโหลด" />
    {shopsQuery.isLoading ? <Loading label="กำลังโหลดรายการสาขา..." /> : shopsQuery.isError ? <LoadError onRetry={() => shopsQuery.refetch()} /> : selectedShop ? <ApprovalWorkspace shop={selectedShop} onClose={() => setShopId("")} /> : (
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4 sm:p-5"><label className="relative block max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรือรหัสสาขา" className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label></div>
        {visibleShops.length === 0 ? <EmptyState icon={Store} title="ไม่พบสาขา" /> : <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">{visibleShops.map((shop) => <ShopButton key={shop.shopid} shop={shop} onClick={() => setShopId(shop.shopid!)} />)}</div>}
      </section>
    )}
  </div>;
}

function ShopButton({ shop, onClick }: { shop: DocDetails; onClick: () => void }) {
  const id = shop.shopid!;
  return <button type="button" onClick={onClick} className="group flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Store className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{extractShopName(shop, id) || id}</span><span className="block truncate text-xs text-muted-foreground">{id}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" /></button>;
}

function ApprovalWorkspace({ shop, onClose }: { shop: DocDetails; onClose: () => void }) {
  const shopId = shop.shopid!;
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<DocumentImage | null>(null);
  const query = useQuery({ queryKey: ["documents", "approval", shopId], queryFn: () => fetchShopImages(shopId) });
  const images = useMemo<KeyedImage[]>(() => (query.data ?? []).map((image, index) => ({ image, key: image.imageId || image.imageUrl || String(index) })), [query.data]);
  const categories = useMemo(() => group(images, ({ image }) => image.category?.trim() || "ไม่ระบุหมวดหมู่"), [images]);
  const subcategories = useMemo(() => group(categories.find(([name]) => name === category)?.[1] ?? [], ({ image }) => image.subcategory?.trim() || "ไม่ระบุหมวดหมู่ย่อย"), [categories, category]);
  const leafImages = subcategories.find(([name]) => name === subcategory)?.[1] ?? [];
  const allApproved = images.length > 0 && approved.size === images.length;
  const goBack = () => subcategory ? setSubcategory(null) : category ? setCategory(null) : onClose();

  return <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    <header className="flex flex-wrap items-center gap-3 border-b border-border bg-status-safe-soft/40 p-4 sm:px-5">
      <button type="button" onClick={goBack} aria-label="ย้อนกลับ" className="rounded-lg p-2 text-muted-foreground hover:bg-background hover:text-foreground"><ArrowLeft className="h-4 w-4" /></button>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-safe text-white"><Folder className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1 text-sm font-semibold"><span>ไฟล์ที่อัปโหลด</span>{category && <Crumb text={category} />}{subcategory && <Crumb text={subcategory} />}</div><p className="truncate text-xs text-muted-foreground">{extractShopName(shop, shopId) || shopId} · {approved.size}/{images.length} ไฟล์</p></div>
      <button type="button" disabled={!images.length || allApproved} onClick={() => setApproved(new Set(images.map(({ key }) => key)))} className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white disabled:cursor-default", allApproved ? "bg-status-safe" : "bg-primary hover:bg-primary/90 disabled:opacity-50")}>{allApproved ? <CheckCircle2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}{allApproved ? "ตรวจสอบแล้ว" : "อนุมัติทั้งหมด"}</button>
    </header>
    <div className="min-h-[460px] p-4 sm:p-6">{query.isLoading ? <Loading label="กำลังโหลดไฟล์เอกสาร..." /> : query.isError ? <LoadError onRetry={() => query.refetch()} /> : images.length === 0 ? <EmptyState icon={Folder} title="ไม่พบไฟล์ที่อัปโหลด" /> : !category ? <Folders title="หมวดหมู่ทั้งหมด" items={categories} onSelect={setCategory} /> : !subcategory ? <Folders title={`หมวดหมู่ย่อยใน “${category}”`} items={subcategories} onSelect={setSubcategory} /> : <ImageGrid items={leafImages} approved={approved} onApprove={(key) => setApproved((value) => new Set(value).add(key))} onPreview={setPreview} />}</div>
    {preview && <Preview image={preview} onClose={() => setPreview(null)} />}
  </section>;
}

function Crumb({ text }: { text: string }) { return <><ChevronRight className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">{text}</span></>; }

function Folders({ title, items, onSelect }: { title: string; items: FolderGroup[]; onSelect: (name: string) => void }) {
  return <div><h2 className="mb-4 text-sm font-semibold">{title}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map(([name, files]) => <button key={name} type="button" onClick={() => onSelect(name)} className="group flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-left hover:border-primary/50 hover:bg-accent/40"><Folder className="h-10 w-10 fill-primary/15 text-primary" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{name}</span><span className="text-xs text-muted-foreground">{files.length} ไฟล์</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>)}</div></div>;
}

function ImageGrid({ items, approved, onApprove, onPreview }: { items: KeyedImage[]; approved: Set<string>; onApprove: (key: string) => void; onPreview: (image: DocumentImage) => void }) {
  return <div><h2 className="mb-4 text-sm font-semibold">รูปภาพและเอกสาร</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{items.map(({ image, key }) => { const done = approved.has(key); const pdf = image.imageUrl?.toLowerCase().endsWith(".pdf"); return <article key={key} className={cn("group relative overflow-hidden rounded-xl border bg-background", done ? "border-status-safe ring-1 ring-status-safe" : "border-border hover:border-primary/50")}><button type="button" onClick={() => pdf && image.imageUrl ? window.open(image.imageUrl, "_blank", "noopener,noreferrer") : onPreview(image)} className="flex aspect-square w-full items-center justify-center overflow-hidden bg-secondary/50">{pdf ? <FileText className="h-10 w-10 text-muted-foreground" /> : image.imageUrl ? <img src={image.imageUrl} alt={image.description || "เอกสาร"} className="h-full w-full object-cover" /> : <ImageIcon className="h-10 w-10 text-muted-foreground" />}</button><div className="flex items-center gap-2 p-2.5"><p className="min-w-0 flex-1 truncate text-xs font-medium">{image.description || image.imageId || "ไม่ระบุชื่อ"}</p><button type="button" disabled={done} onClick={() => onApprove(key)} aria-label={done ? "อนุมัติแล้ว" : "อนุมัติไฟล์"} className={cn("flex h-6 w-6 items-center justify-center rounded-md text-white", done ? "bg-status-safe" : "bg-muted-foreground hover:bg-primary")}><Check className="h-3.5 w-3.5" /></button></div>{done && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-status-safe text-white shadow"><Check className="h-3.5 w-3.5" /></span>}</article>; })}</div></div>;
}

function Preview({ image, onClose }: { image: DocumentImage; onClose: () => void }) {
  return <Dialog.Root open onOpenChange={(open) => !open && onClose()}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" /><Dialog.Content className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl bg-black shadow-2xl sm:inset-8"><div className="flex items-center justify-between px-4 py-3 text-white"><Dialog.Title className="truncate text-sm">{image.description || image.category || "รูปเอกสาร"}</Dialog.Title><Dialog.Close className="rounded-lg p-2 hover:bg-white/10"><X className="h-4 w-4" /></Dialog.Close></div><div className="flex flex-1 items-center justify-center overflow-auto p-4">{image.imageUrl ? <img src={image.imageUrl} alt={image.description || "รูปเอกสาร"} className="max-h-full max-w-full object-contain" /> : <ImageIcon className="h-16 w-16 text-white/40" />}</div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function Loading({ label }: { label: string }) { return <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />{label}</div>; }
function LoadError({ onRetry }: { onRetry: () => void }) { return <EmptyState icon={FileText} title="โหลดข้อมูลไม่สำเร็จ" action={<button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"><RefreshCw className="h-3.5 w-3.5" />ลองใหม่</button>} />; }
