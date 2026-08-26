"use client";

import { useRouter } from "next/navigation";
import { Badge, ChevronRight, Settings2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

interface SettingItem {
  id: string;
  title: string;
  description: string;
  href: string;
}

const SETTINGS: SettingItem[] = [
  {
    id: "employee-mapping",
    title: "จัดการชื่อพนักงาน",
    description: "แก้ไขหรือแทนที่ชื่อพนักงานที่แสดงในรายงาน",
    href: "/settings/employee-mapping",
  },
];

const columns: Column<SettingItem>[] = [
  {
    id: "setting",
    header: "การตั้งค่า",
    cell: (item) => (
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Badge className="h-[22px] w-[22px]" aria-hidden="true" />
        </span>
        <span className="font-semibold text-foreground">{item.title}</span>
      </div>
    ),
  },
  {
    id: "description",
    header: "รายละเอียด",
    cell: (item) => <span className="text-muted-foreground">{item.description}</span>,
  },
  {
    id: "action",
    header: <span className="sr-only">เปิด</span>,
    align: "right",
    width: "w-14",
    cellClassName: "text-right",
    cell: () => (
      <span className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground">
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </span>
    ),
  },
];

/**
 * Mirrors Flutter's SettingsPage: a single settings section linking to the
 * employee display-name mapping screen. Mapping data remains owned by the
 * shared employee mapping service started by the authenticated app layout.
 */
export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="space-y-5">
      <PageHeader title="ตั้งค่า" />

      <DataTable
        columns={columns}
        rows={SETTINGS}
        getRowKey={(item) => item.id}
        getRowLabel={(item) => `เปิด ${item.title}`}
        onRowClick={(item) => router.push(item.href)}
        minWidth={640}
        emptyState={
          <EmptyState
            icon={Settings2}
            title="ยังไม่มีการตั้งค่า"
            description="ตัวเลือกการตั้งค่าที่พร้อมใช้งานจะแสดงที่นี่"
          />
        }
      />
    </div>
  );
}
